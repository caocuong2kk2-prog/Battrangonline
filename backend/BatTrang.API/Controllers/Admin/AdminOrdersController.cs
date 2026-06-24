using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using BatTrang.API.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BatTrang.Infrastructure.Data;
using BatTrang.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/orders")]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminOrdersController : ControllerBase
    {
        private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "pending", "confirmed", "shipping", "completed", "cancelled"
        };

        private readonly IOrderRepository _orderRepo;
        private readonly IProductRepository _productRepo;
        private readonly ICustomerRepository _customerRepo;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly AppDbContext _context;
        private readonly BatTrang.Infrastructure.Services.StockService _stockService;
        private readonly IOutputCacheStore _cacheStore;
        private readonly InvoiceService _invoiceService;
        private readonly NotificationService _notificationService;

        public AdminOrdersController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo, IHubContext<NotificationHub> hubContext, AppDbContext context, BatTrang.Infrastructure.Services.StockService stockService, IOutputCacheStore cacheStore, InvoiceService invoiceService, NotificationService notificationService)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
            _hubContext = hubContext;
            _context = context;
            _stockService = stockService;
            _cacheStore = cacheStore;
            _invoiceService = invoiceService;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _orderRepo.GetOrdersWithItemsAsync();
            var productIds = orders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
            var productImages = await _productRepo.GetProductImagesAsync(productIds);
            var productSkus = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Sku);
            var dtos = orders.Select(o => MapToDto(o, productImages, productSkus)).ToList();
            return Ok(dtos);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AdminCreateOrderDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Customer))
                return BadRequest(new { message = "Vui lòng nhập tên khách hàng" });
            if (string.IsNullOrWhiteSpace(dto.Phone))
                return BadRequest(new { message = "Vui lòng nhập số điện thoại" });
            if (string.IsNullOrWhiteSpace(dto.Address))
                return BadRequest(new { message = "Vui lòng nhập địa chỉ giao hàng" });
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Đơn hàng phải có ít nhất một sản phẩm" });

            var status = string.IsNullOrWhiteSpace(dto.Status) ? "pending" : dto.Status.ToLowerInvariant();
            if (!ValidStatuses.Contains(status))
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ" });

            const int maxRetry = 3;
            for (int r = 0; r < maxRetry; r++)
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // ── CRM Integration: Link or Create Customer ──
                    int? customerId = null;
                    try
                    {
                        var phoneTrimmed = dto.Phone.Trim();
                        var emailInput = (dto.Email ?? "").Trim();
                        var customer = await _context.Customers.FirstOrDefaultAsync(c => 
                            (!string.IsNullOrWhiteSpace(c.Phone) && c.Phone == phoneTrimmed) ||
                            (!string.IsNullOrWhiteSpace(c.Email) && !string.IsNullOrWhiteSpace(emailInput) && c.Email.Equals(emailInput)));

                        if (customer != null)
                        {
                            customerId = customer.Id;
                            bool updated = false;
                            if (string.IsNullOrWhiteSpace(customer.Address) || customer.Address != dto.Address.Trim())
                            {
                                customer.Address = dto.Address.Trim();
                                updated = true;
                            }
                            if (string.IsNullOrWhiteSpace(customer.Phone) && !string.IsNullOrWhiteSpace(phoneTrimmed))
                            {
                                customer.Phone = phoneTrimmed;
                                updated = true;
                            }
                            if (updated)
                            {
                                _context.Customers.Update(customer);
                            }
                        }
                        else
                        {
                            var emailToSave = emailInput;
                            if (string.IsNullOrWhiteSpace(emailToSave))
                            {
                                emailToSave = $"{phoneTrimmed}_{Guid.NewGuid().ToString("N").Substring(0, 6)}@phucgiatien.temp";
                            }
                            
                            var newCustomer = new Customer
                            {
                                Name = dto.Customer.Trim(),
                                Phone = phoneTrimmed,
                                Email = emailToSave,
                                Address = dto.Address.Trim(),
                                Status = "active",
                                JoinedAt = DateTime.UtcNow.AddHours(7)
                            };
                            _context.Customers.Add(newCustomer);
                            await _context.SaveChangesAsync(); // Cần save để lấy Id
                            customerId = newCustomer.Id;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[CRM Link Error] {ex.Message}");
                    }

                    var order = new Order
                    {
                        OrderCode = await GenerateOrderCodeAsync(),
                        CustomerId = customerId,
                        CustomerName = dto.Customer.Trim(),
                        CustomerPhone = dto.Phone.Trim(),
                        CustomerEmail = (dto.Email ?? "").Trim(),
                        Address = dto.Address.Trim(),
                        CustomerNote = dto.CustomerNote?.Trim(),
                        Status = status,
                        CreatedAt = DateTime.UtcNow.AddHours(7)
                    };

                    if (status == "confirmed") order.ConfirmedAt = DateTime.UtcNow.AddHours(7);
                    else if (status == "shipping") { order.ConfirmedAt = DateTime.UtcNow.AddHours(7); order.ShippingAt = DateTime.UtcNow.AddHours(7); }
                    else if (status == "completed") { order.ConfirmedAt = DateTime.UtcNow.AddHours(7); order.ShippingAt = DateTime.UtcNow.AddHours(7); order.CompletedAt = DateTime.UtcNow.AddHours(7); }
                    else if (status == "cancelled") { order.CancelledAt = DateTime.UtcNow.AddHours(7); }

                    decimal total = 0;
                    foreach (var item in dto.Items)
                    {
                        if (item.Qty < 1) continue;

                        var product = await _context.Products.Include(p => p.Variants).FirstOrDefaultAsync(p => p.Id == item.Id);
                        if (product == null)
                        {
                            await transaction.RollbackAsync();
                            return BadRequest(new { message = $"Sản phẩm #{item.Id} không tồn tại" });
                        }

                        var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size) ?? product.Variants.FirstOrDefault();
                        if (variant == null) continue;
                        
                        // Kiểm tra kho
                        if (variant.Stock < item.Qty)
                        {
                            await transaction.RollbackAsync();
                            var stockMsg = variant.Stock == 0
                                ? $"Rất tiếc! Sản phẩm '{product.Name}' vừa hết hàng (có thể do người khác vừa đặt trước). Vui lòng chọn sản phẩm khác hoặc liên hệ shop để được hỗ trợ."
                                : $"Sản phẩm '{product.Name}' chỉ còn {variant.Stock} chiếc, không đủ số lượng bạn đặt ({item.Qty} chiếc). Vui lòng giảm số lượng hoặc liên hệ shop.";
                            return BadRequest(new { message = stockMsg });
                        }

                        // Trừ kho
                        variant.Stock -= item.Qty;

                        // Tự động ẩn nếu hết sạch mọi loại
                        if (product.Variants.All(v => v.Stock <= 0))
                        {
                            product.Status = "inactive";
                        }

                        var price = variant.Price;

                        order.Items.Add(new OrderItem
                        {
                            ProductId = product.Id,
                            ProductName = product.Name,
                            Size = item.Size,
                            UnitPrice = price,
                            Quantity = item.Qty
                        });
                        total += price * item.Qty;
                    }

                    if (order.Items.Count == 0)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = "Không có sản phẩm hợp lệ trong đơn hàng" });
                    }

                    order.Total = total;
                    _context.Orders.Add(order);
                    
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var created = await _orderRepo.GetByOrderCodeAsync(order.OrderCode);
                    if (created == null) return StatusCode(500, new { message = "Không thể tải đơn hàng vừa tạo" });

                    try
                    {
                        var msg = $"Đơn hàng #{created.OrderCode} vừa được tạo tại cửa hàng.";
                        var noti = new BatTrang.Core.Entities.Notification { Type = "OrderPlaced", Message = msg };
                        _context.Notifications.Add(noti);
                        await _context.SaveChangesAsync();
                        
                        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderPlaced", msg);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[SignalR Push Error] {ex.Message}");
                    }

                    var productIds = created.Items.Select(i => i.ProductId).Distinct().ToList();
                    var productImages = await _productRepo.GetProductImagesAsync(productIds);
                    await _cacheStore.EvictByTagAsync("products", default);
                    
                    if (status == "completed")
                    {
                        var _commissionService = HttpContext.RequestServices.GetService<BatTrang.Infrastructure.Services.CommissionService>();
                        if (_commissionService != null) {
                            bool commissionCreated = await _commissionService.ProcessOrderCommissionAsync(created.OrderCode);
                            if (commissionCreated && created.AffiliateId.HasValue)
                            {
                                await _hubContext.Clients.Group($"Affiliate_{created.AffiliateId.Value}").SendAsync("ReceiveAffiliateNotification", "Cập nhật hoa hồng", "Bạn có thông báo mới", "sync");
                            }
                            if (commissionCreated)
                            {
                                try
                                {
                                    var msg = $"Đơn hàng #{created.OrderCode} vừa tạo hoa hồng chờ duyệt cho CTV.";
                                    var noti = new BatTrang.Core.Entities.Notification { Type = "CommissionCreated", Message = msg };
                                    _context.Notifications.Add(noti);
                                    await _context.SaveChangesAsync();
                                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", "CommissionCreated", msg);
                                }
                                catch (Exception) { }
                            }
                        }
                    }
                    
                    return Ok(MapToDto(created, productImages));
                }
                catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
                {
                    await transaction.RollbackAsync();
                    _context.ChangeTracker.Clear();
                    if (r == maxRetry - 1) return StatusCode(500, new { message = "Hệ thống đang quá tải thao tác, vui lòng thử lại sau." });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "Lỗi hệ thống khi tạo đơn hàng." });
                }
            }
            return StatusCode(500);
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateOrderStatusDto dto)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(id);
            if (order == null) return NotFound();

            var oldStatus = (order.Status ?? "").ToLowerInvariant();
            var newStatus = (dto.Status ?? "").ToLowerInvariant();

            if (!ValidStatuses.Contains(newStatus))
                return BadRequest(new { message = "Trạng thái không hợp lệ" });

            order.Status = newStatus;
            order.IsCancelRequested = false; // Xóa cờ xin hủy nếu admin đổi trạng thái
            if (newStatus == "confirmed" && order.ConfirmedAt == null) order.ConfirmedAt = DateTime.UtcNow.AddHours(7);
            if (newStatus == "shipping")
            {
                if (order.ConfirmedAt == null) order.ConfirmedAt = DateTime.UtcNow.AddHours(7);
                if (order.ShippingAt == null) order.ShippingAt = DateTime.UtcNow.AddHours(7);
            }
            if (newStatus == "completed" && oldStatus != "completed")
            {
                if (order.ConfirmedAt == null) order.ConfirmedAt = DateTime.UtcNow.AddHours(7);
                if (order.ShippingAt == null) order.ShippingAt = DateTime.UtcNow.AddHours(7);
                if (order.CompletedAt == null) order.CompletedAt = DateTime.UtcNow.AddHours(7);
            }
            if (newStatus == "cancelled" && oldStatus != "cancelled") {
                order.CancelledAt = DateTime.UtcNow.AddHours(7);
            }

            // Save status to DB first so CommissionService query includes this order's Total
            await _orderRepo.UpdateAsync(order);

            if (newStatus == "completed" && oldStatus != "completed")
            {
                var _commissionService = HttpContext.RequestServices.GetService<BatTrang.Infrastructure.Services.CommissionService>();
                if (_commissionService != null) {
                    bool commissionCreated = await _commissionService.ProcessOrderCommissionAsync(order.OrderCode);
                    if (commissionCreated && order.AffiliateId.HasValue)
                    {
                        await _hubContext.Clients.Group($"Affiliate_{order.AffiliateId.Value}").SendAsync("ReceiveAffiliateNotification", "Cập nhật hoa hồng", "Bạn có thông báo mới", "sync");
                    }
                    if (commissionCreated)
                    {
                        try
                        {
                            var msg = $"Đơn hàng #{order.OrderCode} vừa tạo hoa hồng chờ duyệt cho CTV.";
                            var noti = new BatTrang.Core.Entities.Notification { Type = "CommissionCreated", Message = msg };
                            _context.Notifications.Add(noti);
                            await _context.SaveChangesAsync();
                            await _hubContext.Clients.All.SendAsync("ReceiveNotification", "CommissionCreated", msg);
                        }
                        catch (Exception) { }
                    }
                }
                
                // Gửi hóa đơn PDF qua email khi giao hàng thành công
                if (!string.IsNullOrWhiteSpace(order.CustomerEmail))
                {
                    try
                    {
                        var fullOrder = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.OrderCode == order.OrderCode);
                        if (fullOrder != null)
                        {
                            var configs = await _context.SiteConfigs.ToListAsync();
                            var configDict = configs.ToDictionary(c => c.Key, c => c.Value);
                            var logoPath = System.IO.Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "user", "assets", "images", "logo.png");
                            var pdfBytes = _invoiceService.GenerateInvoicePdf(fullOrder, configDict, logoPath);
                            await _notificationService.SendInvoiceEmailAsync(fullOrder.CustomerEmail, fullOrder.CustomerName, fullOrder.OrderCode, pdfBytes);
                        }
                    }
                    catch (Exception emailEx)
                    {
                        Console.WriteLine($"[INVOICE EMAIL] Lỗi gửi hóa đơn khi hoàn thành: {emailEx.Message}");
                    }
                }
            }
            if (newStatus == "cancelled" && oldStatus != "cancelled") {
                var _commissionService = HttpContext.RequestServices.GetService<BatTrang.Infrastructure.Services.CommissionService>();
                if (_commissionService != null) await _commissionService.RevertOrderCommissionAsync(order.OrderCode);
            }

            // ── Stock management ──────────────────────────────────────────────
            // Từ Phương án B: Trừ kho ngay lúc tạo đơn, nên chỉ hoàn kho khi bị Huỷ.
            if (newStatus == "cancelled" && oldStatus != "cancelled")
            {
                var fullOrder = order.Items.Count > 0 ? order : await _orderRepo.GetByOrderCodeAsync(order.OrderCode);
                if (fullOrder != null)
                {
                    foreach (var item in fullOrder.Items)
                    {
                        var product = await _productRepo.GetProductWithImagesAsync(item.ProductId);
                        if (product != null)
                        {
                            var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size) ?? product.Variants.FirstOrDefault();
                            if (variant != null)
                            {
                                await _stockService.AdjustStockAsync(variant.Id, item.Quantity);
                            }
                        }
                    }
                    await _cacheStore.EvictByTagAsync("products", default);
                }
            }
            // ─────────────────────────────────────────────────────────────────

            try
            {
                var statusLabel = newStatus switch
                {
                    "pending"   => "Chờ xử lý",
                    "confirmed" => "Đã xác nhận",
                    "shipping"  => "Đang giao",
                    "completed" => "Hoàn thành",
                    "cancelled" => "Đã huỷ",
                    _           => dto.Status
                };
                var msg = $"Đơn hàng #{order.OrderCode} đã chuyển sang trạng thái: {statusLabel}!";
                var noti = new BatTrang.Core.Entities.Notification { Type = "OrderStatusChanged", Message = msg };
                _context.Notifications.Add(noti);

                // Thông báo cho CTV khi đơn có affiliate bị hủy
                if (newStatus == "cancelled" && order.AffiliateId.HasValue)
                {
                    var adminAffMsg = $"⚠️ Đơn hàng #{order.OrderCode} (có CTV giới thiệu) đã bị hủy. Hoa hồng liên quan đã được thu hồi tự động.";
                    _context.Notifications.Add(new BatTrang.Core.Entities.Notification { Type = "OrderCancelled", Message = adminAffMsg });

                    _context.Set<BatTrang.Core.Entities.AffiliateNotification>().Add(new BatTrang.Core.Entities.AffiliateNotification
                    {
                        AffiliateId = order.AffiliateId.Value,
                        Title = "Đơn hàng bị hủy ❌",
                        Message = $"Đơn hàng #{order.OrderCode} đã bị hủy. Hoa hồng từ đơn này sẽ không được tính.",
                        Type = "order",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddHours(7)
                    });
                }

                await _context.SaveChangesAsync();

                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderStatusChanged", msg);

                // Gửi realtime cho CTV
                if (newStatus == "cancelled" && order.AffiliateId.HasValue)
                {
                    await _hubContext.Clients.Group($"Affiliate_{order.AffiliateId.Value}").SendAsync("ReceiveAffiliateNotification", 
                        "Đơn hàng bị hủy ❌", 
                        $"Đơn hàng #{order.OrderCode} đã bị hủy. Hoa hồng từ đơn này sẽ không được tính.", 
                        "order");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR Push Error] {ex.Message}");
            }

            return NoContent();
        }



        [HttpPatch("{id}/note")]
        public async Task<IActionResult> UpdateAdminNote(string id, [FromBody] UpdateOrderAdminNoteDto dto)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(id);
            if (order == null) return NotFound();

            order.AdminNote = dto.AdminNote?.Trim();
            await _orderRepo.UpdateAsync(order);

            return NoContent();
        }

        [HttpPost("{id}/reject-cancel")]
        public async Task<IActionResult> RejectCancel(string id, [FromBody] BatTrang.Core.DTOs.RejectCancelDto dto)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(id);
            if (order == null) return NotFound();

            order.IsCancelRequested = false;
            order.CancelReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : "Bị từ chối: " + dto.Reason.Trim();
            await _orderRepo.UpdateAsync(order);

            try
            {
                var msg = $"Yêu cầu hủy đơn hàng #{order.OrderCode} đã bị từ chối.";
                var noti = new BatTrang.Core.Entities.Notification { Type = "OrderStatusChanged", Message = msg };
                _context.Notifications.Add(noti);
                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderStatusChanged", msg);
            }
            catch (Exception) { }

            return Ok(new { success = true, message = "Đã từ chối yêu cầu hủy của khách." });
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Delete(string id)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            await _orderRepo.DeleteAsync(order);

            try
            {
                var msg = $"Đơn hàng #{order.OrderCode} vừa bị xoá khỏi hệ thống.";
                var noti = new BatTrang.Core.Entities.Notification { Type = "OrderDeleted", Message = msg };
                _context.Notifications.Add(noti);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderDeleted", msg);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR Push Error] {ex.Message}");
            }

            return NoContent();
        }

        private async Task<string> GenerateOrderCodeAsync()
        {
            var rnd = new Random();
            for (var i = 0; i < 20; i++)
            {
                var code = "DH" + DateTime.UtcNow.AddHours(7).ToString("yyMMdd") + rnd.Next(1000, 9999);
                if (await _orderRepo.GetByOrderCodeAsync(code) == null)
                    return code;
            }
            return "DH" + DateTime.UtcNow.AddHours(7).Ticks;
        }

        private static OrderDto MapToDto(Order o, Dictionary<int, string> productImages, Dictionary<int, string?>? productSkus = null)
        {
            return new OrderDto
            {
                Id = o.OrderCode,
                Customer = o.CustomerName,
                Phone = o.CustomerPhone,
                Email = o.CustomerEmail,
                Address = o.Address,
                Total = o.Total,
                Status = o.Status,
                Date = o.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                CustomerNote = o.CustomerNote,
                AdminNote = o.AdminNote,
                IsCancelRequested = o.IsCancelRequested,
                CancelReason = o.CancelReason,
                CancelRequestedAt = o.CancelRequestedAt,
                CancelledAt = o.CancelledAt,
                ConfirmedAt = o.ConfirmedAt,
                ShippingAt = o.ShippingAt,
                CompletedAt = o.CompletedAt,
                Items = o.Items.Select(i =>
                {
                    var imgUrl = i.IsGift && i.Gift != null ? i.Gift.ImageUrl : (productImages.ContainsKey(i.ProductId) ? productImages[i.ProductId] : "");
                    string? sku = null;
                    productSkus?.TryGetValue(i.ProductId, out sku);
                    return new OrderItemDto
                    {
                        ProductId = i.ProductId,
                        Name = i.ProductName,
                        Size = i.Size,
                        Qty = i.Quantity,
                        Price = i.UnitPrice,
                        ImageUrl = imgUrl,
                        Sku = sku,
                        EstimatedValue = i.IsGift && i.Gift != null ? i.Gift.EstimatedValue : null
                    };
                }).ToList()
            };
        }

        // ── Invoice endpoint (admin, không cần xác thực SĐT) ─────────────
        [HttpGet("{id}/invoice")]
        public async Task<IActionResult> DownloadInvoice(string id)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.OrderCode == id);

            if (order == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });

            try
            {
                var configs = await _context.SiteConfigs.ToListAsync();
                var configDict = configs.ToDictionary(c => c.Key, c => c.Value);
                var logoPath = System.IO.Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "user", "assets", "images", "logo.png");
                var pdfBytes = _invoiceService.GenerateInvoicePdf(order, configDict, logoPath);
                return File(pdfBytes, "application/pdf", $"HoaDon_{order.OrderCode}.pdf");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ADMIN INVOICE ERROR] {ex.Message}");
                return StatusCode(500, new { message = "Không thể tạo hóa đơn. Vui lòng thử lại." });
            }
        }
        // ── Bulk Endpoints ───────────────────────────────────────────────
        [HttpPost("bulk-status")]
        public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkOrderStatusDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có đơn hàng nào được chọn" });
            
            var newStatus = (dto.Status ?? "").ToLowerInvariant();
            if (!ValidStatuses.Contains(newStatus))
                return BadRequest(new { message = "Trạng thái không hợp lệ" });

            int updatedCount = 0;
            foreach (var id in dto.Ids)
            {
                var order = await _orderRepo.GetByOrderCodeAsync(id);
                if (order == null) continue;

                var oldStatus = (order.Status ?? "").ToLowerInvariant();
                if (oldStatus == newStatus) continue;

                order.Status = newStatus;
                order.IsCancelRequested = false;
                
                if (newStatus == "confirmed" && order.ConfirmedAt == null) order.ConfirmedAt = DateTime.UtcNow.AddHours(7);
                if (newStatus == "shipping")
                {
                    if (order.ConfirmedAt == null) order.ConfirmedAt = DateTime.UtcNow.AddHours(7);
                    if (order.ShippingAt == null) order.ShippingAt = DateTime.UtcNow.AddHours(7);
                }
                if (newStatus == "completed" && oldStatus != "completed")
                {
                    if (order.ConfirmedAt == null) order.ConfirmedAt = DateTime.UtcNow.AddHours(7);
                    if (order.ShippingAt == null) order.ShippingAt = DateTime.UtcNow.AddHours(7);
                    if (order.CompletedAt == null) order.CompletedAt = DateTime.UtcNow.AddHours(7);
                }
                if (newStatus == "cancelled" && oldStatus != "cancelled") {
                    order.CancelledAt = DateTime.UtcNow.AddHours(7);
                }

                await _orderRepo.UpdateAsync(order);
                updatedCount++;

                // Trigger commission and notification logic per order
                if (newStatus == "completed" && oldStatus != "completed")
                {
                    var _commissionService = HttpContext.RequestServices.GetService<BatTrang.Infrastructure.Services.CommissionService>();
                    if (_commissionService != null) {
                        bool commissionCreated = await _commissionService.ProcessOrderCommissionAsync(order.OrderCode);
                        if (commissionCreated && order.AffiliateId.HasValue)
                        {
                            await _hubContext.Clients.Group($"Affiliate_{order.AffiliateId.Value}").SendAsync("ReceiveAffiliateNotification", "Cập nhật hoa hồng", "Bạn có thông báo mới", "sync");
                        }
                    }
                    
                    if (!string.IsNullOrWhiteSpace(order.CustomerEmail))
                    {
                        try
                        {
                            var fullOrder = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.OrderCode == order.OrderCode);
                            if (fullOrder != null)
                            {
                                var configs = await _context.SiteConfigs.ToListAsync();
                                var configDict = configs.ToDictionary(c => c.Key, c => c.Value);
                                var logoPath = System.IO.Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "user", "assets", "images", "logo.png");
                                var pdfBytes = _invoiceService.GenerateInvoicePdf(fullOrder, configDict, logoPath);
                                await _notificationService.SendInvoiceEmailAsync(fullOrder.CustomerEmail, fullOrder.CustomerName, fullOrder.OrderCode, pdfBytes);
                            }
                        }
                        catch (Exception) { }
                    }
                }
                if (newStatus == "cancelled" && oldStatus != "cancelled") {
                    var _commissionService = HttpContext.RequestServices.GetService<BatTrang.Infrastructure.Services.CommissionService>();
                    if (_commissionService != null) await _commissionService.RevertOrderCommissionAsync(order.OrderCode);

                    var fullOrder = order.Items.Count > 0 ? order : await _orderRepo.GetByOrderCodeAsync(order.OrderCode);
                    if (fullOrder != null)
                    {
                        foreach (var item in fullOrder.Items)
                        {
                            var product = await _productRepo.GetProductWithImagesAsync(item.ProductId);
                            if (product != null)
                            {
                                var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size) ?? product.Variants.FirstOrDefault();
                                if (variant != null)
                                {
                                    await _stockService.AdjustStockAsync(variant.Id, item.Quantity);
                                }
                            }
                        }
                    }
                }
            }
            
            if (updatedCount > 0)
            {
                await _cacheStore.EvictByTagAsync("products", default);
            }

            return Ok(new { message = $"Đã cập nhật trạng thái {updatedCount} đơn hàng" });
        }

        [HttpPost("bulk-delete")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkOrderDeleteDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có đơn hàng nào được chọn" });
            
            int deletedCount = 0;
            foreach (var id in dto.Ids)
            {
                var order = await _orderRepo.GetByOrderCodeAsync(id);
                if (order != null)
                {
                    await _orderRepo.DeleteAsync(order);
                    deletedCount++;
                }
            }
            
            return Ok(new { message = $"Đã xóa {deletedCount} đơn hàng" });
        }
    }

    public class UpdateOrderStatusDto
    {
        public string Status { get; set; } = null!;
    }
    
    public class BulkOrderStatusDto
    {
        public List<string> Ids { get; set; } = new List<string>();
        public string Status { get; set; } = null!;
    }

    public class BulkOrderDeleteDto
    {
        public List<string> Ids { get; set; } = new List<string>();
    }
}


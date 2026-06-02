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
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/admin/orders")]
    [Authorize]
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

        public AdminOrdersController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo, IHubContext<NotificationHub> hubContext, AppDbContext context, BatTrang.Infrastructure.Services.StockService stockService, IOutputCacheStore cacheStore)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
            _hubContext = hubContext;
            _context = context;
            _stockService = stockService;
            _cacheStore = cacheStore;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _orderRepo.GetOrdersWithItemsAsync();
            var productIds = orders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
            var productImages = await _productRepo.GetProductImagesAsync(productIds);
            var dtos = orders.Select(o => MapToDto(o, productImages)).ToList();
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
                                JoinedAt = DateTime.UtcNow
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
                        CreatedAt = DateTime.UtcNow
                    };

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
                            return BadRequest(new { message = $"Sản phẩm '{product.Name}' chỉ còn {variant.Stock} chiếc, không đủ số lượng bạn đặt." });
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
                    return Ok(MapToDto(created, productImages));
                }
                catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
                {
                    await transaction.RollbackAsync();
                    _context.ChangeTracker.Clear();
                    if (r == maxRetry - 1) return StatusCode(500, new { message = "Hệ thống đang quá tải thao tác, vui lòng thử lại sau." });
                }
                catch (Exception ex)
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

            order.Status = dto.Status;
            order.IsCancelRequested = false; // Xóa cờ xin hủy nếu admin đổi trạng thái
            if (newStatus == "cancelled" && oldStatus != "cancelled") {
                order.CancelledAt = DateTime.UtcNow;
            }
            await _orderRepo.UpdateAsync(order);

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
                await _context.SaveChangesAsync();

                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderStatusChanged", msg);
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
                var code = "DH" + DateTime.UtcNow.ToString("yyMMdd") + rnd.Next(1000, 9999);
                if (await _orderRepo.GetByOrderCodeAsync(code) == null)
                    return code;
            }
            return "DH" + DateTime.UtcNow.Ticks;
        }

        private static OrderDto MapToDto(Order o, Dictionary<int, string> productImages)
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
                Items = o.Items.Select(i =>
                {
                    productImages.TryGetValue(i.ProductId, out var imgUrl);
                    return new OrderItemDto
                    {
                        ProductId = i.ProductId,
                        Name = i.ProductName,
                        Size = i.Size,
                        Qty = i.Quantity,
                        Price = i.UnitPrice,
                        ImageUrl = imgUrl
                    };
                }).ToList()
            };
        }
    }

    public class UpdateOrderStatusDto
    {
        public string Status { get; set; } = null!;
    }
}

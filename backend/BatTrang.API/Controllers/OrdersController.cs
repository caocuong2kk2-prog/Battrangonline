using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using BatTrang.API.Hubs;
using System.Linq;
using System.Threading.Tasks;
using System;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepo;
        private readonly IProductRepository _productRepo;
        private readonly ICustomerRepository _customerRepo;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly AppDbContext _context;
        private readonly IOutputCacheStore _cacheStore;

        public OrdersController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo, IHubContext<NotificationHub> hubContext, AppDbContext context, IOutputCacheStore cacheStore)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
            _hubContext = hubContext;
            _context = context;
            _cacheStore = cacheStore;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            const int maxRetry = 3;
            for (int r = 0; r < maxRetry; r++)
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // 1. Quản lý khách hàng
                    var customer = await _customerRepo.GetByPhoneOrEmailAsync(dto.Phone, dto.Email);
                    if (customer == null)
                    {
                        customer = new Customer
                        {
                            Name = dto.Customer,
                            Phone = dto.Phone,
                            Email = dto.Email,
                            Address = dto.Address,
                            Status = "active",
                            JoinedAt = DateTime.UtcNow
                        };
                        _context.Customers.Add(customer);
                    }
                    else
                    {
                        customer.Name = dto.Customer;
                        customer.Address = dto.Address;
                        _context.Customers.Update(customer);
                    }
                    await _context.SaveChangesAsync(); // Cần save để lấy CustomerId

                    // 2. Tạo đơn hàng và trừ kho
                    var order = new Order
                    {
                        OrderCode = "DH" + new Random().Next(10000, 99999),
                        CustomerId = customer.Id,
                        CustomerName = dto.Customer,
                        CustomerPhone = dto.Phone,
                        CustomerEmail = dto.Email,
                        Address = dto.Address,
                        CustomerNote = dto.CustomerNote,
                        Status = "pending",
                        CreatedAt = DateTime.UtcNow
                    };

                    decimal total = 0;
                    foreach (var item in dto.Items)
                    {
                        var product = await _context.Products
                            .Include(p => p.Variants).ThenInclude(v => v.Size)
                            .Include(p => p.Variants).ThenInclude(v => v.Pattern)
                            .Include(p => p.Variants).ThenInclude(v => v.Color)
                            .Include(p => p.Variants).ThenInclude(v => v.GlazeLine)
                            .Include(p => p.Variants).ThenInclude(v => v.Material)
                            .Include(p => p.Variants).ThenInclude(v => v.ProductType)
                            .FirstOrDefaultAsync(p => p.Id == item.Id);
                        if (product != null)
                        {
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

                            var attrs = new List<string>();
                            if (variant.Size != null && variant.Size.Name != "Default") attrs.Add(variant.Size.Name);
                            if (variant.Pattern != null) attrs.Add(variant.Pattern.Name);
                            if (variant.Color != null) attrs.Add(variant.Color.Name);
                            if (variant.GlazeLine != null) attrs.Add(variant.GlazeLine.Name);
                            if (variant.Material != null) attrs.Add(variant.Material.Name);
                            if (variant.ProductType != null) attrs.Add(variant.ProductType.Name);

                            string fullName = product.Name;
                            if (attrs.Count > 0)
                            {
                                fullName += " - " + string.Join(" • ", attrs);
                            }

                            var price = variant.Price;
                            order.Items.Add(new OrderItem
                            {
                                ProductId = product.Id,
                                ProductName = fullName,
                                Size = item.Size,
                                UnitPrice = price,
                                Quantity = item.Qty
                            });
                            total += (price * item.Qty);
                        }
                    }

                    if (order.Items.Count == 0)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = "Không có sản phẩm hợp lệ trong đơn hàng" });
                    }

                    order.Total = total;
                    _context.Orders.Add(order);
                    
                    await _context.SaveChangesAsync(); // Commit Order, OrderItems, and ProductVariant stock changes
                    await transaction.CommitAsync();

                    // Notifications
                    try
                    {
                        var msg = $"Đơn hàng mới {order.OrderCode} vừa được đặt bởi {order.CustomerName}!";
                        var noti = new BatTrang.Core.Entities.Notification { Type = "OrderPlaced", Message = msg };
                        _context.Notifications.Add(noti);
                        await _context.SaveChangesAsync();

                        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderPlaced", msg);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[SignalR Push Error] {ex.Message}");
                    }

                    await _cacheStore.EvictByTagAsync("products", default);
                    return Ok(new { success = true, orderCode = order.OrderCode });
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

        [HttpGet("{orderCode}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByOrderCode(string orderCode)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(orderCode);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();
            var imagesMap = await _productRepo.GetProductImagesAsync(productIds);

            return Ok(new
            {
                orderCode = order.OrderCode,
                customerName = order.CustomerName,
                customerPhone = order.CustomerPhone,
                address = order.Address,
                total = order.Total,
                status = order.Status,
                date = order.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                customerNote = order.CustomerNote,
                adminNote = order.AdminNote,
                isCancelRequested = order.IsCancelRequested,
                cancelReason = order.CancelReason,
                items = order.Items.Select(i => new
                {
                    name = i.ProductName,
                    qty = i.Quantity,
                    price = i.UnitPrice,
                    size = i.Size,
                    productId = i.ProductId,
                    image = imagesMap.ContainsKey(i.ProductId) ? imagesMap[i.ProductId] : ""
                }).ToList()
            });
        }

        [HttpGet("history/me")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> GetMyOrders()
        {
            // JwtRegisteredClaimNames.Sub typically maps to ClaimTypes.NameIdentifier in ASP.NET Core if mapped,
            // or we can just use the literal string "sub"
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                            ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int customerId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng." });
            }

            var allOrders = await _orderRepo.GetOrdersWithItemsAsync();
            var myOrders = allOrders.Where(o => o.CustomerId == customerId).OrderByDescending(o => o.CreatedAt).ToList();

            var allProductIds = myOrders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
            var imagesMap = await _productRepo.GetProductImagesAsync(allProductIds);

            var result = myOrders.Select(order => new
            {
                orderCode = order.OrderCode,
                customerName = order.CustomerName,
                customerPhone = order.CustomerPhone,
                address = order.Address,
                total = order.Total,
                status = order.Status,
                date = order.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                customerNote = order.CustomerNote,
                adminNote = order.AdminNote,
                isCancelRequested = order.IsCancelRequested,
                cancelReason = order.CancelReason,
                items = order.Items.Select(i => new
                {
                    name = i.ProductName,
                    qty = i.Quantity,
                    price = i.UnitPrice,
                    size = i.Size,
                    productId = i.ProductId,
                    image = imagesMap.ContainsKey(i.ProductId) ? imagesMap[i.ProductId] : ""
                }).ToList()
            });

            return Ok(result);
        }

        [HttpPost("{orderCode}/cancel")]
        [AllowAnonymous]
        public async Task<IActionResult> CancelOrder(string orderCode, [FromBody] BatTrang.Core.DTOs.CancelOrderRequestDto request)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(orderCode);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            // Xác thực: số điện thoại phải khớp
            if (string.IsNullOrWhiteSpace(request.Phone) || order.CustomerPhone != request.Phone.Trim())
            {
                return Unauthorized(new { message = "Số điện thoại không khớp với đơn hàng." });
            }

            if (order.Status == "pending")
            {
                // Khách tự hủy ngay lập tức
                order.Status = "cancelled";
                order.IsCancelRequested = false;
                order.CancelReason = "Khách hàng tự hủy" + (!string.IsNullOrWhiteSpace(request.Reason) ? ": " + request.Reason : "");
                order.CancelRequestedAt = DateTime.UtcNow;
                order.CancelledAt = DateTime.UtcNow;
                await _orderRepo.UpdateAsync(order);

                // Hoàn kho ngay
                var _stockService = HttpContext.RequestServices.GetService<BatTrang.Infrastructure.Services.StockService>();
                var _productRepo = HttpContext.RequestServices.GetService<BatTrang.Core.Interfaces.IProductRepository>();
                if (_stockService != null && _productRepo != null)
                {
                    foreach (var item in order.Items)
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

                try
                {
                    var reasonStr = !string.IsNullOrWhiteSpace(request.Reason) ? $" (Lý do: {request.Reason})" : "";
                    var msg = $"Khách hàng vừa tự hủy đơn hàng #{order.OrderCode}.{reasonStr}";
                    var noti = new BatTrang.Core.Entities.Notification { Type = "OrderCancelled", Message = msg };
                    _context.Notifications.Add(noti);
                    await _context.SaveChangesAsync();
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderCancelled", msg);
                }
                catch (Exception) {}

                return Ok(new { success = true, status = "cancelled", message = "Đã hủy đơn hàng thành công." });
            }
            else if (order.Status == "confirmed")
            {
                // Khách xin hủy, shop phải duyệt
                order.IsCancelRequested = true;
                order.CancelReason = request.Reason;
                order.CancelRequestedAt = DateTime.UtcNow;
                await _orderRepo.UpdateAsync(order);

                try
                {
                    var reasonStr = !string.IsNullOrWhiteSpace(request.Reason) ? $" Lý do: {request.Reason}." : "";
                    var msg = $"Khách hàng yêu cầu hủy đơn hàng #{order.OrderCode}.{reasonStr} Vui lòng kiểm tra!";
                    var noti = new BatTrang.Core.Entities.Notification { Type = "CancelRequested", Message = msg };
                    _context.Notifications.Add(noti);
                    await _context.SaveChangesAsync();
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", "CancelRequested", msg);
                }
                catch (Exception) {}

                return Ok(new { success = true, status = "confirmed", isCancelRequested = true, message = "Đã gửi yêu cầu hủy đơn đến Cửa hàng." });
            }
            
            return BadRequest(new { message = "Không thể hủy hoặc yêu cầu hủy đơn hàng ở trạng thái này." });
        }
    }
}

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

        public AdminOrdersController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo, IHubContext<NotificationHub> hubContext, AppDbContext context)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
            _hubContext = hubContext;
            _context = context;
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

            // ── CRM Integration: Link or Create Customer ──
            int? customerId = null;
            try
            {
                var customers = await _customerRepo.ListAllAsync();
                var phoneTrimmed = dto.Phone.Trim();
                var emailInput = (dto.Email ?? "").Trim();
                
                var customer = customers.FirstOrDefault(c => 
                    (!string.IsNullOrWhiteSpace(c.Phone) && c.Phone == phoneTrimmed) ||
                    (!string.IsNullOrWhiteSpace(c.Email) && !string.IsNullOrWhiteSpace(emailInput) && c.Email.Equals(emailInput, StringComparison.OrdinalIgnoreCase)));

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
                        await _customerRepo.UpdateAsync(customer);
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
                    var saved = await _customerRepo.AddAsync(newCustomer);
                    customerId = saved.Id;
                }
            }
            catch (Exception ex)
            {
                // Gracefully log & fallback so order creation doesn't fail if CRM integration fails
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

                var product = await _productRepo.GetProductWithImagesAsync(item.Id);
                if (product == null)
                    return BadRequest(new { message = $"Sản phẩm #{item.Id} không tồn tại" });

                var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size) ?? product.Variants.FirstOrDefault();
                var price = variant?.Price ?? 0;

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
                return BadRequest(new { message = "Không có sản phẩm hợp lệ trong đơn hàng" });

            order.Total = total;
            await _orderRepo.AddAsync(order);

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
            return Ok(MapToDto(created, productImages));
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
            await _orderRepo.UpdateAsync(order);

            // ── Stock management ──────────────────────────────────────────────
            // CASE 1: Chuyển sang "completed" → trừ kho
            if (newStatus == "completed" && oldStatus != "completed")
            {
                await AdjustStockAsync(order, delta: -1);
            }
            // CASE 2: Huỷ đơn đã "completed" → hoàn kho
            else if (newStatus == "cancelled" && oldStatus == "completed")
            {
                await AdjustStockAsync(order, delta: +1);
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

        /// <summary>
        /// Điều chỉnh tồn kho cho từng sản phẩm trong đơn hàng.
        /// delta = -1 (trừ kho khi hoàn thành), +1 (hoàn kho khi huỷ)
        /// </summary>
        private async Task AdjustStockAsync(Order order, int delta)
        {
            // Load order kèm items nếu chưa có
            var fullOrder = order.Items.Count > 0
                ? order
                : await _orderRepo.GetByOrderCodeAsync(order.OrderCode);

            if (fullOrder == null) return;

            foreach (var item in fullOrder.Items)
            {
                var product = await _productRepo.GetProductWithImagesAsync(item.ProductId);
                if (product == null) continue;

                // Tìm variant khớp size đặt hàng
                var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size)
                           ?? product.Variants.FirstOrDefault();

                if (variant == null) continue;

                // Trừ/cộng số lượng, không để âm
                variant.Stock = System.Math.Max(0, variant.Stock + delta * item.Quantity);

                // Nếu toàn bộ variant của sản phẩm đều hết hàng → auto ẩn
                if (delta < 0 && product.Variants.All(v => v.Stock <= 0))
                {
                    product.Status = "inactive";
                    Console.WriteLine($"[Stock] Sản phẩm #{product.Id} '{product.Name}' tự động ẩn do hết hàng.");
                }
                // Nếu hoàn kho và sản phẩm đang inactive → tự kích hoạt lại
                else if (delta > 0 && product.Status == "inactive")
                {
                    product.Status = "active";
                    Console.WriteLine($"[Stock] Sản phẩm #{product.Id} '{product.Name}' được kích hoạt lại do hoàn kho.");
                }

                await _productRepo.UpdateAsync(product);
                Console.WriteLine($"[Stock] {(delta < 0 ? "Trừ" : "Hoàn")} {System.Math.Abs(delta * item.Quantity)} " +
                                  $"sản phẩm '{item.ProductName}' size {item.Size} → còn {variant.Stock}");
            }
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

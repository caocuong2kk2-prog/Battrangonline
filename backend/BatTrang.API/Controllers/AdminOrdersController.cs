using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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

        public AdminOrdersController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
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
                Note = dto.Note?.Trim(),
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

                var variant = product.Variants.FirstOrDefault(v => v.Size == item.Size) ?? product.Variants.FirstOrDefault();
                var price = variant?.Price ?? 0;

                order.Items.Add(new OrderItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Size = variant?.Size ?? item.Size,
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

            var productIds = created.Items.Select(i => i.ProductId).Distinct().ToList();
            var productImages = await _productRepo.GetProductImagesAsync(productIds);
            return Ok(MapToDto(created, productImages));
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateOrderStatusDto dto)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(id);
            if (order == null) return NotFound();

            order.Status = dto.Status;
            await _orderRepo.UpdateAsync(order);
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
                Date = o.CreatedAt.ToString("yyyy-MM-dd"),
                Note = o.Note,
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

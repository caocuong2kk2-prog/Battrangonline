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

        public AdminOrdersController(IOrderRepository orderRepo, IProductRepository productRepo)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _orderRepo.GetOrdersWithItemsAsync();
            var products = await LoadProductsAsync();
            var dtos = orders.Select(o => MapToDto(o, products)).ToList();
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

            var order = new Order
            {
                OrderCode = await GenerateOrderCodeAsync(),
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

                var product = await _productRepo.GetByIdAsync(item.Id);
                if (product == null)
                    return BadRequest(new { message = $"Sản phẩm #{item.Id} không tồn tại" });

                order.Items.Add(new OrderItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    UnitPrice = product.Price,
                    Quantity = item.Qty
                });
                total += product.Price * item.Qty;
            }

            if (order.Items.Count == 0)
                return BadRequest(new { message = "Không có sản phẩm hợp lệ trong đơn hàng" });

            order.Total = total;
            await _orderRepo.AddAsync(order);

            var created = await _orderRepo.GetByOrderCodeAsync(order.OrderCode);
            if (created == null) return StatusCode(500, new { message = "Không thể tải đơn hàng vừa tạo" });

            var products = await LoadProductsAsync();
            return Ok(MapToDto(created, products));
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

        private async Task<List<Product>> LoadProductsAsync()
        {
            var productsResult = await _productRepo.GetProductsAsync(new ProductFilterDto { Limit = 1000 });
            return productsResult.Data.ToList();
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

        private static OrderDto MapToDto(Order o, List<Product> products)
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
                    var p = products.FirstOrDefault(x => x.Id == i.ProductId);
                    var img = p?.Images?.OrderBy(img => img.SortOrder).FirstOrDefault()?.ImageUrl;
                    return new OrderItemDto
                    {
                        Name = i.ProductName,
                        Qty = i.Quantity,
                        Price = i.UnitPrice,
                        ImageUrl = img
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

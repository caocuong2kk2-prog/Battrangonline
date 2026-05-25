using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepo;
        private readonly IProductRepository _productRepo;

        public OrdersController(IOrderRepository orderRepo, IProductRepository productRepo)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            var order = new Order
            {
                OrderCode = "DH" + new Random().Next(10000, 99999),
                CustomerName = dto.Customer,
                CustomerPhone = dto.Phone,
                CustomerEmail = dto.Email,
                Address = dto.Address,
                Note = dto.Note,
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };

            decimal total = 0;
            foreach (var item in dto.Items)
            {
                var product = await _productRepo.GetProductWithImagesAsync(item.Id);
                if (product != null)
                {
                    var variant = product.Variants.FirstOrDefault(v => v.Size == item.Size) ?? product.Variants.FirstOrDefault();
                    var price = variant?.Price ?? 0;

                    var orderItem = new OrderItem
                    {
                        ProductId = product.Id,
                        ProductName = product.Name,
                        Size = variant?.Size ?? item.Size,
                        UnitPrice = price,
                        Quantity = item.Qty
                    };
                    order.Items.Add(orderItem);
                    total += (price * item.Qty);
                }
            }

            order.Total = total;
            await _orderRepo.AddAsync(order);

            return Ok(new { success = true, orderCode = order.OrderCode });
        }
    }
}

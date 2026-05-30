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

        public OrdersController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo, IHubContext<NotificationHub> hubContext, AppDbContext context)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
            _hubContext = hubContext;
            _context = context;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            // Tự động nhận diện / lưu thông tin khách hàng vào danh mục chăm sóc
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
                await _customerRepo.AddAsync(customer);
            }
            else
            {
                // Cập nhật lại tên và địa chỉ giao hàng mới nhất làm địa chỉ mặc định
                customer.Name = dto.Customer;
                customer.Address = dto.Address;
                await _customerRepo.UpdateAsync(customer);
            }

            var order = new Order
            {
                OrderCode = "DH" + new Random().Next(10000, 99999),
                CustomerId = customer.Id, // Liên kết khóa ngoại đến bảng Customers
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
                var product = await _productRepo.GetProductWithImagesAsync(item.Id);
                if (product != null)
                {
                    var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size) ?? product.Variants.FirstOrDefault();
                    var price = variant?.Price ?? 0;

                    var orderItem = new OrderItem
                    {
                        ProductId = product.Id,
                        ProductName = product.Name,
                        Size = item.Size,
                        UnitPrice = price,
                        Quantity = item.Qty
                    };
                    order.Items.Add(orderItem);
                    total += (price * item.Qty);
                }
            }

            order.Total = total;
            await _orderRepo.AddAsync(order);

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

            return Ok(new { success = true, orderCode = order.OrderCode });
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
    }
}

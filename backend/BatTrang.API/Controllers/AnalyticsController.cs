using BatTrang.Core.DTOs;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/admin/analytics")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly IOrderRepository _orderRepo;
        private readonly IProductRepository _productRepo;
        private readonly ICustomerRepository _customerRepo;

        public AnalyticsController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboardData()
        {
            var orders = await _orderRepo.ListAllAsync();
            var products = await _productRepo.ListAllAsync();
            var customers = await _customerRepo.ListAllAsync();

            var completedOrders = orders.Where(o => o.Status == "completed").ToList();
            var totalRevenue = completedOrders.Sum(o => o.Total);

            var analytics = new AnalyticsDto
            {
                TotalRevenue = totalRevenue,
                TotalOrders = orders.Count,
                TotalProducts = products.Count,
                TotalCustomers = customers.Count,
                NewOrdersToday = orders.Count(o => o.Status == "pending" || o.Status == "confirmed")
            };

            // Mock weekly revenue for chart
            analytics.WeeklyRevenue = new System.Collections.Generic.List<RevenueDto>
            {
                new RevenueDto { Label = "T2", Revenue = 15000000 },
                new RevenueDto { Label = "T3", Revenue = 22000000 },
                new RevenueDto { Label = "T4", Revenue = 18000000 },
                new RevenueDto { Label = "T5", Revenue = 26000000 },
                new RevenueDto { Label = "T6", Revenue = 35000000 },
                new RevenueDto { Label = "T7", Revenue = 42000000 },
                new RevenueDto { Label = "CN", Revenue = 50000000 }
            };

            analytics.MonthlyRevenue = new System.Collections.Generic.List<RevenueDto>
            {
                new RevenueDto { Label = "T12", Revenue = 412000000 },
                new RevenueDto { Label = "T1", Revenue = 589000000 },
                new RevenueDto { Label = "T2", Revenue = 460000000 },
                new RevenueDto { Label = "T3", Revenue = 390000000 },
                new RevenueDto { Label = "T4", Revenue = 388000000 },
                new RevenueDto { Label = "T5", Revenue = 512000000 }
            };

            analytics.CategoryRevenue = new System.Collections.Generic.List<CategoryRevenueDto>
            {
                new CategoryRevenueDto { Name = "Lộc Bình", Value = 45, Color = "#C8922A" },
                new CategoryRevenueDto { Name = "Ấm Chén", Value = 25, Color = "#1A0F05" },
                new CategoryRevenueDto { Name = "Đồ Thờ", Value = 20, Color = "#9B8B75" },
                new CategoryRevenueDto { Name = "Khác", Value = 10, Color = "#D5C8B5" }
            };

            return Ok(analytics);
        }
    }
}

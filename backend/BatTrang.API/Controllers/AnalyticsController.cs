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
    [Route("api/admin/analytics")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly IOrderRepository _orderRepo;
        private readonly IProductRepository _productRepo;
        private readonly ICustomerRepository _customerRepo;
        private readonly ICategoryRepository _categoryRepo;

        public AnalyticsController(
            IOrderRepository orderRepo, 
            IProductRepository productRepo, 
            ICustomerRepository customerRepo,
            ICategoryRepository categoryRepo)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
            _categoryRepo = categoryRepo;
        }

        // GET /api/admin/analytics/revenue-by-range?startYear=2025&startMonth=1&endYear=2025&endMonth=6
        [HttpGet("revenue-by-range")]
        public async Task<IActionResult> GetRevenueByRange(
            [FromQuery] int startYear, [FromQuery] int startMonth,
            [FromQuery] int endYear,   [FromQuery] int endMonth)
        {
            if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12)
                return BadRequest("Tháng không hợp lệ.");

            var rangeStart = new DateTime(startYear, startMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            var rangeEnd   = new DateTime(endYear,   endMonth,   1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);

            if (rangeStart > rangeEnd)
                return BadRequest("Khoảng thời gian không hợp lệ.");

            var orders = await _orderRepo.GetOrdersWithItemsAsync();
            var completedOrders = orders
                .Where(o => o.Status == "completed" && o.CreatedAt >= rangeStart && o.CreatedAt < rangeEnd)
                .ToList();

            var result = new List<RevenueDto>();
            var cursor = rangeStart;
            while (cursor < rangeEnd)
            {
                var next = cursor.AddMonths(1);
                var rev = completedOrders
                    .Where(o => o.CreatedAt >= cursor && o.CreatedAt < next)
                    .Sum(o => o.Total);
                result.Add(new RevenueDto
                {
                    Label   = $"T{cursor.Month}/{cursor.Year}",
                    Revenue = rev
                });
                cursor = next;
            }

            var totalRevenue    = result.Sum(r => r.Revenue);
            var totalOrders     = completedOrders.Count;
            var aov             = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            return Ok(new
            {
                months       = result,
                totalRevenue = totalRevenue,
                totalOrders  = totalOrders,
                aov          = aov
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboardData([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var totalOrdersAllTime = await _orderRepo.CountAsync();
            var totalProductsAllTime = await _productRepo.CountAsync();
            var totalCustomersAllTime = await _customerRepo.CountAsync();

            var now = DateTime.UtcNow;
            
            DateTime currentStart;
            DateTime currentEnd;
            DateTime previousStart;
            DateTime previousEnd;
            string currentLabel;
            string previousLabel;

            if (startDate.HasValue && endDate.HasValue)
            {
                currentStart = startDate.Value.Date;
                currentEnd = endDate.Value.Date.AddDays(1);
                var duration = currentEnd - currentStart;
                previousStart = currentStart.Subtract(duration);
                previousEnd = currentStart;
                currentLabel = "Tùy chỉnh";
                previousLabel = "Kỳ trước";
            }
            else
            {
                currentStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                currentEnd = currentStart.AddMonths(1);
                previousStart = currentStart.AddMonths(-1);
                previousEnd = currentStart;
                currentLabel = $"T{now.Month}/{now.Year}";
                previousLabel = $"T{previousStart.Month}/{previousStart.Year}";
            }

            var newOrdersToday = await _orderRepo.CountAsync(o => (o.Status == "pending" || o.Status == "confirmed") && o.CreatedAt >= now.Date);

            var allOrders = await _orderRepo.GetOrdersWithItemsAsync();
            
            var currentOrders = allOrders.Where(o => o.CreatedAt >= currentStart && o.CreatedAt < currentEnd).ToList();
            var previousOrders = allOrders.Where(o => o.CreatedAt >= previousStart && o.CreatedAt < previousEnd).ToList();

            var currentCompletedOrders = currentOrders.Where(o => o.Status == "completed").ToList();
            var previousCompletedOrders = previousOrders.Where(o => o.Status == "completed").ToList();

            var currentRevenue = currentCompletedOrders.Sum(o => o.Total);
            var previousRevenue = previousCompletedOrders.Sum(o => o.Total);

            var currentAov = currentCompletedOrders.Count > 0 ? currentRevenue / currentCompletedOrders.Count : 0;
            var previousAov = previousCompletedOrders.Count > 0 ? previousRevenue / previousCompletedOrders.Count : 0;

            double revenuePercentChange = previousRevenue > 0 ? (double)((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
            double aovPercentChange = previousAov > 0 ? (double)((currentAov - previousAov) / previousAov) * 100 : 0;
            double ordersPercentChange = previousOrders.Count > 0 ? (double)((currentOrders.Count - previousOrders.Count) / (double)previousOrders.Count) * 100 : 0;

            var allCustomers = await _customerRepo.ListAllAsync();
            var currentCustomers = allCustomers.Where(c => c.JoinedAt >= currentStart && c.JoinedAt < currentEnd).ToList();
            var previousCustomers = allCustomers.Where(c => c.JoinedAt >= previousStart && c.JoinedAt < previousEnd).ToList();
            double customersPercentChange = previousCustomers.Count > 0 ? (double)((currentCustomers.Count - previousCustomers.Count) / (double)previousCustomers.Count) * 100 : 0;

            var orderStatuses = new Dictionary<string, int>
            {
                { "pending", currentOrders.Count(o => o.Status == "pending") },
                { "confirmed", currentOrders.Count(o => o.Status == "confirmed") },
                { "shipping", currentOrders.Count(o => o.Status == "shipping") },
                { "completed", currentOrders.Count(o => o.Status == "completed") },
                { "cancelled", currentOrders.Count(o => o.Status == "cancelled") }
            };

            var products = await _productRepo.ListAllAsync();
            var categories = await _categoryRepo.ListAllAsync();
            
            var productIds = products.Select(p => p.Id).ToList();
            var productImagesDict = await _productRepo.GetProductImagesAsync(productIds);
            
            var productSalesQty = new Dictionary<int, int>();
            foreach(var o in currentOrders)
            {
                if (o.Status != "cancelled")
                {
                    foreach(var item in o.Items)
                    {
                        if (!productSalesQty.ContainsKey(item.ProductId))
                            productSalesQty[item.ProductId] = 0;
                        productSalesQty[item.ProductId] += item.Quantity;
                    }
                }
            }

            var topProducts = products.Select(p => new TopProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Category = categories.FirstOrDefault(c => c.Id == p.CategoryId)?.Name ?? "Khác",
                BasePrice = p.Variants?.FirstOrDefault()?.Price ?? 0,
                SalesQty = productSalesQty.ContainsKey(p.Id) ? productSalesQty[p.Id] : 0
            })
            .OrderByDescending(p => p.SalesQty > 0 ? p.SalesQty : p.BasePrice)
            .Take(5)
            .ToList();

            foreach (var tp in topProducts)
            {
                var pFull = await _productRepo.GetProductWithImagesAsync(tp.Id);
                tp.Images = pFull?.Variants?.SelectMany(v => v.Images ?? Enumerable.Empty<ProductImage>())
                    .OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList() ?? new System.Collections.Generic.List<string>();
                tp.FirstImage = tp.Images.FirstOrDefault();
            }

            var customerPhoneGroups = allOrders
                .Where(o => !string.IsNullOrEmpty(o.CustomerPhone))
                .GroupBy(o => o.CustomerPhone)
                .Select(g => g.Count())
                .ToList();

            var totalUniqueCustomers = customerPhoneGroups.Count;
            var repeatCustomers = customerPhoneGroups.Count(c => c > 1);
            double returnCustomerRate = totalUniqueCustomers > 0 ? (double)repeatCustomers / totalUniqueCustomers * 100 : 0;

            var analytics = new AnalyticsDto
            {
                TotalRevenue = currentRevenue,
                TotalOrders = currentOrders.Count,
                TotalProducts = totalProductsAllTime,
                TotalCustomers = totalCustomersAllTime,
                NewOrdersToday = newOrdersToday,

                CurrentMonthRevenue = currentRevenue,
                RevenuePercentChange = System.Math.Round(revenuePercentChange, 1),
                OrdersPercentChange = System.Math.Round(ordersPercentChange, 1),
                CustomersPercentChange = System.Math.Round(customersPercentChange, 1),

                CurrentMonthAov = currentAov,
                AovPercentChange = System.Math.Round(aovPercentChange, 1),
                ReturnCustomerRate = System.Math.Round(returnCustomerRate, 1),
                CurrentMonthLabel = currentLabel,
                PreviousMonthLabel = previousLabel,
                
                OrderStatuses = orderStatuses,
                TopProducts = topProducts
            };

            var chartDataList = new System.Collections.Generic.List<RevenueDto>();
            var durationDays = (currentEnd - currentStart).TotalDays;
            var allCompletedOrders = allOrders.Where(o => o.Status == "completed").ToList();

            if (durationDays <= 31)
            {
                // Group by Day
                for (var day = currentStart; day < currentEnd; day = day.AddDays(1))
                {
                    var dayRev = allCompletedOrders
                        .Where(o => o.CreatedAt >= day && o.CreatedAt < day.AddDays(1))
                        .Sum(o => o.Total);
                    
                    chartDataList.Add(new RevenueDto
                    {
                        Label = $"{day.Day}/{day.Month}",
                        Revenue = dayRev
                    });
                }
            }
            else
            {
                // Group by Month
                var cursor = new DateTime(currentStart.Year, currentStart.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                while (cursor < currentEnd)
                {
                    var nextMonth = cursor.AddMonths(1);
                    var monthRev = allCompletedOrders
                        .Where(o => o.CreatedAt >= cursor && o.CreatedAt < nextMonth)
                        .Sum(o => o.Total);

                    chartDataList.Add(new RevenueDto
                    {
                        Label = $"T{cursor.Month}/{cursor.Year}",
                        Revenue = monthRev
                    });
                    cursor = nextMonth;
                }
            }
            
            // We can repurpose WeeklyRevenue field to hold the dynamic chart data so frontend doesn't break entirely,
            // but the labels will be dynamic.
            analytics.WeeklyRevenue = chartDataList;

            var productCategoryMap = new System.Collections.Generic.Dictionary<int, string>();
            foreach (var product in products)
            {
                var cat = categories.FirstOrDefault(c => c.Id == product.CategoryId);
                if (cat != null)
                {
                    productCategoryMap[product.Id] = cat.Name;
                }
            }

            var categoryRevenueMap = new System.Collections.Generic.Dictionary<string, decimal>();
            foreach (var cat in categories)
            {
                categoryRevenueMap[cat.Name] = 0;
            }
            categoryRevenueMap["Khác"] = 0;

            decimal totalCatRevenue = 0;
            foreach (var order in currentCompletedOrders)
            {
                foreach (var item in order.Items)
                {
                    var revenue = item.UnitPrice * item.Quantity;
                    totalCatRevenue += revenue;

                    if (productCategoryMap.TryGetValue(item.ProductId, out var catName))
                    {
                        if (!categoryRevenueMap.ContainsKey(catName))
                        {
                            categoryRevenueMap[catName] = 0;
                        }
                        categoryRevenueMap[catName] += revenue;
                    }
                    else
                    {
                        categoryRevenueMap["Khác"] += revenue;
                    }
                }
            }

            var categoryColors = new System.Collections.Generic.Dictionary<string, string>
            {
                { "Lộc Bình", "#C8922A" },
                { "Đồ Thờ", "#9B8B75" },
                { "Tranh Gốm", "#3b82f6" },
                { "Bình Hoa", "#16a34a" },
                { "Chum – Vạt", "#1A0F05" },
                { "Đĩa Gốm", "#6366f1" },
                { "Khác", "#D5C8B5" }
            };

            var categoryRevenueList = new System.Collections.Generic.List<CategoryRevenueDto>();
            foreach (var kvp in categoryRevenueMap)
            {
                var value = totalCatRevenue > 0 ? System.Math.Round((kvp.Value / totalCatRevenue) * 100) : 0;
                if (kvp.Value > 0 || totalCatRevenue == 0)
                {
                    var color = categoryColors.TryGetValue(kvp.Key, out var c) ? c : "#999999";
                    categoryRevenueList.Add(new CategoryRevenueDto
                    {
                        Name = kvp.Key,
                        Value = value,
                        Color = color
                    });
                }
            }
            analytics.CategoryRevenue = categoryRevenueList;

            return Ok(analytics);
        }
    }
}

using System.Collections.Generic;

namespace BatTrang.Core.DTOs
{
    public class AnalyticsDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public int TotalProducts { get; set; }
        public int TotalCustomers { get; set; }
        public int NewOrdersToday { get; set; }

        public List<RevenueDto> WeeklyRevenue { get; set; } = new List<RevenueDto>();
        public List<RevenueDto> MonthlyRevenue { get; set; } = new List<RevenueDto>();
        public List<CategoryRevenueDto> CategoryRevenue { get; set; } = new List<CategoryRevenueDto>();
    }

    public class RevenueDto
    {
        public string Label { get; set; } = null!; // day or month
        public decimal Revenue { get; set; }
    }

    public class CategoryRevenueDto
    {
        public string Name { get; set; } = null!;
        public decimal Value { get; set; }
        public string Color { get; set; } = null!;
    }
}

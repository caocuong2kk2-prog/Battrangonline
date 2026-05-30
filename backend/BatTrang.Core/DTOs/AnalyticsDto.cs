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

        public decimal CurrentMonthRevenue { get; set; }
        public double RevenuePercentChange { get; set; }
        public double OrdersPercentChange { get; set; }
        public double CustomersPercentChange { get; set; }
        public decimal CurrentMonthAov { get; set; }
        public double AovPercentChange { get; set; }
        public double ReturnCustomerRate { get; set; }
        public string CurrentMonthLabel { get; set; } = null!;
        public string PreviousMonthLabel { get; set; } = null!;

        public List<RevenueDto> WeeklyRevenue { get; set; } = new List<RevenueDto>();
        public List<RevenueDto> MonthlyRevenue { get; set; } = new List<RevenueDto>();
        public List<CategoryRevenueDto> CategoryRevenue { get; set; } = new List<CategoryRevenueDto>();
        public Dictionary<string, int> OrderStatuses { get; set; } = new Dictionary<string, int>();
        public List<TopProductDto> TopProducts { get; set; } = new List<TopProductDto>();
    }

    public class TopProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Category { get; set; } = null!;
        public decimal BasePrice { get; set; }
        public int SalesQty { get; set; }
        public string? FirstImage { get; set; }
        public List<string> Images { get; set; } = new List<string>();
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

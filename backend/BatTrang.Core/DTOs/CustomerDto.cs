using System;

namespace BatTrang.Core.DTOs
{
    public class CustomerDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Password { get; set; }
        public string Status { get; set; } = "active";
        public DateTime JoinedAt { get; set; }

        public int OrdersCount { get; set; }
        public decimal TotalSpent { get; set; }
    }
}

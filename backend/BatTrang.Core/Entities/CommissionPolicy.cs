using System;

namespace BatTrang.Core.Entities
{
    public class CommissionPolicy
    {
        public int Id { get; set; }
        
        // Scope of the policy
        public string Tier { get; set; } = "All"; // All, Thường, Bạc, Vàng, Kim Cương
        
        // Target of the policy
        public int? CategoryId { get; set; } // Null means all categories
        public Category? Category { get; set; }

        public int? ProductId { get; set; } // Null means all products
        public Product? Product { get; set; }

        public decimal Percentage { get; set; } // E.g. 10.5 for 10.5%
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
    }
}

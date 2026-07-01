using System;
using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public string? Sku { get; set; }
        
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;

        public string? Usage { get; set; }
        
        public string Status { get; set; } = "active"; // active, inactive
        public string? MarketingBadges { get; set; }
        public bool IsUnique { get; set; } = false;
        public string? ShortDescription { get; set; }
        public string? Description { get; set; }
        public string? MetaDescription { get; set; }
        public string? Faqs { get; set; } // JSON list of FAQs specific to this product

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public int TotalSold { get; set; } = 0;
        
        public decimal CommissionRate { get; set; } = 10.0m; // Default 10% commission


        public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    }
}

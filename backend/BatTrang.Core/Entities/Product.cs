using System;
using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;

        public string? Material { get; set; }
        public string? Style { get; set; }
        public string? Color { get; set; }
        public string? Size { get; set; }
        
        public int Stock { get; set; }
        public string Status { get; set; } = "active"; // active, inactive
        public string? Badge { get; set; }
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    }
}

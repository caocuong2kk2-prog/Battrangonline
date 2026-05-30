using System;
using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;

        public string? Usage { get; set; }
        
        public string Status { get; set; } = "active"; // active, inactive
        public string? Badge { get; set; }
        public string? ShortDescription { get; set; }
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


        public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    }
}

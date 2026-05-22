using System;
using System.Collections.Generic;

namespace BatTrang.Core.DTOs
{
    public class ProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public string Category { get; set; } = null!; // Category slug
        public string? Material { get; set; }
        public string? Style { get; set; }
        public string? Color { get; set; }
        public string? Size { get; set; }
        public int Stock { get; set; }
        public string Status { get; set; } = null!;
        public string? Badge { get; set; }
        public string? Description { get; set; }
        public List<string> Images { get; set; } = new List<string>();
    }

    public class ProductFilterDto
    {
        public string? Category { get; set; }
        public string? Quality { get; set; }
        public string? Size { get; set; }
        public string? Sort { get; set; }
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 8;
        public string? SearchQuery { get; set; }
    }
}

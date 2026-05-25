using System;
using System.Collections.Generic;

namespace BatTrang.Core.DTOs
{
    public class ProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        // Computed base price for display purposes
        public decimal BasePrice { get; set; }
        public decimal? BaseOriginalPrice { get; set; }
        public string Category { get; set; } = null!; // Category slug
        public string? Material { get; set; }
        public string? Style { get; set; }
        public string? Color { get; set; }
        public int? GlazeLineId { get; set; }
        public string? GlazeLineName { get; set; }
        public string? Pattern { get; set; }
        public string? Usage { get; set; }
        // Computed total stock for display
        public int TotalStock { get; set; }
        public string Status { get; set; } = null!;
        public string? Badge { get; set; }
        public string? ShortDescription { get; set; }
        public string? Description { get; set; }
        public List<string> Images { get; set; } = new List<string>();
        public List<ProductVariantDto> Variants { get; set; } = new List<ProductVariantDto>();
    }

    public class ProductVariantDto
    {
        public int Id { get; set; }
        public string Size { get; set; } = null!;
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int Stock { get; set; }
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

    public class BulkStatusDto
    {
        public List<int> Ids { get; set; } = new List<int>();
        public string Status { get; set; } = null!;
    }

    public class BulkDeleteDto
    {
        public List<int> Ids { get; set; } = new List<int>();
    }
}

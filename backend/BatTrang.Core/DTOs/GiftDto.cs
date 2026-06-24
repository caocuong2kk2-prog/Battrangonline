using System;

namespace BatTrang.Core.DTOs
{
    public class GiftDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? ImageUrl { get; set; }
        public decimal? EstimatedValue { get; set; }
        public int? Stock { get; set; }
        public string Status { get; set; } = null!;
        public int Quantity { get; set; }
    }
}

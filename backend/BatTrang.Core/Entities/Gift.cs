using System;

namespace BatTrang.Core.Entities
{
    public class Gift
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? ImageUrl { get; set; }
        public decimal? EstimatedValue { get; set; } // Trị giá ước tính (gạch ngang trên UI)
        [System.ComponentModel.DataAnnotations.ConcurrencyCheck]
        public int? Stock { get; set; } // Số lượng trong kho (null nếu không giới hạn)
        public string Status { get; set; } = "active"; // active, inactive
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
    }
}

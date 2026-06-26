using System;

namespace BatTrang.Core.Entities
{
    public class SavedAddress
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string? Label { get; set; } // "Nhà riêng", "Công ty"...
        public string RecipientName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public int ProvinceCode { get; set; }
        public string ProvinceName { get; set; } = string.Empty;
        public int WardCode { get; set; }
        public string WardName { get; set; } = string.Empty;
        public string DetailAddress { get; set; } = string.Empty;
        public string FullAddress { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
    }
}

using System;

namespace BatTrang.Core.Entities
{
    public class AffiliateNotification
    {
        public int Id { get; set; }
        
        public int AffiliateId { get; set; }
        public BatTrang.Core.Entities.Affiliate.Affiliate? Affiliate { get; set; }

        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;
        
        // Loại thông báo: "order", "commission", "tier", "system"
        public string Type { get; set; } = "system";

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
    }
}

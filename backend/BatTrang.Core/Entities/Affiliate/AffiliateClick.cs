using System;

namespace BatTrang.Core.Entities.Affiliate
{
    public class AffiliateClick
    {
        public int Id { get; set; }
        
        public int AffiliateId { get; set; }
        public Affiliate Affiliate { get; set; } = null!;
        
        public string? ProductSlug { get; set; }
        public string? IpAddress { get; set; }
        public string? SessionId { get; set; }
        
        public DateTime ClickedAt { get; set; } = DateTime.UtcNow.AddHours(7);
    }
}

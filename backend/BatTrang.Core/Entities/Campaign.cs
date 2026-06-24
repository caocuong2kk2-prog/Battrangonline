using System;
using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Campaign
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DiscountPercent { get; set; }
        public string Status { get; set; } = "active"; // active, inactive
        public string? Description { get; set; }
        public string? TargetUrl { get; set; }
        public string? BannerImage { get; set; }
        
        public ICollection<CampaignProduct> CampaignProducts { get; set; } = new List<CampaignProduct>();
    }
}

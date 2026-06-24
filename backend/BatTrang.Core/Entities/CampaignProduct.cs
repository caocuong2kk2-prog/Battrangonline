using System.Text.Json.Serialization;

namespace BatTrang.Core.Entities
{
    public class CampaignProduct
    {
        public int Id { get; set; }
        
        public int CampaignId { get; set; }
        [JsonIgnore]
        public Campaign Campaign { get; set; } = null!;

        public int ProductId { get; set; }
        [JsonIgnore]
        public Product Product { get; set; } = null!;
    }
}

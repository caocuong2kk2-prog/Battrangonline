using System.Text.Json.Serialization;

namespace BatTrang.Core.Entities
{
    public class ProductVariant
    {
        public int Id { get; set; }
        
        public int ProductId { get; set; }
        [JsonIgnore]
        public Product Product { get; set; } = null!;
        
        public string Size { get; set; } = null!;
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int Stock { get; set; }
    }
}

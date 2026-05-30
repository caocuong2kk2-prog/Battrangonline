using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BatTrang.Core.Entities
{
    public class ProductVariant
    {
        public int Id { get; set; }
        
        public int ProductId { get; set; }
        [JsonIgnore]
        public Product Product { get; set; } = null!;
        
        public int? SizeId { get; set; }
        public Size? Size { get; set; }

        public int? ProductTypeId { get; set; }
        public ProductType? ProductType { get; set; }

        public int? GlazeLineId { get; set; }
        public GlazeLine? GlazeLine { get; set; }

        public int? MaterialId { get; set; }
        public Material? Material { get; set; }

        public int? ColorId { get; set; }
        public Color? Color { get; set; }

        public int? PatternId { get; set; }
        public Pattern? Pattern { get; set; }
        
        public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();

        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int Stock { get; set; }
    }
}

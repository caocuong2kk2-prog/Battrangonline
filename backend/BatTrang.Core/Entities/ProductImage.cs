namespace BatTrang.Core.Entities
{
    public class ProductImage
    {
        public int Id { get; set; }
        public int VariantId { get; set; }
        public ProductVariant Variant { get; set; } = null!;
        public string ImageUrl { get; set; } = null!;
        public int SortOrder { get; set; }
    }
}

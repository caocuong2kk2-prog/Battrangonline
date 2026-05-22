namespace BatTrang.Core.Entities
{
    public class ProductImage
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public string ImageUrl { get; set; } = null!;
        public int SortOrder { get; set; }
    }
}

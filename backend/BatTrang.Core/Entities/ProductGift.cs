namespace BatTrang.Core.Entities
{
    public class ProductGift
    {
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public int GiftId { get; set; }
        public Gift Gift { get; set; } = null!;

        public int Quantity { get; set; } = 1; // Số lượng quà tặng kèm mặc định
    }
}

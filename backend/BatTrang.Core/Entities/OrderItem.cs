namespace BatTrang.Core.Entities
{
    public class OrderItem
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public Order Order { get; set; } = null!;
        
        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!; // snapshot
        public string? Size { get; set; } // snapshot
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
    }
}

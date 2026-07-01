namespace BatTrang.Core.DTOs
{
    public class SizeDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public decimal ValueInCm { get; set; }


        public int ProductCount { get; set; }
    }
}

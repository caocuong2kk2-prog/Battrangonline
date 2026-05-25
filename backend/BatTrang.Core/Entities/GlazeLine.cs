using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class GlazeLine
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }

        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
}

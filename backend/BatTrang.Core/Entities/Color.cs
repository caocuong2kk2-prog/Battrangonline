using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Color
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;

        public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
    }
}

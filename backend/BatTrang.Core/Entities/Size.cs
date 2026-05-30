using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Size
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public decimal ValueInCm { get; set; }

        public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
    }
}

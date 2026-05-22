using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class JourneyTopic
    {
        public int Id { get; set; }
        public string Slug { get; set; } = null!;
        public string Name { get; set; } = null!;

        public ICollection<JourneyVideo> Videos { get; set; } = new List<JourneyVideo>();
    }
}

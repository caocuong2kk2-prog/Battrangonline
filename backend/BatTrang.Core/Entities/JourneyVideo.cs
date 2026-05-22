using System;

namespace BatTrang.Core.Entities
{
    public class JourneyVideo
    {
        public int Id { get; set; }
        public int TopicId { get; set; }
        public JourneyTopic Topic { get; set; } = null!;
        
        public string Title { get; set; } = null!;
        public string Url { get; set; } = null!;
        public string? Thumbnail { get; set; }
        public string? Duration { get; set; }
        public int SortOrder { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

namespace BatTrang.Core.DTOs
{
    public class JourneyTopicDto
    {
        public string Id { get; set; } = null!; // slug
        public string Name { get; set; } = null!;
    }

    public class JourneyVideoDto
    {
        public int Id { get; set; }
        public string TopicId { get; set; } = null!; // topic slug
        public string Title { get; set; } = null!;
        public string Url { get; set; } = null!;
        public string? Thumbnail { get; set; }
        public string? Duration { get; set; }
    }
}

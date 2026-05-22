namespace BatTrang.Core.Entities
{
    public class SiteConfig
    {
        public int Id { get; set; }
        public string Key { get; set; } = null!;
        public string Value { get; set; } = null!;
    }
}

namespace BatTrang.Core.DTOs
{
    public class CategoryDto
    {
        public string Id { get; set; } = null!; // slug acts as id for frontend
        public string Name { get; set; } = null!;
        public string? Icon { get; set; }
        public string? Desc { get; set; }
    }
}

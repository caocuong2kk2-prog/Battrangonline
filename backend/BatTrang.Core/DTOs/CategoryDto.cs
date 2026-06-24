namespace BatTrang.Core.DTOs
{
    public class CategoryDto
    {
        public string Id { get; set; } = null!; // slug acts as id for frontend
        public int NumericId { get; set; }
        public string Name { get; set; } = null!;
        public string? Icon { get; set; }
        public string? Desc { get; set; }
        public string? Faqs { get; set; }
        public int ProductCount { get; set; }
        public int? ParentId { get; set; }
        public System.Collections.Generic.List<CategoryDto>? SubCategories { get; set; }
    }
}

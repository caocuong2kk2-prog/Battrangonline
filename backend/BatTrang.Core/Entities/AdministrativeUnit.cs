namespace BatTrang.Core.Entities
{
    public class AdministrativeUnit
    {
        public int Code { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty; // "province" | "ward"
        public int? ParentCode { get; set; }
        public string? CodeName { get; set; }
        public string? DivisionType { get; set; } // "tỉnh", "thành phố trung ương", "phường", "xã", "thị trấn"
    }
}

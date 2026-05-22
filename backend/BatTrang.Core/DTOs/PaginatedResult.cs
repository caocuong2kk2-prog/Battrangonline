using System.Collections.Generic;

namespace BatTrang.Core.DTOs
{
    public class PaginatedResult<T>
    {
        public IEnumerable<T> Data { get; set; } = new List<T>();
        public int Total { get; set; }
        public int Page { get; set; }
    }
}

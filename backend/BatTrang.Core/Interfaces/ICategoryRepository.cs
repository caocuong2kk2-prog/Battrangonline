using BatTrang.Core.Entities;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface ICategoryRepository : IRepository<Category>
    {
        Task<Category?> GetBySlugAsync(string slug);
    }
}

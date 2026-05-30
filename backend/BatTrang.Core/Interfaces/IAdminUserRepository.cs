using BatTrang.Core.Entities;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface IAdminUserRepository
    {
        Task<System.Collections.Generic.IEnumerable<AdminUser>> GetAllAsync();
        Task<AdminUser?> GetByIdAsync(int id);
        Task<AdminUser?> GetByUsernameAsync(string username);
        Task AddAsync(AdminUser user);
        Task UpdateAsync(AdminUser user);
        Task DeleteAsync(AdminUser user);
    }
}

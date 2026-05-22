using BatTrang.Core.Entities;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface IAdminUserRepository
    {
        Task<AdminUser?> GetByUsernameAsync(string username);
        Task AddAsync(AdminUser user);
    }
}

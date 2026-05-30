using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Repositories
{
    public class AdminUserRepository : IAdminUserRepository
    {
        private readonly AppDbContext _context;

        public AdminUserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AdminUser?> GetByUsernameAsync(string username)
        {
            return await _context.AdminUsers.FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task AddAsync(AdminUser user)
        {
            await _context.AdminUsers.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(AdminUser user)
        {
            _context.AdminUsers.Update(user);
            await _context.SaveChangesAsync();
        }

        public async Task<System.Collections.Generic.IEnumerable<AdminUser>> GetAllAsync()
        {
            return await _context.AdminUsers.ToListAsync();
        }

        public async Task<AdminUser?> GetByIdAsync(int id)
        {
            return await _context.AdminUsers.FindAsync(id);
        }

        public async Task DeleteAsync(AdminUser user)
        {
            _context.AdminUsers.Remove(user);
            await _context.SaveChangesAsync();
        }
    }
}

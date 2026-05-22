using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Repositories
{
    public class SiteConfigRepository : ISiteConfigRepository
    {
        private readonly AppDbContext _context;

        public SiteConfigRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<SiteConfig>> GetAllConfigsAsync()
        {
            return await _context.SiteConfigs.ToListAsync();
        }

        public async Task<SiteConfig?> GetConfigByKeyAsync(string key)
        {
            return await _context.SiteConfigs.FirstOrDefaultAsync(s => s.Key == key);
        }

        public async Task UpdateConfigsAsync(Dictionary<string, string> configs)
        {
            foreach (var kvp in configs)
            {
                var existing = await _context.SiteConfigs.FirstOrDefaultAsync(s => s.Key == kvp.Key);
                if (existing != null)
                {
                    existing.Value = kvp.Value;
                }
                else
                {
                    await _context.SiteConfigs.AddAsync(new SiteConfig { Key = kvp.Key, Value = kvp.Value });
                }
            }
            await _context.SaveChangesAsync();
        }
    }
}

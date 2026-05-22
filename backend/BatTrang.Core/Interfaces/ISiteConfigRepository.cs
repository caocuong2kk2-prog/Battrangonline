using BatTrang.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface ISiteConfigRepository
    {
        Task<IReadOnlyList<SiteConfig>> GetAllConfigsAsync();
        Task<SiteConfig?> GetConfigByKeyAsync(string key);
        Task UpdateConfigsAsync(Dictionary<string, string> configs);
    }
}

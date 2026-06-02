using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/site-config")]
    [Authorize]
    public class SiteConfigController : ControllerBase
    {
        private readonly ISiteConfigRepository _configRepo;
        private readonly IOutputCacheStore _cacheStore;

        public SiteConfigController(ISiteConfigRepository configRepo, IOutputCacheStore cacheStore)
        {
            _configRepo = configRepo;
            _cacheStore = cacheStore;
        }

        [HttpGet]
        [AllowAnonymous]
        [OutputCache(PolicyName = "ConfigsCache")]
        public async Task<IActionResult> GetAll()
        {
            var configs = await _configRepo.GetAllConfigsAsync();
            var dict = configs.ToDictionary(c => c.Key, c => c.Value);
            return Ok(dict);
        }

        [HttpPost]
        [HttpPut]
        public async Task<IActionResult> UpdateAll([FromBody] System.Collections.Generic.Dictionary<string, string> configs)
        {
            // Clean up old files when config values with upload URLs are changed
            var existingConfigs = await _configRepo.GetAllConfigsAsync();
            var existingDict = existingConfigs.ToDictionary(c => c.Key, c => c.Value);

            foreach (var kvp in configs)
            {
                if (existingDict.TryGetValue(kvp.Key, out var oldValue)
                    && oldValue != kvp.Value
                    && !string.IsNullOrEmpty(oldValue)
                    && oldValue.StartsWith("/uploads/"))
                {
                    BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(oldValue);
                }
            }

            await _configRepo.UpdateConfigsAsync(configs);
            await _cacheStore.EvictByTagAsync("configs", default);
            return Ok(new { message = "Cập nhật thành công" });
        }
    }
}

using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/site-config")]
    public class SiteConfigController : ControllerBase
    {
        private readonly ISiteConfigRepository _configRepo;

        public SiteConfigController(ISiteConfigRepository configRepo)
        {
            _configRepo = configRepo;
        }

        [HttpGet]
        [AllowAnonymous]
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
            await _configRepo.UpdateConfigsAsync(configs);
            return Ok(new { message = "Cập nhật thành công" });
        }
    }
}

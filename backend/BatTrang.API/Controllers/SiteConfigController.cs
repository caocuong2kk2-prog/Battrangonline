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
    [Authorize(Policy = "AdminOnly")]
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
        public async Task<IActionResult> GetAll()
        {
            var configs = await _configRepo.GetAllConfigsAsync();
            var dict = configs.ToDictionary(c => c.Key, c => c.Value);
            
            bool isAdmin = User.Identity != null && User.Identity.IsAuthenticated && 
                           User.Claims.Any(c => c.Type == System.Security.Claims.ClaimTypes.Role && (c.Value == "Admin" || c.Value == "Staff" || c.Value == "admin" || c.Value == "staff"));
            
            if (isAdmin)
            {
                return Ok(dict);
            }

            var allowedKeys = new System.Collections.Generic.HashSet<string>(System.StringComparer.OrdinalIgnoreCase) 
            { 
                "StoreName", "ContactEmail", "ContactPhone", "Address", "Phone", "Email",
                "FacebookUrl", "ZaloUrl", "YoutubeUrl", "TiktokUrl", "InstagramUrl",
                "Facebook", "Youtube", "Tiktok", "Zalo", "Messenger",
                "WorkingHours", "TaxId", "BusinessRegistration",
                "LogoUrl", "FaviconUrl", "BannerUrl", "MapEmbedUrl", "MapIframe",
                "SeoTitle", "SeoDescription", "SeoKeywords",
                "PolicyReturns", "PolicyShipping", "PolicyWarranty", "PolicyPrivacy", "PolicyTerms",
                "FooterText", "HeaderNotice", "FrontendBaseUrl", "BankName", "BankAccount", "BankOwner",
                "ShipFee", "ShipMin", "ShipDays", "ShipArea", "HomeBanner", "CtaBanner", "PageBanner", 
                "ProductsBanner", "JourneyBanner", "AboutBanner", "ContactBanner", "HomeStoryImg", 
                "AboutStoryImg", "TeamAvatar1", "TeamAvatar2", "HomeStoryQuote", "HomeStoryText", 
                "Process1Title", "Process1Desc", "Process2Title", "Process2Desc", "Process3Title", 
                "Process3Desc", "Process4Title", "Process4Desc", "Process5Title", "Process5Desc", 
                "AboutStoryHtml", "CoreValue1Title", "CoreValue1Desc", "CoreValue2Title", "CoreValue2Desc", 
                "CoreValue3Title", "CoreValue3Desc", "CoreValue4Title", "CoreValue4Desc", "TeamName1", 
                "TeamRole1", "TeamBio1", "TeamName2", "TeamRole2", "TeamBio2", "Slogan"
            };

            var publicDict = dict.Where(kvp => allowedKeys.Contains(kvp.Key)).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
            return Ok(publicDict);
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


using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/campaigns")]
    public class CampaignsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CampaignsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveCampaign()
        {
            var now = DateTime.UtcNow;
            
            // Lấy chiến dịch đang active, trong khoảng thời gian diễn ra
            var campaign = await _context.Campaigns
                .Where(c => c.Status == "active" && c.StartDate <= now && c.EndDate >= now)
                .OrderByDescending(c => c.Id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.StartDate,
                    c.EndDate,
                    c.DiscountPercent,
                    c.Description,
                    c.TargetUrl,
                    c.BannerImage
                })
                .FirstOrDefaultAsync();

            if (campaign == null)
            {
                // Nếu không có chiến dịch nào đang diễn ra, tìm chiến dịch sắp diễn ra gần nhất
                campaign = await _context.Campaigns
                    .Where(c => c.Status == "active" && c.StartDate > now)
                    .OrderBy(c => c.StartDate)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.StartDate,
                        c.EndDate,
                        c.DiscountPercent,
                        c.Description,
                        c.TargetUrl,
                        c.BannerImage
                    })
                    .FirstOrDefaultAsync();
                    
                if (campaign == null)
                {
                    return NotFound(new { message = "Không có chương trình khuyến mãi nào" });
                }
            }

            return Ok(campaign);
        }
    }
}

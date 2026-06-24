using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers.Affiliate
{
    [ApiController]
    [Route("api/affiliates/notifications")]
    [Authorize(Roles = "affiliate")]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotificationsController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentAffiliateId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(idClaim, out int id))
            {
                return id;
            }
            return 0;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] bool unreadOnly = false)
        {
            int affiliateId = GetCurrentAffiliateId();
            if (affiliateId == 0) return Unauthorized();

            var query = _context.AffiliateNotifications.Where(n => n.AffiliateId == affiliateId);

            if (unreadOnly)
            {
                query = query.Where(n => !n.IsRead);
            }

            var total = await query.CountAsync();
            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(n => new
                {
                    n.Id,
                    n.Title,
                    n.Message,
                    n.Type,
                    n.IsRead,
                    n.CreatedAt
                })
                .ToListAsync();

            var unreadCount = await _context.AffiliateNotifications.CountAsync(n => n.AffiliateId == affiliateId && !n.IsRead);

            return Ok(new
            {
                data = notifications,
                total,
                page,
                limit,
                unreadCount
            });
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            int affiliateId = GetCurrentAffiliateId();
            if (affiliateId == 0) return Unauthorized();

            var unreadCount = await _context.AffiliateNotifications.CountAsync(n => n.AffiliateId == affiliateId && !n.IsRead);

            return Ok(new { unreadCount });
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            int affiliateId = GetCurrentAffiliateId();
            if (affiliateId == 0) return Unauthorized();

            var notification = await _context.AffiliateNotifications.FirstOrDefaultAsync(n => n.Id == id && n.AffiliateId == affiliateId);
            if (notification == null) return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            int affiliateId = GetCurrentAffiliateId();
            if (affiliateId == 0) return Unauthorized();

            var unreadNotifications = await _context.AffiliateNotifications
                .Where(n => n.AffiliateId == affiliateId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unreadNotifications)
            {
                n.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }
    }
}

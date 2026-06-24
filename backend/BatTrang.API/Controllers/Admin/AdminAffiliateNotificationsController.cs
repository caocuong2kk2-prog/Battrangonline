using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/affiliate-notifications")]
    [Authorize(Roles = "admin,manager")]
    public class AdminAffiliateNotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<BatTrang.API.Hubs.NotificationHub> _hubContext;

        public AdminAffiliateNotificationsController(AppDbContext context, Microsoft.AspNetCore.SignalR.IHubContext<BatTrang.API.Hubs.NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public class PushNotificationDto
        {
            public string Title { get; set; } = null!;
            public string Message { get; set; } = null!;
        }

        [HttpPost("push-all")]
        public async Task<IActionResult> PushToAll([FromBody] PushNotificationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Message))
            {
                return BadRequest(new { message = "Tiêu đề và nội dung không được để trống." });
            }

            var affiliates = await _context.Affiliates.Where(a => a.Status == "Active").Select(a => a.Id).ToListAsync();
            
            var notifications = new List<BatTrang.Core.Entities.AffiliateNotification>();
            foreach (var id in affiliates)
            {
                notifications.Add(new BatTrang.Core.Entities.AffiliateNotification
                {
                    AffiliateId = id,
                    Title = dto.Title,
                    Message = dto.Message,
                    Type = "system",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow.AddHours(7)
                });
            }

            if (notifications.Any())
            {
                foreach (var noti in notifications)
                {
                    _context.AffiliateNotifications.Add(noti);
                    // Bắn realtime để CTV tự động làm mới
                    try {
                        await _hubContext.Clients.Group($"Affiliate_{noti.AffiliateId}").SendAsync("ReceiveAffiliateNotification", "Admin Push", "Có thông báo từ Admin", "sync");
                    } catch {}
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, sentCount = notifications.Count, message = $"Đã gửi thông báo đến {notifications.Count} CTV." });
        }
    }
}

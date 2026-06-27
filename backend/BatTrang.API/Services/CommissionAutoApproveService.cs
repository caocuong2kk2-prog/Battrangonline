using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using BatTrang.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.SignalR;
using BatTrang.API.Hubs;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace BatTrang.API.Services
{
    public class CommissionAutoApproveService : BackgroundService
    {
        private readonly ILogger<CommissionAutoApproveService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public CommissionAutoApproveService(ILogger<CommissionAutoApproveService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("CommissionAutoApproveService is starting.");

            // Run immediately on startup to sweep any eligible commissions missed while server was down
            try
            {
                await AutoApproveCommissionsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while auto-approving commissions on startup.");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.UtcNow.AddHours(7);
                
                // We want to run this every day at 01:00 AM VN time
                var nextRunTime = new DateTime(now.Year, now.Month, now.Day, 1, 0, 0);
                
                // If it's already past 1 AM today, schedule for 1 AM tomorrow
                if (now > nextRunTime)
                {
                    nextRunTime = nextRunTime.AddDays(1);
                }

                var delay = nextRunTime - now;

                // Uncomment the line below to test immediately on startup
                // delay = TimeSpan.FromSeconds(10); 

                _logger.LogInformation($"Next auto-approve check scheduled for: {nextRunTime} (in {delay.TotalHours:F2} hours).");

                await Task.Delay(delay, stoppingToken);

                try
                {
                    await AutoApproveCommissionsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while auto-approving commissions.");
                }
            }
        }

        private async Task AutoApproveCommissionsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<NotificationHub>>();
            var configRepo = scope.ServiceProvider.GetRequiredService<ISiteConfigRepository>();

            var configs = await configRepo.GetAllConfigsAsync();
            var configDict = configs.ToDictionary(c => c.Key, c => c.Value);

            bool autoApproveEnabled = configDict.TryGetValue("CommissionAutoApprove", out var val) && val == "true";
            int returnPeriodDays = configDict.TryGetValue("CommissionReturnPeriodDays", out var daysStr) && int.TryParse(daysStr, out var days) ? days : 7;

            if (!autoApproveEnabled)
            {
                _logger.LogInformation("Auto-approve is disabled in site config.");
                return;
            }

            _logger.LogInformation($"Starting auto-approve for commissions older than {returnPeriodDays} days.");

            var cutoffDate = DateTime.UtcNow.AddHours(7).AddDays(-returnPeriodDays);

            var pendingCommissions = await dbContext.Commissions
                .Include(c => c.Order)
                .Where(c => c.Status == "Pending" && c.CreatedAt <= cutoffDate)
                .ToListAsync();

            if (!pendingCommissions.Any())
            {
                _logger.LogInformation("No pending commissions eligible for auto-approval.");
                return;
            }

            int approvedCount = 0;
            foreach (var commission in pendingCommissions)
            {
                commission.Status = "Approved";
                commission.ProcessedAt = DateTime.UtcNow.AddHours(7);
                approvedCount++;

                // Notify Affiliate
                var affNoti = new AffiliateNotification
                {
                    AffiliateId = commission.AffiliateId,
                    Title = "Hoa hồng đã được duyệt ✅",
                    Message = $"Hoa hồng từ đơn hàng {commission.Order?.OrderCode} đã qua thời gian đổi trả và được tự động duyệt.",
                    Type = "commission",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow.AddHours(7)
                };
                dbContext.Set<AffiliateNotification>().Add(affNoti);
                
                try 
                {
                    await hubContext.Clients.Group($"Affiliate_{commission.AffiliateId}").SendAsync("ReceiveAffiliateNotification", 
                            "Hoa hồng đã được duyệt ✅", 
                            $"Hoa hồng từ đơn hàng {commission.Order?.OrderCode} đã được tự động duyệt.", 
                            "commission");
                } 
                catch { }
            }

            if (approvedCount > 0)
            {
                // Admin notification
                var adminMsg = $"Hệ thống vừa tự động duyệt {approvedCount} khoản hoa hồng đã qua thời gian đổi trả ({returnPeriodDays} ngày).";
                var noti = new BatTrang.Core.Entities.Notification { Type = "CommissionCreated", Message = adminMsg };
                dbContext.Notifications.Add(noti);
                
                await dbContext.SaveChangesAsync();
                
                try
                {
                    await hubContext.Clients.Group("Admins").SendAsync("ReceiveNotification", "CommissionCreated", adminMsg);
                }
                catch { }

                _logger.LogInformation($"Successfully auto-approved {approvedCount} commissions.");
            }
        }
    }
}

using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Services
{
    public class NotificationCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<NotificationCleanupService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromHours(24); // Runs once every 24 hours

        // Initial delay before first run (5 minutes)
        private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(5);

        // Keep read notifications for 30 days
        private const int KeepDays = 30;

        public NotificationCleanupService(IServiceScopeFactory scopeFactory, ILogger<NotificationCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[NotificationCleanup] Background service started. Interval: {Interval}h, Retention: {KeepDays} days", _interval.TotalHours, KeepDays);

            try
            {
                // Wait for the initial delay before running the first cleanup cycle
                await Task.Delay(_initialDelay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var deletedCount = await CleanOldNotificationsAsync(stoppingToken);
                    if (deletedCount > 0)
                    {
                        _logger.LogInformation("[NotificationCleanup] Successfully cleaned up {Count} old read notifications.", deletedCount);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[NotificationCleanup] Error occurred during notification cleanup");
                }

                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }
        }

        private async Task<int> CleanOldNotificationsAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cutoffDate = DateTime.UtcNow.AddHours(7).AddDays(-KeepDays);

            // Execute SQL delete directly using EF Core 7+ ExecuteDeleteAsync
            var deletedCount = await context.Notifications
                .Where(n => n.IsRead && n.CreatedAt < cutoffDate)
                .ExecuteDeleteAsync(cancellationToken);

            return deletedCount;
        }
    }
}

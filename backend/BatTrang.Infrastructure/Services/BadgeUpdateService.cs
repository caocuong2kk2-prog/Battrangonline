using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Services
{
    public class BadgeUpdateService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BadgeUpdateService> _logger;

        public BadgeUpdateService(IServiceProvider serviceProvider, ILogger<BadgeUpdateService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BadgeUpdateService is starting.");
            
            // Wait a little bit before the first run so the application can fully start
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await UpdateBadgesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while updating badges.");
                }

                // Run periodically every 1 hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        private async Task UpdateBadgesAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var products = await dbContext.Products
                .Where(p => p.Status == "active")
                .ToListAsync(stoppingToken);

            int updatedCount = 0;
            var now = DateTime.UtcNow;

            foreach (var product in products)
            {
                var currentBadges = string.IsNullOrEmpty(product.MarketingBadges) 
                    ? new List<string>() 
                    : product.MarketingBadges.Split(',').Select(b => b.Trim()).Where(b => !string.IsNullOrEmpty(b)).ToList();

                // Remove old auto-generated badges to clear them out
                var oldAutoBadges = new[] { "Mới", "Mua nhiều"};
                var manualBadges = currentBadges.Where(b => !oldAutoBadges.Contains(b)).ToList();
                var newBadges = new List<string>(manualBadges);

                // Nếu Admin đã chọn tay một thẻ bất kỳ (như Hot, Nổi bật...), thì sẽ ưu tiên hiển thị duy nhất thẻ đó (không thêm thẻ tự động)
                if (newBadges.Count == 0)
                {
                    // Auto badge logic: Prioritize "Mua nhiều" over "Mới". Only assign one.
                    if (product.TotalSold > 10)
                    {
                        newBadges.Add("Mua nhiều");
                    }
                    else if ((now - product.CreatedAt).TotalDays <= 30)
                    {
                        newBadges.Add("Mới");
                    }
                }

                string newBadgeStr = newBadges.Any() ? string.Join(", ", newBadges.Distinct()) : null;

                if (product.MarketingBadges != newBadgeStr)
                {
                    product.MarketingBadges = newBadgeStr;
                    // Note: We don't necessarily update UpdatedAt here if we want to preserve the admin's last update timestamp,
                    // but for cache invalidation it might be useful. We'll leave UpdatedAt intact.
                    updatedCount++;
                }
            }

            if (updatedCount > 0)
            {
                await dbContext.SaveChangesAsync(stoppingToken);
                _logger.LogInformation($"Successfully updated MarketingBadges for {updatedCount} active products.");
            }
        }
    }
}

using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.OutputCaching;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace BatTrang.API.Services
{
    public class CampaignUpdateService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CampaignUpdateService> _logger;

        public CampaignUpdateService(IServiceProvider serviceProvider, ILogger<CampaignUpdateService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("CampaignUpdateService is starting.");
            
            // Wait 15 seconds on startup
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessCampaignsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while processing campaigns.");
                }

                // Run every minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task ProcessCampaignsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cacheStore = scope.ServiceProvider.GetRequiredService<IOutputCacheStore>();

            var now = DateTime.UtcNow.AddHours(7);
            bool dataChanged = false;

            // 1. Mark campaigns as ended FIRST so they are excluded from active price computation
            var expiredCampaigns = await dbContext.Campaigns
                .Where(c => c.Status == "active" && c.EndDate <= now)
                .ToListAsync(stoppingToken);

            foreach (var campaign in expiredCampaigns)
            {
                campaign.Status = "ended";
                dataChanged = true;
                _logger.LogInformation($"Campaign '{campaign.Name}' has automatically ended.");
            }

            // 2. Find active campaigns that are running right now (expired ones are already marked 'ended')
            var activeCampaigns = await dbContext.Campaigns
                .Include(c => c.CampaignProducts)
                .Where(c => c.Status == "active" && c.StartDate <= now && c.EndDate > now)
                .ToListAsync(stoppingToken);

            var activeCampaignProductIds = activeCampaigns
                .SelectMany(c => c.CampaignProducts.Select(cp => new { cp.ProductId, c.DiscountPercent }))
                .ToList();

            // Handle potential conflicts if a product is in multiple active campaigns (take max discount)
            var productMaxDiscounts = activeCampaignProductIds
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.Max(x => x.DiscountPercent));

            // 3. Clear CampaignPrice from products NOT in any active campaign anymore
            var variantsWithCampaignPrice = await dbContext.ProductVariants
                .Where(v => v.CampaignPrice != null)
                .ToListAsync(stoppingToken);

            foreach (var variant in variantsWithCampaignPrice)
            {
                if (!productMaxDiscounts.ContainsKey(variant.ProductId))
                {
                    // Campaign ended or product removed from campaign
                    variant.CampaignPrice = null;
                    dataChanged = true;
                }
            }

            // 4. Apply CampaignPrice to variants in active campaigns
            if (productMaxDiscounts.Any())
            {
                var productIdsToApply = productMaxDiscounts.Keys.ToList();
                var variantsToApply = await dbContext.ProductVariants
                    .Where(v => productIdsToApply.Contains(v.ProductId))
                    .ToListAsync(stoppingToken);

                foreach (var variant in variantsToApply)
                {
                    var discountPercent = productMaxDiscounts[variant.ProductId];
                    var expectedCampaignPrice = Math.Round(variant.Price * (1 - (decimal)discountPercent / 100));

                    if (variant.CampaignPrice != expectedCampaignPrice)
                    {
                        variant.CampaignPrice = expectedCampaignPrice;
                        dataChanged = true;
                    }
                }
            }

            if (dataChanged)
            {
                await dbContext.SaveChangesAsync(stoppingToken);
                await cacheStore.EvictByTagAsync("products", stoppingToken);
                await cacheStore.EvictByTagAsync("filters", stoppingToken);
                _logger.LogInformation("Successfully updated campaign prices and evicted caches.");
            }
        }
    }
}

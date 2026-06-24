using BatTrang.Core.Entities;
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
    public class AffiliateTierEvaluationService : BackgroundService
    {
        private readonly ILogger<AffiliateTierEvaluationService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public AffiliateTierEvaluationService(ILogger<AffiliateTierEvaluationService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AffiliateTierEvaluationService is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.UtcNow;
                
                // Kiểm tra xem đã đến mùng 1 hàng tháng lúc 00:00 chưa (chỉ chạy 1 lần)
                // Để đơn giản, chạy mỗi 24h và kiểm tra nếu ngày == 1
                if (now.Day == 1)
                {
                    _logger.LogInformation("Ngày mùng 1: Bắt đầu tiến hành xét duyệt lại xếp hạng của toàn bộ CTV.");
                    try
                    {
                        await EvaluateTiersAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Lỗi khi xét duyệt lại xếp hạng CTV.");
                    }
                    
                    // Chờ đến ngày hôm sau để tránh chạy lại trong ngày mùng 1
                    await Task.Delay(TimeSpan.FromDays(1), stoppingToken);
                }
                else
                {
                    // Chờ đến ngày tiếp theo
                    var nextDay = now.Date.AddDays(1);
                    var delay = nextDay - now;
                    await Task.Delay(delay, stoppingToken);
                }
            }
        }

        private async Task EvaluateTiersAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var configs = await dbContext.Set<SiteConfig>().ToListAsync();
            var configDict = configs.ToDictionary(c => c.Key, c => c.Value);

            decimal getDecimal(string key, decimal defaultVal)
            {
                return configDict.TryGetValue(key, out var valStr) && decimal.TryParse(valStr, out var val) ? val : defaultVal;
            }

            decimal silverMin = getDecimal("AffiliateTierSilverMinRevenue", 15000000);
            decimal goldMin = getDecimal("AffiliateTierGoldMinRevenue", 50000000);
            decimal diamondMin = getDecimal("AffiliateTierDiamondMinRevenue", 150000000);

            // Tính doanh thu tháng trước
            var lastMonth = DateTime.UtcNow.AddMonths(-1);
            var targetMonth = lastMonth.Month;
            var targetYear = lastMonth.Year;

            // Lấy tất cả CTV đang active
            var affiliates = await dbContext.Affiliates.Where(a => a.Status == "Active").ToListAsync();

            foreach (var affiliate in affiliates)
            {
                var monthlyRevenue = await dbContext.Orders
                    .Where(o => o.AffiliateId == affiliate.Id && o.Status == "completed" && 
                                o.CompletedAt.HasValue && o.CompletedAt.Value.Month == targetMonth && o.CompletedAt.Value.Year == targetYear)
                    .SumAsync(o => o.Total);

                string newTier = "Thường";
                if (monthlyRevenue >= diamondMin) newTier = "Kim Cương";
                else if (monthlyRevenue >= goldMin) newTier = "Vàng";
                else if (monthlyRevenue >= silverMin) newTier = "Bạc";

                // Map VIP sang Vàng (Do option VIP không còn trên UI cấu hình nữa)
                var currentTier = affiliate.Tier ?? "Thường";
                if (currentTier == "VIP" && newTier == "Thường") {
                    // Nếu admin cố tình set VIP thì bỏ qua hoặc tuỳ chỉnh
                }

                if (currentTier != newTier)
                {
                    _logger.LogInformation($"CTV {affiliate.Id} thay đổi hạng từ {currentTier} sang {newTier} do doanh thu tháng trước đạt {monthlyRevenue}");
                    affiliate.Tier = newTier;
                }
            }

            await dbContext.SaveChangesAsync();
            _logger.LogInformation("Đã hoàn tất xét duyệt lại xếp hạng của toàn bộ CTV.");
        }
    }
}

using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Services
{
    public class CommissionService
    {
        private readonly AppDbContext _context;

        public CommissionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> ProcessOrderCommissionAsync(string orderCode)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.Affiliate)
                .FirstOrDefaultAsync(o => o.OrderCode == orderCode);

            if (order == null || order.AffiliateId == null) return false;
            if (order.Status != "completed") return false;

            var affiliate = order.Affiliate;
            if (affiliate == null || affiliate.Status != "Active") return false;

            // Check if commission already exists for this order
            var existingCommission = await _context.Commissions.FirstOrDefaultAsync(c => c.OrderId == order.Id);
            if (existingCommission != null) return false; // Already processed

            // TÍNH HOA HỒNG DỰA TRÊN TỪNG SẢN PHẨM (PRODUCT-LEVEL COMMISSION)
            decimal totalCommissionAmount = 0;
            
            // Lấy CommissionRate của từng sản phẩm trong đơn hàng (bỏ qua quà tặng có ProductId = 0)
            var productIds = order.Items.Where(i => i.ProductId > 0).Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();
            var commissionRates = products.ToDictionary(p => p.Id, p => p.CommissionRate);

            foreach (var item in order.Items)
            {
                decimal productRate = item.ProductId > 0 && commissionRates.ContainsKey(item.ProductId) 
                    ? commissionRates[item.ProductId] 
                    : 0;
                totalCommissionAmount += item.Quantity * item.UnitPrice * (productRate / 100);
            }

            if (totalCommissionAmount <= 0) return false;

            // Đọc cấu hình các mốc hạng
            var configs = await _context.Set<SiteConfig>().ToListAsync();
            var configDict = configs.ToDictionary(c => c.Key, c => c.Value);

            decimal getDecimal(string key, decimal defaultVal)
            {
                return configDict.TryGetValue(key, out var valStr) && decimal.TryParse(valStr, out var val) ? val : defaultVal;
            }

            decimal silverMin = getDecimal("AffiliateTierSilverMinRevenue", 15000000);
            decimal silverBonus = getDecimal("AffiliateTierSilverBonus", 2);
            decimal goldMin = getDecimal("AffiliateTierGoldMinRevenue", 50000000);
            decimal goldBonus = getDecimal("AffiliateTierGoldBonus", 3);
            decimal diamondMin = getDecimal("AffiliateTierDiamondMinRevenue", 150000000);
            decimal diamondBonus = getDecimal("AffiliateTierDiamondBonus", 5);

            // BƯỚC 1: Tính tổng doanh thu tháng hiện tại của CTV để xét thăng hạng
            var currentMonth = DateTime.UtcNow.Month;
            var currentYear = DateTime.UtcNow.Year;
            
            // Doanh thu chỉ tính từ các đơn đã thanh toán/hoàn thành trong tháng
            var monthlyRevenue = await _context.Orders
                .Where(o => o.AffiliateId == affiliate.Id && o.Status == "completed" && 
                            o.CompletedAt.HasValue && o.CompletedAt.Value.Month == currentMonth && o.CompletedAt.Value.Year == currentYear)
                .SumAsync(o => o.Total);

            // Xác định hạng mới dựa trên doanh thu
            string newTier = "Thường";
            decimal currentTierBonus = 0;

            if (monthlyRevenue >= diamondMin)
            {
                newTier = "Kim Cương";
                currentTierBonus = diamondBonus;
            }
            else if (monthlyRevenue >= goldMin)
            {
                newTier = "Vàng";
                currentTierBonus = goldBonus;
            }
            else if (monthlyRevenue >= silverMin)
            {
                newTier = "Bạc";
                currentTierBonus = silverBonus;
            }

            // Cập nhật hạng nếu có sự thay đổi (chỉ thăng hạng, không tụt hạng giữa tháng)
            var tierOrder = new[] { "Thường", "Bạc", "Vàng", "VIP", "Kim Cương" };
            int currentTierIndex = Array.IndexOf(tierOrder, affiliate.Tier ?? "Thường");
            int newTierIndex = Array.IndexOf(tierOrder, newTier);
            
            // Xử lý mapping cho VIP nếu cần, nhưng giả sử hiện tại map thẳng vào logic mới.
            if (newTierIndex > currentTierIndex)
            {
                affiliate.Tier = newTier;
                // Tạo Notification chúc mừng thăng hạng
                _context.Set<BatTrang.Core.Entities.AffiliateNotification>().Add(new BatTrang.Core.Entities.AffiliateNotification
                {
                    AffiliateId = affiliate.Id,
                    Title = "Thăng hạng thành công! 🎉",
                    Message = $"Chúc mừng! Doanh thu của bạn đã vượt mốc, bạn chính thức lên hạng {newTier}.",
                    Type = "tier",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow.AddHours(7)
                });
            }
            else
            {
                // Vẫn dùng mức thưởng của rank cũ nếu rank cũ cao hơn (trường hợp rank cũ của tháng trước chuyển sang)
                var activeTier = affiliate.Tier ?? "Thường";
                if (activeTier == "Kim Cương") currentTierBonus = diamondBonus;
                else if (activeTier == "Vàng") currentTierBonus = goldBonus;
                else if (activeTier == "Bạc") currentTierBonus = silverBonus;
                else if (activeTier == "VIP") currentTierBonus = goldBonus; // Map VIP to Gold for now or custom
            }

            // Tính tiền thưởng hạng (dựa trên Tổng giá trị đơn hàng hoặc Tổng hoa hồng gốc?)
            // "Thưởng thêm %" thường là cộng thêm % hoa hồng trên TỔNG DOANH SỐ của đơn hàng.
            // VD: Hoa hồng gốc 10% (được 1tr) + thưởng thêm 2% (được 200k) -> Tổng 1.2tr
            decimal tierBonusAmount = order.Total * (currentTierBonus / 100);

            // Tính tỷ lệ trung bình gốc để hiển thị (tùy chọn)
            decimal baseAverageRate = order.Total > 0 ? (totalCommissionAmount / order.Total) * 100 : 0;
            decimal totalRate = baseAverageRate + currentTierBonus;
            decimal finalCommission = totalCommissionAmount + tierBonusAmount;

            var commission = new Commission
            {
                AffiliateId = order.AffiliateId.Value,
                OrderId = order.Id,
                OrderTotalAmount = order.Total,
                CommissionRate = Math.Round(totalRate, 2),
                CommissionAmount = Math.Round(finalCommission, 2),
                BaseCommissionAmount = Math.Round(totalCommissionAmount, 2),
                TierBonusAmount = Math.Round(tierBonusAmount, 2),
                Status = "Pending", // Admin can approve later, or auto-approved
                CreatedAt = DateTime.UtcNow.AddHours(7)
            };

            _context.Commissions.Add(commission);

            _context.Set<BatTrang.Core.Entities.AffiliateNotification>().Add(new BatTrang.Core.Entities.AffiliateNotification
            {
                AffiliateId = order.AffiliateId.Value,
                Title = "Hoa hồng mới được ghi nhận 💰",
                Message = $"Tuyệt vời! Đơn hàng {order.OrderCode} đã hoàn thành. Bạn nhận được +{Math.Round(finalCommission, 0).ToString("N0")}đ vào ví chờ duyệt.",
                Type = "commission",
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddHours(7)
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task RevertOrderCommissionAsync(string orderCode)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderCode == orderCode);
            if (order == null || order.AffiliateId == null) return;

            var existingCommission = await _context.Commissions.FirstOrDefaultAsync(c => c.OrderId == order.Id);
            if (existingCommission != null && existingCommission.Status != "Refunded")
            {
                existingCommission.Status = "Refunded";
                existingCommission.ProcessedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }
}

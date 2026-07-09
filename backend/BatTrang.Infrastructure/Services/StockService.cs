using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Services
{
    public class StockService
    {
        private readonly AppDbContext _context;

        public StockService(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Thực hiện thay đổi số lượng tồn kho an toàn, có cơ chế Retry nếu bị đụng độ (Concurrency).
        /// </summary>
        /// <param name="variantId">ID của ProductVariant</param>
        /// <param name="delta">Số lượng thay đổi (Âm: Khách mua, Dương: Hoàn kho)</param>
        /// <returns>True nếu thành công, False nếu không đủ kho hoặc không tìm thấy.</returns>
        public async Task<(bool Success, int RemainingTotalStock, string? ProductName)> AdjustStockAsync(int variantId, int delta, bool saveChanges = true)
        {
            const int maxRetryCount = 3;

            for (int i = 0; i < maxRetryCount; i++)
            {
                try
                {
                    var variant = await _context.ProductVariants
                                                .Include(v => v.Product)
                                                .FirstOrDefaultAsync(v => v.Id == variantId);
                                                
                    if (variant == null) return (false, 0, null);

                    // Nếu là khách mua hàng (delta < 0), kiểm tra xem kho còn đủ không
                    if (delta < 0 && variant.Stock < Math.Abs(delta))
                    {
                        return (false, 0, null); // Hết hàng hoặc không đủ hàng
                    }

                    variant.Stock = Math.Max(0, variant.Stock + delta);

                    int totalStock = 0;
                    string? productName = variant.Product?.Name;

                        var product = variant.Product;
                        if (product != null)
                        {
                            var allVariants = await _context.ProductVariants
                                                            .Where(v => v.ProductId == variant.ProductId)
                                                            .ToListAsync();
                            
                            totalStock = allVariants.Sum(v => v.Id == variantId ? variant.Stock : v.Stock);
                        }

                    if (saveChanges)
                    {
                        await _context.SaveChangesAsync();
                    }
                    return (true, totalStock, productName);
                }
                catch (DbUpdateConcurrencyException)
                {
                    // Lỗi đồng thời do có thread khác vừa thay đổi Stock.
                    // Xóa tracker và thử lại từ đầu để lấy số liệu mới nhất.
                    _context.ChangeTracker.Clear();
                    
                    if (i == maxRetryCount - 1)
                    {
                        throw; // Quá số lần retry, bỏ cuộc
                    }
                }
            }

            return (false, 0, null);
        }
    }
}

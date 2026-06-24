using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Repositories
{
    public class ProductRepository : Repository<Product>, IProductRepository
    {
        public ProductRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<PaginatedResult<Product>> GetProductsAsync(ProductFilterDto filter)
        {
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Images)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Size)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.GlazeLine)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.ProductType)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Material)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Color)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Pattern)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Category) && filter.Category != "all")
            {
                var categorySlugs = _context.Categories
                    .Where(c => c.Slug == filter.Category || (c.Parent != null && c.Parent.Slug == filter.Category))
                    .Select(c => c.Slug)
                    .ToList();
                query = query.Where(p => categorySlugs.Contains(p.Category.Slug));
            }

            if (!string.IsNullOrEmpty(filter.SearchQuery))
            {
                var lowerSearch = filter.SearchQuery.ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(lowerSearch) 
                                      || p.Category.Name.ToLower().Contains(lowerSearch)
                                      || (p.Sku != null && p.Sku.ToLower().Contains(lowerSearch)));
            }

            if (!string.IsNullOrEmpty(filter.Quality) && filter.Quality != "all")
            {
                var glazeLineIds = filter.Quality.Split(',').Select(id => int.TryParse(id.Trim(), out var val) ? val : 0).Where(v => v > 0).ToList();
                if (glazeLineIds.Any())
                {
                    query = query.Where(p => p.Variants.Any(v => v.GlazeLineId.HasValue && glazeLineIds.Contains(v.GlazeLineId.Value)));
                }
            }

            // Size filtering matching predefined values or range input
            if (!string.IsNullOrEmpty(filter.Size) && filter.Size != "all")
            {
                var input = filter.Size.Trim().ToLower();
                if (input == "under60")
                {
                    query = query.Where(p => p.Variants.Any(v => v.Size != null && v.Size.ValueInCm > 0 && v.Size.ValueInCm < 60));
                }
                else if (input == "above150")
                {
                    query = query.Where(p => p.Variants.Any(v => v.Size != null && v.Size.ValueInCm > 150));
                }
                else if (input.Contains('-'))
                {
                    var parts = input.Split('-');
                    if (parts.Length == 2)
                    {
                        var minCm = ParseSizeToCm(parts[0].Trim());
                        var maxCm = ParseSizeToCm(parts[1].Trim());
                        if (minCm > 0 || maxCm > 0)
                        {
                            query = query.Where(p => p.Variants.Any(v => v.Size != null && v.Size.ValueInCm >= minCm && v.Size.ValueInCm <= maxCm));
                        }
                    }
                }
                else
                {
                    var items = input.Split(',').Select(x => x.Trim()).Where(x => !string.IsNullOrEmpty(x)).ToList();
                    if (items.Any())
                    {
                        var parsedCms = items.Select(x => ParseSizeToCm(x)).Where(x => x > 0).ToList();
                        query = query.Where(p => p.Variants.Any(v => v.Size != null && 
                            (items.Contains(v.Size.Name.ToLower()) || 
                             v.Size.Name.ToLower().Contains(input) ||
                             (v.Size.ValueInCm > 0 && parsedCms.Contains(v.Size.ValueInCm)))));
                    }
                }
            }

            if (!string.IsNullOrEmpty(filter.Material) && filter.Material != "all")
            {
                var materialIds = filter.Material.Split(',').Select(id => int.TryParse(id.Trim(), out var val) ? val : 0).Where(v => v > 0).ToList();
                if (materialIds.Any())
                {
                    query = query.Where(p => p.Variants.Any(v => v.MaterialId.HasValue && materialIds.Contains(v.MaterialId.Value)));
                }
            }

            if (!string.IsNullOrEmpty(filter.ProductType) && filter.ProductType != "all")
            {
                var typeIds = filter.ProductType.Split(',').Select(id => int.TryParse(id.Trim(), out var val) ? val : 0).Where(v => v > 0).ToList();
                if (typeIds.Any())
                {
                    query = query.Where(p => p.Variants.Any(v => v.ProductTypeId.HasValue && typeIds.Contains(v.ProductTypeId.Value)));
                }
            }
            if (filter.MinPrice.HasValue)
            {
                query = query.Where(p => p.Variants.Any() && p.Variants.Min(v => v.CampaignPrice ?? v.Price) >= filter.MinPrice.Value);
            }

            if (filter.MaxPrice.HasValue)
            {
                query = query.Where(p => p.Variants.Any() && p.Variants.Min(v => v.CampaignPrice ?? v.Price) <= filter.MaxPrice.Value);
            }

            if (!string.IsNullOrEmpty(filter.Status) && filter.Status != "all")
            {
                if (filter.Status == "in-stock")
                {
                    query = query.Where(p => p.Status != "inactive");
                }
                else if (filter.Status == "out-of-stock")
                {
                    query = query.Where(p => p.Status == "inactive");
                }
            }

            switch (filter.Sort)
            {
                case "price-asc":
                    query = query.OrderBy(p => p.Variants.Min(v => (decimal?)(v.CampaignPrice ?? v.Price)) ?? 0);
                    break;
                case "price-desc":
                    query = query.OrderByDescending(p => p.Variants.Min(v => (decimal?)(v.CampaignPrice ?? v.Price)) ?? 0);
                    break;
                case "newest":
                default:
                    query = query.OrderByDescending(p => p.Id);
                    break;
            }

            var total = await query.CountAsync();
            var data = await query.Skip((filter.Page - 1) * filter.Limit).Take(filter.Limit).ToListAsync();

            return new PaginatedResult<Product>
            {
                Data = data,
                Total = total,
                Page = filter.Page
            };
        }

        public async Task<Product?> GetProductBySlugAsync(string slug)
        {
            var query = _context.Products
                .Include(p => p.Category)
                    .ThenInclude(c => c.Parent)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Images)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Size)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.GlazeLine)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.ProductType)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Material)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Color)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Pattern);
                
            if (int.TryParse(slug, out int id))
            {
                var productById = await query.FirstOrDefaultAsync(p => p.Id == id);
                if (productById != null) return productById;
            }

            return await query.FirstOrDefaultAsync(p => p.Slug == slug);
        }

        public async Task<IReadOnlyList<Product>> GetAllProductsWithVariantsAsync()
        {
            return await _context.Products
                .Include(p => p.Variants)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Product>> GetFeaturedProductsAsync(int limit)
        {
            return await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Images)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Size)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.GlazeLine)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.ProductType)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Material)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Color)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Pattern)
                .OrderByDescending(p => p.TotalSold) // Prioritize best-selling products
                .ThenByDescending(p => p.Id)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Product?> GetProductWithImagesAsync(int id)
        {
            return await _context.Products
                .Include(p => p.Category)
                    .ThenInclude(c => c.Parent)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Images)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Size)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.GlazeLine)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.ProductType)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Material)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Color)
                .Include(p => p.Variants)
                    .ThenInclude(v => v.Pattern)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Dictionary<int, string>> GetProductImagesAsync(IEnumerable<int> productIds)
        {
            var variants = await _context.ProductVariants
                .Include(v => v.Images)
                .Where(v => productIds.Contains(v.ProductId))
                .ToListAsync();

            var dict = new Dictionary<int, string>();
            foreach (var pid in productIds.Distinct())
            {
                var variant = variants.FirstOrDefault(v => v.ProductId == pid && v.Images != null && v.Images.Any());
                if (variant != null)
                {
                    var img = variant.Images.OrderBy(x => x.SortOrder).First();
                    dict[pid] = img.ImageUrl;
                }
            }
            return dict;
        }

        private static decimal ParseSizeToCm(string str)
        {
            if (string.IsNullOrEmpty(str)) return 0;
            var cleaned = str.Replace("cm", "").Trim();
            bool isMeter = false;
            if (cleaned.EndsWith("m"))
            {
                isMeter = true;
                cleaned = cleaned.Substring(0, cleaned.Length - 1).Trim();
            }
            if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var val))
            {
                // Smart meter/cm check: values < 5 are treated as meters (e.g. 1.2m -> 120cm, 1.6 -> 160cm)
                if (isMeter || val < 5)
                {
                    return val * 100;
                }
                return val;
            }
            return 0;
        }
    }
}

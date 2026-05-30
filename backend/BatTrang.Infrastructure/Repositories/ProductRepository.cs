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
                query = query.Where(p => p.Category.Slug == filter.Category);
            }

            if (!string.IsNullOrEmpty(filter.SearchQuery))
            {
                var lowerSearch = filter.SearchQuery.ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(lowerSearch) || p.Category.Name.ToLower().Contains(lowerSearch));
            }

            if (!string.IsNullOrEmpty(filter.Quality) && filter.Quality != "all")
            {
                var glazeLineIds = filter.Quality.Split(',').Select(id => int.TryParse(id.Trim(), out var val) ? val : 0).Where(v => v > 0).ToList();
                if (glazeLineIds.Any())
                {
                    query = query.Where(p => p.Variants.Any(v => v.GlazeLineId.HasValue && glazeLineIds.Contains(v.GlazeLineId.Value)));
                }
            }

            // Simplified size filtering matching frontend mock
            if (!string.IsNullOrEmpty(filter.Size) && filter.Size != "all")
            {
                // In a real production app, Size should be parsed or categorized more strictly in DB.
                // For this demo, we'll fetch to memory or do basic LIKE. Let's do a simple approximation here.
            }

            switch (filter.Sort)
            {
                case "price-asc":
                    query = query.OrderBy(p => p.Variants.Min(v => (decimal?)v.Price) ?? 0);
                    break;
                case "price-desc":
                    query = query.OrderByDescending(p => p.Variants.Min(v => (decimal?)v.Price) ?? 0);
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
                .OrderByDescending(p => p.Id) // Or another logic for featured
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Product?> GetProductWithImagesAsync(int id)
        {
            return await _context.Products
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
    }
}

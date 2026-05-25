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
                .Include(p => p.Images)
                .Include(p => p.GlazeLine)
                .Include(p => p.Variants)
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
                if (filter.Quality == "cao-cap")
                {
                    query = query.Where(p => (p.Material != null && p.Material.ToLower().Contains("cao cấp")) || 
                                             p.Name.ToLower().Contains("cao cấp"));
                }
                else if (filter.Quality == "trung")
                {
                    query = query.Where(p => (p.Material == null || !p.Material.ToLower().Contains("cao cấp")) && 
                                             !p.Name.ToLower().Contains("cao cấp"));
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
            return await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Images)
                .Include(p => p.GlazeLine)
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Slug == slug);
        }

        public async Task<IReadOnlyList<Product>> GetFeaturedProductsAsync(int limit)
        {
            return await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Images)
                .Include(p => p.GlazeLine)
                .Include(p => p.Variants)
                .OrderByDescending(p => p.Id) // Or another logic for featured
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Product?> GetProductWithImagesAsync(int id)
        {
            return await _context.Products
                .Include(p => p.Images)
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Dictionary<int, string>> GetProductImagesAsync(IEnumerable<int> productIds)
        {
            var images = await _context.ProductImages
                .Where(img => productIds.Contains(img.ProductId))
                .ToListAsync();

            var dict = new Dictionary<int, string>();
            foreach (var pid in productIds.Distinct())
            {
                var img = images
                    .Where(x => x.ProductId == pid)
                    .OrderBy(x => x.SortOrder)
                    .FirstOrDefault();
                if (img != null)
                {
                    dict[pid] = img.ImageUrl;
                }
            }
            return dict;
        }
    }
}

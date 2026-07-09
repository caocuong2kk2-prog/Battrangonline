using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepo;
        private readonly BatTrang.Infrastructure.Data.AppDbContext _context;

        public ProductsController(IProductRepository productRepo, BatTrang.Infrastructure.Data.AppDbContext context)
        {
            _productRepo = productRepo;
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [OutputCache(PolicyName = "ProductsCache")]
        public async Task<IActionResult> GetProducts([FromQuery] ProductFilterDto filter)
        {
            filter.IsAdmin = false;
            var result = await _productRepo.GetProductsAsync(filter);
            
            var productIds = result.Data.Select(p => p.Id).ToList();
            var productGifts = await _context.ProductGifts
                .Include(pg => pg.Gift)
                .Where(pg => productIds.Contains(pg.ProductId) && pg.Gift.Status == "active")
                .ToListAsync();
            var giftsGrouped = productGifts.GroupBy(pg => pg.ProductId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(pg => new GiftDto
                    {
                        Id = pg.Gift.Id,
                        Name = pg.Gift.Name,
                        ImageUrl = pg.Gift.ImageUrl,
                        EstimatedValue = pg.Gift.EstimatedValue,
                        Stock = pg.Gift.Stock,
                        Status = pg.Gift.Status,
                        Quantity = pg.Quantity
                    }).ToList()
                );

            var dtos = result.Data.Select(p => MapToDto(p, giftsGrouped.ContainsKey(p.Id) ? giftsGrouped[p.Id] : null)).ToList();

            return Ok(new PaginatedResult<ProductDto>
            {
                Data = dtos,
                Total = result.Total,
                Page = result.Page
            });
        }

        [HttpGet("featured")]
        [AllowAnonymous]
        [OutputCache(PolicyName = "ProductsCache")]
        public async Task<IActionResult> GetFeaturedProducts([FromQuery] int limit = 6)
        {
            var products = await _productRepo.GetFeaturedProductsAsync(limit);
            
            var productIds = products.Select(p => p.Id).ToList();
            var productGifts = await _context.ProductGifts
                .Include(pg => pg.Gift)
                .Where(pg => productIds.Contains(pg.ProductId) && pg.Gift.Status == "active")
                .ToListAsync();
            var giftsGrouped = productGifts.GroupBy(pg => pg.ProductId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(pg => new GiftDto
                    {
                        Id = pg.Gift.Id,
                        Name = pg.Gift.Name,
                        ImageUrl = pg.Gift.ImageUrl,
                        EstimatedValue = pg.Gift.EstimatedValue,
                        Stock = pg.Gift.Stock,
                        Status = pg.Gift.Status,
                        Quantity = pg.Quantity
                    }).ToList()
                );

            var dtos = products.Select(p => MapToDto(p, giftsGrouped.ContainsKey(p.Id) ? giftsGrouped[p.Id] : null)).ToList();
            return Ok(dtos);
        }

        [HttpGet("{slug}")]
        [AllowAnonymous]
        [OutputCache(PolicyName = "ProductsCache")]
        public async Task<IActionResult> GetProductBySlug(string slug)
        {
            var p = await _productRepo.GetProductBySlugAsync(slug);
            if (p == null || p.Status != "active") return NotFound();

            var gifts = await _context.ProductGifts
                .Include(pg => pg.Gift)
                .Where(pg => pg.ProductId == p.Id && pg.Gift.Status == "active")
                .Select(pg => new GiftDto
                {
                    Id = pg.Gift.Id,
                    Name = pg.Gift.Name,
                    ImageUrl = pg.Gift.ImageUrl,
                    EstimatedValue = pg.Gift.EstimatedValue,
                    Stock = pg.Gift.Stock,
                    Status = pg.Gift.Status,
                    Quantity = pg.Quantity
                })
                .ToListAsync();

            var dto = MapToDto(p, gifts);
            return Ok(dto);
        }

        private ProductDto MapToDto(Product p, List<GiftDto>? gifts = null)
        {
            var cheapestVariant = p.Variants.OrderBy(v => v.CampaignPrice ?? v.Price).FirstOrDefault();
            return new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                Sku = p.Sku,
                BasePrice = cheapestVariant != null ? (cheapestVariant.CampaignPrice ?? cheapestVariant.Price) : 0,
                BaseOriginalPrice = cheapestVariant != null ? (cheapestVariant.CampaignPrice.HasValue ? cheapestVariant.Price : cheapestVariant.OriginalPrice) : null,
                Category = p.Category?.Slug ?? "",
                Usage = p.Usage,
                TotalStock = p.Variants.Sum(v => v.Stock),
                Status = p.Status,
                Badge = p.MarketingBadges,
                IsUnique = p.IsUnique,
                ShortDescription = p.ShortDescription,
                Description = p.Description,
                MetaDescription = p.MetaDescription,
                Faqs = p.Faqs,
                CategoryFaqs = p.Category?.Faqs,
                TotalSold = p.TotalSold,
                CommissionRate = p.CommissionRate,
                CreatedAt = p.CreatedAt,
                Gifts = gifts ?? new List<GiftDto>(),
                GiftIds = gifts?.Select(g => g.Id).ToList() ?? new List<int>(),
                Variants = p.Variants.Select(v => new ProductVariantDto
                {
                    Id = v.Id,
                    SizeId = v.SizeId,
                    SizeName = v.Size?.Name,
                    ProductTypeId = v.ProductTypeId,
                    ProductTypeName = v.ProductType?.Name,
                    MaterialId = v.MaterialId,
                    MaterialName = v.Material?.Name,
                    ColorId = v.ColorId,
                    ColorName = v.Color?.Name,
                    PatternId = v.PatternId,
                    PatternName = v.Pattern?.Name,
                    GlazeLineId = v.GlazeLineId,
                    GlazeLineName = v.GlazeLine?.Name,
                    Images = v.Images?.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList() ?? new List<string>(),
                    Price = v.CampaignPrice ?? v.Price,
                    OriginalPrice = v.CampaignPrice.HasValue ? v.Price : v.OriginalPrice,
                    Stock = v.Stock
                }).ToList()
            };
        }
    }
}

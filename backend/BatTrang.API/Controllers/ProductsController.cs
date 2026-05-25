using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepo;

        public ProductsController(IProductRepository productRepo)
        {
            _productRepo = productRepo;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetProducts([FromQuery] ProductFilterDto filter)
        {
            var result = await _productRepo.GetProductsAsync(filter);
            
            var dtos = result.Data.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                BasePrice = p.Variants.Any() ? p.Variants.Min(v => v.Price) : 0,
                BaseOriginalPrice = p.Variants.Any() ? p.Variants.Max(v => v.OriginalPrice) : null,
                Category = p.Category?.Slug ?? "",
                Material = p.Material,
                Style = p.Style,
                Color = p.Color,
                GlazeLineId = p.GlazeLineId,
                GlazeLineName = p.GlazeLine?.Name,
                Pattern = p.Pattern,
                Usage = p.Usage,
                TotalStock = p.Variants.Sum(v => v.Stock),
                Status = p.Status,
                Badge = p.Badge,
                ShortDescription = p.ShortDescription,
                Description = p.Description,
                Images = p.Images?.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList() ?? new List<string>(),
                Variants = p.Variants.Select(v => new ProductVariantDto
                {
                    Id = v.Id,
                    Size = v.Size,
                    Price = v.Price,
                    OriginalPrice = v.OriginalPrice,
                    Stock = v.Stock
                }).ToList()
            });

            return Ok(new PaginatedResult<ProductDto>
            {
                Data = dtos,
                Total = result.Total,
                Page = result.Page
            });
        }

        [HttpGet("featured")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFeaturedProducts([FromQuery] int limit = 6)
        {
            var products = await _productRepo.GetFeaturedProductsAsync(limit);
            var dtos = products.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                BasePrice = p.Variants.Any() ? p.Variants.Min(v => v.Price) : 0,
                BaseOriginalPrice = p.Variants.Any() ? p.Variants.Max(v => v.OriginalPrice) : null,
                Category = p.Category?.Slug ?? "",
                Material = p.Material,
                Style = p.Style,
                Color = p.Color,
                GlazeLineId = p.GlazeLineId,
                GlazeLineName = p.GlazeLine?.Name,
                Pattern = p.Pattern,
                Usage = p.Usage,
                TotalStock = p.Variants.Sum(v => v.Stock),
                Status = p.Status,
                Badge = p.Badge,
                ShortDescription = p.ShortDescription,
                Description = p.Description,
                Images = p.Images?.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList() ?? new List<string>(),
                Variants = p.Variants.Select(v => new ProductVariantDto
                {
                    Id = v.Id,
                    Size = v.Size,
                    Price = v.Price,
                    OriginalPrice = v.OriginalPrice,
                    Stock = v.Stock
                }).ToList()
            });
            return Ok(dtos);
        }

        [HttpGet("{slug}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProductBySlug(string slug)
        {
            var p = await _productRepo.GetProductBySlugAsync(slug);
            if (p == null) return NotFound();

            var dto = new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                BasePrice = p.Variants.Any() ? p.Variants.Min(v => v.Price) : 0,
                BaseOriginalPrice = p.Variants.Any() ? p.Variants.Max(v => v.OriginalPrice) : null,
                Category = p.Category?.Slug ?? "",
                Material = p.Material,
                Style = p.Style,
                Color = p.Color,
                GlazeLineId = p.GlazeLineId,
                GlazeLineName = p.GlazeLine?.Name,
                Pattern = p.Pattern,
                Usage = p.Usage,
                TotalStock = p.Variants.Sum(v => v.Stock),
                Status = p.Status,
                Badge = p.Badge,
                ShortDescription = p.ShortDescription,
                Description = p.Description,
                Images = p.Images?.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList() ?? new List<string>(),
                Variants = p.Variants.Select(v => new ProductVariantDto
                {
                    Id = v.Id,
                    Size = v.Size,
                    Price = v.Price,
                    OriginalPrice = v.OriginalPrice,
                    Stock = v.Stock
                }).ToList()
            };

            return Ok(dto);
        }
    }
}

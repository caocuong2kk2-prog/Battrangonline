using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Text.RegularExpressions;
using System.Text;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/admin/products")]
    [Authorize]
    public class AdminProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepo;

        public AdminProductsController(IProductRepository productRepo)
        {
            _productRepo = productRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var filter = new ProductFilterDto { Limit = 1000 };
            var result = await _productRepo.GetProductsAsync(filter);
            
            var dtos = result.Data.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                Price = p.Price,
                OriginalPrice = p.OriginalPrice,
                Category = p.Category?.Slug ?? p.CategoryId.ToString(),
                Material = p.Material,
                Style = p.Style,
                Color = p.Color,
                Size = p.Size,
                Stock = p.Stock,
                Status = p.Status,
                Badge = p.Badge,
                Description = p.Description,
                Images = p.Images?.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList() ?? new List<string>()
            });

            return Ok(dtos);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductDto dto)
        {
            if (!int.TryParse(dto.Category, out int categoryId)) 
            {
                 // Temporary fallback for mock category data which passes slug or ID
                 categoryId = 1; // Default
            }

            var product = new Product
            {
                Name = dto.Name,
                Slug = GenerateSlug(dto.Name),
                Price = dto.Price,
                OriginalPrice = dto.OriginalPrice,
                CategoryId = categoryId, // Need proper mapping in real app
                Material = dto.Material,
                Style = dto.Style,
                Color = dto.Color,
                Size = dto.Size,
                Stock = dto.Stock,
                Status = dto.Status,
                Badge = dto.Badge,
                Description = dto.Description,
                Images = dto.Images?.Select((url, index) => new ProductImage { ImageUrl = url, SortOrder = index }).ToList() ?? new List<ProductImage>()
            };

            await _productRepo.AddAsync(product);
            dto.Id = product.Id;
            return CreatedAtAction(nameof(GetAll), new { id = product.Id }, dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductDto dto)
        {
            var product = await _productRepo.GetProductWithImagesAsync(id);
            if (product == null) return NotFound();

            product.Name = dto.Name;
            product.Price = dto.Price;
            product.OriginalPrice = dto.OriginalPrice;
            if (int.TryParse(dto.Category, out int categoryId))
            {
                product.CategoryId = categoryId;
            }
            product.Material = dto.Material;
            product.Style = dto.Style;
            product.Color = dto.Color;
            product.Size = dto.Size;
            product.Stock = dto.Stock;
            product.Status = dto.Status;
            product.Badge = dto.Badge;
            product.Description = dto.Description;

            if (dto.Images != null)
            {
                product.Images ??= new List<ProductImage>();
                product.Images.Clear();
                for (int i = 0; i < dto.Images.Count; i++)
                {
                    product.Images.Add(new ProductImage { ImageUrl = dto.Images[i], SortOrder = i });
                }
            }

            await _productRepo.UpdateAsync(product);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _productRepo.GetByIdAsync(id);
            if (product == null) return NotFound();

            await _productRepo.DeleteAsync(product);
            return NoContent();
        }

        private static string GenerateSlug(string phrase) 
        { 
            string str = RemoveDiacritics(phrase).ToLower(); 
            // invalid chars           
            str = Regex.Replace(str, @"[^a-z0-9\s-]", ""); 
            // convert multiple spaces into one space   
            str = Regex.Replace(str, @"\s+", " ").Trim(); 
            // cut and trim 
            str = str.Substring(0, str.Length <= 45 ? str.Length : 45).Trim();   
            str = Regex.Replace(str, @"\s", "-"); // hyphens   
            return str; 
        }

        private static string RemoveDiacritics(string text) 
        {
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }
            return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}

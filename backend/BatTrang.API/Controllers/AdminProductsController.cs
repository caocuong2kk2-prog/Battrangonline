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
        private readonly ICategoryRepository _categoryRepo;

        public AdminProductsController(IProductRepository productRepo, ICategoryRepository categoryRepo)
        {
            _productRepo = productRepo;
            _categoryRepo = categoryRepo;
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
                BasePrice = p.Variants.Any() ? p.Variants.Min(v => v.Price) : 0,
                BaseOriginalPrice = p.Variants.Any() ? p.Variants.Max(v => v.OriginalPrice) : null,
                Category = p.Category?.Slug ?? p.CategoryId.ToString(),
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

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductDto dto)
        {
            int categoryId = 1; // Default
            if (int.TryParse(dto.Category, out int parsedId))
            {
                categoryId = parsedId;
            }
            else if (!string.IsNullOrEmpty(dto.Category))
            {
                var category = await _categoryRepo.GetBySlugAsync(dto.Category);
                if (category != null)
                {
                    categoryId = category.Id;
                }
            }

            var slug = GenerateSlug(dto.Name);
            var isSlugExists = await _productRepo.GetProductBySlugAsync(slug) != null;
            if (isSlugExists)
            {
                var count = 1;
                while (await _productRepo.GetProductBySlugAsync($"{slug}-{count}") != null)
                {
                    count++;
                }
                slug = $"{slug}-{count}";
            }

            var totalStock = dto.Variants?.Sum(v => v.Stock) ?? 0;
            var product = new Product
            {
                Name = dto.Name,
                Slug = slug,
                CategoryId = categoryId,
                Material = dto.Material,
                Style = dto.Style,
                Color = dto.Color,
                GlazeLineId = dto.GlazeLineId,
                Pattern = dto.Pattern,
                Usage = dto.Usage,
                Status = totalStock == 0 ? "inactive" : dto.Status,
                Badge = dto.Badge,
                ShortDescription = dto.ShortDescription,
                Description = dto.Description,
                Images = dto.Images?.Select((url, index) => new ProductImage { ImageUrl = url, SortOrder = index }).ToList() ?? new List<ProductImage>(),
                Variants = dto.Variants?.Select(v => new ProductVariant
                {
                    Size = v.Size,
                    Price = v.Price,
                    OriginalPrice = v.OriginalPrice,
                    Stock = v.Stock
                }).ToList() ?? new List<ProductVariant>()
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

            var totalStockUpdate = dto.Variants?.Sum(v => v.Stock) ?? 0;
            product.Name = dto.Name;
            if (int.TryParse(dto.Category, out int categoryIdUpdate))
            {
                product.CategoryId = categoryIdUpdate;
            }
            else if (!string.IsNullOrEmpty(dto.Category))
            {
                var category = await _categoryRepo.GetBySlugAsync(dto.Category);
                if (category != null)
                {
                    product.CategoryId = category.Id;
                }
            }
            product.Material = dto.Material;
            product.Style = dto.Style;
            product.Color = dto.Color;
            product.GlazeLineId = dto.GlazeLineId;
            product.Pattern = dto.Pattern;
            product.Usage = dto.Usage;
            product.Status = totalStockUpdate == 0 ? "inactive" : dto.Status;
            product.Badge = dto.Badge;
            product.ShortDescription = dto.ShortDescription;
            product.Description = dto.Description;

            // Sync variants
            product.Variants ??= new List<ProductVariant>();
            var incomingIds = dto.Variants?.Select(v => v.Id).Where(id => id > 0).ToList() ?? new List<int>();
            var toRemove = product.Variants.Where(v => !incomingIds.Contains(v.Id)).ToList();
            foreach (var r in toRemove) { product.Variants.Remove(r); }

            if (dto.Variants != null)
            {
                foreach (var vDto in dto.Variants)
                {
                    if (vDto.Id > 0)
                    {
                        var existing = product.Variants.FirstOrDefault(v => v.Id == vDto.Id);
                        if (existing != null)
                        {
                            existing.Size = vDto.Size;
                            existing.Price = vDto.Price;
                            existing.OriginalPrice = vDto.OriginalPrice;
                            existing.Stock = vDto.Stock;
                        }
                    }
                    else
                    {
                        product.Variants.Add(new ProductVariant
                        {
                            Size = vDto.Size,
                            Price = vDto.Price,
                            OriginalPrice = vDto.OriginalPrice,
                            Stock = vDto.Stock
                        });
                    }
                }
            }

            if (dto.Images != null)
            {
                var oldImages = product.Images?.Select(i => i.ImageUrl).ToList() ?? new List<string>();
                
                product.Images ??= new List<ProductImage>();
                product.Images.Clear();
                for (int i = 0; i < dto.Images.Count; i++)
                {
                    product.Images.Add(new ProductImage { ImageUrl = dto.Images[i], SortOrder = i });
                }

                // Clean up orphaned images from the disk
                var newImages = dto.Images;
                var orphanedImages = oldImages.Where(oldImg => !newImages.Contains(oldImg));
                foreach (var orphan in orphanedImages)
                {
                    BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(orphan);
                }
            }

            await _productRepo.UpdateAsync(product);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _productRepo.GetProductWithImagesAsync(id);
            if (product == null) return NotFound();

            var imagesToDelete = product.Images?.Select(i => i.ImageUrl).ToList() ?? new List<string>();

            await _productRepo.DeleteAsync(product);

            foreach(var img in imagesToDelete)
            {
                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(img);
            }

            return NoContent();
        }

        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteDto dto)
        {
            if (dto.Ids == null || !dto.Ids.Any()) return BadRequest("Danh sách ID trống.");
            foreach (var id in dto.Ids)
            {
                var product = await _productRepo.GetProductWithImagesAsync(id);
                if (product != null)
                {
                    var imagesToDelete = product.Images?.Select(i => i.ImageUrl).ToList() ?? new List<string>();
                    await _productRepo.DeleteAsync(product);
                    
                    foreach(var img in imagesToDelete)
                    {
                        BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(img);
                    }
                }
            }
            return NoContent();
        }

        [HttpPost("bulk-status")]
        public async Task<IActionResult> BulkStatus([FromBody] BulkStatusDto dto)
        {
            if (dto.Ids == null || !dto.Ids.Any()) return BadRequest("Danh sách ID trống.");
            foreach (var id in dto.Ids)
            {
                var product = await _productRepo.GetByIdAsync(id);
                if (product != null)
                {
                    product.Status = dto.Status;
                    await _productRepo.UpdateAsync(product);
                }
            }
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

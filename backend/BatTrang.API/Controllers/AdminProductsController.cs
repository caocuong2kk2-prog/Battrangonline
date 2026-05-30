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
        private readonly BatTrang.Infrastructure.Data.AppDbContext _context;

        public AdminProductsController(IProductRepository productRepo, ICategoryRepository categoryRepo, BatTrang.Infrastructure.Data.AppDbContext context)
        {
            _productRepo = productRepo;
            _categoryRepo = categoryRepo;
            _context = context;
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
                Usage = p.Usage,
                TotalStock = p.Variants.Sum(v => v.Stock),
                Status = p.Status,
                Badge = p.Badge,
                ShortDescription = p.ShortDescription,
                Description = p.Description,
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
                Usage = dto.Usage,
                Status = totalStock == 0 ? "inactive" : dto.Status,
                Badge = dto.Badge,
                ShortDescription = dto.ShortDescription,
                Description = dto.Description,
                Variants = new List<ProductVariant>()
            };

            if (dto.Variants != null)
            {
                foreach (var v in dto.Variants)
                {
                    if (v.SizeId == null && !string.IsNullOrWhiteSpace(v.SizeName))
                    {
                        var sizeNameStr = v.SizeName.Trim();
                        var existingSize = _context.Sizes.FirstOrDefault(s => s.Name == sizeNameStr);
                        if (existingSize == null)
                        {
                            existingSize = new Size { Name = sizeNameStr };
                            _context.Sizes.Add(existingSize);
                            _context.SaveChanges();
                        }
                        v.SizeId = existingSize.Id;
                    }

                    product.Variants.Add(new ProductVariant
                    {
                    SizeId = v.SizeId,
                    ProductTypeId = v.ProductTypeId,
                    MaterialId = v.MaterialId,
                    ColorId = v.ColorId,
                    PatternId = v.PatternId,
                    GlazeLineId = v.GlazeLineId,
                    Images = v.Images?.Select((url, index) => new ProductImage { ImageUrl = url, SortOrder = index }).ToList() ?? new List<ProductImage>(),
                    Price = v.Price,
                    OriginalPrice = v.OriginalPrice,
                        Stock = v.Stock
                    });
                }
            }

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

            product.Usage = dto.Usage;
            product.Status = totalStockUpdate == 0 ? "inactive" : dto.Status;
            product.Badge = dto.Badge;
            product.ShortDescription = dto.ShortDescription;
            product.Description = dto.Description;

            // Sync variants
            product.Variants ??= new List<ProductVariant>();
            var incomingIds = dto.Variants?.Select(v => v.Id).Where(vId => vId > 0).ToList() ?? new List<int>();
            var toRemove = product.Variants.Where(v => !incomingIds.Contains(v.Id)).ToList();
            foreach (var r in toRemove)
            {
                // Delete physical files of removed variants
                if (r.Images != null)
                {
                    foreach (var img in r.Images)
                        BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(img.ImageUrl);
                }
                product.Variants.Remove(r);
            }

            if (dto.Variants != null)
            {
                foreach (var vDto in dto.Variants)
                {
                    if (vDto.SizeId == null && !string.IsNullOrWhiteSpace(vDto.SizeName))
                    {
                        var sizeNameStr = vDto.SizeName.Trim();
                        var existingSize = _context.Sizes.FirstOrDefault(s => s.Name == sizeNameStr);
                        if (existingSize == null)
                        {
                            existingSize = new Size { Name = sizeNameStr };
                            _context.Sizes.Add(existingSize);
                            _context.SaveChanges();
                        }
                        vDto.SizeId = existingSize.Id;
                    }

                    if (vDto.Id > 0)
                    {
                        var existing = product.Variants.FirstOrDefault(v => v.Id == vDto.Id);
                        if (existing != null)
                        {
                            existing.SizeId = vDto.SizeId;
                            existing.ProductTypeId = vDto.ProductTypeId;
                            existing.MaterialId = vDto.MaterialId;
                            existing.ColorId = vDto.ColorId;
                            existing.PatternId = vDto.PatternId;
                            existing.GlazeLineId = vDto.GlazeLineId;
                            
                            var oldVImages = existing.Images?.Select(i => i.ImageUrl).ToList() ?? new List<string>();
                            existing.Images ??= new List<ProductImage>();
                            existing.Images.Clear();
                            if (vDto.Images != null)
                            {
                                for (int i = 0; i < vDto.Images.Count; i++)
                                {
                                    existing.Images.Add(new ProductImage { ImageUrl = vDto.Images[i], SortOrder = i });
                                }
                            }
                            var orphanedVImages = oldVImages.Where(oldImg => vDto.Images == null || !vDto.Images.Contains(oldImg));
                            foreach (var orphan in orphanedVImages)
                            {
                                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(orphan);
                            }
                            existing.Price = vDto.Price;
                            existing.OriginalPrice = vDto.OriginalPrice;
                            existing.Stock = vDto.Stock;
                        }
                    }
                    else
                    {
                        product.Variants.Add(new ProductVariant
                        {
                            SizeId = vDto.SizeId,
                            ProductTypeId = vDto.ProductTypeId,
                            MaterialId = vDto.MaterialId,
                            ColorId = vDto.ColorId,
                            PatternId = vDto.PatternId,
                            GlazeLineId = vDto.GlazeLineId,
                            Images = vDto.Images?.Select((url, index) => new ProductImage { ImageUrl = url, SortOrder = index }).ToList() ?? new List<ProductImage>(),
                            Price = vDto.Price,
                            OriginalPrice = vDto.OriginalPrice,
                            Stock = vDto.Stock
                        });
                    }
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

            var imagesToDelete = product.Variants?.SelectMany(v => v.Images?.Select(i => i.ImageUrl) ?? new List<string>()).ToList() ?? new List<string>();

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
                    var imagesToDelete = product.Variants?.SelectMany(v => v.Images?.Select(i => i.ImageUrl) ?? new List<string>()).ToList() ?? new List<string>();
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

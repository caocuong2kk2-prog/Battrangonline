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
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/products")]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepo;
        private readonly ICategoryRepository _categoryRepo;
        private readonly BatTrang.Infrastructure.Data.AppDbContext _context;
        private readonly IOutputCacheStore _cacheStore;

        public AdminProductsController(IProductRepository productRepo, ICategoryRepository categoryRepo, BatTrang.Infrastructure.Data.AppDbContext context, IOutputCacheStore cacheStore)
        {
            _productRepo = productRepo;
            _categoryRepo = categoryRepo;
            _context = context;
            _cacheStore = cacheStore;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] string? status = null)
        {
            var filter = new ProductFilterDto 
            { 
                Page = page,
                Limit = limit,
                SearchQuery = search,
                Category = category,
                Status = status
            };
            
            var result = await _productRepo.GetProductsAsync(filter);
            
            var productIds = result.Data.Select(p => p.Id).ToList();
            var productGifts = await _context.ProductGifts.Include(pg => pg.Gift)
                .Where(pg => productIds.Contains(pg.ProductId))
                .ToListAsync();
                
            var productGiftsGrouped = productGifts.GroupBy(pg => pg.ProductId)
                .ToDictionary(g => g.Key, g => g.Select(pg => new GiftDto { Id = pg.GiftId, Name = pg.Gift.Name, Quantity = pg.Quantity }).ToList());
            
            var dtos = result.Data.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                Sku = p.Sku,
                BasePrice = p.Variants.Any() ? p.Variants.Min(v => v.Price) : 0,
                BaseOriginalPrice = p.Variants.Any() ? p.Variants.OrderBy(v => v.Price).First().OriginalPrice : null,
                Category = p.Category?.Slug ?? p.CategoryId.ToString(),
                Usage = p.Usage,
                TotalStock = p.Variants.Sum(v => v.Stock),
                Status = p.Status,
                Badge = p.MarketingBadges,
                IsUnique = p.IsUnique,
                ShortDescription = p.ShortDescription,
                Description = p.Description,
                Faqs = p.Faqs,
                CategoryFaqs = p.Category?.Faqs,
                TotalSold = p.TotalSold,
                CommissionRate = p.CommissionRate,
                CreatedAt = p.CreatedAt,
                Gifts = productGiftsGrouped.ContainsKey(p.Id) ? productGiftsGrouped[p.Id] : new List<GiftDto>(),
                GiftIds = productGiftsGrouped.ContainsKey(p.Id) ? productGiftsGrouped[p.Id].Select(g => g.Id).ToList() : new List<int>(),
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
            }).ToList();

            return Ok(new { data = dtos, total = result.Total, page = result.Page, limit = filter.Limit });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.Sku))
            {
                var isSkuExists = await _productRepo.CountAsync(p => p.Sku == dto.Sku.Trim()) > 0;
                if (isSkuExists)
                {
                    return BadRequest(new { message = $"Mã SKU '{dto.Sku.Trim()}' đã tồn tại trong hệ thống. Vui lòng nhập mã khác!" });
                }
            }

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
                Sku = dto.Sku,
                CategoryId = categoryId,
                Usage = dto.Usage,
                Status = dto.Status,
                MarketingBadges = dto.Badge,
                IsUnique = dto.IsUnique,
                ShortDescription = dto.ShortDescription,
                Description = dto.Description,
                Faqs = dto.Faqs,
                CommissionRate = dto.CommissionRate ?? 10.0m,
                Variants = new List<ProductVariant>()
            };

            if (dto.Variants != null)
            {
                foreach (var v in dto.Variants)
                {
                    if (v.Price > 1000000000)
                    {
                        return BadRequest(new { message = "Giá bán của mỗi phiên bản không được vượt quá 1 tỷ đồng (1.000.000.000 VNĐ)!" });
                    }
                    if (v.Stock > 1000)
                    {
                        return BadRequest(new { message = "Số lượng tồn kho của mỗi phiên bản không được vượt quá 1.000 chiếc!" });
                    }

                    if (v.SizeId == null && !string.IsNullOrWhiteSpace(v.SizeName))
                    {
                        var sizeNameStr = v.SizeName.Trim();
                        var existingSize = _context.Sizes.FirstOrDefault(s => s.Name == sizeNameStr);
                        if (existingSize == null)
                        {
                            existingSize = new Size { Name = sizeNameStr, ValueInCm = ParseCmFromName(sizeNameStr) };
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

            if (dto.Gifts != null && dto.Gifts.Any())
            {
                foreach (var gift in dto.Gifts)
                {
                    _context.ProductGifts.Add(new ProductGift
                    {
                        ProductId = product.Id,
                        GiftId = gift.Id,
                        Quantity = gift.Quantity > 0 ? gift.Quantity : 1
                    });
                }
                await _context.SaveChangesAsync();
            }
            else if (dto.GiftIds != null && dto.GiftIds.Any())
            {
                foreach (var giftId in dto.GiftIds)
                {
                    _context.ProductGifts.Add(new ProductGift
                    {
                        ProductId = product.Id,
                        GiftId = giftId,
                        Quantity = 1
                    });
                }
                await _context.SaveChangesAsync();
            }

            dto.Id = product.Id;
            await _cacheStore.EvictByTagAsync("products", default);
            await _cacheStore.EvictByTagAsync("filters", default);
            return CreatedAtAction(nameof(GetAll), new { id = product.Id }, dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.Sku))
            {
                var isSkuExists = await _productRepo.CountAsync(p => p.Sku == dto.Sku.Trim() && p.Id != id) > 0;
                if (isSkuExists)
                {
                    return BadRequest(new { message = $"Mã SKU '{dto.Sku.Trim()}' đã tồn tại trong hệ thống. Vui lòng nhập mã khác!" });
                }
            }

            var product = await _productRepo.GetProductWithImagesAsync(id);
            if (product == null) return NotFound();

            var totalStockUpdate = dto.Variants?.Sum(v => v.Stock) ?? 0;
            product.Name = dto.Name;
            product.Sku = dto.Sku;
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
            product.Status = dto.Status;
            product.MarketingBadges = dto.Badge;
            product.IsUnique = dto.IsUnique;
            product.ShortDescription = dto.ShortDescription;
            product.Description = dto.Description;
            product.Faqs = dto.Faqs;
            product.CommissionRate = dto.CommissionRate ?? 10.0m;

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
                    if (vDto.Price > 1000000000)
                    {
                        return BadRequest(new { message = "Giá bán của mỗi phiên bản không được vượt quá 1 tỷ đồng (1.000.000.000 VNĐ)!" });
                    }
                    if (vDto.Stock > 1000)
                    {
                        return BadRequest(new { message = "Số lượng tồn kho của mỗi phiên bản không được vượt quá 1.000 chiếc!" });
                    }

                    if (vDto.SizeId == null && !string.IsNullOrWhiteSpace(vDto.SizeName))
                    {
                        var sizeNameStr = vDto.SizeName.Trim();
                        var existingSize = _context.Sizes.FirstOrDefault(s => s.Name == sizeNameStr);
                        if (existingSize == null)
                        {
                            existingSize = new Size { Name = sizeNameStr, ValueInCm = ParseCmFromName(sizeNameStr) };
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

            // Sync gifts
            var existingGifts = _context.ProductGifts.Where(pg => pg.ProductId == id).ToList();
            _context.ProductGifts.RemoveRange(existingGifts);
            if (dto.Gifts != null && dto.Gifts.Any())
            {
                foreach (var gift in dto.Gifts)
                {
                    _context.ProductGifts.Add(new ProductGift
                    {
                        ProductId = id,
                        GiftId = gift.Id,
                        Quantity = gift.Quantity > 0 ? gift.Quantity : 1
                    });
                }
            }
            else if (dto.GiftIds != null && dto.GiftIds.Any())
            {
                foreach (var giftId in dto.GiftIds)
                {
                    _context.ProductGifts.Add(new ProductGift
                    {
                        ProductId = id,
                        GiftId = giftId,
                        Quantity = 1
                    });
                }
            }
            await _context.SaveChangesAsync();

            await _cacheStore.EvictByTagAsync("products", default);
            await _cacheStore.EvictByTagAsync("filters", default);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
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

            await _cacheStore.EvictByTagAsync("products", default);
            await _cacheStore.EvictByTagAsync("filters", default);
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
            await _cacheStore.EvictByTagAsync("products", default);
            await _cacheStore.EvictByTagAsync("filters", default);
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
            await _cacheStore.EvictByTagAsync("products", default);
            await _cacheStore.EvictByTagAsync("filters", default);
            return NoContent();
        }

        /// <summary>
        /// Parse numeric cm value from size name strings like "160cm", "1.6m", "26cm", "60x90cm"
        /// </summary>
        private static decimal ParseCmFromName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return 0;
            var cleaned = name.Trim().ToLower();
            // Try pattern: number + "cm" (e.g. "160cm", "26cm")
            var cmMatch = Regex.Match(cleaned, @"([\d]+[\.,]?[\d]*)\s*cm");
            if (cmMatch.Success && decimal.TryParse(cmMatch.Groups[1].Value.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var cm))
                return cm;
            // Try pattern: number + "m" (e.g. "1.6m")
            var mMatch = Regex.Match(cleaned, @"([\d]+[\.,]?[\d]*)\s*m");
            if (mMatch.Success && decimal.TryParse(mMatch.Groups[1].Value.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var m))
                return m * 100;
            // Try just a plain number
            if (decimal.TryParse(Regex.Match(cleaned, @"[\d]+[\.,]?[\d]*").Value.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var plain))
                return plain;
            return 0;
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


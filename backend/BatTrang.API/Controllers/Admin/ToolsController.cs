using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using BatTrang.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using BatTrang.Infrastructure.Seed;
using BatTrang.Infrastructure.Data;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [AllowAnonymous] // Allow executing the script easily via Invoke-RestMethod
    public class ToolsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ToolsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("migrate-seo")]
        public async Task<IActionResult> MigrateSeoData()
        {
            try
            {
                var conn = _context.Database.GetDbConnection();
                bool wasClosed = conn.State == System.Data.ConnectionState.Closed;
                if (wasClosed) await conn.OpenAsync();

                // 1. Determine column name in the old db
                string nameCol = "Name";
                using (var oldCmd = conn.CreateCommand())
                {
                    oldCmd.CommandText = "SELECT name FROM BattrangOnlineVN.sys.columns WHERE object_id = OBJECT_ID('BattrangOnlineVN.dbo.products')";
                    using var reader1 = await oldCmd.ExecuteReaderAsync();
                    bool hasProductName = false;
                    bool hasTitle = false;
                    while (await reader1.ReadAsync())
                    {
                        var col = reader1.GetString(0).ToLower();
                        if (col == "product_name") hasProductName = true;
                        if (col == "title") hasTitle = true;
                    }
                    nameCol = hasProductName ? "product_name" : (hasTitle ? "title" : "name");
                }

                // 2. Read the data
                var updates = new List<(string Name, string Meta)>();
                using (var getCmd = conn.CreateCommand())
                {
                    getCmd.CommandText = $"SELECT {nameCol}, product_meta_description FROM BattrangOnlineVN.dbo.products WHERE product_meta_description IS NOT NULL AND CAST(product_meta_description as nvarchar(max)) != ''";
                    using var reader = await getCmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        updates.Add((reader.GetString(0), reader.GetString(1)));
                    }
                }

                if (wasClosed) await conn.CloseAsync();

                // 3. Apply updates
                int updatedCount = 0;
                foreach (var update in updates)
                {
                    var products = await _context.Products.Where(p => p.Name == update.Name).ToListAsync();
                    foreach (var p in products)
                    {
                        p.MetaDescription = update.Meta;
                        updatedCount++;
                    }
                }
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Migrated SEO data successfully", UpdatedProducts = updatedCount });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Error = ex.Message, Stack = ex.StackTrace, Inner = ex.InnerException?.Message });
            }
        }

        private static string RemoveVietnameseSigns(string str)
        {
            if (string.IsNullOrWhiteSpace(str)) return str;
            string normalized = str.Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder();
            foreach (char c in normalized)
            {
                var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }
            return sb.ToString().Normalize(System.Text.NormalizationForm.FormC)
                     .Replace("đ", "d").Replace("Đ", "D");
        }

        [HttpPost("update-all-skus")]
        [HttpGet("update-all-skus")]
        public async Task<IActionResult> UpdateAllSkus()
        {
            try
            {
                var products = await _context.Products.Include(p => p.Category).ToListAsync();
                int updatedCount = 0;
                foreach (var p in products)
                {
                    string cleanSlug = "";
                    if (p.Category != null && !string.IsNullOrWhiteSpace(p.Category.Slug))
                    {
                        cleanSlug = RemoveVietnameseSigns(p.Category.Slug);
                    }
                    string prefix = "SP";
                    if (!string.IsNullOrWhiteSpace(cleanSlug))
                    {
                        var parts = cleanSlug.Split('-', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2)
                        {
                            prefix = $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[1][0])}";
                        }
                        else if (parts[0].Length >= 2)
                        {
                            prefix = parts[0].Substring(0, 2).ToUpperInvariant();
                        }
                        else if (parts[0].Length == 1)
                        {
                            prefix = $"{char.ToUpperInvariant(parts[0][0])}X";
                        }
                    }
                    string expectedAutoSku = $"{prefix}-{p.Id:D3}";

                    // Nếu Sku trống, hoặc chứa ký tự non-ASCII/dấu tiếng Việt (Ấ, Ố, Đ, v.v.), hoặc đúng bằng chiều dài của auto Sku thì cập nhật chuẩn hóa
                    if (string.IsNullOrWhiteSpace(p.Sku) || p.Sku.Any(c => c > 127 || c == 'Đ' || c == 'đ') || p.Sku == $"ẤC-{p.Id:D3}" || p.Sku == $"ỐH-{p.Id:D3}" || p.Sku == $"ĐD-{p.Id:D3}" || p.Sku == $"ẤT-{p.Id:D3}" || p.Sku.Length == expectedAutoSku.Length)
                    {
                        if (p.Sku != expectedAutoSku)
                        {
                            p.Sku = expectedAutoSku;
                            updatedCount++;
                        }
                    }
                    else if (p.Sku.Any(c => c > 127 || c == 'Đ' || c == 'đ'))
                    {
                        p.Sku = RemoveVietnameseSigns(p.Sku).ToUpperInvariant();
                        updatedCount++;
                    }
                }
                if (updatedCount > 0)
                {
                    await _context.SaveChangesAsync();
                }
                return Ok(new { Message = $"Đã cập nhật làm sạch mã SKU không dấu cho {updatedCount} sản phẩm thành công!", UpdatedCount = updatedCount });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Error = ex.Message, Stack = ex.StackTrace });
            }
        }

        [HttpPost("migrate-products")]
        public async Task<IActionResult> MigrateProducts()
        {
            try
            {
                // 1. Load all products and variants
                var products = await _context.Products
                    .Include(p => p.Variants)
                    .ThenInclude(v => v.Images)
                    .ToListAsync();

                int deletedCount = 0;
                int consolidatedCount = 0;
                int mergedVariantsCount = 0;

                // Group by CategoryId and BaseName
                var productGroups = new Dictionary<string, List<Product>>();

                foreach (var p in products)
                {
                    var parsed = ParseProduct(p.Name);
                    string groupKey = $"{p.CategoryId}_{parsed.BaseName.ToLowerInvariant()}";
                    if (!productGroups.ContainsKey(groupKey))
                    {
                        productGroups[groupKey] = new List<Product>();
                    }
                    productGroups[groupKey].Add(p);
                }

                foreach (var group in productGroups.Values)
                {
                    if (group.Count <= 1) continue; // No duplicates/variants to merge

                    // Master product is the first one
                    var master = group.First();
                    var parsedMaster = ParseProduct(master.Name);
                    // Preserve master full product name without cutting or shortening
                    // master.Name = parsedMaster.BaseName;
                    
                    // Apply parsed attributes to master's existing variants
                    foreach (var mv in master.Variants)
                    {
                        await ApplyAttributes(mv, ParseProduct(group.First(p => p.Id == master.Id).Name));
                    }

                    // Process other products in the group
                    for (int i = 1; i < group.Count; i++)
                    {
                        var other = group[i];
                        var parsedOther = ParseProduct(other.Name);

                        foreach (var otherVariant in other.Variants.ToList())
                        {
                            await ApplyAttributes(otherVariant, parsedOther);

                            // Check if an EXACT variant already exists in Master
                            var existingVariant = master.Variants.FirstOrDefault(v => 
                                v.SizeId == otherVariant.SizeId &&
                                v.ColorId == otherVariant.ColorId &&
                                v.GlazeLineId == otherVariant.GlazeLineId &&
                                v.PatternId == otherVariant.PatternId &&
                                v.MaterialId == otherVariant.MaterialId);

                            if (existingVariant != null)
                            {
                                // Duplicate variant found. Keep the one with stock > 0 or price > 0, or just keep existing.
                                // We delete the otherVariant from DB since it's redundant.
                                _context.ProductVariants.Remove(otherVariant);
                                mergedVariantsCount++;
                            }
                            else
                            {
                                // Move variant to Master
                                otherVariant.ProductId = master.Id;
                                master.Variants.Add(otherVariant);
                            }
                        }

                        // We can safely delete 'other' Product now.
                        _context.Products.Remove(other);
                        deletedCount++;
                    }
                    
                    consolidatedCount++;
                }

                await _context.SaveChangesAsync();

                return Ok(new { 
                    Message = "Migration completed successfully.", 
                    ConsolidatedGroups = consolidatedCount,
                    DeletedProducts = deletedCount,
                    MergedVariants = mergedVariantsCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message, Stack = ex.StackTrace });
            }
        }

        [HttpPost("enrich-attributes")]
        [HttpGet("enrich-attributes")]
        public async Task<IActionResult> EnrichAttributes()
        {
            try
            {
                await DataSeeder.SeedAsync(_context);
                return Ok(new { Message = "Enriched all products with complete variants and attributes successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message, Stack = ex.StackTrace });
            }
        }

        private async Task ApplyAttributes(ProductVariant variant, ParsedProduct parsed)
        {
            if (!string.IsNullOrEmpty(parsed.Size))
            {
                var size = await _context.Sizes.FirstOrDefaultAsync(x => x.Name.ToLower() == parsed.Size.ToLower());
                if (size == null) { size = new Size { Name = parsed.Size }; _context.Sizes.Add(size); await _context.SaveChangesAsync(); }
                variant.SizeId = size.Id;
            }
            if (!string.IsNullOrEmpty(parsed.Color))
            {
                var color = await _context.Colors.FirstOrDefaultAsync(x => x.Name.ToLower() == parsed.Color.ToLower());
                if (color == null) { color = new Color { Name = parsed.Color }; _context.Colors.Add(color); await _context.SaveChangesAsync(); }
                variant.ColorId = color.Id;
            }
            if (!string.IsNullOrEmpty(parsed.Glaze))
            {
                var glaze = await _context.GlazeLines.FirstOrDefaultAsync(x => x.Name.ToLower() == parsed.Glaze.ToLower());
                if (glaze == null) { glaze = new GlazeLine { Name = parsed.Glaze }; _context.GlazeLines.Add(glaze); await _context.SaveChangesAsync(); }
                variant.GlazeLineId = glaze.Id;
            }
            if (!string.IsNullOrEmpty(parsed.Pattern))
            {
                var pattern = await _context.Patterns.FirstOrDefaultAsync(x => x.Name.ToLower() == parsed.Pattern.ToLower());
                if (pattern == null) { pattern = new Pattern { Name = parsed.Pattern }; _context.Patterns.Add(pattern); await _context.SaveChangesAsync(); }
                variant.PatternId = pattern.Id;
            }
            if (!string.IsNullOrEmpty(parsed.Material))
            {
                var material = await _context.Materials.FirstOrDefaultAsync(x => x.Name.ToLower() == parsed.Material.ToLower());
                if (material == null) { material = new Material { Name = parsed.Material }; _context.Materials.Add(material); await _context.SaveChangesAsync(); }
                variant.MaterialId = material.Id;
            }
        }

        private ParsedProduct ParseProduct(string name)
        {
            var parsed = new ParsedProduct { BaseName = name };

            // 1. Size
            var sizeMatch = Regex.Match(parsed.BaseName, @"(?i)(cao\s+[\d\.]+(cm|m)|H\d+|dài\s+[\d\.]+(cm|m)|\d+cm)");
            if (sizeMatch.Success)
            {
                parsed.Size = sizeMatch.Value.Trim();
                parsed.BaseName = parsed.BaseName.Replace(sizeMatch.Value, "", StringComparison.OrdinalIgnoreCase);
            }

            // 2. Color
            var colorMatch = Regex.Match(parsed.BaseName, @"(?i)(nền\s+(xanh đậm|xanh lá|xanh lục|xanh dương|xanh lam|xanh|đỏ|vàng|trắng|đen))");
            if (colorMatch.Success)
            {
                parsed.Color = colorMatch.Groups[2].Value.Trim(); // Extract just the color name without "nền "
                parsed.BaseName = parsed.BaseName.Replace(colorMatch.Value, "", StringComparison.OrdinalIgnoreCase);
            }

            // 3. Glaze
            var glazeMatch = Regex.Match(parsed.BaseName, @"(?i)(men rạn|men lam|men ngọc|men đen|men cốt|men hoả biến|men hỏa biến)");
            if (glazeMatch.Success)
            {
                parsed.Glaze = glazeMatch.Value.Trim();
                parsed.BaseName = parsed.BaseName.Replace(glazeMatch.Value, "", StringComparison.OrdinalIgnoreCase);
            }

            // 4. Pattern / Material
            var materialMatch = Regex.Match(parsed.BaseName, @"(?i)(đắp nổi|dát vàng|vẽ vàng|dát điểm|bọc đồng)");
            if (materialMatch.Success)
            {
                parsed.Material = materialMatch.Value.Trim();
                parsed.BaseName = parsed.BaseName.Replace(materialMatch.Value, "", StringComparison.OrdinalIgnoreCase);
            }

            // 5. Pattern
            var patternMatch = Regex.Match(parsed.BaseName, @"(?i)(phúc lộc thọ|phúc đức|đức lưu quang|vinh quy bái tổ|bát bửu độ gia|bát tiên|bát bửu|bách phúc|bách lộc|bách thọ|bách hạc|bách nhi phú quý|bách nhi nhị cảnh|bách nhi|chữ phúc|chữ lộc|chữ thọ|chữ nhẫn|chữ tâm|cửu long|ngũ long|rồng phú quý|rồng phượng|long phượng|phượng hoàng|cá chép hóa rồng|cá chép hoá rồng|lý ngư vọng nguyệt|tùng hạc diên niên|tùng cúc trúc mai|tùng hươu|tùng lộc|tứ quý|đào lộc mẫu đơn|công đào|mẫu đơn|chim trĩ|khổng tước|chim công|cúc họa mi|cúc dơi|hoa dây|sơn thủy|trống đồng|thuận buồm xuôi gió|mã đáo thành công|tứ cảnh|cảnh quê hương|đồng quê|cảnh quê|phố cổ hà nội|phố cổ|cảnh hà nội|hoa chuối cảnh|hoa chuối|hoa khai phú quý|hoa thiên điểu|tùng hạc|đào lộc|sen hạc|sen cá|hoa sen vân mây|hoa sen|ngũ phúc|vạn sự như ý|hoa mặt trời|rồng sứ|rồng|phượng|kim kê|gà|hổ|trúc|tùng|cúc|hoa đào|(?<!công\s+)đào(?!\s+lộc)|(?<!ban\s+|nắng\s+|sáng\s+)mai(?!\s+bình))");
            if (patternMatch.Success)
            {
                parsed.Pattern = patternMatch.Value.Trim();
                parsed.BaseName = parsed.BaseName.Replace(patternMatch.Value, "", StringComparison.OrdinalIgnoreCase);
            }
            
            // 6. Numbering like 01, 02, 03 at the end
            var numMatch = Regex.Match(parsed.BaseName, @"(?i)(\s+0[1-9])$");
            if (numMatch.Success)
            {
                parsed.BaseName = parsed.BaseName.Replace(numMatch.Value, "", StringComparison.OrdinalIgnoreCase);
            }

            // Clean up extra spaces and hyphens
            parsed.BaseName = Regex.Replace(parsed.BaseName, @"\s+", " ");
            parsed.BaseName = Regex.Replace(parsed.BaseName, @"\s+-\s*$", "");
            parsed.BaseName = parsed.BaseName.Trim();

            return parsed;
        }

        private class ParsedProduct
        {
            public string BaseName { get; set; } = "";
            public string? Size { get; set; }
            public string? Color { get; set; }
            public string? Glaze { get; set; }
            public string? Pattern { get; set; }
            public string? Material { get; set; }
        }

        // ══════════════════════════════════════════════════════════
        //  SIZE NORMALIZATION TOOL
        // ══════════════════════════════════════════════════════════

        /// <summary>
        /// Preview what the normalization will do (dry-run, no changes).
        /// </summary>
        [HttpGet("normalize-sizes")]
        public async Task<IActionResult> PreviewNormalizeSizes()
        {
            var sizes = await _context.Sizes
                .Include(s => s.ProductVariants)
                .OrderBy(s => s.Id)
                .ToListAsync();

            var actions = BuildNormalizationPlan(sizes);

            return Ok(new
            {
                Message = "DRY RUN — Không thay đổi gì. Gọi POST normalize-sizes/execute để thực thi.",
                TotalSizes = sizes.Count,
                WillRename = actions.Count(a => a.Action == "RENAME"),
                WillMerge = actions.Count(a => a.Action == "MERGE"),
                WillUpdateValue = actions.Count(a => a.Action == "UPDATE_VALUE"),
                WillDelete = actions.Count(a => a.Action == "DELETE"),
                Details = actions
            });
        }

        /// <summary>
        /// Execute the normalization (applies changes to DB).
        /// </summary>
        [HttpPost("normalize-sizes/execute")]
        public async Task<IActionResult> ExecuteNormalizeSizes()
        {
            try
            {
                var sizes = await _context.Sizes
                    .Include(s => s.ProductVariants)
                    .OrderBy(s => s.Id)
                    .ToListAsync();

                var plan = BuildNormalizationPlan(sizes);

                int renamed = 0, merged = 0, deleted = 0, updatedValue = 0;

                // ── Phase 1: Rename & update valueInCm ──
                foreach (var action in plan.Where(a => a.Action == "RENAME" || a.Action == "UPDATE_VALUE"))
                {
                    var size = sizes.FirstOrDefault(s => s.Id == action.SizeId);
                    if (size == null) continue;

                    if (action.Action == "RENAME")
                    {
                        size.Name = action.NewName!;
                        size.ValueInCm = action.NewValueInCm;
                        renamed++;
                    }
                    else
                    {
                        size.ValueInCm = action.NewValueInCm;
                        updatedValue++;
                    }
                }

                await _context.SaveChangesAsync();

                // ── Phase 2: Merge duplicates ──
                // Reload to get fresh state after renames
                sizes = await _context.Sizes
                    .Include(s => s.ProductVariants)
                    .OrderBy(s => s.Id)
                    .ToListAsync();

                // Group by canonical name (lowercase)
                var groups = sizes.GroupBy(s => s.Name.ToLowerInvariant()).Where(g => g.Count() > 1);

                foreach (var group in groups)
                {
                    var canonical = group.OrderBy(s => s.Id).First(); // Keep the oldest one

                    foreach (var dup in group.Where(s => s.Id != canonical.Id))
                    {
                        // Reassign all ProductVariants from dup → canonical
                        var variants = await _context.ProductVariants
                            .Where(v => v.SizeId == dup.Id)
                            .ToListAsync();

                        foreach (var v in variants)
                        {
                            v.SizeId = canonical.Id;
                        }

                        _context.Sizes.Remove(dup);
                        merged++;
                        deleted++;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Message = "Chuẩn hóa kích thước hoàn tất!",
                    Renamed = renamed,
                    UpdatedValueInCm = updatedValue,
                    MergedDuplicates = merged,
                    Deleted = deleted
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message, Stack = ex.StackTrace });
            }
        }

        private List<SizeAction> BuildNormalizationPlan(List<Size> sizes)
        {
            var actions = new List<SizeAction>();

            foreach (var size in sizes)
            {
                var parsed = ParseSizeName(size.Name);

                // Case 1: Name needs renaming to standardized form
                if (parsed.StandardName != size.Name)
                {
                    actions.Add(new SizeAction
                    {
                        Action = "RENAME",
                        SizeId = size.Id,
                        OldName = size.Name,
                        NewName = parsed.StandardName,
                        OldValueInCm = size.ValueInCm,
                        NewValueInCm = parsed.ValueInCm,
                        ProductCount = size.ProductVariants.Select(v => v.ProductId).Distinct().Count(),
                        Note = parsed.Note
                    });
                }
                // Case 2: Name is fine but valueInCm is wrong/missing
                else if (size.ValueInCm != parsed.ValueInCm)
                {
                    actions.Add(new SizeAction
                    {
                        Action = "UPDATE_VALUE",
                        SizeId = size.Id,
                        OldName = size.Name,
                        NewName = size.Name,
                        OldValueInCm = size.ValueInCm,
                        NewValueInCm = parsed.ValueInCm,
                        ProductCount = size.ProductVariants.Select(v => v.ProductId).Distinct().Count()
                    });
                }
            }

            // Find duplicates after normalization
            var nameGroups = sizes
                .Select(s => new { Size = s, Parsed = ParseSizeName(s.Name) })
                .GroupBy(x => x.Parsed.StandardName.ToLowerInvariant())
                .Where(g => g.Count() > 1);

            foreach (var group in nameGroups)
            {
                var items = group.OrderBy(x => x.Size.Id).ToList();
                var keepId = items.First().Size.Id;

                foreach (var dup in items.Skip(1))
                {
                    // Check if we already have a RENAME action for this
                    if (!actions.Any(a => a.SizeId == dup.Size.Id && a.Action == "MERGE"))
                    {
                        actions.Add(new SizeAction
                        {
                            Action = "MERGE",
                            SizeId = dup.Size.Id,
                            OldName = dup.Size.Name,
                            NewName = $"→ gộp vào #{keepId} ({items.First().Size.Name})",
                            OldValueInCm = dup.Size.ValueInCm,
                            NewValueInCm = items.First().Parsed.ValueInCm,
                            ProductCount = dup.Size.ProductVariants.Select(v => v.ProductId).Distinct().Count(),
                            Note = $"Chuyển {dup.Size.ProductVariants.Count} variant sang size #{keepId}"
                        });
                    }
                }
            }

            return actions.OrderBy(a => a.SizeId).ToList();
        }

        private ParsedSize ParseSizeName(string name)
        {
            var result = new ParsedSize { OriginalName = name };
            var trimmed = name.Trim();
            string prefix = "";
            decimal valueInCm = 0;

            // 1. Extract prefix ("cao", "dài") or "h"
            var prefixMatch = Regex.Match(trimmed, @"(?i)^(cao\s+|dài\s+)");
            if (prefixMatch.Success)
            {
                prefix = prefixMatch.Groups[1].Value.Trim().ToLowerInvariant();
                trimmed = trimmed.Substring(prefixMatch.Length).Trim();
            }
            else if (Regex.IsMatch(trimmed, @"(?i)^h\d"))
            {
                prefix = "cao";
                trimmed = trimmed.Substring(1).Trim();
                result.Note = "H-prefix → quy chuẩn thành số";
            }

            // Theo yêu cầu: xóa bỏ chữ "cao" để gom về dạng số gọn (ví dụ 60cm). Các tiền tố khác (dài) giữ nguyên.
            if (prefix == "cao")
            {
                prefix = "";
            }

            // 2. Extract number and unit
            var numMatch = Regex.Match(trimmed, @"^(\d+\.?\d*)\s*(cm|m)?$", RegexOptions.IgnoreCase);
            if (numMatch.Success)
            {
                var num = decimal.Parse(numMatch.Groups[1].Value);
                var unit = numMatch.Groups[2].Value.ToLowerInvariant();

                if (unit == "m")
                {
                    // Catch typos like "155m" -> should be 155cm or 1.55m
                    if (num > 10) 
                    {
                        valueInCm = num; 
                        result.Note = (result.Note != null ? result.Note + ", " : "") + $"Sửa lỗi đơn vị '{num}m' → '{num}cm'";
                    }
                    else 
                    {
                        valueInCm = num * 100m;
                    }
                }
                else // cm or no unit
                {
                    // Catch typos like "h285" -> should be 28.5cm
                    if (num > 200 && string.IsNullOrEmpty(unit)) 
                    {
                        valueInCm = num / 10m;
                    }
                    else 
                    {
                        valueInCm = num;
                    }
                }
            }
            else
            {
                // Fallback: extract any number
                var anyNumMatch = Regex.Match(trimmed, @"(\d+\.?\d*)");
                if (anyNumMatch.Success)
                {
                    valueInCm = decimal.Parse(anyNumMatch.Groups[1].Value);
                }
            }

            result.ValueInCm = valueInCm;

            // 3. Format Standard Name
            if (valueInCm > 0)
            {
                if (valueInCm >= 100)
                {
                    var mVal = (valueInCm / 100m).ToString("0.##");
                    result.StandardName = string.IsNullOrEmpty(prefix) ? $"{mVal}m" : $"{prefix} {mVal}m";
                }
                else
                {
                    var cmVal = valueInCm.ToString("0.##");
                    result.StandardName = string.IsNullOrEmpty(prefix) ? $"{cmVal}cm" : $"{prefix} {cmVal}cm";
                }
            }
            else
            {
                result.StandardName = name.Trim();
            }

            return result;
        }

        private class ParsedSize
        {
            public string OriginalName { get; set; } = "";
            public string StandardName { get; set; } = "";
            public decimal ValueInCm { get; set; }
            public string? Note { get; set; }
        }

        private class SizeAction
        {
            public string Action { get; set; } = "";
            public int SizeId { get; set; }
            public string OldName { get; set; } = "";
            public string? NewName { get; set; }
            public decimal OldValueInCm { get; set; }
            public decimal NewValueInCm { get; set; }
            public int ProductCount { get; set; }
            public string? Note { get; set; }
        }
    }
}


using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/categories")]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminCategoriesController : ControllerBase
    {
        private readonly ICategoryRepository _categoryRepo;
        private readonly IOutputCacheStore _cacheStore;
        private readonly BatTrang.Infrastructure.Data.AppDbContext _context;

        public AdminCategoriesController(ICategoryRepository categoryRepo, IOutputCacheStore cacheStore, BatTrang.Infrastructure.Data.AppDbContext context)
        {
            _categoryRepo = categoryRepo;
            _cacheStore = cacheStore;
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CategoryDto dto)
        {
            var category = new Category
            {
                Name = dto.Name,
                Slug = dto.Id,
                Icon = dto.Icon,
                Description = dto.Desc,
                Faqs = dto.Faqs,
                ParentId = dto.ParentId > 0 ? dto.ParentId : null
            };
            await _categoryRepo.AddAsync(category);
            await _cacheStore.EvictByTagAsync("filters", default);
            return CreatedAtAction(nameof(Get), new { id = category.Slug }, dto);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            var c = await _categoryRepo.GetBySlugAsync(id);
            if (c == null) return NotFound();
            return Ok(new CategoryDto { Id = c.Slug, Name = c.Name, Icon = c.Icon, Desc = c.Description, Faqs = c.Faqs, ParentId = c.ParentId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] CategoryDto dto)
        {
            var category = await _categoryRepo.GetBySlugAsync(id);
            if (category == null) return NotFound();

            var oldIcon = category.Icon;

            category.Name = dto.Name;
            category.Icon = dto.Icon;
            category.Description = dto.Desc;
            category.Faqs = dto.Faqs;
            category.ParentId = dto.ParentId > 0 ? dto.ParentId : null;
            await _categoryRepo.UpdateAsync(category);

            if (oldIcon != dto.Icon && !string.IsNullOrEmpty(oldIcon))
            {
                await SafeDeletePhysicalFileAsync(oldIcon);
            }

            await _cacheStore.EvictByTagAsync("filters", default);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var category = await _categoryRepo.GetBySlugAsync(id);
            if (category == null) return NotFound();

            var icon = category.Icon;

            await _categoryRepo.DeleteAsync(category);

            if (!string.IsNullOrEmpty(icon))
            {
                await SafeDeletePhysicalFileAsync(icon);
            }

            await _cacheStore.EvictByTagAsync("filters", default);
            return NoContent();
        }

        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkCategoryDeleteDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest("Không có danh mục nào được chọn.");
            
            var oldIconsToDelete = new System.Collections.Generic.List<string>();
            int deleted = 0;
            foreach(var id in dto.Ids)
            {
                var category = await _categoryRepo.GetBySlugAsync(id);
                if (category != null)
                {
                    var icon = category.Icon;
                    await _categoryRepo.DeleteAsync(category);
                    if (!string.IsNullOrEmpty(icon))
                    {
                        oldIconsToDelete.Add(icon);
                    }
                    deleted++;
                }
            }

            if (deleted > 0)
            {
                foreach (var icon in oldIconsToDelete)
                {
                    await SafeDeletePhysicalFileAsync(icon);
                }
                await _cacheStore.EvictByTagAsync("filters", default);
            }
            return Ok(new { message = $"Đã xóa {deleted} danh mục." });
        }

        private async Task SafeDeletePhysicalFileAsync(string iconUrl)
        {
            if (string.IsNullOrEmpty(iconUrl)) return;

            var count = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(
                System.Linq.Queryable.Where(_context.Categories, c => c.Icon == iconUrl)
            );

            if (count == 0)
            {
                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(iconUrl);
            }
        }
    }

    public class BulkCategoryDeleteDto
    {
        public System.Collections.Generic.List<string> Ids { get; set; } = new System.Collections.Generic.List<string>();
    }
}


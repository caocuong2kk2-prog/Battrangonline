using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers.Admin
{
    [Route("api/admin/sizes")]
    [ApiController]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminSizesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IOutputCacheStore _cacheStore;

        public AdminSizesController(AppDbContext context, IOutputCacheStore cacheStore)
        {
            _context = context;
                    _cacheStore = cacheStore;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.Sizes
                .OrderByDescending(s => s.ValueInCm)
                .Select(s => new SizeDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    ProductCount = s.ProductVariants.Select(v => v.ProductId).Distinct().Count(),
                    ValueInCm = s.ValueInCm
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SizeDto dto)
        {
            var entity = new Size
            {
                Name = dto.Name,
                ValueInCm = dto.ValueInCm
            };
            _context.Sizes.Add(entity);
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            dto.Id = entity.Id;
            return Ok(dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] SizeDto dto)
        {
            var entity = await _context.Sizes.FindAsync(id);
            if (entity == null) return NotFound();

            entity.Name = dto.Name;
            entity.ValueInCm = dto.ValueInCm;
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            return Ok(dto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Sizes.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Sizes.Remove(entity);
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            return NoContent();
        }

        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có mục nào được chọn." });

            var entities = await _context.Sizes.Where(x => dto.Ids.Contains(x.Id)).ToListAsync();
            if (entities.Any())
            {
                _context.Sizes.RemoveRange(entities);
                await _context.SaveChangesAsync();
                await _cacheStore.EvictByTagAsync("filters", default);
            }
            return Ok(new { message = $"Đã xóa {entities.Count} mục." });
        }
    }
}



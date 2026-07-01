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
    [Route("api/admin/glazelines")]
    [ApiController]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminGlazeLinesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IOutputCacheStore _cacheStore;

        public AdminGlazeLinesController(AppDbContext context, IOutputCacheStore cacheStore)
        {
            _context = context;
                    _cacheStore = cacheStore;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.GlazeLines
                .Select(g => new GlazeLineDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description,
                    ProductCount = g.ProductVariants.Select(v => v.ProductId).Distinct().Count()
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] GlazeLineDto dto)
        {
            var entity = new GlazeLine
            {
                Name = dto.Name,
                Description = dto.Description
            };
            _context.GlazeLines.Add(entity);
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            dto.Id = entity.Id;
            return Ok(dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] GlazeLineDto dto)
        {
            var entity = await _context.GlazeLines.FindAsync(id);
            if (entity == null) return NotFound();

            entity.Name = dto.Name;
            entity.Description = dto.Description;
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            return Ok(dto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.GlazeLines.FindAsync(id);
            if (entity == null) return NotFound();
            _context.GlazeLines.Remove(entity);
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            return NoContent();
        }

        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có mục nào được chọn." });

            var entities = await _context.GlazeLines.Where(x => dto.Ids.Contains(x.Id)).ToListAsync();
            if (entities.Any())
            {
                _context.GlazeLines.RemoveRange(entities);
                await _context.SaveChangesAsync();
                await _cacheStore.EvictByTagAsync("filters", default);
            }
            return Ok(new { message = $"Đã xóa {entities.Count} mục." });
        }
    }
}



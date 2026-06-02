using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers
{
    [Route("api/admin/producttypes")]
    [ApiController]
    [Authorize]
    public class AdminProductTypesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IOutputCacheStore _cacheStore;

        public AdminProductTypesController(AppDbContext context, IOutputCacheStore cacheStore)
        {
            _context = context;
                    _cacheStore = cacheStore;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.ProductTypes
                .Select(g => new ProductTypeDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductTypeDto dto)
        {
            var entity = new ProductType
            {
                Name = dto.Name,
                Description = dto.Description
            };
            _context.ProductTypes.Add(entity);
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            dto.Id = entity.Id;
            return Ok(dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductTypeDto dto)
        {
            var entity = await _context.ProductTypes.FindAsync(id);
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
            var entity = await _context.ProductTypes.FindAsync(id);
            if (entity == null) return NotFound();
            _context.ProductTypes.Remove(entity);
            await _context.SaveChangesAsync();
            await _cacheStore.EvictByTagAsync("filters", default);
            return NoContent();
        }
    }
}

using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [Route("api/admin/sizes")]
    [ApiController]
    [Authorize]
    public class AdminSizesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminSizesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.Sizes
                .Select(s => new SizeDto
                {
                    Id = s.Id,
                    Name = s.Name,
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
            return Ok(dto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Sizes.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Sizes.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}

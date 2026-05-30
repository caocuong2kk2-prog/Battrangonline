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
    [Route("api/admin/colors")]
    [ApiController]
    [Authorize]
    public class AdminColorsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminColorsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.Colors
                .Select(g => new ColorDto
                {
                    Id = g.Id,
                    Name = g.Name
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ColorDto dto)
        {
            var entity = new Color
            {
                Name = dto.Name
            };
            _context.Colors.Add(entity);
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return Ok(dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ColorDto dto)
        {
            var entity = await _context.Colors.FindAsync(id);
            if (entity == null) return NotFound();

            entity.Name = dto.Name;
            await _context.SaveChangesAsync();
            return Ok(dto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Colors.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Colors.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}

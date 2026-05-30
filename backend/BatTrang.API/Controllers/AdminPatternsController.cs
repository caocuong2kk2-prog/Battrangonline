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
    [Route("api/admin/patterns")]
    [ApiController]
    [Authorize]
    public class AdminPatternsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminPatternsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.Patterns
                .Select(g => new PatternDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PatternDto dto)
        {
            var entity = new Pattern
            {
                Name = dto.Name,
                Description = dto.Description
            };
            _context.Patterns.Add(entity);
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return Ok(dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] PatternDto dto)
        {
            var entity = await _context.Patterns.FindAsync(id);
            if (entity == null) return NotFound();

            entity.Name = dto.Name;
            entity.Description = dto.Description;
            await _context.SaveChangesAsync();
            return Ok(dto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Patterns.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Patterns.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}

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
    [Route("api/admin/materials")]
    [ApiController]
    [Authorize]
    public class AdminMaterialsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminMaterialsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.Materials
                .Select(g => new MaterialDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MaterialDto dto)
        {
            var entity = new Material
            {
                Name = dto.Name,
                Description = dto.Description
            };
            _context.Materials.Add(entity);
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return Ok(dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] MaterialDto dto)
        {
            var entity = await _context.Materials.FindAsync(id);
            if (entity == null) return NotFound();

            entity.Name = dto.Name;
            entity.Description = dto.Description;
            await _context.SaveChangesAsync();
            return Ok(dto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Materials.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Materials.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}

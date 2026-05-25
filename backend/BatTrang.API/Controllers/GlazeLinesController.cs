using BatTrang.Core.DTOs;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GlazeLinesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GlazeLinesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var glazeLines = await _context.GlazeLines
                .Select(g => new GlazeLineDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description
                })
                .ToListAsync();

            return Ok(glazeLines);
        }
    }
}

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
    public class SizesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SizesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
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
    }
}

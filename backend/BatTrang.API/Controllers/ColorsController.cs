using BatTrang.Core.DTOs;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ColorsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ColorsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        [OutputCache(PolicyName = "FiltersCache")]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.Colors
                .Select(g => new ColorDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    ProductCount = g.ProductVariants.Select(v => v.ProductId).Distinct().Count()
                })
                .ToListAsync();

            return Ok(items);
        }
    }
}


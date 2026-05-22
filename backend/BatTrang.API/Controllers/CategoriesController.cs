using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryRepository _categoryRepo;

        public CategoriesController(ICategoryRepository categoryRepo)
        {
            _categoryRepo = categoryRepo;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _categoryRepo.ListAllAsync();
            var dtos = categories.Select(c => new CategoryDto
            {
                Id = c.Slug, // frontend uses slug as ID
                Name = c.Name,
                Icon = c.Icon,
                Desc = c.Description
            });

            // Prepend "All" option if frontend expects it from API, but usually frontend prepends it itself
            return Ok(dtos);
        }
    }
}

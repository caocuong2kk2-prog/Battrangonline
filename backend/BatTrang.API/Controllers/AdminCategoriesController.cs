using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/admin/categories")]
    [Authorize]
    public class AdminCategoriesController : ControllerBase
    {
        private readonly ICategoryRepository _categoryRepo;

        public AdminCategoriesController(ICategoryRepository categoryRepo)
        {
            _categoryRepo = categoryRepo;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CategoryDto dto)
        {
            var category = new Category
            {
                Name = dto.Name,
                Slug = dto.Id,
                Icon = dto.Icon,
                Description = dto.Desc
            };
            await _categoryRepo.AddAsync(category);
            return CreatedAtAction(nameof(Get), new { id = category.Slug }, dto);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            var c = await _categoryRepo.GetBySlugAsync(id);
            if (c == null) return NotFound();
            return Ok(new CategoryDto { Id = c.Slug, Name = c.Name, Icon = c.Icon, Desc = c.Description });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] CategoryDto dto)
        {
            var category = await _categoryRepo.GetBySlugAsync(id);
            if (category == null) return NotFound();

            if (category.Icon != dto.Icon)
                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(category.Icon);

            category.Name = dto.Name;
            category.Icon = dto.Icon;
            category.Description = dto.Desc;
            await _categoryRepo.UpdateAsync(category);

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var category = await _categoryRepo.GetBySlugAsync(id);
            if (category == null) return NotFound();

            var icon = category.Icon;

            await _categoryRepo.DeleteAsync(category);

            BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(icon);

            return NoContent();
        }
    }
}

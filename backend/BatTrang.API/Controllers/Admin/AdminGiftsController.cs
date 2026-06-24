using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.AspNetCore.OutputCaching;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/gifts")]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminGiftsController : ControllerBase
    {
        private readonly BatTrang.Infrastructure.Data.AppDbContext _context;
        private readonly IOutputCacheStore _cacheStore;

        public AdminGiftsController(BatTrang.Infrastructure.Data.AppDbContext context, IOutputCacheStore cacheStore)
        {
            _context = context;
            _cacheStore = cacheStore;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var gifts = await _context.Gifts
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();

            var dtos = gifts.Select(g => new GiftDto
            {
                Id = g.Id,
                Name = g.Name,
                ImageUrl = g.ImageUrl,
                EstimatedValue = g.EstimatedValue,
                Stock = g.Stock,
                Status = g.Status
            }).ToList();

            return Ok(dtos);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] GiftDto dto)
        {
            var gift = new Gift
            {
                Name = dto.Name,
                ImageUrl = dto.ImageUrl,
                EstimatedValue = dto.EstimatedValue,
                Stock = dto.Stock,
                Status = dto.Status ?? "active",
                CreatedAt = DateTime.UtcNow.AddHours(7),
                UpdatedAt = DateTime.UtcNow.AddHours(7)
            };

            _context.Gifts.Add(gift);
            await _context.SaveChangesAsync();

            dto.Id = gift.Id;
            await _cacheStore.EvictByTagAsync("products", default);
            return CreatedAtAction(nameof(GetAll), new { id = gift.Id }, dto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] GiftDto dto)
        {
            var gift = await _context.Gifts.FindAsync(id);
            if (gift == null) return NotFound();

            gift.Name = dto.Name;
            gift.ImageUrl = dto.ImageUrl;
            gift.EstimatedValue = dto.EstimatedValue;
            gift.Stock = dto.Stock;
            gift.Status = dto.Status ?? gift.Status;
            gift.UpdatedAt = DateTime.UtcNow.AddHours(7);

            _context.Gifts.Update(gift);
            await _context.SaveChangesAsync();

            await _cacheStore.EvictByTagAsync("products", default);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var gift = await _context.Gifts.FindAsync(id);
            if (gift == null) return NotFound();

            // Also clean up relationships
            var linkedProductGifts = _context.ProductGifts.Where(pg => pg.GiftId == id);
            _context.ProductGifts.RemoveRange(linkedProductGifts);

            // Clean up files
            if (!string.IsNullOrEmpty(gift.ImageUrl))
            {
                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(gift.ImageUrl);
            }

            _context.Gifts.Remove(gift);
            await _context.SaveChangesAsync();

            await _cacheStore.EvictByTagAsync("products", default);
            return NoContent();
        }

        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkGiftDeleteDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có quà tặng nào được chọn." });

            int deleted = 0;
            foreach (var id in dto.Ids)
            {
                var gift = await _context.Gifts.FindAsync(id);
                if (gift != null)
                {
                    var linkedProductGifts = _context.ProductGifts.Where(pg => pg.GiftId == id);
                    _context.ProductGifts.RemoveRange(linkedProductGifts);

                    if (!string.IsNullOrEmpty(gift.ImageUrl))
                    {
                        BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(gift.ImageUrl);
                    }

                    _context.Gifts.Remove(gift);
                    deleted++;
                }
            }

            if (deleted > 0)
            {
                await _context.SaveChangesAsync();
                await _cacheStore.EvictByTagAsync("products", default);
            }

            return Ok(new { message = $"Đã xóa {deleted} quà tặng." });
        }
    }

    public class BulkGiftDeleteDto
    {
        public List<int> Ids { get; set; } = new List<int>();
    }
}

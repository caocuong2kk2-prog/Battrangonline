using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/campaigns")]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminCampaignsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminCampaignsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var campaigns = await _context.Campaigns
                .OrderByDescending(c => c.Id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.StartDate,
                    c.EndDate,
                    c.DiscountPercent,
                    c.Status,
                    c.Description,
                    c.TargetUrl,
                    c.BannerImage,
                    ProductIds = c.CampaignProducts.Select(cp => cp.ProductId).ToList()
                })
                .AsSplitQuery()
                .ToListAsync();

            return Ok(campaigns);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            
            var campaign = await _context.Campaigns
                .Where(c => c.Id == id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.StartDate,
                    c.EndDate,
                    c.DiscountPercent,
                    c.Status,
                    c.Description,
                    c.TargetUrl,
                    c.BannerImage
                })
                .FirstOrDefaultAsync();

            if (campaign == null) return NotFound();

            var products = await _context.CampaignProducts
                .Where(cp => cp.CampaignId == id)
                .Select(cp => new
                {
                    cp.Product.Id,
                    cp.Product.Name,
                    cp.Product.Sku,
                    ImageUrl = _context.ProductImages
                        .Where(img => img.Variant.ProductId == cp.ProductId)
                        .OrderBy(img => img.SortOrder)
                        .Select(img => img.ImageUrl)
                        .FirstOrDefault()
                })
                .ToListAsync();

            var dto = new
            {
                campaign.Id,
                campaign.Name,
                campaign.StartDate,
                campaign.EndDate,
                campaign.DiscountPercent,
                campaign.Status,
                campaign.Description,
                campaign.TargetUrl,
                campaign.BannerImage,
                Products = products
            };

            sw.Stop();
            Console.WriteLine($"[Perf] GetById({id}) took {sw.ElapsedMilliseconds}ms. Products count: {products.Count}");

            return Ok(dto);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CampaignCreateDto dto)
        {
            if (dto.StartDate >= dto.EndDate)
                return BadRequest(new { message = "Thời gian kết thúc phải sau thời gian bắt đầu." });

            if (dto.DiscountPercent <= 0 || dto.DiscountPercent > 99)
                return BadRequest(new { message = "Phần trăm giảm giá phải từ 1 đến 99." });

            var campaign = new Campaign
            {
                Name = dto.Name,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                DiscountPercent = dto.DiscountPercent,
                Status = dto.Status ?? "active",
                Description = dto.Description,
                TargetUrl = dto.TargetUrl,
                BannerImage = dto.BannerImage,
                CampaignProducts = dto.ProductIds?.Select(pid => new CampaignProduct { ProductId = pid }).ToList() ?? new List<CampaignProduct>()
            };

            _context.Campaigns.Add(campaign);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = campaign.Id }, campaign);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CampaignCreateDto dto)
        {
            var campaign = await _context.Campaigns
                .Include(c => c.CampaignProducts)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (campaign == null) return NotFound();

            if (dto.StartDate >= dto.EndDate)
                return BadRequest(new { message = "Thời gian kết thúc phải sau thời gian bắt đầu." });

            campaign.Name = dto.Name;
            campaign.StartDate = dto.StartDate;
            campaign.EndDate = dto.EndDate;
            campaign.DiscountPercent = dto.DiscountPercent;
            campaign.Status = dto.Status ?? "active";
            campaign.Description = dto.Description;
            campaign.TargetUrl = dto.TargetUrl;
            campaign.BannerImage = dto.BannerImage;

            // Sync products
            _context.CampaignProducts.RemoveRange(campaign.CampaignProducts);
            
            if (dto.ProductIds != null)
            {
                foreach (var pid in dto.ProductIds)
                {
                    campaign.CampaignProducts.Add(new CampaignProduct { ProductId = pid });
                }
            }

            // Also clear CampaignPrice from variants of products that are removed
            // or if the campaign ended / paused. This is handled gracefully by CampaignUpdateService 
            // but we might want to manually evict them here if needed. The background worker will do it within 1 minute.

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Delete(int id)
        {
            var campaign = await _context.Campaigns.FindAsync(id);
            if (campaign == null) return NotFound();

            _context.Campaigns.Remove(campaign);
            await _context.SaveChangesAsync();

            // Background worker will automatically clear the orphaned CampaignPrices
            return NoContent();
        }
    }

    public class CampaignCreateDto
    {
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DiscountPercent { get; set; }
        public string Status { get; set; } = "active";
        public string? Description { get; set; }
        public string? TargetUrl { get; set; }
        public string? BannerImage { get; set; }
        public List<int>? ProductIds { get; set; }
    }
}

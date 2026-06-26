using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AddressController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AddressController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/address/provinces
        [HttpGet("provinces")]
        public async Task<ActionResult<IEnumerable<AdministrativeUnit>>> GetProvinces()
        {
            var provinces = await _context.AdministrativeUnits
                .Where(u => u.Level == "province")
                .OrderBy(u => u.Name)
                .ToListAsync();
            return Ok(provinces);
        }

        // GET: api/address/wards/{provinceCode}
        // Note: For API v2, wards are direct children of provinces
        [HttpGet("wards/{provinceCode}")]
        public async Task<ActionResult<IEnumerable<AdministrativeUnit>>> GetWards(int provinceCode)
        {
            var wards = await _context.AdministrativeUnits
                .Where(u => u.Level == "ward" && u.ParentCode == provinceCode)
                .OrderBy(u => u.Name)
                .ToListAsync();
            return Ok(wards);
        }

        // GET: api/address/saved
        [HttpGet("saved")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<SavedAddress>>> GetSavedAddresses()
        {
            var customerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdStr) || !int.TryParse(customerIdStr, out int customerId))
            {
                return Unauthorized();
            }

            var addresses = await _context.SavedAddresses
                .Where(a => a.CustomerId == customerId)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(addresses);
        }

        // POST: api/address/saved
        [HttpPost("saved")]
        [Authorize]
        public async Task<ActionResult<SavedAddress>> SaveAddress(SavedAddressDto dto)
        {
            var customerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdStr) || !int.TryParse(customerIdStr, out int customerId))
            {
                return Unauthorized();
            }

            // Check limit (max 5 addresses)
            var currentCount = await _context.SavedAddresses.CountAsync(a => a.CustomerId == customerId);
            if (currentCount >= 5)
            {
                return BadRequest(new { message = "Bạn chỉ có thể lưu tối đa 5 địa chỉ." });
            }

            var address = new SavedAddress
            {
                CustomerId = customerId,
                Label = dto.Label ?? "Địa chỉ",
                RecipientName = dto.RecipientName,
                Phone = dto.Phone,
                ProvinceCode = dto.ProvinceCode,
                ProvinceName = dto.ProvinceName,
                WardCode = dto.WardCode,
                WardName = dto.WardName,
                DetailAddress = dto.DetailAddress,
                FullAddress = $"{dto.DetailAddress}, {dto.WardName}, {dto.ProvinceName}",
                IsDefault = dto.IsDefault,
                CreatedAt = System.DateTime.UtcNow.AddHours(7)
            };

            // If this is set as default, remove default from others
            if (address.IsDefault)
            {
                var existingDefaults = await _context.SavedAddresses
                    .Where(a => a.CustomerId == customerId && a.IsDefault)
                    .ToListAsync();
                foreach (var ex in existingDefaults)
                {
                    ex.IsDefault = false;
                }
            }
            // If it's the first address, make it default automatically
            else if (currentCount == 0)
            {
                address.IsDefault = true;
            }

            _context.SavedAddresses.Add(address);
            await _context.SaveChangesAsync();

            return Ok(address);
        }

        // DELETE: api/address/saved/{id}
        [HttpDelete("saved/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSavedAddress(int id)
        {
            var customerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(customerIdStr) || !int.TryParse(customerIdStr, out int customerId))
            {
                return Unauthorized();
            }

            var address = await _context.SavedAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId);

            if (address == null)
            {
                return NotFound();
            }

            _context.SavedAddresses.Remove(address);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class SavedAddressDto
    {
        public string? Label { get; set; }
        public string RecipientName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public int ProvinceCode { get; set; }
        public string ProvinceName { get; set; } = string.Empty;
        public int WardCode { get; set; }
        public string WardName { get; set; } = string.Empty;
        public string DetailAddress { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
    }
}

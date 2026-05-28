using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAdminUserRepository _adminUserRepo;
        private readonly IConfiguration _config;

        public AuthController(IAdminUserRepository adminUserRepo, IConfiguration config)
        {
            _adminUserRepo = adminUserRepo;
            _config = config;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _adminUserRepo.GetByUsernameAsync(request.Username);
            
            if (user == null || request.Password != user.Password)
            {
                return Unauthorized(new { message = "Tài khoản hoặc mật khẩu không chính xác." });
            }

            var token = GenerateJwtToken(user);

            return Ok(new LoginResponse
            {
                Token = token,
                Name = user.Name,
                Username = user.Username,
                Role = user.Role
            });
        }

        private string GenerateJwtToken(AdminUser user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? ""));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddDays(7);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim("username", user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Name, user.Name),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [Authorize]
        [HttpPost("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var usernameClaim = User.FindFirst("username")?.Value;
            if (string.IsNullOrEmpty(usernameClaim))
            {
                return Unauthorized(new { message = "Không xác định được danh tính quản trị viên." });
            }

            var user = await _adminUserRepo.GetByUsernameAsync(usernameClaim);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản quản trị viên." });
            }

            if (user.Username != request.Username)
            {
                var existingUser = await _adminUserRepo.GetByUsernameAsync(request.Username);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "Tên tài khoản này đã được sử dụng." });
                }
            }

            user.Name = request.Name;
            user.Username = request.Username;

            if (!string.IsNullOrEmpty(request.NewPassword))
            {
                user.Password = request.NewPassword;
            }

            await _adminUserRepo.UpdateAsync(user);

            var token = GenerateJwtToken(user);

            return Ok(new LoginResponse
            {
                Token = token,
                Name = user.Name,
                Username = user.Username
            });
        }
    }

    public class UpdateProfileRequest
    {
        public string Name { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string? NewPassword { get; set; }
    }
}

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
        [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("LoginPolicy")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _adminUserRepo.GetByUsernameAsync(request.Username);
            
            if (user == null || string.IsNullOrEmpty(user.Password))
            {
                return Unauthorized(new { message = "Tài khoản hoặc mật khẩu không chính xác." });
            }

            bool isPasswordValid = false;
            try 
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.Password);
            } 
            catch 
            {
                // Fallback for plaintext passwords created before the fix
                if (!user.Password.StartsWith("$2") && user.Password == request.Password)
                {
                    isPasswordValid = true;
                    user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);
                    await _adminUserRepo.UpdateAsync(user);
                }
            }

            if (!isPasswordValid)
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
            var expires = DateTime.UtcNow.AddHours(7).AddDays(7);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim("username", user.Username ?? ""),
                new Claim(ClaimTypes.Role, user.Role ?? "admin"),
                new Claim(JwtRegisteredClaimNames.Name, user.Name ?? "Admin"),
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

        [Authorize(Policy = "AdminOrStaff")]
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
                user.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
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

        [HttpPost("recovery-reset")]
        [AllowAnonymous]
        [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("AuthPolicy")]
        public async Task<IActionResult> RecoveryReset([FromBody] RecoveryResetRequest request)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.RecoveryKey) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { message = "Vui lòng nhập đầy đủ thông tin." });
            }

            if (request.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 6 ký tự." });
            }

            // Verify recovery key from environment variable
            var serverKey = _config["ADMIN_RECOVERY_KEY"] ?? Environment.GetEnvironmentVariable("ADMIN_RECOVERY_KEY") ?? "";
            if (string.IsNullOrEmpty(serverKey) || request.RecoveryKey != serverKey)
            {
                return StatusCode(403, new { message = "Mã khôi phục không hợp lệ." });
            }

            // Reset password for root admin account
            var adminUser = await _adminUserRepo.GetByUsernameAsync("admin");
            if (adminUser == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản quản trị gốc." });
            }

            adminUser.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _adminUserRepo.UpdateAsync(adminUser);

            return Ok(new { message = "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới." });
        }
    }

    public class UpdateProfileRequest
    {
        public string Name { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string? NewPassword { get; set; }
    }

    public class RecoveryResetRequest
    {
        public string RecoveryKey { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}

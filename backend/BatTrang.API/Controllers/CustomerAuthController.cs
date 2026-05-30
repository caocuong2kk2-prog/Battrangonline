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
using System.Linq;
using Microsoft.AspNetCore.SignalR;
using BatTrang.API.Hubs;
using BatTrang.Infrastructure.Data;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/customers")]
    public class CustomerAuthController : ControllerBase
    {
        private readonly ICustomerRepository _customerRepo;
        private readonly IConfiguration _config;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly BatTrang.Infrastructure.Services.NotificationService _notificationService;
        private readonly AppDbContext _context;

        public CustomerAuthController(
            ICustomerRepository customerRepo, 
            IConfiguration config, 
            IHubContext<NotificationHub> hubContext,
            BatTrang.Infrastructure.Services.NotificationService notificationService,
            AppDbContext context)
        {
            _customerRepo = customerRepo;
            _config = config;
            _hubContext = hubContext;
            _notificationService = notificationService;
            _context = context;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] CustomerLoginRequest request)
        {
            var user = await _customerRepo.GetByPhoneOrEmailAsync(request.EmailOrPhone, request.EmailOrPhone);
            
            if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Email/Số điện thoại hoặc mật khẩu không chính xác." });
            }

            if (user.Status == "inactive")
            {
                return BadRequest(new { message = "Tài khoản của bạn đã bị vô hiệu hóa." });
            }

            var token = GenerateJwtToken(user);

            return Ok(new CustomerLoginResponse
            {
                Token = token,
                User = new CustomerDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Phone = user.Phone,
                    Address = user.Address,
                    Status = user.Status,
                    JoinedAt = user.JoinedAt
                }
            });
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] CustomerRegisterRequest request)
        {
            var existingUser = await _customerRepo.GetByPhoneOrEmailAsync(request.Phone, request.Email);

            // Nếu đã tồn tại tài khoản CÓ mật khẩu → từ chối đăng ký
            if (existingUser != null && !string.IsNullOrEmpty(existingUser.PasswordHash))
            {
                return BadRequest(new { message = "Email hoặc Số điện thoại đã được đăng ký. Vui lòng đăng nhập." });
            }

            Customer created;

            if (existingUser != null && string.IsNullOrEmpty(existingUser.PasswordHash))
            {
                // Khách vãng lai đặt hàng trước → nâng cấp thành tài khoản thật, giữ lịch sử đơn hàng
                existingUser.Name = request.Name;
                existingUser.Email = request.Email;
                existingUser.Phone = request.Phone ?? existingUser.Phone;
                existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                existingUser.Status = "active";
                await _customerRepo.UpdateAsync(existingUser);
                created = existingUser;
            }
            else
            {
                // Khách hoàn toàn mới → tạo bản ghi mới
                var newCustomer = new Customer
                {
                    Name = request.Name,
                    Email = request.Email,
                    Phone = request.Phone,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    Status = "active",
                    JoinedAt = DateTime.UtcNow
                };
                created = await _customerRepo.AddAsync(newCustomer);
            }

            var token = GenerateJwtToken(created);

            try
            {
                var msg = $"Khách hàng mới {created.Name} ({created.Email}) vừa đăng ký tài khoản.";
                var noti = new BatTrang.Core.Entities.Notification { Type = "CustomerRegistered", Message = msg, CreatedAt = DateTime.UtcNow };
                _context.Notifications.Add(noti);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "CustomerRegistered", msg);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR Push Error] {ex.Message}");
            }

            return Ok(new CustomerLoginResponse
            {
                Token = token,
                User = new CustomerDto
                {
                    Id = created.Id,
                    Name = created.Name,
                    Email = created.Email,
                    Phone = created.Phone,
                    Address = created.Address,
                    Status = created.Status,
                    JoinedAt = created.JoinedAt
                }
            });
        }

        private string GenerateJwtToken(Customer user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? ""));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddDays(30);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim("email", user.Email ?? ""),
                new Claim(ClaimTypes.Role, "Customer"),
                new Claim(JwtRegisteredClaimNames.Name, user.Name ?? ""),
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

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EmailOrPhone)) return BadRequest(new { message = "Vui lòng nhập Email hoặc Số điện thoại." });

            var user = await _customerRepo.GetByPhoneOrEmailAsync(request.EmailOrPhone, request.EmailOrPhone);
            
            // Luôn trả về OK chung chung để chống dò email
            if (user == null || user.Status == "inactive")
                return Ok(new { message = "Nếu tài khoản tồn tại trong hệ thống, hướng dẫn khôi phục sẽ được gửi đến bạn." });

            // Kiểm tra cooldown (60s)
            if (user.LastResetSentAt.HasValue && (DateTime.UtcNow - user.LastResetSentAt.Value).TotalSeconds < 60)
            {
                return BadRequest(new { message = "Vui lòng đợi 60 giây trước khi yêu cầu gửi lại Email khôi phục." });
            }

            // 2. Max attempts per day (Reset attempts logic)
            // If the last reset was more than 24 hours ago, reset the counter
            if (user.LastResetSentAt.HasValue && (DateTime.UtcNow - user.LastResetSentAt.Value).TotalHours > 24)
            {
                user.ResetAttempts = 0;
            }

            if (user.ResetAttempts >= 5)
            {
                return BadRequest(new { message = "Bạn đã yêu cầu khôi phục quá nhiều lần trong ngày. Vui lòng thử lại sau 24h." });
            }

            if (user.Status == "inactive")
            {
                return BadRequest(new { message = "Tài khoản của bạn đã bị vô hiệu hóa." });
            }

            // Sinh mã OTP 6 số (if using OTP) or Token for link
            string rawToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
            var safeToken = rawToken.Replace("+", "-").Replace("/", "_").Replace("=", "");
            
            user.ResetToken = BCrypt.Net.BCrypt.HashPassword(safeToken); // Hash Token
            user.ResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(30);

            var resetLink = $"http://localhost:5080/forgot-password.html?token={safeToken}&email={user.Email}";
            await _notificationService.SendPasswordResetEmailAsync(user.Email, resetLink);

            user.ResetAttempts++;
            user.LastResetSentAt = DateTime.UtcNow;
            await _customerRepo.UpdateAsync(user);

            return Ok(new { message = "Nếu tài khoản tồn tại trong hệ thống, hướng dẫn khôi phục sẽ được gửi đến bạn qua Email." });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var user = await _customerRepo.GetByPhoneOrEmailAsync(request.EmailOrPhone, request.EmailOrPhone);
            if (user == null || user.ResetTokenExpiresAt == null || user.ResetTokenExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Yêu cầu khôi phục đã hết hạn. Vui lòng thử lại." });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.TokenOrOtp, user.ResetToken))
            {
                return BadRequest(new { message = "Mã xác nhận không chính xác hoặc không hợp lệ." });
            }

            // Đặt lại mật khẩu
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            
            // Xóa token
            user.ResetToken = null;
            user.ResetTokenExpiresAt = null;
            
            await _customerRepo.UpdateAsync(user);

            return Ok(new { success = true, message = "Đổi mật khẩu thành công!" });
        }
    }

    public class CustomerLoginRequest
    {
        public string EmailOrPhone { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class CustomerRegisterRequest
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? Phone { get; set; }
        public string Password { get; set; } = null!;
    }

    public class CustomerLoginResponse
    {
        public string Token { get; set; } = null!;
        public CustomerDto User { get; set; } = null!;
    }

    public class ForgotPasswordRequest
    {
        public string EmailOrPhone { get; set; } = null!;
    }

    public class ResetPasswordRequest
    {
        public string EmailOrPhone { get; set; } = null!;
        public string TokenOrOtp { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}

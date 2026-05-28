using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System.Linq;
using System.IdentityModel.Tokens.Jwt;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdminAccountsController : ControllerBase
    {
        private readonly IAdminUserRepository _adminUserRepo;

        public AdminAccountsController(IAdminUserRepository adminUserRepo)
        {
            _adminUserRepo = adminUserRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var accounts = await _adminUserRepo.GetAllAsync();
            // Optional: You could strip passwords, but let's just return what's safe or everything since it's admin panel.
            var result = accounts.Select(a => new
            {
                a.Id,
                a.Name,
                a.Username,
                a.Role
            });
            return Ok(result);
        }

        [HttpGet("public-team")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicTeam()
        {
            var accounts = await _adminUserRepo.GetAllAsync();
            var result = accounts.Select(a => new
            {
                a.Id,
                a.Name,
                Role = a.Role == "admin" ? "Quản trị viên" : "Nghệ nhân",
                Bio = "Cùng chung đam mê và tâm huyết, góp phần gìn giữ tinh hoa gốm sứ Bát Tràng qua từng tác phẩm.",
                Avatar = "assets/images/placeholder.jpg"
            });
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateAccountRequest req)
        {
            var existingUser = await _adminUserRepo.GetByUsernameAsync(req.Username);
            if (existingUser != null)
            {
                return BadRequest(new { message = "Tên tài khoản này đã được sử dụng." });
            }

            var newUser = new AdminUser
            {
                Name = req.Name,
                Username = req.Username,
                Password = req.Password,
                Role = req.Role ?? "staff"
            };

            await _adminUserRepo.AddAsync(newUser);
            return Ok(new
            {
                newUser.Id,
                newUser.Name,
                newUser.Username,
                newUser.Role
            });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateAccountRequest req)
        {
            var user = await _adminUserRepo.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản." });
            }

            if (user.Username != req.Username)
            {
                var existingUser = await _adminUserRepo.GetByUsernameAsync(req.Username);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "Tên tài khoản này đã được sử dụng." });
                }
            }

            user.Name = req.Name;
            user.Username = req.Username;
            user.Role = req.Role;

            if (!string.IsNullOrEmpty(req.Password))
            {
                user.Password = req.Password;
            }

            await _adminUserRepo.UpdateAsync(user);

            return Ok(new
            {
                user.Id,
                user.Name,
                user.Username,
                user.Role
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var currentUserIdStr = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (currentUserIdStr != null && int.TryParse(currentUserIdStr, out int currentUserId))
            {
                if (id == currentUserId)
                {
                    return BadRequest(new { message = "Không thể xóa chính tài khoản bạn đang đăng nhập." });
                }
            }

            var user = await _adminUserRepo.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            await _adminUserRepo.DeleteAsync(user);
            return Ok(new { message = "Xóa tài khoản thành công." });
        }
    }

    public class CreateAccountRequest
    {
        public string Name { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Role { get; set; } = "staff";
    }

    public class UpdateAccountRequest
    {
        public string Name { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string? Password { get; set; }
        public string Role { get; set; } = "staff";
    }
}

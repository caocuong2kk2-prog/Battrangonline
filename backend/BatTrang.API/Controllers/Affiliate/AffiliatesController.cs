using BatTrang.Core.Entities.Affiliate;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using BCrypt.Net;
using Microsoft.AspNetCore.SignalR;
using BatTrang.API.Hubs;

namespace BatTrang.API.Controllers.Affiliate
{
    [ApiController]
    [Route("api/[controller]")]
    public class AffiliatesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly BatTrang.Infrastructure.Services.NotificationService _notificationService;

        public AffiliatesController(AppDbContext context, IConfiguration config, IHubContext<NotificationHub> hubContext, BatTrang.Infrastructure.Services.NotificationService notificationService)
        {
            _context = context;
            _config = config;
            _hubContext = hubContext;
            _notificationService = notificationService;
        }

        private int GetCurrentAffiliateId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
            if (int.TryParse(userIdString, out int id)) return id;
            return 0;
        }

        private string GenerateAffiliateCodeFromName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "PGT";
            
            // Explicit Vietnamese character mapping to ensure pure ASCII output
            string vietnameseChars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ" +
                                     "ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ";
            string asciiChars =      "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd" +
                                     "AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD";

            var cleanName = new System.Text.StringBuilder();
            foreach (var c in fullName)
            {
                int idx = vietnameseChars.IndexOf(c);
                if (idx >= 0)
                {
                    cleanName.Append(asciiChars[idx]);
                }
                else
                {
                    cleanName.Append(c);
                }
            }
            
            // Extract initials from words
            var words = cleanName.ToString().Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            string initials = "";
            foreach (var word in words)
            {
                char first = word[0];
                if (char.IsAsciiLetter(first) || char.IsDigit(first))
                {
                    initials += first;
                }
            }
            
            initials = initials.ToUpper();
            if (string.IsNullOrEmpty(initials)) return "PGT";
            
            // Limit initials to 5 characters max
            if (initials.Length > 5) initials = initials.Substring(0, 5);
            
            return initials;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterAffiliateDto dto)
        {
            if (await _context.Affiliates.AnyAsync(a => a.Email == dto.Email))
            {
                return BadRequest(new { message = "Email này đã được đăng ký." });
            }

            string baseCode = GenerateAffiliateCodeFromName(dto.Name);
            string code;
            var rand = new Random();
            
            do
            {
                // Generate a code with initials + a random 4-5 digit number (e.g. 1000 to 99999)
                code = baseCode + rand.Next(1000, 100000);
            } while (await _context.Affiliates.AnyAsync(a => a.AffiliateCode == code));

            var affiliate = new BatTrang.Core.Entities.Affiliate.Affiliate
            {
                Name = dto.Name,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                AffiliateCode = code,
                Status = "Pending",
                CCCD = dto.CCCD,
                BankName = dto.BankName,
                BankAccount = dto.BankAccount,
                BankOwner = dto.BankOwner,
                CreatedAt = DateTime.UtcNow.AddHours(7)
            };

            _context.Affiliates.Add(affiliate);
            await _context.SaveChangesAsync();

            try
            {
                var msg = $"CTV mới đăng ký tài khoản: {affiliate.Name} ({affiliate.AffiliateCode})";
                var noti = new BatTrang.Core.Entities.Notification { Type = "AffiliateRegistered", Message = msg };
                _context.Notifications.Add(noti);
                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "AffiliateRegistered", msg);
            }
            catch (Exception) { }

            return Ok(new { success = true, message = "Đăng ký thành công, vui lòng chờ duyệt." });
        }

        [HttpPost("login")]
        [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("LoginPolicy")]
        public async Task<IActionResult> Login([FromBody] LoginAffiliateDto dto)
        {
            var affiliate = await _context.Affiliates.FirstOrDefaultAsync(a => a.Email == dto.Email);
            if (affiliate == null || string.IsNullOrEmpty(affiliate.PasswordHash))
                return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, affiliate.PasswordHash))
                return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

            if (affiliate.Status == "Locked")
                return Unauthorized(new { message = "Tài khoản của bạn đã bị khóa." });

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "super_secret_key_12345_for_battrang_dev_env");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, affiliate.Id.ToString()),
                    new Claim(ClaimTypes.Name, affiliate.Name),
                    new Claim(ClaimTypes.Email, affiliate.Email),
                    new Claim(ClaimTypes.Role, "affiliate")
                }),
                Expires = DateTime.UtcNow.AddHours(7).AddDays(7),
                Issuer = _config["Jwt:Issuer"],
                Audience = _config["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            
            return Ok(new
            {
                token = tokenHandler.WriteToken(token),
                affiliate = new {
                    affiliate.Id,
                    affiliate.Name,
                    affiliate.Email,
                    affiliate.AffiliateCode,
                    affiliate.Status
                }
            });
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            try
            {
                var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
                var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings();
                if (!string.IsNullOrEmpty(clientId))
                {
                    settings.Audience = new[] { clientId };
                }

                var payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(dto.Credential, settings);
                var email = payload.Email;
                var name = payload.Name ?? "No Name";

                var affiliate = await _context.Affiliates.FirstOrDefaultAsync(a => a.Email == email);
                if (affiliate == null)
                {
                    string code;
                    string baseCode = GenerateAffiliateCodeFromName(name);
                    var rand = new Random();
                    do
                    {
                        code = baseCode + rand.Next(1000, 100000);
                    } while (await _context.Affiliates.AnyAsync(a => a.AffiliateCode == code));

                    affiliate = new BatTrang.Core.Entities.Affiliate.Affiliate
                    {
                        Name = name,
                        Email = email,
                        Phone = "GGL" + Guid.NewGuid().ToString().Substring(0, 8), // Dùng chuỗi ngẫu nhiên để tránh lỗi trùng SĐT (Unique Index)
                        AffiliateCode = code,
                        Status = "Pending", // Trở về trạng thái Chờ duyệt giống y hệt đăng ký thông thường
                        CreatedAt = DateTime.UtcNow.AddHours(7)
                    };
                    _context.Affiliates.Add(affiliate);
                    await _context.SaveChangesAsync();

                    try
                    {
                        var msg = $"CTV mới đăng ký qua Google: {affiliate.Name} ({affiliate.AffiliateCode})";
                        var noti = new BatTrang.Core.Entities.Notification { Type = "AffiliateRegistered", Message = msg };
                        _context.Notifications.Add(noti);
                        await _context.SaveChangesAsync();
                        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "AffiliateRegistered", msg);
                    }
                    catch (Exception) { }
                }
                else if (affiliate.Status == "Locked")
                {
                    return Unauthorized(new { message = "Tài khoản của bạn đã bị khóa." });
                }

                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "super_secret_key_12345_for_battrang_dev_env");
                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, affiliate.Id.ToString()),
                        new Claim(ClaimTypes.Name, affiliate.Name),
                        new Claim(ClaimTypes.Email, affiliate.Email),
                        new Claim(ClaimTypes.Role, "affiliate")
                    }),
                    Expires = DateTime.UtcNow.AddHours(7).AddDays(7),
                    Issuer = _config["Jwt:Issuer"],
                    Audience = _config["Jwt:Audience"],
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };
                var token = tokenHandler.CreateToken(tokenDescriptor);
                
                return Ok(new
                {
                    token = tokenHandler.WriteToken(token),
                    affiliate = new {
                        affiliate.Id,
                        affiliate.Name,
                        affiliate.Email,
                        affiliate.AffiliateCode,
                        affiliate.Status
                    }
                });
            }
            catch (Exception ex)
            {
                var fullError = ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : "");
                return BadRequest(new { message = "Đăng nhập Google thất bại", error = fullError });
            }
        }

        [HttpGet("profile")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> GetProfile()
        {
            int id = GetCurrentAffiliateId();
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null) return NotFound();

            return Ok(new
            {
                profile.Name,
                profile.Email,
                profile.Phone,
                profile.AffiliateCode,
                profile.Tier,
                profile.Status,
                profile.BankName,
                profile.BankAccount,
                profile.BankOwner,
                profile.CCCD
            });
        }

        [HttpPut("profile")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            int id = GetCurrentAffiliateId();
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null) return NotFound();

            profile.Name = dto.Name;
            profile.Phone = dto.Phone;
            profile.CCCD = dto.CCCD;
            profile.BankName = dto.BankName;
            profile.BankAccount = dto.BankAccount;
            profile.BankOwner = dto.BankOwner;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Cập nhật thông tin thành công." });
        }

        [HttpGet("stats")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> GetStats([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            int id = GetCurrentAffiliateId();
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null) return Unauthorized();

            // ── Date range (default = tháng hiện tại) ──
            var nowVn = DateTime.UtcNow.AddHours(7);
            var dateFrom = from.HasValue ? from.Value.Date : new DateTime(nowVn.Year, nowVn.Month, 1);
            var dateTo = to.HasValue ? to.Value.Date.AddDays(1).AddTicks(-1) : new DateTime(nowVn.Year, nowVn.Month, DateTime.DaysInMonth(nowVn.Year, nowVn.Month), 23, 59, 59);

            // Hoa hồng: lọc theo khoảng thời gian
            var commissions = await _context.Commissions
                .Where(c => c.AffiliateId == id && c.Status != "Refunded" && c.CreatedAt >= dateFrom && c.CreatedAt <= dateTo)
                .ToListAsync();
            
            var totalPaid = commissions.Where(c => c.Status == "Paid").Sum(c => c.CommissionAmount);
            var pendingCommission = commissions.Where(c => c.Status == "Pending").Sum(c => c.CommissionAmount);
            var approvedCommission = commissions.Where(c => c.Status == "Approved").Sum(c => c.CommissionAmount);
            
            // "Tổng hoa hồng thực nhận" = đã duyệt + đã thanh toán
            var totalEarned = totalPaid + approvedCommission;

            // Tính hoa hồng tạm tính từ đơn đang xử lý CHƯA có Commission record (tránh đếm trùng)
            var ordersWithCommission = await _context.Commissions
                .Where(c => c.AffiliateId == id)
                .Select(c => c.OrderId)
                .Distinct()
                .ToListAsync();

            var inProgressOrders = await _context.Orders
                .Include(o => o.Items)
                .Where(o => o.AffiliateId == id
                         && o.Status != "completed" && o.Status != "cancelled"
                         && o.CreatedAt >= dateFrom && o.CreatedAt <= dateTo
                         && !ordersWithCommission.Contains(o.Id))  // chỉ đơn CHƯA có Commission
                .ToListAsync();

            if (inProgressOrders.Any())
            {
                var productIds = inProgressOrders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products.Where(p => productIds.Contains(p.Id)).ToListAsync();
                var commissionRates = products.ToDictionary(p => p.Id, p => p.CommissionRate);

                foreach (var order in inProgressOrders)
                {
                    decimal estimatedCommission = 0;
                    foreach(var item in order.Items)
                    {
                        decimal productRate = commissionRates.ContainsKey(item.ProductId) ? commissionRates[item.ProductId] : 0;
                        estimatedCommission += item.Quantity * item.UnitPrice * (productRate / 100);
                    }
                    pendingCommission += Math.Round(estimatedCommission, 2);
                }
            }


            // Số dư tổng (không lọc theo date để luôn hiển thị số dư chính xác)
            var allWithdrawals = await _context.WithdrawalRequests.Where(w => w.AffiliateId == id).ToListAsync();
            var totalWithdrawn = allWithdrawals.Where(w => w.Status == "Paid").Sum(w => w.Amount);
            var pendingWithdrawal = allWithdrawals.Where(w => w.Status == "Pending").Sum(w => w.Amount);
            var allCommissions = await _context.Commissions.Where(c => c.AffiliateId == id && c.Status != "Refunded").ToListAsync();
            var allEarned = allCommissions.Where(c => c.Status == "Paid" || c.Status == "Approved").Sum(c => c.CommissionAmount);
            var availableBalance = allEarned - totalWithdrawn - pendingWithdrawal;

            // Thống kê lọc theo date range
            var totalOrders = await _context.Orders.CountAsync(o => o.AffiliateId == id && o.CreatedAt >= dateFrom && o.CreatedAt <= dateTo);
            var completedOrders = await _context.Orders.CountAsync(o => o.AffiliateId == id && o.Status == "completed" && o.CreatedAt >= dateFrom && o.CreatedAt <= dateTo);
            var validClicks = await _context.AffiliateClicks.CountAsync(ac => ac.AffiliateId == id && ac.ClickedAt >= dateFrom && ac.ClickedAt <= dateTo);
            var totalOrderValue = await _context.Orders.Where(o => o.AffiliateId == id && o.CreatedAt >= dateFrom && o.CreatedAt <= dateTo && o.Status != "cancelled").SumAsync(o => o.Total);
            double conversionRate = 0.0;
            if (validClicks > 0)
            {
                conversionRate = Math.Round(((double)totalOrders / validClicks) * 100, 2);
            }

            // ── Kỳ trước (same duration, shifted back) để tính % tăng trưởng ──
            var duration = dateTo - dateFrom;
            var prevDateTo = dateFrom.AddTicks(-1);
            var prevDateFrom = prevDateTo - duration;

            var prevTotalOrders = await _context.Orders.CountAsync(o => o.AffiliateId == id && o.CreatedAt >= prevDateFrom && o.CreatedAt <= prevDateTo);
            var prevCompletedOrders = await _context.Orders.CountAsync(o => o.AffiliateId == id && o.Status == "completed" && o.CreatedAt >= prevDateFrom && o.CreatedAt <= prevDateTo);
            var prevValidClicks = await _context.AffiliateClicks.CountAsync(ac => ac.AffiliateId == id && ac.ClickedAt >= prevDateFrom && ac.ClickedAt <= prevDateTo);
            var prevTotalOrderValue = await _context.Orders.Where(o => o.AffiliateId == id && o.CreatedAt >= prevDateFrom && o.CreatedAt <= prevDateTo && o.Status != "cancelled").SumAsync(o => o.Total);
            var prevPendingCommission = await _context.Commissions
                .Where(c => c.AffiliateId == id && c.Status == "Pending" && c.CreatedAt >= prevDateFrom && c.CreatedAt <= prevDateTo)
                .SumAsync(c => c.CommissionAmount);

            // Top 5 Products (lọc theo date range)
            var completedOrderItems = await _context.Orders
                .Where(o => o.AffiliateId == id && o.Status == "completed" && o.CreatedAt >= dateFrom && o.CreatedAt <= dateTo)
                .SelectMany(o => o.Items)
                .ToListAsync();

            var topProductsQuery = completedOrderItems
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    QuantitySold = g.Sum(i => i.Quantity),
                    TotalRevenue = g.Sum(i => i.Quantity * i.UnitPrice)
                })
                .OrderByDescending(x => x.QuantitySold)
                .Take(5)
                .ToList();

            var topProductIds = topProductsQuery.Select(p => p.ProductId).ToList();
            var topProductsDb = await _context.Products
                .Include(p => p.Variants)
                .ThenInclude(v => v.Images)
                .Where(p => topProductIds.Contains(p.Id)).ToListAsync();
            
            var commissionRatesTop = topProductsDb.ToDictionary(p => p.Id, p => p.CommissionRate);
            var imagesTop = topProductsDb.ToDictionary(p => p.Id, p => p.Variants.SelectMany(v => v.Images).FirstOrDefault()?.ImageUrl ?? "/images/product-placeholder.jpg");

            var skuTop = topProductsDb.ToDictionary(p => p.Id, p => p.Sku);

            var topProducts = topProductsQuery.Select(p => new
            {
                p.ProductId,
                p.ProductName,
                Sku = skuTop.ContainsKey(p.ProductId) ? skuTop[p.ProductId] : null,
                p.QuantitySold,
                ImageUrl = imagesTop.ContainsKey(p.ProductId) ? imagesTop[p.ProductId] : "/images/product-placeholder.jpg",
                AveragePrice = p.QuantitySold > 0 ? Math.Round(p.TotalRevenue / p.QuantitySold) : 0,
                CommissionRate = commissionRatesTop.ContainsKey(p.ProductId) ? commissionRatesTop[p.ProductId] : 0,
                EstimatedCommission = Math.Round(p.TotalRevenue * (commissionRatesTop.ContainsKey(p.ProductId) ? commissionRatesTop[p.ProductId] : 0) / 100, 2)
            }).ToList();

            // Doanh thu tháng này (luôn lấy tháng hiện tại để tính rank, không lọc theo date range)
            var currentMonth = nowVn.Month;
            var currentYear = nowVn.Year;
            var monthlyRevenue = await _context.Orders
                .Where(o => o.AffiliateId == id && o.Status == "completed" && 
                            o.CompletedAt.HasValue && o.CompletedAt.Value.Month == currentMonth && o.CompletedAt.Value.Year == currentYear)
                .SumAsync(o => o.Total);

            var configs = await _context.SiteConfigs.ToListAsync();
            var configDict = configs.ToDictionary(c => c.Key, c => c.Value);

            decimal getDecimal(string key, decimal defaultVal)
            {
                return configDict.TryGetValue(key, out var valStr) && decimal.TryParse(valStr, out var val) ? val : defaultVal;
            }

            var tierConfig = new {
                SilverMinRevenue = getDecimal("AffiliateTierSilverMinRevenue", 15000000),
                SilverBonus = getDecimal("AffiliateTierSilverBonus", 2),
                GoldMinRevenue = getDecimal("AffiliateTierGoldMinRevenue", 50000000),
                GoldBonus = getDecimal("AffiliateTierGoldBonus", 3),
                DiamondMinRevenue = getDecimal("AffiliateTierDiamondMinRevenue", 150000000),
                DiamondBonus = getDecimal("AffiliateTierDiamondBonus", 5)
            };

            return Ok(new
            {
                totalOrders,
                completedOrders,
                totalEarned,
                pendingCommission,
                availableBalance,
                totalWithdrawn,
                pendingWithdrawal,
                validClicks,
                conversionRate,
                totalOrderValue,
                monthlyRevenue,
                tierConfig,
                topProducts,
                // Kỳ trước (để tính % tăng trưởng ở frontend)
                prevTotalOrders,
                prevCompletedOrders,
                prevValidClicks,
                prevTotalOrderValue,
                prevPendingCommission,
                // Thời gian cập nhật dữ liệu
                updatedAt = nowVn.ToString("HH:mm dd/MM/yyyy")
            });
        }

        [HttpGet("chart")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> GetChartData([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            int id = GetCurrentAffiliateId();
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null) return Unauthorized();

            var nowVn = DateTime.UtcNow.AddHours(7);
            var dateFrom = from.HasValue ? from.Value.Date : new DateTime(nowVn.Year, nowVn.Month, 1);
            var dateTo = to.HasValue ? to.Value.Date.AddDays(1).AddTicks(-1) : new DateTime(nowVn.Year, nowVn.Month, DateTime.DaysInMonth(nowVn.Year, nowVn.Month), 23, 59, 59);

            // Lấy toàn bộ clicks trong khoảng (load về bộ nhớ rồi group by Date do EF Core có thể không map được .Date với Sqlite/MySQL tuỳ phiên bản)
            var allClicks = await _context.AffiliateClicks
                .Where(c => c.AffiliateId == id && c.ClickedAt >= dateFrom && c.ClickedAt <= dateTo)
                .ToListAsync();
            var clicksByDate = allClicks
                .GroupBy(c => c.ClickedAt.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            // Đơn hàng và tính toán hoa hồng
            var inProgressOrders = await _context.Orders
                .Include(o => o.Items)
                .Where(o => o.AffiliateId == id && o.CreatedAt >= dateFrom && o.CreatedAt <= dateTo && o.Status != "cancelled")
                .ToListAsync();

            var ordersByDate = inProgressOrders
                .GroupBy(o => o.CreatedAt.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var completedOrdersByDate = inProgressOrders
                .Where(o => o.Status == "completed")
                .GroupBy(o => o.CreatedAt.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var commissionsByDate = new Dictionary<DateTime, decimal>();
            var orderValuesByDate = new Dictionary<DateTime, decimal>();

            if (inProgressOrders.Any())
            {
                var productIds = inProgressOrders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products.Where(p => productIds.Contains(p.Id)).ToListAsync();
                var commissionRates = products.ToDictionary(p => p.Id, p => p.CommissionRate);

                foreach (var order in inProgressOrders)
                {
                    var d = order.CreatedAt.Date;
                    if (!commissionsByDate.ContainsKey(d)) commissionsByDate[d] = 0;
                    if (!orderValuesByDate.ContainsKey(d)) orderValuesByDate[d] = 0;

                    orderValuesByDate[d] += order.Total;

                    decimal estimatedCommission = 0;
                    foreach(var item in order.Items)
                    {
                        decimal productRate = commissionRates.ContainsKey(item.ProductId) ? commissionRates[item.ProductId] : 0;
                        estimatedCommission += item.Quantity * item.UnitPrice * (productRate / 100);
                    }
                    commissionsByDate[d] += Math.Round(estimatedCommission, 2);
                }
            }

            // Tạo chuỗi ngày
            var results = new List<object>();
            for (var d = dateFrom.Date; d <= dateTo.Date; d = d.AddDays(1))
            {
                results.Add(new {
                    date = d.ToString("yyyy-MM-dd"),
                    clicks = clicksByDate.ContainsKey(d) ? clicksByDate[d] : 0,
                    orders = ordersByDate.ContainsKey(d) ? ordersByDate[d] : 0,
                    completedOrders = completedOrdersByDate.ContainsKey(d) ? completedOrdersByDate[d] : 0,
                    orderValue = orderValuesByDate.ContainsKey(d) ? orderValuesByDate[d] : 0,
                    commission = commissionsByDate.ContainsKey(d) ? commissionsByDate[d] : 0
                });
            }

            return Ok(results);
        }

        [HttpPost("track-click")]
        [AllowAnonymous]
        public async Task<IActionResult> TrackClick([FromBody] TrackClickDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RefCode))
            {
                return BadRequest(new { message = "RefCode is required." });
            }

            var affiliate = await _context.Affiliates
                .FirstOrDefaultAsync(a => a.AffiliateCode == dto.RefCode);
            if (affiliate == null)
            {
                return NotFound(new { message = "Affiliate not found." });
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var sessionId = dto.SessionId;
            var now = DateTime.UtcNow.AddHours(7);
            var cooldownTime = now.AddMinutes(-60);

            // Check for duplicate click in the last 60 minutes
            bool alreadyClicked = false;
            if (!string.IsNullOrEmpty(ipAddress) || !string.IsNullOrEmpty(sessionId))
            {
                alreadyClicked = await _context.AffiliateClicks
                    .AnyAsync(ac => ac.AffiliateId == affiliate.Id &&
                                    ((ipAddress != null && ac.IpAddress == ipAddress) || 
                                     (sessionId != null && ac.SessionId == sessionId)) &&
                                    ac.ClickedAt > cooldownTime);
            }

            if (alreadyClicked)
            {
                return Ok(new { success = true, tracking = "ignored_cooldown", message = "Click tracked within cooldown." });
            }

            var click = new AffiliateClick
            {
                AffiliateId = affiliate.Id,
                ProductSlug = dto.ProductSlug,
                IpAddress = ipAddress,
                SessionId = sessionId,
                ClickedAt = now
            };

            _context.AffiliateClicks.Add(click);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, tracking = "saved", message = "Click tracked successfully." });
        }

        [HttpGet("orders")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> GetOrders()
        {
            int id = GetCurrentAffiliateId();
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null) return Unauthorized();

            var orders = await _context.Orders
                .Include(o => o.Items)
                .Where(o => o.AffiliateId == id)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            // Lấy danh sách hoa hồng đã được ghi nhận cho các đơn hàng này
            var orderIds = orders.Select(o => o.Id).ToList();
            var commissions = await _context.Commissions
                .Where(c => orderIds.Contains(c.OrderId))
                .ToListAsync();

            var productIds = orders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.Products.Where(p => productIds.Contains(p.Id)).ToListAsync();
            var productCommissionRates = products.ToDictionary(p => p.Id, p => p.CommissionRate);
            var productSkus = products.ToDictionary(p => p.Id, p => p.Sku);
            var variants = await _context.ProductVariants
                .Include(v => v.Images)
                .Where(v => productIds.Contains(v.ProductId))
                .ToListAsync();

            var imagesMap = new Dictionary<int, string>();
            foreach (var pid in productIds)
            {
                var variant = variants.FirstOrDefault(v => v.ProductId == pid && v.Images != null && v.Images.Any());
                if (variant != null)
                {
                    var img = variant.Images.OrderBy(x => x.SortOrder).First();
                    imagesMap[pid] = img.ImageUrl;
                }
            }

            var result = orders.Select(o => {
                decimal commissionAmount = 0;
                decimal commissionRate = 0;
                decimal tierBonusAmount = 0;
                decimal baseCommissionAmount = 0;

                var oCommissions = commissions.Where(c => c.OrderId == o.Id).ToList();
                if (oCommissions.Any())
                {
                    commissionAmount = oCommissions.Sum(c => c.CommissionAmount);
                    commissionRate = oCommissions.Average(c => c.CommissionRate);
                    tierBonusAmount = oCommissions.Sum(c => c.TierBonusAmount);
                    baseCommissionAmount = oCommissions.Sum(c => c.BaseCommissionAmount);
                }
                else
                {
                    decimal estimatedCommission = 0;
                    foreach(var item in o.Items)
                    {
                        decimal pRate = productCommissionRates.ContainsKey(item.ProductId) ? productCommissionRates[item.ProductId] : 0;
                        estimatedCommission += item.Quantity * item.UnitPrice * (pRate / 100);
                    }
                    commissionAmount = Math.Round(estimatedCommission, 2);
                    baseCommissionAmount = commissionAmount;
                    commissionRate = o.Total > 0 ? Math.Round((estimatedCommission / o.Total) * 100, 2) : 0;
                }

                return new {
                    o.OrderCode,
                    o.Total,
                    o.Status,
                    o.CreatedAt,
                    CommissionAmount = commissionAmount,
                    CommissionRate = commissionRate,
                    TierBonusAmount = tierBonusAmount,
                    BaseCommissionAmount = baseCommissionAmount,
                    Items = o.Items.Select(i => new {
                        i.ProductName,
                        i.Quantity,
                        i.UnitPrice,
                        ProductCode = productSkus.ContainsKey(i.ProductId) ? productSkus[i.ProductId] : "",
                        CommissionRate = productCommissionRates.ContainsKey(i.ProductId) ? productCommissionRates[i.ProductId] : 0,
                        ImageUrl = imagesMap.ContainsKey(i.ProductId) ? imagesMap[i.ProductId] : ""
                    }).ToList()
                };
            });

            return Ok(result);
        }

        [HttpGet("commissions")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> GetCommissions()
        {
            int id = GetCurrentAffiliateId();
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null) return Unauthorized();

            // 1. Lấy danh sách hoa hồng chính thức trong database
            var dbCommissions = await _context.Commissions
                .Include(c => c.Order)
                .Where(c => c.AffiliateId == id)
                .Select(c => new CommissionItemDto
                {
                    Id = c.Id,
                    OrderCode = c.Order.OrderCode,
                    OrderTotalAmount = c.OrderTotalAmount,
                    CommissionRate = c.CommissionRate,
                    CommissionAmount = c.CommissionAmount,
                    BaseCommissionAmount = c.BaseCommissionAmount,
                    TierBonusAmount = c.TierBonusAmount,
                    Status = c.Status,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            // 2. Tìm các đơn hàng giới thiệu đang xử lý (chưa hoàn thành, chưa hủy)
            var inProgressOrders = await _context.Orders
                .Include(o => o.Items)
                .Where(o => o.AffiliateId == id && o.Status != "completed" && o.Status != "cancelled")
                .ToListAsync();

            var resultList = new System.Collections.Generic.List<CommissionItemDto>(dbCommissions);

            if (inProgressOrders.Any())
            {
                var productIds = inProgressOrders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToListAsync();
                var commissionRates = products.ToDictionary(p => p.Id, p => p.CommissionRate);

                foreach (var order in inProgressOrders)
                {
                    decimal estimatedCommission = 0;
                    foreach (var item in order.Items)
                    {
                        decimal productRate = commissionRates.ContainsKey(item.ProductId) ? commissionRates[item.ProductId] : 0;
                        estimatedCommission += item.Quantity * item.UnitPrice * (productRate / 100);
                    }

                    decimal averageRate = order.Total > 0 ? (estimatedCommission / order.Total) * 100 : 0;

                    resultList.Add(new CommissionItemDto
                    {
                        Id = 0,
                        OrderCode = order.OrderCode,
                        OrderTotalAmount = order.Total,
                        CommissionRate = Math.Round(averageRate, 2),
                        CommissionAmount = Math.Round(estimatedCommission, 2),
                        BaseCommissionAmount = Math.Round(estimatedCommission, 2),
                        TierBonusAmount = 0,
                        Status = "Pending", // Hiển thị dưới dạng "Chờ duyệt"
                        CreatedAt = order.CreatedAt
                    });
                }
            }

            var sortedResult = resultList.OrderByDescending(x => x.CreatedAt).ToList();
            return Ok(sortedResult);
        }

        [HttpPost("withdraw")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> RequestWithdrawal([FromBody] WithdrawRequestDto dto)
        {
            int id = GetCurrentAffiliateId();
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null || profile.Status != "Active") return BadRequest(new { message = "Tài khoản chưa được duyệt." });

            if (dto.Amount < 100000) return BadRequest(new { message = "Số tiền rút tối thiểu là 100,000đ" });

            if (string.IsNullOrWhiteSpace(profile.BankName) || 
                string.IsNullOrWhiteSpace(profile.BankAccount) || 
                string.IsNullOrWhiteSpace(profile.BankOwner))
            {
                return BadRequest(new { message = "Vui lòng cập nhật đầy đủ thông tin Tài khoản Ngân hàng tại trang Thông Tin Tài Khoản trước khi rút tiền." });
            }

            // 1. Chặn tuyệt đối nếu ĐANG CÓ lệnh chờ duyệt (dù là mấy ngày trước)
            var hasPendingRequest = await _context.WithdrawalRequests
                .AnyAsync(w => w.AffiliateId == id && w.Status == "Pending");
            if (hasPendingRequest)
            {
                return BadRequest(new { message = "Bạn đang có 1 yêu cầu rút tiền chờ xử lý. Vui lòng đợi Admin duyệt trước khi tạo yêu cầu mới." });
            }

            var commissions = await _context.Commissions.Where(c => c.AffiliateId == id).ToListAsync();
            var approvedCommission = commissions.Where(c => c.Status == "Approved" || c.Status == "Paid").Sum(c => c.CommissionAmount);
            
            var withdrawals = await _context.WithdrawalRequests.Where(w => w.AffiliateId == id).ToListAsync();
            var withdrawnAndPending = withdrawals.Where(w => w.Status == "Paid" || w.Status == "Pending").Sum(w => w.Amount);

            var availableBalance = approvedCommission - withdrawnAndPending;

            if (dto.Amount > availableBalance) return BadRequest(new { message = "Số dư khả dụng không đủ." });

            var request = new BatTrang.Core.Entities.WithdrawalRequest
            {
                AffiliateId = id,
                Amount = dto.Amount,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow.AddHours(7)
            };

            _context.WithdrawalRequests.Add(request);
            await _context.SaveChangesAsync();

            try
            {
                var msg = $"CTV {profile.Name} vừa yêu cầu rút {request.Amount.ToString("N0")}đ hoa hồng.";
                var noti = new BatTrang.Core.Entities.Notification { Type = "WithdrawalRequested", Message = msg };
                _context.Notifications.Add(noti);
                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "WithdrawalRequested", msg);
            }
            catch (Exception) { }

            return Ok(new { success = true, message = "Đã gửi yêu cầu rút tiền thành công." });
        }

        [HttpGet("withdrawals")]
        [Authorize(Roles = "affiliate")]
        public async Task<IActionResult> GetWithdrawals()
        {
            int id = GetCurrentAffiliateId();
            var history = await _context.WithdrawalRequests
                .Where(w => w.AffiliateId == id)
                .OrderByDescending(w => w.RequestedAt)
                .Select(w => new {
                    w.Id,
                    w.Amount,
                    w.Status,
                    w.RequestedAt,
                    w.ProcessedAt,
                    w.Note
                })
                .ToListAsync();

            return Ok(history);
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] BatTrang.API.Controllers.ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EmailOrPhone)) return BadRequest(new { message = "Vui lòng nhập Email." });

            var affiliate = await _context.Affiliates.FirstOrDefaultAsync(a => a.Email == request.EmailOrPhone);
            
            if (affiliate == null || string.IsNullOrEmpty(affiliate.Email))
            {
                return BadRequest(new { message = "Tài khoản không tồn tại trên hệ thống." });
            }

            if (affiliate.Status == "Locked")
            {
                return BadRequest(new { message = "Tài khoản của bạn đã bị khóa." });
            }

            // Kiểm tra cooldown (60s)
            if (affiliate.LastResetSentAt.HasValue && (DateTime.UtcNow.AddHours(7) - affiliate.LastResetSentAt.Value).TotalSeconds < 60)
            {
                return BadRequest(new { message = "Vui lòng đợi 60 giây trước khi yêu cầu gửi lại Email khôi phục." });
            }

            // 2. Max attempts per day (Reset attempts logic)
            if (affiliate.LastResetSentAt.HasValue && (DateTime.UtcNow.AddHours(7) - affiliate.LastResetSentAt.Value).TotalHours > 24)
            {
                affiliate.ResetAttempts = 0;
            }

            if (affiliate.ResetAttempts >= 5)
            {
                return BadRequest(new { message = "Bạn đã yêu cầu khôi phục quá nhiều lần trong ngày. Vui lòng thử lại sau 24h." });
            }

            // Sinh Token for link
            string rawToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
            var safeToken = rawToken.Replace("+", "-").Replace("/", "_").Replace("=", "");
            
            affiliate.ResetToken = BCrypt.Net.BCrypt.HashPassword(safeToken); // Hash Token
            affiliate.ResetTokenExpiresAt = DateTime.UtcNow.AddHours(7).AddMinutes(30);

            var resetLink = $"http://localhost:5055/affiliate/forgot-password.html?token={safeToken}&email={affiliate.Email}";
            await _notificationService.SendPasswordResetEmailAsync(affiliate.Email, resetLink);

            affiliate.ResetAttempts++;
            affiliate.LastResetSentAt = DateTime.UtcNow.AddHours(7);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Hướng dẫn khôi phục mật khẩu đã được gửi đến Email của bạn." });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] BatTrang.API.Controllers.ResetPasswordRequest request)
        {
            var affiliate = await _context.Affiliates.FirstOrDefaultAsync(a => a.Email == request.EmailOrPhone);
            if (affiliate == null || affiliate.ResetTokenExpiresAt == null || affiliate.ResetTokenExpiresAt < DateTime.UtcNow.AddHours(7))
            {
                return BadRequest(new { message = "Yêu cầu khôi phục đã hết hạn. Vui lòng thử lại." });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.TokenOrOtp, affiliate.ResetToken))
            {
                return BadRequest(new { message = "Mã xác nhận không chính xác hoặc không hợp lệ." });
            }

            // Đặt lại mật khẩu
            affiliate.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            
            // Xóa token
            affiliate.ResetToken = null;
            affiliate.ResetTokenExpiresAt = null;
            
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đổi mật khẩu thành công!" });
        }


    }

    public class RegisterAffiliateDto
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string? CCCD { get; set; }
        public string? BankName { get; set; }
        public string? BankAccount { get; set; }
        public string? BankOwner { get; set; }
    }

    public class LoginAffiliateDto
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class WithdrawRequestDto
    {
        public decimal Amount { get; set; }
    }

    public class UpdateProfileDto
    {
        public string Name { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string? CCCD { get; set; }
        public string? BankName { get; set; }
        public string? BankAccount { get; set; }
        public string? BankOwner { get; set; }
    }

    public class ResetPasswordDto
    {
        public string Email { get; set; } = null!;
        public string Code { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }

    public class GoogleLoginDto
    {
        public string Credential { get; set; } = null!;
    }

    public class TrackClickDto
    {
        public string RefCode { get; set; } = null!;
        public string? ProductSlug { get; set; }
        public string? SessionId { get; set; }
    }

    public class CommissionItemDto
    {
        public int Id { get; set; }
        public string OrderCode { get; set; } = null!;
        public decimal OrderTotalAmount { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal CommissionAmount { get; set; }
        public decimal BaseCommissionAmount { get; set; }
        public decimal TierBonusAmount { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }
}

using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/affiliates")]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminAffiliatesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<BatTrang.API.Hubs.NotificationHub> _hubContext;

        public AdminAffiliatesController(AppDbContext context, IHubContext<BatTrang.API.Hubs.NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // --- AFFILIATES ---
        [HttpGet("pending-count")]
        public async Task<IActionResult> GetPendingCount()
        {
            var pendingAffiliates = await _context.Affiliates.CountAsync(a => a.Status == "Pending");
            var pendingWithdrawals = await _context.WithdrawalRequests.CountAsync(w => w.Status == "Pending");
            var pendingCommissions = await _context.Commissions.CountAsync(c => c.Status == "Pending");
            
            return Ok(new {
                affiliates = pendingAffiliates,
                withdrawals = pendingWithdrawals,
                commissions = pendingCommissions,
                total = pendingAffiliates + pendingWithdrawals + pendingCommissions
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAffiliates()
        {
            var affiliatesData = await _context.Affiliates
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    CustomerName = a.Name,
                    CustomerEmail = a.Email,
                    CustomerPhone = a.Phone,
                    a.AffiliateCode,
                    a.Tier,
                    a.Status,
                    a.CreatedAt,
                    a.ApprovedAt,
                    a.BankName,
                    a.BankAccount,
                    a.BankOwner,
                    a.CCCD,
                    TotalSales = _context.Commissions
                        .Where(c => c.AffiliateId == a.Id && (c.Status == "Approved" || c.Status == "Paid"))
                        .Sum(c => (decimal?)c.OrderTotalAmount) ?? 0,
                    TotalCommission = _context.Commissions
                        .Where(c => c.AffiliateId == a.Id && (c.Status == "Approved" || c.Status == "Paid"))
                        .Sum(c => (decimal?)c.CommissionAmount) ?? 0,
                    TotalOrdersCount = _context.Orders.Count(o => o.AffiliateId == a.Id && o.Status == "completed"),
                    LastOrderDate = _context.Orders.Where(o => o.AffiliateId == a.Id && o.Status == "completed").Max(o => (System.DateTime?)o.CreatedAt)
                })
                .ToListAsync();

            var affiliates = affiliatesData.Select(a => new {
                a.Id,
                a.CustomerName,
                a.CustomerEmail,
                a.CustomerPhone,
                a.AffiliateCode,
                a.Tier,
                a.Status,
                CreatedAt = a.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ApprovedAt = a.ApprovedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                a.BankName,
                a.BankAccount,
                a.BankOwner,
                a.CCCD,
                a.TotalSales,
                a.TotalCommission,
                a.TotalOrdersCount,
                LastOrderDate = a.LastOrderDate?.ToString("yyyy-MM-ddTHH:mm:ssZ")
            });

            return Ok(affiliates);
        }

        [HttpGet("{id}/details")]
        public async Task<IActionResult> GetAffiliateDetails(int id)
        {
            var affiliate = await _context.Affiliates.FindAsync(id);
            if (affiliate == null) return NotFound();

            var orders = await _context.Orders
                .Where(o => o.AffiliateId == id)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new { o.OrderCode, o.Total, o.Status, o.CreatedAt })
                .ToListAsync();

            var commissions = await _context.Commissions
                .Include(c => c.Order)
                .Where(c => c.AffiliateId == id)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new {
                    c.Id,
                    OrderCode = c.Order.OrderCode,
                    c.OrderTotalAmount,
                    c.CommissionRate,
                    c.CommissionAmount,
                    c.BaseCommissionAmount,
                    c.TierBonusAmount,
                    c.Status,
                    c.CreatedAt
                })
                .ToListAsync();

            var withdrawals = await _context.WithdrawalRequests
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

            return Ok(new
            {
                orders,
                commissions,
                withdrawals
            });
        }

        [HttpPatch("{id}/status")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdateAffiliateStatus(int id, [FromBody] UpdateAffiliateStatusDto dto)
        {
            var profile = await _context.Affiliates.FindAsync(id);
            if (profile == null) return NotFound();

            profile.Status = dto.Status;
            if (dto.Status == "Active" && profile.ApprovedAt == null)
            {
                profile.ApprovedAt = System.DateTime.UtcNow.AddHours(7);
            }
            if (!string.IsNullOrEmpty(dto.Tier))
            {
                profile.Tier = dto.Tier;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // --- BULK ENDPOINTS ---
        [HttpPost("bulk-status")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkAffiliateStatusDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có CTV nào được chọn" });
            
            int updatedCount = 0;
            foreach (var id in dto.Ids)
            {
                var profile = await _context.Affiliates.FindAsync(id);
                if (profile != null && profile.Status != dto.Status)
                {
                    profile.Status = dto.Status;
                    if (dto.Status == "Active" && profile.ApprovedAt == null)
                    {
                        profile.ApprovedAt = System.DateTime.UtcNow.AddHours(7);
                    }
                    updatedCount++;
                }
            }

            if (updatedCount > 0) await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã cập nhật trạng thái {updatedCount} CTV" });
        }

        [HttpPost("bulk-tier")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> BulkUpdateTier([FromBody] BulkAffiliateTierDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có CTV nào được chọn" });
            
            int updatedCount = 0;
            foreach (var id in dto.Ids)
            {
                var profile = await _context.Affiliates.FindAsync(id);
                if (profile != null && profile.Tier != dto.Tier)
                {
                    profile.Tier = dto.Tier;
                    updatedCount++;
                }
            }

            if (updatedCount > 0) await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã cập nhật cấp bậc {updatedCount} CTV" });
        }

        [HttpPost("bulk-delete")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkAffiliateDeleteDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có CTV nào được chọn" });
            
            int deletedCount = 0;
            int failedCount = 0;
            foreach (var id in dto.Ids)
            {
                var profile = await _context.Affiliates.FindAsync(id);
                if (profile != null)
                {
                    try
                    {
                        bool hasCommissions = await _context.Commissions.AnyAsync(c => c.AffiliateId == id);
                        bool hasOrders = await _context.Orders.AnyAsync(o => o.AffiliateId == id);
                        
                        if (!hasCommissions && !hasOrders) {
                            _context.Affiliates.Remove(profile);
                            await _context.SaveChangesAsync();
                            deletedCount++;
                        }
                        else
                        {
                            failedCount++;
                        }
                    }
                    catch (Microsoft.EntityFrameworkCore.DbUpdateException)
                    {
                        failedCount++;
                        _context.ChangeTracker.Clear();
                    }
                }
            }

            return Ok(new { message = $"Đã xóa {deletedCount} CTV (bỏ qua {failedCount} người đã có dữ liệu ràng buộc để bảo toàn hệ thống)" });
        }

        // --- COMMISSIONS ---
        [HttpGet("commissions")]
        public async Task<IActionResult> GetCommissions()
        {
            var commissions = await _context.Commissions
                .Include(c => c.Order)
                .Include(c => c.Affiliate)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.Order.OrderCode,
                    AffiliateName = c.Affiliate.Name,
                    AffiliateCode = c.Affiliate.AffiliateCode,
                    c.OrderTotalAmount,
                    c.CommissionRate,
                    c.CommissionAmount,
                    c.BaseCommissionAmount,
                    c.TierBonusAmount,
                    c.Status,
                    c.CreatedAt
                })
                .ToListAsync();
            return Ok(commissions);
        }

        [HttpPatch("commissions/{id}/status")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdateCommissionStatus(int id, [FromBody] UpdateCommissionStatusDto dto)
        {
            var commission = await _context.Commissions.FindAsync(id);
            if (commission == null) return NotFound();

            string oldStatus = commission.Status ?? "";
            commission.Status = dto.Status;
            commission.ProcessedAt = System.DateTime.UtcNow.AddHours(7);

            if (dto.Status.Equals("Approved", System.StringComparison.OrdinalIgnoreCase) && !oldStatus.Equals("Approved", System.StringComparison.OrdinalIgnoreCase))
            {
                var noti = new BatTrang.Core.Entities.AffiliateNotification
                {
                    AffiliateId = commission.AffiliateId,
                    Title = "Hoa hồng khả dụng! 💵",
                    Message = $"Tuyệt vời! Khoản hoa hồng {System.Math.Round(commission.CommissionAmount, 0):N0}đ của bạn đã được duyệt và có thể rút ngay.",
                    Type = "commission",
                    IsRead = false,
                    CreatedAt = System.DateTime.UtcNow.AddHours(7)
                };
                _context.Set<BatTrang.Core.Entities.AffiliateNotification>().Add(noti);
                
                await _hubContext.Clients.Group($"Affiliate_{commission.AffiliateId}").SendAsync("ReceiveAffiliateNotification", "Cập nhật hoa hồng", "Bạn có thông báo mới", "sync");
            }
            else if (dto.Status.Equals("Paid", System.StringComparison.OrdinalIgnoreCase) && !oldStatus.Equals("Paid", System.StringComparison.OrdinalIgnoreCase))
            {
                // Đồng bộ tự động tạo WithdrawalRequest Paid khi Admin thanh toán trực tiếp hoa hồng ngoài luồng rút tiền
                var manualWithdrawal = new BatTrang.Core.Entities.WithdrawalRequest
                {
                    AffiliateId = commission.AffiliateId,
                    Amount = commission.CommissionAmount,
                    Status = "Paid",
                    Note = $"Thanh toán trực tiếp hoa hồng #{commission.Id}",
                    RequestedAt = System.DateTime.UtcNow.AddHours(7),
                    ProcessedAt = System.DateTime.UtcNow.AddHours(7)
                };
                _context.WithdrawalRequests.Add(manualWithdrawal);
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // --- WITHDRAWALS ---
        [HttpGet("withdrawals")]
        public async Task<IActionResult> GetWithdrawals()
        {
            var requests = await _context.WithdrawalRequests
                .Include(w => w.Affiliate)
                .OrderByDescending(w => w.RequestedAt)
                .Select(w => new
                {
                    w.Id,
                    AffiliateName = w.Affiliate.Name,
                    AffiliateCode = w.Affiliate.AffiliateCode,
                    BankName = w.Affiliate.BankName,
                    BankAccount = w.Affiliate.BankAccount,
                    BankOwner = w.Affiliate.BankOwner,
                    w.Amount,
                    w.Status,
                    w.Note,
                    w.TransactionRef,
                    w.RequestedAt,
                    w.ProcessedAt
                })
                .ToListAsync();
            return Ok(requests);
        }

        [HttpPatch("withdrawals/{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> ProcessWithdrawal(int id, [FromBody] ProcessWithdrawalDto dto)
        {
            var request = await _context.WithdrawalRequests.FindAsync(id);
            if (request == null) return NotFound();

            string oldStatus = request.Status ?? "";
            request.Status = dto.Status;
            request.Note = dto.Note;
            request.TransactionRef = dto.TransactionRef;
            request.ProcessedAt = System.DateTime.UtcNow.AddHours(7);

            if (dto.Status != oldStatus)
            {
                if (dto.Status == "Paid" || oldStatus == "Paid")
                {
                    var totalWithdrawn = await _context.WithdrawalRequests
                        .Where(w => w.AffiliateId == request.AffiliateId && w.Id != request.Id && w.Status == "Paid")
                        .SumAsync(w => w.Amount);
                    
                    if (dto.Status == "Paid")
                    {
                        totalWithdrawn += request.Amount;
                    }

                    var commissionsToMark = await _context.Commissions
                        .Where(c => c.AffiliateId == request.AffiliateId && (c.Status == "Approved" || c.Status == "Paid"))
                        .OrderBy(c => c.CreatedAt)
                        .ToListAsync();

                    decimal runningSum = 0;
                    foreach (var c in commissionsToMark)
                    {
                        runningSum += c.CommissionAmount;
                        if (runningSum <= totalWithdrawn)
                        {
                            if (c.Status != "Paid")
                            {
                                c.Status = "Paid";
                                c.ProcessedAt = System.DateTime.UtcNow.AddHours(7);
                            }
                        }
                        else
                        {
                            if (c.Status == "Paid")
                            {
                                c.Status = "Approved";
                                c.ProcessedAt = null;
                            }
                        }
                    }
                }

                if (dto.Status == "Paid" || dto.Status == "Rejected")
                {
                    string title = dto.Status == "Paid" ? "Đã chuyển tiền! 💸" : "Yêu cầu rút tiền bị từ chối ❌";
                    string msg = dto.Status == "Paid" 
                        ? $"Yêu cầu rút {request.Amount:N0}đ của bạn đã được chuyển khoản thành công. {(string.IsNullOrEmpty(dto.Note) ? "" : "Ghi chú: " + dto.Note)}"
                        : $"Yêu cầu rút {request.Amount:N0}đ của bạn đã bị từ chối. Lý do: {dto.Note}";

                    var noti = new BatTrang.Core.Entities.AffiliateNotification
                    {
                        AffiliateId = request.AffiliateId,
                        Title = title,
                        Message = msg,
                        Type = "withdrawal",
                        IsRead = false,
                        CreatedAt = System.DateTime.UtcNow.AddHours(7)
                    };
                    _context.Set<BatTrang.Core.Entities.AffiliateNotification>().Add(noti);
                    
                    await _hubContext.Clients.Group($"Affiliate_{request.AffiliateId}").SendAsync("ReceiveAffiliateNotification", title, msg, "sync");
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // --- POLICIES ---
        [HttpGet("policies")]
        public async Task<IActionResult> GetPolicies()
        {
            var policies = await _context.CommissionPolicies.ToListAsync();
            return Ok(policies);
        }

        [HttpPost("policies")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> CreatePolicy([FromBody] CommissionPolicy policy)
        {
            _context.CommissionPolicies.Add(policy);
            await _context.SaveChangesAsync();
            return Ok(policy);
        }

        [HttpPut("policies/{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdatePolicy(int id, [FromBody] CommissionPolicy policy)
        {
            var existing = await _context.CommissionPolicies.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Tier = policy.Tier;
            existing.Percentage = policy.Percentage;
            existing.IsActive = policy.IsActive;

            await _context.SaveChangesAsync();
            return Ok(existing);
        }
    }

    public class UpdateAffiliateStatusDto
    {
        public string Status { get; set; } = null!;
        public string? Tier { get; set; }
    }

    public class UpdateCommissionStatusDto
    {
        public string Status { get; set; } = null!;
    }

    public class ProcessWithdrawalDto
    {
        public string Status { get; set; } = null!;
        public string? Note { get; set; }
        public string? TransactionRef { get; set; }
    }

    public class BulkAffiliateStatusDto
    {
        public System.Collections.Generic.List<int> Ids { get; set; } = new System.Collections.Generic.List<int>();
        public string Status { get; set; } = null!;
    }

    public class BulkAffiliateTierDto
    {
        public System.Collections.Generic.List<int> Ids { get; set; } = new System.Collections.Generic.List<int>();
        public string Tier { get; set; } = null!;
    }

    public class BulkAffiliateDeleteDto
    {
        public System.Collections.Generic.List<int> Ids { get; set; } = new System.Collections.Generic.List<int>();
    }
}

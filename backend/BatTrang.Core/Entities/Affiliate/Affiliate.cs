using System;
using System.Collections.Generic;

namespace BatTrang.Core.Entities.Affiliate
{
    public class Affiliate
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? PasswordHash { get; set; }

        public string AffiliateCode { get; set; } = null!; // e.g. CTV_ABCXYZ
        public string Tier { get; set; } = "Thường"; // Thường, Bạc, Vàng, Kim Cương
        public string Status { get; set; } = "Pending"; // Pending, Active, Locked

        // Personal / Banking info
        public string? CCCD { get; set; }
        public string? BankName { get; set; }
        public string? BankAccount { get; set; }
        public string? BankOwner { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime? ApprovedAt { get; set; }

        // Password Reset
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiresAt { get; set; }
        public int ResetAttempts { get; set; } = 0;
        public DateTime? LastResetSentAt { get; set; }

        // MLM Structure (optional for future)
        public int? ParentId { get; set; }
        public Affiliate? Parent { get; set; }
        public ICollection<Affiliate> Children { get; set; } = new List<Affiliate>();
        
        // Navigation Properties
        public ICollection<BatTrang.Core.Entities.Order> ReferredOrders { get; set; } = new List<BatTrang.Core.Entities.Order>();
    }
}

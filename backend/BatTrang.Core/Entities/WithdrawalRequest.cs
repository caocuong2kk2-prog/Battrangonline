using System;

namespace BatTrang.Core.Entities
{
    public class WithdrawalRequest
    {
        public int Id { get; set; }
        
        public int AffiliateId { get; set; }
        public BatTrang.Core.Entities.Affiliate.Affiliate Affiliate { get; set; } = null!;

        public decimal Amount { get; set; }
        
        public string Status { get; set; } = "Pending"; // Pending, Paid, Rejected
        
        public string? Note { get; set; } // Admin note (e.g. reason for rejection)
        public string? TransactionRef { get; set; } // Bank transaction reference if paid

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime? ProcessedAt { get; set; }
    }
}

using System;

namespace BatTrang.Core.Entities
{
    public class Commission
    {
        public int Id { get; set; }
        
        public int AffiliateId { get; set; }
        public BatTrang.Core.Entities.Affiliate.Affiliate Affiliate { get; set; } = null!;

        public int OrderId { get; set; }
        public Order Order { get; set; } = null!;

        public decimal OrderTotalAmount { get; set; }
        public decimal CommissionAmount { get; set; } // Tổng Base + Bonus
        public decimal CommissionRate { get; set; } // Tổng % (Base + Bonus)
        
        public decimal BaseCommissionAmount { get; set; } // Tiền hoa hồng gốc
        public decimal TierBonusAmount { get; set; } // Tiền thưởng hạng

        public string Status { get; set; } = "Pending"; // Pending, Approved, Paid, Refunded

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
        public DateTime? ProcessedAt { get; set; }
    }
}

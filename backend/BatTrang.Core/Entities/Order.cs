using System;
using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Order
    {
        public int Id { get; set; }
        public string OrderCode { get; set; } = null!;
        
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        
        public int? AffiliateId { get; set; } // Reference to the Affiliate who referred this order
        public BatTrang.Core.Entities.Affiliate.Affiliate? Affiliate { get; set; }

        
        public string CustomerName { get; set; } = null!;
        public string CustomerPhone { get; set; } = null!;
        public string CustomerEmail { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? CustomerNote { get; set; }
        public string? AdminNote { get; set; }
        
        public decimal Total { get; set; }
        public string Status { get; set; } = "pending"; // pending, confirmed, shipping, completed, cancelled
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);

        public bool IsCancelRequested { get; set; } = false;
        public string? CancelReason { get; set; }
        public DateTime? CancelRequestedAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        public DateTime? ConfirmedAt { get; set; }
        public DateTime? ShippingAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    }
}

using System;
using System.Collections.Generic;

namespace BatTrang.Core.DTOs
{
    public class OrderDto
    {
        public string Id { get; set; } = null!; // OrderCode
        public string Customer { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Address { get; set; } = null!;
        public List<OrderItemDto> Items { get; set; } = new List<OrderItemDto>();
        public decimal Total { get; set; }
        public string Status { get; set; } = null!;
        public string Date { get; set; } = null!; // Format YYYY-MM-DD
        public string? CustomerNote { get; set; }
        public string? AdminNote { get; set; }
        public bool IsCancelRequested { get; set; }
        public string? CancelReason { get; set; }
        public DateTime? CancelRequestedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? ShippingAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    public class RejectCancelDto
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class OrderItemDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = null!;
        public string? Size { get; set; }
        public int Qty { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public string? Sku { get; set; }
        public decimal? EstimatedValue { get; set; }
    }

    public class CreateOrderDto
    {
        public string Customer { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? CustomerNote { get; set; }
        public string? AffiliateCode { get; set; } // Added for affiliate tracking
        public string? RecaptchaToken { get; set; }
        public List<CreateOrderItemDto> Items { get; set; } = new List<CreateOrderItemDto>();
    }

    public class CreateOrderItemDto
    {
        public int Id { get; set; }
        public string? Size { get; set; } // Thêm Size
        public int Qty { get; set; }
    }

    public class AdminCreateOrderDto
    {
        public string Customer { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? CustomerNote { get; set; }
        public string Status { get; set; } = "pending";
        public List<CreateOrderItemDto> Items { get; set; } = new List<CreateOrderItemDto>();
    }

    public class UpdateOrderAdminNoteDto
    {
        public string? AdminNote { get; set; }
    }

    public class CancelOrderRequestDto
    {
        public string Phone { get; set; } = null!;
        public string? Reason { get; set; }
    }
}

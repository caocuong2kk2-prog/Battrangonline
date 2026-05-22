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
        public string? Note { get; set; }
    }

    public class OrderItemDto
    {
        public string Name { get; set; } = null!;
        public int Qty { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class CreateOrderDto
    {
        public string Customer { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? Note { get; set; }
        public List<CreateOrderItemDto> Items { get; set; } = new List<CreateOrderItemDto>();
    }

    public class CreateOrderItemDto
    {
        public int Id { get; set; }
        public int Qty { get; set; }
    }

    public class AdminCreateOrderDto
    {
        public string Customer { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? Note { get; set; }
        public string Status { get; set; } = "pending";
        public List<CreateOrderItemDto> Items { get; set; } = new List<CreateOrderItemDto>();
    }
}

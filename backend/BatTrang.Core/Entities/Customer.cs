using System;
using System.Collections.Generic;

namespace BatTrang.Core.Entities
{
    public class Customer
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string Status { get; set; } = "active";
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public string? PasswordHash { get; set; }

        // Password Recovery Fields
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiresAt { get; set; }
        public int ResetAttempts { get; set; } = 0;
        public DateTime? LastResetSentAt { get; set; }

        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}

using System;

namespace BatTrang.Core.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        
        /// <summary>
        /// The type of notification (e.g. "OrderCreated", "OrderStatusChanged", "CustomerRegistered")
        /// </summary>
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// The content of the notification
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Whether the notification has been read by an admin
        /// </summary>
        public bool IsRead { get; set; } = false;

        /// <summary>
        /// The time the notification was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

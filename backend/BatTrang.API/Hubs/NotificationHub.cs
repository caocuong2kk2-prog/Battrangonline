using Microsoft.AspNetCore.SignalR;

namespace BatTrang.API.Hubs
{
    public class NotificationHub : Hub
    {
        // Simple hub for pushing real-time notifications to the client
        public async Task JoinAffiliateGroup(string affiliateId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Affiliate_{affiliateId}");
        }
    }
}

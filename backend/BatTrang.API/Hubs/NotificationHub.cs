using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;

namespace BatTrang.API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userRole = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole == "admin" || userRole == "staff")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
            }
            await base.OnConnectedAsync();
        }

        // Simple hub for pushing real-time notifications to the client
        public async Task JoinAffiliateGroup(string affiliateId)
        {
            var currentUserId = Context.UserIdentifier ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var userRole = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            if (currentUserId == affiliateId || userRole == "admin" || userRole == "staff")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Affiliate_{affiliateId}");
            }
        }
    }
}

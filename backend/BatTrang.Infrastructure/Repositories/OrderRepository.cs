using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Repositories
{
    public class OrderRepository : Repository<Order>, IOrderRepository
    {
        public OrderRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Order?> GetByOrderCodeAsync(string orderCode)
        {
            return await _context.Orders
                .Include(o => o.Items).ThenInclude(i => i.Gift)
                .FirstOrDefaultAsync(o => o.OrderCode == orderCode);
        }

        public async Task<IReadOnlyList<Order>> GetOrdersWithItemsAsync()
        {
            return await _context.Orders
                .Include(o => o.Items).ThenInclude(i => i.Gift)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<IList<Order>> GetOrdersByCustomerIdAsync(int customerId)
        {
            return await _context.Orders
                .Where(o => o.CustomerId == customerId)
                .ToListAsync();
        }
    }
}

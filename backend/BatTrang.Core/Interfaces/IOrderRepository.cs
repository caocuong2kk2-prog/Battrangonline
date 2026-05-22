using BatTrang.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface IOrderRepository : IRepository<Order>
    {
        Task<Order?> GetByOrderCodeAsync(string orderCode);
        Task<IReadOnlyList<Order>> GetOrdersWithItemsAsync();
    }
}

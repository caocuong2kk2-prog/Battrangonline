using BatTrang.Core.Entities;
using BatTrang.Core.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface ICustomerRepository : IRepository<Customer>
    {
        Task<IEnumerable<CustomerDto>> GetCustomersWithStatsAsync();
        Task<Customer?> GetByPhoneOrEmailAsync(string? phone, string email);
    }
}

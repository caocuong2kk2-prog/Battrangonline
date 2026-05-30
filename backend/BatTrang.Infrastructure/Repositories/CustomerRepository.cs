using BatTrang.Core.Entities;
using BatTrang.Core.DTOs;
using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Repositories
{
    public class CustomerRepository : Repository<Customer>, ICustomerRepository
    {
        public CustomerRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<CustomerDto>> GetCustomersWithStatsAsync()
        {
            return await _context.Customers
                .Select(c => new CustomerDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Email = c.Email,
                    Phone = c.Phone,
                    Address = c.Address,
                    Status = c.Status,
                    JoinedAt = c.JoinedAt,
                    OrdersCount = c.Orders.Count,
                    TotalSpent = c.Orders.Where(o => o.Status != "cancelled").Sum(o => o.Total)
                })
                .OrderByDescending(c => c.JoinedAt)
                .ToListAsync();
        }

        public async Task<Customer?> GetByPhoneOrEmailAsync(string? phone, string email)
        {
            if (string.IsNullOrEmpty(phone))
            {
                return await _context.Customers.FirstOrDefaultAsync(c => c.Email == email);
            }
            return await _context.Customers.FirstOrDefaultAsync(c => c.Email == email || c.Phone == phone);
        }
    }
}

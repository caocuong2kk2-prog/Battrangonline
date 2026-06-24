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
            var rawCustomers = await _context.Customers
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Email,
                    c.Phone,
                    c.Address,
                    c.JoinedAt,
                    Orders = c.Orders.Select(o => new { o.Status, o.CreatedAt, o.Total }).ToList()
                })
                .ToListAsync();

            var twelveMonthsAgo = System.DateTime.UtcNow.AddMonths(-12);

            return rawCustomers.Select(c =>
            {
                string status;
                var totalOrders = c.Orders.Count;
                var cancelledOrders = c.Orders.Count(o => o.Status == "cancelled");

                if (totalOrders == 0)
                {
                    status = "new";
                }
                else if (totalOrders > 0 && (double)cancelledOrders / totalOrders > 0.5)
                {
                    status = "notable";
                }
                else if (!c.Orders.Any(o => o.CreatedAt >= twelveMonthsAgo))
                {
                    status = "inactive";
                }
                else
                {
                    status = "active";
                }

                return new CustomerDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Email = c.Email,
                    Phone = c.Phone,
                    Address = c.Address,
                    Status = status,
                    JoinedAt = c.JoinedAt,
                    OrdersCount = c.Orders.Count,
                    TotalSpent = c.Orders.Where(o => o.Status != "cancelled").Sum(o => o.Total)
                };
            })
            .OrderByDescending(c => c.JoinedAt)
            .ToList();
        }

        public async Task<Customer?> GetByPhoneOrEmailAsync(string? phone, string email)
        {
            var cleanedPhone = phone?.Trim();
            var cleanedEmail = email?.Trim();

            if (string.IsNullOrEmpty(cleanedPhone) && string.IsNullOrEmpty(cleanedEmail))
            {
                return null;
            }

            if (string.IsNullOrEmpty(cleanedPhone))
            {
                return await _context.Customers.FirstOrDefaultAsync(c => !string.IsNullOrEmpty(c.Email) && c.Email == cleanedEmail);
            }

            if (string.IsNullOrEmpty(cleanedEmail))
            {
                return await _context.Customers.FirstOrDefaultAsync(c => !string.IsNullOrEmpty(c.Phone) && c.Phone == cleanedPhone);
            }

            return await _context.Customers.FirstOrDefaultAsync(c => 
                (!string.IsNullOrEmpty(c.Email) && c.Email == cleanedEmail) || 
                (!string.IsNullOrEmpty(c.Phone) && c.Phone == cleanedPhone));
        }
    }
}

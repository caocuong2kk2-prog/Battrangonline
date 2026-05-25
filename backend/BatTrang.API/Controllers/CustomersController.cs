using BatTrang.Core.DTOs;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/admin/customers")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerRepository _customerRepo;
        private readonly IOrderRepository _orderRepo;

        public CustomersController(ICustomerRepository customerRepo, IOrderRepository orderRepo)
        {
            _customerRepo = customerRepo;
            _orderRepo = orderRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var customers = await _customerRepo.GetCustomersWithStatsAsync();
            return Ok(customers);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BatTrang.Core.Entities.Customer customer)
        {
            if (string.IsNullOrWhiteSpace(customer.Name))
            {
                return BadRequest("Tên khách hàng là bắt buộc.");
            }
            if (string.IsNullOrWhiteSpace(customer.Email))
            {
                customer.Email = "";
            }
            
            customer.JoinedAt = System.DateTime.UtcNow;
            var created = await _customerRepo.AddAsync(customer);
            return Ok(created);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var customer = await _customerRepo.GetByIdAsync(id);
            if (customer == null) return NotFound(new { message = "Không tìm thấy khách hàng." });

            // Check if customer has any orders
            var allOrders = await _orderRepo.ListAllAsync();
            var hasOrders = allOrders.Any(o => o.CustomerId == id);
            if (hasOrders)
            {
                return BadRequest(new { message = "Không thể xóa khách hàng đang có đơn hàng." });
            }

            await _customerRepo.DeleteAsync(customer);
            return NoContent();
        }
    }
}

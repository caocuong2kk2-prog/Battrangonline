using BatTrang.Core.DTOs;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/admin/customers")]
    [Authorize(Policy = "AdminOrStaff")]
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
                customer.Email = null;
            }
            
            customer.JoinedAt = System.DateTime.UtcNow.AddHours(7);
            var created = await _customerRepo.AddAsync(customer);
            return Ok(created);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Delete(int id, [FromQuery] bool force = false)
        {
            var customer = await _customerRepo.GetByIdAsync(id);
            if (customer == null) return NotFound(new { message = "Không tìm thấy khách hàng." });

            // Check if customer has any orders linked via CustomerId FK
            var linkedOrders = await _orderRepo.GetOrdersByCustomerIdAsync(id);
            if (linkedOrders.Count > 0)
            {
                if (!force)
                {
                    return BadRequest(new { message = "Không thể xóa khách hàng đang có đơn hàng. Sử dụng force=true để xóa và hủy liên kết đơn hàng." });
                }
                // Force mode: unlink orders from this customer (set CustomerId to null)
                foreach (var order in linkedOrders)
                {
                    order.CustomerId = null;
                    await _orderRepo.UpdateAsync(order);
                }
            }

            await _customerRepo.DeleteAsync(customer);
            return NoContent();
        }

        [HttpPost("bulk-delete")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> BulkDelete([FromBody] BulkCustomerDeleteDto dto)
        {
            if (dto.Ids == null || dto.Ids.Count == 0) return BadRequest(new { message = "Không có khách hàng nào được chọn" });

            int deletedCount = 0;
            foreach (var id in dto.Ids)
            {
                var customer = await _customerRepo.GetByIdAsync(id);
                if (customer != null)
                {
                    var linkedOrders = await _orderRepo.GetOrdersByCustomerIdAsync(id);
                    if (linkedOrders.Count > 0)
                    {
                        foreach (var order in linkedOrders)
                        {
                            order.CustomerId = null;
                            await _orderRepo.UpdateAsync(order);
                        }
                    }
                    await _customerRepo.DeleteAsync(customer);
                    deletedCount++;
                }
            }

            return Ok(new { message = $"Đã xóa {deletedCount} khách hàng." });
        }
    }

    public class BulkCustomerDeleteDto
    {
        public System.Collections.Generic.List<int> Ids { get; set; } = new System.Collections.Generic.List<int>();
    }
}


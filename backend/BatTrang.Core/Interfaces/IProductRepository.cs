using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface IProductRepository : IRepository<Product>
    {
        Task<PaginatedResult<Product>> GetProductsAsync(ProductFilterDto filter);
        Task<Product?> GetProductBySlugAsync(string slug);
        Task<IReadOnlyList<Product>> GetFeaturedProductsAsync(int limit);
        Task<Product?> GetProductWithImagesAsync(int id);
        Task<Dictionary<int, string>> GetProductImagesAsync(IEnumerable<int> productIds);
    }
}

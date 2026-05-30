using System.Collections.Generic;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface IRepository<T> where T : class
    {
        Task<T?> GetByIdAsync(int id);
        Task<IReadOnlyList<T>> ListAllAsync();
        Task<T> AddAsync(T entity);
        Task UpdateAsync(T entity);
        Task DeleteAsync(T entity);
        Task<int> CountAsync();
        Task<int> CountAsync(System.Linq.Expressions.Expression<System.Func<T, bool>> predicate);
    }
}

using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;

namespace BatTrang.Infrastructure.Repositories
{
    public class ContactRepository : Repository<ContactMessage>, IContactRepository
    {
        public ContactRepository(AppDbContext context) : base(context)
        {
        }
    }
}

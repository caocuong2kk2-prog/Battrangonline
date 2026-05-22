using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Repositories
{
    public class JourneyRepository : IJourneyRepository
    {
        private readonly AppDbContext _context;

        public JourneyRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<JourneyTopic>> GetTopicsAsync()
        {
            return await _context.JourneyTopics.ToListAsync();
        }

        public async Task<JourneyTopic?> GetTopicByIdAsync(int id)
        {
            return await _context.JourneyTopics.FindAsync(id);
        }

        public async Task<JourneyTopic> AddTopicAsync(JourneyTopic topic)
        {
            await _context.JourneyTopics.AddAsync(topic);
            await _context.SaveChangesAsync();
            return topic;
        }

        public async Task UpdateTopicAsync(JourneyTopic topic)
        {
            _context.Entry(topic).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteTopicAsync(JourneyTopic topic)
        {
            _context.JourneyTopics.Remove(topic);
            await _context.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<JourneyVideo>> GetVideosAsync(int? topicId = null)
        {
            var query = _context.JourneyVideos.Include(v => v.Topic).AsQueryable();
            if (topicId.HasValue)
            {
                query = query.Where(v => v.TopicId == topicId.Value);
            }
            return await query.ToListAsync();
        }

        public async Task<JourneyVideo?> GetVideoByIdAsync(int id)
        {
            return await _context.JourneyVideos.Include(v => v.Topic).FirstOrDefaultAsync(v => v.Id == id);
        }

        public async Task<JourneyVideo> AddVideoAsync(JourneyVideo video)
        {
            await _context.JourneyVideos.AddAsync(video);
            await _context.SaveChangesAsync();
            return video;
        }

        public async Task UpdateVideoAsync(JourneyVideo video)
        {
            _context.Entry(video).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteVideoAsync(JourneyVideo video)
        {
            _context.JourneyVideos.Remove(video);
            await _context.SaveChangesAsync();
        }
    }
}

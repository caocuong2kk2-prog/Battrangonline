using BatTrang.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BatTrang.Core.Interfaces
{
    public interface IJourneyRepository
    {
        Task<IReadOnlyList<JourneyTopic>> GetTopicsAsync();
        Task<JourneyTopic?> GetTopicByIdAsync(int id);
        Task<JourneyTopic> AddTopicAsync(JourneyTopic topic);
        Task UpdateTopicAsync(JourneyTopic topic);
        Task DeleteTopicAsync(JourneyTopic topic);

        Task<IReadOnlyList<JourneyVideo>> GetVideosAsync(int? topicId = null);
        Task<JourneyVideo?> GetVideoByIdAsync(int id);
        Task<JourneyVideo> AddVideoAsync(JourneyVideo video);
        Task UpdateVideoAsync(JourneyVideo video);
        Task DeleteVideoAsync(JourneyVideo video);
    }
}

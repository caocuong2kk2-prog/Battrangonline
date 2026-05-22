using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class JourneyController : ControllerBase
    {
        private readonly IJourneyRepository _journeyRepo;

        public JourneyController(IJourneyRepository journeyRepo)
        {
            _journeyRepo = journeyRepo;
        }

        [HttpGet("topics")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTopics()
        {
            var topics = await _journeyRepo.GetTopicsAsync();
            var dtos = topics.Select(t => new JourneyTopicDto
            {
                Id = t.Slug,
                Name = t.Name
            });
            return Ok(dtos);
        }

        [HttpGet("videos")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVideos([FromQuery] int? topicId)
        {
            var videos = await _journeyRepo.GetVideosAsync(topicId);
            var dtos = videos.Select(v => new JourneyVideoDto
            {
                Id = v.Id,
                TopicId = v.Topic?.Slug ?? "",
                Title = v.Title,
                Url = v.Url,
                Thumbnail = v.Thumbnail,
                Duration = v.Duration
            });
            return Ok(dtos);
        }
    }
}

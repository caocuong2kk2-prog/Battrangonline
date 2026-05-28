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
    [Route("api/admin/journey")]
    [Authorize]
    public class AdminJourneyController : ControllerBase
    {
        private readonly IJourneyRepository _journeyRepo;

        public AdminJourneyController(IJourneyRepository journeyRepo)
        {
            _journeyRepo = journeyRepo;
        }

        // ── TOPICS CRUD ──────────────────────────────────────────────────────

        [HttpPost("topics")]
        public async Task<IActionResult> CreateTopic([FromBody] JourneyTopicDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Id) || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest("Thông tin chủ đề không hợp lệ.");
            }

            var topics = await _journeyRepo.GetTopicsAsync();
            if (topics.Any(t => t.Slug.ToLower() == dto.Id.ToLower()))
            {
                return BadRequest("Mã chủ đề đã tồn tại.");
            }

            var topic = new JourneyTopic
            {
                Slug = dto.Id.Trim().ToLower(),
                Name = dto.Name.Trim()
            };

            await _journeyRepo.AddTopicAsync(topic);
            return CreatedAtAction(nameof(GetTopic), new { id = topic.Slug }, dto);
        }

        [HttpGet("topics/{id}")]
        public async Task<IActionResult> GetTopic(string id)
        {
            var topics = await _journeyRepo.GetTopicsAsync();
            var t = topics.FirstOrDefault(x => x.Slug.ToLower() == id.ToLower());
            if (t == null) return NotFound();

            return Ok(new JourneyTopicDto { Id = t.Slug, Name = t.Name });
        }

        [HttpPut("topics/{id}")]
        public async Task<IActionResult> UpdateTopic(string id, [FromBody] JourneyTopicDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest("Thông tin chủ đề không hợp lệ.");
            }

            var topics = await _journeyRepo.GetTopicsAsync();
            var topic = topics.FirstOrDefault(t => t.Slug.ToLower() == id.ToLower());
            if (topic == null) return NotFound();

            topic.Name = dto.Name.Trim();
            await _journeyRepo.UpdateTopicAsync(topic);

            return NoContent();
        }

        [HttpDelete("topics/{id}")]
        public async Task<IActionResult> DeleteTopic(string id)
        {
            var topics = await _journeyRepo.GetTopicsAsync();
            var topic = topics.FirstOrDefault(t => t.Slug.ToLower() == id.ToLower());
            if (topic == null) return NotFound();

            // Check if there are videos associated with this topic
            var videos = await _journeyRepo.GetVideosAsync(topic.Id);
            if (videos.Any())
            {
                return BadRequest("Không thể xóa chủ đề có chứa video.");
            }

            await _journeyRepo.DeleteTopicAsync(topic);
            return NoContent();
        }

        // ── VIDEOS CRUD ──────────────────────────────────────────────────────

        [HttpPost("videos")]
        public async Task<IActionResult> CreateVideo([FromBody] JourneyVideoDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Url))
            {
                return BadRequest("Thông tin video không hợp lệ.");
            }

            var topics = await _journeyRepo.GetTopicsAsync();
            var topic = topics.FirstOrDefault(t => t.Slug.ToLower() == dto.TopicId.ToLower());
            if (topic == null)
            {
                return BadRequest("Chủ đề không tồn tại.");
            }

            var video = new JourneyVideo
            {
                Title = dto.Title.Trim(),
                Url = dto.Url.Trim(),
                Thumbnail = dto.Thumbnail?.Trim(),
                Duration = dto.Duration?.Trim() ?? "",
                TopicId = topic.Id
            };

            await _journeyRepo.AddVideoAsync(video);

            dto.Id = video.Id;
            return CreatedAtAction(nameof(GetVideo), new { id = video.Id }, dto);
        }

        [HttpGet("videos/{id}")]
        public async Task<IActionResult> GetVideo(int id)
        {
            var video = await _journeyRepo.GetVideoByIdAsync(id);
            if (video == null) return NotFound();

            return Ok(new JourneyVideoDto
            {
                Id = video.Id,
                TopicId = video.Topic?.Slug ?? "",
                Title = video.Title,
                Url = video.Url,
                Thumbnail = video.Thumbnail,
                Duration = video.Duration
            });
        }

        [HttpPut("videos/{id}")]
        public async Task<IActionResult> UpdateVideo(int id, [FromBody] JourneyVideoDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Url))
            {
                return BadRequest("Thông tin video không hợp lệ.");
            }

            var video = await _journeyRepo.GetVideoByIdAsync(id);
            if (video == null) return NotFound();

            var topics = await _journeyRepo.GetTopicsAsync();
            var topic = topics.FirstOrDefault(t => t.Slug.ToLower() == dto.TopicId.ToLower());
            if (topic == null)
            {
                return BadRequest("Chủ đề không tồn tại.");
            }

            // Clean up old files if they are replaced
            if (video.Url != dto.Url?.Trim())
                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(video.Url);
            if (video.Thumbnail != dto.Thumbnail?.Trim())
                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(video.Thumbnail);

            video.Title = dto.Title.Trim();
            video.Url = dto.Url.Trim();
            video.Thumbnail = dto.Thumbnail?.Trim();
            video.Duration = dto.Duration?.Trim() ?? "";
            video.TopicId = topic.Id;

            await _journeyRepo.UpdateVideoAsync(video);
            return NoContent();
        }

        [HttpDelete("videos/{id}")]
        public async Task<IActionResult> DeleteVideo(int id)
        {
            var video = await _journeyRepo.GetVideoByIdAsync(id);
            if (video == null) return NotFound();

            var url = video.Url;
            var thumbnail = video.Thumbnail;

            await _journeyRepo.DeleteVideoAsync(video);

            BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(url);
            BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(thumbnail);

            return NoContent();
        }
    }
}

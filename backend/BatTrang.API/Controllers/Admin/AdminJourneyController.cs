using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/journey")]
    [Authorize(Policy = "AdminOrStaff")]
    public class AdminJourneyController : ControllerBase
    {
        private readonly IJourneyRepository _journeyRepo;
        private readonly BatTrang.Infrastructure.Data.AppDbContext _context;

        public AdminJourneyController(IJourneyRepository journeyRepo, BatTrang.Infrastructure.Data.AppDbContext context)
        {
            _journeyRepo = journeyRepo;
            _context = context;
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

            // Clean up old files safely if they are replaced
            var oldUrl = video.Url;
            var oldThumbnail = video.Thumbnail;

            video.Title = dto.Title!.Trim();
            video.Url = dto.Url!.Trim();
            video.Thumbnail = dto.Thumbnail?.Trim();
            video.Duration = dto.Duration?.Trim() ?? "";
            video.TopicId = topic.Id;

            await _journeyRepo.UpdateVideoAsync(video);

            if (oldUrl != video.Url && !string.IsNullOrEmpty(oldUrl))
                await SafeDeletePhysicalFileAsync(oldUrl, isThumbnail: false);
            if (oldThumbnail != video.Thumbnail && !string.IsNullOrEmpty(oldThumbnail))
                await SafeDeletePhysicalFileAsync(oldThumbnail, isThumbnail: true);

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

            if (!string.IsNullOrEmpty(url)) await SafeDeletePhysicalFileAsync(url, isThumbnail: false);
            if (!string.IsNullOrEmpty(thumbnail)) await SafeDeletePhysicalFileAsync(thumbnail, isThumbnail: true);

            return NoContent();
        }
        private async Task SafeDeletePhysicalFileAsync(string fileUrl, bool isThumbnail)
        {
            if (string.IsNullOrEmpty(fileUrl)) return;

            int count = 0;
            if (isThumbnail)
            {
                count = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(
                    System.Linq.Queryable.Where(_context.JourneyVideos, v => v.Thumbnail == fileUrl)
                );
            }
            else
            {
                count = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(
                    System.Linq.Queryable.Where(_context.JourneyVideos, v => v.Url == fileUrl)
                );
            }

            if (count == 0)
            {
                BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(fileUrl);
            }
        }
    }
}


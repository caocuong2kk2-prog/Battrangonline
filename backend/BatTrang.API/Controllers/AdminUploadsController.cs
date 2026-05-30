using BatTrang.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/admin/uploads")]
    [Authorize]
    public class AdminUploadsController : ControllerBase
    {
        private readonly FileCleanupService _cleanupService;

        public AdminUploadsController(FileCleanupService cleanupService)
        {
            _cleanupService = cleanupService;
        }

        /// <summary>
        /// Preview orphaned files without deleting them (dry run).
        /// GET /api/admin/uploads/orphans
        /// </summary>
        [HttpGet("orphans")]
        public async Task<IActionResult> PreviewOrphans()
        {
            var result = await _cleanupService.RunCleanupAsync(dryRun: true);
            return Ok(new
            {
                result.TotalFiles,
                result.ReferencedFiles,
                result.OrphanFiles,
                result.FreedFormatted,
                result.OrphanDetails
            });
        }

        /// <summary>
        /// Execute cleanup — delete all orphaned files.
        /// POST /api/admin/uploads/cleanup
        /// </summary>
        [HttpPost("cleanup")]
        public async Task<IActionResult> RunCleanup()
        {
            var result = await _cleanupService.RunCleanupAsync(dryRun: false);
            return Ok(new
            {
                message = $"Đã xóa {result.DeletedFiles} file rác, giải phóng {result.FreedFormatted}.",
                result.TotalFiles,
                result.ReferencedFiles,
                result.OrphanFiles,
                result.DeletedFiles,
                result.FreedFormatted
            });
        }
    }
}

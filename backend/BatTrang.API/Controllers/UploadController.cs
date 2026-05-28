using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> UploadImage(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".avi", ".webm" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (Array.IndexOf(allowedExtensions, extension) < 0)
                return BadRequest($"Invalid file type: {extension}");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            // SECURITY PATCH: Use Path.GetFileName to prevent Directory Traversal attacks (e.g. file.FileName = "../../../shell.php")
            var safeFileName = Path.GetFileName(file.FileName);
            var uniqueFileName = Guid.NewGuid().ToString() + "_" + safeFileName;
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"/uploads/{uniqueFileName}";
            return Ok(new { Url = fileUrl });
        }

        [HttpDelete]
        public IActionResult DeleteFile([FromQuery] string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest("URL is empty");

            BatTrang.API.Helpers.FileHelper.DeletePhysicalFile(url);
            return Ok();
        }

        [HttpGet("video-thumbnail")]
        public async Task<IActionResult> GetVideoThumbnail([FromQuery] string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest("URL is empty");

            try
            {
                // ── Facebook: extract video ID and use Graph API (no token needed for public videos) ──
                if (url.Contains("facebook.com") || url.Contains("fb.watch"))
                {
                    // Try to extract Facebook video ID from various URL patterns
                    var fbVideoId = ExtractFacebookVideoId(url);
                    if (!string.IsNullOrEmpty(fbVideoId))
                    {
                        // graph.facebook.com/{videoId}/picture works for many public videos
                        var graphThumbUrl = $"https://graph.facebook.com/{fbVideoId}/picture";
                        return Ok(new { Url = graphThumbUrl });
                    }

                    // Fallback: try scraping the mobile Facebook page (simpler HTML, less bot detection)
                    var mobileUrl = url.Replace("www.facebook.com", "m.facebook.com")
                                       .Replace("//facebook.com", "//m.facebook.com");
                    var scraped = await ScrapeOgImage(mobileUrl);
                    if (!string.IsNullOrEmpty(scraped))
                        return Ok(new { Url = scraped });

                    // Last resort: scrape original URL
                    scraped = await ScrapeOgImage(url);
                    if (!string.IsNullOrEmpty(scraped))
                        return Ok(new { Url = scraped });

                    return Ok(new { Url = "" });
                }

                // ── General: scrape og:image from page ──
                var ogImage = await ScrapeOgImage(url);
                return Ok(new { Url = ogImage ?? "" });
            }
            catch
            {
                return Ok(new { Url = "" });
            }
        }

        private string ExtractFacebookVideoId(string url)
        {
            // Patterns:
            // /watch/?v=123456789
            // /videos/123456789
            // /video/123456789
            // /reel/123456789
            // /story.php?story_fbid=123456789
            var patterns = new[]
            {
                @"[?&]v=(\d+)",
                @"/videos?/(\d+)",
                @"/reel/(\d+)",
                @"story_fbid=(\d+)",
                @"/(\d{10,})"
            };
            foreach (var pattern in patterns)
            {
                var m = System.Text.RegularExpressions.Regex.Match(url, pattern);
                if (m.Success) return m.Groups[1].Value;
            }
            return null;
        }

        private async Task<string> ScrapeOgImage(string url)
        {
            try
            {
                var handler = new System.Net.Http.HttpClientHandler
                {
                    AllowAutoRedirect = true,
                    MaxAutomaticRedirections = 5
                };
                using var httpClient = new System.Net.Http.HttpClient(handler);

                // Realistic browser headers to avoid bot detection
                httpClient.DefaultRequestHeaders.Add("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                httpClient.DefaultRequestHeaders.Add("Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
                httpClient.DefaultRequestHeaders.Add("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7");
                httpClient.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
                httpClient.DefaultRequestHeaders.Add("Cache-Control", "no-cache");
                httpClient.Timeout = TimeSpan.FromSeconds(8);

                var html = await httpClient.GetStringAsync(url);

                // Flexible og:image regex — handles both attribute orders and single/double quotes
                var ogPatterns = new[]
                {
                    @"<meta[^>]+property=[""']og:image[""'][^>]+content=[""']([^""']+)[""']",
                    @"<meta[^>]+content=[""']([^""']+)[""'][^>]+property=[""']og:image[""']",
                    @"<meta\s+property=""og:image""\s+content=""([^""]+)""",
                    @"<meta\s+content=""([^""]+)""\s+property=""og:image"""
                };
                foreach (var pat in ogPatterns)
                {
                    var m = System.Text.RegularExpressions.Regex.Match(html, pat,
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (m.Success)
                        return System.Net.WebUtility.HtmlDecode(m.Groups[1].Value);
                }

                // Twitter image fallback
                var tw = System.Text.RegularExpressions.Regex.Match(html,
                    @"<meta[^>]+name=[""']twitter:image[""'][^>]+content=[""']([^""']+)[""']",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (tw.Success)
                    return System.Net.WebUtility.HtmlDecode(tw.Groups[1].Value);
            }
            catch { }
            return null;
        }
    }
}

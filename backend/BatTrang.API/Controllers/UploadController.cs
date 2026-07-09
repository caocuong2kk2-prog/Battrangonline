using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;
using SkiaSharp;

namespace BatTrang.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "AdminOrStaff")]
    public class UploadController : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> UploadImage(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            if (file.Length > 10 * 1024 * 1024)
                return BadRequest("File size exceeds 10MB limit.");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var isImage = Array.IndexOf(new[] { ".jpg", ".jpeg", ".png", ".webp" }, extension) >= 0;
            var isGif = extension == ".gif";
            var isVideo = Array.IndexOf(new[] { ".mp4", ".mov", ".avi", ".webm" }, extension) >= 0;

            if (!isImage && !isGif && !isVideo)
                return BadRequest($"Invalid file type: {extension}");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var safeFileName = Path.GetFileNameWithoutExtension(file.FileName);
            // Replace invalid characters just in case
            safeFileName = string.Join("_", safeFileName.Split(Path.GetInvalidFileNameChars()));
            
            var uniqueFileName = Guid.NewGuid().ToString() + "_" + safeFileName + extension;

            // If it's a static image (not GIF, not Video), process and convert to WebP
            if (isImage)
            {
                uniqueFileName = Guid.NewGuid().ToString() + "_" + safeFileName + ".webp";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = file.OpenReadStream())
                using (var inputStream = new SKManagedStream(stream))
                using (var original = SKBitmap.Decode(inputStream))
                {
                    if (original != null)
                    {
                        var targetWidth = original.Width;
                        var targetHeight = original.Height;

                        if (original.Width > 1200)
                        {
                            targetWidth = 1200;
                            targetHeight = (int)((double)original.Height / original.Width * targetWidth);
                        }

                        using (var resized = original.Resize(new SKImageInfo(targetWidth, targetHeight), new SKSamplingOptions(SKFilterMode.Linear)))
                        using (var image = SKImage.FromBitmap(resized))
                        using (var data = image.Encode(SKEncodedImageFormat.Webp, 80))
                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            data.SaveTo(fileStream);
                        }
                    }
                    else
                    {
                        return BadRequest("Invalid image format or corrupted file.");
                    }
                }
            }
            else
            {
                // Verify magic bytes for GIF and Video
                byte[] header = new byte[8];
                using (var stream = file.OpenReadStream())
                {
                    if (stream.Length < 8) return BadRequest("File too small.");
                    stream.Read(header, 0, 8);
                }

                bool isValidMagicByte = false;
                if (isGif)
                {
                    // GIF87a or GIF89a
                    if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38 &&
                        (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61)
                    {
                        isValidMagicByte = true;
                    }
                }
                else if (isVideo)
                {
                    // Basic checks for MP4 (ftyp), WEBM (1A 45 DF A3), AVI (RIFF...AVI)
                    if (extension == ".webm" && header[0] == 0x1A && header[1] == 0x45 && header[2] == 0xDF && header[3] == 0xA3)
                    {
                        isValidMagicByte = true;
                    }
                    else if (extension == ".mp4" && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) // ftyp
                    {
                        isValidMagicByte = true;
                    }
                    else if (extension == ".avi" && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46) // RIFF
                    {
                        isValidMagicByte = true;
                    }
                    else if (extension == ".mov" && header[4] == 0x6D && header[5] == 0x6F && header[6] == 0x6F && header[7] == 0x76) // moov
                    {
                        isValidMagicByte = true;
                    }
                    else if (extension == ".mov" && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) // ftyp
                    {
                        isValidMagicByte = true;
                    }
                }

                if (!isValidMagicByte)
                {
                    return BadRequest("Invalid file signature for the uploaded media type.");
                }

                var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
            }

            var fileUrl = $"/uploads/{uniqueFileName}";
            return Ok(new { Url = fileUrl });
        }

        [HttpDelete]
        [Microsoft.AspNetCore.Authorization.Authorize(Policy = "AdminOrStaff")]
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

            if (!await BatTrang.API.Helpers.UrlSecurityHelper.IsSafeExternalUrlAsync(url))
                return BadRequest("Invalid or blocked URL.");

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

        private string? ExtractFacebookVideoId(string url)
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

        private async Task<string?> ScrapeOgImage(string url)
        {
            if (!await BatTrang.API.Helpers.UrlSecurityHelper.IsSafeExternalUrlAsync(url))
                return null;

            try
            {
                var handler = new System.Net.Http.HttpClientHandler
                {
                    AllowAutoRedirect = false
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

                using var response = await BatTrang.API.Helpers.UrlSecurityHelper.FetchSafeExternalResponseAsync(httpClient, url, System.Net.Http.HttpCompletionOption.ResponseContentRead);
                if (response == null || !response.IsSuccessStatusCode) return null;

                var html = await response.Content.ReadAsStringAsync();

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

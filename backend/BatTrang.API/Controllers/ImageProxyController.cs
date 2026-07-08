using Microsoft.AspNetCore.Mvc;
using SkiaSharp;
using System.Net.Http;
using System.Threading.Tasks;
using System.IO;
using System;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/imageproxy")]
    public class ImageProxyController : ControllerBase
    {
        private static readonly HttpClient _httpClient;
        private readonly IWebHostEnvironment _env;

        // Cache failed external URLs to avoid repeated HTTP requests (URL -> expiry time)
        private static readonly ConcurrentDictionary<string, DateTime> _failedUrlCache = new();
        private static readonly TimeSpan _failedCacheDuration = TimeSpan.FromMinutes(30);

        static ImageProxyController()
        {
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "BatTrangAPI-ImageProxy/1.0");
            _httpClient.Timeout = TimeSpan.FromSeconds(10); // Don't wait forever for external sources
        }

        public ImageProxyController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpGet]
        [ResponseCache(Duration = 31536000, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetImage([FromQuery] string url, [FromQuery] int w = 0, [FromQuery] int h = 0, [FromQuery] int q = 75)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                Console.WriteLine("[ImageProxy] BadRequest: URL is required.");
                return BadRequest("URL is required.");
            }

            try
            {
                Stream stream;

                // Support relative URLs (local paths) directly to avoid Cloudflare WAF blocking absolute URLs
                if (url.StartsWith("/"))
                {
                    string decodedPath = Uri.UnescapeDataString(url.TrimStart('/'));
                    while (decodedPath.Contains("%"))
                    {
                        string newDecoded = Uri.UnescapeDataString(decodedPath);
                        if (newDecoded == decodedPath) break;
                        decodedPath = newDecoded;
                    }
                    var localPath = ResolveLocalFilePath(decodedPath);
                    if (string.IsNullOrEmpty(localPath))
                    {
                        Console.WriteLine($"[ImageProxy] Local file not found: {decodedPath}");
                        return ReturnPlaceholder();
                    }
                    stream = new FileStream(localPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                }
                else
                {
                    // Ensure it's a valid URI
                    if (!Uri.TryCreate(url, UriKind.Absolute, out Uri uri))
                    {
                        Console.WriteLine($"[ImageProxy] BadRequest: Invalid URL: {url}");
                        return BadRequest("Invalid URL.");
                    }

                    // 1. Intercept local files to prevent HTTP loopback and 404s
                    bool isLocalDomain = uri.Host.Contains("localhost") || 
                                          uri.Host.Contains("127.0.0.1") ||
                                          uri.Host.Contains("trycloudflare.com");

                    if (isLocalDomain)
                    {
                        // Map the URL path (e.g., /uploads/image.png) to the physical wwwroot path
                        var decodedPath = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
                        while (decodedPath.Contains("%"))
                        {
                            string newDecoded = Uri.UnescapeDataString(decodedPath);
                            if (newDecoded == decodedPath) break;
                            decodedPath = newDecoded;
                        }
                        var localPath = ResolveLocalFilePath(decodedPath);
                        if (string.IsNullOrEmpty(localPath))
                        {
                            Console.WriteLine($"[ImageProxy] Local file not found: {decodedPath}");
                            return ReturnPlaceholder();
                        }
                        stream = new FileStream(localPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                    }
                    else
                    {
                        var urlKey = uri.ToString();

                        // Check if this URL recently failed — return placeholder immediately
                        if (_failedUrlCache.TryGetValue(urlKey, out var expiry))
                        {
                            if (DateTime.UtcNow < expiry)
                            {
                                return ReturnPlaceholder();
                            }
                            _failedUrlCache.TryRemove(urlKey, out _);
                        }

                        // 2. Download external image
                        HttpResponseMessage response;
                        try
                        {
                            response = await _httpClient.GetAsync(uri);
                        }
                        catch (TaskCanceledException)
                        {
                            // Timeout
                            _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                            Console.WriteLine($"[ImageProxy] Timeout for URL: {uri}");
                            return ReturnPlaceholder();
                        }

                        if (!response.IsSuccessStatusCode)
                        {
                            _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                            // Console.WriteLine($"[ImageProxy] External source returned {response.StatusCode} for URL: {uri}");
                            return ReturnPlaceholder();
                        }

                        // Protect against HTML pages returned as images (anti-hotlink or 404s)
                        string? contentType = response.Content.Headers.ContentType?.MediaType;
                        if (contentType != null && contentType.Contains("text/html"))
                        {
                            _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                            // Console.WriteLine($"[ImageProxy] External source returned HTML instead of image for URL: {uri}");
                            return ReturnPlaceholder();
                        }

                        stream = await response.Content.ReadAsStreamAsync();
                    }
                } // End of outer else

                using (stream)
                {
                    // Decode the image using SkiaSharp
                using var originalBitmap = SKBitmap.Decode(stream);
                if (originalBitmap == null)
                {
                    Console.WriteLine($"[ImageProxy] Failed to decode image: {url}");
                    return ReturnPlaceholder();
                }

                SKBitmap finalBitmap = originalBitmap;
                bool resized = false;

                if (w > 0 && h > 0)
                {
                    float targetRatio = (float)w / h;
                    float sourceRatio = (float)originalBitmap.Width / originalBitmap.Height;
                    
                    int cropWidth = originalBitmap.Width;
                    int cropHeight = originalBitmap.Height;
                    int x = 0;
                    int y = 0;

                    if (sourceRatio > targetRatio)
                    {
                        cropWidth = (int)(originalBitmap.Height * targetRatio);
                        x = (originalBitmap.Width - cropWidth) / 2;
                    }
                    else
                    {
                        cropHeight = (int)(originalBitmap.Width / targetRatio);
                        y = (originalBitmap.Height - cropHeight) / 2;
                    }

                    using var subset = new SKBitmap();
                    originalBitmap.ExtractSubset(subset, SKRectI.Create(x, y, cropWidth, cropHeight));
                    finalBitmap = subset.Resize(new SKImageInfo(w, h), new SKSamplingOptions(SKFilterMode.Linear));
                    resized = true;
                }
                else if (w > 0 && w < originalBitmap.Width)
                {
                    int height = (int)Math.Round((double)originalBitmap.Height * w / originalBitmap.Width);
                    // Use Linear sampling for resize
                    finalBitmap = originalBitmap.Resize(new SKImageInfo(w, height), new SKSamplingOptions(SKFilterMode.Linear));
                    resized = true;
                }

                // Encode to WebP
                using var image = SKImage.FromBitmap(finalBitmap);
                int quality = (q >= 1 && q <= 100) ? q : 75;
                using var data = image.Encode(SKEncodedImageFormat.Webp, quality);

                if (resized)
                {
                    finalBitmap.Dispose();
                }

                // Set Cache-Control header to cache locally in the browser for 1 year
                Response.Headers["Cache-Control"] = "public, max-age=31536000";

                // We return as bytes
                return File(data.ToArray(), "image/webp");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal Server Error: " + ex.Message);
            }
        }

        private IActionResult ReturnPlaceholder()
        {
            return NotFound("Image not found or failed to process.");
        }

        private string ResolveLocalFilePath(string decodedPath)
        {
            // First check wwwroot (which handles uploads)
            var wwwrootPath = Path.Combine(_env.WebRootPath, decodedPath.Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(wwwrootPath)) return wwwrootPath;

            // Then check the 'user' folder for static assets (like assets/images/home_bg.webp)
            var userPath = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "user"));
            if (Directory.Exists(userPath))
            {
                var userFilePath = Path.Combine(userPath, decodedPath.Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(userFilePath)) return userFilePath;
            }

            return null;
        }
    }
}

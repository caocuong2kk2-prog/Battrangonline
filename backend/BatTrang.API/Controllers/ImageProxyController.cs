using Microsoft.AspNetCore.Mvc;
using SkiaSharp;
using System.Net.Http;
using System.Threading.Tasks;
using System.IO;
using System;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using System.Net;
using System.Net.Sockets;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/imageproxy")]
    public class ImageProxyController : ControllerBase
    {
        private const long MaxExternalImageBytes = 10 * 1024 * 1024;
        private static readonly HttpClient _httpClient;
        private readonly IWebHostEnvironment _env;

        private static readonly ConcurrentDictionary<string, DateTime> _failedUrlCache = new();
        private static readonly TimeSpan _failedCacheDuration = TimeSpan.FromMinutes(30);

        static ImageProxyController()
        {
            var handler = new HttpClientHandler { AllowAutoRedirect = false };
            _httpClient = new HttpClient(handler);
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "BatTrangAPI-ImageProxy/1.0");
            _httpClient.Timeout = TimeSpan.FromSeconds(10);
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
                return BadRequest("URL is required.");
            }

            try
            {
                Stream stream;

                if (url.StartsWith("/"))
                {
                    var decodedPath = DecodePath(url.TrimStart('/'));
                    var localPath = ResolveLocalFilePath(decodedPath);
                    if (string.IsNullOrEmpty(localPath))
                    {
                        return ReturnPlaceholder();
                    }
                    stream = new FileStream(localPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                }
                else
                {
                    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || !IsAllowedExternalUri(uri))
                    {
                        return BadRequest("Invalid URL.");
                    }

                    if (await IsBlockedHostAsync(uri.Host))
                    {
                        return BadRequest("Blocked URL host.");
                    }

                    var urlKey = uri.ToString();
                    if (_failedUrlCache.TryGetValue(urlKey, out var expiry))
                    {
                        if (DateTime.UtcNow < expiry)
                        {
                            return ReturnPlaceholder();
                        }
                        _failedUrlCache.TryRemove(urlKey, out _);
                    }

                    HttpResponseMessage? response;
                    try
                    {
                        response = await BatTrang.API.Helpers.UrlSecurityHelper.FetchSafeExternalResponseAsync(_httpClient, uri.ToString(), HttpCompletionOption.ResponseHeadersRead);
                    }
                    catch (TaskCanceledException)
                    {
                        _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                        return ReturnPlaceholder();
                    }

                    if (response == null)
                    {
                        _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                        return ReturnPlaceholder();
                    }

                    using (response)
                    {
                        if (!response.IsSuccessStatusCode)
                        {
                            _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                            return ReturnPlaceholder();
                        }

                        var contentType = response.Content.Headers.ContentType?.MediaType;
                        if (contentType != null && !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                        {
                            _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                            return ReturnPlaceholder();
                        }

                        if (response.Content.Headers.ContentLength > MaxExternalImageBytes)
                        {
                            _failedUrlCache[urlKey] = DateTime.UtcNow.Add(_failedCacheDuration);
                            return ReturnPlaceholder();
                        }

                        stream = await ReadLimitedStreamAsync(response.Content);
                    }
                }

                using (stream)
                using (var originalBitmap = SKBitmap.Decode(stream))
                {
                    if (originalBitmap == null)
                    {
                        return ReturnPlaceholder();
                    }

                    SKBitmap finalBitmap = originalBitmap;
                    bool resized = false;

                    if (w > 0 && h > 0)
                    {
                        w = Math.Min(w, 2400);
                        h = Math.Min(h, 2400);
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
                        finalBitmap = subset.Resize(new SKImageInfo(w, h), new SKSamplingOptions(SKCubicResampler.Mitchell));
                        resized = true;
                    }
                    else if (w > 0 && w < originalBitmap.Width)
                    {
                        w = Math.Min(w, 2400);
                        int height = (int)Math.Round((double)originalBitmap.Height * w / originalBitmap.Width);
                        finalBitmap = originalBitmap.Resize(new SKImageInfo(w, height), new SKSamplingOptions(SKCubicResampler.Mitchell));
                        resized = true;
                    }

                    using var image = SKImage.FromBitmap(finalBitmap);
                    int quality = (q >= 1 && q <= 100) ? q : 75;
                    using var data = image.Encode(SKEncodedImageFormat.Webp, quality);

                    if (resized)
                    {
                        finalBitmap.Dispose();
                    }

                    Response.Headers["Cache-Control"] = "public, max-age=31536000";
                    return File(data.ToArray(), "image/webp");
                }
            }
            catch
            {
                return StatusCode(500, "Internal Server Error.");
            }
        }

        private IActionResult ReturnPlaceholder()
        {
            return NotFound("Image not found or failed to process.");
        }

        private string? ResolveLocalFilePath(string decodedPath)
        {
            var normalizedPath = decodedPath.Replace('/', Path.DirectorySeparatorChar);

            var wwwrootPath = ResolveUnderRoot(_env.WebRootPath, normalizedPath);
            if (wwwrootPath != null) return wwwrootPath;

            var userPath = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "user"));
            return ResolveUnderRoot(userPath, normalizedPath);
        }

        private static string? ResolveUnderRoot(string? root, string relativePath)
        {
            if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root)) return null;

            var rootFullPath = Path.GetFullPath(root);
            var filePath = Path.GetFullPath(Path.Combine(rootFullPath, relativePath));
            var rootPrefix = rootFullPath.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;

            if (!filePath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)) return null;
            return System.IO.File.Exists(filePath) ? filePath : null;
        }

        private static string DecodePath(string path)
        {
            var decodedPath = Uri.UnescapeDataString(path);
            for (var i = 0; i < 3 && decodedPath.Contains("%"); i++)
            {
                var newDecoded = Uri.UnescapeDataString(decodedPath);
                if (newDecoded == decodedPath) break;
                decodedPath = newDecoded;
            }
            return decodedPath;
        }

        private static bool IsAllowedExternalUri(Uri uri)
        {
            return (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp) && string.IsNullOrEmpty(uri.UserInfo);
        }

        private static async Task<bool> IsBlockedHostAsync(string host)
        {
            if (string.IsNullOrWhiteSpace(host)) return true;
            if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase)) return true;

            try
            {
                var addresses = await Dns.GetHostAddressesAsync(host);
                return addresses.Any(IsPrivateOrLocalAddress);
            }
            catch
            {
                return true;
            }
        }

        private static bool IsPrivateOrLocalAddress(IPAddress address)
        {
            if (IPAddress.IsLoopback(address)) return true;
            if (address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any)) return true;

            if (address.AddressFamily == AddressFamily.InterNetwork)
            {
                var bytes = address.GetAddressBytes();
                return bytes[0] == 10 ||
                       bytes[0] == 127 ||
                       (bytes[0] == 169 && bytes[1] == 254) ||
                       (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
                       (bytes[0] == 192 && bytes[1] == 168);
            }

            if (address.AddressFamily == AddressFamily.InterNetworkV6)
            {
                return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast;
            }

            return true;
        }

        private static async Task<MemoryStream> ReadLimitedStreamAsync(HttpContent content)
        {
            await using var remoteStream = await content.ReadAsStreamAsync();
            var memoryStream = new MemoryStream();
            var buffer = new byte[81920];
            long totalRead = 0;

            while (true)
            {
                var read = await remoteStream.ReadAsync(buffer.AsMemory(0, buffer.Length));
                if (read == 0) break;

                totalRead += read;
                if (totalRead > MaxExternalImageBytes)
                {
                    memoryStream.Dispose();
                    throw new InvalidOperationException("Remote image is too large.");
                }

                await memoryStream.WriteAsync(buffer.AsMemory(0, read));
            }

            memoryStream.Position = 0;
            return memoryStream;
        }
    }
}
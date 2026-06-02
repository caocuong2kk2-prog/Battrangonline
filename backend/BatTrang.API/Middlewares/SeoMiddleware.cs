using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace BatTrang.API.Middlewares
{
    public class SeoMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IWebHostEnvironment _env;
        private readonly IMemoryCache _cache;
        
        // Cache key for the base HTML
        private const string BaseHtmlCacheKey = "SeoMiddleware_ProductDetailHtml";

        public SeoMiddleware(RequestDelegate next, IWebHostEnvironment env, IMemoryCache cache)
        {
            _next = next;
            _env = env;
            _cache = cache;
        }

        public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
        {
            // Only intercept /product-detail.html with a slug
            if (context.Request.Path.Value == "/product-detail.html" && context.Request.Query.ContainsKey("slug"))
            {
                string slug = context.Request.Query["slug"].ToString();

                if (!string.IsNullOrEmpty(slug))
                {
                    // 1. Fetch Product from DB
                    var product = await dbContext.Products
                        .AsNoTracking()
                        .AsSplitQuery()
                        .Include(p => p.Variants)
                            .ThenInclude(v => v.Images)
                        .FirstOrDefaultAsync(p => p.Slug == slug && p.Status == "active");

                    if (product != null)
                    {
                        // 2. Get base HTML (from Cache or File)
                        if (!_cache.TryGetValue(BaseHtmlCacheKey, out string baseHtml))
                        {
                            var userPath = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "user"));
                            var htmlFilePath = Path.Combine(userPath, "product-detail.html");

                            if (File.Exists(htmlFilePath))
                            {
                                baseHtml = await File.ReadAllTextAsync(htmlFilePath);
                                // Cache for 1 hour, or until file changes
                                _cache.Set(BaseHtmlCacheKey, baseHtml, System.TimeSpan.FromHours(1));
                            }
                        }

                        if (!string.IsNullOrEmpty(baseHtml))
                        {
                            // 3. Prepare SEO Meta Tags
                            string title = $"{product.Name} – Phúc Gia Tiên";
                            
                            // Remove line breaks and extra spaces from description
                            string description = !string.IsNullOrEmpty(product.ShortDescription) ? product.ShortDescription : (product.Description ?? "");
                            description = Regex.Replace(description, "<.*?>", string.Empty); // Strip HTML if any
                            description = description.Replace("\r", "").Replace("\n", " ").Trim();
                            if (description.Length > 160) description = description.Substring(0, 157) + "...";
                            if (string.IsNullOrEmpty(description)) description = "Xem chi tiết sản phẩm gốm sứ thủ công Bát Tràng của Phúc Gia Tiên.";

                            // Find the best image
                            string ogImage = "https://phucgiatien.vn/assets/images/logo.png"; // Fallback
                            var firstImage = product.Variants.SelectMany(v => v.Images).FirstOrDefault(i => !i.ImageUrl.Contains("tiktok") && !i.ImageUrl.Contains("youtube") && !i.ImageUrl.Contains("facebook") && !i.ImageUrl.EndsWith(".mp4"));
                            if (firstImage != null)
                            {
                                ogImage = firstImage.ImageUrl;
                                // Ensure full URL if it's a local path
                                if (ogImage.StartsWith("/"))
                                {
                                    ogImage = $"{context.Request.Scheme}://{context.Request.Host}{ogImage}";
                                }
                            }

                            // 4. Inject Meta Tags into HTML
                            // Replace <title>
                            var finalHtml = Regex.Replace(baseHtml, @"<title>.*?</title>", $"<title>{title}</title>", RegexOptions.IgnoreCase);
                            
                            // Replace <meta name="description" ...>
                            // Handle multiline or complex meta description tags safely
                            finalHtml = Regex.Replace(finalHtml, @"<meta\s+name=[""']description[""']\s+content=[""'].*?[""']\s*>", $"<meta name=\"description\" content=\"{description}\">", RegexOptions.IgnoreCase | RegexOptions.Singleline);
                            
                            // Insert OpenGraph tags before </head>
                            string ogTags = $@"
  <meta property=""og:title"" content=""{title}"">
  <meta property=""og:description"" content=""{description}"">
  <meta property=""og:image"" content=""{ogImage}"">
  <meta property=""og:type"" content=""product"">
  <meta property=""og:url"" content=""{context.Request.Scheme}://{context.Request.Host}/product-detail?slug={slug}"">
</head>";
                            finalHtml = Regex.Replace(finalHtml, @"</head>", ogTags, RegexOptions.IgnoreCase);

                            // 5. Return the modified HTML
                            context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
                            context.Response.Headers.Append("Pragma", "no-cache");
                            context.Response.Headers.Append("Expires", "0");
                            context.Response.ContentType = "text/html; charset=utf-8";
                            await context.Response.WriteAsync(finalHtml);
                            return; // Stop pipeline
                        }
                    }
                }
            }
            else if (context.Request.Path.Value == "/products.html" && context.Request.Query.ContainsKey("category"))
            {
                // ... logic for categories
                string categorySlug = context.Request.Query["category"].ToString();

                if (!string.IsNullOrEmpty(categorySlug) && categorySlug != "all")
                {
                    var category = await dbContext.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == categorySlug);
                    if (category != null)
                    {
                        string cacheKey = $"SeoMiddleware_ProductsHtml_{categorySlug}";
                        if (!_cache.TryGetValue(cacheKey, out string baseHtml))
                        {
                            var userPath = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "user"));
                            var htmlFilePath = Path.Combine(userPath, "products.html");

                            if (File.Exists(htmlFilePath))
                            {
                                baseHtml = await File.ReadAllTextAsync(htmlFilePath);
                                _cache.Set(cacheKey, baseHtml, System.TimeSpan.FromHours(1));
                            }
                        }

                        if (!string.IsNullOrEmpty(baseHtml))
                        {
                            string title = $"{category.Name} Bát Tràng Cao Cấp – Phúc Gia Tiên";
                            string description = !string.IsNullOrEmpty(category.Description) ? category.Description : $"Khám phá các sản phẩm {category.Name.ToLower()} thủ công truyền thống Bát Tràng tại Phúc Gia Tiên.";
                            
                            var finalHtml = Regex.Replace(baseHtml, @"<title>.*?</title>", $"<title>{title}</title>", RegexOptions.IgnoreCase);
                            finalHtml = Regex.Replace(finalHtml, @"<meta\s+name=[""']description[""']\s+content=[""'].*?[""']\s*>", $"<meta name=\"description\" content=\"{description}\">", RegexOptions.IgnoreCase | RegexOptions.Singleline);
                            
                            string ogImage = $"{context.Request.Scheme}://{context.Request.Host}/assets/images/logo.png";
                            string ogTags = $@"
  <meta property=""og:title"" content=""{title}"">
  <meta property=""og:description"" content=""{description}"">
  <meta property=""og:image"" content=""{ogImage}"">
  <meta property=""og:type"" content=""website"">
  <meta property=""og:url"" content=""{context.Request.Scheme}://{context.Request.Host}/products?category={categorySlug}"">
</head>";
                            finalHtml = Regex.Replace(finalHtml, @"</head>", ogTags, RegexOptions.IgnoreCase);
                            
                            context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
                            context.Response.Headers.Append("Pragma", "no-cache");
                            context.Response.Headers.Append("Expires", "0");
                            context.Response.ContentType = "text/html; charset=utf-8";
                            await context.Response.WriteAsync(finalHtml);
                            return;
                        }
                    }
                }
            }
            else if (context.Request.Path.Value == "/journey.html" && context.Request.Query.ContainsKey("topic"))
            {
                string topicSlug = context.Request.Query["topic"].ToString();

                if (!string.IsNullOrEmpty(topicSlug) && topicSlug != "tat-ca")
                {
                    var topic = await dbContext.JourneyTopics.AsNoTracking().FirstOrDefaultAsync(t => t.Slug == topicSlug);
                    if (topic != null)
                    {
                        string cacheKey = $"SeoMiddleware_JourneyHtml_{topicSlug}";
                        if (!_cache.TryGetValue(cacheKey, out string baseHtml))
                        {
                            var userPath = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "user"));
                            var htmlFilePath = Path.Combine(userPath, "journey.html");

                            if (File.Exists(htmlFilePath))
                            {
                                baseHtml = await File.ReadAllTextAsync(htmlFilePath);
                                _cache.Set(cacheKey, baseHtml, System.TimeSpan.FromHours(1));
                            }
                        }

                        if (!string.IsNullOrEmpty(baseHtml))
                        {
                            string title = $"{topic.Name} – Hành Trình Phúc Gia Tiên";
                            string description = $"Khám phá câu chuyện '{topic.Name.ToLower()}' của xưởng gốm thủ công Phúc Gia Tiên.";
                            
                            var finalHtml = Regex.Replace(baseHtml, @"<title>.*?</title>", $"<title>{title}</title>", RegexOptions.IgnoreCase);
                            finalHtml = Regex.Replace(finalHtml, @"<meta\s+name=[""']description[""']\s+content=[""'].*?[""']\s*>", $"<meta name=\"description\" content=\"{description}\">", RegexOptions.IgnoreCase | RegexOptions.Singleline);
                            
                            string ogImage = $"{context.Request.Scheme}://{context.Request.Host}/assets/images/journey-hero.jpg";
                            string ogTags = $@"
  <meta property=""og:title"" content=""{title}"">
  <meta property=""og:description"" content=""{description}"">
  <meta property=""og:image"" content=""{ogImage}"">
  <meta property=""og:type"" content=""website"">
  <meta property=""og:url"" content=""{context.Request.Scheme}://{context.Request.Host}/journey?topic={topicSlug}"">
</head>";
                            finalHtml = Regex.Replace(finalHtml, @"</head>", ogTags, RegexOptions.IgnoreCase);
                            
                            context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
                            context.Response.Headers.Append("Pragma", "no-cache");
                            context.Response.Headers.Append("Expires", "0");
                            context.Response.ContentType = "text/html; charset=utf-8";
                            await context.Response.WriteAsync(finalHtml);
                            return;
                        }
                    }
                }
            }

            // Call the next delegate/middleware in the pipeline
            await _next(context);
        }
    }
}

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
    public class FaqItemDto
    {
        public string q { get; set; }
        public string a { get; set; }
    }

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
                    var product = await dbContext.Products
                        .AsNoTracking()
                        .Include(p => p.Category)
                        .Include(p => p.Variants).ThenInclude(v => v.Images)
                        .Include(p => p.Variants).ThenInclude(v => v.Material)
                        .Include(p => p.Variants).ThenInclude(v => v.GlazeLine)
                        .Include(p => p.Variants).ThenInclude(v => v.Pattern)
                        .Include(p => p.Variants).ThenInclude(v => v.Size)
                        .FirstOrDefaultAsync(p => p.Slug == slug && p.Status == "active");

                    if (product != null)
                    {
                        var faqList = new System.Collections.Generic.List<FaqItemDto>();
                        
                        // 1. Add Product FAQs
                        if (!string.IsNullOrEmpty(product.Faqs))
                        {
                            try
                            {
                                var prodFaqs = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<FaqItemDto>>(product.Faqs);
                                if (prodFaqs != null) faqList.AddRange(prodFaqs);
                            }
                            catch { }
                        }
                        
                        // 2. Add Category FAQs
                        if (product.Category != null && !string.IsNullOrEmpty(product.Category.Faqs))
                        {
                            try
                            {
                                var catFaqs = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<FaqItemDto>>(product.Category.Faqs);
                                if (catFaqs != null) faqList.AddRange(catFaqs);
                            }
                            catch { }
                        }


                        
                        // Nếu chưa có config thì lấy giá trị mặc định để fallback
                        if (!faqList.Any())
                        {
                            faqList.Add(new FaqItemDto { q = $"Sản phẩm {product.Name} đặt ở đâu hợp phong thuỷ?", a = "Sản phẩm gốm sứ thủ công Bát Tràng rất thích hợp để bài trí tại phòng khách, phòng làm việc, phòng thờ hoặc làm quà biếu tặng để mang lại may mắn, bình an cho gia chủ." });
                            faqList.Add(new FaqItemDto { q = "Chính sách bảo hành và vận chuyển của Phúc Gia Tiên ra sao?", a = "Phúc Gia Tiên hỗ trợ giao hàng toàn quốc (Ship COD), khách hàng được đồng kiểm trước khi thanh toán. Cam kết 1 đổi 1 miễn phí trong 7 ngày nếu có lỗi từ lò nung hoặc do quá trình vận chuyển." });
                        }

                        // Generate FaqPage schema items dynamically
                        var faqSchemaItems = string.Join(",\n", faqList.Where(f => !string.IsNullOrEmpty(f.q) && !string.IsNullOrEmpty(f.a)).Select(f => $@"
          {{
            ""@type"": ""Question"",
            ""name"": ""{System.Text.Json.JsonEncodedText.Encode(f.q)}"",
            ""acceptedAnswer"": {{
              ""@type"": ""Answer"",
              ""text"": ""{System.Text.Json.JsonEncodedText.Encode(f.a.Replace("\n", "<br>"))}""
            }}
          }}"));

                        // 2. Get base HTML (from Cache or File)
                        if (!_cache.TryGetValue(BaseHtmlCacheKey, out string? baseHtml))
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
                            // 3. Prepare SEO Meta Tags (GEO Optimized Factual Content)
                            string title = $"{product.Name} – Phúc Gia Tiên";
                            
                            // Generate Factual Description automatically based on attributes
                            var materials = string.Join(", ", product.Variants.Where(v => v.Material != null).Select(v => v.Material!.Name).Distinct());
                            var glazeLines = string.Join(", ", product.Variants.Where(v => v.GlazeLine != null).Select(v => v.GlazeLine!.Name).Distinct());
                            var patterns = string.Join(", ", product.Variants.Where(v => v.Pattern != null).Select(v => v.Pattern!.Name).Distinct());
                            var sizes = string.Join(", ", product.Variants.Where(v => v.Size != null).Select(v => v.Size!.Name).Distinct());

                            var factualParts = new System.Collections.Generic.List<string>();
                            if (!string.IsNullOrEmpty(materials)) factualParts.Add($"Chất liệu {materials}");
                            if (!string.IsNullOrEmpty(glazeLines)) factualParts.Add($"Dòng men {glazeLines}");
                            if (!string.IsNullOrEmpty(patterns)) factualParts.Add($"Hoa văn {patterns}");
                            if (!string.IsNullOrEmpty(sizes)) factualParts.Add($"Kích thước {sizes}");

                            string geoDescription = $"Sản phẩm {product.Name} (Danh mục: {product.Category?.Name ?? "Gốm sứ"}). ";
                            if (factualParts.Any())
                            {
                                geoDescription += string.Join(", ", factualParts) + ". ";
                            }
                            geoDescription += "Sản xuất thủ công tại Bát Tràng, phù hợp làm quà tặng, trang trí phong thuỷ.";
                            
                            // Get user description if any
                            string userDesc = !string.IsNullOrEmpty(product.ShortDescription) ? product.ShortDescription : (product.Description ?? "");
                            userDesc = Regex.Replace(userDesc, "<.*?>", string.Empty);
                            userDesc = userDesc.Replace("\r", "").Replace("\n", " ").Trim();
                            
                            // Combine them but keep under 160 chars for standard SEO
                            string description = geoDescription;
                            if (!string.IsNullOrEmpty(userDesc) && description.Length < 130)
                            {
                                description += " " + userDesc;
                            }
                            if (description.Length > 160) description = description.Substring(0, 157) + "...";

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
                            
                            // Prepare JSON-LD Schema
                            string price = "0";
                            string stockStatus = "https://schema.org/OutOfStock";
                            var firstVariant = product.Variants.FirstOrDefault();
                            if (firstVariant != null)
                            {
                                price = firstVariant.Price.ToString("0");
                                if (firstVariant.Stock > 0)
                                    stockStatus = "https://schema.org/InStock";
                            }

                            // Fetch organization config
                            var orgPhone = await dbContext.SiteConfigs.Where(x => x.Key == "phone").Select(x => x.Value).FirstOrDefaultAsync() ?? "0966969969";
                            var storeName = await dbContext.SiteConfigs.Where(x => x.Key == "storeName").Select(x => x.Value).FirstOrDefaultAsync() ?? "Phúc Gia Tiên";

                            string jsonLd = $@"
  <script type=""application/ld+json"" id=""schema-jsonld"">
  {{
    ""@context"": ""https://schema.org/"",
    ""@graph"": [
      {{
        ""@type"": ""Organization"",
        ""name"": ""{storeName}"",
        ""url"": ""{context.Request.Scheme}://{context.Request.Host}"",
        ""logo"": ""{context.Request.Scheme}://{context.Request.Host}/assets/images/logo.png"",
        ""contactPoint"": {{
          ""@type"": ""ContactPoint"",
          ""telephone"": ""{orgPhone}"",
          ""contactType"": ""customer service""
        }}
      }},
      {{
        ""@type"": ""Product"",
        ""name"": ""{product.Name}"",
        ""image"": [ ""{ogImage}"" ],
        ""description"": ""{description}"",
        ""sku"": ""{product.Sku ?? product.Id.ToString()}"",
        ""brand"": {{
          ""@type"": ""Brand"",
          ""name"": ""Phúc Gia Tiên""
        }},
        ""offers"": {{
          ""@type"": ""Offer"",
          ""url"": ""{context.Request.Scheme}://{context.Request.Host}/{slug}"",
          ""priceCurrency"": ""VND"",
          ""price"": ""{price}"",
          ""availability"": ""{stockStatus}"",
          ""itemCondition"": ""https://schema.org/NewCondition""
        }},
        ""aggregateRating"": {{
          ""@type"": ""AggregateRating"",
          ""ratingValue"": ""5"",
          ""reviewCount"": ""{(product.TotalSold > 0 ? product.TotalSold : 1)}""
        }}
      }},
      {{
        ""@type"": ""BreadcrumbList"",
        ""itemListElement"": [
          {{
            ""@type"": ""ListItem"",
            ""position"": 1,
            ""name"": ""Trang Chủ"",
            ""item"": ""{context.Request.Scheme}://{context.Request.Host}""
          }},
          {{
            ""@type"": ""ListItem"",
            ""position"": 2,
            ""name"": ""Sản Phẩm"",
            ""item"": ""{context.Request.Scheme}://{context.Request.Host}/danh-muc/all""
          }},
          {{
            ""@type"": ""ListItem"",
            ""position"": 3,
            ""name"": ""{product.Name}"",
            ""item"": ""{context.Request.Scheme}://{context.Request.Host}/{slug}""
          }}
        ]
      }},
      {{
        ""@type"": ""FAQPage"",
        ""mainEntity"": [
{faqSchemaItems}
        ]
      }}
    ]
  }}
  </script>";

                            // Insert OpenGraph and JSON-LD tags before </head>
                            // Remove any existing static OG/Twitter/Canonical tags or JSON-LD to avoid duplicates
                            finalHtml = Regex.Replace(finalHtml, @"<meta\s+(?:property|name)=[""'](?:og|twitter):[^""']+[""'][^>]*>", "", RegexOptions.IgnoreCase);
                            finalHtml = Regex.Replace(finalHtml, @"<link\s+rel=[""']canonical[""'][^>]*>", "", RegexOptions.IgnoreCase);
                            finalHtml = Regex.Replace(finalHtml, @"<script\s+type=[""']application/ld\+json[""'][^>]*>.*?</script>", "", RegexOptions.IgnoreCase | RegexOptions.Singleline);

                            string headTags = $@"
  <meta property=""og:title"" content=""{title}"">
  <meta property=""og:description"" content=""{description}"">
  <meta property=""og:image"" content=""{ogImage}"">
  <meta property=""og:type"" content=""product"">
  <meta property=""og:url"" content=""{context.Request.Scheme}://{context.Request.Host}/{slug}"">
  <meta name=""twitter:card"" content=""summary_large_image"">
  <meta name=""twitter:title"" content=""{title}"">
  <meta name=""twitter:description"" content=""{description}"">
  <meta name=""twitter:image"" content=""{ogImage}"">
  <link rel=""canonical"" href=""{context.Request.Scheme}://{context.Request.Host}/{slug}"" />
{jsonLd}
</head>";
                            finalHtml = Regex.Replace(finalHtml, @"</head>", headTags, RegexOptions.IgnoreCase);

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
                        if (!_cache.TryGetValue(cacheKey, out string? baseHtml))
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
                            
                            // Clean up existing tags
                            finalHtml = Regex.Replace(finalHtml, @"<meta\s+(?:property|name)=[""'](?:og|twitter):[^""']+[""'][^>]*>", "", RegexOptions.IgnoreCase);
                            finalHtml = Regex.Replace(finalHtml, @"<link\s+rel=[""']canonical[""'][^>]*>", "", RegexOptions.IgnoreCase);
                            finalHtml = Regex.Replace(finalHtml, @"<script\s+type=[""']application/ld\+json[""'][^>]*>.*?</script>", "", RegexOptions.IgnoreCase | RegexOptions.Singleline);

                            // Fetch organization config
                            var orgPhone = await dbContext.SiteConfigs.Where(x => x.Key == "phone").Select(x => x.Value).FirstOrDefaultAsync() ?? "0966969969";
                            var storeName = await dbContext.SiteConfigs.Where(x => x.Key == "storeName").Select(x => x.Value).FirstOrDefaultAsync() ?? "Phúc Gia Tiên";

                            string orgSchema = $@"
  <script type=""application/ld+json"">
  {{
    ""@context"": ""https://schema.org"",
    ""@type"": ""Organization"",
    ""name"": ""{storeName}"",
    ""url"": ""{context.Request.Scheme}://{context.Request.Host}"",
    ""logo"": ""{context.Request.Scheme}://{context.Request.Host}/assets/images/logo.png"",
    ""contactPoint"": {{
      ""@type"": ""ContactPoint"",
      ""telephone"": ""{orgPhone}"",
      ""contactType"": ""customer service""
    }}
  }}
  </script>";

                            string ogTags = $@"
  <meta property=""og:title"" content=""{title}"">
  <meta property=""og:description"" content=""{description}"">
  <meta property=""og:image"" content=""{ogImage}"">
  <meta property=""og:type"" content=""website"">
  <meta property=""og:url"" content=""{context.Request.Scheme}://{context.Request.Host}/danh-muc/{categorySlug}"">
  <meta name=""twitter:card"" content=""summary_large_image"">
  <meta name=""twitter:title"" content=""{title}"">
  <meta name=""twitter:description"" content=""{description}"">
  <meta name=""twitter:image"" content=""{ogImage}"">
  <link rel=""canonical"" href=""{context.Request.Scheme}://{context.Request.Host}/danh-muc/{categorySlug}"" />
{orgSchema}
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
                        if (!_cache.TryGetValue(cacheKey, out string? baseHtml))
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
  <link rel=""canonical"" href=""{context.Request.Scheme}://{context.Request.Host}/journey?topic={topicSlug}"" />
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

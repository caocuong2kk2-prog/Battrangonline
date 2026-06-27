using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BatTrang.API.Controllers
{
    [ApiController]
    public class SitemapController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;

        public SitemapController(AppDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        [HttpGet("/robots.txt")]
        public IActionResult GetRobotsTxt()
        {
            // Lấy đúng tên miền hiện tại
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            
            var sb = new StringBuilder();
            sb.AppendLine("User-agent: *");
            sb.AppendLine("Disallow: /admin/");
            sb.AppendLine("Disallow: /api/");
            sb.AppendLine("Disallow: /hub/");
            sb.AppendLine("Allow: /");
            sb.AppendLine();
            // Khai báo Sitemap tuyệt đối
            sb.AppendLine($"Sitemap: {baseUrl}/sitemap.xml");

            return Content(sb.ToString(), "text/plain", Encoding.UTF8);
        }

        [HttpGet("/llms.txt")]
        public IActionResult GetLlmsTxt()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var sb = new StringBuilder();
            sb.AppendLine("# Gốm Sứ Phúc Gia Tiên");
            sb.AppendLine();
            sb.AppendLine("Website chính thức của Gốm Sứ Phúc Gia Tiên - Chuyên cung cấp các sản phẩm gốm sứ thủ công mỹ nghệ cao cấp từ làng nghề Bát Tràng.");
            sb.AppendLine();
            sb.AppendLine("## Liên kết quan trọng");
            sb.AppendLine();
            sb.AppendLine($"- [Trang chủ]({baseUrl}/)");
            sb.AppendLine($"- [Sản phẩm]({baseUrl}/products)");
            sb.AppendLine($"- [Hành trình gốm sứ]({baseUrl}/journey)");
            sb.AppendLine($"- [Liên hệ]({baseUrl}/contact)");
            sb.AppendLine();
            sb.AppendLine("## Giới thiệu");
            sb.AppendLine();
            sb.AppendLine("Phúc Gia Tiên mang đến cho quý khách hàng những sản phẩm gốm sứ chất lượng nhất, đậm đà bản sắc văn hóa Việt Nam. Các sản phẩm bao gồm lọ hoa, ấm chén, bát đĩa, đồ thờ cúng và quà tặng doanh nghiệp.");
            
            return Content(sb.ToString(), "text/plain", Encoding.UTF8);
        }

        [HttpGet("/sitemap.xml")]
        public async Task<IActionResult> GetSitemapXml()
        {
            // Do Sitemap du?c g?i thu?ng xuyên b?i Googlebot, ta nên Cache l?i 1 ti?ng
            string cacheKey = "SitemapXmlCache";
            if (!_cache.TryGetValue(cacheKey, out string? xml))
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var urls = new List<string>();

                // 1. Các trang tinh (Dùng URL s?ch không có duôi .html)
                urls.Add($"{baseUrl}/");
                urls.Add($"{baseUrl}/about");
                urls.Add($"{baseUrl}/contact");
                urls.Add($"{baseUrl}/products");
                urls.Add($"{baseUrl}/journey");
                urls.Add($"{baseUrl}/shopping-guide");
                urls.Add($"{baseUrl}/warranty-policy");
                urls.Add($"{baseUrl}/shipping-policy");
                urls.Add($"{baseUrl}/return-policy");
                urls.Add($"{baseUrl}/privacy-policy");

                // 2. Danh mục sản phẩm
                var categories = await _context.Categories.AsNoTracking().ToListAsync();
                foreach (var cat in categories)
                {
                    urls.Add($"{baseUrl}/danh-muc/{cat.Slug}");
                }

                // 3. Chi tiết Sản phẩm (chỉ lấy Active)
                var products = await _context.Products.AsNoTracking().Where(p => p.Status == "active").ToListAsync();
                foreach (var prod in products)
                {
                    urls.Add($"{baseUrl}/{prod.Slug}");
                }

                // 4. Hành trình (Topics)
                var topics = await _context.JourneyTopics.AsNoTracking().ToListAsync();
                foreach (var topic in topics)
                {
                    urls.Add($"{baseUrl}/journey?topic={topic.Slug}");
                }

                // Ð? vào d?nh d?ng XML chu?n c?a Sitemap
                var sb = new StringBuilder();
                sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
                sb.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
                
                string today = DateTime.UtcNow.AddHours(7).ToString("yyyy-MM-dd");

                foreach (var url in urls)
                {
                    // Chuy?n ký t? d?c bi?t (VD: '&' thành '&amp;') d? XML không l?i
                    string safeUrl = url.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;").Replace("'", "&apos;");
                    
                    sb.AppendLine("  <url>");
                    sb.AppendLine($"    <loc>{safeUrl}</loc>");
                    sb.AppendLine($"    <lastmod>{today}</lastmod>");
                    sb.AppendLine("    <changefreq>daily</changefreq>");
                    sb.AppendLine("    <priority>0.8</priority>");
                    sb.AppendLine("  </url>");
                }

                sb.AppendLine("</urlset>");
                xml = sb.ToString();

                // Cache l?i d? gi?m t?i cho DB
                _cache.Set(cacheKey, xml, TimeSpan.FromHours(1));
            }

            return Content(xml!, "application/xml", Encoding.UTF8);
        }
    }
}




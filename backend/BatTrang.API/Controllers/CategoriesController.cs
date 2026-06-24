using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.OutputCaching;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryRepository _categoryRepo;
        private readonly AppDbContext _dbContext;

        public CategoriesController(ICategoryRepository categoryRepo, AppDbContext dbContext)
        {
            _categoryRepo = categoryRepo;
            _dbContext = dbContext;
        }

        [HttpGet]
        [AllowAnonymous]
        [OutputCache(PolicyName = "FiltersCache")]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _dbContext.Categories
                .Include(c => c.Products)
                .Include(c => c.SubCategories)
                    .ThenInclude(sc => sc.Products)
                .Where(c => c.ParentId == null) // Top-level only
                .Select(c => new CategoryDto
                {
                    Id = c.Slug,
                    NumericId = c.Id,
                    Name = c.Name,
                    Icon = c.Icon,
                    Desc = c.Description,
                    Faqs = c.Faqs,
                    ProductCount = c.Products.Count() + c.SubCategories.SelectMany(sc => sc.Products).Count(),
                    ParentId = c.ParentId,
                    SubCategories = c.SubCategories.Select(sc => new CategoryDto
                    {
                        Id = sc.Slug,
                        NumericId = sc.Id,
                        Name = sc.Name,
                        Icon = sc.Icon,
                        Desc = sc.Description,
                        Faqs = sc.Faqs,
                        ProductCount = sc.Products.Count(),
                        ParentId = sc.ParentId
                    }).ToList()
                })
                .Where(dto => dto.ProductCount > 0 || dto.SubCategories.Any())
                .OrderByDescending(dto => dto.ProductCount)
                .ToListAsync();

            return Ok(categories);
        }

        public class OldCat { public int Id {get;set;} public string Name {get;set;} public int ParentId {get;set;} }
        
        /// <summary>
        /// Endpoint sửa triệt để: 
        /// 1) Reset ALL ParentId = NULL
        /// 2) Gán ParentId trực tiếp bằng OLD ID (vì DB mới giữ nguyên old ID)
        /// 3) Gộp danh mục trùng lặp (low-ID không có products -> chuyển products sang old-ID, xóa low-ID)
        /// </summary>
        [HttpGet("migrate-old")]
        [AllowAnonymous]
        public async Task<IActionResult> MigrateOld()
        {
            // === OLD DATA: Product_Type_ID -> Product_Type_ParentID ===
            // Quy tắc: ParentId = 0 => đó là danh mục CHA (gốc). ParentId != 0 => là CON.
            var oldJson = @"[{""Id"":18706,""Name"":""Gốm sứ xây dựng"",""ParentId"":0},{""Id"":18708,""Name"":""Ấm chén men trắng"",""ParentId"":18708},{""Id"":18709,""Name"":""Qùa tặng Gốm Sứ"",""ParentId"":0},{""Id"":18710,""Name"":""Gốm Sứ gia dụng"",""ParentId"":0},{""Id"":18711,""Name"":""Gốm sứ nghệ thuật"",""ParentId"":0},{""Id"":18712,""Name"":""Tranh gốm sứ Bát Tràng"",""ParentId"":0},{""Id"":18713,""Name"":""Đồ thờ cúng men lam"",""ParentId"":0},{""Id"":18714,""Name"":""Lọ Lộc Bình"",""ParentId"":0},{""Id"":18715,""Name"":""Bộ đồ ăn Bát Tràng"",""ParentId"":0},{""Id"":18716,""Name"":""Tượng gốm sứ Bát Tràng"",""ParentId"":0},{""Id"":18718,""Name"":""Ấm chén Bát Tràng"",""ParentId"":0},{""Id"":18722,""Name"":""Ấm chén quà tặng"",""ParentId"":18718},{""Id"":18723,""Name"":""Ấm chén bọc đồng"",""ParentId"":18718},{""Id"":18727,""Name"":""Ấm chén Bát Tràng in logo"",""ParentId"":18709},{""Id"":18728,""Name"":""Bát đĩa in ảnh , in logo"",""ParentId"":18709},{""Id"":18729,""Name"":""Cốc sứ Bát Tràng in logo"",""ParentId"":18709},{""Id"":18730,""Name"":""Vòng đeo cổ , đeo tay"",""ParentId"":18709},{""Id"":18731,""Name"":""Lọ hoa in logo"",""ParentId"":18709},{""Id"":18732,""Name"":""Tranh ghép sứ"",""ParentId"":18712},{""Id"":18733,""Name"":""Tranh bộ treo tường"",""ParentId"":18712},{""Id"":18734,""Name"":""Tranh phong cảnh"",""ParentId"":18712},{""Id"":18735,""Name"":""Bát hương"",""ParentId"":18713},{""Id"":18736,""Name"":""Chóe thờ"",""ParentId"":18713},{""Id"":18737,""Name"":""Kỷ chén thờ"",""ParentId"":18713},{""Id"":18738,""Name"":""Đèn dầu thờ"",""ParentId"":18713},{""Id"":18739,""Name"":""Mâm bồng"",""ParentId"":18713},{""Id"":18740,""Name"":""Ống hương"",""ParentId"":18713},{""Id"":18742,""Name"":""Bát nắp , Bát thờ"",""ParentId"":18713},{""Id"":18743,""Name"":""Nậm rượu"",""ParentId"":18713},{""Id"":18744,""Name"":""Lọ lộc bình men lam"",""ParentId"":18714},{""Id"":18745,""Name"":""Lọ lộc bình men rạn"",""ParentId"":18714},{""Id"":18746,""Name"":""Lọ lộc bình men màu"",""ParentId"":18714},{""Id"":18747,""Name"":""Bộ đồ ăn vẽ trúc"",""ParentId"":18715},{""Id"":18748,""Name"":""Bộ đồ ăn vẽ Tùng Hạc"",""ParentId"":18715},{""Id"":18749,""Name"":""Bộ đồ ăn vẽ cảnh Hà Nội"",""ParentId"":18715},{""Id"":18750,""Name"":""Bộ đồ ăn men cổ vẽ Phượng"",""ParentId"":18715},{""Id"":18751,""Name"":""Bộ đồ ăn men cổ 100 chữ Thọ"",""ParentId"":18715},{""Id"":18752,""Name"":""Bộ đồ ăn men trắng"",""ParentId"":18715},{""Id"":18753,""Name"":""Gạch hoa"",""ParentId"":18706},{""Id"":18754,""Name"":""Gạch mosaic"",""ParentId"":18706},{""Id"":18755,""Name"":""Ngói Âm Dương"",""ParentId"":18706},{""Id"":18756,""Name"":""Lan can"",""ParentId"":18706},{""Id"":18757,""Name"":""Đèn gốm trang trí"",""ParentId"":18706},{""Id"":18758,""Name"":""Tượng Phúc Lộc Thọ"",""ParentId"":18716},{""Id"":18759,""Name"":""Tượng Quan Công"",""ParentId"":18716},{""Id"":18760,""Name"":""Bộ tượng Thập Bát La Hán"",""ParentId"":18716},{""Id"":18761,""Name"":""Tượng Khổng Minh"",""ParentId"":18716},{""Id"":18762,""Name"":""Tượng Di Lặc"",""ParentId"":18716},{""Id"":18763,""Name"":""Lọ hoa sứ sơn mài"",""ParentId"":18710},{""Id"":18764,""Name"":""Khay đựng bánh , mứt , kẹo"",""ParentId"":18710},{""Id"":18765,""Name"":""Bình đựng nước , Bình nước"",""ParentId"":18710},{""Id"":18766,""Name"":""Lọ sứ nghệ thuật"",""ParentId"":18711},{""Id"":18767,""Name"":""Lọ gốm nghệ thuật"",""ParentId"":18711},{""Id"":18768,""Name"":""Đèn xông tinh dầu"",""ParentId"":18809},{""Id"":18770,""Name"":""Đĩa cảnh"",""ParentId"":18770},{""Id"":18771,""Name"":""Lọ hoa"",""ParentId"":18713},{""Id"":18773,""Name"":""Bình sứ trang trí - phong thủy"",""ParentId"":0},{""Id"":18774,""Name"":""Đồ thờ cúng men rạn"",""ParentId"":0},{""Id"":18775,""Name"":""Bát hương"",""ParentId"":18837},{""Id"":18776,""Name"":""Chóe thờ"",""ParentId"":18837},{""Id"":18777,""Name"":""Kỷ chén thờ"",""ParentId"":18837},{""Id"":18778,""Name"":""đèn dầu thờ chân nến"",""ParentId"":18837},{""Id"":18779,""Name"":""Mâm bồng"",""ParentId"":18837},{""Id"":18780,""Name"":""Ống hương"",""ParentId"":18837},{""Id"":18782,""Name"":""Bát nắp"",""ParentId"":18837},{""Id"":18783,""Name"":""Nậm rượu"",""ParentId"":18837},{""Id"":18784,""Name"":""Lọ hoa"",""ParentId"":18837},{""Id"":18785,""Name"":""Bát thờ"",""ParentId"":18837},{""Id"":18786,""Name"":""Đỉnh sứ"",""ParentId"":18837},{""Id"":18787,""Name"":""Đài thờ"",""ParentId"":18837},{""Id"":18788,""Name"":""Tượng Lỗ Trí Thâm"",""ParentId"":18716},{""Id"":18789,""Name"":""Tượng Thần Tài"",""ParentId"":18716},{""Id"":18790,""Name"":""Tượng gốm sứ khác"",""ParentId"":18716},{""Id"":18791,""Name"":""Nghê sứ Bát Tràng"",""ParentId"":18716},{""Id"":18792,""Name"":""Lọ Lộc Bình men bóng"",""ParentId"":18714},{""Id"":18793,""Name"":""Đặc sản Bát Tràng"",""ParentId"":0},{""Id"":18794,""Name"":""Sản phẩm gốm sứ khác"",""ParentId"":0},{""Id"":18795,""Name"":""Khay đựng ấm chén"",""ParentId"":18718},{""Id"":18797,""Name"":""Ấm tích pha trà xanh"",""ParentId"":18718},{""Id"":18798,""Name"":""Điếu bát"",""ParentId"":18718},{""Id"":18799,""Name"":""Bình sứ trang trí"",""ParentId"":18773},{""Id"":18800,""Name"":""Tiểu lộc bình"",""ParentId"":18714},{""Id"":18801,""Name"":""Cóng chim"",""ParentId"":18794},{""Id"":18804,""Name"":""Đĩa cảnh"",""ParentId"":18770},{""Id"":18805,""Name"":""Ấm chén cao cấp"",""ParentId"":18718},{""Id"":18806,""Name"":""Chóe Bát Tràng"",""ParentId"":18773},{""Id"":18807,""Name"":""Quách tiểu sứ"",""ParentId"":0},{""Id"":18808,""Name"":""Bình ngâm rượu"",""ParentId"":18710},{""Id"":18809,""Name"":""Đèn sứ thấu quang"",""ParentId"":0},{""Id"":18810,""Name"":""Đèn trưng bày cao cấp"",""ParentId"":18809},{""Id"":18811,""Name"":""Bình hút tài lộc"",""ParentId"":18773},{""Id"":18812,""Name"":""Trứng phong thủy"",""ParentId"":18773},{""Id"":18813,""Name"":""Lộc bình đắp nổi men rạn"",""ParentId"":18714},{""Id"":18814,""Name"":""Phong thủy xe hơi"",""ParentId"":0},{""Id"":18816,""Name"":""Kìm nóc, Đao"",""ParentId"":18706},{""Id"":18817,""Name"":""Sen, Bóng"",""ParentId"":18706},{""Id"":18818,""Name"":""Rồng, Phượng"",""ParentId"":18706},{""Id"":18819,""Name"":""Nghê"",""ParentId"":18706},{""Id"":18821,""Name"":""Ngói đất nung"",""ParentId"":18706},{""Id"":18822,""Name"":""Ngói lợp"",""ParentId"":18706},{""Id"":18823,""Name"":""Bộ đồ thờ đầy đủ"",""ParentId"":18774},{""Id"":18824,""Name"":""Đèn phòng ngủ"",""ParentId"":18809},{""Id"":18825,""Name"":""Hũ sành đựng gạo"",""ParentId"":18710},{""Id"":18826,""Name"":""Bộ đồ thờ Âu Lạc"",""ParentId"":18774},{""Id"":18827,""Name"":""Gốm sứ vẽ vàng"",""ParentId"":0},{""Id"":18828,""Name"":""Đỉnh thờ"",""ParentId"":18713},{""Id"":18829,""Name"":""Bộ Bát Đĩa Nhà Hàng"",""ParentId"":0},{""Id"":18830,""Name"":""Bộ đồ thờ dát vàng"",""ParentId"":18774},{""Id"":18831,""Name"":""Tranh gốm"",""ParentId"":18712},{""Id"":18832,""Name"":""Tranh ghép gốm"",""ParentId"":18712},{""Id"":18833,""Name"":""Bát đĩa nhà hàng"",""ParentId"":18715},{""Id"":18834,""Name"":""Bộ đồ thờ men lam vuốt tay"",""ParentId"":18713},{""Id"":18835,""Name"":""Bộ đồ thờ men rạn vẽ rồng"",""ParentId"":18774},{""Id"":18836,""Name"":""Bộ đồ thờ men rạn vẽ hoa sen"",""ParentId"":18774},{""Id"":18837,""Name"":""Bộ đồ thờ Phúc Mãn Đường"",""ParentId"":18774},{""Id"":18838,""Name"":""Bộ đồ thờ thần tài"",""ParentId"":18774},{""Id"":18839,""Name"":""Bia mộ bằng sứ"",""ParentId"":18807},{""Id"":18840,""Name"":""Bộ đồ thờ đầy đủ"",""ParentId"":18713},{""Id"":18841,""Name"":""Bộ bát đĩa gia đình"",""ParentId"":18715},{""Id"":18842,""Name"":""Đĩa cảnh trưng bày"",""ParentId"":18773},{""Id"":18843,""Name"":""Gốm sứ sơn mài"",""ParentId"":0},{""Id"":18844,""Name"":""Lọ cắm hoa"",""ParentId"":18773},{""Id"":18845,""Name"":""Cốc uống nước"",""ParentId"":18710},{""Id"":18846,""Name"":""Bộ đồ thờ Phúc Gia Tiên"",""ParentId"":18774}]";
            var oldList = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<OldCat>>(oldJson);
            
            // Tập hợp tất cả OLD ID
            var oldIds = new System.Collections.Generic.HashSet<int>(oldList!.Select(o => o.Id));
            
            // ========== BƯỚC 1: Reset ALL ParentId về NULL ==========
            await _dbContext.Database.ExecuteSqlRawAsync("UPDATE Categories SET ParentId = NULL");
            
            // ========== BƯỚC 2: Gộp danh mục trùng lặp ==========
            // Tìm các danh mục LOW-ID (tạo tay) trùng tên với danh mục OLD-ID (import từ DB cũ)
            // Chuyển products từ LOW-ID sang OLD-ID, rồi xóa LOW-ID
            var allCats = await _dbContext.Categories.ToListAsync();
            var grouped = allCats.GroupBy(c => c.Name.Trim().ToLower()).Where(g => g.Count() > 1);
            int merged = 0;
            
            foreach (var group in grouped) {
                var items = group.ToList();
                // Ưu tiên giữ bản OLD-ID (từ DB cũ), vì nó khớp với cấu trúc cây cha-con
                var oldIdItem = items.FirstOrDefault(c => oldIds.Contains(c.Id));
                if (oldIdItem == null) continue; // Không có bản old-ID -> bỏ qua
                
                foreach (var dup in items.Where(c => c.Id != oldIdItem.Id)) {
                    // Chuyển tất cả products từ bản trùng sang bản OLD-ID
                    await _dbContext.Database.ExecuteSqlRawAsync(
                        $"UPDATE Products SET CategoryId = {oldIdItem.Id} WHERE CategoryId = {dup.Id}");
                    // Xóa bản trùng
                    await _dbContext.Database.ExecuteSqlRawAsync(
                        $"DELETE FROM Categories WHERE Id = {dup.Id}");
                    merged++;
                }
            }
            
            // ========== BƯỚC 3: Gán ParentId TRỰC TIẾP bằng OLD ID ==========
            // Vì DB mới giữ nguyên Old ID, ta dùng thẳng old.ParentId làm FK
            int parentSet = 0;
            foreach(var old in oldList!) {
                // ParentId = 0 => danh mục GỐC, không cần gán parent
                // ParentId = Id => tự tham chiếu (lỗi dữ liệu cũ), bỏ qua
                if (old.ParentId != 0 && old.ParentId != old.Id) {
                    var result = await _dbContext.Database.ExecuteSqlRawAsync(
                        $"UPDATE Categories SET ParentId = {old.ParentId} WHERE Id = {old.Id}");
                    parentSet += result;
                }
            }

            return Ok(new { 
                message = $"Hoàn tất! Đã gộp {merged} danh mục trùng, gán parent cho {parentSet} danh mục con.",
                merged = merged,
                parentSet = parentSet
            });
        }

        private string GenerateSlug(string text) {
            string str = text.ToLower().Trim();
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[áàảãạăắằẳẵặâấầẩẫậ]", "a");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[đ]", "d");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[éèẻẽẹêếềểễệ]", "e");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[íìỉĩị]", "i");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[óòỏõọôốồổỗộơớờởỡợ]", "o");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[úùủũụưứừửữự]", "u");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[ýỳỷỹỵ]", "y");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[^a-z0-9\s-]", "");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"\s+", "-").Trim('-');
            return str;
        }
    }
}

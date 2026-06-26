using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Seed
{
    public static class DataSeeder
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            await context.Database.MigrateAsync();

            var defaultAdmin = await context.AdminUsers.FirstOrDefaultAsync(u => u.Username == "admin");
            if (defaultAdmin == null)
            {
                var allAdmins = context.AdminUsers.ToList();
                if (allAdmins.Any())
                {
                    context.AdminUsers.RemoveRange(allAdmins);
                }

                await context.AdminUsers.AddAsync(new AdminUser
                {
                    Name = "Admin Phúc Gia Tiên",
                    Username = "admin",
                    Password = BCrypt.Net.BCrypt.HashPassword("admin"),
                    Role = "admin"
                });
                await context.SaveChangesAsync();
            }
            else
            {
                bool needsSave = false;
                
                // Update password to Hash if it's currently plaintext (BCrypt hash starts with $2)
                if (!string.IsNullOrEmpty(defaultAdmin.Password) && !defaultAdmin.Password.StartsWith("$2"))
                {
                    defaultAdmin.Password = BCrypt.Net.BCrypt.HashPassword(defaultAdmin.Password);
                    needsSave = true;
                }

                if (string.IsNullOrEmpty(defaultAdmin.Role) || defaultAdmin.Role != "admin")
                {
                    defaultAdmin.Role = "admin";
                    needsSave = true;
                }
                
                if (needsSave)
                {
                    await context.SaveChangesAsync();
                }
            }

            if (!context.Categories.Any())
            {
                var categories = new List<Category>
                {
                    new Category { Slug = "loc-binh", Name = "Lộc Bình", Icon = "🏺", Description = "Lộc bình gốm sứ các loại" },
                    new Category { Slug = "do-tho", Name = "Đồ Thờ", Icon = "🪔", Description = "Đồ thờ, bát hương, chân đèn" },
                    new Category { Slug = "tranh-gom", Name = "Tranh Gốm", Icon = "🖼️", Description = "Tranh gốm nghệ thuật vẽ tay" },
                    new Category { Slug = "binh-hoa", Name = "Bình Hoa", Icon = "🌸", Description = "Bình hoa trang trí" },
                    new Category { Slug = "chum-vat", Name = "Chum – Vạt", Icon = "🫙", Description = "Chum, vại ngâm rượu" },
                    new Category { Slug = "dia-gom", Name = "Đĩa Gốm", Icon = "🍽️", Description = "Đĩa gốm trang trí, phong thuỷ" }
                };
                await context.Categories.AddRangeAsync(categories);
                await context.SaveChangesAsync();
            }

            if (!context.Sizes.Any())
            {
                var sizes = new List<Size>
                {
                    new Size { Name = "1.6m", ValueInCm = 160 },
                    new Size { Name = "1.2m", ValueInCm = 120 },
                    new Size { Name = "1.0m", ValueInCm = 100 },
                    new Size { Name = "60x90cm", ValueInCm = 90 },
                    new Size { Name = "Bộ 5 món", ValueInCm = 0 },
                    new Size { Name = "60cm", ValueInCm = 60 },
                    new Size { Name = "20 lít", ValueInCm = 0 },
                    new Size { Name = "40cm", ValueInCm = 40 }
                };
                await context.Sizes.AddRangeAsync(sizes);
                await context.SaveChangesAsync();
            }

            if (!context.Products.Any())
            {
                var locBinh = await context.Categories.FirstAsync(c => c.Slug == "loc-binh");
                var tranhGom = await context.Categories.FirstAsync(c => c.Slug == "tranh-gom");
                var doTho = await context.Categories.FirstAsync(c => c.Slug == "do-tho");
                var binhHoa = await context.Categories.FirstAsync(c => c.Slug == "binh-hoa");
                var chumVat = await context.Categories.FirstAsync(c => c.Slug == "chum-vat");
                var diaGom = await context.Categories.FirstAsync(c => c.Slug == "dia-gom");
                
                var size160 = await context.Sizes.FirstAsync(s => s.Name == "1.6m");
                var size120 = await context.Sizes.FirstAsync(s => s.Name == "1.2m");
                var size100 = await context.Sizes.FirstAsync(s => s.Name == "1.0m");
                var size60x90 = await context.Sizes.FirstAsync(s => s.Name == "60x90cm");
                var sizeBo5Mon = await context.Sizes.FirstAsync(s => s.Name == "Bộ 5 món");
                var size60 = await context.Sizes.FirstAsync(s => s.Name == "60cm");
                var size20l = await context.Sizes.FirstAsync(s => s.Name == "20 lít");
                var size40 = await context.Sizes.FirstAsync(s => s.Name == "40cm");

                var products = new List<Product>
                {
                    new Product { Name = "Lộc Bình Vẽ Tay 1M6", Slug = "loc-binh-ve-tay-1m6", CategoryId = locBinh.Id, Status = "active", MarketingBadges = "Nổi bật", Description = "Lộc bình vẽ tay 1M6 thuộc chất liệu gốm sứ cao cấp, qua tay nghệ nhân thủ công với hàng chục năm kinh nghiệm...", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size160.Id, Price = 40000000, Stock = 5, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-1-1.jpg", SortOrder = 1 }, new ProductImage { ImageUrl = "assets/images/product-1-2.jpg", SortOrder = 2 } } } } },
                    new Product { Name = "Lộc Bình Men Rạn", Slug = "loc-binh-men-ran", CategoryId = locBinh.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size120.Id, Price = 33000000, Stock = 8, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-2-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Lộc Bình Trổ", Slug = "loc-binh-tro", CategoryId = locBinh.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size100.Id, Price = 26000000, Stock = 3, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-3-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Tranh Gốm Phúc Lộc Thọ", Slug = "tranh-gom-phuc-loc-tho", CategoryId = tranhGom.Id, Status = "active", MarketingBadges = "Hot", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size60x90.Id, Price = 22808000, Stock = 12, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-4-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Bộ Đồ Thờ Cao Cấp", Slug = "bo-do-tho-cao-cap", CategoryId = doTho.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = sizeBo5Mon.Id, Price = 15000000, Stock = 7, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-5-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Bình Hút Lộc", Slug = "binh-hut-loc", CategoryId = binhHoa.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size60.Id, Price = 12000000, Stock = 15, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-6-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Chum Ngâm Rượu", Slug = "chum-ngam-ruou", CategoryId = chumVat.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size20l.Id, Price = 9500000, Stock = 6, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-7-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Đĩa Gốm Phong Thuỷ", Slug = "dia-gom-phong-thuy", CategoryId = diaGom.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size40.Id, Price = 8000000, Stock = 10, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-8-1.jpg", SortOrder = 1 } } } } }
                };
                await context.Products.AddRangeAsync(products);
                await context.SaveChangesAsync();
            }

            if (!context.Customers.Any())
            {
                var customers = new List<Customer>
                {
                    new Customer { Name = "Nguyễn Văn An", Email = "an@gmail.com", Phone = "0912345678", Address = "123 Lê Lợi, Q.1, TP.HCM", JoinedAt = new DateTime(2025, 8, 10, 0, 0, 0, DateTimeKind.Utc) },
                    new Customer { Name = "Trần Thị Bình", Email = "binh@gmail.com", Phone = "0987654321", Address = "45 Trần Phú, Q.Hải Châu, Đà Nẵng", JoinedAt = new DateTime(2025, 9, 22, 0, 0, 0, DateTimeKind.Utc) }
                };
                await context.Customers.AddRangeAsync(customers);
                await context.SaveChangesAsync();
            }

            if (!context.Orders.Any())
            {
                var order1 = new Order
                {
                    OrderCode = "DH001",
                    CustomerName = "Nguyễn Văn An",
                    CustomerPhone = "0912345678",
                    CustomerEmail = "an@gmail.com",
                    Address = "123 Lê Lợi, Q.1, TP.HCM",
                    Total = 40000000,
                    Status = "completed",
                    CreatedAt = new DateTime(2026, 5, 20, 0, 0, 0, DateTimeKind.Utc),
                    Items = new List<OrderItem>
                    {
                        new OrderItem { ProductName = "Lộc Bình Vẽ Tay 1M6", UnitPrice = 40000000, Quantity = 1, ProductId = 1 }
                    }
                };
                
                var order2 = new Order
                {
                    OrderCode = "DH002",
                    CustomerName = "Trần Thị Bình",
                    CustomerPhone = "0987654321",
                    CustomerEmail = "binh@gmail.com",
                    Address = "45 Trần Phú, Q.Hải Châu, Đà Nẵng",
                    Total = 39000000,
                    Status = "shipping",
                    CustomerNote = "Giao giờ hành chính",
                    CreatedAt = new DateTime(2026, 5, 20, 0, 0, 0, DateTimeKind.Utc),
                    Items = new List<OrderItem>
                    {
                        new OrderItem { ProductName = "Bộ Đồ Thờ Cao Cấp", UnitPrice = 15000000, Quantity = 1, ProductId = 5 },
                        new OrderItem { ProductName = "Bình Hút Lộc", UnitPrice = 12000000, Quantity = 2, ProductId = 6 }
                    }
                };

                await context.Orders.AddRangeAsync(new[] { order1, order2 });
                await context.SaveChangesAsync();
            }

            if (!context.JourneyTopics.Any())
            {
                var topic1 = new JourneyTopic { Slug = "xay-dung", Name = "Quá Trình Xây Dựng" };
                var topic2 = new JourneyTopic { Slug = "hau-truong", Name = "Hậu Trường Xưởng Gốm" };
                var topic3 = new JourneyTopic { Slug = "cau-chuyen", Name = "Câu Chuyện Nghệ Nhân" };

                await context.JourneyTopics.AddRangeAsync(new[] { topic1, topic2, topic3 });
                await context.SaveChangesAsync();

                var videos = new List<JourneyVideo>
                {
                    new JourneyVideo { TopicId = topic1.Id, Title = "Khởi công xây dựng lò nung gốm truyền thống", Url = "https://www.youtube.com/embed/zR7-eH01WFM", Duration = "03:45", Thumbnail = "assets/images/home_bg.jpeg" },
                    new JourneyVideo { TopicId = topic2.Id, Title = "Kỹ thuật vuốt vẽ bình hoa sen nghệ thuật", Url = "https://www.youtube.com/embed/zR7-eH01WFM", Duration = "05:12", Thumbnail = "assets/images/about-workshop.jpg" },
                    new JourneyVideo { TopicId = topic3.Id, Title = "Tâm sự làm nghề gốm sứ truyền đời Bát Tràng", Url = "https://www.youtube.com/embed/zR7-eH01WFM", Duration = "08:30", Thumbnail = "assets/images/journey-hero.jpg" }
                };
                await context.JourneyVideos.AddRangeAsync(videos);
                await context.SaveChangesAsync();
            }

            if (!context.CommissionPolicies.Any())
            {
                var policies = new List<CommissionPolicy>
                {
                    new CommissionPolicy { Tier = "All", Percentage = 10, IsActive = true }
                };
                await context.CommissionPolicies.AddRangeAsync(policies);
                await context.SaveChangesAsync();
            }

            if (!context.SiteConfigs.Any())
            {
                var siteConfigs = new List<SiteConfig>
                {
                    new SiteConfig { Key = "storeName", Value = "Phúc Gia Tiên – Gốm Sứ Thủ Công Bát Tràng" },
                    new SiteConfig { Key = "slogan", Value = "Tinh hoa gốm sứ Bát Tràng truyền đời" },
                    new SiteConfig { Key = "phone", Value = "0986 123 456" },
                    new SiteConfig { Key = "email", Value = "phucgatien@gmail.com" },
                    new SiteConfig { Key = "address", Value = "Thôn Bát Tràng, Xã Bát Tràng, Huyện Gia Lâm, Hà Nội" },
                    new SiteConfig { Key = "facebook", Value = "https://facebook.com/phucgatien" },
                    new SiteConfig { Key = "youtube", Value = "https://youtube.com/@phucgatien" },
                    new SiteConfig { Key = "tiktok", Value = "https://tiktok.com/@phucgatien" },
                    new SiteConfig { Key = "zalo", Value = "https://zalo.me/0986123456" },
                    new SiteConfig { Key = "messenger", Value = "https://m.me/phucgatien" },
                    new SiteConfig { Key = "shipFee", Value = "0" },
                    new SiteConfig { Key = "shipMin", Value = "5000000" },
                    new SiteConfig { Key = "shipDays", Value = "3-7 ngày" },
                    new SiteConfig { Key = "shipArea", Value = "Toàn quốc" },
                    new SiteConfig { Key = "logoUrl", Value = "assets/images/logo.png" },
                    new SiteConfig { Key = "homeBanner", Value = "assets/images/home_bg.jpeg" },
                    new SiteConfig { Key = "ctaBanner", Value = "assets/images/bg.jpeg" },
                    new SiteConfig { Key = "pageBanner", Value = "assets/images/journey-hero.jpg" },
                    new SiteConfig { Key = "productsBanner", Value = "assets/images/products-banner.jpg" },
                    new SiteConfig { Key = "journeyBanner", Value = "assets/images/journey-hero.jpg" },
                    new SiteConfig { Key = "aboutBanner", Value = "assets/images/about-hero.jpg" },
                    new SiteConfig { Key = "contactBanner", Value = "assets/images/contact-hero.jpg" },
                    new SiteConfig { Key = "homeStoryImg", Value = "assets/images/story-couple.jpg" },
                    new SiteConfig { Key = "aboutStoryImg", Value = "assets/images/about-workshop.jpg" },
                    new SiteConfig { Key = "teamAvatar1", Value = "assets/images/team-husband.jpg" },
                    new SiteConfig { Key = "teamAvatar2", Value = "assets/images/team-wife.jpg" },
                    new SiteConfig { Key = "workingHours", Value = "08:00 - 18:00 (Từ Thứ 2 - Chủ Nhật)" },
                    new SiteConfig { Key = "mapIframe", Value = """<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3725.564539824403!2d105.93206497607736!3d20.969992790299602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135aef2f534125b%3A0xe54e3d3b76ca40c3!2zUGjDumMgR2lhIFRpw6puIC0gR-G7kW0gU-G7qyBCw6F0IFRyw6BuZw!5e0!3m2!1svi!2s!4v1716260000000!5m2!1svi!2s" width="100%" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>""" },
                    new SiteConfig { Key = "homeStoryQuote", Value = "" },
                    new SiteConfig { Key = "homeStoryText", Value = "Chúng tôi bắt đầu từ con số 0. Tự tay học nghề, tự làm, tự thất bại và đứng dậy. Phúc Gia Tiên không chỉ làm gốm, chúng tôi tạo ra giá trị để truyền lại cho thế hệ sau." },
                    new SiteConfig { Key = "process1Title", Value = "1. Chuẩn bị đất" },
                    new SiteConfig { Key = "process1Desc", Value = "Chọn lựa và nhào đất sét Bát Tràng đúng độ dẻo" },
                    new SiteConfig { Key = "process2Title", Value = "2. Tạo hình" },
                    new SiteConfig { Key = "process2Desc", Value = "Vuốt đất trên bàn xoay bằng đôi bàn tay điêu luyện" },
                    new SiteConfig { Key = "process3Title", Value = "3. Vẽ tay" },
                    new SiteConfig { Key = "process3Desc", Value = "Trang trí hoa văn truyền thống bằng bút lông thủ công" },
                    new SiteConfig { Key = "process4Title", Value = "4. Nung lò" },
                    new SiteConfig { Key = "process4Desc", Value = "Nung ở nhiệt độ 1.280°C trong lò truyền thống" },
                    new SiteConfig { Key = "process5Title", Value = "5. Hoàn thiện" },
                    new SiteConfig { Key = "process5Desc", Value = "Kiểm tra, đánh bóng và đóng gói tác phẩm hoàn hảo" },
                    new SiteConfig { Key = "aboutStoryHtml", Value = """
<div class="about-story__header">
<span class="about-label">Câu Chuyện Của Chúng Tôi</span>
<h2 id="about-story-heading" class="about-heading">Nơi Đất Sét Kể<br>Những Câu Chuyện Bằng <em>Lửa</em></h2>
<p class="about-header-desc">Phúc Gia Tiên không chỉ bán gốm – chúng tôi gìn giữ hồn cốt của làng nghề 700 năm tuổi Bát Tràng và mang giá trị truyền thống vào cuộc sống hiện đại.</p>
</div>
<div class="about-stats-bar">
<div class="stat-item"><span class="stat-item__number js-config-stat-years">5+</span><span class="stat-item__label">Năm kinh nghiệm</span></div>
<div class="stat-item"><span class="stat-item__number js-config-stat-products">2000+</span><span class="stat-item__label">Sản phẩm đã bán</span></div>
<div class="stat-item"><span class="stat-item__number js-config-stat-customers">800+</span><span class="stat-item__label">Khách hàng tin tưởng</span></div>
</div>
<h3 class="about-subheading">Khởi Nguồn Từ Đam Mê</h3>
<p class="about-body-text">Năm 2018, giữa những con phố nhỏ của làng gốm Bát Tràng, hai vợ chồng chúng tôi bắt đầu hành trình từ con số 0. Không có xưởng lớn, không có máy móc hiện đại — chỉ có đôi bàn tay, bàn xoay thủ công và một tình yêu mãnh liệt với nghề gốm truyền thống. Những ngày đầu, chúng tôi học nhào đất từ 4 giờ sáng, thức đến khuya canh lò nung, và dành cả ngày nghiên cứu phối men sao cho mỗi lớp men khi ra lò đều óng ánh như ngọc.</p>
<figure class="about-story__image"><img src="assets/images/about-workshop.png" alt="Bên trong xưởng gốm Phúc Gia Tiên – nơi mỗi sản phẩm được tạo hình bằng tay" loading="lazy"><figcaption>Xưởng gốm Phúc Gia Tiên — nơi mỗi sản phẩm được tạo hình bằng đôi bàn tay nghệ nhân</figcaption></figure>
<blockquote class="about-quote">"Mỗi chiếc bình gốm mang trong mình hơi thở của đất, sức nóng của lửa, và tâm huyết của người thợ. Đó không phải là sản phẩm — đó là một tác phẩm nghệ thuật."</blockquote>
<h3 class="about-subheading">Nghệ Thuật Trong Từng Nét Vẽ</h3>
<p class="about-body-text">Tại Phúc Gia Tiên, mỗi sản phẩm đều trải qua hành trình sáng tạo kéo dài từ 7 đến 30 ngày. Từ khâu chọn đất sét tự nhiên vùng Bát Tràng, nhào nặn trên bàn xoay truyền thống, đến việc vẽ tay từng họa tiết hoa văn cổ truyền — tất cả đều được thực hiện bởi đôi tay nghệ nhân có hơn 6 năm kinh nghiệm. Sản phẩm sau đó được tráng men cao cấp và nung trong lò gạch truyền thống ở nhiệt độ 1.200°C trong suốt 36 giờ, tạo nên lớp men bóng mịn, bền vĩnh cửu.</p>
<figure class="about-story__image"><img src="assets/images/about-craftsman.png" alt="Nghệ nhân vẽ tay họa tiết truyền thống lên bình gốm" loading="lazy"><figcaption>Từng nét vẽ là sự kết hợp giữa truyền thống và cảm hứng sáng tạo đương đại</figcaption></figure>
<h3 class="about-subheading">Sứ Mệnh Gìn Giữ Di Sản</h3>
<p class="about-body-text">Chúng tôi tin rằng gốm sứ Bát Tràng xứng đến được biết đến nhiều hơn — không chỉ ở Việt Nam mà trên toàn thế giới. Phúc Gia Tiên đặt mục tiêu trở thành cầu nối giữa nghệ thủ công truyền thống và thị trường hiện đại, mang đến cho khách hàng những sản phẩm vừa giàu trọn hồn cốt làng nghề, vừa phù hợp với thẩm mỹ đương đại. Mỗi sản phẩm ra đời từ xưởng của chúng tôi là một câu chuyện được kể bằng đất, lửa và tâm huyết.</p>
""" },
                    new SiteConfig { Key = "coreValue1Title", Value = "100% Thủ Công" },

                    new SiteConfig { Key = "coreValue1Desc", Value = "Mọi sản phẩm đều được tạo hình, vẽ họa tiết và tráng men hoàn toàn bằng tay — không có hai sản phẩm nào giống nhau." },
                    new SiteConfig { Key = "coreValue2Title", Value = "Nung Lò Truyền Thống" },
                    new SiteConfig { Key = "coreValue2Desc", Value = "Sử dụng lò gạch truyền thống Bát Tràng, nung ở 1.200°C trong 36 giờ cho lớp men bền đẹp vĩnh cửu." },
                    new SiteConfig { Key = "coreValue3Title", Value = "Đóng Gói An Toàn" },
                    new SiteConfig { Key = "coreValue3Desc", Value = "Đóng gói 5 lớp chuyên dụng, cam kết đền bù 100% nếu sản phẩm bị hư hỏng trong quá trình vận chuyển." },
                    new SiteConfig { Key = "coreValue4Title", Value = "Hỗ Trợ Tận Tâm" },
                    new SiteConfig { Key = "coreValue4Desc", Value = "Đội ngũ tư vấn sẵn sàng hỗ trợ 24/7. Chính sách đổi trả minh bạch trong 7 ngày cho mọi sản phẩm." },
                    new SiteConfig { Key = "teamName1", Value = "Nguyễn Văn Phúc" },
                    new SiteConfig { Key = "teamRole1", Value = "Nghệ Nhân Tạo Hình" },
                    new SiteConfig { Key = "teamBio1", Value = "Hơn 6 năm gắn bó với bàn xoay và lò nung. Anh Phúc chuyên tạo hình các sản phẩm lớn như lộc bình, chum gốm — mỗi đường cong đều chính xác đến từng milimet." },
                    new SiteConfig { Key = "teamName2", Value = "Lê Thị Tiên" },
                    new SiteConfig { Key = "teamRole2", Value = "Nghệ Nhân Vẽ & Sáng Tạo" },
                    new SiteConfig { Key = "teamBio2", Value = "Người thổi hồn vào đất sét qua từng nét vẽ. Chị Tiên sáng tạo các mẫu họa tiết kết hợp giữa hoa văn cổ truyền Việt Nam và phong cách tối giản hiện đại." }
                };
                await context.SiteConfigs.AddRangeAsync(siteConfigs);
                await context.SaveChangesAsync();
            }

            // ── Upsert 5 policy keys (chạy mỗi lần app khởi động để đảm bảo nội dung luôn có) ──
            var policyDefaults = new System.Collections.Generic.Dictionary<string, string>
            {
                ["policyPrivacy"] = """
<h2>CHÍNH SÁCH BẢO MẬT THÔNG TIN</h2>
<p><em>Cập nhật lần cuối: tháng 6 năm 2026</em></p>
<p>Phúc Gia Tiên – Gốm Sứ Thủ Công Bát Tràng (<strong>"chúng tôi"</strong>) cam kết bảo vệ quyền riêng tư và thông tin cá nhân của Quý khách hàng (<strong>"bạn"</strong>) theo đúng quy định của pháp luật Việt Nam, bao gồm Luật An toàn Thông tin Mạng 2015, Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và Luật Bảo vệ quyền lợi người tiêu dùng 2023.</p>

<h3>1. THÔNG TIN CHÚNG TÔI THU THẬP</h3>
<p>Khi bạn mua hàng hoặc tương tác với website, chúng tôi có thể thu thập các thông tin sau:</p>
<ul>
  <li><strong>Thông tin nhận dạng:</strong> Họ tên, số điện thoại, địa chỉ email.</li>
  <li><strong>Thông tin giao hàng:</strong> Địa chỉ nhà hoặc nơi làm việc, ghi chú giao hàng.</li>
  <li><strong>Thông tin giao dịch:</strong> Lịch sử đơn hàng, phương thức thanh toán (chúng tôi <strong>không</strong> lưu trữ số thẻ ngân hàng đầy đủ).</li>
  <li><strong>Thông tin kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt, thiết bị sử dụng (thu thập ẩn danh qua cookie để cải thiện trải nghiệm).</li>
</ul>

<h3>2. CƠ SỞ PHÁP LÝ XỬ LÝ DỮ LIỆU</h3>
<p>Theo Nghị định 13/2023/NĐ-CP, chúng tôi xử lý dữ liệu cá nhân của bạn dựa trên các cơ sở pháp lý sau:</p>
<ul>
  <li><strong>Thực hiện hợp đồng:</strong> Thu thập thông tin giao hàng và thanh toán để thực hiện hợp đồng mua bán hàng hóa giữa bạn và Phúc Gia Tiên.</li>
  <li><strong>Sự đồng ý của chủ thể dữ liệu:</strong> Gửi thông tin khuyến mãi, sản phẩm mới chỉ khi bạn chủ động đồng ý nhận.</li>
  <li><strong>Nghĩa vụ pháp lý:</strong> Lưu trữ hóa đơn và thông tin giao dịch theo quy định của Luật Kế toán và các văn bản pháp luật liên quan.</li>
  <li><strong>Lợi ích hợp pháp:</strong> Cải thiện chất lượng dịch vụ, phòng chống gian lận và bảo vệ an ninh hệ thống.</li>
</ul>

<h3>3. MỤC ĐÍCH SỬ DỤNG THÔNG TIN</h3>
<p>Thông tin của bạn được sử dụng cho các mục đích sau:</p>
<ul>
  <li>Xử lý và giao đơn hàng đến địa chỉ bạn cung cấp.</li>
  <li>Liên lạc xác nhận đơn hàng, cập nhật tình trạng vận chuyển và hỗ trợ sau mua.</li>
  <li>Gửi thông tin khuyến mãi và sản phẩm mới (chỉ khi bạn đồng ý nhận).</li>
  <li>Cải thiện chất lượng dịch vụ và trải nghiệm mua sắm trên website.</li>
  <li>Tuân thủ các nghĩa vụ pháp lý khi cần thiết.</li>
</ul>

<h3>4. BẢO MẬT VÀ LƯU TRỮ DỮ LIỆU</h3>
<p>Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu cá nhân của bạn:</p>
<ul>
  <li>Dữ liệu được mã hoá bằng giao thức HTTPS (TLS) trong quá trình truyền tải.</li>
  <li>Hệ thống cơ sở dữ liệu được bảo vệ bởi tường lửa và kiểm soát quyền truy cập nghiêm ngặt.</li>
  <li>Thông tin cá nhân của bạn <strong>không được bán, cho thuê hay chia sẻ</strong> với bên thứ ba vì mục đích thương mại, ngoại trừ đơn vị vận chuyển cần biết địa chỉ giao hàng.</li>
  <li>Dữ liệu được lưu giữ trong thời gian cần thiết để cung cấp dịch vụ và tuân thủ quy định pháp luật (tối thiểu 5 năm theo quy định về lưu trữ hóa đơn thương mại).</li>
</ul>

<h3>5. QUYỀN CỦA BẠN ĐỐI VỚI DỮ LIỆU CÁ NHÂN</h3>
<p>Theo Nghị định 13/2023/NĐ-CP (Điều 9), bạn có các quyền sau liên quan đến dữ liệu cá nhân:</p>
<ul>
  <li><strong>Quyền biết:</strong> Được thông báo về việc thu thập và xử lý dữ liệu cá nhân của mình.</li>
  <li><strong>Quyền đồng ý/rút đồng ý:</strong> Đồng ý hoặc không đồng ý cho phép xử lý dữ liệu. Bạn có quyền rút lại sự đồng ý bất kỳ lúc nào.</li>
  <li><strong>Quyền truy cập:</strong> Yêu cầu chúng tôi cung cấp bản sao dữ liệu cá nhân chúng tôi đang lưu giữ.</li>
  <li><strong>Quyền chỉnh sửa:</strong> Yêu cầu cập nhật, sửa đổi thông tin cá nhân không chính xác.</li>
  <li><strong>Quyền xóa:</strong> Yêu cầu xóa dữ liệu cá nhân trong các trường hợp pháp luật cho phép.</li>
  <li><strong>Quyền hạn chế xử lý:</strong> Yêu cầu tạm dừng xử lý dữ liệu trong khi giải quyết khiếu nại.</li>
  <li><strong>Quyền khiếu nại:</strong> Nếu quyền bảo vệ dữ liệu cá nhân của bạn bị vi phạm, bạn có quyền khiếu nại lên <strong>Cục An ninh mạng và Phòng, chống tội phạm sử dụng công nghệ cao – Bộ Công an</strong> theo quy định tại Nghị định 13/2023/NĐ-CP.</li>
</ul>
<p>Để thực hiện các quyền trên, vui lòng liên hệ qua email <strong>phucgatien@gmail.com</strong> hoặc gọi <strong>0986 123 456</strong>. Chúng tôi cam kết phản hồi yêu cầu của bạn trong vòng <strong>72 giờ</strong> kể từ khi nhận được yêu cầu hợp lệ, theo đúng quy định tại Nghị định 13/2023/NĐ-CP.</p>

<h3>6. COOKIE VÀ CÔNG NGHỆ THEO DÕI</h3>
<p>Website sử dụng cookie phiên (session cookie) để duy trì giỏ hàng và trạng thái đăng nhập của bạn. Chúng tôi không sử dụng cookie theo dõi hành vi quảng cáo từ bên thứ ba. Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng của website có thể bị ảnh hưởng.</p>

<h3>7. LIÊN KẾT BÊN THỨ BA</h3>
<p>Website có thể chứa liên kết đến các trang mạng xã hội (Facebook, Zalo, TikTok). Khi bạn truy cập các trang này, chính sách bảo mật của họ sẽ áp dụng, không phải chính sách của chúng tôi.</p>

<h3>8. THAY ĐỔI CHÍNH SÁCH</h3>
<p>Chúng tôi có quyền cập nhật chính sách này để phù hợp với thay đổi của pháp luật hoặc hoạt động kinh doanh. Phiên bản mới sẽ được đăng tải trên website và có hiệu lực từ ngày đăng.</p>

<h3>9. LIÊN HỆ</h3>
<p>Nếu bạn có bất kỳ thắc mắc nào về chính sách bảo mật, vui lòng liên hệ:</p>
<ul>
  <li><strong>Đơn vị quản lý:</strong> Hộ Kinh Doanh Phúc Gia Tiên</li>
  <li><strong>Email:</strong> phucgatien@gmail.com</li>
  <li><strong>Điện thoại:</strong> 0986 123 456</li>
  <li><strong>Địa chỉ:</strong> Thôn Bát Tràng, Xã Bát Tràng, Huyện Gia Lâm, Hà Nội</li>
  <li><strong>Giờ hỗ trợ:</strong> 08:00 – 18:00 (Thứ 2 – Chủ Nhật)</li>
</ul>
""",

                ["policyTerms"] = """
<h2>ĐIỀU KHOẢN DỊCH VỤ PHÚC GIA TIÊN</h2>
<p><em>Cập nhật lần cuối: tháng 6 năm 2026</em></p>
<p>Chào mừng Quý khách đến với website chính thức của <strong>Phúc Gia Tiên — Gốm Sứ Thủ Công Bát Tràng</strong>. Khi truy cập và sử dụng dịch vụ mua sắm tại hệ thống của chúng tôi, Quý khách đồng ý tuân thủ các điều khoản và điều kiện được quy định dưới đây. Vui lòng đọc kỹ trước khi thực hiện giao dịch.</p>

<h3>THÔNG TIN DOANH NGHIỆP</h3>
<div style="background:var(--bg-secondary,#f8f4ef);padding:16px;border-radius:8px;margin-bottom:1.5rem;border:1px solid rgba(200,146,42,0.2);">
<ul style="margin:0;">
  <li><strong>Tên đơn vị:</strong> Hộ Kinh Doanh Phúc Gia Tiên</li>
  <li><strong>Người đại diện:</strong> Nguyễn Văn Phúc</li>
  <li><strong>Địa chỉ trụ sở:</strong> Thôn Bát Tràng, Xã Bát Tràng, Huyện Gia Lâm, Thành phố Hà Nội</li>
  <li><strong>Mã số thuế / Mã ĐKKD:</strong> (Cập nhật khi có)</li>
  <li><strong>Điện thoại:</strong> 0986 123 456</li>
  <li><strong>Email:</strong> phucgatien@gmail.com</li>
  <li><strong>Website:</strong> phucgatien.com</li>
</ul>
</div>
<p><em>Thông tin trên được công khai theo quy định tại Nghị định 52/2013/NĐ-CP (sửa đổi bởi Nghị định 85/2021/NĐ-CP) về Thương mại điện tử.</em></p>

<h3>1. ĐIỀU KIỆN SỬ DỤNG DỊCH VỤ</h3>
<ul>
  <li>Người sử dụng dịch vụ mua hàng tại website phải từ <strong>đủ 18 tuổi trở lên</strong> và có đầy đủ năng lực hành vi dân sự theo quy định tại Bộ luật Dân sự 2015. Trường hợp người mua từ 15 đến dưới 18 tuổi cần có sự đồng ý của người đại diện hợp pháp.</li>
  <li>Khi đặt hàng trên website, Quý khách xác nhận rằng mình đủ điều kiện pháp lý để tham gia giao dịch mua bán.</li>
</ul>

<h3>2. ĐẶC THÙ SẢN PHẨM GỐM SỨ THỦ CÔNG</h3>
<p>Phúc Gia Tiên tự hào cung cấp các tác phẩm gốm sứ được chế tác <strong>100% thủ công</strong> bởi nghệ nhân làng cổ Bát Tràng. Quý khách vui lòng lưu ý các đặc tính tự nhiên của dòng sản phẩm này:</p>
<ul>
  <li><strong>Sai khác nhỏ về hoa văn &amp; sắc độ:</strong> Do được vẽ tay thủ công và nung bằng lò gạch truyền thống ở nhiệt độ cao (1.200°C – 1.280°C), mỗi mẻ gốm ra lò sẽ có sắc độ men, độ dày và nét vẽ có thể sai lệch nhẹ (dưới 5%) so với ảnh mẫu.</li>
  <li><strong>Vết rạn men &amp; chấm quặng nhỏ:</strong> Các đường rạn men tự nhiên hoặc đốm quặng sắt li ti trên bề mặt đất sét nung là đặc trưng nghệ thuật vốn có của gốm sứ nguyên bản, không được coi là lỗi kỹ thuật hay hư hại.</li>
  <li><strong>Kích thước:</strong> Do co ngót trong lò nung, đường kính hoặc chiều cao sản phẩm có thể sai số từ vài milimet đến dưới 2cm tùy dòng sản phẩm.</li>
</ul>

<h3>3. VẬN CHUYỂN, GIAO NHẬN &amp; ĐỒNG KIỂM AN TOÀN</h3>
<p>Gốm sứ là mặt hàng dễ hư hỏng khi va đập mạnh. Để bảo vệ tối đa quyền lợi của khách hàng, Phúc Gia Tiên áp dụng chính sách vận chuyển đặc biệt:</p>
<ul>
  <li><strong>Đóng gói chuyên dụng:</strong> Mọi đơn hàng đều được bọc lót chống sốc 5 lớp chuyên dụng, đóng thùng gỗ kiên cố đối với các sản phẩm kích thước lớn như lộc bình, chum ngâm rượu.</li>
  <li><strong>Quy định Đồng Kiểm (Bắt buộc):</strong> Quý khách <strong>PHẢI mở thùng kiểm tra trực tiếp</strong> tình trạng sản phẩm cùng shipper ngay khi nhận hàng trước khi thanh toán hoặc ký nhận.</li>
  <li><strong>Xử lý bể vỡ do vận chuyển:</strong> Nếu phát hiện sản phẩm bị sứt mẻ, rạn nứt hay bể vỡ, Quý khách vui lòng <strong>từ chối nhận hàng</strong>, yêu cầu shipper ký xác nhận biên bản và chụp hình gửi ngay cho bộ phận CSKH. Chúng tôi sẽ gửi bù sản phẩm mới miễn phí 100% trong vòng 3–7 ngày làm việc.</li>
</ul>

<h3>4. GIÁ CẢ &amp; THANH TOÁN</h3>
<p>Mọi mức giá niêm yết trên website đều là giá bán trực tiếp chưa bao gồm phí vận chuyển (trừ khi có chương trình khuyến mãi cụ thể). Chúng tôi hỗ trợ các phương thức thanh toán linh hoạt:</p>
<ul>
  <li>Thanh toán trực tiếp bằng tiền mặt khi nhận hàng (COD – có áp dụng đồng kiểm).</li>
  <li>Chuyển khoản ngân hàng qua cổng thanh toán bảo mật.</li>
  <li>Ví điện tử (Momo, ZaloPay, VNPay) khi có thông báo kích hoạt trên website.</li>
</ul>

<h3>5. QUYỀN TỪ CHỐI VÀ HỦY ĐƠN HÀNG</h3>
<p>Phúc Gia Tiên có quyền từ chối hoặc hủy đơn hàng trong các trường hợp sau:</p>
<ul>
  <li>Sản phẩm đã hết hàng hoặc ngừng sản xuất mà chưa kịp cập nhật trên website.</li>
  <li>Thông tin đặt hàng không chính xác, không thể liên lạc được với khách hàng sau 3 lần thử trong vòng 48 giờ.</li>
  <li>Phát hiện dấu hiệu gian lận, đặt hàng ảo hoặc sử dụng thông tin giả mạo.</li>
  <li>Đơn hàng vi phạm các điều khoản sử dụng dịch vụ.</li>
</ul>
<p>Trong mọi trường hợp hủy đơn từ phía Phúc Gia Tiên, nếu khách hàng đã thanh toán trước, chúng tôi cam kết hoàn tiền <strong>100%</strong> trong vòng 3–5 ngày làm việc.</p>

<h3>6. ĐỔI TRẢ &amp; BẢO HÀNH</h3>
<p>Chính sách đổi trả sản phẩm tuân thủ các quy định được đề ra trong <a href="return-policy">Chính sách đổi trả</a> và <a href="warranty-policy">Chính sách bảo hành</a> của Phúc Gia Tiên:</p>
<ul>
  <li>Hỗ trợ đổi mẫu, đổi size trong vòng <strong>7 ngày</strong> kể từ khi nhận hàng đối với sản phẩm chưa qua sử dụng và còn nguyên vẹn.</li>
  <li>Khách hàng chịu phí ship đổi trả nếu việc đổi hàng xuất phát từ nhu cầu chủ quan cá nhân.</li>
  <li>Phúc Gia Tiên chịu toàn bộ chi phí nếu sản phẩm bị lỗi do sản xuất hoặc vận chuyển.</li>
</ul>

<h3>7. TRÁCH NHIỆM CỦA KHÁCH HÀNG</h3>
<p>Quý khách cam kết cung cấp chính xác, đầy đủ thông tin giao hàng bao gồm: Họ tên, số điện thoại chính xác, địa chỉ cụ thể và ghi chú (nếu có). Phúc Gia Tiên không chịu trách nhiệm đối với các đơn hàng bị thất lạc hoặc chậm trễ do khách hàng cung cấp sai thông tin.</p>

<h3>8. SỞ HỮU TRÍ TUỆ</h3>
<p>Toàn bộ nội dung trên website bao gồm hình ảnh sản phẩm, mô tả, video và nhận diện thương hiệu đều thuộc quyền sở hữu của Phúc Gia Tiên. Nghiêm cấm sao chép, phân phối hoặc sử dụng thương mại khi chưa được sự đồng ý bằng văn bản.</p>

<h3>9. BẤT KHẢ KHÁNG (FORCE MAJEURE)</h3>
<p>Phúc Gia Tiên không chịu trách nhiệm về việc chậm trễ hoặc không thể thực hiện nghĩa vụ giao hàng trong các trường hợp bất khả kháng, bao gồm nhưng không giới hạn:</p>
<ul>
  <li>Thiên tai (bão, lũ lụt, động đất, sạt lở).</li>
  <li>Dịch bệnh, đại dịch, lệnh phong tỏa của cơ quan chức năng.</li>
  <li>Chiến tranh, bạo loạn, đình công, biểu tình.</li>
  <li>Sự cố hạ tầng giao thông, mất điện diện rộng, sự cố hệ thống công nghệ thông tin.</li>
  <li>Các quyết định, lệnh cấm hoặc hạn chế của cơ quan nhà nước có thẩm quyền.</li>
</ul>
<p>Trong trường hợp bất khả kháng, Phúc Gia Tiên sẽ thông báo ngay cho khách hàng và cùng thỏa thuận phương án xử lý phù hợp (hoãn giao hàng, đổi phương thức vận chuyển hoặc hoàn tiền).</p>

<h3>10. GIẢI QUYẾT TRANH CHẤP</h3>
<p>Mọi tranh chấp phát sinh từ giao dịch mua bán tại Phúc Gia Tiên sẽ được giải quyết theo tinh thần hợp tác, thiện chí. Trong trường hợp không thể thỏa thuận, tranh chấp sẽ được đưa ra Tòa án nhân dân có thẩm quyền tại Hà Nội để giải quyết theo quy định pháp luật Việt Nam.</p>

<h3>11. ĐIỀU KHOẢN ÁP DỤNG</h3>
<p>Phúc Gia Tiên có quyền sửa đổi, bổ sung các điều khoản này bất kỳ lúc nào để phù hợp với quy định của pháp luật và tình hình kinh doanh thực tế. Quy định sửa đổi sẽ có hiệu lực ngay khi được đăng tải trên website chính thức.</p>
<p style="margin-top: 2rem; font-style: italic; color: var(--color-accent);">Cảm ơn Quý khách đã tin tưởng chọn lựa tác phẩm gốm sứ nghệ thuật từ Phúc Gia Tiên!</p>
""",

                ["policyWarranty"] = """
<h2>CHÍNH SÁCH BẢO HÀNH SẢN PHẨM</h2>
<p><em>Cập nhật lần cuối: tháng 6 năm 2026</em></p>
<p>Phúc Gia Tiên cam kết cung cấp sản phẩm gốm sứ chất lượng cao và hỗ trợ bảo hành chu đáo để Quý khách hoàn toàn yên tâm sau mỗi lần mua sắm. Chính sách bảo hành này tuân thủ quy định tại <strong>Luật Bảo vệ quyền lợi người tiêu dùng 2023</strong> (có hiệu lực từ 01/07/2024).</p>

<h3>1. PHẠM VI BẢO HÀNH</h3>
<p>Chính sách bảo hành áp dụng cho các sản phẩm gốm sứ do Phúc Gia Tiên sản xuất và phân phối chính hãng:</p>
<ul>
  <li><strong>Lỗi từ quá trình sản xuất:</strong> Nứt vỡ bên trong cấu trúc xương gốm mà không do tác động ngoại lực, men bong tróc bất thường không phải do va đập.</li>
  <li><strong>Sai lệch nghiêm trọng so với mô tả:</strong> Sản phẩm nhận được khác biệt rõ ràng về chủng loại, kích thước hoặc hoa văn so với mô tả sản phẩm.</li>
  <li><strong>Hư hỏng trong vận chuyển:</strong> Sản phẩm bị bể vỡ, sứt mẻ do quá trình vận chuyển (phải có biên bản xác nhận từ shipper hoặc video/ảnh tại thời điểm mở thùng).</li>
</ul>

<h3>2. THỜI HẠN BẢO HÀNH</h3>
<ul>
  <li><strong>Lỗi vận chuyển / lỗi sản xuất nghiêm trọng:</strong> Phản ánh trong vòng <strong>24 giờ</strong> kể từ khi nhận hàng. Bắt buộc có hình ảnh/video làm bằng chứng.</li>
  <li><strong>Đổi sản phẩm lỗi không đúng mô tả:</strong> Trong vòng <strong>7 ngày</strong> kể từ ngày nhận hàng.</li>
  <li><strong>Hỗ trợ kỹ thuật sử dụng:</strong> Tư vấn cách vệ sinh, bảo quản và phục hồi gốm sứ trong suốt vòng đời sản phẩm (miễn phí qua hotline).</li>
</ul>
<p><em>Theo Luật BVQLNTD 2023, người bán có trách nhiệm bảo hành sản phẩm theo đúng nội dung đã cam kết. Phúc Gia Tiên cam kết thực hiện đầy đủ và nghiêm túc các cam kết bảo hành nêu trên.</em></p>

<h3>3. ĐIỀU KIỆN ĐỂ ĐƯỢC BẢO HÀNH</h3>
<p>Để được hưởng chính sách bảo hành, Quý khách cần đảm bảo:</p>
<ul>
  <li>Cung cấp mã đơn hàng hoặc hóa đơn mua hàng từ Phúc Gia Tiên.</li>
  <li>Cung cấp hình ảnh hoặc video rõ ràng về tình trạng sản phẩm lỗi.</li>
  <li>Sản phẩm chưa bị can thiệp sửa chữa bởi bên thứ ba.</li>
  <li>Phản ánh trong thời hạn bảo hành quy định.</li>
</ul>

<h3>4. TRƯỜNG HỢP KHÔNG ĐƯỢC BẢO HÀNH</h3>
<p>Chính sách bảo hành <strong>không áp dụng</strong> trong các trường hợp sau:</p>
<ul>
  <li>Sản phẩm bị bể vỡ do rơi, va đập, sử dụng không đúng cách sau khi nhận hàng.</li>
  <li>Vết rạn men tự nhiên, đốm quặng li ti, màu sắc chênh lệch nhẹ – đây là đặc tính vốn có của gốm thủ công.</li>
  <li>Sản phẩm bị hư hỏng do nguyên nhân từ môi trường: ngập nước, tiếp xúc với hoá chất ăn mòn, sốc nhiệt đột ngột (đặt gốm đang lạnh vào lò vi sóng).</li>
  <li>Thay đổi ý kiến cá nhân về mẫu mã, màu sắc sau khi đã nhận hàng đúng mô tả.</li>
</ul>

<h3>5. QUY TRÌNH YÊU CẦU BẢO HÀNH</h3>
<ol>
  <li><strong>Liên hệ CSKH:</strong> Gọi <strong>0986 123 456</strong> hoặc nhắn tin qua Zalo/Facebook trong giờ hành chính (08:00–18:00).</li>
  <li><strong>Gửi thông tin:</strong> Cung cấp mã đơn hàng và hình ảnh/video sản phẩm lỗi.</li>
  <li><strong>Xác nhận và xử lý:</strong> Chúng tôi xác nhận và phản hồi trong vòng <strong>4 giờ làm việc</strong> (tối đa không quá 24 giờ làm việc trong trường hợp quá tải).</li>
  <li><strong>Giao sản phẩm thay thế:</strong> Sản phẩm mới được giao trong vòng 3–7 ngày làm việc sau khi xác nhận bảo hành.</li>
</ol>

<h3>6. HÌNH THỨC BẢO HÀNH</h3>
<ul>
  <li><strong>Đổi sản phẩm mới tương đương:</strong> Áp dụng cho các trường hợp lỗi sản xuất hoặc hư hỏng vận chuyển.</li>
  <li><strong>Hoàn tiền 100%:</strong> Áp dụng khi sản phẩm tương đương không còn hàng và khách hàng không muốn đổi sang sản phẩm khác.</li>
  <li><strong>Giảm giá bù đắp:</strong> Trong một số trường hợp đặc biệt có thể thoả thuận giảm giá cho đơn hàng tiếp theo.</li>
</ul>

<h3>7. LIÊN HỆ HỖ TRỢ BẢO HÀNH</h3>
<ul>
  <li><strong>Hotline:</strong> 0986 123 456 (08:00 – 18:00, Thứ 2 – Chủ Nhật)</li>
  <li><strong>Email:</strong> phucgatien@gmail.com</li>
  <li><strong>Zalo / Facebook:</strong> Tìm kiếm "Phúc Gia Tiên" hoặc theo dẫn đường link trên website</li>
</ul>
""",

                ["policyShipping"] = """
<h2>CHÍNH SÁCH GIAO NHẬN &amp; VẬN CHUYỂN</h2>
<p><em>Cập nhật lần cuối: tháng 6 năm 2026</em></p>
<p>Phúc Gia Tiên hiểu rằng gốm sứ thủ công là những tác phẩm nghệ thuật quý giá. Chúng tôi áp dụng quy trình đóng gói và vận chuyển đặc biệt để đảm bảo sản phẩm đến tay bạn trong tình trạng hoàn hảo.</p>

<h3>1. PHẠM VI VÀ THỜI GIAN GIAO HÀNG</h3>
<ul>
  <li><strong>Phạm vi giao hàng:</strong> Toàn quốc (64 tỉnh thành).</li>
  <li><strong>Nội thành Hà Nội &amp; TP. HCM:</strong> 1–3 ngày làm việc.</li>
  <li><strong>Các tỉnh thành khác:</strong> 3–7 ngày làm việc.</li>
  <li><strong>Vùng sâu, vùng xa, hải đảo:</strong> 7–14 ngày làm việc (tùy điều kiện địa lý).</li>
  <li><strong>Đơn hàng đặt theo yêu cầu (custom):</strong> 15–30 ngày kể từ ngày xác nhận thiết kế.</li>
</ul>
<p><em>Lưu ý: Thời gian trên được tính từ ngày đơn hàng được xác nhận và xuất kho, không bao gồm ngày lễ, Tết.</em></p>

<h3>2. PHÍ VẬN CHUYỂN</h3>
<ul>
  <li><strong>Miễn phí vận chuyển</strong> cho đơn hàng từ <strong>5.000.000đ</strong> trở lên (toàn quốc).</li>
  <li>Đơn hàng dưới 5.000.000đ: Phí vận chuyển được tính theo trọng lượng thực tế và địa chỉ giao hàng, hiển thị rõ tại bước thanh toán.</li>
  <li>Đối với sản phẩm kích thước lớn (lộc bình &gt;1m, chum vại lớn): Phí vận chuyển được báo giá riêng sau khi xác nhận đơn hàng.</li>
</ul>

<h3>3. ĐỐI TÁC VẬN CHUYỂN</h3>
<p>Phúc Gia Tiên hợp tác với các đơn vị vận chuyển uy tín để đảm bảo hàng hóa được giao an toàn:</p>
<ul>
  <li><strong>Giao Hàng Nhanh (GHN)</strong> – Giao hàng toàn quốc, có hỗ trợ đồng kiểm.</li>
  <li><strong>Giao Hàng Tiết Kiệm (GHTK)</strong> – Giao hàng nhanh, phủ rộng tỉnh thành.</li>
  <li><strong>Viettel Post</strong> – Phủ sóng vùng sâu, vùng xa, hải đảo.</li>
  <li><strong>Nhà xe / Xe tải chuyên dụng</strong> – Dành cho sản phẩm kích thước lớn, siêu nặng (lộc bình &gt;1.2m, chum vại lớn).</li>
</ul>
<p><em>Đơn vị vận chuyển cụ thể sẽ được chọn phù hợp với kích thước sản phẩm, địa chỉ giao hàng và yêu cầu của khách hàng.</em></p>

<h3>4. BẢO HIỂM HÀNG HÓA</h3>
<p>Do gốm sứ là mặt hàng dễ vỡ có giá trị cao, Phúc Gia Tiên áp dụng chính sách bảo hiểm vận chuyển:</p>
<ul>
  <li><strong>Đơn hàng từ 5.000.000đ trở lên:</strong> Được <strong>mua bảo hiểm vận chuyển 100%</strong> giá trị đơn hàng (miễn phí, do Phúc Gia Tiên chi trả).</li>
  <li><strong>Đơn hàng dưới 5.000.000đ:</strong> Phúc Gia Tiên vẫn cam kết <strong>đền bù 100%</strong> nếu sản phẩm bị hư hỏng do vận chuyển (có bằng chứng đồng kiểm hoặc video mở hộp).</li>
  <li>Trong mọi trường hợp, Phúc Gia Tiên chịu trách nhiệm hoàn toàn đối với hàng hóa cho đến khi sản phẩm được giao thành công và khách hàng xác nhận tình trạng tốt.</li>
</ul>

<h3>5. QUY TRÌNH ĐÓNG GÓI ĐẶC BIỆT</h3>
<p>Gốm sứ đòi hỏi đóng gói chuyên biệt để tránh va đập trong quá trình vận chuyển. Phúc Gia Tiên áp dụng quy trình 5 lớp bảo vệ:</p>
<ol>
  <li><strong>Lớp 1 – Bọc nhung mềm:</strong> Quấn sản phẩm bằng vải nhung hoặc mút xốp mỏng để bảo vệ men.</li>
  <li><strong>Lớp 2 – Bọc bong bóng khí:</strong> Cuộn 2–3 vòng màng bọc bong bóng khí chống sốc.</li>
  <li><strong>Lớp 3 – Hộp carton cứng:</strong> Đặt vào hộp carton dày với xốp định hình bên trong.</li>
  <li><strong>Lớp 4 – Thùng gỗ (sản phẩm lớn):</strong> Lộc bình, chum gốm lớn được đóng thùng gỗ kiên cố.</li>
  <li><strong>Lớp 5 – Niêm phong và dán nhãn dễ vỡ:</strong> Dán nhãn "FRAGILE – DỄ VỠ" và "THIS SIDE UP" để đơn vị vận chuyển cẩn thận hơn.</li>
</ol>

<h3>6. QUY ĐỊNH ĐỒNG KIỂM BẮT BUỘC</h3>
<p>Để bảo vệ quyền lợi của Quý khách, Phúc Gia Tiên áp dụng <strong>quy định đồng kiểm bắt buộc</strong> khi nhận hàng:</p>
<ul>
  <li>Yêu cầu shipper cho phép mở thùng kiểm tra sản phẩm trước khi thanh toán (COD) hoặc ký nhận.</li>
  <li>Nếu phát hiện sản phẩm bị bể vỡ, sứt mẻ: <strong>Từ chối nhận hàng</strong>, yêu cầu shipper ký xác nhận và chụp hình toàn bộ hiện trạng.</li>
  <li>Liên hệ ngay CSKH qua <strong>0986 123 456</strong> để được hỗ trợ giao hàng bù trong vòng 24 giờ.</li>
  <li>Trường hợp đã ký nhận mà phát hiện lỗi sau đó: Cần có video quay lại toàn bộ quá trình mở hộp (unboxing) làm bằng chứng.</li>
</ul>

<h3>7. THEO DÕI ĐƠN HÀNG</h3>
<p>Sau khi đơn hàng được xuất kho, Quý khách sẽ nhận được thông tin mã vận đơn qua số điện thoại đã đăng ký. Bạn có thể theo dõi tình trạng đơn hàng trực tiếp tại <a href="order-tracking">trang theo dõi đơn hàng</a> của chúng tôi.</p>

<h3>8. TRƯỜNG HỢP GIAO HÀNG KHÔNG THÀNH CÔNG</h3>
<ul>
  <li>Shipper sẽ thử giao hàng tối đa <strong>3 lần</strong>. Nếu không liên lạc được, đơn hàng sẽ được hoàn về kho.</li>
  <li>Phí hoàn hàng do đơn vị vận chuyển thu (khách hàng chịu nếu không có lý do từ phía Phúc Gia Tiên).</li>
  <li>Vui lòng đảm bảo số điện thoại giao hàng luôn liên lạc được trong ngày dự kiến giao.</li>
</ul>

<h3>9. LIÊN HỆ HỖ TRỢ VẬN CHUYỂN</h3>
<ul>
  <li><strong>Hotline:</strong> 0986 123 456 (08:00 – 18:00, Thứ 2 – Chủ Nhật)</li>
  <li><strong>Zalo:</strong> zalo.me/0986123456</li>
  <li><strong>Email:</strong> phucgatien@gmail.com</li>
</ul>
""",

                ["policyReturn"] = """
<h2>CHÍNH SÁCH ĐỔI TRẢ HÀNG</h2>
<p><em>Cập nhật lần cuối: tháng 6 năm 2026</em></p>
<p>Phúc Gia Tiên cam kết mang đến trải nghiệm mua sắm an tâm và minh bạch. Chính sách đổi trả được xây dựng để bảo vệ quyền lợi chính đáng của Quý khách hàng, tuân thủ <strong>Luật Bảo vệ quyền lợi người tiêu dùng 2023</strong>.</p>

<h3>1. QUYỀN ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG (THEO LUẬT BVQLNTD 2023)</h3>
<div style="background:#fffbeb;padding:16px;border-radius:8px;margin-bottom:1.5rem;border:1px solid #fcd34d;">
<p style="margin-top:0;"><strong>⚖️ Theo Điều 51 Luật Bảo vệ quyền lợi người tiêu dùng 2023:</strong></p>
<p>Trong giao dịch thương mại điện tử, người tiêu dùng có quyền <strong>đơn phương chấm dứt hợp đồng trong vòng 15 ngày</strong> kể từ ngày nhận hàng mà không cần nêu lý do, với các điều kiện:</p>
<ul>
  <li>Sản phẩm còn nguyên vẹn, chưa qua sử dụng, còn nguyên bao bì và tem nhãn.</li>
  <li>Khách hàng chịu chi phí vận chuyển hoàn trả.</li>
  <li>Hoàn tiền được thực hiện trong vòng <strong>15 ngày</strong> kể từ ngày nhận lại sản phẩm.</li>
</ul>
<p style="margin-bottom:0;"><em><strong>Ngoại lệ:</strong> Quyền này không áp dụng cho sản phẩm đặt riêng theo yêu cầu (custom order) mà Phúc Gia Tiên đã sản xuất theo đặc tả của khách hàng, do tính chất đặc thù của sản phẩm gốm sứ thủ công được tạo hình theo mẫu riêng.</em></p>
</div>

<h3>2. ĐIỀU KIỆN ĐỔI/TRẢ HÀNG</h3>
<p>Ngoài quyền 15 ngày nêu trên, Phúc Gia Tiên chấp nhận yêu cầu đổi/trả hàng ưu tiên trong các trường hợp sau:</p>
<ul>
  <li>✅ Sản phẩm bị lỗi, bể vỡ, sứt mẻ do quá trình vận chuyển (có xác nhận từ shipper hoặc video unboxing).</li>
  <li>✅ Sản phẩm nhận được khác với mô tả, hình ảnh trên website một cách rõ ràng (không phải do đặc tính tự nhiên của gốm thủ công).</li>
  <li>✅ Giao nhầm sản phẩm, nhầm kích thước so với đơn hàng đã xác nhận.</li>
  <li>✅ Đổi size/mẫu theo nhu cầu cá nhân trong vòng 7 ngày (áp dụng điều kiện dưới đây).</li>
</ul>

<h3>3. THỜI GIAN VÀ ĐIỀU KIỆN ĐỔI TRẢ</h3>
<table style="width:100%;border-collapse:collapse;margin:1rem 0;">
  <thead>
    <tr style="background:var(--bg-secondary,#f8f4ef);">
      <th style="padding:10px;border:1px solid #ddd;text-align:left;">Trường hợp</th>
      <th style="padding:10px;border:1px solid #ddd;text-align:left;">Thời hạn</th>
      <th style="padding:10px;border:1px solid #ddd;text-align:left;">Ai chịu phí ship?</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px;border:1px solid #ddd;">Lỗi vận chuyển / lỗi sản xuất</td>
      <td style="padding:10px;border:1px solid #ddd;">24 giờ sau nhận hàng</td>
      <td style="padding:10px;border:1px solid #ddd;color:green;"><strong>Phúc Gia Tiên</strong></td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd;">Giao sai sản phẩm/kích thước</td>
      <td style="padding:10px;border:1px solid #ddd;">7 ngày sau nhận hàng</td>
      <td style="padding:10px;border:1px solid #ddd;color:green;"><strong>Phúc Gia Tiên</strong></td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd;">Đổi mẫu/size theo sở thích</td>
      <td style="padding:10px;border:1px solid #ddd;">7 ngày sau nhận hàng</td>
      <td style="padding:10px;border:1px solid #ddd;color:#c85e00;"><strong>Khách hàng</strong></td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd;">Trả hàng không lý do (Điều 51 BVQLNTD)</td>
      <td style="padding:10px;border:1px solid #ddd;"><strong>15 ngày</strong> sau nhận hàng</td>
      <td style="padding:10px;border:1px solid #ddd;color:#c85e00;"><strong>Khách hàng</strong></td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd;">Trả hàng để hoàn tiền (lỗi từ shop)</td>
      <td style="padding:10px;border:1px solid #ddd;">7 ngày (lỗi từ shop)</td>
      <td style="padding:10px;border:1px solid #ddd;color:green;"><strong>Phúc Gia Tiên</strong></td>
    </tr>
  </tbody>
</table>

<h3>4. ĐIỀU KIỆN SẢN PHẨM KHI ĐỔI TRẢ</h3>
<p>Sản phẩm đổi trả phải đáp ứng các điều kiện sau (trừ trường hợp lỗi từ shop):</p>
<ul>
  <li>Sản phẩm còn nguyên vẹn, chưa qua sử dụng, không có thêm vết xước hay hư hại so với khi nhận.</li>
  <li>Giữ nguyên bao bì, tem nhãn, phụ kiện đi kèm (hộp quà, túi nhung nếu có).</li>
  <li>Kèm theo hóa đơn hoặc mã đơn hàng gốc từ Phúc Gia Tiên.</li>
</ul>

<h3>5. TRƯỜNG HỢP KHÔNG ĐƯỢC ĐỔI/TRẢ</h3>
<ul>
  <li>❌ Sản phẩm bị hư hỏng do sử dụng sai cách sau khi nhận (rơi, va đập, sốc nhiệt).</li>
  <li>❌ Sản phẩm đã qua sử dụng, có dấu hiệu tiếp xúc với nước, đất, thực phẩm.</li>
  <li>❌ Các sai lệch nhỏ về màu sắc men, đường rạn tự nhiên, đốm quặng — đây là đặc tính vốn có của gốm thủ công, không phải lỗi sản phẩm.</li>
  <li>❌ Sản phẩm đặt theo yêu cầu riêng (custom order) khi khách hàng đã xác nhận mẫu thiết kế — do tính chất đặc thù không thể bán lại cho người khác.</li>
  <li>❌ Yêu cầu đổi trả sau thời hạn quy định (quá 15 ngày kể từ ngày nhận hàng).</li>
</ul>

<h3>6. QUY TRÌNH ĐỔI TRẢ</h3>
<ol>
  <li><strong>Bước 1 – Liên hệ CSKH:</strong> Gọi <strong>0986 123 456</strong> hoặc nhắn Zalo trong giờ hành chính (08:00–18:00) để thông báo yêu cầu đổi/trả.</li>
  <li><strong>Bước 2 – Gửi bằng chứng:</strong> Chụp ảnh/quay video sản phẩm và gửi cho nhân viên CSKH để xác minh.</li>
  <li><strong>Bước 3 – Xác nhận phương án:</strong> CSKH xác nhận phương án xử lý trong vòng 4–8 giờ làm việc (tối đa 24 giờ làm việc).</li>
  <li><strong>Bước 4 – Hoàn tất:</strong> Sản phẩm mới được giao hoặc hoàn tiền được thực hiện trong 3–7 ngày làm việc.</li>
</ol>

<h3>7. HÌNH THỨC HOÀN TIỀN</h3>
<ul>
  <li>Hoàn tiền về tài khoản ngân hàng trong vòng <strong>3–5 ngày làm việc</strong> (tối đa không quá 15 ngày kể từ ngày Phúc Gia Tiên nhận lại sản phẩm, tuân thủ Điều 51 Luật BVQLNTD 2023, thời hạn tối đa 30 ngày theo luật).</li>
  <li>Hoàn tiền mặt trực tiếp tại xưởng (áp dụng khi khách đến nhận hàng trực tiếp).</li>
  <li>Tích điểm đổi thưởng cho đơn hàng tiếp theo (tùy thỏa thuận).</li>
</ul>

<h3>8. LIÊN HỆ HỖ TRỢ ĐỔI TRẢ</h3>
<ul>
  <li><strong>Hotline:</strong> 0986 123 456 (08:00 – 18:00, Thứ 2 – Chủ Nhật)</li>
  <li><strong>Email:</strong> phucgatien@gmail.com</li>
  <li><strong>Zalo:</strong> zalo.me/0986123456</li>
</ul>
<p style="margin-top:1.5rem;padding:1rem;background:#f8f4ef;border-left:4px solid var(--color-accent,#c8922a);border-radius:4px;"><strong>💡 Lưu ý quan trọng:</strong> Phúc Gia Tiên luôn đặt sự hài lòng của khách hàng lên hàng đầu. Nếu bạn có bất kỳ vấn đề nào, hãy liên hệ trực tiếp với chúng tôi — chúng tôi cam kết giải quyết nhanh chóng và thỏa đáng.</p>
"""
            };

            foreach (var kvp in policyDefaults)
            {
                var existing = await context.SiteConfigs.FirstOrDefaultAsync(c => c.Key == kvp.Key);
                if (existing == null)
                {
                    // Chưa có → insert mới
                    context.SiteConfigs.Add(new SiteConfig { Key = kvp.Key, Value = kvp.Value });
                }
                else if (existing.Value == null || existing.Value.Length < 2500)
                {
                    // Nội dung quá ngắn (placeholder cũ) → update sang nội dung đầy đủ
                    existing.Value = kvp.Value;
                }
            }
            await context.SaveChangesAsync();

            // ── Upsert invoice config keys ─────────────────────────────────────────
            var invoiceDefaults = new System.Collections.Generic.Dictionary<string, string>
            {
                ["InvoiceCompanyName"] = "Phúc Gia Tiên",
                ["InvoiceAddress"]     = "Thôn Bát Tràng, Xã Bát Tràng, Huyện Gia Lâm, Hà Nội",
                ["InvoicePhone"]       = "0986 123 456",
                ["InvoiceTaxId"]       = "",
                ["InvoiceNote"]        = "Cảm ơn quý khách đã tin dùng sản phẩm của Phúc Gia Tiên! Chúc quý khách nhiều sức khoẻ và may mắn."
            };
            foreach (var kvp in invoiceDefaults)
            {
                var existing = await context.SiteConfigs.FirstOrDefaultAsync(c => c.Key == kvp.Key);
                if (existing == null)
                {
                    context.SiteConfigs.Add(new SiteConfig { Key = kvp.Key, Value = kvp.Value });
                }
                // Không ghi đè nếu admin đã chỉnh sửa
            }
            await context.SaveChangesAsync();

            // ── Seed Gifts ─────────────────────────────────────────
            if (!context.Gifts.Any(g => g.Name == "Hộp lụa đỏ Phúc Gia Tiên"))
            {
                var gifts = new List<Gift>
                {
                    new Gift
                    {
                        Name = "Hộp lụa đỏ Phúc Gia Tiên",
                        ImageUrl = "/uploads/hop_lua_do.png",
                        EstimatedValue = 150000,
                        Stock = 100,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Gift
                    {
                        Name = "Đế gỗ hương tròn kê bình",
                        ImageUrl = "/uploads/de_go_tron.png",
                        EstimatedValue = 250000,
                        Stock = 50,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    },
                    new Gift
                    {
                        Name = "Đế gỗ hương vuông kê tượng",
                        ImageUrl = "/uploads/de_go_vuong.png",
                        EstimatedValue = 280000,
                        Stock = 50,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow.AddHours(7),
                        UpdatedAt = DateTime.UtcNow.AddHours(7)
                    }
                };
                await context.Gifts.AddRangeAsync(gifts);
                await context.SaveChangesAsync();
            }

            // ── Seed ProductGifts ──────────────────────────────────
            var giftHopLua = await context.Gifts.FirstOrDefaultAsync(g => g.Name == "Hộp lụa đỏ Phúc Gia Tiên");
            var giftDeTron = await context.Gifts.FirstOrDefaultAsync(g => g.Name == "Đế gỗ hương tròn kê bình");
            var giftDeVuong = await context.Gifts.FirstOrDefaultAsync(g => g.Name == "Đế gỗ hương vuông kê tượng");

            if (giftHopLua != null && giftDeTron != null && giftDeVuong != null)
            {
                // Clear existing seeder maps for these gifts to avoid duplicate seeding
                var existingGifts = await context.ProductGifts
                    .Where(pg => pg.GiftId == giftHopLua.Id || pg.GiftId == giftDeTron.Id || pg.GiftId == giftDeVuong.Id)
                    .ToListAsync();
                if (existingGifts.Any())
                {
                    context.ProductGifts.RemoveRange(existingGifts);
                    await context.SaveChangesAsync();
                }

                var productGifts = new List<ProductGift>();
                var allProducts = await context.Products.ToListAsync();

                foreach (var p in allProducts)
                {
                    var slug = p.Slug?.ToLower() ?? "";
                    var name = p.Name?.ToLower() ?? "";

                    // Lộc bình -> Tặng Hộp lụa đỏ (1) + Đế gỗ tròn (2)
                    if (slug.Contains("loc-binh") || slug.Contains("lộc-bình") || name.Contains("lộc bình") || name.Contains("lọc bình"))
                    {
                        productGifts.Add(new ProductGift { ProductId = p.Id, GiftId = giftHopLua.Id, Quantity = 1 });
                        productGifts.Add(new ProductGift { ProductId = p.Id, GiftId = giftDeTron.Id, Quantity = 2 });
                    }
                    // Đồ thờ / Ấm chén -> Tặng Hộp lụa đỏ (1) + Đế gỗ vuông (1)
                    else if (slug.Contains("do-tho") || slug.Contains("đồ-thờ") || slug.Contains("am-chen") || slug.Contains("ấm-chén") ||
                             name.Contains("ấm chén") || name.Contains("ấm chén") || name.Contains("bộ đồ thờ") || name.Contains("đồ thờ"))
                    {
                        productGifts.Add(new ProductGift { ProductId = p.Id, GiftId = giftHopLua.Id, Quantity = 1 });
                        productGifts.Add(new ProductGift { ProductId = p.Id, GiftId = giftDeVuong.Id, Quantity = 1 });
                    }
                    // Bình hút lộc / Đĩa gốm -> Tặng Đế gỗ vuông (1)
                    else if (slug.Contains("binh-hut-loc") || slug.Contains("bình-hút-lộc") || slug.Contains("dia-gom") || slug.Contains("đĩa-gốm") ||
                             name.Contains("bình hút lộc") || name.Contains("đĩa gốm"))
                    {
                        productGifts.Add(new ProductGift { ProductId = p.Id, GiftId = giftDeVuong.Id, Quantity = 1 });
                    }
                }

                if (productGifts.Any())
                {
                    await context.ProductGifts.AddRangeAsync(productGifts);
                    await context.SaveChangesAsync();
                }
            }

            await SeedAdministrativeUnitsAsync(context);
        }

        private static async Task SeedAdministrativeUnitsAsync(AppDbContext context)
        {
            if (await context.AdministrativeUnits.AnyAsync()) return;

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            try
            {
                Console.WriteLine("[Seed] Đang tải danh sách tỉnh/thành phố từ provinces.open-api.vn (API v2)...");

                // Bước 1: Lấy danh sách tỉnh/TP (API v2, sau sáp nhập: 34 tỉnh)
                var listResponse = await httpClient.GetAsync("https://provinces.open-api.vn/api/v2/p/");
                if (!listResponse.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[Seed] ⚠️ API trả về HTTP {(int)listResponse.StatusCode}");
                    return;
                }

                var listJson = await listResponse.Content.ReadAsStringAsync();
                var provinces = JsonSerializer.Deserialize<List<ProvinceApiDto>>(listJson, jsonOptions);
                if (provinces == null || !provinces.Any())
                {
                    Console.WriteLine("[Seed] ⚠️ Không parse được danh sách tỉnh/TP.");
                    return;
                }

                Console.WriteLine($"[Seed] Tìm thấy {provinces.Count} tỉnh/TP. Đang tải xã/phường cho từng tỉnh...");

                var units = new List<AdministrativeUnit>();
                int totalWards = 0;

                // Bước 2: Gọi từng tỉnh để lấy danh sách xã/phường
                // (endpoint list-all /api/v2/p/?depth=2 trả wards rỗng, phải gọi riêng từng tỉnh)
                foreach (var p in provinces)
                {
                    // Thêm tỉnh/TP
                    units.Add(new AdministrativeUnit
                    {
                        Code = p.Code,
                        Name = p.Name,
                        Level = "province",
                        CodeName = p.Codename,
                        DivisionType = p.Division_type,
                        ParentCode = null
                    });

                    // Lấy xã/phường của tỉnh này
                    try
                    {
                        var detailResponse = await httpClient.GetAsync($"https://provinces.open-api.vn/api/v2/p/{p.Code}?depth=2");
                        if (detailResponse.IsSuccessStatusCode)
                        {
                            var detailJson = await detailResponse.Content.ReadAsStringAsync();
                            var detail = JsonSerializer.Deserialize<ProvinceDetailApiDto>(detailJson, jsonOptions);

                            if (detail?.Wards != null)
                            {
                                foreach (var w in detail.Wards)
                                {
                                    units.Add(new AdministrativeUnit
                                    {
                                        Code = w.Code,
                                        Name = w.Name,
                                        Level = "ward",
                                        CodeName = w.Codename,
                                        DivisionType = w.Division_type,
                                        ParentCode = p.Code
                                    });
                                    totalWards++;
                                }
                            }
                        }

                        // Delay nhỏ để không spam API
                        await Task.Delay(100);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Seed] ⚠️ Lỗi tải xã/phường cho {p.Name}: {ex.Message}");
                    }
                }

                Console.WriteLine($"[Seed] Đã parse {provinces.Count} tỉnh/TP và {totalWards} xã/phường. Đang lưu vào DB...");

                // Bước 3: Bulk insert
                await context.AdministrativeUnits.AddRangeAsync(units);
                await context.SaveChangesAsync();

                Console.WriteLine($"[Seed] ✅ Đã seed thành công {units.Count} đơn vị hành chính vào bảng AdministrativeUnits.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Seed] ❌ Lỗi khi seed AdministrativeUnits: {ex.Message}");
            }
        }

        // DTO cho danh sách tỉnh (không có wards khi list all)
        private class ProvinceApiDto
        {
            public int Code { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Codename { get; set; } = string.Empty;
            public string Division_type { get; set; } = string.Empty;
        }

        // DTO cho chi tiết 1 tỉnh (có wards khi gọi riêng với depth=2)
        private class ProvinceDetailApiDto
        {
            public int Code { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Codename { get; set; } = string.Empty;
            public string Division_type { get; set; } = string.Empty;
            public List<WardApiDto>? Wards { get; set; }
        }

        private class WardApiDto
        {
            public int Code { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Codename { get; set; } = string.Empty;
            public string Division_type { get; set; } = string.Empty;
        }
    }
}


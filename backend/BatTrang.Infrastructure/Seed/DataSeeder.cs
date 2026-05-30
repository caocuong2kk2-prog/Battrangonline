using BatTrang.Core.Entities;
using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
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
                    Password = "admin",
                    Role = "admin"
                });
                await context.SaveChangesAsync();
            }
            else if (string.IsNullOrEmpty(defaultAdmin.Role) || defaultAdmin.Role != "admin")
            {
                defaultAdmin.Role = "admin";
                await context.SaveChangesAsync();
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
                    new Product { Name = "Lộc Bình Vẽ Tay 1M6", Slug = "loc-binh-ve-tay-1m6", CategoryId = locBinh.Id, Status = "active", Badge = "Nổi bật", Description = "Lộc bình vẽ tay 1M6 thuộc chất liệu gốm sứ cao cấp, qua tay nghệ nhân thủ công với hàng chục năm kinh nghiệm...", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size160.Id, Price = 40000000, Stock = 5, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-1-1.jpg", SortOrder = 1 }, new ProductImage { ImageUrl = "assets/images/product-1-2.jpg", SortOrder = 2 } } } } },
                    new Product { Name = "Lộc Bình Men Rạn", Slug = "loc-binh-men-ran", CategoryId = locBinh.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size120.Id, Price = 33000000, Stock = 8, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-2-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Lộc Bình Trổ", Slug = "loc-binh-tro", CategoryId = locBinh.Id, Status = "active", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size100.Id, Price = 26000000, Stock = 3, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-3-1.jpg", SortOrder = 1 } } } } },
                    new Product { Name = "Tranh Gốm Phúc Lộc Thọ", Slug = "tranh-gom-phuc-loc-tho", CategoryId = tranhGom.Id, Status = "active", Badge = "Mới", Variants = new List<ProductVariant> { new ProductVariant { SizeId = size60x90.Id, Price = 22808000, Stock = 12, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-4-1.jpg", SortOrder = 1 } } } } },
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
        }
    }
}

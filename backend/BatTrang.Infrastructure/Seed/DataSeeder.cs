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

            if (!context.AdminUsers.Any(u => u.Username == "admin"))
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
                    Password = "admin"
                });
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

            if (!context.Products.Any())
            {
                var locBinh = await context.Categories.FirstAsync(c => c.Slug == "loc-binh");
                var tranhGom = await context.Categories.FirstAsync(c => c.Slug == "tranh-gom");
                var doTho = await context.Categories.FirstAsync(c => c.Slug == "do-tho");
                var binhHoa = await context.Categories.FirstAsync(c => c.Slug == "binh-hoa");
                var chumVat = await context.Categories.FirstAsync(c => c.Slug == "chum-vat");
                var diaGom = await context.Categories.FirstAsync(c => c.Slug == "dia-gom");

                var products = new List<Product>
                {
                    new Product { Name = "Lộc Bình Vẽ Tay 1M6", Slug = "loc-binh-ve-tay-1m6", Price = 40000000, CategoryId = locBinh.Id, Material = "Gốm sứ cao cấp", Style = "Vẽ tay thủ công", Color = "Nâu – Vàng", Size = "1.6m", Status = "active", Badge = "Nổi bật", Stock = 5, Description = "Lộc bình vẽ tay 1M6 thuộc chất liệu gốm sứ cao cấp, qua tay nghệ nhân thủ công với hàng chục năm kinh nghiệm...", Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-1-1.jpg", SortOrder = 1 }, new ProductImage { ImageUrl = "assets/images/product-1-2.jpg", SortOrder = 2 } } },
                    new Product { Name = "Lộc Bình Men Ra", Slug = "loc-binh-men-ra", Price = 33000000, CategoryId = locBinh.Id, Material = "Gốm sứ", Style = "Men ra", Color = "Xanh lam", Size = "1.2m", Status = "active", Stock = 8, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-2-1.jpg", SortOrder = 1 } } },
                    new Product { Name = "Lộc Bình Trổ", Slug = "loc-binh-tro", Price = 26000000, CategoryId = locBinh.Id, Material = "Gốm sứ", Style = "Điêu khắc trổ", Color = "Trắng ngà", Size = "1.0m", Status = "active", Stock = 3, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-3-1.jpg", SortOrder = 1 } } },
                    new Product { Name = "Tranh Gốm Phúc Lộc Thọ", Slug = "tranh-gom-phuc-loc-tho", Price = 22808000, CategoryId = tranhGom.Id, Material = "Gốm sứ", Style = "Vẽ tay", Color = "Đa sắc", Size = "60x90cm", Status = "active", Badge = "Mới", Stock = 12, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-4-1.jpg", SortOrder = 1 } } },
                    new Product { Name = "Bộ Đồ Thờ Cao Cấp", Slug = "bo-do-tho-cao-cap", Price = 15000000, CategoryId = doTho.Id, Material = "Gốm sứ cao cấp", Style = "Truyền thống", Color = "Đỏ – Vàng", Size = "Bộ 5 món", Status = "active", Stock = 7, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-5-1.jpg", SortOrder = 1 } } },
                    new Product { Name = "Bình Hút Lộc", Slug = "binh-hut-loc", Price = 12000000, CategoryId = binhHoa.Id, Material = "Gốm sứ", Style = "Vẽ tay", Color = "Trắng – Xanh", Size = "60cm", Status = "active", Stock = 15, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-6-1.jpg", SortOrder = 1 } } },
                    new Product { Name = "Chum Ngâm Rượu", Slug = "chum-ngam-ruou", Price = 9500000, CategoryId = chumVat.Id, Material = "Gốm sứ dân gian", Style = "Truyền thống", Color = "Nâu tự nhiên", Size = "20 lít", Status = "active", Stock = 6, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-7-1.jpg", SortOrder = 1 } } },
                    new Product { Name = "Đĩa Gốm Phong Thuỷ", Slug = "dia-gom-phong-thuy", Price = 8000000, CategoryId = diaGom.Id, Material = "Gốm sứ", Style = "Vẽ tay", Color = "Xanh – Trắng", Size = "40cm", Status = "active", Stock = 10, Images = new List<ProductImage> { new ProductImage { ImageUrl = "assets/images/product-8-1.jpg", SortOrder = 1 } } }
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
                    Note = "Giao giờ hành chính",
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
        }
    }
}

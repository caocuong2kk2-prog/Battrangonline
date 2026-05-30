using BatTrang.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BatTrang.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Product> Products { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }
        public DbSet<ProductType> ProductTypes { get; set; }
        public DbSet<Size> Sizes { get; set; }
        public DbSet<Material> Materials { get; set; }
        public DbSet<Color> Colors { get; set; }
        public DbSet<Pattern> Patterns { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<GlazeLine> GlazeLines { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<JourneyTopic> JourneyTopics { get; set; }
        public DbSet<JourneyVideo> JourneyVideos { get; set; }
        public DbSet<ContactMessage> ContactMessages { get; set; }
        public DbSet<SiteConfig> SiteConfigs { get; set; }
        public DbSet<AdminUser> AdminUsers { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ProductVariant>()
                .Property(pv => pv.Price)
                .HasColumnType("decimal(18,2)");
                
            modelBuilder.Entity<ProductVariant>()
                .Property(pv => pv.OriginalPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Product)
                .WithMany(p => p.Variants)
                .HasForeignKey(pv => pv.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProductImage>()
                .HasOne(pi => pi.Variant)
                .WithMany(pv => pv.Images)
                .HasForeignKey(pi => pi.VariantId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Product>()
                .HasIndex(p => p.Slug)
                .IsUnique();

            modelBuilder.Entity<Size>()
                .Property(s => s.ValueInCm)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Size)
                .WithMany(s => s.ProductVariants)
                .HasForeignKey(pv => pv.SizeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.GlazeLine)
                .WithMany(g => g.ProductVariants)
                .HasForeignKey(pv => pv.GlazeLineId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.ProductType)
                .WithMany(t => t.ProductVariants)
                .HasForeignKey(pv => pv.ProductTypeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Material)
                .WithMany(m => m.ProductVariants)
                .HasForeignKey(pv => pv.MaterialId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Color)
                .WithMany(c => c.ProductVariants)
                .HasForeignKey(pv => pv.ColorId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProductVariant>()
                .HasOne(pv => pv.Pattern)
                .WithMany(pt => pt.ProductVariants)
                .HasForeignKey(pv => pv.PatternId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Order>()
                .Property(o => o.Total)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.OrderCode)
                .IsUnique();

            modelBuilder.Entity<OrderItem>()
                .Property(oi => oi.UnitPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Category>()
                .HasIndex(c => c.Slug)
                .IsUnique();

            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.Email)
                .IsUnique();

            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.Phone);

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.CustomerId);

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.CreatedAt);

            modelBuilder.Entity<JourneyTopic>()
                .HasIndex(t => t.Slug)
                .IsUnique();

            modelBuilder.Entity<SiteConfig>()
                .HasIndex(s => s.Key)
                .IsUnique();
                
            modelBuilder.Entity<AdminUser>()
                .HasIndex(u => u.Username)
                .IsUnique();
                
            modelBuilder.Entity<Notification>()
                .HasIndex(n => n.CreatedAt);
        }
    }
}

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
        public DbSet<Gift> Gifts { get; set; }
        public DbSet<ProductGift> ProductGifts { get; set; }
        public DbSet<Campaign> Campaigns { get; set; }
        public DbSet<CampaignProduct> CampaignProducts { get; set; }

        // Address Module
        public DbSet<AdministrativeUnit> AdministrativeUnits { get; set; }
        public DbSet<SavedAddress> SavedAddresses { get; set; }

        // Affiliate Module
        public DbSet<BatTrang.Core.Entities.Affiliate.Affiliate> Affiliates { get; set; }
        public DbSet<Commission> Commissions { get; set; }
        public DbSet<CommissionPolicy> CommissionPolicies { get; set; }
        public DbSet<WithdrawalRequest> WithdrawalRequests { get; set; }
        public DbSet<BatTrang.Core.Entities.Affiliate.AffiliateClick> AffiliateClicks { get; set; }
        public DbSet<BatTrang.Core.Entities.AffiliateNotification> AffiliateNotifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<BatTrang.Core.Entities.Affiliate.AffiliateClick>()
                .HasOne(ac => ac.Affiliate)
                .WithMany()
                .HasForeignKey(ac => ac.AffiliateId)
                .OnDelete(DeleteBehavior.Cascade);
            
            modelBuilder.Entity<BatTrang.Core.Entities.Affiliate.AffiliateClick>()
                .HasIndex(ac => ac.ClickedAt);
                
            modelBuilder.Entity<BatTrang.Core.Entities.Affiliate.AffiliateClick>()
                .HasIndex(ac => new { ac.AffiliateId, ac.IpAddress, ac.ClickedAt });

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

            modelBuilder.Entity<Category>()
                .HasOne(c => c.Parent)
                .WithMany(c => c.SubCategories)
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.Email)
                .IsUnique()
                .HasFilter("[Email] IS NOT NULL");

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

            // Affiliate Module Configurations
            modelBuilder.Entity<BatTrang.Core.Entities.Affiliate.Affiliate>()
                .HasOne(a => a.Parent)
                .WithMany(a => a.Children)
                .HasForeignKey(a => a.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<BatTrang.Core.Entities.Affiliate.Affiliate>()
                .HasIndex(a => a.AffiliateCode)
                .IsUnique();
                
            modelBuilder.Entity<BatTrang.Core.Entities.Affiliate.Affiliate>()
                .HasIndex(a => a.Email)
                .IsUnique();

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Affiliate)
                .WithMany(a => a.ReferredOrders)
                .HasForeignKey(o => o.AffiliateId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Commission>()
                .Property(c => c.OrderTotalAmount)
                .HasColumnType("decimal(18,2)");
                
            modelBuilder.Entity<Commission>()
                .Property(c => c.CommissionAmount)
                .HasColumnType("decimal(18,2)");
                
            modelBuilder.Entity<Commission>()
                .Property(c => c.CommissionRate)
                .HasColumnType("decimal(5,2)");

            modelBuilder.Entity<CommissionPolicy>()
                .Property(c => c.Percentage)
                .HasColumnType("decimal(5,2)");

            modelBuilder.Entity<WithdrawalRequest>()
                .Property(w => w.Amount)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<BatTrang.Core.Entities.AffiliateNotification>()
                .HasOne(n => n.Affiliate)
                .WithMany()
                .HasForeignKey(n => n.AffiliateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProductGift>()
                .HasKey(pg => new { pg.ProductId, pg.GiftId });

            modelBuilder.Entity<ProductGift>()
                .HasOne(pg => pg.Product)
                .WithMany()
                .HasForeignKey(pg => pg.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProductGift>()
                .HasOne(pg => pg.Gift)
                .WithMany()
                .HasForeignKey(pg => pg.GiftId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Gift>()
                .Property(g => g.EstimatedValue)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Gift)
                .WithMany()
                .HasForeignKey(oi => oi.GiftId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<CampaignProduct>()
                .HasOne(cp => cp.Campaign)
                .WithMany(c => c.CampaignProducts)
                .HasForeignKey(cp => cp.CampaignId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CampaignProduct>()
                .HasOne(cp => cp.Product)
                .WithMany()
                .HasForeignKey(cp => cp.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            // Address Module
            modelBuilder.Entity<AdministrativeUnit>()
                .HasKey(a => new { a.Code, a.Level });

            modelBuilder.Entity<AdministrativeUnit>()
                .Property(a => a.Code)
                .ValueGeneratedNever(); // Code đến từ API bên ngoài, không tự sinh

            modelBuilder.Entity<AdministrativeUnit>()
                .HasIndex(a => new { a.Level, a.ParentCode });

            modelBuilder.Entity<SavedAddress>()
                .HasOne(sa => sa.Customer)
                .WithMany()
                .HasForeignKey(sa => sa.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SavedAddress>()
                .HasIndex(sa => sa.CustomerId);
        }
    }
}

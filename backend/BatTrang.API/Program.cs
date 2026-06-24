using BatTrang.Core.Interfaces;
using BatTrang.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using BatTrang.API.Hubs;
using BatTrang.Infrastructure.Repositories;
using BatTrang.Infrastructure.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using Microsoft.AspNetCore.Rewrite;
using BatTrang.API.Middlewares;
using DotNetEnv;

Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();
builder.Services.AddOutputCache(options =>
{
    // Cấu hình các policy cache để dễ dàng xóa theo Tag
    options.AddPolicy("ProductsCache", builder => builder.Expire(TimeSpan.FromMinutes(10)).SetVaryByQuery("*").Tag("products"));
    options.AddPolicy("FiltersCache", builder => builder.Expire(TimeSpan.FromHours(24)).Tag("filters"));
    options.AddPolicy("ConfigsCache", builder => builder.Expire(TimeSpan.FromHours(24)).Tag("configs"));
});

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IJourneyRepository, JourneyRepository>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<IContactRepository, ContactRepository>();
builder.Services.AddScoped<ISiteConfigRepository, SiteConfigRepository>();
builder.Services.AddScoped<IAdminUserRepository, AdminUserRepository>();
builder.Services.AddScoped<BatTrang.Infrastructure.Services.NotificationService>();
builder.Services.AddScoped<BatTrang.Infrastructure.Services.StockService>();
builder.Services.AddScoped<BatTrang.Infrastructure.Services.CommissionService>();
builder.Services.AddScoped<BatTrang.Infrastructure.Services.InvoiceService>();
builder.Services.AddHttpClient<BatTrang.Infrastructure.Services.ReCaptchaService>();
builder.Services.AddScoped<BatTrang.Infrastructure.Services.ReCaptchaService>();
builder.Services.AddSingleton<BatTrang.Infrastructure.Services.FileCleanupService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<BatTrang.Infrastructure.Services.FileCleanupService>());
builder.Services.AddHostedService<BatTrang.Infrastructure.Services.BadgeUpdateService>();
builder.Services.AddHostedService<BatTrang.Infrastructure.Services.NotificationCleanupService>();
builder.Services.AddHostedService<BatTrang.Infrastructure.Services.AffiliateTierEvaluationService>();
builder.Services.AddHostedService<BatTrang.API.Services.CommissionAutoApproveService>();
builder.Services.AddHostedService<BatTrang.Infrastructure.Services.DatabaseBackupService>();
builder.Services.AddHostedService<BatTrang.API.Services.CampaignUpdateService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLiveServer", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("LoginPolicy", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "default_secret_key_that_is_at_least_32_bytes";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"]
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("AdminOrStaff", policy => policy.RequireRole("admin", "staff"));
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "BatTrang API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

var app = builder.Build();

// Seed Data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DataSeeder.SeedAsync(context);
}

app.UseCors("AllowLiveServer");
app.UseOutputCache();

// Skip HTTPS redirect in Development (cloudflared/reverse proxy handles SSL)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseWhen(context => !context.Request.Path.StartsWithSegments("/api") && !context.Request.Path.StartsWithSegments("/hub"), appBuilder =>
{
    appBuilder.UseStatusCodePagesWithReExecute("/404.html");
});

// Clean URL Rewrite Rules
var rewriteOptions = new Microsoft.AspNetCore.Rewrite.RewriteOptions()
    .AddRedirect(@"^admin$", "admin/")
    .AddRewrite(@"^admin/([a-zA-Z0-9_-]+)$", "admin/$1.html", skipRemainingRules: true)
    .AddRedirect(@"^affiliate$", "affiliate/")
    .AddRewrite(@"^affiliate/?$", "affiliate/index.html", skipRemainingRules: true)
    .AddRewrite(@"^affiliate/([a-zA-Z0-9_-]+)$", "affiliate/$1.html", skipRemainingRules: true)
    .AddRewrite(@"^danh-muc/([^/]+)$", "products.html?category=$1", skipRemainingRules: true)
    .AddRewrite(@"^(about|cart|checkout|contact|forgot-password|index|journey|login|order-success|order-tracking|privacy-policy|product-detail|products|return-policy|shipping-policy|shopping-guide|terms-of-service|warranty-policy|404)$", "$1.html", skipRemainingRules: true)
    .AddRewrite(@"^(?!(api|hub|admin|affiliate|uploads|css|js|assets|components|images|danh-muc|.*\.html$|.*\.txt$|.*\.xml$|.*\.ico$))([^/]+)$", "product-detail.html?slug=$2", skipRemainingRules: true);
app.UseRewriter(rewriteOptions);

// Use custom SEO Middleware to intercept and inject meta tags
app.UseMiddleware<SeoMiddleware>();

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name.EndsWith(".html"))
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            ctx.Context.Response.Headers.Append("Pragma", "no-cache");
            ctx.Context.Response.Headers.Append("Expires", "0");
        }
        else
        {
            var maxAge = TimeSpan.FromDays(365);
            ctx.Context.Response.Headers.Append("Cache-Control", $"public, max-age={maxAge.TotalSeconds}");
        }
    }
}); // Serves default wwwroot (like uploads)

// Serve admin static files at /admin
var adminPath = System.IO.Path.GetFullPath(System.IO.Path.Combine(builder.Environment.ContentRootPath, "..", "..", "admin"));
if (System.IO.Directory.Exists(adminPath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(adminPath),
        RequestPath = "/admin"
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(adminPath),
        RequestPath = "/admin",
        OnPrepareResponse = ctx =>
        {
            if (ctx.File.Name.EndsWith(".html"))
            {
                ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
                ctx.Context.Response.Headers.Append("Pragma", "no-cache");
                ctx.Context.Response.Headers.Append("Expires", "0");
            }
            else
            {
                var maxAge = TimeSpan.FromDays(365);
                ctx.Context.Response.Headers.Append("Cache-Control", $"public, max-age={maxAge.TotalSeconds}");
            }
        }
    });
}

// Serve affiliate static files at /affiliate
var affiliatePath = System.IO.Path.GetFullPath(System.IO.Path.Combine(builder.Environment.ContentRootPath, "..", "..", "affiliate"));
if (System.IO.Directory.Exists(affiliatePath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(affiliatePath),
        RequestPath = "/affiliate"
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(affiliatePath),
        RequestPath = "/affiliate",
        OnPrepareResponse = ctx =>
        {
            if (ctx.File.Name.EndsWith(".html"))
            {
                ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
                ctx.Context.Response.Headers.Append("Pragma", "no-cache");
                ctx.Context.Response.Headers.Append("Expires", "0");
            }
            else
            {
                var maxAge = TimeSpan.FromDays(365);
                ctx.Context.Response.Headers.Append("Cache-Control", $"public, max-age={maxAge.TotalSeconds}");
            }
        }
    });
}

// Serve user static files at /
var userPath = System.IO.Path.GetFullPath(System.IO.Path.Combine(builder.Environment.ContentRootPath, "..", "..", "user"));
if (System.IO.Directory.Exists(userPath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(userPath),
        RequestPath = ""
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(userPath),
        RequestPath = "",
        OnPrepareResponse = ctx =>
        {
            if (ctx.File.Name.EndsWith(".html"))
            {
                ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
                ctx.Context.Response.Headers.Append("Pragma", "no-cache");
                ctx.Context.Response.Headers.Append("Expires", "0");
            }
            else
            {
                var maxAge = TimeSpan.FromDays(365);
                ctx.Context.Response.Headers.Append("Cache-Control", $"public, max-age={maxAge.TotalSeconds}");
            }
        }
    });
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHub<NotificationHub>("/hub/notifications");
app.MapControllers();

app.Run();

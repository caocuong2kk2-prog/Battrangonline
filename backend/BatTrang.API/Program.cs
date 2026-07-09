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

// Enable Response Compression for high performance text assets (Brotli & Gzip)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});

builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest;
});

builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest;
});
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
builder.Services.AddHostedService<BatTrang.API.Services.BadgeUpdateService>();
builder.Services.AddHostedService<BatTrang.Infrastructure.Services.NotificationCleanupService>();
builder.Services.AddHostedService<BatTrang.API.Services.AffiliateTierEvaluationService>();
builder.Services.AddHostedService<BatTrang.API.Services.CommissionAutoApproveService>();
builder.Services.AddHostedService<BatTrang.Infrastructure.Services.DatabaseBackupService>();
builder.Services.AddHostedService<BatTrang.API.Services.CampaignUpdateService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLiveServer", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin => 
                    System.Text.RegularExpressions.Regex.IsMatch(origin, @"^https?://localhost(:[0-9]+)?$|^https?://127\.0\.0\.1(:[0-9]+)?$"))
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            // Trên môi trường thực tế (Production), chỉ cho phép truy cập từ tên miền chính thức của hệ thống
            policy.WithOrigins("https://phucgiatien.vn", "https://www.phucgiatien.vn")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    // Login Policy: Max 5 requests per minute per IP
    options.AddPolicy("LoginPolicy", context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? context.Request.Headers.Host.ToString(),
            factory: partition => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
            
    // Auth Policy (Register, Forgot Password): Max 3 requests per minute per IP
    options.AddPolicy("AuthPolicy", context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? context.Request.Headers.Host.ToString(),
            factory: partition => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
            
    // Contact Policy: Max 3 requests per minute per IP
    options.AddPolicy("ContactPolicy", context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? context.Request.Headers.Host.ToString(),
            factory: partition => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
            
    // Checkout Policy: Max 3 orders per minute per IP
    options.AddPolicy("CheckoutPolicy", context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? context.Request.Headers.Host.ToString(),
            factory: partition => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32 || jwtKey.Contains("default_secret_key") || jwtKey.Contains("super_secret_key") || jwtKey.Contains("YOUR_JWT_SECRET_KEY_HERE"))
{
    throw new Exception("CRITICAL SECURITY ERROR: Jwt:Key is missing, too short, or using a placeholder. You must configure a strong Jwt:Key (>= 32 characters) in appsettings.json or environment variables.");
}

if (string.IsNullOrWhiteSpace(jwtIssuer) || jwtIssuer.Contains("YOUR_JWT_ISSUER_HERE"))
{
    throw new Exception("CRITICAL SECURITY ERROR: Jwt:Issuer is missing or using a placeholder. You must configure a valid Jwt:Issuer in appsettings.json or environment variables.");
}

if (string.IsNullOrWhiteSpace(jwtAudience) || jwtAudience.Contains("YOUR_JWT_AUDIENCE_HERE"))
{
    throw new Exception("CRITICAL SECURITY ERROR: Jwt:Audience is missing or using a placeholder. You must configure a valid Jwt:Audience in appsettings.json or environment variables.");
}
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
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
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

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

// Seed Data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DataSeeder.SeedAsync(context);
}

app.UseExceptionHandler(appError =>
{
    appError.Run(async context =>
    {
        context.Response.ContentType = "application/json";
        var contextFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        if (contextFeature != null)
        {
            if (contextFeature.Error is Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                bool isDelete = context.Request.Method == HttpMethods.Delete || 
                                (context.Request.Path.Value?.Contains("delete", StringComparison.OrdinalIgnoreCase) == true);
                
                string msg = isDelete 
                    ? "Không thể thực hiện thao tác xóa vì dữ liệu này đang được sử dụng ở nơi khác (ví dụ: đã nằm trong đơn hàng hoặc có dữ liệu liên kết)."
                    : "Lỗi lưu dữ liệu. Có thể do trùng lặp dữ liệu hoặc vi phạm ràng buộc.";
                
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { message = msg });
                return;
            }

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            // You can log the error here using your logger: _logger.LogError(contextFeature.Error, "Unhandled exception");
            var isDev = app.Environment.IsDevelopment();
            await context.Response.WriteAsJsonAsync(new
            {
                StatusCode = context.Response.StatusCode,
                Message = "Internal Server Error. Please try again later.",
                Detail = isDev ? contextFeature.Error.Message : null
            });
        }
    });
});

app.UseCors("AllowLiveServer");
app.UseResponseCompression();
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
            // Allow Bfcache by using no-cache instead of no-store, forcing revalidation on normal load
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, must-revalidate");
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
                ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, must-revalidate");
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
                ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, must-revalidate");
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
                ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, must-revalidate");
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

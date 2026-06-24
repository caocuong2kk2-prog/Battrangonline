using BatTrang.Core.DTOs;
using BatTrang.Core.Entities;
using BatTrang.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using BatTrang.API.Hubs;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using BatTrang.Infrastructure.Data;
using BatTrang.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace BatTrang.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepo;
        private readonly IProductRepository _productRepo;
        private readonly ICustomerRepository _customerRepo;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly AppDbContext _context;
        private readonly IOutputCacheStore _cacheStore;
        private readonly IMemoryCache _cache;
        private readonly InvoiceService _invoiceService;
        private readonly NotificationService _notificationService;
        private readonly IConfiguration _config;
        private readonly ReCaptchaService _reCaptchaService;

        public OrdersController(IOrderRepository orderRepo, IProductRepository productRepo, ICustomerRepository customerRepo, IHubContext<NotificationHub> hubContext, AppDbContext context, IOutputCacheStore cacheStore, IMemoryCache cache, InvoiceService invoiceService, NotificationService notificationService, IConfiguration config, ReCaptchaService reCaptchaService)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _customerRepo = customerRepo;
            _hubContext = hubContext;
            _context = context;
            _cacheStore = cacheStore;
            _cache = cache;
            _invoiceService = invoiceService;
            _notificationService = notificationService;
            _config = config;
            _reCaptchaService = reCaptchaService;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            
            // ReCaptcha check if IP has ordered today
            var today = DateTime.UtcNow.AddHours(7).Date;
            var startOfToday = today;
            var endOfToday = today.AddDays(1);
            
            var ordersToday = await _context.Orders
                .Where(o => o.CreatedAt >= startOfToday && o.CreatedAt < endOfToday)
                .ToListAsync();
            
            // Lọc bằng mã nguồn thay vì câu SQL phức tạp để dễ dàng lấy IP hoặc SĐT
            // Vì Order ko lưu IP, chúng ta chỉ đếm theo số điện thoại (Phone) hoặc có thể thêm cache đếm IP.
            // Để chính xác và đơn giản nhất, kiểm tra SĐT
            var cleanInputPhone = NormalizePhoneNumber(dto.Phone);
            var phoneOrdersToday = ordersToday.Count(o => NormalizePhoneNumber(o.CustomerPhone) == cleanInputPhone);

            // Kiểm tra theo MemoryCache IP Address
            var ipOrderCacheKey = $"OrdersToday_{ipAddress}";
            _cache.TryGetValue(ipOrderCacheKey, out int ipOrdersToday);

            if (phoneOrdersToday >= 1 || ipOrdersToday >= 1)
            {
                if (string.IsNullOrEmpty(dto.RecaptchaToken))
                {
                    return StatusCode(428, new { code = "REQUIRE_RECAPTCHA", message = "Bạn thao tác quá nhanh. Vui lòng xác thực bạn không phải robot." });
                }

                var isCaptchaValid = await _reCaptchaService.VerifyTokenAsync(dto.RecaptchaToken);
                if (!isCaptchaValid)
                {
                    return BadRequest(new { message = "Xác thực reCAPTCHA thất bại. Vui lòng thử lại." });
                }
            }

            const int maxRetry = 3;
            for (int r = 0; r < maxRetry; r++)
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // 1. Quản lý khách hàng
                    Customer customer = null;
                    
                    // Thử lấy CustomerId từ JWT token (nếu người dùng đã đăng nhập)
                    var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                                    ?? User.FindFirst("sub")?.Value;
                    if (!string.IsNullOrEmpty(userIdString) && int.TryParse(userIdString, out int loggedInCustomerId))
                    {
                        customer = await _customerRepo.GetByIdAsync(loggedInCustomerId);
                    }

                    if (customer == null)
                    {
                        var normalizedEmail = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();

                        // Nếu chưa đăng nhập hoặc không tìm thấy tài khoản tương ứng, tìm theo SĐT hoặc Email (Guest)
                        customer = await _customerRepo.GetByPhoneOrEmailAsync(dto.Phone, normalizedEmail);
                        if (customer == null)
                        {
                            customer = new Customer
                            {
                                Name = dto.Customer,
                                Phone = dto.Phone,
                                Email = normalizedEmail,
                                Address = dto.Address,
                                Status = "active",
                                JoinedAt = DateTime.UtcNow.AddHours(7)
                            };
                            _context.Customers.Add(customer);
                        }
                        else
                        {
                            customer.Name = dto.Customer;
                            customer.Address = dto.Address;
                            // Nếu email hiện tại của khách là null hoặc email ảo và khách mới nhập email thực
                            if ((string.IsNullOrEmpty(customer.Email) || customer.Email.EndsWith("@phucgiatien.temp")) && !string.IsNullOrEmpty(normalizedEmail))
                            {
                                // Kiểm tra xem email thực này đã được sử dụng bởi ai khác chưa
                                var emailExists = await _context.Customers.AnyAsync(c => c.Email == normalizedEmail && c.Id != customer.Id);
                                if (!emailExists)
                                {
                                    customer.Email = normalizedEmail;
                                }
                            }
                            _context.Customers.Update(customer);
                        }
                    }
                    else
                    {
                        // Nếu đã đăng nhập, cập nhật địa chỉ giao hàng gần nhất vào tài khoản
                        customer.Address = dto.Address;
                        _context.Customers.Update(customer);
                    }
                    await _context.SaveChangesAsync(); // Cần save để lấy CustomerId

                    // 2. Affiliate Tracking
                    int? affiliateId = null;
                    if (!string.IsNullOrEmpty(dto.AffiliateCode))
                    {
                        var affiliate = await _context.Affiliates.FirstOrDefaultAsync(a => a.AffiliateCode == dto.AffiliateCode && a.Status == "Active");
                        if (affiliate != null)
                        {
                            affiliateId = affiliate.Id;
                        }
                    }

                    // 3. Tạo đơn hàng và trừ kho
                    var order = new Order
                    {
                        OrderCode = "DH" + new Random().Next(10000, 99999),
                        CustomerId = customer.Id,
                        AffiliateId = affiliateId,
                        CustomerName = dto.Customer,
                        CustomerPhone = dto.Phone,
                        CustomerEmail = dto.Email,
                        Address = dto.Address,
                        CustomerNote = dto.CustomerNote,
                        Status = "pending",
                        CreatedAt = DateTime.UtcNow.AddHours(7)
                    };

                    decimal total = 0;
                    var stockWarnings = new List<string>();
                    foreach (var item in dto.Items)
                    {
                        var product = await _context.Products
                            .Include(p => p.Variants).ThenInclude(v => v.Size)
                            .Include(p => p.Variants).ThenInclude(v => v.Pattern)
                            .Include(p => p.Variants).ThenInclude(v => v.Color)
                            .Include(p => p.Variants).ThenInclude(v => v.GlazeLine)
                            .Include(p => p.Variants).ThenInclude(v => v.Material)
                            .Include(p => p.Variants).ThenInclude(v => v.ProductType)
                            .FirstOrDefaultAsync(p => p.Id == item.Id);
                        if (product != null)
                        {
                            var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size) ?? product.Variants.FirstOrDefault();
                            if (variant == null) continue;

                            // Kiểm tra kho
                            if (variant.Stock < item.Qty)
                            {
                                await transaction.RollbackAsync();
                                var stockMsg = variant.Stock == 0
                                    ? $"Rất tiếc! Sản phẩm '{product.Name}' vừa hết hàng (có thể do người khác vừa đặt trước). Vui lòng chọn sản phẩm khác hoặc liên hệ shop để được hỗ trợ."
                                    : $"Sản phẩm '{product.Name}' chỉ còn {variant.Stock} chiếc, không đủ số lượng bạn đặt ({item.Qty} chiếc). Vui lòng giảm số lượng hoặc liên hệ shop.";
                                return BadRequest(new { message = stockMsg });
                            }

                            // Trừ kho
                            variant.Stock -= item.Qty;

                            // Tự động ẩn nếu hết sạch mọi loại và tạo cảnh báo kho
                            int totalStock = product.Variants.Sum(v => v.Stock);
                            if (totalStock <= 0)
                            {
                                product.Status = "inactive";
                                stockWarnings.Add($"Sản phẩm <strong>{product.Name}</strong> đã hết hàng (Ngưng bán).");
                            }
                            else if (totalStock <= 2)
                            {
                                stockWarnings.Add($"Sản phẩm <strong>{product.Name}</strong> sắp hết hàng (còn {totalStock} chiếc).");
                            }

                            var attrs = new List<string>();
                            if (variant.Size != null && variant.Size.Name != "Default") attrs.Add(variant.Size.Name);
                            if (variant.Pattern != null) attrs.Add(variant.Pattern.Name);
                            if (variant.Color != null) attrs.Add(variant.Color.Name);
                            if (variant.GlazeLine != null) attrs.Add(variant.GlazeLine.Name);
                            if (variant.Material != null) attrs.Add(variant.Material.Name);
                            if (variant.ProductType != null) attrs.Add(variant.ProductType.Name);

                            string fullName = product.Name;
                            if (attrs.Count > 0)
                            {
                                fullName += " - " + string.Join(" • ", attrs);
                            }

                            var price = variant.Price;
                            order.Items.Add(new OrderItem
                            {
                                ProductId = product.Id,
                                ProductName = fullName,
                                Size = item.Size,
                                UnitPrice = price,
                                Quantity = item.Qty
                            });
                            total += (price * item.Qty);

                            // Tự động quét và thêm quà tặng kèm của sản phẩm này
                            var productGifts = await _context.ProductGifts
                                .Include(pg => pg.Gift)
                                .Where(pg => pg.ProductId == product.Id && pg.Gift.Status == "active")
                                .ToListAsync();

                            foreach (var pg in productGifts)
                            {
                                var gift = pg.Gift;
                                var giftQty = pg.Quantity * item.Qty;

                                if (gift.Stock.HasValue)
                                {
                                    if (gift.Stock.Value < giftQty)
                                    {
                                        giftQty = gift.Stock.Value;
                                    }
                                    gift.Stock -= giftQty;
                                    _context.Gifts.Update(gift);
                                }

                                if (giftQty > 0)
                                {
                                    order.Items.Add(new OrderItem
                                    {
                                        ProductId = 0, // ProductId = 0 đánh dấu quà tặng
                                        GiftId = gift.Id,
                                        IsGift = true,
                                        ProductName = "[Quà Tặng] " + gift.Name,
                                        Size = null,
                                        UnitPrice = 0,
                                        Quantity = giftQty
                                    });
                                }
                            }
                        }
                    }

                    if (order.Items.Count == 0)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = "Không có sản phẩm hợp lệ trong đơn hàng" });
                    }

                    order.Total = total;
                    _context.Orders.Add(order);
                    
                    await _context.SaveChangesAsync(); // Commit Order, OrderItems, and ProductVariant stock changes
                    await transaction.CommitAsync();

                    // Notifications
                    try
                    {
                        var msg = $"Đơn hàng mới {order.OrderCode} vừa được đặt bởi {order.CustomerName}!";
                        var noti = new BatTrang.Core.Entities.Notification { Type = "OrderPlaced", Message = msg };
                        _context.Notifications.Add(noti);

                        foreach(var warning in stockWarnings)
                        {
                            _context.Notifications.Add(new BatTrang.Core.Entities.Notification { Type = "StockWarning", Message = warning });
                        }

                        if (affiliateId.HasValue)
                        {
                            var affNoti = new BatTrang.Core.Entities.AffiliateNotification
                            {
                                AffiliateId = affiliateId.Value,
                                Title = "Đơn hàng giới thiệu mới! 🛒",
                                Message = $"Tuyệt vời! Có khách hàng vừa đặt đơn {order.OrderCode} qua mã giới thiệu của bạn. Hoa hồng sẽ được cộng sau khi đơn giao thành công.",
                                Type = "order",
                                IsRead = false,
                                CreatedAt = DateTime.UtcNow.AddHours(7)
                            };
                            _context.Set<BatTrang.Core.Entities.AffiliateNotification>().Add(affNoti);
                        }

                        await _context.SaveChangesAsync();

                        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderPlaced", msg);
                        foreach(var warning in stockWarnings)
                        {
                            await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderStatusChanged", warning);
                        }

                        if (affiliateId.HasValue)
                        {
                            await _hubContext.Clients.Group($"Affiliate_{affiliateId.Value}").SendAsync("ReceiveAffiliateNotification", 
                                "Đơn hàng giới thiệu mới! 🛒", 
                                $"Tuyệt vời! Có khách hàng vừa đặt đơn {order.OrderCode} qua mã giới thiệu của bạn. Hoa hồng sẽ được cộng sau khi đơn giao thành công.", 
                                "order");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[SignalR Push Error] {ex.Message}");
                    }

                    await _cacheStore.EvictByTagAsync("products", default);

                    // Gửi email xác nhận đặt hàng thành công
                    if (!string.IsNullOrWhiteSpace(order.CustomerEmail))
                    {
                        try
                        {
                            await _notificationService.SendOrderConfirmationEmailAsync(order.CustomerEmail, order.CustomerName, order.OrderCode);
                        }
                        catch (Exception emailEx)
                        {
                            Console.WriteLine($"[CONFIRMATION EMAIL] Lỗi gửi email xác nhận: {emailEx.Message}");
                        }
                    }

                    // Tăng biến đếm theo IP
                    _cache.Set(ipOrderCacheKey, ipOrdersToday + 1, TimeSpan.FromHours(24));

                    return Ok(new { success = true, orderCode = order.OrderCode });
                }
                catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
                {
                    await transaction.RollbackAsync();
                    _context.ChangeTracker.Clear();
                    if (r == maxRetry - 1) return StatusCode(500, new { message = "Hệ thống đang quá tải thao tác, vui lòng thử lại sau." });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "Lỗi hệ thống khi tạo đơn hàng." });
                }
            }
            return StatusCode(500);
        }

        [HttpGet("{orderCode}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByOrderCode(string orderCode, [FromQuery] string? phone)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var cacheKey = $"TrackFailed_{ipAddress}";
            if (_cache.TryGetValue(cacheKey, out int failedAttempts) && failedAttempts >= 5)
            {
                return StatusCode(429, new { message = "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 1 giờ." });
            }

            var order = await _orderRepo.GetByOrderCodeAsync(orderCode);
            if (order == null)
            {
                IncrementFailedAttempts(cacheKey);
                return NotFound(new { message = "Không tìm thấy đơn hàng hoặc Số điện thoại không khớp." });
            }

            var cleanInputPhone = NormalizePhoneNumber(phone);
            var cleanOrderPhone = NormalizePhoneNumber(order.CustomerPhone);

            if (string.IsNullOrEmpty(cleanInputPhone) || cleanInputPhone != cleanOrderPhone)
            {
                IncrementFailedAttempts(cacheKey);
                return NotFound(new { message = "Không tìm thấy đơn hàng hoặc Số điện thoại không khớp." });
            }

            // Reset failed attempts
            _cache.Remove(cacheKey);

            var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();
            var imagesMap = await _productRepo.GetProductImagesAsync(productIds);

            return Ok(new
            {
                orderCode = order.OrderCode,
                customerName = MaskName(order.CustomerName),
                customerPhone = MaskPhone(order.CustomerPhone),
                address = MaskAddress(order.Address),
                total = order.Total,
                status = order.Status,
                date = order.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                customerNote = order.CustomerNote,
                adminNote = string.Empty, // Hide admin note from public search
                isCancelRequested = order.IsCancelRequested,
                cancelReason = order.CancelReason,
                statusHistory = BuildStatusHistory(order),
                items = order.Items.Select(i => new
                {
                    name = i.ProductName,
                    qty = i.Quantity,
                    price = i.UnitPrice,
                    size = i.Size,
                    productId = i.ProductId,
                    image = i.IsGift && i.Gift != null ? i.Gift.ImageUrl : (imagesMap.ContainsKey(i.ProductId) ? imagesMap[i.ProductId] : ""),
                    estimatedValue = i.IsGift && i.Gift != null ? i.Gift.EstimatedValue : null
                }).ToList()
            });
        }

        [HttpGet("history/me")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> GetMyOrders()
        {
            // JwtRegisteredClaimNames.Sub typically maps to ClaimTypes.NameIdentifier in ASP.NET Core if mapped,
            // or we can just use the literal string "sub"
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                            ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int customerId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng." });
            }

            var allOrders = await _orderRepo.GetOrdersWithItemsAsync();
            var myOrders = allOrders.Where(o => o.CustomerId == customerId).OrderByDescending(o => o.CreatedAt).ToList();

            var allProductIds = myOrders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
            var imagesMap = await _productRepo.GetProductImagesAsync(allProductIds);

            var result = myOrders.Select(order => new
            {
                orderCode = order.OrderCode,
                customerName = order.CustomerName,
                customerPhone = order.CustomerPhone,
                address = order.Address,
                total = order.Total,
                status = order.Status,
                date = order.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                customerNote = order.CustomerNote,
                adminNote = order.AdminNote,
                isCancelRequested = order.IsCancelRequested,
                cancelReason = order.CancelReason,
                statusHistory = BuildStatusHistory(order),
                items = order.Items.Select(i => new
                {
                    name = i.ProductName,
                    qty = i.Quantity,
                    price = i.UnitPrice,
                    size = i.Size,
                    productId = i.ProductId,
                    image = i.IsGift && i.Gift != null ? i.Gift.ImageUrl : (imagesMap.ContainsKey(i.ProductId) ? imagesMap[i.ProductId] : ""),
                    estimatedValue = i.IsGift && i.Gift != null ? i.Gift.EstimatedValue : null
                }).ToList()
            });

            return Ok(result);
        }

        [HttpPost("sync-guest-orders")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> SyncGuestOrders([FromBody] List<string> orderCodes)
        {
            if (orderCodes == null || !orderCodes.Any()) return Ok(new { success = true, message = "Không có đơn hàng nào cần đồng bộ." });

            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                            ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int customerId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng." });
            }

            var customer = await _customerRepo.GetByIdAsync(customerId);
            if (customer == null) return NotFound(new { message = "Không tìm thấy khách hàng." });

            // Lấy tất cả đơn hàng khớp với danh sách mã truyền lên
            var ordersToUpdate = await _context.Orders
                .Where(o => orderCodes.Contains(o.OrderCode) && o.CustomerId != customerId)
                .ToListAsync();

            int updatedCount = 0;
            foreach (var order in ordersToUpdate)
            {
                // Kiểm tra xem số điện thoại hoặc email của đơn hàng có khớp với tài khoản hiện tại không
                var orderPhone = NormalizePhoneNumber(order.CustomerPhone);
                var customerPhone = NormalizePhoneNumber(customer.Phone);
                bool isPhoneMatch = !string.IsNullOrEmpty(orderPhone) && orderPhone == customerPhone;
                bool isEmailMatch = !string.IsNullOrEmpty(order.CustomerEmail) && order.CustomerEmail.Trim().ToLower() == customer.Email?.Trim().ToLower();

                if (isPhoneMatch || isEmailMatch)
                {
                    order.CustomerId = customerId;
                    _context.Orders.Update(order);
                    updatedCount++;
                }
            }

            if (updatedCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, updatedCount });
        }

        [HttpPost("{orderCode}/cancel")]
        [AllowAnonymous]
        public async Task<IActionResult> CancelOrder(string orderCode, [FromBody] BatTrang.Core.DTOs.CancelOrderRequestDto request)
        {
            var order = await _orderRepo.GetByOrderCodeAsync(orderCode);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            // Xác thực: số điện thoại phải khớp
            var orderPhoneVal = NormalizePhoneNumber(order.CustomerPhone);
            var reqPhoneVal = NormalizePhoneNumber(request.Phone);
            if (string.IsNullOrWhiteSpace(reqPhoneVal) || orderPhoneVal != reqPhoneVal)
            {
                return Unauthorized(new { message = "Số điện thoại không khớp với đơn hàng." });
            }

            if (order.Status == "pending")
            {
                // Khách tự hủy ngay lập tức
                order.Status = "cancelled";
                order.IsCancelRequested = false;
                order.CancelReason = "Khách hàng tự hủy" + (!string.IsNullOrWhiteSpace(request.Reason) ? ": " + request.Reason : "");
                order.CancelRequestedAt = DateTime.UtcNow.AddHours(7);
                order.CancelledAt = DateTime.UtcNow.AddHours(7);
                await _orderRepo.UpdateAsync(order);

                // Hoàn kho ngay
                var _stockService = HttpContext.RequestServices.GetService<BatTrang.Infrastructure.Services.StockService>();
                var _productRepo = HttpContext.RequestServices.GetService<BatTrang.Core.Interfaces.IProductRepository>();
                if (_stockService != null && _productRepo != null)
                {
                    foreach (var item in order.Items)
                    {
                        var product = await _productRepo.GetProductWithImagesAsync(item.ProductId);
                        if (product != null)
                        {
                            var variant = product.Variants.FirstOrDefault(v => v.Size?.Name == item.Size) ?? product.Variants.FirstOrDefault();
                            if (variant != null)
                            {
                                await _stockService.AdjustStockAsync(variant.Id, item.Quantity);
                            }
                        }
                    }
                    await _cacheStore.EvictByTagAsync("products", default);
                }

                try
                {
                    var reasonStr = !string.IsNullOrWhiteSpace(request.Reason) ? $" (Lý do: {request.Reason})" : "";
                    var msg = $"Khách hàng vừa tự hủy đơn hàng #{order.OrderCode}.{reasonStr}";
                    var noti = new BatTrang.Core.Entities.Notification { Type = "OrderCancelled", Message = msg };
                    _context.Notifications.Add(noti);

                    // Thông báo cho CTV nếu đơn có affiliate
                    if (order.AffiliateId.HasValue)
                    {
                        var affMsg = $"⚠️ Đơn hàng #{order.OrderCode} đã bị hủy bởi khách hàng.{reasonStr} Hoa hồng từ đơn này sẽ không được tính.";
                        var adminAffMsg = $"Đơn hàng #{order.OrderCode} (có CTV giới thiệu) vừa bị khách hủy.{reasonStr}";
                        
                        _context.Set<BatTrang.Core.Entities.AffiliateNotification>().Add(new BatTrang.Core.Entities.AffiliateNotification
                        {
                            AffiliateId = order.AffiliateId.Value,
                            Title = "Đơn hàng bị hủy ❌",
                            Message = affMsg,
                            Type = "order",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow.AddHours(7)
                        });
                        
                        _context.Notifications.Add(new BatTrang.Core.Entities.Notification { Type = "OrderCancelled", Message = adminAffMsg });
                    }

                    await _context.SaveChangesAsync();
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", "OrderCancelled", msg);

                    if (order.AffiliateId.HasValue)
                    {
                        await _hubContext.Clients.Group($"Affiliate_{order.AffiliateId.Value}").SendAsync("ReceiveAffiliateNotification", 
                            "Đơn hàng bị hủy ❌", 
                            $"Đơn hàng #{order.OrderCode} đã bị hủy bởi khách hàng. Hoa hồng từ đơn này sẽ không được tính.", 
                            "order");
                    }
                }
                catch (Exception) {}

                return Ok(new { success = true, status = "cancelled", message = "Đã hủy đơn hàng thành công." });
            }
            else if (order.Status == "confirmed")
            {
                // Khách xin hủy, shop phải duyệt
                order.IsCancelRequested = true;
                order.CancelReason = request.Reason;
                order.CancelRequestedAt = DateTime.UtcNow.AddHours(7);
                await _orderRepo.UpdateAsync(order);

                try
                {
                    var reasonStr = !string.IsNullOrWhiteSpace(request.Reason) ? $" Lý do: {request.Reason}." : "";
                    var msg = $"Khách hàng yêu cầu hủy đơn hàng #{order.OrderCode}.{reasonStr} Vui lòng kiểm tra!";
                    var noti = new BatTrang.Core.Entities.Notification { Type = "CancelRequested", Message = msg };
                    _context.Notifications.Add(noti);
                    await _context.SaveChangesAsync();
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", "CancelRequested", msg);
                }
                catch (Exception) {}

                return Ok(new { success = true, status = "confirmed", isCancelRequested = true, message = "Đã gửi yêu cầu hủy đơn đến Cửa hàng." });
            }
            
            return BadRequest(new { message = "Không thể hủy hoặc yêu cầu hủy đơn hàng ở trạng thái này." });
        }

        private List<object> BuildStatusHistory(Order order)
        {
            var statusHistory = new List<object>
            {
                new { status = "pending", time = order.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ") }
            };
            if (order.ConfirmedAt.HasValue)
            {
                statusHistory.Add(new { status = "confirmed", time = order.ConfirmedAt.Value.ToString("yyyy-MM-ddTHH:mm:ssZ") });
            }
            if (order.ShippingAt.HasValue)
            {
                statusHistory.Add(new { status = "shipping", time = order.ShippingAt.Value.ToString("yyyy-MM-ddTHH:mm:ssZ") });
            }
            if (order.CompletedAt.HasValue)
            {
                statusHistory.Add(new { status = "completed", time = order.CompletedAt.Value.ToString("yyyy-MM-ddTHH:mm:ssZ") });
            }
            if (order.CancelledAt.HasValue)
            {
                statusHistory.Add(new { status = "cancelled", time = order.CancelledAt.Value.ToString("yyyy-MM-ddTHH:mm:ssZ") });
            }
            return statusHistory;
        }

        private string NormalizePhoneNumber(string? phone)
        {
            if (string.IsNullOrEmpty(phone)) return string.Empty;
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.StartsWith("84"))
            {
                if (digits.Length > 2)
                    digits = "0" + digits.Substring(2);
            }
            return digits;
        }

        private void IncrementFailedAttempts(string cacheKey)
        {
            var attempts = 0;
            if (_cache.TryGetValue(cacheKey, out int current))
            {
                attempts = current;
            }
            _cache.Set(cacheKey, attempts + 1, TimeSpan.FromHours(1));
        }

        private string MaskName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return string.Empty;
            for (int i = 0; i < parts.Length; i++)
            {
                if (i > 0 && i < parts.Length - 1)
                {
                    parts[i] = "***";
                }
                else
                {
                    var word = parts[i];
                    if (word.Length > 1)
                        parts[i] = word[0] + new string('*', word.Length - 1);
                }
            }
            return string.Join(" ", parts);
        }

        private string MaskPhone(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
            var digits = phone.Trim();
            if (digits.Length <= 7) return digits;
            return digits.Substring(0, 3) + "***" + digits.Substring(digits.Length - 4);
        }

        private string MaskAddress(string address)
        {
            if (string.IsNullOrWhiteSpace(address)) return string.Empty;
            var parts = address.Split(',');
            if (parts.Length == 0) return string.Empty;
            var street = parts[0].Trim();
            if (parts.Length == 1) return street;
            return street + ", ***";
        }

        // ── Invoice endpoint (public, xác thực bằng SĐT) ──────────────────
        [HttpGet("{orderCode}/invoice")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadInvoice(string orderCode, [FromQuery] string? phone)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var cacheKey = $"TrackFailed_{ipAddress}";
            if (_cache.TryGetValue(cacheKey, out int failedAttempts) && failedAttempts >= 5)
                return StatusCode(429, new { message = "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau." });

            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.OrderCode == orderCode);

            if (order == null)
            {
                IncrementFailedAttempts(cacheKey);
                return NotFound(new { message = "Không tìm thấy đơn hàng." });
            }

            var cleanInputPhone = NormalizePhoneNumber(phone);
            var cleanOrderPhone = NormalizePhoneNumber(order.CustomerPhone);
            if (string.IsNullOrEmpty(cleanInputPhone) || cleanInputPhone != cleanOrderPhone)
            {
                IncrementFailedAttempts(cacheKey);
                return NotFound(new { message = "Số điện thoại không khớp với đơn hàng." });
            }

            _cache.Remove(cacheKey);

            try
            {
                var configs = await _context.SiteConfigs.ToListAsync();
                var configDict = configs.ToDictionary(c => c.Key, c => c.Value);
                var logoPath = System.IO.Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "user", "assets", "images", "logo.png");
                var pdfBytes = _invoiceService.GenerateInvoicePdf(order, configDict, logoPath);
                return File(pdfBytes, "application/pdf", $"HoaDon_{order.OrderCode}.pdf");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[INVOICE ERROR] {ex.Message}");
                return StatusCode(500, new { message = "Không thể tạo hóa đơn. Vui lòng thử lại." });
            }
        }
    }
}

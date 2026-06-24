using System;
using System.Net;
using System.Net.Http;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace BatTrang.Infrastructure.Services
{
    public class NotificationService
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;
        private readonly BatTrang.Core.Interfaces.ISiteConfigRepository _configRepo;

        public NotificationService(IConfiguration config, BatTrang.Core.Interfaces.ISiteConfigRepository configRepo)
        {
            _config = config;
            _httpClient = new HttpClient();
            _configRepo = configRepo;
        }

        public async Task SendPasswordResetEmailAsync(string email, string resetLink)
        {
            if (string.IsNullOrEmpty(email)) return;

            bool.TryParse(_config["EmailSetting:Enabled"], out var emailEnabled);
            if (!emailEnabled)
            {
                // Fallback to Console Mock
                Console.WriteLine("=================================================");
                Console.WriteLine($"[MOCK EMAIL] To: {email}");
                Console.WriteLine($"[MOCK EMAIL] Subject: Khôi phục mật khẩu - Phúc Gia Tiên");
                Console.WriteLine($"[MOCK EMAIL] Body: Vui lòng click vào link sau để đặt lại mật khẩu: {resetLink}");
                Console.WriteLine("=================================================");
                return;
            }

            try
            {
                var host = _config["EmailSetting:Host"];
                int.TryParse(_config["EmailSetting:Port"], out var port);
                var username = _config["EmailSetting:Username"];
                var password = _config["EmailSetting:Password"];
                var fromEmail = _config["EmailSetting:FromEmail"] ?? "no-reply@example.com";
                var fromName = _config["EmailSetting:FromName"] ?? "Phúc Gia Tiên";

                var message = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = "Khôi phục mật khẩu - Phúc Gia Tiên",
                    Body = $@"
                        <h3>Xin chào,</h3>
                        <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản tại Phúc Gia Tiên.</p>
                        <p>Vui lòng click vào đường link dưới đây để thiết lập mật khẩu mới:</p>
                        <p><a href='{resetLink}'>{resetLink}</a></p>
                        <p><i>Lưu ý: Link này chỉ có hiệu lực trong vòng 30 phút.</i></p>
                        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
                        <br>
                        <p>Trân trọng,<br>Đội ngũ Phúc Gia Tiên</p>",
                    IsBodyHtml = true
                };
                message.To.Add(new MailAddress(email));

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                await client.SendMailAsync(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] {ex.Message}");
            }
        }

        /// <summary>
        /// Gửi email báo xác nhận đã đặt hàng thành công (không kèm PDF hóa đơn).
        /// </summary>
        public async Task SendOrderConfirmationEmailAsync(string email, string customerName, string orderCode)
        {
            if (string.IsNullOrEmpty(email)) return;

            var siteConfigs = await _configRepo.GetAllConfigsAsync();
            var configDict = System.Linq.Enumerable.ToDictionary(siteConfigs, c => c.Key, c => c.Value);
            if (configDict.TryGetValue("notifyEmailOrderNew", out var notifyVal) && notifyVal == "false")
            {
                Console.WriteLine($"[EMAIL SKIPPED] Email Xác nhận Đặt hàng (notifyEmailOrderNew=false) to: {email}");
                return;
            }

            bool.TryParse(_config["EmailSetting:Enabled"], out var emailEnabled);
            if (!emailEnabled)
            {
                Console.WriteLine("=================================================");
                Console.WriteLine($"[MOCK EMAIL - CONFIRMATION] To: {email}");
                Console.WriteLine($"[MOCK EMAIL - CONFIRMATION] Subject: Xác nhận đặt hàng #{orderCode} - Phúc Gia Tiên");
                Console.WriteLine("=================================================");
                return;
            }

            try
            {
                var host = _config["EmailSetting:Host"];
                int.TryParse(_config["EmailSetting:Port"], out var port);
                var username = _config["EmailSetting:Username"];
                var password = _config["EmailSetting:Password"];
                var fromEmail = _config["EmailSetting:FromEmail"] ?? "no-reply@example.com";
                var fromName = _config["EmailSetting:FromName"] ?? "Phúc Gia Tiên";

                var body = $@"
                    <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"">
                        <div style=""background: linear-gradient(135deg, #92400e, #b45309); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;"">
                            <img src=""cid:storelogo"" width=""80"" height=""80"" style=""border-radius: 50%; background: white; padding: 4px; display: inline-block; margin-bottom: 12px; border: 2px solid #fcd34d;"" alt=""Logo"" />
                            <h1 style=""color: white; margin: 0; font-size: 22px;"">Phúc Gia Tiên</h1>
                            <p style=""color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;"">Gốm sứ thủ công Bát Tràng cao cấp</p>
                        </div>
                        <div style=""background: #fffbeb; padding: 24px; border: 1px solid #f0e6c8;"">
                            <h2 style=""color: #92400e; margin-top: 0;"">Xác nhận đặt hàng thành công! 🎉</h2>
                            <p style=""color: #374151;"">Kính gửi anh/chị <strong>{customerName}</strong>,</p>
                            <p style=""color: #374151;"">Phúc Gia Tiên xin chân thành cảm ơn quý khách đã tin tưởng và lựa chọn sản phẩm của chúng tôi. Đơn hàng <strong style=""color: #92400e;"">#{orderCode}</strong> của quý khách đã được ghi nhận thành công trên hệ thống.</p>
                            <div style=""background: white; border: 1px dashed #f0e6c8; border-radius: 8px; padding: 16px; margin: 16px 0;"">
                                <p style=""margin: 0; color: #6b7280; font-size: 13px;"">📞 Nhân viên của chúng tôi sẽ sớm liên hệ qua điện thoại để xác nhận thông tin đơn hàng và tiến hành giao hàng trong thời gian sớm nhất.</p>
                                <p style=""margin: 8px 0 0; color: #6b7280; font-size: 13px;"">🎧 Nếu cần hỗ trợ gấp, xin vui lòng liên hệ Hotline: <strong>0986 123 456</strong></p>
                            </div>
                            <p style=""color: #374151; margin-bottom: 0;"">Chúng tôi rất vinh hạnh được đồng hành cùng quý khách. Chúc quý khách một ngày thật nhiều niềm vui!</p>
                            <p style=""color: #374151; margin-top: 16px; margin-bottom: 0;"">Trân trọng,<br/><strong>Đội ngũ Phúc Gia Tiên</strong></p>
                        </div>
                        <div style=""background: #f9fafb; padding: 16px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;"">
                            <p style=""color: #9ca3af; font-size: 12px; margin: 0;"">Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.</p>
                        </div>
                    </div>";

                var message = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = $"Xác nhận đặt hàng #{orderCode} - Phúc Gia Tiên"
                };

                var htmlView = System.Net.Mail.AlternateView.CreateAlternateViewFromString(body, null, "text/html");
                var logoPath = InvoiceService.ResolveLogoPath();
                if (!string.IsNullOrEmpty(logoPath) && System.IO.File.Exists(logoPath))
                {
                    var logoRes = new System.Net.Mail.LinkedResource(logoPath, "image/png") { ContentId = "storelogo" };
                    htmlView.LinkedResources.Add(logoRes);
                }
                message.AlternateViews.Add(htmlView);
                message.To.Add(new MailAddress(email));

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                await client.SendMailAsync(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL CONFIRMATION ERROR] {ex.Message}");
            }
        }

        /// <summary>
        /// Gửi email hóa đơn PDF đính kèm sau khi giao hàng thành công.
        /// </summary>
        public async Task SendInvoiceEmailAsync(string email, string customerName, string orderCode, byte[] pdfBytes)
        {
            if (string.IsNullOrEmpty(email)) return;

            var siteConfigs = await _configRepo.GetAllConfigsAsync();
            var configDict = System.Linq.Enumerable.ToDictionary(siteConfigs, c => c.Key, c => c.Value);
            if (configDict.TryGetValue("notifyEmailOrderDone", out var notifyVal) && notifyVal == "false")
            {
                Console.WriteLine($"[EMAIL SKIPPED] Email Hóa đơn (notifyEmailOrderDone=false) to: {email}");
                return;
            }

            bool.TryParse(_config["EmailSetting:Enabled"], out var emailEnabled);
            if (!emailEnabled)
            {
                Console.WriteLine("=================================================");
                Console.WriteLine($"[MOCK EMAIL - INVOICE] To: {email}");
                Console.WriteLine($"[MOCK EMAIL - INVOICE] Subject: Hóa đơn đơn hàng #{orderCode} - Phúc Gia Tiên");
                Console.WriteLine($"[MOCK EMAIL - INVOICE] PDF Size: {pdfBytes.Length} bytes");
                Console.WriteLine("=================================================");
                return;
            }

            try
            {
                var host = _config["EmailSetting:Host"];
                int.TryParse(_config["EmailSetting:Port"], out var port);
                var username = _config["EmailSetting:Username"];
                var password = _config["EmailSetting:Password"];
                var fromEmail = _config["EmailSetting:FromEmail"] ?? "no-reply@example.com";
                var fromName = _config["EmailSetting:FromName"] ?? "Phúc Gia Tiên";

                var body = $@"
                    <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"">
                        <div style=""background: linear-gradient(135deg, #92400e, #b45309); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;"">
                            <img src=""cid:storelogo"" width=""80"" height=""80"" style=""border-radius: 50%; background: white; padding: 4px; display: inline-block; margin-bottom: 12px; border: 2px solid #fcd34d;"" alt=""Logo"" />
                            <h1 style=""color: white; margin: 0; font-size: 22px;"">Phúc Gia Tiên</h1>
                            <p style=""color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;"">Gốm sứ thủ công Bát Tràng cao cấp</p>
                        </div>
                        <div style=""background: #fffbeb; padding: 24px; border: 1px solid #f0e6c8;"">
                            <h2 style=""color: #16a34a; margin-top: 0;"">Đơn hàng đã giao thành công! ✅</h2>
                            <p style=""color: #374151;"">Kính gửi anh/chị <strong>{customerName}</strong>,</p>
                            <p style=""color: #374151;"">Đơn hàng <strong style=""color: #92400e;"">#{orderCode}</strong> của quý khách đã được giao thành công. Chúng tôi xin chân thành cảm ơn quý khách đã tin tưởng và lựa chọn sản phẩm của Phúc Gia Tiên!</p>
                            <p style=""color: #374151;"">Hóa đơn chi tiết được đính kèm trong email này (file PDF). Quý khách vui lòng lưu trữ để tiện theo dõi và đối chiếu khi cần.</p>
                            <div style=""background: white; border: 1px dashed #f0e6c8; border-radius: 8px; padding: 16px; margin: 16px 0;"">
                                <p style=""margin: 0; color: #6b7280; font-size: 13px;"">⭐ Nếu hài lòng với sản phẩm, quý khách đừng quên để lại đánh giá để giúp chúng tôi phục vụ tốt hơn nhé!</p>
                                <p style=""margin: 8px 0 0; color: #6b7280; font-size: 13px;"">🔄 Nếu có bất kỳ vấn đề nào về sản phẩm, vui lòng liên hệ chúng tôi trong vòng 7 ngày để được hỗ trợ đổi/trả.</p>
                                <p style=""margin: 8px 0 0; color: #6b7280; font-size: 13px;"">📞 Hotline hỗ trợ: <strong>0986 123 456</strong></p>
                            </div>
                            <p style=""color: #374151; margin-bottom: 0;"">Một lần nữa, xin cảm ơn quý khách đã ủng hộ Phúc Gia Tiên. Chúng tôi rất mong được phục vụ quý khách trong những lần mua sắm tiếp theo!</p>
                            <p style=""color: #374151; margin-top: 16px; margin-bottom: 0;"">Trân trọng,<br/><strong>Đội ngũ Phúc Gia Tiên</strong></p>
                        </div>
                        <div style=""background: #f9fafb; padding: 16px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;"">
                            <p style=""color: #9ca3af; font-size: 12px; margin: 0;"">Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.</p>
                        </div>
                    </div>";

                var message = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = $"Hóa đơn đơn hàng #{orderCode} - Phúc Gia Tiên"
                };

                var htmlView = System.Net.Mail.AlternateView.CreateAlternateViewFromString(body, null, "text/html");
                var logoPath = InvoiceService.ResolveLogoPath();
                if (!string.IsNullOrEmpty(logoPath) && System.IO.File.Exists(logoPath))
                {
                    var logoRes = new System.Net.Mail.LinkedResource(logoPath, "image/png") { ContentId = "storelogo" };
                    htmlView.LinkedResources.Add(logoRes);
                }
                message.AlternateViews.Add(htmlView);
                message.To.Add(new MailAddress(email));

                // Đính kèm file PDF
                var pdfStream = new System.IO.MemoryStream(pdfBytes);
                var attachment = new Attachment(pdfStream, $"HoaDon_{orderCode}.pdf", "application/pdf");
                message.Attachments.Add(attachment);

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                await client.SendMailAsync(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL INVOICE ERROR] {ex.Message}");
            }
        }
    }
}

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

        public NotificationService(IConfiguration config)
        {
            _config = config;
            _httpClient = new HttpClient();
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
    }
}

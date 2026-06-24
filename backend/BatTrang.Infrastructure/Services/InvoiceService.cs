using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using BatTrang.Core.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using PdfColor = QuestPDF.Infrastructure.Color;

namespace BatTrang.Infrastructure.Services
{
    public class InvoiceService
    {
        static InvoiceService()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        /// <summary>
        /// Resolve logo.png từ cấu trúc workspace, bắt đầu từ AppContext.BaseDirectory đi lên cho đến khi
        /// tìm thấy file logo hoặc hết cấp (tối đa 8 bậc).
        /// </summary>
        public static string? ResolveLogoPath()
        {
            // Trong dev mode: BaseDirectory = ...\bin\Debug\net8.0\
            // Cần lên 5 bậc để về thư mục gốc workspace (chứa "user/" folder)
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            for (int i = 0; i < 8; i++)
            {
                var candidate = Path.Combine(dir.FullName, "user", "assets", "images", "logo.png");
                if (File.Exists(candidate))
                    return candidate;
                if (dir.Parent == null) break;
                dir = dir.Parent;
            }
            return null;
        }

        /// <summary>
        /// Tạo PDF hóa đơn cho đơn hàng. Trả về byte[] nội dung file PDF.
        /// </summary>
        public byte[] GenerateInvoicePdf(Order order, Dictionary<string, string> config, string? logoPath = null)
        {
            var companyName    = GetConfig(config, "InvoiceCompanyName", "Phúc Gia Tiên");
            var companyAddress = GetConfig(config, "InvoiceAddress",     "Thôn Bát Tràng, Xã Bát Tràng, Huyện Gia Lâm, Hà Nội");
            var companyPhone   = GetConfig(config, "InvoicePhone",       "");
            var taxId          = GetConfig(config, "InvoiceTaxId",       "");
            var invoiceNote    = GetConfig(config, "InvoiceNote",        "Cảm ơn quý khách đã tin dùng sản phẩm của Phúc Gia Tiên! Chúc quý khách nhiều sức khoẻ và may mắn.");

            // Auto-resolve logo nếu caller không truyền
            if (string.IsNullOrEmpty(logoPath) || !File.Exists(logoPath))
                logoPath = ResolveLogoPath();

            var dateStr = order.CreatedAt.ToString("dd/MM/yyyy HH:mm");

            // ── Colour palette ─────────────────────────────────────────────
            var brown   = PdfColor.FromHex("#7c3d12");   // deep brown
            var amber   = PdfColor.FromHex("#92400e");   // amber accent
            var cream   = PdfColor.FromHex("#fef9ec");   // cream background
            var border  = PdfColor.FromHex("#f0e6c8");   // soft border
            var muted   = PdfColor.FromHex("#6b7280");   // muted text
            var note    = PdfColor.FromHex("#fffbeb");   // note bg
            var noteBrd = PdfColor.FromHex("#fcd34d");   // note border

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.MarginHorizontal(36);
                    page.MarginVertical(28);
                    page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(10).FontColor(PdfColor.FromHex("#1f2937")));

                    // ══ HEADER ════════════════════════════════════════════
                    page.Header().Column(headerCol =>
                    {
                        headerCol.Item().Row(row =>
                        {
                            // ── Left: Logo + Company block ────────────────
                            // Logo
                            if (!string.IsNullOrEmpty(logoPath) && File.Exists(logoPath))
                            {
                                row.ConstantItem(80).PaddingRight(10).Image(logoPath).FitArea();
                            }

                            // Company text
                            row.RelativeItem().Column(col =>
                            {
                                col.Item().Text(companyName)
                                    .Bold().FontSize(18).FontColor(amber);
                                col.Item().PaddingTop(3).Text(companyAddress)
                                    .FontSize(8.5f).FontColor(muted);
                                if (!string.IsNullOrEmpty(companyPhone))
                                    col.Item().Text($"ĐT: {companyPhone}").FontSize(8.5f).FontColor(muted);
                                if (!string.IsNullOrEmpty(taxId))
                                    col.Item().Text($"MST: {taxId}").FontSize(8.5f).FontColor(muted);
                            });

                            // ── Right: Invoice title block ────────────────
                            row.ConstantItem(170).Column(col =>
                            {
                                col.Item().AlignRight().Text("HÓA ĐƠN BÁN HÀNG")
                                    .Bold().FontSize(15).FontColor(PdfColor.FromHex("#1f2937")).LetterSpacing(0.04f);
                                col.Item().PaddingTop(4).AlignRight().Background(amber).Padding(4).Text(t =>
                                {
                                    t.Span("Mã đơn: ").Bold().FontSize(9).FontColor(Colors.White);
                                    t.Span(order.OrderCode).Bold().FontSize(9).FontColor(Colors.White);
                                });
                                col.Item().PaddingTop(4).AlignRight().Text($"Ngày: {dateStr}")
                                    .FontSize(9).FontColor(muted);
                            });
                        });

                        // Divider
                        headerCol.Item().PaddingTop(10).LineHorizontal(2f).LineColor(amber);
                    });

                    // ══ CONTENT ═══════════════════════════════════════════
                    page.Content().PaddingVertical(14).Column(col =>
                    {
                        // ── Customer info ─────────────────────────────────
                        col.Item()
                            .Border(1).BorderColor(border)
                            .CornerRadius(4)
                            .Padding(14)
                            .Column(infoCol =>
                        {
                            infoCol.Item().Row(r =>
                            {
                                // Left column: Customer Info
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("THÔNG TIN KHÁCH HÀNG")
                                        .Bold().FontSize(8.5f).FontColor(amber).LetterSpacing(0.04f);

                                    c.Item().PaddingTop(6).Text(t =>
                                    {
                                        t.Span("Người nhận: ").Bold().FontSize(9).FontColor(muted);
                                        t.Span(order.CustomerName).Bold().FontSize(9);
                                    });
                                    c.Item().PaddingTop(3).Text(t =>
                                    {
                                        t.Span("Điện thoại: ").Bold().FontSize(9).FontColor(muted);
                                        t.Span(order.CustomerPhone ?? "—").FontSize(9);
                                    });
                                    if (!string.IsNullOrEmpty(order.CustomerEmail))
                                        c.Item().PaddingTop(3).Text(t =>
                                        {
                                            t.Span("Email: ").Bold().FontSize(9).FontColor(muted);
                                            t.Span(order.CustomerEmail).FontSize(9);
                                        });
                                });

                                // Right column: Shipping Info
                                r.RelativeItem().PaddingLeft(20).Column(c =>
                                {
                                    c.Item().Text("GIAO HÀNG & THANH TOÁN")
                                        .Bold().FontSize(8.5f).FontColor(amber).LetterSpacing(0.04f);

                                    c.Item().PaddingTop(6).Text(t =>
                                    {
                                        t.Span("Địa chỉ: ").Bold().FontSize(9).FontColor(muted);
                                        t.Span(order.Address).FontSize(9);
                                    });
                                    c.Item().PaddingTop(3).Text(t =>
                                    {
                                        t.Span("Hình thức: ").Bold().FontSize(9).FontColor(muted);
                                        t.Span("COD (Thu tiền khi nhận hàng)").FontSize(9);
                                    });
                                });
                            });
                        });

                        col.Item().PaddingTop(16);

                        // ── Products table label ──────────────────────────
                        col.Item().Text("CHI TIẾT ĐƠN HÀNG")
                            .Bold().FontSize(8.5f).FontColor(amber).LetterSpacing(0.06f);
                        col.Item().PaddingTop(6);

                        // ── Products table ────────────────────────────────
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(32);    // STT
                                c.RelativeColumn(4);     // Tên sản phẩm
                                c.RelativeColumn(1.6f);  // Size
                                c.ConstantColumn(34);    // SL
                                c.RelativeColumn(1.5f);  // Đơn giá
                                c.RelativeColumn(1.5f);  // Thành tiền
                            });

                            // Header row
                            IContainer HeaderCell(IContainer c) =>
                                c.Background(amber).PaddingVertical(6).PaddingHorizontal(6);

                            table.Header(header =>
                            {
                                header.Cell().Element(HeaderCell).AlignCenter()
                                    .Text("STT").Bold().FontSize(8.5f).FontColor(Colors.White);
                                header.Cell().Element(HeaderCell)
                                    .Text("Tên sản phẩm").Bold().FontSize(8.5f).FontColor(Colors.White);
                                header.Cell().Element(HeaderCell).AlignCenter()
                                    .Text("Size").Bold().FontSize(8.5f).FontColor(Colors.White);
                                header.Cell().Element(HeaderCell).AlignCenter()
                                    .Text("SL").Bold().FontSize(8.5f).FontColor(Colors.White);
                                header.Cell().Element(HeaderCell).AlignRight()
                                    .Text("Đơn giá").Bold().FontSize(8.5f).FontColor(Colors.White);
                                header.Cell().Element(HeaderCell).AlignRight()
                                    .Text("Thành tiền").Bold().FontSize(8.5f).FontColor(Colors.White);
                            });

                            // Data rows
                            var idx = 1;
                            foreach (var item in order.Items)
                            {
                                var bg = idx % 2 == 0 ? cream : Colors.White;

                                IContainer DataCell(IContainer c) =>
                                    c.Background(bg).BorderBottom(0.5f).BorderColor(border)
                                     .PaddingVertical(6).PaddingHorizontal(6);

                                // Rút gọn size: chỉ lấy giá trị chính (phần đầu trước dấu "•")
                                var sizeText = string.IsNullOrEmpty(item.Size) || item.Size == "Default" || item.Size == "Mặc định"
                                    ? "—"
                                    : item.Size.Split(new[] { " • ", " · " }, StringSplitOptions.RemoveEmptyEntries)[0].Trim();

                                table.Cell().Element(DataCell).AlignCenter()
                                    .Text(idx.ToString()).FontSize(9);
                                table.Cell().Element(DataCell)
                                    .Text(item.ProductName).FontSize(9);
                                table.Cell().Element(DataCell).AlignCenter()
                                    .Text(sizeText).FontSize(9);
                                table.Cell().Element(DataCell).AlignCenter()
                                    .Text(item.Quantity.ToString()).FontSize(9);
                                table.Cell().Element(DataCell).AlignRight()
                                    .Text(FormatVnd(item.UnitPrice)).FontSize(9);
                                table.Cell().Element(DataCell).AlignRight()
                                    .Text(FormatVnd(item.UnitPrice * item.Quantity))
                                    .Bold().FontSize(9).FontColor(amber);

                                idx++;
                            }
                        });

                        // ── Total ─────────────────────────────────────────
                        col.Item().PaddingTop(6).Row(r =>
                        {
                            r.RelativeItem();
                            r.ConstantItem(280).Column(totalCol =>
                            {
                                totalCol.Item()
                                    .Background(amber).CornerRadius(4)
                                    .PaddingVertical(10).PaddingHorizontal(14)
                                    .Row(tr =>
                                {
                                    tr.RelativeItem().Text("TỔNG THANH TOÁN")
                                        .Bold().FontSize(10.5f).FontColor(Colors.White);
                                    tr.RelativeItem().AlignRight().Text(FormatVnd(order.Total))
                                        .Bold().FontSize(13).FontColor(Colors.White);
                                });
                            });
                        });

                        // ── Customer note ─────────────────────────────────
                        if (!string.IsNullOrEmpty(order.CustomerNote))
                        {
                            col.Item().PaddingTop(12)
                                .Background(note).CornerRadius(4)
                                .Border(1).BorderColor(noteBrd)
                                .Padding(8).Column(nc =>
                            {
                                nc.Item().Text("Ghi chú đơn hàng:").Bold().FontSize(8.5f).FontColor(amber);
                                nc.Item().PaddingTop(3).Text(order.CustomerNote).FontSize(9).Italic();
                            });
                        }

                        // ── Thank-you note ────────────────────────────────
                        col.Item().PaddingTop(18).AlignCenter().Text(invoiceNote)
                            .Italic().FontSize(9).FontColor(muted);
                    });

                    // ══ FOOTER ════════════════════════════════════════════
                    page.Footer().Column(footer =>
                    {
                        footer.Item().LineHorizontal(0.5f).LineColor(PdfColor.FromHex("#e5e7eb"));
                        footer.Item().PaddingTop(6).Row(r =>
                        {
                            r.RelativeItem().Text($"Hóa đơn tạo tự động bởi hệ thống {companyName}")
                                .FontSize(8).FontColor(muted);
                            r.RelativeItem().AlignRight().Text(x =>
                            {
                                x.Span("Trang ").FontSize(8).FontColor(muted);
                                x.CurrentPageNumber().FontSize(8).FontColor(muted);
                                x.Span(" / ").FontSize(8).FontColor(muted);
                                x.TotalPages().FontSize(8).FontColor(muted);
                            });
                        });
                    });
                });
            });

            return doc.GeneratePdf();
        }

        private static string GetConfig(Dictionary<string, string> config, string key, string defaultVal) =>
            config.TryGetValue(key, out var val) && !string.IsNullOrEmpty(val) ? val : defaultVal;

        private static string FormatVnd(decimal amount) =>
            amount.ToString("N0").Replace(",", ".") + "đ";
    }
}

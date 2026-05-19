const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'user', 'assets', 'images');
if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
}

function writeSVG(filename, width, height, emoji, label, sublabel, bgColor1, bgColor2, accentColor) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor1}"/>
      <stop offset="100%" stop-color="${bgColor2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${bgColor1}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <text x="50%" y="42%" text-anchor="middle" dominant-baseline="middle" font-size="${Math.floor(height * 0.18)}" font-family="serif" opacity="0.5">${emoji}</text>
  <text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle" fill="${accentColor}" font-family="Georgia,serif" font-size="${Math.floor(height * 0.05)}" font-style="italic" font-weight="bold" opacity="0.85">${label}</text>
  <text x="50%" y="72%" text-anchor="middle" dominant-baseline="middle" fill="#B8997A" font-family="Arial,sans-serif" font-size="${Math.floor(height * 0.035)}" opacity="0.7">${sublabel}</text>
  <rect x="10%" y="8%" width="80%" height="84%" fill="none" stroke="${accentColor}" stroke-width="1" stroke-dasharray="8 4" opacity="0.2" rx="8"/>
</svg>`;
    fs.writeFileSync(path.join(imgDir, filename), svg, 'utf8');
    console.log(`Created: ${filename}`);
}

// HERO backgrounds
writeSVG("hero-bg.jpg", 1920, 1080, "🏺", "PHÚC GIA TIÊN", "Tinh Hoa Gốm Sứ Thủ Công", "#1A1008", "#3D1F0A", "#D4A853");
writeSVG("products-banner.jpg", 1920, 600, "🎨", "SẢN PHẨM", "Bộ Sưu Tập Gốm Sứ", "#1A1008", "#2C1A0A", "#D4A853");
writeSVG("journey-hero.jpg", 1920, 800, "📖", "HÀNH TRÌNH", "Câu Chuyện Của Chúng Tôi", "#120C06", "#2C1A0A", "#C47A3A");
writeSVG("about-hero.jpg", 1920, 700, "✨", "GIỚI THIỆU", "Về Phúc Gia Tiên", "#1A1008", "#2C1A0A", "#D4A853");
writeSVG("about-workshop.jpg", 800, 600, "🔥", "Xưởng Gốm", "Bát Tràng, Gia Lâm", "#2E1B0E", "#1A1008", "#C47A3A");
writeSVG("contact-hero.jpg", 1920, 500, "📍", "LIÊN HỆ", "Bát Tràng, Hà Nội", "#1A1008", "#2C1A0A", "#D4A853");

// People / story
writeSVG("story-couple.jpg", 800, 600, "👫", "Vợ & Chồng", "2 Vợ Chồng – 1 Xưởng", "#2E1B0E", "#1A1008", "#D4A853");
writeSVG("team-husband.jpg", 400, 400, "👨‍🎨", "Nguyễn Văn Phúc", "Nghệ Nhân Chính", "#2E1B0E", "#1A1008", "#C47A3A");
writeSVG("team-wife.jpg", 400, 400, "👩‍🎨", "Lê Thị Tiên", "Nghệ Nhân Vẽ", "#2E1B0E", "#1A1008", "#D4A853");

// Products
const products = [
    ["product-1-1.jpg", "🏺", "Lộc Bình Vẽ Tay 1M6", "40.000.000đ"],
    ["product-1-2.jpg", "🏺", "Lộc Bình Vẽ Tay 1M6", "Chi Tiết"],
    ["product-2-1.jpg", "🏺", "Lộc Bình Men Ra", "33.000.000đ"],
    ["product-3-1.jpg", "🏺", "Lộc Bình Trổ", "26.000.000đ"],
    ["product-4-1.jpg", "🖼️", "Tranh Gốm Phúc Lộc Thọ", "22.808.000đ"],
    ["product-5-1.jpg", "🕯️", "Bộ Đồ Thờ Cao Cấp", "15.000.000đ"],
    ["product-6-1.jpg", "🌸", "Bình Hút Lộc", "12.000.000đ"],
    ["product-7-1.jpg", "🍶", "Chum Ngâm Rượu", "9.500.000đ"],
    ["product-8-1.jpg", "🔵", "Đĩa Gốm Phong Thuỷ", "8.000.000đ"]
];
for (const p of products) {
    writeSVG(p[0], 600, 800, p[1], p[2], p[3], "#2E1B0E", "#1A1008", "#D4A853");
}

// Video thumbnails
const videos = [
    ["video-thumb-1.jpg", "▶", "Quá Trình Tạo Hình", "05:43"],
    ["video-thumb-2.jpg", "▶", "Vẽ Thủ Công", "03:15"],
    ["video-thumb-3.jpg", "▶", "Nung 1.200°C", "03:20"],
    ["video-thumb-4.jpg", "▶", "Hậu Trường Xưởng", "08:18"],
    ["video-thumb-5.jpg", "▶", "Lần Đầu Thất Bại", "06:25"],
    ["video-thumb-6.jpg", "▶", "Thành Quả Nghề", "04:10"]
];
for (const v of videos) {
    writeSVG(v[0], 640, 360, v[1], v[2], v[3], "#1A1008", "#2C1A0A", "#D4A853");
}

// Logo
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C47A3A"/>
      <stop offset="100%" stop-color="#D4A853"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="95" fill="#1A1008" stroke="#D4A853" stroke-width="2"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="#8B4513" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"/>
  <text x="100" y="90" text-anchor="middle" font-size="52" font-family="serif">🏺</text>
  <text x="100" y="130" text-anchor="middle" fill="url(#lg)" font-family="Georgia,serif" font-size="13" font-weight="bold" letter-spacing="2">PHÚC GIA</text>
  <text x="100" y="150" text-anchor="middle" fill="url(#lg)" font-family="Georgia,serif" font-size="13" font-weight="bold" letter-spacing="2">TIÊN</text>
</svg>`;
fs.writeFileSync(path.join(imgDir, "logo.png"), logoSvg, 'utf8');
console.log("Created: logo.png");
console.log("Done generating placeholders!");

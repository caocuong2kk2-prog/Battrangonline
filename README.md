# Phúc Gia Tiên – Frontend Structure

Website gốm sứ thủ công Bát Tràng.

## Cấu Trúc Dự Án

```
user/
├── index.html              ← Trang chủ
├── products.html           ← Danh sách sản phẩm
├── product-detail.html     ← Chi tiết sản phẩm
├── journey.html            ← Hành trình (Story)
├── about.html              ← Giới thiệu
├── contact.html            ← Liên hệ
│
├── css/
│   ├── layout.css          ← Design tokens + Header + Footer + Nav + Buttons (DÙNG CHUNG)
│   ├── home.css            ← Styles riêng cho trang chủ
│   ├── product.css         ← Styles riêng cho trang sản phẩm & chi tiết
│   └── responsive.css      ← Breakpoints mobile/tablet (DÙNG CHUNG)
│
├── js/
│   ├── api.js              ← Data layer / mock API (DÙNG CHUNG)
│   ├── common.js           ← Header scroll, mobile nav, toast, scroll-reveal (DÙNG CHUNG)
│   ├── home.js             ← Logic trang chủ
│   └── product.js          ← Logic sản phẩm list + detail
│
├── components/
│   ├── header.html         ← HTML header component (reference)
│   └── footer.html         ← HTML footer component (reference)
│
└── assets/
    └── images/
        ├── logo.png
        ├── favicon.ico
        ├── hero-bg.jpg
        ├── products-banner.jpg
        ├── journey-hero.jpg
        ├── about-hero.jpg
        ├── about-workshop.jpg
        ├── contact-hero.jpg
        ├── story-couple.jpg
        ├── team-husband.jpg
        ├── team-wife.jpg
        ├── video-thumb-1.jpg ... video-thumb-6.jpg
        └── product-1-1.jpg ... (ảnh sản phẩm)
```

## Cách Sử Dụng

### CSS Load Order (mỗi trang)
```html
<!-- Bắt buộc cho mọi trang -->
<link rel="stylesheet" href="css/layout.css">
<!-- Chỉ load file riêng của trang -->
<link rel="stylesheet" href="css/home.css">     <!-- chỉ index.html -->
<link rel="stylesheet" href="css/product.css">  <!-- chỉ products.html & product-detail.html -->
<!-- Bắt buộc cuối cùng -->
<link rel="stylesheet" href="css/responsive.css">
```

### JS Load Order (mỗi trang)
```html
<!-- Bắt buộc theo thứ tự -->
<script src="js/api.js"></script>       <!-- data layer (phải đầu tiên) -->
<script src="js/common.js"></script>    <!-- shared logic -->
<script src="js/home.js"></script>      <!-- chỉ index.html -->
<script src="js/product.js"></script>   <!-- chỉ products.html & product-detail.html -->
```

## Phân Chia Công Việc Frontend

| File                  | Trách nhiệm                                          |
|-----------------------|------------------------------------------------------|
| `css/layout.css`      | Design system, header, footer, nav, buttons          |
| `css/home.css`        | Hero, story teaser, product cards, process, CTA      |
| `css/product.css`     | Filter bar, product grid, product detail, tabs       |
| `css/responsive.css`  | Media queries cho tất cả breakpoints                 |
| `js/api.js`           | Mock data + API stubs (swap real API khi có backend) |
| `js/common.js`        | Header scroll, mobile menu, toast, lazy load, utils  |
| `js/home.js`          | Render featured products, parallax, animations       |
| `js/product.js`       | Filter, pagination, gallery switcher, cart actions   |

## CSS Variables (Design Tokens)

Tất cả màu sắc, font, spacing được định nghĩa trong `css/layout.css`:
- `--color-primary`: Nâu chính (#8B4513)
- `--color-accent`: Vàng gold (#D4A853)
- `--color-bg-dark`: Nền tối (#1A1008)
- `--font-heading`: Playfair Display
- `--font-body`: Inter

## Kết Nối Backend

Trong `js/api.js`, tìm các comment `// TODO: replace with real API call:` và thay mock data bằng fetch() thật:
```js
// Thay:
return Promise.resolve(MOCK_PRODUCTS);
// Thành:
return _fetch('/products');
```

## Images Cần Chuẩn Bị

Đặt vào `assets/images/`:
- `logo.png` – Logo Phúc Gia Tiên (transparent, ~200x200px)
- `hero-bg.jpg` – Ảnh bìa trang chủ (~1920x1080px)
- `story-couple.jpg` – Ảnh 2 vợ chồng (~800x600px)
- `product-{id}-{i}.jpg` – Ảnh sản phẩm (~800x1000px, tỉ lệ 3:4)
- `video-thumb-{n}.jpg` – Thumbnail video (~1280x720px)

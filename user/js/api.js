// ============================================
// api.js - Centralized API / Data layer
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function (window) {
  'use strict';

  // --------------------------------------------------
  // CONFIG
  // --------------------------------------------------
  const API_BASE = '/api'; // Change to full URL in production, e.g. 'https://api.phucgatien.vn'

  // --------------------------------------------------
  // MOCK DATA (used when backend is not connected)
  // Replace with real API calls as the backend is built.
  // --------------------------------------------------

  var MOCK_PRODUCTS = [
    {
      id: 1,
      name: 'Lộc Bình Vẽ Tay 1M6',
      slug: 'loc-binh-ve-tay-1m6',
      price: 40000000,
      originalPrice: null,
      category: 'loc-binh',
      material: 'Gốm sứ cao cấp',
      style: 'Vẽ tay thủ công',
      color: 'Nâu – Vàng',
      size: '1.6m',
      status: 'Còn hàng',
      badge: 'Nổi bật',
      images: ['assets/images/product-1-1.jpg', 'assets/images/product-1-2.jpg'],
      description:
        'Lộc bình vẽ tay 1M6 thuộc chất liệu gốm sứ cao cấp, qua tay nghệ nhân thủ công với hàng chục năm kinh nghiệm...',
    },
    {
      id: 2,
      name: 'Lộc Bình Men Ra',
      slug: 'loc-binh-men-ra',
      price: 33000000,
      originalPrice: null,
      category: 'loc-binh',
      material: 'Gốm sứ',
      style: 'Men ra',
      color: 'Xanh lam',
      size: '1.2m',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-2-1.jpg'],
      description: 'Lộc bình men ra đặc trưng với màu xanh lam tinh tế...',
    },
    {
      id: 3,
      name: 'Lộc Bình Trổ',
      slug: 'loc-binh-tro',
      price: 26000000,
      originalPrice: null,
      category: 'loc-binh',
      material: 'Gốm sứ',
      style: 'Điêu khắc trổ',
      color: 'Trắng ngà',
      size: '1.0m',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-3-1.jpg'],
      description: 'Lộc bình trổ với kỹ thuật điêu khắc tinh xảo...',
    },
    {
      id: 4,
      name: 'Tranh Gốm Phúc Lộc Thọ',
      slug: 'tranh-gom-phuc-loc-tho',
      price: 22808000,
      originalPrice: null,
      category: 'tranh-gom',
      material: 'Gốm sứ',
      style: 'Vẽ tay',
      color: 'Đa sắc',
      size: '60x90cm',
      status: 'Còn hàng',
      badge: 'Mới',
      images: ['assets/images/product-4-1.jpg'],
      description: 'Tranh gốm Phúc Lộc Thọ mang ý nghĩa may mắn, thịnh vượng...',
    },
    {
      id: 5,
      name: 'Bộ Đồ Thờ Cao Cấp',
      slug: 'bo-do-tho-cao-cap',
      price: 15000000,
      originalPrice: null,
      category: 'do-tho',
      material: 'Gốm sứ cao cấp',
      style: 'Truyền thống',
      color: 'Đỏ – Vàng',
      size: 'Bộ 5 món',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-5-1.jpg'],
      description: 'Bộ đồ thờ cao cấp gồm 5 món, chế tác thủ công bởi nghệ nhân Bát Tràng...',
    },
    {
      id: 6,
      name: 'Bình Hút Lộc',
      slug: 'binh-hut-loc',
      price: 12000000,
      originalPrice: null,
      category: 'binh-hoa',
      material: 'Gốm sứ',
      style: 'Vẽ tay',
      color: 'Trắng – Xanh',
      size: '60cm',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-6-1.jpg'],
      description: 'Bình hút lộc phong thủy, mang lại tài lộc và bình an...',
    },
    {
      id: 7,
      name: 'Chum Ngâm Rượu',
      slug: 'chum-ngam-ruou',
      price: 9500000,
      originalPrice: null,
      category: 'chum-vat',
      material: 'Gốm sứ dân gian',
      style: 'Truyền thống',
      color: 'Nâu tự nhiên',
      size: '20 lít',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-7-1.jpg'],
      description: 'Chum ngâm rượu truyền thống Bát Tràng, giúp rượu thêm thơm ngon...',
    },
    {
      id: 8,
      name: 'Đĩa Gốm Phong Thuỷ',
      slug: 'dia-gom-phong-thuy',
      price: 8000000,
      originalPrice: null,
      category: 'dia-gom',
      material: 'Gốm sứ',
      style: 'Vẽ tay',
      color: 'Xanh – Trắng',
      size: '40cm',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-8-1.jpg'],
      description: 'Đĩa gốm phong thuỷ, hoa văn tinh tế, thích hợp trưng bày...',
    },
    // --- BẢN SAO ĐỂ TEST PHÂN TRANG (Trang 2) ---
    {
      id: 9,
      name: 'Lộc Bình Men Lam (Test)',
      slug: 'loc-binh-men-lam-test',
      price: 38000000,
      originalPrice: null,
      category: 'loc-binh',
      material: 'Gốm sứ',
      style: 'Vẽ tay',
      color: 'Trắng xanh',
      size: '1.4m',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-1-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 10,
      name: 'Chóe Bày Ban Thờ',
      slug: 'choe-bay-ban-tho',
      price: 15500000,
      originalPrice: null,
      category: 'do-tho',
      material: 'Gốm sứ',
      style: 'Đắp nổi',
      color: 'Nâu – Vàng',
      size: '40cm',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-5-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 11,
      name: 'Tranh Gốm Đồng Quê',
      slug: 'tranh-gom-dong-que',
      price: 25000000,
      originalPrice: null,
      category: 'tranh-gom',
      material: 'Gốm sứ',
      style: 'Đắp nổi 3D',
      color: 'Đa sắc',
      size: '80x120cm',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-4-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 12,
      name: 'Bình Hoa Sen',
      slug: 'binh-hoa-sen',
      price: 4500000,
      originalPrice: null,
      category: 'binh-hoa',
      material: 'Gốm sứ',
      style: 'Vẽ tay',
      color: 'Trắng – Hồng',
      size: '30cm',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-6-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 13,
      name: 'Chum Rượu Khắc Nổi',
      slug: 'chum-ruou-khac-noi',
      price: 18000000,
      originalPrice: null,
      category: 'chum-vat',
      material: 'Gốm sứ',
      style: 'Khắc nổi',
      color: 'Nâu sẫm',
      size: '50 lít',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-7-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 14,
      name: 'Đĩa Cảnh Phú Quý',
      slug: 'dia-canh-phu-quy',
      price: 11000000,
      originalPrice: null,
      category: 'dia-gom',
      material: 'Gốm sứ',
      style: 'Vẽ vàng 24k',
      color: 'Đỏ – Vàng',
      size: '50cm',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-8-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 15,
      name: 'Bộ Ấm Chén Hoàng Gia',
      slug: 'bo-am-chen-hoang-gia',
      price: 3500000,
      originalPrice: null,
      category: 'do-tho', // Reusing category for test
      material: 'Gốm sứ',
      style: 'Men ngọc',
      color: 'Xanh ngọc',
      size: 'Tiêu chuẩn',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-5-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 16,
      name: 'Lộc Bình Tứ Quý',
      slug: 'loc-binh-tu-quy',
      price: 50000000,
      originalPrice: null,
      category: 'loc-binh',
      material: 'Gốm sứ',
      style: 'Khắc kỹ',
      color: 'Trắng – Xanh',
      size: '1.8m',
      status: 'Còn hàng',
      badge: 'Bán chạy',
      images: ['assets/images/product-2-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    // --- BẢN SAO ĐỂ TEST PHÂN TRANG (Trang 3) ---
    {
      id: 17,
      name: 'Tượng Gốm Di Lặc',
      slug: 'tuong-gom-di-lac',
      price: 14000000,
      originalPrice: null,
      category: 'do-tho',
      material: 'Gốm sứ',
      style: 'Men rạn',
      color: 'Nâu cổ',
      size: '40cm',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-3-1.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    },
    {
      id: 18,
      name: 'Lộc Bình Bát Tiên',
      slug: 'loc-binh-bat-tien',
      price: 65000000,
      originalPrice: null,
      category: 'loc-binh',
      material: 'Gốm sứ',
      style: 'Vẽ tay cao cấp',
      color: 'Đa sắc',
      size: '1.8m',
      status: 'Còn hàng',
      badge: null,
      images: ['assets/images/product-1-2.jpg'],
      description: 'Sản phẩm thử nghiệm phân trang...',
    }
  ];

  var MOCK_CATEGORIES = [
    { id: 'all',       name: 'Tất cả danh mục' },
    { id: 'loc-binh',  name: 'Lộc Bình' },
    { id: 'do-tho',    name: 'Đồ Thờ' },
    { id: 'tranh-gom', name: 'Tranh Gốm' },
    { id: 'binh-hoa',  name: 'Bình Hoa' },
    { id: 'chum-vat',  name: 'Chum – Vạt' },
    { id: 'dia-gom',   name: 'Đĩa Gốm' },
  ];

  var MOCK_QUALITIES = [
    { id: 'all',     name: 'Tất cả chất lượng' },
    { id: 'cao-cap', name: 'Cao cấp' },
    { id: 'trung',   name: 'Trung bình' },
  ];

  var MOCK_SIZES = [
    { id: 'all', name: 'Tất cả kích thước' },
    { id: 'nho', name: 'Nhỏ (dưới 60cm)' },
    { id: 'vua', name: 'Vừa (60cm – 1m)' },
    { id: 'lon', name: 'Lớn (trên 1m)' },
  ];

  // --------------------------------------------------
  // INTERNAL HTTP HELPER
  // --------------------------------------------------
  function _fetch(endpoint, options) {
    return fetch(API_BASE + endpoint, Object.assign({
      headers: { 'Content-Type': 'application/json' },
    }, options || {})).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' – ' + endpoint);
      return res.json();
    });
  }

  // --------------------------------------------------
  // PUBLIC API OBJECT
  // --------------------------------------------------
  var PhucGiaTienAPI = {

    // ---- PRODUCTS ----

    /**
     * Get all products, with optional filters
     * @param {Object} filters  { category, quality, size, sort, page, limit }
     * @returns {Promise<{data: Array, total: number, page: number}>}
     */
    getProducts: function (filters) {
      // TODO: replace with real API call:
      // return _fetch('/products?' + new URLSearchParams(filters));

      return Promise.resolve().then(function () {
        var products = MOCK_PRODUCTS.slice();
        filters = filters || {};

        // Filter by category
        if (filters.category && filters.category !== 'all') {
          products = products.filter(function (p) {
            return p.category === filters.category;
          });
        }

        // Filter by quality
        if (filters.quality && filters.quality !== 'all') {
          products = products.filter(function (p) {
            var material = (p.material || '').toLowerCase();
            var name = (p.name || '').toLowerCase();
            if (filters.quality === 'cao-cap') {
              return material.indexOf('cao cấp') >= 0 || name.indexOf('cao cấp') >= 0;
            } else if (filters.quality === 'trung') {
              return material.indexOf('cao cấp') === -1 && name.indexOf('cao cấp') === -1;
            }
            return true;
          });
        }

        // Filter by size
        if (filters.size && filters.size !== 'all') {
          products = products.filter(function (p) {
            var sizeStr = (p.size || '').toLowerCase();
            if (filters.size === 'nho') {
              if (sizeStr.indexOf('lít') >= 0 || sizeStr.indexOf('bộ') >= 0) return true;
              var match = sizeStr.match(/(\d+)\s*cm/);
              if (match) {
                return parseInt(match[1], 10) < 60;
              }
              return true; // fallback
            } else if (filters.size === 'vua') {
              if (sizeStr.indexOf('1.0m') >= 0) return true;
              var match = sizeStr.match(/(\d+)\s*cm/);
              if (match) {
                var val = parseInt(match[1], 10);
                return val >= 60 && val <= 100;
              }
              return false;
            } else if (filters.size === 'lon') {
              if (sizeStr.indexOf('1.0m') >= 0) return false;
              if (sizeStr.indexOf('m') >= 0 && sizeStr.indexOf('cm') === -1) {
                var val = parseFloat(sizeStr);
                return val >= 1.0;
              }
              return false;
            }
            return true;
          });
        }

        // Sort
        if (filters.sort === 'price-asc') {
          products.sort(function (a, b) { return a.price - b.price; });
        } else if (filters.sort === 'price-desc') {
          products.sort(function (a, b) { return b.price - a.price; });
        } else if (filters.sort === 'newest') {
          products.sort(function (a, b) { return b.id - a.id; });
        }

        // Pagination
        var limit = filters.limit || 8;
        var page  = filters.page  || 1;
        var start = (page - 1) * limit;
        var paged = products.slice(start, start + limit);

        return { data: paged, total: products.length, page: page };
      });
    },

    /**
     * Get a single product by slug or id
     * @param {string|number} slugOrId
     * @returns {Promise<Object>}
     */
    getProduct: function (slugOrId) {
      // return _fetch('/products/' + slugOrId);
      return Promise.resolve().then(function () {
        var product = MOCK_PRODUCTS.find(function (p) {
          return p.id === Number(slugOrId) || p.slug === slugOrId;
        });
        if (!product) throw new Error('Không tìm thấy sản phẩm');
        return product;
      });
    },

    /**
     * Get featured / highlighted products
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    getFeaturedProducts: function (limit) {
      return Promise.resolve().then(function () {
        return MOCK_PRODUCTS.slice(0, limit || 4);
      });
    },

    // ---- CATEGORIES ----

    getCategories: function () {
      // return _fetch('/categories');
      return Promise.resolve(MOCK_CATEGORIES);
    },

    getQualities: function () {
      return Promise.resolve(MOCK_QUALITIES);
    },

    getSizes: function () {
      return Promise.resolve(MOCK_SIZES);
    },

    // ---- CONTACT ----

    /**
     * Submit contact form
     * @param {Object} payload  { name, phone, email, message }
     * @returns {Promise<{success: boolean}>}
     */
    submitContact: function (payload) {
      // return _fetch('/contact', { method: 'POST', body: JSON.stringify(payload) });
      return new Promise(function (resolve) {
        setTimeout(function () { resolve({ success: true }); }, 800);
      });
    },

    // ---- NEWSLETTER ----

    subscribeNewsletter: function (email) {
      // return _fetch('/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
      return new Promise(function (resolve) {
        setTimeout(function () { resolve({ success: true }); }, 600);
      });
    },
  };

  // Expose globally
  window.PhucGiaTienAPI = PhucGiaTienAPI;

}(window));

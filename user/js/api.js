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
      images: ['../assets/images/product-1-1.jpg', '../assets/images/product-1-2.jpg'],
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
      images: ['../assets/images/product-2-1.jpg'],
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
      images: ['../assets/images/product-3-1.jpg'],
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
      images: ['../assets/images/product-4-1.jpg'],
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
      images: ['../assets/images/product-5-1.jpg'],
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
      images: ['../assets/images/product-6-1.jpg'],
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
      images: ['../assets/images/product-7-1.jpg'],
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
      images: ['../assets/images/product-8-1.jpg'],
      description: 'Đĩa gốm phong thuỷ, hoa văn tinh tế, thích hợp trưng bày...',
    },
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

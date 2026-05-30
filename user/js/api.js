// api.js
(function (global) {
  'use strict';

  var API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5080' ? 'http://localhost:5080/api' : '/api';

  // Base helper
  function _fetch(endpoint, options) {
    options = options || {};
    options.headers = options.headers || {};
    
    // Prevent browser caching for API GET requests (e.g. order tracking showing old status)
    if (!options.method || options.method === 'GET') {
      options.cache = 'no-store';
    } else {
      options.headers['Content-Type'] = 'application/json';
    }

    // Inject customer token if available
    var token = localStorage.getItem('customer_token');
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    return fetch(API_BASE + endpoint, options)
      .then(function (res) {
        if (!res.ok) throw new Error('API Error: ' + res.status);
        return res.json();
      });
  }

  var PhucGiaTienAPI = {
    apiBase: API_BASE,
    // --- Products ---
    getProducts: function (params) {
      var query = [];
      if (params) {
        if (params.category && params.category !== 'all') query.push('category=' + encodeURIComponent(params.category));
        if (params.quality && params.quality !== 'all') query.push('quality=' + encodeURIComponent(params.quality));
        if (params.size && params.size !== 'all') query.push('size=' + encodeURIComponent(params.size));
        if (params.sort && params.sort !== 'newest') query.push('sort=' + encodeURIComponent(params.sort));
        if (params.page) query.push('page=' + params.page);
        if (params.limit) query.push('limit=' + params.limit);
      }
      var qs = query.length ? '?' + query.join('&') : '';
      return _fetch('/products' + qs);
    },

    getProductBySlug: function (slug) {
      return _fetch('/products/' + encodeURIComponent(slug));
    },

    getFeaturedProducts: function (limit) {
      return _fetch('/products/featured?limit=' + (limit || 6));
    },

    // --- Categories ---
    getCategories: function () {
      return _fetch('/categories');
    },

    // --- Journey ---
    getJourneyTopics: function () {
      return _fetch('/journey/topics');
    },

    getJourneyVideos: function (topicId) {
      var qs = topicId ? '?topicId=' + topicId : '';
      return _fetch('/journey/videos' + qs);
    },

    // --- Glaze Lines ---
    getGlazeLines: function () {
      return _fetch('/glazelines');
    },

    // --- Filters Data ---
    getFilters: function () {
      return Promise.all([this.getCategories(), this.getGlazeLines()]).then(function (results) {
        var cats = results[0];
        var glazes = results[1];

        // Map glazes to qualities filter format
        var qualities = glazes.map(function (g) {
          return { id: g.id.toString(), name: g.name };
        });

        return {
          categories: [{ id: 'all', name: 'Tất cả' }].concat(cats),
          qualities: qualities,
          sizes: [
            { id: 'all', name: 'Tất cả' },
            { id: 'lon', name: 'Cỡ lớn (>= 1m)' },
            { id: 'vua', name: 'Cỡ vừa (50cm - 1m)' },
            { id: 'nho', name: 'Cỡ nhỏ (< 50cm)' }
          ]
        };
      });
    },

    // --- Journey ---
    getJourneyTopics: function () {
      return _fetch('/journey/topics');
    },
    getJourneyVideos: function (topicId) {
      var qs = topicId ? '?topicId=' + encodeURIComponent(topicId) : '';
      return _fetch('/journey/videos' + qs);
    },

    // --- Orders & Checkout ---
    createOrder: function (orderData) {
      return _fetch('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    },

    getOrder: function (orderCode) {
      return _fetch('/orders/' + encodeURIComponent(orderCode));
    },

    registerCustomer: function (customerData) {
      return _fetch('/customers/register', {
        method: 'POST',
        body: JSON.stringify(customerData)
      });
    },

    loginCustomer: function (loginData) {
      return _fetch('/customers/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });
    },

    getCustomerOrders: function () {
      return _fetch('/orders/history/me');
    },

    forgotPassword: function (emailOrPhone) {
      return _fetch('/customers/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ emailOrPhone: emailOrPhone })
      });
    },

    resetPassword: function (emailOrPhone, tokenOrOtp, newPassword) {
      return _fetch('/customers/reset-password', {
        method: 'POST',
        body: JSON.stringify({ emailOrPhone: emailOrPhone, tokenOrOtp: tokenOrOtp, newPassword: newPassword })
      });
    },

    // --- Utilities ---
    formatCurrency: function (amount) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },

    // --- Site Config ---
    getSiteConfigs: function () {
      return _fetch('/site-config');
    },

    // --- Team ---
    getPublicTeam: function () {
      return _fetch('/adminaccounts/public-team');
    }
  };

  global.PhucGiaTienAPI = PhucGiaTienAPI;

})(window);


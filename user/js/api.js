// api.js
(function(global) {
    'use strict';
  
    var API_BASE = 'http://localhost:5080/api';
  
    // Base helper
    function _fetch(endpoint, options) {
      options = options || {};
      options.headers = options.headers || {};
      if (options.method && options.method !== 'GET') {
          options.headers['Content-Type'] = 'application/json';
      }
      return fetch(API_BASE + endpoint, options)
        .then(function(res) {
          if (!res.ok) throw new Error('API Error: ' + res.status);
          return res.json();
        });
    }
  
    var PhucGiaTienAPI = {
      // --- Products ---
      getProducts: function(params) {
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
  
      getProductBySlug: function(slug) {
        return _fetch('/products/' + encodeURIComponent(slug));
      },
  
      getFeaturedProducts: function(limit) {
        return _fetch('/products/featured?limit=' + (limit || 6));
      },
  
      // --- Categories ---
      getCategories: function() {
        return _fetch('/categories');
      },
  
      // --- Journey ---
      getJourneyTopics: function() {
        return _fetch('/journey/topics');
      },
  
      getJourneyVideos: function(topicId) {
        var qs = topicId ? '?topicId=' + topicId : '';
        return _fetch('/journey/videos' + qs);
      },
  
      // --- Filters Data ---
      getFilters: function() {
        // Categories are dynamic, size/quality are static (or could be dynamic)
        return this.getCategories().then(function(cats) {
            return {
                categories: [{ id: 'all', name: 'Tất cả' }].concat(cats),
                qualities: [
                    { id: 'all', name: 'Tất cả' },
                    { id: 'cao-cap', name: 'Gốm sứ cao cấp' },
                    { id: 'trung', name: 'Gốm sứ dân dụng' }
                ],
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
      getJourneyTopics: function() {
        return _fetch('/journey/topics');
      },
      getJourneyVideos: function(topicId) {
        var qs = topicId ? '?topicId=' + encodeURIComponent(topicId) : '';
        return _fetch('/journey/videos' + qs);
      },
  
      // --- Orders & Checkout ---
      createOrder: function(orderData) {
        return _fetch('/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
      },
  
      // --- Utilities ---
      formatCurrency: function(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
      }
    };
  
    global.PhucGiaTienAPI = PhucGiaTienAPI;
  
  })(window);
  

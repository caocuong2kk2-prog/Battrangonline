// ============================================
// product.js - Product list & detail logic
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function () {
  'use strict';

  // ====================================================
  // PRODUCT LIST PAGE  (products.html)
  // ====================================================

  var state = {
    category: 'all',
    quality: 'all',
    size: 'all',
    priceRange: 'all',
    sort: 'newest',
    page: 1,
    limit: 8,
    total: 0,
  };

  // -- Populate filter selects from API --
  function populateFilters() {
    var catSel = document.getElementById('filter-category');

    PhucGiaTienAPI.getFilters().then(function (filters) {
      if (catSel) {
        catSel.innerHTML = '';
        filters.categories.forEach(function (c) {
          var opt = new Option(c.name, c.id);
          catSel.appendChild(opt);
        });
      }

      initCustomSelects();
    }).catch(function(e) {
      console.error('Error loading filters', e);
      initCustomSelects();
    });
  }

  // ── Custom Select (Premium UI) ──
  function initCustomSelects(root) {
    var container = root || document;
    var selects = container.querySelectorAll('select.filter-select:not(.custom-select-hidden)');
    selects.forEach(function (select) {
      select.classList.add('custom-select-hidden');
      select.style.display = 'none';

      var wrapper = document.createElement('div');
      wrapper.className = 'custom-select-wrapper is-filter';
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);

      var trigger = document.createElement('div');
      trigger.className = 'custom-select__trigger';

      var textSpan = document.createElement('span');
      textSpan.className = 'custom-select__text';
      var selectedOpt = select.options[select.selectedIndex];
      textSpan.textContent = selectedOpt ? selectedOpt.text : '';

      var icon = document.createElement('div');
      icon.className = 'custom-select__icon';
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

      trigger.appendChild(textSpan);
      trigger.appendChild(icon);

      var optionsContainer = document.createElement('div');
      optionsContainer.className = 'custom-select__options';

      Array.from(select.options).forEach(function (option, index) {
        var optEl = document.createElement('div');
        optEl.className = 'custom-select__option' + (option.selected ? ' selected' : '');
        optEl.textContent = option.text;
        optEl.dataset.value = option.value;

        optEl.addEventListener('click', function (e) {
          e.stopPropagation();
          select.selectedIndex = index;
          textSpan.textContent = option.text;

          var prev = optionsContainer.querySelector('.selected');
          if (prev) prev.classList.remove('selected');
          optEl.classList.add('selected');

          wrapper.classList.remove('open');
          optionsContainer.classList.remove('show');
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        optionsContainer.appendChild(optEl);
      });

      wrapper.appendChild(trigger);
      document.body.appendChild(optionsContainer);

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = wrapper.classList.contains('open');

        // Close all others
        document.querySelectorAll('.custom-select-wrapper').forEach(function (w) { w.classList.remove('open'); });
        document.querySelectorAll('.custom-select__options').forEach(function (o) { o.classList.remove('show'); });

        if (!isOpen) {
          wrapper.classList.add('open');
          var rect = trigger.getBoundingClientRect();
          optionsContainer.style.top = (rect.bottom + window.scrollY + 4) + 'px';
          optionsContainer.style.left = rect.left + 'px';
          optionsContainer.style.width = rect.width + 'px';
          optionsContainer.classList.add('show');
        }
      });

      select.addEventListener('change', function () {
        var opt = select.options[select.selectedIndex];
        if (opt) {
          textSpan.textContent = opt.text;
          var prev = optionsContainer.querySelector('.selected');
          if (prev) prev.classList.remove('selected');
          var curr = optionsContainer.querySelector('[data-value="' + opt.value + '"]');
          if (curr) curr.classList.add('selected');
        }
      });
    });
  }

  // Close custom selects on click outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.custom-select-wrapper') && !e.target.closest('.custom-select__options')) {
      document.querySelectorAll('.custom-select-wrapper').forEach(function (w) { w.classList.remove('open'); });
      document.querySelectorAll('.custom-select__options').forEach(function (o) { o.classList.remove('show'); });
    }
  });

  // Close custom selects on scroll (except scrolling inside the options list)
  window.addEventListener('scroll', function (e) {
    if (e.target.nodeType === 1 && e.target.closest('.custom-select__options')) return;
    document.querySelectorAll('.custom-select-wrapper').forEach(function (w) { w.classList.remove('open'); });
    document.querySelectorAll('.custom-select__options').forEach(function (o) { o.classList.remove('show'); });
  }, true);

  // -- Load & render product list --
  var PRICE_RANGES = {
    'all':     null,
    'under10': { min: 0,        max: 10000000 },
    '10to20':  { min: 10000000, max: 20000000 },
    '20to50':  { min: 20000000, max: 50000000 },
    'above50': { min: 50000000, max: Infinity },
  };

  function matchesPriceRange(product, range) {
    if (!range || range === 'all') return true;
    var bounds = PRICE_RANGES[range];
    if (!bounds) return true;
    var price = product.basePrice || (product.variants && product.variants.length ? product.variants[0].price : 0);
    return price >= bounds.min && price < bounds.max;
  }

  function loadProducts() {
    var grid = document.getElementById('product-list-grid');
    var countEl = document.getElementById('product-count');
    var paginationEl = document.getElementById('product-pagination');

    if (!grid) return;

    grid.innerHTML = '<div class="spinner" style="margin:4rem auto;"></div>';

    PhucGiaTienAPI.getProducts({
      category: state.category,
      quality: state.quality,
      size: state.size,
      sort: state.sort,
      page: state.priceRange === 'all' ? state.page : 1, // fetch all pages when price filtering client-side
      limit: state.priceRange === 'all' ? state.limit : 1000,
    }).then(function (res) {
      // Client-side price filter
      var filtered = state.priceRange === 'all'
        ? res.data
        : res.data.filter(function(p) { return matchesPriceRange(p, state.priceRange); });

      state.total = filtered.length;
      grid.innerHTML = '';

      if (!filtered.length) {
        grid.innerHTML =
          '<p style="text-align:center;color:var(--color-text-muted);padding:3rem 0">Không có sản phẩm phù hợp.</p>';
        return;
      }

      // Pagination on filtered result
      var totalPages = Math.ceil(filtered.length / state.limit);
      var start = (state.page - 1) * state.limit;
      var pageData = state.priceRange === 'all' ? filtered : filtered.slice(start, start + state.limit);

      pageData.forEach(function (p, i) {
        var card = buildProductCard(p, i);
        grid.appendChild(card);
      });

      if (countEl) {
        countEl.textContent = 'Hiển thị ' + pageData.length + '/' + filtered.length + ' sản phẩm';
      }

      renderPagination(paginationEl, state.page, state.priceRange === 'all' ? Math.ceil(res.total / state.limit) : totalPages);

      if (typeof window.initScrollReveal === 'function') {
        window.initScrollReveal();
      }
    }).catch(function () {
      grid.innerHTML =
        '<p style="text-align:center;color:var(--color-text-muted)">Lỗi tải dữ liệu, vui lòng thử lại.</p>';
    });
  }

  function buildProductCard(p, i) {
    var article = document.createElement('article');
    article.className = 'product-card reveal';
    article.dataset.delay = String(i * 80);

    var badgeHTML = '';
    if (p.status === 'inactive') {
      badgeHTML = '<span class="product-card__badge" style="background:#e07070;">Hết hàng</span>';
    } else if (p.badge) {
      badgeHTML = '<span class="product-card__badge">' + p.badge + '</span>';
    }

    var imgSrc = (p.images && p.images[0]) ? p.images[0] : 'assets/images/placeholder.jpg';

    // Stars: dùng rating từ data hoặc ngẫu nhiên 4-5 sao
    var rating = p.rating || (4 + Math.floor(Math.random() * 2));
    var starsHTML = '';
    for (var j = 1; j <= 5; j++) {
      starsHTML += '<span class="product-card__star' +
        (j > rating ? ' product-card__star--empty' : '') + '">&#9733;</span>';
    }

    var pSafe = JSON.stringify({
      id: p.id, slug: p.slug, name: p.name, price: p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0), images: p.images
    }).replace(/'/g, '&#39;');

    article.innerHTML =
      '<div class="product-card__media">' +
        badgeHTML +
        (imgSrc.match(/\.(mp4|mov|avi|webm|ogg)$/i) 
          ? '<video class="product-card__img" src="' + imgSrc + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>'
          : '<img class="product-card__img" src="' + imgSrc + '" alt="' + p.name + '" loading="lazy">') +
        '<div class="product-card__action">' +
          '<div class="product-card__action-row">' +
            (p.status === 'inactive'
              ? '<button class="product-card__btn-cart" disabled style="background:#f5f5f5;color:#999;border-color:#e0e0e0;cursor:not-allowed;">' +
                'Tạm hết hàng</button>'
              : '<button class="product-card__btn-cart" data-product=\'' + pSafe + '\'>' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                  '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
                  '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
                '</svg>' +
                'Thêm giỏ hàng' +
                '</button>') +
            '<button class="product-card__btn-detail" title="Xem chi tiết" data-slug="' + p.slug + '">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="product-card__body">' +
        '<h3 class="product-card__name">' + p.name + '</h3>' +
        '<div class="product-card__price-row">' +
          '<span class="product-card__price">' + window.formatVND(p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0)) + '</span>' +
        '</div>' +
      '</div>';

    // Bind event for Add to Cart
    var cartBtn = article.querySelector('.product-card__btn-cart');
    if (cartBtn) {
      cartBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.CartAPI) window.CartAPI.addItem(p, 1, e);
      });
    }

    // Bind event for Details (click anywhere on the media or details button)
    var mediaEl = article.querySelector('.product-card__media');
    if (mediaEl) {
      mediaEl.addEventListener('click', function () {
        window.location.href = 'product-detail.html?slug=' + p.slug;
      });
    }

    var detBtn = article.querySelector('.product-card__btn-detail');
    if (detBtn) {
      detBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.location.href = 'product-detail.html?slug=' + p.slug;
      });
    }

    // Click anywhere on body leads to detail
    var bodyEl = article.querySelector('.product-card__body');
    if (bodyEl) {
      bodyEl.addEventListener('click', function () {
        window.location.href = 'product-detail.html?slug=' + p.slug;
      });
    }

    return article;
  }

  // -- Pagination --
  function renderPagination(container, current, total) {
    if (!container) return;
    container.innerHTML = '';
    if (total <= 1) return;

    function addBtn(label, page, isActive, isDisabled) {
      var btn = document.createElement('button');
      btn.className = 'pagination__btn' + (isActive ? ' active' : '');
      btn.textContent = label;
      btn.disabled = isDisabled;
      btn.id = 'page-btn-' + label;
      if (!isDisabled) {
        btn.addEventListener('click', function () {
          state.page = page;
          loadProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      container.appendChild(btn);
    }

    addBtn('‹', current - 1, false, current <= 1);

    for (var i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
        addBtn(String(i), i, i === current, false);
      } else if (i === current - 2 || i === current + 2) {
        var dots = document.createElement('span');
        dots.textContent = '…';
        dots.style.cssText = 'padding:0 var(--space-2);color:var(--color-text-muted);align-self:center;';
        container.appendChild(dots);
      }
    }

    addBtn('›', current + 1, false, current >= total);
  }

  // -- Filter event listeners --
  function bindFilters() {
    var filterMap = {
      'filter-category': 'category',
      'sort-select': 'sort',
    };

    Object.keys(filterMap).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function () {
        state[filterMap[id]] = el.value;
        state.page = 1;
        loadProducts();
      });
    });

    // Price range filter (client-side)
    var priceEl = document.getElementById('filter-price');
    if (priceEl) {
      priceEl.addEventListener('change', function () {
        state.priceRange = priceEl.value;
        state.page = 1;
        loadProducts();
      });
    }
  }

  // ====================================================
  // PRODUCT DETAIL PAGE  (product-detail.html)
  // ====================================================

  function initProductDetail() {
    var container = document.getElementById('product-detail-container');
    if (!container) return;

    // Read slug from URL
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug') || params.get('id');

    if (!slug) {
      container.innerHTML = '<p style="text-align:center;padding:4rem 0;">Sản phẩm không tồn tại.</p>';
      return;
    }

    container.innerHTML = '<div class="spinner" style="margin:4rem auto;"></div>';

    PhucGiaTienAPI.getProductBySlug(slug).then(function (product) {
      renderProductDetail(container, product);
      var shortStoreName = window.PGT_CONFIG ? window.PGT_CONFIG.storeName.split('–')[0].split('-')[0].trim() : 'Phúc Gia Tiên';
      document.title = product.name + ' – ' + shortStoreName;
      initGallery();
      initTabs();
      initQuantity();
      initAddToCart(product);
    }).catch(function (err) {
      console.error("PRODUCT FETCH OR RENDER ERROR:", err);
      container.innerHTML =
        '<p style="text-align:center;padding:4rem 0;color:var(--color-text-muted)">Không tìm thấy sản phẩm.</p>';
    });
  }

  function renderProductDetail(container, p) {
    var firstMedia = (p.images && p.images[0]) ? p.images[0] : 'assets/images/placeholder.jpg';
    var isFirstVideo = !!firstMedia.match(/\.(mp4|mov|avi|webm|ogg)$/i);

    var thumbnailsHTML = (p.images || []).map(function (src, i) {
        var isVid = !!src.match(/\.(mp4|mov|avi|webm|ogg)$/i);
        var innerHtml = isVid 
           ? '<video src="' + src + '" style="width:100%;height:100%;object-fit:cover;" muted></video>'
           : '<img src="' + src + '" alt="' + p.name + ' ảnh ' + (i + 1) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;">';
        return '<button class="product-thumbnail' + (i === 0 ? ' active' : '') + '" data-src="' + src + '" data-type="' + (isVid ? 'video' : 'image') + '" aria-label="Ảnh ' + (i + 1) + '">' +
          innerHtml +
          '</button>';
      }).join('');

    var statusText = (p.status === 'active') ? '<span class="status-badge active">Còn hàng</span>' : (p.status === 'inactive' ? '<span class="status-badge inactive">Hết hàng</span>' : '<span class="status-badge active">' + (p.status || 'Còn hàng') + '</span>');
    var rawDesc = p.description || p.desc || '';
    var textOnlyDesc = rawDesc.replace(/<[^>]+>/g, '').trim();
    var shortDesc = p.shortDescription || textOnlyDesc;
    if (!p.shortDescription && shortDesc.length > 120) {
      shortDesc = shortDesc.substring(0, 120) + '...';
    }

    var specsHTML =
      '<div class="product-spec-row"><span class="product-spec-row__key">Mã sản phẩm: </span><span class="product-spec-row__val">SP' + p.id + '</span></div>' +
      '<div class="product-spec-row"><span class="product-spec-row__key">Kích thước: </span><span class="product-spec-row__val">' + (p.size || 'Đang cập nhật') + '</span></div>' +
      '<div class="product-spec-row"><span class="product-spec-row__key">Tình trạng: </span><span class="product-spec-row__val">' + statusText + '</span></div>';

    if (p.material) specsHTML += '<div class="product-spec-row"><span class="product-spec-row__key">Chất liệu: </span><span class="product-spec-row__val">' + p.material + '</span></div>';
    if (p.color) specsHTML += '<div class="product-spec-row"><span class="product-spec-row__key">Màu sắc: </span><span class="product-spec-row__val">' + p.color + '</span></div>';
    if (p.glazeLineName) specsHTML += '<div class="product-spec-row"><span class="product-spec-row__key">Dòng men: </span><span class="product-spec-row__val">' + p.glazeLineName + '</span></div>';
    if (p.pattern) specsHTML += '<div class="product-spec-row"><span class="product-spec-row__key">Hoa văn: </span><span class="product-spec-row__val">' + p.pattern + '</span></div>';
    if (p.usage) specsHTML += '<div class="product-spec-row"><span class="product-spec-row__key">Công dụng: </span><span class="product-spec-row__val">' + p.usage + '</span></div>';
    
    if (shortDesc) {
      specsHTML += '<div class="product-spec-row"><span class="product-spec-row__key">Mô tả ngắn: </span><span class="product-spec-row__val" style="line-height:1.5;color:#666;">' + shortDesc + '</span></div>';
    }

    var actionsHTML = '';
    if (p.status !== 'inactive') {
      var variantSelectorHtml = '';
      if (p.variants && p.variants.length > 0) {
          variantSelectorHtml = '<div class="product-variants" style="margin: 15px 0;">' +
             '<label style="display:block; margin-bottom: 8px; font-weight: 600;color:black;">Chọn kích thước / phiên bản:</label>' +
             '<div class="variant-options" style="display:flex; gap: 10px; flex-wrap: wrap;">' +
             p.variants.map(function(v, i) {
                 return '<button class="btn-variant' + (i === 0 ? ' active' : '') + '" data-id="' + v.id + '" data-price="' + v.price + '" data-size="' + v.size + '" data-stock="' + v.stock + '" style="padding: 8px 12px; border: 1px solid #ddd; background: ' + (i === 0 ? '#3B2612' : '#fff') + '; color: ' + (i === 0 ? '#fff' : '#333') + '; cursor: pointer; border-radius: 4px;">' + v.size + '</button>';
             }).join('') +
             '</div></div>';
      }

      actionsHTML = 
        variantSelectorHtml +
        '<div class="quantity-control">' +
        '<div class="quantity-input-group">' +
        '<button class="quantity-btn" id="qty-minus" aria-label="Giảm">−</button>' +
        '<input class="quantity-input" id="qty-input" type="number" value="1" min="1" max="99" aria-label="Số lượng">' +
        '<button class="quantity-btn" id="qty-plus" aria-label="Tăng">+</button>' +
        '</div>' +
        '</div>' +
        '<div class="product-actions">' +
        '<button class="btn btn-add-to-cart-outline" id="btn-add-cart">THÊM VÀO GIỎ</button>' +
        '<button class="btn btn-buy-now-solid" id="btn-buy-now">MUA NGAY</button>' +
        '</div>';
    } else {
      actionsHTML = 
        '<div class="product-actions" style="margin-top:24px;">' +
        '<button class="btn" disabled style="background:#f5f5f5;color:#999;border:1px solid #e0e0e0;cursor:not-allowed;width:100%;justify-content:center;">TẠM HẾT HÀNG</button>' +
        '</div>';
    }

    container.innerHTML =
      '<div class="product-detail-grid">' +
      '<div class="product-gallery">' +
      '<div class="product-gallery__main" id="gallery-main">' +
      (isFirstVideo 
        ? '<video class="product-gallery__main-img" id="gallery-main-media" src="' + firstMedia + '" autoplay loop muted playsinline controls></video>'
        : '<img class="product-gallery__main-img" id="gallery-main-media" src="' + firstMedia + '" alt="' + p.name + '">') +
      '</div>' +
      '<div class="product-thumbnails" id="gallery-thumbnails">' + thumbnailsHTML + '</div>' +
      '</div>' +
      '<div class="product-info">' +
      '<h1 class="product-info__name">' + p.name + '</h1>' +
      '<p class="product-info__price" id="detail-price">' + window.formatVND(p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0)) + '</p>' +
      '<div class="product-specs">' + specsHTML + '</div>' +
      actionsHTML +
      '</div>' + // end product-info
      '</div>' + // end product-detail-grid
      '<div class="guarantee-badges-full">' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon">✔</span><span>Cam kết chất lượng<br><small>100% gốm sứ thủ công</small></span></div>' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon">🔄</span><span>Đổi trả miễn phí<br><small>Trong 7 ngày</small></span></div>' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon">🚚</span><span>Giao hàng toàn quốc<br><small>Ship COD tận nơi</small></span></div>' +
      '</div>' +
      '<div class="product-description-section" style="padding-top:var(--space-2);">' +
      '<h2 style="font-family:var(--font-heading); color:#3B2612; font-size:var(--fs-2xl); margin-bottom:var(--space-2); font-weight:var(--fw-semibold);">Mô Tả Chi Tiết</h2>' +
      '<div class="tab-content-text" style="color:#333;">' + (p.description || '') + '</div>' +
      '</div>';
  }

  // -- Gallery switcher --
  function initGallery() {
    var mainContainer = document.getElementById('gallery-main');
    var thumbs = document.querySelectorAll('.product-thumbnail');
    if (!mainContainer) return;

    var images = Array.from(thumbs).map(function(t) { return t.dataset.src; });

    if (thumbs.length > 0) {
        thumbs.forEach(function (thumb) {
          thumb.addEventListener('click', function () {
            thumbs.forEach(function (t) { t.classList.remove('active'); });
            thumb.classList.add('active');
            
            var src = thumb.dataset.src;
            var type = thumb.dataset.type;
            var mediaEl = document.getElementById('gallery-main-media');
            if(mediaEl) mediaEl.style.opacity = '0';
            
            setTimeout(function () {
              if(type === 'video') {
                  mainContainer.innerHTML = '<video class="product-gallery__main-img" id="gallery-main-media" src="' + src + '" autoplay loop muted playsinline controls></video>';
              } else {
                  mainContainer.innerHTML = '<img class="product-gallery__main-img" id="gallery-main-media" src="' + src + '" alt="Product Image">';
              }
              var newMedia = document.getElementById('gallery-main-media');
              if (newMedia) {
                newMedia.style.opacity = '0';
                void newMedia.offsetWidth; // reflow
                newMedia.style.transition = 'opacity 0.3s ease';
                newMedia.style.opacity = '1';
              }
            }, 150);
          });
        });
    }

    // Lightbox logic
    var lb = document.getElementById('lightboxModal');
    if (lb) {
        var lbMedia = document.getElementById('lightboxMediaContainer');
        var lbViewport = document.getElementById('lbViewport');
        var lbPrev = document.getElementById('lbPrev');
        var lbNext = document.getElementById('lbNext');
        var lbCounter = document.getElementById('lbCounter');
        var lbZoomIn = document.getElementById('lbZoomIn');
        var lbZoomOut = document.getElementById('lbZoomOut');
        var lbZoomReset = document.getElementById('lbZoomReset');
        var lbZoomLevel = document.getElementById('lbZoomLevel');
        var lbClose = document.getElementById('lbClose');
        var lbIndex = 0;

        // --- Zoom & pan state ---
        var zoomScale = 1;
        var panX = 0;
        var panY = 0;
        var MIN_ZOOM = 1;
        var MAX_ZOOM = 5;
        var ZOOM_STEP = 0.4;

        function applyTransform(animated) {
            if (!lbMedia) return;
            if (animated) {
                lbMedia.style.transition = 'transform 0.2s ease, opacity 0.2s';
            } else {
                lbMedia.style.transition = 'opacity 0.2s';
            }
            lbMedia.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomScale + ')';
            if (lbZoomLevel) lbZoomLevel.textContent = Math.round(zoomScale * 100) + '%';
            // Update cursor
            if (lbViewport) lbViewport.style.cursor = zoomScale > 1 ? 'grab' : 'default';
        }

        function clampPan() {
            if (!lbViewport || !lbMedia) return;
            var vw = lbViewport.clientWidth;
            var vh = lbViewport.clientHeight;
            // When fully zoomed out, no panning allowed
            if (zoomScale <= 1) { panX = 0; panY = 0; return; }
            var contentW = vw * zoomScale;
            var contentH = vh * zoomScale;
            var maxX = Math.max(0, (contentW - vw) / 2);
            var maxY = Math.max(0, (contentH - vh) / 2);
            panX = Math.max(-maxX, Math.min(maxX, panX));
            panY = Math.max(-maxY, Math.min(maxY, panY));
        }

        function resetZoom(animated) {
            zoomScale = 1; panX = 0; panY = 0;
            applyTransform(animated);
        }

        function zoomTo(newScale, originX, originY, animated) {
            // originX/Y are in viewport coordinates (relative to center)
            var prevScale = zoomScale;
            zoomScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
            // Adjust pan so zoom feels anchored at cursor position
            if (originX !== undefined && originY !== undefined) {
                var scaleDelta = zoomScale / prevScale;
                panX = originX + (panX - originX) * scaleDelta;
                panY = originY + (panY - originY) * scaleDelta;
            }
            clampPan();
            applyTransform(animated);
        }

        function updateLb() {
            if(lbMedia) lbMedia.style.opacity = '0';
            resetZoom(false);
            setTimeout(function() {
                var src = images[lbIndex];
                if(src && src.match(/\.(mp4|mov|avi|webm|ogg)$/i)) {
                    if(lbMedia) lbMedia.innerHTML = '<video src="' + src + '" autoplay loop controls style="max-width:85vw; max-height:85vh; border-radius:8px; box-shadow: 0 4px 30px rgba(0,0,0,0.7); object-fit:contain; display:block;"></video>';
                } else {
                    if(lbMedia) lbMedia.innerHTML = '<img src="' + src + '" style="max-width:85vw; max-height:85vh; border-radius:8px; box-shadow: 0 4px 30px rgba(0,0,0,0.7); object-fit:contain; display:block; user-select:none; -webkit-user-drag:none;" draggable="false">';
                }
                if(lbMedia) lbMedia.style.opacity = '1';
                if(lbCounter) lbCounter.textContent = (lbIndex + 1) + ' / ' + images.length;
            }, 180);
            if(lbPrev) lbPrev.style.display = images.length > 1 ? 'flex' : 'none';
            if(lbNext) lbNext.style.display = images.length > 1 ? 'flex' : 'none';
        }

        mainContainer.style.cursor = 'zoom-in';
        mainContainer.addEventListener('click', function(e) {
            if(e.target.tagName.toLowerCase() === 'video' && e.offsetY >= e.target.clientHeight - 40) return;
            var activeThumb = document.querySelector('.product-thumbnail.active');
            if(activeThumb) lbIndex = images.indexOf(activeThumb.dataset.src);
            else lbIndex = 0;
            if(lbIndex < 0) lbIndex = 0;
            updateLb();
            lb.style.display = 'flex';
        });

        // Close
        if(lbClose) lbClose.addEventListener('click', function() {
            lb.style.display = 'none';
            if(lbMedia) lbMedia.innerHTML = '';
            resetZoom(false);
        });

        lb.addEventListener('click', function(e) {
            if(e.target === lb) {
                lb.style.display = 'none';
                if(lbMedia) lbMedia.innerHTML = '';
                resetZoom(false);
            }
        });

        // Prev/Next
        if(lbPrev) lbPrev.addEventListener('click', function(e) {
            e.stopPropagation();
            lbIndex = (lbIndex - 1 + images.length) % images.length;
            updateLb();
        });
        if(lbNext) lbNext.addEventListener('click', function(e) {
            e.stopPropagation();
            lbIndex = (lbIndex + 1) % images.length;
            updateLb();
        });

        // Zoom buttons
        if(lbZoomIn) lbZoomIn.addEventListener('click', function(e) {
            e.stopPropagation();
            zoomTo(zoomScale + ZOOM_STEP, 0, 0, true);
        });
        if(lbZoomOut) lbZoomOut.addEventListener('click', function(e) {
            e.stopPropagation();
            zoomTo(zoomScale - ZOOM_STEP, 0, 0, true);
        });
        if(lbZoomReset) lbZoomReset.addEventListener('click', function(e) {
            e.stopPropagation();
            resetZoom(true);
        });

        // Scroll wheel zoom (anchored at cursor)
        if(lbViewport) lbViewport.addEventListener('wheel', function(e) {
            e.preventDefault();
            // Get cursor position relative to viewport center
            var rect = lbViewport.getBoundingClientRect();
            var cx = e.clientX - rect.left - rect.width / 2;
            var cy = e.clientY - rect.top - rect.height / 2;
            var delta = e.deltaY < 0 ? ZOOM_STEP * 0.6 : -ZOOM_STEP * 0.6;
            zoomTo(zoomScale + delta, cx, cy, false);
        }, { passive: false });

        // Double-click to reset zoom
        if(lbViewport) lbViewport.addEventListener('dblclick', function(e) {
            if (e.target === lbPrev || e.target === lbNext || e.target === lbClose) return;
            if (zoomScale > 1) {
                resetZoom(true);
            } else {
                // Double-click to zoom in 2x centered on cursor
                var rect = lbViewport.getBoundingClientRect();
                var cx = e.clientX - rect.left - rect.width / 2;
                var cy = e.clientY - rect.top - rect.height / 2;
                zoomTo(2, cx, cy, true);
            }
        });

        // Drag/pan (mouse)
        var isDragging = false;
        var dragStartX, dragStartY, panStartX, panStartY;
        if(lbViewport) {
            lbViewport.addEventListener('mousedown', function(e) {
                if (zoomScale <= 1) return;
                if (e.button !== 0) return;
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                panStartX = panX;
                panStartY = panY;
                lbViewport.style.cursor = 'grabbing';
                e.preventDefault();
            });
            window.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                panX = panStartX + (e.clientX - dragStartX);
                panY = panStartY + (e.clientY - dragStartY);
                clampPan();
                applyTransform(false);
            });
            window.addEventListener('mouseup', function() {
                if (!isDragging) return;
                isDragging = false;
                lbViewport.style.cursor = zoomScale > 1 ? 'grab' : 'default';
            });
        }

        // Touch: pinch-to-zoom + pan
        var touches = {};
        var pinchStartDist = 0;
        var pinchStartScale = 1;
        var touchPanStartX = 0, touchPanStartY = 0;
        var touchPanPX = 0, touchPanPY = 0;

        if(lbViewport) {
            lbViewport.addEventListener('touchstart', function(e) {
                Array.from(e.changedTouches).forEach(function(t) { touches[t.identifier] = t; });
                var ids = Object.keys(touches);
                if (ids.length === 2) {
                    var t1 = touches[ids[0]], t2 = touches[ids[1]];
                    pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                    pinchStartScale = zoomScale;
                } else if (ids.length === 1) {
                    var t = touches[ids[0]];
                    touchPanStartX = t.clientX;
                    touchPanStartY = t.clientY;
                    touchPanPX = panX;
                    touchPanPY = panY;
                }
                e.preventDefault();
            }, { passive: false });

            lbViewport.addEventListener('touchmove', function(e) {
                Array.from(e.changedTouches).forEach(function(t) { touches[t.identifier] = t; });
                var ids = Object.keys(touches);
                if (ids.length === 2) {
                    var t1 = touches[ids[0]], t2 = touches[ids[1]];
                    var dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                    var newScale = pinchStartScale * (dist / pinchStartDist);
                    zoomTo(newScale, 0, 0, false);
                } else if (ids.length === 1 && zoomScale > 1) {
                    var t = touches[ids[0]];
                    panX = touchPanPX + (t.clientX - touchPanStartX);
                    panY = touchPanPY + (t.clientY - touchPanStartY);
                    clampPan();
                    applyTransform(false);
                }
                e.preventDefault();
            }, { passive: false });

            lbViewport.addEventListener('touchend', function(e) {
                Array.from(e.changedTouches).forEach(function(t) { delete touches[t.identifier]; });
            });
        }

        // Keyboard: arrow keys to navigate, Escape to close, +/- to zoom
        document.addEventListener('keydown', function(e) {
            if (lb.style.display === 'none') return;
            if (e.key === 'Escape') {
                lb.style.display = 'none';
                if(lbMedia) lbMedia.innerHTML = '';
                resetZoom(false);
            } else if (e.key === 'ArrowLeft') {
                lbIndex = (lbIndex - 1 + images.length) % images.length;
                updateLb();
            } else if (e.key === 'ArrowRight') {
                lbIndex = (lbIndex + 1) % images.length;
                updateLb();
            } else if (e.key === '+' || e.key === '=') {
                zoomTo(zoomScale + ZOOM_STEP, 0, 0, true);
            } else if (e.key === '-') {
                zoomTo(zoomScale - ZOOM_STEP, 0, 0, true);
            } else if (e.key === '0') {
                resetZoom(true);
            }
        });
    }
  }

  // -- Tabs --
  function initTabs() {
    var tabBtns = document.querySelectorAll('.tab-nav__btn');
    var tabPanels = document.querySelectorAll('.tab-panel');
    if (!tabBtns.length) return;

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.dataset.tab;

        tabBtns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach(function (p) { p.classList.remove('active'); });

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        var panel = document.getElementById('tab-' + target);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // -- Quantity control --
  function initQuantity() {
    var input = document.getElementById('qty-input');
    var minus = document.getElementById('qty-minus');
    var plus = document.getElementById('qty-plus');
    if (!input) return;

    minus.addEventListener('click', function () {
      var val = parseInt(input.value, 10) || 1;
      if (val > 1) input.value = val - 1;
    });

    plus.addEventListener('click', function () {
      var val = parseInt(input.value, 10) || 1;
      if (val < 99) input.value = val + 1;
    });

    input.addEventListener('change', function () {
      var val = parseInt(input.value, 10);
      if (isNaN(val) || val < 1) input.value = 1;
      if (val > 99) input.value = 99;
    });
  }

  // -- Add to cart (real CartAPI) --
  function initAddToCart(product) {
    var cartBtn = document.getElementById('btn-add-cart');
    var buyNowBtn = document.getElementById('btn-buy-now');
    var variantBtns = document.querySelectorAll('.btn-variant');
    
    var currentPrice = product.basePrice || (product.variants && product.variants.length ? product.variants[0].price : 0);
    var currentSize = product.variants && product.variants.length ? product.variants[0].size : null;

    if (variantBtns.length > 0) {
        variantBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                variantBtns.forEach(function(b) { 
                    b.classList.remove('active'); 
                    b.style.background = '#fff'; 
                    b.style.color = '#333'; 
                });
                btn.classList.add('active');
                btn.style.background = '#3B2612';
                btn.style.color = '#fff';
                currentPrice = parseFloat(btn.dataset.price);
                currentSize = btn.dataset.size;
                var priceEl = document.getElementById('detail-price');
                if (priceEl) priceEl.textContent = window.formatVND(currentPrice);
            });
        });
    }

    if (cartBtn) {
      cartBtn.addEventListener('click', function (e) {
        var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
        var itemToAdd = { id: product.id, slug: product.slug, name: product.name, price: currentPrice, size: currentSize, images: product.images };
        if (window.CartAPI) {
          window.CartAPI.addItem(itemToAdd, qty, e);
        } else {
          window.showToast('Đã thêm "' + product.name + '" vào giỏ hàng!', 'success');
        }
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', function () {
        var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
        var itemToAdd = { id: product.id, slug: product.slug, name: product.name, price: currentPrice, size: currentSize, images: product.images };
        if (window.CartAPI) {
          window.CartAPI.addItem(itemToAdd, qty);
        }
        window.location.href = 'cart.html';
      });
    }
  }

  // ====================================================
  // INIT
  // ====================================================
  document.addEventListener('DOMContentLoaded', function () {
    // Product LIST page
    if (document.getElementById('product-list-grid')) {
      // Init sort-select custom dropdown immediately (has static options)
      var sortWrap = document.getElementById('sort-select');
      if (sortWrap) {
        initCustomSelects(sortWrap.parentNode);
      }
      populateFilters(); // filter selects init after API data loads
      bindFilters();
      loadProducts();
    }

    // Product DETAIL page
    if (document.getElementById('product-detail-container')) {
      initProductDetail();
    }
  });

})();

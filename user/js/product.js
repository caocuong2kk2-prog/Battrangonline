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
    sort: 'newest',
    page: 1,
    limit: 8,
    total: 0,
  };

  // -- Populate filter selects from API --
  function populateFilters() {
    var catSel = document.getElementById('filter-category');
    var qualSel = document.getElementById('filter-quality');
    var sizeSel = document.getElementById('filter-size');

    if (catSel) {
      PhucGiaTienAPI.getCategories().then(function (cats) {
        cats.forEach(function (c) {
          var opt = new Option(c.name, c.id);
          catSel.appendChild(opt);
        });
      });
    }

    if (qualSel) {
      PhucGiaTienAPI.getQualities().then(function (quals) {
        quals.forEach(function (q) {
          var opt = new Option(q.name, q.id);
          qualSel.appendChild(opt);
        });
      });
    }

    if (sizeSel) {
      PhucGiaTienAPI.getSizes().then(function (sizes) {
        sizes.forEach(function (s) {
          var opt = new Option(s.name, s.id);
          sizeSel.appendChild(opt);
        });
      });
    }
  }

  // -- Load & render product list --
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
      page: state.page,
      limit: state.limit,
    }).then(function (res) {
      state.total = res.total;
      grid.innerHTML = '';

      if (!res.data.length) {
        grid.innerHTML =
          '<p style="text-align:center;color:var(--color-text-muted);padding:3rem 0">Không có sản phẩm phù hợp.</p>';
        return;
      }

      res.data.forEach(function (p, i) {
        var card = buildProductCard(p, i);
        grid.appendChild(card);
      });

      if (countEl) {
        countEl.textContent = 'Hiển thị ' + res.data.length + '/' + res.total + ' sản phẩm';
      }

      renderPagination(paginationEl, state.page, Math.ceil(state.total / state.limit));

      // Re-trigger scroll reveal for newly injected cards
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

    var badgeHTML = p.badge
      ? '<span class="product-card__badge">' + p.badge + '</span>'
      : '';

    var imgSrc = (p.images && p.images[0]) ? p.images[0] : 'assets/images/placeholder.jpg';

    // Stars: dùng rating từ data hoặc ngẫu nhiên 4-5 sao
    var rating = p.rating || (4 + Math.floor(Math.random() * 2));
    var starsHTML = '';
    for (var j = 1; j <= 5; j++) {
      starsHTML += '<span class="product-card__star' +
        (j > rating ? ' product-card__star--empty' : '') + '">&#9733;</span>';
    }

    var pSafe = JSON.stringify({
      id: p.id, slug: p.slug, name: p.name, price: p.price, images: p.images
    }).replace(/'/g, '&#39;');

    article.innerHTML =
      '<div class="product-card__media">' +
        badgeHTML +
        '<img class="product-card__img" src="' + imgSrc + '" alt="' + p.name + '" loading="lazy">' +
        '<div class="product-card__action">' +
          '<div class="product-card__action-row">' +
            '<button class="product-card__btn-cart" data-product=\'' + pSafe + '\'>' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
                '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
              '</svg>' +
              'Thêm giỏ hàng' +
            '</button>' +
            '<button class="product-card__btn-detail" title="Xem chi tiết" data-slug="' + p.slug + '">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="product-card__body">' +
        '<div class="product-card__stars">' + starsHTML + '</div>' +
        '<h3 class="product-card__name">' + p.name + '</h3>' +
        '<div class="product-card__price-row">' +
          '<span class="product-card__price">' + window.formatVND(p.price) + '</span>' +
          '<span class="product-card__tag">Thủ công</span>' +
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
      'filter-quality': 'quality',
      'filter-size': 'size',
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

    PhucGiaTienAPI.getProduct(slug).then(function (product) {
      renderProductDetail(container, product);
      document.title = product.name + ' – Phúc Gia Tiên';
      initGallery();
      initTabs();
      initQuantity();
      initAddToCart(product);
    }).catch(function () {
      container.innerHTML =
        '<p style="text-align:center;padding:4rem 0;color:var(--color-text-muted)">Không tìm thấy sản phẩm.</p>';
    });
  }

  function renderProductDetail(container, p) {
    var imgSrc = (p.images && p.images[0]) ? p.images[0] : 'assets/images/placeholder.jpg';

    var thumbnailsHTML = (p
      .images || []).map(function (src, i) {
        return '<button class="product-thumbnail' + (i === 0 ? ' active' : '') + '" data-src="' + src + '" aria-label="Ảnh ' + (i + 1) + '">' +
          '<img src="' + src + '" alt="' + p.name + ' ảnh ' + (i + 1) + '" loading="lazy">' +
          '</button>';
      }).join('');

    var specsHTML =
      '<div class="product-spec-row"><span class="product-spec-row__key">Kiểu thợ: </span><span class="product-spec-row__val">' + (p.material || '—') + '</span></div>' +
      '<div class="product-spec-row"><span class="product-spec-row__key">Chất liệu: </span><span class="product-spec-row__val">' + (p.material || '—') + '</span></div>' +
      '<div class="product-spec-row"><span class="product-spec-row__key">Kỹ thuật: </span><span class="product-spec-row__val">' + (p.style || '—') + '</span></div>' +
      '<div class="product-spec-row"><span class="product-spec-row__key">Màu sắc: </span><span class="product-spec-row__val">' + (p.color || '—') + '</span></div>' +
      '<div class="product-spec-row"><span class="product-spec-row__key">Tình trạng: </span><span class="product-spec-row__val">' + (p.status || 'Còn hàng') + '</span></div>' +
      '<div class="product-spec-row"><span class="product-spec-row__key">Mô tả sản phẩm: </span></div><div class="product-spec-row"><span class="product-spec-row__val">' + (p.desc || 'Sản phẩm đạt chát lượng cao') + '</span></div>';

    container.innerHTML =
      '<div class="product-detail-grid">' +
      '<div class="product-gallery">' +
      '<div class="product-gallery__main" id="gallery-main">' +
      '<img class="product-gallery__main-img" id="gallery-main-img" src="' + imgSrc + '" alt="' + p.name + '">' +
      '</div>' +
      '<div class="product-thumbnails" id="gallery-thumbnails">' + thumbnailsHTML + '</div>' +
      '</div>' +
      '<div class="product-info">' +
      '<h1 class="product-info__name">' + p.name + '</h1>' +
      '<p class="product-info__price">' + window.formatVND(p.price) + '</p>' +
      '<div class="product-specs">' + specsHTML + '</div>' +
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
      '</div>' +
      '</div>' + // end product-info
      '</div>' + // end product-detail-grid
      '<div class="guarantee-badges-full">' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon">✔</span><span>Cam kết chất lượng<br><small>100% gốm sứ thủ công</small></span></div>' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon">🔄</span><span>Đổi trả miễn phí<br><small>Trong 7 ngày</small></span></div>' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon">🚚</span><span>Giao hàng toàn quốc<br><small>Ship COD tận nơi</small></span></div>' +
      '</div>' +
      '<div class="product-tabs">' +
      '<nav class="tab-nav" role="tablist">' +
      '<button class="tab-nav__btn active" role="tab" data-tab="mo-ta" id="tab-btn-mo-ta" aria-selected="true">Mô Tả Chi Tiết</button>' +
      '<button class="tab-nav__btn" role="tab" data-tab="che-tac" id="tab-btn-che-tac" aria-selected="false">Quy Trình Chế Tác</button>' +
      '<button class="tab-nav__btn" role="tab" data-tab="danh-gia" id="tab-btn-danh-gia" aria-selected="false">Đánh Giá (0)</button>' +
      '</nav>' +
      '<div id="tab-mo-ta" class="tab-panel active" role="tabpanel" aria-labelledby="tab-btn-mo-ta">' +
      '<div class="tab-content-text"><p>' + (p.description || '') + '</p></div>' +
      '</div>' +
      '<div id="tab-che-tac" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-che-tac">' +
      '<div class="tab-content-text"><p>Mỗi sản phẩm được tạo ra qua 5 công đoạn thủ công: chuẩn bị đất → tạo hình → vẽ lót → tráng men → nung ở 1.200°C trong lò truyền thống...</p></div>' +
      '</div>' +
      '<div id="tab-danh-gia" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-danh-gia">' +
      '<div class="tab-content-text"><p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p></div>' +
      '</div>' +
      '</div>';
  }

  // -- Gallery switcher --
  function initGallery() {
    var mainImg = document.getElementById('gallery-main-img');
    var thumbs = document.querySelectorAll('.product-thumbnail');
    if (!mainImg || !thumbs.length) return;

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        thumbs.forEach(function (t) { t.classList.remove('active'); });
        thumb.classList.add('active');
        mainImg.style.opacity = '0';
        setTimeout(function () {
          mainImg.src = thumb.dataset.src;
          mainImg.style.opacity = '1';
          mainImg.style.transition = 'opacity 0.3s ease';
        }, 150);
      });
    });
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

    if (cartBtn) {
      cartBtn.addEventListener('click', function (e) {
        var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
        if (window.CartAPI) {
          window.CartAPI.addItem(product, qty, e);
        } else {
          window.showToast('Đã thêm "' + product.name + '" vào giỏ hàng!', 'success');
        }
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', function () {
        var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
        if (window.CartAPI) {
          window.CartAPI.addItem(product, qty);
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
      populateFilters();
      bindFilters();
      loadProducts();
    }

    // Product DETAIL page
    if (document.getElementById('product-detail-container')) {
      initProductDetail();
    }
  });

})();

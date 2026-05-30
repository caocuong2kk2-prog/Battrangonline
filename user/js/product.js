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
    status: 'all',
    minPrice: 0,
    maxPrice: 50000000,
    isPriceFiltered: false,
    sort: 'newest',
    page: 1,
    limit: 8,
    total: 0,
  };

  // -- Helper: set active pill in a container --
  function setActivePill(container, value) {
    if (!container) return;
    var pills = container.querySelectorAll('.filter-pill');
    pills.forEach(function (pill) {
      var isActive = pill.dataset.value === String(value);
      pill.classList.toggle('active', isActive);
      pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  // -- Populate category pill buttons from API --
  function populateFilters() {
    var catPills = document.getElementById('category-pills');

    PhucGiaTienAPI.getFilters().then(function (filters) {
      if (catPills) {
        catPills.innerHTML = '';

        // One pill per category
        filters.categories.forEach(function (c) {
          var btn = document.createElement('button');
          var isActive = (c.id === 'all');
          btn.className = 'filter-pill' + (isActive ? ' active' : '');
          btn.dataset.value = String(c.id);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          btn.innerHTML = c.name + ' <span class="cat-count"></span>';
          catPills.appendChild(btn);
        });

        // Compute counts asynchronously
        PhucGiaTienAPI.getProducts({ limit: 2000 }).then(function(res) {
          var counts = { 'all': res.data.length };
          res.data.forEach(function(p) {
            counts[p.category] = (counts[p.category] || 0) + 1;
          });
          var btns = catPills.querySelectorAll('.filter-pill');
          btns.forEach(function(btn) {
            var val = btn.dataset.value;
            var cnt = counts[val] || 0;
            var span = btn.querySelector('.cat-count');
            if (span && val !== 'all' && cnt > 0) {
              span.textContent = '(' + cnt + ')';
            }
          });
        });
      }

      // Populate Advanced Filters (Size & Quality)
      var sizePills = document.getElementById('size-pills');
      if (sizePills && filters.sizes) {
        sizePills.innerHTML = '';
        filters.sizes.forEach(function (s) {
          var btn = document.createElement('button');
          var isActive = (s.id === 'all');
          btn.className = 'filter-pill' + (isActive ? ' active' : '');
          btn.dataset.value = String(s.id);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          btn.textContent = s.name;
          sizePills.appendChild(btn);
        });
        var qualityContainer = document.getElementById('quality-checkboxes');
      if (qualityContainer) {
        qualityContainer.innerHTML = '';
        filters.qualities.forEach(function (q) {
          var label = document.createElement('label');
          label.className = 'custom-checkbox';
          label.innerHTML = '<input type="checkbox" value="' + q.id + '"' + (state.quality.indexOf(q.id) > -1 ? ' checked' : '') + '><span class="checkmark"></span>' + q.name;
          qualityContainer.appendChild(label);
        });

        // Add event listener for quality checkboxes
        qualityContainer.addEventListener('change', function(e) {
          if (e.target.type === 'checkbox') {
            var checkedBoxes = qualityContainer.querySelectorAll('input:checked');
            var selectedVals = [];
            checkedBoxes.forEach(function(cb) { selectedVals.push(cb.value); });
            state.quality = selectedVals.length ? selectedVals.join(',') : 'all';
            state.page = 1;
            loadProducts();
          }
        });
      }
      }

      // Only init custom select for the sort dropdown
      initCustomSelects();
    }).catch(function (e) {
      console.error('Error loading filters', e);
      // Fallback: still show "Tất cả" pill
      if (catPills && !catPills.querySelector('.filter-pill')) {
        var fallbackBtn = document.createElement('button');
        fallbackBtn.className = 'filter-pill active';
        fallbackBtn.dataset.value = 'all';
        fallbackBtn.setAttribute('aria-pressed', 'true');
        fallbackBtn.textContent = 'Tất cả';
        catPills.appendChild(fallbackBtn);
      }
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
  function matchesPrice(product) {
    if (!state.isPriceFiltered) return true;
    var price = product.basePrice || (product.variants && product.variants.length ? product.variants[0].price : 0);
    return price >= state.minPrice && price <= state.maxPrice;
  }

  function matchesStatus(product) {
    if (state.status === 'all') return true;
    if (state.status === 'in-stock') return product.status !== 'inactive';
    if (state.status === 'out-of-stock') return product.status === 'inactive';
    return true;
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
      page: 1, // Fetch all when doing client-side price filtering
      limit: 1000,
    }).then(function (res) {
      // Client-side price & status filter
      var filtered = res.data.filter(function(p) {
        return matchesPrice(p) && matchesStatus(p);
      });

      state.total = filtered.length;
      grid.innerHTML = '';

      // Update count
      if (countEl) {
        countEl.textContent = 'Hiển thị ' + filtered.length + ' sản phẩm';
      }
      
      // Update apply button in sidebar
      var applyBtn = document.getElementById('btn-apply-filters');
      if (applyBtn) {
        applyBtn.textContent = 'Áp dụng (' + filtered.length + ' sản phẩm)';
      }

      // Update active tags UI
      updateActiveFiltersUI();

      if (!filtered.length) {
        grid.innerHTML =
          '<p style="text-align:center;color:var(--color-text-muted);padding:3rem 0">Không có sản phẩm phù hợp.</p>';
        return;
      }

      // Pagination on filtered result
      var totalPages = Math.ceil(filtered.length / state.limit);
      var start = (state.page - 1) * state.limit;
      var pageData = filtered.slice(start, start + state.limit);

      pageData.forEach(function (p, i) {
        var card = buildProductCard(p, i);
        grid.appendChild(card);
      });

      if (countEl) {
        countEl.textContent = 'Hiển thị ' + pageData.length + '/' + filtered.length + ' sản phẩm';
      }

      renderPagination(paginationEl, state.page, totalPages);

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

    var allImages = (p.images || []).concat((p.variants || []).reduce(function(acc, v) { return acc.concat(v.images || []); }, []));
    var firstMedia = (allImages.length > 0) ? allImages[0] : 'assets/images/placeholder.jpg';
    var isLocalVid = !!firstMedia.match(/\.(mp4|mov|avi|webm|ogg)$/i);
    var isPlatformVid = firstMedia.includes('youtube.com') || firstMedia.includes('youtu.be') || 
                        firstMedia.includes('tiktok.com') || 
                        firstMedia.includes('facebook.com') || firstMedia.includes('fb.watch');

    var imgSrc = 'assets/images/placeholder.jpg';
    if (firstMedia && !isLocalVid && !isPlatformVid) {
      imgSrc = firstMedia;
    } else if (allImages.length > 0) {
      var foundImg = allImages.find(function(img) {
        var isLocV = !!img.match(/\.(mp4|mov|avi|webm|ogg)$/i);
        var isPlatV = img.includes('youtube.com') || img.includes('youtu.be') || 
                      img.includes('tiktok.com') || 
                      img.includes('facebook.com') || img.includes('fb.watch');
        return !isLocV && !isPlatV;
      });
      if (foundImg) {
        imgSrc = foundImg;
      } else if (isPlatformVid) {
        var ytMatch = firstMedia.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
        var ytId = (ytMatch && ytMatch[1]) ? ytMatch[1] : '';
        if (ytId) {
          imgSrc = 'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg';
        } else if (firstMedia.includes('tiktok.com')) {
          imgSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23000"/><text x="50%" y="50%" fill="%23fff" font-size="40" font-family="sans-serif" text-anchor="middle" dy=".3em">TikTok Video</text></svg>';
        } else if (firstMedia.includes('facebook.com') || firstMedia.includes('fb.watch')) {
          imgSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%231877f2"/><text x="50%" y="50%" fill="%23fff" font-size="40" font-family="sans-serif" text-anchor="middle" dy=".3em">Facebook Video</text></svg>';
        }
      }
    }

    // Stars: dùng rating từ data hoặc ngẫu nhiên 4-5 sao
    var rating = p.rating || (4 + Math.floor(Math.random() * 2));
    var starsHTML = '';
    for (var j = 1; j <= 5; j++) {
      starsHTML += '<span class="product-card__star' +
        (j > rating ? ' product-card__star--empty' : '') + '">&#9733;</span>';
    }

    var pSafe = JSON.stringify({
      id: p.id, slug: p.slug, name: p.name, price: p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0), images: allImages
    }).replace(/'/g, '&#39;');

    article.innerHTML =
      '<div class="product-card__media">' +
        badgeHTML +
        (isLocalVid 
          ? '<video class="product-card__img" src="' + firstMedia + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>'
          : '<img class="product-card__img" src="' + imgSrc + '" alt="' + p.name + '" loading="lazy">') +
        '<div class="product-card__action">' +
          '<div class="product-card__action-row">' +
            (p.status === 'inactive'
              ? '<button class="product-card__btn-cart" disabled style="background:#f5f5f5;color:#999;border-color:#e0e0e0;cursor:not-allowed;">Tạm hết hàng</button>'
              : ((p.basePrice === 0 || (p.variants && p.variants.length && p.variants[0].price === 0))
                  ? '<button class="product-card__btn-cart" style="background:#d32f2f;color:#fff;border-color:#d32f2f;" onclick="window.location.href=\'contact.html\'; event.stopPropagation();">LIÊN HỆ</button>'
                  : '<button class="product-card__btn-cart" data-product=\'' + pSafe + '\'>' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                      '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
                      '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
                    '</svg>' +
                    'Thêm giỏ hàng' +
                    '</button>'
                )
            ) +
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
          ((p.basePrice === 0 || (p.variants && p.variants.length && p.variants[0].price === 0))
            ? '<a href="contact.html" class="price-contact" style="text-decoration:none;" onclick="event.stopPropagation();">LIÊN HỆ</a>'
            : '<span class="product-card__price">' + window.formatVND(p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0)) + '</span>'
          ) +
        '</div>' +
        '<button class="product-card__btn-cta">Xem Chi Tiết</button>' +
      '</div>';

    // Bind event for Add to Cart
    var cartBtn = article.querySelector('.product-card__btn-cart');
    if (cartBtn) {
      cartBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!window.CartAPI) return;
        
        // If product has multiple variants, redirect to detail page for selection
        if (p.variants && p.variants.length > 1) {
          window.location.href = 'product-detail.html?slug=' + p.slug;
          return;
        }
        
        // Single variant or no variants — add directly with full variant info
        var v = (p.variants && p.variants.length === 1) ? p.variants[0] : null;
        var price = v ? v.price : (p.basePrice || 0);
        var sizeParts = [];
        if (v) {
          if (v.sizeName || v.size) sizeParts.push(v.sizeName || v.size);
          if (v.patternName) sizeParts.push(v.patternName);
          if (v.colorName) sizeParts.push(v.colorName);
          if (v.productTypeName) sizeParts.push(v.productTypeName);
          if (v.materialName) sizeParts.push(v.materialName);
        }
        var sizeStr = sizeParts.join(' · ') || null;
        var images = (v && v.images && v.images.length > 0) ? v.images : allImages;
        
        window.CartAPI.addItem({
          id: p.id, slug: p.slug, name: p.name,
          price: price, size: sizeStr, images: images
        }, 1, e);
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

    var ctaBtn = article.querySelector('.product-card__btn-cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function (e) {
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

  function updateActiveFiltersUI() {
    var container = document.getElementById('active-filters-container');
    var tagsList = document.getElementById('active-tags-list');
    var badge = document.getElementById('advanced-filter-badge');
    
    var sidebarContainer = document.getElementById('sidebar-active-tags-container');
    var sidebarTagsList = document.getElementById('sidebar-active-tags-list');
    
    if (!container || !tagsList) return;
    
    tagsList.innerHTML = '';
    if (sidebarTagsList) sidebarTagsList.innerHTML = '';
    
    var activeCount = 0;

    // Helper to create tag
    function createTag(label, type, value) {
      var tagHTML = label + ' <span class="active-tag-close" data-type="'+type+'" data-value="'+value+'">&times;</span>';
      
      var tag = document.createElement('div');
      tag.className = 'active-tag';
      tag.innerHTML = tagHTML;
      tagsList.appendChild(tag);
      
      if (sidebarTagsList) {
        var sidebarTag = document.createElement('div');
        sidebarTag.className = 'active-tag';
        sidebarTag.innerHTML = tagHTML;
        sidebarTagsList.appendChild(sidebarTag);
      }
      
      activeCount++;
    }

    // Price tag
    if (state.isPriceFiltered) {
      createTag(window.formatVND(state.minPrice) + ' - ' + (state.maxPrice >= 50000000 ? window.formatVND(state.maxPrice)+'+' : window.formatVND(state.maxPrice)), 'price', 'all');
    }

    // Size tag
    if (state.size !== 'all') {
      var sizeBtn = document.querySelector('#size-pills .filter-pill[data-value="'+state.size+'"]');
      if (sizeBtn) createTag(sizeBtn.textContent, 'size', 'all');
    }

    // Quality tag (can be multiple)
    if (state.quality !== 'all') {
      var qs = state.quality.split(',');
      qs.forEach(function(q) {
        var cb = document.querySelector('#quality-checkboxes input[value="'+q+'"]');
        if (cb && cb.nextElementSibling && cb.nextElementSibling.nextSibling) {
          createTag(cb.nextElementSibling.nextSibling.textContent, 'quality', q);
        }
      });
    }

    // Status tag
    if (state.status !== 'all') {
      var statusBtn = document.querySelector('#status-pills .filter-pill[data-value="'+state.status+'"]');
      if (statusBtn) createTag(statusBtn.textContent, 'status', 'all');
    }

    // Show/Hide container
    if (activeCount > 0) {
      container.style.display = 'flex';
      if (sidebarContainer) sidebarContainer.style.display = 'block';
      if (badge) {
        badge.style.display = 'inline-flex';
        badge.textContent = activeCount;
      }
    } else {
      container.style.display = 'none';
      if (sidebarContainer) sidebarContainer.style.display = 'none';
      if (badge) badge.style.display = 'none';
    }
  }

  // Bind active tag removal
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('active-tag-close')) {
      var type = e.target.dataset.type;
      var value = e.target.dataset.value;
      
      if (type === 'price') {
        state.isPriceFiltered = false;
        state.minPrice = 0; state.maxPrice = 50000000;
        if (window.priceSlider) window.priceSlider.set([0, 50000000]);
      } else if (type === 'size') {
        state.size = 'all';
        setActivePill(document.getElementById('size-pills'), 'all');
      } else if (type === 'status') {
        state.status = 'all';
        setActivePill(document.getElementById('status-pills'), 'all');
      } else if (type === 'quality') {
        var qs = state.quality.split(',').filter(function(q) { return q !== value; });
        state.quality = qs.length ? qs.join(',') : 'all';
        var cb = document.querySelector('#quality-checkboxes input[value="'+value+'"]');
        if (cb) cb.checked = false;
      }
      
      state.page = 1;
      loadProducts();
    }
    
    // Clear all
    if (e.target.id === 'btn-clear-all-filters') {
      var resetBtn = document.getElementById('btn-reset-filters');
      if (resetBtn) resetBtn.click();
    }
  });

  // -- Handle UI events --
  function bindFilters() {
    // Category pills
    var catPills = document.getElementById('category-pills');
    if (catPills) {
      catPills.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        state.category = pill.dataset.value;
        state.page = 1;
        setActivePill(catPills, pill.dataset.value);
        loadProducts();
      });
    }

    // Price pills
    var pricePills = document.getElementById('price-pills');
    if (pricePills) {
      pricePills.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        var val = pill.dataset.value;
        setActivePill(pricePills, val);
        
        state.isPriceFiltered = true;
        if (val === 'all') {
          state.isPriceFiltered = false;
          state.minPrice = 0; state.maxPrice = 50000000;
        } else if (val === 'under2') {
          state.minPrice = 0; state.maxPrice = 2000000;
        } else if (val === '2to7') {
          state.minPrice = 2000000; state.maxPrice = 7000000;
        } else if (val === '7to15') {
          state.minPrice = 7000000; state.maxPrice = 15000000;
        } else if (val === 'above15') {
          state.minPrice = 15000000; state.maxPrice = 50000000;
        }

        // Sync slider
        if (window.priceSlider) {
          window.priceSlider.set([state.minPrice, state.maxPrice]);
        }

        state.page = 1;
        loadProducts();
      });
    }

    // Status pills
    var statusPills = document.getElementById('status-pills');
    if (statusPills) {
      statusPills.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        state.status = pill.dataset.value;
        state.page = 1;
        setActivePill(statusPills, pill.dataset.value);
        loadProducts();
      });
    }

    // Advanced Filters handling
    var sizePills = document.getElementById('size-pills');
    if (sizePills) {
      sizePills.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        state.size = pill.dataset.value;
        state.page = 1;
        setActivePill(sizePills, pill.dataset.value);
        loadProducts();
      });
    }

    // Apply & Reset Filters
    var btnApply = document.getElementById('btn-apply-filters');
    var btnReset = document.getElementById('btn-reset-filters');
    var overlay = document.getElementById('advanced-filter-overlay');
    var sidebar = document.getElementById('advanced-filter-sidebar');
    
    function closeSidebar() {
      if(overlay) overlay.classList.remove('is-active');
      if(sidebar) sidebar.classList.remove('is-active');
    }

    if (btnApply) {
      btnApply.addEventListener('click', function () {
        state.page = 1;
        loadProducts();
        closeSidebar();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', function () {
        state.size = 'all';
        state.quality = 'all';
        state.status = 'all';
        state.isPriceFiltered = false;
        setActivePill(sizePills, 'all');
        var qualityCheckboxes = document.querySelectorAll('#quality-checkboxes input[type="checkbox"]');
        qualityCheckboxes.forEach(function(cb) { cb.checked = false; });
        var statusPills = document.getElementById('status-pills');
        if (statusPills) setActivePill(statusPills, 'all');
        if (pricePills) setActivePill(pricePills, 'all');
        if (window.priceSlider) {
          window.priceSlider.set([0, 50000000]);
        }
        state.page = 1;
        loadProducts();
        closeSidebar();
      });
    }

    // Sort dropdown (keep as select/custom-select)
    var sortEl = document.getElementById('sort-select');
    if (sortEl) {
      sortEl.addEventListener('change', function () {
        state.sort = sortEl.value;
        state.page = 1;
        loadProducts();
      });
    }
  }

  // ====================================================
  // PRODUCT DETAIL PAGE  (product-detail.html)
  // ====================================================

  // Helpers for external video links (YouTube, TikTok, Facebook)
  function getPlatform(url) {
    if (!url) return 'unknown';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    return 'other';
  }

  function toEmbedUrl(url) {
    if (!url) return '';
    var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];

    if (url.includes('tiktok.com')) {
      var tkMatch = url.match(/video\/(\d+)/);
      if (tkMatch) return 'https://www.tiktok.com/player/v1/' + tkMatch[1] + '?&music_info=0&description=0';
    }

    if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(url) + '&show_text=false';
    }
    return '';
  }

  function getAutoThumbnail(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*$/;
      var match = url.match(regExp);
      var ytId = (match && match[2] && match[2].length === 11) ? match[2] : '';
      if (ytId) return 'https://img.youtube.com/vi/' + ytId + '/maxresdefault.jpg';
    }
    return null; // null = no static thumbnail available, will load async
  }

  // Build a beautiful platform-branded placeholder badge for a thumbnail
  function buildPlatformBadge(platform) {
    var configs = {
      youtube: {
        bg: 'linear-gradient(135deg,#ff0000 0%,#cc0000 100%)',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>',
        label: 'YouTube'
      },
      tiktok: {
        bg: 'linear-gradient(135deg,#010101 0%,#1a1a2e 100%)',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.81a8.18 8.18 0 0 0 4.78 1.52V6.88a4.85 4.85 0 0 1-1.01-.19z"/></svg>',
        label: 'TikTok'
      },
      facebook: {
        bg: 'linear-gradient(135deg,#1877f2 0%,#0d5db8 100%)',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
        label: 'Facebook'
      }
    };
    var cfg = configs[platform] || { bg: '#555', icon: '&#9654;', label: 'Video' };
    return '<div style="width:100%;height:100%;background:' + cfg.bg + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-sizing:border-box;">' +
             '<div style="opacity:0.95">' + cfg.icon + '</div>' +
             '<span style="color:#fff;font-size:8px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;opacity:0.9;">' + cfg.label + '</span>' +
           '</div>';
  }

  function renderMediaHtml(src, isLightbox) {
    if (!src) src = 'assets/images/placeholder.jpg';
    var isLocalVid = !!src.match(/\.(mp4|mov|avi|webm|ogg)$/i);
    var platform = getPlatform(src);
    var isExternalVid = platform !== 'other' && platform !== 'unknown';

    if (isLocalVid) {
      if (isLightbox) {
        return '<video src="' + src + '" autoplay loop controls style="max-width:85vw; max-height:85vh; border-radius:8px; box-shadow: 0 4px 30px rgba(0,0,0,0.7); object-fit:contain; display:block;"></video>';
      } else {
        return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;" data-is-video="1">' +
                 '<video class="product-gallery__main-img" id="gallery-main-media" src="' + src + '" autoplay loop muted playsinline controls style="width:100%;height:100%;object-fit:contain;border:none;"></video>' +
               '</div>';
      }
    }

    if (isExternalVid) {
      var embedUrl = toEmbedUrl(src);
      if (!embedUrl) {
        if (isLightbox) {
          return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:80vw;height:80vh;max-width:85vw;max-height:85vh;background:#111;color:#fff;border-radius:8px;box-shadow:0 4px 30px rgba(0,0,0,0.7);text-align:center;padding:20px;gap:20px;box-sizing:border-box;">' +
                   '<span style="font-size:64px;">&#9654;&#65039;</span>' +
                   '<a href="' + src + '" target="_blank" rel="noopener" style="color:#C8922A;font-size:20px;font-weight:700;text-decoration:underline;letter-spacing:0.02em;">Xem video thực tế trên ' + (platform === 'youtube' ? 'YouTube' : platform === 'tiktok' ? 'TikTok' : 'Facebook') + ' ↗</a>' +
                 '</div>';
        } else {
          return '<div class="gallery-iframe-wrap" id="gallery-main-media" data-is-video="1" style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:#111;color:#fff;text-align:center;padding:20px;gap:15px;box-sizing:border-box;">' +
                   '<span style="font-size:48px;">&#9654;&#65039;</span>' +
                   '<a href="' + src + '" target="_blank" rel="noopener" style="color:#C8922A;font-size:16px;font-weight:700;text-decoration:underline;">Xem video thực tế trên ' + (platform === 'youtube' ? 'YouTube' : platform === 'tiktok' ? 'TikTok' : 'Facebook') + ' ↗</a>' +
                 '</div>';
        }
      }

      var iframeAllow = '';
      var finalEmbedUrl = embedUrl;
      if (platform === 'youtube') {
        iframeAllow = 'allow="autoplay;fullscreen" allowfullscreen loading="lazy"';
      } else if (platform === 'tiktok') {
        iframeAllow = 'allow="fullscreen" allowfullscreen loading="lazy"';
      } else if (platform === 'facebook') {
        finalEmbedUrl = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(src) +
          '&show_text=false&width=560&height=315';
        iframeAllow = 'scrolling="no" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen';
      }

      if (isLightbox) {
        return '<iframe src="' + finalEmbedUrl + '" style="width:80vw;height:80vh;max-width:85vw;max-height:85vh;border:none;border-radius:8px;box-shadow:0 4px 30px rgba(0,0,0,0.7);display:block;" ' + iframeAllow + '></iframe>';
      } else {
        return '<div class="gallery-iframe-wrap" id="gallery-main-media" data-is-video="1">' +
                 '<iframe src="' + finalEmbedUrl + '" ' + iframeAllow + '></iframe>' +
               '</div>';
      }
    }

    if (isLightbox) {
      return '<img src="' + src + '" style="max-width:85vw; max-height:85vh; border-radius:8px; box-shadow: 0 4px 30px rgba(0,0,0,0.7); object-fit:contain; display:block; user-select:none; -webkit-user-drag:none;" draggable="false">';
    } else {
      return '<img class="product-gallery__main-img" id="gallery-main-media" src="' + src + '" alt="Product Image" style="width:100%;height:100%;object-fit:contain;">';
    }
  }

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
      var shortStoreName = (window.PGT_CONFIG && window.PGT_CONFIG.storeName) ? window.PGT_CONFIG.storeName.split('–')[0].split('-')[0].trim() : 'Phúc Gia Tiên';
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
    window.currentProductData = p;

    var totalStock = p.totalStock || (p.variants && p.variants.length > 0 ? p.variants.reduce(function(a,b){return a+(b.stock||0)},0) : 0);
    var statusText = (p.status === 'active' && totalStock > 0) ? '<span class="status-badge active">Còn hàng (' + totalStock + ' sản phẩm)</span>' : (p.status === 'inactive' || totalStock <= 0 ? '<span class="status-badge inactive">Hết hàng</span>' : '<span class="status-badge active">' + (p.status || 'Còn hàng') + '</span>');
    var rawDesc = p.description || p.desc || '';
    var textOnlyDesc = rawDesc.replace(/<[^>]+>/g, '').trim();
    var shortDesc = p.shortDescription || textOnlyDesc;
    if (!p.shortDescription && shortDesc.length > 120) {
      shortDesc = shortDesc.substring(0, 120) + '...';
    }

    var specsTableHTML = '<div style="background:#f9f9f9; padding:20px; border-radius:8px; margin-bottom:24px;">' +
      '<table style="width:100%; border-collapse:collapse; font-size:15px; color:#333;"><tbody>' +
      '<tr id="row-spec-size" style="display:none; border-bottom:1px solid #eee;"><td style="padding:10px 0; color:#666; width:120px;">Kích thước</td><td style="padding:10px 0; font-weight:500;" id="spec-size"></td></tr>' +
      '<tr id="row-spec-type" style="display:none; border-bottom:1px solid #eee;"><td style="padding:10px 0; color:#666;">Phân khúc</td><td style="padding:10px 0; font-weight:500;" id="spec-type"></td></tr>' +
      '<tr id="row-spec-material" style="display:none; border-bottom:1px solid #eee;"><td style="padding:10px 0; color:#666;">Chất liệu</td><td style="padding:10px 0; font-weight:500;" id="spec-material"></td></tr>' +
      '<tr id="row-spec-color" style="display:none; border-bottom:1px solid #eee;"><td style="padding:10px 0; color:#666;">Màu sắc</td><td style="padding:10px 0; font-weight:500;" id="spec-color"></td></tr>' +
      '<tr id="row-spec-glaze" style="display:none; border-bottom:1px solid #eee;"><td style="padding:10px 0; color:#666;">Dòng men</td><td style="padding:10px 0; font-weight:500;" id="spec-glaze"></td></tr>' +
      '<tr id="row-spec-pattern" style="display:none; border-bottom:1px solid #eee;"><td style="padding:10px 0; color:#666;">Hoa văn</td><td style="padding:10px 0; font-weight:500;" id="spec-pattern"></td></tr>';
      
    if (p.usage) specsTableHTML += '<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0; color:#666;">Công dụng</td><td style="padding:10px 0; font-weight:500;">' + p.usage + '</td></tr>';
    specsTableHTML += '</tbody></table></div>';

    var detailPriceHTML = '<p class="product-info__price" id="detail-price"></p>';
    var shortDescHTML = shortDesc ? '<div style="color:#555; font-size:15px; line-height:1.6; margin-bottom:16px;">' + shortDesc + '</div>' : '';

    var actionsHTML = '';
    if (p.status === 'inactive') {
      actionsHTML = 
        '<div class="product-actions" style="margin-top:24px;">' +
        '<button class="btn" disabled style="background:#f5f5f5;color:#999;border:1px solid #e0e0e0;cursor:not-allowed;width:100%;justify-content:center;">TẠM HẾT HÀNG</button>' +
        '</div>';
    } else {
      var variantSelectorHtml = '';
      if (p.variants && p.variants.length > 0) {
          var attrs = [
            { key: 'patternName', label: 'Hoa văn' },
            { key: 'productTypeName', label: 'Phân khúc' },
            { key: 'colorName', label: 'Màu sắc' },
            { key: 'sizeName', fallback: 'size', label: 'Kích thước' }
          ];
          
          attrs.forEach(function(attr) {
             var uniqueVals = [];
             p.variants.forEach(function(v) {
                 var val = v[attr.key] || (attr.fallback ? v[attr.fallback] : null);
                 if (val && uniqueVals.indexOf(val) === -1) {
                     uniqueVals.push(val);
                 }
             });
             if (uniqueVals.length > 0) {
                 variantSelectorHtml += '<div class="product-variants">' +
                    '<label class="product-variants__label" style="display:block; margin-bottom:8px; font-weight:600;">' + attr.label + ':</label>' +
                    '<div class="variant-options attr-group" data-group="' + attr.key + '">' +
                    uniqueVals.map(function(val) {
                        var thumbnailHtml = '';
                        if (attr.key === 'patternName') {
                            var firstVariantWithImage = p.variants.find(function(v) { return v[attr.key] === val && v.images && v.images.length > 0; });
                            if (firstVariantWithImage && firstVariantWithImage.images[0]) {
                                var imgUrl = firstVariantWithImage.images[0];
                                thumbnailHtml = '<img src="' + imgUrl + '" style="width:32px;height:32px;object-fit:cover;border-radius:4px;margin-right:8px;border:1px solid #eee;" alt="' + val + '">';
                            }
                        }
                        var styleOverride = thumbnailHtml ? 'display:inline-flex; align-items:center; padding:4px 16px 4px 6px; gap:4px;' : '';
                        return '<button class="btn-variant-attr btn-variant" ' + (styleOverride ? 'style="' + styleOverride + '"' : '') + ' data-val="' + val.replace(/"/g, '&quot;') + '">' + thumbnailHtml + '<span>' + val + '</span></button>';
                    }).join('') +
                    '</div></div>';
             }
          });
          
          if (variantSelectorHtml === '') {
             variantSelectorHtml = '<div class="product-variants">' +
                '<label class="product-variants__label" style="display:block; margin-bottom:8px; font-weight:600;">Chọn phiên bản:</label>' +
                '<div class="variant-options attr-group" data-group="fallback">' +
                p.variants.map(function(v, i) {
                    var sName = 'Phiên bản ' + (i+1);
                    return '<button class="btn-variant-attr btn-variant" data-vid="' + v.id + '">' + sName + '</button>';
                }).join('') +
                '</div></div>';
          }
      } else {
          // If no variants, just show default price
          var basePriceVal = p.basePrice || 0;
          detailPriceHTML = basePriceVal === 0 
            ? '<a href="contact.html" class="product-info__price" id="detail-price" style="color:#d32f2f; text-transform:uppercase; text-decoration:none; display:block;">LIÊN HỆ</a>'
            : '<p class="product-info__price" id="detail-price">' + window.formatVND(basePriceVal) + '</p>';
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
    }

    container.innerHTML =
      '<div class="product-detail-grid">' +
      '<div class="product-gallery">' +
      '<div class="product-gallery__main" id="gallery-main"></div>' +
      '<div class="product-gallery-thumbs-wrap" style="position:relative; display:flex; align-items:center;">' +
      '<button id="thumb-nav-prev" style="display:none; position:absolute; left:-14px; z-index:2; width:28px; height:28px; border-radius:50%; border:1px solid #ddd; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.1); cursor:pointer; align-items:center; justify-content:center; color:#333; font-weight:bold;">&lt;</button>' +
      '<div class="product-thumbnails" id="gallery-thumbnails"></div>' +
      '<button id="thumb-nav-next" style="display:none; position:absolute; right:-14px; z-index:2; width:28px; height:28px; border-radius:50%; border:1px solid #ddd; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.1); cursor:pointer; align-items:center; justify-content:center; color:#333; font-weight:bold;">&gt;</button>' +
      '</div>' +
      '</div>' +
      '<div class="product-info">' +
      '<h1 class="product-info__name" id="detail-product-name" style="margin-bottom:8px; transition: all 0.3s ease;">' + p.name + '</h1>' +
      '<div style="color:#666; font-size:14px; margin-bottom:12px;">Mã SP: <strong style="color:#222; font-size:15px; background:#f4f4f4; padding:2px 6px; border-radius:4px;">SP' + String(p.id).padStart(4, '0') + '</strong><span style="margin:0 12px;color:#ccc;">|</span>Tình trạng: <span id="spec-status">' + statusText + '</span></div>' +
      detailPriceHTML +
      shortDescHTML +
      actionsHTML +
      '</div>' + // end product-info
      '</div>' + // end product-detail-grid
      '<div class="guarantee-badges-full">' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg></span><span><strong>Cam k&#7871;t ch&#7845;t l&#432;&#7907;ng</strong><small>100% g&#7889;m s&#7913; th&#7911; c&#244;ng B&#225;t Tr&#224;ng</small></span></div>' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></span><span><strong>&#272;&#7893;i tr&#7843; mi&#7877;n ph&#237;</strong><small>Trong v&#242;ng 7 ng&#224;y n&#7871;u l&#7895;i</small></span></div>' +
      '<div class="guarantee-badge"><span class="guarantee-badge__icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></span><span><strong>Giao to&#224;n qu&#7889;c</strong><small>Ship COD &middot; 3-5 ng&#224;y l&#224;m vi&#7879;c</small></span></div>' +
      '</div>' +
      '<div class="product-description-section" style="padding-top:var(--space-2);">' +
      '<h2 style="font-family:var(--font-heading); color:#3B2612; font-size:var(--fs-2xl); margin-bottom:var(--space-2); font-weight:var(--fw-semibold);">Thông số & Mô Tả Chi Tiết</h2>' +
      specsTableHTML +
      '<div class="tab-content-text" style="color:#333;">' + (p.description || '') + '</div>' +
      '</div>';
      
    // Render initial variant logic (or default)
    if (window.updateVariantDisplay) {
      window.updateVariantDisplay(null, p);
    }

    // Post-rendering: Asynchronously fetch real video thumbnails for YouTube, TikTok & Facebook
    var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5080' ? 'http://localhost:5080/api' : '/api';
    var API_BASE = (window.PhucGiaTienAPI && window.PhucGiaTienAPI.apiBase) || dynamicBase;

    function extractFbVideoId(fbUrl) {
      var patterns = [
        /[?&]v=(\d+)/,
        /\/videos?\/(\d+)/,
        /\/reel\/(\d+)/,
        /story_fbid=(\d+)/,
        /\/(\d{10,})/
      ];
      for (var i = 0; i < patterns.length; i++) {
        var match = fbUrl.match(patterns[i]);
        if (match) return match[1];
      }
      return null;
    }

    function replaceBadgeWithImage(thumbEl, imageUrl, platformName) {
      if (!imageUrl) return;
      var playColor = platformName === 'youtube' ? '#ff0000' : (platformName === 'facebook' ? '#1877f2' : '#010101');
      var img = new Image();
      img.onload = function () {
        thumbEl.innerHTML =
          '<img src="' + imageUrl + '" alt="video preview" style="width:100%;height:100%;object-fit:cover;">' +
          '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;z-index:2;">' +
            '<div style="width:28px;height:28px;background:' + playColor + ';border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>' +
            '</div>' +
          '</div>';
      };
      img.src = imageUrl;
    }

    var extThumbs = container.querySelectorAll('.product-thumbnail[data-type="iframe"]');
    extThumbs.forEach(function (thumb) {
      var src = thumb.dataset.src;
      var platform = getPlatform(src);

      if (platform === 'youtube') {
        var img = thumb.querySelector('img');
        if (img) {
          img.addEventListener('error', function () {
            var ytId = src.match(/(?:youtu\.be\/|v=|shorts\/)([A-Za-z0-9_-]{11})/);
            if (ytId) img.src = 'https://img.youtube.com/vi/' + ytId[1] + '/hqdefault.jpg';
          }, { once: true });
        }
      } else if (platform === 'tiktok') {
        var proxyUrl = API_BASE + '/upload/video-thumbnail?url=' + encodeURIComponent(src);
        fetch(proxyUrl)
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data && data.url) {
              replaceBadgeWithImage(thumb, data.url, 'tiktok');
            } else {
              fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(src))
                .then(function (res) { return res.json(); })
                .then(function (oembed) {
                  if (oembed && oembed.thumbnail_url) {
                    replaceBadgeWithImage(thumb, oembed.thumbnail_url, 'tiktok');
                  }
                }).catch(function() {});
            }
          })
          .catch(function () {
            fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(src))
              .then(function (res) { return res.json(); })
              .then(function (oembed) {
                if (oembed && oembed.thumbnail_url) {
                  replaceBadgeWithImage(thumb, oembed.thumbnail_url, 'tiktok');
                }
              }).catch(function() {});
          });
      } else if (platform === 'facebook') {
        // Facebook uses iframe thumbnail directly now, no async fetch needed
      }
    });
  }

   // Toggle gallery-main aspect ratio based on whether current media is video
  function updateGalleryAspect(mainContainer) {
    var mediaEl = document.getElementById('gallery-main-media');
    if (!mediaEl && mainContainer.firstElementChild) {
      mediaEl = mainContainer.firstElementChild;
    }

    // Reset inline styles
    mainContainer.style.aspectRatio = '';
    mainContainer.style.width = '';
    mainContainer.style.maxWidth = '';
    mainContainer.style.margin = '';
    mainContainer.classList.remove('product-gallery__main--video');

    if (mediaEl) {
      var isVideo = mediaEl.dataset.isVideo === '1' || mediaEl.tagName === 'VIDEO' || mediaEl.tagName === 'IFRAME';
      if (!isVideo) {
        isVideo = !!mediaEl.querySelector('iframe, video');
      }

      if (isVideo) {
        var src = '';
        var iframe = mediaEl.tagName === 'IFRAME' ? mediaEl : mediaEl.querySelector('iframe');
        var video = mediaEl.tagName === 'VIDEO' ? mediaEl : mediaEl.querySelector('video');
        if (iframe) src = iframe.src;
        else if (video) src = video.src;

        var platform = getPlatform(src);
        if (platform === 'tiktok') {
          // TikTok is vertical (9:16)
          mainContainer.style.aspectRatio = '9 / 16';
          mainContainer.style.width = '100%';
          mainContainer.style.maxWidth = '360px'; // Keep portrait video layout neat and compact
          mainContainer.style.margin = '0 auto';
        } else {
          // YouTube, Facebook, and normal videos are landscape (16:9)
          mainContainer.style.aspectRatio = '16 / 9';
          mainContainer.style.width = '100%';
        }
      } else {
        // Images are square (1:1)
        mainContainer.style.aspectRatio = '1';
        mainContainer.style.width = '';
      }
    }
  }

  // -- Gallery switcher --
  function initGallery() {
    var mainContainer = document.getElementById('gallery-main');
    var thumbs = document.querySelectorAll('.product-thumbnail');
    if (!mainContainer) return;

    var images = Array.from(thumbs).map(function(t) { return t.dataset.src; });

    // Set initial aspect ratio based on first media type
    updateGalleryAspect(mainContainer);

    var thumbContainer = document.getElementById('gallery-thumbnails');
    var thumbPrev = document.getElementById('thumb-nav-prev');
    var thumbNext = document.getElementById('thumb-nav-next');

    function updateNavArrows() {
        if (!thumbPrev || !thumbNext || images.length <= 4) return;
        var activeThumb = document.querySelector('.product-thumbnail.active');
        if (!activeThumb && thumbs.length > 0) activeThumb = thumbs[0];
        var thumbsArr = Array.from(thumbs);
        var currentIndex = thumbsArr.indexOf(activeThumb);
        
        thumbPrev.style.display = currentIndex > 0 ? 'flex' : 'none';
        thumbNext.style.display = currentIndex < thumbsArr.length - 1 ? 'flex' : 'none';
    }

    if (thumbs.length > 0) {
        thumbs.forEach(function (thumb) {
          thumb.addEventListener('click', function () {
            thumbs.forEach(function (t) { t.classList.remove('active'); });
            thumb.classList.add('active');

            var src = thumb.dataset.src;
            var mediaEl = document.getElementById('gallery-main-media');
            
            // Only fade out if the current media is not a video/iframe to prevent rendering freezes
            var isCurrentVideo = mediaEl && (mediaEl.dataset.isVideo === '1' || mediaEl.tagName === 'VIDEO' || mediaEl.tagName === 'IFRAME' || mediaEl.querySelector('iframe, video'));
            if (mediaEl && !isCurrentVideo) {
              mediaEl.style.opacity = '0';
            }

            setTimeout(function() {
              mainContainer.innerHTML = renderMediaHtml(src, false);
              // Update aspect ratio class for video vs image
              updateGalleryAspect(mainContainer);
              
              var newMedia = document.getElementById('gallery-main-media');
              if (newMedia) {
                var isNewVideo = newMedia.dataset.isVideo === '1' || newMedia.tagName === 'VIDEO' || newMedia.tagName === 'IFRAME' || newMedia.querySelector('iframe, video');
                if (isNewVideo) {
                  // Videos show immediately to avoid iframe painting issues
                  newMedia.style.opacity = '1';
                } else {
                  // Images fade in smoothly
                  newMedia.style.opacity = '0';
                  void newMedia.offsetWidth; // reflow
                  newMedia.style.transition = 'opacity 0.3s ease';
                  newMedia.style.opacity = '1';
                }
              }
              updateNavArrows();
            }, 150);
          });
        });
    }

    if (thumbContainer) {
        updateNavArrows();
        
        function switchMainImage(direction) {
            var activeThumb = document.querySelector('.product-thumbnail.active');
            if (!activeThumb && thumbs.length > 0) activeThumb = thumbs[0];
            if (!activeThumb) return;
            
            var thumbsArr = Array.from(thumbs);
            var currentIndex = thumbsArr.indexOf(activeThumb);
            var newIndex = currentIndex + direction;
            
            if (newIndex < 0) return;
            if (newIndex >= thumbsArr.length) return;
            
            var nextThumb = thumbsArr[newIndex];
            nextThumb.click(); // Triggers the existing click handler (sets active class, updates main image)
            
            // Scroll thumbnail container so the new active thumb is visible
            var scrollPos = nextThumb.offsetLeft - thumbContainer.offsetWidth / 2 + nextThumb.offsetWidth / 2;
            thumbContainer.scrollTo({ left: scrollPos, behavior: 'smooth' });
        }

        if (thumbPrev) {
            thumbPrev.addEventListener('click', function() {
                switchMainImage(-1);
            });
        }
        if (thumbNext) {
            thumbNext.addEventListener('click', function() {
                switchMainImage(1);
            });
        }

        thumbContainer.addEventListener('wheel', function(e) {
            // Horizontal scroll with mouse wheel
            if (e.deltaY !== 0) {
                e.preventDefault();
                thumbContainer.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    // --- Wheel Magnifier (Desktop) ---
    var inlineZoomScale = 1;
    var inlinePanX = 0;
    var inlinePanY = 0;
    var isInlineDragging = false;
    var inlineDragStartX, inlineDragStartY, inlinePanStartX, inlinePanStartY;

    mainContainer.addEventListener('wheel', function(e) {
      if (window.innerWidth < 1024) return;
      var media = mainContainer.querySelector('img#gallery-main-media');
      if (!media) return;
      
      // Allow normal scroll if zooming out at scale 1
      if (e.deltaY > 0 && inlineZoomScale <= 1) return;
      
      e.preventDefault();
      
      var rect = mainContainer.getBoundingClientRect();
      var cx = e.clientX - rect.left - rect.width / 2;
      var cy = e.clientY - rect.top - rect.height / 2;
      
      var prevScale = inlineZoomScale;
      var zoomStep = 0.4;
      var newScale = e.deltaY < 0 ? inlineZoomScale + zoomStep : inlineZoomScale - zoomStep;
      inlineZoomScale = Math.max(1, Math.min(newScale, 4));
      
      var scaleDelta = inlineZoomScale / prevScale;
      inlinePanX = cx + (inlinePanX - cx) * scaleDelta;
      inlinePanY = cy + (inlinePanY - cy) * scaleDelta;
      
      if (inlineZoomScale <= 1) {
        inlinePanX = 0; inlinePanY = 0;
      } else {
        var maxX = Math.max(0, (rect.width * inlineZoomScale - rect.width) / 2);
        var maxY = Math.max(0, (rect.height * inlineZoomScale - rect.height) / 2);
        inlinePanX = Math.max(-maxX, Math.min(maxX, inlinePanX));
        inlinePanY = Math.max(-maxY, Math.min(maxY, inlinePanY));
      }
      
      media.style.transformOrigin = 'center center';
      media.style.transform = 'translate(' + inlinePanX + 'px, ' + inlinePanY + 'px) scale(' + inlineZoomScale + ')';
    }, { passive: false });

    mainContainer.addEventListener('mousedown', function(e) {
      if (window.innerWidth < 1024 || inlineZoomScale <= 1 || e.button !== 0) return;
      var media = mainContainer.querySelector('img#gallery-main-media');
      if (!media) return;
      
      isInlineDragging = true;
      inlineDragStartX = e.clientX;
      inlineDragStartY = e.clientY;
      inlinePanStartX = inlinePanX;
      inlinePanStartY = inlinePanY;
      mainContainer.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', function(e) {
      if (!isInlineDragging) return;
      var media = mainContainer.querySelector('img#gallery-main-media');
      if (!media) return;
      
      var dx = e.clientX - inlineDragStartX;
      var dy = e.clientY - inlineDragStartY;
      inlinePanX = inlinePanStartX + dx;
      inlinePanY = inlinePanStartY + dy;
      
      var rect = mainContainer.getBoundingClientRect();
      var maxX = Math.max(0, (rect.width * inlineZoomScale - rect.width) / 2);
      var maxY = Math.max(0, (rect.height * inlineZoomScale - rect.height) / 2);
      inlinePanX = Math.max(-maxX, Math.min(maxX, inlinePanX));
      inlinePanY = Math.max(-maxY, Math.min(maxY, inlinePanY));
      
      media.style.transform = 'translate(' + inlinePanX + 'px, ' + inlinePanY + 'px) scale(' + inlineZoomScale + ')';
    });

    window.addEventListener('mouseup', function() {
      if (isInlineDragging) {
        isInlineDragging = false;
        mainContainer.style.cursor = inlineZoomScale > 1 ? 'grab' : 'zoom-in';
      }
    });

    mainContainer.addEventListener('mouseleave', function() {
      if (window.innerWidth < 1024 || isInlineDragging) return;
      var media = mainContainer.querySelector('img#gallery-main-media');
      if (media) {
        inlineZoomScale = 1;
        inlinePanX = 0; inlinePanY = 0;
        media.style.transformOrigin = 'center center';
        media.style.transform = 'scale(1)';
        mainContainer.style.cursor = 'zoom-in';
      }
    });

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
        var lbThumbnails = document.getElementById('lbThumbnails');
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
            
            // Build thumbnails HTML
            if (lbThumbnails) {
                lbThumbnails.innerHTML = images.map(function(src, i) {
                    var isVideo = src.match(/\.(mp4|mov|avi|webm|ogg)$/i) || src.includes('youtube.com') || src.includes('youtu.be') || src.includes('tiktok.com') || src.includes('facebook.com');
                    var thumbContent = isVideo ? '<span style="color:#fff;font-size:16px;">▶</span>' : '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">';
                    var borderStyle = (i === lbIndex) ? 'border:2px solid var(--color-accent);' : 'border:2px solid transparent; opacity:0.6;';
                    return '<button class="lb-thumb-btn" data-index="' + i + '" style="width:50px;height:50px;padding:0;background:#000;cursor:pointer;flex-shrink:0;transition:all 0.2s;' + borderStyle + 'border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;">' + thumbContent + '</button>';
                }).join('');
                
                // Add click listeners to thumbs
                var thumbBtns = lbThumbnails.querySelectorAll('.lb-thumb-btn');
                thumbBtns.forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        lbIndex = parseInt(btn.dataset.index, 10);
                        updateLb();
                    });
                });
            }

            setTimeout(function() {
                var src = images[lbIndex];
                if(lbMedia) lbMedia.innerHTML = renderMediaHtml(src, true);
                if(lbMedia) lbMedia.style.opacity = '1';
                if(lbCounter) lbCounter.textContent = (lbIndex + 1) + ' / ' + images.length;
            }, 180);
            if(lbPrev) lbPrev.style.display = images.length > 1 ? 'flex' : 'none';
            if(lbNext) lbNext.style.display = images.length > 1 ? 'flex' : 'none';
        }



        mainContainer.style.cursor = 'zoom-in';
        mainContainer.addEventListener('click', function(e) {
            if (typeof inlineZoomScale !== 'undefined' && inlineZoomScale > 1) return;
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
  window.updateVariantDisplay = function(v, p) {
    if (!p) p = window.currentProductData;
    if (!v && p.variants && p.variants.length > 0) v = p.variants[0];

    // Cập nhật giá
    var currentPrice = v ? v.price : (p.basePrice || 0);
    var priceEl = document.getElementById('detail-price');
    if (priceEl) {
      if (currentPrice === 0) {
        priceEl.textContent = 'LIÊN HỆ';
        priceEl.style.color = '#d32f2f';
        priceEl.style.textTransform = 'uppercase';
        if (priceEl.tagName === 'A') priceEl.href = 'contact.html';
      } else {
        priceEl.textContent = window.formatVND(currentPrice);
        priceEl.style.color = 'var(--color-accent)';
        priceEl.style.textTransform = 'none';
        if (priceEl.tagName === 'A') priceEl.removeAttribute('href');
      }
    }

    // Cập nhật tình trạng tồn kho
    var stock = v ? (v.stock || 0) : (p.totalStock || 0);
    var statusText = '';
    if (p.status === 'inactive' || stock <= 0) {
      statusText = '<span class="status-badge inactive">Hết hàng</span>';
    } else {
      statusText = '<span class="status-badge active">Còn hàng (' + stock + ' sản phẩm)</span>';
    }
    var statusEl = document.getElementById('spec-status');
    if (statusEl) statusEl.innerHTML = statusText;

    // (Moved title update logic to checkMatchingVariant)

    // Cập nhật thông số
    function updateRow(rowId, valId, value) {
      var row = document.getElementById(rowId);
      var val = document.getElementById(valId);
      if (row && val) {
        if (value) {
          val.textContent = value;
          row.style.display = ''; // Hiện
        } else {
          row.style.display = 'none'; // Ẩn
        }
      }
    }

    updateRow('row-spec-size', 'spec-size', v ? (v.sizeName || v.size) : null);
    updateRow('row-spec-type', 'spec-type', v ? v.productTypeName : p.productTypeName);
    updateRow('row-spec-material', 'spec-material', v ? v.materialName : p.materialName);
    updateRow('row-spec-color', 'spec-color', v ? v.colorName : p.colorName);
    updateRow('row-spec-glaze', 'spec-glaze', v ? v.glazeLineName : p.glazeLineName);
    updateRow('row-spec-pattern', 'spec-pattern', v ? v.patternName : p.patternName);

    // Cập nhật ảnh
    var targetImages = (v && v.images && v.images.length > 0) ? v.images : (p.images || []);
    if (targetImages.length === 0) targetImages = ['assets/images/placeholder.jpg'];
    var firstMedia = targetImages[0];

    var mainMediaHtml = renderMediaHtml(firstMedia, false);
    var thumbnailsHTML = targetImages.map(function(src, i) {
        var isLocalVid = !!src.match(/\.(mp4|mov|avi|webm|ogg)$/i);
        var platform = getPlatform(src);
        var isExternalVid = platform !== 'other' && platform !== 'unknown';
        var innerHtml = '';
        var mediaType = 'image';

        if (isLocalVid) {
           innerHtml = '<video src="' + src + '" style="width:100%;height:100%;object-fit:cover;" muted></video>';
           mediaType = 'video';
        } else if (isExternalVid) {
           var staticThumb = getAutoThumbnail(src);
           if (platform === 'youtube' && staticThumb) {
             innerHtml =
               '<img src="' + staticThumb + '" alt="video" style="width:100%;height:100%;object-fit:cover;">' +
               '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;z-index:2;">' +
                 '<div style="width:28px;height:28px;background:#ff0000;border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
                   '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>' +
                 '</div></div>';
           } else if (platform === 'facebook') {
             var fbEmbedUrl = toEmbedUrl(src);
             innerHtml = '<div style="width:100%;height:100%;position:relative;overflow:hidden;pointer-events:none;background:#000;display:flex;align-items:center;justify-content:center;">' +
                           '<iframe src="' + fbEmbedUrl + '&width=250" scrolling="no" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen style="width:250px;height:250px;border:none;pointer-events:none;transform:scale(0.45);transform-origin:center;" tabindex="-1"></iframe>' +
                           '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.2);z-index:10;"></div>' +
                           '<div style="position:absolute;z-index:11;width:28px;height:28px;background:#1877f2;border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
                             '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>' +
                           '</div></div>';
           } else {
             innerHtml = buildPlatformBadge(platform);
           }
           mediaType = 'iframe';
        } else {
           innerHtml = '<img src="' + src + '" alt="ảnh ' + (i + 1) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;">';
           mediaType = 'image';
        }
        return '<button class="product-thumbnail' + (i === 0 ? ' active' : '') + '" data-src="' + src + '" data-type="' + mediaType + '" aria-label="Ảnh ' + (i + 1) + '" style="position:relative;overflow:hidden;">' + innerHtml + '</button>';
    }).join('');

    var mainContainer = document.getElementById('gallery-main');
    var thumbsContainer = document.getElementById('gallery-thumbnails');
    if (mainContainer) mainContainer.innerHTML = mainMediaHtml;
    if (thumbsContainer) {
      thumbsContainer.innerHTML = thumbnailsHTML;
      // Re-init gallery listeners
      if (typeof initGallery === 'function') {
        initGallery();
      }
    }
  };

  function initAddToCart(product) {
    var cartBtn = document.getElementById('btn-add-cart');
    var buyNowBtn = document.getElementById('btn-buy-now');
    var attrBtns = document.querySelectorAll('.btn-variant-attr');
    
    var currentPrice = product.basePrice || (product.variants && product.variants.length ? product.variants[0].price : 0);
    var currentSizeStr = null;
    var currentImages = product.images;
    var currentVariantId = null;

    if (attrBtns.length > 0) {
        // Handle click on any attribute button
        attrBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                if (btn.classList.contains('disabled')) return; // Do not allow clicking disabled

                var group = btn.closest('.attr-group');
                if (group) {
                    var isActive = btn.classList.contains('active');
                    group.querySelectorAll('.btn-variant-attr').forEach(function(b) { b.classList.remove('active'); });
                    if (!isActive) {
                        btn.classList.add('active');
                    }
                }
                checkMatchingVariant();
            });
        });

        // Auto select ONLY if a group has exactly ONE option
        document.querySelectorAll('.attr-group').forEach(function(group) {
            var btns = group.querySelectorAll('.btn-variant-attr');
            if (btns.length === 1) {
                btns[0].classList.add('active');
            }
        });
        
        checkMatchingVariant();
    }

    function checkMatchingVariant() {
        if (!product.variants || product.variants.length === 0) return;
        
        // 1. Get current selection from all groups
        var selected = {};
        document.querySelectorAll('.attr-group').forEach(function(group) {
            var active = group.querySelector('.btn-variant-attr.active');
            if (active) {
                var groupKey = group.dataset.group;
                if (groupKey === 'fallback') {
                    selected.vid = active.dataset.vid;
                } else {
                    selected[groupKey] = active.dataset.val;
                }
            }
        });

        // 2. Update button states (enable/disable based on possible combinations)
        document.querySelectorAll('.attr-group').forEach(function(group) {
            var groupKey = group.dataset.group;
            if (groupKey === 'fallback') return; // Skip fallback logic for matrix

            group.querySelectorAll('.btn-variant-attr').forEach(function(btn) {
                var btnVal = btn.dataset.val;
                
                // Check if there is ANY variant that has this btnVal AND matches all OTHER currently selected groups
                var isValid = product.variants.some(function(v) {
                    // It must match this button's value
                    var vValForGroup = v[groupKey];
                    if (groupKey === 'sizeName' && !vValForGroup) vValForGroup = v['size'];
                    if (vValForGroup != btnVal) return false;
                    
                    // It must have stock
                    if (v.stock <= 0 && v.status !== 'active') return false; // assuming out of stock invalidates it, adapt if pre-order allowed

                    // It must match all OTHER selected groups
                    var matchesOtherSelected = true;
                    for (var otherKey in selected) {
                        if (otherKey !== groupKey && selected[otherKey]) {
                            var vOtherVal = v[otherKey];
                            if (otherKey === 'sizeName' && !vOtherVal) vOtherVal = v['size'];
                            if (vOtherVal != selected[otherKey]) {
                                matchesOtherSelected = false;
                                break;
                            }
                        }
                    }
                    return matchesOtherSelected;
                });

                if (isValid) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.classList.remove('disabled');
                } else {
                    btn.disabled = true;
                    btn.style.opacity = '0.4';
                    btn.style.cursor = 'not-allowed';
                    btn.classList.add('disabled');
                    // If the active button becomes disabled, unselect it
                    if (btn.classList.contains('active')) {
                        btn.classList.remove('active');
                        delete selected[groupKey];
                    }
                }
            });
        });

        // 3. Find exact match for the CURRENT selection to update price/image
        var isFullySelected = true;
        var selectedNames = [];
        document.querySelectorAll('.attr-group').forEach(function(g) {
            var activeBtn = g.querySelector('.btn-variant-attr.active');
            if (!activeBtn) {
                isFullySelected = false;
            } else {
                selectedNames.push(activeBtn.textContent.trim());
            }
        });
        
        // Update product title dynamically based on actual selection
        var titleEl = document.getElementById('detail-product-name');
        if (titleEl) {
            if (selectedNames.length > 0) {
                titleEl.textContent = product.name + ' - ' + selectedNames.join(' - ');
            } else {
                titleEl.textContent = product.name;
            }
        }

        var partialMatch = null;
        if (Object.keys(selected).length > 0) {
            partialMatch = product.variants.find(function(v) {
                if (selected.vid) {
                    return v.id == selected.vid;
                }
                return Object.keys(selected).every(function(key) {
                    var vVal = v[key];
                    if (key === 'sizeName' && !vVal) vVal = v['size'];
                    return vVal == selected[key];
                });
            });
        }
        
        if (partialMatch && window.updateVariantDisplay) {
            window.updateVariantDisplay(partialMatch, product);
        } else if (!partialMatch && Object.keys(selected).length === 0 && window.updateVariantDisplay) {
            window.updateVariantDisplay(null, product);
        }

        var match = isFullySelected ? partialMatch : null;

        if (match) {
            currentPrice = parseFloat(match.price) || 0;
            currentVariantId = match.id;
            
            // Build size string for cart (clean format)
            var sizeParts = [];
            var size = match.sizeName || match.size;
            if (size) sizeParts.push(size);
            if (match.patternName) sizeParts.push(match.patternName);
            if (match.colorName) sizeParts.push(match.colorName);
            if (match.productTypeName) sizeParts.push(match.productTypeName);
            if (match.materialName) sizeParts.push(match.materialName);
            
            currentSizeStr = sizeParts.join(' · ') || null;
            if (!currentSizeStr && selected.vid) currentSizeStr = 'Phiên bản ' + match.id;
            
            currentImages = match.images && match.images.length > 0 ? match.images : product.images;
            
            // Final update for price, stock, and exact images when fully selected
            if (window.updateVariantDisplay) window.updateVariantDisplay(match, product);
            
            if (cartBtn) {
                cartBtn.classList.remove('is-incomplete');
                cartBtn.style.opacity = '1';
                cartBtn.style.cursor = 'pointer';
            }
            if (buyNowBtn) {
                buyNowBtn.classList.remove('is-incomplete');
                buyNowBtn.style.opacity = '1';
                buyNowBtn.style.cursor = 'pointer';
            }
        } else {
            // No match found or not fully selected
            var priceEl = document.getElementById('detail-price');
            if (priceEl) {
                if (!isFullySelected) {
                    var matchingPrices = product.variants.filter(function(v) {
                        return Object.keys(selected).every(function(key) {
                            var vVal = v[key];
                            if (key === 'sizeName' && !vVal) vVal = v['size'];
                            return vVal == selected[key];
                        });
                    }).map(function(v) { return v.price; });
                    
                    if (matchingPrices.length > 0) {
                        var minPrice = Math.min.apply(null, matchingPrices);
                        var maxPrice = Math.max.apply(null, matchingPrices);
                        if (minPrice === maxPrice) {
                            priceEl.textContent = window.formatVND(minPrice);
                        } else {
                            priceEl.textContent = window.formatVND(minPrice) + ' - ' + window.formatVND(maxPrice);
                        }
                    } else {
                        priceEl.textContent = window.formatVND(product.basePrice || 0);
                    }
                    priceEl.style.color = 'var(--color-accent)';
                } else {
                    priceEl.textContent = 'Phân loại không tồn tại';
                    priceEl.style.color = '#999';
                }
            }
            var statusEl = document.getElementById('spec-status');
            if (statusEl) {
                if (!isFullySelected) {
                    statusEl.innerHTML = '<span class="status-badge active">Vui lòng chọn phân loại</span>';
                } else {
                    statusEl.innerHTML = '<span class="status-badge inactive">Không khả dụng</span>';
                }
            }
            
            if (cartBtn) {
                cartBtn.classList.add('is-incomplete');
                cartBtn.style.opacity = '0.5';
                cartBtn.style.cursor = 'not-allowed';
            }
            if (buyNowBtn) {
                buyNowBtn.classList.add('is-incomplete');
                buyNowBtn.style.opacity = '0.5';
                buyNowBtn.style.cursor = 'not-allowed';
            }
        }
    }

    if (cartBtn) {
      cartBtn.addEventListener('click', function (e) {
        if (cartBtn.classList.contains('is-incomplete')) {
            window.showToast('Vui lòng chọn đầy đủ phân loại hàng trước khi thêm vào giỏ', 'warning');
            return;
        }
        var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
        // Include specific variant ID as fallback or size string to differentiate in cart
        var itemToAdd = { id: product.id, slug: product.slug, name: product.name, price: currentPrice, size: currentSizeStr, images: currentImages };
        if (window.CartAPI) {
          window.CartAPI.addItem(itemToAdd, qty, e);
        } else {
          window.showToast('Đã thêm "' + product.name + '" vào giỏ hàng!', 'success');
        }
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', function () {
        if (buyNowBtn.classList.contains('is-incomplete')) {
            window.showToast('Vui lòng chọn đầy đủ phân loại hàng trước khi mua', 'warning');
            return;
        }
        var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
        var itemToAdd = { id: product.id, slug: product.slug, name: product.name, price: currentPrice, size: currentSizeStr, images: currentImages };
        if (window.CartAPI) {
          window.CartAPI.addItem(itemToAdd, qty);
        }
        window.location.href = 'cart.html';
      });
    }

    // Tạo Sticky Add To Cart (Mobile)
    var stickyHtml = document.createElement('div');
    stickyHtml.className = 'sticky-add-to-cart';
    stickyHtml.innerHTML = 
      '<div class="sticky-add-to-cart__info">' +
        '<div class="sticky-add-to-cart__price" id="sticky-price">' + (currentPrice === 0 ? 'LIÊN HỆ' : window.formatVND(currentPrice)) + '</div>' +
      '</div>' +
      '<button class="btn btn-buy-now-solid" id="sticky-btn-buy">' + (currentPrice === 0 ? 'LIÊN HỆ' : 'MUA NGAY') + '</button>';
    document.body.appendChild(stickyHtml);

    document.getElementById('sticky-btn-buy').addEventListener('click', function() {
      if (currentPrice === 0) {
        window.location.href = 'contact.html';
        return;
      }
      var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
      var itemToAdd = { id: product.id, slug: product.slug, name: product.name, price: currentPrice, size: currentSize, images: product.images };
      if (window.CartAPI) {
        window.CartAPI.addItem(itemToAdd, qty, { currentTarget: document.getElementById('btn-add-cart') || document.body });
      }
    });

    // Hiện sticky bar khi cuộn qua nút mua chính
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        stickyHtml.classList.remove('is-visible');
      } else {
        // Chỉ hiện trên mobile
        if (window.innerWidth <= 768) {
          stickyHtml.classList.add('is-visible');
        }
      }
    });
    if (cartBtn || buyNowBtn) {
      observer.observe(cartBtn || buyNowBtn);
    }
  }

  // -- Initialize Advanced Filter Sidebar --
  function initAdvancedFilters() {
    var btnOpen = document.getElementById('btn-open-advanced-filter');
    var btnClose = document.getElementById('btn-close-advanced-filter');
    var overlay = document.getElementById('advanced-filter-overlay');
    var sidebar = document.getElementById('advanced-filter-sidebar');

    function openSidebar() {
      if(overlay) overlay.classList.add('is-active');
      if(sidebar) sidebar.classList.add('is-active');
    }

    function closeSidebar() {
      if(overlay) overlay.classList.remove('is-active');
      if(sidebar) sidebar.classList.remove('is-active');
    }

    if (btnOpen) btnOpen.addEventListener('click', openSidebar);
    if (btnClose) btnClose.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Init noUiSlider
    var sliderEl = document.getElementById('price-slider');
    if (sliderEl && window.noUiSlider) {
      window.priceSlider = window.noUiSlider.create(sliderEl, {
        start: [0, 50000000],
        connect: true,
        step: 500000,
        range: {
          'min': 0,
          'max': 50000000
        }
      });

      var minDisplay = document.getElementById('price-min-display');
      var maxDisplay = document.getElementById('price-max-display');

      sliderEl.noUiSlider.on('update', function (values, handle) {
        var value = parseInt(values[handle]);
        if (handle === 0) {
          state.minPrice = value;
          if (minDisplay) minDisplay.textContent = window.formatVND(value);
        } else {
          state.maxPrice = value;
          if (maxDisplay) maxDisplay.textContent = value >= 50000000 ? window.formatVND(value) + '+' : window.formatVND(value);
        }
        // Only set isPriceFiltered to true if it's not the default range
        if (state.minPrice !== 0 || state.maxPrice !== 50000000) {
          state.isPriceFiltered = true;
        } else {
          state.isPriceFiltered = false;
        }
      });
      
      sliderEl.noUiSlider.on('change', function () {
        state.page = 1;
        loadProducts();
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
      initAdvancedFilters();
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

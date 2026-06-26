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
    material: 'all',
    productType: 'all',
    status: 'all',
    minPrice: 0,
    maxPrice: 50000000,
    isPriceFiltered: false,
    sort: 'newest',
    page: 1,
    limit: 8,
    total: 0,
    searchQuery: '',
  };

  function syncStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    state.category = params.get('category') || params.get('cat') || 'all';
    state.searchQuery = params.get('q') || '';
    state.sort = params.get('sort') || 'newest';
    state.quality = params.get('quality') || 'all';
    state.size = params.get('size') || 'all';
    state.material = params.get('material') || 'all';
    state.productType = params.get('productType') || 'all';
    state.status = params.get('status') || 'all';
    state.minPrice = parseInt(params.get('minPrice'), 10) || 0;
    state.maxPrice = parseInt(params.get('maxPrice'), 10) || 50000000;
    state.page = parseInt(params.get('page'), 10) || 1;

    if (state.minPrice !== 0 || state.maxPrice !== 50000000) {
      state.isPriceFiltered = true;
    } else {
      state.isPriceFiltered = false;
    }
  }

  function updateUrlFromState() {
    var url = new URL(window.location.href);

    if (state.category && state.category !== 'all') {
      url.searchParams.set('category', state.category);
    } else {
      url.searchParams.delete('category');
    }

    if (state.searchQuery) {
      url.searchParams.set('q', state.searchQuery);
    } else {
      url.searchParams.delete('q');
    }

    if (state.sort && state.sort !== 'newest') {
      url.searchParams.set('sort', state.sort);
    } else {
      url.searchParams.delete('sort');
    }

    if (state.quality && state.quality !== 'all') {
      url.searchParams.set('quality', state.quality);
    } else {
      url.searchParams.delete('quality');
    }

    if (state.size && state.size !== 'all') {
      url.searchParams.set('size', state.size);
    } else {
      url.searchParams.delete('size');
    }

    if (state.material && state.material !== 'all') {
      url.searchParams.set('material', state.material);
    } else {
      url.searchParams.delete('material');
    }

    if (state.productType && state.productType !== 'all') {
      url.searchParams.set('productType', state.productType);
    } else {
      url.searchParams.delete('productType');
    }

    if (state.status && state.status !== 'all') {
      url.searchParams.set('status', state.status);
    } else {
      url.searchParams.delete('status');
    }

    if (state.minPrice !== 0 || state.maxPrice !== 50000000) {
      url.searchParams.set('minPrice', state.minPrice);
      url.searchParams.set('maxPrice', state.maxPrice);
    } else {
      url.searchParams.delete('minPrice');
      url.searchParams.delete('maxPrice');
    }

    if (state.page && state.page > 1) {
      url.searchParams.set('page', state.page);
    } else {
      url.searchParams.delete('page');
    }

    url.searchParams.delete('cat');

    if (window.location.search !== url.search) {
      window.history.pushState(null, '', url.pathname + url.search);
    }
  }

  function getFilterUrl(overrides) {
    var url = new URL(window.location.href);
    overrides = overrides || {};
    var cat = overrides.category !== undefined ? overrides.category : state.category;
    var q = overrides.searchQuery !== undefined ? overrides.searchQuery : state.searchQuery;
    var sort = overrides.sort !== undefined ? overrides.sort : state.sort;
    var qual = overrides.quality !== undefined ? overrides.quality : state.quality;
    var sz = overrides.size !== undefined ? overrides.size : state.size;
    var mat = overrides.material !== undefined ? overrides.material : state.material;
    var ptype = overrides.productType !== undefined ? overrides.productType : state.productType;
    var stat = overrides.status !== undefined ? overrides.status : state.status;
    var minP = overrides.minPrice !== undefined ? overrides.minPrice : state.minPrice;
    var maxP = overrides.maxPrice !== undefined ? overrides.maxPrice : state.maxPrice;
    var pg = overrides.page !== undefined ? overrides.page : state.page;

    if (cat && cat !== 'all') url.searchParams.set('category', cat); else url.searchParams.delete('category');
    if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
    if (sort && sort !== 'newest') url.searchParams.set('sort', sort); else url.searchParams.delete('sort');
    if (qual && qual !== 'all') url.searchParams.set('quality', qual); else url.searchParams.delete('quality');
    if (sz && sz !== 'all') url.searchParams.set('size', sz); else url.searchParams.delete('size');
    if (mat && mat !== 'all') url.searchParams.set('material', mat); else url.searchParams.delete('material');
    if (ptype && ptype !== 'all') url.searchParams.set('productType', ptype); else url.searchParams.delete('productType');
    if (stat && stat !== 'all') url.searchParams.set('status', stat); else url.searchParams.delete('status');
    if (minP !== 0 || maxP !== 50000000) {
      url.searchParams.set('minPrice', minP);
      url.searchParams.set('maxPrice', maxP);
    } else {
      url.searchParams.delete('minPrice');
      url.searchParams.delete('maxPrice');
    }
    if (pg && pg > 1) url.searchParams.set('page', pg); else url.searchParams.delete('page');
    url.searchParams.delete('cat');

    return url.pathname + url.search;
  }

  function updateSEOMetadata() {
    var catName = 'Tất cả sản phẩm';
    if (state.category !== 'all') {
      var activePill = document.querySelector('#category-pills .filter-pill.active');
      if (activePill) {
        catName = activePill.childNodes[0].textContent.trim();
      }
    }
    document.title = catName + ' Bát Tràng Cao Cấp – Phúc Gia Tiên';
    
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Khám phá các sản phẩm ' + catName.toLowerCase() + ' thủ công truyền thống Bát Tràng tại Phúc Gia Tiên. Chất lượng cao cấp nung ở 1.200 độ C.');
    }
  }

  // -- Helper: set active link in a container --
  function setActivePill(container, value) {
    if (!container) return;
    var links = container.querySelectorAll('a');
    links.forEach(function (link) {
      var isActive = link.dataset.value === String(value);
      link.classList.toggle('active', isActive);
    });
  }

  // -- Populate category tree from API --
  function populateFilters() {
    var catSidebar = document.getElementById('category-sidebar');

    PhucGiaTienAPI.getFilters().then(function (filters) {
      if (catSidebar) {
        catSidebar.innerHTML = '';

        function createTree(categories, parentEl) {
          var hasActiveChildInTree = false;
          categories.forEach(function (c) {
            var li = document.createElement('li');
            var headerDiv = document.createElement('div');
            headerDiv.className = 'cat-header';

            var a = document.createElement('a');
            a.href = getFilterUrl({ category: c.id, page: 1 });
            var isActive = (String(c.id) === String(state.category));
            if (isActive) {
              a.className = 'active';
              hasActiveChildInTree = true;
            }
            a.dataset.value = String(c.id);
            a.innerHTML = c.name + ' <span class="cat-count"></span>';
            headerDiv.appendChild(a);

            if (c.subCategories && c.subCategories.length > 0) {
              var btn = document.createElement('button');
              btn.className = 'cat-toggle-btn';
              btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
              headerDiv.appendChild(btn);
              li.appendChild(headerDiv);

              var ul = document.createElement('ul');
              var childIsActive = createTree(c.subCategories, ul);
              li.appendChild(ul);

              if (childIsActive || isActive) {
                ul.classList.add('open');
                btn.classList.add('open');
                hasActiveChildInTree = true;
              }

              btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                ul.classList.toggle('open');
                btn.classList.toggle('open');
              });
            } else {
              li.appendChild(headerDiv);
            }
            parentEl.appendChild(li);
          });
          return hasActiveChildInTree;
        }

        createTree(filters.categories, catSidebar);

        // Use counts directly from categories tree
        var links = catSidebar.querySelectorAll('a');
        
        function findCategoryById(categories, id) {
          if (id === 'all') {
            var sum = 0;
            categories.forEach(function(c) {
              if (c.id !== 'all') sum += (c.productCount || 0);
            });
            return { productCount: sum };
          }
          for (var i = 0; i < categories.length; i++) {
            var c = categories[i];
            if (String(c.id) === String(id)) return c;
            if (c.subCategories && c.subCategories.length > 0) {
              var found = findCategoryById(c.subCategories, id);
              if (found) return found;
            }
          }
          return null;
        }

        links.forEach(function(a) {
          var val = a.dataset.value;
          var catObj = findCategoryById(filters.categories, val);
          var cnt = catObj ? (catObj.productCount || 0) : 0;
          var span = a.querySelector('.cat-count');
          if (span && cnt > 0) {
            span.textContent = ' (' + cnt + ')';
          }
        });
      }

      // -- Mobile Accordion for Sidebar --
      var sidebarTitle = document.querySelector('.products-sidebar__title');
      var sidebar = document.querySelector('.products-sidebar');
      if (sidebarTitle && sidebar) {
        // Only run toggle logic if it's not already initialized
        if (!sidebarTitle.hasAttribute('data-toggle-initialized')) {
          sidebarTitle.setAttribute('data-toggle-initialized', 'true');
          sidebarTitle.addEventListener('click', function() {
            if (window.innerWidth <= 900) {
              sidebar.classList.toggle('is-open');
            }
          });
          
          // If a category is selected (not 'all'), auto-open the accordion on load
          if (state.category !== 'all') {
            sidebar.classList.add('is-open');
          }
        }
      }

      // Sync Size Pills
      var sizePills = document.getElementById('size-pills');
      if (sizePills) {
        setActivePill(sizePills, state.size);
      }
        var qualityContainer = document.getElementById('quality-checkboxes');
        if (qualityContainer) {
          qualityContainer.innerHTML = '';
          var selectedQualities = state.quality === 'all' ? [] : state.quality.split(',');
          filters.qualities.forEach(function (q) {
            var label = document.createElement('label');
            label.className = 'custom-checkbox';
            label.innerHTML = '<input type="checkbox" value="' + q.id + '"' + (selectedQualities.indexOf(String(q.id)) > -1 ? ' checked' : '') + '><span class="checkmark"></span>' + q.name;
            qualityContainer.appendChild(label);
          });

          qualityContainer.addEventListener('change', function(e) {
            if (e.target.type === 'checkbox') {
              var checkedBoxes = qualityContainer.querySelectorAll('input:checked');
              var selectedVals = [];
              checkedBoxes.forEach(function(cb) { selectedVals.push(cb.value); });
              state.quality = selectedVals.length ? selectedVals.join(',') : 'all';
              updateApplyButtonCount();
            }
          });
        }

        // Populate Segment/ProductType checkboxes
        var segmentContainer = document.getElementById('segment-checkboxes');
        if (segmentContainer && filters.productTypes) {
          segmentContainer.innerHTML = '';
          var selectedTypes = state.productType === 'all' ? [] : state.productType.split(',');
          filters.productTypes.forEach(function (t) {
            var label = document.createElement('label');
            label.className = 'custom-checkbox';
            label.innerHTML = '<input type="checkbox" value="' + t.id + '"' + (selectedTypes.indexOf(String(t.id)) > -1 ? ' checked' : '') + '><span class="checkmark"></span>' + t.name;
            segmentContainer.appendChild(label);
          });

          // Add event listener for segment checkboxes
          segmentContainer.addEventListener('change', function(e) {
            if (e.target.type === 'checkbox') {
              var checkedBoxes = segmentContainer.querySelectorAll('input:checked');
              var selectedVals = [];
              checkedBoxes.forEach(function(cb) { selectedVals.push(cb.value); });
              state.productType = selectedVals.length ? selectedVals.join(',') : 'all';
              updateApplyButtonCount();
            }
          });
        }

        // Populate Material checkboxes
        var materialContainer = document.getElementById('material-checkboxes');
        if (materialContainer && filters.materials) {
          materialContainer.innerHTML = '';
          var selectedMaterials = state.material === 'all' ? [] : state.material.split(',');
          filters.materials.forEach(function (m) {
            var label = document.createElement('label');
            label.className = 'custom-checkbox';
            label.innerHTML = '<input type="checkbox" value="' + m.id + '"' + (selectedMaterials.indexOf(String(m.id)) > -1 ? ' checked' : '') + '><span class="checkmark"></span>' + m.name;
            materialContainer.appendChild(label);
          });

          materialContainer.addEventListener('change', function(e) {
            if (e.target.type === 'checkbox') {
              var checkedBoxes = materialContainer.querySelectorAll('input:checked');
              var selectedVals = [];
              checkedBoxes.forEach(function(cb) { selectedVals.push(cb.value); });
              state.material = selectedVals.length ? selectedVals.join(',') : 'all';
              updateApplyButtonCount();
            }
          });
        }

      // Only init custom select for the sort dropdown
      initCustomSelects();
      updateSEOMetadata();
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

  function loadProducts(skipPushState) {
    var grid = document.getElementById('product-list-grid');
    var countEl = document.getElementById('product-count');
    var paginationEl = document.getElementById('product-pagination');

    if (!grid) return;

    grid.innerHTML = '<div class="spinner" style="margin:4rem auto;"></div>';

    if (!skipPushState) {
      updateUrlFromState();
    }

    PhucGiaTienAPI.getProducts({
      category: state.category,
      quality: state.quality,
      size: state.size,
      material: state.material,
      productType: state.productType,
      searchQuery: state.searchQuery,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      status: state.status,
      sort: state.sort,
      page: state.page,
      limit: state.limit,
    }).then(function (res) {
      state.total = res.total;
      grid.innerHTML = '';

      // Update count
      if (countEl) {
        countEl.textContent = 'Hiển thị ' + res.data.length + '/' + state.total + ' sản phẩm';
      }
      
      // Update apply button in sidebar
      var applyBtn = document.getElementById('btn-apply-filters');
      if (applyBtn) {
        applyBtn.textContent = 'Áp dụng (' + state.total + ' sản phẩm)';
      }

      // Update active tags UI
      updateActiveFiltersUI();
      updateSEOMetadata();

      if (!res.data || !res.data.length) {
        grid.innerHTML =
          '<p style="text-align:center;color:var(--color-text-muted);padding:3rem 0">Không có sản phẩm phù hợp.</p>';
        return;
      }

      var totalPages = Math.ceil(state.total / state.limit);

      res.data.forEach(function (p, i) {
        var card = buildProductCard(p, i);
        grid.appendChild(card);
      });

      renderPagination(paginationEl, state.page, totalPages);

      if (typeof window.initScrollReveal === 'function') {
        window.initScrollReveal();
      }
    }).catch(function () {
      grid.innerHTML =
        '<p style="text-align:center;color:var(--color-text-muted)">Lỗi tải dữ liệu, vui lòng thử lại.</p>';
    });
  }

  function updateApplyButtonCount() {
    var applyBtn = document.getElementById('btn-apply-filters');
    if (!applyBtn) return;
    
    applyBtn.textContent = 'Đang tính...';

    PhucGiaTienAPI.getProducts({
      category: state.category,
      quality: state.quality,
      size: state.size,
      material: state.material,
      productType: state.productType,
      searchQuery: state.searchQuery,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      status: state.status,
      sort: state.sort,
      page: 1,
      limit: 1, // Only need total count
    }).then(function (res) {
      applyBtn.textContent = 'Áp dụng (' + res.total + ' sản phẩm)';
    }).catch(function() {
      applyBtn.textContent = 'Áp dụng';
    });
  }

  function buildProductCard(p, i) {
    var article = document.createElement('article');
    article.className = 'product-card reveal';
    article.dataset.delay = String(i * 80);

    var ribbonLeftHTML = '';
    if (p.status === 'inactive') {
      ribbonLeftHTML = '<div class="product-card__ribbon product-card__ribbon--out">HẾT HÀNG</div>';
    } else if (p.badge) {
      ribbonLeftHTML = '<div class="product-card__ribbon product-card__ribbon--new">' + p.badge + '</div>';
    }

    var basePrice = p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0);
    var oldPrice = p.baseOriginalPrice || (p.variants && p.variants.length ? p.variants[0].originalPrice : 0);
    
    var ribbonRightHTML = '';
    if (oldPrice && basePrice && oldPrice > basePrice) {
      var percent = Math.round((1 - basePrice / oldPrice) * 100);
      if (percent > 0) {
        ribbonRightHTML = '<div class="product-card__discount">-' + percent + '%</div>';
      }
    }

    var pVariants = Array.isArray(p.variants) ? p.variants : []; var pImages = Array.isArray(p.images) ? p.images : (typeof p.images === "string" && p.images.trim() ? [p.images] : []); var allImages = pImages.concat(pVariants.reduce(function(acc, v) { var vImgs = Array.isArray(v.images) ? v.images : (typeof v.images === "string" && v.images.trim() ? [v.images] : []); return acc.concat(vImgs); }, [])).filter(function(img) { return typeof img === 'string' && img.trim() !== ''; });
    var firstMedia = (allImages.length > 0) ? allImages[0] : 'assets/images/placeholder.webp';
    var isLocalVid = typeof firstMedia === 'string' && !!firstMedia.match(/\.(mp4|mov|avi|webm|ogg)$/i);
    var isPlatformVid = typeof firstMedia === 'string' && (firstMedia.includes('youtube.com') || firstMedia.includes('youtu.be') || 
                        firstMedia.includes('tiktok.com') || 
                        firstMedia.includes('facebook.com') || firstMedia.includes('fb.watch'));

    var imgSrc = 'assets/images/placeholder.webp';
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

    var giftHTML = '';
    if (Array.isArray(p.gifts) && p.gifts.length > 0) {
      var giftNames = p.gifts.map(function(g) { return g.name; }).join(' + ');
      giftHTML = '<div class="product-card__gift" title="' + giftNames + '"><span class="gift-icon">🎁</span> Tặng: ' + giftNames + '</div>';
    }

    var pSafe = JSON.stringify({
      id: p.id, slug: p.slug, name: p.name, price: p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0), images: allImages
    }).replace(/'/g, '&#39;');

    var pName = p.name ? String(p.name) : 'Sản phẩm';
    article.innerHTML =
      '<div class="product-card__media">' +
        '<div class="product-card__badges">' + ribbonLeftHTML + ribbonRightHTML + '</div>' +
        (isLocalVid 
          ? '<video class="product-card__img" src="' + firstMedia + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>'
          : '<img class="product-card__img" src="' + imgSrc + '" alt="' + pName.replace(/"/g, '&quot;') + '" loading="lazy" onerror="this.onerror=null; this.src=\'assets/images/placeholder.webp\';">') +
      '</div>' +
      '<div class="product-card__body">' +
        '<h3 class="product-card__name" title="' + pName + '">' + pName + '</h3>' +
        '<div class="product-card__price-wrapper">' +
          ((basePrice === 0)
            ? '<a href="contact.html" class="price-contact" style="text-decoration:none;" onclick="event.stopPropagation();">LIÊN HỆ</a>'
            : '<span class="product-card__price">' + window.formatVND(basePrice) + '</span>' +
              (oldPrice && oldPrice > basePrice ? '<span class="product-card__original-price">' + window.formatVND(oldPrice) + '</span>' : '')
          ) +
        '</div>' +
        giftHTML +
        '<button class="product-card__btn-cta" onclick="window.location.href=\'/' + p.slug + '\'; event.preventDefault(); event.stopPropagation();">XEM CHI TIẾT</button>' +
      '</div>';



    // Bind event for Details (click anywhere on the media or details button)
    var mediaEl = article.querySelector('.product-card__media');
    if (mediaEl) {
      mediaEl.addEventListener('click', function () {
        window.location.href = '/' + p.slug;
      });
    }

    var detBtn = article.querySelector('.product-card__btn-detail');
    if (detBtn) {
      detBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.location.href = '/' + p.slug;
      });
    }

    var ctaBtn = article.querySelector('.product-card__btn-cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.location.href = '/' + p.slug;
      });
    }

    // Click anywhere on body leads to detail
    var bodyEl = article.querySelector('.product-card__body');
    if (bodyEl) {
      bodyEl.addEventListener('click', function () {
        window.location.href = '/' + p.slug;
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
      var btn = document.createElement('a');
      btn.className = 'pagination__btn' + (isActive ? ' active' : '');
      btn.textContent = label;
      btn.href = getFilterUrl({ page: page });
      btn.id = 'page-btn-' + label;
      if (isDisabled) {
        btn.setAttribute('aria-disabled', 'true');
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
      } else {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
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

    // Search tag
    if (state.searchQuery) {
      createTag('Từ khóa: "' + state.searchQuery + '"', 'search', 'all');
    }

    // Price tag
    if (state.isPriceFiltered) {
      createTag(window.formatVND(state.minPrice) + ' - ' + (state.maxPrice >= 50000000 ? window.formatVND(state.maxPrice)+'+' : window.formatVND(state.maxPrice)), 'price', 'all');
    }

    // Size tag
    if (state.size && state.size !== 'all' && state.size.trim() !== '') {
      var sizeLabels = {
        'under60': 'Dưới 60cm',
        '60-100': '60cm – 100cm',
        '100-150': '100cm – 150cm',
        'above150': 'Trên 150cm'
      };
      var displayLabel = sizeLabels[state.size] || state.size;
      createTag('Kích thước: ' + displayLabel, 'size', 'all');
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

    // Material tag (can be multiple)
    if (state.material !== 'all') {
      var ms = state.material.split(',');
      ms.forEach(function(m) {
        var cb = document.querySelector('#material-checkboxes input[value="'+m+'"]');
        if (cb && cb.nextElementSibling && cb.nextElementSibling.nextSibling) {
          createTag(cb.nextElementSibling.nextSibling.textContent, 'material', m);
        }
      });
    }

    // Segment tag (can be multiple)
    if (state.productType !== 'all') {
      var pts = state.productType.split(',');
      pts.forEach(function(pt) {
        var cb = document.querySelector('#segment-checkboxes input[value="'+pt+'"]');
        if (cb && cb.nextElementSibling && cb.nextElementSibling.nextSibling) {
          createTag(cb.nextElementSibling.nextSibling.textContent, 'productType', pt);
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
      
      if (type === 'search') {
        state.searchQuery = '';
        var inlineInput = document.getElementById('inline-search-input');
        if (inlineInput) inlineInput.value = '';
      } else if (type === 'price') {
        state.isPriceFiltered = false;
        state.minPrice = 0; state.maxPrice = 50000000;
        if (window.priceSlider) window.priceSlider.set([0, 50000000]);
      } else if (type === 'size') {
        state.size = 'all';
        var sizePills = document.getElementById('size-pills');
        if (sizePills) setActivePill(sizePills, 'all');
      } else if (type === 'status') {
        state.status = 'all';
        setActivePill(document.getElementById('status-pills'), 'all');
      } else if (type === 'quality') {
        var qs = state.quality.split(',').filter(function(q) { return q !== value; });
        state.quality = qs.length ? qs.join(',') : 'all';
        var cb = document.querySelector('#quality-checkboxes input[value="'+value+'"]');
        if (cb) cb.checked = false;
      } else if (type === 'material') {
        var ms = state.material.split(',').filter(function(m) { return m !== value; });
        state.material = ms.length ? ms.join(',') : 'all';
        var cb = document.querySelector('#material-checkboxes input[value="'+value+'"]');
        if (cb) cb.checked = false;
      } else if (type === 'productType') {
        var pts = state.productType.split(',').filter(function(pt) { return pt !== value; });
        state.productType = pts.length ? pts.join(',') : 'all';
        var cb = document.querySelector('#segment-checkboxes input[value="'+value+'"]');
        if (cb) cb.checked = false;
      }
      
      state.page = 1;
      loadProducts();
    }
    
    // Clear all
    if (e.target.id === 'btn-clear-all-filters') {
      state.searchQuery = '';
      var inlineInput = document.getElementById('inline-search-input');
      if (inlineInput) inlineInput.value = '';
      var resetBtn = document.getElementById('btn-reset-filters');
      if (resetBtn) resetBtn.click();
    }
  });

  // -- Handle UI events --
  function bindFilters() {
    // Inline Search
    var inlineSearchInput = document.getElementById('inline-search-input');
    var inlineSearchBtn = document.getElementById('inline-search-btn');

    function executeInlineSearch() {
      if (!inlineSearchInput) return;
      var val = inlineSearchInput.value.trim();
      state.searchQuery = val;

      state.page = 1;
      loadProducts();
    }

    if (inlineSearchBtn) {
      inlineSearchBtn.addEventListener('click', executeInlineSearch);
    }
    if (inlineSearchInput) {
      inlineSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeInlineSearch();
        }
      });
      // Populate if there's already a query in state
      if (state.searchQuery) {
        inlineSearchInput.value = state.searchQuery;
      }
    }

    // Category sidebar
    var catSidebar = document.getElementById('category-sidebar');
    if (catSidebar) {
      catSidebar.addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (!link) return;
        e.preventDefault();
        state.category = link.dataset.value;
        state.page = 1;
        setActivePill(catSidebar, link.dataset.value);
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

        updateApplyButtonCount();
      });
    }

    // Status pills
    var statusPills = document.getElementById('status-pills');
    if (statusPills) {
      statusPills.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        state.status = pill.dataset.value;
        setActivePill(statusPills, pill.dataset.value);
        updateApplyButtonCount();
      });
    }

    // Size pills
    var sizePills = document.getElementById('size-pills');
    if (sizePills) {
      sizePills.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        state.size = pill.dataset.value;
        setActivePill(sizePills, pill.dataset.value);
        updateApplyButtonCount();
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
        state.material = 'all';
        state.productType = 'all';
        state.status = 'all';
        state.isPriceFiltered = false;
        var sizePills = document.getElementById('size-pills');
        if (sizePills) setActivePill(sizePills, 'all');
        var qualityCheckboxes = document.querySelectorAll('#quality-checkboxes input[type="checkbox"]');
        qualityCheckboxes.forEach(function(cb) { cb.checked = false; });
        var materialCheckboxes = document.querySelectorAll('#material-checkboxes input[type="checkbox"]');
        materialCheckboxes.forEach(function(cb) { cb.checked = false; });
        var segmentCheckboxes = document.querySelectorAll('#segment-checkboxes input[type="checkbox"]');
        segmentCheckboxes.forEach(function(cb) { cb.checked = false; });
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
        return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;background-image:url(' + src + ');background-size:cover;background-position:center;filter:blur(10px);" data-is-video="1">' +
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

    // Read slug from URL or Pathname
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug') || params.get('id');
    
    // Nếu không có slug ở query, lấy từ pathname (ví dụ: /lo-loc-binh-dap-noi)
    if (!slug && window.location.pathname.length > 1) {
      // Bỏ dấu / đầu tiên
      var pathParts = window.location.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        // Lấy phần tử cuối cùng làm slug (hoặc phần tử duy nhất)
        slug = pathParts[pathParts.length - 1];
        // Bỏ đuôi .html nếu có
        slug = slug.replace('.html', '');
      }
    }

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

      // Fetch related products
      var relatedGrid = document.getElementById('related-products-grid');
      if (relatedGrid) {
         var categoryId = product.category ? (typeof product.category === 'object' ? product.category.id : product.category) : null;
         var query = { limit: 8, sort: 'bestselling' }; // fetch slightly more to filter out current product
         if (categoryId) query.category = categoryId;
         
         function renderRelated(items) {
             var relatedProducts = items.filter(function(p) { return p.id !== product.id; }).slice(0, 4);
             if (relatedProducts.length > 0) {
                 relatedGrid.innerHTML = '';
                 relatedProducts.forEach(function(rp, i) {
                     var card = buildProductCard(rp, i);
                     if (card) relatedGrid.appendChild(card);
                 });
                 if (typeof window.initScrollReveal === 'function') {
                   window.initScrollReveal();
                 }
             } else {
                 relatedGrid.innerHTML = '<p style="text-align:center;width:100%;color:#666;">Chưa có sản phẩm liên quan.</p>';
             }
         }

         PhucGiaTienAPI.getProducts(query).then(function(res) {
             var items = res.data || res.items || (Array.isArray(res) ? res : []);
             var relatedProducts = items.filter(function(p) { return p.id !== product.id; });
             
             if (relatedProducts.length > 0) {
                 renderRelated(items);
             } else {
                 // Fallback to newest products if no related products in the same category
                 PhucGiaTienAPI.getProducts({ limit: 8, sort: 'newest' }).then(function(res2) {
                     var items2 = res2.data || res2.items || (Array.isArray(res2) ? res2 : []);
                     renderRelated(items2);
                 }).catch(function() {
                     renderRelated([]);
                 });
             }
         }).catch(function(err) {
             console.error("Error fetching related products", err);
             relatedGrid.innerHTML = '';
         });
      }
    }).catch(function (err) {
      console.error("PRODUCT FETCH OR RENDER ERROR:", err);
      container.innerHTML =
        '<p style="text-align:center;padding:4rem 0;color:var(--color-text-muted)">Không tìm thấy sản phẩm.</p>';
    });
  }

  window.openImageModal = function(src) {
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.cursor = 'zoom-out';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    
    var img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    img.style.transform = 'scale(0.95)';
    img.style.transition = 'transform 0.2s ease';
    
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    
    // trigger reflow
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
    img.style.transform = 'scale(1)';
    
    overlay.onclick = function() {
      overlay.style.opacity = '0';
      img.style.transform = 'scale(0.95)';
      setTimeout(function() {
        if (overlay.parentNode) document.body.removeChild(overlay);
      }, 200);
    };
  };

  function renderProductDetail(container, p) {
    window.currentProductData = p;

    var totalStock = p.totalStock || (p.variants && p.variants.length > 0 ? p.variants.reduce(function(a,b){return a+(b.stock||0)},0) : 0);
    var statusText = (p.status === 'active' && totalStock > 0) ? '<span class="status-badge active">Còn hàng (' + totalStock + ' sản phẩm)</span>' : (p.status === 'inactive' || totalStock <= 0 ? '<span class="status-badge inactive">Hết hàng</span>' : '<span class="status-badge active">' + (p.status || 'Còn hàng') + '</span>');
    var shortDesc = p.shortDescription || '';

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
      
    var giftHTML = '';
    if (Array.isArray(p.gifts) && p.gifts.length > 0) {
      var totalValue = 0;
      var giftItems = p.gifts.map(function(g) { 
        totalValue += (g.estimatedValue || 0) * (g.quantity || 1);
        var imgUrl = g.imageUrl || 'assets/images/placeholder.webp';
        var qty = g.quantity || 1;
        var val = g.estimatedValue ? window.formatVND(g.estimatedValue) : 'Liên hệ';
        
        return '<div style="display:flex; gap:8px; align-items:center; background:#fff; padding:8px; border-radius:6px; border:1px solid #faebd7;">' +
          '<img src="' + imgUrl + '" alt="' + g.name + '" onclick="if(window.openImageModal) window.openImageModal(this.src)" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #f0f0f0; cursor:pointer;" title="Click để xem ảnh lớn">' +
          '<div style="flex:1;">' +
            '<div style="font-size:13px; font-weight:600; color:#333; margin-bottom:2px; line-height:1.3;">' + g.name + '</div>' +
            '<div style="font-size:11px; color:#666;">Số lượng: <span style="font-weight:600; color:#222;">x' + qty + '</span> <span style="margin:0 8px; color:#ddd;">|</span> Trị giá: <span style="color:#d32f2f; font-weight:600;">' + val + '</span></div>' +
          '</div>' +
        '</div>';
      }).join('');
      
      var totalValueHTML = totalValue > 0 ? '<div style="font-size:12px; color:#825300; font-weight:500;">Tổng: <span style="color:#d32f2f; font-weight:700; font-size:14px;">' + window.formatVND(totalValue) + '</span></div>' : '';

      giftHTML = '<div class="product-detail__gift-box" style="background: linear-gradient(135deg, #fff9e6 0%, #fff1c5 100%); border: 1px solid #e5c385; border-radius: 8px; padding: 12px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(229, 195, 133, 0.15);">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #e5c385; padding-bottom:10px; margin-bottom:10px;">' +
          '<div style="font-weight:700; color:#d32f2f; display:flex; align-items:center; gap:6px; font-size:14px; text-transform:uppercase;">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="14" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="22"></line><path d="M12 8H8a2 2 0 0 1-2-2 2 2 0 0 1 2-2h0c1.1 0 2 .9 2 2v2"></path><path d="M12 8h4a2 2 0 0 0 2-2 2 2 0 0 0-2-2h0c-1.1 0-2 .9-2 2v2"></path></svg>' +
            'Ưu Đãi Quà Tặng' +
          '</div>' +
          totalValueHTML +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:6px;">' + giftItems + '</div>' +
      '</div>';
    }

    var shortDescHTML = shortDesc ? '<div style="color:#555; font-size:15px; line-height:1.6; margin-bottom:16px;">' + shortDesc + '</div>' : '';

    var actionsHTML = '';
    if (p.status === 'inactive') {
      actionsHTML = 
        giftHTML +
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
          
          if (variantSelectorHtml === '' && p.variants.length > 1) {
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
            ? '<a href="contact" class="product-info__price" id="detail-price" style="color:#d32f2f; text-transform:uppercase; text-decoration:none; display:block;">LIÊN HỆ</a>'
            : '<p class="product-info__price" id="detail-price">' + window.formatVND(basePriceVal) + '</p>';
      }

      actionsHTML = 
        variantSelectorHtml +
        '<div class="quantity-control" style="margin-bottom: 24px;">' +
        '<div class="quantity-input-group">' +
        '<button class="quantity-btn" id="qty-minus" aria-label="Giảm">−</button>' +
        '<input class="quantity-input" id="qty-input" type="number" value="1" min="1" max="99" aria-label="Số lượng">' +
        '<button class="quantity-btn" id="qty-plus" aria-label="Tăng">+</button>' +
        '</div>' +
        '</div>' +
        giftHTML +
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
    var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && (window.location.port !== '5055' && window.location.port !== '7275') ? 'http://localhost:5055/api' : '/api';
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
      var max = parseInt(input.max, 10) || 99;
      if (val < max) input.value = val + 1;
      else alert('Số lượng vượt quá sản phẩm hiện có trong kho (' + max + ')');
    });

    input.addEventListener('change', function () {
      var val = parseInt(input.value, 10);
      var max = parseInt(input.max, 10) || 99;
      if (isNaN(val) || val < 1) input.value = 1;
      else if (val > max) {
        input.value = max;
        alert('Số lượng vượt quá sản phẩm hiện có trong kho (' + max + ')');
      }
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
        if (priceEl.tagName === 'A') priceEl.href = "contact";
      } else {
        priceEl.textContent = window.formatVND(currentPrice);
        priceEl.style.color = 'var(--color-accent)';
        priceEl.style.textTransform = 'none';
        if (priceEl.tagName === 'A') priceEl.removeAttribute('href');
      }
    }

    // Cập nhật giá & nút ở sticky bar
    var stickyPriceEl = document.getElementById('sticky-price');
    if (stickyPriceEl) {
      stickyPriceEl.textContent = currentPrice === 0 ? 'LIÊN HỆ' : window.formatVND(currentPrice);
    }
    var stickyBtnBuy = document.getElementById('sticky-btn-buy');
    if (stickyBtnBuy) {
      stickyBtnBuy.textContent = currentPrice === 0 ? 'LIÊN HỆ' : 'MUA NGAY';
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

    // Cập nhật giới hạn số lượng (max) theo tồn kho thực tế
    var qtyInput = document.getElementById('qty-input');
    if (qtyInput) {
      qtyInput.max = stock > 0 ? stock : 1;
      var currentVal = parseInt(qtyInput.value, 10) || 1;
      if (currentVal > stock && stock > 0) {
        qtyInput.value = stock;
      }
    }

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
           } else if (platform === 'tiktok') {
             var ttMatch = src.match(/video\/(\d+)/);
             if (ttMatch) {
               innerHtml = '<div style="width:100%;height:100%;position:relative;overflow:hidden;pointer-events:none;background:#000;display:flex;align-items:center;justify-content:center;">' +
                             '<iframe src="https://www.tiktok.com/player/v1/' + ttMatch[1] + '?music_info=0&description=0&native_context_menu=0" scrolling="no" frameborder="0" allowfullscreen style="width:300px;height:400px;border:none;pointer-events:none;transform:scale(0.3);transform-origin:center;" tabindex="-1"></iframe>' +
                             '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.2);z-index:10;"></div>' +
                             '<div style="position:absolute;z-index:11;width:28px;height:28px;background:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
                               '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>' +
                             '</div></div>';
             } else {
               innerHtml = buildPlatformBadge(platform);
             }
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
    } else if (product.variants && product.variants.length === 1) {
        window.currentSelectedVariant = product.variants[0];
        currentVariantId = product.variants[0].id;
        currentPrice = product.variants[0].price || product.basePrice || 0;
        
        var sizeParts = [];
        var v = product.variants[0];
        var size = v.sizeName || v.size;
        if (size) sizeParts.push(size);
        if (v.patternName) sizeParts.push(v.patternName);
        if (v.colorName) sizeParts.push(v.colorName);
        if (v.productTypeName) sizeParts.push(v.productTypeName);
        if (v.materialName) sizeParts.push(v.materialName);
        currentSizeStr = sizeParts.join(' · ') || null;
        currentImages = v.images && v.images.length > 0 ? v.images : product.images;
        
        var priceEl = document.getElementById('detail-price');
        if (priceEl) {
            priceEl.textContent = window.formatVND(currentPrice);
            priceEl.style.color = 'var(--color-accent)';
        }
        var statusEl = document.getElementById('spec-status');
        if (statusEl) {
            statusEl.innerHTML = '<span class="status-badge active">Còn hàng' + (v.stock ? ' (' + v.stock + ' sản phẩm)' : '') + '</span>';
        }
        
        if (window.updateVariantDisplayExternal) window.updateVariantDisplayExternal(v, product);
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
        window.currentSelectedVariant = match;

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
            var priceEl = document.getElementById('detail-price');
            if (priceEl) {
                priceEl.textContent = window.formatVND(currentPrice);
                priceEl.style.color = 'var(--color-accent)';
            }
            var statusEl = document.getElementById('spec-status');
            if (statusEl) {
                statusEl.innerHTML = '<span class="status-badge active">Còn hàng' + (match.stock ? ' (' + match.stock + ' sản phẩm)' : '') + '</span>';
            }
            if (window.updateVariantDisplayExternal) window.updateVariantDisplayExternal(match, product);
            
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
        var itemToAdd = { id: product.id, slug: product.slug, name: product.name, price: currentPrice, size: currentSizeStr, images: currentImages, gifts: product.gifts };
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
        var itemToAdd = { id: product.id, slug: product.slug, name: product.name, price: currentPrice, size: currentSizeStr, images: currentImages, gifts: product.gifts };
        if (window.CartAPI) {
          window.CartAPI.addItem(itemToAdd, qty);
        }
        window.location.href = "cart";
      });
    }

    // Tạo Sticky Add To Cart (Mobile)
    var stickyHtml = document.createElement('div');
    stickyHtml.className = 'sticky-add-to-cart';
    stickyHtml.innerHTML = 
      '<div class="sticky-add-to-cart__info">' +
        '<div class="sticky-add-to-cart__label">Giá sản phẩm</div>' +
        '<div class="sticky-add-to-cart__price" id="sticky-price">' + (currentPrice === 0 ? 'LIÊN HỆ' : window.formatVND(currentPrice)) + '</div>' +
      '</div>' +
      '<div class="sticky-add-to-cart__actions">' +
        '<button class="sticky-cart-icon-btn" id="sticky-btn-cart" aria-label="Thêm vào giỏ">' + 
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>' +
        '</button>' +
        '<button class="sticky-buy-now-btn" id="sticky-btn-buy">' + (currentPrice === 0 ? 'LIÊN HỆ' : 'MUA NGAY') + '</button>' +
      '</div>';
    document.body.appendChild(stickyHtml);

    function getStickyItemToAdd() {
      var price = window.currentSelectedVariant ? window.currentSelectedVariant.price : (product.basePrice || 0);
      var sizeStr = '';
      if (window.currentSelectedVariant && window.currentSelectedVariant.sizeName) {
         sizeStr = window.currentSelectedVariant.sizeName;
      } else if (window.currentSelectedVariant && window.currentSelectedVariant.size) {
         sizeStr = window.currentSelectedVariant.size;
      } else {
         sizeStr = product.size || '';
      }
      var imgs = (window.currentSelectedVariant && window.currentSelectedVariant.images && window.currentSelectedVariant.images.length > 0) ? window.currentSelectedVariant.images : product.images;
      return { id: product.id, slug: product.slug, name: product.name, price: price, size: sizeStr, images: imgs };
    }

    // Logic nút thêm vào giỏ hàng ở sticky bar
    document.getElementById('sticky-btn-cart').addEventListener('click', function(e) {
      var hasVariants = product.variants && product.variants.length > 0;
      if (hasVariants && !window.currentSelectedVariant) {
        window.showToast('Vui lòng chọn đầy đủ phân loại hàng', 'warning');
        var variantSection = document.querySelector('.product-info__variants') || document.querySelector('.attr-group') || document.getElementById('qty-input');
        if (variantSection) {
          variantSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (currentPrice === 0) {
        window.location.href = "contact";
        return;
      }
      var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
      if (window.CartAPI) {
        window.CartAPI.addItem(getStickyItemToAdd(), qty, e);
      } else {
        window.showToast('Đã thêm "' + product.name + '" vào giỏ hàng!', 'success');
      }
    });

    // Logic nút mua ngay ở sticky bar (chuyển hướng sang giỏ hàng)
    document.getElementById('sticky-btn-buy').addEventListener('click', function() {
      var hasVariants = product.variants && product.variants.length > 0;
      if (hasVariants && !window.currentSelectedVariant) {
        window.showToast('Vui lòng chọn đầy đủ phân loại hàng', 'warning');
        var variantSection = document.querySelector('.product-info__variants') || document.querySelector('.attr-group') || document.getElementById('qty-input');
        if (variantSection) {
          variantSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (currentPrice === 0) {
        window.location.href = "contact";
        return;
      }
      var qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
      if (window.CartAPI) {
        window.CartAPI.addItem(getStickyItemToAdd(), qty);
      }
      window.location.href = "cart";
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
        start: [state.minPrice, state.maxPrice],
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
      
      // Handle Apply instead of instant change
      sliderEl.noUiSlider.on('change', function () {
        updateApplyButtonCount();
      });
    }
  }

  // ====================================================
  // INIT
  // ====================================================
  document.addEventListener('DOMContentLoaded', function () {
    // Product LIST page
    if (document.getElementById('product-list-grid')) {
      syncStateFromUrl();

      // Init sort-select custom dropdown immediately (has static options)
      var sortWrap = document.getElementById('sort-select');
      if (sortWrap) {
        sortWrap.value = state.sort;
        initCustomSelects(sortWrap.parentNode);
      }
      initAdvancedFilters();
      populateFilters(); // filter selects init after API data loads
      bindFilters();

      // Register popstate listener for back/forward navigation
      window.addEventListener('popstate', function () {
        syncStateFromUrl();

        // Sync category pills UI
        var catSidebar = document.getElementById('category-sidebar');
        if (catSidebar) setActivePill(catSidebar, state.category);

        // Sync Search Input UI
        var inlineSearchInput = document.getElementById('inline-search-input');
        if (inlineSearchInput) {
          inlineSearchInput.value = state.searchQuery;
        }

        // Sync Sort select UI
        var sortEl = document.getElementById('sort-select');
        if (sortEl) {
          sortEl.value = state.sort;
          var wrapper = sortEl.closest('.custom-select-wrapper');
          if (wrapper) {
            var textEl = wrapper.querySelector('.custom-select__text');
            var opt = sortEl.options[sortEl.selectedIndex];
            if (textEl && opt) {
              textEl.textContent = opt.text;
            }
            var options = wrapper.querySelectorAll('.custom-select__option');
            options.forEach(function (optEl) {
              optEl.classList.toggle('selected', optEl.dataset.value === state.sort);
            });
          }
        }

        // Sync Status pills UI
        var statusPills = document.getElementById('status-pills');
        if (statusPills) {
          setActivePill(statusPills, state.status);
        }

        // Sync Size Text Input UI
        var sizeInput = document.getElementById('size-input');
        if (sizeInput) {
          sizeInput.value = state.size === 'all' ? '' : state.size;
        }

        // Sync Quality checkboxes UI
        var qualityCheckboxes = document.querySelectorAll('#quality-checkboxes input[type="checkbox"]');
        var selectedQualities = state.quality === 'all' ? [] : state.quality.split(',');
        qualityCheckboxes.forEach(function (cb) {
          cb.checked = selectedQualities.indexOf(cb.value) > -1;
        });

        // Sync Material checkboxes UI
        var materialCheckboxes = document.querySelectorAll('#material-checkboxes input[type="checkbox"]');
        var selectedMaterials = state.material === 'all' ? [] : state.material.split(',');
        materialCheckboxes.forEach(function (cb) {
          cb.checked = selectedMaterials.indexOf(cb.value) > -1;
        });

        // Sync Segment checkboxes UI
        var segmentCheckboxes = document.querySelectorAll('#segment-checkboxes input[type="checkbox"]');
        var selectedTypes = state.productType === 'all' ? [] : state.productType.split(',');
        segmentCheckboxes.forEach(function (cb) {
          cb.checked = selectedTypes.indexOf(cb.value) > -1;
        });

        // Sync Price Slider UI
        if (window.priceSlider) {
          window.priceSlider.set([state.minPrice, state.maxPrice]);
        }

        loadProducts(true);
      });

      loadProducts(true);
    }

    // Product DETAIL page
    if (document.getElementById('product-detail-container')) {
      initProductDetail();
    }
  });

})();






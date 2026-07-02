// ============================================
// common.js - Shared logic across all pages
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function () {
  'use strict';

  // Helper to get robust path for shared components
  function getComponentPath(fileName) {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname === '/user' || pathname.startsWith('/user/')) {
      return '/user/components/' + fileName;
    }
    return 'components/' + fileName;
  }

  // ======================================================
  // 0. LOAD COMPONENTS (Header & Footer)
  // ======================================================
  async function loadComponents() {
    const headerPh = document.getElementById('header-placeholder');
    const footerPh = document.getElementById('footer-placeholder');
    
    // Fetch both in parallel
    const pHeader = headerPh ? fetch(getComponentPath("header.html") + '?v=' + new Date().getTime()).then(r => r.ok ? r.text() : null) : Promise.resolve(null);
    const pFooter = footerPh ? fetch(getComponentPath("footer.html") + '?v=' + new Date().getTime()).then(r => r.ok ? r.text() : null) : Promise.resolve(null);
    
    const [headerHtml, footerHtml] = await Promise.all([pHeader, pFooter]);

    if (headerPh && headerHtml) {
      try {
        headerPh.insertAdjacentHTML('beforebegin', headerHtml);
        const newHeader = document.getElementById('site-header');
        if (newHeader) {
          if (headerPh.className) newHeader.className = headerPh.className;
          const pathname = window.location.pathname.toLowerCase();
          if (pathname === '/user' || pathname.startsWith('/user/')) {
            newHeader.querySelectorAll('img').forEach(function (img) {
              const src = img.getAttribute('src');
              if (src && !src.startsWith('http') && !src.startsWith('/')) img.src = '/user/' + src;
            });
            newHeader.querySelectorAll('a').forEach(function (a) {
              const href = a.getAttribute('href');
              if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) a.href = '/user/' + href;
            });
          }
        }
        headerPh.remove();
        if (typeof populateHeaderMegaMenu === 'function') populateHeaderMegaMenu();
        document.dispatchEvent(new Event('search-ready'));
      } catch (err) { console.error('Failed to parse header', err); }
    }

    if (footerPh && footerHtml) {
      try {
        footerPh.insertAdjacentHTML('beforebegin', footerHtml);
        const newFooter = document.getElementById('site-footer');
        if (newFooter) {
          const pathname = window.location.pathname.toLowerCase();
          if (pathname === '/user' || pathname.startsWith('/user/')) {
            newFooter.querySelectorAll('img').forEach(function (img) {
              const src = img.getAttribute('src');
              if (src && !src.startsWith('http') && !src.startsWith('/')) img.src = '/user/' + src;
            });
            newFooter.querySelectorAll('a').forEach(function (a) {
              const href = a.getAttribute('href');
              if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) a.href = '/user/' + href;
            });
          }
        }
        footerPh.remove();
      } catch (err) { console.error('Failed to parse footer', err); }
    }
  }

  // ======================================================
function populateHeaderMegaMenu() {
    var container = document.getElementById('header-mega-menu');
    if (!container) return;
    if (!window.PhucGiaTienAPI) return;

    window.PhucGiaTienAPI.getFilters().then(function(filters) {
      if (!filters || !filters.categories) return;

      var parents = (filters.categories || [])
        .filter(function(c) { 
          return (!c.parentId || c.parentId === null) && 
                 c.id !== 'all' && 
                 c.name && c.name.toLowerCase() !== 'tất cả'; 
        })
        .sort(function(a, b) { 
          var aSubs = a.subCategories && a.subCategories.length ? a.subCategories.length : 0;
          var bSubs = b.subCategories && b.subCategories.length ? b.subCategories.length : 0;
          if (bSubs !== aSubs) return bSubs - aSubs;
          return b.productCount - a.productCount; 
        });

      // Distribute into 5 columns to balance height
      var cols = [[], [], [], [], []];
      var colHeights = [0, 0, 0, 0, 0];
      
      parents.forEach(function(p) {
        var height = 2 + (p.subCategories && p.subCategories.length ? p.subCategories.length : 0);
        var minCol = 0;
        for (var i = 1; i < 5; i++) {
          if (colHeights[i] < colHeights[minCol]) minCol = i;
        }
        cols[minCol].push(p);
        colHeights[minCol] += height;
      });

      var html = '<div class="mm-masonry">';
      
      cols.forEach(function(col) {
        html += '<div class="mm-column">';
        col.forEach(function(p) {
          var icon = p.icon || '🏺';
          html += '<div class="mm-group">';
          html += '  <h3 class="mm-group-title">';
          html += '    <a href="products?category=' + p.id + '">';
          html += '      <span class="mm-text">' + p.name + '</span>';
          html += '    </a>';
          html += '  </h3>';
          if (p.subCategories && p.subCategories.length > 0) {
            html += '  <ul class="mm-sub-list">';
            p.subCategories.forEach(function(sub) {
              html += '    <li><a href="products?category=' + sub.id + '">' + sub.name + '</a></li>';
            });
            html += '  </ul>';
          }
          html += '</div>';
        });
        html += '</div>';
      });

      html += '</div>';
      container.innerHTML = html;
    }).catch(function(err) {
      console.error('Mega menu error:', err);
    });
  }
  // 1. HEADER: sticky scroll effect + mobile nav toggle
  // ======================================================
  function initHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;

    const inner = header.querySelector('.header-inner');
    if (!inner) return;

    let navToggle = inner.querySelector('.nav-toggle');
    const siteNav = document.getElementById('site-nav');

    // Self-healing: Tạo động nút hamburger nếu bị thiếu hụt hoặc bị cache lướt qua
    if (!navToggle) {
      console.log('[Header-Bust] Mobile nav-toggle not found in DOM. Programmatically reconstructing...');
      navToggle = document.createElement('button');
      navToggle.className = 'nav-toggle';
      navToggle.id = 'nav-toggle-btn';
      navToggle.setAttribute('aria-label', 'Mở menu');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-controls', 'site-nav');
      navToggle.innerHTML = `
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
      `;
      inner.appendChild(navToggle);
    }

    // Sticky header on scroll
    function handleHeaderScroll() {
      if (window.scrollY > 60) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', function() {
      requestAnimationFrame(handleHeaderScroll);
    }, { passive: true });
    requestAnimationFrame(handleHeaderScroll); // run on load

    // Mobile nav toggle
    if (navToggle && siteNav) {
      navToggle.addEventListener('click', function () {
        const isOpen = siteNav.classList.toggle('is-open');
        navToggle.classList.toggle('is-open', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      siteNav.querySelectorAll('.nav-list__link').forEach(function (link) {
        link.addEventListener('click', function () {
          siteNav.classList.remove('is-open');
          navToggle.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });

      document.addEventListener('click', function (e) {
        if (siteNav.classList.contains('is-open') && !siteNav.contains(e.target) && !navToggle.contains(e.target)) {
          siteNav.classList.remove('is-open');
          navToggle.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    }

    // Active Nav Link
    let currentPage = window.location.pathname.split('/').pop() || "/";
    currentPage = currentPage.toLowerCase().replace('.html', '');
    if (currentPage === '' || currentPage === '/') {
      currentPage = 'index';
    }
    // Highlight "Sản Phẩm" when viewing a product detail page
    if (currentPage === 'product-detail') {
      currentPage = 'products';
    }

    document.querySelectorAll('.nav-list__link').forEach(function (link) {
      const href = link.getAttribute('href') || '';
      let linkPage = href.split('/').pop().toLowerCase().replace('.html', '');
      if (linkPage === '' || linkPage === '/') {
        linkPage = 'index';
      }
      if (linkPage === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
      }
    });

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const headerH = header ? header.offsetHeight : 72;
          const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });

    // ── Self-healing user button ──────────────────────────────────────────
    // Đảm bảo icon user luôn tồn tại dù header.html bị cache cũ
    const headerActions = header.querySelector('.header-actions');
    let userBtn = header.querySelector('.header-action-btn--user');

    if (!userBtn && headerActions) {
      // Tạo và inject user button vào DOM
      userBtn = document.createElement('a');
      userBtn.className = 'header-action-btn header-action-btn--user';
      userBtn.href = "login";
      userBtn.setAttribute('aria-label', 'Đăng nhập');
      userBtn.innerHTML = `
        <svg class="header-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
      headerActions.appendChild(userBtn);
      console.log('[Header] User button was missing from DOM — injected programmatically.');
    }

    // ── Auth: đổi icon sang avatar nếu đã đăng nhập ────────────────────────
    if (userBtn) {
      let user = null;
      try {
        user = JSON.parse(localStorage.getItem('current_user') || sessionStorage.getItem('current_user'));
      } catch (e) { }

      if (user) {
        userBtn.removeAttribute('href');
        userBtn.classList.add('is-logged-in');
        const initial = (user.name || user.firstName || 'U').charAt(0).toUpperCase();
        const fullName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Người dùng';

        // Fix href của dropdown links khi đang ở /user/ subfolder
        const trackingHref = window.location.pathname.startsWith('/user/')
          ? '/user/order-tracking.html'
          : "order-tracking";

        userBtn.innerHTML = `
          <div class="user-avatar-wrap">
            <div class="user-avatar">${initial}</div>
            <div class="user-dropdown-menu">
              <div class="user-dropdown-header">
                <span class="user-name">${fullName}</span>
                <span class="user-email">${user.email}</span>
              </div>
              <div class="user-dropdown-body">
                <a href="${trackingHref}" class="user-dropdown-item">Đơn mua</a>
                <button type="button" class="user-dropdown-item btn-logout" onclick="window.logoutCustomer()">Đăng xuất</button>
              </div>
            </div>
          </div>
        `;

        // Update mobile menu account link with 'Promax' UI
        const mobileAccountItem = document.querySelector('.nav-mobile-account-item');
        if (mobileAccountItem) {
          // Remove default padding/border of the li to make the card look clean
          mobileAccountItem.style.borderTop = 'none';
          mobileAccountItem.style.paddingTop = '0';

          mobileAccountItem.innerHTML = `
            <div class="mobile-user-profile">
              <div class="mobile-user-header">
                <div class="mobile-user-avatar">${initial}</div>
                <div class="mobile-user-info">
                  <span class="mobile-user-name">${fullName}</span>
                  <span class="mobile-user-email">${user.email || 'Thành viên Phúc Gia Tiên'}</span>
                </div>
              </div>
              <div class="mobile-user-actions">
                <a href="${trackingHref}" class="mobile-user-btn mobile-user-btn--orders">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Đơn mua
                </a>
                <button type="button" class="mobile-user-btn mobile-user-btn--logout" onclick="window.logoutCustomer()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Đăng xuất
                </button>
              </div>
            </div>
          `;
        }

      } else {
        // Không đăng nhập: fix href cho /user/ subfolder
        if (window.location.pathname.startsWith('/user/')) {
          userBtn.href = '/user/login.html';
        }

        // Cập nhật href cho mobile menu
        const mobileAccountLink = document.getElementById('nav-mobile-account-link');
        if (mobileAccountLink && window.location.pathname.startsWith('/user/')) {
          mobileAccountLink.href = '/user/login.html';
        }
      }
    }
  }

  // ======================================================
  // 2. FOOTER: Year, BackToTop, Newsletter
  // ======================================================
  function initFooter() {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const btn = document.getElementById('back-to-top');
    if (btn) {
      // ── Ẩn/hiện: class toggle để CSS transition slide từ phải ──
      let lastScrollY = 0;
      let ticking = false;

      function onScroll() {
        lastScrollY = window.scrollY;
        if (!ticking) {
          requestAnimationFrame(function () {
            if (lastScrollY > 500) {
              btn.classList.add('is-visible');
            } else {
              btn.classList.remove('is-visible');
            }
            ticking = false;
          });
          ticking = true;
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true });

      // ── Cuộn lên: easeInOutQuart — luxury smooth ──
      let isScrolling = false;

      btn.addEventListener('click', function () {
        if (isScrolling) return; // chống double-click khi đang chạy

        const startY = window.scrollY;
        if (startY === 0) return;

        // Duration tỷ lệ với khoảng cách: 300ms (gần) → 1000ms (xa)
        // Clamp trong khoảng 400–950ms để luôn cảm thấy sang trọng
        const duration = Math.min(950, Math.max(400, startY * 0.55));
        const startTime = performance.now();
        isScrolling = true;

        // easeInOutQuart: khởi động chậm → tăng tốc → dừng rất êm ái
        function easeInOutQuart(t) {
          return t < 0.5
            ? 8 * t * t * t * t
            : 1 - Math.pow(-2 * t + 2, 4) / 2;
        }

        function step(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = easeInOutQuart(progress);

          window.scrollTo(0, startY * (1 - ease));

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            isScrolling = false;
          }
        }

        requestAnimationFrame(step);
      });
    }

    var form = document.getElementById('footer-newsletter-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailInput = document.getElementById('newsletter-email');
        var submitBtn = document.getElementById('newsletter-submit-btn');
        if (!emailInput) return;

        var email = emailInput.value.trim();
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
          window.showToast('Vui lòng nhập email hợp lệ.', 'error');
          emailInput.focus();
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        if (window.PhucGiaTienAPI) {
          PhucGiaTienAPI.subscribeNewsletter(email).then(function () {
            window.showToast('Đăng ký nhận tin thành công!', 'success');
            emailInput.value = '';
          }).catch(function () {
            window.showToast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
          }).finally(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Gửi';
          });
        }
      });
    }
  }

  // ======================================================
  // 3. AUTH SERVICE (Customer session management)
  // ======================================================
  window.logoutCustomer = function () {
    localStorage.removeItem('current_user');
    localStorage.removeItem('customer_token');
    sessionStorage.removeItem('current_user');
    sessionStorage.removeItem('customer_token');
    // Clear guest traces for privacy when logging out of a shared device
    localStorage.removeItem('pgt_last_address');
    localStorage.removeItem('pgt_orders');
    window.showToast('Đã đăng xuất thành công!', 'success');
    setTimeout(() => window.location.reload(), 1000);
  };

  // ======================================================
  // 4. OTHER GLOBALS (Toast, LazyLoad, Debounce, ScrollReveal)
  // ======================================================
  window.debounce = function (fn, wait) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn.apply.bind(fn, this, arguments), wait || 250);
    };
  };

  window.showToast = function (message, type, duration) {
    type = type || 'info';
    duration = duration || 3500;
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✔', error: '✖', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.innerHTML =
      '<span class="toast__icon">' + (icons[type] || 'ℹ') + '</span>' +
      '<span class="toast__msg">' + message + '</span>';
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function () { toast.remove(); }, 320);
    }, duration);
  };

  window.formatVND = function (amount) {
    return Number(amount).toLocaleString('vi-VN') + 'đ';
  };

  window.formatDate = function (dStr) {
    if (!dStr) return '';
    try {
      var d = new Date(dStr);
      if (isNaN(d.getTime())) {
        // Try parsing DD/MM/YYYY or DD-MM-YYYY
        var parts = dStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (parts) {
          var day = parseInt(parts[1], 10);
          var month = parseInt(parts[2], 10) - 1;
          var year = parseInt(parts[3], 10);
          var hour = parts[4] ? parseInt(parts[4], 10) : 0;
          var min = parts[5] ? parseInt(parts[5], 10) : 0;
          var sec = parts[6] ? parseInt(parts[6], 10) : 0;
          d = new Date(year, month, day, hour, min, sec);
        } else {
          return dStr;
        }
      }
      var pad = function (n) { return n < 10 ? '0' + n : n; };
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' ' + pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
    } catch (e) {
      return dStr;
    }
  };



  function initLazyImages() {
    if (!window.IntersectionObserver) return;
    const lazyImgs = document.querySelectorAll('img[data-src]');
    if (!lazyImgs.length) return;
    const imgObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          img.removeAttribute('data-src');
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    lazyImgs.forEach(function (img) { imgObserver.observe(img); });
  }

  function initScrollReveal() {
    if (!document.getElementById('scroll-reveal-styles')) {
      const style = document.createElement('style');
      style.id = 'scroll-reveal-styles';
      style.textContent =
        '.reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }' +
        '.reveal.revealed { opacity: 1; transform: translateY(0); }' +
        '.reveal-left  { opacity:0; transform:translateX(-28px); transition:opacity 0.65s ease,transform 0.65s ease; }' +
        '.reveal-left.revealed { opacity:1; transform:translateX(0); }' +
        '.reveal-right { opacity:0; transform:translateX(28px); transition:opacity 0.65s ease,transform 0.65s ease; }' +
        '.reveal-right.revealed { opacity:1; transform:translateX(0); }';
      document.head.appendChild(style);
    }

    const els = document.querySelectorAll('.reveal:not(.revealed), .reveal-left:not(.revealed), .reveal-right:not(.revealed)');
    if (!els.length || !window.IntersectionObserver) {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function (el) { el.classList.add('revealed'); });
      return;
    }
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(function () {
              entry.target.classList.add('revealed');
            }, Number(delay));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach(function (el) { observer.observe(el); });
  }

  // Expose globally for dynamic page elements
  window.initScrollReveal = initScrollReveal;

  window.buildProductCard = function(p, i) {
    var basePath = (function () {
      var pn = window.location.pathname.toLowerCase();
      return (pn === '/user' || pn.startsWith('/user/')) ? '/user/' : '/';
    })();
    var article = document.createElement('article');
    article.className = 'product-card reveal';
    article.dataset.delay = String(i * 80);

    var ribbonLeftHTML = '';
    var totalStock = p.totalStock !== undefined ? p.totalStock : (p.variants ? p.variants.reduce(function (sum, v) { return sum + (v.stock || 0); }, 0) : 0);
    if (totalStock <= 0) {
      ribbonLeftHTML = '<div class="product-card__ribbon product-card__ribbon--out">HẾT HÀNG</div>';
    } else if (p.status === 'inactive') {
      ribbonLeftHTML = '<div class="product-card__ribbon product-card__ribbon--out" style="background:#1A0F05; color:#ffffff;">NGỪNG BÁN</div>';
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

    var pVariants = Array.isArray(p.variants) ? p.variants : []; 
    var pImages = Array.isArray(p.images) ? p.images : (typeof p.images === "string" && p.images.trim() ? [p.images] : []); 
    var allImages = pImages.concat(pVariants.reduce(function (acc, v) { 
      var vImgs = Array.isArray(v.images) ? v.images : (typeof v.images === "string" && v.images.trim() ? [v.images] : []); 
      return acc.concat(vImgs); 
    }, [])).filter(function (img) { return typeof img === 'string' && img.trim() !== ''; });
    
    var firstMedia = (allImages.length > 0) ? allImages[0] : 'assets/images/placeholder.webp';
    var isLocalVid = typeof firstMedia === 'string' && !!firstMedia.match(/\.(mp4|mov|avi|webm|ogg)$/i);
    var isPlatformVid = typeof firstMedia === 'string' && (firstMedia.includes('youtube.com') || firstMedia.includes('youtu.be') ||
      firstMedia.includes('tiktok.com') ||
      firstMedia.includes('facebook.com') || firstMedia.includes('fb.watch'));

    var imgSrc = 'assets/images/placeholder.webp';
    if (firstMedia && !isLocalVid && !isPlatformVid) {
      imgSrc = firstMedia;
    } else if (allImages.length > 0) {
      var foundImg = allImages.find(function (img) {
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

    // Resolve img path
    if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/') && !imgSrc.startsWith('data:')) {
      if (basePath === '/user/') imgSrc = '/user/' + imgSrc;
      else imgSrc = '/' + imgSrc;
    }

    var giftHTML = '';
    if (Array.isArray(p.gifts) && p.gifts.length > 0) {
      var giftNames = p.gifts.map(function (g) { return g.name; }).join(' + ');
      giftHTML = '<div class="product-card__gift" title="' + giftNames + '"><span class="gift-icon">🎁</span> Tặng: ' + giftNames + '</div>';
    }

    var pName = p.name ? String(p.name) : 'Sản phẩm';
    var targetUrl = (basePath === '/user/') ? '/user/' + p.slug : '/' + p.slug;

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
      ((basePrice <= 0)
        ? '<a href="' + (basePath === '/user/' ? '/user/' : '/') + 'contact.html" class="price-contact" style="text-decoration:none;" onclick="event.stopPropagation();">LIÊN HỆ</a>'
        : '<span class="product-card__price">' + window.formatVND(basePrice) + '</span>' +
        (oldPrice && oldPrice > basePrice ? '<span class="product-card__original-price">' + window.formatVND(oldPrice) + '</span>' : '')
      ) +
      '</div>' +
      giftHTML +
      '<button class="product-card__btn-cta" onclick="window.location.href=\'' + targetUrl + '\'; event.preventDefault(); event.stopPropagation();">XEM CHI TIẾT</button>' +
      '</div>';

    // Bind event for Details
    var mediaEl = article.querySelector('.product-card__media');
    if (mediaEl) {
      mediaEl.addEventListener('click', function () {
        window.location.href = targetUrl;
      });
    }
    
    // Click anywhere on body leads to detail (except CTA button which is handled separately)
    var bodyEl = article.querySelector('.product-card__body');
    if (bodyEl) {
      bodyEl.addEventListener('click', function (e) {
        if (!e.target.closest('button')) {
          window.location.href = targetUrl;
        }
      });
    }

    return article;
  };

  // ======================================================
  // GLOBAL CONFIGURATION SYSTEM
  // ======================================================
  var CONFIG_KEY = 'pgt_site_config';
  var DEFAULT_CONFIG = {};

  // Khởi tạo PGT_CONFIG mặc định trong trường hợp API lỗi
  window.PGT_CONFIG = {};

  // Fetch config mới nhất từ API, cập nhật lại PGT_CONFIG
  async function fetchSiteConfig() {
    // 1. Thử lấy từ cache trước để load nhanh khi chuyển trang
    try {
      var cached = sessionStorage.getItem(CONFIG_KEY);
      if (cached) {
        window.PGT_CONFIG = JSON.parse(cached);
        // Không return ở đây để API vẫn tiếp tục gọi ngầm và cập nhật dữ liệu mới nhất
      }
    } catch (e) { }

    // 2. Nếu chưa có, gọi API
    try {
      var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055' ? 'http://localhost:5055/api' : '/api';
      var res = await fetch(dynamicBase + '/site-config');
      if (!res.ok) throw new Error('API ' + res.status);
      var apiConfig = await res.json();
      window.PGT_CONFIG = apiConfig || {};

      // Lưu lại cache
      try {
        sessionStorage.setItem(CONFIG_KEY, JSON.stringify(window.PGT_CONFIG));
      } catch (e) { }
    } catch (e) {
      console.warn('[PGT] Không lấy được config từ API:', e.message);
      window.PGT_CONFIG = {};
    }
  }

  /** Chuẩn hóa đường dẫn ảnh trong HTML config (admin lưu ../user/assets/ hoặc base64). */
  function normalizeConfigAssetPaths(html) {
    if (!html || typeof html !== 'string') return '';

    // Prefix /uploads/ with API base if needed
    var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055' ? 'http://localhost:5055' : '';
    html = html.replace(/src=["'](\/uploads\/[^"']+)["']/gi, 'src="' + dynamicBase + '$1"');

    return html
      .replace(/src=["'](?:\.\.\/user\/|\/user\/|user\/)?assets\/([^"']+)["']/gi, 'src="assets/$1"')
      .replace(/src=["']asse\/([^"']+)["']/gi, 'src="assets/$1"');
  }

  function resolveImgUrl(url, defaultUrl) {
    if (!url) return defaultUrl;
    if (url.startsWith('/uploads/')) {
      var dynamicBase = '';
      if ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055') {
          dynamicBase = 'http://localhost:5055';
      } else if (window.location.hostname.includes('trycloudflare.com')) {
          if (window.PhucGiaTienAPI && window.PhucGiaTienAPI.apiBase) {
              var apiBase = window.PhucGiaTienAPI.apiBase;
              if (apiBase.startsWith('http')) {
                  dynamicBase = apiBase.replace('/api', '');
              }
          }
      }
      return dynamicBase + url;
    }
    return url;
  }

  // Apply configuration values dynamically to annotated DOM elements
  function applyDynamicConfig() {
    var config = window.PGT_CONFIG || {};

    var rawPhone = (config.phone || '').replace(/\s+/g, '');


    // 1. Phone number link updates
    document.querySelectorAll('.js-config-phone-link').forEach(function (el) {
      el.href = 'tel:' + rawPhone;
      // If it's a contact widget title button, update title
      if (el.classList.contains('quick-contact-btn--phone')) {
        el.title = 'Gọi ngay: ' + config.phone;
      }
    });

    // 2. Phone display text updates
    document.querySelectorAll('.js-config-phone-text').forEach(function (el) {
      el.textContent = config.phone || el.textContent;
    });

    // 3. Email link updates
    document.querySelectorAll('.js-config-email-link').forEach(function (el) {
      el.href = 'mailto:' + config.email;
    });

    // 4. Email display text updates
    document.querySelectorAll('.js-config-email-text').forEach(function (el) {
      el.textContent = config.email || el.textContent;
    });

    // 5. Address display text updates
    document.querySelectorAll('.js-config-address-text').forEach(function (el) {
      if(config.address) el.innerHTML = config.address.replace(/\n/g, '<br>');
    });

    // 6. Social link updates
    document.querySelectorAll('.js-config-fb-link').forEach(function (el) {
      el.href = config.facebook || '#';
    });
    document.querySelectorAll('.js-config-yt-link').forEach(function (el) {
      el.href = config.youtube || '#';
    });
    document.querySelectorAll('.js-config-tt-link').forEach(function (el) {
      el.href = config.tiktok || '#';
    });
    document.querySelectorAll('.js-config-zalo-link').forEach(function (el) {
      var zaloHref = config.zalo || '';
      if (zaloHref && !zaloHref.startsWith('http') && zaloHref.match(/^[0-9]+$/)) {
        zaloHref = 'https://zalo.me/' + zaloHref;
      }
      el.href = zaloHref || '#';
    });
    document.querySelectorAll('.js-config-messenger-link').forEach(function (el) {
      el.href = config.messenger || '#';
    });

    // 7. Store title/slogan updates
    document.querySelectorAll('.js-config-store-name').forEach(function (el) {
      if (config.storeName) el.textContent = config.storeName;
    });
    document.querySelectorAll('.js-config-slogan').forEach(function (el) {
      if (config.slogan) el.textContent = config.slogan;
    });
    document.querySelectorAll('.js-config-slogan-text').forEach(function (el) {
      if (config.slogan) el.textContent = config.slogan;
    });

    // 7.1. Dynamic SEO Tags updates
    if (config.storeName) {
      // Update Title
      var currentTitle = document.title;
      if (currentTitle.includes('Phúc Gia Tiên')) {
        document.title = currentTitle.replace(/Phúc Gia Tiên/g, config.storeName);
      }
      
      // Update Meta Tags
      var metaOgTitle = document.querySelector('meta[property="og:title"]');
      if (metaOgTitle && metaOgTitle.content.includes('Phúc Gia Tiên')) {
        metaOgTitle.content = metaOgTitle.content.replace(/Phúc Gia Tiên/g, config.storeName);
      }
      
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        var newDesc = metaDesc.content;
        newDesc = newDesc.replace(/Phúc Gia Tiên/g, config.storeName);
        if (config.phone) newDesc = newDesc.replace(/0986\s?123\s?456/g, config.phone);
        if (config.email) newDesc = newDesc.replace(/phucgatien@gmail\.com/g, config.email);
        metaDesc.content = newDesc;
      }
      
      var metaOgDesc = document.querySelector('meta[property="og:description"]');
      if (metaOgDesc) {
        var newOgDesc = metaOgDesc.content;
        newOgDesc = newOgDesc.replace(/Phúc Gia Tiên/g, config.storeName);
        if (config.phone) newOgDesc = newOgDesc.replace(/0986\s?123\s?456/g, config.phone);
        if (config.email) newOgDesc = newOgDesc.replace(/phucgatien@gmail\.com/g, config.email);
        metaOgDesc.content = newOgDesc;
      }
    }

    // 8. Working hours updates
    document.querySelectorAll('.js-config-working-hours').forEach(function (el) {
      if (config.workingHours) el.textContent = config.workingHours;
    });

    // 9. Map iframe updates (Advanced Lazy Load)
    document.querySelectorAll('.js-config-map-iframe').forEach(function (el) {
      if(config.mapIframe) {
        var txt = document.createElement("textarea");
        txt.innerHTML = config.mapIframe;
        
        // Tạo DOM tạm để lấy src
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = txt.value;
        var iframe = tempDiv.querySelector('iframe');
        
        if (iframe) {
          var realSrc = iframe.getAttribute('src');
          iframe.removeAttribute('src'); // Bỏ src để không load
          iframe.setAttribute('data-src', realSrc);
          iframe.setAttribute('title', 'Bản đồ chỉ đường đến Phúc Gia Tiên');
          
          el.innerHTML = tempDiv.innerHTML;
          var newIframe = el.querySelector('iframe');
          
          if (window.IntersectionObserver) {
            var mapObserver = new IntersectionObserver(function(entries) {
              entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                  entry.target.setAttribute('src', entry.target.getAttribute('data-src'));
                  mapObserver.unobserve(entry.target);
                }
              });
            }, { rootMargin: '300px' });
            mapObserver.observe(newIframe);
          } else {
            newIframe.setAttribute('src', realSrc);
          }
        } else {
          el.innerHTML = txt.value;
        }
      }
    });

    document.querySelectorAll('.js-config-map-link').forEach(function (el) {
      // Default fallback if no iframe is provided or parsing fails
      var mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(config.address || '');

      // Google blocks opening 'embed' URLs directly in a new tab ("The Google Maps Embed API must be used in an iframe").
      // To fix this, we must extract the exact coordinates from the iframe's protobuf string (pb=...)
      if (config.mapIframe) {
        var srcMatch = config.mapIframe.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          var embedUrl = srcMatch[1].replace(/&amp;/g, '&');

          // Look for !2d (longitude) and !3d (latitude) in the pb= string
          var coordMatch = embedUrl.match(/!2d([0-9.-]+)!3d([0-9.-]+)/);
          if (coordMatch && coordMatch.length === 3) {
            var lng = coordMatch[1];
            var lat = coordMatch[2];
            // Construct a standard Google Maps URL pointing exactly to these coordinates
            mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
          }
        }
      }

      el.href = mapUrl;
    });

    // 10. Image/Banner updates
    document.querySelectorAll('.js-config-logo').forEach(function (el) {
      var logoUrl = config.logoUrl ? resolveImgUrl(config.logoUrl, '') : 'assets/images/logo.png';
      if (logoUrl && !logoUrl.startsWith('data:')) {
        logoUrl += '?v=' + Date.now();
      }
      el.src = logoUrl;
    });
    // Cập nhật favicon từ logoUrl trong DB hoặc mặc định
    var finalLogoUrl = config.logoUrl ? config.logoUrl : 'assets/images/logo.png';
    var oldFavicon = document.querySelector('link[rel="icon"]');
    var oldShortcut = document.querySelector('link[rel="shortcut icon"]');

    var newFavicon = document.createElement('link');
    newFavicon.rel = 'icon';

    // Xác định loại MIME phù hợp (hỗ trợ cả base64 và file đường dẫn tĩnh)
    var mimeType = 'image/x-icon';
    if (finalLogoUrl.startsWith('data:')) {
      var match = finalLogoUrl.match(/^data:(image\/[^;]+);/);
      if (match) {
        mimeType = match[1];
      }
    } else if (finalLogoUrl.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (finalLogoUrl.toLowerCase().endsWith('.jpg') || finalLogoUrl.toLowerCase().endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (finalLogoUrl.toLowerCase().endsWith('.gif')) {
      mimeType = 'image/gif';
    } else if (finalLogoUrl.toLowerCase().endsWith('.svg')) {
      mimeType = 'image/svg+xml';
    }
    newFavicon.type = mimeType;

    // Tránh việc nối thêm cache-buster '?v=' cho ảnh base64 vì sẽ làm hỏng định dạng base64
    if (finalLogoUrl.startsWith('data:')) {
      newFavicon.href = finalLogoUrl;
    } else {
      var resolvedUrl = resolveImgUrl(finalLogoUrl, '');
      newFavicon.href = resolvedUrl;
    }

    document.head.appendChild(newFavicon);
    if (oldFavicon) oldFavicon.remove();
    if (oldShortcut) oldShortcut.remove();
    document.querySelectorAll('.js-config-home-banner-img').forEach(function (el) {
      if (config.homeBanner) el.src = resolveImgUrl(config.homeBanner, '').replace('.jpeg', '.webp').replace('.jpg', '.webp');
    });
    document.querySelectorAll('.js-config-cta-banner-img').forEach(function (el) {
      if (config.ctaBanner === '') {
        el.style.opacity = '0';
        el.removeAttribute('src');
      } else {
        el.src = resolveImgUrl(config.ctaBanner, 'assets/images/bg.webp').replace('.jpeg', '.webp').replace('.jpg', '.webp');
        el.style.opacity = '1';
      }
    });
    document.querySelectorAll('.js-config-page-banner-img').forEach(function (el) {
      el.src = resolveImgUrl(config.pageBanner, '');
    });
    document.querySelectorAll('.js-config-products-banner-img').forEach(function (el) {
      el.src = resolveImgUrl(config.productsBanner || config.pageBanner, '');
    });
    document.querySelectorAll('.js-config-journey-banner-img').forEach(function (el) {
      el.src = resolveImgUrl(config.journeyBanner || config.pageBanner, '');
    });
    document.querySelectorAll('.js-config-about-banner-img').forEach(function (el) {
      el.src = resolveImgUrl(config.aboutBanner || config.pageBanner, '');
    });
    document.querySelectorAll('.js-config-contact-banner-img').forEach(function (el) {
      el.src = resolveImgUrl(config.contactBanner || config.pageBanner, '');
    });
    document.querySelectorAll('.js-config-home-story-img').forEach(function (el) {
      var imgPath = config.homeStoryImg;
      if (imgPath === 'assets/images/story-couple.jpg') {
        imgPath = 'assets/images/about-workshop.jpg';
      }
      el.src = resolveImgUrl(imgPath, 'assets/images/about-workshop.jpg');
    });
    document.querySelectorAll('.js-config-about-story-img').forEach(function (el) {
      el.src = resolveImgUrl(config.aboutStoryImg, 'assets/images/about-workshop.jpg');
    });


    // 11. New Dynamic Contents
    var homeText = config.homeStoryText || '';
    if (homeText) {
      if (!homeText.includes('<h2') && !homeText.includes('story-teaser__quote')) {
        var slogan = config.homeStoryQuote;
        if (slogan && slogan.trim() !== '') {
          var sloganHtml = '<h2 id="story-heading" class="story-teaser__quote">' + slogan + '</h2>';
          if (homeText.includes('<p>') || homeText.includes('<p ')) {
            homeText = sloganHtml + homeText;
          } else {
            homeText = sloganHtml + '<p class="story-teaser__text">' + homeText + '</p>';
          }
        } else {
          if (!homeText.includes('<p>') && !homeText.includes('<p ')) {
            homeText = '<p class="story-teaser__text">' + homeText + '</p>';
          }
        }
      }
      // Tự động phục hồi thẻ tiêu đề phụ nếu dữ liệu cũ trong CSDL bị thiếu
      if (!homeText.includes('section-header__label')) {
        homeText = '<span class="section-header__label">Câu Chuyện Của Chúng Tôi</span>' + homeText;
      }
    }
    document.querySelectorAll('.js-config-home-story-text').forEach(function (el) { el.innerHTML = homeText; });
    document.querySelectorAll('.js-config-about-story-html').forEach(function (el) {
      var storyHtml = normalizeConfigAssetPaths(config.aboutStoryHtml || '');
      el.innerHTML = storyHtml;
      // Đảm bảo tất cả nội dung hiển thị ngay (không bị ẩn bởi scroll-reveal animation)
      el.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function (rev) {
        rev.classList.add('revealed');
      });
    });


    // 12. Dynamic Team Members Rendering
    var teamGrid = document.getElementById('about-team-grid');
    if (teamGrid) {
      var teamMembers = [];
      if (config.teamMembers) {
        try { teamMembers = JSON.parse(config.teamMembers); } catch (e) { }
      } else if (config.teamName1 || config.teamName2) {
        if (config.teamName1) teamMembers.push({ name: config.teamName1, role: config.teamRole1, bio: config.teamBio1, avatar: config.teamAvatar1 });
        if (config.teamName2) teamMembers.push({ name: config.teamName2, role: config.teamRole2, bio: config.teamBio2, avatar: config.teamAvatar2 });
        if (config.teamName3) teamMembers.push({ name: config.teamName3, role: config.teamRole3, bio: config.teamBio3, avatar: config.teamAvatar3 });
      }

      var html = '';
      teamMembers.forEach(function (m, idx) {
        var delay = idx * 150;
        var imgSrc = resolveImgUrl(m.avatar, 'assets/images/placeholder.jpg');
        html += '<div class="team-card reveal" data-delay="' + delay + '">' +
          '<img class="team-card__avatar" src="' + imgSrc + '" alt="' + (m.name || 'Nghệ nhân') + '" loading="lazy">' +
          '<h3 class="team-card__name">' + (m.name || '') + '</h3>' +
          '<p class="team-card__role">' + (m.role || '') + '</p>' +
          '<div class="team-card__bio">' + (m.bio || '') + '</div>' +
          '</div>';
      });
      teamGrid.innerHTML = html;

      if (typeof window.initScrollReveal === 'function') {
        window.initScrollReveal();
      }
    }

    document.querySelectorAll('.js-config-cv-1-title').forEach(function (el) { el.textContent = config.coreValue1Title; });
    document.querySelectorAll('.js-config-cv-1-desc').forEach(function (el) { el.innerHTML = config.coreValue1Desc; });
    document.querySelectorAll('.js-config-cv-2-title').forEach(function (el) { el.textContent = config.coreValue2Title; });
    document.querySelectorAll('.js-config-cv-2-desc').forEach(function (el) { el.innerHTML = config.coreValue2Desc; });
    document.querySelectorAll('.js-config-cv-3-title').forEach(function (el) { el.textContent = config.coreValue3Title; });
    document.querySelectorAll('.js-config-cv-3-desc').forEach(function (el) { el.innerHTML = config.coreValue3Desc; });
    document.querySelectorAll('.js-config-cv-4-title').forEach(function (el) { el.textContent = config.coreValue4Title; });
    document.querySelectorAll('.js-config-cv-4-desc').forEach(function (el) { el.innerHTML = config.coreValue4Desc; });

    document.querySelectorAll('.js-config-proc-1-title').forEach(function (el) { el.textContent = config.process1Title; });
    document.querySelectorAll('.js-config-proc-1-desc').forEach(function (el) { el.textContent = config.process1Desc; });
    document.querySelectorAll('.js-config-proc-2-title').forEach(function (el) { el.textContent = config.process2Title; });
    document.querySelectorAll('.js-config-proc-2-desc').forEach(function (el) { el.textContent = config.process2Desc; });
    document.querySelectorAll('.js-config-proc-3-title').forEach(function (el) { el.textContent = config.process3Title; });
    document.querySelectorAll('.js-config-proc-3-desc').forEach(function (el) { el.textContent = config.process3Desc; });
    document.querySelectorAll('.js-config-proc-4-title').forEach(function (el) { el.textContent = config.process4Title; });
    document.querySelectorAll('.js-config-proc-4-desc').forEach(function (el) { el.textContent = config.process4Desc; });
    document.querySelectorAll('.js-config-proc-5-title').forEach(function (el) { el.textContent = config.process5Title; });
    document.querySelectorAll('.js-config-proc-5-desc').forEach(function (el) { el.textContent = config.process5Desc; });

    // Hiển thị nội dung sau khi load xong config từ API
    document.body.classList.add('config-loaded');

    // CKEditor inject thêm .reveal — kích hoạt lại scroll reveal trên trang Giới thiệu
    if (typeof window.initScrollReveal === 'function') {
      window.initScrollReveal();
    }
  }

  // ======================================================
  // INIT SCRIPT ON LOAD
  // ======================================================
  async function initAll() {
    // Reveal existing static content immediately so user doesn't see a blank page
    initScrollReveal();
    initLazyImages();

    // Chạy song song cả fetch config và load components (Header/Footer) để tiết kiệm thời gian
    await Promise.all([
      fetchSiteConfig(),
      loadComponents()
    ]);

    applyDynamicConfig();
    initHeader();
    initFooter();
    // Khởi tạo lại cho các thành phần động vừa thêm (nếu có)
    initScrollReveal();
    initLazyImages();
    // Sync cart badge count after header is injected into the DOM.
    // Read directly from localStorage so this works on every page,
    // regardless of whether cart.js is loaded (avoids timing/dependency issues).
    (function syncCartBadge() {
      var badge = document.getElementById('cart-count');
      if (!badge) {
        // Self-healing fallback: construct badge element if it's missing in the DOM (e.g. due to server caching)
        var cartIcon = document.querySelector('.header-action-btn--cart');
        if (cartIcon) {
          badge = document.createElement('span');
          badge.className = 'cart-count-badge';
          badge.id = 'cart-count';
          badge.style.display = 'none';
          badge.textContent = '0';
          cartIcon.appendChild(badge);
        }
      }
      if (!badge) return;
      function update() {
        var count = 0;
        try {
          var cart = JSON.parse(localStorage.getItem('pgt_cart') || '[]');
          count = cart.reduce(function (s, i) { return s + (parseInt(i.qty, 10) || 0); }, 0);
        } catch (e) { }
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
      update();
      document.addEventListener('cart-updated', update);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // ======================================================
  // SEARCH OVERLAY
  // ======================================================
  function initSearch() {
    // Inject overlay HTML once
    if (document.getElementById('search-overlay')) return;

    var overlayHTML =
      '<div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Tìm kiếm sản phẩm">' +
      '<button class="search-overlay__close" id="search-close-btn" aria-label="Đóng tìm kiếm">✕</button>' +
      '<div class="search-overlay__input-wrap">' +
      '<span class="search-overlay__label">Tìm kiếm sản phẩm</span>' +
      '<div class="search-overlay__input-row">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
      '<input class="search-overlay__input" id="search-input" type="search" placeholder="Lộc bình, đồ thờ, tranh gốm…" autocomplete="off" spellcheck="false">' +
      '<button class="search-overlay__clear" id="search-clear-btn" aria-label="Xóa từ khóa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>' +
      '</div>' +
      '<div class="search-overlay__hints">' +
      '<span class="search-overlay__hint-label">Gợi ý:</span>' +
      '<button class="search-overlay__hint-tag" data-hint="Lộc bình">Lộc bình</button>' +
      '<button class="search-overlay__hint-tag" data-hint="Tranh gốm">Tranh gốm</button>' +
      '<button class="search-overlay__hint-tag" data-hint="Đồ thờ">Đồ thờ</button>' +
      '<button class="search-overlay__hint-tag" data-hint="Bình hoa">Bình hoa</button>' +
      '<button class="search-overlay__hint-tag" data-hint="Chum">Chum</button>' +
      '</div>' +
      '</div>' +
      '<div class="search-overlay__results" id="search-results" aria-live="polite"></div>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', overlayHTML);

    var overlay = document.getElementById('search-overlay');
    var input = document.getElementById('search-input');
    var clearBtn = document.getElementById('search-clear-btn');
    var closeBtn = document.getElementById('search-close-btn');
    var resultsEl = document.getElementById('search-results');
    var debounceTimer;

    // Helper: format VND
    function fmt(n) {
      return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
    }

    // Open overlay
    function openSearch() {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { input.focus(); }, 50);
      var triggerBtn = document.getElementById('search-trigger-btn');
      if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'true');
    }

    // Close overlay
    function closeSearch() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      input.value = '';
      clearBtn.classList.remove('visible');
      resultsEl.innerHTML = '';
      var triggerBtn = document.getElementById('search-trigger-btn');
      if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
    }

    // Render results
    function renderResults(products, totalCount, query) {
      if (!products || !products.length) {
        resultsEl.innerHTML =
          '<div class="search-overlay__empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
          '<p>Không tìm thấy kết quả</p>' +
          '<small>Thử tìm với từ khóa khác như "lộc bình", "tranh gốm"</small>' +
          '</div>';
        return;
      }

      var basePath = (function () {
        var pn = window.location.pathname.toLowerCase();
        return (pn === '/user' || pn.startsWith('/user/')) ? '/user/' : '';
      })();

      var countHTML = 
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">' +
        '<p class="search-results__count" style="margin-bottom: 0;">Tìm thấy ' + totalCount + ' sản phẩm cho "' + query + '"</p>' +
        (totalCount > products.length ? '<a href="' + basePath + 'products.html?q=' + encodeURIComponent(query) + '" style="color: var(--color-accent); font-size: 13px; font-weight: 600; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.05em;">Xem tất cả ' + totalCount + ' kết quả &rarr;</a>' : '') +
        '</div>';
      
      var gridDiv = document.createElement('div');
      gridDiv.className = 'search-results__grid';
      
      products.forEach(function (p, i) {
        if (typeof window.buildProductCard === 'function') {
          gridDiv.appendChild(window.buildProductCard(p, i));
        }
      });
      
      resultsEl.innerHTML = countHTML;
      resultsEl.appendChild(gridDiv);
      
      if (typeof window.initScrollReveal === 'function') {
        window.initScrollReveal();
      }
    }

    // Search logic (server-side filter from API)
    function doSearch(query) {
      var q = query.trim();
      if (!q) { resultsEl.innerHTML = ''; return; }

      if (window.PhucGiaTienAPI) {
        window.PhucGiaTienAPI.getProducts({ searchQuery: q, limit: 8 }).then(function (res) {
          var data = res.data || [];
          var total = res.total !== undefined ? res.total : data.length;
          renderResults(data, total, q);
        });
      }
    }

    // Debounced input
    input.addEventListener('input', function () {
      var val = input.value;
      clearBtn.classList.toggle('visible', val.length > 0);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { doSearch(val); }, 280);
    });

    // Handle Enter key
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = input.value.trim();
        if (val) {
          var basePath = (function () {
            var pn = window.location.pathname.toLowerCase();
            return (pn === '/user' || pn.startsWith('/user/')) ? '/user/' : '';
          })();
          window.location.href = basePath + 'products.html?q=' + encodeURIComponent(val);
        }
      }
    });

    // Clear button
    clearBtn.addEventListener('click', function () {
      input.value = '';
      clearBtn.classList.remove('visible');
      resultsEl.innerHTML = '';
      input.focus();
    });

    // Hint tags
    overlay.querySelectorAll('.search-overlay__hint-tag').forEach(function (tag) {
      tag.addEventListener('click', function () {
        input.value = tag.dataset.hint;
        clearBtn.classList.add('visible');
        doSearch(tag.dataset.hint);
      });
    });

    // Close button
    closeBtn.addEventListener('click', closeSearch);

    // Click backdrop to close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });

    // Keyboard: Escape to close, Ctrl/Cmd+K to open
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        overlay.classList.contains('is-open') ? closeSearch() : openSearch();
      }
    });

    // Wire trigger button (may not exist yet if header hasn't loaded)
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('#search-trigger-btn');
      if (btn) openSearch();
    });
  }

  // Run after all components (header) have loaded
  var _origInitAll = initAll;
  // Patch: call initSearch after header is injected
  document.addEventListener('search-ready', initSearch);
  // Fallback: init on DOMContentLoaded + small delay for async header
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initSearch, 600);
  });

  window.showImageModal = function (imgSrc, titleText) {
    if (!imgSrc) return;
    
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    overlay.style.cursor = 'zoom-out';
    
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '32px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '10';
    
    var imgContainer = document.createElement('div');
    imgContainer.style.position = 'relative';
    imgContainer.style.maxWidth = '90%';
    imgContainer.style.maxHeight = '80%';
    imgContainer.style.display = 'flex';
    imgContainer.style.flexDirection = 'column';
    imgContainer.style.alignItems = 'center';
    
    var img = document.createElement('img');
    img.src = imgSrc;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '70vh';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    img.style.cursor = 'default';
    
    imgContainer.appendChild(img);
    
    if (titleText) {
      var title = document.createElement('div');
      title.textContent = titleText;
      title.style.color = '#fff';
      title.style.marginTop = '16px';
      title.style.fontSize = '18px';
      title.style.fontWeight = '500';
      title.style.textAlign = 'center';
      imgContainer.appendChild(title);
    }
    
    overlay.appendChild(closeBtn);
    overlay.appendChild(imgContainer);
    
    document.body.appendChild(overlay);
    
    // Trigger animation
    requestAnimationFrame(function() {
      overlay.style.opacity = '1';
    });
    
    var removeModal = function() {
      overlay.style.opacity = '0';
      setTimeout(function() {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    };
    
    overlay.addEventListener('click', function(e) {
      if (e.target !== img) {
        removeModal();
      }
    });
    
    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        removeModal();
        document.removeEventListener('keydown', escListener);
      }
    });
  };

})();

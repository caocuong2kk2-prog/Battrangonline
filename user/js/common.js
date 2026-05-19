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
    if (headerPh) {
      try {
        const res = await fetch(getComponentPath('header.html'));
        if (res.ok) {
          const html = await res.text();
          headerPh.insertAdjacentHTML('beforebegin', html);
          const newHeader = document.getElementById('site-header');
          if (newHeader) {
            if (headerPh.className) {
              newHeader.className = headerPh.className;
            }
            // Fix relative images and links in the header for subfolder root compatibility
            const pathname = window.location.pathname.toLowerCase();
            if (pathname === '/user' || pathname.startsWith('/user/')) {
              newHeader.querySelectorAll('img').forEach(function (img) {
                const src = img.getAttribute('src');
                if (src && !src.startsWith('http') && !src.startsWith('/')) {
                  img.src = '/user/' + src;
                }
              });
              newHeader.querySelectorAll('a').forEach(function (a) {
                const href = a.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) {
                  a.href = '/user/' + href;
                }
              });
            }
          }
          headerPh.remove();
        }
      } catch (err) {
        console.error('Failed to load header', err);
      }
    }

    const footerPh = document.getElementById('footer-placeholder');
    if (footerPh) {
      try {
        const res = await fetch(getComponentPath('footer.html'));
        if (res.ok) {
          const html = await res.text();
          footerPh.insertAdjacentHTML('beforebegin', html);
          const newFooter = document.getElementById('site-footer');
          if (newFooter) {
            // Fix relative images and links in the footer for subfolder root compatibility
            const pathname = window.location.pathname.toLowerCase();
            if (pathname === '/user' || pathname.startsWith('/user/')) {
              newFooter.querySelectorAll('img').forEach(function (img) {
                const src = img.getAttribute('src');
                if (src && !src.startsWith('http') && !src.startsWith('/')) {
                  img.src = '/user/' + src;
                }
              });
              newFooter.querySelectorAll('a').forEach(function (a) {
                const href = a.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) {
                  a.href = '/user/' + href;
                }
              });
            }
          }
          footerPh.remove();
        }
      } catch (err) {
        console.error('Failed to load footer', err);
      }
    }
  }

  // ======================================================
  // 1. HEADER: sticky scroll effect + mobile nav toggle
  // ======================================================
  function initHeader() {
    const header = document.getElementById('site-header');
    const navToggle = document.querySelector('.nav-toggle');
    const siteNav = document.getElementById('site-nav');

    // Sticky header on scroll
    function handleHeaderScroll() {
      if (!header) return;
      if (window.scrollY > 60) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    handleHeaderScroll(); // run on load

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
    let currentPage = window.location.pathname.split('/').pop() || 'index.html';
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
  }

  // ======================================================
  // 2. FOOTER: Year, BackToTop, Newsletter
  // ======================================================
  function initFooter() {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const btn = document.getElementById('back-to-top');
    if (btn) {
      window.addEventListener('scroll', window.debounce(function () {
        btn.style.opacity = window.scrollY > 500 ? '1' : '0';
        btn.style.pointerEvents = window.scrollY > 500 ? 'auto' : 'none';
      }, 100), { passive: true });

      btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    var form = document.getElementById('footer-newsletter-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailInput = document.getElementById('newsletter-email');
        var submitBtn  = document.getElementById('newsletter-submit-btn');
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
  // 3. OTHER GLOBALS (Toast, LazyLoad, Debounce, ScrollReveal)
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
    const style = document.createElement('style');
    style.textContent =
      '.reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }' +
      '.reveal.revealed { opacity: 1; transform: translateY(0); }' +
      '.reveal-left  { opacity:0; transform:translateX(-28px); transition:opacity 0.65s ease,transform 0.65s ease; }' +
      '.reveal-left.revealed { opacity:1; transform:translateX(0); }' +
      '.reveal-right { opacity:0; transform:translateX(28px); transition:opacity 0.65s ease,transform 0.65s ease; }' +
      '.reveal-right.revealed { opacity:1; transform:translateX(0); }';
    document.head.appendChild(style);

    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!els.length || !window.IntersectionObserver) {
      els.forEach(function (el) { el.classList.add('revealed'); });
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

  // ======================================================
  // INIT SCRIPT ON LOAD
  // ======================================================
  async function initAll() {
    await loadComponents();
    initHeader();
    initFooter();
    initScrollReveal();
    initLazyImages();
    // Sync cart badge count after header is injected into the DOM
    if (window.CartAPI) {
      var badge = document.getElementById('cart-count');
      if (badge) {
        var count = window.CartAPI.getCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();

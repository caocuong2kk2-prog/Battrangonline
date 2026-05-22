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
        const res = await fetch(getComponentPath('header.html') + '?v=' + new Date().getTime());
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
          document.dispatchEvent(new Event('search-ready'));
        }
      } catch (err) {
        console.error('Failed to load header', err);
      }
    }

    const footerPh = document.getElementById('footer-placeholder');
    if (footerPh) {
      try {
        const res = await fetch(getComponentPath('footer.html') + '?v=' + new Date().getTime());
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

    // ── Self-healing user button ──────────────────────────────────────────
    // Đảm bảo icon user luôn tồn tại dù header.html bị cache cũ
    const headerActions = header.querySelector('.header-actions');
    let userBtn = header.querySelector('.header-action-btn--user');

    if (!userBtn && headerActions) {
      // Tạo và inject user button vào DOM
      userBtn = document.createElement('a');
      userBtn.className = 'header-action-btn header-action-btn--user';
      userBtn.href = 'login.html';
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
    if (window.AuthService && userBtn) {
      const user = window.AuthService.getCurrentUser();
      if (user) {
        userBtn.removeAttribute('href');
        userBtn.classList.add('is-logged-in');
        const initial = (user.firstName || user.name || 'U').charAt(0).toUpperCase();
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'Người dùng';

        // Fix href của dropdown links khi đang ở /user/ subfolder
        const trackingHref = window.location.pathname.startsWith('/user/')
          ? '/user/order-tracking.html'
          : 'order-tracking.html';

        userBtn.innerHTML = `
          <div class="user-avatar-wrap">
            <div class="user-avatar">${initial}</div>
            <div class="user-dropdown-menu">
              <div class="user-dropdown-header">
                <span class="user-name">${fullName}</span>
                <span class="user-email">${user.email}</span>
              </div>
              <div class="user-dropdown-body">
                <a href="#" class="user-dropdown-item">Tài khoản của tôi</a>
                <a href="${trackingHref}" class="user-dropdown-item">Đơn mua</a>
                <button type="button" class="user-dropdown-item btn-logout" onclick="AuthService.logout()">Đăng xuất</button>
              </div>
            </div>
          </div>
        `;
      } else {
        // Không đăng nhập: fix href cho /user/ subfolder
        if (window.location.pathname.startsWith('/user/')) {
          userBtn.href = '/user/login.html';
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
      let lastScrollY = window.scrollY;
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
  // 3. AUTH SERVICE (Mock DB using LocalStorage)
  // ======================================================
  window.AuthService = {
    getUsers: function() {
      return JSON.parse(localStorage.getItem('mock_users') || '[]');
    },
    saveUsers: function(users) {
      localStorage.setItem('mock_users', JSON.stringify(users));
    },
    getCurrentUser: function() {
      return JSON.parse(localStorage.getItem('current_user') || 'null');
    },
    login: function(email, password) {
      const users = this.getUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        localStorage.setItem('current_user', JSON.stringify(user));
        return { success: true, user: user };
      }
      return { success: false, message: 'Email hoặc mật khẩu không chính xác.' };
    },
    register: function(userData) {
      const users = this.getUsers();
      if (users.find(u => u.email === userData.email)) {
        return { success: false, message: 'Email đã được sử dụng.' };
      }
      users.push(userData);
      this.saveUsers(users);
      return { success: true };
    },
    logout: function() {
      localStorage.removeItem('current_user');
      window.showToast('Đã đăng xuất thành công!', 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
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

  // ======================================================
  // GLOBAL CONFIGURATION SYSTEM
  // ======================================================
  var CONFIG_KEY = 'pgt_site_config';
  var DEFAULT_CONFIG = {
    storeName: "Phúc Gia Tiên – Gốm Sứ Thủ Công Bát Tràng",
    slogan: "Tinh hoa gốm sứ Bát Tràng truyền đời",
    phone: "0986 123 456",
    email: "phucgatien@gmail.com",
    address: "Thôn Bát Tràng, Xã Bát Tràng, Huyện Gia Lâm, Hà Nội",
    facebook: "https://facebook.com/phucgatien",
    youtube: "https://youtube.com/@phucgatien",
    tiktok: "https://tiktok.com/@phucgatien",
    zalo: "https://zalo.me/0986123456",
    messenger: "https://m.me/phucgatien",
    shipFee: 0,
    shipMin: 5000000,
    shipDays: "3-7 ngày",
    shipArea: "Toàn quốc",
    logoUrl: "assets/images/logo.png",
    homeBanner: "assets/images/home_bg.jpeg",
    pageBanner: "assets/images/journey-hero.jpg",
    homeStoryImg: "assets/images/story-couple.jpg",
    aboutStoryImg: "assets/images/about-workshop.jpg",
    teamAvatar1: "assets/images/team-husband.jpg",
    teamAvatar2: "assets/images/team-wife.jpg",
    workingHours: "08:00 - 18:00 (Từ Thứ 2 - Chủ Nhật)",
    mapIframe: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3725.564539824403!2d105.93206497607736!3d20.969992790299602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135aef2f534125b%3A0xe54e3d3b76ca40c3!2zUGjDumMgR2lhIFRpw6puIC0gR-G7kW0gU-G7qyBCw6F0IFRyw6BuZw!5e0!3m2!1svi!2s!4v1716260000000!5m2!1svi!2s" width="100%" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>',
    aboutStoryTitle: "Từ Đam Mê<br>Đến <em>Thương Hiệu</em>",
    aboutStoryText1: "Phúc Gia Tiên ra đời từ tình yêu thuần khiết với nghề gốm thủ công Bát Tràng. Từ năm 2018, hai vợ chồng chúng tôi bắt đầu học nghề, và đến nay đã xây dựng được một xưởng gốm uy tín với hàng trăm mẫu sản phẩm độc đáo.",
    aboutStoryText2: "Mỗi sản phẩm từ Phúc Gia Tiên đều được tạo ra hoàn toàn thủ công – từ khâu nhào đất, tạo hình, vẽ hoa văn đến tráng men và nung trong lò ở nhiệt độ 1.200°C. Chúng tôi cam kết mang đến những tác phẩm gốm sứ chất lượng cao, giữ trọn giá trị nghề truyền thống.",
    homeStoryQuote: "2 vợ chồng – 1 xưởng –<br>1 hành trình",
    homeStoryText: "Chúng tôi bắt đầu từ con số 0. Tự tay học nghề, tự làm, tự thất bại và đứng dậy. Phúc Gia Tiên không chỉ làm gốm, chúng tôi tạo ra giá trị để truyền lại cho thế hệ sau.",
    statYears: "4+",
    statProducts: "1000+",
    statCustomers: "500+",
    teamName1: "Nguyễn Văn Phúc",
    teamRole1: "Nghệ Nhân Chính",
    teamBio1: "Phụ trách tạo hình và nung gốm. Hơn 6 năm kinh nghiệm với bàn xoay và lò nung truyền thống Bát Tràng.",
    teamName2: "Lê Thị Tiên",
    teamRole2: "Nghệ Nhân Vẽ & Sáng Tạo",
    teamBio2: "Phụ trách vẽ hoa văn và sáng tạo mẫu mới. Mỗi nét vẽ là một câu chuyện được kể trên đất sét.",
    coreValue1Title: "Chất Lượng",
    coreValue1Desc: "Đặt chất lượng lên hàng đầu. Mỗi sản phẩm qua kiểm tra kỹ càng, cam kết 100% gốm sứ thủ công chính hiệu.",
    coreValue2Title: "Tận Tâm",
    coreValue2Desc: "Làm việc bằng cả trái tim. Từng nét vẽ, từng công đoạn đều được chú tâm và cẩn thận nhất.",
    coreValue3Title: "Sáng Tạo",
    coreValue3Desc: "Không ngừng đổi mới. Kết hợp họa tiết truyền thống với thiết kế hiện đại, mỗi sản phẩm là một tác phẩm độc đáo.",
    coreValue4Title: "Uy Tín",
    coreValue4Desc: "Giữ chữ tín với khách hàng. Hỗ trợ tận tình và chính sách đổi trả minh bạch, rõ ràng.",
    process1Title: "1. Chuẩn bị đất",
    process1Desc: "Chọn lựa và nhào đất sét Bát Tràng đúng độ dẻo",
    process2Title: "2. Tạo hình",
    process2Desc: "Vuốt đất trên bàn xoay bằng đôi bàn tay điêu luyện",
    process3Title: "3. Vẽ tay",
    process3Desc: "Trang trí hoa văn truyền thống bằng bút lông thủ công",
    process4Title: "4. Nung lò",
    process4Desc: "Nung ở nhiệt độ 1.280°C trong lò truyền thống",
    process5Title: "5. Hoàn thiện",
    process5Desc: "Kiểm tra, đánh bóng và đóng gói tác phẩm hoàn hảo"
  };

  // Load config & expose globally
  var currentConfig = {};
  try {
    currentConfig = JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
  } catch (e) {}
  window.PGT_CONFIG = Object.assign({}, DEFAULT_CONFIG, currentConfig);

  // Apply configuration values dynamically to annotated DOM elements
  function applyDynamicConfig() {
    var config = window.PGT_CONFIG;
    var rawPhone = config.phone.replace(/\s+/g, '');

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
      el.textContent = config.phone;
    });

    // 3. Email link updates
    document.querySelectorAll('.js-config-email-link').forEach(function (el) {
      el.href = 'mailto:' + config.email;
    });

    // 4. Email display text updates
    document.querySelectorAll('.js-config-email-text').forEach(function (el) {
      el.textContent = config.email;
    });

    // 5. Address display text updates
    document.querySelectorAll('.js-config-address-text').forEach(function (el) {
      el.innerHTML = config.address.replace(/\n/g, '<br>');
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
      el.textContent = config.storeName;
    });
    document.querySelectorAll('.js-config-slogan').forEach(function (el) {
      el.textContent = config.slogan;
    });
    document.querySelectorAll('.js-config-slogan-text').forEach(function (el) {
      el.textContent = config.slogan;
    });

    // 8. Working hours updates
    document.querySelectorAll('.js-config-working-hours').forEach(function (el) {
      el.textContent = config.workingHours;
    });

    // 9. Map iframe updates
    document.querySelectorAll('.js-config-map-iframe').forEach(function (el) {
      el.innerHTML = config.mapIframe;
    });

    // 10. Image/Banner updates
    document.querySelectorAll('.js-config-logo').forEach(function (el) {
      el.src = config.logoUrl;
    });
    document.querySelectorAll('.js-config-home-banner-img').forEach(function (el) {
      el.src = config.homeBanner;
    });
    document.querySelectorAll('.js-config-page-banner-img').forEach(function (el) {
      el.src = config.pageBanner;
    });
    document.querySelectorAll('.js-config-home-story-img').forEach(function (el) {
      el.src = config.homeStoryImg || 'assets/images/story-couple.jpg';
    });
    document.querySelectorAll('.js-config-about-story-img').forEach(function (el) {
      el.src = config.aboutStoryImg || 'assets/images/about-workshop.jpg';
    });
    document.querySelectorAll('.js-config-team-1-img').forEach(function (el) {
      el.src = config.teamAvatar1 || 'assets/images/team-husband.jpg';
    });
    document.querySelectorAll('.js-config-team-2-img').forEach(function (el) {
      el.src = config.teamAvatar2 || 'assets/images/team-wife.jpg';
    });

    // 11. New Dynamic Contents
    document.querySelectorAll('.js-config-home-story-quote').forEach(function(el) { el.innerHTML = config.homeStoryQuote; });
    document.querySelectorAll('.js-config-home-story-text').forEach(function(el) { el.innerHTML = config.homeStoryText; });
    
    document.querySelectorAll('.js-config-about-story-title').forEach(function(el) { el.innerHTML = config.aboutStoryTitle; });
    document.querySelectorAll('.js-config-about-story-text-1').forEach(function(el) { el.innerHTML = config.aboutStoryText1; });
    document.querySelectorAll('.js-config-about-story-text-2').forEach(function(el) { el.innerHTML = config.aboutStoryText2; });
    
    document.querySelectorAll('.js-config-stat-years').forEach(function(el) { el.textContent = config.statYears; });
    document.querySelectorAll('.js-config-stat-products').forEach(function(el) { el.textContent = config.statProducts; });
    document.querySelectorAll('.js-config-stat-customers').forEach(function(el) { el.textContent = config.statCustomers; });
    
    document.querySelectorAll('.js-config-team-1-name').forEach(function(el) { el.textContent = config.teamName1; });
    document.querySelectorAll('.js-config-team-1-role').forEach(function(el) { el.textContent = config.teamRole1; });
    document.querySelectorAll('.js-config-team-1-bio').forEach(function(el) { el.innerHTML = config.teamBio1; });
    
    document.querySelectorAll('.js-config-team-2-name').forEach(function(el) { el.textContent = config.teamName2; });
    document.querySelectorAll('.js-config-team-2-role').forEach(function(el) { el.textContent = config.teamRole2; });
    document.querySelectorAll('.js-config-team-2-bio').forEach(function(el) { el.innerHTML = config.teamBio2; });

    document.querySelectorAll('.js-config-cv-1-title').forEach(function(el) { el.textContent = config.coreValue1Title; });
    document.querySelectorAll('.js-config-cv-1-desc').forEach(function(el) { el.innerHTML = config.coreValue1Desc; });
    document.querySelectorAll('.js-config-cv-2-title').forEach(function(el) { el.textContent = config.coreValue2Title; });
    document.querySelectorAll('.js-config-cv-2-desc').forEach(function(el) { el.innerHTML = config.coreValue2Desc; });
    document.querySelectorAll('.js-config-cv-3-title').forEach(function(el) { el.textContent = config.coreValue3Title; });
    document.querySelectorAll('.js-config-cv-3-desc').forEach(function(el) { el.innerHTML = config.coreValue3Desc; });
    document.querySelectorAll('.js-config-cv-4-title').forEach(function(el) { el.textContent = config.coreValue4Title; });
    document.querySelectorAll('.js-config-cv-4-desc').forEach(function(el) { el.innerHTML = config.coreValue4Desc; });

    document.querySelectorAll('.js-config-proc-1-title').forEach(function(el) { el.textContent = config.process1Title; });
    document.querySelectorAll('.js-config-proc-1-desc').forEach(function(el) { el.textContent = config.process1Desc; });
    document.querySelectorAll('.js-config-proc-2-title').forEach(function(el) { el.textContent = config.process2Title; });
    document.querySelectorAll('.js-config-proc-2-desc').forEach(function(el) { el.textContent = config.process2Desc; });
    document.querySelectorAll('.js-config-proc-3-title').forEach(function(el) { el.textContent = config.process3Title; });
    document.querySelectorAll('.js-config-proc-3-desc').forEach(function(el) { el.textContent = config.process3Desc; });
    document.querySelectorAll('.js-config-proc-4-title').forEach(function(el) { el.textContent = config.process4Title; });
    document.querySelectorAll('.js-config-proc-4-desc').forEach(function(el) { el.textContent = config.process4Desc; });
    document.querySelectorAll('.js-config-proc-5-title').forEach(function(el) { el.textContent = config.process5Title; });
    document.querySelectorAll('.js-config-proc-5-desc').forEach(function(el) { el.textContent = config.process5Desc; });
  }

  // ======================================================
  // INIT SCRIPT ON LOAD
  // ======================================================
  async function initAll() {
    await loadComponents();
    applyDynamicConfig();
    initHeader();
    initFooter();
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
          count = cart.reduce(function(s, i) { return s + (parseInt(i.qty, 10) || 0); }, 0);
        } catch(e) {}
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

    var overlay     = document.getElementById('search-overlay');
    var input       = document.getElementById('search-input');
    var clearBtn    = document.getElementById('search-clear-btn');
    var closeBtn    = document.getElementById('search-close-btn');
    var resultsEl   = document.getElementById('search-results');
    var debounceTimer;

    // Helper: format VND
    function fmt(n) {
      return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
    }

    // Open overlay
    function openSearch() {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(function() { input.focus(); }, 50);
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
    function renderResults(products, query) {
      if (!products || !products.length) {
        resultsEl.innerHTML =
          '<div class="search-overlay__empty">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
            '<p>Không tìm thấy kết quả</p>' +
            '<small>Thử tìm với từ khóa khác như "lộc bình", "tranh gốm"</small>' +
          '</div>';
        return;
      }

      var basePath = (function() {
        var pn = window.location.pathname.toLowerCase();
        return (pn === '/user' || pn.startsWith('/user/')) ? '/user/' : '';
      })();

      var countHTML = '<p class="search-results__count">Tìm thấy ' + products.length + ' sản phẩm cho "' + query + '"</p>';
      var gridHTML  = '<div class="search-results__grid">';
      products.forEach(function(p) {
        var img  = (p.images && p.images[0]) ? basePath + p.images[0] : basePath + 'assets/images/placeholder.jpg';
        var href = basePath + 'product-detail.html?slug=' + p.slug;
        gridHTML +=
          '<a class="search-result-card" href="' + href + '">' +
            '<img class="search-result-card__img" src="' + img + '" alt="' + p.name + '" loading="lazy">' +
            '<div class="search-result-card__body">' +
              '<p class="search-result-card__name">' + p.name + '</p>' +
              '<p class="search-result-card__price">' + fmt(p.price) + '</p>' +
            '</div>' +
          '</a>';
      });
      gridHTML += '</div>';
      resultsEl.innerHTML = countHTML + gridHTML;
    }

    // Search logic (client-side filter from API)
    function doSearch(query) {
      var q = query.trim().toLowerCase();
      if (!q) { resultsEl.innerHTML = ''; return; }

      if (window.PhucGiaTienAPI) {
        window.PhucGiaTienAPI.getProducts({ limit: 100 }).then(function(res) {
          var filtered = (res.data || []).filter(function(p) {
            return p.name.toLowerCase().includes(q) ||
                   (p.category || '').toLowerCase().includes(q) ||
                   (p.material || '').toLowerCase().includes(q) ||
                   (p.style || '').toLowerCase().includes(q);
          });
          renderResults(filtered, query.trim());
        });
      }
    }

    // Debounced input
    input.addEventListener('input', function() {
      var val = input.value;
      clearBtn.classList.toggle('visible', val.length > 0);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() { doSearch(val); }, 280);
    });

    // Clear button
    clearBtn.addEventListener('click', function() {
      input.value = '';
      clearBtn.classList.remove('visible');
      resultsEl.innerHTML = '';
      input.focus();
    });

    // Hint tags
    overlay.querySelectorAll('.search-overlay__hint-tag').forEach(function(tag) {
      tag.addEventListener('click', function() {
        input.value = tag.dataset.hint;
        clearBtn.classList.add('visible');
        doSearch(tag.dataset.hint);
      });
    });

    // Close button
    closeBtn.addEventListener('click', closeSearch);

    // Click backdrop to close
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeSearch();
    });

    // Keyboard: Escape to close, Ctrl/Cmd+K to open
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        overlay.classList.contains('is-open') ? closeSearch() : openSearch();
      }
    });

    // Wire trigger button (may not exist yet if header hasn't loaded)
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('#search-trigger-btn');
      if (btn) openSearch();
    });
  }

  // Run after all components (header) have loaded
  var _origInitAll = initAll;
  // Patch: call initSearch after header is injected
  document.addEventListener('search-ready', initSearch);
  // Fallback: init on DOMContentLoaded + small delay for async header
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSearch, 600);
  });

})();

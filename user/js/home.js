// ============================================
// home.js - Homepage logic
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function () {
  'use strict';

  // --------------------------------------------------
  // 1. FEATURED PRODUCTS - conveyor belt (12 cards, infinite loop)
  // --------------------------------------------------
  // --------------------------------------------------
  // 1. FEATURED PRODUCTS - conveyor belt with active drag & button controls
  // --------------------------------------------------
  function renderFeaturedProducts() {
    var conveyor = document.getElementById('home-product-conveyor');
    var track = document.getElementById('home-product-track');
    if (!conveyor || !track) return;

    PhucGiaTienAPI.getFeaturedProducts(12).then(function (products) {
      // Xóa skeleton
      track.innerHTML = '';

      try {
        // Build 12 cards gốc
        products.forEach(function (p, i) {
          if (typeof window.buildProductCard === 'function') {
            track.appendChild(window.buildProductCard(p, i));
          }
        });

        if (products.length === 0) {
          track.innerHTML = '<p style="color:var(--color-text-muted);padding:2rem;text-align:center">Không có sản phẩm nào.</p>';
        } else {
          // Clone toàn bộ sang bên phải để làm mỏ neo vòng lặp cuộn vô tận
          var originals = Array.from(track.children);
          originals.forEach(function (card) {
            var clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');

            // Re-bind article click
            clone.addEventListener('click', function () {
              if (clone.dataset.slug) {
                window.location.href = '/' + clone.dataset.slug;
              }
            });

            // Re-bind giỏ hàng trên card clone
            var btn = clone.querySelector('.product-card__btn-cart');
            if (btn) {
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!window.CartAPI) return;
                var pData = JSON.parse(this.dataset.product || '{}');
                if (!pData.id) return;
                if (pData.variants && pData.variants.length > 1) {
                  window.location.href = '/' + pData.slug;
                  return;
                }
                var v = (pData.variants && pData.variants.length === 1) ? pData.variants[0] : null;
                var price = v ? v.price : (pData.price || 0);
                var sizeParts = [];
                if (v) {
                  if (v.sizeName || v.size) sizeParts.push(v.sizeName || v.size);
                  if (v.patternName) sizeParts.push(v.patternName);
                  if (v.colorName) sizeParts.push(v.colorName);
                  if (v.productTypeName) sizeParts.push(v.productTypeName);
                  if (v.materialName) sizeParts.push(v.materialName);
                }
                var sizeStr = sizeParts.join(' · ') || null;
                var images = (v && v.images && v.images.length > 0) ? v.images : (pData.images || []);
                window.CartAPI.addItem({ id: pData.id, slug: pData.slug, name: pData.name, price: price, size: sizeStr, images: images, gifts: pData.gifts || [] }, 1, e);
              });
            }

            track.appendChild(clone);
          });

          // Bắt đầu setup logic điều khiển thông minh
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              setupConveyorControls(conveyor, track);
              if (typeof window.initScrollReveal === 'function') window.initScrollReveal();
            });
          });
        }
      } catch (err) {
        track.innerHTML = '<p style="color:red;padding:2rem;">Lỗi build thẻ: ' + err.message + '</p>';
      }

    }).catch(function (err) {
      var t = document.getElementById('home-product-track');
      if (t) t.innerHTML = '<p style="color:red;padding:2rem;text-align:center">Lỗi API: ' + err.message + '</p>';
      console.error(err);
    });
  }

  function setupConveyorControls(conveyor, track) {
    var isDown = false;
    var startX;
    var scrollLeftStart;
    var isPaused = false;
    var isAnimating = false; // Đánh dấu khi đang chạy animation nút bấm
    var autoScrollSpeed = 0.6; // px mỗi frame
    var resumeTimeout = null;
    var animationFrameId = null;

    // Chiều rộng của 1 nửa track (phần 12 sản phẩm gốc)
    var trackHalfW = track.scrollWidth / 2;

    // 1. Tự động cuộn trôi êm ái
    var virtualScrollLeft = conveyor.scrollLeft;
    var wasPaused = false;

    function autoScroll() {
      var currentlyPaused = isPaused || isDown || isAnimating;
      
      if (currentlyPaused) {
        wasPaused = true;
      } else {
        if (wasPaused) {
          // Chỉ đồng bộ lại tọa độ 1 lần duy nhất sau khi người dùng tương tác xong (kéo thả, click)
          virtualScrollLeft = conveyor.scrollLeft;
          wasPaused = false;
        }
        
        virtualScrollLeft += autoScrollSpeed;

        if (virtualScrollLeft >= trackHalfW) {
          virtualScrollLeft -= trackHalfW;
        }
        
        conveyor.scrollLeft = virtualScrollLeft;
      }

      animationFrameId = requestAnimationFrame(autoScroll);
    }

    animationFrameId = requestAnimationFrame(autoScroll);

    // Dừng trôi khi di chuột vào hoặc chạm tay
    conveyor.addEventListener('mouseenter', function () { isPaused = true; });
    conveyor.addEventListener('mouseleave', function () { if (!isDown) isPaused = false; });
    conveyor.addEventListener('touchstart', function () { isPaused = true; }, { passive: true });
    conveyor.addEventListener('touchend', function () {
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(function () { isPaused = false; }, 1500);
    }, { passive: true });

    // 2. Kéo thả chuột để trượt (Drag to Scroll) kèm Infinite Wrap thông minh
    conveyor.addEventListener('mousedown', function (e) {
      isDown = true;
      isPaused = true;
      startX = e.pageX - conveyor.offsetLeft;
      scrollLeftStart = conveyor.scrollLeft;
      clearTimeout(resumeTimeout);
    });

    window.addEventListener('mouseup', function () {
      if (!isDown) return;
      isDown = false;
      resumeTimeout = setTimeout(function () { isPaused = false; }, 1500);
    });

    conveyor.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - conveyor.offsetLeft;
      var walk = (x - startX) * 1.5; // độ nhạy kéo
      var newScrollLeft = scrollLeftStart - walk;

      // Wrap tọa độ gốc ngay khi đang kéo để có thể kéo vô tận không bao giờ chạm tường
      if (newScrollLeft >= trackHalfW) {
        newScrollLeft -= trackHalfW;
        scrollLeftStart -= trackHalfW;
      } else if (newScrollLeft <= 0) {
        newScrollLeft += trackHalfW;
        scrollLeftStart += trackHalfW;
      }

      conveyor.scrollLeft = newScrollLeft;
    });

    // 3. Smooth Scroll Engine bằng JS - Giải quyết triệt để lỗi rung màn hình ở biên
    function smoothScrollToTarget(changeAmount, duration) {
      var start = conveyor.scrollLeft;
      var startTime = performance.now();
      isAnimating = true;
      isPaused = true;

      function animateScroll(currentTime) {
        var elapsed = currentTime - startTime;
        var progress = Math.min(elapsed / duration, 1);

        // Công thức easeOutQuad cho tốc độ mượt mà tăng giảm êm ái
        var ease = progress * (2 - progress);
        var currentPos = start + changeAmount * ease;

        // Wrap mỏ neo tọa độ mượt mà ngay trong quá trình chuyển động
        if (currentPos >= trackHalfW) {
          currentPos -= trackHalfW;
          start -= trackHalfW; // Tịnh tiến điểm xuất phát để giữ nguyên đà trượt
        } else if (currentPos <= 0) {
          currentPos += trackHalfW;
          start += trackHalfW; // Tịnh tiến điểm xuất phát
        }

        conveyor.scrollLeft = currentPos;

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          isAnimating = false;
          clearTimeout(resumeTimeout);
          resumeTimeout = setTimeout(function () { isPaused = false; }, 1500);
        }
      }

      requestAnimationFrame(animateScroll);
    }

    var prevBtn = document.getElementById('conveyor-prev-btn');
    var nextBtn = document.getElementById('conveyor-next-btn');
    var slideStep = 334; // 1 card (310px) + gap (24px)

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (isAnimating) return; // Tránh spam click chồng chéo animation
        smoothScrollToTarget(-slideStep, 500); // Trượt trong 500ms
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (isAnimating) return;
        smoothScrollToTarget(slideStep, 500);
      });
    }
  }


  // --------------------------------------------------
  // 2. PROCESS STEPS - animate on scroll
  // --------------------------------------------------
  function initProcessSteps() {
    var steps = document.querySelectorAll('.process-step');
    steps.forEach(function (step, i) {
      step.classList.add('reveal');
      step.dataset.delay = String(i * 120);
    });
  }

  // --------------------------------------------------
  // 3. HERO PARALLAX (subtle)
  // --------------------------------------------------
  function initHeroParallax() {
    var heroBg = document.querySelector('.hero__bg-img');
    if (!heroBg) return;

    window.addEventListener('scroll', window.debounce(function () {
      var scrollY = window.scrollY;
      if (scrollY < window.innerHeight) {
        heroBg.style.transform = 'scale(1.07) translateY(' + (scrollY * 0.25) + 'px)';
      }
    }, 10), { passive: true });
  }

  // --------------------------------------------------
  // 4. FEATURE BADGES - stagger reveal
  // --------------------------------------------------
  function initFeatureBadges() {
    var badges = document.querySelectorAll('.feature-badge');
    badges.forEach(function (badge, i) {
      badge.classList.add('reveal');
      badge.dataset.delay = String(i * 100);
    });
  }

  // --------------------------------------------------
  // 5. CTA PHONE COPY (click to copy phone)
  // --------------------------------------------------
  function initCtaPhone() {
    var phoneLinks = document.querySelectorAll('.cta-banner__phone, .footer-contact-list__item--phone');
    phoneLinks.forEach(function (el) {
      el.style.cursor = 'pointer';
      el.title = 'Nhấn để sao chép số điện thoại';
      el.addEventListener('click', function () {
        var phone = el.dataset.phone || el.textContent.trim().replace(/[^0-9+]/g, '');
        if (navigator.clipboard && phone) {
          navigator.clipboard.writeText(phone).then(function () {
            window.showToast('Đã sao chép: ' + phone, 'success');
          });
        }
      });
    });
  }

  // --------------------------------------------------
  // 6. HERO SCROLL BUTTON — cuộn xuống mượt mà kiểu luxury
  // --------------------------------------------------
  function smoothScrollTo(targetY, duration) {
    var startY = window.scrollY;
    var distance = targetY - startY;
    var startTime = null;

    // easeInOutQuart: khởi động chậm → tăng tốc → dừng rất êm ái
    function easeInOutQuart(t) {
      return t < 0.5
        ? 8 * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    function step(currentTime) {
      if (!startTime) startTime = currentTime;
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var ease = easeInOutQuart(progress);

      window.scrollTo(0, startY + distance * ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function initHeroScrollBtn() {
    var btn = document.getElementById('hero-scroll-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var target = document.getElementById('hero-next-section');
      if (!target) {
        target = document.querySelector('.hero ~ section');
      }
      if (!target) return;

      var header = document.getElementById('site-header');
      var headerH = header ? header.offsetHeight : 72;
      var targetY = target.getBoundingClientRect().top + window.scrollY - headerH;

      // 900ms — đủ chậm để cảm nhận chuyển động, không gây mất kiên nhẫn
      smoothScrollTo(targetY, 900);
    });
  }

  // --------------------------------------------------
  // INIT
  // --------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    renderFeaturedProducts();
    initProcessSteps();
    initHeroParallax();
    initFeatureBadges();
    initCtaPhone();
    initHeroScrollBtn();
  });

})();

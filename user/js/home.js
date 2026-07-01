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

      // Build 12 cards gốc
      products.forEach(function (p) {
        track.appendChild(buildHomeProductCard(p));
      });

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
        setupConveyorControls(conveyor, track);
      });

    }).catch(function (err) {
      var t = document.getElementById('home-product-track');
      if (t) t.innerHTML = '<p style="color:var(--color-text-muted);padding:2rem;text-align:center">Không thể tải sản phẩm.</p>';
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
    function autoScroll() {
      if (!isPaused && !isDown && !isAnimating) {
        conveyor.scrollLeft += autoScrollSpeed;
      }

      // Chỉ wrap tự động khi không kéo chuột và không chạy animation của nút
      if (!isAnimating && !isDown) {
        if (conveyor.scrollLeft >= trackHalfW) {
          conveyor.scrollLeft -= trackHalfW;
        }
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

  function buildHomeProductCard(p) {
    var article = document.createElement('article');
    article.className = 'product-card';
    article.dataset.slug = p.slug;

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

    var pVariants = Array.isArray(p.variants) ? p.variants : []; var pImages = Array.isArray(p.images) ? p.images : (typeof p.images === "string" && p.images.trim() ? [p.images] : []); var allImages = pImages.concat(pVariants.reduce(function (acc, v) { var vImgs = Array.isArray(v.images) ? v.images : (typeof v.images === "string" && v.images.trim() ? [v.images] : []); return acc.concat(vImgs); }, [])).filter(function (img) { return typeof img === 'string' && img.trim() !== ''; });
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

    var giftHTML = '';
    if (Array.isArray(p.gifts) && p.gifts.length > 0) {
      var giftNames = p.gifts.map(function (g) { return g.name; }).join(' + ');
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
      ((basePrice <= 0)
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

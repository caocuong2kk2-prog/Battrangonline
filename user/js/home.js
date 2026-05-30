// ============================================
// home.js - Homepage logic
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function () {
  'use strict';

  // --------------------------------------------------
  // 1. FEATURED PRODUCTS - conveyor belt (6 cards, infinite loop)
  // --------------------------------------------------
  // --------------------------------------------------
  // 1. FEATURED PRODUCTS - conveyor belt with active drag & button controls
  // --------------------------------------------------
  function renderFeaturedProducts() {
    var conveyor = document.getElementById('home-product-conveyor');
    var track = document.getElementById('home-product-track');
    if (!conveyor || !track) return;

    PhucGiaTienAPI.getFeaturedProducts(6).then(function (products) {
      // Xóa skeleton
      track.innerHTML = '';

      // Build 6 cards gốc
      products.forEach(function (p) {
        track.appendChild(buildHomeProductCard(p));
      });

      // Clone toàn bộ sang bên phải để làm mỏ neo vòng lặp cuộn vô tận
      var originals = Array.from(track.children);
      originals.forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        
        // Re-bind giỏ hàng trên card clone
        var btn = clone.querySelector('.home-product-card__btn-cart');
        if (btn) {
          var pData = JSON.parse(btn.dataset.product || '{}');
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (!window.CartAPI || !pData.id) return;
            if (pData.variants && pData.variants.length > 1) {
              window.location.href = 'product-detail.html?slug=' + pData.slug;
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
            window.CartAPI.addItem({ id: pData.id, slug: pData.slug, name: pData.name, price: price, size: sizeStr, images: images }, 1, e);
          });
        }
        
        // Re-bind xem chi tiết trên card clone
        var detBtn = clone.querySelector('.home-product-card__btn-detail');
        if (detBtn) {
          detBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            window.location.href = 'product-detail.html?slug=' + detBtn.dataset.slug;
          });
        }
        
        track.appendChild(clone);
      });

      // Bắt đầu setup logic điều khiển thông minh
      setupConveyorControls(conveyor, track);

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

    // Chiều rộng của 1 nửa track (phần 6 sản phẩm gốc)
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
        } else if (conveyor.scrollLeft <= 0) {
          conveyor.scrollLeft += trackHalfW;
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
    article.className = 'home-product-card';
    article.style.cursor = 'pointer';
    article.addEventListener('click', function () {
      window.location.href = 'product-detail.html?slug=' + p.slug;
    });

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

    var badgeHTML = '';
    if (p.status === 'inactive') {
      badgeHTML = '<span class="home-product-card__badge" style="background:#e07070;">Hết hàng</span>';
    } else if (p.badge) {
      badgeHTML = '<span class="home-product-card__badge">' + p.badge + '</span>';
    }

    // Stars: dùng rating từ data hoặc ngẫu nhiên 4-5 sao
    var rating = p.rating || (4 + Math.floor(Math.random() * 2));
    var starsHTML = '';
    for (var i = 1; i <= 5; i++) {
      starsHTML += '<span class="home-product-card__star' +
        (i > rating ? ' home-product-card__star--empty' : '') + '">&#9733;</span>';
    }

    var basePriceVal = p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0);
    var priceDisplayHTML = basePriceVal === 0 
      ? '<a href="contact.html" class="price-contact" style="text-decoration:none;" onclick="event.stopPropagation();">LIÊN HỆ</a>' 
      : '<span class="home-product-card__price">' + window.formatVND(basePriceVal) + '</span>';

    // Serialize product data để dùng trên clone
    var pSafe = JSON.stringify({
      id: p.id, slug: p.slug, name: p.name, price: basePriceVal, images: allImages,
      variants: (p.variants || []).map(function(v) {
        return { price: v.price, images: v.images, sizeName: v.sizeName, size: v.size, patternName: v.patternName, colorName: v.colorName, productTypeName: v.productTypeName, materialName: v.materialName };
      })
    }).replace(/'/g, '&#39;');

    var subImagesHtml = '';
    if (allImages.length > 1) {
      subImagesHtml = '<div class="home-product-card__sub-images" style="position:absolute; bottom:10px; left:0; width:100%; display:flex; justify-content:center; gap:6px; opacity:0; transition: opacity 0.3s ease; z-index:3;">' +
        allImages.slice(0, 4).map(function(img, i) { 
            var isVid = !!img.match(/\.(mp4|mov|avi|webm|ogg)$/i);
            var isVidStr = isVid ? 'true' : 'false';
            var hoverScript = "var m = this.closest('.home-product-card__media'); var hi = m.querySelector('.home-product-card__hover'); var hv = m.querySelector('.home-product-card__hover-vid'); if("+isVidStr+"){ if(hv){ hv.src='"+img+"'; hv.style.opacity='1'; } if(hi) hi.style.opacity='0'; } else { if(hi){ hi.src='"+img+"'; hi.style.opacity='1'; } if(hv){ hv.style.opacity='0'; hv.src=''; } }";
            return isVid 
              ? '<video src="' + img + '" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:2px solid ' + (i===0 ? '#C8922A' : 'rgba(255,255,255,0.8)') + '; background:#fff; cursor:pointer;" muted onmouseover="' + hoverScript + '"></video>' 
              : '<img src="' + img + '" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:2px solid ' + (i===0 ? '#C8922A' : 'rgba(255,255,255,0.8)') + '; background:#fff; cursor:pointer;" onmouseover="' + hoverScript + '" />'; 
        }).join('') +
      '</div>';
    }

    var primaryMediaHtml = isLocalVid 
      ? '<video class="home-product-card__img" src="' + firstMedia + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>'
      : '<img class="home-product-card__img" src="' + imgSrc + '" alt="' + p.name + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;">';
    
    var hoverLayerHtml = '<img class="home-product-card__hover" src="" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;opacity:0;z-index:1;transition:opacity 0.2s;pointer-events:none;">' +
                         '<video class="home-product-card__hover-vid" src="" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;opacity:0;z-index:1;transition:opacity 0.2s;pointer-events:none;"></video>';

    // Dùng div cho media (tránh nested <a> không hợp lệ)
    article.innerHTML =
      '<div class="home-product-card__media" onmouseenter="var sub=this.querySelector(\'.home-product-card__sub-images\'); if(sub) sub.style.opacity=\'1\';" onmouseleave="var sub=this.querySelector(\'.home-product-card__sub-images\'); if(sub) sub.style.opacity=\'0\'; var hi=this.querySelector(\'.home-product-card__hover\'); if(hi){hi.style.opacity=\'0\'; hi.src=\'\';} var hv=this.querySelector(\'.home-product-card__hover-vid\'); if(hv){hv.style.opacity=\'0\'; hv.src=\'\';}">' +
        badgeHTML +
        primaryMediaHtml +
        hoverLayerHtml +
        subImagesHtml +
        '<div class="home-product-card__action">' +
          '<div class="home-product-card__action-row">' +
            ((p.status === 'inactive')
              ? '<button class="home-product-card__btn-cart" disabled style="background:#f5f5f5;color:#999;border-color:#e0e0e0;cursor:not-allowed;">Tạm hết hàng</button>'
              : ((basePriceVal === 0)
                  ? '<button class="home-product-card__btn-cart" style="background:#d32f2f;color:#fff;border-color:#d32f2f;" onclick="window.location.href=\'contact.html\'; event.stopPropagation();">LIÊN HỆ</button>'
                  : '<button class="home-product-card__btn-cart" data-product=\'' + pSafe + '\'>' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                      '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
                      '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
                    '</svg>' +
                    'Thêm giỏ hàng' +
                    '</button>'
                )
            ) +
            '<button class="home-product-card__btn-detail" title="Xem chi tiết" data-slug="' + p.slug + '">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="home-product-card__body">' +
        '<h3 class="home-product-card__name">' + p.name + '</h3>' +
        '<div class="home-product-card__price-row">' +
          priceDisplayHTML +
        '</div>' +
      '</div>';

    // Bind nút thêm giỏ hàng
    var cartBtn = article.querySelector('.home-product-card__btn-cart');
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

    // Bind nút xem chi tiết
    var detailBtn = article.querySelector('.home-product-card__btn-detail');
    if (detailBtn) {
      detailBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.location.href = 'product-detail.html?slug=' + p.slug;
      });
    }

    // Click vào media hoặc card body → navigate
    var media = article.querySelector('.home-product-card__media');
    if (media) {
      media.style.cursor = 'pointer';
      media.addEventListener('click', function (e) {
        if (!e.target.closest('.home-product-card__action')) {
          window.location.href = 'product-detail.html?slug=' + p.slug;
        }
      });
    }

    article.addEventListener('click', function (e) {
      if (!e.target.closest('.home-product-card__media') && !e.target.closest('button')) {
        window.location.href = 'product-detail.html?slug=' + p.slug;
      }
    });

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

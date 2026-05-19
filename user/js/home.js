// ============================================
// home.js - Homepage logic
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function () {
  'use strict';

  // --------------------------------------------------
  // 1. FEATURED PRODUCTS - render 4 cards on homepage
  // --------------------------------------------------
  function renderFeaturedProducts() {
    var grid = document.getElementById('home-product-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';

    PhucGiaTienAPI.getFeaturedProducts(4).then(function (products) {
      grid.innerHTML = '';
      products.forEach(function (p) {
        var card = buildProductCard(p);
        grid.appendChild(card);
      });
    }).catch(function (err) {
      grid.innerHTML = '<p style="color:var(--color-text-muted);text-align:center">Không thể tải sản phẩm.</p>';
      console.error(err);
    });
  }

  function buildProductCard(p) {
    var article = document.createElement('article');
    article.className = 'product-card reveal';
    article.dataset.delay = '0';

    var badgeHTML = p.badge
      ? '<span class="product-card__badge">' + p.badge + '</span>'
      : '';

    var imgSrc = (p.images && p.images[0]) ? p.images[0] : 'assets/images/placeholder.jpg';

    article.innerHTML =
      '<a class="product-card__media" href="product-detail.html?slug=' + p.slug + '" aria-label="' + p.name + '">' +
      badgeHTML +
      '<img class="product-card__img" src="' + imgSrc + '" alt="' + p.name + '" loading="lazy">' +
      '<div class="product-card__overlay">' +
      '<span class="product-card__quick-view">Xem Chi Tiết</span>' +
      '</div>' +
      '</a>' +
      '<div class="product-card__body">' +
      '<h3 class="product-card__name">' + p.name + '</h3>' +
      '<p class="product-card__price">' + window.formatVND(p.price) + '</p>' +
      '</div>';

    article.addEventListener('click', function (e) {
      if (!e.target.closest('a')) {
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
  // INIT
  // --------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    renderFeaturedProducts();
    initProcessSteps();
    initHeroParallax();
    initFeatureBadges();
    initCtaPhone();
  });

})();

// promo.js - Khuyến mãi khai trương — Phiên bản Premium

(function () {
  // ─── Ngày kết thúc sẽ được lấy từ API ────────────────────────

  // ─── Load promo CSS as a file instead of injecting inline styles ───
  if (!document.getElementById('promo-styles')) {
    var p = window.location.pathname.toLowerCase();
    var base = (p === '/user' || p.startsWith('/user/')) ? '/user/' : '';
    const link = document.createElement('link');
    link.id = 'promo-styles';
    link.rel = 'stylesheet';
    link.href = base + 'css/promo.css?v=20260707_fix42';
    document.head.appendChild(link);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.PhucGiaTienAPI) return;

    window.PhucGiaTienAPI.getActiveCampaign()
      .then(function (campaign) {
        if (!campaign || !campaign.id) return;
        initPromo(campaign);
      })
      .catch(function (err) {
        console.log('No active campaign.');
      });

    function initPromo(campaign) {
      const START_DATE = new Date(campaign.startDate);
      const END_DATE = new Date(campaign.endDate);
      const now = new Date();
      const isUpcoming = now < START_DATE;

      const campaignName = campaign.name || 'Sự Kiện Đặc Biệt';
      const discount = campaign.discountPercent || 10;
      const desc = campaign.description || `Gốm Phúc Gia Tiên giảm ngay <strong>${discount}%</strong> toàn bộ sản phẩm gốm sứ chế tác thủ công cao cấp. Hệ thống sẽ tự động áp dụng ưu đãi khi thanh toán.`;
      const targetUrl = campaign.targetUrl || 'products.html';

      const bannerLabel = isUpcoming ? 'Sắp diễn ra — Bắt đầu sau:' : `Giảm đến <strong style="color:#d4a853;">${discount}%</strong> — Kết thúc sau:`;
      const bannerCta = isUpcoming ? 'XEM TRƯỚC' : 'MUA NGAY';

      // ══════════════════════════════════════════════
      // 1. TOP PROMO BANNER
      // ══════════════════════════════════════════════
      const banner = document.createElement('div');
      banner.id = 'top-promo-banner';
      banner.innerHTML = `
        <div id="promo-banner-inner">
          <div class="promo-banner__sparks">✦ ${campaignName.toUpperCase()} ✦</div>
          <div class="promo-banner__label" id="promo-banner-label">${bannerLabel}</div>
          <div id="promo-countdown">
          <span class="promo-cd-unit"><span id="promo-days" class="promo-cd-num">00</span><span class="promo-cd-lbl">Ngày</span></span>
          <span class="promo-cd-unit"><span id="promo-hours" class="promo-cd-num">00</span><span class="promo-cd-lbl">Giờ</span></span>
          <span class="promo-cd-unit"><span id="promo-minutes" class="promo-cd-num">00</span><span class="promo-cd-lbl">Phút</span></span>
          <span class="promo-cd-unit"><span id="promo-seconds" class="promo-cd-num">00</span><span class="promo-cd-lbl">Giây</span></span>
        </div>
          <a href="${targetUrl}" class="promo-banner__cta">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span id="promo-banner-btn-text">${bannerCta}</span>
          </a>
        </div>
      `;

      // Chèn vào trước body.firstChild, đảm bảo không có khoảng trắng
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.insertBefore(banner, document.body.firstChild);

      // Đẩy header xuống dưới banner và bù padding-top nội dung trang
      function getHeader() {
        return document.getElementById('site-header');
      }

      let cachedBannerHeight = 0;

      function applyBannerHeight(height) {
        cachedBannerHeight = height;
        document.documentElement.style.setProperty('--promo-banner-height', cachedBannerHeight + 'px');
        // Notify other scripts (like common.js) of the height update
        document.dispatchEvent(new CustomEvent('promo-banner-ready', { detail: { height: height } }));
      }

      // Use ResizeObserver to detect banner height changes without forcing reflow
      if (typeof ResizeObserver !== 'undefined') {
        const bannerObserver = new ResizeObserver(function (entries) {
          for (const entry of entries) {
            const newHeight = entry.contentRect.height;
            if (newHeight !== cachedBannerHeight) {
              applyBannerHeight(newHeight);
            }
          }
        });
        bannerObserver.observe(banner);
      } else {
        // Fallback: measure once after layout settles
        requestAnimationFrame(function () {
          applyBannerHeight(banner.offsetHeight);
        });
      }

      // Vì header được tải bất đồng bộ qua common.js fetch, ta cần thử cập nhật định kỳ cho đến khi header xuất hiện
      let checkHeaderInterval = setInterval(function () {
        if (getHeader()) {
          // Header appeared — let ResizeObserver handle height, just clear the interval
          clearInterval(checkHeaderInterval);
        }
      }, 50);

      // Countdown for banner
      function updateBannerCountdown() {
        const now = new Date();
        let isUpcoming = now < START_DATE;
        let targetDate = isUpcoming ? START_DATE : END_DATE;
        let diff = targetDate - now;

        if (diff <= 0 && isUpcoming) {
          isUpcoming = false;
          targetDate = END_DATE;
          diff = targetDate - now;
          const lbl = document.getElementById('promo-banner-label');
          if (lbl) lbl.innerHTML = `Giảm đến <strong style="color:#d4a853;">${discount}%</strong> — Kết thúc sau:`;
          const btnText = document.getElementById('promo-banner-btn-text');
          if (btnText) btnText.innerText = 'MUA NGAY';
        }

        if (diff <= 0) return;
        const d = Math.floor(diff / 864e5);
        const h = Math.floor((diff / 36e5) % 24);
        const m = Math.floor((diff / 6e4) % 60);
        const s = Math.floor((diff / 1e3) % 60);
        const el = (id) => document.getElementById(id);
        if (el('promo-days')) el('promo-days').textContent = String(d).padStart(2, '0');
        if (el('promo-hours')) el('promo-hours').textContent = String(h).padStart(2, '0');
        if (el('promo-minutes')) el('promo-minutes').textContent = String(m).padStart(2, '0');
        if (el('promo-seconds')) el('promo-seconds').textContent = String(s).padStart(2, '0');
      }
      updateBannerCountdown();
      setInterval(updateBannerCountdown, 1000);

      // ══════════════════════════════════════════════
      let promoPopupShown = false;
      try {
        promoPopupShown = sessionStorage.getItem('promoPopupShown');
      } catch (e) {}
      if (promoPopupShown) return;

      setTimeout(function () {
        const overlay = document.createElement('div');
        overlay.id = 'promo-popup-overlay';

        let bannerHtml = '';
        if (campaign.bannerImage) {
          let imgUrl = campaign.bannerImage;

          // Make sure upload path begins with a slash
          let uploadIdx = imgUrl.indexOf('uploads/');
          if (uploadIdx !== -1) {
            imgUrl = '/' + imgUrl.substring(uploadIdx);
          }

          if (imgUrl.startsWith('/uploads/')) {
            let dynamicBase = '';

            if (window.PhucGiaTienAPI && window.PhucGiaTienAPI.apiBase && window.PhucGiaTienAPI.apiBase.startsWith('http')) {
              dynamicBase = window.PhucGiaTienAPI.apiBase.replace(/\/api\/?$/, '');
            } else if ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055') {
              dynamicBase = 'http://localhost:5055';
            }

            imgUrl = dynamicBase + imgUrl;
          } else if (!imgUrl.startsWith('http')) {
            let dynamicBase = '';
            if (window.PhucGiaTienAPI && window.PhucGiaTienAPI.apiBase && window.PhucGiaTienAPI.apiBase.startsWith('http')) {
              dynamicBase = window.PhucGiaTienAPI.apiBase.replace(/\/api\/?$/, '');
            }
            imgUrl = dynamicBase + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
          }
          let resolvedImgUrl = imgUrl;
          let srcsetAttr = '';
          if (typeof window.resolveImgUrl === 'function') {
            let urlMobile = window.resolveImgUrl(imgUrl, imgUrl, 360, 70);
            let urlDesktop = window.resolveImgUrl(imgUrl, imgUrl, 600, 75);
            resolvedImgUrl = urlDesktop;
            srcsetAttr = `srcset="${urlMobile} 360w, ${urlDesktop} 600w" sizes="(max-width: 600px) 342px, 600px"`;
          }
          bannerHtml = `<img src="${resolvedImgUrl}" ${srcsetAttr} class="promo-popup__image" alt="Promo" width="600" height="300" decoding="async">`;
        }

        const popupTitle = isUpcoming ? `Sắp diễn ra<span> ${campaignName}</span>` : `Ưu đãi<span> ${campaignName}</span>`;
        const popupCta = isUpcoming ? 'Xem trước ưu đãi' : 'Mua Sắm Ngay';

        overlay.innerHTML = `
        <div id="promo-popup-card">
          <button class="promo-popup__close" id="close-promo-popup" aria-label="Đóng">&times;</button>
          ${bannerHtml}
          <div class="promo-popup__content-wrapper">
            <div class="promo-popup__body">
              <div class="promo-popup__eyebrow">✦ Sự kiện đặc biệt ✦</div>
              <h2 class="promo-popup__title" id="popup-title">${popupTitle}</h2>
              
              <p class="promo-popup__desc">
                ${desc}
              </p>
              
              <div class="promo-popup__countdown">
                <div class="promo-cd-block"><span id="popup-days" class="promo-cd-block__num">00</span><span class="promo-cd-block__lbl">Ngày</span></div>
                <div class="promo-cd-block"><span id="popup-hours" class="promo-cd-block__num">00</span><span class="promo-cd-block__lbl">Giờ</span></div>
                <div class="promo-cd-block"><span id="popup-mins" class="promo-cd-block__num">00</span><span class="promo-cd-block__lbl">Phút</span></div>
                <div class="promo-cd-block"><span id="popup-secs" class="promo-cd-block__num">00</span><span class="promo-cd-block__lbl">Giây</span></div>
              </div>
              
              <a href="${targetUrl}" id="btn-explore-promo" class="promo-popup__cta">
                <span id="popup-btn-text">${popupCta}</span>
              </a>
              <div class="promo-popup__fine-print">* Áp dụng cho mọi đơn hàng trong thời gian sự kiện</div>
            </div>
          </div>
        </div>
      `;

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            const card = document.getElementById('promo-popup-card');
            if (card) card.style.opacity = '1';
          });
        });

        // Popup countdown
        function updatePopupCountdown() {
          const now = new Date();
          let isUpcomingPopup = now < START_DATE;
          let targetDate = isUpcomingPopup ? START_DATE : END_DATE;
          let diff = targetDate - now;

          if (diff <= 0 && isUpcomingPopup) {
            isUpcomingPopup = false;
            targetDate = END_DATE;
            diff = targetDate - now;
            const pTitle = document.getElementById('popup-title');
            if (pTitle) pTitle.innerHTML = `Ưu đãi<span> ${campaignName}</span>`;
            const pBtn = document.getElementById('popup-btn-text');
            if (pBtn) pBtn.innerText = 'Mua Sắm Ngay';
          }

          if (diff <= 0) {
            clearInterval(popupTimer);
            return;
          }
          const d = Math.floor(diff / 864e5);
          const h = Math.floor((diff / 36e5) % 24);
          const m = Math.floor((diff / 6e4) % 60);
          const s = Math.floor((diff / 1e3) % 60);
          const el = (id) => document.getElementById(id);
          if (el('popup-days')) el('popup-days').textContent = String(d).padStart(2, '0');
          if (el('popup-hours')) el('popup-hours').textContent = String(h).padStart(2, '0');
          if (el('popup-mins')) el('popup-mins').textContent = String(m).padStart(2, '0');
          if (el('popup-secs')) el('popup-secs').textContent = String(s).padStart(2, '0');
        }
        updatePopupCountdown();
        const popupTimer = setInterval(updatePopupCountdown, 1000);

        // Close logic
        function closePopup() {
          const card = document.getElementById('promo-popup-card');
          overlay.style.opacity = '0';
          if (card) { card.style.opacity = '0'; }
          clearInterval(popupTimer);
          setTimeout(() => overlay.remove(), 450);
          try {
            sessionStorage.setItem('promoPopupShown', 'true');
          } catch (e) {}
        }

        document.getElementById('close-promo-popup').addEventListener('click', closePopup);
        document.getElementById('btn-explore-promo').addEventListener('click', closePopup);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });

      }, 1800); // Hiện sau 1.8 giây
    } // End initPromo
  });
})();

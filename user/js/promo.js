// promo.js - Khuyến mãi khai trương — Phiên bản Premium

(function () {
  // ─── Ngày kết thúc sẽ được lấy từ API ────────────────────────

  // ─── Inject CSS keyframes ─────────────────────────────────────────────
  if (!document.getElementById('promo-styles')) {
    const style = document.createElement('style');
    style.id = 'promo-styles';
    style.textContent = `
      /* ---- TOP PROMO BANNER ---- */
      body.page-body {
        transition: padding-top 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      #site-header {
        transition: background 0.3s ease, box-shadow 0.3s ease !important;
      }
      #top-promo-banner {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1001;
        background: linear-gradient(90deg, #1a0f05 0%, #2c1a08 25%, #1a0f05 50%, #2c1a08 75%, #1a0f05 100%);
        border-bottom: 1px solid rgba(200,146,42,0.4);
        padding: 0;
        overflow: hidden;
        margin: 0;
        transform: translateY(-100%);
        animation: slideDownBanner 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes slideDownBanner {
        to { transform: translateY(0); }
      }
      #top-promo-banner::before {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(200,146,42,0.04) 60px, rgba(200,146,42,0.04) 61px);
        pointer-events: none;
      }
      #promo-banner-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        padding: 9px 20px;
        flex-wrap: wrap;
        position: relative;
        z-index: 1;
      }
      .promo-banner__sparks {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #d4a853;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        font-family: var(--font-body, 'Be Vietnam Pro', sans-serif);
      }
      .promo-banner__sparks::before,
      .promo-banner__sparks::after {
        content: '';
        display: inline-block;
        width: 24px;
        height: 1px;
        background: linear-gradient(90deg, transparent, #d4a853);
      }
      .promo-banner__sparks::after {
        background: linear-gradient(90deg, #d4a853, transparent);
      }
      .promo-banner__label {
        color: #fff;
        font-size: 12.5px;
        font-weight: 500;
        font-family: var(--font-body, 'Be Vietnam Pro', sans-serif);
        letter-spacing: 0.04em;
        opacity: 0.7;
      }
      #promo-countdown {
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        background: rgba(212,168,83,0.12);
        border: 1px solid rgba(212,168,83,0.3);
        border-radius: 4px;
        padding: 3px 12px;
        letter-spacing: 0.05em;
      }
      .promo-cd-unit {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
      }
      .promo-cd-num { color: #d4a853; }
      .promo-cd-lbl { color: rgba(255,255,255,0.6); font-size: 10px; font-weight: 500; text-transform: lowercase; font-family: var(--font-body, sans-serif); }
      .promo-banner__cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #d4a853, #b8862f);
        color: #1a0f05;
        padding: 5px 16px;
        border-radius: 3px;
        text-decoration: none;
        font-weight: 800;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-family: var(--font-body, 'Be Vietnam Pro', sans-serif);
        box-shadow: 0 2px 10px rgba(212,168,83,0.3);
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .promo-banner__cta:hover {
        background: linear-gradient(135deg, #e8c070, #d4a853);
        box-shadow: 0 4px 18px rgba(212,168,83,0.5);
        transform: translateY(-1px);
      }
      
      /* ---- PAGE BODY OVERRIDE ---- */
      .page-body {
        padding-top: calc(var(--header-height) + var(--promo-banner-height, 0px)) !important;
      }

      /* ---- POPUP ---- */
      #promo-popup-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      #promo-popup-overlay::before {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(10,6,2,0.88);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      #promo-popup-card {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 600px;
        background: #110904;
        border-radius: 16px;
        overflow: hidden;
        transform: scale(0.88) translateY(30px);
        transition: all 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow:
          0 0 0 1px rgba(212,168,83,0.3),
          0 40px 80px rgba(0,0,0,0.8);
        display: flex;
        flex-direction: column;
      }
      .promo-popup__image {
        width: 100%;
        height: auto;
        max-height: 350px;
        object-fit: contain;
        display: block;
        background: #1a0f05;
        border-bottom: 1px solid rgba(212,168,83,0.2);
      }
      .promo-popup__content-wrapper {
        width: 100%;
        position: relative;
        background: linear-gradient(155deg, #1e1008 0%, #110904 100%);
      }
      .promo-popup__close {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 20;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        line-height: 1;
      }
      .promo-popup__close:hover {
        background: rgba(212,168,83,0.15);
        border-color: rgba(212,168,83,0.5);
        color: #d4a853;
        transform: rotate(90deg);
      }
      .promo-popup__body {
        position: relative;
        z-index: 1;
        padding: 32px 40px 36px;
        text-align: center;
      }
      .promo-popup__eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: #d4a853;
        margin-bottom: 12px;
        font-family: var(--font-body, sans-serif);
      }
      .promo-popup__title {
        font-family: var(--font-heading, 'Cormorant Garamond', serif);
        font-size: 36px;
        font-weight: 600;
        color: #fff;
        line-height: 1.2;
        margin-bottom: 16px;
        letter-spacing: 0.02em;
      }
      .promo-popup__title span {
        color: #d4a853;
        font-style: italic;
      }
      .promo-popup__desc {
        font-size: 14px;
        color: rgba(255,255,255,0.65);
        line-height: 1.6;
        margin-bottom: 24px;
        font-family: var(--font-body, sans-serif);
      }
      .promo-popup__desc strong {
        color: #d4a853;
        font-size: 16px;
        font-weight: 700;
      }
      .promo-popup__countdown {
        display: flex;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        margin-bottom: 28px;
      }
      .promo-cd-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px 14px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 4px;
        min-width: 60px;
      }
      .promo-cd-block__num {
        font-family: 'Courier New', monospace;
        font-size: 24px;
        font-weight: 700;
        color: #fff;
        line-height: 1;
        margin-bottom: 4px;
      }
      .promo-cd-block__lbl {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #d4a853;
        font-family: var(--font-body, sans-serif);
      }
      .promo-popup__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #c8922a 0%, #d4a853 40%, #e8c470 70%, #d4a853 100%);
        background-size: 200% 100%;
        color: #1a0f05;
        text-decoration: none;
        font-weight: 800;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        padding: 16px 40px;
        border-radius: 2px;
        font-family: var(--font-body, 'Be Vietnam Pro', sans-serif);
        box-shadow: 0 6px 20px rgba(212,168,83,0.25);
        transition: all 0.35s ease;
        width: 100%;
      }
      .promo-popup__cta:hover {
        background-position: 100% 0;
        box-shadow: 0 10px 30px rgba(212,168,83,0.4);
        transform: translateY(-2px);
      }
      .promo-popup__fine-print {
        margin-top: 16px;
        font-size: 11px;
        color: rgba(255,255,255,0.25);
        font-family: var(--font-body, sans-serif);
      }
      @media (max-width: 768px) {
        #promo-popup-card { width: 92%; max-width: 440px; }
        .promo-popup__image { max-height: 220px; }
        .promo-popup__body { padding: 28px 20px 30px; }
        .promo-popup__title { font-size: 28px; }
        .promo-cd-block { min-width: 50px; padding: 8px; }
        .promo-cd-block__num { font-size: 20px; }
        #promo-banner-inner { gap: 10px; padding: 8px 12px; }
        .promo-banner__sparks { font-size: 10px; }
      }
    `;
    document.head.appendChild(style);
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

      function updateLayout() {
        const header = getHeader();
        if (!header) return;
        const bh = banner.offsetHeight;
        const scrolled = window.scrollY;

        // Header luôn ngay dưới banner khi chưa cuộn qua banner
        if (scrolled >= bh) {
          header.style.top = '0px';
        } else {
          header.style.top = (bh - scrolled) + 'px';
        }
      }

      function applyInitialLayout() {
        const header = getHeader();
        if (!header) return;

        const bh = banner.offsetHeight;

        // Set header ngay dưới banner
        header.style.top = bh + 'px';

        // Tạo biến CSS để các element khác tự đẩy xuống (như .page-body)
        document.documentElement.style.setProperty('--promo-banner-height', bh + 'px');
      }

      // Vì header được tải bất đồng bộ qua common.js fetch, ta cần thử cập nhật định kỳ cho đến khi header xuất hiện
      let checkHeaderInterval = setInterval(function () {
        if (getHeader()) {
          applyInitialLayout();
          updateLayout();
          clearInterval(checkHeaderInterval);
        }
      }, 50);

      // Timeout phòng hờ nếu header load quá nhanh
      setTimeout(applyInitialLayout, 50);
      window.addEventListener('scroll', updateLayout, { passive: true });
      window.addEventListener('resize', function () {
        applyInitialLayout();
        updateLayout();
      }, { passive: true });

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
      // 2. POPUP — chỉ hiện 1 lần/session
      // ══════════════════════════════════════════════
      if (sessionStorage.getItem('promoPopupShown')) return;

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
          bannerHtml = `<img src="${imgUrl}" class="promo-popup__image" alt="Promo" width="600" height="300" decoding="async">`;
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
            document.getElementById('promo-popup-card').style.transform = 'scale(1) translateY(0)';
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
          if (card) { card.style.transform = 'scale(0.9) translateY(20px)'; }
          clearInterval(popupTimer);
          setTimeout(() => overlay.remove(), 450);
          sessionStorage.setItem('promoPopupShown', 'true');
        }

        document.getElementById('close-promo-popup').addEventListener('click', closePopup);
        document.getElementById('btn-explore-promo').addEventListener('click', closePopup);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });

      }, 1800); // Hiện sau 1.8 giây
    } // End initPromo
  });
})();

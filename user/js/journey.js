// journey.js – Client-side Journey Page Controller
// Reads admin_journey_topics + admin_journey_videos from localStorage
// and renders dynamic tab navigation + video card grid.
(function () {
  'use strict';

  // ── Default fallback data (mirrors admin-data.js defaults) ──
  var DEFAULT_TOPICS = [
    { id: 'xay-dung', name: 'Quá Trình Xây Dựng' },
    { id: 'hau-truong', name: 'Hậu Trường Xưởng Gốm' },
    { id: 'cau-chuyen', name: 'Câu Chuyện Nghệ Nhân' }
  ];

  var DEFAULT_VIDEOS = [
    { id: 1, topicId: 'xay-dung', title: 'Khởi công xây dựng lò nung gốm truyền thống', url: 'https://www.youtube.com/embed/zR7-eH01WFM', duration: '03:45', thumbnail: 'assets/images/home_bg.jpeg' },
    { id: 2, topicId: 'hau-truong', title: 'Kỹ thuật vuốt vẽ bình hoa sen nghệ thuật', url: 'https://www.youtube.com/embed/zR7-eH01WFM', duration: '05:12', thumbnail: 'assets/images/about-workshop.jpg' },
    { id: 3, topicId: 'cau-chuyen', title: 'Tâm sự làm nghề gốm sứ truyền đời Bát Tràng', url: 'https://www.youtube.com/embed/zR7-eH01WFM', duration: '08:30', thumbnail: 'assets/images/journey-hero.jpg' }
  ];

  // ── Helpers ──
  function loadTopics() {
    try { return JSON.parse(localStorage.getItem('admin_journey_topics') || 'null') || DEFAULT_TOPICS; }
    catch (e) { return DEFAULT_TOPICS; }
  }

  function loadVideos() {
    try { return JSON.parse(localStorage.getItem('admin_journey_videos') || 'null') || DEFAULT_VIDEOS; }
    catch (e) { return DEFAULT_VIDEOS; }
  }

  // Extract YouTube embed URL if plain watch URL given
  function toEmbedUrl(url) {
    if (!url) return '';
    var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];
    return url;
  }

  // Active tab ID
  var activeTopicId = 'tat-ca';

  // ── Render Tabs ──
  function renderTabs(topics) {
    var container = document.getElementById('journey-tabs-container');
    if (!container) return;

    var allBtn = '<button class="story-tab-btn' + (activeTopicId === 'tat-ca' ? ' active' : '') +
      '" role="tab" data-tab="tat-ca" aria-selected="' + (activeTopicId === 'tat-ca') + '" id="tab-tat-ca">Tất cả</button>';

    var topicBtns = topics.map(function (t) {
      var isActive = activeTopicId === t.id;
      return '<button class="story-tab-btn' + (isActive ? ' active' : '') +
        '" role="tab" data-tab="' + t.id +
        '" aria-selected="' + isActive +
        '" id="tab-' + t.id + '">' + t.name + '</button>';
    }).join('');

    container.innerHTML = allBtn + topicBtns;

    // Bind tab click events
    container.querySelectorAll('.story-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTopicId = this.dataset.tab;
        renderTabs(topics);
        renderVideos(topics, loadVideos());
      });
    });
  }

  // ── Render Videos ──
  function renderVideos(topics, videos) {
    var container = document.getElementById('journey-videos-container');
    if (!container) return;

    var filtered = activeTopicId === 'tat-ca'
      ? videos
      : videos.filter(function (v) { return v.topicId === activeTopicId; });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:60px 0;color:rgba(255,255,255,0.4);">' +
        '<p style="font-size:1.1rem;">Chưa có video nào trong chủ đề này.</p>' +
        '</div>';
      return;
    }

    var cardsHtml = filtered.map(function (v, idx) {
      var thumb = v.thumbnail || 'assets/images/journey-hero.jpg';
      var embedUrl = toEmbedUrl(v.url);
      var delay = idx * 100;
      var topic = topics.find(function (t) { return t.id === v.topicId; });
      var topicLabel = topic ? topic.name : '';

      return '<div class="video-card reveal" data-delay="' + delay + '" data-embed="' + embedUrl + '">' +
        '<img class="video-card__thumb" src="' + thumb + '" alt="' + v.title + '" loading="lazy" onerror="this.src=\'assets/images/journey-hero.jpg\'">' +
        '<div class="video-card__overlay">' +
          '<div class="video-card__play" aria-label="Phát video">▶</div>' +
          '<span class="video-card__duration">' + (v.duration || '') + '</span>' +
        '</div>' +
        (topicLabel && activeTopicId === 'tat-ca'
          ? '<span style="position:absolute;top:10px;left:10px;background:rgba(200,146,42,0.85);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.04em;">' + topicLabel + '</span>'
          : '') +
        '<p class="video-card__title">' + v.title + '</p>' +
        '</div>';
    }).join('');

    container.innerHTML = '<div class="video-grid">' + cardsHtml + '</div>';

    // Bind click-to-play: open modal lightbox
    container.querySelectorAll('.video-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var embedUrl = this.dataset.embed;
        if (!embedUrl) return;
        openVideoModal(embedUrl);
      });
    });

    // Re-trigger reveal animation
    triggerReveal();
  }

  // ── Video Lightbox Modal ──
  function openVideoModal(embedUrl) {
    var existing = document.getElementById('journey-video-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'journey-video-modal';
    modal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(0,0,0,0.9)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'animation:jvmFadeIn 0.3s ease'
    ].join(';');

    modal.innerHTML =
      '<style>@keyframes jvmFadeIn{from{opacity:0}to{opacity:1}}</style>' +
      '<div style="position:relative;width:90vw;max-width:900px;aspect-ratio:16/9;">' +
        '<iframe src="' + embedUrl + '?autoplay=1&rel=0" style="width:100%;height:100%;border:none;border-radius:12px;" allow="autoplay;fullscreen" allowfullscreen></iframe>' +
        '<button onclick="document.getElementById(\'journey-video-modal\').remove()" ' +
          'style="position:absolute;top:-18px;right:-18px;width:40px;height:40px;border-radius:50%;border:none;background:#c8922a;color:#fff;font-size:18px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;" ' +
          'aria-label="Đóng video">✕</button>' +
      '</div>';

    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
    document.addEventListener('keydown', function escClose(e) {
      if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escClose); }
    });
  }

  // ── Scroll reveal animation ──
  function triggerReveal() {
    var cards = document.querySelectorAll('#journey-videos-container .reveal');
    if (!cards.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var delay = entry.target.dataset.delay || 0;
            setTimeout(function () { entry.target.classList.add('is-visible'); }, parseInt(delay, 10));
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      cards.forEach(function (c) { observer.observe(c); });
    } else {
      // Fallback: show all immediately
      cards.forEach(function (c) { c.classList.add('is-visible'); });
    }
  }

  // ── Init ──
  function init() {
    var topics = loadTopics();
    var videos = loadVideos();
    renderTabs(topics);
    renderVideos(topics, videos);
  }

  // Wait for components (header/footer) to load first, matching common.js timing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
  } else {
    setTimeout(init, 300);
  }

})();

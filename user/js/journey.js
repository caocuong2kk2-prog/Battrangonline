// journey.js – Client-side Journey Page Controller
// Reads admin_journey_topics + admin_journey_videos from localStorage
// and renders dynamic tab navigation + video card grid.
(function () {
  'use strict';

  // ── Helpers ──

  // Extract embed URL: YouTube player + TikTok player/v1
  function toEmbedUrl(url) {
    if (!url) return '';
    var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];

    if (url.includes('tiktok.com')) {
      var tkMatch = url.match(/video\/(\d+)/);
      if (tkMatch) return 'https://www.tiktok.com/player/v1/' + tkMatch[1] + '?music_info=0&description=0&native_context_menu=0';
    }
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(url) + '&show_text=false&width=560';
    }

    return '';
  }

  function getPlatform(url) {
    if (!url) return 'other';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    return 'other';
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
        // Lấy lại danh sách videos qua API để render lại, 
        // hoặc lý tưởng nhất là lưu videos vào một biến toàn cục
        // Vì hiện tại init() gọi API và không lưu mảng videos ra ngoài,
        // chúng ta sẽ gọi lại API để lấy video mới nhất (hoặc bạn có thể dùng state)
        PhucGiaTienAPI.getJourneyVideos().then(function (newVideos) {
          renderVideos(topics, newVideos);
        });
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
      var platform = getPlatform(v.url);
      var embedUrl = toEmbedUrl(v.url);
      var delay = idx * 100;
      var topic = topics.find(function (t) { return t.id === v.topicId; });
      var topicLabel = topic ? topic.name : '';
      var topicBadge = (topicLabel && activeTopicId === 'tat-ca')
        ? '<span style="position:absolute;top:10px;left:10px;background:rgba(200,146,42,0.85);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.04em;pointer-events:none;z-index:2;">' + topicLabel + '</span>'
        : '';

      var mediaHtml;
      if (platform === 'youtube' && embedUrl) {
        // YouTube: nhúng iframe 16:9
        mediaHtml =
          '<div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:12px 12px 0 0;overflow:hidden;background:#000;">' +
            '<iframe src="' + embedUrl + '" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;" allow="autoplay;fullscreen" allowfullscreen loading="lazy"></iframe>' +
          '</div>';

      } else if (platform === 'tiktok' && embedUrl) {
        // TikTok: dùng player/v1 chính thức (iframe) - tỷ lệ dọc 9:16 nhưng scale lại cho vừa card 16:9
        mediaHtml =
          '<div style="width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:#000;border-radius:12px 12px 0 0;overflow:hidden;padding:0;">' +
            '<iframe src="' + embedUrl + '" style="width:100%;height:100%;border:none;display:block;" allow="fullscreen" allowfullscreen loading="lazy"></iframe>' +
          '</div>';

      } else if (platform === 'facebook') {
        // Facebook: official video plugin iframe (no App ID required)
        var fbEmbedUrl = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(v.url) +
          '&show_text=false&width=560&height=315&appId';
        mediaHtml = '<div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:12px 12px 0 0;overflow:hidden;background:#1877f2;">' +
          '<iframe src="' + fbEmbedUrl + '" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"' +
          ' scrolling="no" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen></iframe>' +
          '</div>';

      } else {
        mediaHtml = '<div style="display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:16/9;border-radius:12px 12px 0 0;background:#222;">' +
          '<a href="' + v.url + '" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline;">Xem video ↗</a>' +
          '</div>';
      }

      return '<div class="video-card reveal" data-delay="' + delay + '" style="position:relative;">' +
        mediaHtml +
        topicBadge +
        '<p class="video-card__title">' + v.title + '</p>' +
        '</div>';
    }).join('');

    container.innerHTML = '<div class="video-grid">' + cardsHtml + '</div>';

    triggerReveal();
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
            setTimeout(function () { entry.target.classList.add('revealed'); }, parseInt(delay, 10));
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      cards.forEach(function (c) { observer.observe(c); });
    } else {
      // Fallback: show all immediately
      cards.forEach(function (c) { c.classList.add('revealed'); });
    }
  }

  // ── Init ──
  function init() {
    Promise.all([
      PhucGiaTienAPI.getJourneyTopics(),
      PhucGiaTienAPI.getJourneyVideos()
    ]).then(function (res) {
      var topics = res[0] || [];
      var videos = res[1] || [];
      renderTabs(topics);
      renderVideos(topics, videos);
    }).catch(function (e) {
      console.error('Lỗi khi tải dữ liệu hành trình:', e);
      document.getElementById('journey-videos-container').innerHTML = 
        '<p style="text-align:center;padding:40px;color:#888;">Không thể tải dữ liệu. Vui lòng thử lại sau.</p>';
    });
  }

  // Wait for components (header/footer) to load first, matching common.js timing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
  } else {
    setTimeout(init, 300);
  }

})();

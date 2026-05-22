// journey-admin.js – Controller for Journey Management
(function () {
  'use strict';

  var topics = [];
  var videos = [];
  var editVideoId = null;
  var editTopicId = null;

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Initial Data Load
    Promise.all([
        AdminData.journey.loadTopics(),
        AdminData.journey.loadVideos()
    ]).then(function(res) {
        topics = res[0] || [];
        videos = res[1] || [];
        
        // 2. Initial Rendering
        renderTopics();
        renderVideos();
        populateTopicSelect();
    }).catch(function(e) { console.error(e); });

    // 3. Tab Navigation
    document.querySelectorAll('.journey-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = this.dataset.tab;
        
        document.querySelectorAll('.journey-tab-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');

        document.querySelectorAll('.panel-section').forEach(function (p) { p.classList.remove('active'); });
        document.getElementById('panel-' + tab).classList.add('active');
      });
    });

    // 4. Modal Triggers: Add Topic
    document.getElementById('btn-add-topic').addEventListener('click', function () {
      editTopicId = null;
      document.getElementById('topic-modal-title').textContent = 'Thêm Chủ Đề Mới';
      var f = document.getElementById('topic-form');
      f.reset();
      f.querySelector('[name="id"]').disabled = false;
      openModal('topicModal');
    });

    // Save Topic Handler
    document.getElementById('btn-save-topic').addEventListener('click', saveTopic);

    // 5. Modal Triggers: Add Video
    document.getElementById('btn-add-video').addEventListener('click', function () {
      editVideoId = null;
      document.getElementById('video-modal-title').textContent = 'Thêm Video Mới';
      var f = document.getElementById('video-form');
      f.reset();
      
      // Make sure we have topics first
      if (topics.length === 0) {
        adminToast('Vui lòng tạo ít nhất một chủ đề trước!', 'error');
        return;
      }
      
      openModal('videoModal');
    });

    // Save Video Handler
    document.getElementById('btn-save-video').addEventListener('click', saveVideo);

    // 6. Action delegated listeners (Edit/Delete) on Tables
    document.getElementById('video-table-body').addEventListener('click', function (e) {
      var edit = e.target.closest('.btn-edit-video');
      var del = e.target.closest('.btn-del-video');
      if (edit) openEditVideo(parseInt(edit.dataset.id, 10));
      if (del) deleteVideo(parseInt(del.dataset.id, 10));
    });

    document.getElementById('topic-table-body').addEventListener('click', function (e) {
      var edit = e.target.closest('.btn-edit-topic');
      var del = e.target.closest('.btn-del-topic');
      if (edit) openEditTopic(edit.dataset.id);
      if (del) deleteTopic(del.dataset.id);
    });

    // 7. Search and Filter Listeners
    var vSearch = document.getElementById('video-search');
    var vFilter = document.getElementById('video-topic-filter');
    var tSearch = document.getElementById('topic-search');
    if (vSearch) vSearch.addEventListener('input', renderVideos);
    if (vFilter) vFilter.addEventListener('change', renderVideos);
    if (tSearch) tSearch.addEventListener('input', renderTopics);
  });

  // Helper: Extract YouTube Video ID & build HQ thumbnail
  function extractYouTubeId(url) {
    if (!url) return '';
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  }

  function getAutoThumbnail(url) {
    var ytId = extractYouTubeId(url);
    if (ytId) {
      return 'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg';
    }
    return 'assets/images/journey-hero.jpg'; // fallback
  }

  // Helper: Ensure URL is in embed format for rendering
  function formatEmbedUrl(url) {
    var ytId = extractYouTubeId(url);
    if (ytId) {
      return 'https://www.youtube.com/embed/' + ytId;
    }
    return url;
  }

  // ── Topics CRUD ───────────────────────────
  function renderTopics() {
    var tbody = document.getElementById('topic-table-body');
    if (!tbody) return;

    var searchInput = document.getElementById('topic-search');
    var searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

    var filteredTopics = topics.filter(function (t) {
      return t.name.toLowerCase().includes(searchQuery) || t.id.toLowerCase().includes(searchQuery);
    });

    var countEl = document.getElementById('topic-count');
    if (countEl) countEl.textContent = filteredTopics.length + ' chủ đề';

    if (filteredTopics.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">Không tìm thấy chủ đề nào.</td></tr>';
      return;
    }

    tbody.innerHTML = filteredTopics.map(function (t) {
      var videoCount = videos.filter(function (v) { return v.topicId === t.id; }).length;
      return '<tr>' +
        '<td><code>' + t.id + '</code></td>' +
        '<td><strong>' + t.name + '</strong></td>' +
        '<td><span class="badge badge--info">' + videoCount + ' video</span></td>' +
        '<td style="text-align:right;">' +
          '<button class="btn btn--sm btn--secondary btn-edit-topic" style="margin-right:var(--sp-2);" data-id="' + t.id + '" title="Sửa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>' +
          '<button class="btn btn--sm btn--danger btn-del-topic" data-id="' + t.id + '"' + (videoCount > 0 ? ' disabled title="Xóa hết video thuộc chủ đề này trước"' : ' title="Xóa"') + '><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  function populateTopicSelect() {
    var select = document.getElementById('video-topic-select');
    var filter = document.getElementById('video-topic-filter');
    
    var html = topics.map(function (t) {
      return '<option value="' + t.id + '">' + t.name + '</option>';
    }).join('');
    
    if (select) select.innerHTML = html;
    if (filter) {
      var currentVal = filter.value;
      filter.innerHTML = '<option value="all">Tất cả chủ đề</option>' + html;
      filter.value = currentVal || 'all';
    }
  }

  function saveTopic() {
    var f = document.getElementById('topic-form');
    var idInput = f.querySelector('[name="id"]');
    var id = idInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    var name = f.querySelector('[name="name"]').value.trim();

    if (!id || !name) {
      adminToast('Vui lòng nhập đầy đủ thông tin chủ đề!', 'error');
      return;
    }

    var data = { id: id, name: name };

    if (editTopicId) {
      var idx = topics.findIndex(function (x) { return x.id === editTopicId; });
      if (idx >= 0) {
        // Cascade topic ID change inside videos if the topic ID has somehow changed,
        // but since we disable the ID field in Edit mode, we don't need to worry about it here.
        topics[idx] = data;
        adminToast('Cập nhật chủ đề thành công!', 'success');
      }
    } else {
      if (topics.find(function (x) { return x.id === id; })) {
        adminToast('Mã chủ đề đã tồn tại!', 'error');
        return;
      }
      topics.push(data);
      adminToast('Thêm chủ đề mới thành công!', 'success');
    }

    AdminData.journey.saveTopic(data).then(function() {
        closeModal('topicModal');
        renderTopics();
        populateTopicSelect();
    });
  }

  function openEditTopic(id) {
    var t = topics.find(function (x) { return x.id === id; });
    if (!t) return;
    editTopicId = id;
    
    document.getElementById('topic-modal-title').textContent = 'Chỉnh Sửa Chủ Đề';
    var f = document.getElementById('topic-form');
    f.querySelector('[name="id"]').value = t.id;
    f.querySelector('[name="id"]').disabled = true; // prevent changing unique ID
    f.querySelector('[name="name"]').value = t.name;
    
    openModal('topicModal');
  }

  function deleteTopic(id) {
    var t = topics.find(function (x) { return x.id === id; });
    if (!t) return;

    adminConfirm('Xóa chủ đề "' + t.name + '"?', function () {
      topics = topics.filter(function (x) { return x.id !== id; });
      AdminData.journey.deleteTopic(id).then(function() {
          adminToast('Đã xóa chủ đề.', 'warning');
          renderTopics();
          populateTopicSelect();
      });
    });
  }

  // ── Videos CRUD ───────────────────────────
  function renderVideos() {
    var tbody = document.getElementById('video-table-body');
    if (!tbody) return;

    var searchInput = document.getElementById('video-search');
    var filterSelect = document.getElementById('video-topic-filter');
    var searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    var topicFilter = filterSelect ? filterSelect.value : 'all';

    var filteredVideos = videos.filter(function (v) {
      var matchSearch = v.title.toLowerCase().includes(searchQuery);
      var matchTopic = topicFilter === 'all' || v.topicId === topicFilter;
      return matchSearch && matchTopic;
    });

    var countEl = document.getElementById('video-count');
    if (countEl) countEl.textContent = filteredVideos.length + ' video';

    if (filteredVideos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">Không tìm thấy video nào.</td></tr>';
      return;
    }

    tbody.innerHTML = filteredVideos.map(function (v) {
      var t = topics.find(function (x) { return x.id === v.topicId; });
      var topicName = t ? t.name : v.topicId;
      var thumb = v.thumbnail || getAutoThumbnail(v.url);

      return '<tr>' +
        '<td><img src="' + thumb + '" class="video-thumbnail-preview" alt="Thumb"></td>' +
        '<td><strong>' + v.title + '</strong></td>' +
        '<td><span class="topic-badge">' + topicName + '</span></td>' +
        '<td><code>' + (v.duration || '--:--') + '</code></td>' +
        '<td><a href="' + v.url + '" target="_blank" style="color:var(--primary);text-decoration:underline;font-size:var(--fs-sm);word-break:break-all;">' + v.url + '</a></td>' +
        '<td style="text-align:right;">' +
          '<button class="btn btn--sm btn--secondary btn-edit-video" style="margin-right:var(--sp-2);" data-id="' + v.id + '" title="Sửa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>' +
          '<button class="btn btn--sm btn--danger btn-del-video" data-id="' + v.id + '" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  function saveVideo() {
    var f = document.getElementById('video-form');
    var title = f.querySelector('[name="title"]').value.trim();
    var topicId = f.querySelector('[name="topicId"]').value;
    var url = f.querySelector('[name="url"]').value.trim();
    var thumbnail = f.querySelector('[name="thumbnail"]').value.trim();
    var duration = f.querySelector('[name="duration"]').value.trim() || '00:00';

    if (!title || !topicId || !url) {
      adminToast('Vui lòng nhập đầy đủ thông tin bắt buộc!', 'error');
      return;
    }

    // Embed formatting check
    var embedUrl = formatEmbedUrl(url);
    var finalThumbnail = thumbnail || getAutoThumbnail(url);

    var data = {
      id: editVideoId ? editVideoId : Date.now(),
      title: title,
      topicId: topicId,
      url: embedUrl,
      thumbnail: finalThumbnail,
      duration: duration
    };

    if (editVideoId) {
      var idx = videos.findIndex(function (x) { return x.id === editVideoId; });
      if (idx >= 0) {
        videos[idx] = data;
        adminToast('Cập nhật thông tin video thành công!', 'success');
      }
    } else {
      videos.push(data);
      adminToast('Thêm video mới thành công!', 'success');
    }

    AdminData.journey.saveVideo(data).then(function() {
        closeModal('videoModal');
        renderVideos();
        // Auto sync back to UI
        renderTopics(); // refresh counts
    });
  }

  function openEditVideo(id) {
    var v = videos.find(function (x) { return x.id === id; });
    if (!v) return;
    editVideoId = id;

    document.getElementById('video-modal-title').textContent = 'Chỉnh Sửa Video';
    var f = document.getElementById('video-form');
    f.querySelector('[name="title"]').value = v.title;
    f.querySelector('[name="topicId"]').value = v.topicId;
    f.querySelector('[name="url"]').value = v.url;
    f.querySelector('[name="thumbnail"]').value = v.thumbnail || '';
    f.querySelector('[name="duration"]').value = v.duration || '00:00';

    openModal('videoModal');
  }

  function deleteVideo(id) {
    adminConfirm('Xóa video này khỏi danh sách?', function () {
      videos = videos.filter(function (x) { return x.id !== id; });
      AdminData.journey.deleteVideo(id).then(function() {
          adminToast('Đã xóa video.', 'warning');
          renderVideos();
          renderTopics(); // refresh counts
      });
    });
  }

})();

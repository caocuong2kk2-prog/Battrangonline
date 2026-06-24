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
    ]).then(function (res) {
      topics = res[0] || [];
      videos = res[1] || [];

      // 2. Initial Rendering
      renderTopics();
      renderVideos();
      populateTopicSelect();
    }).catch(function (e) { console.error(e); });

    // 3. Tab Navigation (Hash Routing)
    var VALID_TABS = ['videos', 'topics'];

    function getTabFromHash() {
      var hash = location.hash.replace('#tab=', '');
      return VALID_TABS.indexOf(hash) !== -1 ? hash : 'videos';
    }

    function switchTab(tabKey) {
      document.querySelectorAll('.journey-tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabKey);
      });

      document.querySelectorAll('.panel-section').forEach(function (panel) {
        panel.classList.toggle('active', panel.id === 'panel-' + tabKey);
      });

      // Update URL hash
      history.replaceState(null, '', '#tab=' + tabKey);
    }

    document.querySelectorAll('.journey-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(this.dataset.tab);
      });
    });

    window.addEventListener('hashchange', function () {
      switchTab(getTabFromHash());
    });

    // Activate initial tab based on hash
    switchTab(getTabFromHash());

    // 4. Modal Triggers: Add Topic
    document.getElementById('btn-add-topic').addEventListener('click', function () {
      editTopicId = null;
      document.getElementById('topic-modal-title').textContent = 'Thêm Chủ Đề Mới';
      var f = document.getElementById('topic-form');
      f.reset();
      clearInlineErrors('topic-form');
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
      clearInlineErrors('video-form');

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

    // Bulk Actions Listeners
    var checkAllVideos = document.getElementById('check-all-videos');
    if (checkAllVideos) {
      checkAllVideos.addEventListener('change', function() {
        var isChecked = this.checked;
        document.querySelectorAll('.video-item-checkbox').forEach(function(cb) { cb.checked = isChecked; });
        if (typeof updateBulkActionsUI === 'function') updateBulkActionsUI();
      });
    }
    var tbodyVideos = document.getElementById('video-table-body');
    if (tbodyVideos) {
      tbodyVideos.addEventListener('change', function(e) {
        if (e.target.classList.contains('video-item-checkbox')) {
          if (typeof updateBulkActionsUI === 'function') updateBulkActionsUI();
        }
      });
    }
    var btnBulkClose = document.getElementById('btn-bulk-close');
    if (btnBulkClose) {
      btnBulkClose.addEventListener('click', function() {
        if (checkAllVideos) { checkAllVideos.checked = false; checkAllVideos.dispatchEvent(new Event('change')); }
      });
    }
    var btnBulkDelete = document.getElementById('btn-bulk-delete');
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', executeBulkDelete);
    }

    // 8. Real-time Active Validation
    var fTopic = document.getElementById('topic-form');
    if (fTopic) {
      var validateTopicField = function (el) {
        if (!el.classList.contains('is-invalid')) return;
        var name = el.name;
        var val = el.value.trim();
        var isValid = true;
        var errorMsg = '';

        if (name === 'name') {
          if (!val) {
            errorMsg = 'Vui lòng nhập tên chủ đề!';
            isValid = false;
          } else {
            var nameLower = val.toLowerCase();
            var duplicate = topics.find(function(x) {
              if (editTopicId && x.id === editTopicId) return false;
              return x.name.toLowerCase() === nameLower;
            });
            if (duplicate) {
              errorMsg = 'Chủ đề "' + val + '" đã tồn tại!';
              isValid = false;
            }
          }
        }

        if (isValid) {
          el.classList.remove('is-invalid');
          var sibling = el.nextElementSibling;
          if (sibling && sibling.classList.contains('form-error')) sibling.remove();
        } else {
          var sibling = el.nextElementSibling;
          if (sibling && sibling.classList.contains('form-error')) {
            sibling.textContent = errorMsg;
          }
        }
      };

      fTopic.addEventListener('input', function (e) { validateTopicField(e.target); });
      fTopic.addEventListener('change', function (e) { validateTopicField(e.target); });
    }

    var fVideo = document.getElementById('video-form');
    if (fVideo) {
      var validateVideoField = function (el) {
        if (!el.classList.contains('is-invalid') && !el.closest('.custom-select-wrapper')?.classList.contains('is-invalid')) return;
        var name = el.name;
        var val = el.value.trim();
        var isValid = true;
        var errorMsg = '';

        if (name === 'title') {
          if (!val) {
            errorMsg = 'Vui lòng nhập tiêu đề video!';
            isValid = false;
          } else if (val.length < 3) {
            errorMsg = 'Tiêu đề video phải từ 3 ký tự trở lên!';
            isValid = false;
          }
        } else if (name === 'topicId') {
          if (!val) {
            errorMsg = 'Vui lòng chọn chủ đề!';
            isValid = false;
          }
        } else if (name === 'url') {
          if (!val) {
            errorMsg = 'Vui lòng nhập đường dẫn video!';
            isValid = false;
          } else {
            var isValidUrl = false;
            try {
              var parsedUrl = new URL(val);
              if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                isValidUrl = true;
              }
            } catch (e) {}

            if (!isValidUrl) {
              errorMsg = 'Định dạng URL video không hợp lệ! Vui lòng nhập link bắt đầu bằng http:// hoặc https://';
              isValid = false;
            } else {
              var platform = getPlatform(val);
              if (platform === 'other' || platform === 'unknown') {
                errorMsg = 'Hệ thống chỉ hỗ trợ video từ YouTube, TikTok hoặc Facebook!';
                isValid = false;
              } else {
                var duplicate = videos.find(function (v) {
                  return v.url === val && v.id !== editVideoId;
                });
                if (duplicate) {
                  errorMsg = 'URL video này đã tồn tại trong danh sách ("' + (duplicate.title || 'video đã có') + '")!';
                  isValid = false;
                }
              }
            }
          }
        }

        var target = el;
        var wrapper = el.closest('.custom-select-wrapper');
        if (wrapper) target = wrapper;

        if (isValid) {
          el.classList.remove('is-invalid');
          if (wrapper) wrapper.classList.remove('is-invalid');
          var sibling = target.nextElementSibling;
          if (sibling && sibling.classList.contains('form-error')) sibling.remove();
        } else {
          var sibling = target.nextElementSibling;
          if (sibling && sibling.classList.contains('form-error')) {
            sibling.textContent = errorMsg;
          }
        }
      };

      fVideo.addEventListener('input', function (e) { validateVideoField(e.target); });
      fVideo.addEventListener('change', function (e) { validateVideoField(e.target); });
    }
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

    if (url.includes('tiktok.com')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23000"/><text x="50%" y="50%" fill="%23fff" font-size="40" font-family="sans-serif" text-anchor="middle" dy=".3em">TikTok Video</text></svg>';
    }

    if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%231877f2"/><text x="50%" y="50%" fill="%23fff" font-size="40" font-family="sans-serif" text-anchor="middle" dy=".3em">Facebook Video</text></svg>';
    }

    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23ccc"/><text x="50%" y="50%" fill="%23333" font-size="40" font-family="sans-serif" text-anchor="middle" dy=".3em">Video</text></svg>';
  }

  function toEmbedUrl(url) {
    if (!url) return '';
    var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];

    if (url.includes('tiktok.com')) {
      var tkMatch = url.match(/video\/(\d+)/);
      if (tkMatch) return 'https://www.tiktok.com/player/v1/' + tkMatch[1] + '?music_info=0&description=0&native_context_menu=0';
    }

    return ''; // Facebook: handled separately
  }

  function getPlatform(url) {
    if (!url) return 'unknown';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    return 'other';
  }

  function renderVideoPreview(v) {
    var platform = getPlatform(v.url);
    var embedUrl = toEmbedUrl(v.url);

    if (platform === 'youtube' && embedUrl) {
      // YouTube: iframe preview 16:9
      return '<div class="video-preview-box">' +
        '<iframe src="' + embedUrl + '" allow="autoplay;fullscreen" allowfullscreen loading="lazy"></iframe>' +
        '</div>';
    }

    if (platform === 'tiktok' && embedUrl) {
      // TikTok: dùng player/v1 chính thức, scale vừa khung 16:9 giống giao diện user
      return '<div class="video-preview-box is-tiktok">' +
        '<iframe src="' + embedUrl + '" allow="fullscreen" allowfullscreen loading="lazy"></iframe>' +
        '</div>';
    }

    if (platform === 'facebook') {
      // Facebook: official video plugin iframe
      var fbEmbedUrl = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(v.url) +
        '&show_text=false&width=240&height=135';
      return '<div class="video-preview-box">' +
        '<iframe src="' + fbEmbedUrl + '"' +
        ' scrolling="no" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share" allowfullscreen loading="lazy"></iframe>' +
        '</div>';
    }

    return '<a href="' + v.url + '" target="_blank" rel="noopener" class="video-preview-box" style="color:#fff;text-decoration:underline;font-size:12px;">Xem video ↗</a>';
  }

  // (Removed openAdminVideoModal since we now play directly in the iframe like the user page)

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
    var ns = window.normalizeSearch || function(s){ return (s||'').toLowerCase(); };
    var searchQuery = searchInput ? ns(searchInput.value.trim()) : '';
    var terms = searchQuery ? searchQuery.split(/\s+/).filter(Boolean) : [];

    var filteredTopics = topics.filter(function (t) {
      if (!terms.length) return true;
      var hay = ns(t.name) + ' ' + ns(t.id);
      return terms.every(function(term){ return hay.includes(term); });
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

    function updateCustomSelectUI(selectEl) {
      if(!selectEl) return;
      var wrapper = selectEl.parentElement;
      if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
        var optionsContainer = document.querySelector('.custom-select__options[data-select-id="' + wrapper.dataset.selectId + '"]');
        if (optionsContainer) {
          optionsContainer.innerHTML = '';
          Array.from(selectEl.options).forEach(function(option,index){
            var optEl=document.createElement('div');
            optEl.className='custom-select__option'+(option.selected?' selected':'');
            optEl.textContent=option.text;
            optEl.dataset.value=option.value;
            optEl.addEventListener('click',function(e){
              e.stopPropagation();
              selectEl.selectedIndex=index;
              var textSpan = wrapper.querySelector('.custom-select__text');
              if(textSpan) textSpan.textContent=option.text;
              var prev=optionsContainer.querySelector('.selected');
              if(prev)prev.classList.remove('selected');
              optEl.classList.add('selected');
              wrapper.classList.remove('open');
              optionsContainer.classList.remove('show');
              selectEl.dispatchEvent(new Event('change',{bubbles:true}));
            });
            optionsContainer.appendChild(optEl);
          });
          var selectedOpt = selectEl.options[selectEl.selectedIndex];
          if(selectedOpt) {
            var textSpan = wrapper.querySelector('.custom-select__text');
            if(textSpan) textSpan.textContent = selectedOpt.text;
          }
        }
      }
    }

    if (select) {
      select.innerHTML = html;
      updateCustomSelectUI(select);
    }
    if (filter) {
      var currentVal = filter.value;
      filter.innerHTML = '<option value="all">Tất cả chủ đề</option>' + html;
      filter.value = currentVal || 'all';
      updateCustomSelectUI(filter);
    }
  }

  function toSlug(str) {
    var map = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a', 'ă': 'a', 'ắ': 'a', 'ặ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o', 'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd'
    };
    return str.toLowerCase().replace(/./g, function (c) { return map[c] || c; })
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function saveTopic() {
    var f = document.getElementById('topic-form');
    var name = f.querySelector('[name="name"]').value.trim();

    clearInlineErrors(f);
    var hasError = false;

    if (!name) {
      setInlineError(f.querySelector('[name="name"]'), 'Vui lòng nhập tên chủ đề!');
      hasError = true;
    } else {
      var nameLower = name.toLowerCase();
      var duplicate = topics.find(function(x) {
        if (editTopicId && x.id === editTopicId) return false;
        return x.name.toLowerCase() === nameLower;
      });
      if (duplicate) {
        setInlineError(f.querySelector('[name="name"]'), 'Chủ đề "' + name + '" đã tồn tại!');
        adminToast('Chủ đề "' + name + '" đã tồn tại!', 'error');
        hasError = true;
      }
    }

    if (hasError) {
      var firstErr = f.querySelector('.is-invalid');
      if (firstErr) firstErr.focus();
      return;
    }

    var id = editTopicId || toSlug(name);
    if (!id) {
      setInlineError(f.querySelector('[name="name"]'), 'Không thể tạo ID từ tên này, vui lòng thử tên khác!');
      return;
    }

    if (!editTopicId) {
      var base = id, counter = 2;
      while (topics.find(function (x) { return x.id === id; })) { id = base + '-' + counter++; }
    }

    var data = { id: id, name: name };

    var savePromise = AdminData.journey.saveTopic(data, !editTopicId);

    savePromise.then(function () {
      if (editTopicId) {
        var idx = topics.findIndex(function (x) { return x.id === editTopicId; });
        if (idx >= 0) {
          topics[idx] = data;
        }
        adminToast('Cập nhật chủ đề thành công!', 'success');
      } else {
        topics.push(data);
        adminToast('Thêm chủ đề mới thành công!', 'success');
      }
      closeModal('topicModal');
      renderTopics();
      populateTopicSelect();
    }).catch(function (err) {
      var msg = err.message || 'Lỗi khi lưu chủ đề';
      adminToast('Lỗi khi lưu chủ đề: ' + msg, 'error');
      if (msg.indexOf('tồn tại') !== -1 || msg.indexOf('chủ đề') !== -1) {
        var nameInp = f.querySelector('[name="name"]');
        if (nameInp) {
          setInlineError(nameInp, msg);
          nameInp.focus();
        }
      }
    });
  }

  function openEditTopic(id) {
    var t = topics.find(function (x) { return x.id === id; });
    if (!t) return;
    editTopicId = id;

    document.getElementById('topic-modal-title').textContent = 'Chỉnh Sửa Chủ Đề';
    var f = document.getElementById('topic-form');
    clearInlineErrors(f);
    f.querySelector('[name="name"]').value = t.name;

    openModal('topicModal');
  }

  function deleteTopic(id) {
    var t = topics.find(function (x) { return x.id === id; });
    if (!t) return;

    adminConfirm('Xóa chủ đề "' + t.name + '"?', function () {
      AdminData.journey.deleteTopic(id).then(function () {
        topics = topics.filter(function (x) { return x.id !== id; });
        adminToast('Đã xóa chủ đề.', 'warning');
        renderTopics();
        populateTopicSelect();
      }).catch(function (err) {
        var msg = err.message || 'Lỗi khi xóa chủ đề';
        adminToast(msg, 'error');
      });
    });
  }

  // ── Videos CRUD ───────────────────────────
  function renderVideos() {
    var tbody = document.getElementById('video-table-body');
    if (!tbody) return;

    var searchInput = document.getElementById('video-search');
    var filterSelect = document.getElementById('video-topic-filter');
    var ns = window.normalizeSearch || function(s){ return (s||'').toLowerCase(); };
    var rawSearch = searchInput ? searchInput.value.trim() : '';
    var terms = rawSearch ? ns(rawSearch).split(/\s+/).filter(Boolean) : [];
    var topicFilter = filterSelect ? filterSelect.value : 'all';

    var filteredVideos = videos.filter(function (v) {
      var matchSearch = !terms.length || (function(){
        var hay = ns(v.title) + ' ' + ns(v.url);
        return terms.every(function(t){ return hay.includes(t); });
      })();
      var matchTopic = topicFilter === 'all' || v.topicId === topicFilter;
      return matchSearch && matchTopic;
    });

    var countEl = document.getElementById('video-count');
    if (countEl) countEl.textContent = filteredVideos.length + ' video';

    if (filteredVideos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--sp-6);color:var(--text-muted);">Không tìm thấy video nào.</td></tr>';
      return;
    }

    tbody.innerHTML = filteredVideos.map(function (v) {
      var t = topics.find(function (x) { return x.id === v.topicId; });
      var topicName = t ? t.name : v.topicId;
      return '<tr style="transition: background-color 0.2s;" onmouseover="this.style.backgroundColor=\'var(--surface-100)\'" onmouseout="this.style.backgroundColor=\'\'">' +
        '<td class="checkbox-cell" style="vertical-align:middle" onclick="event.stopPropagation()"><input type="checkbox" class="video-item-checkbox" data-id="' + v.id + '"></td>' +
        '<td>' + renderVideoPreview(v) + '</td>' +
        '<td><strong>' + v.title + '</strong></td>' +
        '<td><span class="topic-badge">' + topicName + '</span></td>' +
        '<td class="url-cell" title="' + v.url + '"><a href="' + v.url + '" target="_blank" style="color:var(--primary);text-decoration:underline;font-size:var(--fs-sm);display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;">' + v.url + '</a></td>' +
        '<td style="text-align:right;">' +
        '<button class="btn btn--sm btn--secondary btn-edit-video" style="margin-right:var(--sp-2);" data-id="' + v.id + '" title="Sửa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>' +
        '<button class="btn btn--sm btn--danger btn-del-video" data-id="' + v.id + '" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>' +
        '</td>' +
        '</tr>';
    }).join('');

    // Load TikTok embed.js sau khi DOM render xong
    if (filteredVideos.some(function (v) { return getPlatform(v.url) === 'tiktok'; })) {
      var existingScript = document.getElementById('tiktok-embed-js');
      if (existingScript) existingScript.remove();
      setTimeout(function () {
        var tkScript = document.createElement('script');
        tkScript.id = 'tiktok-embed-js';
        tkScript.src = 'https://www.tiktok.com/embed.js';
        tkScript.async = true;
        document.body.appendChild(tkScript);
      }, 300);
    }

    if (typeof updateBulkActionsUI === 'function') updateBulkActionsUI();
  }
  function saveVideo() {
    var f = document.getElementById('video-form');
    var title = f.querySelector('[name="title"]').value.trim();
    var topicId = f.querySelector('[name="topicId"]').value;
    var url = f.querySelector('[name="url"]').value.trim();

    clearInlineErrors(f);
    var hasError = false;

    if (!title) {
      setInlineError(f.querySelector('[name="title"]'), 'Vui lòng nhập tiêu đề video!');
      hasError = true;
    } else if (title.length < 3) {
      setInlineError(f.querySelector('[name="title"]'), 'Tiêu đề video phải từ 3 ký tự trở lên!');
      hasError = true;
    }
    if (!topicId) {
      setInlineError(f.querySelector('[name="topicId"]'), 'Vui lòng chọn chủ đề!');
      hasError = true;
    }
    if (!url) {
      setInlineError(f.querySelector('[name="url"]'), 'Vui lòng nhập đường dẫn video!');
      hasError = true;
    } else {
      var isValidUrl = false;
      try {
        var parsedUrl = new URL(url);
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
          isValidUrl = true;
        }
      } catch (e) {}

      if (!isValidUrl) {
        setInlineError(f.querySelector('[name="url"]'), 'Định dạng URL video không hợp lệ! Vui lòng nhập link bắt đầu bằng http:// hoặc https://');
        hasError = true;
      } else {
        var platform = getPlatform(url);
        if (platform === 'other' || platform === 'unknown') {
          setInlineError(f.querySelector('[name="url"]'), 'Hệ thống chỉ hỗ trợ video từ YouTube, TikTok hoặc Facebook!');
          hasError = true;
        } else {
          // Kiểm tra URL trùng lặp (bỏ qua video đang sửa)
          var duplicate = videos.find(function (v) {
            return v.url === url && v.id !== editVideoId;
          });
          if (duplicate) {
            setInlineError(f.querySelector('[name="url"]'), 'URL video này đã tồn tại trong danh sách ("' + (duplicate.title || 'video đã có') + '")!');
            hasError = true;
          }
        }
      }
    }

    if (hasError) {
      var firstErr = f.querySelector('.is-invalid');
      if (firstErr) firstErr.focus();
      return;
    }

    var finalThumbnail = getAutoThumbnail(url);

    var data = {
      id: editVideoId ? editVideoId : 0,
      title: title,
      topicId: topicId,
      url: url,
      thumbnail: finalThumbnail,
      duration: ""
    };

    var savePromise;
    if (editVideoId) {
      savePromise = AdminData.journey.saveVideo(data).then(function () {
        var idx = videos.findIndex(function (x) { return x.id === editVideoId; });
        if (idx >= 0) {
          videos[idx] = data;
        }
        adminToast('Cập nhật thông tin video thành công!', 'success');
      });
    } else {
      savePromise = AdminData.journey.saveVideo(data).then(function (savedVideo) {
        if (savedVideo && savedVideo.id) {
          data.id = savedVideo.id;
        }
        videos.push(data);
        adminToast('Thêm video mới thành công!', 'success');
      });
    }

    savePromise.then(function () {
      closeModal('videoModal');
      renderVideos();
      // Auto sync back to UI
      renderTopics(); // refresh counts
    }).catch(function (err) {
      var msg = err.message || 'Lỗi khi lưu video';
      adminToast('Lỗi khi lưu video: ' + msg, 'error');
      if (msg.indexOf('tồn tại') !== -1 || msg.indexOf('URL video') !== -1 || msg.indexOf('đường dẫn') !== -1) {
        var urlInp = f.querySelector('[name="url"]');
        if (urlInp) {
          setInlineError(urlInp, msg);
          urlInp.focus();
        }
      }
    });
  }

  function openEditVideo(id) {
    var v = videos.find(function (x) { return x.id === id; });
    if (!v) return;
    editVideoId = id;

    document.getElementById('video-modal-title').textContent = 'Chỉnh Sửa Video';
    var f = document.getElementById('video-form');
    clearInlineErrors(f);
    f.querySelector('[name="title"]').value = v.title;
    f.querySelector('[name="topicId"]').value = v.topicId;
    f.querySelector('[name="url"]').value = v.url;

    openModal('videoModal');
  }

  function deleteVideo(id) {
    adminConfirm('Xóa video này khỏi danh sách?', function () {
      AdminData.journey.deleteVideo(id).then(function () {
        videos = videos.filter(function (x) { return x.id !== id; });
        adminToast('Đã xóa video.', 'warning');
        renderVideos();
        renderTopics(); // refresh counts
      }).catch(function (err) {
        var msg = err.message || 'Lỗi khi xóa video';
        adminToast(msg, 'error');
      });
    });
  }

  // --- Bulk Actions UI Logic ---
  window.updateBulkActionsUI = function() {
    var checkboxes = document.querySelectorAll('.video-item-checkbox');
    var checkedBoxes = document.querySelectorAll('.video-item-checkbox:checked');
    var bar = document.getElementById('bulk-actions-bar');
    var countSpan = document.getElementById('bulk-selected-count');
    var checkAll = document.getElementById('check-all-videos');
    
    if (checkedBoxes.length > 0) {
      if (bar) bar.classList.add('show');
      if (countSpan) countSpan.textContent = 'Đã chọn ' + checkedBoxes.length + ' video';
    } else {
      if (bar) bar.classList.remove('show');
    }
    
    if (checkAll) {
      checkAll.checked = (checkboxes.length > 0 && checkedBoxes.length === checkboxes.length);
      checkAll.indeterminate = (checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length);
    }
  };

  function getSelectedVideoIds() {
    var ids = [];
    document.querySelectorAll('.video-item-checkbox:checked').forEach(function(cb) {
      ids.push(+cb.dataset.id);
    });
    return ids;
  }

  function executeBulkDelete() {
    var ids = getSelectedVideoIds();
    if (!ids.length) return;
    
    adminConfirm('Bạn có chắc chắn muốn XÓA ' + ids.length + ' video không?\\nHành động này không thể hoàn tác!', function() {
      Promise.all(ids.map(function(id) { return AdminData.journey.deleteVideo(id); }))
        .then(function() {
          videos = videos.filter(function(x) { return ids.indexOf(x.id) === -1; });
          adminToast('Đã xóa ' + ids.length + ' video', 'success');
          var checkAll = document.getElementById('check-all-videos');
          if (checkAll) { checkAll.checked = false; checkAll.dispatchEvent(new Event('change')); }
          renderVideos();
          renderTopics(); // refresh counts
        })
        .catch(function(err) {
          adminToast('Lỗi khi xóa: ' + (err.message || 'thất bại'), 'error');
        });
    }, { title: 'Xóa hàng loạt', type: 'danger', okText: 'Xóa' });
  }

})();

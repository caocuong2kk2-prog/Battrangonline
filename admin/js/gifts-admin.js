(function () {
  'use strict';

  var gifts = [];
  var searchQ = '';
  var filterStatus = 'all';

  function init() {
    loadGifts();
    bindEvents();
  }

  function loadGifts() {
    var tbody = document.getElementById('gifts-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted)">Đang tải dữ liệu...</td></tr>';
    }

    AdminData.gifts.load()
      .then(function (data) {
        gifts = data || [];
        renderTable();
      })
      .catch(function (err) {
        console.error('Error loading gifts:', err);
        adminToast('Không thể tải danh sách quà tặng', 'error');
      });
  }

  function getFilteredGifts() {
    return gifts.filter(function (g) {
      var nameMatch = !searchQ || g.name.toLowerCase().includes(searchQ.toLowerCase());
      var statusMatch = filterStatus === 'all' || g.status === filterStatus;
      return nameMatch && statusMatch;
    });
  }

  function renderTable() {
    var tbody = document.getElementById('gifts-table-body');
    if (!tbody) return;

    var filtered = getFilteredGifts();
    var countEl = document.getElementById('gift-count');
    if (countEl) {
      countEl.textContent = 'Tìm thấy ' + filtered.length + ' quà tặng';
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted)">Không tìm thấy quà tặng nào.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function (g, idx) {
      var thumbHtml = g.imageUrl
        ? '<img class="gift-thumbnail" src="' + escapeHTML(g.imageUrl) + '" alt="' + escapeHTML(g.name) + '" data-lightbox-src="' + escapeHTML(g.imageUrl) + '" data-lightbox-name="' + escapeHTML(g.name) + '">'
        : '<div class="gift-thumbnail" style="display:flex;align-items:center;justify-content:center;background:var(--accent-bg);font-size:1.5rem;">🎁</div>';
      
      var valHtml = g.estimatedValue
        ? '<span style="font-weight:600;color:var(--text-dark);">' + parseFloat(g.estimatedValue).toLocaleString('vi-VN') + 'đ</span>'
        : '<span style="color:var(--text-muted)">—</span>';
      
      var stockHtml;
      if (g.stock !== null && g.stock !== undefined) {
        if (g.stock === 0) {
          stockHtml = '<span class="badge" style="background:rgba(220,38,38,0.1);color:#dc2626;font-weight:600;">Hết hàng</span>';
        } else {
          stockHtml = '<span style="font-weight:500;">' + g.stock + '</span>';
        }
      } else {
        stockHtml = '<span class="badge" style="background:rgba(16,185,129,0.1);color:#10b981;">Vô hạn</span>';
      }
      
      var statusHtml = g.status === 'active'
        ? '<span class="badge" style="background:rgba(16,185,129,0.1);color:#10b981;font-weight:600;">Đang áp dụng</span>'
        : '<span class="badge" style="background:rgba(107,114,128,0.1);color:#6b7280;">Tạm ngưng</span>';

      return '<tr>' +
        '<td style="text-align:center;"><input type="checkbox" class="gift-item-checkbox" value="' + g.id + '"></td>' +
        '<td style="text-align:center;color:var(--text-muted);font-size:var(--fs-sm);">' + (idx + 1) + '</td>' +
        '<td style="text-align:center;">' + thumbHtml + '</td>' +
        '<td><div style="font-weight:600;color:var(--text-dark);white-space:normal;word-break:break-word;">' + escapeHTML(g.name) + '</div></td>' +
        '<td style="text-align:right;">' + valHtml + '</td>' +
        '<td style="text-align:center;">' + stockHtml + '</td>' +
        '<td style="text-align:center;">' + statusHtml + '</td>' +
        '<td style="text-align:center;">' +
          '<div style="display:flex;gap:6px;justify-content:center;">' +
            '<button class="btn btn--sm btn--secondary btn-edit" data-id="' + g.id + '">✏️ Sửa</button>' +
            '<button class="btn btn--sm btn--danger btn-delete" data-id="' + g.id + '">🗑️ Xoá</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    // Update bulk UI if rendering changed selection
    var checkAll = document.getElementById('check-all-gift');
    if (checkAll) checkAll.checked = false;
    if (typeof updateGiftBulkActionsUI === 'function') updateGiftBulkActionsUI();
  }

  function bindEvents() {
    // Search & Filter
    var searchInput = document.getElementById('gift-search');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        searchQ = e.target.value.trim();
        renderTable();
      });
    }

    var statusFilter = document.getElementById('gift-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', function (e) {
        filterStatus = e.target.value;
        renderTable();
      });
    }

    // Modal Actions
    var btnAdd = document.getElementById('btn-add-gift');
    if (btnAdd) {
      btnAdd.addEventListener('click', function () {
        openModal(null);
      });
    }

    var btnSave = document.getElementById('btn-save-gift');
    if (btnSave) {
      btnSave.addEventListener('click', function () {
        saveGift();
      });
    }

    // Table buttons delegation
    var tbody = document.getElementById('gifts-table-body');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        // Lightbox: click on thumbnail image
        var thumb = e.target.closest('.gift-thumbnail[data-lightbox-src]');
        if (thumb) {
          var lightbox = document.getElementById('giftLightbox');
          var lbImg = document.getElementById('giftLightboxImg');
          var lbName = document.getElementById('giftLightboxName');
          if (lightbox && lbImg) {
            lbImg.src = thumb.dataset.lightboxSrc;
            lbImg.alt = thumb.dataset.lightboxName || '';
            if (lbName) lbName.textContent = thumb.dataset.lightboxName || '';
            lightbox.classList.add('active');
          }
          return;
        }

        var editBtn = e.target.closest('.btn-edit');
        var delBtn = e.target.closest('.btn-delete');
        if (editBtn) {
          var id = parseInt(editBtn.dataset.id);
          var gift = gifts.find(function (g) { return g.id === id; });
          if (gift) openModal(gift);
        }
        if (delBtn) {
          var id = parseInt(delBtn.dataset.id);
          var gift = gifts.find(function (g) { return g.id === id; });
          if (gift) deleteGift(gift);
        }
      });
    }

    // Lightbox close handlers
    var lightbox = document.getElementById('giftLightbox');
    var lbClose = document.getElementById('giftLightboxClose');
    function closeLightbox() {
      if (lightbox) lightbox.classList.remove('active');
    }
    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lightbox) {
      lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeLightbox();
    });

    // Money format input
    var valInput = document.querySelector('[name="estimatedValue"]');
    if (valInput) {
      valInput.addEventListener('input', function (e) {
        var val = e.target.value.replace(/[^0-9]/g, '');
        var num = parseInt(val, 10) || 0;
        e.target.value = val ? num.toLocaleString('vi-VN') : '';
      });
    }

    // Image Upload
    var btnUpload = document.getElementById('btn-upload-gift-image');
    var fileInput = document.getElementById('gift-image-file');
    var urlInput = document.getElementById('gift-image-url');

    if (btnUpload && fileInput) {
      btnUpload.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        if (this.files && this.files.length > 0) {
          uploadFile(this.files[0]);
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', function (e) {
        updatePreview(e.target.value.trim());
      });
    }

    // --- BULK ACTIONS ---
    var checkAllBtn = document.getElementById('check-all-gift');
    if (checkAllBtn) {
      checkAllBtn.addEventListener('change', function() {
        var isChecked = this.checked;
        document.querySelectorAll('.gift-item-checkbox').forEach(function(cb) {
          cb.checked = isChecked;
        });
        updateGiftBulkActionsUI();
      });
    }

    if (tbody) {
      tbody.addEventListener('change', function(e) {
        if (e.target.classList.contains('gift-item-checkbox')) {
          updateGiftBulkActionsUI();
        }
      });
    }

    var bulkDelBtn = document.getElementById('btn-gift-bulk-delete');
    if (bulkDelBtn) {
      bulkDelBtn.addEventListener('click', function() {
        var ids = getSelectedGiftIds();
        if(!ids.length) return;
        adminConfirm('Bạn có chắc chắn muốn xóa vĩnh viễn ' + ids.length + ' quà tặng này? (Sẽ hủy liên kết với sản phẩm)', function() {
          AdminData.gifts.bulkDelete(ids).then(function(res) {
            adminToast(res.message || 'Thành công', 'success');
            var checkAll = document.getElementById('check-all-gift');
            if(checkAll) checkAll.checked = false;
            loadGifts();
          }).catch(function(err) {
            adminToast(err.message || 'Lỗi hệ thống', 'error');
          });
        }, { title: 'Xác nhận xóa hàng loạt', type: 'danger', okText: 'Xóa ngay' });
      });
    }
  }

  function getSelectedGiftIds() {
    var checked = document.querySelectorAll('.gift-item-checkbox:checked');
    return Array.from(checked).map(function(cb){ return parseInt(cb.value); });
  }

  window.updateGiftBulkActionsUI = function() {
    var ids = getSelectedGiftIds();
    var bar = document.getElementById('gift-bulk-actions-bar');
    var countText = document.getElementById('gift-bulk-selected-count');
    if (ids.length > 0) {
      if(countText) countText.innerText = 'Đã chọn ' + ids.length + ' quà tặng';
      if(bar) bar.classList.add('show');
    } else {
      if(bar) bar.classList.remove('show');
    }
  };

  function uploadFile(file) {
    var btnUpload = document.getElementById('btn-upload-gift-image');
    var oldBtnText = btnUpload.innerHTML;
    btnUpload.innerHTML = '...';
    btnUpload.disabled = true;

    var formData = new FormData();
    formData.append('file', file);

    var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && (window.location.port !== '5055' && window.location.port !== '7275') ? 'http://localhost:5055/api' : '/api';

    fetch(dynamicBase + '/upload', {
      method: 'POST',
      body: formData
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      })
      .then(function (data) {
        var url = data.url || data.Url;
        if (url) {
          document.getElementById('gift-image-url').value = url;
          updatePreview(url);
          adminToast('Tải ảnh quà tặng thành công', 'success');
        }
      })
      .catch(function (err) {
        console.error(err);
        adminToast('Lỗi tải ảnh lên', 'error');
      })
      .finally(function () {
        btnUpload.innerHTML = oldBtnText;
        btnUpload.disabled = false;
        document.getElementById('gift-image-file').value = '';
      });
  }

  function updatePreview(url) {
    var previewBox = document.getElementById('gift-preview-box');
    if (!previewBox) return;
    if (url) {
      previewBox.innerHTML = '<img src="' + escapeHTML(url) + '" alt="Preview">';
    } else {
      previewBox.innerHTML = '🎁';
    }
  }

  function openModal(gift) {
    var form = document.getElementById('gift-form');
    if (!form) return;

    form.reset();
    clearInlineErrors(form);

    if (gift) {
      document.getElementById('gift-modal-title').textContent = 'Chỉnh Sửa Quà Tặng';
      form.querySelector('[name="id"]').value = gift.id;
      form.querySelector('[name="name"]').value = gift.name || '';
      form.querySelector('[name="estimatedValue"]').value = gift.estimatedValue ? Math.round(gift.estimatedValue).toLocaleString('vi-VN') : '';
      form.querySelector('[name="stock"]').value = gift.stock !== null && gift.stock !== undefined ? gift.stock : '';
      form.querySelector('[name="status"]').value = gift.status || 'active';
      form.querySelector('[name="imageUrl"]').value = gift.imageUrl || '';
      updatePreview(gift.imageUrl);
    } else {
      document.getElementById('gift-modal-title').textContent = 'Thêm Quà Tặng';
      form.querySelector('[name="id"]').value = '0';
      updatePreview(null);
    }

    if (window.openModal) {
      window.openModal('giftModal');
    }
  }

  function saveGift() {
    var form = document.getElementById('gift-form');
    if (!form) return;

    clearInlineErrors(form);

    var id = parseInt(form.querySelector('[name="id"]').value);
    var nameInp = form.querySelector('[name="name"]');
    var name = nameInp.value.trim();
    var valInp = form.querySelector('[name="estimatedValue"]');
    var rawVal = valInp.value.replace(/[^0-9]/g, '');
    var estimatedValue = rawVal ? parseFloat(rawVal) : null;
    var stockInp = form.querySelector('[name="stock"]');
    var stockVal = stockInp.value.trim();
    var stock = stockVal !== '' ? parseInt(stockVal) : null;
    var status = form.querySelector('[name="status"]').value;
    var imageUrl = form.querySelector('[name="imageUrl"]').value.trim();

    if (!name) {
      setInlineError(nameInp, 'Vui lòng nhập tên quà tặng!');
      nameInp.focus();
      return;
    }

    var data = {
      id: id,
      name: name,
      imageUrl: imageUrl || null,
      estimatedValue: estimatedValue,
      stock: stock,
      status: status
    };

    var btnSave = document.getElementById('btn-save-gift');
    var oldText = btnSave.innerHTML;
    btnSave.innerHTML = '...';
    btnSave.disabled = true;

    AdminData.gifts.save(data)
      .then(function () {
        adminToast(id ? 'Cập nhật quà tặng thành công' : 'Thêm quà tặng thành công', 'success');
        if (window.closeModal) window.closeModal('giftModal');
        loadGifts();
      })
      .catch(function (err) {
        console.error(err);
        adminToast(err.message || 'Lỗi lưu thông tin quà tặng', 'error');
      })
      .finally(function () {
        btnSave.innerHTML = oldText;
        btnSave.disabled = false;
      });
  }

  function deleteGift(gift) {
    adminConfirm('Xoá quà tặng "' + gift.name + '"? Việc này sẽ hủy liên kết của quà với tất cả sản phẩm.', function () {
      AdminData.gifts.delete(gift.id)
        .then(function () {
          adminToast('Đã xoá quà tặng', 'warning');
          loadGifts();
        })
        .catch(function (err) {
          console.error(err);
          adminToast('Lỗi khi xoá quà tặng', 'error');
        });
    });
  }

  function escapeHTML(str) {
    return window.escapeHTML ? window.escapeHTML(str) : String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();

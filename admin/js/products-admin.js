// products-admin.js
(function () {
  'use strict';
  if (!document.getElementById('products-table-body')) return;

  var products, categories = [], sizes = [], glazeLines = [], productTypes = [], materials = [], colors = [], patterns = [], currentPage = 1, pageSize = 10, searchQ = '', filterCat = 'all', filterStatus = 'all', editId = null, storeAddress = '', isPopulating = false, allGifts = [];
  var editorInstance;

  function getCategoryName(slug) {
    return AdminData.getCatName(slug) || slug;
  }
  var selectedProductIds = new Set();

  var variantCounter = 0;
  var variantsAdded = 0; // To keep numbering consistent for deleted cards

  var currentProdFaqs = [];
  window.updateProdFaq = function(idx, field, value) {
    if(currentProdFaqs[idx]) currentProdFaqs[idx][field] = value;
  };
  window.removeProdFaq = function(idx) {
    currentProdFaqs.splice(idx, 1);
    renderProdFaqs();
  };
  document.getElementById('btn-add-prod-faq')?.addEventListener('click', function() {
    currentProdFaqs.push({q:'', a:''});
    renderProdFaqs();
  });

  function renderProdFaqs() {
    var container = document.getElementById('prod-faq-list');
    if(!container) return;
    container.innerHTML = '';
    currentProdFaqs.forEach(function(faq, idx) {
      var html = '<div style="display:flex; gap:8px; align-items:flex-start; background:#f9f9f9; padding:10px; border-radius:6px; border:1px solid #eee;">' +
                 '<div style="flex:1; display:flex; flex-direction:column; gap:8px;">' +
                   '<input type="text" class="form-control" placeholder="Nhập câu hỏi (VD: Giao hàng bao lâu?)" value="'+escapeHTML(faq.q||'')+'" onchange="updateProdFaq('+idx+', \'q\', this.value)">' +
                   '<textarea class="form-control" rows="2" placeholder="Nhập câu trả lời" onchange="updateProdFaq('+idx+', \'a\', this.value)">'+escapeHTML(faq.a||'')+'</textarea>' +
                 '</div>' +
                 '<button type="button" class="btn btn--danger btn--sm" onclick="removeProdFaq('+idx+')" title="Xóa">🗑</button>' +
                 '</div>';
      container.innerHTML += html;
    });
  }

  function updateVariantTabBadge() {
    var count = document.querySelectorAll('.variant-card').length;
    var badge = document.getElementById('variant-count-badge');
    if (badge) badge.textContent = count;
  }

  function getSkuForCategory(categorySlug, productId) {
    var prefix = 'SP';
    if (categorySlug) {
      var parts = categorySlug.split('-');
      if (parts.length >= 2) {
        prefix = (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      } else if (parts[0].length >= 2) {
        prefix = parts[0].substring(0, 2).toUpperCase();
      } else if (parts[0].length === 1) {
        prefix = parts[0].toUpperCase() + 'X';
      }
    }
    return prefix + '-' + String(productId).padStart(3, '0');
  }

  function getNextProductId() {
    if (!products || products.length === 0) return 1;
    var maxId = 0;
    products.forEach(function(p) {
      if (p.id > maxId) maxId = p.id;
    });
    return maxId + 1;
  }

  function getSelectText(selectEl) {
    if (!selectEl) return '';
    var opt = selectEl.options[selectEl.selectedIndex];
    return opt && opt.value ? opt.text : '';
  }

  function updateAccordionHeader(card) {
    var size = getSelectText(card.querySelector('.v-size'));
    var ptype = getSelectText(card.querySelector('.v-ptype'));
    var glaze = getSelectText(card.querySelector('.v-glaze'));
    var material = getSelectText(card.querySelector('.v-material'));
    var color = getSelectText(card.querySelector('.v-color'));
    var pattern = getSelectText(card.querySelector('.v-pattern'));
    var price = card.querySelector('.v-price').value || '0';
    var stock = card.querySelector('.v-stock').value || '0';

    var titleParts = [size, pattern, color].filter(Boolean);
    var numPrice = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    var formattedPrice = numPrice > 0 ? numPrice.toLocaleString('vi-VN') + 'đ' : 'Chưa có giá';

    // Stylize the stock text depending on vId and stock level
    var vIdVal = card.querySelector('.v-id') ? parseInt(card.querySelector('.v-id').value) || 0 : 0;
    var stockHtml = '';
    if (vIdVal === 0 && parseInt(stock) === 0) {
      stockHtml = 'Tồn: ' + stock;
    } else if (parseInt(stock) < 5) {
      stockHtml = '<span style="color: #c62828; font-weight: 600;">Tồn: ' + stock + '</span>';
    } else {
      stockHtml = '<span style="color: #2e7d32; font-weight: 600;">Tồn: ' + stock + '</span>';
    }

    var subtitleParts = [ptype, material, formattedPrice, stockHtml].filter(Boolean);

    var titleStr = titleParts.length > 0 ? titleParts.join(' • ') : 'Phiên bản mới';
    var subtitleStr = subtitleParts.length > 0 ? subtitleParts.join(' • ') : 'Chưa nhập đủ thông tin';

    var accTitle = card.querySelector('.acc-title');
    accTitle.textContent = titleStr;
    accTitle.title = titleStr;

    var accSubtitle = card.querySelector('.acc-subtitle');
    accSubtitle.innerHTML = subtitleStr;
    accSubtitle.title = subtitleStr.replace(/<[^>]*>/g, '');
  }

  window.addVariantCard = function (v = null) {
    var container = document.getElementById('variants-container');
    if (!container) return;

    variantCounter++;
    variantsAdded++;
    var currentVariantIndex = variantsAdded;
    var isAdmin = window.getAdminSession ? (window.getAdminSession().role === 'admin') : false;
    
    var vIdKey = 'variant_' + variantCounter;
    var card = document.createElement('div');
    card.className = 'variant-card variant-accordion';
    card.style.cssText = 'border: 1px solid #eee; border-radius: 8px; margin-bottom: 15px; background: #faf8f5; overflow: hidden;';

    function makeSelect(options, defaultText, val) {
      var html = '<option value="">' + defaultText + '</option>';
      options.forEach(function (o) {
        var selected = (v && val == (o.id || o.Id)) ? 'selected' : '';
        html += '<option value="' + (o.id || o.Id) + '" ' + selected + '>' + (o.name || o.Name) + '</option>';
      });
      return html;
    }

    var variantImages = (v && v.images) ? v.images : (v && v.mediaUrl ? [v.mediaUrl] : []);

    var hasExtraValues = !!(v && (
      v.productTypeId || 
      v.materialId || 
      v.colorId || 
      v.patternId
    ));

    card.innerHTML = `
        <div class="acc-header" style="display: flex; align-items: flex-start; justify-content: space-between; padding: 12px 15px; cursor: pointer; user-select: none; gap: 12px;">
            <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
                <div class="acc-number" style="width: 24px; height: 24px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 2px;">${currentVariantIndex}</div>
                <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                    <div class="acc-title" style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: ${v ? 'nowrap' : 'normal'}; transition: white-space 0.3s;">Phiên bản mới</div>
                    <div class="acc-subtitle" style="font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: ${v ? 'nowrap' : 'normal'}; transition: white-space 0.3s;">Chưa nhập đủ thông tin</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                <button type="button" class="btn btn--sm btn-duplicate-variant" title="Nhân bản phiên bản" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 6px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                ${isAdmin ? `<button type="button" class="btn btn--sm btn-delete-variant" title="Xóa phiên bản" style="background: transparent; border: 1px solid var(--border); color: var(--danger); padding: 6px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : ''}
                <div class="acc-chevron" style="transition: transform 0.3s; color: var(--text-muted); padding: 4px; display: flex; align-items: center; transform: ${v ? 'rotate(0)' : 'rotate(180deg)'};"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
            </div>
        </div>
        <div class="acc-body-wrapper" style="display: grid; grid-template-rows: ${v ? '0fr' : '1fr'}; transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1); background: white;">
            <div class="acc-body" style="min-height: 0; overflow: hidden; border-top: 1px solid #eee;">
                <div style="padding: 15px;">
                    <input type="hidden" class="v-id" value="${v ? v.id : 0}">
            
            <!-- Primary attributes (Kích thước, Giá, Tồn kho, Dòng men) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px;">
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Kích thước <span style="color:red">*</span></label>
                    <select class="form-control v-size" style="background: #fff; padding: 8px 12px;">${makeSelect(sizes, 'Chọn kích thước...', v ? v.sizeId : null)}</select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Giá bán (VNĐ) <span style="color:red">*</span></label>
                    <input type="text" class="form-control v-price" value="${v ? (v.price || '') : ''}" placeholder="VD: 4500000" style="background: #fff; padding: 8px 12px; font-weight: 600; color: var(--accent);">
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Giá gốc (VNĐ)</label>
                    <input type="text" class="form-control v-original-price" value="${v ? (v.originalPrice || '') : ''}" placeholder="VD: 5000000" style="background: #fff; padding: 8px 12px; font-weight: 500; color: #777;">
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Tồn kho <span style="color:red">*</span></label>
                    <input type="number" class="form-control v-stock" value="${v ? (v.stock || 0) : 0}" style="background: #fff; padding: 8px 12px; font-weight: 600;">
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Dòng men</label>
                    <select class="form-control v-glaze" style="background: #fff; padding: 8px 12px;">${makeSelect(glazeLines, 'Chọn men...', v ? v.glazeLineId : null)}</select>
                </div>
            </div>

            <!-- Toggle attributes button -->
            <div class="toggle-extra-attrs" style="display: flex; align-items: center; justify-content: ${hasExtraValues ? 'space-between' : 'center'}; padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; background: #fff; font-size: 13px; font-weight: 500; color: #333; margin: 15px 0; user-select: none; transition: all 0.2s;">
                ${hasExtraValues ? `
                    <span class="toggle-action">— Ẩn thuộc tính phụ</span>
                    <span class="toggle-info" style="color: #888; font-weight: normal; font-size: 12px;">Thêm thuộc tính (chất liệu, màu sắc, hoa văn, phân khúc)</span>
                ` : `
                    <span class="toggle-action">+ Thêm thuộc tính (chất liệu, màu sắc, hoa văn, phân khúc)</span>
                `}
            </div>

            <!-- Extra attributes (Chất liệu, Màu sắc, Hoa văn, Phân khúc) with smooth transition height -->
            <div class="extra-attrs-wrapper" style="display: grid; grid-template-rows: ${hasExtraValues ? '1fr' : '0fr'}; transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden;">
                <div class="variant-extra-grid" style="min-height: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; padding-bottom: ${hasExtraValues ? '20px' : '0px'}; transition: padding-bottom 0.3s;">
                    <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Chất liệu</label>
                        <select class="form-control v-material" style="background: #fff; padding: 8px 12px;">${makeSelect(materials, 'Chọn...', v ? v.materialId : null)}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Màu sắc</label>
                        <select class="form-control v-color" style="background: #fff; padding: 8px 12px;">${makeSelect(colors, 'Chọn...', v ? v.colorId : null)}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Hoa văn</label>
                        <select class="form-control v-pattern" style="background: #fff; padding: 8px 12px;">${makeSelect(patterns, 'Chọn...', v ? v.patternId : null)}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: var(--text-secondary); font-size: 13px;">Phân khúc</label>
                        <select class="form-control v-ptype" style="background: #fff; padding: 8px 12px;">${makeSelect(productTypes, 'Chọn...', v ? v.productTypeId : null)}</select>
                    </div>
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="color: #666; font-weight: normal;">Ảnh / video loại này</label>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
                    <div style="flex:1;min-width:200px;display:none;">
                        <input class="form-control variant-image-upload" data-vid="${vIdKey}" type="file" accept="image/*,video/*" multiple style="margin-bottom:0; background: #fff;">
                    </div>
                    <div class="variant-image-gallery" data-vid="${vIdKey}" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
                    <div style="display:flex;flex:1;min-width:180px;gap:6px;">
                        <input class="form-control variant-video-link" data-vid="${vIdKey}" type="text" placeholder="Dán link ảnh/video" style="margin-bottom:0;flex:1;background: #fff; padding: 8px 12px; height: 36px;">
                        <button type="button" class="btn btn--secondary btn-add-variant-link" data-vid="${vIdKey}" style="white-space:nowrap;padding:0 12px;height:36px; border-radius: 6px;">➕ Thêm</button>
                    </div>
                </div>
                <input type="hidden" class="v-images-data" value="${JSON.stringify(variantImages).replace(/"/g, '&quot;')}">
            </div>
                </div>
            </div>
        </div>
    `;

    var pInput = card.querySelector('.v-price');
    if (pInput) {
      pInput.addEventListener('input', function (e) {
        var val = e.target.value.replace(/[^0-9]/g, '');
        var num = parseInt(val, 10) || 0;
        if (num > 1000000000) {
          num = 1000000000;
          val = '1000000000';
        }
        e.target.value = val ? String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
      });
      if (pInput.value) pInput.dispatchEvent(new Event('input'));
    }

    var opInput = card.querySelector('.v-original-price');
    if (opInput) {
      opInput.addEventListener('input', function (e) {
        var val = e.target.value.replace(/[^0-9]/g, '');
        var num = parseInt(val, 10) || 0;
        if (num > 1000000000) {
          num = 1000000000;
          val = '1000000000';
        }
        e.target.value = val ? String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
      });
      if (opInput.value) opInput.dispatchEvent(new Event('input'));
    }

    var sInput = card.querySelector('.v-stock');
    if (sInput) {
      sInput.addEventListener('input', function (e) {
        var val = e.target.value.replace(/[^0-9]/g, '');
        var num = parseInt(val, 10) || 0;
        if (num > 1000) {
          e.target.value = 1000;
        } else if (num < 0) {
          e.target.value = 0;
        } else {
          e.target.value = val ? num : 0;
        }
      });
    }

    // Bind toggle events for extra attributes container
    var toggleBtn = card.querySelector('.toggle-extra-attrs');
    var extraWrapper = card.querySelector('.extra-attrs-wrapper');
    var extraGrid = card.querySelector('.variant-extra-grid');
    if (toggleBtn && extraWrapper && extraGrid) {
      toggleBtn.addEventListener('click', function () {
        var isExpanded = extraWrapper.style.gridTemplateRows === '1fr';
        if (isExpanded) {
          extraWrapper.style.gridTemplateRows = '0fr';
          extraGrid.style.paddingBottom = '0px';
          toggleBtn.style.justifyContent = 'center';
          toggleBtn.innerHTML = `
              <span class="toggle-action">+ Thêm thuộc tính (chất liệu, màu sắc, hoa văn, phân khúc)</span>
          `;
        } else {
          extraWrapper.style.gridTemplateRows = '1fr';
          extraGrid.style.paddingBottom = '20px';
          toggleBtn.style.justifyContent = 'space-between';
          toggleBtn.innerHTML = `
              <span class="toggle-action">— Ẩn thuộc tính phụ</span>
              <span class="toggle-info" style="color: #888; font-weight: normal; font-size: 12px;">Thêm thuộc tính (chất liệu, màu sắc, hoa văn, phân khúc)</span>
          `;
        }
      });

      // Hover highlight style transitions
      toggleBtn.addEventListener('mouseenter', function () {
        toggleBtn.style.borderColor = 'var(--accent)';
        toggleBtn.style.color = 'var(--accent)';
        toggleBtn.style.background = '#fffaf4';
      });
      toggleBtn.addEventListener('mouseleave', function () {
        toggleBtn.style.borderColor = '#e2e8f0';
        toggleBtn.style.color = '#333';
        toggleBtn.style.background = '#fff';
      });
    }

    container.appendChild(card);

    // Initialize custom selects for this new card
    card.querySelectorAll('select').forEach(function (sel) {
      if (window.initCustomSelects) {
        window.initCustomSelects(sel.parentNode);
      }
    });

    // Bind duplicate event
    var btnDup = card.querySelector('.btn-duplicate-variant');
    if (btnDup) {
      btnDup.addEventListener('click', function () {
        var pInputVal = card.querySelector('.v-price').value.replace(/[^0-9]/g, '');
        var opInputVal = card.querySelector('.v-original-price') ? card.querySelector('.v-original-price').value.replace(/[^0-9]/g, '') : '';
        var newV = {
          id: 0,
          sizeId: parseInt(card.querySelector('.v-size').value) || null,
          productTypeId: parseInt(card.querySelector('.v-ptype').value) || null,
          glazeLineId: parseInt(card.querySelector('.v-glaze').value) || null,
          materialId: parseInt(card.querySelector('.v-material').value) || null,
          colorId: parseInt(card.querySelector('.v-color').value) || null,
          patternId: parseInt(card.querySelector('.v-pattern').value) || null,
          price: pInputVal ? parseFloat(pInputVal) : 0,
          originalPrice: opInputVal ? parseFloat(opInputVal) : null,
          stock: parseInt(card.querySelector('.v-stock').value) || 0,
          images: JSON.parse(card.querySelector('.v-images-data').value || '[]')
        };
        window.addVariantCard(newV);
      });
    }

    // Render initial gallery
    renderVariantGallery(card, variantImages);

    // Bind link add event
    var btnAddLink = card.querySelector('.btn-add-variant-link');
    var linkInput = card.querySelector('.variant-video-link');
    if (btnAddLink && linkInput) {
      btnAddLink.addEventListener('click', function () {
        var url = linkInput.value.trim();
        if (url) {
          variantImages.push(url);
          renderVariantGallery(card, variantImages);
          linkInput.value = '';
        }
      });
    }

    // Accordion Toggle Logic
    var accHeader = card.querySelector('.acc-header');
    var accBodyWrapper = card.querySelector('.acc-body-wrapper');
    var accChevron = card.querySelector('.acc-chevron');

    accHeader.addEventListener('click', function(e) {
        if (e.target.closest('.btn-duplicate-variant') || e.target.closest('.btn-delete-variant')) return;
        var isExpanded = accBodyWrapper.style.gridTemplateRows === '1fr';
        accBodyWrapper.style.gridTemplateRows = isExpanded ? '0fr' : '1fr';
        accChevron.style.transform = isExpanded ? 'rotate(0)' : 'rotate(180deg)';
        
        var titleEl = card.querySelector('.acc-title');
        var subtitleEl = card.querySelector('.acc-subtitle');
        if (titleEl) titleEl.style.whiteSpace = isExpanded ? 'nowrap' : 'normal';
        if (subtitleEl) subtitleEl.style.whiteSpace = isExpanded ? 'nowrap' : 'normal';
    });

    // Delete Logic
    var btnDelete = card.querySelector('.btn-delete-variant');
    if (btnDelete) {
        btnDelete.addEventListener('click', function() {
            card.remove();
            updateVariantTabBadge();
        });
    }

    // Attach listener to inputs for dynamic header update
    card.querySelectorAll('select, input').forEach(function(el) {
        el.addEventListener('change', function() { updateAccordionHeader(card); });
        el.addEventListener('input', function() { updateAccordionHeader(card); });
    });

    updateAccordionHeader(card);
    updateVariantTabBadge();

    // Bind file upload event (mock using FileHelper logic later)
    var fileInput = card.querySelector('.variant-image-upload');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (this.files && this.files.length > 0) {
          var oldBtnText = btnAddLink.innerHTML;
          btnAddLink.innerHTML = '...';
          btnAddLink.disabled = true;

          var files = Array.from(this.files);
          var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055' ? 'http://localhost:5055/api' : '/api';

          var uploadPromises = files.map(function (file) {
            var formData = new FormData();
            formData.append('file', file);
            return fetch(dynamicBase + '/upload', {
              method: 'POST',
              body: formData
            }).then(res => res.json());
          });

          Promise.all(uploadPromises).then(function (results) {
            results.forEach(function (data) {
              var finalUrl = data.url || data.Url;
              if (finalUrl) {
                variantImages.push(finalUrl);
              }
            });
            renderVariantGallery(card, variantImages);
            adminToast('Tải file thành công', 'success');
          }).catch(function (e) {
            console.error('Upload failed', e);
            adminToast('Lỗi tải file', 'error');
          }).finally(function () {
            fileInput.value = '';
            btnAddLink.innerHTML = oldBtnText;
            btnAddLink.disabled = false;
          });
        }
      });
    }
  };

  function renderVariantGallery(card, imgs) {
    var hiddenInput = card.querySelector('.v-images-data');
    if (hiddenInput) hiddenInput.value = JSON.stringify(imgs);
    var gallery = card.querySelector('.variant-image-gallery');
    if (!gallery) return;

    var galleryHTML = imgs.map(function (img, idx) {
      var thumbHtml = generateAdminThumbnailHTML(img, 60, 'gallery-img zoomable');
      var moveLeftBtn = idx > 0 ? '<button type="button" class="btn-move-left" data-idx="' + idx + '" style="position:absolute;bottom:0;left:0;background:rgba(0,0,0,0.5);color:white;border:none;border-radius:0 4px 0 0;width:24px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">&lsaquo;</button>' : '';
      var moveRightBtn = idx < imgs.length - 1 ? '<button type="button" class="btn-move-right" data-idx="' + idx + '" style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.5);color:white;border:none;border-radius:4px 0 0 0;width:24px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">&rsaquo;</button>' : '';

      return '<div class="gallery-item" style="position:relative;width:60px;height:60px;overflow:hidden;border-radius:4px;">' + thumbHtml + moveLeftBtn + moveRightBtn + '<button type="button" class="btn-remove-img" data-idx="' + idx + '" style="position:absolute;top:2px;right:2px;background:var(--danger);color:white;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-sm);padding:0;z-index:2;">&times;</button></div>';
    }).join('');
    var uploadBtnHTML = '<div class="gallery-upload-btn" onclick="this.closest(\'.form-group\').querySelector(\'.variant-image-upload\').click()" style="width:60px;height:60px;border:2px dashed var(--border-color);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:var(--text-muted); transition: all 0.2s;">+</div>';
    gallery.innerHTML = '<div class="gallery-container" style="display:flex;gap:10px;flex-wrap:wrap;">' + galleryHTML + uploadBtnHTML + '</div>';

    initAdminAsyncThumbnails(gallery);

    gallery.querySelectorAll('.btn-remove-img').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var index = parseInt(this.dataset.idx);
        imgs.splice(index, 1);
        renderVariantGallery(card, imgs);
      });
    });

    gallery.querySelectorAll('.btn-move-left').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var index = parseInt(this.dataset.idx);
        if (index > 0) {
          var temp = imgs[index];
          imgs[index] = imgs[index - 1];
          imgs[index - 1] = temp;
          renderVariantGallery(card, imgs);
        }
      });
    });

    gallery.querySelectorAll('.btn-move-right').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var index = parseInt(this.dataset.idx);
        if (index < imgs.length - 1) {
          var temp = imgs[index];
          imgs[index] = imgs[index + 1];
          imgs[index + 1] = temp;
          renderVariantGallery(card, imgs);
        }
      });
    });
  }

  function init() {
    var EditorClass = typeof CKEDITOR !== 'undefined' ? CKEDITOR.ClassicEditor : (typeof ClassicEditor !== 'undefined' ? ClassicEditor : null);
    if (EditorClass) {
      function CustomUploadAdapterPlugin(editor) {
        editor.plugins.get('FileRepository').createUploadAdapter = function (loader) {
          return {
            upload: function () {
              return loader.file.then(function (file) {
                return new Promise(function (resolve, reject) {
                  var reader = new FileReader();
                  reader.onload = function () { resolve({ default: reader.result }); };
                  reader.onerror = function (error) { reject(error); };
                  reader.readAsDataURL(file);
                });
              });
            },
            abort: function () { }
          };
        };
      }

      var plugins = [
        'Alignment', 'Autoformat', 'BlockQuote', 'Bold', 'Code', 'CodeBlock',
        'FindAndReplace', 'FontColor', 'FontFamily', 'FontSize', 'FontBackgroundColor',
        'Heading', 'Highlight', 'HorizontalLine', 'Image', 'ImageCaption',
        'ImageStyle', 'ImageToolbar', 'ImageUpload', 'Indent', 'IndentBlock', 'Italic',
        'Link', 'List', 'ListProperties', 'MediaEmbed', 'Paragraph', 'PasteFromOffice',
        'PictureEditing', 'RemoveFormat', 'SpecialCharacters', 'SpecialCharactersEssentials',
        'Strikethrough', 'Subscript', 'Superscript', 'Table', 'TableToolbar',
        'TodoList', 'Underline', 'ImageResize'
      ];

      EditorClass.create(document.querySelector('#product-description'), {
        plugins: typeof CKEDITOR !== 'undefined' ? plugins : undefined,
        extraPlugins: [CustomUploadAdapterPlugin],
        toolbar: {
          items: [
            'heading', '|',
            'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', '|',
            'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'highlight', '|',
            'alignment', 'outdent', 'indent', '|',
            'bulletedList', 'numberedList', 'todoList', '|',
            'insertTable', 'imageUpload', 'mediaEmbed', 'horizontalLine', 'specialCharacters', '|',
            'removeFormat', 'findAndReplace', '|',
            'undo', 'redo'
          ],
          shouldNotGroupWhenFull: true
        },
        image: {
          styles: [
            'alignLeft', 'alignCenter', 'alignRight', 'inline', 'block', 'side'
          ],
          resizeOptions: [
            {
              name: 'resizeImage:original',
              label: 'Original',
              value: null
            },
            {
              name: 'resizeImage:50',
              label: '50%',
              value: '50'
            },
            {
              name: 'resizeImage:75',
              label: '75%',
              value: '75'
            }
          ],
          toolbar: [
            'imageStyle:wrapText',
            'imageStyle:breakText',
            '|',
            'imageStyle:alignLeft',
            'imageStyle:alignCenter',
            'imageStyle:alignRight',
            '|',
            'toggleImageCaption',
            'imageTextAlternative',
            '|',
            'resizeImage'
          ]
        }
      })
        .then(function (editor) { editorInstance = editor; })
        .catch(function (error) { console.error(error); });
    }
    Promise.all([
      AdminData.products.load(),
      AdminData.glazeLines.load(),
      AdminData.productTypes.load(),
      AdminData.materials.load(),
      AdminData.colors.load(),
      AdminData.patterns.load(),
      AdminData.settings.load(),
      AdminData.sizes.load(),
      AdminData.categories.load(),
      AdminData.gifts.load()
    ]).then(function (res) {
      products = res[0];
      categories = res[8] || [];
      allGifts = res[9] || [];
      renderGiftsSelector();

      function populateSelect(data, selectName, defaultText) {
        var sel = document.querySelector('[name="' + selectName + '"]');
        if (sel) {
          sel.innerHTML = '<option value="">-- ' + defaultText + ' --</option>';
          data.forEach(function (item) {
            var opt = document.createElement('option');
            opt.value = item.id || item.Id;
            opt.textContent = item.name || item.Name;
            sel.appendChild(opt);
            if (item.subCategories && Array.isArray(item.subCategories)) {
              item.subCategories.forEach(function(sc) {
                var subOpt = document.createElement('option');
                subOpt.value = sc.id || sc.Id;
                subOpt.textContent = '— ' + (sc.name || sc.Name);
                sel.appendChild(subOpt);
              });
            }
          });
          if (window.initCustomSelects) {
            var wrapper = sel.closest('.custom-select-wrapper');
            if (wrapper) {
              var selectId = wrapper.dataset.selectId;
              if (selectId) {
                var options = document.querySelector('.custom-select__options[data-select-id="' + selectId + '"]');
                if (options) options.remove();
              }
              sel.classList.remove('custom-select-hidden');
              sel.style.display = '';
              wrapper.parentNode.insertBefore(sel, wrapper);
              wrapper.remove();
            }
            window.initCustomSelects(sel.parentNode);
          }
        }
      }

      // Populate category form dropdown dynamically
      populateSelect(categories, 'category', 'Chọn danh mục');

      // Populate category filter dropdown dynamically
      var filterSel = document.getElementById('product-cat-filter');
      if (filterSel) {
        filterSel.innerHTML = '<option value="all">Tất cả danh mục</option>';
        categories.forEach(function (item) {
          var opt = document.createElement('option');
          opt.value = item.id || item.Id;
          opt.textContent = item.name || item.Name;
          filterSel.appendChild(opt);
          if (item.subCategories && Array.isArray(item.subCategories)) {
            item.subCategories.forEach(function(sc) {
              var subOpt = document.createElement('option');
              subOpt.value = sc.id || sc.Id;
              subOpt.textContent = '— ' + (sc.name || sc.Name);
              filterSel.appendChild(subOpt);
            });
          }
        });

        if (window.initCustomSelects) {
          var wrapper = filterSel.closest('.custom-select-wrapper');
          if (wrapper) {
            var selectId = wrapper.dataset.selectId;
            if (selectId) {
              var options = document.querySelector('.custom-select__options[data-select-id="' + selectId + '"]');
              if (options) options.remove();
            }
            filterSel.classList.remove('custom-select-hidden');
            filterSel.style.display = '';
            wrapper.parentNode.insertBefore(filterSel, wrapper);
            wrapper.remove();
          }
          window.initCustomSelects(filterSel.parentNode);
        }
      }

      glazeLines = res[1];
      productTypes = res[2];
      materials = res[3];
      colors = res[4];
      patterns = res[5];
      sizes = res[7] || [];

      // Handle site settings for default address (origin)
      var settings = res[6] || {};
      storeAddress = settings.address || settings.Address || '';

      renderTable();
      bindEvents();
    }).catch(function (e) { console.error(e); });
  }

  function renderGiftsSelector() {
    var container = document.getElementById('product-gifts-container');
    if (container) {
      container.style.flexDirection = 'column';
      container.style.alignItems = 'stretch';
      container.style.gap = '8px';
    }
    
    var activeGifts = (allGifts || []).filter(function (g) { return g.status === 'active'; });
    if (activeGifts.length === 0) {
      container.innerHTML = '<span style="color:var(--text-muted); font-size:13px;">Không có quà tặng nào đang hoạt động.</span>';
      return;
    }
    
    container.innerHTML = allGifts.map(function (g) {
      var imgHtml = g.imageUrl
        ? '<img src="' + escapeHTML(window.resolveImgUrl ? window.resolveImgUrl(g.imageUrl) : g.imageUrl) + '" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid var(--border); flex-shrink:0;">'
        : '🎁';
      var valHtml = g.estimatedValue
        ? ' <span style="color:#d68b3f;">(' + parseFloat(g.estimatedValue).toLocaleString('vi-VN') + 'đ)</span>'
        : '';
      
      return '<div style="display:flex; align-items:center; justify-content:space-between; background:#fff; padding:10px 14px; border:1px solid var(--border); border-radius:var(--r-md); font-size:13px; font-weight:500; color:var(--text-primary); transition:all var(--t-fast); box-sizing: border-box;">' +
               '<label style="display:flex; align-items:center; gap:12px; cursor:pointer; margin:0; flex:1;">' +
                 '<input type="checkbox" class="product-gift-checkbox" value="' + g.id + '" style="cursor:pointer; width:16px; height:16px;" onchange="var qty = this.closest(\'div\').querySelector(\'.product-gift-qty\'); qty.disabled = !this.checked; if(!this.checked) qty.value = 1;">' +
                 imgHtml +
                 '<span style="line-height:1.5;">' + escapeHTML(g.name) + valHtml + '<br><span style="font-size:11.5px;color:var(--text-muted);font-weight:400;">' + (g.stock !== null && g.stock !== undefined ? 'Tồn kho: ' + g.stock : 'Tồn kho: Không giới hạn') + '</span></span>' +
               '</label>' +
               '<div style="display:flex; align-items:center; gap:8px; padding-left: 15px; border-left: 1px dashed var(--border); margin-left: 10px;">' +
                 '<span style="font-size:12px; color:var(--text-muted); font-weight:500;">Số lượng:</span>' +
                 '<input type="number" class="product-gift-qty" data-id="' + g.id + '" data-stock="' + (g.stock !== null && g.stock !== undefined ? g.stock : 9999) + '" value="1" min="1" max="' + (g.stock !== null && g.stock !== undefined ? g.stock : 9999) + '" style="width:60px; height:32px; text-align:center; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px; transition: border 0.2s; outline:none; background: #fafafa;" disabled onchange="if(this.value<1) this.value=1; var max = parseInt(this.dataset.stock); if(this.value>max) this.value=max;" onfocus="this.style.borderColor=\'var(--accent)\'" onblur="this.style.borderColor=\'var(--border)\'">' +
               '</div>' +
             '</div>';
    }).join('');
  }

  function renderImageGallery(imgs) {
    var urlInput = document.getElementById('product-image-url');
    if (urlInput) urlInput.value = JSON.stringify(imgs);
    var gallery = document.getElementById('product-image-gallery');
    if (!gallery) return;
    var galleryHTML = imgs.map(function (img, idx) {
      var thumbHtml = generateAdminThumbnailHTML(img, 60, 'gallery-img zoomable');
      var moveLeftBtn = idx > 0 ? '<button type="button" class="btn-move-left" data-idx="' + idx + '" style="position:absolute;bottom:0;left:0;background:rgba(0,0,0,0.5);color:white;border:none;border-radius:0 4px 0 0;width:24px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">&lsaquo;</button>' : '';
      var moveRightBtn = idx < imgs.length - 1 ? '<button type="button" class="btn-move-right" data-idx="' + idx + '" style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.5);color:white;border:none;border-radius:4px 0 0 0;width:24px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">&rsaquo;</button>' : '';

      return '<div class="gallery-item" style="position:relative;width:60px;height:60px;overflow:hidden;border-radius:4px;">' + thumbHtml + moveLeftBtn + moveRightBtn + '<button type="button" class="btn-remove-img" data-idx="' + idx + '" style="position:absolute;top:2px;right:2px;background:var(--danger);color:white;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-sm);padding:0;z-index:2;">&times;</button></div>';
    }).join('');
    var uploadBtnHTML = '<div class="gallery-upload-btn" onclick="document.getElementById(\'product-image-upload\').click()" style="width:60px;height:60px;border:2px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:#888;">+</div>';
    gallery.innerHTML = '<div class="gallery-container" style="display:flex;gap:10px;flex-wrap:wrap;">' + galleryHTML + uploadBtnHTML + '</div>';

    initAdminAsyncThumbnails(gallery);

    gallery.querySelectorAll('.btn-remove-img').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var index = parseInt(this.dataset.idx);
        imgs.splice(index, 1);
        renderImageGallery(imgs);
      });
    });

    gallery.querySelectorAll('.btn-move-left').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var index = parseInt(this.dataset.idx);
        if (index > 0) {
          var temp = imgs[index];
          imgs[index] = imgs[index - 1];
          imgs[index - 1] = temp;
          renderImageGallery(imgs);
        }
      });
    });

    gallery.querySelectorAll('.btn-move-right').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var index = parseInt(this.dataset.idx);
        if (index < imgs.length - 1) {
          var temp = imgs[index];
          imgs[index] = imgs[index + 1];
          imgs[index + 1] = temp;
          renderImageGallery(imgs);
        }
      });
    });
  }

  function getFiltered() {
    return products.filter(function (p) {
      var q = searchQ.toLowerCase();
      var pCode = p.sku || getSkuForCategory(p.category, p.id);
      var matchQ = !q ||
        p.name.toLowerCase().includes(q) ||
        getCategoryName(p.category).toLowerCase().includes(q) ||
        pCode.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        String(p.id) === q ||
        ('sp' + p.id) === q ||
        (p.material && p.material.toLowerCase().includes(q)) ||
        (p.pattern && p.pattern.toLowerCase().includes(q));

      if (!matchQ && q) {
        var gl = glazeLines.find(function (g) { return (g.id || g.Id) == p.glazeLineId; });
        var glName = gl ? (gl.name || gl.Name || '') : '';
        if (glName.toLowerCase().includes(q)) {
          matchQ = true;
        }
      }

      if (!matchQ && q && p.variants && p.variants.length > 0) {
        var qNum = q.replace(/[^0-9]/g, '');
        matchQ = p.variants.some(function (v) {
          var matchSize = (v.size || '').toLowerCase().includes(q);
          var matchPrice = qNum !== '' && String(v.price || '').includes(qNum);
          return matchSize || matchPrice;
        });
      }
      var matchCat = filterCat === 'all' || p.category === filterCat;
      var matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchQ && matchCat && matchStatus;
    });
  }

  function getUniqueNames(variants, dataArray, idField) {
    if (!variants || !variants.length) return '';
    var names = [];
    variants.forEach(function(v) {
      var id = v[idField];
      if (id) {
        var found = dataArray.find(function(item) { return (item.id || item.Id) == id; });
        if (found) {
           var n = found.name || found.Name;
           if (names.indexOf(n) === -1) names.push(n);
        }
      }
    });
    return names.join(', ');
  }

  function renderTable() {
    var isAdmin = window.getAdminSession ? (window.getAdminSession().role === 'admin') : false;
    var filtered = getFiltered();
    var total = filtered.length;
    var pages = Math.ceil(total / pageSize) || 1;
    if (currentPage > pages) currentPage = 1;
    var start = (currentPage - 1) * pageSize;
    var slice = filtered.slice(start, start + pageSize);

    var tbody = document.getElementById('products-table-body');
    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="12"><div class="empty-state"><div class="empty-state__icon">📦</div><div class="empty-state__title">Không có sản phẩm</div></div></td></tr>';
    } else {
      tbody.innerHTML = slice.map(function (p, idx) {
        var stt = start + idx + 1;
        var isChecked = selectedProductIds.has(p.id) ? 'checked' : '';
        var isStatusActive = p.status === 'active';
        var statusText = isStatusActive ? '<span style="font-size:var(--fs-xs);color:var(--success);font-weight:600;white-space:nowrap">Đang bán</span>' : '<span style="font-size:var(--fs-xs);color:var(--text-muted);white-space:nowrap">Ngừng bán</span>';
        var statusToggleHtml = '<div style="display:flex;align-items:center;gap:8px" title="Bấm để chuyển trạng thái nhanh"><label class="toggle"><input type="checkbox" class="quick-status-toggle" data-id="' + p.id + '" ' + (isStatusActive ? 'checked' : '') + '><span class="toggle__slider"></span></label>' + statusText + '</div>';
        var badgePill = p.marketingBadges ? '<span class="badge badge--gold" style="margin-left:4px">' + p.marketingBadges + '</span>' : '';
        var allImages = (p.variants || []).reduce((acc, v) => acc.concat(v.images || []), []);
        var firstImg = allImages.length > 0 ? allImages[0] : null;
        var imgHtml = '';
        if (firstImg) {
          imgHtml = generateAdminThumbnailHTML(firstImg, 60, 'product-thumb zoomable', 'data-images="' + JSON.stringify(allImages).replace(/"/g, '&quot;') + '"');
        } else {
          imgHtml = '<div class="product-thumb" style="background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:2rem;width:60px;height:60px;border-radius:6px;">🏺</div>';
        }

        var productCode = '<span style="font-weight:700;color:var(--accent);background:rgba(200,146,42,0.1);border:1px solid rgba(200,146,42,0.25);border-radius:4px;padding:2px 6px;font-size:11px;letter-spacing:0.04em;white-space:nowrap;">' + (p.sku || getSkuForCategory(p.category, p.id)) + '</span>';

        var priceDisplay = '<strong>0đ</strong>';
        var variantCountStr = '<span style="color:#888;font-size:13px;">Chưa có</span>';
        
        if (p.variants && p.variants.length > 0) {
            var prices = p.variants.map(function(v) { return v.price || 0; });
            var minPrice = Math.min.apply(null, prices);
            var maxPrice = Math.max.apply(null, prices);
            
            if (minPrice === maxPrice) {
                priceDisplay = '<strong>' + AdminData.fmt(minPrice) + '</strong>';
                var originalPrices = p.variants.map(function(v) { return v.originalPrice || 0; }).filter(function(op) { return op > 0; });
                var maxOp = originalPrices.length > 0 ? Math.max.apply(null, originalPrices) : 0;
                if (maxOp > minPrice) {
                    priceDisplay += '<div class="original-price-badge" style="font-size:var(--fs-xs);text-decoration:line-through;color:var(--text-muted);margin-top:2px">' + AdminData.fmt(maxOp) + '</div>';
                }
            } else {
                priceDisplay = '<strong>' + AdminData.fmt(minPrice) + ' - ' + AdminData.fmt(maxPrice) + '</strong>';
            }
            
            variantCountStr = '<span style="background:#e3f2fd;color:#1976d2;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:600;white-space:nowrap;">' + p.variants.length + ' loại</span>';
        } else {
            var priceHtml = '<strong>' + AdminData.fmt(p.basePrice || 0) + '</strong>';
            if (p.baseOriginalPrice && p.baseOriginalPrice > (p.basePrice || 0)) {
                priceHtml += '<div class="original-price-badge" style="font-size:var(--fs-xs);text-decoration:line-through;color:var(--text-muted);margin-top:2px">' + AdminData.fmt(p.baseOriginalPrice) + '</div>';
            }
            priceDisplay = priceHtml;
        }

        var nameHtml = escapeHTML(p.name);
        var targetSlugOrId = p.slug || p.id || null;
        if (targetSlugOrId) {
          nameHtml = '<a href="../product-detail.html?slug=' + targetSlugOrId + '" target="_blank" style="color:inherit; text-decoration:none; transition: color 0.2s;" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'inherit\'" title="Xem chi tiết sản phẩm trên website">' + escapeHTML(p.name) + '</a>';
        }

        var giftBadge = '';
        var actualGifts = p.gifts || [];
        var actualGiftIds = p.giftIds || actualGifts.map(function(g){ return g.id || g.Id; });
        if (actualGiftIds && actualGiftIds.length > 0) {
            var giftNamesList = [];
            var totalGiftCount = 0;
            
            // If we have detailed p.gifts (with quantities), use them
            if (actualGifts.length > 0) {
                actualGifts.forEach(function(g) {
                    var qty = g.quantity || 1;
                    totalGiftCount += qty;
                    var name = g.name || g.Name || '';
                    if (!name) {
                        var found = allGifts && allGifts.find(function(ag) { return ag.id === (g.id||g.Id); });
                        if (found) name = found.name || found.Name;
                    }
                    if (name) giftNamesList.push((qty > 1 ? qty + ' ' : '') + name);
                });
            } else {
                // Fallback if we only have IDs
                totalGiftCount = actualGiftIds.length;
                actualGiftIds.forEach(function(gid) {
                    var found = allGifts && allGifts.find(function(g) { return g.id === gid || g.Id === gid; });
                    if (found) giftNamesList.push(found.name || found.Name || '');
                });
            }

            var titleText = giftNamesList.length > 0 ? 'Tặng: ' + giftNamesList.join(', ') : 'Sản phẩm có kèm quà tặng';
            giftBadge = '<span style="font-size:11px; margin-left:6px; padding:2px 6px; background:#fffcf6; border:1px solid #d68b3f; border-radius:12px; color:#d68b3f; font-weight:600; white-space:nowrap; cursor:help;" title="' + escapeHTML(titleText) + '">🎁 ' + totalGiftCount + ' quà tặng</span>';
        }

        return '<tr>' +
          '<td class="checkbox-cell"><input type="checkbox" class="product-item-checkbox" data-id="' + p.id + '" ' + isChecked + '></td>' +
          '<td class="stt-cell">' + stt + '</td>' +
          '<td class="hide-mobile">' + productCode + '</td>' +
          '<td><div class="product-info">' +
          imgHtml +
          '<div><div class="product-name">' + nameHtml + badgePill + giftBadge + '</div><div class="show-mobile-only" style="margin-top:2px">' + productCode + '</div></div>' +
          '</div></td>' +
          '<td>' + priceDisplay + '</td>' +
          '<td class="hide-mobile" style="text-align:center;"><span style="color:#d97706;font-weight:600;background:#fffbeb;padding:2px 8px;border-radius:12px;font-size:12px;">' + (p.commissionRate || 10) + '%</span></td>' +
          '<td class="hide-mobile">' + getCategoryName(p.category) + '</td>' +
          '<td class="hide-mobile" style="text-align:center;">' + variantCountStr + '</td>' +
          '<td><span style="font-weight:600;color:' + ((p.totalStock || 0) < 5 ? 'var(--danger)' : 'var(--success)') + '">' + (p.totalStock || (p.variants ? p.variants.reduce(function (a, b) { return a + b.stock; }, 0) : 0)) + '</span></td>' +
          '<td>' + statusToggleHtml + '</td>' +
          '<td class="actions-cell">' +
          '<button class="btn btn--sm btn--secondary btn-edit" data-id="' + p.id + '" style="margin-right:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Sửa</button>' +
          (isAdmin ? '<button class="btn btn--sm btn--danger btn-delete" data-id="' + p.id + '" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>' : '') +
          '</td>' +
          '</tr>';
      }).join('');
    }

    initAdminAsyncThumbnails(tbody);

    // Pagination
    renderPagination(total, pages);
    document.getElementById('product-count').textContent = 'Hiển thị ' + (slice.length) + '/' + total + ' sản phẩm';
    updateBulkActionsUI();
  }

  function updateBulkActionsUI() {
    var filtered = getFiltered();
    var total = filtered.length;
    var pages = Math.ceil(total / pageSize) || 1;
    if (currentPage > pages) currentPage = 1;
    var start = (currentPage - 1) * pageSize;
    var slice = filtered.slice(start, start + pageSize);

    // Check if check-all checkbox should be checked
    var checkAll = document.getElementById('check-all-products');
    if (checkAll) {
      var allChecked = slice.length > 0 && slice.every(function (p) {
        return selectedProductIds.has(p.id);
      });
      checkAll.checked = allChecked;
    }

    // Update floating bar
    var bar = document.getElementById('bulk-actions-bar');
    var countSpan = document.getElementById('bulk-selected-count');
    if (bar && countSpan) {
      var count = selectedProductIds.size;
      if (count > 0) {
        countSpan.textContent = 'Đã chọn ' + count + ' sản phẩm';
        bar.classList.add('show');
      } else {
        bar.classList.remove('show');
      }
    }
  }

  function renderPagination(total, pages) {
    var pag = document.getElementById('products-pagination');
    if (!pag) return;
    pag.innerHTML = '<div class="pagination__info">Trang ' + currentPage + ' / ' + pages + '</div>' +
      '<div class="pagination__btns">' +
      '<button class="pag-btn" id="pag-prev" ' + (currentPage === 1 ? 'disabled' : '') + '>‹</button>';
    for (var i = 1; i <= pages && i <= 5; i++) {
      pag.querySelector('.pagination__btns').innerHTML += '<button class="pag-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    pag.querySelector('.pagination__btns').innerHTML += '<button class="pag-btn" id="pag-next" ' + (currentPage === pages ? 'disabled' : '') + '>›</button>';
    pag.querySelectorAll('[data-page]').forEach(function (b) { b.addEventListener('click', function () { currentPage = parseInt(b.dataset.page); renderTable(); }); });
    var prev = pag.querySelector('#pag-prev'), next = pag.querySelector('#pag-next');
    if (prev) prev.addEventListener('click', function () { if (currentPage > 1) { currentPage--; renderTable(); } });
    if (next) next.addEventListener('click', function () { if (currentPage < pages) { currentPage++; renderTable(); } });
  }

  function resetToBasicTab() {
    var tabs = document.querySelectorAll('.modal-tab-btn');
    var contents = document.querySelectorAll('.modal-tab-content');
    tabs.forEach(function(t) { t.classList.remove('active', 'border-b-2', 'border-accent'); });
    tabs.forEach(function(t) { t.style.borderBottomColor = 'transparent'; });
    tabs.forEach(function(t) { t.style.color = '#666'; });
    contents.forEach(function(c) { c.style.display = 'none'; });
    
    var basicTab = document.querySelector('.modal-tab-btn[data-target="tab-basic-info"]');
    var basicContent = document.getElementById('tab-basic-info');
    if (basicTab) {
      basicTab.classList.add('active');
      basicTab.style.borderBottomColor = 'var(--accent)';
      basicTab.style.color = 'var(--accent)';
    }
    if (basicContent) basicContent.style.display = 'block';
  }

  function openAdd() {
    try {
      editId = null;
      document.getElementById('product-modal-title').textContent = 'Thêm Sản Phẩm';
      document.getElementById('product-form').reset();
      resetToBasicTab();

      currentProdFaqs = [];
      renderProdFaqs();

      // Reset gift checkboxes
      document.querySelectorAll('.product-gift-checkbox').forEach(function (cb) {
        cb.checked = false;
      });
      document.querySelectorAll('.product-gift-qty').forEach(function (qtyInp) {
        qtyInp.value = 1;
        qtyInp.disabled = true;
      });

      if (editorInstance) editorInstance.setData('');

      var container = document.getElementById('variants-container');
      if (container) {
        container.innerHTML = '';
        variantsAdded = 0;
        window.addVariantCard();
        updateVariantTabBadge();
      }

      document.getElementById('product-form').querySelectorAll('select').forEach(function (s) { s.dispatchEvent(new Event('change')); });
      openModal('productModal');
    } catch(err) {
      console.error(err);
      fetch('http://localhost:5055/api/log', { method: 'POST', body: err.stack }).catch(()=>null);
      alert(err.message);
    }
  }

  function openEdit(id) {
    try {
      isPopulating = true;
      var p = products.find(function (x) { return x.id === id; });
      if (!p) return;
      editId = id;
      document.getElementById('product-modal-title').textContent = 'Chỉnh Sửa Sản Phẩm';
      var f = document.getElementById('product-form');
      resetToBasicTab();
      f.querySelector('[name="name"]').value = p.name;
      f.querySelector('[name="category"]').value = p.category;
      f.querySelector('[name="sku"]').value = p.sku || getSkuForCategory(p.category, p.id);
      f.querySelector('[name="status"]').value = p.status || 'active';

      // Check linked gifts
      var linkedGifts = p.gifts || [];
      document.querySelectorAll('.product-gift-checkbox').forEach(function (cb) {
        var giftId = parseInt(cb.value);
        var linkedGift = linkedGifts.find(function(g) { return g.id === giftId || g.Id === giftId; });
        if (!linkedGift && p.giftIds && p.giftIds.indexOf(giftId) !== -1) {
            linkedGift = { id: giftId, quantity: 1 };
        }
        cb.checked = !!linkedGift;
        var qtyInput = document.querySelector('.product-gift-qty[data-id="' + giftId + '"]');
        if (qtyInput) {
            qtyInput.value = linkedGift && linkedGift.quantity ? linkedGift.quantity : 1;
            qtyInput.disabled = !cb.checked;
        }
      });
      if(f.querySelector('[name="commissionRate"]')) {
          f.querySelector('[name="commissionRate"]').value = p.commissionRate !== undefined ? p.commissionRate : 10;
      }

      var container = document.getElementById('variants-container');
      if (container) {
        container.innerHTML = '';
        variantsAdded = 0; // Reset counter for edit product
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach(function (v) { window.addVariantCard(v); });
        } else {
          window.addVariantCard();
        }
        updateVariantTabBadge();
      }
      var badgeValue = (p.marketingBadges || '').split(',')[0].trim();
      var radioToSelect = f.querySelector('[name="marketingBadges"][value="' + badgeValue + '"]');
      if (radioToSelect) {
        radioToSelect.checked = true;
      } else {
        var defaultRadio = f.querySelector('[name="marketingBadges"][value=""]');
        if (defaultRadio) defaultRadio.checked = true;
      }
      f.querySelector('[name="usage"]').value = p.usage || '';
      f.querySelector('[name="shortDescription"]').value = p.shortDescription || '';

      if (editorInstance) {
        editorInstance.setData(p.description || '');
      } else {
        f.querySelector('[name="description"]').value = p.description || '';
      }

      currentProdFaqs = [];
      if(p.faqs) {
        try { currentProdFaqs = JSON.parse(p.faqs); } catch(e){}
      }
      renderProdFaqs();

      f.querySelectorAll('select').forEach(function (s) { s.dispatchEvent(new Event('change')); });
      openModal('productModal');
    } catch(err) {
      console.error(err);
      fetch('http://localhost:5055/api/log', { method: 'POST', body: err.stack }).catch(()=>null);
      alert(err.message);
    } finally {
      isPopulating = false;
    }
  }

  function saveProduct() {
    var f = document.getElementById('product-form');
    clearInlineErrors(f);

    var name = f.querySelector('[name="name"]').value.trim();
    var hasError = false;

    function expandVariantCard(card) {
      var wrapper = card.querySelector('.acc-body-wrapper');
      var chevron = card.querySelector('.acc-chevron');
      if (wrapper) wrapper.style.gridTemplateRows = '1fr';
      if (chevron) chevron.style.transform = 'rotate(180deg)';
      var title = card.querySelector('.acc-title');
      var subtitle = card.querySelector('.acc-subtitle');
      if (title) title.style.whiteSpace = 'normal';
      if (subtitle) subtitle.style.whiteSpace = 'normal';
    }

    // 1. Validate Product Name
    if (!name) {
      var tabBtn = document.querySelector('.modal-tab-btn[data-target="tab-basic-info"]');
      if (tabBtn) tabBtn.click();
      
      var nameInp = f.querySelector('[name="name"]');
      setInlineError(nameInp, 'Vui lòng nhập tên sản phẩm!');
      nameInp.focus();
      hasError = true;
    }

    var variants = [];
    var cards = document.querySelectorAll('.variant-card');

    // 2. Validate Variant Cards presence
    if (!hasError && cards.length === 0) {
      var tabBtn = document.querySelector('.modal-tab-btn[data-target="tab-variants"]');
      if (tabBtn) tabBtn.click();
      
      adminToast('Vui lòng thêm ít nhất 1 loại sản phẩm!', 'error');
      window.addVariantCard(); // Auto add a variant card
      hasError = true;
    }

    // 3. Validate each variant card fields
    if (!hasError) {
      var firstInvalidCard = null;
      cards.forEach(function (card) {
        var sizeSel = card.querySelector('.v-size');
        var priceInp = card.querySelector('.v-price');
        var stockInp = card.querySelector('.v-stock');
        var originalPriceInp = card.querySelector('.v-original-price');
        
        var sizeId = parseInt(sizeSel.value) || null;
        var price = parseInt(priceInp.value.replace(/\./g, '')) || 0;
        var stock = parseInt(stockInp.value) || 0;
        
        var originalPriceVal = originalPriceInp ? originalPriceInp.value.replace(/\./g, '') : '';
        var originalPrice = originalPriceVal ? parseInt(originalPriceVal) : null;
        
        if (!sizeId || price <= 0 || price > 1000000000 || stock > 1000 || stock < 0 || (originalPrice !== null && (originalPrice > 1000000000 || originalPrice < price))) {
          if (!firstInvalidCard) {
            firstInvalidCard = card;
            var tabBtn = document.querySelector('.modal-tab-btn[data-target="tab-variants"]');
            if (tabBtn) tabBtn.click();
            
            expandVariantCard(card);
            
            if (!sizeId) {
              setInlineError(sizeSel, 'Vui lòng chọn kích thước cho loại sản phẩm này!');
              var wrapper = sizeSel.closest('.custom-select-wrapper');
              var trigger = wrapper ? wrapper.querySelector('.custom-select__trigger') : null;
              if (trigger) {
                trigger.setAttribute('tabindex', '0');
                trigger.focus();
              } else {
                sizeSel.focus();
              }
            } else if (price <= 0) {
              setInlineError(priceInp, 'Vui lòng nhập giá bán hợp lệ!');
              priceInp.focus();
            } else if (price > 1000000000) {
              setInlineError(priceInp, 'Giá bán của một phiên bản không được vượt quá 1 tỷ VNĐ!');
              priceInp.focus();
            } else if (originalPrice !== null && originalPrice > 1000000000) {
              setInlineError(originalPriceInp, 'Giá gốc không được vượt quá 1 tỷ VNĐ!');
              originalPriceInp.focus();
            } else if (originalPrice !== null && originalPrice < price) {
              setInlineError(originalPriceInp, 'Giá gốc không được nhỏ hơn giá bán!');
              originalPriceInp.focus();
            } else if (stock > 1000) {
              setInlineError(stockInp, 'Số lượng tồn kho không được vượt quá 1.000 chiếc!');
              stockInp.focus();
            } else if (stock < 0) {
              setInlineError(stockInp, 'Số lượng tồn kho không được âm!');
              stockInp.focus();
            }
          }
          hasError = true;
        }
      });
    }

    if (hasError) {
      adminToast('Vui lòng điền đủ Tên và ít nhất 1 Phiên bản có giá hoặc kích thước!', 'error');
      return;
    }

    // 4. Validate gifts
    var giftError = false;
    document.querySelectorAll('.product-gift-checkbox:checked').forEach(function (cb) {
      var qtyInput = document.querySelector('.product-gift-qty[data-id="' + cb.value + '"]');
      var qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      var stock = qtyInput ? parseInt(qtyInput.dataset.stock) || 0 : 0;
      if (qty > stock) {
        giftError = true;
      }
    });

    if (giftError) {
      adminToast('Số lượng quà tặng vượt quá tồn kho!', 'error');
      var tabBtn = document.querySelector('.modal-tab-btn[data-target="tab-basic-info"]');
      if (tabBtn) tabBtn.click();
      return;
    }

    cards.forEach(function (card) {
      var id = parseInt(card.querySelector('.v-id').value) || 0;
      var sizeId = parseInt(card.querySelector('.v-size').value) || null;
      var price = parseInt(card.querySelector('.v-price').value.replace(/\./g, '')) || 0;
      var originalPriceInp = card.querySelector('.v-original-price');
      var originalPriceVal = originalPriceInp ? originalPriceInp.value.replace(/\./g, '') : '';
      var originalPrice = originalPriceVal ? parseInt(originalPriceVal) : null;
      var stock = parseInt(card.querySelector('.v-stock').value) || 0;

      var ptype = parseInt(card.querySelector('.v-ptype').value) || null;
      var glaze = parseInt(card.querySelector('.v-glaze').value) || null;
      var material = parseInt(card.querySelector('.v-material').value) || null;
      var color = parseInt(card.querySelector('.v-color').value) || null;
      var pattern = parseInt(card.querySelector('.v-pattern').value) || null;

      var imgsData = card.querySelector('.v-images-data').value;
      var variantImages = [];
      try { variantImages = JSON.parse(imgsData); } catch (e) { }

      variants.push({
        id: id, sizeId: sizeId, price: price, originalPrice: originalPrice, stock: stock,
        productTypeId: ptype, glazeLineId: glaze, materialId: material, colorId: color, patternId: pattern, images: variantImages
      });
    });
    var desc = editorInstance ? editorInstance.getData() : f.querySelector('[name="description"]').value.trim();

    var totalStock = variants.reduce(function (acc, v) { return acc + v.stock; }, 0);
    var productStatus = f.querySelector('[name="status"]').value;
    if (totalStock === 0) {
      productStatus = 'inactive';
    }

    var data = {
      name: name,
      category: f.querySelector('[name="category"]').value,
      sku: f.querySelector('[name="sku"]').value.trim() || null,
      variants: variants,
      status: productStatus,
      marketingBadges: (function () {
        var checkedRadio = f.querySelector('[name="marketingBadges"]:checked');
        return checkedRadio ? (checkedRadio.value || null) : null;
      })(),
      faqs: (function() {
        var clean = currentProdFaqs.filter(function(f){ return f.q && f.q.trim() !== '' && f.a && f.a.trim() !== ''; });
        return clean.length > 0 ? JSON.stringify(clean) : null;
      })(),
      usage: f.querySelector('[name="usage"]').value.trim() || null,
      commissionRate: parseFloat(f.querySelector('[name="commissionRate"]').value) || 10,
      shortDescription: f.querySelector('[name="shortDescription"]').value.trim() || null,
      description: desc,
      slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
      gifts: (function () {
        var selections = [];
        document.querySelectorAll('.product-gift-checkbox:checked').forEach(function (cb) {
          var qtyInput = document.querySelector('.product-gift-qty[data-id="' + cb.value + '"]');
          var qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
          selections.push({ id: parseInt(cb.value), quantity: qty, name: "", status: "active" });
        });
        return selections;
      })()
    };
    var oldProducts = products.slice();
    if (editId) {
      data.id = editId;
      var idx = products.findIndex(function (x) { return x.id === editId; });
      if (idx >= 0) { products[idx] = Object.assign({}, products[idx], data); }
    } else {
      products.push(data);
    }

    AdminData.products.save(data).then(function (savedData) {
      adminToast(editId ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!', 'success');
      AdminData.products.load().then(function (newData) {
        products = newData;
        closeModal('productModal');
        renderTable();
      });
    }).catch(function (err) {
      console.error(err);
      products = oldProducts;
      var msg = err.message || 'Có lỗi xảy ra!';
      adminToast(msg, 'error');
      if (msg.indexOf('Mã SKU') !== -1 || msg.indexOf('SKU') !== -1 || msg.indexOf('sku') !== -1 || msg.indexOf('tồn tại') !== -1) {
        var skuInp = f.querySelector('[name="sku"]');
        if (skuInp) {
          var tabBtn = document.querySelector('.modal-tab-btn[data-target="tab-basic-info"]');
          if (tabBtn) tabBtn.click();
          setInlineError(skuInp, msg);
          skuInp.focus();
        }
      }
    });
  }

  function deleteProduct(id) {
    adminConfirm('Xoá sản phẩm này? Hành động không thể hoàn tác.', function () {
      AdminData.products.delete(id).then(function () {
        products = products.filter(function (p) { return p.id !== id; });
        adminToast('Đã xoá sản phẩm', 'warning');
        renderTable();
      }).catch(function (e) {
        adminToast('Lỗi khi xóa sản phẩm', 'error');
      });
    });
  }

  function executeBulkStatus(status) {
    var ids = Array.from(selectedProductIds);
    if (ids.length === 0) return;
    var statusLabel = status === 'active' ? 'Đang bán' : 'Ngừng bán';

    AdminData.products.bulkStatus(ids, status).then(function () {
      adminToast('Đã đổi trạng thái ' + ids.length + ' sản phẩm sang ' + statusLabel, 'success');
      selectedProductIds.clear();
      return AdminData.products.load();
    }).then(function (newData) {
      products = newData;
      renderTable();
    }).catch(function (err) {
      console.error(err);
      adminToast('Có lỗi xảy ra khi đổi trạng thái hàng loạt!', 'error');
    });
  }

  function executeBulkDelete() {
    var isAdmin = window.getAdminSession ? (window.getAdminSession().role === 'admin') : false;
    if (!isAdmin) {
      adminToast('Bạn không có quyền thực hiện chức năng này!', 'error');
      return;
    }
    var ids = Array.from(selectedProductIds);
    if (ids.length === 0) return;

    adminConfirm('Xóa ' + ids.length + ' sản phẩm đã chọn? Hành động không thể hoàn tác.', function () {
      AdminData.products.bulkDelete(ids).then(function () {
        adminToast('Đã xóa thành công ' + ids.length + ' sản phẩm', 'warning');
        selectedProductIds.clear();
        return AdminData.products.load();
      }).then(function (newData) {
        products = newData;
        renderTable();
      }).catch(function (err) {
        console.error(err);
        adminToast('Có lỗi xảy ra khi xóa hàng loạt!', 'error');
      });
    });
  }

  function bindEvents() {
    var search = document.getElementById('product-search');
    if (search) search.addEventListener('input', function () { searchQ = search.value; currentPage = 1; renderTable(); });
    var catFilter = document.getElementById('product-cat-filter');
    if (catFilter) catFilter.addEventListener('change', function () { filterCat = this.value; currentPage = 1; renderTable(); });
    var statusFilter = document.getElementById('product-status-filter');
    if (statusFilter) statusFilter.addEventListener('change', function () { filterStatus = this.value; currentPage = 1; renderTable(); });
    var pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.value = pageSize.toString();
      pageSizeSelect.addEventListener('change', function () {
        pageSize = parseInt(pageSizeSelect.value) || 10;
        currentPage = 1;
        renderTable();
      });
    }
    var addBtn = document.getElementById('btn-add-product');
    if (addBtn) addBtn.addEventListener('click', openAdd);
    var saveBtn = document.getElementById('btn-save-product');
    if (saveBtn) saveBtn.addEventListener('click', saveProduct);

    // Tab Switching Logic
    var tabBtns = document.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var targetId = this.getAttribute('data-target');
            
            // Update buttons
            tabBtns.forEach(function(b) {
                b.classList.remove('active');
                b.style.borderBottomColor = 'transparent';
                b.style.color = '#666';
            });
            this.classList.add('active');
            this.style.borderBottomColor = 'var(--accent)';
            this.style.color = 'var(--accent)';
            
            // Update content
            document.querySelectorAll('.modal-tab-content').forEach(function(content) {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            var targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.style.display = 'block';
                targetContent.classList.add('active');
            }
        });
    });

    document.getElementById('products-table-body').addEventListener('click', function (e) {
      var editBtn = e.target.closest('.btn-edit');
      var delBtn = e.target.closest('.btn-delete');
      if (editBtn) openEdit(parseInt(editBtn.dataset.id));
      if (delBtn) deleteProduct(parseInt(delBtn.dataset.id));
    });

    var priceInput = document.querySelector('#product-form [name="price"]');
    if (priceInput) {
      priceInput.addEventListener('input', function (e) {
        var val = e.target.value.replace(/[^0-9]/g, '');
        if (val) {
          e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } else {
          e.target.value = '';
        }
      });
    }

    // Bulk Selection and Actions
    var checkAll = document.getElementById('check-all-products');
    if (checkAll) {
      checkAll.addEventListener('change', function () {
        var filtered = getFiltered();
        var total = filtered.length;
        var pages = Math.ceil(total / pageSize) || 1;
        if (currentPage > pages) currentPage = 1;
        var start = (currentPage - 1) * pageSize;
        var slice = filtered.slice(start, start + pageSize);

        var checked = checkAll.checked;
        slice.forEach(function (p) {
          if (checked) {
            selectedProductIds.add(p.id);
          } else {
            selectedProductIds.delete(p.id);
          }
        });
        renderTable();
      });
    }

    var tableBody = document.getElementById('products-table-body');
    if (tableBody) {
      tableBody.addEventListener('change', function (e) {
        if (e.target.classList.contains('product-item-checkbox')) {
          var id = parseInt(e.target.dataset.id);
          if (e.target.checked) {
            selectedProductIds.add(id);
          } else {
            selectedProductIds.delete(id);
          }
          updateBulkActionsUI();
        } else if (e.target.classList.contains('quick-status-toggle')) {
          var id = parseInt(e.target.dataset.id);
          var newStatus = e.target.checked ? 'active' : 'inactive';
          var statusLabel = newStatus === 'active' ? 'Đang bán' : 'Ngừng bán';

          AdminData.products.bulkStatus([id], newStatus).then(function () {
            adminToast('Đã chuyển sang ' + statusLabel, 'success');
            var p = products.find(function (x) { return x.id === id });
            if (p) p.status = newStatus;
            renderTable();
          }).catch(function (err) {
            console.error(err);
            adminToast('Lỗi khi đổi trạng thái!', 'error');
            e.target.checked = !e.target.checked;
          });
        }
      });
    }

    var bulkActiveBtn = document.getElementById('btn-bulk-active');
    if (bulkActiveBtn) {
      bulkActiveBtn.addEventListener('click', function () {
        executeBulkStatus('active');
      });
    }

    var bulkInactiveBtn = document.getElementById('btn-bulk-inactive');
    if (bulkInactiveBtn) {
      bulkInactiveBtn.addEventListener('click', function () {
        executeBulkStatus('inactive');
      });
    }

    var bulkDeleteBtn = document.getElementById('btn-bulk-delete');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', function () {
        executeBulkDelete();
      });
    }

    var bulkCloseBtn = document.getElementById('btn-bulk-close');
    if (bulkCloseBtn) {
      bulkCloseBtn.addEventListener('click', function () {
        selectedProductIds.clear();
        var checkAll = document.getElementById('check-all-products');
        if (checkAll) checkAll.checked = false;
        renderTable();
      });
    }

    var catSelect = document.querySelector('#product-form [name="category"]');
    var skuInput = document.querySelector('#product-form [name="sku"]');
    if (catSelect && skuInput) {
      catSelect.addEventListener('change', function () {
        if (isPopulating) return;
        var categoryValue = this.value;
        var nextId = editId ? editId : getNextProductId();
        skuInput.value = getSkuForCategory(categoryValue, nextId);
      });
    }

    // Real-time active validation for Product Form
    document.getElementById('product-form')?.addEventListener('input', function (e) {
      var el = e.target;
      if (!el.classList.contains('is-invalid') && !el.closest('.custom-select-wrapper')?.classList.contains('is-invalid')) {
        return;
      }

      var isValid = true;
      var errorMsg = '';

      if (el.name === 'name') {
        var val = el.value.trim();
        if (!val) {
          errorMsg = 'Vui lòng nhập tên sản phẩm!';
          isValid = false;
        }
      } else if (el.classList.contains('v-price')) {
        var val = el.value.replace(/\./g, '');
        var num = parseInt(val, 10) || 0;
        if (num <= 0) {
          errorMsg = 'Vui lòng nhập giá bán hợp lệ!';
          isValid = false;
        } else if (num > 1000000000) {
          errorMsg = 'Giá bán của một phiên bản không được vượt quá 1 tỷ VNĐ!';
          isValid = false;
        }
      } else if (el.classList.contains('v-stock')) {
        var num = parseInt(el.value, 10);
        if (isNaN(num) || num < 0) {
          errorMsg = 'Số lượng tồn kho không được âm!';
          isValid = false;
        } else if (num > 1000) {
          errorMsg = 'Số lượng tồn kho không được vượt quá 1.000 chiếc!';
          isValid = false;
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
    });

    document.getElementById('product-form')?.addEventListener('change', function (e) {
      var el = e.target;
      if (el.classList.contains('v-size')) {
        var wrapper = el.closest('.custom-select-wrapper');
        if (wrapper && wrapper.classList.contains('is-invalid')) {
          if (el.value) {
            wrapper.classList.remove('is-invalid');
            el.classList.remove('is-invalid');
            var sibling = wrapper.nextElementSibling;
            if (sibling && sibling.classList.contains('form-error')) sibling.remove();
          }
        }
      }
    });
  }

  // ── Auto-refresh attribute dropdowns when user returns to this tab ──
  // Handles the case: user opens patterns/colors/materials page in another tab,
  // adds new data, then comes back to the products tab.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    // Only run if page has been initialized (products loaded)
    if (!products) return;

    // Invalidate sessionStorage caches so load() fetches fresh data
    ['pgt_admin_glazelines', 'pgt_admin_producttypes', 'pgt_admin_materials',
     'pgt_admin_colors', 'pgt_admin_patterns', 'pgt_admin_sizes'].forEach(function (key) {
      sessionStorage.removeItem(key);
    });

    Promise.all([
      AdminData.glazeLines.load(),
      AdminData.productTypes.load(),
      AdminData.materials.load(),
      AdminData.colors.load(),
      AdminData.patterns.load(),
      AdminData.sizes.load()
    ]).then(function (res) {
      var newGlazeLines = res[0];
      var newProductTypes = res[1];
      var newMaterials = res[2];
      var newColors = res[3];
      var newPatterns = res[4];
      var newSizes = res[5] || [];

      // Check if anything actually changed
      var changed = false;
      if (JSON.stringify(newGlazeLines) !== JSON.stringify(glazeLines)) changed = true;
      if (JSON.stringify(newProductTypes) !== JSON.stringify(productTypes)) changed = true;
      if (JSON.stringify(newMaterials) !== JSON.stringify(materials)) changed = true;
      if (JSON.stringify(newColors) !== JSON.stringify(colors)) changed = true;
      if (JSON.stringify(newPatterns) !== JSON.stringify(patterns)) changed = true;
      if (JSON.stringify(newSizes) !== JSON.stringify(sizes)) changed = true;

      if (!changed) return;

      // Update closure variables
      glazeLines = newGlazeLines;
      productTypes = newProductTypes;
      materials = newMaterials;
      colors = newColors;
      patterns = newPatterns;
      sizes = newSizes;

      // Helper: rebuild options for a <select> while preserving current value
      function refreshSelect(selectEl, dataArr, defaultText) {
        var currentVal = selectEl.value;
        selectEl.innerHTML = '<option value="">' + defaultText + '</option>';
        dataArr.forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o.id || o.Id;
          opt.textContent = o.name || o.Name;
          if (String(o.id || o.Id) === String(currentVal)) opt.selected = true;
          selectEl.appendChild(opt);
        });

        // Rebuild the custom select UI wrapper
        if (window.initCustomSelects) {
          var wrapper = selectEl.closest('.custom-select-wrapper');
          if (wrapper) {
            var selectId = wrapper.dataset.selectId;
            if (selectId) {
              var optionsPanel = document.querySelector('.custom-select__options[data-select-id="' + selectId + '"]');
              if (optionsPanel) optionsPanel.remove();
            }
            selectEl.classList.remove('custom-select-hidden');
            selectEl.style.display = '';
            wrapper.parentNode.insertBefore(selectEl, wrapper);
            wrapper.remove();
          }
          window.initCustomSelects(selectEl.parentNode);
        }
      }

      // Update all variant card dropdowns
      document.querySelectorAll('.variant-card').forEach(function (card) {
        var sizeEl = card.querySelector('.v-size');
        var glazeEl = card.querySelector('.v-glaze');
        var ptypeEl = card.querySelector('.v-ptype');
        var materialEl = card.querySelector('.v-material');
        var colorEl = card.querySelector('.v-color');
        var patternEl = card.querySelector('.v-pattern');

        if (sizeEl) refreshSelect(sizeEl, sizes, 'Chọn kích thước...');
        if (glazeEl) refreshSelect(glazeEl, glazeLines, 'Chọn men...');
        if (ptypeEl) refreshSelect(ptypeEl, productTypes, 'Chọn...');
        if (materialEl) refreshSelect(materialEl, materials, 'Chọn...');
        if (colorEl) refreshSelect(colorEl, colors, 'Chọn...');
        if (patternEl) refreshSelect(patternEl, patterns, 'Chọn...');
      });

      console.log('[Products] Attribute dropdowns refreshed with latest data.');
    }).catch(function (err) {
      console.warn('[Products] Failed to refresh attributes:', err);
    });
  });

  document.addEventListener('DOMContentLoaded', init);
}());

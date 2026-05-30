// products-admin.js
(function () {
  'use strict';
  if (!document.getElementById('products-table-body')) return;

  var products, sizes = [], glazeLines = [], productTypes = [], materials = [], colors = [], patterns = [], currentPage = 1, pageSize = 10, searchQ = '', filterCat = 'all', filterStatus = 'all', editId = null, storeAddress = '';
  var editorInstance;
  var selectedProductIds = new Set();

  var variantCounter = 0;
  var variantsAdded = 0; // To keep numbering consistent for deleted cards

  function updateVariantTabBadge() {
    var count = document.querySelectorAll('.variant-card').length;
    var badge = document.getElementById('variant-count-badge');
    if (badge) badge.textContent = count;
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
    var formattedPrice = numPrice.toLocaleString('vi-VN') + 'đ';
    var subtitleParts = [ptype, material, formattedPrice, 'Tồn: ' + stock].filter(Boolean);

    card.querySelector('.acc-title').textContent = titleParts.length > 0 ? titleParts.join(' • ') : 'Phiên bản mới';
    card.querySelector('.acc-subtitle').textContent = subtitleParts.length > 0 ? subtitleParts.join(' • ') : 'Chưa nhập đủ thông tin';
    
    var stockBadge = card.querySelector('.acc-stock');
    stockBadge.textContent = 'Còn ' + stock;
    if (parseInt(stock) < 5) {
      stockBadge.style.background = '#ffebee';
      stockBadge.style.color = '#c62828';
    } else {
      stockBadge.style.background = '#e8f5e9';
      stockBadge.style.color = '#2e7d32';
    }
  }

  window.addVariantCard = function (v = null) {
    var container = document.getElementById('variants-container');
    if (!container) return;

    variantCounter++;
    variantsAdded++;
    var currentVariantIndex = variantsAdded;
    
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

    card.innerHTML = `
        <div class="acc-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; cursor: pointer; user-select: none;">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                <div class="acc-number" style="width: 24px; height: 24px; background: #b87b28; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">${currentVariantIndex}</div>
                <div style="display: flex; flex-direction: column;">
                    <div class="acc-title" style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 2px;">Phiên bản mới</div>
                    <div class="acc-subtitle" style="font-size: 12px; color: #666;">...</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="acc-stock" style="padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #e8f5e9; color: #2e7d32;">Còn 0</div>
                <button type="button" class="btn btn--sm btn-duplicate-variant" style="background: transparent; border: 1px solid #ccc; color: #333; display: flex; align-items: center; padding: 4px 10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Nhân bản</button>
                <button type="button" class="btn btn--sm btn-delete-variant" style="background: transparent; border: 1px solid #ccc; color: #333; padding: 4px 10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                <div class="acc-chevron" style="transition: transform 0.3s; color: #666; transform: ${v ? 'rotate(0)' : 'rotate(180deg)'};"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
            </div>
        </div>
        <div class="acc-body-wrapper" style="display: grid; grid-template-rows: ${v ? '0fr' : '1fr'}; transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1); background: white;">
            <div class="acc-body" style="min-height: 0; overflow: hidden; border-top: 1px solid #eee;">
                <div style="padding: 15px;">
                    <input type="hidden" class="v-id" value="${v ? v.id : 0}">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Kích thước <span style="color:red">*</span></label>
                    <select class="form-control v-size" style="background: #fff;">${makeSelect(sizes, '', v ? v.sizeId : null)}</select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Phân khúc</label>
                    <select class="form-control v-ptype" style="background: #fff;">${makeSelect(productTypes, '', v ? v.productTypeId : null)}</select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Dòng men</label>
                    <select class="form-control v-glaze" style="background: #fff;">${makeSelect(glazeLines, '', v ? v.glazeLineId : null)}</select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Chất liệu</label>
                    <select class="form-control v-material" style="background: #fff;">${makeSelect(materials, '', v ? v.materialId : null)}</select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Màu sắc</label>
                    <select class="form-control v-color" style="background: #fff;">${makeSelect(colors, '', v ? v.colorId : null)}</select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Hoa văn</label>
                    <select class="form-control v-pattern" style="background: #fff;">${makeSelect(patterns, '', v ? v.patternId : null)}</select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Giá bán (VNĐ) <span style="color:red">*</span></label>
                    <input type="text" class="form-control v-price" value="${v ? (v.price || '') : ''}" style="background: #fff;">
                </div>
                <div class="form-group" style="margin-bottom:0;"><label class="form-label" style="color: #666; font-weight: normal;">Tồn kho <span style="color:red">*</span></label>
                    <input type="number" class="form-control v-stock" value="${v ? (v.stock || 0) : 0}" style="background: #fff;">
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
                        <input class="form-control variant-video-link" data-vid="${vIdKey}" type="text" placeholder="Dán link ảnh/video" style="margin-bottom:0;flex:1;background: #fff;">
                        <button type="button" class="btn btn--secondary btn-add-variant-link" data-vid="${vIdKey}" style="white-space:nowrap;padding:0 15px;height:38px;">➕ Thêm</button>
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
        e.target.value = val ? val.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
      });
      if (pInput.value) pInput.dispatchEvent(new Event('input'));
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
        var newV = {
          id: 0,
          sizeId: parseInt(card.querySelector('.v-size').value) || null,
          productTypeId: parseInt(card.querySelector('.v-ptype').value) || null,
          glazeLineId: parseInt(card.querySelector('.v-glaze').value) || null,
          materialId: parseInt(card.querySelector('.v-material').value) || null,
          colorId: parseInt(card.querySelector('.v-color').value) || null,
          patternId: parseInt(card.querySelector('.v-pattern').value) || null,
          price: pInputVal ? parseFloat(pInputVal) : 0,
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
          var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5080' ? 'http://localhost:5080/api' : '/api';

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
      AdminData.sizes.load()
    ]).then(function (res) {
      products = res[0];

      function populateSelect(data, selectName, defaultText) {
        var sel = document.querySelector('[name="' + selectName + '"]');
        if (sel) {
          sel.innerHTML = '<option value="">-- ' + defaultText + ' --</option>';
          data.forEach(function (item) {
            var opt = document.createElement('option');
            opt.value = item.id || item.Id;
            opt.textContent = item.name || item.Name;
            sel.appendChild(opt);
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
      var pCode = 'SP' + String(p.id).padStart(4, '0');
      var matchQ = !q ||
        p.name.toLowerCase().includes(q) ||
        AdminData.getCatName(p.category).toLowerCase().includes(q) ||
        pCode.toLowerCase().includes(q) ||
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
        var badgePill = p.badge ? '<span class="badge badge--gold" style="margin-left:4px">' + p.badge + '</span>' : '';
        var allImages = (p.variants || []).reduce((acc, v) => acc.concat(v.images || []), []);
        var firstImg = allImages.length > 0 ? allImages[0] : null;
        var imgHtml = '';
        if (firstImg) {
          imgHtml = generateAdminThumbnailHTML(firstImg, 60, 'product-thumb zoomable', "data-images='" + JSON.stringify(allImages).replace(/'/g, '&#39;') + "'");
        } else {
          imgHtml = '<div class="product-thumb" style="background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:2rem;width:60px;height:60px;border-radius:6px;">🏺</div>';
        }

        var productCode = '<span style="font-weight:700;color:var(--accent);background:rgba(200,146,42,0.1);border:1px solid rgba(200,146,42,0.25);border-radius:4px;padding:2px 6px;font-size:11px;letter-spacing:0.04em;">SP' + String(p.id).padStart(4, '0') + '</span>';

        var priceDisplay = '<strong>0đ</strong>';
        var variantCountStr = '<span style="color:#888;font-size:13px;">Chưa có</span>';
        
        if (p.variants && p.variants.length > 0) {
            var prices = p.variants.map(function(v) { return v.price || 0; });
            var minPrice = Math.min.apply(null, prices);
            var maxPrice = Math.max.apply(null, prices);
            
            if (minPrice === maxPrice) {
                priceDisplay = '<strong>' + AdminData.fmt(minPrice) + '</strong>';
            } else {
                priceDisplay = '<strong>' + AdminData.fmt(minPrice) + ' - ' + AdminData.fmt(maxPrice) + '</strong>';
            }
            
            variantCountStr = '<span style="background:#e3f2fd;color:#1976d2;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:600;white-space:nowrap;">' + p.variants.length + ' loại</span>';
        } else {
            priceDisplay = '<strong>' + AdminData.fmt(p.basePrice || 0) + '</strong>';
        }

        return '<tr>' +
          '<td class="checkbox-cell"><input type="checkbox" class="product-item-checkbox" data-id="' + p.id + '" ' + isChecked + '></td>' +
          '<td class="stt-cell">' + stt + '</td>' +
          '<td class="hide-mobile">' + productCode + '</td>' +
          '<td><div class="product-info">' +
          imgHtml +
          '<div><div class="product-name">' + p.name + badgePill + '</div></div>' +
          '</div></td>' +
          '<td>' + priceDisplay + '</td>' +
          '<td class="hide-mobile">' + AdminData.getCatName(p.category) + '</td>' +
          '<td class="hide-mobile" style="text-align:center;">' + variantCountStr + '</td>' +
          '<td><span style="font-weight:600;color:' + ((p.totalStock || 0) < 5 ? 'var(--danger)' : 'var(--success)') + '">' + (p.totalStock || (p.variants ? p.variants.reduce(function (a, b) { return a + b.stock; }, 0) : 0)) + '</span></td>' +
          '<td>' + statusToggleHtml + '</td>' +
          '<td class="actions-cell">' +
          '<button class="btn btn--sm btn--secondary btn-edit" data-id="' + p.id + '" style="margin-right:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Sửa</button>' +
          '<button class="btn btn--sm btn--danger btn-delete" data-id="' + p.id + '" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>' +
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
      fetch('http://localhost:5080/api/log', { method: 'POST', body: err.stack }).catch(()=>null);
      alert(err.message);
    }
  }

  function openEdit(id) {
    try {
      var p = products.find(function (x) { return x.id === id; });
      if (!p) return;
      editId = id;
      document.getElementById('product-modal-title').textContent = 'Chỉnh Sửa Sản Phẩm';
      var f = document.getElementById('product-form');
      resetToBasicTab();
      f.querySelector('[name="name"]').value = p.name;
      f.querySelector('[name="category"]').value = p.category;
      f.querySelector('[name="status"]').value = p.status || 'active';

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
      f.querySelector('[name="badge"]').value = p.badge || '';
      f.querySelector('[name="usage"]').value = p.usage || '';
      f.querySelector('[name="shortDescription"]').value = p.shortDescription || '';

      if (editorInstance) {
        editorInstance.setData(p.description || '');
      } else {
        f.querySelector('[name="description"]').value = p.description || '';
      }

      f.querySelectorAll('select').forEach(function (s) { s.dispatchEvent(new Event('change')); });
      openModal('productModal');
    } catch(err) {
      console.error(err);
      fetch('http://localhost:5080/api/log', { method: 'POST', body: err.stack }).catch(()=>null);
      alert(err.message);
    }
  }

  function saveProduct() {
    var f = document.getElementById('product-form');

    var name = f.querySelector('[name="name"]').value.trim();

    var variants = [];
    var cards = document.querySelectorAll('.variant-card');
    cards.forEach(function (card) {
      var id = parseInt(card.querySelector('.v-id').value) || 0;
      var sizeId = parseInt(card.querySelector('.v-size').value) || null;
      var price = parseInt(card.querySelector('.v-price').value.replace(/\./g, '')) || 0;
      var originalPrice = null;
      var stock = parseInt(card.querySelector('.v-stock').value) || 0;

      var ptype = parseInt(card.querySelector('.v-ptype').value) || null;
      var glaze = parseInt(card.querySelector('.v-glaze').value) || null;
      var material = parseInt(card.querySelector('.v-material').value) || null;
      var color = parseInt(card.querySelector('.v-color').value) || null;
      var pattern = parseInt(card.querySelector('.v-pattern').value) || null;

      var imgsData = card.querySelector('.v-images-data').value;
      var variantImages = [];
      try { variantImages = JSON.parse(imgsData); } catch (e) { }

      if (price > 0 || sizeId) {
        variants.push({
          id: id, sizeId: sizeId, price: price, stock: stock,
          productTypeId: ptype, glazeLineId: glaze, materialId: material, colorId: color, patternId: pattern, images: variantImages
        });
      }
    });

    if (!name || variants.length === 0) { adminToast('Vui lòng điền đủ Tên và ít nhất 1 Phiên bản có giá hoặc kích thước!', 'error'); return; }
    var desc = editorInstance ? editorInstance.getData() : f.querySelector('[name="description"]').value.trim();

    var totalStock = variants.reduce(function (acc, v) { return acc + v.stock; }, 0);
    var productStatus = f.querySelector('[name="status"]').value;
    if (totalStock === 0) {
      productStatus = 'inactive';
    }

    var data = {
      name: name,
      category: f.querySelector('[name="category"]').value,
      variants: variants,
      status: productStatus,
      badge: f.querySelector('[name="badge"]').value || null,
      usage: f.querySelector('[name="usage"]').value.trim() || null,
      shortDescription: f.querySelector('[name="shortDescription"]').value.trim() || null,
      description: desc,
      slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
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
      adminToast('Có lỗi xảy ra!', 'error');
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
  }

  document.addEventListener('DOMContentLoaded', init);
}());

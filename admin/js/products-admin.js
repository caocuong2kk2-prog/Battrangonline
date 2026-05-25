// products-admin.js
(function(){'use strict';
if(!document.getElementById('products-table-body'))return;

var products, glazeLines=[], currentPage=1, pageSize=10, searchQ='', filterCat='all', filterStatus='all', editId=null, storeAddress='';
var editorInstance;
var selectedProductIds = new Set();

window.addVariantRow = function(v = null) {
    var tbody = document.getElementById('variantsTableBody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><input type="hidden" class="v-id" value="'+(v?v.id:0)+'"><input type="text" class="form-control v-size" placeholder="Kích thước" value="'+(v?v.size:'')+'"></td>' +
                   '<td><input type="text" class="form-control v-price" placeholder="Giá bán" value="'+(v?v.price:'')+'"></td>' +
                   '<td><input type="text" class="form-control v-original" placeholder="Giá gốc" value="'+(v&&(v.originalPrice!=null)?v.originalPrice:'')+'"></td>' +
                   '<td><input type="number" class="form-control v-stock" placeholder="Tồn" value="'+(v?v.stock:0)+'"></td>' +
                   '<td style="text-align:center;"><button type="button" class="btn btn--sm btn--danger" onclick="window.removeVariantRow(this)">Xóa</button></td>';
    var pInput = tr.querySelector('.v-price');
    var oInput = tr.querySelector('.v-original');
    [pInput, oInput].forEach(function(inp) {
        inp.addEventListener('input', function(e) {
            var val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val ? val.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
        });
        if(inp.value) inp.dispatchEvent(new Event('input'));
    });
    tbody.appendChild(tr);
};
window.removeVariantRow = function(btn) {
    var tr = btn.closest('tr');
    if(tr) tr.remove();
};

function init(){
  var EditorClass = typeof CKEDITOR !== 'undefined' ? CKEDITOR.ClassicEditor : (typeof ClassicEditor !== 'undefined' ? ClassicEditor : null);
  if (EditorClass) {
      function CustomUploadAdapterPlugin(editor) {
          editor.plugins.get('FileRepository').createUploadAdapter = function(loader) {
              return {
                  upload: function() {
                      return loader.file.then(function(file) {
                          return new Promise(function(resolve, reject) {
                              var reader = new FileReader();
                              reader.onload = function() { resolve({ default: reader.result }); };
                              reader.onerror = function(error) { reject(error); };
                              reader.readAsDataURL(file);
                          });
                      });
                  },
                  abort: function() {}
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
      .then(function(editor) { editorInstance = editor; })
      .catch(function(error) { console.error(error); });
  }
  Promise.all([
    AdminData.products.load(),
    AdminData.glazeLines.load(),
    AdminData.settings.load()
  ]).then(function(res) {
    products = res[0];
    
    // Populate GlazeLines select
    glazeLines = res[1];
    var glSelect = document.querySelector('[name="glazeLineId"]');
    if (glSelect) {
      glSelect.innerHTML = '<option value="">-- Chọn dòng men --</option>';
      glazeLines.forEach(function(gl) {
        var opt = document.createElement('option');
        opt.value = gl.id || gl.Id;
        opt.textContent = gl.name || gl.Name;
        glSelect.appendChild(opt);
      });
      
      // Re-initialize custom select styling since it was fetched asynchronously
      if (window.initCustomSelects) {
        var wrapper = glSelect.closest('.custom-select-wrapper');
        if (wrapper) {
          var selectId = wrapper.dataset.selectId;
          if (selectId) {
            var options = document.querySelector('.custom-select__options[data-select-id="' + selectId + '"]');
            if (options) options.remove();
          }
          glSelect.classList.remove('custom-select-hidden');
          glSelect.style.display = '';
          wrapper.parentNode.insertBefore(glSelect, wrapper);
          wrapper.remove();
        }
        window.initCustomSelects(glSelect.parentNode);
      }
    }

    // Handle site settings for default address (origin)
    var settings = res[2] || {};
    storeAddress = settings.address || settings.Address || '';

    renderTable();
    bindEvents();
  }).catch(function(e) { console.error(e); });
}

function renderImageGallery(imgs) {
  var urlInput = document.getElementById('product-image-url');
  if(urlInput) urlInput.value = JSON.stringify(imgs);
  var gallery = document.getElementById('product-image-gallery');
  if(!gallery) return;
  var galleryHTML = imgs.map(function(img, idx) {
      var thumbHtml = '';
      if(img.match(/\.(mp4|webm|ogg)$/i)) {
          thumbHtml = '<video src="' + img + '" style="width:60px;height:60px;object-fit:cover;border-radius:4px;" muted></video>';
      } else if(img.includes('youtube.com') || img.includes('youtu.be') || img.includes('tiktok.com') || img.includes('facebook.com')) {
          thumbHtml = '<div style="width:60px;height:60px;background:#333;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:10px;text-align:center;padding:2px;word-break:break-word;">Video Link</div>';
      } else {
          thumbHtml = '<img src="' + img + '" class="gallery-img zoomable" style="width:60px;height:60px;object-fit:cover;border-radius:4px;cursor:pointer;">';
      }
      var moveLeftBtn = idx > 0 ? '<button type="button" class="btn-move-left" data-idx="'+idx+'" style="position:absolute;bottom:0;left:0;background:rgba(0,0,0,0.5);color:white;border:none;border-radius:0 4px 0 0;width:24px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">&lsaquo;</button>' : '';
      var moveRightBtn = idx < imgs.length - 1 ? '<button type="button" class="btn-move-right" data-idx="'+idx+'" style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.5);color:white;border:none;border-radius:4px 0 0 0;width:24px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">&rsaquo;</button>' : '';

      return '<div class="gallery-item" style="position:relative;width:60px;height:60px;overflow:hidden;border-radius:4px;">' + thumbHtml + moveLeftBtn + moveRightBtn + '<button type="button" class="btn-remove-img" data-idx="'+idx+'" style="position:absolute;top:2px;right:2px;background:var(--danger);color:white;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-sm);padding:0;z-index:2;">&times;</button></div>';
  }).join('');
  var uploadBtnHTML = '<div class="gallery-upload-btn" onclick="document.getElementById(\'product-image-upload\').click()" style="width:60px;height:60px;border:2px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:#888;">+</div>';
  gallery.innerHTML = '<div class="gallery-container" style="display:flex;gap:10px;flex-wrap:wrap;">' + galleryHTML + uploadBtnHTML + '</div>';
  
  gallery.querySelectorAll('.btn-remove-img').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var index = parseInt(this.dataset.idx);
          imgs.splice(index, 1);
          renderImageGallery(imgs);
      });
  });

  gallery.querySelectorAll('.btn-move-left').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
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

  gallery.querySelectorAll('.btn-move-right').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
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

function getFiltered(){
  return products.filter(function(p){
    var q=searchQ.toLowerCase();
    var matchQ=!q||p.name.toLowerCase().includes(q)||AdminData.getCatName(p.category).toLowerCase().includes(q);
    var matchCat=filterCat==='all'||p.category===filterCat;
    var matchStatus=filterStatus==='all'||p.status===filterStatus;
    return matchQ&&matchCat&&matchStatus;
  });
}

function renderTable(){
  var filtered=getFiltered();
  var total=filtered.length;
  var pages=Math.ceil(total/pageSize)||1;
  if(currentPage>pages)currentPage=1;
  var start=(currentPage-1)*pageSize;
  var slice=filtered.slice(start,start+pageSize);

  var tbody=document.getElementById('products-table-body');
  if(!slice.length){
    tbody.innerHTML='<tr><td colspan="12"><div class="empty-state"><div class="empty-state__icon">📦</div><div class="empty-state__title">Không có sản phẩm</div></div></td></tr>';
  }else{
    tbody.innerHTML=slice.map(function(p, idx){
      var stt = start + idx + 1;
      var isChecked = selectedProductIds.has(p.id) ? 'checked' : '';
      var isStatusActive = p.status === 'active';
      var statusText = isStatusActive ? '<span style="font-size:var(--fs-xs);color:var(--success);font-weight:600;white-space:nowrap">Đang bán</span>' : '<span style="font-size:var(--fs-xs);color:var(--text-muted);white-space:nowrap">Ngừng bán</span>';
      var statusToggleHtml = '<div style="display:flex;align-items:center;gap:8px" title="Bấm để chuyển trạng thái nhanh"><label class="toggle"><input type="checkbox" class="quick-status-toggle" data-id="'+p.id+'" '+(isStatusActive?'checked':'')+'><span class="toggle__slider"></span></label>'+statusText+'</div>';
      var badgePill=p.badge?'<span class="badge badge--gold" style="margin-left:4px">'+p.badge+'</span>':'';
      var firstImg = (p.images && p.images.length > 0) ? p.images[0] : null;
      var imgHtml = '';
      if(firstImg) {
          var isVid = !!firstImg.match(/\.(mp4|mov|avi|webm|ogg)$/i);
          imgHtml = isVid 
            ? '<video src="'+firstImg+'" data-images=\''+JSON.stringify(p.images)+'\' class="product-thumb zoomable" style="object-fit:cover;cursor:pointer;" muted></video>'
            : '<img src="'+firstImg+'" data-images=\''+JSON.stringify(p.images)+'\' class="product-thumb zoomable" style="object-fit:cover;cursor:pointer;">';
      } else {
          imgHtml = '<div class="product-thumb" style="background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:1.4rem">🏺</div>';
      }

      var glazeName = p.glazeLineName;
      if (!glazeName && p.glazeLineId && glazeLines.length) {
        var foundGl = glazeLines.find(function(g) { return (g.id || g.Id) === p.glazeLineId; });
        if (foundGl) glazeName = foundGl.name || foundGl.Name;
      }

      return '<tr>'+
        '<td class="checkbox-cell"><input type="checkbox" class="product-item-checkbox" data-id="'+p.id+'" '+isChecked+'></td>'+
        '<td class="stt-cell">'+stt+'</td>'+
        '<td><div class="product-info">'+
          imgHtml+
          '<div><div class="product-name">'+p.name+badgePill+'</div></div>'+
        '</div></td>'+
        '<td><strong>'+AdminData.fmt(p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0))+'</strong></td>'+
        '<td class="hide-mobile">'+AdminData.getCatName(p.category)+'</td>'+
        '<td class="hide-mobile">'+(p.variants && p.variants.length > 0 ? p.variants.map(function(v){return v.size;}).join(', ') : '<span class="text-muted" style="font-size:0.75rem;opacity:0.6;">—</span>')+'</td>'+
        '<td class="hide-mobile">'+(p.material || '<span class="text-muted" style="font-size:0.75rem;opacity:0.6;">—</span>')+'</td>'+
        '<td class="hide-mobile">'+(glazeName || '<span class="text-muted" style="font-size:0.75rem;opacity:0.6;">—</span>')+'</td>'+
        '<td class="hide-mobile">'+(p.pattern || '<span class="text-muted" style="font-size:0.75rem;opacity:0.6;">—</span>')+'</td>'+
        '<td><span style="font-weight:600;color:'+((p.totalStock||0)<5?'var(--danger)':'var(--success)')+'">'+(p.totalStock||(p.variants?p.variants.reduce(function(a,b){return a+b.stock;},0):0))+'</span></td>'+
        '<td>'+statusToggleHtml+'</td>'+
        '<td class="actions-cell">'+
          '<button class="btn btn--sm btn--secondary btn-edit" data-id="'+p.id+'" style="margin-right:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Sửa</button>'+
          '<button class="btn btn--sm btn--danger btn-delete" data-id="'+p.id+'" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>'+
        '</td>'+
      '</tr>';
    }).join('');
  }

  // Pagination
  renderPagination(total,pages);
  document.getElementById('product-count').textContent='Hiển thị '+(slice.length)+'/'+total+' sản phẩm';
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
    var allChecked = slice.length > 0 && slice.every(function(p) {
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

function renderPagination(total,pages){
  var pag=document.getElementById('products-pagination');
  if(!pag)return;
  pag.innerHTML='<div class="pagination__info">Trang '+currentPage+' / '+pages+'</div>'+
    '<div class="pagination__btns">'+
      '<button class="pag-btn" id="pag-prev" '+(currentPage===1?'disabled':'')+'>‹</button>';
  for(var i=1;i<=pages&&i<=5;i++){
    pag.querySelector('.pagination__btns').innerHTML+='<button class="pag-btn'+(i===currentPage?' active':'')+'" data-page="'+i+'">'+i+'</button>';
  }
  pag.querySelector('.pagination__btns').innerHTML+='<button class="pag-btn" id="pag-next" '+(currentPage===pages?'disabled':'')+'>›</button>';
  pag.querySelectorAll('[data-page]').forEach(function(b){b.addEventListener('click',function(){currentPage=parseInt(b.dataset.page);renderTable();});});
  var prev=pag.querySelector('#pag-prev'),next=pag.querySelector('#pag-next');
  if(prev)prev.addEventListener('click',function(){if(currentPage>1){currentPage--;renderTable();}});
  if(next)next.addEventListener('click',function(){if(currentPage<pages){currentPage++;renderTable();}});
}

function openAdd(){
  editId=null;
  document.getElementById('product-modal-title').textContent='Thêm Sản Phẩm';
  document.getElementById('product-form').reset();

  if(editorInstance) editorInstance.setData('');
  renderImageGallery([]);
  if(document.getElementById('product-image-upload')) document.getElementById('product-image-upload').value = '';
  
  var tbody = document.getElementById('variantsTableBody');
  if(tbody) {
      tbody.innerHTML = '';
      window.addVariantRow();
  }

  document.getElementById('product-form').querySelectorAll('select').forEach(function(s){s.dispatchEvent(new Event('change'));});
  openModal('productModal');
}

function openEdit(id){
  var p=products.find(function(x){return x.id===id;});
  if(!p)return;
  editId=id;
  document.getElementById('product-modal-title').textContent='Chỉnh Sửa Sản Phẩm';
  var f=document.getElementById('product-form');
  f.querySelector('[name="name"]').value=p.name;
  f.querySelector('[name="category"]').value=p.category;
  f.querySelector('[name="status"]').value=p.status||'active';

  var tbody = document.getElementById('variantsTableBody');
  if(tbody) {
      tbody.innerHTML = '';
      if(p.variants && p.variants.length > 0) {
          p.variants.forEach(function(v){window.addVariantRow(v);});
      } else {
          window.addVariantRow();
      }
  }
  f.querySelector('[name="status"]').value=p.status||'active';
  f.querySelector('[name="badge"]').value=p.badge||'';
  f.querySelector('[name="material"]').value=p.material||'';
  f.querySelector('[name="color"]').value=p.color||'';
  f.querySelector('[name="glazeLineId"]').value=p.glazeLineId||'';
  f.querySelector('[name="pattern"]').value=p.pattern||'';
  f.querySelector('[name="usage"]').value=p.usage||'';
  f.querySelector('[name="shortDescription"]').value=p.shortDescription||'';
  
  var imgUrlInput = f.querySelector('[name="imageUrl"]');
  var gallery = document.getElementById('product-image-gallery');
  if(imgUrlInput && gallery) {
      var imgs = p.images || [];
      renderImageGallery(imgs.slice());
  }
  if(document.getElementById('product-image-upload')) document.getElementById('product-image-upload').value = '';

  if(editorInstance) {
      editorInstance.setData(p.description||'');
  } else {
      f.querySelector('[name="description"]').value=p.description||'';
  }
  
  f.querySelectorAll('select').forEach(function(s){s.dispatchEvent(new Event('change'));});
  openModal('productModal');
}

function saveProduct(){
  var f=document.getElementById('product-form');
  var name=f.querySelector('[name="name"]').value.trim();
  
  var variants = [];
  var rows = document.querySelectorAll('#variantsTableBody tr');
  rows.forEach(function(tr) {
      var id = parseInt(tr.querySelector('.v-id').value) || 0;
      var size = tr.querySelector('.v-size').value.trim();
      var price = parseInt(tr.querySelector('.v-price').value.replace(/\./g, '')) || 0;
      var originalPrice = parseInt(tr.querySelector('.v-original').value.replace(/\./g, '')) || null;
      var stock = parseInt(tr.querySelector('.v-stock').value) || 0;
      if (price > 0) {
          variants.push({ id: id, size: size, price: price, originalPrice: originalPrice, stock: stock });
      }
  });

  if(!name || variants.length === 0){adminToast('Vui lòng điền đủ Tên và ít nhất 1 Phiên bản có giá!','error');return;}
  var desc = editorInstance ? editorInstance.getData() : f.querySelector('[name="description"]').value.trim();
  var imgUrlVal = f.querySelector('[name="imageUrl"]') ? f.querySelector('[name="imageUrl"]').value.trim() : '[]';
  var imagesArr = [];
  try { imagesArr = JSON.parse(imgUrlVal); } catch(e) { if(imgUrlVal) imagesArr = [imgUrlVal]; }

  var data={
    name:name,
    category:f.querySelector('[name="category"]').value,
    variants:variants,
    status:f.querySelector('[name="status"]').value,
    badge:f.querySelector('[name="badge"]').value||null,
    material:f.querySelector('[name="material"]').value.trim()||null,
    color:f.querySelector('[name="color"]').value.trim()||null,
    glazeLineId:parseInt(f.querySelector('[name="glazeLineId"]').value)||null,
    pattern:f.querySelector('[name="pattern"]').value.trim()||null,
    usage:f.querySelector('[name="usage"]').value.trim()||null,
    shortDescription:f.querySelector('[name="shortDescription"]').value.trim()||null,
    description:desc,
    images: imagesArr,
    slug:name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')
  };
  var oldProducts = products.slice();
  if(editId){
    data.id = editId;
    var idx=products.findIndex(function(x){return x.id===editId;});
    if(idx>=0){products[idx]=Object.assign({},products[idx],data);}
  }else{
    products.push(data);
  }
  
  AdminData.products.save(data).then(function(savedData) {
      adminToast(editId ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!','success');
      AdminData.products.load().then(function(newData) {
          products = newData;
          closeModal('productModal');
          renderTable();
      });
  }).catch(function(err) {
      console.error(err);
      products = oldProducts; 
      adminToast('Có lỗi xảy ra!','error');
  });
}

function deleteProduct(id){
  adminConfirm('Xoá sản phẩm này? Hành động không thể hoàn tác.',function(){
    AdminData.products.delete(id).then(function() {
        products=products.filter(function(p){return p.id!==id;});
        adminToast('Đã xoá sản phẩm','warning');
        renderTable();
    }).catch(function(e) {
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

function bindEvents(){
  var search=document.getElementById('product-search');
  if(search)search.addEventListener('input',function(){searchQ=search.value;currentPage=1;renderTable();});
  var catFilter=document.getElementById('product-cat-filter');
  if(catFilter)catFilter.addEventListener('change',function(){filterCat=this.value;currentPage=1;renderTable();});
  var statusFilter=document.getElementById('product-status-filter');
  if(statusFilter)statusFilter.addEventListener('change',function(){filterStatus=this.value;currentPage=1;renderTable();});
  var pageSizeSelect=document.getElementById('page-size-select');
  if(pageSizeSelect){
    pageSizeSelect.value=pageSize.toString();
    pageSizeSelect.addEventListener('change',function(){
      pageSize=parseInt(pageSizeSelect.value)||10;
      currentPage=1;
      renderTable();
    });
  }
  var addBtn=document.getElementById('btn-add-product');
  if(addBtn)addBtn.addEventListener('click',openAdd);
  var saveBtn=document.getElementById('btn-save-product');
  if(saveBtn)saveBtn.addEventListener('click',saveProduct);
  
  document.getElementById('products-table-body').addEventListener('click',function(e){
    var editBtn=e.target.closest('.btn-edit');
    var delBtn=e.target.closest('.btn-delete');
    if(editBtn)openEdit(parseInt(editBtn.dataset.id));
    if(delBtn)deleteProduct(parseInt(delBtn.dataset.id));
  });

  var priceInput = document.querySelector('#product-form [name="price"]');
  if(priceInput) {
    priceInput.addEventListener('input', function(e) {
      var val = e.target.value.replace(/[^0-9]/g, '');
      if(val) {
        e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      } else {
        e.target.value = '';
      }
    });
  }

  var imgUpload = document.getElementById('product-image-upload');
  if(imgUpload) {
    imgUpload.addEventListener('change', function(e) {
      var files = Array.from(e.target.files);
      if(!files.length) return;
      var uploadPromises = files.map(function(file) {
          var formData = new FormData();
          formData.append('file', file);
          return fetch('http://localhost:5080/api/upload', {
              method: 'POST',
              body: formData
          }).then(res => res.json());
      });

      Promise.all(uploadPromises).then(function(results) {
          var currentVal = document.getElementById('product-image-url').value;
          var currentImgs = [];
          try { currentImgs = JSON.parse(currentVal); } catch(e) { if(currentVal) currentImgs = [currentVal]; }
          
          results.forEach(function(data) {
              var finalUrl = data.url || data.Url;
              if(finalUrl) currentImgs.push('http://localhost:5080' + finalUrl);
          });
          
          renderImageGallery(currentImgs);
          if(imgUpload) imgUpload.value = '';
          
          adminToast('Tải ' + results.length + ' file thành công', 'success');
      }).catch(function(err) {
          console.error(err);
          adminToast('Lỗi khi tải file', 'error');
      });
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
          var p = products.find(function(x){return x.id === id});
          if(p) p.status = newStatus;
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

document.addEventListener('DOMContentLoaded',init);
}());

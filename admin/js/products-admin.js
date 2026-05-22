// products-admin.js
(function(){'use strict';
if(!document.getElementById('products-table-body'))return;

var products, currentPage=1, pageSize=10, searchQ='', filterCat='all', editId=null;
var editorInstance;

function init(){
  if (typeof ClassicEditor !== 'undefined') {
      ClassicEditor.create(document.querySelector('#product-description'))
          .then(function(editor) { editorInstance = editor; })
          .catch(function(error) { console.error(error); });
  }
  
  fetch('http://localhost:5080/api/site-config')
    .then(r=>r.json())
    .then(configs => {
        if(configs.product_materials) {
            var materials = configs.product_materials.split(',').map(m=>m.trim()).filter(Boolean);
            if(materials.length > 0) {
                var select = document.querySelector('[name="material"]');
                if(select) {
                    select.innerHTML = materials.map(m => '<option value="'+m+'">'+m+'</option>').join('');
                }
            }
        }
    }).catch(e=>console.error(e));

  AdminData.products.load().then(function(data) {
    products = data;
    renderTable();
    bindEvents();
  }).catch(function(e) { console.error(e); });
}

function getFiltered(){
  return products.filter(function(p){
    var q=searchQ.toLowerCase();
    var matchQ=!q||p.name.toLowerCase().includes(q)||AdminData.getCatName(p.category).toLowerCase().includes(q);
    var matchCat=filterCat==='all'||p.category===filterCat;
    return matchQ&&matchCat;
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
    tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="empty-state__icon">📦</div><div class="empty-state__title">Không có sản phẩm</div></div></td></tr>';
  }else{
    tbody.innerHTML=slice.map(function(p){
      var statusBadge=p.status==='active'?'<span class="badge badge--success">Còn hàng</span>':'<span class="badge badge--muted">Ngừng bán</span>';
      var badgePill=p.badge?'<span class="badge badge--gold" style="margin-left:4px">'+p.badge+'</span>':'';
      var imgHtml = (p.images && p.images.length > 0 && p.images[0]) ? 
        '<img src="'+p.images[0]+'" data-images=\''+JSON.stringify(p.images)+'\' class="product-thumb zoomable" style="object-fit:cover;cursor:pointer;">' : 
        '<div class="product-thumb" style="background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:1.4rem">🏺</div>';

      return '<tr>'+
        '<td><div class="product-info">'+
          imgHtml+
          '<div><div class="product-name">'+p.name+badgePill+'</div><div class="product-cat">'+AdminData.getCatName(p.category)+'</div></div>'+
        '</div></td>'+
        '<td><strong>'+AdminData.fmt(p.price)+'</strong></td>'+
        '<td class="hide-mobile">'+p.material+'</td>'+
        '<td class="hide-mobile">'+p.size+'</td>'+
        '<td><span style="font-weight:600;color:'+(p.stock<5?'var(--danger)':'var(--success)')+'">'+p.stock+'</span></td>'+
        '<td>'+statusBadge+'</td>'+
        '<td class="actions-cell">'+
          '<button class="btn btn--sm btn--secondary btn-edit" data-id="'+p.id+'">✏️ Sửa</button>'+
          '<button class="btn btn--sm btn--danger btn-delete" data-id="'+p.id+'">🗑️</button>'+
        '</td>'+
      '</tr>';
    }).join('');
  }

  // Pagination
  renderPagination(total,pages);
  document.getElementById('product-count').textContent='Hiển thị '+(slice.length)+'/'+total+' sản phẩm';
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
  document.getElementById('product-image-url').value = '[]';
  document.getElementById('product-image-gallery').innerHTML = '<div class="gallery-container" style="display:flex;gap:10px;flex-wrap:wrap;"><div class="gallery-upload-btn" onclick="document.getElementById(\'product-image-upload\').click()" style="width:60px;height:60px;border:2px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:#888;">+</div></div>';
  if(document.getElementById('product-image-upload')) document.getElementById('product-image-upload').value = '';
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
  f.querySelector('[name="price"]').value=p.price ? p.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
  f.querySelector('[name="category"]').value=p.category;
  f.querySelector('[name="material"]').value=p.material||'Gốm sứ';
  f.querySelector('[name="size"]').value=p.size||'';
  f.querySelector('[name="stock"]').value=p.stock||0;
  f.querySelector('[name="status"]').value=p.status||'active';
  f.querySelector('[name="badge"]').value=p.badge||'';
  
  var imgUrlInput = f.querySelector('[name="imageUrl"]');
  var gallery = document.getElementById('product-image-gallery');
  if(imgUrlInput && gallery) {
      var imgs = p.images || [];
      imgUrlInput.value = JSON.stringify(imgs);
      var galleryHTML = imgs.map(function(img) {
          return '<div class="gallery-item" style="position:relative;"><img src="' + img + '" class="gallery-img zoomable" style="width:60px;height:60px;object-fit:cover;border-radius:4px;cursor:pointer;"></div>';
      }).join('');
      var uploadBtnHTML = '<div class="gallery-upload-btn" onclick="document.getElementById(\'product-image-upload\').click()" style="width:60px;height:60px;border:2px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:#888;">+</div>';
      gallery.innerHTML = '<div class="gallery-container" style="display:flex;gap:10px;flex-wrap:wrap;">' + galleryHTML + uploadBtnHTML + '</div>';
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
  var price=parseInt(f.querySelector('[name="price"]').value.replace(/\./g, ''))||0;
  if(!name||!price){adminToast('Vui lòng điền đầy đủ thông tin!','error');return;}
  var desc = editorInstance ? editorInstance.getData() : f.querySelector('[name="description"]').value.trim();
  var imgUrlVal = f.querySelector('[name="imageUrl"]') ? f.querySelector('[name="imageUrl"]').value.trim() : '[]';
  var imagesArr = [];
  try { imagesArr = JSON.parse(imgUrlVal); } catch(e) { if(imgUrlVal) imagesArr = [imgUrlVal]; }

  var data={
    name:name, price:price,
    category:f.querySelector('[name="category"]').value,
    material:f.querySelector('[name="material"]').value,
    size:f.querySelector('[name="size"]').value.trim(),
    stock:parseInt(f.querySelector('[name="stock"]').value)||0,
    status:f.querySelector('[name="status"]').value,
    badge:f.querySelector('[name="badge"]').value||null,
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

function bindEvents(){
  var search=document.getElementById('product-search');
  if(search)search.addEventListener('input',function(){searchQ=search.value;currentPage=1;renderTable();});
  var catFilter=document.getElementById('product-cat-filter');
  if(catFilter)catFilter.addEventListener('change',function(){filterCat=catFilter.value;currentPage=1;renderTable();});
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
          
          document.getElementById('product-image-url').value = JSON.stringify(currentImgs);
          var gallery = document.getElementById('product-image-gallery');
          var galleryHTML = currentImgs.map(function(url) {
              return '<div class="gallery-item" style="position:relative;"><img src="'+url+'" class="gallery-img zoomable" style="width:60px;height:60px;object-fit:cover;border-radius:4px;cursor:pointer;"></div>';
          }).join('');
          var uploadBtnHTML = '<div class="gallery-upload-btn" onclick="document.getElementById(\'product-image-upload\').click()" style="width:60px;height:60px;border:2px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:#888;">+</div>';
          gallery.innerHTML = '<div class="gallery-container" style="display:flex;gap:10px;flex-wrap:wrap;">' + galleryHTML + uploadBtnHTML + '</div>';
          
          adminToast('Tải ' + results.length + ' ảnh thành công', 'success');
      }).catch(function(err) {
          console.error(err);
          adminToast('Lỗi khi tải ảnh', 'error');
      });
    });
  }
}

document.addEventListener('DOMContentLoaded',init);
}());

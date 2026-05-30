// orders-admin.js
(function(){'use strict';
if(!document.getElementById('orders-table-body'))return;

var orders, products=[], customers=[], searchQ='', filterStatus='all', filterDateFrom='', filterDateTo='', currentPage=1, pageSize=10;
var sortCol='date', sortDesc=true;
var createLines=[{ productId: '', qty: 1 }];

function init(){
  Promise.all([AdminData.orders.load(), AdminData.products.load(), AdminData.customers.load()]).then(function(res){
    orders=res[0];
    products=(res[1]||[]).filter(function(p){return p.status==='active';});
    customers=res[2]||[];
    renderStatusTabs();
    renderTable();
    bindEvents();
    populateCustomerDatalists();
    AdminData.orders.updatePendingBadge(orders);
  }).catch(function(){
    adminToast('Không tải được dữ liệu','error');
  });
}

function populateCustomerDatalists() {
  var namesHTML = '';
  var phonesHTML = '';
  var emailsHTML = '';
  
  customers.forEach(function(c) {
      if(c.name) namesHTML += '<option value="' + c.name + '">';
      if(c.phone) phonesHTML += '<option value="' + c.phone + '">';
      if(c.email) emailsHTML += '<option value="' + c.email + '">';
  });
  
  var dn = document.getElementById('customer-names');
  var dp = document.getElementById('customer-phones');
  var de = document.getElementById('customer-emails');
  if(dn) dn.innerHTML = namesHTML;
  if(dp) dp.innerHTML = phonesHTML;
  if(de) de.innerHTML = emailsHTML;
}

function autofillCustomerInfo(val) {
  if(!val) return;
  var c = customers.find(function(x) {
      return x.name === val || x.phone === val || x.email === val;
  });
  if(c) {
      var f = document.getElementById('order-create-form');
      if(!f) return;
      var inputs = {
          customer: f.querySelector('[name="customer"]'),
          phone: f.querySelector('[name="phone"]'),
          email: f.querySelector('[name="email"]'),
          address: f.querySelector('[name="address"]')
      };
      if(inputs.customer && !inputs.customer.value) inputs.customer.value = c.name || '';
      if(inputs.phone && !inputs.phone.value) inputs.phone.value = c.phone || '';
      if(inputs.email && !inputs.email.value) inputs.email.value = c.email || '';
      if(inputs.address && !inputs.address.value) inputs.address.value = c.address || '';
  }
}

function getFiltered(){
  var arr = orders.filter(function(o){
    var q = searchQ.toLowerCase();
    var matchQ = !q || 
                 o.id.toLowerCase().includes(q) || 
                 (o.customer && o.customer.toLowerCase().includes(q)) || 
                 (o.phone && o.phone.includes(q));
                 
    var matchDate = true;
    if (filterDateFrom || filterDateTo) {
      var oDate = new Date(o.date);
      oDate.setHours(0, 0, 0, 0); // normalize for comparison
      if (filterDateFrom) {
        var fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (oDate < fromDate) matchDate = false;
      }
      if (filterDateTo) {
        var toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (oDate > toDate) matchDate = false;
      }
    }
    
    var matchS = filterStatus === 'all' || o.status === filterStatus;
    return matchQ && matchS && matchDate;
  });

  arr.sort(function(a, b) {
    if (sortCol === 'total') {
      return sortDesc ? b.total - a.total : a.total - b.total;
    } else {
      var dA = new Date(a.date).getTime() || 0;
      var dB = new Date(b.date).getTime() || 0;
      return sortDesc ? dB - dA : dA - dB;
    }
  });

  return arr;
}

function renderStatusTabs(){
  var tabs=document.getElementById('order-status-tabs');
  if(!tabs)return;
  var statuses=[
    {key:'all',label:'Tất cả'},
    {key:'pending',label:'Chờ xác nhận'},
    {key:'confirmed',label:'Đã xác nhận'},
    {key:'shipping',label:'Đang giao'},
    {key:'completed',label:'Hoàn thành'},
    {key:'cancelled',label:'Đã huỷ'}
  ];
  tabs.innerHTML=statuses.map(function(s){
    var count=s.key==='all'?orders.length:orders.filter(function(o){return o.status===s.key;}).length;
    return '<button class="status-tab'+(filterStatus===s.key?' active':'')+'" data-status="'+s.key+'">'+s.label+' <span class="tab-count">'+count+'</span></button>';
  }).join('');
  tabs.querySelectorAll('.status-tab').forEach(function(btn){
    btn.addEventListener('click',function(){
      filterStatus=btn.dataset.status;
      currentPage=1;
      tabs.querySelectorAll('.status-tab').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      renderTable();
    });
  });
}

function renderTable(){
  var filtered=getFiltered();
  var total=filtered.length;
  var pages=Math.ceil(total/pageSize)||1;
  if(currentPage>pages)currentPage=1;
  var slice=filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);
  var tbody=document.getElementById('orders-table-body');
  if(!slice.length){
    tbody.innerHTML='<tr><td colspan="8"><div class="empty-state"><div class="empty-state__icon">🛒</div><div class="empty-state__title">Không có đơn hàng</div></div></td></tr>';
  }else{
    tbody.innerHTML=slice.map(function(o, idx){
      var stt = (currentPage-1)*pageSize + idx + 1;
      var customerInitial = o.customer ? o.customer.charAt(0).toUpperCase() : '?';
      var customerHtml = '<div style="display:flex;align-items:center;gap:12px;">' +
        '<div class="avatar-circle">' + customerInitial + '</div>' +
        '<div><div style="font-weight:600">' + o.customer + '</div><div style="font-size:var(--fs-xs);color:var(--text-muted)">' + o.phone + '</div></div></div>';
      
      var itemsStackHtml = '<div style="display:flex;align-items:center;">';
      itemsStackHtml += '<div class="avatar-stack">';
      var maxItems = 3;
      var totalQty = 0;
      o.items.forEach(function(it, i) {
          totalQty += (it.qty || 1);
          if (i < maxItems) {
              if (it.imageUrl) itemsStackHtml += '<img src="'+it.imageUrl+'" title="'+it.name+'">';
              else itemsStackHtml += '<div class="avatar-placeholder" title="'+it.name+'">🏺</div>';
          }
      });
      if (o.items.length > maxItems) {
          itemsStackHtml += '<div class="avatar-placeholder" style="background:#e2e8f0">+' + (o.items.length - maxItems) + '</div>';
      }
      itemsStackHtml += '</div><div class="avatar-stack-text">' + totalQty + ' sản phẩm</div></div>';
      
      var actionBtn = '<button class="btn btn--sm btn--secondary btn-view-order" data-id="'+o.id+'">Chi tiết</button>';
      if (o.status === 'pending') {
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-confirm" data-id="'+o.id+'" style="margin-right:4px;" title="Duyệt đơn nhanh">✓ Duyệt</button>' +
                      '<button class="btn btn--sm btn--danger btn-quick-cancel" data-id="'+o.id+'" style="margin-right:4px; background-color:#fee2e2; border-color:#fecaca; color:#dc2626;" title="Hủy đơn nhanh">✕ Hủy</button>' + actionBtn;
      } else if (o.status === 'confirmed') {
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-ship" data-id="'+o.id+'" style="margin-right:4px; background-color:#e0f2fe; border-color:#bae6fd; color:#0284c7;" title="Giao đơn nhanh">🚚 Giao hàng</button>' +
                      '<button class="btn btn--sm btn--danger btn-quick-cancel" data-id="'+o.id+'" style="margin-right:4px; background-color:#fee2e2; border-color:#fecaca; color:#dc2626;" title="Hủy đơn nhanh">✕ Hủy</button>' + actionBtn;
      } else if (o.status === 'shipping') {
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-complete" data-id="'+o.id+'" style="margin-right:4px; background-color:#dcfce7; border-color:#bbf7d0; color:#16a34a;" title="Hoàn thành nhanh">📦 Hoàn thành</button>' + actionBtn;
      }
      
      var deleteBtn = '<button class="btn btn--sm btn--danger btn-delete-order" data-id="'+o.id+'" style="margin-left:4px; background-color:#fee2e2; border-color:#fecaca; color:#dc2626;" title="Xoá đơn hàng">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">' +
                          '<polyline points="3 6 5 6 21 6"></polyline>' +
                          '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
                        '</svg>' +
                      '</button>';
      actionBtn = actionBtn + deleteBtn;
      
      var customerNoteHtml = o.customerNote ? '<div style="display:inline-flex;align-items:flex-start;gap:6px;margin-top:6px;padding:6px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:11px;line-height:1.4;max-width:240px;white-space:normal;word-break:break-word;box-shadow:0 1px 2px rgba(0,0,0,0.05);"><i class="fas fa-comment-dots" style="margin-top:2px;color:#d97706;"></i> <span>'+escapeHTML(o.customerNote)+'</span></div>' : '';
      var customerHtml='<div class="table-customer">'+
        '<div class="table-customer-name">'+escapeHTML(o.customer)+'</div>'+
        '<div class="table-customer-contact">'+escapeHTML(o.phone)+'</div>'+
        customerNoteHtml+
        '</div>';
      
      var itemsStackHtml = '<div class="items-stack">';
      o.items.forEach(function(i, idx){
        if (idx < 3) {
          var p = i.productId ? getProductById(i.productId) : null;
          var productImages = (p && p.images && p.images.length > 0) ? p.images : (i.imageUrl ? [i.imageUrl] : []);
          var img = (productImages.length > 0) ? productImages[0] : '';
          var fallback = '🏺';
          
          if (img) {
            itemsStackHtml += '<div class="items-stack-img" title="'+escapeHTML(i.name)+' (x'+i.qty+')"><img src="'+img+'" alt=""></div>';
          } else {
            itemsStackHtml += '<div class="items-stack-img" title="'+escapeHTML(i.name)+' (x'+i.qty+')" style="background:var(--surface-100);display:flex;align-items:center;justify-content:center;font-size:14px;">'+fallback+'</div>';
          }
        }
      });
      if (o.items.length > 3) {
        itemsStackHtml += '<div class="items-stack-more">+'+(o.items.length - 3)+'</div>';
      }
      itemsStackHtml += '</div>';

      return '<tr class="order-row-'+o.status+'">'+
        '<td class="stt-cell">'+stt+'</td>'+
        '<td><span class="order-id-badge">#'+o.id+'</span></td>'+
        '<td>'+customerHtml+'</td>'+
        '<td><strong>'+AdminData.fmt(o.total)+'</strong></td>'+
        '<td class="hide-mobile">'+AdminData.fmtDate(o.date)+'</td>'+
        '<td><span class="badge '+AdminData.getStatusBadge(o.status)+'">'+AdminData.getStatusLabel(o.status)+'</span></td>'+
        '<td><input class="table-note-input" type="text" value="'+escapeHTML(o.adminNote||'')+'" placeholder="Thêm ghi chú nội bộ..." data-id="'+o.id+'"></td>'+
        '<td class="actions-cell" style="white-space:nowrap">'+actionBtn+'</td>'+
      '</tr>';
    }).join('');
  }
  var countEl=document.getElementById('order-count');
  if(countEl)countEl.textContent=total+' đơn';
  renderPag(total,pages);
  if(window.initCustomSelects)window.initCustomSelects(tbody);
}

function renderPag(total,pages){
  var pag=document.getElementById('orders-pagination');
  if(!pag)return;
  var html='<div class="pagination__info">'+total+' đơn hàng | Trang '+currentPage+'/'+pages+'</div><div class="pagination__btns">';
  html+='<button class="pag-btn" id="o-prev" '+(currentPage===1?'disabled':'')+'>‹</button>';
  for(var i=1;i<=Math.min(pages,5);i++)html+='<button class="pag-btn'+(i===currentPage?' active':'')+'" data-page="'+i+'">'+i+'</button>';
  html+='<button class="pag-btn" id="o-next" '+(currentPage===pages?'disabled':'')+'>›</button></div>';
  pag.innerHTML=html;
  pag.querySelectorAll('[data-page]').forEach(function(b){b.addEventListener('click',function(){currentPage=+b.dataset.page;renderTable();});});
  var p=pag.querySelector('#o-prev'),n=pag.querySelector('#o-next');
  if(p)p.addEventListener('click',function(){if(currentPage>1){currentPage--;renderTable();}});
  if(n)n.addEventListener('click',function(){if(currentPage<pages){currentPage++;renderTable();}});
}

function viewOrder(id){
  var o=orders.find(function(x){return x.id===id;});
  if(!o)return;
  document.getElementById('order-detail-id').textContent=o.id;
  var dateEl=document.getElementById('order-detail-date');
  if(dateEl) dateEl.textContent = 'Ngày đặt: ' + AdminData.fmtDate(o.date);
  document.getElementById('order-detail-status').innerHTML='<span class="badge '+AdminData.getStatusBadge(o.status)+'" style="font-size:14px;padding:6px 12px;">'+AdminData.getStatusLabel(o.status)+'</span>';
  
  document.getElementById('order-detail-customer').innerHTML=
    '<div class="stat-row"><div class="stat-row__label">Khách hàng</div><div class="stat-row__value" style="font-weight:600;color:var(--text-primary)">'+escapeHTML(o.customer)+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Điện thoại</div><div class="stat-row__value">'+escapeHTML(o.phone)+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Email</div><div class="stat-row__value">'+escapeHTML(o.email||'—')+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Địa chỉ</div><div class="stat-row__value">'+escapeHTML(o.address)+'</div></div>'+
    (o.customerNote?'<div class="stat-row" style="background:#fffbeb;border:1px dashed #fcd34d;padding:12px;border-radius:8px;margin-bottom:12px;"><div class="stat-row__label" style="color:#d97706;font-weight:600;margin-bottom:4px;"><i class="fas fa-comment-dots"></i> Lời dặn của khách hàng</div><div class="stat-row__value" style="color:#92400e;font-weight:500;font-size:14px;line-height:1.5;">'+escapeHTML(o.customerNote)+'</div></div>':'') +
    '<div class="stat-row"><div class="stat-row__label">Ghi chú nội bộ</div><div class="stat-row__value"><input class="table-note-input" style="width:100%;margin:0;" type="text" value="'+escapeHTML(o.adminNote||'')+'" placeholder="Nhập ghi chú nội bộ..." data-id="'+o.id+'" onchange="saveInlineNote(\''+o.id+'\', this.value)"></div></div>';
  
  var itemsHtml='<div class="order-lines">';
  o.items.forEach(function(i){
    var p = i.productId ? getProductById(i.productId) : null;
    var productImages = (p && p.images && p.images.length > 0) ? p.images : (i.imageUrl ? [i.imageUrl] : []);
    
    var imgHtml = '';
    if (productImages.length > 0) {
      if (typeof window.generateAdminThumbnailHTML === 'function') {
        imgHtml = '<div style="flex-shrink:0;width:72px;height:72px;border-radius:10px;overflow:hidden;border:1px solid var(--border);">' +
                  window.generateAdminThumbnailHTML(productImages[0], 72, 'zoomable', "data-images='" + JSON.stringify(productImages).replace(/'/g, '&#39;') + "'") +
                  '</div>';
      } else {
        imgHtml = '<img src="'+productImages[0]+'" class="zoomable" data-images=\'' + JSON.stringify(productImages).replace(/'/g, '&#39;') + '\' alt="" style="width:72px;height:72px;object-fit:cover;border-radius:10px;flex-shrink:0;border:1px solid var(--border);">';
      }
    } else {
      imgHtml = '<div style="width:72px;height:72px;background:var(--surface-100);border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px;">🏺</div>';
    }

    var productCode = i.productId ? ('<span style="display:inline-block;font-size:10.5px;font-weight:700;color:var(--accent);background:rgba(200,146,42,0.1);border:1px solid rgba(200,146,42,0.25);border-radius:4px;padding:1px 7px;letter-spacing:.04em;">#SP' + String(i.productId).padStart(4,'0') + '</span>') : '';
    var sizeHtml = i.size ? ('<span style="display:inline-block;font-size:10.5px;color:var(--text-muted);background:var(--surface-100);border:1px solid var(--border);border-radius:4px;padding:1px 7px;margin-left:4px;">Size: '+escapeHTML(i.size)+'</span>') : '';
    var nameHtml = escapeHTML(i.name);
    if (p && p.slug) {
      nameHtml = '<a href="../product-detail.html?slug=' + p.slug + '" target="_blank" style="color:inherit; text-decoration:none; transition: color 0.2s;" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'inherit\'" title="Xem chi tiết sản phẩm trên website">' + escapeHTML(i.name) + '</a>';
    }
    itemsHtml += '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px dashed var(--border);">' +
      imgHtml +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:600;font-size:13.5px;line-height:1.4;margin-bottom:5px;">' + nameHtml + '</div>' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:5px;">' + productCode + sizeHtml + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);">Số lượng: <strong>'+i.qty+'</strong> &times; '+AdminData.fmt(i.price)+'</div>' +
      '</div>' +
      '<div style="font-weight:700;font-size:14px;color:var(--accent);text-align:right;white-space:nowrap;margin-left:8px;flex-shrink:0;">'+AdminData.fmt(i.price*i.qty)+'</div>' +
      '</div>';
  });
  itemsHtml += '</div>';
  itemsHtml+='<div class="order-create-total"><span style="font-size:16px;font-weight:600;">Tổng cộng</span><span style="font-size:24px;font-weight:700;color:var(--accent)">'+AdminData.fmt(o.total)+'</span></div>';
  document.getElementById('order-detail-items').innerHTML=itemsHtml;
  
  var sel=document.getElementById('order-detail-status-select');
  if(sel){sel.value=o.status;sel.dataset.id=o.id;sel.dispatchEvent(new Event('change'));}
  openModal('orderDetailModal');
}

function updateOrderStatus(id,status){
  if(!status)return;
  AdminData.orders.updateStatus(id, status).then(function() {
      var idx=orders.findIndex(function(o){return o.id===id;});
      if(idx>=0) orders[idx].status=status;
      adminToast('Cập nhật trạng thái: '+AdminData.getStatusLabel(status),'success');
      renderStatusTabs();
      renderTable();
      AdminData.orders.updatePendingBadge(orders);
  }).catch(function() {
      adminToast('Lỗi cập nhật trạng thái', 'error');
  });
}

function deleteOrder(id) {
  AdminData.orders.delete(id).then(function() {
      orders = orders.filter(function(o) { return o.id !== id; });
      adminToast('Đã xóa đơn hàng #' + id, 'success');
      renderStatusTabs();
      renderTable();
      AdminData.orders.updatePendingBadge(orders);
  }).catch(function(err) {
      adminToast('Lỗi khi xóa đơn hàng: ' + (err.message || 'thất bại'), 'error');
  });
}

function getProductById(id){
  return products.find(function(p){return String(p.id)===String(id);});
}

function productOptions(selectedId){
  var opts='<option value="">-- Chọn sản phẩm --</option>';
  products.forEach(function(p){
    var sel=String(p.id)===String(selectedId)?' selected':'';
    opts+='<option value="'+p.id+'"'+sel+'>'+p.name+' — '+AdminData.fmt(p.price)+'</option>';
  });
  return opts;
}

function calcCreateTotal(){
  var total=0;
  createLines.forEach(function(line){
    var p=getProductById(line.productId);
    if(p&&line.qty>0)total+=p.price*line.qty;
  });
  return total;
}

function renderCreateLines(){
  var wrap=document.getElementById('order-create-lines');
  if(!wrap)return;
  if(!products.length){
    wrap.innerHTML='<p style="color:var(--text-muted);font-size:var(--fs-sm)">Chưa có sản phẩm đang bán. Vui lòng thêm sản phẩm trước.</p>';
    return;
  }
  wrap.innerHTML=createLines.map(function(line,idx){
    var p=getProductById(line.productId);
    var sub=p&&line.qty>0?AdminData.fmt(p.price*line.qty):'—';
    return '<div class="order-line" data-line="'+idx+'">'+
      '<select class="form-control order-line-product" data-idx="'+idx+'">'+productOptions(line.productId)+'</select>'+
      '<input class="form-control order-line-qty" type="number" min="1" value="'+(line.qty||1)+'" data-idx="'+idx+'">'+
      '<div class="order-line__subtotal">'+sub+'</div>'+
      '<button type="button" class="btn btn--sm btn--danger btn-remove-line" data-idx="'+idx+'" title="Xóa dòng"'+(createLines.length<=1?' disabled':'')+'>✕</button>'+
    '</div>';
  }).join('');

  var totalEl=document.getElementById('order-create-total');
  if(totalEl)totalEl.textContent=AdminData.fmt(calcCreateTotal());

  if(window.initCustomSelects)window.initCustomSelects(wrap);
}

function resetCreateForm(){
  var f=document.getElementById('order-create-form');
  if(f)f.reset();
  createLines=[{ productId: '', qty: 1 }];
  renderCreateLines();
}

function openCreateModal(){
  if(!products.length){
    adminToast('Chưa có sản phẩm đang bán để tạo đơn','warning');
    return;
  }
  resetCreateForm();
  openModal('orderCreateModal');
}

function saveNewOrder(){
  var f=document.getElementById('order-create-form');
  if(!f)return;

  var customer=f.querySelector('[name="customer"]').value.trim();
  var phone=f.querySelector('[name="phone"]').value.trim();
  var email=f.querySelector('[name="email"]').value.trim();
  var address=f.querySelector('[name="address"]').value.trim();
  var note=f.querySelector('[name="note"]').value.trim();
  var status=f.querySelector('[name="status"]').value;

  if(!customer){adminToast('Vui lòng nhập tên khách hàng','warning');return;}
  if(!phone){adminToast('Vui lòng nhập số điện thoại','warning');return;}
  if(!address){adminToast('Vui lòng nhập địa chỉ giao hàng','warning');return;}

  var itemsMap = {};
  createLines.forEach(function(line){
    if(line.productId && line.qty > 0){
      var pid = parseInt(line.productId, 10);
      var qty = parseInt(line.qty, 10) || 1;
      if(itemsMap[pid]){
        itemsMap[pid] += qty;
      } else {
        itemsMap[pid] = qty;
      }
    }
  });

  var items = [];
  for(var pid in itemsMap){
    if(itemsMap.hasOwnProperty(pid)){
      items.push({ id: parseInt(pid, 10), qty: itemsMap[pid] });
    }
  }

  if(!items.length){adminToast('Vui lòng chọn ít nhất một sản phẩm','warning');return;}

  var btn=document.getElementById('btn-save-order');
  if(btn){btn.disabled=true;btn.textContent='Đang lưu...';}

  AdminData.orders.create({
    customer: customer,
    phone: phone,
    email: email,
    address: address,
    customerNote: note || null,
    status: status,
    items: items
  }).then(function(created){
    orders.unshift(created);
    filterStatus='all';
    currentPage=1;
    renderStatusTabs();
    renderTable();
    AdminData.orders.updatePendingBadge(orders);
    closeModal('orderCreateModal');
    adminToast('Đã tạo đơn hàng '+created.id,'success');
  }).catch(function(err){
    adminToast(err.message||'Không thể tạo đơn hàng','error');
  }).finally(function(){
    if(btn){btn.disabled=false;btn.textContent='💾 Tạo đơn hàng';}
  });
}

function updateLineSubtotal(lineRowEl, idx) {
  if(!lineRowEl) return;
  var line = createLines[idx];
  var p = getProductById(line.productId);
  var sub = p && line.qty > 0 ? AdminData.fmt(p.price * line.qty) : '—';
  
  var subEl = lineRowEl.querySelector('.order-line__subtotal');
  if(subEl) subEl.textContent = sub;
  
  var totalEl = document.getElementById('order-create-total');
  if(totalEl) totalEl.textContent = AdminData.fmt(calcCreateTotal());
}

function updateLineSubtotal(lineRowEl, idx) {
  if(!lineRowEl) return;
  var line = createLines[idx];
  var p = getProductById(line.productId);
  var sub = p && line.qty > 0 ? AdminData.fmt(p.price * line.qty) : '—';
  
  var subEl = lineRowEl.querySelector('.order-line__subtotal');
  if(subEl) subEl.textContent = sub;
  
  var totalEl = document.getElementById('order-create-total');
  if(totalEl) totalEl.textContent = AdminData.fmt(calcCreateTotal());
}

function saveInlineNote(id, note) {
  var o = orders.find(function(x) { return x.id === id; });
  if (!o) return;
  if ((o.adminNote || '') === note) return;

  AdminData.orders.updateNote(id, note).then(function() {
    o.adminNote = note;
    adminToast('Đã lưu ghi chú nội bộ đơn hàng #' + id, 'success');
  }).catch(function(err) {
    adminToast('Lỗi lưu ghi chú: ' + (err.message || 'thất bại'), 'error');
  });
}

function bindEvents(){
  var search=document.getElementById('order-search');
  if(search)search.addEventListener('input',function(){searchQ=search.value;currentPage=1;renderTable();});

  var dateFrom = document.getElementById('order-date-from');
  var dateTo = document.getElementById('order-date-to');
  var btnClearDate = document.getElementById('btn-clear-date');

  function updateClearDateBtn() {
    if (btnClearDate) {
      if ((dateFrom && dateFrom.value) || (dateTo && dateTo.value)) {
        btnClearDate.style.display = 'flex';
      } else {
        btnClearDate.style.display = 'none';
      }
    }
  }

  if (dateFrom) dateFrom.addEventListener('change', function(){ filterDateFrom = this.value; updateClearDateBtn(); currentPage = 1; renderTable(); });
  if (dateTo) dateTo.addEventListener('change', function(){ filterDateTo = this.value; updateClearDateBtn(); currentPage = 1; renderTable(); });

  if (btnClearDate) {
    btnClearDate.addEventListener('click', function() {
      if (dateFrom) dateFrom.value = '';
      if (dateTo) dateTo.value = '';
      filterDateFrom = '';
      filterDateTo = '';
      updateClearDateBtn();
      currentPage = 1;
      renderTable();
    });
  }

  var pageSizeSel=document.getElementById('page-size-select');
  if(pageSizeSel)pageSizeSel.addEventListener('change',function(){
    pageSize=parseInt(this.value,10)||10;
    currentPage=1;
    renderTable();
  });

  document.querySelectorAll('th.sortable').forEach(function(th) {
    th.addEventListener('click', function() {
      var col = this.dataset.sort;
      if (sortCol === col) {
        sortDesc = !sortDesc;
      } else {
        sortCol = col;
        sortDesc = true;
      }
      
      document.querySelectorAll('th.sortable .sort-icon').forEach(function(icon) {
        icon.textContent = '↕';
        icon.style.color = '#aaa';
      });
      var currentIcon = this.querySelector('.sort-icon');
      if (currentIcon) {
        currentIcon.textContent = sortDesc ? '↓' : '↑';
        currentIcon.style.color = 'var(--accent)';
      }
      
      currentPage = 1;
      renderTable();
    });
  });

  // Set initial icon state
  var initialSortTh = document.querySelector('th.sortable[data-sort="date"]');
  if (initialSortTh) {
    var icon = initialSortTh.querySelector('.sort-icon');
    if (icon) {
      icon.textContent = sortDesc ? '↓' : '↑';
      icon.style.color = 'var(--accent)';
    }
  }

  var tbody = document.getElementById('orders-table-body');
  if (tbody) {
    tbody.addEventListener('click',function(e){
      var viewBtn=e.target.closest('.btn-view-order');
      if(viewBtn)viewOrder(viewBtn.dataset.id);
      
      var confirmBtn=e.target.closest('.btn-quick-confirm');
      if(confirmBtn){
        var id = confirmBtn.dataset.id;
        adminConfirm('Bạn có chắc chắn muốn DUYỆT đơn hàng #' + id + ' không?', function(){
          updateOrderStatus(id, 'confirmed');
        }, { title: 'Duyệt đơn hàng nhanh', type: 'warning', okText: 'Duyệt đơn' });
      }

      var shipBtn=e.target.closest('.btn-quick-ship');
      if(shipBtn){
        var id = shipBtn.dataset.id;
        adminConfirm('Bạn có chắc chắn muốn chuyển đơn hàng #' + id + ' sang ĐANG GIAO HÀNG?', function(){
          updateOrderStatus(id, 'shipping');
        }, { title: 'Giao đơn hàng nhanh', type: 'info', okText: 'Giao hàng' });
      }

      var completeBtn=e.target.closest('.btn-quick-complete');
      if(completeBtn){
        var id = completeBtn.dataset.id;
        adminConfirm('Bạn có chắc chắn muốn HOÀN THÀNH đơn hàng #' + id + '?', function(){
          updateOrderStatus(id, 'completed');
        }, { title: 'Hoàn thành đơn nhanh', type: 'success', okText: 'Hoàn thành' });
      }

      var cancelBtn=e.target.closest('.btn-quick-cancel');
      if(cancelBtn){
        var id = cancelBtn.dataset.id;
        adminConfirm('Bạn có chắc chắn muốn HỦY đơn hàng #' + id + ' không?\nHành động này không thể hoàn tác!', function(){
          updateOrderStatus(id, 'cancelled');
        }, { title: 'Hủy đơn hàng', type: 'danger', okText: 'Hủy đơn' });
      }

      var deleteBtn = e.target.closest('.btn-delete-order');
      if (deleteBtn) {
        var id = deleteBtn.dataset.id;
        adminConfirm('Bạn có chắc chắn muốn XÓA đơn hàng #' + id + ' không?\nHành động này không thể hoàn tác!', function(){
          deleteOrder(id);
        }, { title: 'Xóa đơn hàng', type: 'danger', okText: 'Xóa đơn' });
      }
    });

    tbody.addEventListener('focusout', function(e) {
      var input = e.target.closest('.table-note-input');
      if (input) {
        saveInlineNote(input.dataset.id, input.value.trim());
      }
    });

    tbody.addEventListener('keydown', function(e) {
      var input = e.target.closest('.table-note-input');
      if (input && e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
  }

  var detailSel=document.getElementById('order-detail-status-select');
  var confirmBtn=document.getElementById('btn-confirm-status');
  if(confirmBtn&&detailSel){
    confirmBtn.addEventListener('click',function(){
      var id = detailSel.dataset.id;
      var newStatus = detailSel.value;
      
      var o = orders.find(function(x){return x.id === id;});
      var oldLabel = o ? AdminData.getStatusLabel(o.status) : '';
      var newLabel = AdminData.getStatusLabel(newStatus);
      
      if(o && o.status === newStatus){
        closeModal('orderDetailModal');
        return;
      }

      var msg = 'Bạn có chắc chắn muốn chuyển trạng thái đơn hàng #' + id + ' từ "' + oldLabel + '" sang "' + newLabel + '" không?';
      var confirmType = 'warning';
      var okText = 'Cập nhật';
      if(newStatus === 'cancelled'){
        confirmType = 'danger';
        okText = 'Hủy đơn';
      } else if(newStatus === 'completed'){
        confirmType = 'success';
        okText = 'Hoàn thành';
      } else if(newStatus === 'shipping'){
        confirmType = 'info';
        okText = 'Giao hàng';
      }

      adminConfirm(msg, function(){
        updateOrderStatus(id, newStatus);
        closeModal('orderDetailModal');
      }, { title: 'Cập nhật trạng thái đơn', type: confirmType, okText: okText });
    });
  }

  var addBtn=document.getElementById('btn-add-order');
  if(addBtn)addBtn.addEventListener('click',openCreateModal);

  var addLineBtn=document.getElementById('btn-add-order-line');
  if(addLineBtn)addLineBtn.addEventListener('click',function(){
    createLines.push({ productId: '', qty: 1 });
    renderCreateLines();
  });

  var linesWrap=document.getElementById('order-create-lines');
  if(linesWrap){
    linesWrap.addEventListener('input',function(e){
      var qtyInp=e.target.closest('.order-line-qty');
      if(qtyInp){
        var idx=+qtyInp.dataset.idx;
        var val=parseInt(qtyInp.value,10);
        if(val && val > 0){
          createLines[idx].qty=val;
          updateLineSubtotal(qtyInp.closest('.order-line'), idx);
        }
      }
    });

    linesWrap.addEventListener('change',function(e){
      var prodSel=e.target.closest('.order-line-product');
      var qtyInp=e.target.closest('.order-line-qty');
      if(prodSel){
        var idx=+prodSel.dataset.idx;
        createLines[idx].productId=prodSel.value;
        updateLineSubtotal(prodSel.closest('.order-line'), idx);
      }
      if(qtyInp){
        var idx=+qtyInp.dataset.idx;
        createLines[idx].qty=Math.max(1,parseInt(qtyInp.value,10)||1);
        qtyInp.value=createLines[idx].qty;
        updateLineSubtotal(qtyInp.closest('.order-line'), idx);
      }
    });

    linesWrap.addEventListener('click',function(e){
      var rm=e.target.closest('.btn-remove-line');
      if(rm&&!rm.disabled){
        createLines.splice(+rm.dataset.idx,1);
        if(!createLines.length)createLines.push({ productId: '', qty: 1 });
        renderCreateLines();
      }
    });
  }

  var saveBtn=document.getElementById('btn-save-order');
  if(saveBtn)saveBtn.addEventListener('click',saveNewOrder);

  ['customer', 'phone', 'email'].forEach(function(fieldName) {
      var el = document.querySelector('#order-create-form [name="'+fieldName+'"]');
      if(el) {
          el.addEventListener('change', function(e) {
              autofillCustomerInfo(e.target.value.trim());
          });
      }
  });
}

// ── Register Global SignalR Notification Listener ──
window.onAdminNotification = function(eventType, message) {
  if (eventType === 'OrderPlaced' || eventType === 'OrderStatusChanged' || eventType === 'OrderDeleted' || eventType === 'FallbackPoll') {
    AdminData.orders.load().then(function(newOrders) {
      orders = newOrders;
      renderStatusTabs();
      renderTable();
      AdminData.orders.updatePendingBadge(orders);
    });
  }
};

document.addEventListener('DOMContentLoaded',init);
}());

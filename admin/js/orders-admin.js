// orders-admin.js
(function(){'use strict';
if(!document.getElementById('orders-table-body'))return;

var orders, products=[], customers=[], searchQ='', filterStatus='all', currentPage=1, pageSize=10;
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
  return orders.filter(function(o){
    var q=searchQ.toLowerCase();
    var matchQ=!q||o.id.toLowerCase().includes(q)||o.customer.toLowerCase().includes(q)||o.phone.includes(q);
    var matchS=filterStatus==='all'||o.status===filterStatus;
    return matchQ&&matchS;
  });
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
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-approve" data-id="'+o.id+'" style="margin-right:4px;" title="Duyệt đơn nhanh">✓</button>' + actionBtn;
      }

      return '<tr>'+
        '<td class="stt-cell">'+stt+'</td>'+
        '<td><span class="order-id-badge">#'+o.id+'</span></td>'+
        '<td>'+customerHtml+'</td>'+
        '<td class="hide-mobile">'+itemsStackHtml+'</td>'+
        '<td><strong>'+AdminData.fmt(o.total)+'</strong></td>'+
        '<td class="hide-mobile">'+o.date+'</td>'+
        '<td><span class="badge '+AdminData.getStatusBadge(o.status)+'">'+AdminData.getStatusLabel(o.status)+'</span></td>'+
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
  if(dateEl) dateEl.textContent = 'Ngày đặt: ' + o.date;
  document.getElementById('order-detail-status').innerHTML='<span class="badge '+AdminData.getStatusBadge(o.status)+'" style="font-size:14px;padding:6px 12px;">'+AdminData.getStatusLabel(o.status)+'</span>';
  
  document.getElementById('order-detail-customer').innerHTML=
    '<div class="stat-row"><div class="stat-row__label">Khách hàng</div><div class="stat-row__value" style="font-weight:600;color:var(--text-primary)">'+o.customer+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Điện thoại</div><div class="stat-row__value">'+o.phone+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Email</div><div class="stat-row__value">'+(o.email||'—')+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Địa chỉ</div><div class="stat-row__value">'+o.address+'</div></div>'+
    (o.note?'<div class="stat-row"><div class="stat-row__label">Ghi chú</div><div class="stat-row__value" style="color:var(--accent)">'+o.note+'</div></div>':'');
  
  var itemsHtml='<div class="order-lines">';
  o.items.forEach(function(i){
    var imgHtml = i.imageUrl ? '<img src="'+i.imageUrl+'" class="zoomable" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;border:1px solid var(--border);">' : '<div style="width:40px;height:40px;background:var(--surface-100);border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-muted)">IMG</div>';
    itemsHtml += '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px dashed var(--border);">' +
      imgHtml +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:500;font-size:14px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'+i.name+'</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Số lượng: '+i.qty+' &times; '+AdminData.fmt(i.price)+'</div>' +
      '</div>' +
      '<div style="font-weight:600;font-size:14px;color:var(--accent);text-align:right;white-space:nowrap;margin-left:8px;">'+AdminData.fmt(i.price*i.qty)+'</div>' +
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
    note: note || null,
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

function bindEvents(){
  var search=document.getElementById('order-search');
  if(search)search.addEventListener('input',function(){searchQ=search.value;currentPage=1;renderTable();});

  var pageSizeSel=document.getElementById('page-size-select');
  if(pageSizeSel)pageSizeSel.addEventListener('change',function(){
    pageSize=parseInt(this.value,10)||10;
    currentPage=1;
    renderTable();
  });

  document.getElementById('orders-table-body').addEventListener('click',function(e){
    var viewBtn=e.target.closest('.btn-view-order');
    if(viewBtn)viewOrder(viewBtn.dataset.id);
    
    var approveBtn=e.target.closest('.btn-quick-approve');
    if(approveBtn)updateOrderStatus(approveBtn.dataset.id, 'confirmed');
  });

  var detailSel=document.getElementById('order-detail-status-select');
  var confirmBtn=document.getElementById('btn-confirm-status');
  if(confirmBtn&&detailSel){
    confirmBtn.addEventListener('click',function(){
      updateOrderStatus(detailSel.dataset.id,detailSel.value);
      closeModal('orderDetailModal');
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

document.addEventListener('DOMContentLoaded',init);
}());

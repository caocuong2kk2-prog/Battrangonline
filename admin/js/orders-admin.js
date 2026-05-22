// orders-admin.js
(function(){'use strict';
if(!document.getElementById('orders-table-body'))return;

var orders, products=[], searchQ='', filterStatus='all', currentPage=1, pageSize=10;
var createLines=[{ productId: '', qty: 1 }];

function init(){
  Promise.all([AdminData.orders.load(), AdminData.products.load()]).then(function(res){
    orders=res[0];
    products=(res[1]||[]).filter(function(p){return p.status==='active';});
    renderStatusTabs();
    renderTable();
    bindEvents();
    AdminData.orders.updatePendingBadge(orders);
  }).catch(function(){
    adminToast('Không tải được dữ liệu đơn hàng','error');
  });
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
    tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="empty-state__icon">🛒</div><div class="empty-state__title">Không có đơn hàng</div></div></td></tr>';
  }else{
    tbody.innerHTML=slice.map(function(o){
      var items=o.items.map(function(i){return i.name+'(x'+i.qty+')';}).join(', ');
      return '<tr>'+
        '<td><strong style="color:var(--accent)">'+o.id+'</strong></td>'+
        '<td><div style="font-weight:600">'+o.customer+'</div><div style="font-size:var(--fs-xs);color:var(--text-muted)">'+o.phone+'</div></td>'+
        '<td class="hide-mobile"><div style="font-size:var(--fs-xs);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+items+'</div></td>'+
        '<td><strong>'+AdminData.fmt(o.total)+'</strong></td>'+
        '<td class="hide-mobile">'+o.date+'</td>'+
        '<td><span class="badge '+AdminData.getStatusBadge(o.status)+'">'+AdminData.getStatusLabel(o.status)+'</span></td>'+
        '<td class="actions-cell">'+
          '<button class="btn btn--sm btn--secondary btn-view-order" data-id="'+o.id+'">Xem</button>'+
          '<select class="filter-select btn-status-change" data-id="'+o.id+'" style="padding:5px 8px;font-size:var(--fs-xs)">'+
            '<option value="">Cập nhật</option>'+
            '<option value="pending">Chờ XN</option>'+
            '<option value="confirmed">Xác nhận</option>'+
            '<option value="shipping">Giao hàng</option>'+
            '<option value="completed">Hoàn thành</option>'+
            '<option value="cancelled">Huỷ</option>'+
          '</select>'+
        '</td>'+
      '</tr>';
    }).join('');
  }
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
  document.getElementById('order-detail-status').innerHTML='<span class="badge '+AdminData.getStatusBadge(o.status)+'">'+AdminData.getStatusLabel(o.status)+'</span>';
  document.getElementById('order-detail-customer').innerHTML=
    '<div class="stat-row"><div class="stat-row__label">Khách hàng</div><div class="stat-row__value">'+o.customer+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Điện thoại</div><div class="stat-row__value">'+o.phone+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Email</div><div class="stat-row__value">'+o.email+'</div></div>'+
    '<div class="stat-row"><div class="stat-row__label">Địa chỉ</div><div class="stat-row__value">'+o.address+'</div></div>'+
    (o.note?'<div class="stat-row"><div class="stat-row__label">Ghi chú</div><div class="stat-row__value">'+o.note+'</div></div>':'');
  var itemsHtml=o.items.map(function(i){
    var imgHtml = i.imageUrl ? '<img src="'+i.imageUrl+'" class="zoomable" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:12px;cursor:pointer;">' : '<div style="width:40px;height:40px;background:#f5f5f5;border-radius:4px;margin-right:12px;display:flex;align-items:center;justify-content:center;font-size:16px;">🏺</div>';
    return '<div class="stat-row" style="align-items:center;"><div class="stat-row__label" style="display:flex;align-items:center;">'+imgHtml+'<span>'+i.name+' x'+i.qty+'</span></div><div class="stat-row__value">'+AdminData.fmt(i.price*i.qty)+'</div></div>';
  }).join('');
  itemsHtml+='<div class="order-total-row"><div class="order-total-row__label">Tổng cộng</div><div class="order-total-row__value">'+AdminData.fmt(o.total)+'</div></div>';
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

  var items=createLines
    .filter(function(line){return line.productId&&line.qty>0;})
    .map(function(line){return { id: parseInt(line.productId,10), qty: parseInt(line.qty,10)||1 }; });

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

function bindEvents(){
  var search=document.getElementById('order-search');
  if(search)search.addEventListener('input',function(){searchQ=search.value;currentPage=1;renderTable();});

  document.getElementById('orders-table-body').addEventListener('click',function(e){
    var viewBtn=e.target.closest('.btn-view-order');
    if(viewBtn)viewOrder(viewBtn.dataset.id);
  });
  document.getElementById('orders-table-body').addEventListener('change',function(e){
    var sel=e.target.closest('.btn-status-change');
    if(sel&&sel.value)updateOrderStatus(sel.dataset.id,sel.value);
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
    linesWrap.addEventListener('change',function(e){
      var prodSel=e.target.closest('.order-line-product');
      var qtyInp=e.target.closest('.order-line-qty');
      if(prodSel){
        createLines[+prodSel.dataset.idx].productId=prodSel.value;
        renderCreateLines();
      }
      if(qtyInp){
        createLines[+qtyInp.dataset.idx].qty=Math.max(1,parseInt(qtyInp.value,10)||1);
        renderCreateLines();
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
}

document.addEventListener('DOMContentLoaded',init);
}());

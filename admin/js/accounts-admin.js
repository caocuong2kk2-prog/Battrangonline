(function(){'use strict';

var session = getAdminSession();
if (!session || session.role !== 'admin') {
  window.location.href = 'index.html';
}

var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5080' ? 'http://localhost:5080/api' : '/api';
var API_URL = dynamicBase + '/adminaccounts';
var accounts = [];

function fetchAccounts(){
  var session = getAdminSession();
  var token = session ? session.token : '';
  return fetch(API_URL, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res){
    if(!res.ok) throw new Error('Không thể tải danh sách tài khoản');
    return res.json();
  });
}

function renderTable(){
  var tbody = document.getElementById('accounts-table-body');
  if(!tbody) return;
  
  if(accounts.length === 0){
    tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:2rem;color:var(--text-muted)">Không có dữ liệu tài khoản</td></tr>';
    return;
  }
  
  var role = getAdminSession()?.role || 'staff';
  var isAdmin = role === 'admin';

  tbody.innerHTML = accounts.map(function(acc){
    var roleBadge = acc.role === 'admin' 
      ? '<span style="color:var(--accent);font-weight:600;background:rgba(200,146,42,0.1);padding:2px 8px;border-radius:4px;font-size:12px;">Admin</span>' 
      : '<span style="color:var(--text-muted);font-weight:500;background:var(--surface-100);padding:2px 8px;border-radius:4px;font-size:12px;">Nhân viên</span>';
      
    var actions = '';
    if(isAdmin){
      actions = '<td class="actions-cell">'+
        '<button class="btn btn--sm btn--secondary btn-edit" data-id="'+acc.id+'" style="margin-right:4px">Sửa</button>'+
        '<button class="btn btn--sm btn--danger btn-delete" data-id="'+acc.id+'" title="Xóa">Xóa</button>'+
      '</td>';
    } else {
      actions = '<td><span class="text-muted" style="font-size:12px">Không có quyền</span></td>';
    }

    return '<tr>'+
      '<td class="stt-cell">#'+acc.id+'</td>'+
      '<td><strong>'+escapeHTML(acc.name)+'</strong></td>'+
      '<td>'+escapeHTML(acc.username)+'</td>'+
      '<td>'+roleBadge+'</td>'+
      actions+
    '</tr>';
  }).join('');
}

function loadData(){
  var tableWrap = document.querySelector('.table-wrap');
  if(tableWrap) tableWrap.classList.add('loading');
  fetchAccounts()
    .then(function(data){
      accounts = data;
      renderTable();
      if(tableWrap) tableWrap.classList.remove('loading');
    })
    .catch(function(err){
      adminToast(err.message, 'error');
      if(tableWrap) tableWrap.classList.remove('loading');
    });
}

// ── Modal logic ──
var form = document.getElementById('accountForm');
var btnAdd = document.getElementById('btn-add-account');
var btnSave = document.getElementById('btn-save-account');
var btnCancel = document.getElementById('btn-cancel-account');
var modalClose = document.getElementById('accountModalClose');

function openAccModal(isEdit, data) {
  var title = document.getElementById('accountModalTitle');
  title.textContent = isEdit ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản Mới';
  
  document.getElementById('acc-id').value = data ? data.id : '';
  document.getElementById('acc-name').value = data ? data.name : '';
  document.getElementById('acc-username').value = data ? data.username : '';
  document.getElementById('acc-password').value = '';
  document.getElementById('acc-role').value = data ? data.role : 'staff';
  
  var hint = document.getElementById('acc-pass-hint');
  var passLabel = document.getElementById('acc-pass-label');
  if(isEdit) {
    hint.style.display = 'block';
    passLabel.classList.remove('required');
    document.getElementById('acc-password').removeAttribute('required');
  } else {
    hint.style.display = 'none';
    passLabel.classList.add('required');
    document.getElementById('acc-password').setAttribute('required', 'true');
  }
  
  openModal('accountModal');
}

if(btnAdd) btnAdd.addEventListener('click', function(){ openAccModal(false); });
if(btnCancel) btnCancel.addEventListener('click', function(){ closeModal('accountModal'); });
if(modalClose) modalClose.addEventListener('click', function(){ closeModal('accountModal'); });

if(btnSave) {
  btnSave.addEventListener('click', function(){
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }
    
    var id = document.getElementById('acc-id').value;
    var isEdit = !!id;
    var payload = {
      name: document.getElementById('acc-name').value.trim(),
      username: document.getElementById('acc-username').value.trim(),
      role: document.getElementById('acc-role').value
    };
    
    var pass = document.getElementById('acc-password').value;
    if(pass) {
      payload.password = pass;
    } else if(!isEdit) {
      adminToast('Vui lòng nhập mật khẩu', 'error');
      return;
    }
    
    btnSave.disabled = true;
    btnSave.textContent = 'Đang lưu...';
    
    var url = API_URL + (isEdit ? '/' + id : '');
    var method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (getAdminSession()?.token || '')
      },
      body: JSON.stringify(payload)
    })
    .then(function(res){
      if(!res.ok) {
        return res.json().catch(function(){ return {}; }).then(function(err){
          throw new Error(err.message || 'Lỗi khi lưu tài khoản');
        });
      }
      return res.json();
    })
    .then(function(data){
      adminToast(isEdit ? 'Cập nhật tài khoản thành công' : 'Thêm tài khoản thành công', 'success');
      closeModal('accountModal');
      loadData();
    })
    .catch(function(err){
      adminToast(err.message, 'error');
    })
    .finally(function(){
      btnSave.disabled = false;
      btnSave.textContent = 'Lưu Tài Khoản';
    });
  });
}

// ── Event delegation for Edit/Delete ──
document.getElementById('accounts-table-body')?.addEventListener('click', function(e){
  var btnEdit = e.target.closest('.btn-edit');
  var btnDel = e.target.closest('.btn-delete');
  
  if(btnEdit){
    var id = parseInt(btnEdit.getAttribute('data-id'), 10);
    var acc = accounts.find(function(a){ return a.id === id; });
    if(acc) openAccModal(true, acc);
  }
  else if(btnDel){
    var id = parseInt(btnDel.getAttribute('data-id'), 10);
    adminConfirm('Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này không thể hoàn tác.', function(){
      fetch(API_URL + '/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + (getAdminSession()?.token || '') }
      })
      .then(function(res){
        if(!res.ok) {
          return res.json().catch(function(){ return {}; }).then(function(err){
            throw new Error(err.message || 'Lỗi khi xóa tài khoản');
          });
        }
        adminToast('Đã xóa tài khoản', 'success');
        loadData();
      })
      .catch(function(err){
        adminToast(err.message, 'error');
      });
    });
  }
});

// Init
document.addEventListener('DOMContentLoaded', function(){
  loadData();
});

})();

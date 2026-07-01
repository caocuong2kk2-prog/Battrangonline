(function () {
  'use strict';

  var session = getAdminSession();
  if (!session || session.role !== 'admin') {
    window.location.href = "index.html";
  }

  var dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055' && window.location.port !== '7275' ? 'http://localhost:5055/api' : '/api';
  var API_URL = dynamicBase + '/adminaccounts';
  var accounts = [];

  function fetchAccounts() {
    var session = getAdminSession();
    var token = session ? session.token : '';
    return fetch(API_URL, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Không thể tải danh sách tài khoản');
        return res.json();
      });
  }

  function renderTable() {
    var tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;

    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:2rem;color:var(--text-muted)">Không có dữ liệu tài khoản</td></tr>';
      return;
    }

    var session = getAdminSession();
    var role = session?.role || 'staff';
    var isAdmin = role === 'admin';
    var totalAdmins = accounts.filter(function(a) { return (a.role || '').toLowerCase() === 'admin'; }).length;

    tbody.innerHTML = accounts.map(function (acc) {
      var isAccAdmin = (acc.role || '').toLowerCase() === 'admin';
      var roleBadge = isAccAdmin
        ? '<span style="color:var(--accent);font-weight:600;background:rgba(200,146,42,0.1);padding:2px 8px;border-radius:4px;font-size:12px;">Admin</span>'
        : '<span style="color:var(--text-muted);font-weight:500;background:var(--surface-100);padding:2px 8px;border-radius:4px;font-size:12px;">Nhân viên</span>';

      var actions = '';
      if (isAdmin) {
        var isSelf = session && session.username && acc.username && (session.username.toLowerCase() === acc.username.toLowerCase());
        var isLastAdmin = (acc.role === 'admin' && totalAdmins <= 1);
        var deleteBtn = '';
        if (isSelf) {
          deleteBtn = '<button class="btn btn--sm btn--secondary" disabled title="Bạn đang đăng nhập tài khoản này">Đang dùng</button>';
        } else if (isLastAdmin) {
          deleteBtn = '<button class="btn btn--sm btn--secondary" disabled title="Không thể xóa tài khoản Admin cuối cùng">Khóa xóa</button>';
        } else {
          deleteBtn = '<button class="btn btn--sm btn--danger btn-delete" data-id="' + acc.id + '" title="Xóa">Xóa</button>';
        }

        actions = '<td class="actions-cell">' +
          '<button class="btn btn--sm btn--secondary btn-edit" data-id="' + acc.id + '" style="margin-right:4px">Sửa</button>' +
          deleteBtn +
          '</td>';
      } else {
        actions = '<td><span class="text-muted" style="font-size:12px">Không có quyền</span></td>';
      }

      return '<tr>' +
        '<td class="stt-cell">#' + acc.id + '</td>' +
        '<td><strong>' + escapeHTML(acc.name) + '</strong></td>' +
        '<td>' + escapeHTML(acc.username) + '</td>' +
        '<td>' + roleBadge + '</td>' +
        actions +
        '</tr>';
    }).join('');
  }

  function loadData() {
    var tableWrap = document.querySelector('.table-wrap');
    if (tableWrap) tableWrap.classList.add('loading');
    fetchAccounts()
      .then(function (data) {
        accounts = data;
        renderTable();
        if (tableWrap) tableWrap.classList.remove('loading');
      })
      .catch(function (err) {
        adminToast(err.message, 'error');
        if (tableWrap) tableWrap.classList.remove('loading');
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

    clearInlineErrors('accountForm');
    document.getElementById('acc-id').value = data ? data.id : '';
    document.getElementById('acc-name').value = data ? data.name : '';
    document.getElementById('acc-username').value = data ? data.username : '';
    document.getElementById('acc-password').value = '';
    var roleVal = (data && data.role) ? String(data.role).toLowerCase().trim() : 'staff';
    var isAdminRole = roleVal === 'admin' || roleVal === 'quản trị viên' || roleVal.indexOf('admin') !== -1;
    var roleSel = document.getElementById('acc-role');
    if (roleSel) {
      roleSel.value = isAdminRole ? 'admin' : 'staff';
      roleSel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    var hint = document.getElementById('acc-pass-hint');
    var passLabel = document.getElementById('acc-pass-label');
    if (isEdit) {
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

  if (btnAdd) btnAdd.addEventListener('click', function () { openAccModal(false); });
  if (btnCancel) btnCancel.addEventListener('click', function () { closeModal('accountModal'); });
  if (modalClose) modalClose.addEventListener('click', function () { closeModal('accountModal'); });

  if (btnSave) {
    btnSave.addEventListener('click', function () {
      var id = document.getElementById('acc-id').value;
      var isEdit = !!id;
      var payload = {
        name: document.getElementById('acc-name').value.trim(),
        username: document.getElementById('acc-username').value.trim(),
        role: document.getElementById('acc-role').value
      };

      clearInlineErrors(form);
      var hasError = false;

      if (!payload.name) {
        setInlineError('acc-name', 'Vui lòng nhập tên hiển thị');
        hasError = true;
      }
      if (!payload.username) {
        setInlineError('acc-username', 'Vui lòng nhập tên đăng nhập');
        hasError = true;
      } else {
        // Check trùng username phía Frontend
        var usernameLower = payload.username.toLowerCase();
        var duplicateUser = accounts.find(function (a) {
          if (isEdit && String(a.id) === String(id)) return false;
          return (a.username || '').toLowerCase() === usernameLower;
        });
        if (duplicateUser) {
          setInlineError('acc-username', 'Tên đăng nhập "' + payload.username + '" đã được sử dụng!');
          hasError = true;
        }
      }

      var pass = document.getElementById('acc-password').value;
      if (pass) {
        payload.password = pass;
      } else if (!isEdit) {
        setInlineError('acc-password', 'Vui lòng nhập mật khẩu');
        hasError = true;
      }

      if (hasError) {
        var firstErr = form.querySelector('.is-invalid');
        if (firstErr) firstErr.focus();
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
        .then(function (res) {
          if (!res.ok) {
            return res.json().catch(function () { return {}; }).then(function (err) {
              throw new Error(err.message || 'Lỗi khi lưu tài khoản');
            });
          }
          return res.json();
        })
        .then(function (data) {
          adminToast(isEdit ? 'Cập nhật tài khoản thành công' : 'Thêm tài khoản thành công', 'success');
          closeModal('accountModal');
          loadData();
        })
        .catch(function (err) {
          var msg = err.message || 'Lỗi khi lưu tài khoản';
          adminToast(msg, 'error');
          if (msg.indexOf('tài khoản') !== -1 || msg.indexOf('Username') !== -1 || msg.indexOf('đã được sử dụng') !== -1) {
            setInlineError('acc-username', msg);
            var inp = document.getElementById('acc-username');
            if (inp) inp.focus();
          }
        })
        .finally(function () {
          btnSave.disabled = false;
          btnSave.textContent = 'Lưu Tài Khoản';
        });
    });
  }

  // ── Event delegation for Edit/Delete ──
  document.getElementById('accounts-table-body')?.addEventListener('click', function (e) {
    var btnEdit = e.target.closest('.btn-edit');
    var btnDel = e.target.closest('.btn-delete');

    if (btnEdit) {
      var id = parseInt(btnEdit.getAttribute('data-id'), 10);
      var acc = accounts.find(function (a) { return a.id === id; });
      if (acc) openAccModal(true, acc);
    }
    else if (btnDel) {
      var id = parseInt(btnDel.getAttribute('data-id'), 10);
      adminConfirm('Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này không thể hoàn tác.', function () {
        fetch(API_URL + '/' + id, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + (getAdminSession()?.token || '') }
        })
          .then(function (res) {
            if (!res.ok) {
              return res.json().catch(function () { return {}; }).then(function (err) {
                throw new Error(err.message || 'Lỗi khi xóa tài khoản');
              });
            }
            adminToast('Đã xóa tài khoản', 'success');
            loadData();
          })
          .catch(function (err) {
            adminToast(err.message, 'error');
          });
      });
    }
  });

  // Real-time active validation for Account Form
  document.getElementById('accountForm')?.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.classList.contains('is-invalid')) return;

    var id = el.id;
    var val = el.value.trim();
    var isValid = true;
    var errorMsg = '';

    if (id === 'acc-name') {
      if (!val) {
        errorMsg = 'Vui lòng nhập tên hiển thị';
        isValid = false;
      }
    } else if (id === 'acc-username') {
      if (!val) {
        errorMsg = 'Vui lòng nhập tên đăng nhập';
        isValid = false;
      }
    } else if (id === 'acc-password') {
      var isEdit = !!document.getElementById('acc-id').value;
      if (!val && !isEdit) {
        errorMsg = 'Vui lòng nhập mật khẩu';
        isValid = false;
      }
    }

    if (isValid) {
      el.classList.remove('is-invalid');
      var sibling = el.nextElementSibling;
      if (sibling && sibling.classList.contains('form-error')) {
        sibling.remove();
      }
    } else {
      var sibling = el.nextElementSibling;
      if (sibling && sibling.classList.contains('form-error')) {
        sibling.textContent = errorMsg;
      }
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', function () {
    loadData();
  });

})();

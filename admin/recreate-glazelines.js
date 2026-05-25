const fs = require('fs');
const path = require('path');
const basePath = 'H:/WORK/Battrangonline/admin';

// Read fresh categories.html
let html = fs.readFileSync(path.join(basePath, 'categories.html'), 'utf8');

// Replacements to morph categories.html into glazelines.html
html = html.replace(/Danh Mục – Phúc Gia Tiên Admin/g, 'Dòng Men – Phúc Gia Tiên Admin');
html = html.replace(/<span class="topbar-breadcrumb__current">Danh mục<\/span>/g, '<span class="topbar-breadcrumb__current">Dòng men</span>');
html = html.replace(/<h1 class="page-title">Danh Mục Sản Phẩm<\/h1>/g, '<h1 class="page-title">Dòng Men Sản Phẩm</h1>');
html = html.replace(/<p class="page-subtitle">Quản lý các danh mục<\/p>/g, '<p class="page-subtitle">Quản lý các loại dòng men</p>');
html = html.replace(/<button class="btn btn--primary" id="btn-add-cat">[^<]*Thêm danh mục<\/button>/g, '<button class="btn btn--primary" id="btn-add-gl">➕ Thêm dòng men</button>');
html = html.replace(/<tbody id="categories-table-body"><\/tbody>/g, '<tbody id="gl-table-body"></tbody>');

// Table headers
html = html.replace(/<thead><tr><th>Tên danh mục<\/th><th>Icon<\/th><th>Mô tả<\/th><th>Đường dẫn \(Slug\)<\/th><th>Hành động<\/th><\/tr><\/thead>/g, 
'<thead><tr><th>Tên dòng men</th><th>Mô tả</th><th>Hành động</th></tr></thead>');

// Modal
html = html.replace(/id="catModal"/g, 'id="glModal"');
html = html.replace(/id="cat-modal-title"/g, 'id="gl-modal-title"');
html = html.replace(/id="cat-form"/g, 'id="gl-form"');
html = html.replace(/>Thêm Danh Mục</g, '>Thêm Dòng Men<');
html = html.replace(/data-close-modal="catModal"/g, 'data-close-modal="glModal"');

// Form fields - replace entirely
const newForm = `        <div class="form-group">
          <label class="form-label">Tên dòng men <span style="color:var(--danger)">*</span></label>
          <input class="form-control" name="name" type="text" placeholder="VD: Men rạn, Men ngọc...">
        </div>
        <div class="form-group">
          <label class="form-label">Mô tả</label>
          <textarea class="form-control" name="desc" rows="3" placeholder="Mô tả ngắn về dòng men..."></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn--secondary" data-close-modal="glModal">Huỷ</button>
          <button type="button" class="btn btn--primary" id="btn-save-gl">💾 Lưu dòng men</button>
        </div>`;
html = html.replace(/<div class="form-group">[\s\S]*?<\/div>\s*<div class="modal-footer">[\s\S]*?<\/div>/, newForm);

// Script logic
const newScript = `<script>
    document.addEventListener('DOMContentLoaded', function () {
      if (!window.AdminData) return;
      var gls = [], editId = null;

      function renderGls() {
        var tb = document.getElementById('gl-table-body');
        tb.innerHTML = '';
        if (!gls.length) {
          tb.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">Chưa có dòng men nào.</td></tr>';
          return;
        }
        gls.forEach(function (c) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td><strong>' + c.name + '</strong></td>' +
            '<td>' + (c.description || '') + '</td>' +
            '<td><div class="action-btns"><button class="btn-icon btn-icon--edit" onclick="editGl(' + c.id + ')" title="Sửa">✏️</button><button class="btn-icon btn-icon--delete" onclick="deleteGl(' + c.id + ')" title="Xoá">🗑️</button></div></td>';
          tb.appendChild(tr);
        });
      }

      function loadGls() {
        AdminData.glazeLines.load().then(function (data) {
          gls = data;
          renderGls();
        }).catch(function (e) {
          console.error(e);
          adminToast('Không thể tải dòng men', 'error');
        });
      }

      window.editGl = function (id) {
        var c = gls.find(function (x) { return x.id === id; });
        if (!c) return;
        editId = id;
        document.getElementById('gl-modal-title').textContent = 'Chỉnh Sửa Dòng Men';
        var f = document.getElementById('gl-form');
        f.querySelector('[name="name"]').value = c.name;
        f.querySelector('[name="desc"]').value = c.description || '';
        openModal('glModal');
      }

      function saveGl() {
        var f = document.getElementById('gl-form');
        var name = f.querySelector('[name="name"]').value.trim();
        if (!name) { adminToast('Vui lòng điền tên dòng men!', 'error'); return; }

        var data = { name: name, description: f.querySelector('[name="desc"]').value.trim() };
        if (editId !== null) data.id = editId;

        AdminData.glazeLines.save(data).then(function () {
          adminToast(editId ? 'Cập nhật thành công!' : 'Thêm thành công!', 'success');
          return AdminData.glazeLines.load();
        }).then(function (newData) {
          gls = newData;
          closeModal('glModal');
          renderGls();
        }).catch(function (e) {
          console.error(e);
          adminToast('Có lỗi xảy ra', 'error');
        });
      }

      window.deleteGl = function (id) {
        adminConfirm('Xoá dòng men này?', function () {
          AdminData.glazeLines.delete(id).then(function () {
            adminToast('Đã xoá', 'success');
            loadGls();
          }).catch(function (e) {
            console.error(e);
            adminToast('Có lỗi xảy ra', 'error');
          });
        });
      }

      if (document.getElementById('btn-add-gl')) {
        document.getElementById('btn-add-gl').addEventListener('click', function () {
          editId = null;
          document.getElementById('gl-modal-title').textContent = 'Thêm Dòng Men';
          document.getElementById('gl-form').reset();
          openModal('glModal');
        });
      }

      if (document.getElementById('btn-save-gl')) {
        document.getElementById('btn-save-gl').addEventListener('click', saveGl);
      }

      loadGls();
    });
  </script>`;

html = html.replace(/<script>\s*document\.addEventListener\('DOMContentLoaded'[\s\S]*?<\/script>/, newScript);

fs.writeFileSync(path.join(basePath, 'glazelines.html'), html, 'utf8');
console.log('Recreated glazelines.html');

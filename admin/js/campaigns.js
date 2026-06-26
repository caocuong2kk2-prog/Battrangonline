(function () {
    'use strict';

    var isLiveServer = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && (window.location.port !== '5055' && window.location.port !== '7275');
    var API_BASE = (isLiveServer ? 'http://localhost:5055' : '') + '/api/admin';
    var PUBLIC_API_BASE = (isLiveServer ? 'http://localhost:5055' : '') + '/api';

    function getImgUrl(url) {
        if (!url) return '/assets/images/placeholder.jpg';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/assets')) return url;
        var base = isLiveServer ? 'http://localhost:5055/' : '/';
        return base + (url.startsWith('/') ? url.substring(1) : url);
    }

    var campaigns = [];
    var editId = null;
    var selectedProducts = [];
    var searchTimeout = null;
    var categoryList = [];

    // Fetch categories for bulk selection
    fetch(PUBLIC_API_BASE + '/categories').then(function(res) { return res.json(); }).then(function(data) {
        categoryList = data || [];
        var catList = document.getElementById('bulk-cat-list');
        if (catList) {
            var html = '';
            categoryList.forEach(function(c) {
                html += '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" class="bulk-cat-item bulk-cat-parent" value="' + c.id + '" data-id="' + c.id + '"> 📦 ' + window.escapeHTML(c.name) + '</label>';
                if(c.subCategories) {
                    c.subCategories.forEach(function(sub) {
                        html += '<label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-left: 20px;"><input type="checkbox" class="bulk-cat-item bulk-cat-child" value="' + sub.id + '" data-parent="' + c.id + '"> ↳ ' + window.escapeHTML(sub.name) + '</label>';
                    });
                }
            });
            catList.innerHTML = html;
        }
    }).catch(function(e){ console.error('Error fetching categories:', e); });

    function _fetch(endpoint, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/json';
        
        var sess = window.getAdminSession();
        if (sess && sess.token) {
            options.headers['Authorization'] = 'Bearer ' + sess.token;
        }

        return fetch(API_BASE + endpoint, options).then(function (res) {
            if (res.status === 401) {
                window.adminLogout();
                throw new Error('Unauthorized');
            }
            if (!res.ok) {
                return res.text().then(function(txt) {
                    var msg = txt;
                    try { var err = JSON.parse(txt); msg = err.message || txt; } catch(e){}
                    throw new Error(msg || res.statusText);
                });
            }
            if (res.status === 204) return null;
            return res.json();
        });
    }

    // ── Data Loading ──
    function loadCampaigns() {
        var tbody = document.getElementById('campaigns-table-body');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--sp-8);color:var(--text-muted)">Đang tải dữ liệu...</td></tr>';
        
        _fetch('/campaigns')
            .then(function(data) {
                campaigns = data || [];
                renderTable();
            })
            .catch(function(err) {
                console.error(err);
                if (window.adminToast) adminToast('Lỗi tải danh sách chiến dịch', 'error');
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--sp-8);color:var(--danger)">Lỗi tải dữ liệu.</td></tr>';
            });
    }

    function renderTable() {
        var tbody = document.getElementById('campaigns-table-body');
        if (campaigns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--sp-8);color:var(--text-muted)">Chưa có chiến dịch nào</td></tr>';
            return;
        }

        var now = new Date();
        var html = '';

        campaigns.forEach(function(c) {
            var start = new Date(c.startDate);
            var end = new Date(c.endDate);
            var statusHtml = '';
            
            var statusLabel = '';
            if (c.status !== 'active') {
                statusLabel = '<span class="badge badge--secondary">Tạm dừng</span>';
            } else if (now < start) {
                statusLabel = '<span class="badge" style="background:#f59e0b;color:#fff">Sắp diễn ra</span>';
            } else if (now > end) {
                statusLabel = '<span class="badge badge--danger">Đã kết thúc</span>';
            } else {
                statusLabel = '<span class="badge badge--success">Đang diễn ra</span>';
            }

            var toggleHtml = '<div style="display:flex; align-items:center; gap:8px;">' +
                             '<label class="toggle-switch" style="margin:0" title="Bật/Tắt nhanh">' +
                             '<input type="checkbox" class="toggle-campaign-status" data-id="' + c.id + '" ' + (c.status === 'active' ? 'checked' : '') + '>' +
                             '<span class="toggle-slider"></span>' +
                             '</label>' +
                             statusLabel +
                             '</div>';

            var productCount = c.productIds ? c.productIds.length : 0;

            var imgHtml = c.bannerImage 
                ? '<img src="' + getImgUrl(c.bannerImage) + '" onclick="showImagePreview(\'' + getImgUrl(c.bannerImage) + '\')" style="width:120px;height:auto;object-fit:contain;border-radius:6px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
                : '<div style="width:120px;height:50px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:1.2rem;margin: 0 auto;">🖼️</div>';

            html += '<tr>' +
                '<td class="stt-cell">' + c.id + '</td>' +
                '<td style="text-align: center;">' + imgHtml + '</td>' +
                '<td><div style="font-weight:600">' + escapeHTML(c.name) + '</div><div style="font-size:0.8rem;color:var(--text-muted)">' + productCount + ' sản phẩm</div></td>' +
                '<td><span style="color:var(--danger);font-weight:bold">-' + c.discountPercent + '%</span></td>' +
                '<td>' +
                    '<div style="font-size:0.85rem">Bắt đầu: ' + start.toLocaleString('vi-VN') + '</div>' +
                    '<div style="font-size:0.85rem">Kết thúc: ' + end.toLocaleString('vi-VN') + '</div>' +
                '</td>' +
                '<td>' + toggleHtml + '</td>' +
                '<td class="actions-cell">' +
                    '<button class="btn btn--sm btn--secondary btn-edit" data-id="' + c.id + '">✏️ Sửa</button>' +
                    '<button class="btn btn--sm btn--danger btn-del" data-id="' + c.id + '">🗑️</button>' +
                '</td>' +
            '</tr>';
        });

        tbody.innerHTML = html;
    }

    // ── Modal Actions ──
    function formatDTLocal(dtStr) {
        var d = new Date(dtStr);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    function openAddModal() {
        editId = null;
        document.getElementById('modal-title').textContent = 'Thêm chiến dịch mới';
        document.getElementById('campaign-form').reset();
        document.getElementById('campaign-target-url').value = '';
        document.getElementById('campaign-desc').value = '';
        document.getElementById('campaign-banner-url').value = '';
        document.getElementById('campaign-banner-preview').innerHTML = '<span style="font-size: 20px; color: #ccc;">🖼️</span>';
        document.getElementById('btn-clear-banner').style.display = 'none';
        
        selectedProducts = [];
        renderSelectedProducts();
        
        var now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('campaign-start').value = now.toISOString().slice(0, 16);
        
        var nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setMinutes(nextWeek.getMinutes() - nextWeek.getTimezoneOffset());
        document.getElementById('campaign-end').value = nextWeek.toISOString().slice(0, 16);
        
        openModal('campaignModal');
    }

    function openEditModal(id) {
        editId = id;
        document.getElementById('modal-title').textContent = 'Chỉnh sửa chiến dịch';
        document.getElementById('campaign-form').reset();
        selectedProducts = [];
        
        _fetch('/campaigns/' + id)
            .then(function(data) {
                document.getElementById('campaign-id').value = data.id;
                document.getElementById('campaign-name').value = data.name;
                document.getElementById('campaign-start').value = formatDTLocal(data.startDate);
                document.getElementById('campaign-end').value = formatDTLocal(data.endDate);
                document.getElementById('campaign-discount').value = data.discountPercent;
                document.getElementById('campaign-status').value = data.status;
                document.getElementById('campaign-target-url').value = data.targetUrl || '';
                document.getElementById('campaign-desc').value = data.description || '';
                
                var bannerUrl = data.bannerImage || '';
                document.getElementById('campaign-banner-url').value = bannerUrl;
                if (bannerUrl) {
                    var fullBannerUrl = getImgUrl(bannerUrl);
                    document.getElementById('campaign-banner-preview').innerHTML = '<img src="' + fullBannerUrl + '" onclick="showImagePreview(\'' + fullBannerUrl + '\')" style="width:100%;height:100%;object-fit:contain;cursor:pointer;">';
                    document.getElementById('btn-clear-banner').style.display = 'block';
                } else {
                    document.getElementById('campaign-banner-preview').innerHTML = '<span style="font-size: 20px; color: #ccc;">🖼️</span>';
                    document.getElementById('btn-clear-banner').style.display = 'none';
                }
                
                if (data.products && data.products.length > 0) {
                    selectedProducts = data.products.map(function(p) {
                        return { id: p.id, name: p.name, imageUrl: getImgUrl(p.imageUrl) };
                    });
                }
                renderSelectedProducts();
                openModal('campaignModal');
            })
            .catch(function(err) {
                console.error(err);
                if (window.adminToast) adminToast('Lỗi tải dữ liệu chiến dịch', 'error');
            });
    }

    function saveCampaign() {
        var f = document.getElementById('campaign-form');
        if (!f.checkValidity()) {
            f.reportValidity();
            return;
        }

        var newStatus = document.getElementById('campaign-status').value;
        if (newStatus === 'active') {
            var activeCampaign = campaigns.find(function(x) { return x.status === 'active' && x.id !== editId; });
            if (activeCampaign) {
                if (window.adminToast) adminToast('Đã có một chiến dịch đang diễn ra ("' + escapeHTML(activeCampaign.name) + '"). Vui lòng tắt chiến dịch đó trước!', 'warning');
                return;
            }
        }

        var payload = {
            name: document.getElementById('campaign-name').value.trim(),
            startDate: new Date(document.getElementById('campaign-start').value).toISOString(),
            endDate: new Date(document.getElementById('campaign-end').value).toISOString(),
            discountPercent: parseInt(document.getElementById('campaign-discount').value),
            status: document.getElementById('campaign-status').value,
            targetUrl: document.getElementById('campaign-target-url').value.trim() || null,
            description: document.getElementById('campaign-desc').value.trim() || null,
            bannerImage: document.getElementById('campaign-banner-url').value.trim() || null,
            productIds: selectedProducts.map(function(p) { return p.id; })
        };

        var method = editId ? 'PUT' : 'POST';
        var endpoint = editId ? '/campaigns/' + editId : '/campaigns';

        _fetch(endpoint, {
            method: method,
            body: JSON.stringify(payload)
        }).then(function() {
            if (window.adminToast) adminToast(editId ? 'Cập nhật thành công!' : 'Thêm thành công!', 'success');
            closeModal('campaignModal');
            loadCampaigns();
        }).catch(function(err) {
            console.error(err);
            if (window.adminToast) adminToast('Lỗi khi lưu: ' + err.message, 'error');
        });
    }

    function deleteCampaign(id) {
        var c = campaigns.find(function(x) { return x.id === id; });
        var name = c ? c.name : id;

        if (window.adminConfirm) {
            adminConfirm('Xoá chiến dịch "' + escapeHTML(name) + '"?', function() {
                _fetch('/campaigns/' + id, { method: 'DELETE' })
                    .then(function() {
                        adminToast('Đã xoá chiến dịch', 'warning');
                        loadCampaigns();
                    }).catch(function(err) {
                        adminToast('Lỗi khi xóa: ' + err.message, 'error');
                    });
            });
        }
    }

    // ── Product Selection ──
    function formatVND(value) {
        if (!value) return '0 ₫';
        return value.toLocaleString('vi-VN') + ' ₫';
    }

    window.showImagePreview = function(url) {
        document.getElementById('preview-large-img').src = url;
        openModal('imagePreviewModal');
    };

    window.loadMoreProducts = function() {
        renderSelectedProducts(selectedProducts.length); // Load all
    };

    function renderSelectedProducts(limit) {
        var countSpan = document.getElementById('selected-count');
        if (countSpan) countSpan.textContent = selectedProducts.length;

        var tbody = document.getElementById('selected-products-body');
        if (selectedProducts.length === 0) {
            tbody.innerHTML = '<tr id="empty-products-row"><td colspan="3" style="text-align: center; padding: 32px; color: var(--text-muted);"><div style="font-size: 2rem; margin-bottom: 8px;">📦</div>Chưa có sản phẩm nào được chọn</td></tr>';
            return;
        }
        
        var html = '';
        var renderLimit = limit || 50;
        var toRender = selectedProducts.slice(0, renderLimit);
        
        toRender.forEach(function(p) {
            var img = getImgUrl(p.imageUrl);
            html += '<tr style="transition: background 0.15s ease;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
                '<td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;"><img src="' + img + '" loading="lazy" onclick="showImagePreview(\'' + img + '\')" style="width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;transition:transform 0.2s;box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'"></td>' +
                '<td style="vertical-align:middle; font-size: 0.95rem; font-weight: 500; color: var(--text-main); padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">' + escapeHTML(p.name) + '</td>' +
                '<td style="vertical-align:middle; text-align:center; padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">' +
                    '<button type="button" class="btn btn-remove-product" data-id="' + p.id + '" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:6px; border-radius:4px; transition:all 0.2s;" onmouseover="this.style.color=\'#ef4444\'; this.style.background=\'#fee2e2\'" onmouseout="this.style.color=\'#94a3b8\'; this.style.background=\'transparent\'" title="Xóa">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>' +
                    '</button>' +
                '</td>' +
            '</tr>';
        });
        
        if (selectedProducts.length > renderLimit) {
            var remaining = selectedProducts.length - renderLimit;
            html += '<tr style="cursor:pointer;" onclick="loadMoreProducts()" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'none\'">' +
                '<td colspan="3" style="text-align:center; padding:12px; color:var(--accent); font-size:0.9rem; font-weight:bold;">' +
                    '⬇️ Bấm vào đây để hiển thị nốt ' + remaining + ' sản phẩm đang ẩn' +
                '</td>' +
            '</tr>';
        }
        
        tbody.innerHTML = html;
    }

    function renderSearchResults(products) {
        var container = document.getElementById('product-search-results');
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<div style="padding:10px;text-align:center;color:var(--text-muted)">Không tìm thấy sản phẩm</div>';
        } else {
            var addedCount = 0;
            products.forEach(function(p) {
                if (selectedProducts.find(function(sp) { return sp.id === p.id; })) return;
                
                var rawImg = (p.variants && p.variants.length > 0 && p.variants[0].images && p.variants[0].images.length > 0) ? p.variants[0].images[0] : null;
                var imgUrl = getImgUrl(rawImg);
                
                var item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = '<img src="' + imgUrl + '">' +
                    '<div class="info"><strong>' + escapeHTML(p.name) + '</strong><span>' + formatVND(p.basePrice) + '</span></div>';
                
                item.addEventListener('click', function() {
                    selectedProducts.push({ id: p.id, name: p.name, imageUrl: imgUrl });
                    renderSelectedProducts();
                    document.getElementById('product-search').value = '';
                    container.style.display = 'none';
                });
                
                container.appendChild(item);
                addedCount++;
            });
            
            if (addedCount === 0) {
                container.innerHTML = '<div style="padding:10px;text-align:center;color:var(--text-muted)">Các sản phẩm tìm thấy đã được thêm</div>';
            }
        }
        container.style.display = 'block';
    }

    // ── Init Events ──
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('btn-add-campaign').addEventListener('click', openAddModal);
        
        document.getElementById('btn-save').addEventListener('click', function(e) {
            e.preventDefault();
            saveCampaign();
        });

        document.getElementById('btn-cancel').addEventListener('click', function(e) {
            e.preventDefault();
            closeModal('campaignModal');
        });

        // Close icon (X)
        var closeIcon = document.getElementById('btn-close-modal');
        if (closeIcon) {
            closeIcon.addEventListener('click', function(e) {
                e.preventDefault();
                closeModal('campaignModal');
            });
        }

        // Banner Upload Logic
        var bannerInput = document.getElementById('campaign-banner-file');
        if (bannerInput) {
            bannerInput.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (!file) return;

                var formData = new FormData();
                formData.append('file', file);

                var sess = window.getAdminSession();
                fetch(PUBLIC_API_BASE + '/upload', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + (sess ? sess.token : '') },
                    body: formData
                })
                .then(function(res) {
                    if(!res.ok) throw new Error('Lỗi upload');
                    return res.json();
                })
                .then(function(data) {
                    var url = data.url || data.imageUrl || data.path;
                    var fullUrl = getImgUrl(url);
                    document.getElementById('campaign-banner-url').value = url;
                    document.getElementById('campaign-banner-preview').innerHTML = '<img src="' + fullUrl + '" onclick="showImagePreview(\'' + fullUrl + '\')" style="width:100%;height:100%;object-fit:contain;cursor:pointer;">';
                    document.getElementById('btn-clear-banner').style.display = 'block';
                    if (window.adminToast) adminToast('Tải ảnh thành công', 'success');
                })
                .catch(function(err) {
                    if (window.adminToast) adminToast('Upload lỗi: ' + err.message, 'error');
                })
                .finally(function() {
                    bannerInput.value = '';
                });
            });
        }

        var btnClearBanner = document.getElementById('btn-clear-banner');
        if (btnClearBanner) {
            btnClearBanner.addEventListener('click', function() {
                document.getElementById('campaign-banner-url').value = '';
                document.getElementById('campaign-banner-preview').innerHTML = '<span style="font-size: 20px; color: #ccc;">🖼️</span>';
                this.style.display = 'none';
            });
        }

        // Bulk Selection

        // Bulk Selection Dropdown Logic
        var bulkToggle = document.getElementById('bulk-cat-toggle');
        var bulkDropdown = document.getElementById('bulk-cat-dropdown');
        if (bulkToggle && bulkDropdown) {
            bulkToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                bulkDropdown.style.display = bulkDropdown.style.display === 'none' ? 'block' : 'none';
            });
            document.addEventListener('click', function(e) {
                if (!e.target.closest('#bulk-cat-toggle') && !e.target.closest('#bulk-cat-dropdown')) {
                    bulkDropdown.style.display = 'none';
                }
            });

            // Handle checkbox logic
            bulkDropdown.addEventListener('change', function(e) {
                if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox') return;

                var cbAll = document.getElementById('bulk-cat-all');
                var allItemCbs = document.querySelectorAll('.bulk-cat-item');

                if (e.target === cbAll) {
                    if (cbAll.checked) {
                        allItemCbs.forEach(function(cb) { cb.checked = false; });
                    }
                } else if (e.target.classList.contains('bulk-cat-item')) {
                    if (e.target.checked) cbAll.checked = false;

                    if (e.target.classList.contains('bulk-cat-parent')) {
                        var pId = e.target.dataset.id;
                        var children = document.querySelectorAll('.bulk-cat-child[data-parent="' + pId + '"]');
                        children.forEach(function(cb) { cb.checked = e.target.checked; });
                    } else if (e.target.classList.contains('bulk-cat-child')) {
                        var pId = e.target.dataset.parent;
                        var pCb = document.querySelector('.bulk-cat-parent[data-id="' + pId + '"]');
                        var children = document.querySelectorAll('.bulk-cat-child[data-parent="' + pId + '"]');
                        var allChecked = Array.from(children).every(function(cb) { return cb.checked; });
                        if (pCb) pCb.checked = allChecked;
                    }
                }

                // Update toggle label text
                var label = document.getElementById('bulk-cat-label');
                if (cbAll.checked) {
                    label.textContent = '🌟 Toàn bộ cửa hàng';
                    label.style.color = 'var(--accent)';
                    label.style.fontWeight = 'bold';
                } else {
                    var checkedItems = document.querySelectorAll('.bulk-cat-item:checked');
                    if (checkedItems.length === 0) {
                        label.textContent = '-- Chọn danh mục (có thể chọn nhiều) --';
                        label.style.color = '';
                        label.style.fontWeight = '';
                    } else if (checkedItems.length === 1) {
                        var text = checkedItems[0].parentElement.textContent.replace('📦', '').replace('↳', '').trim();
                        label.textContent = text;
                        label.style.color = 'var(--text)';
                        label.style.fontWeight = '600';
                    } else {
                        label.textContent = 'Đã chọn ' + checkedItems.length + ' danh mục';
                        label.style.color = 'var(--text)';
                        label.style.fontWeight = '600';
                    }
                }
            });
        }

        var btnBulk = document.getElementById('btn-bulk-apply');
        if (btnBulk) {
            btnBulk.addEventListener('click', function() {
                var isAll = document.getElementById('bulk-cat-all').checked;
                var checkedCats = Array.from(document.querySelectorAll('.bulk-cat-item:checked')).map(function(el) { return el.value; });
                
                if (!isAll && checkedCats.length === 0) {
                    if (window.adminToast) adminToast('Vui lòng tích chọn danh mục hoặc Toàn bộ cửa hàng', 'warning');
                    return;
                }

                var btn = this;
                var origText = btn.innerHTML;
                btn.innerHTML = 'Đang tải...';
                btn.disabled = true;

                var promises = [];
                if (isAll) {
                    promises.push(fetch(PUBLIC_API_BASE + '/products?limit=99999').then(function(r) {
                        if(!r.ok) throw new Error('API Error'); return r.json();
                    }));
                } else {
                    checkedCats.forEach(function(catId) {
                        promises.push(fetch(PUBLIC_API_BASE + '/products?limit=99999&category=' + encodeURIComponent(catId)).then(function(r) {
                            if(!r.ok) throw new Error('API Error'); return r.json();
                        }));
                    });
                }

                Promise.all(promises).then(function(results) {
                    var addedCount = 0;
                    results.forEach(function(data) {
                        var items = Array.isArray(data) ? data : (data.data || []);
                        items.forEach(function(p) {
                            if (!selectedProducts.find(function(sp) { return sp.id === p.id; })) {
                                var rawImg = (p.variants && p.variants.length > 0 && p.variants[0].images && p.variants[0].images.length > 0) ? p.variants[0].images[0] : null;
                                var imgUrl = getImgUrl(rawImg);
                                selectedProducts.push({ id: p.id, name: p.name, imageUrl: imgUrl });
                                addedCount++;
                            }
                        });
                    });
                    
                    if (addedCount === 0) {
                        if (window.adminToast) adminToast('Không tìm thấy sản phẩm mới nào', 'warning');
                    } else {
                        renderSelectedProducts();
                        if (window.adminToast) adminToast('Đã thêm ' + addedCount + ' sản phẩm', 'success');
                    }
                    
                    bulkDropdown.style.display = 'none';
                    // Uncheck all after applying to avoid confusion next time
                    document.getElementById('bulk-cat-all').checked = false;
                    document.querySelectorAll('.bulk-cat-item:checked').forEach(function(el) { el.checked = false; });
                    var label = document.getElementById('bulk-cat-label');
                    if (label) {
                        label.textContent = '-- Chọn danh mục (có thể chọn nhiều) --';
                        label.style.color = '';
                        label.style.fontWeight = '';
                    }

                }).catch(function(err) {
                    if (window.adminToast) adminToast('Lỗi: ' + err.message, 'error');
                }).finally(function() {
                    btn.innerHTML = origText;
                    btn.disabled = false;
                });
            });
        }

        var btnClear = document.getElementById('btn-clear-all');
        if (btnClear) {
            btnClear.addEventListener('click', function() {
                if (selectedProducts.length > 0 && confirm('Bạn có chắc muốn xoá toàn bộ danh sách sản phẩm đã chọn?')) {
                    selectedProducts = [];
                    renderSelectedProducts();
                }
            });
        }

        // Table delegation
        document.getElementById('campaigns-table-body').addEventListener('click', function(e) {
            if (e.target.classList.contains('toggle-campaign-status')) {
                e.preventDefault();
                var cb = e.target;
                var id = parseInt(cb.dataset.id);
                var c = campaigns.find(function(x) { return x.id === id; });
                if (!c) return;
                
                var isCurrentlyActive = c.status === 'active';
                var newStatus = isCurrentlyActive ? 'inactive' : 'active';
                var actionText = isCurrentlyActive ? 'tạm dừng' : 'kích hoạt';
                
                if (newStatus === 'active') {
                    var activeCampaign = campaigns.find(function(x) { return x.status === 'active' && x.id !== id; });
                    if (activeCampaign) {
                        if (window.adminToast) adminToast('Đã có một chiến dịch đang diễn ra ("' + escapeHTML(activeCampaign.name) + '"). Vui lòng tắt chiến dịch đó trước khi bật!', 'warning');
                        return;
                    }
                }

                if (window.adminConfirm) {
                    adminConfirm('Bạn có chắc muốn ' + actionText + ' chiến dịch "' + escapeHTML(c.name) + '"?', function() {
                        _fetch('/campaigns/' + id + '/status', {
                            method: 'PATCH',
                            body: JSON.stringify({ status: newStatus })
                        }).then(function() {
                            if (window.adminToast) adminToast('Đã ' + actionText + ' thành công', 'success');
                            loadCampaigns();
                        }).catch(function(err) {
                            if (window.adminToast) adminToast('Lỗi: ' + err.message, 'error');
                        });
                    });
                }
                return;
            }

            var editBtn = e.target.closest('.btn-edit');
            var delBtn = e.target.closest('.btn-del');
            if (editBtn) openEditModal(parseInt(editBtn.dataset.id));
            if (delBtn) deleteCampaign(parseInt(delBtn.dataset.id));
        });

        // Selected products delegation
        document.getElementById('selected-products-body').addEventListener('click', function(e) {
            var rmBtn = e.target.closest('.btn-remove-product');
            if (rmBtn) {
                var id = parseInt(rmBtn.dataset.id);
                selectedProducts = selectedProducts.filter(function(p) { return p.id !== id; });
                renderSelectedProducts();
            }
        });

        // Search input
        var searchInput = document.getElementById('product-search');
        var searchResults = document.getElementById('product-search-results');
        
        searchInput.addEventListener('input', function(e) {
            var query = e.target.value.trim();
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(function() {
                var url = PUBLIC_API_BASE + '/products?limit=10&searchQuery=' + encodeURIComponent(query);
                fetch(url).then(function(res) { return res.json(); }).then(function(data) {
                    var items = Array.isArray(data) ? data : (data.data || []);
                    renderSearchResults(items);
                });
            }, 500);
        });

        // Click outside search
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#product-search') && !e.target.closest('.search-results-dropdown')) {
                searchResults.style.display = 'none';
            }
        });

        // Start
        loadCampaigns();
    });

})();

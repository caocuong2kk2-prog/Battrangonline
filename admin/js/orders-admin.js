// orders-admin.js
(function () {
  'use strict';
  if (!document.getElementById('orders-table-body')) return;

  var orders, products = [], allProducts = [], customers = [], searchQ = '', filterStatus = 'all', filterDateFrom = '', filterDateTo = '', currentPage = 1, pageSize = 10;
  var sortCol = 'date', sortDesc = true;
  var createLines = [{ productId: '', variantId: '', qty: 1 }];
  var _productImagesMap = {}; // Map: "productId--sizeName" -> images[]
  var isAutofilling = false;

  var VALID_STATUSES = ['all', 'pending', 'confirmed', 'shipping', 'completed', 'cancelled', 'cancel_request'];

  function fmtShortDate(dStr) {
    if (!dStr) return '';
    if (typeof dStr === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dStr)) {
      dStr += 'Z';
    }
    try {
      var d = new Date(dStr);
      if (isNaN(d.getTime())) return '';
      var pad = function (n) { return n < 10 ? '0' + n : n; };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) {
      return '';
    }
  }

  function getStatusFromHash() {
    var hash = location.hash.replace('#tab=', '');
    return VALID_STATUSES.indexOf(hash) !== -1 ? hash : 'all';
  }

  function switchTab(statusKey) {
    if (VALID_STATUSES.indexOf(statusKey) === -1) {
      statusKey = 'all';
    }
    filterStatus = statusKey;
    currentPage = 1;

    var tabs = document.getElementById('order-status-tabs');
    if (tabs) {
      tabs.querySelectorAll('.status-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.status === statusKey);
      });
    }

    history.replaceState(null, '', '#tab=' + statusKey);
    fetchAndRenderTable();
  }



  function init() {
    filterStatus = getStatusFromHash();
    history.replaceState(null, '', '#tab=' + filterStatus);
    fetchAndRenderTable();

    Promise.all([
      AdminData.products.load(),
      AdminData.customers.load(),
      AdminData.glazeLines.load(),
      AdminData.productTypes.load(),
      AdminData.materials.load(),
      AdminData.colors.load(),
      AdminData.patterns.load(),
      AdminData.sizes.load(),
      AdminData.gifts.load()
    ]).then(function (res) {
      allProducts = res[0].data || res[0] || [];
      if (!Array.isArray(allProducts)) allProducts = [];
      products = allProducts.filter(function (p) { return p.status === 'active'; });
      customers = res[1].data || res[1] || [];
      if (!Array.isArray(customers)) customers = [];

      buildProductImagesMap();
      bindEvents();
      populateCustomerDatalists();
      initCustomerAutocomplete();
    }).catch(function () {
      adminToast('Không tải được dữ liệu phụ', 'error');
    });

    AdminData.orders.updatePendingBadge();
  }

  window.onAdminNotification = function (eventType, message) {
    if (['OrderPlaced', 'OrderStatusChanged', 'OrderCancelled', 'CancelRequested', 'FallbackPoll'].indexOf(eventType) !== -1) {
      AdminData.orders.load().then(function (res) {
        orders = res.data || res;
        AdminData.orders.updatePendingBadge(orders);
        renderStatusTabs();
        renderTable();
      });
    }
  };

  function populateCustomerDatalists() {
    var namesHTML = '';
    var phonesHTML = '';
    var emailsHTML = '';

    customers.forEach(function (c) {
      if (c.name) namesHTML += '<option value="' + c.name + '">';
      if (c.phone) phonesHTML += '<option value="' + c.phone + '">';
      if (c.email) emailsHTML += '<option value="' + c.email + '">';
    });

    var dn = document.getElementById('customer-names');
    var dp = document.getElementById('customer-phones');
    var de = document.getElementById('customer-emails');
    if (dn) dn.innerHTML = namesHTML;
    if (dp) dp.innerHTML = phonesHTML;
    if (de) de.innerHTML = emailsHTML;
  }

  function initCustomerAutocomplete() {
    var f = document.getElementById('order-create-form');
    if (!f) return;

    var nameInput = f.querySelector('[name="customer"]');
    var phoneInput = f.querySelector('[name="phone"]');
    var emailInput = f.querySelector('[name="email"]');
    var addressInput = f.querySelector('[name="address"]');

    if (!nameInput || !phoneInput) return;

    // Ensure relative positioning on the parent form-groups for absolute positioning of dropdowns
    nameInput.parentNode.style.position = 'relative';
    phoneInput.parentNode.style.position = 'relative';
    if (emailInput) emailInput.parentNode.style.position = 'relative';

    // Create dropdown elements
    var nameSuggestions = document.createElement('div');
    nameSuggestions.className = 'customer-suggestions-dropdown';
    nameSuggestions.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 1100; max-height: 200px; overflow-y: auto; display: none; margin-top: 4px;';
    nameInput.parentNode.appendChild(nameSuggestions);

    var phoneSuggestions = document.createElement('div');
    phoneSuggestions.className = 'customer-suggestions-dropdown';
    phoneSuggestions.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 1100; max-height: 200px; overflow-y: auto; display: none; margin-top: 4px;';
    phoneInput.parentNode.appendChild(phoneSuggestions);

    var emailSuggestions = null;
    if (emailInput) {
      emailSuggestions = document.createElement('div');
      emailSuggestions.className = 'customer-suggestions-dropdown';
      emailSuggestions.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 1100; max-height: 200px; overflow-y: auto; display: none; margin-top: 4px;';
      emailInput.parentNode.appendChild(emailSuggestions);
    }

    function showSuggestions(input, container, query) {
      container.innerHTML = '';
      if (!query || query.length < 2) {
        container.style.display = 'none';
        return;
      }

      var q = query.toLowerCase();
      var matches = customers.filter(function (c) {
        var nameMatch = c.name && c.name.toLowerCase().includes(q);
        var phoneMatch = c.phone && c.phone.includes(q);
        var emailMatch = c.email && c.email.toLowerCase().includes(q);
        return nameMatch || phoneMatch || emailMatch;
      }).slice(0, 5); // Limit to top 5 matches

      if (matches.length === 0) {
        container.style.display = 'none';
        return;
      }

      matches.forEach(function (c) {
        var item = document.createElement('div');
        item.style.cssText = 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 2px; transition: background 0.15s; font-size: 13px; text-align: left;';

        var nameSpan = document.createElement('div');
        nameSpan.style.cssText = 'font-weight: 600; color: var(--text-primary);';
        nameSpan.textContent = c.name;

        var metaSpan = document.createElement('div');
        metaSpan.style.cssText = 'font-size: 11px; color: var(--text-muted);';
        metaSpan.textContent = (c.phone || 'SĐT: Không có') + (c.email ? ' • ' + c.email : '');

        var addrSpan = document.createElement('div');
        addrSpan.style.cssText = 'font-size: 11.5px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        addrSpan.textContent = c.address || 'Không có địa chỉ';

        item.appendChild(nameSpan);
        item.appendChild(metaSpan);
        item.appendChild(addrSpan);

        item.addEventListener('mouseenter', function () {
          item.style.background = 'var(--surface-100)';
        });
        item.addEventListener('mouseleave', function () {
          item.style.background = '#fff';
        });

        item.addEventListener('mousedown', function (e) {
          e.preventDefault(); // Prevent input from blurring and triggering native change/blur events pre-emptively
        });

        item.addEventListener('click', function (e) {
          e.stopPropagation();
          // Autofill everything (overwrite fields because they clicked a specific suggestion!)
          isAutofilling = true;
          if (nameInput) {
            nameInput.value = c.name || '';
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            nameInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (phoneInput) {
            phoneInput.value = c.phone || '';
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
            phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (emailInput) {
            emailInput.value = c.email || '';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (addressInput) {
            addressInput.value = c.address || '';
            addressInput.dispatchEvent(new Event('input', { bubbles: true }));
            addressInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          nameSuggestions.style.display = 'none';
          phoneSuggestions.style.display = 'none';
          if (emailSuggestions) emailSuggestions.style.display = 'none';

          // Blur inputs to clear focus and prevent subsequent native change/focus dropdown loops
          if (nameInput) nameInput.blur();
          if (phoneInput) phoneInput.blur();
          if (emailInput) emailInput.blur();
          if (addressInput) addressInput.blur();

          isAutofilling = false;

          adminToast('Đã tự động điền thông tin khách hàng từ hệ thống', 'success');
        });

        container.appendChild(item);
      });

      container.style.display = 'block';
    }

    nameInput.addEventListener('input', function (e) {
      if (isAutofilling) return;
      showSuggestions(nameInput, nameSuggestions, e.target.value.trim());
    });
    nameInput.addEventListener('focus', function (e) {
      if (isAutofilling) return;
      showSuggestions(nameInput, nameSuggestions, e.target.value.trim());
    });

    phoneInput.addEventListener('input', function (e) {
      if (isAutofilling) return;
      showSuggestions(phoneInput, phoneSuggestions, e.target.value.trim());
    });
    phoneInput.addEventListener('focus', function (e) {
      if (isAutofilling) return;
      showSuggestions(phoneInput, phoneSuggestions, e.target.value.trim());
    });

    if (emailInput && emailSuggestions) {
      emailInput.addEventListener('input', function (e) {
        if (isAutofilling) return;
        showSuggestions(emailInput, emailSuggestions, e.target.value.trim());
      });
      emailInput.addEventListener('focus', function (e) {
        if (isAutofilling) return;
        showSuggestions(emailInput, emailSuggestions, e.target.value.trim());
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      if (e.target !== nameInput) nameSuggestions.style.display = 'none';
      if (e.target !== phoneInput) phoneSuggestions.style.display = 'none';
      if (emailInput && e.target !== emailInput) emailSuggestions.style.display = 'none';
    });

    // Clean suggestion dropdowns on modal close/reset
    window.hideCustomerSuggestions = function () {
      nameSuggestions.style.display = 'none';
      phoneSuggestions.style.display = 'none';
      if (emailSuggestions) emailSuggestions.style.display = 'none';
    };
  }

  function autofillCustomerInfo(val) {
    if (isAutofilling) return;
    if (!val) return;
    var c = customers.find(function (x) {
      return x.name === val || x.phone === val || x.email === val;
    });
    if (c) {
      isAutofilling = true;
      var f = document.getElementById('order-create-form');
      if (!f) {
        isAutofilling = false;
        return;
      }
      var inputs = {
        customer: f.querySelector('[name="customer"]'),
        phone: f.querySelector('[name="phone"]'),
        email: f.querySelector('[name="email"]'),
        address: f.querySelector('[name="address"]')
      };
      if (inputs.customer && !inputs.customer.value) {
        inputs.customer.value = c.name || '';
        inputs.customer.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (inputs.phone && !inputs.phone.value) {
        inputs.phone.value = c.phone || '';
        inputs.phone.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (inputs.email && !inputs.email.value) {
        inputs.email.value = c.email || '';
        inputs.email.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (inputs.address && !inputs.address.value) {
        inputs.address.value = c.address || '';
        inputs.address.dispatchEvent(new Event('input', { bubbles: true }));
      }
      isAutofilling = false;
    }
  }

  function getFiltered() {
    return orders;
  }

  var currentCounts = {};

  function renderStatusTabs() {
    var tabs = document.getElementById('order-status-tabs');
    if (!tabs) return;
    var statuses = [
      { key: 'all', label: 'Tất cả' },
      { key: 'pending', label: 'Chờ xác nhận' },
      { key: 'confirmed', label: 'Đã xác nhận' },
      { key: 'shipping', label: 'Đang giao' },
      { key: 'completed', label: 'Hoàn thành' },
      { key: 'cancelled', label: 'Đã huỷ' },
      { key: 'cancel_request', label: 'Yêu cầu hủy' }
    ];
    tabs.innerHTML = statuses.map(function (s) {
      var countKey = s.key === 'cancel_request' ? 'cancel_requested' : s.key;
      var count = currentCounts[countKey] || 0;

      var specialStyle = s.key === 'cancel_request' && count > 0 ? ' style="color:#c2410c; background-color:#ffedD5;"' : '';
      return '<button class="status-tab' + (filterStatus === s.key ? ' active' : '') + '" data-status="' + s.key + '"' + specialStyle + '>' + s.label + ' <span class="tab-count">' + count + '</span></button>';
    }).join('');
    tabs.querySelectorAll('.status-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.dataset.status);
      });
    });
  }

  function renderTable() {
    return fetchAndRenderTable();
  }

  function fetchAndRenderTable() {
    var queryStatus = filterStatus === 'cancel_request' ? 'cancel_requested' : filterStatus;
    AdminData.orders.load(currentPage, pageSize, searchQ, queryStatus, filterDateFrom, filterDateTo)
      .then(function(res) {
          orders = res.data || [];
          var total = res.total || 0;
          var pages = Math.ceil(total / pageSize) || 1;
          if (currentPage > pages && pages > 0) {
              currentPage = pages;
              return fetchAndRenderTable();
          }
          currentCounts = res.counts || {};
          renderStatusTabs();

          var slice = orders;
          var tbody = document.getElementById('orders-table-body');
    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><div class="empty-state__icon">🛒</div><div class="empty-state__title">Không có đơn hàng</div></div></td></tr>';
    } else {
      tbody.innerHTML = slice.map(function (o, idx) {
        var stt = (currentPage - 1) * pageSize + idx + 1;

        var cancelBadge = '';
        if (o.isCancelRequested) {
          var reqTime = o.cancelRequestedAt ? AdminData.fmtDate(o.cancelRequestedAt) : '';
          cancelBadge = '<br><span style="display:inline-block; margin-top:4px; font-size:10px; background-color:#ffedD5; color:#c2410c; padding:2px 6px; border-radius:4px; font-weight:600;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Khách xin hủy' + (reqTime ? ' (' + reqTime + ')' : '') + '</span>';
          cancelBadge += '<br><span style="display:inline-block; margin-top:2px; font-size:10.5px; color:#9a3412; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + escapeHTML(o.cancelReason || 'Không có lý do') + '">Lý do: ' + escapeHTML(o.cancelReason || 'Không có lý do') + '</span>';
        }

        if (o.status === 'cancelled') {
          var cancTime = o.cancelledAt ? AdminData.fmtDate(o.cancelledAt) : '';
          if (o.cancelReason && o.cancelReason.toLowerCase().includes('khách')) {
            cancelBadge = '<br><span style="display:inline-block; margin-top:4px; font-size:11px; color:#dc2626;">(Bởi khách hàng)' + (cancTime ? ' - ' + cancTime : '') + '</span>';
          } else {
            cancelBadge = '<br><span style="display:inline-block; margin-top:4px; font-size:11px; color:#dc2626;">(Bởi hệ thống)' + (cancTime ? ' - ' + cancTime : '') + '</span>';
          }
          if (o.cancelReason) {
            cancelBadge += '<br><span style="display:inline-block; margin-top:2px; font-size:10.5px; color:#b91c1c; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + escapeHTML(o.cancelReason) + '">' + escapeHTML(o.cancelReason) + '</span>';
          }
        }

        var actionBtn = '<button class="btn btn--sm btn--secondary btn-view-order" data-id="' + o.id + '">Chi tiết</button>';
        if (o.isCancelRequested) {
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-approve-cancel" data-id="' + o.id + '" style="margin-right:4px;" title="Duyệt hủy đơn">✓ Duyệt hủy</button>' +
            '<button class="btn btn--sm btn--secondary btn-quick-reject-cancel" data-id="' + o.id + '" style="margin-right:4px;" title="Từ chối hủy">✕ Từ chối</button>' + actionBtn;
        } else if (o.status === 'pending') {
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-confirm" data-id="' + o.id + '" style="margin-right:4px;" title="Duyệt đơn nhanh">✓ Duyệt</button>' +
            '<button class="btn btn--sm btn--danger btn-quick-cancel" data-id="' + o.id + '" style="margin-right:4px; background-color:#fee2e2; border-color:#fecaca; color:#dc2626;" title="Hủy đơn nhanh">✕ Hủy</button>' + actionBtn;
        } else if (o.status === 'confirmed') {
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-ship" data-id="' + o.id + '" style="margin-right:4px; background-color:#e0f2fe; border-color:#bae6fd; color:#0284c7;" title="Giao đơn nhanh">🚚 Giao hàng</button>' +
            '<button class="btn btn--sm btn--danger btn-quick-cancel" data-id="' + o.id + '" style="margin-right:4px; background-color:#fee2e2; border-color:#fecaca; color:#dc2626;" title="Hủy đơn nhanh">✕ Hủy</button>' + actionBtn;
        } else if (o.status === 'shipping') {
          actionBtn = '<button class="btn btn--sm btn--primary btn-quick-complete" data-id="' + o.id + '" style="margin-right:4px; background-color:#dcfce7; border-color:#bbf7d0; color:#16a34a;" title="Hoàn thành nhanh">📦 Hoàn thành</button>' + actionBtn;
        }

        var isAdmin = window.getAdminSession ? (window.getAdminSession().role === 'admin') : false;
        var deleteBtn = '';
        if (isAdmin && o.status !== 'completed' && o.status !== 'cancelled') {
          deleteBtn = '<button class="btn btn--sm btn--danger btn-delete-order" data-id="' + o.id + '" style="margin-left:4px; background-color:#fee2e2; border-color:#fecaca; color:#dc2626;" title="Xoá đơn hàng">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">' +
            '<polyline points="3 6 5 6 21 6"></polyline>' +
            '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
            '</svg>' +
            '</button>';
        }
        actionBtn = actionBtn + deleteBtn;

        var customerNoteHtml = o.customerNote
          ? '<div class="customer-note-tooltip-wrap">' +
          '<div class="customer-note-icon" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:rgba(217,119,6,0.08);border-radius:50%;color:#d97706;cursor:pointer;">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
          '</div>' +
          '<div class="customer-note-tooltip-content">' +
          escapeHTML(o.customerNote) +
          '</div>' +
          '</div>'
          : '';
        var customerHtml = '<div class="table-customer">' +
          '<div class="table-customer-name" style="font-weight:600;color:var(--text-primary);">' + escapeHTML(o.customer) + '</div>' +
          '<div class="table-customer-contact">' + escapeHTML(o.phone) + '</div>' +
          '</div>';

        var itemsStackHtml = '<div class="items-stack">';
        o.items.forEach(function (i, idx) {
          if (idx < 3) {
            var p = i.productId ? getProductById(i.productId) : null;
            var productImages = (p && p.images && p.images.length > 0) ? p.images : (i.imageUrl ? [i.imageUrl] : []);
            var img = (productImages.length > 0) ? productImages[0] : '';
            var isGift = (i.name || '').toLowerCase().indexOf('[quà tặng]') >= 0;
            var fallback = isGift ? '🎁' : '🏺';

            if (img) {
              itemsStackHtml += '<div class="items-stack-img" title="' + escapeHTML(i.name) + ' (x' + i.qty + ')"><img src="' + img + '" alt=""></div>';
            } else {
              itemsStackHtml += '<div class="items-stack-img" title="' + escapeHTML(i.name) + ' (x' + i.qty + ')" style="background:var(--surface-100);display:flex;align-items:center;justify-content:center;font-size:14px;">' + fallback + '</div>';
            }
          }
        });
        if (o.items.length > 3) {
          itemsStackHtml += '<div class="items-stack-more">+' + (o.items.length - 3) + '</div>';
        }
        itemsStackHtml += '</div>';

        return '<tr class="order-row-' + o.status + '" data-id="' + o.id + '" style="cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor=\'var(--surface-100)\'" onmouseout="this.style.backgroundColor=\'\'">' +
          '<td class="checkbox-cell" style="vertical-align:middle" onclick="event.stopPropagation()"><input type="checkbox" class="order-item-checkbox" data-id="' + o.id + '"></td>' +
          '<td class="stt-cell">' + stt + '</td>' +
          '<td><span class="order-id-badge">#' + o.id + '</span></td>' +
          '<td>' + customerHtml + '</td>' +
          '<td style="text-align:center;vertical-align:middle;">' + customerNoteHtml + '</td>' +
          '<td><strong>' + AdminData.fmt(o.total) + '</strong></td>' +
          '<td class="hide-mobile">' + AdminData.fmtDate(o.date) + '</td>' +
          '<td><span class="badge ' + AdminData.getStatusBadge(o.status) + '">' + AdminData.getStatusLabel(o.status) + '</span>' + cancelBadge + '</td>' +
          '<td><input class="table-note-input" type="text" value="' + escapeHTML(o.adminNote || '') + '" placeholder="Thêm ghi chú nội bộ..." data-id="' + o.id + '"></td>' +
          '<td class="actions-cell" style="white-space:nowrap">' + actionBtn + '</td>' +
          '</tr>';
      }).join('');
    }
    var countEl = document.getElementById('order-count');
    if (countEl) countEl.textContent = total + ' đơn';
    renderPag(total, pages);
    if (window.initCustomSelects) window.initCustomSelects(tbody);
    if (typeof updateBulkActionsUI === 'function') updateBulkActionsUI();
    }).catch(function(err) {
        console.error(err);
        adminToast('Lỗi tải danh sách đơn hàng', 'error');
    });
  }

  function renderPag(total, pages) {
    var pag = document.getElementById('orders-pagination');
    if (!pag) return;
    var html = '<div class="pagination__info">' + total + ' đơn hàng | Trang ' + currentPage + '/' + pages + '</div><div class="pagination__btns">';
    html += '<button class="pag-btn" id="o-prev" ' + (currentPage === 1 ? 'disabled' : '') + '>‹</button>';
    for (var i = 1; i <= Math.min(pages, 5); i++)html += '<button class="pag-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    html += '<button class="pag-btn" id="o-next" ' + (currentPage === pages ? 'disabled' : '') + '>›</button></div>';
    pag.innerHTML = html;
    pag.querySelectorAll('[data-page]').forEach(function (b) { b.addEventListener('click', function () { currentPage = +b.dataset.page; fetchAndRenderTable(); }); });
    var p = pag.querySelector('#o-prev'), n = pag.querySelector('#o-next');
    if (p) p.addEventListener('click', function () { if (currentPage > 1) { currentPage--; fetchAndRenderTable(); } });
    if (n) n.addEventListener('click', function () { if (currentPage < pages) { currentPage++; fetchAndRenderTable(); } });
  }

  function viewOrder(id) {
    var o = orders.find(function (x) { return x.id === id; });
    if (!o) return;
    document.getElementById('order-detail-id').textContent = o.id;
    var dateEl = document.getElementById('order-detail-date');
    if (dateEl) dateEl.textContent = 'Ngày đặt: ' + AdminData.fmtDate(o.date);

    var timelineParts = [];
    if (o.date) {
      timelineParts.push('📋 Đặt: ' + fmtShortDate(o.date));
    }
    if (o.confirmedAt) {
      timelineParts.push('✅ Xác nhận: ' + fmtShortDate(o.confirmedAt));
    }
    if (o.shippingAt) {
      timelineParts.push('🚚 Giao: ' + fmtShortDate(o.shippingAt));
    }
    if (o.completedAt) {
      timelineParts.push('📦 Hoàn thành: ' + fmtShortDate(o.completedAt));
    }
    if (o.cancelledAt) {
      timelineParts.push('❌ Hủy: ' + fmtShortDate(o.cancelledAt));
    }
    var timelineHtml = timelineParts.length > 0
      ? '<div style="margin-top: 8px; font-size: 12px; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">' +
      timelineParts.join(' <span style="color:var(--border)">→</span> ') +
      '</div>'
      : '';

    document.getElementById('order-detail-status').innerHTML = '<span class="badge ' + AdminData.getStatusBadge(o.status) + '" style="font-size:14px;padding:6px 12px;">' + AdminData.getStatusLabel(o.status) + '</span>' + timelineHtml;

    var cancelAlertHtml = '';
    if (o.isCancelRequested) {
      var requestedDate = o.cancelRequestedAt ? ' <i>(Lúc: ' + AdminData.fmtDate(o.cancelRequestedAt) + ')</i>' : '';
      cancelAlertHtml = '<div style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px; margin-bottom:16px;">' +
        '<div style="color:#dc2626; font-weight:700; margin-bottom:4px;"><i class="fas fa-exclamation-triangle"></i> Khách hàng yêu cầu hủy đơn</div>' +
        '<div style="color:#991b1b; font-size:14px; margin-bottom:8px;">Lý do: <strong>' + escapeHTML(o.cancelReason || 'Không có') + '</strong>' + requestedDate + '</div>' +
        '<div style="display:flex; gap:8px;">' +
        '<button class="btn btn--sm btn--danger" onclick="approveCancel(\'' + o.id + '\')">Duyệt hủy đơn</button>' +
        '<button class="btn btn--sm btn--secondary" onclick="rejectCancel(\'' + o.id + '\')">Từ chối hủy</button>' +
        '</div>' +
        '</div>';
    } else if (o.status === 'cancelled' && o.cancelReason) {
      var cancelledDate = o.cancelledAt ? ' <i>(Lúc: ' + AdminData.fmtDate(o.cancelledAt) + ')</i>' : '';
      cancelAlertHtml = '<div style="background:#fef2f2; border:1px dashed #fecaca; padding:12px; border-radius:8px; margin-bottom:16px;">' +
        '<div style="color:#dc2626; font-weight:700; margin-bottom:4px;"><i class="fas fa-info-circle"></i> Đơn hàng đã bị hủy</div>' +
        '<div style="color:#991b1b; font-size:14px;">Lý do: <strong>' + escapeHTML(o.cancelReason) + '</strong>' + cancelledDate + '</div>' +
        '</div>';
    }

    document.getElementById('order-detail-customer').innerHTML =
      cancelAlertHtml +
      '<div class="stat-row"><div class="stat-row__label">Khách hàng</div><div class="stat-row__value" style="font-weight:600;color:var(--text-primary)">' + escapeHTML(o.customer) + '</div></div>' +
      '<div class="stat-row"><div class="stat-row__label">Điện thoại</div><div class="stat-row__value">' + escapeHTML(o.phone) + '</div></div>' +
      '<div class="stat-row"><div class="stat-row__label">Email</div><div class="stat-row__value">' + escapeHTML(o.email || '—') + '</div></div>' +
      '<div class="stat-row"><div class="stat-row__label">Địa chỉ</div><div class="stat-row__value">' + escapeHTML(o.address) + '</div></div>' +
      (o.customerNote ? '<div class="stat-row" style="background:#fffbeb;border:1px dashed #fcd34d;padding:12px;border-radius:8px;margin-bottom:12px;"><div class="stat-row__label" style="color:#d97706;font-weight:600;margin-bottom:4px;"><i class="fas fa-comment-dots"></i> Lời dặn của khách hàng</div><div class="stat-row__value" style="color:#92400e;font-weight:500;font-size:14px;line-height:1.5;">' + escapeHTML(o.customerNote) + '</div></div>' : '') +
      '<div class="stat-row"><div class="stat-row__label">Ghi chú nội bộ</div><div class="stat-row__value"><input class="table-note-input" style="width:100%;margin:0;" type="text" value="' + escapeHTML(o.adminNote || '') + '" placeholder="Nhập ghi chú nội bộ..." data-id="' + o.id + '" onchange="saveInlineNote(\'' + o.id + '\', this.value, this)"></div></div>';

    var itemsHtml = '<div class="order-lines">';
    // Preprocess items: group gifts into their main products
    var structuredItems = [];
    var currentProduct = null;
    
    (o.items || []).forEach(function(i) {
      if (i.name && i.name.indexOf('[Quà Tặng]') === 0) {
        if (currentProduct) {
          currentProduct.gifts = currentProduct.gifts || [];
          currentProduct.gifts.push({
             name: i.name.replace('[Quà Tặng]', '').trim(),
             qty: i.qty / (currentProduct.qty || 1), // restore per-unit gift quantity
             imageUrl: i.image || i.imageUrl,
             estimatedValue: i.estimatedValue
          });
        } else {
          structuredItems.push(i);
        }
      } else {
        currentProduct = Object.assign({}, i);
        structuredItems.push(currentProduct);
      }
    });

    structuredItems.forEach(function (i) {
      var p = i.productId ? getProductById(i.productId) : null;
      var productImages = (p && p.images && p.images.length > 0) ? p.images : (i.imageUrl ? [i.imageUrl] : (i.image ? [i.image] : []));

      var imgHtml = '';
      if (productImages.length > 0) {
        if (typeof window.generateAdminThumbnailHTML === 'function') {
          imgHtml = '<div style="flex-shrink:0;width:72px;height:72px;border-radius:10px;overflow:hidden;border:1px solid var(--border);">' +
            window.generateAdminThumbnailHTML(productImages[0], 72, 'zoomable', 'data-images="' + JSON.stringify(productImages).replace(/"/g, '&quot;') + '"') +
            '</div>';
        } else {
          imgHtml = '<img src="' + productImages[0] + '" class="zoomable" data-images="' + JSON.stringify(productImages).replace(/"/g, '&quot;') + '" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:10px;flex-shrink:0;border:1px solid var(--border);">';
        }
      } else {
        var isGift = (i.name || '').toLowerCase().indexOf('[quà tặng]') >= 0;
        var fallbackIcon = isGift ? '🎁' : '🏺';
        imgHtml = '<div style="width:72px;height:72px;background:var(--surface-100);border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px;">' + fallbackIcon + '</div>';
      }

      var productCode = i.productId ? ('<span style="display:inline-block;font-size:10.5px;font-weight:700;color:var(--accent);background:rgba(200,146,42,0.1);border:1px solid rgba(200,146,42,0.25);border-radius:4px;padding:1px 7px;letter-spacing:.04em;">#' + (i.sku || ('SP' + String(i.productId).padStart(4, '0'))) + '</span>') : '';
      var sizeHtml = (i.size && i.size !== 'Default') ? ('<span style="display:inline-block;font-size:10.5px;color:var(--text-muted);background:var(--surface-100);border:1px solid var(--border);border-radius:4px;padding:1px 7px;margin-left:4px;">Size: ' + escapeHTML(i.size) + '</span>') : '';
      var nameHtml = escapeHTML(i.name);
      var targetSlugOrId = (p && p.slug) ? p.slug : (i.productId || null);
      if (targetSlugOrId) {
        var sizeQuery = (i.size && i.size !== 'Default') ? '&size=' + encodeURIComponent(i.size) : '';
        nameHtml = '<a href="../product-detail.html?slug=' + targetSlugOrId + sizeQuery + '" target="_blank" style="color:inherit; text-decoration:none; transition: color 0.2s;" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'inherit\'" title="Xem chi tiết sản phẩm trên website">' + escapeHTML(i.name) + '</a>';
      }
      var isGift = (i.name || '').toLowerCase().indexOf('[quà tặng]') >= 0;
      var priceDisplay = '';
      var totalDisplay = '';
      if (isGift && i.estimatedValue) {
        priceDisplay = '<span style="text-decoration:line-through;color:var(--text-muted);">' + AdminData.fmt(i.estimatedValue) + '</span> (Quà tặng)';
        totalDisplay = '<span style="color:var(--text-muted);font-weight:normal;">Trị giá: ' + AdminData.fmt(i.estimatedValue * i.qty) + '</span>';
      } else {
        priceDisplay = AdminData.fmt(i.price);
        totalDisplay = AdminData.fmt(i.price * i.qty);
      }

      var giftHtml = '';
      if (i.gifts && i.gifts.length > 0) {
        giftHtml = '<div style="margin-top:8px; padding:6px 8px; border-radius:4px; background:rgba(255,152,0,0.05); border:1px dashed rgba(255,152,0,0.2);">';
        i.gifts.forEach(function(g) {
          var gQty = g.qty * i.qty;
          var displayValue = '';
          if (g.estimatedValue) {
            displayValue = ' - <span style="text-decoration:line-through;color:var(--text-muted);font-size:11px;margin-left:4px;">' + AdminData.fmt(g.estimatedValue * g.qty) + '</span>';
          }
          giftHtml += '<div style="font-size:12px; color:#d97706; display:flex; align-items:center; gap:6px; margin-bottom:4px;">';
          var imgUrl = g.imageUrl || '../assets/images/placeholder.png';
          giftHtml += '<img src="' + imgUrl + '" class="zoomable" data-images=\'["' + imgUrl + '"]\' style="width:20px; height:20px; object-fit:cover; border-radius:3px; border:1px solid rgba(255,152,0,0.3); cursor:zoom-in;">';
          giftHtml += '<span style="line-height:1.2; flex-grow:1; color: var(--text-primary);">Quà tặng: <strong>' + escapeHTML(g.name) + '</strong> <b style="color:#f59e0b; margin-left:2px;">x' + gQty + '</b>' + displayValue + '</span>';
          giftHtml += '</div>';
        });
        giftHtml += '</div>';
      }

      itemsHtml += '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px dashed var(--border);">' +
        imgHtml +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:600;font-size:13.5px;line-height:1.4;margin-bottom:5px;">' + nameHtml + '</div>' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:5px;">' + productCode + sizeHtml + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);">Số lượng: <strong>' + i.qty + '</strong> &times; ' + priceDisplay + '</div>' +
        giftHtml +
        '</div>' +
        '<div style="font-weight:700;font-size:14px;color:var(--accent);text-align:right;white-space:nowrap;margin-left:8px;flex-shrink:0;">' + totalDisplay + '</div>' +
        '</div>';
    });
    itemsHtml += '</div>';
    itemsHtml += '<div class="order-create-total"><span style="font-size:16px;font-weight:600;">Tổng cộng</span><span style="font-size:24px;font-weight:700;color:var(--accent)">' + AdminData.fmt(o.total) + '</span></div>';
    document.getElementById('order-detail-items').innerHTML = itemsHtml;

    var sel = document.getElementById('order-detail-status-select');
    if (sel) { sel.value = o.status; sel.dataset.id = o.id; sel.dispatchEvent(new Event('change')); }

    // Nút xuất hóa đơn PDF
    var invoiceBtn = document.getElementById('btn-download-invoice');
    if (invoiceBtn) {
      invoiceBtn.dataset.id = o.id;
      invoiceBtn.onclick = function () {
        var orderId = this.dataset.id;
        this.disabled = true;
        this.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Đang tạo...';
        var token = window.getAdminSession ? window.getAdminSession().token : '';
        fetch('/api/admin/orders/' + orderId + '/invoice', {
          headers: { 'Authorization': 'Bearer ' + token }
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Lỗi tạo hóa đơn');
            return res.blob();
          })
          .then(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'HoaDon_' + orderId + '.pdf';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
            adminToast('Đã tải hóa đơn thành công!', 'success');
          })
          .catch(function () {
            adminToast('Không thể tạo hóa đơn. Vui lòng thử lại.', 'error');
          })
          .finally(function () {
            invoiceBtn.disabled = false;
            invoiceBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg> Xuất hóa đơn';
          });
      };
    }

    openModal('orderDetailModal');
  }

  function updateOrderStatus(id, status) {
    if (!status) return Promise.resolve();
    return AdminData.orders.updateStatus(id, status).then(function () {
      adminToast('Cập nhật trạng thái: ' + AdminData.getStatusLabel(status), 'success');
      fetchAndRenderTable();
      AdminData.orders.updatePendingBadge();
    }).catch(function () {
      adminToast('Lỗi cập nhật trạng thái', 'error');
      throw new Error('Lỗi cập nhật');
    });
  }

  window.approveCancel = function (id) {
    adminConfirm('Bạn có chắc chắn muốn duyệt yêu cầu hủy đơn hàng #' + id + ' không?\nHệ thống sẽ hoàn lại số lượng tồn kho.', function () {
      updateOrderStatus(id, 'cancelled');
      closeModal('orderDetailModal');
    }, { title: 'Duyệt hủy đơn', type: 'danger', okText: 'Xác nhận hủy' });
  };

  window.rejectCancel = function (id) {
    if (window.adminPrompt) {
      adminPrompt('Bạn muốn từ chối yêu cầu hủy của khách đối với đơn #' + id + '?\nVui lòng nhập lý do từ chối (bắt buộc):', '', function (reason) {
        if (!reason || reason.trim() === '') {
          adminToast('Bạn phải nhập lý do từ chối!', 'warning');
          return;
        }
        AdminData.orders.rejectCancel(id, reason).then(function () {
          adminToast('Đã từ chối yêu cầu hủy đơn.', 'success');
          fetchAndRenderTable();
          closeModal('orderDetailModal');
        }).catch(function (err) {
          adminToast(err.message || 'Lỗi khi từ chối', 'error');
        });
      }, { title: 'Từ chối hủy đơn', type: 'warning', okText: 'Từ chối', placeholder: 'Ví dụ: Đơn đã được giao cho bưu tá...' });
    } else {
      if (!confirm('Bạn muốn từ chối yêu cầu hủy của khách? Đơn hàng sẽ giữ nguyên trạng thái Đã xác nhận.')) return;
      AdminData.orders.rejectCancel(id, "Shop từ chối").then(function () {
        adminToast('Đã từ chối yêu cầu hủy đơn.', 'success');
        fetchAndRenderTable();
        closeModal('orderDetailModal');
      }).catch(function (err) {
        adminToast(err.message || 'Lỗi khi từ chối', 'error');
      });
    }
  };

  function deleteOrder(id) {
    AdminData.orders.delete(id).then(function () {
      adminToast('Đã xóa đơn hàng #' + id, 'success');
      fetchAndRenderTable();
      AdminData.orders.updatePendingBadge();
    }).catch(function (err) {
      adminToast('Lỗi khi xóa đơn hàng: ' + (err.message || 'thất bại'), 'error');
    });
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getProductById(id) {
    return allProducts.find(function (p) { return String(p.id) === String(id); });
  }

  function buildProductImagesMap() {
    _productImagesMap = {};
    allProducts.forEach(function (p) {
      if (!p.variants || !p.variants.length) return;
      p.variants.forEach(function (v) {
        // Key by variant ID for precise per-variant image lookup
        var key = p.id + '--' + v.id;
        var imgs = (v.images && v.images.length > 0) ? v.images : [];
        if (!imgs.length) {
          // Fallback 1: any other variant with images in same product
          var other = p.variants.find(function (x) { return x.images && x.images.length > 0; });
          if (other) imgs = other.images;
        }
        if (!imgs.length && p.images && p.images.length > 0) {
          // Fallback 2: product-level images
          imgs = p.images;
        }
        _productImagesMap[key] = imgs;
      });
    });
  }

  function productOptions(selectedProductId, selectedVariantId) {
    var opts = '<option value="">-- Chọn sản phẩm --</option>';
    products.forEach(function (p) {
      if (!p.variants || p.variants.length === 0) return;
      p.variants.forEach(function (v) {
        var sizeName = v.sizeName || v.SizeName || (v.size && (v.size.name || v.size.Name)) || '';
        var ptypeName = v.productTypeName || v.ProductTypeName || '';
        var glazeName = v.glazeLineName || v.GlazeLineName || '';
        var materialName = v.materialName || v.MaterialName || '';
        var colorName = v.colorName || v.ColorName || '';
        var patternName = v.patternName || v.PatternName || '';

        // Plain-text label for native select fallback and search index
        var labelParts = [p.name];
        if (sizeName) labelParts.push(sizeName);
        if (glazeName) labelParts.push(glazeName);
        if (patternName) labelParts.push(patternName);
        var displayName = labelParts.join(' — ');

        var val = p.id + '--' + v.id;
        var isSelected = String(p.id) === String(selectedProductId) &&
          String(v.id) === String(selectedVariantId);
        var sel = isSelected ? ' selected' : '';

        // --- Image ---
        var imgKey = p.id + '--' + v.id;
        var variantImages = _productImagesMap[imgKey] || [];
        var firstMedia = variantImages.length > 0 ? variantImages[0] : '';
        var imgHtml = '';
        if (firstMedia) {
          var thumbInner = generateAdminThumbnailHTML(firstMedia, 52, 'product-option-img');
          imgHtml = '<div class="product-option-img-wrap js-img-zoom" data-variantkey="' + escapeHTML(imgKey) + '" style="position:relative;flex-shrink:0;cursor:zoom-in;border-radius:8px;overflow:hidden;" title="Click để xem ảnh lớn">' +
            '<div style="pointer-events:none;">' + thumbInner + '</div>' +
            '</div>';
        } else {
          imgHtml = '<div class="product-option-thumb-placeholder">🏺</div>';
        }

        // --- Left: name + size + badges ---
        var sizeHtml = sizeName ? '<div class="product-option-size">' + escapeHTML(sizeName) + '</div>' : '';

        // Badges: pattern & color on the size line (decorative)
        var extraLine = [];
        if (patternName) extraLine.push(escapeHTML(patternName));
        if (colorName) extraLine.push(escapeHTML(colorName));
        var sizeSuffix = extraLine.length ? ' <span style="color:var(--text-disabled)">·</span> ' + extraLine.join(' <span style="color:var(--text-disabled)">·</span> ') : '';

        // Attribute badges: men, chất liệu, loại sp
        var badges = [];
        if (glazeName) badges.push(escapeHTML(glazeName));
        if (materialName) badges.push(escapeHTML(materialName));
        if (ptypeName) badges.push(escapeHTML(ptypeName));
        var badgesHtml = badges.length
          ? '<div class="product-option-badges">' + badges.map(function (b) { return '<span class="product-option-badge">' + b + '</span>'; }).join('') + '</div>'
          : '';

        // --- Right: price + stock ---
        var stock = v.stock || 0;
        var stockClass = stock <= 0 ? 'product-option-stock--empty' : stock < 5 ? 'product-option-stock--low' : '';
        var stockLabel = stock <= 0 ? 'Hết hàng' : 'Còn ' + stock + ' chiếc';
        var priceHtml = '<div class="product-option-price">' + AdminData.fmt(v.price || 0) + '</div>' +
          '<div class="product-option-stock ' + stockClass + '">' + stockLabel + '</div>';

        var optionHtml =
          '<div class="product-option-item">' +
          imgHtml +
          '<div class="product-option-body">' +
          '<div class="product-option-name">' + escapeHTML(p.name) + '</div>' +
          (sizeHtml ? '<div class="product-option-size">' + escapeHTML(sizeName) + sizeSuffix + '</div>' : '') +
          badgesHtml +
          '</div>' +
          '<div class="product-option-right">' +
          priceHtml +
          '</div>' +
          '</div>';

        var escapedOptionHtml = escapeHTML(optionHtml);
        opts += '<option value="' + val + '"' + sel + ' data-html="' + escapedOptionHtml + '">' + escapeHTML(displayName) + '</option>';
      });
    });
    return opts;
  }

  function findMatchingVariant(p, line) {
    if (!p || !p.variants || !p.variants.length) return null;
    if (line.variantId) {
      var match = p.variants.find(function (v) { return String(v.id) === String(line.variantId); });
      if (match) return match;
    }
    // Fallback logic by matching size for backward compatibility
    var matchBySize = p.variants.find(function (v) {
      var sizeName = v.sizeName || v.SizeName || (v.size && (v.size.name || v.size.Name)) || 'Default';
      return String(sizeName) === String(line.size || 'Default');
    });
    return matchBySize || p.variants[0];
  }

  function validateLineQty(qtyInputEl, idx) {
    if (!qtyInputEl) return;
    var line = createLines[idx];
    if (!line || !line.productId || !line.variantId) return;

    var p = getProductById(line.productId);
    if (!p || !p.variants) return;

    var v = p.variants.find(function (x) { return String(x.id) === String(line.variantId); });
    if (!v) return;

    var qty = parseInt(qtyInputEl.value, 10) || 0;
    var maxStock = v.stock || 0;

    if (qty > maxStock) {
      qtyInputEl.value = maxStock;
      createLines[idx].qty = maxStock;
      adminToast('Sản phẩm "' + p.name + '" chỉ còn ' + maxStock + ' chiếc trong kho', 'warning');
    }
  }

  function calcCreateTotal() {
    var total = 0;
    createLines.forEach(function (line) {
      var p = getProductById(line.productId);
      if (p && line.qty > 0) {
        var v = findMatchingVariant(p, line);
        if (v) total += v.price * line.qty;
      }
    });
    return total;
  }

  function renderCreateLines() {
    var wrap = document.getElementById('order-create-lines');
    if (!wrap) return;
    if (!products.length) {
      wrap.innerHTML = '<p style="color:var(--text-muted);font-size:var(--fs-sm)">Chưa có sản phẩm đang bán. Vui lòng thêm sản phẩm trước.</p>';
      return;
    }
    wrap.innerHTML = createLines.map(function (line, idx) {
      var p = getProductById(line.productId);
      var price = 0;
      if (p) {
        var v = findMatchingVariant(p, line);
        if (v) price = v.price || 0;
      }
      var sub = price > 0 && line.qty > 0 ? AdminData.fmt(price * line.qty) : '—';
      return '<div class="order-line" data-line="' + idx + '">' +
        '<select class="form-control order-line-product" data-idx="' + idx + '">' + productOptions(line.productId, line.variantId) + '</select>' +
        '<input class="form-control order-line-qty" type="number" min="1" value="' + (line.qty || 1) + '" data-idx="' + idx + '">' +
        '<div class="order-line__subtotal">' + sub + '</div>' +
        '<button type="button" class="btn btn--sm btn--danger btn-remove-line" data-idx="' + idx + '" title="Xóa dòng"' + (createLines.length <= 1 ? ' disabled' : '') + '>✕</button>' +
        '</div>';
    }).join('');

    var totalEl = document.getElementById('order-create-total');
    if (totalEl) totalEl.textContent = AdminData.fmt(calcCreateTotal());

    if (window.initCustomSelects) window.initCustomSelects(wrap);
  }

  function resetCreateForm() {
    var f = document.getElementById('order-create-form');
    if (f) f.reset();
    createLines = [{ productId: '', variantId: '', qty: 1 }];
    renderCreateLines();
    if (window.hideCustomerSuggestions) {
      window.hideCustomerSuggestions();
    }
  }

  function openCreateModal() {
    if (!products.length) {
      adminToast('Chưa có sản phẩm đang bán để tạo đơn', 'warning');
      return;
    }
    resetCreateForm();
    clearInlineErrors('order-create-form');
    openModal('orderCreateModal');
  }

  function saveNewOrder() {
    var f = document.getElementById('order-create-form');
    if (!f) return;

    var customer = f.querySelector('[name="customer"]').value.trim();
    var phone = f.querySelector('[name="phone"]').value.trim();
    var email = f.querySelector('[name="email"]').value.trim();
    var address = f.querySelector('[name="address"]').value.trim();
    var note = f.querySelector('[name="note"]').value.trim();
    var status = f.querySelector('[name="status"]').value;

    clearInlineErrors(f);
    var hasError = false;

    if (!customer) {
      setInlineError(f.querySelector('[name="customer"]'), 'Vui lòng nhập họ và tên khách hàng');
      hasError = true;
    } else if (customer.length < 2) {
      setInlineError(f.querySelector('[name="customer"]'), 'Họ và tên khách hàng phải từ 2 ký tự trở lên');
      hasError = true;
    } else if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(customer)) {
      setInlineError(f.querySelector('[name="customer"]'), 'Họ và tên không được chứa số hoặc ký tự đặc biệt');
      hasError = true;
    }

    var cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('84')) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }
    var phoneRegex = /^0[1-9][0-9]{8,9}$/;
    if (!phone) {
      setInlineError(f.querySelector('[name="phone"]'), 'Vui lòng nhập số điện thoại');
      hasError = true;
    } else if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      setInlineError(f.querySelector('[name="phone"]'), 'Số điện thoại không hợp lệ (Phải từ 10-11 số)');
      hasError = true;
    }
    phone = cleanPhone;

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setInlineError(f.querySelector('[name="email"]'), 'Email không đúng định dạng');
      hasError = true;
    }

    if (!address) {
      setInlineError(f.querySelector('[name="address"]'), 'Vui lòng nhập địa chỉ giao hàng');
      hasError = true;
    } else if (address.length < 8) {
      setInlineError(f.querySelector('[name="address"]'), 'Địa chỉ giao hàng phải từ 8 ký tự trở lên');
      hasError = true;
    }

    if (hasError) {
      var firstErr = f.querySelector('.is-invalid');
      if (firstErr) firstErr.focus();
      return;
    }

    var lineErrors = false;
    createLines.forEach(function (line, idx) {
      var productSelect = f.querySelectorAll('.order-line-product')[idx];
      var qtyInput = f.querySelectorAll('.order-line-qty')[idx];

      if (!line.productId) {
        if (productSelect) {
          setInlineError(productSelect, 'Vui lòng chọn sản phẩm');
          lineErrors = true;
        }
      } else {
        var qty = parseInt(line.qty, 10);
        var p = getProductById(line.productId);
        var v = null;
        if (p && p.variants) {
          v = p.variants.find(function (x) { return String(x.id) === String(line.variantId); });
        }

        if (isNaN(qty) || qty < 1) {
          if (qtyInput) {
            setInlineError(qtyInput, 'Số lượng phải từ 1 trở lên');
            lineErrors = true;
          }
        } else if (v && qty > (v.stock || 0)) {
          var maxStock = v.stock || 0;
          line.qty = maxStock;
          if (qtyInput) qtyInput.value = maxStock;
          updateLineSubtotal(qtyInput ? qtyInput.closest('.order-line') : null, idx);
          adminToast('Số lượng sản phẩm "' + p.name + '" vượt quá tồn kho, tự động giảm về ' + maxStock + ' chiếc', 'warning');
        }
      }
    });

    if (lineErrors) {
      var firstErr = f.querySelector('.is-invalid');
      if (firstErr) firstErr.focus();
      return;
    }

    var itemsMap = {};
    createLines.forEach(function (line) {
      if (line.productId && line.variantId && line.qty > 0) {
        var p = getProductById(line.productId);
        var size = 'Default';
        if (p && p.variants) {
          var v = p.variants.find(function (x) { return String(x.id) === String(line.variantId); });
          if (v) {
            size = v.sizeName || v.SizeName || (v.size && (v.size.name || v.size.Name)) || 'Default';
          }
        }
        var key = line.productId + '--' + size;
        var qty = parseInt(line.qty, 10) || 1;
        if (itemsMap[key]) {
          itemsMap[key] += qty;
        } else {
          itemsMap[key] = qty;
        }
      }
    });

    var items = [];
    for (var key in itemsMap) {
      if (itemsMap.hasOwnProperty(key)) {
        var parts = key.split('--');
        items.push({
          id: parseInt(parts[0], 10),
          size: parts[1] === 'Default' ? null : parts[1],
          qty: itemsMap[key]
        });
      }
    }

    if (!items.length) { adminToast('Vui lòng chọn ít nhất một sản phẩm', 'warning'); return; }

    var btn = document.getElementById('btn-save-order');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }

    AdminData.orders.create({
      customer: customer,
      phone: phone,
      email: email,
      address: address,
      customerNote: note || null,
      status: status,
      items: items
    }).then(function (created) {
      switchTab('all');
      AdminData.orders.updatePendingBadge();
      closeModal('orderCreateModal');
      adminToast('Đã tạo đơn hàng ' + created.id, 'success');
    }).catch(function (err) {
      adminToast(err.message || 'Không thể tạo đơn hàng', 'error');
    }).finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Tạo đơn hàng'; }
    });
  }

  function updateLineSubtotal(lineRowEl, idx) {
    if (!lineRowEl) return;
    var line = createLines[idx];
    var p = getProductById(line.productId);
    var price = 0;
    if (p) {
      var v = findMatchingVariant(p, line);
      if (v) price = v.price || 0;
    }
    var sub = price > 0 && line.qty > 0 ? AdminData.fmt(price * line.qty) : '—';

    var subEl = lineRowEl.querySelector('.order-line__subtotal');
    if (subEl) subEl.textContent = sub;

    var totalEl = document.getElementById('order-create-total');
    if (totalEl) totalEl.textContent = AdminData.fmt(calcCreateTotal());
  }

  function saveInlineNote(id, note, inputEl) {
    var o = orders.find(function (x) { return x.id === id; });
    if (!o) return;
    if ((o.adminNote || '') === note) return;

    AdminData.orders.updateNote(id, note).then(function () {
      o.adminNote = note;
      adminToast('Đã lưu ghi chú nội bộ đơn hàng #' + id, 'success');
      if (inputEl) {
        inputEl.style.transition = 'background-color 0.3s ease';
        inputEl.style.backgroundColor = '#d1fae5'; // soft green
        setTimeout(function () {
          inputEl.style.backgroundColor = '';
        }, 800);
      }
    }).catch(function (err) {
      adminToast('Lỗi lưu ghi chú: ' + (err.message || 'thất bại'), 'error');
      if (inputEl) {
        inputEl.style.transition = 'background-color 0.3s ease';
        inputEl.style.backgroundColor = '#fee2e2'; // soft red
        setTimeout(function () {
          inputEl.style.backgroundColor = '';
        }, 800);
      }
    });
  }

  function bindEvents() {
    window.addEventListener('hashchange', function () {
      var hashStatus = getStatusFromHash();
      if (filterStatus !== hashStatus) {
        switchTab(hashStatus);
      }
    });

    var search = document.getElementById('order-search');
    if (search) search.addEventListener('input', function () { searchQ = search.value; currentPage = 1; fetchAndRenderTable(); });

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

    if (dateFrom) dateFrom.addEventListener('change', function () { filterDateFrom = this.value; updateClearDateBtn(); currentPage = 1; fetchAndRenderTable(); });
    if (dateTo) dateTo.addEventListener('change', function () { filterDateTo = this.value; updateClearDateBtn(); currentPage = 1; fetchAndRenderTable(); });

    if (btnClearDate) {
      btnClearDate.addEventListener('click', function () {
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        filterDateFrom = '';
        filterDateTo = '';
        updateClearDateBtn();
        currentPage = 1;
        fetchAndRenderTable();
      });
    }

    var pageSizeSel = document.getElementById('page-size-select');
    if (pageSizeSel) pageSizeSel.addEventListener('change', function () {
      pageSize = parseInt(this.value, 10) || 10;
      currentPage = 1;
      fetchAndRenderTable();
    });

    document.querySelectorAll('th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = this.dataset.sort;
        if (sortCol === col) {
          sortDesc = !sortDesc;
        } else {
          sortCol = col;
          sortDesc = true;
        }

        document.querySelectorAll('th.sortable .sort-icon').forEach(function (icon) {
          icon.textContent = '↕';
          icon.style.color = '#aaa';
        });
        var currentIcon = this.querySelector('.sort-icon');
        if (currentIcon) {
          currentIcon.textContent = sortDesc ? '↓' : '↑';
          currentIcon.style.color = 'var(--accent)';
        }

        currentPage = 1;
        fetchAndRenderTable();
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
      tbody.addEventListener('click', function (e) {
        var viewBtn = e.target.closest('.btn-view-order');
        if (viewBtn) viewOrder(viewBtn.dataset.id);

        var approveCancelBtn = e.target.closest('.btn-quick-approve-cancel');
        if (approveCancelBtn) {
          window.approveCancel(approveCancelBtn.dataset.id);
        }

        var rejectCancelBtn = e.target.closest('.btn-quick-reject-cancel');
        if (rejectCancelBtn) {
          window.rejectCancel(rejectCancelBtn.dataset.id);
        }

        var confirmBtn = e.target.closest('.btn-quick-confirm');
        if (confirmBtn) {
          var id = confirmBtn.dataset.id;
          adminConfirm('Bạn có chắc chắn muốn DUYỆT đơn hàng #' + id + ' không?', function () {
            updateOrderStatus(id, 'confirmed');
          }, { title: 'Duyệt đơn hàng nhanh', type: 'warning', okText: 'Duyệt đơn' });
        }

        var shipBtn = e.target.closest('.btn-quick-ship');
        if (shipBtn) {
          var id = shipBtn.dataset.id;
          adminConfirm('Bạn có chắc chắn muốn chuyển đơn hàng #' + id + ' sang ĐANG GIAO HÀNG?', function () {
            updateOrderStatus(id, 'shipping');
          }, { title: 'Giao đơn hàng nhanh', type: 'info', okText: 'Giao hàng' });
        }

        var completeBtn = e.target.closest('.btn-quick-complete');
        if (completeBtn) {
          var id = completeBtn.dataset.id;
          adminConfirm('Bạn có chắc chắn muốn HOÀN THÀNH đơn hàng #' + id + '?', function () {
            return updateOrderStatus(id, 'completed');
          }, { title: 'Hoàn thành đơn nhanh', type: 'success', okText: 'Hoàn thành' });
        }

        var cancelBtn = e.target.closest('.btn-quick-cancel');
        if (cancelBtn) {
          var id = cancelBtn.dataset.id;
          adminConfirm('Bạn có chắc chắn muốn HỦY đơn hàng #' + id + ' không?\nHành động này không thể hoàn tác!', function () {
            updateOrderStatus(id, 'cancelled');
          }, { title: 'Hủy đơn hàng', type: 'danger', okText: 'Hủy đơn' });
        }

        var deleteBtn = e.target.closest('.btn-delete-order');
        if (deleteBtn && !deleteBtn.disabled) {
          var id = deleteBtn.dataset.id;
          if (id) {
            adminConfirm('Bạn có chắc chắn muốn XÓA đơn hàng #' + id + ' không?\nHành động này không thể hoàn tác!', function () {
              deleteOrder(id);
            }, { title: 'Xóa đơn hàng', type: 'danger', okText: 'Xóa đơn' });
          }
        }

        var isAction = e.target.closest('button, a, input, select, textarea, .customer-note-tooltip-wrap');
        var tr = e.target.closest('tr[data-id]');
        if (tr && !isAction) {
          viewOrder(tr.dataset.id);
        }
      });

      tbody.addEventListener('focusout', function (e) {
        var input = e.target.closest('.table-note-input');
        if (input) {
          saveInlineNote(input.dataset.id, input.value.trim(), input);
        }
      });

      tbody.addEventListener('keydown', function (e) {
        var input = e.target.closest('.table-note-input');
        if (input && e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        }
      });
    }

    var detailSel = document.getElementById('order-detail-status-select');
    var confirmBtn = document.getElementById('btn-confirm-status');
    if (confirmBtn && detailSel) {
      confirmBtn.addEventListener('click', function () {
        var id = detailSel.dataset.id;
        var newStatus = detailSel.value;

        var o = orders.find(function (x) { return x.id === id; });
        var oldLabel = o ? AdminData.getStatusLabel(o.status) : '';
        var newLabel = AdminData.getStatusLabel(newStatus);

        if (o && o.status === newStatus) {
          closeModal('orderDetailModal');
          return;
        }

        var msg = 'Bạn có chắc chắn muốn chuyển trạng thái đơn hàng #' + id + ' từ "' + oldLabel + '" sang "' + newLabel + '" không?';
        var confirmType = 'warning';
        var okText = 'Cập nhật';
        if (newStatus === 'cancelled') {
          confirmType = 'danger';
          okText = 'Hủy đơn';
        } else if (newStatus === 'completed') {
          confirmType = 'success';
          okText = 'Hoàn thành';
        } else if (newStatus === 'shipping') {
          confirmType = 'info';
          okText = 'Giao hàng';
        }

        adminConfirm(msg, function () {
          if (newStatus === 'completed') {
            return updateOrderStatus(id, newStatus).then(function() {
              closeModal('orderDetailModal');
            });
          } else {
            updateOrderStatus(id, newStatus);
            closeModal('orderDetailModal');
          }
        }, { title: 'Cập nhật trạng thái đơn', type: confirmType, okText: okText });
      });
    }

    var addBtn = document.getElementById('btn-add-order');
    if (addBtn) addBtn.addEventListener('click', openCreateModal);

    var addLineBtn = document.getElementById('btn-add-order-line');
    if (addLineBtn) addLineBtn.addEventListener('click', function () {
      createLines.push({ productId: '', variantId: '', qty: 1 });
      renderCreateLines();
    });

    // Xử lý click ảnh sản phẩm trong dropdown bằng capture phase (trước stopPropagation)
    document.addEventListener('click', function (e) {
      var imgWrap = e.target.closest('.js-img-zoom');
      if (imgWrap) {
        e.stopPropagation();
        var key = imgWrap.dataset.variantkey;
        var imgs = key ? (_productImagesMap[key] || []) : [];
        if (imgs.length > 0 && window.openAdminLightbox) {
          window.openAdminLightbox(imgs, 0);
        }
      }
    }, true); // capture phase - chạy trước khi custom-select stopPropagation



    var linesWrap = document.getElementById('order-create-lines');
    if (linesWrap) {
      linesWrap.addEventListener('input', function (e) {
        var qtyInp = e.target.closest('.order-line-qty');
        if (qtyInp) {
          var idx = +qtyInp.dataset.idx;
          var val = parseInt(qtyInp.value, 10);
          if (val && val > 0) {
            createLines[idx].qty = val;
            validateLineQty(qtyInp, idx);
            updateLineSubtotal(qtyInp.closest('.order-line'), idx);
          }
        }
      });

      linesWrap.addEventListener('change', function (e) {
        var prodSel = e.target.closest('.order-line-product');
        var qtyInp = e.target.closest('.order-line-qty');
        if (prodSel) {
          var idx = +prodSel.dataset.idx;
          var val = prodSel.value;
          if (val) {
            var parts = val.split('--');
            var pId = parts[0];
            var vId = parts[1] || '';

            // Check for duplicate variant in other lines
            var isDuplicate = createLines.some(function (line, lineIdx) {
              return lineIdx !== idx && String(line.productId) === String(pId) && String(line.variantId) === String(vId);
            });

            if (isDuplicate) {
              adminToast('Sản phẩm và phiên bản này đã được chọn ở dòng khác!', 'warning');
              prodSel.selectedIndex = 0;
              createLines[idx].productId = '';
              createLines[idx].variantId = '';
              prodSel.dispatchEvent(new Event('change'));
              return;
            }

            createLines[idx].productId = pId;
            createLines[idx].variantId = vId;
          } else {
            createLines[idx].productId = '';
            createLines[idx].variantId = '';
          }
          clearInlineErrors(prodSel.parentNode);
          updateLineSubtotal(prodSel.closest('.order-line'), idx);

          var lineRow = prodSel.closest('.order-line');
          if (lineRow) {
            var lineQtyInp = lineRow.querySelector('.order-line-qty');
            if (lineQtyInp) {
              validateLineQty(lineQtyInp, idx);
            }
          }
        }
        if (qtyInp) {
          var idx = +qtyInp.dataset.idx;
          createLines[idx].qty = Math.max(1, parseInt(qtyInp.value, 10) || 1);
          qtyInp.value = createLines[idx].qty;
          validateLineQty(qtyInp, idx);
          updateLineSubtotal(qtyInp.closest('.order-line'), idx);
        }
      });

      linesWrap.addEventListener('click', function (e) {
        var rm = e.target.closest('.btn-remove-line');
        if (rm && !rm.disabled) {
          createLines.splice(+rm.dataset.idx, 1);
          if (!createLines.length) createLines.push({ productId: '', variantId: '', qty: 1 });
          renderCreateLines();
        }
      });
    }

    var saveBtn = document.getElementById('btn-save-order');
    if (saveBtn) saveBtn.addEventListener('click', saveNewOrder);

    ['customer', 'phone', 'email'].forEach(function (fieldName) {
      var el = document.querySelector('#order-create-form [name="' + fieldName + '"]');
      if (el) {
        el.addEventListener('change', function (e) {
          autofillCustomerInfo(e.target.value.trim());
        });
      }
    });

    var fCreateOrder = document.getElementById('order-create-form');
    if (fCreateOrder) {
      var validateOrderField = function (el) {
        if (!el.classList.contains('is-invalid') && !el.closest('.custom-select-wrapper')?.classList.contains('is-invalid')) {
          return;
        }
        var name = el.name;
        var val = el.value.trim();
        var isValid = true;
        var errorMsg = '';

        if (name === 'customer') {
          if (!val) {
            errorMsg = 'Vui lòng nhập họ và tên khách hàng';
            isValid = false;
          } else if (val.length < 2) {
            errorMsg = 'Họ và tên khách hàng phải từ 2 ký tự trở lên';
            isValid = false;
          } else if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(val)) {
            errorMsg = 'Họ và tên không được chứa số hoặc ký tự đặc biệt';
            isValid = false;
          }
        } else if (name === 'phone') {
          var cleanPhone = val.replace(/\D/g, '');
          if (cleanPhone.startsWith('84')) {
            cleanPhone = '0' + cleanPhone.slice(2);
          }
          var phoneRegex = /^0[1-9][0-9]{8,9}$/;
          if (!val) {
            errorMsg = 'Vui lòng nhập số điện thoại';
            isValid = false;
          } else if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
            errorMsg = 'Số điện thoại không hợp lệ (Phải từ 10-11 số)';
            isValid = false;
          }
        } else if (name === 'email') {
          var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (val && !emailRegex.test(val)) {
            errorMsg = 'Email không đúng định dạng';
            isValid = false;
          }
        } else if (name === 'address') {
          if (!val) {
            errorMsg = 'Vui lòng nhập địa chỉ giao hàng';
            isValid = false;
          } else if (val.length < 8) {
            errorMsg = 'Địa chỉ giao hàng phải từ 8 ký tự trở lên';
            isValid = false;
          }
        }

        if (isValid) {
          el.classList.remove('is-invalid');
          var sibling = el.nextElementSibling;
          if (sibling && sibling.classList.contains('form-error')) sibling.remove();
        } else {
          var sibling = el.nextElementSibling;
          if (sibling && sibling.classList.contains('form-error')) {
            sibling.textContent = errorMsg;
          }
        }
      };

      fCreateOrder.addEventListener('input', function (e) {
        validateOrderField(e.target);
      });
      fCreateOrder.addEventListener('change', function (e) {
        validateOrderField(e.target);
      });
    }

    document.querySelectorAll('[data-close-modal="orderCreateModal"]').forEach(function (btn) {
      btn.addEventListener('click', resetCreateForm);
    });
  }

  // ── Register Global SignalR Notification Listener ──
  window.onAdminNotification = function (eventType, message) {
    if (eventType === 'OrderPlaced' || eventType === 'OrderStatusChanged' || eventType === 'OrderDeleted' || eventType === 'OrderCancelled' || eventType === 'CancelRequested' || eventType === 'FallbackPoll') {
      AdminData.orders.load().then(function (newOrders) {
        orders = newOrders.data || newOrders;
        renderStatusTabs();
        renderTable();
        AdminData.orders.updatePendingBadge(orders);
      });
    }
  };

  // --- Bulk Actions UI Logic ---
  window.updateBulkActionsUI = function() {
    var checkboxes = document.querySelectorAll('.order-item-checkbox');
    var checkedBoxes = document.querySelectorAll('.order-item-checkbox:checked');
    var bar = document.getElementById('bulk-actions-bar');
    var countSpan = document.getElementById('bulk-selected-count');
    var checkAll = document.getElementById('check-all-orders');
    
    if (checkedBoxes.length > 0) {
      if (bar) bar.classList.add('show');
      if (countSpan) countSpan.textContent = 'Đã chọn ' + checkedBoxes.length + ' đơn hàng';
    } else {
      if (bar) bar.classList.remove('show');
    }
    
    if (checkAll) {
      checkAll.checked = (checkboxes.length > 0 && checkedBoxes.length === checkboxes.length);
      checkAll.indeterminate = (checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length);
    }
  };

  function getSelectedOrderIds() {
    var ids = [];
    document.querySelectorAll('.order-item-checkbox:checked').forEach(function(cb) {
      ids.push(cb.dataset.id);
    });
    return ids;
  }

  function executeBulkStatus(status) {
    var ids = getSelectedOrderIds();
    if (!ids.length) return;
    var statusLabel = AdminData.getStatusLabel(status);
    adminConfirm('Bạn có chắc chắn muốn chuyển ' + ids.length + ' đơn hàng sang trạng thái "' + statusLabel + '"?', function() {
      AdminData.orders.bulkStatus(ids, status).then(function() {
        adminToast('Đã chuyển ' + ids.length + ' đơn hàng sang "' + statusLabel + '"', 'success');
        return AdminData.orders.load().then(function(newOrders) {
          orders = newOrders.data || newOrders;
          renderStatusTabs();
          renderTable();
          AdminData.orders.updatePendingBadge(orders);
        });
      }).catch(function(e) {
        adminToast(e.message || 'Lỗi cập nhật hàng loạt', 'error');
      });
    }, { title: 'Cập nhật nhiều đơn hàng', type: 'warning', okText: 'Cập nhật' });
  }

  function executeBulkDelete() {
    var ids = getSelectedOrderIds();
    if (!ids.length) return;
    adminConfirm('Bạn có chắc chắn muốn XÓA ' + ids.length + ' đơn hàng không?\nHành động này không thể hoàn tác!', function() {
      AdminData.orders.bulkDelete(ids).then(function() {
        adminToast('Đã xóa ' + ids.length + ' đơn hàng', 'success');
        return AdminData.orders.load().then(function(newOrders) {
          orders = newOrders.data || newOrders;
          renderStatusTabs();
          renderTable();
          AdminData.orders.updatePendingBadge(orders);
        });
      }).catch(function(e) {
        adminToast(e.message || 'Lỗi xóa hàng loạt', 'error');
      });
    }, { title: 'Xóa nhiều đơn hàng', type: 'danger', okText: 'Xóa đơn' });
  }

  function executeBulkPdf() {
    var ids = getSelectedOrderIds();
    if (!ids.length) return;
    
    adminConfirm('Bạn muốn xuất hóa đơn PDF cho ' + ids.length + ' đơn hàng đã chọn?\nHệ thống sẽ tải xuống từng file một.', function() {
      var token = window.getAdminSession ? window.getAdminSession().token : '';
      var delay = 0;
      
      ids.forEach(function(id, index) {
        setTimeout(function() {
          fetch('/api/admin/orders/' + id + '/invoice', {
            headers: { 'Authorization': 'Bearer ' + token }
          })
          .then(function(res) {
            if (!res.ok) throw new Error('Lỗi');
            return res.blob();
          })
          .then(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'HoaDon_' + id + '.pdf';
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
          })
          .catch(function() {
            adminToast('Lỗi tải hóa đơn ' + id, 'error');
          });
        }, delay);
        delay += 800; // Delay 800ms between each download to prevent browser blocking
      });
      adminToast('Đang tiến hành tải xuống ' + ids.length + ' hóa đơn...', 'info');
    }, { title: 'In hóa đơn hàng loạt', type: 'info', okText: 'In PDF' });
  }

  function executeBulkExcel() {
    var ids = getSelectedOrderIds();
    if (!ids.length) return;
    
    var selectedOrders = orders.filter(function(o) { return ids.includes(o.id.toString()); });
    
    // Create CSV content (UTF-8 with BOM for Excel)
    var csvContent = '\uFEFF'; 
    csvContent += "Mã đơn,Khách hàng,Số điện thoại,Email,Tổng tiền,Ngày đặt,Trạng thái\n";
    
    selectedOrders.forEach(function(o) {
      var row = [
        o.id,
        '"' + (o.customer || '').replace(/"/g, '""') + '"',
        '"' + (o.phone || '') + '"',
        '"' + (o.email || '') + '"',
        o.total,
        '"' + AdminData.fmtDate(o.date) + '"',
        AdminData.getStatusLabel(o.status)
      ];
      csvContent += row.join(',') + "\n";
    });
    
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'DonHang_Export_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    
    adminToast('Đã xuất Excel (CSV) thành công', 'success');
  }

  function startApp() {
    init();
    
    var checkAllBtn = document.getElementById('check-all-orders');
    if (checkAllBtn) {
      checkAllBtn.addEventListener('change', function() {
        var isChecked = this.checked;
        document.querySelectorAll('.order-item-checkbox').forEach(function(cb) {
          cb.checked = isChecked;
        });
        updateBulkActionsUI();
      });
    }

    var tbody = document.getElementById('orders-table-body');
    if (tbody) {
      tbody.addEventListener('change', function(e) {
        if (e.target.classList.contains('order-item-checkbox')) {
          updateBulkActionsUI();
        }
      });
    }

    var btnBulkStatus = document.getElementById('btn-bulk-status');
    if (btnBulkStatus) {
      btnBulkStatus.addEventListener('click', function() {
        var sel = document.getElementById('bulk-status-select');
        var status = sel ? sel.value : '';
        if (!status) {
          adminToast('Vui lòng chọn trạng thái muốn cập nhật', 'warning');
          return;
        }
        executeBulkStatus(status);
      });
    }

    var btnBulkClose = document.getElementById('btn-bulk-close');
    if (btnBulkClose) {
      btnBulkClose.addEventListener('click', function() {
        var checkAllBtn = document.getElementById('check-all-orders');
        if (checkAllBtn) {
          checkAllBtn.checked = false;
          checkAllBtn.dispatchEvent(new Event('change'));
        }
      });
    }

    var bulkDeleteBtn = document.getElementById('btn-bulk-delete');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', executeBulkDelete);
    }
    
    var bulkPdfBtn = document.getElementById('btn-bulk-pdf');
    if (bulkPdfBtn) {
      bulkPdfBtn.addEventListener('click', executeBulkPdf);
    }
    
    var bulkExcelBtn = document.getElementById('btn-bulk-excel');
    if (bulkExcelBtn) {
      bulkExcelBtn.addEventListener('click', executeBulkExcel);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
}());

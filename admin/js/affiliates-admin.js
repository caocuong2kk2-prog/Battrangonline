var isLiveServer = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055' && window.location.port !== '7275';
var API_BASE = isLiveServer ? 'http://localhost:5055/api' : '/api';
var allAffiliates = [];
var allWithdrawals = [];
var allAdminCommissions = [];
var affiliatesSortCol = '';
var affiliatesSortDesc = false;
var currentAffiliatePage = 1;
var currentCommissionPage = 1;
var currentWithdrawalPage = 1;
var adminPageSize = 20;
var commissionReturnPeriodDays = 7; // Default value

function getTierIconAdmin(tier) {
    if (tier === 'Kim Cương' || tier === 'VIP') return '💎';
    if (tier === 'Vàng') return '🥇';
    if (tier === 'Bạc') return '🥈';
    return '🌱';
}

document.addEventListener('DOMContentLoaded', function () {
    var urlParams = new URLSearchParams(window.location.search);
    var tab = urlParams.get('tab') || 'tab-ctv';

    if (typeof showTab === 'function') {
        showTab(tab);
    } else {
        window.loadTab(tab);
    }

    var searchInput = document.getElementById('ctv-search');
    if (searchInput) {
        searchInput.addEventListener('input', function () { currentAffiliatePage = 1; renderAffiliatesTable(); });
    }

    var statusFilter = document.getElementById('ctv-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function () { currentAffiliatePage = 1; renderAffiliatesTable(); });
    }

    var tierFilter = document.getElementById('ctv-tier-filter');
    if (tierFilter) {
        tierFilter.addEventListener('change', function () { currentAffiliatePage = 1; renderAffiliatesTable(); });
    }

    var commSearchInput = document.getElementById('commissions-search');
    if (commSearchInput) {
        commSearchInput.addEventListener('input', function () { currentCommissionPage = 1; window.renderAllCommissionsTable(); });
    }

    var commStatusFilter = document.getElementById('commissions-status-filter');
    if (commStatusFilter) {
        commStatusFilter.addEventListener('change', function () { currentCommissionPage = 1; window.renderAllCommissionsTable(); });
    }

    var wdSearchInput = document.getElementById('withdrawals-search');
    if (wdSearchInput) {
        wdSearchInput.addEventListener('input', function () { currentWithdrawalPage = 1; renderWithdrawalsTable(); });
    }

    var wdStatusFilter = document.getElementById('withdrawals-status-filter');
    if (wdStatusFilter) {
        wdStatusFilter.addEventListener('change', function () { currentWithdrawalPage = 1; renderWithdrawalsTable(); });
    }

    document.querySelectorAll('#tab-ctv .sortable').forEach(th => {
        th.addEventListener('click', function () {
            var sort = this.getAttribute('data-sort');
            if (affiliatesSortCol === sort) {
                affiliatesSortDesc = !affiliatesSortDesc;
            } else {
                affiliatesSortCol = sort;
                affiliatesSortDesc = true;
            }
            document.querySelectorAll('#tab-ctv .sortable .sort-icon').forEach(icon => {
                icon.innerHTML = '↕';
                icon.style.color = '#aaa';
            });
            var icon = this.querySelector('.sort-icon');
            if (icon) {
                icon.innerHTML = affiliatesSortDesc ? '↓' : '↑';
                icon.style.color = 'var(--accent)';
            }
            renderAffiliatesTable();
        });
    });

    window.addEventListener('pgt_signalr_update', function (e) {
        if (e.detail && e.detail.type === 'WithdrawalRequested') {
            // Tải lại riêng phần withdrawals để update realtime
            loadWithdrawals();
        } else if (e.detail && (e.detail.type === 'AffiliateRegistered' || e.detail.type === 'CommissionCreated')) {
            loadAffiliates();
        }
    });
});

var _initialLoadDone = false;

window.loadTab = function (tabId) {
    if (!_initialLoadDone) {
        _initialLoadDone = true;
        loadAffiliates();
        if (tabId === 'tab-settings') {
            loadAffiliateSettings();
        }
        return;
    }

    if (tabId === 'tab-ctv') {
        loadAffiliates();
    } else if (tabId === 'tab-commissions') {
        loadAffiliates();
    } else if (tabId === 'tab-withdrawals') {
        loadWithdrawals();
    } else if (tabId === 'tab-settings') {
        loadAffiliateSettings();
    }
};

window.loadAffiliateSettings = function () {
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';
    var apiUrl = API_BASE + '/site-config';

    fetch(apiUrl, { headers: { 'Authorization': 'Bearer ' + token } })
        .then(res => res.json())
        .then(config => {
            document.getElementById('affiliate-cookie-days').value = config.affiliateCookieDays || '30';

            let silverMin = document.getElementById('affiliate-tier-silver-min');
            silverMin.value = config.AffiliateTierSilverMinRevenue || '15000000';
            formatVNDInput(silverMin);

            document.getElementById('affiliate-tier-silver-bonus').value = config.AffiliateTierSilverBonus || '2';

            let goldMin = document.getElementById('affiliate-tier-gold-min');
            goldMin.value = config.AffiliateTierGoldMinRevenue || '50000000';
            formatVNDInput(goldMin);

            document.getElementById('affiliate-tier-gold-bonus').value = config.AffiliateTierGoldBonus || '3';

            let diamondMin = document.getElementById('affiliate-tier-diamond-min');
            diamondMin.value = config.AffiliateTierDiamondMinRevenue || '150000000';
            formatVNDInput(diamondMin);

            document.getElementById('affiliate-tier-diamond-bonus').value = config.AffiliateTierDiamondBonus || '5';

            let autoApprove = document.getElementById('commission-auto-approve');
            if (autoApprove) autoApprove.checked = config.CommissionAutoApprove === 'true';

            let returnPeriod = document.getElementById('commission-return-period-days');
            if (returnPeriod) returnPeriod.value = config.CommissionReturnPeriodDays || '7';
        })
        .catch(err => {
            console.error(err);
            adminToast('Lỗi tải cấu hình hệ thống', 'error');
        });
};

window.formatVNDInput = function (input) {
    let val = input.value.replace(/\D/g, ''); // Loại bỏ tất cả ký tự không phải số
    if (val) {
        val = parseInt(val, 10).toLocaleString('vi-VN');
    }
    input.value = val;
};

window.jumpToTab = function (tabId, affiliateCode) {
    if (typeof showTab === 'function') {
        showTab(tabId);
    } else {
        window.loadTab(tabId);
    }

    setTimeout(() => {
        if (tabId === 'tab-commissions') {
            var searchInput = document.getElementById('commissions-search');
            if (searchInput) {
                searchInput.value = affiliateCode;
                searchInput.dispatchEvent(new Event('input'));
            }

            var statusFilter = document.getElementById('commissions-status-filter');
            if (statusFilter) {
                statusFilter.value = 'Pending';
                statusFilter.dispatchEvent(new Event('change'));
            }
        } else if (tabId === 'tab-withdrawals') {
            var searchInput = document.getElementById('withdrawals-search');
            if (searchInput) {
                searchInput.value = affiliateCode;
                searchInput.dispatchEvent(new Event('input'));
            }

            var statusFilter = document.getElementById('withdrawals-status-filter');
            if (statusFilter) {
                statusFilter.value = 'Pending';
                statusFilter.dispatchEvent(new Event('change'));
            }
        }
    }, 50);
};

window.saveAffiliateSettings = function () {
    var days = document.getElementById('affiliate-cookie-days').value.trim();
    var silverMin = document.getElementById('affiliate-tier-silver-min').value.replace(/\./g, '').trim();
    var silverBonus = document.getElementById('affiliate-tier-silver-bonus').value.trim();
    var goldMin = document.getElementById('affiliate-tier-gold-min').value.replace(/\./g, '').trim();
    var goldBonus = document.getElementById('affiliate-tier-gold-bonus').value.trim();
    var diamondMin = document.getElementById('affiliate-tier-diamond-min').value.replace(/\./g, '').trim();
    var diamondBonus = document.getElementById('affiliate-tier-diamond-bonus').value.trim();

    var autoApprove = document.getElementById('commission-auto-approve')?.checked ? 'true' : 'false';
    var returnPeriod = document.getElementById('commission-return-period-days')?.value.trim() || '7';

    var apiUrl = API_BASE + '/site-config';
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';

    // Đọc cấu hình hiện tại để không ghi đè mất
    fetch(apiUrl)
        .then(res => res.json())
        .then(config => {
            config.affiliateCookieDays = days;
            config.AffiliateTierSilverMinRevenue = silverMin;
            config.AffiliateTierSilverBonus = silverBonus;
            config.AffiliateTierGoldMinRevenue = goldMin;
            config.AffiliateTierGoldBonus = goldBonus;
            config.AffiliateTierDiamondMinRevenue = diamondMin;
            config.AffiliateTierDiamondBonus = diamondBonus;

            config.CommissionAutoApprove = autoApprove;
            config.CommissionReturnPeriodDays = returnPeriod;

            return fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
        })
        .then(res => {
            if (res.status === 403) throw new Error('Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin).');
            if (!res.ok) throw new Error('Lỗi cập nhật API');
            adminToast('Lưu cấu hình thành công', 'success');
        })
        .catch(err => {
            console.error(err);
            adminToast(err.message || 'Lỗi lưu cấu hình', 'error');
        });
};

function loadAffiliates() {
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';

    Promise.all([
        fetch(API_BASE + '/admin/affiliates', { headers: { 'Authorization': 'Bearer ' + token } }).then(res => res.json()),
        fetch(API_BASE + '/admin/affiliates/withdrawals', { headers: { 'Authorization': 'Bearer ' + token } }).then(res => res.json()),
        fetch(API_BASE + '/admin/affiliates/commissions', { headers: { 'Authorization': 'Bearer ' + token } }).then(res => res.json()),
        fetch(API_BASE + '/site-config', { headers: { 'Authorization': 'Bearer ' + token } }).then(res => res.json())
    ])
        .then(([affiliatesData, withdrawalsData, commissionsData, configData]) => {
            allAffiliates = affiliatesData || [];
            allWithdrawals = withdrawalsData || [];
            allAdminCommissions = commissionsData || [];
            commissionReturnPeriodDays = parseInt(configData?.CommissionReturnPeriodDays) || 7;

            updateStats();
            updateWithdrawalTabBadge();
            updateCommissionsTabBadge();
            renderAffiliatesTable();

            var activeTab = document.querySelector('.card-header .btn.active');
            if (activeTab && activeTab.getAttribute('onclick').includes('tab-withdrawals')) {
                renderWithdrawalsTable();
            } else if (activeTab && activeTab.getAttribute('onclick').includes('tab-commissions')) {
                renderAllCommissionsTable();
            }
        })
        .catch(err => {
            console.error(err);
            adminToast('Lỗi tải dữ liệu', 'error');
        });
}

function updateCommissionsTabBadge() {
    var badge = document.getElementById('commissions-count-badge');
    if (badge) {
        var count = allAdminCommissions.filter(c => c.status === 'Pending').length;
        if (count > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }
    // Cập nhật cả sidebar badge
    var sbBadge = document.getElementById('sb-affiliates');
    if (sbBadge) {
        var pendingWithdrawals = allWithdrawals.filter(w => w.status === 'Pending').length;
        var pendingCommissions = allAdminCommissions.filter(c => c.status === 'Pending').length;
        var pendingAffiliates = allAffiliates.filter(a => a.status === 'Pending').length;
        var totalPending = pendingWithdrawals + pendingCommissions + pendingAffiliates;

        if (totalPending > 0) {
            sbBadge.style.display = 'inline-flex';
            sbBadge.textContent = totalPending;
        } else {
            sbBadge.style.display = 'none';
        }
    }
}

function updateStats() {
    var totalCtv = allAffiliates.length;
    var activeCtv = allAffiliates.filter(a => a.status === 'Active').length;
    var pendingCtv = allAffiliates.filter(a => a.status === 'Pending').length;
    var pendingWithdrawals = allWithdrawals.filter(w => w.status === 'Pending').length;

    var elTotal = document.getElementById('kpi-total-ctv');
    var elActive = document.getElementById('kpi-active-ctv');
    var elPending = document.getElementById('kpi-pending-ctv');
    var elWithdrawals = document.getElementById('kpi-pending-withdrawals');

    if (elTotal) elTotal.textContent = totalCtv;
    if (elActive) elActive.textContent = activeCtv;
    if (elPending) elPending.textContent = pendingCtv;
    if (elWithdrawals) elWithdrawals.textContent = pendingWithdrawals;
}

function updateWithdrawalTabBadge() {
    var pendingWithdrawalsCount = allWithdrawals.filter(w => w.status === 'Pending').length;
    var badge = document.getElementById('withdrawals-count-badge');
    if (badge) {
        if (pendingWithdrawalsCount > 0) {
            badge.textContent = pendingWithdrawalsCount;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderAffiliatesTable() {
    var tbody = document.getElementById('ctv-table-body');
    if (!tbody) return;

    var searchQ = (document.getElementById('ctv-search')?.value || '').toLowerCase();
    var filterStatus = document.getElementById('ctv-status-filter')?.value || 'all';
    var filterTier = document.getElementById('ctv-tier-filter')?.value || 'all';

    var filtered = allAffiliates.filter(a => {
        var matchQ = !searchQ ||
            (a.customerName && a.customerName.toLowerCase().includes(searchQ)) ||
            (a.customerEmail && a.customerEmail.toLowerCase().includes(searchQ)) ||
            (a.affiliateCode && a.affiliateCode.toLowerCase().includes(searchQ));

        var matchStatus = filterStatus === 'all' || a.status === filterStatus;
        var matchTier = filterTier === 'all' || (a.tier || 'Thường') === filterTier;
        return matchQ && matchStatus && matchTier;
    });

    if (affiliatesSortCol) {
        filtered.sort((a, b) => {
            var valA = 0, valB = 0;
            if (affiliatesSortCol === 'sales') {
                valA = a.totalSales || 0;
                valB = b.totalSales || 0;
            } else if (affiliatesSortCol === 'orders') {
                valA = a.totalOrdersCount || 0;
                valB = b.totalOrdersCount || 0;
            } else if (affiliatesSortCol === 'commission') {
                valA = a.totalCommission || 0;
                valB = b.totalCommission || 0;
            } else if (affiliatesSortCol === 'tier') {
                var tierVals = { 'Thường': 1, 'Vàng': 2, 'VIP': 3, 'Kim Cương': 4 };
                valA = tierVals[a.tier || 'Thường'] || 1;
                valB = tierVals[b.tier || 'Thường'] || 1;
            }
            if (valA < valB) return affiliatesSortDesc ? 1 : -1;
            if (valA > valB) return affiliatesSortDesc ? -1 : 1;
            return 0;
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Không tìm thấy CTV nào phù hợp</td></tr>';
        document.getElementById('ctv-pagination').innerHTML = '';
        return;
    }

    var totalPages = Math.ceil(filtered.length / adminPageSize);
    if (currentAffiliatePage > totalPages && totalPages > 0) currentAffiliatePage = totalPages;
    var pagedData = filtered.slice((currentAffiliatePage - 1) * adminPageSize, currentAffiliatePage * adminPageSize);

    tbody.innerHTML = pagedData.map(item => {
        var badge = '';
        if (item.status === 'Active') badge = '<span class="badge badge--success">Hoạt động</span>';
        else if (item.status === 'Pending') badge = '<span class="badge badge--warning">Chờ duyệt</span>';
        else if (item.status === 'Locked') badge = '<span class="badge badge--danger">Đã khoá</span>';
        else badge = '<span class="badge badge--danger">' + item.status + '</span>';

        var tierBadge = '';
        var tier = item.tier || 'Thường';
        if (tier === 'Kim Cương') {
            tierBadge = `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 600;">💎 Kim Cương</span>`;
        } else if (tier === 'Vàng') {
            tierBadge = `<span class="badge" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; font-weight: 600;">🥇 Vàng</span>`;
        } else if (tier === 'Bạc') {
            tierBadge = `<span class="badge" style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; font-weight: 600;">🥈 Bạc</span>`;
        } else {
            tierBadge = `<span class="badge" style="background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; font-weight: 600;">🌱 Thường</span>`;
        }

        var bankInfo = (item.bankName && item.bankAccount) ? `${escapeHTML(item.bankName)}<br><small>${escapeHTML(item.bankAccount)}</small>` : '<span style="color:#999; font-size:0.85em;">Chưa cập nhật</span>';

        var pendingCommissionsCount = allAdminCommissions.filter(c => c.affiliateCode === item.affiliateCode && c.status === 'Pending').length;
        var pendingWithdrawalCount = allWithdrawals.filter(w => w.affiliateCode === item.affiliateCode && w.status === 'Pending').length;

        var nameHtml = `
            <div style="font-weight: 500; color: var(--text-dark);">${escapeHTML(item.customerName)}</div>
            <div style="font-size: 0.85em; color: var(--text-muted);">${escapeHTML(item.customerEmail || item.customerPhone || '')}</div>
            <div style="font-size: 0.8em; color: var(--accent); margin-top: 2px;">Mã: ${escapeHTML(item.affiliateCode)}</div>
        `;

        if (pendingCommissionsCount > 0 || pendingWithdrawalCount > 0) {
            nameHtml += `<div style="margin-top: 6px; display: flex; flex-direction: column; gap: 3px;">`;
            if (pendingCommissionsCount > 0) {
                nameHtml += `<span onclick="jumpToTab('tab-commissions', '${item.affiliateCode}')" style="cursor: pointer; font-size: 0.75rem; background: #fffbeb; color: #d97706; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a; display: inline-block; width: fit-content;" title="Nhấn để xem và duyệt">⚠️ ${pendingCommissionsCount} hoa hồng chờ duyệt</span>`;
            }
            if (pendingWithdrawalCount > 0) {
                nameHtml += `<span onclick="jumpToTab('tab-withdrawals', '${item.affiliateCode}')" style="cursor: pointer; font-size: 0.75rem; background: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; border: 1px solid #fecaca; display: inline-block; width: fit-content;" title="Nhấn để xem và duyệt">💸 Có yêu cầu rút tiền</span>`;
            }
            nameHtml += `</div>`;
        }

        var lastOrderStr = item.lastOrderDate
            ? new Date(item.lastOrderDate + (item.lastOrderDate.endsWith('Z') ? '' : 'Z')).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
            : '<span style="color:#aaa;">Chưa có</span>';

        var createdAtStr = item.createdAt
            ? new Date(item.createdAt + (item.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

        return `
            <tr>
                <td class="checkbox-cell" style="text-align:center;"><input type="checkbox" class="ctv-item-checkbox" value="${item.id}"></td>
                <td class="sticky-name-col">${nameHtml}</td>
                <td>${tierBadge}</td>
                <td>${badge}</td>
                <td style="line-height:1.4;">${bankInfo}</td>
                <td style="font-weight: 600; color: var(--text-dark);">${fmtVND(item.totalSales || 0)}</td>
                <td style="font-weight: 600; color: var(--text-dark); text-align: center;">${item.totalOrdersCount || 0}</td>
                <td style="font-weight: 600; color: var(--accent);">${fmtVND(item.totalCommission || 0)}</td>
                <td>${lastOrderStr}</td>
                <td>${createdAtStr}</td>
                <td class="sticky-action-col">
                    <div style="display: flex; flex-direction: column; gap: 6px; justify-content: center; align-items: stretch; width: 80px; margin: 0 auto;">
                        <button class="btn btn--sm btn--secondary" onclick="viewAffiliateDetail(${item.id})" style="width: 100%;">Chi tiết</button>
                        ${item.status === 'Pending' ? `<button class="btn btn--sm btn--primary" onclick="updateAffiliateStatus(${item.id}, 'Active')" style="width: 100%;">Duyệt</button>` : ''}
                        ${item.status === 'Active' ? `<button class="btn btn--sm btn--danger" onclick="updateAffiliateStatus(${item.id}, 'Locked')" style="width: 100%;">Khoá</button>` : ''}
                        ${item.status === 'Locked' ? `<button class="btn btn--sm btn--success" onclick="updateAffiliateStatus(${item.id}, 'Active')" style="width: 100%;">Mở Khoá</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.renderAdminPagination) {
        window.renderAdminPagination(filtered.length, currentAffiliatePage, 'ctv-pagination', 'goToAffiliatePage');
    }
    
    // Update bulk UI if rendering changed selection
    var checkAll = document.getElementById('check-all-ctv');
    if (checkAll) checkAll.checked = false;
    if (typeof updateCtvBulkActionsUI === 'function') updateCtvBulkActionsUI();
}

window.viewAffiliateDetail = function (id) {
    window.currentDetailAffiliateId = id;
    var affiliate = allAffiliates.find(a => a.id === id);
    if (!affiliate) return;

    // Force set width to bypass HTML caching issues
    var modalEl = document.querySelector('#ctvDetailModal .modal');
    if (modalEl) {
        modalEl.style.maxWidth = '1100px';
        modalEl.style.width = '95%';
    }

    var body = document.getElementById('ctv-detail-body');
    if (!body) return;

    var activeTabBefore = 'info';
    var existingActiveBtn = document.querySelector('.detail-tab-btn.active');
    if (existingActiveBtn && existingActiveBtn.getAttribute('onclick')) {
        var match = existingActiveBtn.getAttribute('onclick').match(/'([^']+)'/);
        if (match) activeTabBefore = match[1];
    }

    var statusText = affiliate.status === 'Active' ? 'Hoạt động' : (affiliate.status === 'Pending' ? 'Chờ duyệt' : 'Đã khoá');
    var statusColor = affiliate.status === 'Active' ? 'var(--success)' : (affiliate.status === 'Pending' ? 'var(--warning)' : 'var(--danger)');
    var tier = affiliate.tier || 'Thường';

    body.innerHTML = `
        <style>
          /* Modal mobile responsive */
          @media (max-width: 600px) {
            .detail-modal-header { flex-direction: column !important; gap: 10px !important; }
            .detail-modal-header .status-block { align-self: flex-start !important; text-align: left !important; }
            .detail-modal-contact { flex-direction: column !important; gap: 6px !important; }
            .detail-info-grid { grid-template-columns: 1fr !important; }
            .detail-tier-row { flex-direction: column !important; gap: 10px !important; align-items: flex-start !important; }
            .detail-tier-row .tier-controls { width: 100% !important; }
            .detail-tier-row .tier-controls select { width: 100% !important; }
            .detail-tier-row .tier-controls button { width: 100% !important; }
            .detail-tab-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
            .detail-tab-bar::-webkit-scrollbar { display: none; }
          }
        </style>

        <!-- Header: Tên + Trạng thái -->
        <div class="detail-modal-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); gap: 12px;">
            <div style="min-width: 0;">
                <h4 style="margin:0 0 8px 0; color: var(--text-dark); font-size: 18px; word-break: break-word;">${escapeHTML(affiliate.customerName)}</h4>
                <div class="detail-modal-contact" style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px;">
                    <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 4px; min-width: 0; word-break: break-all;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        ${escapeHTML(affiliate.customerEmail || 'N/A')}
                    </span>
                    <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        ${escapeHTML(affiliate.customerPhone || 'N/A')}
                    </span>
                </div>
            </div>
            <div class="status-block" style="text-align: right; flex-shrink: 0;">
                <div style="display: inline-block; background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-weight: 500; font-size: 13px; margin-bottom: 6px; border: 1px solid ${statusColor}40; white-space: nowrap;">
                    ${statusText}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); white-space: nowrap;">ĐK: ${new Date(affiliate.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            </div>
        </div>

        <!-- Tab bar: scrollable on mobile -->
        <div class="detail-tab-bar" style="display: flex; gap: 0; border-bottom: 1.5px solid var(--border); margin-bottom: 20px; flex-wrap: nowrap;">
            <button class="detail-tab-btn active" onclick="switchDetailTab('info')" style="padding: 10px 14px; font-size: 13px; font-weight: 600; border-bottom: 2px solid var(--accent); color: var(--accent); background: none; border: none; cursor: pointer; white-space: nowrap; flex-shrink: 0;">Thông tin</button>
            <button class="detail-tab-btn" onclick="switchDetailTab('orders')" style="padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; cursor: pointer; white-space: nowrap; flex-shrink: 0;">Đơn hàng</button>
            <button class="detail-tab-btn" onclick="switchDetailTab('commissions')" style="padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; cursor: pointer; white-space: nowrap; flex-shrink: 0;">Hoa hồng</button>
            <button class="detail-tab-btn" onclick="switchDetailTab('withdrawals')" style="padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; cursor: pointer; white-space: nowrap; flex-shrink: 0;">Rút tiền</button>
        </div>

        <!-- Tab 1: Info -->
        <div id="detail-tab-info" class="detail-tab-pane" style="display: block;">
            <!-- Thông tin cơ bản 2 card -->
            <div class="detail-info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 5px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Tài Khoản Affiliate
                    </div>
                    <div style="margin-bottom: 10px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 3px;">Mã giới thiệu</div>
                        <div style="font-family: monospace; font-size: 14px; font-weight: 700; color: var(--accent); background: var(--bg-body); padding: 6px 10px; border-radius: 6px; border: 1px dashed var(--border); display: inline-block; word-break: break-all;">${escapeHTML(affiliate.affiliateCode)}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 3px;">CCCD / CMND</div>
                        <div style="font-weight: 500; color: var(--text-primary); font-size: 14px;">${escapeHTML(affiliate.cccd || 'Chưa cập nhật')}</div>
                    </div>
                </div>

                <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 5px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                        Thanh Toán
                    </div>
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;">Ngân hàng</div>
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${escapeHTML(affiliate.bankName || 'Chưa có')}</div>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;">Chủ tài khoản</div>
                        <div style="font-weight: 500; color: var(--text-primary); font-size: 13px;">${escapeHTML(affiliate.bankOwner || 'Chưa có')}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;">Số tài khoản</div>
                        <div style="font-family: monospace; font-size: 14px; font-weight: 700; color: var(--accent); word-break: break-all;">${escapeHTML(affiliate.bankAccount || 'Chưa có')}</div>
                    </div>
                </div>
            </div>

            <!-- Cấp bậc CTV -->
            <div class="detail-tier-row" style="background: var(--bg-body); padding: 14px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--border); gap: 12px;">
                <div style="min-width: 0;">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-dark); margin-bottom: 3px;">⭐ Cấp Bậc CTV</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Điều chỉnh cấp bậc ảnh hưởng đến hoa hồng</div>
                </div>
                <div class="tier-controls" style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                    <select id="detail-tier-select" class="form-control" style="min-width: 110px;">
                        <option value="Thường" ${tier === 'Thường' ? 'selected' : ''}>🌱 Thường</option>
                        <option value="Bạc" ${tier === 'Bạc' ? 'selected' : ''}>🥈 Bạc</option>
                        <option value="Vàng" ${tier === 'Vàng' ? 'selected' : ''}>🥇 Vàng</option>
                        <option value="Kim Cương" ${tier === 'Kim Cương' ? 'selected' : ''}>💎 Kim Cương</option>
                    </select>
                    <button class="btn btn--primary btn--sm" onclick="updateAffiliateTier(${affiliate.id})">Cập nhật</button>
                </div>
            </div>
        </div>

        <!-- Tab 2: Orders -->
        <div id="detail-tab-orders" class="detail-tab-pane" style="display: none;">
            <div style="margin-bottom: 12px;">
                <input type="text" id="detail-orders-search" class="search-box__input" placeholder="🔍 Tìm mã đơn, ngày tạo..." oninput="filterDetailOrders()" style="width: 100%; box-sizing: border-box;">
            </div>
            <div class="table-wrap" style="max-height: 350px; overflow-y: auto;">
                <table class="data-table" style="min-width: 400px;">
                    <thead>
                        <tr>
                            <th>Mã Đơn Hàng</th>
                            <th>Tổng Tiền</th>
                            <th>Trạng Thái</th>
                            <th>Ngày Tạo</th>
                        </tr>
                    </thead>
                    <tbody id="detail-orders-body">
                        <tr><td colspan="4" style="text-align:center;">Đang tải...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 3: Commissions -->
        <div id="detail-tab-commissions" class="detail-tab-pane" style="display: none;">
            <div style="margin-bottom: 12px;">
                <input type="text" id="detail-commissions-search" class="search-box__input" placeholder="🔍 Tìm mã đơn, ngày nhận..." oninput="filterDetailCommissions()" style="width: 100%; box-sizing: border-box;">
            </div>
            <div class="table-wrap" style="max-height: 350px; overflow-y: auto;">
                <table class="data-table" style="min-width: 520px;">
                    <thead>
                        <tr>
                            <th style="min-width:80px;">Mã Đơn</th>
                            <th style="min-width:100px;">Doanh Số</th>
                            <th>Tỷ Lệ</th>
                            <th style="min-width:120px;">Hoa Hồng</th>
                            <th style="min-width:100px;">Trạng Thái</th>
                            <th style="min-width:100px;">Ngày</th>
                            <th style="text-align:center; min-width:100px;">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="detail-commissions-body">
                        <tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 4: Withdrawals -->
        <div id="detail-tab-withdrawals" class="detail-tab-pane" style="display: none;">
            <div class="table-wrap" style="max-height: 350px; overflow-y: auto;">
                <table class="data-table" style="min-width: 440px;">
                    <thead>
                        <tr>
                            <th>Số Tiền</th>
                            <th>Trạng Thái</th>
                            <th>Ngày YC</th>
                            <th>Ngày XL</th>
                            <th>Ghi Chú</th>
                        </tr>
                    </thead>
                    <tbody id="detail-withdrawals-body">
                        <tr><td colspan="5" style="text-align:center;">Đang tải...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    openModal('ctvDetailModal');

    if (activeTabBefore !== 'info') {
        switchDetailTab(activeTabBefore);
    }

    if (window.initCustomSelects) {
        setTimeout(function () {
            window.initCustomSelects(body);
        }, 10);
    }

    // Load detailed data from new API endpoint
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';
    fetch(API_BASE + '/admin/affiliates/' + id + '/details', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(res => res.json())
        .then(data => {
            window.currentAffiliateDetails = data;
            renderDetailTabOrders(data.orders);
            renderDetailTabCommissions(data.commissions);
            renderDetailTabWithdrawals(data.withdrawals);
        })
        .catch(err => {
            console.error(err);
            document.getElementById('detail-orders-body').innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger)">Lỗi tải dữ liệu</td></tr>';
            document.getElementById('detail-commissions-body').innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger)">Lỗi tải dữ liệu</td></tr>';
            document.getElementById('detail-withdrawals-body').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger)">Lỗi tải dữ liệu</td></tr>';
        });
};

window.switchDetailTab = function (tabName) {
    document.querySelectorAll('.detail-tab-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.detail-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-secondary)';
        btn.style.fontWeight = '500';
        btn.style.borderBottom = 'none';
    });

    var pane = document.getElementById('detail-tab-' + tabName);
    if (pane) pane.style.display = 'block';

    var activeBtn = Array.from(document.querySelectorAll('.detail-tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabName));
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = 'var(--accent)';
        activeBtn.style.fontWeight = '600';
        activeBtn.style.borderBottom = '2px solid var(--accent)';
    }
};

function renderDetailTabOrders(orders) {
    var tbody = document.getElementById('detail-orders-body');
    if (!tbody) return;
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">Chưa có đơn hàng giới thiệu nào</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(item => {
        var statusBadge = '';
        var s = (item.status || '').toLowerCase();
        if (s === 'completed') statusBadge = '<span class="badge badge--success">Hoàn thành</span>';
        else if (s === 'pending') statusBadge = '<span class="badge badge--warning">Chờ xác nhận</span>';
        else if (s === 'confirmed') statusBadge = '<span class="badge badge--info">Đã xác nhận</span>';
        else if (s === 'shipping') statusBadge = '<span class="badge badge--gold">Đang giao</span>';
        else if (s === 'cancelled') statusBadge = '<span class="badge badge--danger">Đã huỷ</span>';
        else statusBadge = `<span class="badge badge--muted">${item.status}</span>`;

        return `
            <tr>
                <td style="font-weight:600; color:var(--text-dark)">${escapeHTML(item.orderCode)}</td>
                <td style="font-weight:600; color:var(--text-dark)">${fmtVND(item.total)}</td>
                <td>${statusBadge}</td>
                <td>${new Date(item.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
            </tr>
        `;
    }).join('');
}

window.filterDetailOrders = function () {
    if (!window.currentAffiliateDetails) return;
    var q = (document.getElementById('detail-orders-search').value || '').toLowerCase();
    var normQ = q.replace(/(^|\D)0+(?=\d)/g, "$1");
    var filtered = window.currentAffiliateDetails.orders.filter(item => {
        var orderCode = (item.orderCode || '').toLowerCase();
        var dateStr = new Date(item.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).toLowerCase();
        var normDate = dateStr.replace(/(^|\D)0+(?=\d)/g, "$1");
        return orderCode.includes(q) || dateStr.includes(q) || normDate.includes(normQ);
    });
    renderDetailTabOrders(filtered);
};

function renderDetailTabCommissions(commissions) {
    var tbody = document.getElementById('detail-commissions-body');
    if (!tbody) return;
    if (!commissions || commissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">Chưa có lịch sử hoa hồng nào</td></tr>';
        return;
    }
    var currentAffiliate = allAffiliates.find(a => a.id === window.currentDetailAffiliateId);
    var currentAffiliateTier = currentAffiliate ? (currentAffiliate.tier || 'Thường') : 'Thường';
    tbody.innerHTML = commissions.map(item => {
        var statusBadge = '';
        if (item.status === 'Paid') statusBadge = '<span class="badge badge--success">Đã thanh toán</span>';
        else if (item.status === 'Approved') statusBadge = '<span class="badge badge--info">Đã duyệt</span>';
        else if (item.status === 'Pending') statusBadge = '<span class="badge badge--warning">Chờ duyệt</span>';
        else if (item.status === 'Refunded') statusBadge = '<span class="badge badge--danger">Đã trả hàng</span>';
        else statusBadge = `<span class="badge badge--muted">${item.status}</span>`;

        var actionBtn = '';
        if (item.status === 'Pending') {
            actionBtn = `<button class="btn btn--sm btn--primary" onclick="updateDetailCommissionStatus(${item.id}, 'Approved')">Duyệt</button>
                         <button class="btn btn--sm btn--danger" onclick="updateDetailCommissionStatus(${item.id}, 'Refunded')" style="margin-left: 4px;">Huỷ</button>`;
        }

        var totalCommission = item.commissionAmount || 0;
        var baseCommission = item.baseCommissionAmount || 0;
        var tierBonus = item.tierBonusAmount || 0;

        var daysPassedText = '';
        if (item.status === 'Pending') {
            var msPassed = new Date().getTime() - new Date(item.createdAt).getTime();
            var daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
            var tooltip = "Số ngày kể từ lúc khách nhận hàng. Cần chờ qua 7 ngày đổi trả để duyệt an toàn.";
            if (daysPassed >= 7) {
                daysPassedText = `<div title="${tooltip}" style="font-size:0.8em; color:#16a34a; font-weight:bold; margin-top:4px; cursor:help;">✓ Đã qua ${daysPassed} ngày</div>`;
            } else {
                daysPassedText = `<div title="${tooltip}" style="font-size:0.8em; color:#d97706; margin-top:4px; cursor:help;">⏳ Đã qua ${daysPassed} ngày</div>`;
            }
        }

        return `
            <tr>
                <td style="font-weight:600; color:var(--text-dark); white-space:nowrap;">${escapeHTML(item.orderCode)}</td>
                <td style="white-space:nowrap;">${fmtVND(item.orderTotalAmount)}</td>
                <td style="white-space:nowrap;">${item.commissionRate}%</td>
                <td style="min-width:130px;">
                    <div style="font-weight:700; color:var(--accent); white-space:nowrap;">+${fmtVND(totalCommission)}</div>
                    <div style="font-size:0.8em; color:var(--text-muted); white-space:nowrap;">Gốc: +${fmtVND(baseCommission)}</div>
                    ${tierBonus > 0 ? `<div style="font-size:0.8em; color:#d97706; white-space:nowrap;">${getTierIconAdmin(currentAffiliateTier)}+${fmtVND(tierBonus)}</div>` : ''}
                </td>
                <td>${statusBadge}</td>
                <td style="white-space:nowrap; font-size:0.85rem;">
                    ${window.AdminData.fmtDate(item.createdAt)}
                    ${daysPassedText}
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    ${actionBtn || '<span style="color:var(--text-muted); font-size:0.8rem;">—</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

window.filterDetailCommissions = function () {
    if (!window.currentAffiliateDetails) return;
    var q = (document.getElementById('detail-commissions-search').value || '').toLowerCase();
    var normQ = q.replace(/(^|\D)0+(?=\d)/g, "$1");
    var filtered = window.currentAffiliateDetails.commissions.filter(item => {
        var orderCode = (item.orderCode || '').toLowerCase();
        var dateStr = window.AdminData.fmtDate(item.createdAt).toLowerCase();
        var normDate = dateStr.replace(/(^|\D)0+(?=\d)/g, "$1");
        return orderCode.includes(q) || dateStr.includes(q) || normDate.includes(normQ);
    });
    renderDetailTabCommissions(filtered);
};

window.updateDetailCommissionStatus = function (commissionId, status) {
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';

    var msg = status === 'Approved' ? 'Bạn có chắc chắn muốn duyệt khoản hoa hồng này?' : 'Bạn có chắc chắn muốn huỷ (Đã trả hàng) khoản hoa hồng này?';
    var options = {
        title: status === 'Approved' ? 'Xác nhận duyệt' : 'Xác nhận huỷ',
        type: status === 'Approved' ? 'success' : 'danger',
        okText: status === 'Approved' ? 'Duyệt' : 'Huỷ hoa hồng'
    };

    adminConfirm(msg, function () {
        fetch(API_BASE + '/admin/affiliates/commissions/' + commissionId + '/status', {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        })
            .then(res => {
                if (res.status === 403) throw new Error('Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin).');
                if (!res.ok) throw new Error('Lỗi từ Server (Mã lỗi: ' + res.status + ')');
                return res.json();
            })
            .then(data => {
                adminToast('Cập nhật trạng thái thành công', 'success');
                if (window.currentDetailAffiliateId) {
                    viewAffiliateDetail(window.currentDetailAffiliateId);
                    loadAffiliates(); // Cập nhật lại số liệu bên ngoài bảng chính
                }
            })
            .catch(err => {
                console.error(err);
                adminToast(err.message || 'Lỗi cập nhật', 'error');
            });
    }, options);
};


window.renderAllCommissionsTable = function () {
    var tbody = document.getElementById('all-commissions-table-body');
    if (!tbody) return;

    var searchQ = (document.getElementById('commissions-search')?.value || '').toLowerCase();
    var filterStatus = document.getElementById('commissions-status-filter')?.value || 'all';

    var filtered = allAdminCommissions.filter(item => {
        var matchQ = !searchQ ||
            (item.affiliateName && item.affiliateName.toLowerCase().includes(searchQ)) ||
            (item.affiliateCode && item.affiliateCode.toLowerCase().includes(searchQ)) ||
            (item.orderCode && item.orderCode.toLowerCase().includes(searchQ));

        var s = (item.status || '');
        var matchStatus = true;
        if (filterStatus !== 'all') {
            if (filterStatus === 'Paid') {
                matchStatus = (s === 'Paid' || s === 'Completed');
            } else if (filterStatus === 'Refunded') {
                matchStatus = (s === 'Refunded' || s === 'Rejected');
            } else {
                matchStatus = (s === filterStatus);
            }
        }

        return matchQ && matchStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Không có dữ liệu hoa hồng phù hợp</td></tr>';
        document.getElementById('commissions-pagination').innerHTML = '';
        return;
    }

    var totalPages = Math.ceil(filtered.length / adminPageSize);
    if (currentCommissionPage > totalPages && totalPages > 0) currentCommissionPage = totalPages;
    var pagedData = filtered.slice((currentCommissionPage - 1) * adminPageSize, currentCommissionPage * adminPageSize);

    var html = pagedData.map(item => {
        var s = (item.status || '').toLowerCase();
        var statusBadge = '';
        if (s === 'completed' || s === 'paid') statusBadge = '<span class="badge badge--success">Đã thanh toán</span>';
        else if (s === 'pending') statusBadge = '<span class="badge badge--warning">Chờ duyệt</span>';
        else if (s === 'approved') statusBadge = '<span class="badge badge--info">Đã duyệt</span>';
        else if (s === 'refunded' || s === 'rejected') statusBadge = '<span class="badge badge--danger">Đã huỷ</span>';
        else statusBadge = `<span class="badge">${item.status}</span>`;

        var actionBtn = '';
        if (s === 'pending') {
            actionBtn = `
                <button class="btn btn--primary btn--small" onclick="updateCommissionStatus(${item.id}, 'Approved')" style="margin-right:4px;">Duyệt</button>
                <button class="btn btn--danger btn--small" onclick="updateCommissionStatus(${item.id}, 'Rejected')">Huỷ</button>
            `;
        } else if (s === 'approved') {
            actionBtn = `
                <span style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Chờ CTV rút tiền</span>
            `;
        }

        var daysPassedText = '';
        if (s === 'pending') {
            var msPassed = new Date().getTime() - new Date(item.createdAt).getTime();
            var daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
            var tooltip = `Số ngày kể từ lúc khách nhận hàng. Cần chờ qua ${commissionReturnPeriodDays} ngày đổi trả để duyệt an toàn.`;
            if (daysPassed >= commissionReturnPeriodDays) {
                daysPassedText = `<div title="${tooltip}" style="font-size:0.8em; color:#16a34a; font-weight:bold; margin-top:4px; cursor:help;">✓ Đã qua ${daysPassed} ngày</div>`;
            } else {
                daysPassedText = `<div title="${tooltip}" style="font-size:0.8em; color:#d97706; margin-top:4px; cursor:help;">⏳ Đã qua ${daysPassed} ngày</div>`;
            }
        }

        var affiliate = allAffiliates.find(a => a.affiliateCode === item.affiliateCode);
        var tier = affiliate ? (affiliate.tier || 'Thường') : 'Thường';
        var tierIcon = '';
        if (tier === 'Kim Cương') tierIcon = '<span title="Kim Cương">💎 </span>';
        else if (tier === 'Vàng') tierIcon = '<span title="Vàng">🥇 </span>';
        else if (tier === 'Bạc') tierIcon = '<span title="Bạc">🥈 </span>';
        else tierIcon = '<span title="Thường">🌱 </span>';

        return `
            <tr>
                <td class="sticky-name-col">
                    <div style="font-weight: 500; color: var(--text-dark);">${tierIcon}${escapeHTML(item.affiliateName || '')}</div>
                    <div style="font-size: 0.8em; color: var(--accent); margin-top: 2px;">Mã: ${escapeHTML(item.affiliateCode || '')}</div>
                </td>
                <td><strong style="color:var(--primary);">#${escapeHTML(item.orderCode)}</strong></td>
                <td>${(item.orderTotalAmount || 0).toLocaleString('vi-VN')}đ</td>
                <td>
                    <strong style="color:var(--success);">+${(item.baseCommissionAmount || 0).toLocaleString('vi-VN')}đ</strong>
                </td>
                <td>
                    ${item.tierBonusAmount > 0 ? `<strong style="color:#d97706;">+${item.tierBonusAmount.toLocaleString('vi-VN')}đ</strong>` : '<span style="color:#999">-</span>'}
                </td>
                <td>
                    <strong style="color:var(--success); font-size:1.1em;">+${(item.commissionAmount || 0).toLocaleString('vi-VN')}đ</strong>
                    <div style="font-size:0.8em; color:var(--text-muted);">Tổng tỷ lệ: ${item.commissionRate}%</div>
                </td>
                <td>
                    ${window.AdminData.fmtDate(item.createdAt)}
                    ${daysPassedText}
                </td>
                <td>${statusBadge}</td>
                <td class="sticky-action-col">${actionBtn}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;

    if (window.renderAdminPagination) {
        window.renderAdminPagination(filtered.length, currentCommissionPage, 'commissions-pagination', 'goToCommissionPage');
    }
};

window.updateCommissionStatus = function (id, status) {
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';

    var actionText = status === 'Approved' ? 'duyệt' : (status === 'Rejected' ? 'huỷ' : 'đánh dấu đã thanh toán');

    adminConfirm('Bạn có chắc chắn muốn ' + actionText + ' khoản hoa hồng này?', function () {
        fetch(API_BASE + '/admin/affiliates/commissions/' + id + '/status', {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        })
            .then(res => {
                if (res.status === 403) throw new Error('Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin).');
                if (!res.ok) throw new Error('Cập nhật thất bại');
                adminToast('Đã cập nhật trạng thái hoa hồng', 'success');
                loadAffiliates(); // Tải lại toàn bộ dữ liệu
                if (window.currentDetailAffiliateId) {
                    viewAffiliateDetail(window.currentDetailAffiliateId);
                }
            })
            .catch(err => {
                console.error(err);
                adminToast('Lỗi cập nhật', 'error');
            });
    });
};

function renderDetailTabWithdrawals(withdrawals) {
    var tbody = document.getElementById('detail-withdrawals-body');
    if (!tbody) return;
    if (!withdrawals || withdrawals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">Chưa có yêu cầu rút tiền nào</td></tr>';
        return;
    }
    tbody.innerHTML = withdrawals.map(item => {
        var statusBadge = '';
        if (item.status === 'Paid') statusBadge = '<span class="badge badge--success">Đã CK</span>';
        else if (item.status === 'Pending') statusBadge = '<span class="badge badge--warning">Chờ xử lý</span>';
        else if (item.status === 'Rejected') statusBadge = '<span class="badge badge--danger">Từ chối</span>';
        else statusBadge = `<span class="badge badge--muted">${item.status}</span>`;

        return `
            <tr>
                <td style="font-weight:600; color:var(--danger)">${fmtVND(item.amount)}</td>
                <td>${statusBadge}</td>
                <td>${window.AdminData.fmtDate(item.requestedAt)}</td>
                <td>${item.processedAt ? window.AdminData.fmtDate(item.processedAt) : '—'}</td>
                <td style="font-size:0.9em; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(item.note || '')}">${escapeHTML(item.note || '—')}</td>
            </tr>
        `;
    }).join('');
}

window.updateAffiliateTier = function (id) {
    var newTier = document.getElementById('detail-tier-select').value;
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';

    fetch(API_BASE + '/admin/affiliates/' + id + '/status', {
        method: 'PATCH',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: allAffiliates.find(a => a.id === id).status, tier: newTier })
    })
        .then(res => {
            if (res.status === 403) throw new Error('Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin).');
            if (!res.ok) throw new Error('Lỗi từ Server (Mã lỗi: ' + res.status + ')');
            return res.json();
        })
        .then(data => {
            adminToast('Cập nhật cấp bậc thành công', 'success');
            loadAffiliates();
            closeModal('ctvDetailModal');
        })
        .catch(err => {
            console.error(err);
            adminToast(err.message || 'Lỗi cập nhật', 'error');
        });
};

function loadWithdrawals() {
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';

    fetch(API_BASE + '/admin/affiliates/withdrawals', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(res => res.json())
        .then(data => {
            allWithdrawals = data || [];
            updateStats();
            updateWithdrawalTabBadge();
            renderWithdrawalsTable();
        })
        .catch(err => {
            console.error(err);
            adminToast('Lỗi tải danh sách rút tiền', 'error');
        });
}

function renderWithdrawalsTable() {
    var tbody = document.getElementById('withdrawals-table-body');
    if (!tbody) return;

    var searchQ = (document.getElementById('withdrawals-search')?.value || '').toLowerCase();
    var filterStatus = document.getElementById('withdrawals-status-filter')?.value || 'all';

    var filtered = allWithdrawals.filter(w => {
        var matchQ = !searchQ ||
            (w.affiliateName && w.affiliateName.toLowerCase().includes(searchQ)) ||
            (w.affiliateCode && w.affiliateCode.toLowerCase().includes(searchQ));

        var matchStatus = filterStatus === 'all' || w.status === filterStatus;
        return matchQ && matchStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Không tìm thấy yêu cầu rút tiền nào phù hợp</td></tr>';
        document.getElementById('withdrawals-pagination').innerHTML = '';
        return;
    }

    var totalPages = Math.ceil(filtered.length / adminPageSize);
    if (currentWithdrawalPage > totalPages && totalPages > 0) currentWithdrawalPage = totalPages;
    var pagedData = filtered.slice((currentWithdrawalPage - 1) * adminPageSize, currentWithdrawalPage * adminPageSize);

    tbody.innerHTML = pagedData.map(item => {
        var badge = '';
        if (item.status === 'Paid') badge = '<span class="badge badge--success">Đã CK</span>';
        else if (item.status === 'Pending') badge = '<span class="badge badge--warning">Chờ xử lý</span>';
        else if (item.status === 'Rejected') badge = '<span class="badge badge--danger">Từ chối</span>';
        else badge = '<span class="badge badge--danger">' + item.status + '</span>';

        var qrUrl = '';
        if (item.bankName && item.bankAccount) {
            var addInfo = encodeURIComponent('Thanh toan hoa hong ' + item.affiliateCode);
            var accountName = encodeURIComponent(item.bankOwner || '');
            qrUrl = `https://img.vietqr.io/image/${item.bankName}-${item.bankAccount}-compact2.png?amount=${item.amount}&addInfo=${addInfo}&accountName=${accountName}`;
        }
        var qrBtn = qrUrl ? `<a href="${qrUrl}" target="_blank" style="display:inline-block; margin-top:5px; font-size:0.8rem; color:var(--primary); text-decoration:none;">📷 Quét QR CK</a>` : '';

        var affiliate = allAffiliates.find(a => a.affiliateCode === item.affiliateCode);
        var tier = affiliate ? (affiliate.tier || 'Thường') : 'Thường';
        var tierIcon = '';
        if (tier === 'Kim Cương') tierIcon = '<span title="Kim Cương">💎 </span>';
        else if (tier === 'Vàng') tierIcon = '<span title="Vàng">🥇 </span>';
        else if (tier === 'Bạc') tierIcon = '<span title="Bạc">🥈 </span>';
        else tierIcon = '<span title="Thường">🌱 </span>';

        return `
            <tr>
                <td style="white-space:nowrap; font-weight:600;">${tierIcon}${escapeHTML(item.affiliateName)}</td>
                <td>${escapeHTML(item.affiliateCode)}</td>
                <td style="color:var(--danger);font-weight:bold">${fmtVND(item.amount)}</td>
                <td style="font-size:0.85em;line-height:1.4">
                    <strong>${escapeHTML(item.bankName || '')}</strong><br>
                    ${escapeHTML(item.bankAccount || '')}<br>
                    ${escapeHTML(item.bankOwner || '')}<br>
                    ${qrBtn}
                </td>
                <td style="font-size:0.85em;line-height:1.4;white-space:nowrap;">
                    <strong>YC:</strong> ${window.AdminData.fmtDate(item.requestedAt)}<br>
                    <strong>XL:</strong> ${item.processedAt ? window.AdminData.fmtDate(item.processedAt) : '—'}
                </td>
                <td>${badge}</td>
                <td style="font-size:0.85rem; color:var(--text-secondary); max-width: 150px; white-space: normal;">${escapeHTML(item.note || '—')}</td>
                <td class="sticky-action-col" style="text-align: center;">
                    ${item.status === 'Pending' ? `
                    <div style="display: flex; flex-direction: column; gap: 6px; width: 80px; margin: 0 auto;">
                        <button class="btn btn--sm btn--primary" onclick="processWithdrawal(${item.id}, 'Paid')" style="width: 100%;">Đã CK</button>
                        <button class="btn btn--sm btn--danger" onclick="processWithdrawal(${item.id}, 'Rejected')" style="width: 100%;">Từ chối</button>
                    </div>
                    ` : `<span style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Đã xử lý</span>`}
                </td>
            </tr>
        `;
    }).join('');

    if (window.renderAdminPagination) {
        window.renderAdminPagination(filtered.length, currentWithdrawalPage, 'withdrawals-pagination', 'goToWithdrawalPage');
    }
}

window.updateAffiliateStatus = function (id, status) {
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';
    var affiliate = allAffiliates.find(a => a.id === id);
    var name = affiliate ? affiliate.customerName : 'này';

    var msg = '';
    var options = {};
    if (status === 'Locked') {
        msg = `Bạn có chắc chắn muốn khoá CTV <strong>${escapeHTML(name)}</strong> không?`;
        options = {
            title: 'Xác nhận khoá CTV',
            type: 'danger',
            okText: 'Xác nhận khoá'
        };
    } else if (status === 'Active' && affiliate && affiliate.status === 'Pending') {
        msg = `Bạn có chắc chắn muốn duyệt CTV <strong>${escapeHTML(name)}</strong> hoạt động?`;
        options = {
            title: 'Duyệt CTV',
            type: 'success',
            okText: 'Duyệt hoạt động'
        };
    } else {
        msg = `Bạn có chắc chắn muốn mở khoá CTV <strong>${escapeHTML(name)}</strong> không?`;
        options = {
            title: 'Mở khoá CTV',
            type: 'info',
            okText: 'Mở khoá'
        };
    }

    adminConfirm(msg, function () {
        fetch(API_BASE + '/admin/affiliates/' + id + '/status', {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        })
            .then(res => {
                if (res.status === 403) throw new Error('Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin).');
                if (!res.ok) throw new Error('Lỗi từ Server (Mã lỗi: ' + res.status + ')');
                return res.json();
            })
            .then(data => {
                adminToast('Cập nhật trạng thái thành công', 'success');
                loadAffiliates();
            })
            .catch(err => {
                console.error(err);
                adminToast(err.message || 'Lỗi cập nhật', 'error');
            });
    }, options);
};

window.processWithdrawal = function (id, status) {
    var token = localStorage.getItem('pgt_admin_session') ? JSON.parse(localStorage.getItem('pgt_admin_session')).token : '';

    adminPrompt('Nhập mã giao dịch (tuỳ chọn) hoặc lý do:', '', function (note) {
        fetch(API_BASE + '/admin/affiliates/withdrawals/' + id, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status, note: note })
        })
            .then(res => {
                if (res.status === 403) throw new Error('Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin).');
                if (!res.ok) throw new Error('Lỗi từ Server (Mã lỗi: ' + res.status + ')');
                return res.json();
            })
            .then(data => {
                adminToast('Xử lý thành công', 'success');
                loadWithdrawals();
                if (window.currentDetailAffiliateId) {
                    viewAffiliateDetail(window.currentDetailAffiliateId);
                }
            })
            .catch(err => {
                console.error(err);
                adminToast(err.message || 'Lỗi cập nhật', 'error');
            });
    });
};

// --- BULK ACTIONS CHO CỘNG TÁC VIÊN ---
function getSelectedCtvIds() {
    var checked = document.querySelectorAll('.ctv-item-checkbox:checked');
    return Array.from(checked).map(function (cb) { return cb.value; });
}

window.updateCtvBulkActionsUI = function () {
    var ids = getSelectedCtvIds();
    var bar = document.getElementById('ctv-bulk-actions-bar');
    var countText = document.getElementById('ctv-bulk-selected-count');
    if (ids.length > 0) {
        if (countText) countText.innerText = 'Đã chọn ' + ids.length + ' CTV';
        if (bar) bar.classList.add('show');
    } else {
        if (bar) bar.classList.remove('show');
    }
};

function executeCtvBulkStatus(status) {
    var ids = getSelectedCtvIds();
    if (!ids.length) return;
    var statusName = status === 'Active' ? 'Hoạt động' : 'Khóa';
    adminConfirm('Bạn có chắc muốn cập nhật ' + ids.length + ' CTV thành trạng thái: ' + statusName + '?', function () {
        AdminData.affiliates.bulkStatus(ids, status)
            .then(function (res) {
                adminToast(res.message || 'Thành công', 'success');
                var checkAll = document.getElementById('check-all-ctv');
                if (checkAll) checkAll.checked = false;
                loadAffiliates();
            })
            .catch(function (err) {
                adminToast(err.message || 'Lỗi hệ thống', 'error');
            });
    }, { title: 'Xác nhận cập nhật', type: 'info', okText: 'Cập nhật' });
}

function executeCtvBulkTier(tier) {
    var ids = getSelectedCtvIds();
    if (!ids.length) return;
    adminConfirm('Bạn có chắc muốn cập nhật ' + ids.length + ' CTV lên hạng: ' + tier + '?', function () {
        AdminData.affiliates.bulkTier(ids, tier)
            .then(function (res) {
                adminToast(res.message || 'Thành công', 'success');
                var checkAll = document.getElementById('check-all-ctv');
                if (checkAll) checkAll.checked = false;
                loadAffiliates();
            })
            .catch(function (err) {
                adminToast(err.message || 'Lỗi hệ thống', 'error');
            });
    }, { title: 'Xác nhận cập nhật cấp bậc', type: 'info', okText: 'Cập nhật' });
}

function executeCtvBulkDelete() {
    var ids = getSelectedCtvIds();
    if (!ids.length) return;
    adminConfirm('Bạn có chắc chắn muốn XÓA vĩnh viễn ' + ids.length + ' CTV này? Hành động này không thể hoàn tác!', function () {
        AdminData.affiliates.bulkDelete(ids)
            .then(function (res) {
                adminToast(res.message || 'Thành công', 'success');
                var checkAll = document.getElementById('check-all-ctv');
                if (checkAll) checkAll.checked = false;
                loadAffiliates();
            })
            .catch(function (err) {
                adminToast(err.message || 'Lỗi hệ thống', 'error');
            });
    }, { title: 'Xóa nhiều CTV', type: 'danger', okText: 'Xóa CTV' });
}

function executeCtvBulkExcel() {
    var ids = getSelectedCtvIds();
    if (!ids.length) return;
    var selected = allAffiliates.filter(function (a) { return ids.includes(a.id.toString()); });
    var csvContent = '\uFEFF';
    csvContent += "Mã CTV,Tên CTV,SĐT,Email,Cấp bậc,Trạng thái,Ngân hàng,Chủ TK,Số TK,Tổng Doanh số,Hoa hồng,Ngày ĐK\n";
    selected.forEach(function (a) {
        var row = [
            '"' + (a.affiliateCode || '') + '"',
            '"' + (a.customerName || '').replace(/"/g, '""') + '"',
            '"' + (a.customerPhone || '') + '"',
            '"' + (a.customerEmail || '') + '"',
            '"' + (a.tier || 'Thường') + '"',
            '"' + (a.status || '') + '"',
            '"' + (a.bankName || '').replace(/"/g, '""') + '"',
            '"' + (a.bankOwner || '').replace(/"/g, '""') + '"',
            '"' + (a.bankAccount || '') + '"',
            a.totalSales || 0,
            a.totalCommission || 0,
            '"' + AdminData.fmtDate(a.createdAt) + '"'
        ];
        csvContent += row.join(',') + "\n";
    });
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'CTV_Export_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    adminToast('Đã xuất Excel (CSV) thành công', 'success');
}

// Attach event listeners when DOM loads
document.addEventListener('DOMContentLoaded', function () {
    var checkAllBtn = document.getElementById('check-all-ctv');
    if (checkAllBtn) {
        checkAllBtn.addEventListener('change', function () {
            var isChecked = this.checked;
            document.querySelectorAll('.ctv-item-checkbox').forEach(function (cb) {
                cb.checked = isChecked;
            });
            updateCtvBulkActionsUI();
        });
    }

    var tbody = document.getElementById('ctv-table-body');
    if (tbody) {
        tbody.addEventListener('change', function (e) {
            if (e.target.classList.contains('ctv-item-checkbox')) {
                updateCtvBulkActionsUI();
            }
        });
    }

    document.querySelectorAll('.btn-ctv-bulk-status').forEach(function (btn) {
        btn.addEventListener('click', function () {
            executeCtvBulkStatus(this.dataset.status);
            var dropdown = this.closest('.dropdown-actions__menu');
            if (dropdown) dropdown.classList.remove('is-open');
        });
    });

    document.querySelectorAll('.btn-ctv-bulk-tier').forEach(function (btn) {
        btn.addEventListener('click', function () {
            executeCtvBulkTier(this.dataset.tier);
            var dropdown = this.closest('.dropdown-actions__menu');
            if (dropdown) dropdown.classList.remove('is-open');
        });
    });

    var bulkDeleteBtn = document.getElementById('btn-ctv-bulk-delete');
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', executeCtvBulkDelete);

    var bulkExcelBtn = document.getElementById('btn-ctv-bulk-excel');
    if (bulkExcelBtn) bulkExcelBtn.addEventListener('click', executeCtvBulkExcel);
});


const API_BASE_URL = '/api';

// Đảm bảo hiển thị Favicon (logo trên tab trình duyệt) cho tất cả các trang CTV
if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/assets/images/logo.png';
    document.head.appendChild(link);
}

// --- Toast & Utility Functions ---
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.copyToClipboard = function(text, successMsg = 'Đã sao chép vào bộ nhớ tạm!') {
    // 1. Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            window.showToast(successMsg, 'success');
        }).catch(err => {
            fallbackCopyTextToClipboard(text, successMsg);
        });
    } else {
        // 2. Fallback for non-HTTPS or missing clipboard API
        fallbackCopyTextToClipboard(text, successMsg);
    }
}

function fallbackCopyTextToClipboard(text, successMsg) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Avoid scrolling
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            window.showToast(successMsg, 'success');
        } else {
            window.showToast('Không thể copy, vui lòng copy thủ công', 'error');
        }
    } catch (err) {
        window.showToast('Trình duyệt không hỗ trợ copy', 'error');
    } finally {
        document.body.removeChild(textArea);
    }
}

class Api {
    static getToken() {
        return localStorage.getItem('affiliate_token');
    }

    static setToken(token) {
        localStorage.setItem('affiliate_token', token);
    }

    static removeToken() {
        localStorage.removeItem('affiliate_token');
    }

    static async request(endpoint, options = {}) {
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                // Unauthorized, redirect to login
                this.removeToken();
                if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
                    window.location.href = 'login';
                }
                return null;
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'Có lỗi xảy ra từ máy chủ');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

// Function to inject Sidebar and Topbar
function renderLayout(activePage, title) {
    const layout = `
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo" style="background-color: #ffffff; overflow: hidden; padding: 2px; border-radius: 50%;">
                    <img class="js-config-logo" src="/assets/images/logo.png" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="Logo">
                </div>
                <div class="sidebar-title">Cộng Tác Viên</div>
                <button id="closeSidebar" class="mobile-only" style="background:none;border:none;color:white;font-size:1.5rem;margin-left:auto;cursor:pointer;">✕</button>
            </div>
            <div class="sidebar-nav">
                <a href="index" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
                    📊 Dashboard
                </a>
                <a href="statistics" class="nav-item ${activePage === 'statistics' ? 'active' : ''}">
                    📈 Thống Kê Chi Tiết
                </a>
                <a href="orders" class="nav-item ${activePage === 'orders' ? 'active' : ''}">
                    🛒 Đơn Hàng Phát Sinh
                </a>
                <a href="commissions" class="nav-item ${activePage === 'commissions' ? 'active' : ''}">
                    💰 Lịch Sử Hoa Hồng
                </a>
                <a href="product-commissions" class="nav-item ${activePage === 'product-commissions' ? 'active' : ''}">
                    🛍️ Hoa Hồng Sản Phẩm
                </a>
                <a href="withdrawals" class="nav-item ${activePage === 'withdrawals' ? 'active' : ''}">
                    💳 Rút Tiền
                </a>
                <a href="links" class="nav-item ${activePage === 'links' ? 'active' : ''}">
                    🔗 Link & Banner
                </a>
                <a href="policy" class="nav-item ${activePage === 'policy' ? 'active' : ''}">
                    📜 Chính Sách Hoa Hồng
                </a>
            </div>

            <!-- Support Box -->
            <div style="padding: 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-bottom: 10px;">Cần hỗ trợ?</div>
                <a href="https://zalo.me/0901234567" target="_blank" class="js-config-zalo-link" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #0068ff; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; width: 100%; transition: opacity 0.2s;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Chat Zalo
                </a>
                <div class="js-config-hotline-text" style="font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-top: 10px;">Hotline: 0901.234.567</div>
            </div>

        </div>
        <div class="main-content" id="mainContent">
            <div class="topbar">
                <div style="display:flex; align-items:center; gap:10px; flex: 1; min-width: 0;">
                    <button id="menuToggle" class="mobile-only" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-dark); padding:0;">☰</button>
                    <h2 class="page-title" style="margin:0; font-size:1.2rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</h2>
                </div>
                <div class="topbar-right" style="flex-shrink: 0; display:flex; align-items:center; gap:20px;">
                    <!-- Notification Bell -->
                    <div id="notificationBell" style="position:relative; cursor:pointer;">
                        <span style="font-size:1.3rem;">🔔</span>
                        <span id="notificationBadge" style="display:none; position:absolute; top:-2px; right:-6px; background:#ef4444; color:white; font-size:0.65rem; font-weight:bold; padding:2px 5px; border-radius:10px; border:2px solid white;">0</span>
                        
                        <!-- Notification Dropdown -->
                        <div id="notificationDropdown" style="display:none; position:absolute; top:calc(100% + 15px); right:-10px; background:white; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1); border:1px solid #e5e7eb; width:340px; z-index:100; flex-direction:column; overflow:hidden;">
                            <div style="padding:16px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; background:#f9fafb;">
                                <span style="font-weight:600; font-size:0.95rem;">Thông Báo</span>
                                <span id="markAllReadBtn" style="color:#3b82f6; font-size:0.8rem; cursor:pointer; font-weight:500;">Đánh dấu đã đọc tất cả</span>
                            </div>
                            <div id="notificationList" style="max-height:350px; overflow-y:auto;">
                                <div style="padding:20px; text-align:center; color:#9ca3af; font-size:0.9rem;">Đang tải...</div>
                            </div>
                            <a href="notifications" style="display:block; padding:12px; text-align:center; border-top:1px solid #e5e7eb; color:#3b82f6; text-decoration:none; font-size:0.9rem; font-weight:500; background:#f9fafb;">Xem tất cả thông báo</a>
                        </div>
                    </div>

                    <div class="user-profile" id="userProfileDropdownToggle" style="display:flex; align-items:center; gap:10px; cursor:pointer; position:relative;">
                        <div class="profile-text-container" style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                            <div style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;" id="topbarName">Đang tải...</div>
                            <div id="topbarBadges" style="margin-top: 4px; display: flex; gap: 4px; justify-content: flex-end;"></div>
                        </div>
                        <div class="user-avatar" id="topbarAvatar" style="flex-shrink: 0;">U</div>
                        <span style="font-size:0.7rem; color:var(--text-muted)">▼</span>

                        <!-- Dropdown Menu -->
                        <div id="userDropdownMenu" style="display:none; position:absolute; top:calc(100% + 10px); right:0; background:white; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1); border:1px solid #e5e7eb; min-width:210px; z-index:100; flex-direction:column; overflow:hidden;">
                            <a href="profile" style="padding:14px 18px; color:var(--text-dark); text-decoration:none; display:flex; align-items:center; gap:12px; font-size:0.95rem; transition:background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                                <span style="font-size:1.1rem;">👤</span> Thông Tin Tài Khoản
                            </a>
                            <div style="height:1px; background:#e5e7eb; margin:0;"></div>
                            <a href="#" id="btnLogout" style="padding:14px 18px; color:#ef4444; text-decoration:none; display:flex; align-items:center; gap:12px; font-size:0.95rem; transition:background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">
                                <span style="font-size:1.1rem;">🚪</span> Đăng Xuất
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="page-container" id="pageContent">
                <!-- Page Content Injected Here -->
            </div>
        </div>
    `;

    // Move existing body content into pageContent
    const existingContent = document.body.innerHTML;
    document.body.innerHTML = layout;
    document.getElementById('pageContent').innerHTML = existingContent;

    // Handle Dropdown
    const userProfileToggle = document.getElementById('userProfileDropdownToggle');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userProfileToggle && userDropdownMenu) {
        userProfileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (userDropdownMenu.style.display === 'none' || userDropdownMenu.style.display === '') {
                userDropdownMenu.style.display = 'flex';
            } else {
                userDropdownMenu.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (!userProfileToggle.contains(e.target)) {
                userDropdownMenu.style.display = 'none';
            }
        });
    }

    // Handle Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            Api.removeToken();
            window.location.href = 'login';
        });
    }

    function initAffiliateSignalR(affiliateId) {
        if (typeof signalR === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/8.0.0/signalr.min.js';
            script.onload = () => connectAffiliateSignalR(affiliateId);
            document.head.appendChild(script);
        } else {
            connectAffiliateSignalR(affiliateId);
        }
    }

    function connectAffiliateSignalR(affiliateId) {
        if (typeof signalR === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/7.0.5/signalr.min.js';
            script.onload = () => initSignalR(affiliateId);
            document.head.appendChild(script);
        } else {
            initSignalR(affiliateId);
        }
    }

    function initSignalR(affiliateId) {
        const hubBaseUrl = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055' 
            ? 'http://localhost:5055/hub/notifications' 
            : '/hub/notifications';
            
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubBaseUrl)
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveAffiliateNotification", function (title, message, type) {
            if (typeof window.updateUnreadCount === 'function') {
                window.updateUnreadCount();
            }
            const bellBtn = document.getElementById('notificationBell');
            if (bellBtn) {
                bellBtn.style.animation = 'none';
                void bellBtn.offsetWidth; 
                bellBtn.style.animation = 'ring 0.5s ease 3';
            }

            // Hiển thị Popup Toast nổi bật
            let container = document.getElementById('signalr-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'signalr-toast-container';
                container.style.position = 'fixed';
                container.style.bottom = '20px';
                container.style.right = '20px';
                container.style.zIndex = '99999';
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.gap = '10px';
                
                const style = document.createElement('style');
                style.innerHTML = `
                    @keyframes slideInRightToast { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    @keyframes fadeOutRightToast { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
                `;
                document.head.appendChild(style);
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.style.background = '#ffffff';
            toast.style.borderLeft = '4px solid ' + (title.includes('từ chối') || title.includes('Huỷ') ? '#ef4444' : '#10b981');
            toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            toast.style.padding = '12px 16px';
            toast.style.borderRadius = '6px';
            toast.style.minWidth = '250px';
            toast.style.maxWidth = '350px';
            toast.style.animation = 'slideInRightToast 0.3s ease-out forwards';
            
            toast.innerHTML = `
                <div style="font-weight:600; font-size:0.95rem; margin-bottom:4px; color:#111827;">${title}</div>
                <div style="font-size:0.85rem; color:#4b5563; line-height:1.4;">${message}</div>
            `;
            
            container.appendChild(toast);
            
            // Auto remove after 6 seconds
            setTimeout(() => {
                toast.style.animation = 'fadeOutRightToast 0.3s ease-in forwards';
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 6000);
            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown && dropdown.style.display === 'flex' && typeof window.loadNotificationList === 'function') {
                const listEl = document.getElementById('notificationList');
                if (listEl) window.loadNotificationList(listEl);
            }
            if (typeof window.loadNotifications === 'function' && window.location.pathname.includes('notifications')) {
                window.loadNotifications(1);
            }
        });

        connection.start().then(() => {
            connection.invoke("JoinAffiliateGroup", affiliateId.toString()).catch(err => console.error("Error joining group:", err));
        }).catch(err => console.error("SignalR connection error:", err));
    }

    // Mobile Sidebar Toggle Logic
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }
    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Load Profile for Topbar
    Api.request('/affiliates/profile').then(profile => {
        if (profile) {
            if (profile.id) {
                initAffiliateSignalR(profile.id);
            }
            document.getElementById('topbarName').textContent = profile.name || profile.affiliateCode;
            document.getElementById('topbarAvatar').textContent = (profile.name || profile.affiliateCode).charAt(0).toUpperCase();
            window.affiliateTier = profile.tier || 'Thường';

            // Add Tier & Status Badges
            let badgesHtml = '';

            // Tier Badge
            const tier = profile.tier || 'Thường';
            let tierIcon = '🌱';
            let tierColor = '#4b5563';
            let tierBg = '#f9fafb';
            let tierBorder = '#e5e7eb';
            
            if (tier === 'Bạc') {
                tierIcon = '🥈';
                tierColor = '#64748b';
                tierBg = '#f8fafc';
                tierBorder = '#cbd5e1';
            } else if (tier === 'Vàng') {
                tierIcon = '🥇';
                tierColor = '#ca8a04';
                tierBg = '#fefce8';
                tierBorder = '#fef08a';
            } else if (tier === 'Kim Cương' || tier === 'VIP') {
                tierIcon = '💎';
                tierColor = '#0d9488';
                tierBg = '#f0fdfa';
                tierBorder = '#5eead4';
            }
            
            badgesHtml += `<span style="background:${tierBg}; color:${tierColor}; font-size:0.75rem; font-weight:600; padding:2px 8px; border-radius:12px; border: 1px solid ${tierBorder}; display: inline-flex; align-items: center; gap: 4px;"><span>${tierIcon}</span> ${tier}</span>`;

            // Status Badge
            if (profile.status === 'Active') {
                badgesHtml += `<span style="background:#ecfdf5; color:#10b981; font-size:0.7rem; font-weight:600; padding:2px 8px; border-radius:12px; border: 1px solid #10b98140">Đang hoạt động</span>`;
            } else if (profile.status === 'Pending') {
                badgesHtml += `<span style="background:#fffbeb; color:#d97706; font-size:0.7rem; font-weight:600; padding:2px 8px; border-radius:12px; border: 1px solid #d9770640">Chờ duyệt</span>`;
            } else {
                badgesHtml += `<span style="background:#fef2f2; color:#ef4444; font-size:0.7rem; font-weight:600; padding:2px 8px; border-radius:12px; border: 1px solid #ef444440">${profile.status}</span>`;
            }

            // Check pending status to block UI
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';
            const allowedPages = ['profile', 'profile.html', 'login', 'login.html', 'register', 'register.html', 'policy', 'policy.html'];
            
            if (profile.status === 'Pending' && !allowedPages.includes(currentPath)) {
                const style = document.createElement('style');
                style.textContent = `
                    #pageContent { display: none !important; }
                    .sidebar-nav .nav-item:not([href*="profile"]):not([href*="policy"]) { opacity: 0.5 !important; pointer-events: none !important; }
                `;
                document.head.appendChild(style);

                const mainContent = document.getElementById('mainContent');
                if (mainContent && !document.getElementById('pendingOverlay')) {
                    const overlay = document.createElement('div');
                    overlay.id = 'pendingOverlay';
                    overlay.style.cssText = `
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        padding: 40px 20px;
                        background: #f9fafb;
                        min-height: calc(100vh - 70px);
                    `;
                    overlay.innerHTML = `
                        <div style="font-size: 4rem; margin-bottom: 20px;">⏳</div>
                        <h2 style="font-size: 1.5rem; font-weight: 600; color: #1f2937; margin-bottom: 12px;">Tài khoản đang chờ duyệt</h2>
                        <p style="color: #4b5563; max-width: 500px; line-height: 1.6; margin-bottom: 24px;">
                            Hồ sơ của bạn đã được tiếp nhận và đang chờ Admin phê duyệt. Quá trình này có thể mất 1-2 ngày làm việc.<br>
                            Chức năng này tạm thời bị khóa.
                        </p>
                        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px; max-width: 500px; text-align: left; width: 100%;">
                            <strong style="color: #92400e; display: block; margin-bottom: 8px;">💡 Gợi ý:</strong>
                            <span style="color: #b45309;">Vui lòng cập nhật đầy đủ <b>Thông tin thanh toán (Ngân hàng)</b> tại trang Hồ sơ cá nhân để quá trình xét duyệt diễn ra nhanh hơn.</span>
                        </div>
                        <a href="profile" style="background: #d97706; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Cập nhật Hồ sơ ngay</a>
                    `;
                    mainContent.appendChild(overlay);
                }
            }

            document.getElementById('topbarBadges').innerHTML = badgesHtml;
            
            initNotifications();
        }
    }).catch(err => {
        console.error("Lỗi lấy thông tin profile:", err);
    });
}

function initNotifications() {
    const bell = document.getElementById('notificationBell');
    const badge = document.getElementById('notificationBadge');
    const dropdown = document.getElementById('notificationDropdown');
    const listEl = document.getElementById('notificationList');
    const markAllBtn = document.getElementById('markAllReadBtn');

    if (!bell) return;

    window.updateUnreadCount = function() {
        Api.request('/affiliates/notifications/unread-count').then(res => {
            if (res && res.unreadCount > 0) {
                badge.textContent = res.unreadCount > 99 ? '99+' : res.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }).catch(()=>{});
    };

    window.updateUnreadCount();

    bell.addEventListener('click', (e) => {
        if (e.target.closest('#notificationDropdown')) return;
        const isShowing = dropdown.style.display === 'flex';
        dropdown.style.display = isShowing ? 'none' : 'flex';
        if (!isShowing) {
            window.loadNotificationList(listEl);
        }
    });

    document.addEventListener('click', (e) => {
        if (!bell.contains(e.target) && !e.target.closest('#notificationModal')) {
            dropdown.style.display = 'none';
        }
    });

    if (markAllBtn) {
        markAllBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await Api.request('/affiliates/notifications/read-all', { method: 'PUT' });
                badge.style.display = 'none';
                window.loadNotificationList(listEl);
                if (typeof window.loadNotifications === 'function' && window.location.pathname.includes('notifications')) {
                    window.loadNotifications(1);
                }
            } catch (e) {}
        });
    }
}

window.formatNotificationTime = function(dateString) {
    if (!dateString) return '';
    try {
        let cleanDate = dateString.replace('Z', ''); 
        var d = new Date(cleanDate);
        var now = new Date();
        var diff = Math.max(0, (now - d) / 1000);
        
        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return Math.floor(diff / 60) + ' phút trước';
        if (diff < 86400) return Math.floor(diff / 3600) + ' giờ trước';
        
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        var hours = String(d.getHours()).padStart(2, '0');
        var minutes = String(d.getMinutes()).padStart(2, '0');
        return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
    } catch(e) {
        return dateString;
    }
}

window.loadNotificationList = async function(listEl) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#9ca3af; font-size:0.9rem;">Đang tải...</div>';
    try {
        const res = await Api.request('/affiliates/notifications?limit=5');
        if (res && res.data && res.data.length > 0) {
            listEl.innerHTML = res.data.map(n => {
                let icon = '📢';
                let bg = n.isRead ? 'transparent' : '#eff6ff';
                if (n.type === 'commission') icon = '💰';
                if (n.type === 'tier') icon = '🏆';
                if (n.type === 'order') icon = '🛒';
                let safeTitle = n.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                let safeMessage = n.message.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                let safeDate = window.formatNotificationTime(n.createdAt);
                
                return `
                    <div style="padding:12px 16px; border-bottom:1px solid #f3f4f6; display:flex; gap:12px; background:${bg}; cursor:pointer;" onclick="viewNotificationDetail(${n.id}, '${safeTitle}', '${safeMessage}', '${safeDate}', this)">
                        <div style="font-size:1.5rem; flex-shrink:0;">${icon}</div>
                        <div>
                            <div style="font-weight:600; font-size:0.9rem; color:#111827; margin-bottom:4px;">${n.title}</div>
                            <div style="font-size:0.85rem; color:#4b5563; line-height:1.4;">${n.message}</div>
                            <div style="font-size:0.75rem; color:#9ca3af; margin-top:6px;">${safeDate}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#9ca3af; font-size:0.9rem;">Không có thông báo nào.</div>';
        }
    } catch (e) {
        listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#ef4444; font-size:0.9rem;">Lỗi tải dữ liệu.</div>';
    }
}

window.viewNotificationDetail = async function(id, title, message, date, el) {
    // Show modal
    const modalHtml = `
        <div id="notificationModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999; padding: 20px;">
            <div style="background:white; border-radius:12px; width:100%; max-width:500px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); overflow:hidden; animation: slideUp 0.3s ease-out;">
                <div style="padding:20px 24px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.25rem; font-weight:700; color:#111827;">Chi tiết thông báo</h3>
                    <button onclick="document.getElementById('notificationModal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#9ca3af; line-height:1;">&times;</button>
                </div>
                <div style="padding:24px;">
                    <h4 style="margin:0 0 12px 0; font-size:1.1rem; font-weight:600; color:#1f2937;">${title}</h4>
                    <p style="margin:0 0 16px 0; font-size:0.95rem; color:#4b5563; line-height:1.6;">${message}</p>
                    <div style="font-size:0.85rem; color:#9ca3af; display:flex; align-items:center; gap:6px;">
                        <span>🕒</span> ${date}
                    </div>
                </div>
                <div style="padding:16px 24px; border-top:1px solid #e5e7eb; text-align:right; background:#f9fafb;">
                    <button onclick="document.getElementById('notificationModal').remove()" style="background:#3b82f6; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:500; cursor:pointer;">Đóng</button>
                </div>
            </div>
        </div>
    `;
    
    // Check if modal exists
    const existingModal = document.getElementById('notificationModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Update UI locally
    if (el) {
        el.style.background = 'transparent';
        el.classList.remove('unread');
    }

    // Call API silently
    try {
        await Api.request(`/affiliates/notifications/${id}/read`, { method: 'PUT' });
        if (typeof window.updateUnreadCount === 'function') {
            window.updateUnreadCount();
        }
    } catch (e) {
        console.error("Lỗi cập nhật trạng thái đã đọc:", e);
    }
}

function showAlert(id, message, type) {
    const alertEl = document.getElementById(id);
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = `alert alert-${type}`;
    alertEl.style.display = 'block';
    setTimeout(() => { alertEl.style.display = 'none'; }, 5000);
}

// ─── Global Toast System ───────────────────────────────────────────────────
function showToast(message, type = 'success', duration = 3500) {
    // Create container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = {
        success: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', icon: '#10b981' },
        error: { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', icon: '#ef4444' },
        warning: { bg: '#fffbeb', border: '#fcd34d', text: '#78350f', icon: '#f59e0b' },
        info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a5f', icon: '#3b82f6' }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${c.bg};
        border: 1px solid ${c.border};
        border-left: 4px solid ${c.icon};
        color: ${c.text};
        padding: 14px 18px;
        border-radius: 10px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 280px;
        max-width: 380px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        pointer-events: all;
        opacity: 0;
        transform: translateX(30px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        font-size: 0.9rem;
        font-family: 'Inter', sans-serif;
        line-height: 1.4;
    `;
    toast.innerHTML = `
        <span style="font-size:1.2rem; flex-shrink:0; margin-top:1px">${icons[type] || icons.info}</span>
        <span style="flex:1; font-weight:500">${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:${c.text};opacity:0.5;font-size:1rem;padding:0;line-height:1;flex-shrink:0">✕</button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
    });

    // Auto dismiss
    const timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);

    // Cancel timer if dismissed manually
    toast.querySelector('button').addEventListener('click', () => clearTimeout(timer));
}

// ─── Site Config Synchronization ─────────────────────────────────────────────
(function () {
    async function loadSiteConfig() {
        try {
            var cached = sessionStorage.getItem('pgt_site_config');
            if (cached) {
                applySiteConfig(JSON.parse(cached));
            }
        } catch (e) { }

        try {
            const response = await fetch('/api/site-config');
            if (response.ok) {
                const config = await response.json();
                sessionStorage.setItem('pgt_site_config', JSON.stringify(config));
                applySiteConfig(config);
            }
        } catch (error) {
            console.warn('Cannot fetch site config:', error);
        }
    }

    function resolveImgUrl(url, defaultUrl) {
        if (!url) return defaultUrl;
        if (url.startsWith('/uploads/')) {
            const dynamicBase = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5055' ? 'http://localhost:5055' : '';
            return dynamicBase + url;
        }
        return url;
    }

    function applySiteConfig(config) {
        if (!config) return;

        // 1. Update logo images
        document.querySelectorAll('.js-config-logo').forEach(el => {
            let logoUrl = resolveImgUrl(config.logoUrl, '/assets/images/logo.png');
            if (logoUrl && !logoUrl.startsWith('data:')) {
                logoUrl += '?v=' + Date.now();
            }
            if (el.tagName.toLowerCase() === 'img') {
                el.src = logoUrl;
            } else {
                el.style.backgroundImage = `url('${logoUrl}')`;
            }
        });

        // 2. Update store name
        document.querySelectorAll('.js-config-store-name').forEach(el => {
            el.textContent = config.storeName || 'Phúc Gia Tiên';
        });

        // 3. Update JSON-LD schema logo URL
        updateSchemaLogo(resolveImgUrl(config.logoUrl, '/assets/images/logo.png'));

        // 4. Update Zalo and Hotline in Affiliate sidebar
        if (config.zalo) {
            let zaloLink = config.zalo;
            // Nếu chỉ là số điện thoại thì biến thành link zalo.me
            if (/^[0-9+.\-\s]+$/.test(zaloLink)) {
                zaloLink = 'https://zalo.me/' + zaloLink.replace(/[^0-9]/g, '');
            } else if (!zaloLink.startsWith('http')) {
                zaloLink = 'https://zalo.me/' + zaloLink;
            }
            document.querySelectorAll('.js-config-zalo-link').forEach(el => el.href = zaloLink);
        }
        if (config.phone) {
            document.querySelectorAll('.js-config-hotline-text').forEach(el => el.textContent = 'Hotline: ' + config.phone);
        }
    }

    function updateSchemaLogo(logoUrl) {
        if (!logoUrl) return;

        if (logoUrl.startsWith('/')) {
            logoUrl = window.location.origin + logoUrl;
        } else if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
            logoUrl = window.location.origin + '/' + logoUrl;
        }

        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                var json = JSON.parse(script.textContent);
                var changed = false;

                function checkAndUpdate(obj) {
                    if (!obj || typeof obj !== 'object') return;

                    if (obj.logo) {
                        if (typeof obj.logo === 'string') {
                            obj.logo = logoUrl;
                            changed = true;
                        } else if (typeof obj.logo === 'object') {
                            obj.logo.url = logoUrl;
                            changed = true;
                        }
                    } else if (obj['@type'] === 'Organization' || obj['@type'] === 'LocalBusiness' || obj['@type'] === 'Store') {
                        obj.logo = logoUrl;
                        changed = true;
                    }

                    if (obj.publisher) checkAndUpdate(obj.publisher);
                    if (obj.provider) checkAndUpdate(obj.provider);
                    if (obj.brand) checkAndUpdate(obj.brand);
                }

                checkAndUpdate(json);
                if (changed) {
                    script.textContent = JSON.stringify(json, null, 2);
                }
            } catch (e) { }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSiteConfig);
    } else {
        loadSiteConfig();
    }
})();

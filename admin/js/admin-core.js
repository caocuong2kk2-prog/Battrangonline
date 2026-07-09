// admin-core.js – Sidebar, Auth Guard, Toast, Utils
(function(){'use strict';

var ADMIN_SESSION_KEY='pgt_admin_session';
var PUBLIC_PAGES=["login", "login.html", "forgot-password", "forgot-password.html"];

// ── Clean Address Bar URL (Strip .html automatically without reload) ──
if (window.location.pathname && window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('/404.html')) {
  var cleanUrl = window.location.pathname.replace(/\.html$/i, '') + window.location.search + window.location.hash;
  window.history.replaceState(null, '', cleanUrl);
}

// ── Anti-flicker Sidebar Collapse State Check ──
if (localStorage.getItem('sidebar-collapsed') === 'true') {
  document.documentElement.classList.add('sidebar-collapsed');
}

// ── Auth Guard ──
function isPublicPage(){
  var page = location.pathname.split('/').filter(Boolean).pop() || "";
  var cleanPage = page.replace(/\.html$/i, "");
  return PUBLIC_PAGES.some(function(p){ return cleanPage === p.replace(/\.html$/i, ""); });
}
function getAdminSession(){
  try{return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY)||'null');}catch(e){return null;}
}
function requireAuth(){
  if(isPublicPage())return;
  var sess=getAdminSession();
  if(!sess){window.location.href="login";}
}
requireAuth();

// ── Security Utilities (XSS Prevention) ──
window.escapeHTML = function (str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

function adminLogout(){
  localStorage.removeItem(ADMIN_SESSION_KEY);
  location.href="login";
}
window.adminLogout=adminLogout;
window.getAdminSession=getAdminSession;

// ── Sidebar Toggle ──
function initSidebar(){
  var sidebar=document.getElementById('adminSidebar');
  var overlay=document.getElementById('sidebarOverlay');
  var toggle=document.getElementById('sidebarToggle');
  if(!sidebar)return;
  
  function openSidebar(){sidebar.classList.add('is-open');if(overlay)overlay.classList.add('is-visible');document.body.style.overflow='hidden';}
  function closeSidebar(){sidebar.classList.remove('is-open');if(overlay)overlay.classList.remove('is-visible');document.body.style.overflow='';}
  
  if(toggle) {
    toggle.addEventListener('click', function(){
      if (window.innerWidth > 1024) {
        // Desktop Collapse / Expand
        var isCollapsed = document.documentElement.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false');
        // Dispatch window resize event for charts/responsive components to auto-adjust
        window.dispatchEvent(new Event('resize'));
      } else {
        // Mobile Toggle Drawer
        sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
      }
    });
  }
  if(overlay)overlay.addEventListener('click',closeSidebar);
}

// ── Sidebar Premium Tooltips ──
function initSidebarTooltips() {
  var links = document.querySelectorAll('.sidebar-nav__link');
  var tooltip = document.getElementById('sidebar-tooltip');
  
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'sidebar-tooltip';
    tooltip.className = 'sidebar-tooltip';
    document.body.appendChild(tooltip);
  }
  
  links.forEach(function(link) {
    var textEl = link.querySelector('.sidebar-nav__text');
    if (!textEl) return;
    var text = textEl.textContent.trim();
    
    link.addEventListener('mouseenter', function() {
      if (!document.documentElement.classList.contains('sidebar-collapsed') || window.innerWidth <= 1024) return;
      
      tooltip.textContent = text;
      tooltip.classList.add('is-visible');
      
      var rect = link.getBoundingClientRect();
      var top = rect.top + (rect.height / 2);
      var left = rect.right + 10;
      
      tooltip.style.top = top + 'px';
      tooltip.style.left = left + 'px';
    });
    
    link.addEventListener('mouseleave', function() {
      tooltip.classList.remove('is-visible');
    });
    
    link.addEventListener('click', function() {
      tooltip.classList.remove('is-visible');
    });
  });
}

// ── Active Nav ──
function initActiveNav(){
  var page=location.pathname.split('/').pop()||"./";
  document.querySelectorAll('.sidebar-nav__link').forEach(function(a){
    var href=a.getAttribute('href')||'';
    if(href===page||href.endsWith('/'+page)){a.classList.add('active');}
    else{a.classList.remove('active');}
  });
}

// ── Admin User Display ──
function initUserDisplay(){
  var session=getAdminSession();
  if(!session)return;
  document.querySelectorAll('.js-admin-name').forEach(function(el){el.textContent=session.name||'Admin';});
  document.querySelectorAll('.js-admin-initial').forEach(function(el){el.textContent=(session.name||'A').charAt(0).toUpperCase();});
  
  var role = session.role || 'staff';
  document.querySelectorAll('.sidebar-user__role').forEach(function(el){
    el.textContent = role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
  });

  if (role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(function(el) {
      el.style.display = 'none';
    });
  }
}

// ── Toast ──
window.adminToast=function(msg,type,dur){
  type=type||'info'; dur=dur||3200;
  var icons={success:'✔',error:'✖',warning:'⚠',info:'ℹ'};
  var container=document.getElementById('admin-toast-container');
  if(!container){container=document.createElement('div');container.id='admin-toast-container';document.body.appendChild(container);}
  var t=document.createElement('div');
  t.className='admin-toast admin-toast--'+type;
  t.innerHTML='<span class="admin-toast__icon">'+icons[type]+'</span><span class="admin-toast__msg">'+msg+'</span>';
  container.appendChild(t);
  setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(100%)';t.style.transition='all .3s ease';setTimeout(function(){t.remove();},320);},dur);
};

// ── Modal helpers (with focus trap) ──
var _modalTrapHandler = null;
var _modalPrevFocus = null;

window.openModal=function(id){
  var m=document.getElementById(id);
  if(!m) return;
  _modalPrevFocus = document.activeElement;
  m.classList.add('is-open');
  document.body.style.overflow='hidden';
  m.querySelectorAll('select').forEach(function(sel) {
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Focus first input/textarea inside modal
  setTimeout(function(){
    var first = m.querySelector('input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])');
    if(first) first.focus();
  }, 50);

  // Set up focus trap and ESC to close
  if(_modalTrapHandler) document.removeEventListener('keydown', _modalTrapHandler);
  _modalTrapHandler = function(e){
    if(e.key === 'Escape') {
      closeModal(id);
      return;
    }
    if(e.key !== 'Tab') return;
    var focusable = m.querySelectorAll('input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])');
    if(!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if(e.shiftKey){
      if(document.activeElement === first){ e.preventDefault(); last.focus(); }
    } else {
      if(document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', _modalTrapHandler);
};
window.closeModal=function(id){
  var m=document.getElementById(id);
  if(m)m.classList.remove('is-open');
  document.body.style.overflow='';
  // Remove focus trap
  if(_modalTrapHandler){ document.removeEventListener('keydown', _modalTrapHandler); _modalTrapHandler = null; }
  // Restore previous focus
  if(_modalPrevFocus && _modalPrevFocus.focus){ try{ _modalPrevFocus.focus(); }catch(e){} _modalPrevFocus = null; }
};
// Close on overlay click
document.addEventListener('click',function(e){
  if(e.target.classList.contains('modal-overlay')){
    e.target.classList.remove('is-open');
    document.body.style.overflow='';
  }
});
// Close btn
document.addEventListener('click',function(e){
  var btn=e.target.closest('[data-close-modal]');
  if(btn){closeModal(btn.dataset.closeModal);}
});

// ── Inline Validation Errors ──
window.setInlineError = function(elementOrId, msg) {
  var el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!el) return;
  el.classList.add('is-invalid');
  var parent = el.parentNode;
  var errEl = parent.querySelector('.inline-error-msg');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'inline-error-msg';
    errEl.style.color = '#dc2626';
    errEl.style.fontSize = '12px';
    errEl.style.marginTop = '4px';
    parent.appendChild(errEl);
  }
  errEl.textContent = msg;
};

window.clearInlineErrors = function(formOrId) {
  var container = typeof formOrId === 'string' ? document.getElementById(formOrId) : formOrId;
  if (!container) return;
  var invalids = container.querySelectorAll('.is-invalid');
  invalids.forEach(function(el) { el.classList.remove('is-invalid'); });
  var errs = container.querySelectorAll('.inline-error-msg');
  errs.forEach(function(el) { el.remove(); });
};

// ── Global Enter Key to Save ──
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    var tag = e.target.tagName.toLowerCase();
    // Only apply if user is focused on an input or select
    if (tag === 'input' || tag === 'select') {
      // Exclude textarea/checkbox/radio if necessary (input type)
      if (e.target.type === 'checkbox' || e.target.type === 'radio') return;

      var modal = e.target.closest('.modal-overlay.is-open');
      var form = e.target.closest('form');
      var saveBtn = null;
      
      if (modal) {
        saveBtn = modal.querySelector('.modal-footer [id^="btn-save"]') || 
                  modal.querySelector('.modal-footer .btn--primary');
      } else if (form) {
        saveBtn = form.querySelector('[id^="btn-save"]') || 
                  form.querySelector('.btn--primary');
      } else {
        // Fallback for page-level save buttons outside form
        var main = e.target.closest('.admin-content');
        if(main) {
          saveBtn = main.querySelector('[id^="btn-save"]');
        }
      }
      
      if (saveBtn && !saveBtn.disabled) {
        e.preventDefault();
        saveBtn.click();
      }
    }
  }
});

// ── formatVND ──
window.fmtVND=function(n){return Number(n).toLocaleString('vi-VN')+'đ';};

// ── Shared Video Thumbnail Generators ──
window.getAdminPlatform = function(url) {
    if (!url) return 'unknown';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.match(/\.(mp4|mov|avi|webm|ogg)$/i)) return 'local';
    return 'other';
};
window.generateAdminThumbnailHTML = function(src, size, extraClasses, extraAttrs) {
    var platform = window.getAdminPlatform(src);
    var classes = extraClasses ? ' ' + extraClasses : '';
    var attrs = extraAttrs ? ' ' + extraAttrs : '';
    
    if (platform === 'local') {
      return '<video src="' + src + '"' + attrs + ' class="' + classes.trim() + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:cover;border-radius:4px;cursor:pointer;" muted></video>';
    } else if (platform === 'other' || platform === 'unknown') {
      return '<img src="' + src + '"' + attrs + ' class="' + classes.trim() + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:cover;border-radius:4px;cursor:pointer;">';
    }

    var playColor = platform === 'youtube' ? '#ff0000' : (platform === 'facebook' ? '#1877f2' : '#010101');
    var playOverlay = '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);z-index:2;pointer-events:none;"></div>' +
                      '<div style="position:absolute;z-index:3;width:24px;height:24px;background:' + playColor + ';border-radius:0;display:flex;align-items:center;justify-content:center;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>' +
                      '</div>';

    if (platform === 'youtube') {
      var ytMatch = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/)|shorts\/)([A-Za-z0-9_-]{11})/);
      var ytId = (ytMatch && ytMatch[1]) ? ytMatch[1] : '';
      var thumbSrc = ytId ? 'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg' : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '"><rect width="100%" height="100%" fill="%23333"/></svg>';
      return '<div class="' + classes.trim() + '"' + attrs + ' data-src="' + src + '" style="position:relative;width:' + size + 'px;height:' + size + 'px;border-radius:4px;overflow:hidden;cursor:pointer;display:inline-block;vertical-align:middle;">' +
               '<img src="' + thumbSrc + '" style="width:100%;height:100%;object-fit:cover;pointer-events:none;">' + playOverlay +
             '</div>';
    } else if (platform === 'facebook') {
      return '<div class="admin-async-thumb ' + classes.trim() + '"' + attrs + ' data-src="' + src + '" style="position:relative;width:' + size + 'px;height:' + size + 'px;border-radius:4px;overflow:hidden;background:#1877f2;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;cursor:pointer;flex-direction:column;font-weight:600;"><span style="font-size:14px;margin-bottom:2px;pointer-events:none;">▶️</span><span style="pointer-events:none;">Facebook</span></div>';
    } else if (platform === 'tiktok') {
      return '<div class="admin-async-thumb ' + classes.trim() + '"' + attrs + ' data-src="' + src + '" style="position:relative;width:' + size + 'px;height:' + size + 'px;border-radius:4px;overflow:hidden;background:#010101;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;cursor:pointer;flex-direction:column;font-weight:600;"><span style="font-size:14px;margin-bottom:2px;pointer-events:none;">▶️</span><span style="pointer-events:none;">TikTok</span></div>';
    }
};
window.initAdminAsyncThumbnails = function(container) {
    if (!container) return;
    var dynamicBase = '/api';
    var API_BASE = (window.AdminData && window.AdminData.apiBase) || dynamicBase;
    var thumbs = container.querySelectorAll('.admin-async-thumb:not(.loaded)');
    thumbs.forEach(function(thumb) {
      thumb.classList.add('loaded');
      var src = thumb.dataset.src;
      var proxyUrl = API_BASE + '/upload/video-thumbnail?url=' + encodeURIComponent(src);
      fetch(proxyUrl).then(function(res) { return res.json(); }).then(function(data) {
        var applyIframeFallback = function() {
            var platform = window.getAdminPlatform(src);
            var isSmall = thumb.style.width === '40px';
            var w = isSmall ? 40 : 60;
            var playOverlay = '<div style="position:absolute;inset:0;z-index:10;cursor:pointer;background:transparent;"></div>';
            thumb.style.background = '#000';
            thumb.style.padding = '0';
            thumb.style.display = 'block'; // Remove flex to avoid flex alignment issues
            
            if (platform === 'facebook') {
                var scaleFb = w / 250;
                var fbEmbedUrl = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(src) + '&show_text=false';
                var fbStyle = 'position:absolute;top:50%;left:50%;border:none;pointer-events:none;width:250px;height:250px;transform:translate(-50%,-50%) scale(' + scaleFb + ');transform-origin:center;';
                thumb.innerHTML = '<iframe src="' + fbEmbedUrl + '" scrolling="no" frameborder="0" allowfullscreen style="' + fbStyle + '" tabindex="-1"></iframe>' + playOverlay;
            } else if (platform === 'tiktok') {
                var scaleTt = w / 300;
                var ttMatch = src.match(/video\/(\d+)/);
                if (ttMatch) {
                    var ttStyle = 'position:absolute;top:50%;left:50%;border:none;pointer-events:none;width:300px;height:400px;transform:translate(-50%,-50%) scale(' + scaleTt + ');transform-origin:center;';
                    thumb.innerHTML = '<iframe src="https://www.tiktok.com/player/v1/' + ttMatch[1] + '" allowfullscreen style="' + ttStyle + '" tabindex="-1"></iframe>' + playOverlay;
                }
            }
        };

        if (data && data.url) {
          var img = new Image();
          img.onload = function() {
            var playOverlay = '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);z-index:2;pointer-events:none;"></div>' +
                              '<div style="position:absolute;z-index:3;width:24px;height:24px;background:#010101;border-radius:0;display:flex;align-items:center;justify-content:center;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>';
            thumb.innerHTML = '<img src="' + data.url + '" style="width:100%;height:100%;object-fit:cover;pointer-events:none;">' + playOverlay;
          };
          img.onerror = applyIframeFallback;
          img.src = data.url;
        } else {
            applyIframeFallback();
        }
      }).catch(function() { applyIframeFallback(); });
    });
};

// ── Confirm dialog ──
window.adminConfirm=function(msg,cb,options){
  var opts = options || {};
  var title = opts.title || 'Xác nhận hành động';
  var type = opts.type || 'warning';
  
  var modal = document.getElementById('admin-confirm-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'admin-confirm-modal';
    modal.style.zIndex = '9999';
    modal.innerHTML = 
      '<div class="modal" style="max-width:440px;">' +
        '<div class="modal-header" style="padding:16px 20px;">' +
          '<h2 class="modal-title" style="font-size:18px;display:flex;align-items:center;gap:8px;">' +
            '<span id="confirm-modal-icon">⚠️</span>' +
            '<span id="confirm-modal-title">Xác nhận</span>' +
          '</h2>' +
          '<button class="modal-close" id="confirm-modal-close-btn" style="width:28px;height:28px;">✕</button>' +
        '</div>' +
        '<div class="modal-body" id="confirm-modal-message" style="padding:20px;font-size:15px;line-height:1.5;color:var(--text-primary);text-align:left;"></div>' +
        '<div class="modal-footer" style="padding:12px 20px;gap:10px;">' +
          '<button class="btn btn--secondary" id="confirm-modal-cancel-btn" style="padding:8px 16px;font-size:14px;">Hủy bỏ</button>' +
          '<button class="btn" id="confirm-modal-ok-btn" style="padding:8px 16px;font-size:14px;"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }
  
  var titleEl = modal.querySelector('#confirm-modal-title');
  var iconEl = modal.querySelector('#confirm-modal-icon');
  var messageEl = modal.querySelector('#confirm-modal-message');
  var okBtn = modal.querySelector('#confirm-modal-ok-btn');
  var cancelBtn = modal.querySelector('#confirm-modal-cancel-btn');
  var closeBtn = modal.querySelector('#confirm-modal-close-btn');
  
  titleEl.textContent = title;
  messageEl.innerHTML = msg.replace(/\n/g, '<br>');
  
  var icons = {
    warning: '⚠️',
    danger: '🛑',
    info: 'ℹ️',
    success: '✅'
  };
  iconEl.textContent = icons[type] || '⚠️';
  
  okBtn.className = 'btn';
  okBtn.style.backgroundColor = '';
  okBtn.style.borderColor = '';
  okBtn.style.color = '';
  
  if(type === 'danger'){
    okBtn.classList.add('btn--danger');
    okBtn.style.backgroundColor = '#dc2626';
    okBtn.style.borderColor = '#dc2626';
    okBtn.style.color = '#ffffff';
    okBtn.textContent = opts.okText || 'Hủy đơn';
  } else if(type === 'success'){
    okBtn.style.backgroundColor = '#16a34a';
    okBtn.style.borderColor = '#16a34a';
    okBtn.style.color = '#ffffff';
    okBtn.textContent = opts.okText || 'Đồng ý';
  } else if(type === 'info'){
    okBtn.style.backgroundColor = '#0284c7';
    okBtn.style.borderColor = '#0284c7';
    okBtn.style.color = '#ffffff';
    okBtn.textContent = opts.okText || 'Đồng ý';
  } else {
    okBtn.classList.add('btn--primary');
    okBtn.textContent = opts.okText || 'Xác nhận';
  }
  
  var cleanup = function(){
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    var newOkBtn = okBtn.cloneNode(true);
    var newCancelBtn = cancelBtn.cloneNode(true);
    var newCloseBtn = closeBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  };
  
  modal.querySelector('#confirm-modal-ok-btn').addEventListener('click', function(){
    cleanup();
    if(typeof cb === 'function') cb();
  });
  
  var handleCancel = function(){
    cleanup();
  };
  
  modal.querySelector('#confirm-modal-cancel-btn').addEventListener('click', handleCancel);
  modal.querySelector('#confirm-modal-close-btn').addEventListener('click', handleCancel);
  
  setTimeout(function(){
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }, 10);
};

// ── Prompt dialog ──
window.adminPrompt = function(msg, defaultText, cb, options) {
  var opts = options || {};
  var title = opts.title || 'Nhập thông tin';
  var type = opts.type || 'info';
  
  var modal = document.getElementById('admin-prompt-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'admin-prompt-modal';
    modal.style.zIndex = '9999';
    modal.innerHTML = 
      '<div class="modal" style="max-width:440px;">' +
        '<div class="modal-header" style="padding:16px 20px;">' +
          '<h2 class="modal-title" style="font-size:18px;display:flex;align-items:center;gap:8px;">' +
            '<span id="prompt-modal-icon">✏️</span>' +
            '<span id="prompt-modal-title">Nhập liệu</span>' +
          '</h2>' +
          '<button class="modal-close" id="prompt-modal-close-btn" style="width:28px;height:28px;">✕</button>' +
        '</div>' +
        '<div class="modal-body" style="padding:20px;font-size:15px;line-height:1.5;color:var(--text-primary);text-align:left;">' +
          '<div id="prompt-modal-message" style="margin-bottom:12px;"></div>' +
          '<input type="text" id="prompt-modal-input" class="form-control" style="width:100%;">' +
        '</div>' +
        '<div class="modal-footer" style="padding:12px 20px;gap:10px;">' +
          '<button class="btn btn--secondary" id="prompt-modal-cancel-btn" style="padding:8px 16px;font-size:14px;">Hủy bỏ</button>' +
          '<button class="btn" id="prompt-modal-ok-btn" style="padding:8px 16px;font-size:14px;"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }
  
  var titleEl = modal.querySelector('#prompt-modal-title');
  var iconEl = modal.querySelector('#prompt-modal-icon');
  var messageEl = modal.querySelector('#prompt-modal-message');
  var inputEl = modal.querySelector('#prompt-modal-input');
  var okBtn = modal.querySelector('#prompt-modal-ok-btn');
  var cancelBtn = modal.querySelector('#prompt-modal-cancel-btn');
  var closeBtn = modal.querySelector('#prompt-modal-close-btn');
  
  titleEl.textContent = title;
  messageEl.innerHTML = msg.replace(/\n/g, '<br>');
  inputEl.value = defaultText || '';
  inputEl.placeholder = opts.placeholder || 'Nhập lý do...';
  
  var icons = { warning: '⚠️', danger: '🛑', info: 'ℹ️', success: '✅' };
  iconEl.textContent = icons[type] || '✏️';
  
  okBtn.className = 'btn';
  okBtn.style.backgroundColor = '';
  okBtn.style.borderColor = '';
  okBtn.style.color = '';
  
  if(type === 'danger'){
    okBtn.classList.add('btn--danger');
    okBtn.style.backgroundColor = '#dc2626';
    okBtn.style.borderColor = '#dc2626';
    okBtn.style.color = '#ffffff';
  } else {
    okBtn.classList.add('btn--primary');
  }
  okBtn.textContent = opts.okText || 'Xác nhận';
  
  var cleanup = function(){
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  };
  
  var newOkBtn = okBtn.cloneNode(true);
  var newCancelBtn = cancelBtn.cloneNode(true);
  var newCloseBtn = closeBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  
  newOkBtn.addEventListener('click', function(){
    var val = inputEl.value;
    cleanup();
    if(cb) cb(val);
  });
  
  var handleCancel = function(){
    cleanup();
  };
  
  newCancelBtn.addEventListener('click', handleCancel);
  newCloseBtn.addEventListener('click', handleCancel);
  
  setTimeout(function(){
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    inputEl.focus();
  }, 10);
};

// ── Custom Select (Premium UI) ──
window.initCustomSelects=function(root){
  // Clean up orphaned custom select containers from body
  document.querySelectorAll('.custom-select__options').forEach(function(optContainer) {
    var id = optContainer.dataset.selectId;
    if (id && !document.querySelector('.custom-select-wrapper[data-select-id="' + id + '"]')) {
      optContainer.remove();
    }
  });

  var container=root||document;
  var selects=container.querySelectorAll('select.form-control:not(.custom-select-hidden), select.filter-select:not(.custom-select-hidden)');
  selects.forEach(function(select){
    select.classList.add('custom-select-hidden');
    select.style.display='none';
    
    var selectId = select.id || 'sel-' + Math.random().toString(36).substring(2, 9);
    
    var wrapper=document.createElement('div');
    wrapper.className='custom-select-wrapper '+(select.classList.contains('filter-select')?'is-filter':'')+(select.classList.contains('btn-status-change')?' is-small':'');
    wrapper.dataset.selectId = selectId;
    select.parentNode.insertBefore(wrapper,select);
    wrapper.appendChild(select);
    
    var trigger=document.createElement('div');
    trigger.className='custom-select__trigger';
    
    var textSpan=document.createElement('span');
    textSpan.className='custom-select__text';
    var selectedOpt=select.options[select.selectedIndex];
    textSpan.textContent=selectedOpt?selectedOpt.text:'';
    
    var icon=document.createElement('div');
    icon.className='custom-select__icon';
    icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    
    trigger.appendChild(textSpan);
    trigger.appendChild(icon);
    
    var optionsContainer=document.createElement('div');
    optionsContainer.className='custom-select__options '+(select.classList.contains('btn-status-change')?'is-small':'');
    optionsContainer.dataset.selectId = selectId;
    
    var searchInput = null;
    if (select.options.length > 8) {
      var searchWrap = document.createElement('div');
      searchWrap.className = 'custom-select__search';
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Tìm kiếm...';
      searchInput.className = 'custom-select__search-input';
      
      searchInput.addEventListener('input', function(e) {
         var q = e.target.value.toLowerCase();
         Array.from(optionsContainer.querySelectorAll('.custom-select__option')).forEach(function(opt) {
            if(opt.textContent.toLowerCase().includes(q)){
               opt.style.display = '';
            }else{
               opt.style.display = 'none';
            }
         });
      });
      
      searchWrap.addEventListener('click', function(e){ e.stopPropagation(); });
      
      searchWrap.appendChild(searchInput);
      optionsContainer.appendChild(searchWrap);
    }
    
    Array.from(select.options).forEach(function(option,index){
      var optEl=document.createElement('div');
      optEl.className='custom-select__option'+(option.selected?' selected':'');
      optEl.textContent=option.text;
      optEl.dataset.value=option.value;
      
      optEl.addEventListener('click',function(e){
        e.stopPropagation();
        select.selectedIndex=index;
        textSpan.textContent=option.text;
        
        var prev=optionsContainer.querySelector('.selected');
        if(prev)prev.classList.remove('selected');
        optEl.classList.add('selected');
        
        wrapper.classList.remove('open');
        optionsContainer.classList.remove('show');
        select.dispatchEvent(new Event('change',{bubbles:true}));
      });
      optionsContainer.appendChild(optEl);
    });
    
    wrapper.appendChild(trigger);
    document.body.appendChild(optionsContainer); // Append to body to prevent clipping
    
    // Position dynamically on open
    trigger.addEventListener('click',function(e){
      e.stopPropagation();
      var isOpen=wrapper.classList.contains('open');
      
      // Close all others
      document.querySelectorAll('.custom-select-wrapper').forEach(function(w){w.classList.remove('open');});
      document.querySelectorAll('.custom-select__options').forEach(function(o){o.classList.remove('show');});
      
      if(!isOpen){
        wrapper.classList.add('open');
        var rect=trigger.getBoundingClientRect();
        optionsContainer.style.top=(rect.bottom+window.scrollY+4)+'px';
        optionsContainer.style.left=rect.left+'px';
        optionsContainer.style.width=rect.width+'px';
        optionsContainer.classList.add('show');
        if (searchInput) {
          setTimeout(function(){ searchInput.focus(); }, 10);
        }
      }
    });
    
    select.addEventListener('change',function(){
       var opt=select.options[select.selectedIndex];
       if(opt){
          textSpan.textContent=opt.text;
          var prev=optionsContainer.querySelector('.selected');
          if(prev)prev.classList.remove('selected');
          var curr=optionsContainer.querySelector('[data-value="'+opt.value+'"]');
          if(curr)curr.classList.add('selected');
       }
    });
  });
};

document.addEventListener('click',function(e){
  if(!e.target.closest('.custom-select-wrapper') && !e.target.closest('.custom-select__options')){
    document.querySelectorAll('.custom-select-wrapper').forEach(function(w){w.classList.remove('open');});
    document.querySelectorAll('.custom-select__options').forEach(function(o){o.classList.remove('show');});
  }
});

// Close custom selects on scroll
window.addEventListener('scroll',function(e){
  if(e.target.nodeType===1 && e.target.closest('.custom-select__options')) return;
  document.querySelectorAll('.custom-select-wrapper').forEach(function(w){w.classList.remove('open');});
  document.querySelectorAll('.custom-select__options').forEach(function(o){o.classList.remove('show');});
},true);

// ── Brand & Site Config Synchronization ──
function initBrandSchema() {
  // Get cached config dynamically to avoid flickering the old default logo
  var cached = null;
  try {
    cached = JSON.parse(sessionStorage.getItem('pgt_site_config') || 'null');
  } catch (e) {}
  var initialLogoUrl = (cached && cached.logoUrl) ? cached.logoUrl : 'assets/images/logo.png';

  // 1. Sidebar Brand Link Conversion & Image Tagging
  var brand = document.querySelector('.sidebar-brand');
  if (brand) {
    if (brand.tagName === 'DIV') {
      var a = document.createElement('a');
      a.className = brand.className;
      a.href = "./";
      a.innerHTML = brand.innerHTML;
      brand.parentNode.replaceChild(a, brand);
      brand = a;
    }
    var icon = brand.querySelector('.sidebar-brand__icon');
    if (icon) {
      icon.style.background = 'transparent';
      icon.style.borderRadius = '0';
      icon.style.border = 'none';
      icon.style.boxShadow = 'none';
      icon.style.padding = '0';
      icon.style.display = 'flex';
      icon.style.alignItems = 'center';
      icon.style.justifyContent = 'center';
      icon.style.overflow = 'hidden';

      if (icon.tagName === 'IMG') {
        icon.src = initialLogoUrl;
        if (!icon.classList.contains('js-config-logo')) {
          icon.classList.add('js-config-logo');
        }
      } else {
        if (!icon.querySelector('img')) {
          icon.innerHTML = '<img class="js-config-logo" src="' + initialLogoUrl + '" style="width:100%; height:100%; object-fit:cover; border-radius:0;" alt="Logo">';
        } else {
          var img = icon.querySelector('img');
          if (img) {
            img.src = initialLogoUrl;
            img.style.borderRadius = '0';
          }
        }
      }
    }
    var nameEl = brand.querySelector('.sidebar-brand__name');
    if (nameEl && !nameEl.classList.contains('js-config-store-name')) {
      nameEl.classList.add('js-config-store-name');
    }
  }

  // 2. Login Card Logo & Title Tagging
  var loginLogo = document.querySelector('.login-card__logo');
  if (loginLogo) {
    loginLogo.style.background = 'transparent';
    loginLogo.style.borderRadius = '50%';
    loginLogo.style.border = 'none';
    loginLogo.style.boxShadow = 'none';
    loginLogo.style.padding = '0';
    loginLogo.style.display = 'flex';
    loginLogo.style.alignItems = 'center';
    loginLogo.style.justifyContent = 'center';
    loginLogo.style.overflow = 'hidden';

    if (!loginLogo.querySelector('img')) {
      loginLogo.innerHTML = '<img class="js-config-logo" src="' + initialLogoUrl + '" style="width:100%; height:100%; object-fit:cover; border-radius:0;" alt="Logo">';
    } else {
      var img = loginLogo.querySelector('img');
      if (img) {
        img.src = initialLogoUrl;
        img.style.borderRadius = '0';
      }
    }
  }
  var loginTitle = document.querySelector('.login-card__title');
  if (loginTitle && !loginTitle.classList.contains('js-config-store-name')) {
    loginTitle.classList.add('js-config-store-name');
  }
}

function renderBranding(config) {
  if (!config) return;

  // Resolve dynamic backend URL for standalone dev environments
  function resolveAdminImg(url) {
    if (!url) return '';
    // Fix relative path if site-config accidentally stored it with ../
    if (url.startsWith('../assets/')) {
        url = url.substring(3); // removes '../' to make it 'assets/...'
    }
    if (url.startsWith('/uploads/')) {
      var dynamicBase = '';
      return dynamicBase + url;
    }
    return url;
  }

  // Update Logos
  if (config.logoUrl) {
    var finalLogo = resolveAdminImg(config.logoUrl);
    document.querySelectorAll('.js-config-logo').forEach(function(el) {
      el.src = finalLogo;
    });

    // Update Favicon
    var oldShortcut = document.querySelector('link[rel="shortcut icon"]');
    if (oldShortcut) oldShortcut.remove();
    var faviconEl = document.querySelector('link[rel="icon"]');
    if (!faviconEl) {
      faviconEl = document.createElement('link');
      faviconEl.rel = 'icon';
      document.head.appendChild(faviconEl);
    }
    var mimeType = 'image/x-icon';
    if (finalLogo.startsWith('data:')) {
      var match = finalLogo.match(/^data:(image\/[^;]+);/);
      if (match) mimeType = match[1];
      faviconEl.href = finalLogo;
    } else {
      if (finalLogo.toLowerCase().split('?')[0].endsWith('.png')) mimeType = 'image/png';
      else if (finalLogo.toLowerCase().split('?')[0].endsWith('.jpg') || finalLogo.toLowerCase().split('?')[0].endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (finalLogo.toLowerCase().split('?')[0].endsWith('.gif')) mimeType = 'image/gif';
      else if (finalLogo.toLowerCase().split('?')[0].endsWith('.svg')) mimeType = 'image/svg+xml';
      faviconEl.href = finalLogo + (finalLogo.indexOf('?') !== -1 ? '&' : '?') + 'v=' + Date.now();
    }
    faviconEl.type = mimeType;
  }

  // Update Store Name
  if (config.storeName) {
    document.querySelectorAll('.js-config-store-name').forEach(function(el) {
      el.textContent = config.storeName;
    });

    var titleEl = document.querySelector('title');
    if (titleEl && titleEl.textContent && titleEl.textContent.indexOf('Phúc Gia Tiên') !== -1) {
      titleEl.textContent = titleEl.textContent.replace('Phúc Gia Tiên', config.storeName);
    }
  }
}

function applySiteConfig() {
  var CONFIG_KEY = 'pgt_site_config';
  var cached = sessionStorage.getItem(CONFIG_KEY);
  if (cached) {
    try {
      var config = JSON.parse(cached);
      renderBranding(config);
    } catch (e) {
      console.warn('[Admin] Failed to parse cached site config', e);
    }
  }

  if (window.AdminData) {
    AdminData.settings.load().then(function(newConfig) {
      if (!newConfig) return;

      var currentCached = sessionStorage.getItem(CONFIG_KEY);
      var isChanged = true;
      if (currentCached) {
        try {
          var oldConfig = JSON.parse(currentCached);
          // Simple key comparison for branding properties to avoid unnecessary re-renders
          if (oldConfig.logoUrl === newConfig.logoUrl && oldConfig.storeName === newConfig.storeName) {
            isChanged = false;
          }
        } catch (e) {}
      }

      // Always save latest config to cache
      sessionStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));

      // Re-render only if there are visual branding changes or it wasn't cached yet
      if (isChanged || !currentCached) {
        renderBranding(newConfig);
      }
    }).catch(function(err) {
      console.warn('[Admin] Failed to load site config in background:', err);
    });
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded',function(){
  requireAuth();
  initSidebar();
  initSidebarTooltips();
  initActiveNav();
  initUserDisplay();
  window.initCustomSelects();

  // Run branding setup
  initBrandSchema();
  applySiteConfig();

  if (!isPublicPage() && window.AdminData && document.getElementById('sb-pending')) {
    AdminData.orders.updatePendingBadge();
  }
  if (!isPublicPage() && window.AdminData && window.AdminData.affiliates && document.getElementById('sb-affiliates')) {
    AdminData.affiliates.updatePendingBadge();
  }

  document.querySelectorAll('.js-logout').forEach(function(el) {
    el.addEventListener('click', adminLogout);
  });

  // Add global lightbox
  var lbHtml = '<div id="lightboxModal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; z-index: 99999; display:none; background:rgba(0,0,0,0.85); flex-direction:column; align-items:center; justify-content:center;">' +
    '<div id="lbCounter" style="position:absolute; top:20px; left:20px; color:#fff; font-size:18px; z-index:100000; font-family:sans-serif;"></div>' +
    '<button id="lbPrev" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:#fff; border:none; width:50px; height:50px; cursor:pointer; font-size:24px; border-radius:0; z-index:100000; display:flex; align-items:center; justify-content:center;">&#10094;</button>' +
    '<button id="lbNext" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:#fff; border:none; width:50px; height:50px; cursor:pointer; font-size:24px; border-radius:0; z-index:100000; display:flex; align-items:center; justify-content:center;">&#10095;</button>' +
    '<button id="lbClose" style="position:absolute; right:20px; top:20px; background:transparent; color:#fff; border:none; font-size:40px; cursor:pointer; z-index:100000; line-height:1;">&times;</button>' +
    '<div id="lightboxMediaContainer" style="display:flex;align-items:center;justify-content:center;max-width:90vw; max-height:90vh; transition: opacity 0.2s;"></div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', lbHtml);

  var lbImages = [];
  var lbIndex = 0;
  
  function updateLightboxImage() {
      var lbMedia = document.getElementById('lightboxMediaContainer');
      var lbCounter = document.getElementById('lbCounter');
      if(lbMedia && lbImages.length > 0) {
          lbMedia.style.opacity = 0;
          setTimeout(function() {
              var src = lbImages[lbIndex];
              if(src && src.match(/\.(mp4|mov|avi|webm|ogg)$/i)) {
                  lbMedia.innerHTML = '<video src="' + src + '" autoplay loop controls style="max-width:90vw; max-height:90vh; border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); object-fit:contain;"></video>';
              } else if (src && (src.includes('youtube.com') || src.includes('youtu.be'))) {
                  var ytMatch = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/)|shorts\/)([A-Za-z0-9_-]{11})/);
                  var ytId = (ytMatch && ytMatch[1]) ? ytMatch[1] : '';
                  lbMedia.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytId + '?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen style="width:80vw; height:45vw; max-width:1200px; max-height:90vh; border:none; border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"></iframe>';
              } else if (src && src.includes('tiktok.com')) {
                  var ttMatch = src.match(/video\/(\d+)/);
                  var ttId = (ttMatch && ttMatch[1]) ? ttMatch[1] : '';
                  if (ttId) {
                      lbMedia.innerHTML = '<iframe src="https://www.tiktok.com/player/v1/' + ttId + '?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen style="width:40vw; min-width:320px; max-width:450px; height:80vh; max-height:800px; border:none; border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"></iframe>';
                  } else {
                      lbMedia.innerHTML = '<a href="' + src + '" target="_blank" style="color:white;font-size:24px;text-decoration:underline;">Xem video trên TikTok</a>';
                  }
              } else if (src && (src.includes('facebook.com') || src.includes('fb.watch'))) {
                  var fbEmbedUrl = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(src) + '&show_text=false&autoplay=1';
                  lbMedia.innerHTML = '<iframe src="' + fbEmbedUrl + '" scrolling="no" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen style="width:80vw; max-width:1200px; height:45vw; max-height:90vh; border:none; border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"></iframe>';
              } else {
                  lbMedia.innerHTML = '<img src="' + src + '" style="max-width:90vw; max-height:90vh; border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); object-fit:contain;">';
              }
              lbMedia.style.opacity = 1;
              if(lbCounter) lbCounter.textContent = (lbIndex + 1) + ' / ' + lbImages.length;
          }, 200);
      }
      var lbPrev = document.getElementById('lbPrev');
      var lbNext = document.getElementById('lbNext');
      if(lbPrev) lbPrev.style.display = lbImages.length > 1 ? 'flex' : 'none';
      if(lbNext) lbNext.style.display = lbImages.length > 1 ? 'flex' : 'none';
  }

  document.addEventListener('click', function(e) {
      var targetElement = e.target.closest('.zoomable') || e.target.closest('.admin-async-thumb');
      if(targetElement || ((e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') && e.target.classList.contains('zoomable'))) {
          targetElement = targetElement || e.target;
          var lb = document.getElementById('lightboxModal');
          if(lb) {
              if (targetElement.hasAttribute('data-images')) {
                  try { lbImages = JSON.parse(targetElement.dataset.images); } catch(err) { lbImages = []; }
                  var currentSrc = targetElement.src || targetElement.dataset.src;
                  if (lbImages.length === 0 && currentSrc) lbImages = [currentSrc];
                  var foundIdx = lbImages.findIndex(function(img) { return img === currentSrc; });
                  lbIndex = foundIdx !== -1 ? foundIdx : 0;
              } else if(targetElement.closest('.gallery-container')) {
                  var gallery = targetElement.closest('.gallery-container');
                  var items = Array.from(gallery.querySelectorAll('.zoomable, .admin-async-thumb'));
                  lbImages = items.map(function(el) { return el.src || el.dataset.src; }).filter(Boolean);
                  var currentSrc = targetElement.src || targetElement.dataset.src;
                  var foundIdx = lbImages.findIndex(function(img) { return img === currentSrc; });
                  lbIndex = foundIdx !== -1 ? foundIdx : 0;
              } else {
                  var currentSrc = targetElement.src || targetElement.dataset.src;
                  if (currentSrc) {
                      lbImages = [currentSrc];
                      lbIndex = 0;
                  } else {
                      return;
                  }
              }
              if(lbIndex < 0) lbIndex = 0;
              
              updateLightboxImage();
              lb.style.display = 'flex';
          }
      }
      
      if(e.target.id === 'lbClose' || e.target.id === 'lightboxModal') {
          var lb = document.getElementById('lightboxModal');
          if(lb) {
              lb.style.display = 'none';
              var lbMedia = document.getElementById('lightboxMediaContainer');
              if(lbMedia) lbMedia.innerHTML = '';
          }
      }
      
      if(e.target.id === 'lbPrev') {
          lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
          updateLightboxImage();
      }
      if(e.target.id === 'lbNext') {
          lbIndex = (lbIndex + 1) % lbImages.length;
          updateLightboxImage();
      }
  });

  // Topbar user click
  var topbarUser=document.getElementById('topbarUser');
  if(topbarUser){
    topbarUser.addEventListener('click',function(){
      adminToast('Xin chào, '+((getAdminSession()||{}).name||'Admin')+'!','info');
    });
  }

  // ── Global SignalR Listener (Real-Time Notification Core with self-healing fallback) ──
  function initSignalRConnection() {
    if (isPublicPage()) return;

    var fallbackTimeout = null;

    function startFallbackPolling() {
      if (fallbackTimeout) return;
      console.warn("[SignalR] Real-time connection unavailable. Falling back to 15s polling.");
      fallbackTimeout = setInterval(function() {
        if (window.AdminData) {
          AdminData.orders.updatePendingBadge();
          if (window.AdminData.affiliates) {
            AdminData.affiliates.updatePendingBadge();
          }
        }
        if (typeof window.onAdminNotification === 'function') {
          window.onAdminNotification('FallbackPoll', 'Periodic sync');
        }
      }, 15000);
    }

    function connect() {
      try {
        var hubBaseUrl = '/hub/notifications';
        var adminSession = getAdminSession();
        var token = adminSession ? adminSession.token : null;
        var connection = new signalR.HubConnectionBuilder()
          .withUrl(hubBaseUrl, { accessTokenFactory: () => token })
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveNotification", function(eventType, message) {
          var toastType = "info";
          var dot = "blue";
          
          if (eventType === "OrderPlaced") {
            toastType = "success";
            dot = "green";
          } else if (eventType === "OrderStatusChanged") {
            toastType = "warning";
            dot = "gold";
            if (message.indexOf('Hoàn thành') !== -1) dot = "green";
            if (message.indexOf('huỷ') !== -1) dot = "red";
          } else if (eventType === "OrderCancelled" || eventType === "CancelRequested") {
            toastType = "warning";
            dot = "red";
          } else if (eventType === "CustomerRegistered") {
            toastType = "info";
            dot = "blue";
          }
          
          adminToast(message, toastType);

          if (typeof window.loadAndRenderNotifications === 'function') {
            window.loadAndRenderNotifications();
          }

          if (window.AdminData) {
            // Invalidate order cache so admin sees fresh data immediately
            if (eventType === 'OrderPlaced' || eventType === 'OrderStatusChanged' || eventType === 'OrderCancelled' || eventType === 'CancelRequested') {
              AdminData.orders.refresh();
            }
            AdminData.orders.updatePendingBadge();
          }

          if (typeof window.onAdminNotification === 'function') {
            window.onAdminNotification(eventType, message);
          }
        });

        connection.start().then(function() {
          console.log("[SignalR] Global connection established successfully.");
          if (fallbackTimeout) {
            clearInterval(fallbackTimeout);
            fallbackTimeout = null;
          }
        }).catch(function(err) {
          console.error("[SignalR] Global connection failed to start: ", err);
          startFallbackPolling();
        });

        connection.onclose(function() {
          startFallbackPolling();
        });
      } catch (e) {
        console.error("[SignalR] Error initializing connection: ", e);
        startFallbackPolling();
      }
    }

    if (typeof signalR === 'undefined') {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/8.0.0/signalr.min.js';
      script.onload = function() {
        connect();
      };
      script.onerror = function() {
        console.error("[SignalR] Failed to load client library from CDN.");
        startFallbackPolling();
      };
      document.head.appendChild(script);
    } else {
      connect();
    }
  }

  initSignalRConnection();

  // ── Notification Dropdown Logic ──
  function initNotificationDropdown() {
    var bellBtn = document.querySelector('.topbar-btn[title="Thông báo"]');
    if (!bellBtn) {
      var topbarActions = document.querySelector('.topbar-actions');
      if (topbarActions) {
        var bellHtml = '<button class="topbar-btn" title="Thông báo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg><span class="topbar-btn__badge"></span></button>';
        topbarActions.insertAdjacentHTML('afterbegin', bellHtml);
        bellBtn = topbarActions.querySelector('.topbar-btn[title="Thông báo"]');
      }
    }
    
    if (!bellBtn) return;
    
    // Create wrapper
    var wrap = document.createElement('div');
    wrap.className = 'noti-dropdown-wrap';
    bellBtn.parentNode.insertBefore(wrap, bellBtn);
    wrap.appendChild(bellBtn);
    
    // Create dropdown
    var dropdownHtml = '<div class="noti-dropdown" id="notiDropdown">' +
                         '<div class="noti-header">' +
                           '<span class="noti-title">Thông báo</span>' +
                           '<button class="noti-read-all" id="notiReadAll">Đọc tất cả</button>' +
                         '</div>' +
                         '<div class="noti-body" id="notiBody"></div>' +
                         '<div class="noti-footer">' +
                           '<button class="noti-see-more" id="notiSeeMore" style="display:none;">Xem thêm</button>' +
                         '</div>' +
                       '</div>';
    wrap.insertAdjacentHTML('beforeend', dropdownHtml);
    
    var dropdown = document.getElementById('notiDropdown');
    var badge = bellBtn.querySelector('.topbar-btn__badge');
    var body = document.getElementById('notiBody');
    var btnReadAll = document.getElementById('notiReadAll');
    
    var showLimit = 10;
    
    window.adminNotificationsCache = [];
    
    window.loadAndRenderNotifications = function() {
      if (window.AdminData && window.AdminData.notifications) {
        window.AdminData.notifications.getAll().then(function(res) {
          if (res) {
            window.adminNotificationsCache = res;
            window.renderAdminNotifications();
          }
        }).catch(function(e) { 
          console.error('Error loading notifications', e); 
          window.renderAdminNotifications();
        });
      }
    };

    window.renderAdminNotifications = function() {
      var liveActs = window.adminNotificationsCache || [];
      
      var unreadCount = liveActs.filter(function(a) { return a.isRead === false; }).length;
      var prevUnread = parseInt(badge ? (badge.dataset.prevCount || '0') : '0', 10);
      if (badge) {
        if (unreadCount > 0) {
          badge.classList.add('active');
          badge.textContent = unreadCount > 99 ? '99+' : (unreadCount > 1 ? unreadCount : '');
          badge.dataset.prevCount = unreadCount;
          // Ring animation on new notifications
          if (unreadCount > prevUnread) {
            bellBtn.classList.remove('has-new');
            void bellBtn.offsetWidth; // reflow to restart animation
            bellBtn.classList.add('has-new');
          }
        } else {
          badge.classList.remove('active');
          badge.textContent = '';
          badge.dataset.prevCount = '0';
          bellBtn.classList.remove('has-new');
        }
      }
      
      if (liveActs.length === 0) {
        body.innerHTML = '<div class="noti-empty">Chưa có thông báo nào cả</div>';
        document.getElementById('notiSeeMore').style.display = 'none';
        return;
      }
      
      var displayActs = liveActs.slice(0, showLimit);
      document.getElementById('notiSeeMore').style.display = liveActs.length > showLimit ? 'inline-block' : 'none';
      
      body.innerHTML = displayActs.map(function(a) {
        var unreadClass = a.isRead === false ? ' unread' : '';
        var timeStr = '';
        try { 
          var dateStr = a.createdAt;
          if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr)) {
              dateStr += 'Z';
          }
          var d = new Date(dateStr);
          var now = new Date();
          var diff = (now - d) / 1000;
          if (diff < 60) timeStr = 'Vài giây trước';
          else if (diff < 3600) timeStr = Math.floor(diff/60) + ' phút trước';
          else if (diff < 86400) timeStr = Math.floor(diff/3600) + ' giờ trước';
          else timeStr = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
        } catch(err) { timeStr = a.createdAt; }
        
        var dot = 'blue';
        if (a.type === 'OrderPlaced') dot = 'green';
        else if (a.type === 'OrderStatusChanged') dot = 'gold';
        else if (a.type === 'CustomerRegistered') dot = 'blue';
        else if (a.type === 'OrderCancelled' || a.type === 'CancelRequested') dot = 'red';
        
        var escapeHtml = function(text) {
          if (!text) return '';
          var div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };

        return '<div class="noti-item' + unreadClass + '" data-id="' + a.id + '">' +
                 '<div class="noti-dot ' + dot + '"></div>' +
                 '<div class="noti-content">' +
                   '<div class="noti-text">' + escapeHtml(a.message) + '</div>' +
                   '<div class="noti-time">' + escapeHtml(timeStr) + '</div>' +
                 '</div>' +
               '</div>';
      }).join('');
    };
    
    // Initial load
    setTimeout(function() { window.loadAndRenderNotifications(); }, 500);
    
    bellBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('is-open');
    });
    
    document.addEventListener('click', function(e) {
      if (!wrap.contains(e.target)) {
        dropdown.classList.remove('is-open');
      }
    });
    
    btnReadAll.addEventListener('click', function(e) {
      e.stopPropagation();
      if (window.AdminData && window.AdminData.notifications) {
        if (window.adminNotificationsCache) {
            window.adminNotificationsCache.forEach(function(a) { a.isRead = true; });
            window.renderAdminNotifications();
        }
        window.AdminData.notifications.markAllAsRead().catch(function(err) {
            console.error("Lỗi khi markAllAsRead:", err);
        });
      }
    });
    
    body.addEventListener('click', function(e) {
      var item = e.target.closest('.noti-item');
      if (item && item.dataset.id) {
        var id = item.dataset.id;
        var act = window.adminNotificationsCache.find(function(a) { return a.id.toString() === id.toString(); });
        if (act) {
          // 1. Đánh dấu đã đọc
          if (act.isRead === false) {
            act.isRead = true;
            window.renderAdminNotifications();
            if (window.AdminData && window.AdminData.notifications) {
              window.AdminData.notifications.markAsRead(id);
            }
          }
          
          // 2. Điều hướng đến trang liên quan
          var targetUrl = '';
          if (act.type === 'OrderPlaced') {
            targetUrl = 'orders.html#tab=pending';
          } else if (act.type === 'OrderStatusChanged') {
            // Parse trạng thái từ nội dung message để dẫn đúng tab
            var msg = act.message || '';
            var statusTab = 'all';
            if (msg.indexOf('Chờ xử lý') !== -1 || msg.indexOf('Chờ xác nhận') !== -1) statusTab = 'pending';
            else if (msg.indexOf('Đã xác nhận') !== -1) statusTab = 'confirmed';
            else if (msg.indexOf('Đang giao') !== -1) statusTab = 'shipping';
            else if (msg.indexOf('Hoàn thành') !== -1) statusTab = 'completed';
            else if (msg.indexOf('Đã huỷ') !== -1 || msg.indexOf('Đã hủy') !== -1) statusTab = 'cancelled';
            targetUrl = 'orders.html#tab=' + statusTab;
          } else if (act.type === 'CancelRequested') {
            targetUrl = 'orders.html#tab=cancel_request';
          } else if (act.type === 'OrderCancelled') {
            targetUrl = 'orders.html#tab=cancelled';
          } else if (act.type === 'CustomerRegistered') {
            targetUrl = 'customers.html';
          }
          
          if (targetUrl) {
            dropdown.classList.remove('is-open');
            // Nếu đang ở trang đích rồi thì reload, không thì chuyển trang
            var currentPage = window.location.pathname.split('/').pop() || 'index.html';
            var targetPage = targetUrl.split('#')[0];
            if (currentPage === targetPage) {
              // Đang ở trang đích, cập nhật hash và reload data
              window.location.hash = targetUrl.split('#')[1] ? '#' + targetUrl.split('#')[1] : '';
              if (typeof window.onAdminNotification === 'function') {
                window.onAdminNotification('FallbackPoll', 'Navigate from notification');
              }
            } else {
              window.location.href = targetUrl;
            }
          }
        }
      }
    });
    
    document.getElementById('notiSeeMore').addEventListener('click', function(e) {
      e.stopPropagation();
      var btn = this;
      var originalText = btn.innerHTML;
      btn.innerHTML = 'Đang tải...';
      btn.style.opacity = '0.7';
      btn.style.cursor = 'wait';
      
      setTimeout(function() {
          showLimit += 10;
          window.renderAdminNotifications();
          btn.innerHTML = originalText;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
      }, 400);
    });
  }

  initNotificationDropdown();

});

// ── Auto WebP Compression Helper & Interceptor ──
window.compressToWebP = function(file, maxDimension, quality) {
  return new Promise(function(resolve) {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml' || file.type === 'image/webp') {
      return resolve(file);
    }
    maxDimension = maxDimension || 1600;
    quality = quality !== undefined ? quality : 0.82;

    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var w = img.width;
        var h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          if (!blob) return resolve(file);
          var origName = file.name || 'image.jpg';
          var baseName = origName.substring(0, origName.lastIndexOf('.')) || origName;
          var webpName = baseName + '.webp';
          try {
            var webpFile = new File([blob], webpName, { type: 'image/webp', lastModified: Date.now() });
            if (webpFile.size >= file.size && file.type === 'image/webp') resolve(file);
            else resolve(webpFile);
          } catch(err) {
            blob.name = webpName;
            resolve(blob);
          }
        }, 'image/webp', quality);
      };
      img.onerror = function() { resolve(file); };
      img.src = e.target.result;
    };
    reader.onerror = function() { resolve(file); };
    reader.readAsDataURL(file);
  });
};

var origFetch = window.fetch;
window.fetch = function(url, options) {
  if (url && typeof url === 'string' && url.indexOf('/upload') !== -1 && options && options.body && (typeof FormData !== 'undefined') && (options.body instanceof FormData)) {
    var formData = options.body;
    var file = formData.get('file');
    if (file && file instanceof File && file.type && file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
      return window.compressToWebP(file).then(function(compressedFile) {
        var newFormData = new FormData();
        formData.forEach(function(value, key) {
          if (key === 'file') {
            newFormData.append('file', compressedFile);
          } else {
            newFormData.append(key, value);
          }
        });
        var newOptions = Object.assign({}, options, { body: newFormData });
        return origFetch.call(window, url, newOptions);
      });
    }
  }
  return origFetch.apply(window, arguments);
};

}());

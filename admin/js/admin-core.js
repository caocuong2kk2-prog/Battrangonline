// admin-core.js – Sidebar, Auth Guard, Toast, Utils
(function(){'use strict';

var ADMIN_SESSION_KEY='pgt_admin_session';
var PUBLIC_PAGES=['login.html'];

// ── Auth Guard ──
function isPublicPage(){
  var page=location.pathname.split('/').pop()||'index.html';
  return PUBLIC_PAGES.some(function(p){return page===p;});
}
function getAdminSession(){
  try{return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY)||'null');}catch(e){return null;}
}
function requireAuth(){
  if(isPublicPage())return;
  if(!getAdminSession()){
    location.href='login.html';
  }
}
function adminLogout(){
  localStorage.removeItem(ADMIN_SESSION_KEY);
  location.href='login.html';
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
  if(toggle)toggle.addEventListener('click',function(){sidebar.classList.contains('is-open')?closeSidebar():openSidebar();});
  if(overlay)overlay.addEventListener('click',closeSidebar);
}

// ── Active Nav ──
function initActiveNav(){
  var page=location.pathname.split('/').pop()||'index.html';
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

// ── Modal helpers ──
window.openModal=function(id){
  var m=document.getElementById(id);
  if(m)m.classList.add('is-open');
  document.body.style.overflow='hidden';
};
window.closeModal=function(id){
  var m=document.getElementById(id);
  if(m)m.classList.remove('is-open');
  document.body.style.overflow='';
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

// ── formatVND ──
window.fmtVND=function(n){return Number(n).toLocaleString('vi-VN')+'đ';};

// ── Confirm dialog ──
window.adminConfirm=function(msg,cb){
  var ok=confirm(msg);
  if(ok&&typeof cb==='function')cb();
};

// ── Custom Select (Premium UI) ──
window.initCustomSelects=function(root){
  var container=root||document;
  var selects=container.querySelectorAll('select.form-control:not(.custom-select-hidden), select.filter-select:not(.custom-select-hidden)');
  selects.forEach(function(select){
    select.classList.add('custom-select-hidden');
    select.style.display='none';
    
    var wrapper=document.createElement('div');
    wrapper.className='custom-select-wrapper '+(select.classList.contains('filter-select')?'is-filter':'')+(select.classList.contains('btn-status-change')?' is-small':'');
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

// ── Init ──
document.addEventListener('DOMContentLoaded',function(){
  requireAuth();
  initSidebar();
  initActiveNav();
  initUserDisplay();
  window.initCustomSelects();

  if (!isPublicPage() && window.AdminData && document.getElementById('sb-pending')) {
    AdminData.orders.updatePendingBadge();
  }

  document.querySelectorAll('.js-logout').forEach(function(el) {
    el.addEventListener('click', adminLogout);
  });

  // Add global lightbox
  var lbHtml = '<div id="lightboxModal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; z-index: 99999; display:none; background:rgba(0,0,0,0.85); flex-direction:column; align-items:center; justify-content:center;">' +
    '<div id="lbCounter" style="position:absolute; top:20px; left:20px; color:#fff; font-size:18px; z-index:100000; font-family:sans-serif;"></div>' +
    '<button id="lbPrev" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:#fff; border:none; width:50px; height:50px; cursor:pointer; font-size:24px; border-radius:50%; z-index:100000; display:flex; align-items:center; justify-content:center;">&#10094;</button>' +
    '<button id="lbNext" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:#fff; border:none; width:50px; height:50px; cursor:pointer; font-size:24px; border-radius:50%; z-index:100000; display:flex; align-items:center; justify-content:center;">&#10095;</button>' +
    '<button id="lbClose" style="position:absolute; right:20px; top:20px; background:transparent; color:#fff; border:none; font-size:40px; cursor:pointer; z-index:100000; line-height:1;">&times;</button>' +
    '<img id="lightboxImage" src="" style="max-width:90vw; max-height:90vh; border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); object-fit:contain; transition: opacity 0.2s;">' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', lbHtml);

  var lbImages = [];
  var lbIndex = 0;
  
  function updateLightboxImage() {
      var lbImg = document.getElementById('lightboxImage');
      var lbCounter = document.getElementById('lbCounter');
      if(lbImg && lbImages.length > 0) {
          lbImg.style.opacity = 0;
          setTimeout(function() {
              lbImg.src = lbImages[lbIndex];
              lbImg.style.opacity = 1;
              if(lbCounter) lbCounter.textContent = (lbIndex + 1) + ' / ' + lbImages.length;
          }, 200);
      }
      var lbPrev = document.getElementById('lbPrev');
      var lbNext = document.getElementById('lbNext');
      if(lbPrev) lbPrev.style.display = lbImages.length > 1 ? 'flex' : 'none';
      if(lbNext) lbNext.style.display = lbImages.length > 1 ? 'flex' : 'none';
  }

  document.addEventListener('click', function(e) {
      if(e.target.tagName === 'IMG' && e.target.classList.contains('zoomable')) {
          var lb = document.getElementById('lightboxModal');
          if(lb) {
              if (e.target.hasAttribute('data-images')) {
                  try { lbImages = JSON.parse(e.target.dataset.images); } catch(err) { lbImages = []; }
                  if (lbImages.length === 0) lbImages = [e.target.src];
                  lbIndex = lbImages.indexOf(e.target.src);
              } else if(e.target.closest('.gallery-container')) {
                  var gallery = e.target.closest('.gallery-container');
                  lbImages = Array.from(gallery.querySelectorAll('img')).map(function(img) { return img.src; });
                  lbIndex = lbImages.indexOf(e.target.src);
              } else {
                  lbImages = [e.target.src];
                  lbIndex = 0;
              }
              if(lbIndex < 0) lbIndex = 0;
              
              updateLightboxImage();
              lb.style.display = 'flex';
          }
      }
      
      if(e.target.id === 'lbClose' || e.target.id === 'lightboxModal') {
          var lb = document.getElementById('lightboxModal');
          if(lb) lb.style.display = 'none';
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
});

}());

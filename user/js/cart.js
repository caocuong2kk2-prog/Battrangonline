// ============================================
// cart.js - Shopping Cart Logic
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function () {
  'use strict';

  var CART_KEY = 'pgt_cart';
  var PROMO_CODES = { 'BATRANG10': 10, 'GIAOTIEN15': 15, 'WELCOME20': 20 };

  // ─── Persistence ────────────────────────────────────────────────────────────
  function loadCart() {
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      cart.forEach(function (item) {
        if (item.selected === undefined) item.selected = true;
      });
      return cart;
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge(cart);
  }

  // ─── Public API exposed to other pages ──────────────────────────────────────
  window.CartAPI = {
    getCart: loadCart,

    addItem: function (product, qty) {
      var cart = loadCart();
      var qty = qty || 1;
      var idx = cart.findIndex(function (i) { return i.id === product.id; });
      if (idx >= 0) {
        cart[idx].qty = Math.min(cart[idx].qty + qty, 99);
      } else {
        cart.push({
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: (product.images && product.images[0]) ? product.images[0] : 'assets/images/placeholder.jpg',
          qty: qty
        });
      }
      saveCart(cart);
      showCartToast(product.name, qty);
    },

    removeItem: function (id) {
      var cart = loadCart().filter(function (i) { return i.id !== id; });
      saveCart(cart);
    },

    updateQty: function (id, qty) {
      var cart = loadCart();
      var idx = cart.findIndex(function (i) { return i.id === id; });
      if (idx >= 0) {
        if (qty <= 0) {
          cart.splice(idx, 1);
        } else {
          cart[idx].qty = Math.min(qty, 99);
        }
      }
      saveCart(cart);
    },

    clearCart: function () {
      saveCart([]);
    },

    getCount: function () {
      return loadCart().reduce(function (s, i) { return s + i.qty; }, 0);
    }
  };

  // ─── Badge update (runs on every page) ──────────────────────────────────────
  function updateCartBadge(cart) {
    var badge = document.getElementById('cart-count');
    if (!badge) return;
    var count = (cart || loadCart()).reduce(function (s, i) { return s + i.qty; }, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function showCartToast(name, qty) {
    if (typeof window.showToast === 'function') {
      window.showToast('Đã thêm ' + qty + ' × "' + name + '" vào giỏ hàng!', 'success');
    }
  }

  // ─── Cart Page Logic ─────────────────────────────────────────────────────────
  var appliedPromo = null;

  function initCartPage() {
    if (!document.getElementById('cart-item-list')) return; // not on cart page

    renderCart();

    // Select all / Deselect all
    var selectAllBtn = document.getElementById('cart-select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', function () {
        var cart = loadCart();
        var allSelected = cart.length > 0 && cart.every(function (i) { return i.selected; });
        cart.forEach(function (i) { i.selected = !allSelected; });
        saveCart(cart);
        renderCart();
      });
    }

    // Clear all
    var clearBtn = document.getElementById('cart-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('Xóa tất cả sản phẩm trong giỏ hàng?')) {
          window.CartAPI.clearCart();
          appliedPromo = null;
          renderCart();
        }
      });
    }

    // Promo code
    var promoBtn = document.getElementById('promo-apply-btn');
    if (promoBtn) {
      promoBtn.addEventListener('click', applyPromo);
    }
    var promoInput = document.getElementById('promo-input');
    if (promoInput) {
      promoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') applyPromo();
      });
    }

    // Checkout
    var checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        var cart = loadCart();
        var selectedItems = cart.filter(function (i) { return i.selected; });
        if (selectedItems.length === 0) {
          if (typeof window.showToast === 'function') {
            window.showToast('Vui lòng chọn sản phẩm để thanh toán!', 'error');
          }
          return;
        }
        // Placeholder – replace with real checkout flow
        alert('Chức năng thanh toán đang được phát triển. Vui lòng liên hệ zalo/fb để đặt hàng!');
      });
    }
  }

  function renderCart() {
    var cart = loadCart();
    var listEl = document.getElementById('cart-item-list');
    var emptyEl = document.getElementById('cart-empty');
    var continueEl = document.getElementById('cart-continue');
    var clearBtn = document.getElementById('cart-clear-btn');

    if (!listEl) return;

    if (cart.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (continueEl) continueEl.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'none';
      updateSummary(cart);
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (continueEl) continueEl.style.display = '';
    if (clearBtn) clearBtn.style.display = '';

    listEl.innerHTML = cart.map(function (item) {
      return renderCartItem(item);
    }).join('');

    // Update select all button label and icon
    var selectAllBtn = document.getElementById('cart-select-all-btn');
    var selectAllLabel = document.getElementById('select-all-label');
    if (selectAllBtn && selectAllLabel) {
      var allSelected = cart.length > 0 && cart.every(function (i) { return i.selected; });
      selectAllLabel.textContent = allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả';
      var svgEl = selectAllBtn.querySelector('svg');
      if (svgEl) {
        if (allSelected) {
          svgEl.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
        } else {
          svgEl.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
        }
      }
    }

    // Bind checkbox
    listEl.querySelectorAll('.item-select-cb').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = Number(cb.dataset.id);
        var cart = loadCart();
        var item = cart.find(function (i) { return i.id === id; });
        if (item) {
          item.selected = cb.checked;
          saveCart(cart);
          renderCart();
        }
      });
    });

    // Bind quantity buttons
    listEl.querySelectorAll('.cart-item__qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.dataset.id);
        var delta = Number(btn.dataset.delta);
        var cart = loadCart();
        var item = cart.find(function (i) { return i.id === id; });
        if (item) {
          window.CartAPI.updateQty(id, item.qty + delta);
          renderCart();
        }
      });
    });

    // Bind qty inputs (direct typing)
    listEl.querySelectorAll('.cart-item__qty-input').forEach(function (input) {
      input.addEventListener('change', function () {
        var id = Number(input.dataset.id);
        var val = parseInt(input.value, 10);
        window.CartAPI.updateQty(id, isNaN(val) ? 1 : val);
        renderCart();
      });
    });

    // Bind remove buttons
    listEl.querySelectorAll('.cart-item__remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.dataset.id);
        window.CartAPI.removeItem(id);
        renderCart();
      });
    });

    updateSummary(cart);
  }

  function renderCartItem(item) {
    return [
      '<div class="cart-item" role="listitem" data-id="' + item.id + '">',
      '<div class="cart-item__checkbox">',
      '<input type="checkbox" class="item-select-cb" data-id="' + item.id + '" ' + (item.selected ? 'checked' : '') + ' aria-label="Chọn sản phẩm">',
      '</div>',
      '<a class="cart-item__img-link" href="product-detail.html?slug=' + item.slug + '">',
      '<img class="cart-item__img" src="' + item.image + '" alt="' + item.name + '" loading="lazy">',
      '</a>',
      '<div class="cart-item__details">',
      '<a class="cart-item__name" href="product-detail.html?slug=' + item.slug + '">' + item.name + '</a>',
      '<div class="cart-item__meta">',
      '<span>Đơn giá: <span class="cart-item__price-unit">' + window.formatVND(item.price) + '</span></span>',
      '</div>',
      '<div class="cart-item__qty">',
      '<button class="cart-item__qty-btn" data-id="' + item.id + '" data-delta="-1" aria-label="Giảm">−</button>',
      '<input class="cart-item__qty-input" type="number" value="' + item.qty + '" min="1" max="99" data-id="' + item.id + '" aria-label="Số lượng">',
      '<button class="cart-item__qty-btn" data-id="' + item.id + '" data-delta="1" aria-label="Tăng">+</button>',
      '</div>',
      '</div>',
      '<div class="cart-item__right">',
      '<span class="cart-item__subtotal">' + window.formatVND(item.price * item.qty) + '</span>',
      '<button class="cart-item__remove" data-id="' + item.id + '" aria-label="Xóa sản phẩm">',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '<line x1="18" y1="6" x2="6" y2="18"></line>',
      '<line x1="6" y1="6" x2="18" y2="18"></line>',
      '</svg>',
      'Xóa',
      '</button>',
      '</div>',
      '</div>'
    ].join('');
  }

  function updateSummary(cart) {
    var selectedItems = cart.filter(function (i) { return i.selected; });
    var subtotal = selectedItems.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var discount = appliedPromo ? Math.round(subtotal * appliedPromo / 100) : 0;
    var total = subtotal - discount;

    var elSub = document.getElementById('summary-subtotal');
    var elTotal = document.getElementById('summary-total');
    var elDiscount = document.getElementById('summary-discount');
    var promoRow = document.getElementById('promo-row');
    var checkoutBtn = document.getElementById('cart-checkout-btn');

    if (elSub) elSub.textContent = window.formatVND(subtotal);
    if (elTotal) elTotal.textContent = window.formatVND(total);
    if (elDiscount) elDiscount.textContent = '−' + window.formatVND(discount);
    if (promoRow) promoRow.hidden = !appliedPromo;
    if (checkoutBtn) checkoutBtn.disabled = selectedItems.length === 0;
  }

  function applyPromo() {
    var input = document.getElementById('promo-input');
    var msg = document.getElementById('promo-msg');
    if (!input || !msg) return;

    var code = input.value.trim().toUpperCase();
    if (!code) { msg.textContent = 'Vui lòng nhập mã giảm giá.'; msg.className = 'cart-promo__msg cart-promo__msg--error'; return; }

    if (PROMO_CODES[code]) {
      appliedPromo = PROMO_CODES[code];
      msg.textContent = 'Áp dụng thành công! Giảm ' + appliedPromo + '% cho đơn hàng.';
      msg.className = 'cart-promo__msg cart-promo__msg--success';
      updateSummary(loadCart());
    } else {
      appliedPromo = null;
      msg.textContent = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';
      msg.className = 'cart-promo__msg cart-promo__msg--error';
      updateSummary(loadCart());
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge(null);
    initCartPage();
  });

})();

// ============================================
// cart.js - Shopping Cart Logic
// Phúc Gia Tiên - Gốm Sứ Thủ Công
// ============================================

(function () {
  'use strict';

  var CART_KEY = 'pgt_cart';



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
    // Dispatch event so any listener (e.g. common.js) can re-sync the badge
    document.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: cart } }));
  }

  function findMatchingStock(item, productData) {
    if (!productData) return 99;
    if (!productData.variants || productData.variants.length === 0) {
      return productData.totalStock !== undefined ? productData.totalStock : (productData.stock || 0);
    }
    
    var matchingVariant = productData.variants.find(function (v) {
      var sizeParts = [];
      var size = v.sizeName || v.size;
      if (size) sizeParts.push(size);
      if (v.patternName) sizeParts.push(v.patternName);
      if (v.colorName) sizeParts.push(v.colorName);
      if (v.productTypeName) sizeParts.push(v.productTypeName);
      if (v.materialName) sizeParts.push(v.materialName);
      
      var variantSizeStr = sizeParts.join(' · ') || null;
      if (!variantSizeStr) variantSizeStr = 'Phiên bản ' + v.id;
      
      var s1 = (item.size || '').toString().trim().toLowerCase();
      var s2 = (variantSizeStr || '').toString().trim().toLowerCase();
      return s1 === s2;
    });
    
    if (matchingVariant) {
      return matchingVariant.stock || 0;
    }
    
    var fallbackVariant = productData.variants.find(function (v) {
      var size = v.sizeName || v.size;
      return size && size.toString().trim().toLowerCase() === (item.size || '').toString().trim().toLowerCase();
    });
    
    if (fallbackVariant) {
      return fallbackVariant.stock || 0;
    }
    
    return productData.variants[0] ? (productData.variants[0].stock || 0) : (productData.totalStock || 0);
  }

  // ─── Public API exposed to other pages ──────────────────────────────────────
  window.CartAPI = {
    getCart: loadCart,

    addItem: function (product, qty, event) {
      var cart = loadCart();
      var qty = qty || 1;
      
      // Khôi phục giá và size nếu thiếu
      var price = product.price;
      if (price === undefined || price === null || isNaN(price)) {
        price = product.basePrice || (product.variants && product.variants.length ? product.variants[0].price : 0);
      }
      var size = product.size;
      if (!size && product.variants && product.variants.length) {
        size = product.variants[0].size;
      }
      
      var idx = cart.findIndex(function (i) { return i.id === product.id && i.size === (size || null); });
      if (idx >= 0) {
        cart[idx].qty = Math.min(cart[idx].qty + qty, 99);
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: price,
          size: size || null,
          image: (product.images && product.images[0]) ? product.images[0] : 'assets/images/placeholder.png',
          qty: qty,
          selected: true,
          gifts: product.gifts || []
        });
      }
      saveCart(cart);
      
      if (event) {
        flyToCartAnimation(event);
      }
      showCartToast(product.name, qty);
    },

    removeItem: function (id, size) {
      var cart = loadCart().filter(function (i) { 
          if (size !== undefined) return !(i.id === id && i.size === size);
          return i.id !== id; 
      });
      saveCart(cart);
    },

    updateQty: function (id, qty, size) {
      var cart = loadCart();
      var idx = cart.findIndex(function (i) { 
          if (size !== undefined) return i.id === id && i.size === size;
          return i.id === id; 
      });
      if (idx >= 0) {
        var targetQty = Math.max(1, qty);
        var maxStock = 99;
        var item = cart[idx];
        if (window.cartProductsMap && window.cartProductsMap[item.slug]) {
          var pData = window.cartProductsMap[item.slug];
          maxStock = findMatchingStock(item, pData);
        }
        
        if (targetQty > maxStock) {
          cart[idx].qty = maxStock > 0 ? maxStock : 1;
          if (typeof window.showToast === 'function') {
            window.showToast('Không thể đặt vượt quá số lượng sản phẩm có sẵn trong kho (' + maxStock + ')', 'warning');
          }
        } else {
          cart[idx].qty = targetQty;
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

  function flyToCartAnimation(event) {
    if (!event) return;
    var btn = event.currentTarget || event.target;
    if (!btn) return;
    
    // Tìm thẻ sản phẩm gần nhất (dùng chung cho cả trang chủ, trang sản phẩm và trang chi tiết)
    var card = btn.closest('.product-card, .home-product-card, .product-detail-grid');
    if (!card) return;

    // Tìm ảnh sản phẩm tương ứng để bay
    var img = card.querySelector('.product-card__img, .home-product-card__img, .product-gallery__main-img');
    if (!img) return;

    var cartIcon = document.querySelector('.header-action-btn--cart');
    if (!cartIcon) return;

    // Lấy tọa độ tuyệt đối
    var imgRect = img.getBoundingClientRect();
    var cartRect = cartIcon.getBoundingClientRect();

    // Tạo bản sao ảnh
    var clone = img.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = imgRect.top + 'px';
    clone.style.left = imgRect.left + 'px';
    clone.style.width = imgRect.width + 'px';
    clone.style.height = imgRect.height + 'px';
    clone.style.borderRadius = window.getComputedStyle(img).borderRadius;
    clone.style.zIndex = '9999';
    clone.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    clone.style.objectFit = 'cover';
    clone.style.pointerEvents = 'none';
    
    document.body.appendChild(clone);

    // Ép trình duyệt tính toán lại layout để kích hoạt animation
    clone.offsetWidth;

    // Thiết lập đích đến là biểu tượng giỏ hàng ở navbar
    clone.style.top = (cartRect.top + cartRect.height / 2 - 20) + 'px';
    clone.style.left = (cartRect.left + cartRect.width / 2 - 20) + 'px';
    clone.style.width = '40px';
    clone.style.height = '40px';
    clone.style.opacity = '0.3';
    clone.style.transform = 'scale(0.5)';
    clone.style.borderRadius = '50%';

    // Dọn dẹp sau khi bay xong và rung biểu tượng giỏ hàng
    setTimeout(function () {
      clone.remove();
      var badge = document.getElementById('cart-count');
      if (badge) {
        badge.style.transform = 'scale(1.4)';
        setTimeout(function () { badge.style.transform = 'scale(1)'; }, 200);
      }
    }, 600);
  }

  // ─── Cart Page Logic ─────────────────────────────────────────────────────────


  function initCartPage() {
    if (!document.getElementById('cart-item-list')) return; // not on cart page

    var cart = loadCart();
    
    // 1. Fetch live stock for all items in the cart
    var uniqueSlugs = [];
    cart.forEach(function (item) {
      if (item.slug && uniqueSlugs.indexOf(item.slug) === -1) {
        uniqueSlugs.push(item.slug);
      }
    });

    var fetchPromises = uniqueSlugs.map(function (slug) {
      return window.PhucGiaTienAPI.getProductBySlug(slug)
        .catch(function (err) {
          console.error('Failed to fetch product for stock validation:', slug, err);
          return null;
        });
    });

    Promise.all(fetchPromises).then(function (products) {
      var productMap = {};
      products.forEach(function (p) {
        if (p) {
          productMap[p.slug] = p;
        }
      });
      window.cartProductsMap = productMap;

      // Validate quantities against live stock before rendering
      var updatedCart = loadCart();
      var changed = false;
      updatedCart.forEach(function (item) {
        var pData = productMap[item.slug];
        if (pData) {
          var liveStock = findMatchingStock(item, pData);
          if (liveStock < item.qty) {
            var oldQty = item.qty;
            item.qty = Math.max(1, liveStock);
            if (oldQty !== item.qty) {
              changed = true;
              if (typeof window.showToast === 'function') {
                window.showToast('Số lượng sản phẩm "' + item.name + '" đã được tự động điều chỉnh về ' + item.qty + ' do giới hạn tồn kho thực tế.', 'warning');
              }
            }
          }
          
          // Sync gifts with the latest API data
          var currentGiftsStr = JSON.stringify(item.gifts || []);
          var newGiftsStr = JSON.stringify(pData.gifts || []);
          if (currentGiftsStr !== newGiftsStr) {
            item.gifts = pData.gifts || [];
            changed = true;
          }
        }
      });

      if (changed) {
        saveCart(updatedCart);
      }

      runCartPageInitAndRender();
    });
  }

  function runCartPageInitAndRender() {
    var cart = loadCart();
    var needsHeal = cart.some(function (item) {
      return item.price === undefined || item.price === null || isNaN(item.price) || !item.gifts;
    });

    if (needsHeal && window.PhucGiaTienAPI) {
      var healPromises = cart.map(function (item) {
        if (item.price === undefined || item.price === null || isNaN(item.price) || !item.gifts) {
          return window.PhucGiaTienAPI.getProductBySlug(item.slug)
            .then(function (p) {
              item.price = p.basePrice || (p.variants && p.variants.length ? p.variants[0].price : 0);
              if (!item.size && p.variants && p.variants.length) {
                item.size = p.variants[0].size;
              }
              if (!item.gifts) {
                item.gifts = p.gifts || [];
              }
            })
            .catch(function (err) {
              console.error('Failed to heal cart item', err);
            });
        }
        return Promise.resolve();
      });

      Promise.all(healPromises).then(function () {
        saveCart(cart);
        renderCart();
      });
    } else {
      renderCart();
    }

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
          renderCart();
        }
      });
    }

    // Checkout
    var checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function (e) {
        var cart = loadCart();
        
        if (cart.length === 0) {
          e.preventDefault();
          if (typeof window.showToast === 'function') {
            window.showToast('Hãy thêm sản phẩm vào giỏ hàng để thanh toán.', 'error');
          }
          return;
        }

        var selectedItems = cart.filter(function (i) { return i.selected; });
        if (selectedItems.length === 0) {
          e.preventDefault();
          if (typeof window.showToast === 'function') {
            window.showToast('Vui lòng chọn sản phẩm để thanh toán!', 'error');
          }
          return;
        }

        // Validate stock for all selected items before placing order
        var hasOutOfStock = false;
        var outOfStockName = '';
        if (window.cartProductsMap) {
          hasOutOfStock = selectedItems.some(function (item) {
            var pData = window.cartProductsMap[item.slug];
            if (pData) {
              var stock = findMatchingStock(item, pData);
              if (stock <= 0) {
                outOfStockName = item.name;
                return true;
              }
            }
            return false;
          });
        }
        
        if (hasOutOfStock) {
          e.preventDefault();
          if (typeof window.showToast === 'function') {
            window.showToast('Sản phẩm "' + outOfStockName + '" đã hết hàng. Vui lòng bỏ chọn hoặc xóa trước khi thanh toán!', 'error');
          }
          return;
        }

        window.location.href = "checkout";
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
        var size = cb.dataset.size !== "null" ? cb.dataset.size : null;
        var cart = loadCart();
        var item = cart.find(function (i) { return i.id === id && i.size === size; });
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
        var size = btn.dataset.size !== "null" ? btn.dataset.size : null;
        var delta = Number(btn.dataset.delta);
        var cart = loadCart();
        var item = cart.find(function (i) { return i.id === id && i.size === size; });
        if (item) {
          window.CartAPI.updateQty(id, item.qty + delta, size);
          renderCart();
        }
      });
    });

    // Bind qty inputs (direct typing)
    listEl.querySelectorAll('.cart-item__qty-input').forEach(function (input) {
      input.addEventListener('change', function () {
        var id = Number(input.dataset.id);
        var size = input.dataset.size !== "null" ? input.dataset.size : null;
        var val = parseInt(input.value, 10);
        window.CartAPI.updateQty(id, isNaN(val) ? 1 : val, size);
        renderCart();
      });
    });

    // Bind remove buttons
    listEl.querySelectorAll('.cart-item__remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.dataset.id);
        var size = btn.dataset.size !== "null" ? btn.dataset.size : null;
        window.CartAPI.removeItem(id, size);
        renderCart();
      });
    });

    updateSummary(cart);
  }

  function renderCartItem(item) {
    var displayName = item.size ? item.name + ' - ' + item.size : item.name;
    
    var stockStatusHtml = '';
    var maxStock = 99;
    var giftHtml = '';
    if (window.cartProductsMap && window.cartProductsMap[item.slug]) {
      var pData = window.cartProductsMap[item.slug];
      var liveStock = findMatchingStock(item, pData);
      maxStock = liveStock;
      
      if (liveStock <= 0) {
        stockStatusHtml = '<span class="cart-item__stock-status out-of-stock" style="color:#d32f2f; font-size:11px; font-weight:600; margin-left:12px; text-transform:uppercase;">Hết hàng</span>';
      } else if (liveStock <= 5) {
        stockStatusHtml = '<span class="cart-item__stock-status low-stock" style="color:#a45a32; font-size:11px; font-weight:600; margin-left:12px;">Chỉ còn ' + liveStock + ' sản phẩm</span>';
      } else {
        stockStatusHtml = '<span class="cart-item__stock-status in-stock" style="color:#2e7d32; font-size:11px; font-weight:600; margin-left:12px;">Còn hàng (' + liveStock + ')</span>';
      }
    }
    
    var itemGifts = item.gifts;
    if (!itemGifts && window.cartProductsMap && window.cartProductsMap[item.slug]) {
      itemGifts = window.cartProductsMap[item.slug].gifts;
    }

    if (itemGifts && itemGifts.length > 0) {
      giftHtml = '<div class="cart-item__gifts" style="margin-top:8px; padding:8px 12px; background:#fffcf5; border-radius:6px; border:1px dashed #e5c385;">';
      giftHtml += '<div style="font-size:11px; font-weight:700; color:#d32f2f; margin-bottom:6px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="14" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="22"></line><path d="M12 8H8a2 2 0 0 1-2-2 2 2 0 0 1 2-2h0c1.1 0 2 .9 2 2v2"></path><path d="M12 8h4a2 2 0 0 0 2-2 2 2 0 0 0-2-2h0c-1.1 0-2 .9-2 2v2"></path></svg> Quà tặng kèm:</div>';
      itemGifts.forEach(function(g) {
        var gQty = g.quantity ? (g.quantity * item.qty) : item.qty;
        giftHtml += '<div style="font-size:12px; color:#5c3a1e; display:flex; align-items:center; gap:8px; margin-bottom:4px;">';
        giftHtml += '<img src="' + (g.imageUrl || 'assets/images/placeholder.png') + '" style="width:24px; height:24px; object-fit:cover; border-radius:4px; border:1px solid #faebd7; cursor:zoom-in;" onclick="if(window.showImageModal) window.showImageModal(\'' + (g.imageUrl || 'assets/images/placeholder.png') + '\', \'' + g.name.replace(/'/g, "\\'") + '\')">';
        giftHtml += '<span style="line-height:1.2;">' + g.name + ' <b style="color:#d32f2f; font-size:11px; margin-left:2px;">x' + gQty + '</b></span>';
        giftHtml += '</div>';
      });
      giftHtml += '</div>';
    }

    return [
      '<div class="cart-item" role="listitem" data-id="' + item.id + '" data-size="' + item.size + '">',
      '<div class="cart-item__checkbox">',
      '<input type="checkbox" class="item-select-cb" data-id="' + item.id + '" data-size="' + item.size + '" ' + (item.selected ? 'checked' : '') + ' aria-label="Chọn sản phẩm">',
      '</div>',
      '<a class="cart-item__img-link" href="product-detail.html?slug=' + item.slug + '">',
      (item.image && item.image.match(/\.(mp4|mov|avi|webm|ogg)$/i)
        ? '<video class="cart-item__img" src="' + item.image + '" autoplay loop muted playsinline style="object-fit:cover;"></video>'
        : '<img class="cart-item__img" src="' + (item.image || 'assets/images/placeholder.png') + '" alt="' + item.name + '" loading="lazy">'),
      '</a>',
      '<div class="cart-item__details">',
      '<h3 class="cart-item__title"><a href="product-detail.html?slug=' + item.slug + '" style="color:var(--color-bg-mid);text-decoration:none">' + displayName + '</a></h3>',
      '<div class="cart-item__meta">',
      '<span>Đơn giá: <span class="cart-item__price-unit">' + window.formatVND(item.price) + '</span></span>' + stockStatusHtml,
      '</div>',
      giftHtml,
      '<div class="cart-item__qty">',
      '<button class="cart-item__qty-btn" data-id="' + item.id + '" data-size="' + item.size + '" data-delta="-1" aria-label="Giảm">−</button>',
      '<input class="cart-item__qty-input" type="number" value="' + item.qty + '" min="1" max="' + maxStock + '" data-id="' + item.id + '" data-size="' + item.size + '" aria-label="Số lượng">',
      '<button class="cart-item__qty-btn" data-id="' + item.id + '" data-size="' + item.size + '" data-delta="1" aria-label="Tăng">+</button>',
      '</div>',
      '</div>',
      '<div class="cart-item__right">',
      '<span class="cart-item__subtotal">' + window.formatVND(item.price * item.qty) + '</span>',
      '<button class="cart-item__remove" data-id="' + item.id + '" data-size="' + item.size + '" aria-label="Xóa sản phẩm">',
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
    var total = subtotal;

    var elSub = document.getElementById('summary-subtotal');
    var elTotal = document.getElementById('summary-total');

    if (elSub) elSub.textContent = window.formatVND(subtotal);
    if (elTotal) elTotal.textContent = window.formatVND(total);
    
    // Do not set checkoutBtn.disabled so the click event can fire to show toast messages.
    var checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
       checkoutBtn.disabled = false;
       if (selectedItems.length === 0) {
           checkoutBtn.style.opacity = '0.6';
       } else {
           checkoutBtn.style.opacity = '1';
       }
    }
  }


  // ─── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge(null);
    initCartPage();
  });

})();

// dashboard.js
(function(){'use strict';

function getRelativeTime(timestampStr) {
  if (!timestampStr) return 'Vừa xong';
  var date = new Date(timestampStr);
  if (isNaN(date.getTime())) return timestampStr;
  var now = new Date();
  var diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) diffMs = 0;

  var diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return diffMins + ' phút trước';

  var diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + ' giờ trước';

  var diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return diffDays + ' ngày trước';

  var pad = function(n) { return n < 10 ? '0' + n : n; };
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function renderGrowth(elId, percent, textSuffix) {
  var el = document.getElementById(elId);
  if (!el) return;
  if (percent > 0) {
    el.className = 'kpi-card__change kpi-card__change--up';
    el.innerHTML = '↑ ' + percent + '% ' + (textSuffix || '');
  } else if (percent < 0) {
    el.className = 'kpi-card__change kpi-card__change--down';
    el.innerHTML = '↓ ' + Math.abs(percent) + '% ' + (textSuffix || '');
  } else {
    el.className = 'kpi-card__change';
    el.innerHTML = '0% ' + (textSuffix || '');
  }
}

document.addEventListener('DOMContentLoaded',function(){

  var timeFilterGroup = document.getElementById('dashboard-time-filter');
  var currentFilterVal = 'month';

  function getDatesFromFilter(val) {
      var now = new Date();
      var startDate = null;
      var endDate = null;

      if (val === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      } else if (val === 'week') {
          var day = now.getDay();
          var diff = now.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
          var monday = new Date(now.setDate(diff));
          startDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).toISOString();
          // Reset now for end date
          now = new Date();
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      } else if (val === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      }

      return { startDate: startDate, endDate: endDate };
  }

  function refreshDashboard() {
    var dates = getDatesFromFilter(currentFilterVal);

    // Show loading state
    var set = function(id, v) { var el = document.getElementById(id); if (el) el.innerHTML = v; };
    set('kpi-revenue', '...');
    set('kpi-orders', '...');
    set('kpi-products', '...');
    set('kpi-customers', '...');

    Promise.all([
      AdminData.orders.load(), // Keep for recent orders table
      AdminData.products.load(),
      AdminData.customers.load(),
      AdminData.analytics.getDashboardData(dates.startDate, dates.endDate)
    ]).then(function(res) {
      var orders = res[0];
      var products = res[1];
      var customers = res[2];
      var analytics = res[3];

      // ── KPI ──
      set('kpi-revenue', AdminData.fmtShort(analytics.totalRevenue));
      set('kpi-orders', analytics.totalOrders);
      set('kpi-products', analytics.totalProducts);
      set('kpi-customers', analytics.totalCustomers);

      renderGrowth('kpi-revenue-change', analytics.revenuePercentChange, 'so kỳ trước');
      renderGrowth('kpi-orders-change', analytics.ordersPercentChange, 'so kỳ trước');
      renderGrowth('kpi-customers-change', analytics.customersPercentChange, 'so kỳ trước');

      // ── Recent Orders Table ──
      var tbody = document.getElementById('recent-orders-body');
      if (tbody) {
        var recent = orders.slice(0, 7);
        tbody.innerHTML = recent.map(function(o) {
            return '<tr>' +
              '<td><strong>' + o.id + '</strong></td>' +
              '<td>' + escapeHTML(o.customer) + '</td>' +
              '<td class="hide-mobile">' + AdminData.fmtDate(o.date) + '</td>' +
            '<td>' + AdminData.fmt(o.total) + '</td>' +
            '<td><span class="badge ' + AdminData.getStatusBadge(o.status) + '">' + AdminData.getStatusLabel(o.status) + '</span></td>' +
            '<td class="actions-cell"><a href="orders.html" class="btn btn--sm btn--secondary">Xem</a></td>' +
            '</tr>';
        }).join('');
      }

      // ── Top Products ──
      var topEl = document.getElementById('top-products-list');
      if (topEl) {
        var sortedProds = analytics.topProducts || [];
        var maxVal = sortedProds[0] ? (sortedProds[0].salesQty > 0 ? sortedProds[0].salesQty : sortedProds[0].basePrice) : 1;
        if (maxVal === 0) maxVal = 1;

        topEl.innerHTML = sortedProds.map(function(p, i) {
          var qtyVal = p.salesQty;
          var pct = Math.round(((qtyVal > 0 ? qtyVal : p.basePrice) / maxVal) * 100);
          var imgHtml = '';
          if (p.firstImage) {
            var isVid = !!p.firstImage.match(/\.(mp4|mov|avi|webm|ogg)$/i);
            var imagesJson = JSON.stringify(p.images || []).replace(/'/g, '&#39;');
            imgHtml = isVid 
              ? '<video src="' + p.firstImage + '" data-images=\'' + imagesJson + '\' class="zoomable" style="width:40px;height:40px;border-radius:4px;object-fit:cover;margin-right:12px;cursor:pointer;" muted></video>'
              : '<img src="' + p.firstImage + '" data-images=\'' + imagesJson + '\' class="zoomable" style="width:40px;height:40px;border-radius:4px;object-fit:cover;margin-right:12px;cursor:pointer;"/>';
          } else {
            imgHtml = '<div style="width:40px;height:40px;border-radius:4px;background:#f5f5f5;margin-right:12px;display:flex;align-items:center;justify-content:center;font-size:16px;">🏺</div>';
          }
          
          var displayLabel = qtyVal > 0 ? (qtyVal + ' đã bán') : AdminData.fmt(p.basePrice);

          return '<div class="top-product-item" style="align-items:center;">' +
          '<div class="top-product-item__rank">' + (i + 1) + '</div>' +
          imgHtml +
            '<div class="top-product-item__info" style="flex:1">' +
            '<div class="top-product-item__name">' + p.name + '</div>' +
            '<div class="top-product-item__cat">' + p.category + '</div>' +
            '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + pct + '%"></div></div>' +
            '</div>' +
            '<div class="top-product-item__revenue" style="font-weight:600;color:var(--accent);">' + displayLabel + '</div>' +
            '</div>';
        }).join('');
      }

      // ── Order Status Distribution ──
      var statusCount = analytics.orderStatuses || { pending: 0, confirmed: 0, shipping: 0, completed: 0, cancelled: 0 };
      ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'].forEach(function(s) {
        var el = document.getElementById('stat-' + s);
        if (el) el.textContent = statusCount[s] || 0;
      });

      // ── Activity Feed (Dynamic & Realtime with local storage fallback) ──
      var actEl = document.getElementById('activity-feed');
      if (actEl) {
        var activities = [];

        // Load real-time status updates from localStorage
        var liveActs = [];
        try {
          liveActs = JSON.parse(localStorage.getItem('admin_live_activities') || '[]');
        } catch(e){}
        
        liveActs.forEach(function(la) {
          activities.push(la);
        });

        // 1. Order activities from DB
        orders.forEach(function(o) {
          if (!o.date) return;

          // Check if we already have a real-time notification for order placement
          var isAlreadyNotified = liveActs.some(function(la) {
            return la.text.indexOf(o.id) !== -1 && (la.text.indexOf('đặt') !== -1 || la.text.indexOf('tạo') !== -1);
          });

          if (!isAlreadyNotified && o.status === 'pending') {
            activities.push({
              dot: 'green',
              text: 'Đơn hàng <strong>#' + o.id + '</strong> vừa được đặt bởi <strong>' + o.customer + '</strong>' + (o.items && o.items[0] ? ' – ' + o.items[0].name : ''),
              timestamp: o.date
            });
          }

          // Check if we already have a real-time status update for this order code
          var hasLiveStatusUpdate = liveActs.some(function(la) {
            return la.text.indexOf(o.id) !== -1 && (la.text.indexOf('trạng thái') !== -1 || la.text.indexOf('hoàn thành') !== -1 || la.text.indexOf('huỷ') !== -1);
          });

          if (!hasLiveStatusUpdate) {
            if (o.status === 'completed') {
              activities.push({ dot: 'green', text: 'Đơn hàng <strong>#' + o.id + '</strong> đã hoàn thành giao hàng', timestamp: o.date });
            } else if (o.status === 'cancelled') {
              activities.push({ dot: 'red', text: 'Đơn hàng <strong>#' + o.id + '</strong> bị huỷ bởi khách hàng', timestamp: o.date });
            } else if (o.status === 'shipping') {
              activities.push({ dot: 'blue', text: 'Đơn hàng <strong>#' + o.id + '</strong> đang được giao', timestamp: o.date });
            } else if (o.status === 'confirmed') {
              activities.push({ dot: 'blue', text: 'Đơn hàng <strong>#' + o.id + '</strong> đã được xác nhận', timestamp: o.date });
            }
          }

          // High-value highlight
          if (o.total >= 10000000) {
            var hasLiveHighVal = liveActs.some(function(la) { return la.text.indexOf(o.customer) !== -1 && la.text.indexOf('đơn hàng lớn') !== -1; });
            if (!hasLiveHighVal) {
              activities.push({ dot: 'gold', text: 'Khách hàng <strong>' + o.customer + '</strong> đặt đơn hàng lớn trị giá ' + AdminData.fmt(o.total), timestamp: o.date });
            }
          }
        });

        // 2. Customer activities
        customers.forEach(function(c) {
          if (!c.joinedAt) return;
          var hasLiveCust = liveActs.some(function(la) { return la.text.indexOf(c.name) !== -1 && la.text.indexOf('đăng ký') !== -1; });
          if (!hasLiveCust) {
            activities.push({ dot: 'blue', text: 'Khách hàng <strong>' + c.name + '</strong> đăng ký tài khoản mới', timestamp: c.joinedAt });
          }
        });

        // 3. Stock warnings
        products.forEach(function(p) {
          if (p.totalStock <= 2) {
            var warningTime = new Date(Date.now() - 86400000).toISOString();
            if (p.totalStock === 0) {
              activities.push({ dot: 'red', text: 'Sản phẩm <strong>' + p.name + '</strong> đã hết hàng (Ngưng bán)', timestamp: warningTime });
            } else {
              activities.push({ dot: 'gold', text: 'Sản phẩm <strong>' + p.name + '</strong> sắp hết hàng (còn ' + p.totalStock + ')', timestamp: warningTime });
            }
          }
        });

        // Sort descending chronologically
        activities.sort(function(a, b) {
          var tA = new Date(a.timestamp).getTime();
          var tB = new Date(b.timestamp).getTime();
          return tB - tA;
        });

        var recentActivities = activities.slice(0, 6);
        actEl.innerHTML = recentActivities.map(function(a) {
          return '<div class="activity-item">' +
            '<div class="activity-dot activity-dot--' + a.dot + '"></div>' +
            '<div class="activity-text">' + a.text + '</div>' +
            '<div class="activity-time">' + getRelativeTime(a.timestamp) + '</div>' +
            '</div>';
        }).join('');
      }

      // ── SVG Line Chart (Dynamic Revenue) ──
      var chartEl = document.getElementById('revenue-chart');
      if (chartEl && analytics.weeklyRevenue && analytics.weeklyRevenue.length > 0) {
        var data = analytics.weeklyRevenue; // Re-using weeklyRevenue field for chartData
        // Update chart title if needed
        var chartTitleEl = chartEl.parentElement.previousElementSibling;
        if (chartTitleEl) {
          var spanLabel = chartTitleEl.querySelector('span:last-child');
          if (spanLabel) {
            var labelText = 'Tất cả';
            if (currentFilterVal === 'today') labelText = 'Hôm nay';
            if (currentFilterVal === 'week') labelText = 'Tuần này';
            if (currentFilterVal === 'month') labelText = 'Tháng này';
            spanLabel.textContent = labelText;
          }
        }

        var W = chartEl.clientWidth || 600, H = 220;
        var pad = { top: 20, right: 20, bottom: 36, left: 60 };
        var cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;
        var maxV = Math.max.apply(null, data.map(function(d) { return d.revenue; }));
        if (maxV === 0) maxV = 1;
        var minV = 0;
        function xPos(i) { return data.length > 1 ? pad.left + i * (cW / (data.length - 1)) : pad.left + cW/2; }
        function yPos(v) { return pad.top + cH - (((v - minV) / (maxV - minV)) * cH); }
        // Build path
        var pts = data.map(function(d, i) { return { x: xPos(i), y: yPos(d.revenue) }; });
        function smooth(pts) {
          if (pts.length === 1) return 'M ' + pts[0].x + ' ' + pts[0].y;
          var d = 'M ' + pts[0].x + ' ' + pts[0].y;
          for (var i = 0; i < pts.length - 1; i++) {
            var cx = (pts[i].x + pts[i + 1].x) / 2;
            d += ' C ' + cx + ' ' + pts[i].y + ', ' + cx + ' ' + pts[i + 1].y + ', ' + pts[i + 1].x + ' ' + pts[i + 1].y;
          }
          return d;
        }
        var path = smooth(pts);
        // Area path
        var areaPath = '';
        if (pts.length > 1) {
            areaPath = path + ' L ' + pts[pts.length - 1].x + ' ' + (pad.top + cH) + ' L ' + pts[0].x + ' ' + (pad.top + cH) + ' Z';
        } else if (pts.length === 1) {
            areaPath = path + ' L ' + pts[0].x + ' ' + (pad.top + cH) + ' Z';
        }
        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">';
        // Gridlines
        for (var g = 0; g <= 4; g++) {
          var gy = pad.top + cH - (g / 4) * cH;
          var gv = Math.round((maxV * g / 4) / 1e6) + 'tr';
          if (maxV <= 1) gv = '0';
          svg += '<line x1="' + pad.left + '" y1="' + gy + '" x2="' + (pad.left + cW) + '" y2="' + gy + '" stroke="rgba(0,0,0,.06)" stroke-dasharray="4,4"/>';
          svg += '<text x="' + (pad.left - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#9B8B75">' + gv + '</text>';
        }
        // X labels
        data.forEach(function(d, i) {
          // Only show some labels if there are too many
          if (data.length <= 15 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) {
              svg += '<text x="' + xPos(i) + '" y="' + (pad.top + cH + 20) + '" text-anchor="middle" font-size="11" fill="#9B8B75">' + d.label + '</text>';
          }
        });
        // Gradient
        svg += '<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C8922A" stop-opacity=".18"/><stop offset="100%" stop-color="#C8922A" stop-opacity="0"/></linearGradient></defs>';
        // Area
        if (areaPath) svg += '<path d="' + areaPath + '" fill="url(#rg)"/>';
        // Line
        svg += '<path d="' + path + '" fill="none" stroke="#C8922A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
        // Dots
        pts.forEach(function(p, i) {
          if (data.length <= 15 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) {
              svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#C8922A" stroke="#fff" stroke-width="2"/>';
          }
        });
        svg += '</svg>';
        chartEl.innerHTML = svg;
      } else if (chartEl) {
        chartEl.innerHTML = '<div style="text-align:center;padding:50px;color:var(--text-muted)">Không có dữ liệu</div>';
      }

      AdminData.orders.updatePendingBadge(orders);
    }).catch(function(err) {
        console.error(err);
        adminToast('Lỗi tải dữ liệu dashboard', 'error');
    });
  }

  if (timeFilterGroup) {
      var btns = timeFilterGroup.querySelectorAll('.time-filter-btn');
      btns.forEach(function(btn) {
          btn.addEventListener('click', function() {
              btns.forEach(function(b) { b.classList.remove('active'); });
              btn.classList.add('active');
              currentFilterVal = btn.getAttribute('data-val');
              refreshDashboard();
          });
      });
  }

  // Initial load
  refreshDashboard();

  // ── Register Global SignalR Notification Listener ──
  window.onAdminNotification = function(eventType, message) {
    refreshDashboard();
  };

  // Fallback sync: Refresh dashboard data every 5 minutes in case connection drops
  setInterval(refreshDashboard, 300000);
});
}());

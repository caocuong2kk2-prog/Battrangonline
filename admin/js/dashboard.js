// dashboard.js
(function(){'use strict';
document.addEventListener('DOMContentLoaded',function(){
  Promise.all([
    AdminData.orders.load(),
    AdminData.products.load(),
    AdminData.customers.load(),
    AdminData.analytics.getDashboardData()
  ]).then(function(res) {
    var orders = res[0];
    var products = res[1];
    var customers = res[2];
    var analytics = res[3];

    // ── KPI ──
    var set = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    set('kpi-revenue', AdminData.fmtShort(analytics.totalRevenue));
    set('kpi-orders', analytics.totalOrders);
    set('kpi-products', analytics.totalProducts);
    set('kpi-customers', analytics.totalCustomers);
    set('kpi-new-orders', analytics.newOrdersToday + ' mới hôm nay');

    // ── Recent Orders Table ──
    var tbody = document.getElementById('recent-orders-body');
    if (tbody) {
      var recent = orders.slice(0, 7);
      tbody.innerHTML = recent.map(function(o) {
        return '<tr>' +
          '<td><strong>' + o.id + '</strong></td>' +
          '<td>' + o.customer + '</td>' +
          '<td class="hide-mobile">' + o.date + '</td>' +
          '<td>' + AdminData.fmt(o.total) + '</td>' +
          '<td><span class="badge ' + AdminData.getStatusBadge(o.status) + '">' + AdminData.getStatusLabel(o.status) + '</span></td>' +
          '<td class="actions-cell"><a href="orders.html" class="btn btn--sm btn--secondary">Xem</a></td>' +
          '</tr>';
      }).join('');
    }

    // ── Top Products ──
    var sortedProds = [].concat(products).sort(function(a, b) { return b.price - a.price; }).slice(0, 5);
    var maxPrice = sortedProds[0] ? sortedProds[0].price : 1;
    var topEl = document.getElementById('top-products-list');
    if (topEl) {
      topEl.innerHTML = sortedProds.map(function(p, i) {
        var pct = Math.round((p.price / maxPrice) * 100);
          var imgHtml = (p.images && p.images[0]) ? '<img src="'+p.images[0]+'" data-images=\''+JSON.stringify(p.images)+'\' class="zoomable" style="width:40px;height:40px;border-radius:4px;object-fit:cover;margin-right:12px;cursor:pointer;"/>' : '<div style="width:40px;height:40px;border-radius:4px;background:#f5f5f5;margin-right:12px;display:flex;align-items:center;justify-content:center;font-size:16px;">🏺</div>';
          return '<div class="top-product-item" style="align-items:center;">' +
          '<div class="top-product-item__rank">' + (i + 1) + '</div>' +
          imgHtml +
          '<div class="top-product-item__info" style="flex:1">' +
          '<div class="top-product-item__name">' + p.name + '</div>' +
          '<div class="top-product-item__cat">' + AdminData.getCatName(p.category) + '</div>' +
          '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<div class="top-product-item__revenue">' + AdminData.fmtShort(p.price) + '</div>' +
          '</div>';
      }).join('');
    }

    // ── Activity Feed ──
    var actEl = document.getElementById('activity-feed');
    if (actEl) {
      var activities = [
        { dot: 'green', text: '<strong>Đơn DH008</strong> vừa được đặt – Lộc Bình Bát Tiên', time: '5 phút trước' },
        { dot: 'gold', text: 'Sản phẩm <strong>Lộc Bình Tứ Quý</strong> sắp hết hàng (còn 2)', time: '12 phút trước' },
        { dot: 'blue', text: '<strong>Bùi Thị Hoa</strong> đăng ký tài khoản mới', time: '28 phút trước' },
        { dot: 'green', text: 'Đơn <strong>DH001</strong> đã hoàn thành giao hàng', time: '1 giờ trước' },
        { dot: 'red', text: 'Đơn <strong>DH005</strong> bị huỷ bởi khách hàng', time: '2 giờ trước' },
        { dot: 'gold', text: '<strong>Phạm Thị Dung</strong> đặt đơn 50.000.000đ', time: '3 giờ trước' }
      ];
      actEl.innerHTML = activities.map(function(a) {
        return '<div class="activity-item">' +
          '<div class="activity-dot activity-dot--' + a.dot + '"></div>' +
          '<div class="activity-text">' + a.text + '</div>' +
          '<div class="activity-time">' + a.time + '</div>' +
          '</div>';
      }).join('');
    }

    // ── SVG Line Chart (Revenue 7 days) ──
    var chartEl = document.getElementById('revenue-chart');
    if (chartEl) {
      var data = analytics.weeklyRevenue;
      var W = chartEl.clientWidth || 600, H = 220;
      var pad = { top: 20, right: 20, bottom: 36, left: 60 };
      var cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;
      var maxV = Math.max.apply(null, data.map(function(d) { return d.revenue; }));
      var minV = 0;
      function xPos(i) { return pad.left + i * (cW / (data.length - 1)); }
      function yPos(v) { return pad.top + cH - (((v - minV) / (maxV - minV)) * cH); }
      // Build path
      var pts = data.map(function(d, i) { return { x: xPos(i), y: yPos(d.revenue) }; });
      function smooth(pts) {
        var d = 'M ' + pts[0].x + ' ' + pts[0].y;
        for (var i = 0; i < pts.length - 1; i++) {
          var cx = (pts[i].x + pts[i + 1].x) / 2;
          d += ' C ' + cx + ' ' + pts[i].y + ', ' + cx + ' ' + pts[i + 1].y + ', ' + pts[i + 1].x + ' ' + pts[i + 1].y;
        }
        return d;
      }
      var path = smooth(pts);
      // Area path
      var areaPath = path + ' L ' + pts[pts.length - 1].x + ' ' + (pad.top + cH) + ' L ' + pts[0].x + ' ' + (pad.top + cH) + ' Z';
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">';
      // Gridlines
      for (var g = 0; g <= 4; g++) {
        var gy = pad.top + cH - (g / 4) * cH;
        var gv = Math.round((maxV * g / 4) / 1e6) + 'tr';
        svg += '<line x1="' + pad.left + '" y1="' + gy + '" x2="' + (pad.left + cW) + '" y2="' + gy + '" stroke="rgba(0,0,0,.06)" stroke-dasharray="4,4"/>';
        svg += '<text x="' + (pad.left - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#9B8B75">' + gv + '</text>';
      }
      // X labels
      data.forEach(function(d, i) {
        svg += '<text x="' + xPos(i) + '" y="' + (pad.top + cH + 20) + '" text-anchor="middle" font-size="11" fill="#9B8B75">' + d.label + '</text>';
      });
      // Gradient
      svg += '<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C8922A" stop-opacity=".18"/><stop offset="100%" stop-color="#C8922A" stop-opacity="0"/></linearGradient></defs>';
      // Area
      svg += '<path d="' + areaPath + '" fill="url(#rg)"/>';
      // Line
      svg += '<path d="' + path + '" fill="none" stroke="#C8922A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
      // Dots
      pts.forEach(function(p, i) {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#C8922A" stroke="#fff" stroke-width="2"/>';
      });
      svg += '</svg>';
      chartEl.innerHTML = svg;
    }

    // ── Order Status Distribution ──
    var statusCount = { pending: 0, confirmed: 0, shipping: 0, completed: 0, cancelled: 0 };
    orders.forEach(function(o) { if (statusCount[o.status] !== undefined) statusCount[o.status]++; });
    ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'].forEach(function(s) {
      var el = document.getElementById('stat-' + s);
      if (el) el.textContent = statusCount[s];
    });

    AdminData.orders.updatePendingBadge(orders);
  }).catch(function(err) {
      console.error(err);
      adminToast('Lỗi tải dữ liệu dashboard', 'error');
  });
});
}());

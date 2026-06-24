const fs = require('fs');
const filePath = 'h:/WORK/Battrangonline/affiliate/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace buildStatsCardsHtml with two functions
const oldFuncStart = 'function buildStatsCardsHtml(stats) {';
const oldFuncEndMarker = 'function buildTopProductsHtml(topProducts) {';
const oldFuncEnd = content.indexOf(oldFuncEndMarker);
const oldFuncStartIdx = content.indexOf(oldFuncStart);

const newFunctions = 
        function buildWalletCardsHtml(stats) {
            return \
                <!-- Stat: Hoa h?ng kh? d?ng -->
                <div class="premium-stat-card green" style="border:2px solid #10b981; box-shadow:0 4px 12px rgba(16,185,129,0.15);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">Hoa h?ng kh? d?ng</div>
                        <div class="premium-icon-wrap green">??</div>
                    </div>
                    <div style="font-size:1.8rem;font-weight:800;color:#10b981;line-height:1;letter-spacing:-0.5px;margin-bottom:8px;">\<span style="font-size:1rem;color:var(--text-muted);margin-left:4px;font-weight:600;">d</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:0.8rem;color:#10b981;display:flex;align-items:center;gap:6px;font-weight:600;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;"></span> S?n sàng rút ngay</span>
                        <span style="font-size:0.72rem;color:#9ca3af;font-style:italic;">T?ng tích luy</span>
                    </div>
                </div>
                <!-- Stat: Ðã rút -->
                <div class="premium-stat-card purple">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">T?ng ti?n dã rút</div>
                        <div class="premium-icon-wrap purple">??</div>
                    </div>
                    <div style="font-size:1.6rem;font-weight:700;color:var(--text-dark);line-height:1;letter-spacing:-0.5px;margin-bottom:8px;">\<span style="font-size:0.9rem;color:var(--text-muted);margin-left:4px;font-weight:600;">d</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:0.8rem;color:#8b5cf6;display:flex;align-items:center;gap:6px;font-weight:500;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#8b5cf6;"></span> Ðã thanh toán</span>
                        <span style="font-size:0.72rem;color:#9ca3af;font-style:italic;">T?ng tích luy</span>
                    </div>
                </div>
            \;
        }

        function buildPerformanceCardsHtml(stats) {
            const gClicks = growthBadge(stats.validClicks || 0, stats.prevValidClicks || 0);
            const gOrders = growthBadge(stats.totalOrders || 0, stats.prevTotalOrders || 0);
            const gCompleted = growthBadge(stats.completedOrders || 0, stats.prevCompletedOrders || 0);
            const gPending = growthBadge(Number(stats.pendingCommission), Number(stats.prevPendingCommission));

            return \
                <!-- Stat: Lu?t click h?p l? -->
                <div class="premium-stat-card blue">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:flex; align-items:center;">
                            Lu?t click h?p l?
                            <span class="info-tooltip-container">??<span class="info-tooltip-text">Ch? tính t?i da 1 click trong m?i 60 phút t? cùng 1 ngu?i truy c?p d? ch?ng click ?o, click spam.</span></span>
                        </div>
                        <div class="premium-icon-wrap blue">???</div>
                    </div>
                    <div style="font-size:1.6rem;font-weight:700;color:var(--text-dark);line-height:1;letter-spacing:-0.5px;margin-bottom:8px;">\</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">Ngu?i ti?p c?n th?c t?</span>
                        \
                    </div>
                </div>
                <!-- Stat: Ðon hàng phát sinh -->
                <div class="premium-stat-card blue">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">Ðon hàng phát sinh</div>
                        <div class="premium-icon-wrap blue">??</div>
                    </div>
                    <div style="font-size:1.6rem;font-weight:700;color:var(--text-dark);line-height:1;letter-spacing:-0.5px;margin-bottom:8px;">\</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">Ðon trong k?</span>
                        \
                    </div>
                </div>
                <!-- Stat: Ðon hàng hoàn thành -->
                <div class="premium-stat-card purple">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600; display:flex; align-items:center;">
                            Ðon hàng hoàn thành
                            <span class="info-tooltip-container">??<span class="info-tooltip-text">T?ng s? don hàng gi?i thi?u dã giao hàng và thanh toán thành công.</span></span>
                        </div>
                        <div class="premium-icon-wrap purple">?</div>
                    </div>
                    <div style="font-size:1.6rem;font-weight:700;color:var(--text-dark);line-height:1;letter-spacing:-0.5px;margin-bottom:8px;">\</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">Giao hàng thành công</span>
                        \
                    </div>
                </div>
                <!-- Stat: Hoa h?ng ch? duy?t -->
                <div class="premium-stat-card orange">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">Hoa h?ng ch? duy?t</div>
                        <div class="premium-icon-wrap orange">?</div>
                    </div>
                    <div style="font-size:1.6rem;font-weight:700;color:var(--text-dark);line-height:1;letter-spacing:-0.5px;margin-bottom:8px;">\<span style="font-size:0.9rem;color:var(--text-muted);margin-left:4px;font-weight:600;">d</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:0.8rem;color:#f59e0b;display:flex;align-items:center;gap:6px;font-weight:500;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#f59e0b;"></span> Ch? khách nh?n hàng</span>
                        \
                    </div>
                </div>
            \;
        }

        ;
content = content.substring(0, oldFuncStartIdx) + newFunctions + content.substring(oldFuncEnd);

// 2. Rewrite the HTML injection part in Dashboard.init()
// We need to inject <div id="wallet-cards-container"> just above the dateFilterBlock.
// And rewrite <div id="stats-cards-container"> to not contain the hardcoded 6 cards, just use the function.
// Since we have stats available in Dashboard.init as stats = data.stats, we can just call the functions.

// Find: <!-- Date Filter - Redesigned with Apply Button -->
const dateFilterMarker = '<!-- Date Filter - Redesigned with Apply Button -->';
const dateFilterIdx = content.indexOf(dateFilterMarker);

const walletInjection = 
                    <h3 style="font-size:1.1rem; font-weight:700; color:#111827; margin-bottom:12px; margin-top:24px; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.4rem;">??</span> Ví ti?n c?a tôi
                    </h3>
                    <div id="wallet-cards-container" class="stats-grid" style="margin-bottom: 24px;">
                        \
                    </div>
                    <h3 style="font-size:1.1rem; font-weight:700; color:#111827; margin-bottom:12px; margin-top:32px; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.4rem;">??</span> Hi?u su?t gi?i thi?u
                    </h3>
;
content = content.substring(0, dateFilterIdx) + walletInjection + content.substring(dateFilterIdx);

// Now, replace the old stats-cards-container
const statsStartMarker = '<!-- Premium Floating Stats Cards -->';
const topProdMarker = '<!-- Top 5 Products Table -->';
const s1 = content.indexOf(statsStartMarker);
const s2 = content.indexOf(topProdMarker);

const newStatsContainer = 
                    <div id="stats-cards-container" class="stats-grid" style="margin-bottom: 32px;">
                        \
                    </div>
                    
;
content = content.substring(0, s1) + newStatsContainer + content.substring(s2);

// 3. Update fetchStatsWithFilter
// Change container.innerHTML = buildStatsCardsHtml(stats);
// to container.innerHTML = buildPerformanceCardsHtml(stats);
content = content.replace(
    /container\.innerHTML = buildStatsCardsHtml\(stats\);/g, 
    'container.innerHTML = buildPerformanceCardsHtml(stats);'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Success');

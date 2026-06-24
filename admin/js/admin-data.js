// admin-data.js
(function (global) {
    'use strict';

    var isLiveServer = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && (window.location.port !== '5055' && window.location.port !== '7275');
    var dynamicBase = isLiveServer ? 'http://localhost:5055/api' : '/api';
    var API_BASE = dynamicBase + '/admin';
    var PUBLIC_API_BASE = dynamicBase;

    function getToken() {
        var authStr = localStorage.getItem('pgt_admin_session');
        if (!authStr) return null;
        try {
            var auth = JSON.parse(authStr);
            return auth.token;
        } catch (e) {
            return null;
        }
    }

    function normalizeOrder(o) {
        return {
            id: o.id || o.Id,
            customer: o.customer || o.Customer,
            phone: o.phone || o.Phone,
            email: o.email || o.Email,
            address: o.address || o.Address,
            total: o.total != null ? o.total : o.Total,
            status: String(o.status || o.Status || '').toLowerCase(),
            date: o.date || o.Date,
            customerNote: o.customerNote || o.CustomerNote,
            adminNote: o.adminNote || o.AdminNote,
            isCancelRequested: o.isCancelRequested != null ? o.isCancelRequested : o.IsCancelRequested,
            cancelReason: o.cancelReason || o.CancelReason,
            cancelRequestedAt: o.cancelRequestedAt || o.CancelRequestedAt,
            cancelledAt: o.cancelledAt || o.CancelledAt,
            confirmedAt: o.confirmedAt || o.ConfirmedAt,
            shippingAt: o.shippingAt || o.ShippingAt,
            completedAt: o.completedAt || o.CompletedAt,
            items: (o.items || o.Items || []).map(function (i) {
                return {
                    productId: i.productId != null ? i.productId : i.ProductId,
                    name: i.name || i.Name,
                    size: i.size || i.Size,
                    qty: i.qty != null ? i.qty : i.Qty,
                    price: i.price != null ? i.price : i.Price,
                    imageUrl: i.imageUrl || i.ImageUrl,
                    estimatedValue: i.estimatedValue != null ? i.estimatedValue : i.EstimatedValue
                };
            })
        };
    }

    function _fetch(endpoint, options, isPublic = false) {
        options = options || {};
        options.headers = options.headers || {};

        if (!options.method || options.method === 'GET') {
            options.cache = 'no-store';
        } else {
            options.headers['Content-Type'] = 'application/json';
        }

        var token = getToken();
        if (token && !isPublic) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }

        var baseUrl = isPublic ? PUBLIC_API_BASE : API_BASE;

        return fetch(baseUrl + endpoint, options)
            .then(function (res) {
                if (res.status === 401) {
                    localStorage.removeItem('pgt_admin_session');
                    window.location.href = "login";
                    throw new Error('Unauthorized');
                }
                if (!res.ok) {
                    return res.json().catch(function () { return {}; }).then(function (body) {
                        throw new Error(body.message || body.title || ('API Error: ' + res.status));
                    });
                }

                // Return empty object for 204 No Content
                if (res.status === 204) return {};

                return res.json();
            });
    }

    // ── Caching helper for fast page transitions (indefinite within session) ──
    function _cachedFetch(cacheKey, endpoint, options, isPublic) {
        if (!options || (options.method || 'GET') === 'GET') {
            var cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try { return Promise.resolve(JSON.parse(cached)); } catch (e) { }
            }
            return _fetch(endpoint, options, isPublic).then(function (data) {
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
                return data;
            });
        }
        return _fetch(endpoint, options, isPublic);
    }

    // ── TTL-based caching helper (for frequently updated data like orders) ──
    // ttlMs: milliseconds before cache expires. Default: 30 seconds.
    function _ttlCachedFetch(cacheKey, endpoint, options, isPublic, ttlMs) {
        ttlMs = ttlMs || 30000;
        if (!options || (options.method || 'GET') === 'GET') {
            try {
                var raw = sessionStorage.getItem(cacheKey);
                if (raw) {
                    var wrapper = JSON.parse(raw);
                    if (wrapper && wrapper.ts && (Date.now() - wrapper.ts) < ttlMs) {
                        return Promise.resolve(wrapper.data);
                    }
                }
            } catch (e) { }
            return _fetch(endpoint, options, isPublic).then(function (data) {
                try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) { }
                return data;
            });
        }
        return _fetch(endpoint, options, isPublic);
    }

    // Invalidate a TTL cache key (forces next load to fetch fresh)
    function _invalidate(key) {
        sessionStorage.removeItem(key);
    }

    var AdminData = {
        products: {
            load: function () {
                sessionStorage.removeItem('pgt_admin_products');
                sessionStorage.removeItem('pgt_admin_products_ttl');
                return _fetch('/products');
            },
            refresh: function () {
                sessionStorage.removeItem('pgt_admin_products');
                sessionStorage.removeItem('pgt_admin_products_ttl');
                return _fetch('/products');
            },
            save: function (product) {
                sessionStorage.removeItem('pgt_admin_products');
                sessionStorage.removeItem('pgt_admin_products_ttl');
                if (product.id) {
                    return _fetch('/products/' + product.id, {
                        method: 'PUT',
                        body: JSON.stringify(product)
                    });
                } else {
                    return _fetch('/products', {
                        method: 'POST',
                        body: JSON.stringify(product)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_products');
                sessionStorage.removeItem('pgt_admin_products_ttl');
                return _fetch('/products/' + id, { method: 'DELETE' });
            },
            bulkStatus: function (ids, status) {
                sessionStorage.removeItem('pgt_admin_products');
                sessionStorage.removeItem('pgt_admin_products_ttl');
                return _fetch('/products/bulk-status', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids, status: status })
                });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_products');
                sessionStorage.removeItem('pgt_admin_products_ttl');
                return _fetch('/products/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        gifts: {
            load: function () {
                _invalidate('pgt_admin_gifts');
                return _fetch('/gifts');
            },
            save: function (gift) {
                _invalidate('pgt_admin_gifts');
                _invalidate('pgt_admin_products');
                if (gift.id) {
                    return _fetch('/gifts/' + gift.id, {
                        method: 'PUT',
                        body: JSON.stringify(gift)
                    });
                } else {
                    return _fetch('/gifts', {
                        method: 'POST',
                        body: JSON.stringify(gift)
                    });
                }
            },
            delete: function (id) {
                _invalidate('pgt_admin_gifts');
                _invalidate('pgt_admin_products');
                return _fetch('/gifts/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                _invalidate('pgt_admin_gifts');
                _invalidate('pgt_admin_products');
                return _fetch('/gifts/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        orders: {
            load: function () {
                _invalidate('pgt_admin_orders');
                return _fetch('/orders').then(function (data) {
                    if (!Array.isArray(data)) return [];
                    return data.map(normalizeOrder);
                });
            },
            create: function (order) {
                _invalidate('pgt_admin_orders');
                _invalidate('pgt_admin_customers');
                return _fetch('/orders', {
                    method: 'POST',
                    body: JSON.stringify(order)
                }).then(function (data) {
                    return normalizeOrder(data);
                });
            },
            updateStatus: function (id, status) {
                _invalidate('pgt_admin_orders');
                return _fetch('/orders/' + id + '/status', {
                    method: 'PATCH',
                    body: JSON.stringify({ status: status })
                });
            },
            updateNote: function (id, note) {
                _invalidate('pgt_admin_orders');
                return _fetch('/orders/' + id + '/note', {
                    method: 'PATCH',
                    body: JSON.stringify({ adminNote: note })
                });
            },
            delete: function (id) {
                _invalidate('pgt_admin_orders');
                return _fetch('/orders/' + id, {
                    method: 'DELETE'
                });
            },
            rejectCancel: function (id, reason) {
                _invalidate('pgt_admin_orders');
                return _fetch('/orders/' + id + '/reject-cancel', {
                    method: 'POST',
                    body: JSON.stringify({ reason: reason || '' })
                });
            },
            bulkStatus: function (ids, status) {
                _invalidate('pgt_admin_orders');
                return _fetch('/orders/bulk-status', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids, status: status })
                });
            },
            bulkDelete: function (ids) {
                _invalidate('pgt_admin_orders');
                return _fetch('/orders/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            },
            // Force a fresh fetch (bypass cache), used by SignalR notification handler
            refresh: function () {
                _invalidate('pgt_admin_orders');
                _invalidate('pgt_admin_customers');
            },
            updatePendingBadge: function (orders) {
                var promise = orders ? Promise.resolve(orders) : AdminData.orders.load();
                return promise.then(function (list) {
                    if (!Array.isArray(list)) list = [];
                    var pending = list.filter(function (o) { return o.status === 'pending' || o.isCancelRequested; }).length;
                    var badge = document.getElementById('sb-pending');
                    if (badge) {
                        badge.textContent = pending > 0 ? String(pending) : '';
                        badge.style.display = pending > 0 ? '' : 'none';
                    }
                    return pending;
                }).catch(function () { return 0; });
            }
        },
        customers: {
            load: function () {
                _invalidate('pgt_admin_customers');
                return _fetch('/customers');
            },
            create: function (customer) {
                _invalidate('pgt_admin_customers');
                return _fetch('/customers', {
                    method: 'POST',
                    body: JSON.stringify(customer)
                });
            },
            delete: function (id) {
                _invalidate('pgt_admin_customers');
                return _fetch('/customers/' + id + '?force=true', { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                _invalidate('pgt_admin_customers');
                return _fetch('/customers/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        affiliates: {
            updatePendingBadge: function () {
                var sbBadge = document.getElementById('sb-affiliates');
                if (!sbBadge) { console.warn('sb-affiliates missing in DOM'); return Promise.resolve(0); }
                
                return _fetch('/affiliates/pending-count').then(function(res) {
                    var total = res && res.total !== undefined ? res.total : 0;
                    if (total > 0) {
                        sbBadge.style.display = '';
                        sbBadge.textContent = total;
                        sbBadge.style.backgroundColor = '#dc2626';
                    } else {
                        sbBadge.style.display = 'none';
                    }
                    return total;
                }).catch(function() {
                    console.warn('pending-count failed, falling back to heavy fetch');
                    return Promise.all([
                        _fetch('/affiliates').catch(() => []),
                        _fetch('/affiliates/withdrawals').catch(() => []),
                        _fetch('/affiliates/commissions').catch(() => [])
                    ]).then(function (results) {
                        var affiliates = results[0] || [];
                        var withdrawals = results[1] || [];
                        var commissions = results[2] || [];
                        
                        var pendingAffiliates = affiliates.filter(a => a.status === 'Pending').length;
                        var pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending').length;
                        var pendingCommissions = commissions.filter(c => c.status === 'Pending').length;
                        
                        var total = pendingAffiliates + pendingWithdrawals + pendingCommissions;
                        console.log('Affiliates badge update:', total, affiliates.length, withdrawals.length, commissions.length);
                        
                        if (total > 0) {
                            sbBadge.style.display = '';
                            sbBadge.textContent = total;
                            sbBadge.style.backgroundColor = '#dc2626';
                        } else {
                            sbBadge.style.display = 'none';
                        }
                        return total;
                    });
                });
            },
            bulkStatus: function (ids, status) {
                return _fetch('/affiliates/bulk-status', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids, status: status })
                });
            },
            bulkTier: function (ids, tier) {
                return _fetch('/affiliates/bulk-tier', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids, tier: tier })
                });
            },
            bulkDelete: function (ids) {
                return _fetch('/affiliates/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        categories: {
            load: function () {
                return _ttlCachedFetch('pgt_admin_categories_v2', '/categories', {}, true, 30000).then(function (data) {
                    if (Array.isArray(data)) {
                        AdminData._categoriesMap = {};
                        data.forEach(function (c) {
                            AdminData._categoriesMap[c.id || c.Id] = c.name || c.Name;
                            if (c.subCategories && Array.isArray(c.subCategories)) {
                                c.subCategories.forEach(function(sc) {
                                    AdminData._categoriesMap[sc.id || sc.Id] = sc.name || sc.Name;
                                });
                            }
                        });
                    }
                    return data;
                });
            },
            save: function (cat) {
                sessionStorage.removeItem('pgt_admin_categories_v2');
                if (cat.isNew) {
                    return _fetch('/categories', {
                        method: 'POST',
                        body: JSON.stringify(cat)
                    });
                } else {
                    return _fetch('/categories/' + cat.id, {
                        method: 'PUT',
                        body: JSON.stringify(cat)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_categories_v2');
                return _fetch('/categories/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_categories_v2');
                return _fetch('/categories/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        glazeLines: {
            load: function () {
                return _cachedFetch('pgt_admin_glazelines', '/glazelines', {}, true);
            },
            save: function (gl) {
                sessionStorage.removeItem('pgt_admin_glazelines');
                if (!gl.id) {
                    return _fetch('/glazelines', {
                        method: 'POST',
                        body: JSON.stringify(gl)
                    });
                } else {
                    return _fetch('/glazelines/' + gl.id, {
                        method: 'PUT',
                        body: JSON.stringify(gl)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_glazelines');
                return _fetch('/glazelines/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_glazelines');
                return _fetch('/glazelines/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        productTypes: {
            load: function () {
                return _cachedFetch('pgt_admin_producttypes', '/producttypes', {}, true);
            },
            save: function (pt) {
                sessionStorage.removeItem('pgt_admin_producttypes');
                if (!pt.id) {
                    return _fetch('/producttypes', {
                        method: 'POST',
                        body: JSON.stringify(pt)
                    });
                } else {
                    return _fetch('/producttypes/' + pt.id, {
                        method: 'PUT',
                        body: JSON.stringify(pt)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_producttypes');
                return _fetch('/producttypes/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_producttypes');
                return _fetch('/producttypes/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        materials: {
            load: function () {
                return _cachedFetch('pgt_admin_materials', '/materials', {}, true);
            },
            save: function (mat) {
                sessionStorage.removeItem('pgt_admin_materials');
                if (!mat.id) {
                    return _fetch('/materials', {
                        method: 'POST',
                        body: JSON.stringify(mat)
                    });
                } else {
                    return _fetch('/materials/' + mat.id, {
                        method: 'PUT',
                        body: JSON.stringify(mat)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_materials');
                return _fetch('/materials/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_materials');
                return _fetch('/materials/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        colors: {
            load: function () {
                return _cachedFetch('pgt_admin_colors', '/colors', {}, true);
            },
            save: function (col) {
                sessionStorage.removeItem('pgt_admin_colors');
                if (!col.id) {
                    return _fetch('/colors', {
                        method: 'POST',
                        body: JSON.stringify(col)
                    });
                } else {
                    return _fetch('/colors/' + col.id, {
                        method: 'PUT',
                        body: JSON.stringify(col)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_colors');
                return _fetch('/colors/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_colors');
                return _fetch('/colors/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        patterns: {
            load: function () {
                return _cachedFetch('pgt_admin_patterns', '/patterns', {}, true);
            },
            save: function (pat) {
                sessionStorage.removeItem('pgt_admin_patterns');
                if (!pat.id) {
                    return _fetch('/patterns', {
                        method: 'POST',
                        body: JSON.stringify(pat)
                    });
                } else {
                    return _fetch('/patterns/' + pat.id, {
                        method: 'PUT',
                        body: JSON.stringify(pat)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_patterns');
                return _fetch('/patterns/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_patterns');
                return _fetch('/patterns/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        sizes: {
            load: function () {
                return _cachedFetch('pgt_admin_sizes', '/sizes', {}, true);
            },
            save: function (size) {
                sessionStorage.removeItem('pgt_admin_sizes');
                if (!size.id) {
                    return _fetch('/sizes', {
                        method: 'POST',
                        body: JSON.stringify(size)
                    });
                } else {
                    return _fetch('/sizes/' + size.id, {
                        method: 'PUT',
                        body: JSON.stringify(size)
                    });
                }
            },
            delete: function (id) {
                sessionStorage.removeItem('pgt_admin_sizes');
                return _fetch('/sizes/' + id, { method: 'DELETE' });
            },
            bulkDelete: function (ids) {
                sessionStorage.removeItem('pgt_admin_sizes');
                return _fetch('/sizes/bulk-delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: ids })
                });
            }
        },
        journey: {
            loadTopics: function () {
                return _cachedFetch('pgt_admin_topics', '/journey/topics', {}, true);
            },
            saveTopic: function (topic, isNew) {
                sessionStorage.removeItem('pgt_admin_topics');
                if (isNew) {
                    return _fetch('/journey/topics', {
                        method: 'POST',
                        body: JSON.stringify(topic)
                    });
                } else {
                    return _fetch('/journey/topics/' + topic.id, {
                        method: 'PUT',
                        body: JSON.stringify(topic)
                    });
                }
            },
            deleteTopic: function (id) {
                sessionStorage.removeItem('pgt_admin_topics');
                return _fetch('/journey/topics/' + id, { method: 'DELETE' });
            },
            loadVideos: function (topicId) {
                var qs = topicId ? '?topicId=' + topicId : '';
                return _cachedFetch('pgt_admin_videos_' + (topicId || 'all'), '/journey/videos' + qs, {}, true);
            },
            saveVideo: function (video) {
                // Clear all video caches since we don't know exactly which topic cache to invalidate
                for (var key in sessionStorage) {
                    if (key.startsWith('pgt_admin_videos_')) sessionStorage.removeItem(key);
                }
                if (video.id) {
                    return _fetch('/journey/videos/' + video.id, {
                        method: 'PUT',
                        body: JSON.stringify(video)
                    });
                } else {
                    return _fetch('/journey/videos', {
                        method: 'POST',
                        body: JSON.stringify(video)
                    });
                }
            },
            deleteVideo: function (id) {
                for (var key in sessionStorage) {
                    if (key.startsWith('pgt_admin_videos_')) sessionStorage.removeItem(key);
                }
                return _fetch('/journey/videos/' + id, { method: 'DELETE' });
            }
        },
        analytics: {
            getDashboardData: function (startDate, endDate) {
                var qs = '';
                if (startDate && endDate) {
                    qs = '?startDate=' + encodeURIComponent(startDate) + '&endDate=' + encodeURIComponent(endDate);
                }
                return _fetch('/analytics' + qs);
            },
            getRevenueByRange: function (startYear, startMonth, endYear, endMonth) {
                var qs = '?startYear=' + startYear + '&startMonth=' + startMonth +
                    '&endYear=' + endYear + '&endMonth=' + endMonth;
                return _fetch('/analytics/revenue-by-range' + qs);
            }
        },
        accounts: {
            load: function () {
                return _cachedFetch('pgt_admin_accounts', '/auth/accounts');
            },
            register: function (data) {
                sessionStorage.removeItem('pgt_admin_accounts');
                return _fetch('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            },
            delete: function (username) {
                sessionStorage.removeItem('pgt_admin_accounts');
                return _fetch('/auth/accounts/' + encodeURIComponent(username), {
                    method: 'DELETE'
                });
            }
        },
        settings: {
            load: function () {
                return _fetch('/site-config', {}, true);
            },
            save: function (settings) {
                return _fetch('/site-config', {
                    method: 'PUT',
                    body: JSON.stringify(settings)
                });
            }
        },
        notifications: {
            getAll: function () {
                return _fetch('/notifications');
            },
            markAsRead: function (id) {
                return _fetch('/notifications/' + id + '/read', { method: 'PATCH' });
            },
            markAllAsRead: function () {
                return _fetch('/notifications/read-all', { method: 'PATCH' });
            }
        },

        // Format utilities
        fmtDate: function (dStr) {
            if (!dStr) return '';
            // Remove the Z append because SQL Server dates are local time already
            if (typeof dStr === 'string' && dStr.endsWith('Z')) {
                dStr = dStr.slice(0, -1);
            }
            try {
                var d = new Date(dStr);
                if (isNaN(d.getTime())) {
                    // Try parsing DD/MM/YYYY or DD-MM-YYYY
                    var parts = dStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
                    if (parts) {
                        var day = parseInt(parts[1], 10);
                        var month = parseInt(parts[2], 10) - 1;
                        var year = parseInt(parts[3], 10);
                        var hour = parts[4] ? parseInt(parts[4], 10) : 0;
                        var min = parts[5] ? parseInt(parts[5], 10) : 0;
                        var sec = parts[6] ? parseInt(parts[6], 10) : 0;
                        d = new Date(year, month, day, hour, min, sec);
                    } else {
                        return dStr;
                    }
                }
                var pad = function (n) { return n < 10 ? '0' + n : n; };
                return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' ' + pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
            } catch (e) {
                return dStr;
            }
        },
        fmt: function (n) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ'; },
        fmtShort: function (n) {
            // Xử lý các trường hợp không hợp lệ
            if (n == null || isNaN(n)) {
                return '0';
            }

            n = Number(n);   // Đảm bảo là số

            if (n >= 1000000) {
                return (n / 1000000).toFixed(1).replace('.0', '') + 'tr';
            }
            if (n >= 1000) {
                return (n / 1000).toFixed(1).replace('.0', '') + 'k';
            }
            return n.toString();
        },
        getStatusBadge: function (s) {
            switch (s) {
                case 'pending': return 'badge--warning';
                case 'confirmed': return 'badge--info';
                case 'shipping': return 'badge--gold';
                case 'completed': return 'badge--success';
                case 'cancelled': return 'badge--danger';
                default: return 'badge--muted';
            }
        },
        getStatusLabel: function (s) {
            switch (s) {
                case 'pending': return 'Chờ xác nhận';
                case 'confirmed': return 'Đã xác nhận';
                case 'shipping': return 'Đang giao';
                case 'completed': return 'Hoàn thành';
                case 'cancelled': return 'Đã huỷ';
                default: return s;
            }
        },
        getCatName: function (slug) {
            if (AdminData._categoriesMap && AdminData._categoriesMap[slug]) {
                return AdminData._categoriesMap[slug];
            }
            var map = {
                'loc-binh': 'Lộc Bình',
                'do-tho': 'Đồ Thờ',
                'tranh-gom': 'Tranh Gốm',
                'binh-hoa': 'Bình Hoa',
                'chum-vat': 'Chum - Vạt',
                'dia-gom': 'Đĩa Gốm'
            };
            return map[slug] || slug;
        },
        journey: {
            loadTopics: function () {
                return _fetch('/journey/topics', null, true);
            },
            loadVideos: function (topicId) {
                var endpoint = '/journey/videos';
                if (topicId) endpoint += '?topicId=' + topicId;
                return _fetch(endpoint, null, true);
            },
            saveTopic: function (data, isNew) {
                if (isNew) {
                    return _fetch('/journey/topics', {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                } else {
                    return _fetch('/journey/topics/' + data.id, {
                        method: 'PUT',
                        body: JSON.stringify(data)
                    });
                }
            },
            deleteTopic: function (id) {
                return _fetch('/journey/topics/' + id, { method: 'DELETE' });
            },
            saveVideo: function (data) {
                if (data.id && data.id !== 0) {
                    return _fetch('/journey/videos/' + data.id, {
                        method: 'PUT',
                        body: JSON.stringify(data)
                    });
                } else {
                    return _fetch('/journey/videos', {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                }
            },
            deleteVideo: function (id) {
                return _fetch('/journey/videos/' + id, { method: 'DELETE' });
            }
        },
        notifications: {
            getAll: function () {
                return _fetch('/notifications?t=' + new Date().getTime());
            },
            markAsRead: function (id) {
                return _fetch('/notifications/' + id + '/read', { method: 'PATCH' });
            },
            markAllAsRead: function () {
                return _fetch('/notifications/read-all', { method: 'PATCH' });
            }
        }
    };

    global.AdminData = AdminData;

})(window);

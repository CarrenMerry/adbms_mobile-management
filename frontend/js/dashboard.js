// Dashboard Logic - Chart.js & Live MySQL Statistics

let salesChartInstance = null;
let paymentChartInstance = null;
let topPhonesChartInstance = null;
let stockLevelChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardStats();
    await loadDashboardCharts();
});

async function loadDashboardStats() {
    try {
        const res = await api.get('/dashboard/stats');
        if (res.success && res.data) {
            const data = res.data;
            document.getElementById('statProducts').textContent = data.total_products || 0;
            document.getElementById('statCustomers').textContent = data.total_customers || 0;
            document.getElementById('statEmployees').textContent = data.total_employees || 0;
            document.getElementById('statOrders').textContent = data.total_orders || 0;
            document.getElementById('statRevenue').textContent = formatCurrency(data.total_revenue || 0);
            document.getElementById('statLowStock').textContent = data.low_stock_products || 0;
        }
    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
        showToast('Could not load statistics from database: ' + err.message, 'error');
    }
}

async function loadDashboardCharts() {
    try {
        const res = await api.get('/dashboard/charts');
        if (!res.success || !res.data) return;

        const { daily_trends, top_phones, brand_stock, payment_statuses, recent_orders } = res.data;

        // 1. Sales Revenue & Orders Trend
        renderSalesTrendChart(daily_trends || []);

        // 2. Payment Status Distribution Doughnut
        renderPaymentStatusChart(payment_statuses || []);

        // 3. Top Selling Mobile Phones
        renderTopPhonesChart(top_phones || []);

        // 4. Stock Level by Brand
        renderStockLevelChart(brand_stock || []);

        // 5. Recent Orders Table
        renderRecentOrders(recent_orders || []);

    } catch (err) {
        console.error('Failed to load charts:', err);
    }
}

function renderSalesTrendChart(trends) {
    const ctx = document.getElementById('salesRevenueChart');
    if (!ctx) return;

    if (salesChartInstance) salesChartInstance.destroy();

    const labels = trends.map(t => formatDateOnly(t.date));
    const revenues = trends.map(t => parseFloat(t.revenue));
    const orderCounts = trends.map(t => parseInt(t.order_count));

    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Revenue (₹)',
                    data: revenues,
                    backgroundColor: 'rgba(5, 150, 105, 0.85)',
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Orders Count',
                    data: orderCounts,
                    type: 'line',
                    borderColor: '#0f172a',
                    backgroundColor: '#0f172a',
                    borderWidth: 2,
                    pointBackgroundColor: '#0f172a',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Plus Jakarta Sans', weight: 600 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label.includes('Revenue')) {
                                return ` Revenue: ${formatCurrency(context.raw)}`;
                            }
                            return ` Orders: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        callback: value => '₹' + (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value)
                    },
                    grid: { color: '#f1f5f9' }
                },
                y1: {
                    beginAtZero: true,
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { stepSize: 1 }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderPaymentStatusChart(statuses) {
    const ctx = document.getElementById('paymentStatusChart');
    if (!ctx) return;

    if (paymentChartInstance) paymentChartInstance.destroy();

    const labels = statuses.map(s => s.payment_status);
    const data = statuses.map(s => s.count);

    const colorMap = {
        'Paid': '#10b981',
        'Pending': '#f59e0b',
        'Failed': '#ef4444',
        'Refunded': '#64748b'
    };

    const backgroundColors = labels.map(l => colorMap[l] || '#94a3b8');

    paymentChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Plus Jakarta Sans', weight: 600 } }
                }
            }
        }
    });
}

function renderTopPhonesChart(phones) {
    const ctx = document.getElementById('topPhonesChart');
    if (!ctx) return;

    if (topPhonesChartInstance) topPhonesChartInstance.destroy();

    const labels = phones.map(p => p.phone_name);
    const units = phones.map(p => p.units_sold);

    topPhonesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Units Sold',
                data: units,
                backgroundColor: '#047857',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderStockLevelChart(brands) {
    const ctx = document.getElementById('stockLevelChart');
    if (!ctx) return;

    if (stockLevelChartInstance) stockLevelChartInstance.destroy();

    const labels = brands.map(b => b.brand);
    const stocks = brands.map(b => parseInt(b.total_stock));

    stockLevelChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total Stock Available',
                data: stocks,
                backgroundColor: '#3b82f6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 2 },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No orders available in database.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td class="fw-bold font-monospace">#${escapeHtml(o.order_id)}</td>
            <td>${formatDate(o.order_date)}</td>
            <td class="fw-semibold">${escapeHtml(o.customer_name)}</td>
            <td class="fw-bold text-dark">${formatCurrency(o.total_amount)}</td>
            <td><span class="badge bg-light text-dark border">${escapeHtml(o.payment_method)}</span></td>
            <td><span class="badge-custom badge-${o.order_status.toLowerCase()}">${escapeHtml(o.order_status)}</span></td>
            <td><span class="badge-custom badge-${o.payment_status.toLowerCase()}">${escapeHtml(o.payment_status)}</span></td>
            <td>
                <a href="orders.html?view=${o.order_id}" class="btn btn-outline-custom btn-icon-sm" title="View Order Details">
                    <i class="bi bi-eye"></i>
                </a>
            </td>
        </tr>
    `).join('');
}

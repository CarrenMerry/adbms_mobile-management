// Reports Frontend Controller - SQL Aggregates Loader

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadSalesReport(),
        loadProductsReport(),
        loadCustomersReport(),
        loadEmployeesReport(),
        loadPaymentsReport()
    ]);
});

async function loadSalesReport() {
    try {
        const res = await api.get('/reports/sales');
        if (!res.success || !res.data) return;

        const { summary, sales_by_date } = res.data;

        // Render Summary Cards
        const cardsContainer = document.getElementById('salesSummaryCards');
        cardsContainer.innerHTML = `
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <span class="stat-title">Total Non-Cancelled Orders</span>
                    <h3 class="stat-value text-dark">${summary.total_orders}</h3>
                    <p class="stat-subtext text-muted font-monospace">COUNT(order_id)</p>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <span class="stat-title">Total Gross Revenue</span>
                    <h3 class="stat-value text-success">${formatCurrency(summary.total_revenue)}</h3>
                    <p class="stat-subtext text-muted font-monospace">SUM(total_amount)</p>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <span class="stat-title">Average Order Value</span>
                    <h3 class="stat-value text-primary">${formatCurrency(summary.average_order_value)}</h3>
                    <p class="stat-subtext text-muted font-monospace">AVG(total_amount)</p>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <span class="stat-title">Highest Order Ticket</span>
                    <h3 class="stat-value text-dark">${formatCurrency(summary.max_order_value)}</h3>
                    <p class="stat-subtext text-muted font-monospace">MAX(total_amount)</p>
                </div>
            </div>
        `;

        // Render Sales by Date Table
        const tbody = document.getElementById('salesByDateTableBody');
        tbody.innerHTML = sales_by_date.map(d => `
            <tr>
                <td class="fw-semibold">${formatDateOnly(d.sale_date)}</td>
                <td><span class="badge bg-light text-dark border">${d.orders_count} orders</span></td>
                <td class="fw-bold text-success">${formatCurrency(d.daily_revenue)}</td>
                <td>${formatCurrency(d.daily_avg_order)}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load sales report:', err);
    }
}

async function loadProductsReport() {
    try {
        const res = await api.get('/reports/products');
        if (!res.success || !res.data) return;

        const { best_selling, brand_sales, low_stock } = res.data;

        // Best Selling
        const bestBody = document.getElementById('bestSellingTableBody');
        bestBody.innerHTML = best_selling.map(p => `
            <tr>
                <td><b>${escapeHtml(p.brand)}</b> ${escapeHtml(p.model)}</td>
                <td class="${p.stock_left <= 3 ? 'text-danger fw-bold' : ''}">${p.stock_left} units</td>
                <td><span class="badge bg-light text-primary border">${p.total_units_sold} sold</span></td>
                <td class="fw-bold text-success">${formatCurrency(p.total_revenue_generated)}</td>
            </tr>
        `).join('');

        // Brand Sales
        const brandBody = document.getElementById('brandSalesTableBody');
        brandBody.innerHTML = brand_sales.map(b => `
            <tr>
                <td class="fw-semibold text-dark">${escapeHtml(b.brand)}</td>
                <td>${b.units_sold} units</td>
                <td class="fw-bold text-success">${formatCurrency(b.brand_revenue)}</td>
            </tr>
        `).join('');

        // Low stock report
        const lowBody = document.getElementById('reportLowStockTableBody');
        lowBody.innerHTML = low_stock.map(l => `
            <tr>
                <td>${escapeHtml(l.brand)} ${escapeHtml(l.model)}</td>
                <td class="fw-bold text-danger">${l.quantity_available} left</td>
                <td><span class="badge-custom ${l.quantity_available === 0 ? 'badge-outofstock' : 'badge-lowstock'}">${l.stock_status}</span></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load products report:', err);
    }
}

async function loadCustomersReport() {
    try {
        const res = await api.get('/reports/customers');
        if (!res.success || !res.data) return;

        const { customer_spending, repeat_customers } = res.data;

        // Customer spending table
        const custBody = document.getElementById('customerSpendingTableBody');
        custBody.innerHTML = customer_spending.map(c => `
            <tr>
                <td class="font-monospace">#${c.customer_id}</td>
                <td class="fw-semibold">${escapeHtml(c.customer_name)}</td>
                <td>${escapeHtml(c.phone || '-')}</td>
                <td><span class="badge bg-light text-dark border">${c.order_count} orders</span></td>
                <td class="fw-bold text-success">${formatCurrency(c.total_spent)}</td>
                <td>${formatCurrency(c.average_spend)}</td>
            </tr>
        `).join('');

        // Repeat customers table (HAVING COUNT > 1)
        const repeatBody = document.getElementById('repeatCustomersTableBody');
        if (repeat_customers.length === 0) {
            repeatBody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">No repeat customers registered yet.</td></tr>`;
        } else {
            repeatBody.innerHTML = repeat_customers.map(c => `
                <tr>
                    <td class="fw-semibold text-dark">${escapeHtml(c.customer_name)}</td>
                    <td>${escapeHtml(c.phone || '-')}</td>
                    <td><span class="badge bg-light text-success border">${c.order_count} orders</span></td>
                    <td class="fw-bold text-success">${formatCurrency(c.total_spent)}</td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error('Failed to load customers report:', err);
    }
}

async function loadEmployeesReport() {
    try {
        const res = await api.get('/reports/employees');
        if (!res.success || !res.data) return;

        const tbody = document.getElementById('employeePerformanceTableBody');
        tbody.innerHTML = res.data.map(e => `
            <tr>
                <td class="font-monospace">#${e.employee_id}</td>
                <td class="fw-semibold">${escapeHtml(e.employee_name)}</td>
                <td><span class="badge bg-light text-primary border">${escapeHtml(e.role || 'Staff')}</span></td>
                <td><span class="badge bg-light text-dark border">${e.orders_handled} orders</span></td>
                <td class="fw-bold text-success">${formatCurrency(e.total_sales_volume)}</td>
                <td>${formatCurrency(e.avg_sale_value)}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load employees report:', err);
    }
}

async function loadPaymentsReport() {
    try {
        const res = await api.get('/reports/payments');
        if (!res.success || !res.data) return;

        const { payment_methods, order_statuses } = res.data;

        // Payment methods
        const payBody = document.getElementById('paymentMethodsTableBody');
        payBody.innerHTML = payment_methods.map(p => `
            <tr>
                <td class="fw-semibold text-dark">${escapeHtml(p.payment_method)}</td>
                <td><span class="badge bg-light text-dark border">${p.transaction_count}</span></td>
                <td class="fw-bold text-success">${formatCurrency(p.total_collected)}</td>
            </tr>
        `).join('');

        // Order statuses
        const statusBody = document.getElementById('orderStatusesTableBody');
        statusBody.innerHTML = order_statuses.map(s => `
            <tr>
                <td><span class="badge-custom badge-${s.order_status.toLowerCase()}">${escapeHtml(s.order_status)}</span></td>
                <td>${s.orders_count} orders</td>
                <td class="fw-bold text-dark">${formatCurrency(s.total_value)}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load payments report:', err);
    }
}

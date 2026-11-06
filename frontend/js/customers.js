// Customers Module Frontend Controller

let allCustomers = [];
let deleteTargetCustomerId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadCustomers();

    document.getElementById('customerSearchInput').addEventListener('input', debounce(loadCustomers, 250));
    document.getElementById('customerForm').addEventListener('submit', handleSaveCustomer);
    document.getElementById('confirmDeleteCustomerBtn').addEventListener('click', handleConfirmDeleteCustomer);
});

async function loadCustomers() {
    const search = document.getElementById('customerSearchInput').value.trim();
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div> Loading customer records...</td></tr>`;

    try {
        const res = await api.get('/customers', { search });
        if (res.success) {
            allCustomers = res.data;
            document.getElementById('customerCountBadge').textContent = res.count;
            renderCustomersTable(allCustomers);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load customers: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="empty-state p-0">
                        <i class="bi bi-people empty-state-icon"></i>
                        <h6 class="empty-state-title">No customers found</h6>
                        <p class="empty-state-text">No registered customer matches your search criteria.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td class="fw-bold font-monospace">#${c.customer_id}</td>
            <td class="fw-semibold text-dark">${escapeHtml(c.customer_name)}</td>
            <td>${escapeHtml(c.phone || '-')}</td>
            <td>${escapeHtml(c.email || '-')}</td>
            <td>
                <span class="badge bg-light text-dark border px-2 py-1">
                    <i class="bi bi-cart me-1"></i> ${c.total_orders} order${c.total_orders == 1 ? '' : 's'}
                </span>
            </td>
            <td class="fw-bold text-success">${formatCurrency(c.total_spent)}</td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-custom btn-icon-sm" title="View Customer Orders (SQL JOIN)" onclick="viewCustomerOrderHistory(${c.customer_id}, '${escapeHtml(c.customer_name)}')">
                        <i class="bi bi-clock-history"></i>
                    </button>
                    <button class="btn btn-outline-custom btn-icon-sm" title="Edit Customer" onclick="openEditCustomerModal(${c.customer_id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-custom btn-icon-sm text-danger" title="Delete Customer" onclick="promptDeleteCustomer(${c.customer_id}, '${escapeHtml(c.customer_name)}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddCustomerModal() {
    document.getElementById('customerModalTitle').textContent = 'Register New Customer';
    document.getElementById('customerIdInput').value = '';
    document.getElementById('customerNameInput').value = '';
    document.getElementById('customerPhoneInput').value = '';
    document.getElementById('customerEmailInput').value = '';
}

function openEditCustomerModal(customerId) {
    const c = allCustomers.find(item => item.customer_id === customerId);
    if (!c) return;

    document.getElementById('customerModalTitle').textContent = 'Edit Customer #' + customerId;
    document.getElementById('customerIdInput').value = c.customer_id;
    document.getElementById('customerNameInput').value = c.customer_name;
    document.getElementById('customerPhoneInput').value = c.phone || '';
    document.getElementById('customerEmailInput').value = c.email || '';

    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}

async function handleSaveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('customerIdInput').value;
    const customer_name = document.getElementById('customerNameInput').value.trim();
    const phone = document.getElementById('customerPhoneInput').value.trim();
    const email = document.getElementById('customerEmailInput').value.trim();

    if (!customer_name) {
        showToast('Customer name is required.', 'error');
        return;
    }

    const payload = { customer_name, phone, email };
    const btn = document.getElementById('saveCustomerBtn');
    btn.disabled = true;

    try {
        if (id) {
            const res = await api.put(`/customers/${id}`, payload);
            showToast(res.message || 'Customer updated successfully.', 'success');
        } else {
            const res = await api.post('/customers', payload);
            showToast(res.message || 'Customer registered successfully.', 'success');
        }

        const modalEl = document.getElementById('customerModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadCustomers();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function viewCustomerOrderHistory(customerId, customerName) {
    const titleEl = document.getElementById('orderHistoryModalTitle');
    titleEl.innerHTML = `Order History: <span class="text-success">${escapeHtml(customerName)}</span> (ID #${customerId})`;

    const tbody = document.getElementById('customerOrdersHistoryBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div> Loading order history via SQL JOIN...</td></tr>`;

    const modal = new bootstrap.Modal(document.getElementById('customerOrdersModal'));
    modal.show();

    try {
        const res = await api.get(`/customers/${customerId}/orders`);
        if (!res.success) throw new Error('Could not fetch orders');

        const orders = res.data;
        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">This customer has not placed any orders yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td class="fw-bold font-monospace">#${o.order_id}</td>
                <td>${formatDate(o.order_date)}</td>
                <td><span class="badge bg-light text-dark border">${o.items_count} item(s)</span></td>
                <td class="fw-bold">${formatCurrency(o.total_amount)}</td>
                <td>${escapeHtml(o.employee_name || 'Self-service')}</td>
                <td><span class="badge bg-light text-dark border">${escapeHtml(o.payment_method)}</span></td>
                <td><span class="badge-custom badge-${o.order_status.toLowerCase()}">${escapeHtml(o.order_status)}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${escapeHtml(err.message)}</td></tr>`;
    }
}

function promptDeleteCustomer(customerId, name) {
    deleteTargetCustomerId = customerId;
    document.getElementById('deleteCustomerText').textContent = `#${customerId} - ${name}`;
    const modal = new bootstrap.Modal(document.getElementById('deleteCustomerModal'));
    modal.show();
}

async function handleConfirmDeleteCustomer() {
    if (!deleteTargetCustomerId) return;
    const btn = document.getElementById('confirmDeleteCustomerBtn');
    btn.disabled = true;

    try {
        const res = await api.delete(`/customers/${deleteTargetCustomerId}`);
        showToast(res.message || 'Customer deleted successfully.', 'success');

        const modalEl = document.getElementById('deleteCustomerModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadCustomers();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        deleteTargetCustomerId = null;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Sales Orders Frontend Controller & Multi-Product Transaction Builder

let allOrders = [];
let availableProducts = [];
let availableCustomers = [];
let availableEmployees = [];
let currentViewingOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    await loadOrders();

    // Check query params if directed from another page (e.g. ?view=1001)
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    if (viewId) {
        viewOrderDetails(parseInt(viewId));
    }

    // Filter event listeners
    document.getElementById('orderSearchInput').addEventListener('input', debounce(loadOrders, 250));
    document.getElementById('statusFilterSelect').addEventListener('change', loadOrders);
    document.getElementById('paymentFilterSelect').addEventListener('change', loadOrders);
    document.getElementById('customerFilterSelect').addEventListener('change', loadOrders);
    document.getElementById('dateFilterInput').addEventListener('change', loadOrders);

    // Order modal events
    document.getElementById('addLineItemBtn').addEventListener('click', addLineItemRow);
    document.getElementById('newOrderForm').addEventListener('submit', handleCreateOrder);
    document.getElementById('updateStatusForm').addEventListener('submit', handleUpdateStatusSubmit);
    document.getElementById('viewInvoiceBtnFromDetails').addEventListener('click', () => {
        if (currentViewingOrderId) {
            const modalEl = document.getElementById('orderDetailsModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            viewOrderInvoice(currentViewingOrderId);
        }
    });
});

async function loadInitialData() {
    try {
        const [prodRes, custRes, empRes] = await Promise.all([
            api.get('/products'),
            api.get('/customers'),
            api.get('/employees')
        ]);

        if (prodRes.success) availableProducts = prodRes.data;
        if (custRes.success) {
            availableCustomers = custRes.data;
            populateCustomerFilters(availableCustomers);
        }
        if (empRes.success) availableEmployees = empRes.data;

    } catch (err) {
        console.error('Failed to load initial order metadata:', err);
    }
}

function populateCustomerFilters(customers) {
    const filterSelect = document.getElementById('customerFilterSelect');
    filterSelect.innerHTML = '<option value="all">Customer: All</option>';
    customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.customer_id;
        opt.textContent = `${c.customer_name} (#${c.customer_id})`;
        filterSelect.appendChild(opt);
    });
}

async function loadOrders() {
    const search = document.getElementById('orderSearchInput').value.trim();
    const status = document.getElementById('statusFilterSelect').value;
    const payment_status = document.getElementById('paymentFilterSelect').value;
    const customer_id = document.getElementById('customerFilterSelect').value;
    const date = document.getElementById('dateFilterInput').value;

    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div> Loading sales orders...</td></tr>`;

    try {
        const res = await api.get('/orders', { search, status, payment_status, customer_id, date });
        if (res.success) {
            allOrders = res.data;
            document.getElementById('ordersCountBadge').textContent = res.count;
            renderOrdersTable(allOrders);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load orders: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-5">
                    <div class="empty-state p-0">
                        <i class="bi bi-receipt empty-state-icon"></i>
                        <h6 class="empty-state-title">No orders found</h6>
                        <p class="empty-state-text">No order matches the current filter settings.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td class="fw-bold font-monospace">#${o.order_id}</td>
            <td>${formatDate(o.order_date)}</td>
            <td class="fw-semibold text-dark">${escapeHtml(o.customer_name)}</td>
            <td class="text-muted small">${escapeHtml(o.employee_name || 'Self-service')}</td>
            <td>
                <span class="badge bg-light text-dark border">
                    ${o.total_items_count} models (${o.total_units_count} units)
                </span>
            </td>
            <td class="fw-bold text-dark">${formatCurrency(o.total_amount)}</td>
            <td><span class="badge bg-light text-dark border">${escapeHtml(o.payment_method)}</span></td>
            <td><span class="badge-custom badge-${o.order_status.toLowerCase()}">${escapeHtml(o.order_status)}</span></td>
            <td><span class="badge-custom badge-${o.payment_status.toLowerCase()}">${escapeHtml(o.payment_status)}</span></td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-custom btn-icon-sm" title="View Order Details" onclick="viewOrderDetails(${o.order_id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-custom btn-icon-sm" title="Generate Tax Invoice" onclick="viewOrderInvoice(${o.order_id})">
                        <i class="bi bi-file-earmark-text"></i>
                    </button>
                    <button class="btn btn-outline-custom btn-icon-sm" title="Update Status" onclick="openUpdateStatusModal(${o.order_id}, '${o.order_status}', '${o.payment_status}')">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    ${o.order_status !== 'Cancelled' ? `
                        <button class="btn btn-outline-custom btn-icon-sm text-danger" title="Cancel Order & Restore Inventory" onclick="cancelOrderPrompt(${o.order_id})">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// ==============================================================
// MULTI-ITEM ORDER CREATION BUILDER
// ==============================================================
async function prepareNewOrderModal() {
    // Refresh products stock to ensure latest data
    const prodRes = await api.get('/products');
    if (prodRes.success) availableProducts = prodRes.data;

    // Refresh customers
    const custRes = await api.get('/customers');
    if (custRes.success) availableCustomers = custRes.data;

    // Populate Customer Dropdown
    const custSelect = document.getElementById('orderCustomerSelect');
    custSelect.innerHTML = '<option value="">-- Choose Customer --</option>';
    availableCustomers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.customer_id;
        opt.textContent = `${c.customer_name} (${c.phone || c.email || 'ID #' + c.customer_id})`;
        custSelect.appendChild(opt);
    });

    // Populate Employee Dropdown
    const empSelect = document.getElementById('orderEmployeeSelect');
    empSelect.innerHTML = '<option value="">-- None / Self-Service --</option>';
    availableEmployees.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.employee_id;
        opt.textContent = `${e.employee_name} (${e.role})`;
        empSelect.appendChild(opt);
    });

    // Reset line items and insert first row
    const tbody = document.getElementById('lineItemsTableBody');
    tbody.innerHTML = '';
    addLineItemRow();
    updateCartTotals();
}

function addLineItemRow() {
    const tbody = document.getElementById('lineItemsTableBody');
    const rowIndex = tbody.children.length;

    const tr = document.createElement('tr');
    tr.id = `lineItemRow_${rowIndex}`;

    let productOptions = '<option value="">-- Select Phone Model --</option>';
    availableProducts.forEach(p => {
        const isOutOfStock = p.quantity_available <= 0;
        productOptions += `
            <option value="${p.product_id}" data-price="${p.price}" data-stock="${p.quantity_available}" ${isOutOfStock ? 'disabled' : ''}>
                ${escapeHtml(p.brand)} ${escapeHtml(p.model)} - ${formatCurrency(p.price)} ${isOutOfStock ? '(OUT OF STOCK)' : `(${p.quantity_available} in stock)`}
            </option>
        `;
    });

    tr.innerHTML = `
        <td>
            <select class="form-select form-select-sm product-select" required onchange="handleProductSelectChanged(${rowIndex})">
                ${productOptions}
            </select>
        </td>
        <td>
            <span class="badge bg-light text-dark border stock-badge" id="stockBadge_${rowIndex}">-</span>
        </td>
        <td>
            <input type="number" min="1" max="1" value="1" class="form-control form-control-sm qty-input" id="qtyInput_${rowIndex}" disabled oninput="handleQuantityChanged(${rowIndex})">
            <small class="text-muted remaining-stock-text" id="remainingStock_${rowIndex}" style="font-size: 0.7rem;"></small>
        </td>
        <td>
            <span class="fw-semibold text-muted unit-price-display" id="unitPriceDisplay_${rowIndex}">₹0.00</span>
        </td>
        <td>
            <span class="fw-bold text-dark subtotal-display" id="subtotalDisplay_${rowIndex}">₹0.00</span>
        </td>
        <td class="text-end">
            <button type="button" class="btn btn-outline-danger btn-icon-sm" onclick="removeLineItemRow(${rowIndex})">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(tr);
    updateCartTotals();
}

function removeLineItemRow(index) {
    const tbody = document.getElementById('lineItemsTableBody');
    if (tbody.children.length <= 1) {
        showToast('At least one mobile phone item is required in the sales order.', 'warning');
        return;
    }
    const row = document.getElementById(`lineItemRow_${index}`);
    if (row) row.remove();
    updateCartTotals();
}

function handleProductSelectChanged(index) {
    const row = document.getElementById(`lineItemRow_${index}`);
    if (!row) return;

    const select = row.querySelector('.product-select');
    const selectedOption = select.options[select.selectedIndex];
    const qtyInput = row.querySelector('.qty-input');
    const stockBadge = row.querySelector('.stock-badge');
    const unitPriceDisplay = row.querySelector('.unit-price-display');
    const remainingStockText = row.querySelector('.remaining-stock-text');

    if (!selectedOption || !selectedOption.value) {
        qtyInput.disabled = true;
        stockBadge.textContent = '-';
        unitPriceDisplay.textContent = '₹0.00';
        remainingStockText.textContent = '';
        updateRowSubtotal(index, 0, 0);
        return;
    }

    const price = parseFloat(selectedOption.getAttribute('data-price') || 0);
    const stock = parseInt(selectedOption.getAttribute('data-stock') || 0);

    stockBadge.textContent = `${stock} Units`;
    stockBadge.className = `badge ${stock <= 3 ? 'bg-warning text-dark' : 'bg-success text-white'} border stock-badge`;

    qtyInput.disabled = false;
    qtyInput.max = stock;
    qtyInput.value = 1;

    unitPriceDisplay.textContent = formatCurrency(price);
    updateRowSubtotal(index, price, 1);
}

function handleQuantityChanged(index) {
    const row = document.getElementById(`lineItemRow_${index}`);
    if (!row) return;

    const select = row.querySelector('.product-select');
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    const price = parseFloat(selectedOption.getAttribute('data-price') || 0);
    const stock = parseInt(selectedOption.getAttribute('data-stock') || 0);
    const qtyInput = row.querySelector('.qty-input');
    let requestedQty = parseInt(qtyInput.value) || 0;

    const remainingText = row.querySelector('.remaining-stock-text');

    if (requestedQty > stock) {
        showToast(`Requested quantity (${requestedQty}) exceeds available stock (${stock}).`, 'warning');
        qtyInput.value = stock;
        requestedQty = stock;
    } else if (requestedQty < 1) {
        qtyInput.value = 1;
        requestedQty = 1;
    }

    const remaining = stock - requestedQty;
    remainingText.textContent = `Remaining: ${remaining}`;

    updateRowSubtotal(index, price, requestedQty);
}

function updateRowSubtotal(index, unitPrice, quantity) {
    const subtotal = unitPrice * quantity;
    const subtotalDisplay = document.getElementById(`subtotalDisplay_${index}`);
    if (subtotalDisplay) {
        subtotalDisplay.textContent = formatCurrency(subtotal);
        subtotalDisplay.setAttribute('data-subtotal', subtotal);
    }
    updateCartTotals();
}

function updateCartTotals() {
    const rows = document.querySelectorAll('#lineItemsTableBody tr');
    let grandTotal = 0;
    let totalItems = 0;

    rows.forEach(row => {
        const select = row.querySelector('.product-select');
        const qtyInput = row.querySelector('.qty-input');
        if (select && select.value && qtyInput) {
            const price = parseFloat(select.options[select.selectedIndex].getAttribute('data-price') || 0);
            const qty = parseInt(qtyInput.value) || 0;
            grandTotal += price * qty;
            totalItems += qty;
        }
    });

    document.getElementById('cartTotalItemsCount').textContent = `${totalItems} units across ${rows.length} line(s)`;
    document.getElementById('cartGrandTotal').textContent = formatCurrency(grandTotal);
}

async function handleCreateOrder(e) {
    e.preventDefault();
    const customer_id = document.getElementById('orderCustomerSelect').value;
    const employee_id = document.getElementById('orderEmployeeSelect').value || null;
    const payment_method = document.getElementById('orderPaymentMethodSelect').value;
    const payment_status = document.getElementById('orderPaymentStatusSelect').value;
    const order_status = document.getElementById('orderStatusSelect').value;

    if (!customer_id) {
        showToast('Please select a customer for the sales order.', 'error');
        return;
    }

    const rows = document.querySelectorAll('#lineItemsTableBody tr');
    const items = [];

    for (const row of rows) {
        const select = row.querySelector('.product-select');
        const qtyInput = row.querySelector('.qty-input');

        if (!select || !select.value) {
            showToast('Please select a product for all line item rows, or remove unused rows.', 'error');
            return;
        }

        const product_id = parseInt(select.value);
        const quantity = parseInt(qtyInput.value);
        const availableStock = parseInt(select.options[select.selectedIndex].getAttribute('data-stock') || 0);

        if (quantity > availableStock) {
            showToast('Insufficient stock available.', 'error');
            return;
        }

        items.push({ product_id, quantity });
    }

    if (items.length === 0) {
        showToast('At least one product must be added to the order.', 'error');
        return;
    }

    const payload = {
        customer_id: parseInt(customer_id),
        employee_id: employee_id ? parseInt(employee_id) : null,
        items,
        payment_method,
        payment_status,
        order_status
    };

    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Executing Transaction...';

    try {
        const res = await api.post('/orders', payload);
        showToast(res.message || 'Order created successfully with database transaction committed.', 'success');

        const modalEl = document.getElementById('newOrderModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadOrders();

        // Prompt to view invoice
        if (res.data && res.data.order_id) {
            setTimeout(() => {
                viewOrderInvoice(res.data.order_id);
            }, 500);
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Confirm & Execute Transaction';
    }
}

// ==============================================================
// VIEW ORDER DETAILS MODAL (SQL JOIN)
// ==============================================================
async function viewOrderDetails(orderId) {
    currentViewingOrderId = orderId;
    const modalEl = document.getElementById('orderDetailsModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const body = document.getElementById('orderDetailsModalBody');
    body.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div> Retrieving joined order information...</div>`;

    try {
        const res = await api.get(`/orders/${orderId}`);
        if (!res.success) throw new Error('Order not found');
        const o = res.data;

        document.getElementById('orderDetailsModalTitle').innerHTML = `Sales Order #${o.order_id} <span class="badge-custom badge-${o.order_status.toLowerCase()} ms-2">${o.order_status}</span>`;

        let itemsHtml = o.items.map((item, idx) => `
            <tr>
                <td class="text-muted font-monospace">${idx + 1}</td>
                <td>
                    <b>${escapeHtml(item.brand)} ${escapeHtml(item.model)}</b>
                    <div class="small text-muted font-monospace">Product ID: #${item.product_id}</div>
                </td>
                <td class="fw-semibold">${item.quantity}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td class="fw-bold text-dark">${formatCurrency(item.subtotal)}</td>
            </tr>
        `).join('');

        body.innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <div class="p-3 border rounded bg-light">
                        <h6 class="fw-bold mb-2 text-dark"><i class="bi bi-person me-1"></i> Customer Information (CUSTOMER)</h6>
                        <div class="small mb-1"><span class="text-muted">Name:</span> <b>${escapeHtml(o.customer_name)}</b></div>
                        <div class="small mb-1"><span class="text-muted">Phone:</span> ${escapeHtml(o.customer_phone || '-')}</div>
                        <div class="small"><span class="text-muted">Email:</span> ${escapeHtml(o.customer_email || '-')}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-3 border rounded bg-light">
                        <h6 class="fw-bold mb-2 text-dark"><i class="bi bi-person-badge me-1"></i> Staff Information (EMPLOYEE)</h6>
                        <div class="small mb-1"><span class="text-muted">Assisted By:</span> <b>${escapeHtml(o.employee_name || 'Self-service / Online')}</b></div>
                        <div class="small mb-1"><span class="text-muted">Role:</span> ${escapeHtml(o.employee_role || '-')}</div>
                        <div class="small"><span class="text-muted">Contact:</span> ${escapeHtml(o.employee_phone || '-')}</div>
                    </div>
                </div>
            </div>

            <div class="card border mb-3">
                <div class="card-header bg-white py-2 fw-bold small">
                    <i class="bi bi-list-check me-1 text-success"></i> Ordered Phone Line Items (ORDER_ITEM)
                </div>
                <div class="table-responsive">
                    <table class="table-custom mb-0">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Model</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>
            </div>

            <div class="row g-3 align-items-center">
                <div class="col-md-7">
                    <div class="small text-muted mb-1">
                        <b>Order Placed:</b> ${formatDate(o.order_date)}
                    </div>
                    <div class="small text-muted">
                        <b>Payment Details:</b> ${escapeHtml(o.payment_method)} &bull; <span class="badge-custom badge-${o.payment_status.toLowerCase()}">${o.payment_status}</span>
                    </div>
                </div>
                <div class="col-md-5 text-md-end">
                    <div class="p-3 bg-light border rounded">
                        <small class="text-muted d-block">Grand Total / Invoice Amount</small>
                        <h4 class="fw-bold text-success mb-0">${formatCurrency(o.total_amount)}</h4>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        body.innerHTML = `<div class="text-center py-4 text-danger">${escapeHtml(err.message)}</div>`;
    }
}

// ==============================================================
// TAX INVOICE VIEW (PRINTABLE & DOWNLOADABLE)
// ==============================================================
async function viewOrderInvoice(orderId) {
    try {
        const res = await api.get(`/orders/${orderId}`);
        if (!res.success) return;
        const o = res.data;

        const area = document.getElementById('invoicePrintableArea');

        let itemsRows = o.items.map((item, idx) => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <b>${escapeHtml(item.brand)} ${escapeHtml(item.model)}</b>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unit_price)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(item.subtotal)}</td>
            </tr>
        `).join('');

        area.innerHTML = `
            <div class="invoice-card p-4">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                    <div>
                        <div class="brand-icon mb-2" style="width: 36px; height: 36px; font-size: 1.1rem;">
                            <i class="bi bi-phone"></i>
                        </div>
                        <h4 class="fw-bold mb-0 text-dark">Smart Mobile Store</h4>
                        <p class="text-muted small mb-0">Smart Phone Sales & Solutions Management</p>
                        <span class="badge bg-light text-muted border" style="font-size: 0.7rem;">MCA ADBMS Demonstration</span>
                    </div>
                    <div class="text-end">
                        <h5 class="fw-bold text-success mb-1">TAX INVOICE</h5>
                        <div class="font-monospace small"><b>Invoice #:</b> INV-${o.order_id}</div>
                        <div class="small text-muted"><b>Date:</b> ${formatDate(o.invoice_date || o.order_date)}</div>
                        <span class="badge-custom badge-${o.payment_status.toLowerCase()} mt-1">${o.payment_status}</span>
                    </div>
                </div>

                <!-- Parties Info -->
                <div class="row g-3 mb-4">
                    <div class="col-6">
                        <div class="small text-muted text-uppercase fw-bold mb-1">Billed To (Customer):</div>
                        <h6 class="fw-bold mb-1 text-dark">${escapeHtml(o.customer_name)}</h6>
                        <div class="small text-muted">Phone: ${escapeHtml(o.customer_phone || '-')}</div>
                        <div class="small text-muted">Email: ${escapeHtml(o.customer_email || '-')}</div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="small text-muted text-uppercase fw-bold mb-1">Sales Attendant:</div>
                        <h6 class="fw-bold mb-1 text-dark">${escapeHtml(o.employee_name || 'Counter Associate')}</h6>
                        <div class="small text-muted">Role: ${escapeHtml(o.employee_role || 'Staff')}</div>
                        <div class="small text-muted">Order ID: #${o.order_id}</div>
                    </div>
                </div>

                <!-- Products Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 0.8rem; text-transform: uppercase;">
                            <th style="padding: 8px; text-align: left;">#</th>
                            <th style="padding: 8px; text-align: left;">Item Description</th>
                            <th style="padding: 8px; text-align: center;">Qty</th>
                            <th style="padding: 8px; text-align: right;">Unit Price</th>
                            <th style="padding: 8px; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <!-- Summary Section -->
                <div class="row g-3 pt-2">
                    <div class="col-6">
                        <div class="p-3 bg-light rounded border">
                            <div class="small"><b>Payment Method:</b> ${escapeHtml(o.payment_method)}</div>
                            <div class="small"><b>Payment Status:</b> ${escapeHtml(o.payment_status)}</div>
                            <div class="small text-muted mt-1">Stored natively in SALES_ORDER table</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="p-3 bg-light rounded border text-end">
                            <div class="small text-muted">Total Invoice Amount:</div>
                            <h3 class="fw-bold text-success mb-0">${formatCurrency(o.invoice_amount || o.total_amount)}</h3>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="border-top pt-3 mt-4 text-center text-muted small">
                    Thank you for shopping with Smart Mobile Store! This is a computerized invoice from the ADBMS course project.
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
        modal.show();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ==============================================================
// UPDATE STATUS MODAL & ORDER CANCELLATION
// ==============================================================
function openUpdateStatusModal(orderId, currentOrderStatus, currentPaymentStatus) {
    document.getElementById('updateStatusOrderId').value = orderId;
    document.getElementById('updateStatusTitle').textContent = `Update Status: Order #${orderId}`;
    document.getElementById('editOrderStatusSelect').value = currentOrderStatus;
    document.getElementById('editPaymentStatusSelect').value = currentPaymentStatus;

    const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
    modal.show();
}

async function handleUpdateStatusSubmit(e) {
    e.preventDefault();
    const orderId = document.getElementById('updateStatusOrderId').value;
    const order_status = document.getElementById('editOrderStatusSelect').value;
    const payment_status = document.getElementById('editPaymentStatusSelect').value;

    try {
        const res = await api.put(`/orders/${orderId}/status`, { order_status, payment_status });
        showToast(res.message || 'Status updated.', 'success');

        const modalEl = document.getElementById('updateStatusModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadOrders();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function cancelOrderPrompt(orderId) {
    if (!confirm(`Are you sure you want to cancel Order #${orderId}? This will automatically RESTORE the reserved stock back to the PRODUCT inventory in a database transaction.`)) {
        return;
    }

    try {
        const res = await api.post(`/orders/${orderId}/cancel`, {});
        showToast(res.message || 'Order cancelled and stock restored.', 'success');
        await loadOrders();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

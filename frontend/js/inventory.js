// Inventory Module Frontend Controller

let currentFilter = 'all';
let allInventoryItems = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadInventorySummary();
    await loadInventoryList();

    document.getElementById('invSearchInput').addEventListener('input', debounce(loadInventoryList, 250));
    document.getElementById('restockForm').addEventListener('submit', handleRestockSubmit);
});

async function loadInventorySummary() {
    try {
        const res = await api.get('/inventory/summary');
        if (res.success && res.data) {
            const d = res.data;
            document.getElementById('invTotalProducts').textContent = d.total_products || 0;
            document.getElementById('invTotalUnits').textContent = `${d.total_units_available || 0} Units`;
            document.getElementById('invLowStock').textContent = d.low_stock_count || 0;
            document.getElementById('invOutOfStock').textContent = d.out_of_stock_count || 0;
        }
    } catch (err) {
        console.error('Failed to load inventory summary:', err);
    }
}

async function loadInventoryList() {
    const search = document.getElementById('invSearchInput').value.trim();
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div> Loading warehouse stock levels...</td></tr>`;

    try {
        const res = await api.get('/inventory', { filter: currentFilter, search });
        if (res.success) {
            allInventoryItems = res.data;
            document.getElementById('invTableCount').textContent = res.count;
            renderInventoryTable(allInventoryItems);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load inventory: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderInventoryTable(items) {
    const tbody = document.getElementById('inventoryTableBody');
    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <div class="empty-state p-0">
                        <i class="bi bi-box-seam empty-state-icon"></i>
                        <h6 class="empty-state-title">No stock items found</h6>
                        <p class="empty-state-text">No phones match the chosen stock category or search.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(p => {
        let badgeClass = 'badge-instock';
        let badgeText = 'IN STOCK';
        let badgeIcon = 'bi-check-circle-fill';

        if (p.quantity_available === 0) {
            badgeClass = 'badge-outofstock';
            badgeText = 'OUT OF STOCK';
            badgeIcon = 'bi-x-circle-fill';
        } else if (p.quantity_available <= p.reorder_level) {
            badgeClass = 'badge-lowstock';
            badgeText = 'LOW STOCK';
            badgeIcon = 'bi-exclamation-triangle-fill';
        }

        return `
            <tr>
                <td class="fw-bold font-monospace">#${p.product_id}</td>
                <td class="fw-semibold text-dark">${escapeHtml(p.brand)}</td>
                <td>${escapeHtml(p.model)}</td>
                <td>${formatCurrency(p.price)}</td>
                <td class="fw-bold ${p.quantity_available === 0 ? 'text-danger' : (p.quantity_available <= p.reorder_level ? 'text-warning' : 'text-dark')}">
                    ${p.quantity_available} Units
                </td>
                <td class="text-muted small">${p.reorder_level} Units</td>
                <td><span class="badge bg-light text-primary border">${p.total_sold} sold</span></td>
                <td>
                    <span class="badge-custom ${badgeClass}">
                        <i class="bi ${badgeIcon}"></i> ${badgeText}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-outline-custom btn-sm py-1" onclick="openQuickRestock(${p.product_id}, '${escapeHtml(p.brand)} ${escapeHtml(p.model)}')">
                        <i class="bi bi-plus-lg me-1"></i> Restock
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function setFilter(buttonEl, filter) {
    document.querySelectorAll('.filter-bar button, .btn-group button').forEach(b => b.classList.remove('active'));
    buttonEl.classList.add('active');
    currentFilter = filter;
    loadInventoryList();
}

function prepareRestockModal() {
    const select = document.getElementById('restockProductSelect');
    select.innerHTML = '';
    allInventoryItems.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.product_id;
        opt.textContent = `${p.brand} ${p.model} (Current Stock: ${p.quantity_available})`;
        select.appendChild(opt);
    });
    document.getElementById('restockQtyInput').value = '10';
}

function openQuickRestock(productId, modelName) {
    prepareRestockModal();
    document.getElementById('restockProductSelect').value = productId;
    const modal = new bootstrap.Modal(document.getElementById('restockModal'));
    modal.show();
}

async function handleRestockSubmit(e) {
    e.preventDefault();
    const product_id = parseInt(document.getElementById('restockProductSelect').value);
    const additional_quantity = parseInt(document.getElementById('restockQtyInput').value);

    if (isNaN(additional_quantity) || additional_quantity <= 0) {
        showToast('Please enter a positive restock quantity.', 'error');
        return;
    }

    const btn = document.getElementById('submitRestockBtn');
    btn.disabled = true;

    try {
        const res = await api.post('/inventory/restock', { product_id, additional_quantity });
        showToast(res.message || 'Inventory replenished successfully.', 'success');

        const modalEl = document.getElementById('restockModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadInventorySummary();
        await loadInventoryList();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

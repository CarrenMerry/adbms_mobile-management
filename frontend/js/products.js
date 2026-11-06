// Products Module Frontend Controller

let allProducts = [];
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadBrands();
    await loadProducts();

    // Event listeners
    document.getElementById('productSearchInput').addEventListener('input', debounce(loadProducts, 250));
    document.getElementById('brandFilterSelect').addEventListener('change', loadProducts);
    document.getElementById('sortFilterSelect').addEventListener('change', loadProducts);
    document.getElementById('productForm').addEventListener('submit', handleSaveProduct);
    document.getElementById('confirmDeleteProductBtn').addEventListener('click', handleConfirmDelete);
});

async function loadBrands() {
    try {
        const res = await api.get('/products/brands');
        if (res.success && res.data) {
            const select = document.getElementById('brandFilterSelect');
            select.innerHTML = '<option value="all">All Brands</option>';
            res.data.forEach(brand => {
                const opt = document.createElement('option');
                opt.value = brand;
                opt.textContent = brand;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Failed to load brands:', err);
    }
}

async function loadProducts() {
    const search = document.getElementById('productSearchInput').value.trim();
    const brand = document.getElementById('brandFilterSelect').value;
    const sort = document.getElementById('sortFilterSelect').value;

    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div> Loading products...</td></tr>`;

    try {
        const res = await api.get('/products', { search, brand, sort });
        if (res.success) {
            allProducts = res.data;
            document.getElementById('productCountBadge').textContent = res.count;
            renderProductsTable(allProducts);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load products: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="empty-state p-0">
                        <i class="bi bi-phone empty-state-icon"></i>
                        <h6 class="empty-state-title">No products found</h6>
                        <p class="empty-state-text">Try adjusting your search terms or filter criteria.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(p => {
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
                <td class="fw-bold">${formatCurrency(p.price)}</td>
                <td class="fw-semibold ${p.quantity_available === 0 ? 'text-danger' : (p.quantity_available <= p.reorder_level ? 'text-warning' : 'text-dark')}">
                    ${p.quantity_available} units
                </td>
                <td class="text-muted small">${p.reorder_level} units</td>
                <td>
                    <span class="badge-custom ${badgeClass}">
                        <i class="bi ${badgeIcon}"></i> ${badgeText}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-custom btn-icon-sm" title="View Details" onclick="viewProductDetails(${p.product_id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-custom btn-icon-sm" title="Edit Product" onclick="openEditProductModal(${p.product_id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-custom btn-icon-sm text-danger" title="Delete Product" onclick="promptDeleteProduct(${p.product_id}, '${escapeHtml(p.brand)} ${escapeHtml(p.model)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add New Mobile Phone';
    document.getElementById('productIdInput').value = '';
    document.getElementById('brandInput').value = '';
    document.getElementById('modelInput').value = '';
    document.getElementById('priceInput').value = '';
    document.getElementById('stockInput').value = '10';
    document.getElementById('reorderInput').value = '5';
}

function openEditProductModal(productId) {
    const product = allProducts.find(p => p.product_id === productId);
    if (!product) return;

    document.getElementById('productModalTitle').textContent = 'Edit Mobile Phone #' + productId;
    document.getElementById('productIdInput').value = product.product_id;
    document.getElementById('brandInput').value = product.brand;
    document.getElementById('modelInput').value = product.model;
    document.getElementById('priceInput').value = product.price;
    document.getElementById('stockInput').value = product.quantity_available;
    document.getElementById('reorderInput').value = product.reorder_level;

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('productIdInput').value;
    const brand = document.getElementById('brandInput').value.trim();
    const model = document.getElementById('modelInput').value.trim();
    const price = parseFloat(document.getElementById('priceInput').value);
    const quantity_available = parseInt(document.getElementById('stockInput').value);
    const reorder_level = parseInt(document.getElementById('reorderInput').value);

    // Validation
    if (!brand || !model) {
        showToast('Brand and model fields are required.', 'error');
        return;
    }
    if (isNaN(price) || price < 0) {
        showToast('Price cannot be negative.', 'error');
        return;
    }
    if (isNaN(quantity_available) || quantity_available < 0) {
        showToast('Available quantity cannot be negative.', 'error');
        return;
    }
    if (isNaN(reorder_level) || reorder_level < 0) {
        showToast('Reorder level cannot be negative.', 'error');
        return;
    }

    const payload = { brand, model, price, quantity_available, reorder_level };
    const saveBtn = document.getElementById('saveProductBtn');
    saveBtn.disabled = true;

    try {
        if (id) {
            // Update
            const res = await api.put(`/products/${id}`, payload);
            showToast(res.message || 'Product updated successfully.', 'success');
        } else {
            // Create
            const res = await api.post('/products', payload);
            showToast(res.message || 'Product added successfully.', 'success');
        }

        const modalEl = document.getElementById('productModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadBrands();
        await loadProducts();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        saveBtn.disabled = false;
    }
}

async function viewProductDetails(productId) {
    try {
        const res = await api.get(`/products/${productId}`);
        if (!res.success) return;
        const p = res.data;

        const content = document.getElementById('productDetailsContent');
        content.innerHTML = `
            <div class="p-3 bg-light rounded-3 mb-3 border">
                <span class="badge bg-secondary mb-1">ID: #${p.product_id}</span>
                <h5 class="fw-bold text-dark mb-1">${escapeHtml(p.brand)} ${escapeHtml(p.model)}</h5>
                <h4 class="fw-bold text-success mb-0">${formatCurrency(p.price)}</h4>
            </div>
            <div class="row g-2 mb-3">
                <div class="col-6">
                    <div class="p-2 border rounded">
                        <small class="text-muted d-block">Available Stock</small>
                        <span class="fw-bold fs-6">${p.quantity_available} Units</span>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-2 border rounded">
                        <small class="text-muted d-block">Reorder Trigger</small>
                        <span class="fw-bold fs-6">${p.reorder_level} Units</span>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-2 border rounded">
                        <small class="text-muted d-block">Lifetime Units Sold</small>
                        <span class="fw-bold fs-6 text-primary">${p.total_units_sold} Units</span>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-2 border rounded">
                        <small class="text-muted d-block">Orders Included In</small>
                        <span class="fw-bold fs-6">${p.orders_count} Orders</span>
                    </div>
                </div>
            </div>
            <div class="small text-muted font-monospace">
                Catalog Added: ${formatDate(p.created_at)}
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('productDetailsModal'));
        modal.show();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function promptDeleteProduct(productId, name) {
    deleteTargetId = productId;
    document.getElementById('deleteProductModelText').textContent = `#${productId} - ${name}`;
    const modal = new bootstrap.Modal(document.getElementById('deleteProductModal'));
    modal.show();
}

async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    const btn = document.getElementById('confirmDeleteProductBtn');
    btn.disabled = true;

    try {
        const res = await api.delete(`/products/${deleteTargetId}`);
        showToast(res.message || 'Product deleted successfully.', 'success');

        const modalEl = document.getElementById('deleteProductModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadProducts();
        await loadBrands();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        deleteTargetId = null;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

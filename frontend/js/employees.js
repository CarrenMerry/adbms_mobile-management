// Employees Module Frontend Controller

let allEmployees = [];
let deleteTargetEmpId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadEmployees();

    document.getElementById('employeeSearchInput').addEventListener('input', debounce(loadEmployees, 250));
    document.getElementById('employeeForm').addEventListener('submit', handleSaveEmployee);
    document.getElementById('confirmDeleteEmployeeBtn').addEventListener('click', handleConfirmDeleteEmployee);
});

async function loadEmployees() {
    const search = document.getElementById('employeeSearchInput').value.trim();
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div> Loading staff directory...</td></tr>`;

    try {
        const res = await api.get('/employees', { search });
        if (res.success) {
            allEmployees = res.data;
            document.getElementById('employeeCountBadge').textContent = res.count;
            renderEmployeesTable(allEmployees);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load employees: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderEmployeesTable(employees) {
    const tbody = document.getElementById('employeesTableBody');
    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="empty-state p-0">
                        <i class="bi bi-person-badge empty-state-icon"></i>
                        <h6 class="empty-state-title">No employees found</h6>
                        <p class="empty-state-text">No staff member matches your search filter.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(e => `
        <tr>
            <td class="fw-bold font-monospace">#${e.employee_id}</td>
            <td class="fw-semibold text-dark">${escapeHtml(e.employee_name)}</td>
            <td><span class="badge bg-light text-primary border">${escapeHtml(e.role || 'Staff')}</span></td>
            <td>${escapeHtml(e.phone || '-')}</td>
            <td>
                <span class="badge bg-light text-dark border px-2 py-1">
                    <i class="bi bi-receipt me-1"></i> ${e.orders_processed} order${e.orders_processed == 1 ? '' : 's'}
                </span>
            </td>
            <td class="fw-bold text-success">${formatCurrency(e.sales_generated)}</td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-custom btn-icon-sm" title="Edit Employee" onclick="openEditEmployeeModal(${e.employee_id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-custom btn-icon-sm text-danger" title="Delete Employee" onclick="promptDeleteEmployee(${e.employee_id}, '${escapeHtml(e.employee_name)}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddEmployeeModal() {
    document.getElementById('employeeModalTitle').textContent = 'Add Store Employee';
    document.getElementById('employeeIdInput').value = '';
    document.getElementById('employeeNameInput').value = '';
    document.getElementById('employeeRoleInput').value = 'Senior Sales Consultant';
    document.getElementById('employeePhoneInput').value = '';
}

function openEditEmployeeModal(empId) {
    const emp = allEmployees.find(e => e.employee_id === empId);
    if (!emp) return;

    document.getElementById('employeeModalTitle').textContent = 'Edit Employee #' + empId;
    document.getElementById('employeeIdInput').value = emp.employee_id;
    document.getElementById('employeeNameInput').value = emp.employee_name;
    document.getElementById('employeeRoleInput').value = emp.role || 'Sales Associate';
    document.getElementById('employeePhoneInput').value = emp.phone || '';

    const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
    modal.show();
}

async function handleSaveEmployee(e) {
    e.preventDefault();
    const id = document.getElementById('employeeIdInput').value;
    const employee_name = document.getElementById('employeeNameInput').value.trim();
    const role = document.getElementById('employeeRoleInput').value.trim();
    const phone = document.getElementById('employeePhoneInput').value.trim();

    if (!employee_name) {
        showToast('Employee name is required.', 'error');
        return;
    }

    const payload = { employee_name, role, phone };
    const btn = document.getElementById('saveEmployeeBtn');
    btn.disabled = true;

    try {
        if (id) {
            const res = await api.put(`/employees/${id}`, payload);
            showToast(res.message || 'Employee updated successfully.', 'success');
        } else {
            const res = await api.post('/employees', payload);
            showToast(res.message || 'Employee added successfully.', 'success');
        }

        const modalEl = document.getElementById('employeeModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadEmployees();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function promptDeleteEmployee(empId, name) {
    deleteTargetEmpId = empId;
    document.getElementById('deleteEmployeeText').textContent = `#${empId} - ${name}`;
    const modal = new bootstrap.Modal(document.getElementById('deleteEmployeeModal'));
    modal.show();
}

async function handleConfirmDeleteEmployee() {
    if (!deleteTargetEmpId) return;
    const btn = document.getElementById('confirmDeleteEmployeeBtn');
    btn.disabled = true;

    try {
        const res = await api.delete(`/employees/${deleteTargetEmpId}`);
        showToast(res.message || 'Employee removed successfully.', 'success');

        const modalEl = document.getElementById('deleteEmployeeModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        await loadEmployees();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        deleteTargetEmpId = null;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

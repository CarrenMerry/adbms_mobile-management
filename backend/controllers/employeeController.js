const db = require('../db');

// GET /api/employees
// Supports ?search=...
exports.getAllEmployees = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                e.employee_id,
                e.employee_name,
                e.role,
                e.phone,
                e.created_at,
                COUNT(o.order_id) AS orders_processed,
                COALESCE(SUM(o.total_amount), 0.00) AS sales_generated
            FROM EMPLOYEE e
            LEFT JOIN SALES_ORDER o ON e.employee_id = o.employee_id
            WHERE 1=1
        `;
        const params = [];

        if (search && search.trim() !== '') {
            query += ` AND (e.employee_name LIKE ? OR e.role LIKE ? OR e.phone LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        query += ` GROUP BY e.employee_id, e.employee_name, e.role, e.phone, e.created_at ORDER BY e.employee_id ASC`;

        const employees = await db.query(query, params);
        res.json({ success: true, count: employees.length, data: employees });
    } catch (err) {
        next(err);
    }
};

// GET /api/employees/:id
exports.getEmployeeById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const rows = await db.query(`
            SELECT 
                e.employee_id,
                e.employee_name,
                e.role,
                e.phone,
                e.created_at,
                COUNT(o.order_id) AS orders_processed,
                COALESCE(SUM(o.total_amount), 0.00) AS sales_generated
            FROM EMPLOYEE e
            LEFT JOIN SALES_ORDER o ON e.employee_id = o.employee_id
            WHERE e.employee_id = ?
            GROUP BY e.employee_id, e.employee_name, e.role, e.phone, e.created_at
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found.' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/employees
exports.createEmployee = async (req, res, next) => {
    try {
        const { employee_name, role, phone } = req.body;

        if (!employee_name || !employee_name.trim()) {
            return res.status(400).json({ success: false, error: 'Employee name is required.' });
        }

        const cleanRole = role && role.trim() ? role.trim() : 'Sales Associate';
        const cleanPhone = phone && phone.trim() ? phone.trim() : null;

        const result = await db.query(
            `INSERT INTO EMPLOYEE (employee_name, role, phone) VALUES (?, ?, ?)`,
            [employee_name.trim(), cleanRole, cleanPhone]
        );

        res.status(201).json({
            success: true,
            message: 'Employee added successfully.',
            data: { employee_id: result.insertId, employee_name: employee_name.trim(), role: cleanRole, phone: cleanPhone }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { employee_name, role, phone } = req.body;

        if (!employee_name || !employee_name.trim()) {
            return res.status(400).json({ success: false, error: 'Employee name is required.' });
        }

        const cleanRole = role && role.trim() ? role.trim() : 'Sales Associate';
        const cleanPhone = phone && phone.trim() ? phone.trim() : null;

        const result = await db.query(
            `UPDATE EMPLOYEE SET employee_name = ?, role = ?, phone = ? WHERE employee_id = ?`,
            [employee_name.trim(), cleanRole, cleanPhone, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found.' });
        }

        res.json({
            success: true,
            message: 'Employee updated successfully.',
            data: { employee_id: id, employee_name: employee_name.trim(), role: cleanRole, phone: cleanPhone }
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        const result = await db.query('DELETE FROM EMPLOYEE WHERE employee_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found.' });
        }

        res.json({ success: true, message: 'Employee deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

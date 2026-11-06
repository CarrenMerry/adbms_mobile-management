const db = require('../db');

// GET /api/customers
// Supports ?search=...
exports.getAllCustomers = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                c.customer_id,
                c.customer_name,
                c.phone,
                c.email,
                c.created_at,
                COUNT(o.order_id) AS total_orders,
                COALESCE(SUM(o.total_amount), 0.00) AS total_spent
            FROM CUSTOMER c
            LEFT JOIN SALES_ORDER o ON c.customer_id = o.customer_id
            WHERE 1=1
        `;
        const params = [];

        if (search && search.trim() !== '') {
            query += ` AND (c.customer_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        query += ` GROUP BY c.customer_id, c.customer_name, c.phone, c.email, c.created_at ORDER BY c.customer_id DESC`;

        const customers = await db.query(query, params);
        res.json({ success: true, count: customers.length, data: customers });
    } catch (err) {
        next(err);
    }
};

// GET /api/customers/:id
exports.getCustomerById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const rows = await db.query(`
            SELECT 
                c.customer_id,
                c.customer_name,
                c.phone,
                c.email,
                c.created_at,
                COUNT(o.order_id) AS total_orders,
                COALESCE(SUM(o.total_amount), 0.00) AS total_spent
            FROM CUSTOMER c
            LEFT JOIN SALES_ORDER o ON c.customer_id = o.customer_id
            WHERE c.customer_id = ?
            GROUP BY c.customer_id, c.customer_name, c.phone, c.email, c.created_at
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found.' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/customers/:id/orders - SQL JOIN Demonstration
exports.getCustomerOrders = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const query = `
            SELECT 
                o.order_id,
                o.order_date,
                o.order_status,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.invoice_date,
                o.invoice_amount,
                e.employee_name,
                COUNT(oi.order_item_id) AS items_count
            FROM SALES_ORDER o
            LEFT JOIN EMPLOYEE e ON o.employee_id = e.employee_id
            LEFT JOIN ORDER_ITEM oi ON o.order_id = oi.order_id
            WHERE o.customer_id = ?
            GROUP BY o.order_id, o.order_date, o.order_status, o.total_amount, o.payment_method, o.payment_status, o.invoice_date, o.invoice_amount, e.employee_name
            ORDER BY o.order_date DESC
        `;
        const orders = await db.query(query, [id]);
        res.json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        next(err);
    }
};

// POST /api/customers
exports.createCustomer = async (req, res, next) => {
    try {
        const { customer_name, phone, email } = req.body;

        if (!customer_name || !customer_name.trim()) {
            return res.status(400).json({ success: false, error: 'Customer name is required.' });
        }

        // Email format check if provided
        const cleanEmail = email && email.trim() ? email.trim() : null;
        const cleanPhone = phone && phone.trim() ? phone.trim() : null;

        const result = await db.query(
            `INSERT INTO CUSTOMER (customer_name, phone, email) VALUES (?, ?, ?)`,
            [customer_name.trim(), cleanPhone, cleanEmail]
        );

        res.status(201).json({
            success: true,
            message: 'Customer added successfully.',
            data: { customer_id: result.insertId, customer_name: customer_name.trim(), phone: cleanPhone, email: cleanEmail }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/customers/:id
exports.updateCustomer = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { customer_name, phone, email } = req.body;

        if (!customer_name || !customer_name.trim()) {
            return res.status(400).json({ success: false, error: 'Customer name is required.' });
        }

        const cleanEmail = email && email.trim() ? email.trim() : null;
        const cleanPhone = phone && phone.trim() ? phone.trim() : null;

        const result = await db.query(
            `UPDATE CUSTOMER SET customer_name = ?, phone = ?, email = ? WHERE customer_id = ?`,
            [customer_name.trim(), cleanPhone, cleanEmail, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found.' });
        }

        res.json({
            success: true,
            message: 'Customer updated successfully.',
            data: { customer_id: id, customer_name: customer_name.trim(), phone: cleanPhone, email: cleanEmail }
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/customers/:id
exports.deleteCustomer = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        const orders = await db.query('SELECT COUNT(*) AS count FROM SALES_ORDER WHERE customer_id = ?', [id]);
        if (orders[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete customer because they have ${orders[0].count} registered order(s). Database integrity restriction active.`
            });
        }

        const result = await db.query('DELETE FROM CUSTOMER WHERE customer_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found.' });
        }

        res.json({ success: true, message: 'Customer deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

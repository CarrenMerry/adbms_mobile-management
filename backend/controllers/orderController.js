const db = require('../db');

// GET /api/orders
// Supports ?status=...&payment_status=...&customer_id=...&search=...&date=...
exports.getAllOrders = async (req, res, next) => {
    try {
        const { status, payment_status, customer_id, search, date } = req.query;
        let query = `
            SELECT 
                o.order_id,
                o.order_date,
                o.order_status,
                o.total_amount,
                o.payment_method,
                o.payment_amount,
                o.payment_status,
                o.invoice_date,
                o.invoice_amount,
                c.customer_id,
                c.customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                e.employee_id,
                e.employee_name,
                (SELECT COUNT(*) FROM ORDER_ITEM oi WHERE oi.order_id = o.order_id) AS total_items_count,
                (SELECT SUM(quantity) FROM ORDER_ITEM oi WHERE oi.order_id = o.order_id) AS total_units_count
            FROM SALES_ORDER o
            INNER JOIN CUSTOMER c ON o.customer_id = c.customer_id
            LEFT JOIN EMPLOYEE e ON o.employee_id = e.employee_id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ` AND o.order_status = ?`;
            params.push(status);
        }

        if (payment_status && payment_status !== 'all') {
            query += ` AND o.payment_status = ?`;
            params.push(payment_status);
        }

        if (customer_id && customer_id !== 'all') {
            query += ` AND o.customer_id = ?`;
            params.push(parseInt(customer_id));
        }

        if (date) {
            query += ` AND DATE(o.order_date) = ?`;
            params.push(date);
        }

        if (search && search.trim() !== '') {
            query += ` AND (c.customer_name LIKE ? OR o.order_id LIKE ? OR e.employee_name LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        query += ` ORDER BY o.order_id DESC`;

        const orders = await db.query(query, params);
        res.json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        next(err);
    }
};

// GET /api/orders/:id
// Retrieves full order header + customer + employee + all line items (ORDER_ITEM joined with PRODUCT)
exports.getOrderById = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);

        const headerRows = await db.query(`
            SELECT 
                o.order_id,
                o.order_date,
                o.order_status,
                o.total_amount,
                o.payment_method,
                o.payment_amount,
                o.payment_status,
                o.invoice_date,
                o.invoice_amount,
                c.customer_id,
                c.customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                e.employee_id,
                e.employee_name,
                e.role AS employee_role,
                e.phone AS employee_phone
            FROM SALES_ORDER o
            INNER JOIN CUSTOMER c ON o.customer_id = c.customer_id
            LEFT JOIN EMPLOYEE e ON o.employee_id = e.employee_id
            WHERE o.order_id = ?
        `, [orderId]);

        if (headerRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }

        const itemsRows = await db.query(`
            SELECT 
                oi.order_item_id,
                oi.order_id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                oi.subtotal,
                p.brand,
                p.model,
                p.quantity_available AS current_stock
            FROM ORDER_ITEM oi
            INNER JOIN PRODUCT p ON oi.product_id = p.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.order_item_id ASC
        `, [orderId]);

        const order = {
            ...headerRows[0],
            items: itemsRows
        };

        res.json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};

// POST /api/orders
// TRANSACTION HANDLING:
// 1. Start transaction
// 2. Verify product stock for each line item (Row Lock FOR UPDATE)
// 3. Create SALES_ORDER
// 4. Create ORDER_ITEM records
// 5. Update PRODUCT stock (decrement quantity_available)
// 6. Commit transaction
// If error: ROLLBACK
exports.createOrder = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        const {
            customer_id,
            employee_id,
            items,
            payment_method,
            payment_status,
            order_status
        } = req.body;

        // 1. Validation
        if (!customer_id) {
            return res.status(400).json({ success: false, error: 'Customer selection is required.' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one product item must be added to the order.' });
        }

        await conn.beginTransaction();

        // Check customer exists
        const [customerRows] = await conn.query('SELECT customer_id, customer_name FROM CUSTOMER WHERE customer_id = ?', [customer_id]);
        if (customerRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Customer not found.' });
        }

        // Verify and calculate each line item
        let calculatedTotal = 0;
        const verifiedItems = [];

        for (const rawItem of items) {
            const prodId = parseInt(rawItem.product_id);
            const reqQty = parseInt(rawItem.quantity);

            if (isNaN(prodId) || isNaN(reqQty) || reqQty <= 0) {
                await conn.rollback();
                return res.status(400).json({ success: false, error: 'Invalid product or quantity specified in order items.' });
            }

            // Lock product row to prevent race conditions during checkout
            const [prodRows] = await conn.query(
                'SELECT product_id, brand, model, price, quantity_available FROM PRODUCT WHERE product_id = ? FOR UPDATE',
                [prodId]
            );

            if (prodRows.length === 0) {
                await conn.rollback();
                return res.status(404).json({ success: false, error: `Product ID #${prodId} does not exist.` });
            }

            const product = prodRows[0];

            // Verify stock availability
            if (product.quantity_available < reqQty) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: `Insufficient stock available for ${product.brand} ${product.model}. (Available Stock: ${product.quantity_available}, Requested: ${reqQty})`
                });
            }

            const unitPrice = parseFloat(product.price);
            const subtotal = parseFloat((unitPrice * reqQty).toFixed(2));
            calculatedTotal += subtotal;

            verifiedItems.push({
                product_id: product.product_id,
                brand: product.brand,
                model: product.model,
                quantity: reqQty,
                unit_price: unitPrice,
                subtotal: subtotal
            });
        }

        calculatedTotal = parseFloat(calculatedTotal.toFixed(2));
        const finalOrderStatus = order_status || 'Confirmed';
        const finalPaymentMethod = payment_method || 'UPI';
        const finalPaymentStatus = payment_status || 'Paid';
        const paymentAmount = (finalPaymentStatus === 'Paid') ? calculatedTotal : 0.00;
        const invoiceAmount = calculatedTotal;
        const now = new Date();

        // 3. Create SALES_ORDER
        const [orderResult] = await conn.query(`
            INSERT INTO SALES_ORDER 
            (customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            customer_id,
            employee_id || null,
            now,
            finalOrderStatus,
            calculatedTotal,
            finalPaymentMethod,
            paymentAmount,
            finalPaymentStatus,
            now,
            invoiceAmount
        ]);

        const newOrderId = orderResult.insertId;

        // 4. Create ORDER_ITEM records & 5. Update PRODUCT stock
        for (const item of verifiedItems) {
            await conn.query(`
                INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?)
            `, [newOrderId, item.product_id, item.quantity, item.unit_price, item.subtotal]);

            await conn.query(`
                UPDATE PRODUCT 
                SET quantity_available = quantity_available - ? 
                WHERE product_id = ?
            `, [item.quantity, item.product_id]);
        }

        // 6. Commit transaction
        await conn.commit();

        res.status(201).json({
            success: true,
            message: 'Order created successfully with database transaction committed.',
            data: {
                order_id: newOrderId,
                total_amount: calculatedTotal,
                invoice_amount: invoiceAmount,
                items_count: verifiedItems.length
            }
        });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        const { order_status, payment_status } = req.body;

        const updates = [];
        const params = [];

        if (order_status) {
            updates.push('order_status = ?');
            params.push(order_status);
        }

        if (payment_status) {
            updates.push('payment_status = ?');
            params.push(payment_status);
            if (payment_status === 'Paid') {
                updates.push('payment_amount = total_amount');
            } else if (payment_status === 'Refunded' || payment_status === 'Failed') {
                updates.push('payment_amount = 0.00');
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update provided.' });
        }

        params.push(orderId);
        const result = await db.query(`UPDATE SALES_ORDER SET ${updates.join(', ')} WHERE order_id = ?`, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }

        res.json({ success: true, message: 'Order status updated successfully.' });
    } catch (err) {
        next(err);
    }
};

// POST /api/orders/:id/cancel
// Uses transaction to cancel order and restore inventory back to PRODUCT
exports.cancelOrder = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        const orderId = parseInt(req.params.id);
        await conn.beginTransaction();

        const [orderRows] = await conn.query('SELECT order_id, order_status FROM SALES_ORDER WHERE order_id = ? FOR UPDATE', [orderId]);
        if (orderRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }

        if (orderRows[0].order_status === 'Cancelled') {
            await conn.rollback();
            return res.status(400).json({ success: false, error: 'This order is already cancelled.' });
        }

        // Fetch items to restore stock
        const [items] = await conn.query('SELECT product_id, quantity FROM ORDER_ITEM WHERE order_id = ?', [orderId]);
        for (const item of items) {
            await conn.query('UPDATE PRODUCT SET quantity_available = quantity_available + ? WHERE product_id = ?', [item.quantity, item.product_id]);
        }

        // Update order status to Cancelled and payment status to Refunded/Cancelled
        await conn.query("UPDATE SALES_ORDER SET order_status = 'Cancelled', payment_status = 'Refunded' WHERE order_id = ?", [orderId]);

        await conn.commit();
        res.json({ success: true, message: 'Order cancelled successfully and product inventory has been restored.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// GET /api/order-items
// Lists order items joined with SALES_ORDER and PRODUCT
exports.getAllOrderItems = async (req, res, next) => {
    try {
        const items = await db.query(`
            SELECT 
                oi.order_item_id,
                oi.order_id,
                oi.product_id,
                p.brand,
                p.model,
                oi.quantity,
                oi.unit_price,
                oi.subtotal,
                o.order_date,
                c.customer_name
            FROM ORDER_ITEM oi
            INNER JOIN PRODUCT p ON oi.product_id = p.product_id
            INNER JOIN SALES_ORDER o ON oi.order_id = o.order_id
            INNER JOIN CUSTOMER c ON o.customer_id = c.customer_id
            ORDER BY oi.order_item_id DESC
            LIMIT 100
        `);
        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        next(err);
    }
};

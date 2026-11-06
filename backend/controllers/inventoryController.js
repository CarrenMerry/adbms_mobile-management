const db = require('../db');

// GET /api/inventory/summary
exports.getInventorySummary = async (req, res, next) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) AS total_products,
                COALESCE(SUM(quantity_available), 0) AS total_units_available,
                COALESCE(SUM(CASE WHEN quantity_available > 0 AND quantity_available <= reorder_level THEN 1 ELSE 0 END), 0) AS low_stock_count,
                COALESCE(SUM(CASE WHEN quantity_available = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
                COALESCE(SUM(CASE WHEN quantity_available > reorder_level THEN 1 ELSE 0 END), 0) AS in_stock_count
            FROM PRODUCT
        `);
        res.json({ success: true, data: stats[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/inventory
// Supports ?filter=all|in_stock|low_stock|out_of_stock&search=...
exports.getInventoryList = async (req, res, next) => {
    try {
        const { filter, search } = req.query;
        let query = `
            SELECT 
                product_id,
                brand,
                model,
                price,
                quantity_available,
                reorder_level,
                CASE 
                    WHEN quantity_available = 0 THEN 'OUT OF STOCK'
                    WHEN quantity_available <= reorder_level THEN 'LOW STOCK'
                    ELSE 'IN STOCK'
                END AS stock_status,
                (SELECT COALESCE(SUM(quantity), 0) FROM ORDER_ITEM WHERE product_id = PRODUCT.product_id) AS total_sold
            FROM PRODUCT
            WHERE 1=1
        `;
        const params = [];

        if (filter === 'in_stock') {
            query += ` AND quantity_available > reorder_level`;
        } else if (filter === 'low_stock') {
            query += ` AND quantity_available > 0 AND quantity_available <= reorder_level`;
        } else if (filter === 'out_of_stock') {
            query += ` AND quantity_available = 0`;
        }

        if (search && search.trim() !== '') {
            query += ` AND (brand LIKE ? OR model LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }

        query += ` ORDER BY quantity_available ASC, product_id ASC`;

        const items = await db.query(query, params);
        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        next(err);
    }
};

// POST /api/inventory/restock
exports.restockProduct = async (req, res, next) => {
    try {
        const { product_id, additional_quantity } = req.body;
        const prodId = parseInt(product_id);
        const addQty = parseInt(additional_quantity);

        if (isNaN(prodId) || isNaN(addQty) || addQty <= 0) {
            return res.status(400).json({ success: false, error: 'Valid product and positive restock quantity are required.' });
        }

        const result = await db.query(
            `UPDATE PRODUCT SET quantity_available = quantity_available + ? WHERE product_id = ?`,
            [addQty, prodId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Product not found.' });
        }

        const updated = await db.query('SELECT product_id, brand, model, quantity_available FROM PRODUCT WHERE product_id = ?', [prodId]);

        res.json({
            success: true,
            message: `Successfully added ${addQty} unit(s) to inventory.`,
            data: updated[0]
        });
    } catch (err) {
        next(err);
    }
};

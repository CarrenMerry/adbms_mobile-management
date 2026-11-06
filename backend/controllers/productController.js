const db = require('../db');

// GET /api/products
// Supports ?search=...&brand=...&sort=price_asc|price_desc|stock_asc|stock_desc
exports.getAllProducts = async (req, res, next) => {
    try {
        const { search, brand, sort } = req.query;
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
                created_at
            FROM PRODUCT
            WHERE 1=1
        `;
        const params = [];

        if (search && search.trim() !== '') {
            query += ` AND (brand LIKE ? OR model LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }

        if (brand && brand.trim() !== '' && brand !== 'all') {
            query += ` AND brand = ?`;
            params.push(brand.trim());
        }

        if (sort === 'price_asc') {
            query += ` ORDER BY price ASC`;
        } else if (sort === 'price_desc') {
            query += ` ORDER BY price DESC`;
        } else if (sort === 'stock_asc') {
            query += ` ORDER BY quantity_available ASC`;
        } else if (sort === 'stock_desc') {
            query += ` ORDER BY quantity_available DESC`;
        } else {
            query += ` ORDER BY product_id DESC`;
        }

        const products = await db.query(query, params);
        res.json({ success: true, count: products.length, data: products });
    } catch (err) {
        next(err);
    }
};

// GET /api/products/brands
exports.getBrands = async (req, res, next) => {
    try {
        const rows = await db.query('SELECT DISTINCT brand FROM PRODUCT ORDER BY brand ASC');
        const brands = rows.map(r => r.brand);
        res.json({ success: true, data: brands });
    } catch (err) {
        next(err);
    }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const rows = await db.query(`
            SELECT 
                p.*,
                CASE 
                    WHEN p.quantity_available = 0 THEN 'OUT OF STOCK'
                    WHEN p.quantity_available <= p.reorder_level THEN 'LOW STOCK'
                    ELSE 'IN STOCK'
                END AS stock_status,
                COALESCE((SELECT SUM(quantity) FROM ORDER_ITEM WHERE product_id = p.product_id), 0) AS total_units_sold,
                COALESCE((SELECT COUNT(DISTINCT order_id) FROM ORDER_ITEM WHERE product_id = p.product_id), 0) AS orders_count
            FROM PRODUCT p
            WHERE p.product_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found.' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/products
exports.createProduct = async (req, res, next) => {
    try {
        const { brand, model, price, quantity_available, reorder_level } = req.body;

        if (!brand || !brand.trim()) {
            return res.status(400).json({ success: false, error: 'Brand is required.' });
        }
        if (!model || !model.trim()) {
            return res.status(400).json({ success: false, error: 'Model is required.' });
        }

        const numPrice = parseFloat(price);
        const numQty = parseInt(quantity_available);
        const numReorder = reorder_level !== undefined && reorder_level !== '' ? parseInt(reorder_level) : 5;

        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ success: false, error: 'Price must be a valid non-negative number.' });
        }
        if (isNaN(numQty) || numQty < 0) {
            return res.status(400).json({ success: false, error: 'Quantity must be a valid non-negative integer.' });
        }
        if (isNaN(numReorder) || numReorder < 0) {
            return res.status(400).json({ success: false, error: 'Reorder level must be a valid non-negative integer.' });
        }

        const result = await db.query(
            `INSERT INTO PRODUCT (brand, model, price, quantity_available, reorder_level) VALUES (?, ?, ?, ?, ?)`,
            [brand.trim(), model.trim(), numPrice, numQty, numReorder]
        );

        res.status(201).json({
            success: true,
            message: 'Product added successfully.',
            data: {
                product_id: result.insertId,
                brand: brand.trim(),
                model: model.trim(),
                price: numPrice,
                quantity_available: numQty,
                reorder_level: numReorder
            }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { brand, model, price, quantity_available, reorder_level } = req.body;

        if (!brand || !brand.trim()) {
            return res.status(400).json({ success: false, error: 'Brand is required.' });
        }
        if (!model || !model.trim()) {
            return res.status(400).json({ success: false, error: 'Model is required.' });
        }

        const numPrice = parseFloat(price);
        const numQty = parseInt(quantity_available);
        const numReorder = parseInt(reorder_level);

        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ success: false, error: 'Price cannot be negative.' });
        }
        if (isNaN(numQty) || numQty < 0) {
            return res.status(400).json({ success: false, error: 'Quantity cannot be negative.' });
        }
        if (isNaN(numReorder) || numReorder < 0) {
            return res.status(400).json({ success: false, error: 'Reorder level cannot be negative.' });
        }

        const result = await db.query(
            `UPDATE PRODUCT SET brand = ?, model = ?, price = ?, quantity_available = ?, reorder_level = ? WHERE product_id = ?`,
            [brand.trim(), model.trim(), numPrice, numQty, numReorder, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Product not found.' });
        }

        res.json({
            success: true,
            message: 'Product updated successfully.',
            data: { product_id: id, brand: brand.trim(), model: model.trim(), price: numPrice, quantity_available: numQty, reorder_level: numReorder }
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        // Check if product is referenced in ORDER_ITEM
        const orderItems = await db.query('SELECT COUNT(*) AS count FROM ORDER_ITEM WHERE product_id = ?', [id]);
        if (orderItems[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete product because it has been ordered in ${orderItems[0].count} sales transaction(s). Integrity constraint active.`
            });
        }

        const result = await db.query('DELETE FROM PRODUCT WHERE product_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Product not found.' });
        }

        res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

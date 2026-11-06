const db = require('../db');

// GET /api/dashboard/stats
exports.getDashboardStats = async (req, res, next) => {
    try {
        const [productsCount] = await db.query('SELECT COUNT(*) AS total FROM PRODUCT');
        const [customersCount] = await db.query('SELECT COUNT(*) AS total FROM CUSTOMER');
        const [employeesCount] = await db.query('SELECT COUNT(*) AS total FROM EMPLOYEE');
        const [ordersCount] = await db.query('SELECT COUNT(*) AS total FROM SALES_ORDER');
        const [revenueData] = await db.query("SELECT COALESCE(SUM(total_amount), 0.00) AS total FROM SALES_ORDER WHERE order_status != 'Cancelled'");
        const [lowStockData] = await db.query('SELECT COUNT(*) AS total FROM PRODUCT WHERE quantity_available <= reorder_level');

        res.json({
            success: true,
            data: {
                total_products: productsCount.total,
                total_customers: customersCount.total,
                total_employees: employeesCount.total,
                total_orders: ordersCount.total,
                total_revenue: parseFloat(revenueData.total),
                low_stock_products: lowStockData.total
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/dashboard/charts
exports.getDashboardCharts = async (req, res, next) => {
    try {
        // 1. Sales Revenue Overview & Orders Per Day (Last 10 recorded dates)
        const dailyTrends = await db.query(`
            SELECT 
                DATE(order_date) AS date,
                COALESCE(SUM(total_amount), 0.00) AS revenue,
                COUNT(order_id) AS order_count
            FROM SALES_ORDER
            WHERE order_status != 'Cancelled'
            GROUP BY DATE(order_date)
            ORDER BY date ASC
            LIMIT 10
        `);

        // 2. Top Selling Mobile Phones (Top 5)
        const topPhones = await db.query(`
            SELECT 
                CONCAT(p.brand, ' ', p.model) AS phone_name,
                COALESCE(SUM(oi.quantity), 0) AS units_sold,
                COALESCE(SUM(oi.subtotal), 0.00) AS revenue
            FROM PRODUCT p
            INNER JOIN ORDER_ITEM oi ON p.product_id = oi.product_id
            GROUP BY p.product_id, phone_name
            ORDER BY units_sold DESC
            LIMIT 5
        `);

        // 3. Stock Level Overview by Brand
        const brandStock = await db.query(`
            SELECT 
                brand,
                SUM(quantity_available) AS total_stock,
                COUNT(product_id) AS models_count
            FROM PRODUCT
            GROUP BY brand
            ORDER BY total_stock DESC
        `);

        // 4. Payment Status Distribution
        const paymentStatuses = await db.query(`
            SELECT 
                payment_status,
                COUNT(order_id) AS count,
                COALESCE(SUM(total_amount), 0.00) AS total_amount
            FROM SALES_ORDER
            GROUP BY payment_status
        `);

        // 5. Recent Orders (for dashboard table)
        const recentOrders = await db.query(`
            SELECT 
                o.order_id,
                o.order_date,
                c.customer_name,
                o.total_amount,
                o.order_status,
                o.payment_method,
                o.payment_status
            FROM SALES_ORDER o
            INNER JOIN CUSTOMER c ON o.customer_id = c.customer_id
            ORDER BY o.order_id DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                daily_trends: dailyTrends,
                top_phones: topPhones,
                brand_stock: brandStock,
                payment_statuses: paymentStatuses,
                recent_orders: recentOrders
            }
        });
    } catch (err) {
        next(err);
    }
};

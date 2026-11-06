const db = require('../db');

// GET /api/reports/sales
// Comprehensive Sales Revenue Overview
exports.getSalesReport = async (req, res, next) => {
    try {
        const summary = await db.query(`
            SELECT 
                COUNT(order_id) AS total_orders,
                COALESCE(SUM(total_amount), 0.00) AS total_revenue,
                COALESCE(AVG(total_amount), 0.00) AS average_order_value,
                COALESCE(MIN(total_amount), 0.00) AS min_order_value,
                COALESCE(MAX(total_amount), 0.00) AS max_order_value
            FROM SALES_ORDER
            WHERE order_status != 'Cancelled'
        `);

        // Sales by Date (Demonstrates GROUP BY & DATE function)
        const salesByDate = await db.query(`
            SELECT 
                DATE(order_date) AS sale_date,
                COUNT(order_id) AS orders_count,
                COALESCE(SUM(total_amount), 0.00) AS daily_revenue,
                COALESCE(AVG(total_amount), 0.00) AS daily_avg_order
            FROM SALES_ORDER
            WHERE order_status != 'Cancelled'
            GROUP BY DATE(order_date)
            ORDER BY sale_date DESC
            LIMIT 15
        `);

        res.json({
            success: true,
            data: {
                summary: summary[0],
                sales_by_date: salesByDate
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/reports/products
// Best Selling Phones & Sales by Brand
exports.getProductsReport = async (req, res, next) => {
    try {
        // Best Selling Phones (Demonstrates JOIN, GROUP BY, SUM, ORDER BY)
        const bestSelling = await db.query(`
            SELECT 
                p.product_id,
                p.brand,
                p.model,
                p.price,
                p.quantity_available AS stock_left,
                COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
                COALESCE(SUM(oi.subtotal), 0.00) AS total_revenue_generated
            FROM PRODUCT p
            LEFT JOIN ORDER_ITEM oi ON p.product_id = oi.product_id
            GROUP BY p.product_id, p.brand, p.model, p.price, p.quantity_available
            ORDER BY total_units_sold DESC, total_revenue_generated DESC
        `);

        // Sales by Brand (Demonstrates GROUP BY Brand & SUM aggregation)
        const brandSales = await db.query(`
            SELECT 
                p.brand,
                COUNT(DISTINCT oi.order_id) AS orders_with_brand,
                COALESCE(SUM(oi.quantity), 0) AS units_sold,
                COALESCE(SUM(oi.subtotal), 0.00) AS brand_revenue
            FROM PRODUCT p
            LEFT JOIN ORDER_ITEM oi ON p.product_id = oi.product_id
            GROUP BY p.brand
            ORDER BY brand_revenue DESC
        `);

        // Low stock products
        const lowStock = await db.query(`
            SELECT 
                product_id,
                brand,
                model,
                price,
                quantity_available,
                reorder_level,
                CASE 
                    WHEN quantity_available = 0 THEN 'OUT OF STOCK'
                    ELSE 'LOW STOCK'
                END AS stock_status
            FROM PRODUCT
            WHERE quantity_available <= reorder_level
            ORDER BY quantity_available ASC
        `);

        res.json({
            success: true,
            data: {
                best_selling: bestSelling,
                brand_sales: brandSales,
                low_stock: lowStock
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/reports/customers
// Customer Spending Analysis with HAVING clause demonstration
exports.getCustomersReport = async (req, res, next) => {
    try {
        const customerSpending = await db.query(`
            SELECT 
                c.customer_id,
                c.customer_name,
                c.phone,
                c.email,
                COUNT(o.order_id) AS order_count,
                COALESCE(SUM(o.total_amount), 0.00) AS total_spent,
                COALESCE(AVG(o.total_amount), 0.00) AS average_spend
            FROM CUSTOMER c
            LEFT JOIN SALES_ORDER o ON c.customer_id = o.customer_id AND o.order_status != 'Cancelled'
            GROUP BY c.customer_id, c.customer_name, c.phone, c.email
            ORDER BY total_spent DESC
        `);

        // Customers with multiple orders (Demonstrating HAVING clause)
        const repeatCustomers = await db.query(`
            SELECT 
                c.customer_id,
                c.customer_name,
                c.phone,
                COUNT(o.order_id) AS order_count,
                COALESCE(SUM(o.total_amount), 0.00) AS total_spent
            FROM CUSTOMER c
            INNER JOIN SALES_ORDER o ON c.customer_id = o.customer_id
            GROUP BY c.customer_id, c.customer_name, c.phone
            HAVING COUNT(o.order_id) > 1
            ORDER BY order_count DESC
        `);

        res.json({
            success: true,
            data: {
                customer_spending: customerSpending,
                repeat_customers: repeatCustomers
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/reports/employees
// Employee Sales Performance Evaluation
exports.getEmployeesReport = async (req, res, next) => {
    try {
        const employeePerf = await db.query(`
            SELECT 
                e.employee_id,
                e.employee_name,
                e.role,
                e.phone,
                COUNT(o.order_id) AS orders_handled,
                COALESCE(SUM(o.total_amount), 0.00) AS total_sales_volume,
                COALESCE(AVG(o.total_amount), 0.00) AS avg_sale_value
            FROM EMPLOYEE e
            LEFT JOIN SALES_ORDER o ON e.employee_id = o.employee_id AND o.order_status != 'Cancelled'
            GROUP BY e.employee_id, e.employee_name, e.role, e.phone
            ORDER BY total_sales_volume DESC
        `);

        res.json({ success: true, data: employeePerf });
    } catch (err) {
        next(err);
    }
};

// GET /api/reports/payments
// Payment Method and Order Status Breakdown
exports.getPaymentsReport = async (req, res, next) => {
    try {
        const paymentMethods = await db.query(`
            SELECT 
                payment_method,
                COUNT(order_id) AS transaction_count,
                COALESCE(SUM(total_amount), 0.00) AS total_collected
            FROM SALES_ORDER
            GROUP BY payment_method
            ORDER BY total_collected DESC
        `);

        const orderStatuses = await db.query(`
            SELECT 
                order_status,
                COUNT(order_id) AS orders_count,
                COALESCE(SUM(total_amount), 0.00) AS total_value
            FROM SALES_ORDER
            GROUP BY order_status
            ORDER BY orders_count DESC
        `);

        const paymentStatuses = await db.query(`
            SELECT 
                payment_status,
                COUNT(order_id) AS count,
                COALESCE(SUM(total_amount), 0.00) AS value
            FROM SALES_ORDER
            GROUP BY payment_status
        `);

        res.json({
            success: true,
            data: {
                payment_methods: paymentMethods,
                order_statuses: orderStatuses,
                payment_statuses: paymentStatuses
            }
        });
    } catch (err) {
        next(err);
    }
};

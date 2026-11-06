const db = require('../db');

// Helper to execute query and measure execution time
async function runQueryWithTiming(sql, params = []) {
    const start = process.hrtime();
    const rows = await db.query(sql, params);
    const diff = process.hrtime(start);
    const execution_time_ms = ((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2);
    return { rows, execution_time_ms };
}

// GET /api/analytics/all
exports.getAllDemonstrations = async (req, res, next) => {
    try {
        const demonstrations = [];

        // 1. Basic SELECT Query
        {
            const sql = 'SELECT product_id, brand, model, price, quantity_available FROM PRODUCT LIMIT 5;';
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Basic Queries',
                title: 'Simple SELECT Projection',
                concept: 'Basic Relational Projection (SELECT columns FROM table)',
                sql_query: sql,
                explanation: 'Selects specific product attributes (projection) from the PRODUCT table without filtering.',
                execution_time_ms,
                data: rows
            });
        }

        // 2. WHERE Filtering
        {
            const sql = 'SELECT product_id, brand, model, price, quantity_available, reorder_level FROM PRODUCT WHERE quantity_available <= reorder_level;';
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Selection & Filtering',
                title: 'Conditional WHERE Filtering (Low Stock Detection)',
                concept: 'Relational Selection (WHERE condition on columns)',
                sql_query: sql,
                explanation: 'Filters inventory where the available stock is less than or equal to the designated reorder threshold.',
                execution_time_ms,
                data: rows
            });
        }

        // 3. WHERE with Range / Threshold
        {
            const sql = 'SELECT product_id, brand, model, price FROM PRODUCT WHERE price >= 75000.00 ORDER BY price DESC;';
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Selection & Sorting',
                title: 'High-Value Phones with ORDER BY',
                concept: 'WHERE condition combined with ORDER BY DESC sorting',
                sql_query: sql,
                explanation: 'Retrieves premium tier smartphones priced at or above ₹75,000, sorted from highest to lowest price.',
                execution_time_ms,
                data: rows
            });
        }

        // 4. Multi-Table INNER & LEFT JOIN
        {
            const sql = `
SELECT 
    o.order_id,
    o.order_date,
    c.customer_name,
    c.phone AS customer_phone,
    COALESCE(e.employee_name, 'Online / Self') AS processed_by,
    o.total_amount,
    o.payment_method,
    o.order_status
FROM SALES_ORDER o
INNER JOIN CUSTOMER c ON o.customer_id = c.customer_id
LEFT JOIN EMPLOYEE e ON o.employee_id = e.employee_id
ORDER BY o.order_id DESC
LIMIT 5;
            `.trim();
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Relational Joins',
                title: 'Multi-Table Relational JOIN (Orders + Customers + Employees)',
                concept: 'INNER JOIN (mandatory customer relationship) and LEFT JOIN (optional employee relationship)',
                sql_query: sql,
                explanation: 'Combines normalized data across SALES_ORDER, CUSTOMER, and EMPLOYEE tables into a single coherent business transaction record.',
                execution_time_ms,
                data: rows
            });
        }

        // 5. Deep Composite JOIN (Sales Order + Order Items + Product Details)
        {
            const sql = `
SELECT 
    oi.order_id,
    c.customer_name,
    p.brand,
    p.model,
    oi.quantity,
    oi.unit_price,
    oi.subtotal
FROM ORDER_ITEM oi
INNER JOIN SALES_ORDER o ON oi.order_id = o.order_id
INNER JOIN CUSTOMER c ON o.customer_id = c.customer_id
INNER JOIN PRODUCT p ON oi.product_id = p.product_id
ORDER BY oi.order_id DESC
LIMIT 6;
            `.trim();
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Relational Joins',
                title: '4-Table Relationship Drilldown (Line-Item Product Details)',
                concept: 'Associative Table Join (SALES_ORDER 1:M ORDER_ITEM M:1 PRODUCT)',
                sql_query: sql,
                explanation: 'Demonstrates navigation through the 1-to-many-to-1 relationship between Orders, line items, and mobile phone models.',
                execution_time_ms,
                data: rows
            });
        }

        // 6. GROUP BY & Aggregation
        {
            const sql = `
SELECT 
    p.brand,
    COUNT(DISTINCT oi.order_id) AS total_orders,
    SUM(oi.quantity) AS total_units_sold,
    SUM(oi.subtotal) AS total_revenue
FROM PRODUCT p
INNER JOIN ORDER_ITEM oi ON p.product_id = oi.product_id
GROUP BY p.brand
ORDER BY total_revenue DESC;
            `.trim();
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Aggregation & Grouping',
                title: 'GROUP BY Brand with SUM() and COUNT()',
                concept: 'Data Summarization with GROUP BY and multiple aggregate functions',
                sql_query: sql,
                explanation: 'Aggregates sales performance by mobile phone brand, calculating total units sold and revenue per brand.',
                execution_time_ms,
                data: rows
            });
        }

        // 7. Aggregate Functions (Overall Store Performance)
        {
            const sql = `
SELECT 
    COUNT(*) AS total_completed_orders,
    SUM(total_amount) AS gross_sales_revenue,
    ROUND(AVG(total_amount), 2) AS average_order_value,
    MIN(total_amount) AS lowest_order_value,
    MAX(total_amount) AS highest_order_value
FROM SALES_ORDER
WHERE order_status != 'Cancelled';
            `.trim();
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Aggregate Functions',
                title: 'Statistical Aggregates (COUNT, SUM, AVG, MIN, MAX)',
                concept: 'SQL Aggregate functions evaluating quantitative distribution',
                sql_query: sql,
                explanation: 'Applies full suite of standard relational aggregate functions to compute store-wide sales statistics.',
                execution_time_ms,
                data: rows
            });
        }

        // 8. Correlated Subquery / Scalar Subquery
        {
            const sql = `
SELECT 
    order_id,
    customer_id,
    order_date,
    total_amount,
    payment_method,
    order_status
FROM SALES_ORDER
WHERE total_amount > (
    SELECT AVG(total_amount) FROM SALES_ORDER WHERE order_status != 'Cancelled'
)
ORDER BY total_amount DESC;
            `.trim();
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Advanced Subqueries',
                title: 'Orders Above Average Order Value (Scalar Subquery in WHERE)',
                concept: 'Nested Subquery evaluated against the outer query condition',
                sql_query: sql,
                explanation: 'Finds orders whose monetary value exceeds the dynamically calculated average order total across all non-cancelled orders.',
                execution_time_ms,
                data: rows
            });
        }

        // 9. Negative Subquery (Unsold Products with NOT IN)
        {
            const sql = `
SELECT 
    product_id,
    brand,
    model,
    price,
    quantity_available
FROM PRODUCT
WHERE product_id NOT IN (
    SELECT DISTINCT product_id FROM ORDER_ITEM
);
            `.trim();
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Advanced Subqueries',
                title: 'Products Never Sold (NOT IN Subquery)',
                concept: 'Set difference via subquery filtering (NOT IN clause)',
                sql_query: sql,
                explanation: 'Finds mobile phones currently in inventory that have never been sold in any customer order.',
                execution_time_ms,
                data: rows
            });
        }

        // 10. Database Views
        {
            const sql = 'SELECT * FROM view_customer_spending ORDER BY total_spent DESC LIMIT 5;';
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Database Views',
                title: 'Querying View: view_customer_spending',
                concept: 'Virtual Tables (CREATE VIEW) for simplified querying and data abstraction',
                sql_query: sql,
                explanation: 'Queries a pre-compiled SQL View that encapsulates customer spending aggregation, abstracting complex joins and grouping.',
                execution_time_ms,
                data: rows
            });
        }

        // 11. Index Analysis with EXPLAIN
        {
            const sql = 'EXPLAIN SELECT * FROM SALES_ORDER WHERE customer_id = 1;';
            const { rows, execution_time_ms } = await runQueryWithTiming(sql);
            demonstrations.push({
                category: 'Query Optimization & Indexing',
                title: 'EXPLAIN Plan on Indexed Column (idx_sales_order_customer)',
                concept: 'Query execution planner verification demonstrating B-Tree Index utilization',
                sql_query: sql,
                explanation: 'Displays the MySQL optimizer execution plan, confirming that the index idx_sales_order_customer is used to avoid a full table scan.',
                execution_time_ms,
                data: rows
            });
        }

        // 12. Transaction Demonstration Workflow (ACID Properties)
        demonstrations.push({
            category: 'Transaction Management (ACID)',
            title: 'Atomic Multi-Step Order Processing Transaction',
            concept: 'ACID Transactions (Atomicity, Consistency, Isolation, Durability)',
            sql_query: `
-- Step 1: Begin Atomic Transaction
START TRANSACTION;

-- Step 2: Lock & Verify Inventory (Prevents Race Conditions)
SELECT quantity_available FROM PRODUCT WHERE product_id = 2 FOR UPDATE;

-- Step 3: Insert Master Sales Order
INSERT INTO SALES_ORDER (customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_status, invoice_amount)
VALUES (1, 2, NOW(), 'Confirmed', 79900.00, 'UPI', 'Paid', 79900.00);

-- Step 4: Insert Child Line Item
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal)
VALUES (LAST_INSERT_ID(), 2, 1, 79900.00, 79900.00);

-- Step 5: Atomically Decrement Product Inventory
UPDATE PRODUCT SET quantity_available = quantity_available - 1 WHERE product_id = 2;

-- Step 6: Commit All Changes (or ROLLBACK if error occurs)
COMMIT;
            `.trim(),
            explanation: 'Demonstrates the actual MySQL transaction logic implemented in the backend checkout controller. If any item is out of stock or any insert fails, ROLLBACK executes automatically, ensuring complete Atomicity and zero partial data corruption.',
            execution_time_ms: 'N/A (Executed on Checkout)',
            data: [{ status: 'Enforced via InnoDB engine with START TRANSACTION, FOR UPDATE, and COMMIT/ROLLBACK' }]
        });

        res.json({ success: true, count: demonstrations.length, data: demonstrations });
    } catch (err) {
        next(err);
    }
};

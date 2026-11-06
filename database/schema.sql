-- ==========================================================
-- Smart Mobile Phone Sales & Inventory Management System
-- MCA ADBMS Project Database Schema
-- Database: smart_mobile_db
-- Tables: Exactly 5 tables (CUSTOMER, EMPLOYEE, PRODUCT, SALES_ORDER, ORDER_ITEM)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS smart_mobile_db;
USE smart_mobile_db;

-- Drop views if they exist to allow clean table re-creation
DROP VIEW IF EXISTS view_customer_spending;
DROP VIEW IF EXISTS view_sales_summary;
DROP VIEW IF EXISTS view_product_stock_status;

-- Drop tables in reverse foreign key order
DROP TABLE IF EXISTS ORDER_ITEM;
DROP TABLE IF EXISTS SALES_ORDER;
DROP TABLE IF EXISTS PRODUCT;
DROP TABLE IF EXISTS EMPLOYEE;
DROP TABLE IF EXISTS CUSTOMER;

-- ----------------------------------------------------------
-- 1. Table: CUSTOMER
-- ----------------------------------------------------------
CREATE TABLE CUSTOMER (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(60) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(80) UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 2. Table: EMPLOYEE
-- ----------------------------------------------------------
CREATE TABLE EMPLOYEE (
    employee_id INT PRIMARY KEY AUTO_INCREMENT,
    employee_name VARCHAR(60) NOT NULL,
    role VARCHAR(30) DEFAULT 'Sales Associate',
    phone VARCHAR(15),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 3. Table: PRODUCT (Includes Inventory Information)
-- ----------------------------------------------------------
CREATE TABLE PRODUCT (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    brand VARCHAR(40) NOT NULL,
    model VARCHAR(60) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_product_price CHECK (price >= 0),
    CONSTRAINT chk_product_qty CHECK (quantity_available >= 0),
    CONSTRAINT chk_product_reorder CHECK (reorder_level >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 4. Table: SALES_ORDER (Includes Payment & Invoice Information)
-- ----------------------------------------------------------
CREATE TABLE SALES_ORDER (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    employee_id INT,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    order_status VARCHAR(20) DEFAULT 'Confirmed',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) DEFAULT 'UPI',
    payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'Paid',
    invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    invoice_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(employee_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_order_total CHECK (total_amount >= 0),
    CONSTRAINT chk_payment_amount CHECK (payment_amount >= 0),
    CONSTRAINT chk_invoice_amount CHECK (invoice_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 5. Table: ORDER_ITEM (Composite relationship between Order & Product)
-- ----------------------------------------------------------
CREATE TABLE ORDER_ITEM (
    order_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES SALES_ORDER(order_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_item_quantity CHECK (quantity > 0),
    CONSTRAINT chk_item_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_item_subtotal CHECK (subtotal >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- INDEXES for Query Optimization (ADBMS Demonstration)
-- ==========================================================
CREATE INDEX idx_sales_order_customer ON SALES_ORDER(customer_id);
CREATE INDEX idx_sales_order_employee ON SALES_ORDER(employee_id);
CREATE INDEX idx_sales_order_date ON SALES_ORDER(order_date);
CREATE INDEX idx_order_item_order ON ORDER_ITEM(order_id);
CREATE INDEX idx_order_item_product ON ORDER_ITEM(product_id);
CREATE INDEX idx_product_brand ON PRODUCT(brand);

-- ==========================================================
-- VIEWS for ADBMS Concepts Demonstration
-- ==========================================================

-- View 1: Complete Sales Summary joining Orders, Customers, and Employees
CREATE OR REPLACE VIEW view_sales_summary AS
SELECT 
    o.order_id,
    o.order_date,
    c.customer_id,
    c.customer_name,
    c.phone AS customer_phone,
    e.employee_id,
    e.employee_name,
    o.order_status,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.invoice_date,
    o.invoice_amount
FROM SALES_ORDER o
INNER JOIN CUSTOMER c ON o.customer_id = c.customer_id
LEFT JOIN EMPLOYEE e ON o.employee_id = e.employee_id;

-- View 2: Product Stock Evaluation
CREATE OR REPLACE VIEW view_product_stock_status AS
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
    END AS stock_status
FROM PRODUCT;

-- View 3: Customer Spending Aggregation
CREATE OR REPLACE VIEW view_customer_spending AS
SELECT 
    c.customer_id,
    c.customer_name,
    c.email,
    c.phone,
    COUNT(o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0.00) AS total_spent
FROM CUSTOMER c
LEFT JOIN SALES_ORDER o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name, c.email, c.phone;

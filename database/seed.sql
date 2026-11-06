-- ==========================================================
-- Smart Mobile Phone Sales & Inventory Management System
-- MCA ADBMS Project Realistic Seed Data
-- ==========================================================

USE smart_mobile_db;

-- Clear previous data
DELETE FROM ORDER_ITEM;
DELETE FROM SALES_ORDER;
DELETE FROM PRODUCT;
DELETE FROM EMPLOYEE;
DELETE FROM CUSTOMER;

-- Reset Auto Increments
ALTER TABLE CUSTOMER AUTO_INCREMENT = 1;
ALTER TABLE EMPLOYEE AUTO_INCREMENT = 1;
ALTER TABLE PRODUCT AUTO_INCREMENT = 1;
ALTER TABLE SALES_ORDER AUTO_INCREMENT = 1001;
ALTER TABLE ORDER_ITEM AUTO_INCREMENT = 1;

-- ----------------------------------------------------------
-- 1. Seed CUSTOMER Table
-- ----------------------------------------------------------
INSERT INTO CUSTOMER (customer_name, phone, email) VALUES
('Rahul Sharma', '9876543210', 'rahul.sharma@gmail.com'),
('Priya Patel', '9823456781', 'priya.patel@yahoo.com'),
('Amit Verma', '9811223344', 'amit.verma@outlook.com'),
('Sneha Reddy', '9744556677', 'sneha.reddy@gmail.com'),
('Vikram Malhotra', '9988776655', 'vikram.m@gmail.com'),
('Ananya Iyer', '9655443322', 'ananya.iyer@protonmail.com'),
('Rohan Deshmukh', '9544332211', 'rohan.deshmukh@gmail.com'),
('Kavita Nair', '9433221100', 'kavita.nair@icloud.com');

-- ----------------------------------------------------------
-- 2. Seed EMPLOYEE Table
-- ----------------------------------------------------------
INSERT INTO EMPLOYEE (employee_name, role, phone) VALUES
('Rajesh Kumar', 'Store Manager', '9899001122'),
('Neha Singh', 'Senior Sales Consultant', '9899002233'),
('Arjun Mehta', 'Sales Executive', '9899003344'),
('Pooja Joshi', 'Billing Specialist', '9899004455');

-- ----------------------------------------------------------
-- 3. Seed PRODUCT Table (Inventory included)
-- ----------------------------------------------------------
INSERT INTO PRODUCT (brand, model, price, quantity_available, reorder_level) VALUES
('Apple', 'iPhone 16 Pro Max 256GB', 144900.00, 12, 4),
('Apple', 'iPhone 16 128GB', 79900.00, 18, 5),
('Apple', 'iPhone 15 128GB', 65900.00, 3, 5),          -- LOW STOCK
('Samsung', 'Galaxy S25 Ultra 512GB', 139999.00, 8, 3),
('Samsung', 'Galaxy S25 256GB', 84999.00, 14, 5),
('Samsung', 'Galaxy Z Fold 6 256GB', 164999.00, 2, 3),  -- LOW STOCK
('OnePlus', 'OnePlus 13 5G 256GB', 69999.00, 15, 5),
('OnePlus', 'OnePlus 12R 256GB', 39999.00, 0, 5),       -- OUT OF STOCK
('Google', 'Pixel 9 Pro XL 128GB', 124999.00, 6, 3),
('Google', 'Pixel 8a 128GB', 44999.00, 9, 4),
('Xiaomi', 'Xiaomi 14 Ultra 512GB', 99999.00, 4, 4),    -- LOW STOCK
('Nothing', 'Nothing Phone 2a Plus 256GB', 27999.00, 16, 5);

-- ----------------------------------------------------------
-- 4. Seed SALES_ORDER Table
-- ----------------------------------------------------------
-- Order #1001: Rahul Sharma, assisted by Neha Singh
INSERT INTO SALES_ORDER (order_id, customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
VALUES (1001, 1, 2, '2026-03-01 11:30:00', 'Completed', 224800.00, 'Card', 224800.00, 'Paid', '2026-03-01 11:35:00', 224800.00);

-- Order #1002: Priya Patel, assisted by Arjun Mehta
INSERT INTO SALES_ORDER (order_id, customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
VALUES (1002, 2, 3, '2026-03-02 14:15:00', 'Completed', 139999.00, 'UPI', 139999.00, 'Paid', '2026-03-02 14:18:00', 139999.00);

-- Order #1003: Amit Verma, assisted by Neha Singh
INSERT INTO SALES_ORDER (order_id, customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
VALUES (1003, 3, 2, '2026-03-03 16:45:00', 'Completed', 109998.00, 'UPI', 109998.00, 'Paid', '2026-03-03 16:50:00', 109998.00);

-- Order #1004: Sneha Reddy, assisted by Pooja Joshi
INSERT INTO SALES_ORDER (order_id, customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
VALUES (1004, 4, 4, '2026-03-04 10:20:00', 'Completed', 124999.00, 'Net Banking', 124999.00, 'Paid', '2026-03-04 10:25:00', 124999.00);

-- Order #1005: Vikram Malhotra, assisted by Rajesh Kumar
INSERT INTO SALES_ORDER (order_id, customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
VALUES (1005, 5, 1, '2026-03-05 18:00:00', 'Confirmed', 164999.00, 'Card', 164999.00, 'Paid', '2026-03-05 18:05:00', 164999.00);

-- Order #1006: Ananya Iyer, assisted by Arjun Mehta
INSERT INTO SALES_ORDER (order_id, customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
VALUES (1006, 6, 3, '2026-03-06 12:40:00', 'Pending', 79900.00, 'Cash', 0.00, 'Pending', '2026-03-06 12:40:00', 79900.00);

-- Order #1007: Rahul Sharma, assisted by Neha Singh (Second order demonstrating repeat customer)
INSERT INTO SALES_ORDER (order_id, customer_id, employee_id, order_date, order_status, total_amount, payment_method, payment_amount, payment_status, invoice_date, invoice_amount)
VALUES (1007, 1, 2, '2026-03-07 15:10:00', 'Completed', 55998.00, 'UPI', 55998.00, 'Paid', '2026-03-07 15:15:00', 55998.00);

-- ----------------------------------------------------------
-- 5. Seed ORDER_ITEM Table (Demonstrating 1:M Multi-Product Line Items)
-- ----------------------------------------------------------
-- Order #1001 Items: 1x iPhone 16 Pro Max + 1x iPhone 16
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1001, 1, 1, 144900.00, 144900.00),
(1001, 2, 1, 79900.00, 79900.00);

-- Order #1002 Items: 1x Galaxy S25 Ultra
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1002, 4, 1, 139999.00, 139999.00);

-- Order #1003 Items: 1x OnePlus 13 + 1x OnePlus 12R (Sold earlier)
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1003, 7, 1, 69999.00, 69999.00),
(1003, 8, 1, 39999.00, 39999.00);

-- Order #1004 Items: 1x Pixel 9 Pro XL
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1004, 9, 1, 124999.00, 124999.00);

-- Order #1005 Items: 1x Galaxy Z Fold 6
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1005, 6, 1, 164999.00, 164999.00);

-- Order #1006 Items: 1x iPhone 16
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1006, 2, 1, 79900.00, 79900.00);

-- Order #1007 Items: 2x Nothing Phone 2a Plus
INSERT INTO ORDER_ITEM (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1007, 12, 2, 27999.00, 55998.00);

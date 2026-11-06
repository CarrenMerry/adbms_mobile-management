<<<<<<< HEAD
# Smart Mobile Phone Sales & Inventory Management System
> **MCA Advanced Database Management Systems (ADBMS) Project**  
> Built with Node.js, Express.js, MySQL 8.0, Bootstrap 5, and Chart.js.

---

## 📱 Project Overview

The **Smart Mobile Phone Sales & Inventory Management System** is a full-stack academic database-driven web application designed to demonstrate relational database architecture, ACID transactions, data normalization, multi-table relationships, aggregation queries, and real-time inventory management for a modern smartphone retail store.

### Key Scope Guidelines Adhered To:
- **Exclusively Focused On:** Mobile Phone Sales, Real-Time Inventory, Customers, Employees, Sales Orders, Order Items, Invoicing, and SQL Analytics.
- **Strictly Excluded:** Repair, servicing, warranty, spare parts, and supplier tables.
- **Relational Integrity:** Implements **EXACTLY 5 core relational tables** with no extraneous payment, invoice, or inventory tables.

---

## 🗄️ Relational Database Schema (Exactly 5 Tables)

The database schema is fully normalized and implemented in MySQL with InnoDB engine to ensure ACID transaction compliance and foreign key enforcement:

```
    CUSTOMER (1) ------------< PLACES >------------ (M) SALES_ORDER
                                                            |
    EMPLOYEE (1) ----------< PROCESSES >----------- (M)    |
                                                            | (1)
                                                            |
                                                        CONTAINS
                                                            |
                                                            | (M)
    PRODUCT (1) -----------< REFERRED TO BY >------ (M) ORDER_ITEM
```

### Table Specifications:

1. **`CUSTOMER`**
   - `customer_id` INT PRIMARY KEY AUTO_INCREMENT
   - `customer_name` VARCHAR(60) NOT NULL
   - `phone` VARCHAR(15)
   - `email` VARCHAR(80) UNIQUE
   - `created_at` DATETIME

2. **`EMPLOYEE`**
   - `employee_id` INT PRIMARY KEY AUTO_INCREMENT
   - `employee_name` VARCHAR(60) NOT NULL
   - `role` VARCHAR(30)
   - `phone` VARCHAR(15)
   - `created_at` DATETIME

3. **`PRODUCT`** (Directly stores inventory information)
   - `product_id` INT PRIMARY KEY AUTO_INCREMENT
   - `brand` VARCHAR(40) NOT NULL
   - `model` VARCHAR(60) NOT NULL
   - `price` DECIMAL(10,2) NOT NULL (CHECK: `price >= 0`)
   - `quantity_available` INT NOT NULL DEFAULT 0 (CHECK: `quantity_available >= 0`)
   - `reorder_level` INT NOT NULL DEFAULT 5 (CHECK: `reorder_level >= 0`)
   - `created_at` DATETIME

4. **`SALES_ORDER`** (Stores payment and invoice information directly)
   - `order_id` BIGINT PRIMARY KEY AUTO_INCREMENT
   - `customer_id` INT NOT NULL (FK &rarr; `CUSTOMER.customer_id`)
   - `employee_id` INT NULL (FK &rarr; `EMPLOYEE.employee_id`)
   - `order_date` DATETIME DEFAULT CURRENT_TIMESTAMP
   - `order_status` VARCHAR(20) (`Confirmed`, `Completed`, `Pending`, `Cancelled`)
   - `total_amount` DECIMAL(10,2) NOT NULL
   - `payment_method` VARCHAR(20) (`UPI`, `Card`, `Cash`, `Net Banking`)
   - `payment_amount` DECIMAL(10,2) NOT NULL
   - `payment_status` VARCHAR(20) (`Paid`, `Pending`, `Refunded`, `Failed`)
   - `invoice_date` DATETIME
   - `invoice_amount` DECIMAL(10,2)

5. **`ORDER_ITEM`** (Associative junction entity for multiple phones per order)
   - `order_item_id` BIGINT PRIMARY KEY AUTO_INCREMENT
   - `order_id` BIGINT NOT NULL (FK &rarr; `SALES_ORDER.order_id`)
   - `product_id` INT NOT NULL (FK &rarr; `PRODUCT.product_id`)
   - `quantity` INT NOT NULL (CHECK: `quantity > 0`)
   - `unit_price` DECIMAL(10,2) NOT NULL
   - `subtotal` DECIMAL(10,2) NOT NULL

---

## ⚡ ACID Transaction Management

When a customer places an order containing one or multiple mobile phones:
1. **`START TRANSACTION;`** begins the atomic boundary.
2. **Lock & Verify:** Available stock is queried with **`FOR UPDATE`** to prevent concurrency race conditions.
3. **Stock Verification:** If any requested quantity exceeds `quantity_available`, the system aborts and issues a **`ROLLBACK;`** with a user-friendly error message: *"Insufficient stock available"*.
4. **Master Record:** `SALES_ORDER` is created with calculated totals.
5. **Child Records:** `ORDER_ITEM` records are inserted for every selected phone.
6. **Inventory Update:** `PRODUCT.quantity_available` is decremented in real-time.
7. **`COMMIT;`** finalizes all changes atomically.
8. If an order is **Cancelled**, another atomic transaction executes that updates the status and restores reserved inventory units back to `PRODUCT`.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **MySQL 8.0** server running locally (e.g., MySQL Community Server or XAMPP)

### 2. Installation
Clone or navigate to the project directory:
```bash
cd "Mobile Management System"
npm install
```

### 3. Environment Configuration
Edit the `.env` file with your MySQL server credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_mobile_db
PORT=5000
```

### 4. Database Initialization
Run the automated schema and realistic seed data script:
```bash
npm run db:init
```
This executes `database/schema.sql` and `database/seed.sql` against your MySQL instance.

### 5. Start the Application
```bash
npm start
```
- Open your browser to: **`http://localhost:5000`**
- Login using demo credentials:
  - **Email:** `admin@mobileshop.com`
  - **Password:** `admin123` (or click *"Demo Autofill"*)

---

## 📋 Viva & Demonstration Walkthrough

Use this step-by-step checklist during course project evaluation:

1. **Dashboard (`/dashboard.html`)**
   - Verify top 6 database statistics retrieved live from MySQL.
   - Inspect the 5 dynamic Chart.js charts (Daily trends, payment statuses, top selling phones, brand-level stock).
2. **Catalog Management (`/products.html`)**
   - Add a new mobile phone model and verify constraints (e.g., cannot enter negative price or stock).
   - Search by brand (`Apple`, `Samsung`), sort by price or stock level.
   - Observe real-time status badges: `IN STOCK`, `LOW STOCK`, `OUT OF STOCK`.
3. **Customer & Order History JOIN (`/customers.html`)**
   - View customer list with aggregated order count and total spent.
   - Click the clock icon on any customer to inspect their full order history fetched via **SQL JOIN**.
4. **Staff Performance Aggregation (`/employees.html`)**
   - View staff members and their performance computed with SQL `COUNT()` and `SUM()`.
5. **Multi-Phone Order Checkout & Transaction (`/orders.html`)**
   - Click **`+ Create Multi-Item Order`**.
   - Select a customer and employee.
   - Add **multiple mobile phones** (e.g. 1 iPhone 16 + 1 Galaxy S25).
   - Notice automatic live subtotal and grand total calculation.
   - Test stock validation: attempt to request more units than available to demonstrate the *"Insufficient stock available"* prevention.
   - Confirm order to execute the **MySQL ACID transaction**.
   - Inspect the automatically generated **Tax Invoice** and click **Print / Save as PDF**.
6. **Stock Deduction & Inventory Verification (`/inventory.html`)**
   - Verify that the phone's available stock decreased immediately.
   - Test the **Quick Restock** modal to replenish units.
7. **SQL Aggregation Reports (`/reports.html`)**
   - Review 10 aggregation reports including Sales by Date, Best Selling Models, Customer Spending (with `HAVING` clause demo), and Employee Performance.
8. **SQL Analytics Demonstration (`/analytics.html`)**
   - Review 12 relational database concepts with actual SQL queries, execution times in milliseconds, and live result datasets:
     - Basic Projections (`SELECT`)
     - Selection & Filtering (`WHERE`)
     - Sorting (`ORDER BY`)
     - Relational JOINs (`INNER JOIN`, `LEFT JOIN`)
     - Aggregation (`GROUP BY`, `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`)
     - Nested Subqueries (`WHERE total_amount > (SELECT AVG(...))`, `NOT IN`)
     - Pre-compiled Views (`view_customer_spending`)
     - Index Optimization (`EXPLAIN SELECT ...`)
     - ACID Transaction lifecycle explanation

---

## 📁 Project Structure

```
smart-mobile-sales/
│
├── frontend/
│   ├── index.html          # Administrator login portal
│   ├── dashboard.html      # Store overview & Chart.js visualizations
│   ├── products.html       # Products catalog CRUD & stock tracking
│   ├── customers.html      # Customers registry & order history JOINs
│   ├── employees.html      # Staff directory & sales performance
│   ├── orders.html         # Multi-item order wizard & tax invoices
│   ├── order-items.html    # Order items associative table inspection
│   ├── inventory.html      # Real-time warehouse inventory & restocking
│   ├── reports.html        # 10 SQL aggregation business reports
│   ├── analytics.html      # ADBMS demonstration & live query runner
│   ├── css/
│   │   └── style.css       # Clean, modern, minimal responsive styling
│   └── js/
│       ├── api.js          # Centralized API client & toast alerts
│       ├── auth.js         # Session state management
│       ├── dashboard.js    # Chart.js initialization
│       ├── products.js     # Products CRUD handler
│       ├── customers.js    # Customer management & join handler
│       ├── employees.js    # Employee directory handler
│       ├── orders.js       # Transaction checkout & invoice generator
│       ├── inventory.js    # Inventory stock & restock handler
│       ├── reports.js      # Aggregation reports loader
│       └── analytics.js    # Live SQL execution viewer
│
├── backend/
│   ├── server.js           # Express application server
│   ├── db.js               # MySQL2 connection pool & promise wrapper
│   ├── controllers/        # Business logic & query implementations
│   ├── routes/             # RESTful route definitions
│   └── middleware/         # Centralized error handling
│
├── database/
│   ├── schema.sql          # 5 Tables DDL, Foreign Keys, Indexes & Views
│   ├── seed.sql            # Realistic sample data records
│   └── init-db.js          # CLI database initialization runner
│
├── .env.example            # Environment template
├── .env                    # Active database credentials
├── .gitignore              # Git exclusions
├── package.json            # Node.js project manifest & scripts
└── README.md               # Project documentation
```
=======
# adbms_mobile-management
>>>>>>> 0c6a8357e08deac4edd271de098967fdd5962bbe

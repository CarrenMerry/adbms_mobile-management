require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'smart_mobile_db';

    console.log(`Connecting to MySQL at ${host} as ${user}...`);

    let connection;
    try {
        // Connect without specific database to create DB if needed
        connection = await mysql.createConnection({
            host,
            user,
            password,
            multipleStatements: true
        });

        console.log(`Connected successfully! Initializing database "${database}"...`);

        // Read schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);
        console.log('✓ schema.sql executed successfully (5 tables, indexes & views created).');

        // Read seed.sql
        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await connection.query(seedSql);
        console.log('✓ seed.sql executed successfully (sample data populated).');

        console.log('\n======================================================');
        console.log('Database initialization COMPLETE!');
        console.log('Tables: CUSTOMER, EMPLOYEE, PRODUCT, SALES_ORDER, ORDER_ITEM');
        console.log('======================================================\n');
    } catch (err) {
        console.error('\n❌ Database initialization error:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\nAccess denied! Please check DB_USER and DB_PASSWORD in your .env file.');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('\nCould not connect to MySQL server. Ensure MySQL service is running.');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;

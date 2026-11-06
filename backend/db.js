require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_mobile_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    dateStrings: true
});

// Test connection on boot
pool.getConnection()
    .then(connection => {
        console.log('✓ Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'smart_mobile_db'));
        connection.release();
    })
    .catch(err => {
        console.warn('⚠ MySQL Connection Warning:', err.message);
        console.warn('  Ensure MySQL server is running and .env credentials (DB_USER, DB_PASSWORD, DB_NAME) are correct.');
    });

module.exports = {
    pool,
    query: async (sql, params) => {
        const [results] = await pool.query(sql, params);
        return results;
    },
    getConnection: async () => {
        return await pool.getConnection();
    }
};

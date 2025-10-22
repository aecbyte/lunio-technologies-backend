// const mysql = require('mysql2/promise');
// require('dotenv').config();

// const dbConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'ecommerce_admin',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   acquireTimeout: 60000,
//   timeout: 60000,
//   reconnect: true
// };

// // Create connection pool
// const pool = mysql.createPool(dbConfig);

// // Test database connection
// const testConnection = async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log('✅ Database connected successfully');
//     connection.release();
//     return true;
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//     return false;
//   }
// };

// module.exports = {
//   pool,
//   testConnection
// };



const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST, // Public IP of Cloud SQL instance
  user: process.env.DB_USER, // DB username
  password: process.env.DB_PASSWORD, // DB password
  database: process.env.DB_NAME, // Database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  connectTimeout: 60000,
};

const pool = mysql.createPool(dbConfig);

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to Google Cloud SQL (Public IP)');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Google Cloud SQL connection failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection };
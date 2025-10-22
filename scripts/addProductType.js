const mysql = require('mysql2/promise');
require('dotenv').config();

async function addProductTypeColumn() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ecommerce_admin'
    });

    console.log('Connected to database');

    await connection.execute(`
      ALTER TABLE products
      ADD COLUMN productType ENUM('hardware', 'software', 'service') DEFAULT 'hardware' AFTER categoryId
    `);

    console.log('✅ Product type column added successfully');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Product type column already exists');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  addProductTypeColumn()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = addProductTypeColumn;
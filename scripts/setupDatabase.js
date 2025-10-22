// setupDatabase.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const setupDatabase = async () => {
  let connection;

  const DB_HOST = process.env.DB_HOST || '34.131.137.176';
  const DB_USER = process.env.DB_USER || 'test_database';
  const DB_PASSWORD = process.env.DB_PASSWORD || '67M=]o$PPB^)y7F5';
  const DB_NAME = process.env.DB_NAME || 'lunio_ecommerce';

  try {
    // Connect to MySQL server (no database)
    console.log('Connecting to MySQL server...', DB_PASSWORD, DB_USER, DB_HOST, DB_NAME);
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: false
    });

    console.log('Connected to MySQL server');

    // Create database (query works fine)
    await connection.query('CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [DB_NAME]);
    console.log(`Database ${DB_NAME} created or already exists`);

    // Switch to the database using changeUser (avoids prepared-statement issue with USE)
    await connection.changeUser({ database: DB_NAME });
    console.log(`Using database ${DB_NAME}`);

    const suffix = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    const tables = [
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ticketNumber VARCHAR(50) UNIQUE NOT NULL,
        customerId INT NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status ENUM('open', 'in-progress', 'resolved', 'closed') DEFAULT 'open',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        assignedTo INT,
        adminResponse TEXT,
        satisfactionRating INT CHECK (satisfactionRating >= 1 AND satisfactionRating <= 5),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL
      )`,

      // Customer addresses table
      `CREATE TABLE IF NOT EXISTS customer_addresses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customerId INT NOT NULL,
        addressType ENUM('billing', 'shipping'),
        streetAddress VARCHAR(500) NOT NULL,
        addressLine2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postalCode VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL,
        isDefault BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_customer_address (customerId, addressType),
        INDEX idx_postal_code (postalCode)
      )`,

      // Transactions table
      `CREATE TABLE IF NOT EXISTS transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        transactionId VARCHAR(100) UNIQUE NOT NULL,
        customerId INT NOT NULL,
        orderId INT,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        transactionType ENUM('payment', 'refund', 'chargeback', 'adjustment', 'credit') NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
        paymentMethod ENUM('credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cash_on_delivery', 'bank_transfer') NOT NULL,
        paymentGateway VARCHAR(50),
        gatewayTransactionId VARCHAR(255),
        description TEXT,
        metadata JSON,
        failureReason TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
        INDEX idx_customer_transaction (customerId, createdAt DESC),
        INDEX idx_transaction_status (status),
        INDEX idx_transaction_type (transactionType),
        INDEX idx_gateway_transaction (gatewayTransactionId)
      )`
      // `CREATE TABLE IF NOT EXISTS users (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   fullName VARCHAR(255) NOT NULL,
      //   username VARCHAR(100) UNIQUE,
      //   email VARCHAR(255) UNIQUE NOT NULL,
      //   password VARCHAR(255) NOT NULL,
      //   phone VARCHAR(20),
      //   role ENUM('admin', 'customer') DEFAULT 'customer',
      //   status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      //   avatar VARCHAR(500),
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS categories (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   name VARCHAR(255) NOT NULL,
      //   slug VARCHAR(255) UNIQUE NOT NULL,
      //   description TEXT,
      //   image VARCHAR(500),
      //   parentId INT DEFAULT NULL,
      //   status ENUM('active', 'inactive') DEFAULT 'active',
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      //   FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS products (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   name VARCHAR(255) NOT NULL,
      //   slug VARCHAR(255) UNIQUE NOT NULL,
      //   sku VARCHAR(100) UNIQUE NOT NULL,
      //   description TEXT,
      //   shortDescription VARCHAR(500),
      //   categoryId INT,
      //   brand VARCHAR(100),
      //   price DECIMAL(10,2) NOT NULL,
      //   salePrice DECIMAL(10,2),
      //   stockQuantity INT DEFAULT 0,
      //   stockStatus ENUM('in_stock', 'out_of_stock', 'on_backorder') DEFAULT 'in_stock',
      //   weight DECIMAL(8,2),
      //   dimensions VARCHAR(100),
      //   status ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
      //   featured BOOLEAN DEFAULT FALSE,
      //   visibility ENUM('public', 'private', 'draft') DEFAULT 'public',
      //   metaTitle VARCHAR(255),
      //   metaDescription TEXT,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      //   FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS product_images (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   productId INT NOT NULL,
      //   imageUrl VARCHAR(500) NOT NULL,
      //   publicId VARCHAR(255),
      //   altText VARCHAR(255),
      //   sortOrder INT DEFAULT 0,
      //   isPrimary BOOLEAN DEFAULT FALSE,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS product_attributes (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   productId INT NOT NULL,
      //   name VARCHAR(100) NOT NULL,
      //   value VARCHAR(255) NOT NULL,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS orders (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   orderNumber VARCHAR(50) UNIQUE NOT NULL,
      //   customerId INT NOT NULL,
      //   status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
      //   totalAmount DECIMAL(10,2) NOT NULL,
      //   subtotal DECIMAL(10,2) NOT NULL,
      //   taxAmount DECIMAL(10,2) DEFAULT 0,
      //   shippingAmount DECIMAL(10,2) DEFAULT 0,
      //   discountAmount DECIMAL(10,2) DEFAULT 0,
      //   paymentMethod VARCHAR(50),
      //   paymentStatus ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
      //   shippingAddress JSON,
      //   billingAddress JSON,
      //   orderDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   shippedDate TIMESTAMP NULL,
      //   deliveredDate TIMESTAMP NULL,
      //   notes TEXT,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      //   FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS order_items (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   orderId INT NOT NULL,
      //   productId INT NOT NULL,
      //   productName VARCHAR(255) NOT NULL,
      //   productSku VARCHAR(100),
      //   quantity INT NOT NULL,
      //   price DECIMAL(10,2) NOT NULL,
      //   total DECIMAL(10,2) NOT NULL,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      //   FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS reviews (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   productId INT NOT NULL,
      //   userId INT NOT NULL,
      //   orderId INT,
      //   rating INT NOT NULL,
      //   title VARCHAR(255),
      //   comment TEXT,
      //   productQualityRating INT,
      //   shippingRating INT,
      //   sellerRating INT,
      //   status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      //   adminReply TEXT,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      //   FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      //   FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      //   FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS kyc_applications (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   applicationId VARCHAR(50) UNIQUE NOT NULL,
      //   userId INT NOT NULL,
      //   documentType ENUM('aadhaar', 'pan', 'passport', 'driving_license') NOT NULL,
      //   documentNumber VARCHAR(100) NOT NULL,
      //   frontImageUrl VARCHAR(500),
      //   backImageUrl VARCHAR(500),
      //   selfieImageUrl VARCHAR(500),
      //   status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      //   rejectionReason TEXT,
      //   submittedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   reviewedDate TIMESTAMP NULL,
      //   reviewedBy INT,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      //   FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      //   FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS return_orders (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   returnId VARCHAR(50) UNIQUE NOT NULL,
      //   orderId INT NOT NULL,
      //   customerId INT NOT NULL,
      //   productId INT NOT NULL,
      //   quantity INT NOT NULL,
      //   reason TEXT NOT NULL,
      //   status ENUM('Return Initiated', 'Return in Progress', 'QC in Progress', 'Returned', 'Scrapped', 'Cancelled') DEFAULT 'Return Initiated',
      //   refundAmount DECIMAL(10,2) NOT NULL,
      //   trackingNumber VARCHAR(100),
      //   notes TEXT,
      //   returnDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   processedDate TIMESTAMP NULL,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      //   FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      //   FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
      //   FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      // )${suffix}`,
      // `CREATE TABLE IF NOT EXISTS blogs (
      //   id INT PRIMARY KEY AUTO_INCREMENT,
      //   title VARCHAR(255) NOT NULL,
      //   slug VARCHAR(255) UNIQUE NOT NULL,
      //   content LONGTEXT NOT NULL,
      //   excerpt TEXT,
      //   author VARCHAR(100) NOT NULL,
      //   tags JSON,
      //   status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
      //   featuredImage VARCHAR(500),
      //   viewCount INT DEFAULT 0,
      //   commentCount INT DEFAULT 0,
      //   publishedAt TIMESTAMP NULL,
      //   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      //   INDEX idx_status (status),
      //   INDEX idx_author (author),
      //   INDEX idx_published (publishedAt),
      //   FULLTEXT KEY ft_idx (title, content, excerpt)
      // )${suffix}`
    ];

    // Execute table creation
    for (const tableQuery of tables) {
      await connection.query(tableQuery);
    }

    console.log('✅ All tables created successfully');

    // Default admin
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@kyc.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const [existingAdminRows] = await connection.query('SELECT id FROM users WHERE email = ? AND role = ?', [adminEmail, 'admin']);
    if (existingAdminRows.length === 0) {
      await connection.query('INSERT INTO users (fullName, email, password, role, status) VALUES (?, ?, ?, ?, ?)', ['System Administrator', adminEmail, hashedPassword, 'admin', 'active']);
      console.log('✅ Default admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Sample categories
    const categories = [
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Clothing', slug: 'clothing' },
      { name: 'Home & Garden', slug: 'home-garden' },
      { name: 'Sports & Outdoors', slug: 'sports-outdoors' }
    ];

    for (const category of categories) {
      const [existing] = await connection.query('SELECT id FROM categories WHERE slug = ?', [category.slug]);
      if (existing.length === 0) {
        await connection.query('INSERT INTO categories (name, slug) VALUES (?, ?)', [category.name, category.slug]);
      }
    }

    console.log('✅ Sample categories created');
    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = setupDatabase;

// seedDatabase.js
const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  let connection;

  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'ecommerce_admin';

  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: false
    });

    console.log('Connected to MySQL server');

    // Switch to the database (assumes DB already created)
    await connection.changeUser({ database: DB_NAME });
    console.log(`Using database ${DB_NAME}`);

    // Start transaction
    await connection.beginTransaction();
    console.log('Transaction started');

    const now = new Date();

    // ---------- USERS ----------
    const users = [
      { fullName: 'Amit Sharma', username: 'amit', email: 'amit@example.com', password: 'admin-pass-1', phone: '911234567890', role: 'admin', status: 'active', avatar: 'https://example.com/avatars/amit.jpg' },
      { fullName: 'Priya Patel', username: 'priya', email: 'priya@example.com', password: 'customer-pass-1', phone: '919876543210', role: 'customer', status: 'active', avatar: 'https://example.com/avatars/priya.jpg' },
      { fullName: 'Rohit Singh', username: 'rohit', email: 'rohit@example.com', password: 'customer-pass-2', phone: '919112223334', role: 'customer', status: 'active', avatar: null },
      { fullName: 'Sneha Verma', username: 'sneha', email: 'sneha@example.com', password: 'customer-pass-3', phone: '919998887776', role: 'customer', status: 'suspended', avatar: null },
      { fullName: 'KYC Reviewer', username: 'kyc_reviewer', email: 'reviewer@example.com', password: 'reviewer-pass', phone: null, role: 'admin', status: 'active', avatar: null }
    ];

    const userIdMap = {}; // map email -> id
    for (const u of users) {
      // check existence by email
      const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [u.email]);
      if (rows.length > 0) {
        userIdMap[u.email] = rows[0].id;
        console.log(`User exists: ${u.email} -> id ${rows[0].id}`);
        continue;
      }

      const hashed = await bcrypt.hash(u.password, 12);
      const [res] = await connection.execute(
        `INSERT INTO users (fullName, username, email, password, phone, role, status, avatar, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.fullName, u.username, u.email, hashed, u.phone, u.role, u.status, u.avatar, now, now]
      );
      userIdMap[u.email] = res.insertId;
      console.log(`Inserted user ${u.email} -> id ${res.insertId}`);
    }

    // ---------- CATEGORIES ----------
    const categories = [
      { name: 'Electronics', slug: 'electronics', description: 'All electronic gadgets and devices' },
      { name: 'Clothing', slug: 'clothing', description: 'Apparel for men and women' },
      { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Furniture and appliances' },
      { name: 'Accessories', slug: 'accessories', description: 'Small accessories and wallets' },
      { name: 'Gaming', slug: 'gaming', description: 'Gaming laptops, accessories and more', parentSlug: 'electronics' }
    ];

    const categoryIdMap = {}; // slug -> id
    for (const c of categories) {
      const [rows] = await connection.execute('SELECT id FROM categories WHERE slug = ?', [c.slug]);
      if (rows.length > 0) {
        categoryIdMap[c.slug] = rows[0].id;
        console.log(`Category exists: ${c.slug} -> id ${rows[0].id}`);
        continue;
      }

      // determine parentId if provided
      let parentId = null;
      if (c.parentSlug) {
        const [pRows] = await connection.execute('SELECT id FROM categories WHERE slug = ?', [c.parentSlug]);
        if (pRows.length > 0) parentId = pRows[0].id;
      }

      const [res] = await connection.execute(
        `INSERT INTO categories (name, slug, description, image, parentId, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [c.name, c.slug, c.description || null, null, parentId, now, now]
      );
      categoryIdMap[c.slug] = res.insertId;
      console.log(`Inserted category ${c.slug} -> id ${res.insertId}`);
    }

    // ---------- PRODUCTS ----------
    // sample product dataset (category referenced by slug)
    const products = [
      { name: 'Wireless Bluetooth Headphones', slug: 'wireless-bluetooth-headphones', sku: 'SKU-1001', description: 'High-quality over-ear wireless headphones with noise cancellation and 20 hours battery life.', shortDescription: 'Premium Bluetooth headphones with 20hr battery.', categorySlug: 'electronics', brand: 'Sony', price: 199.99, salePrice: 179.99, stockQuantity: 50, stockStatus: 'in_stock', weight: 0.5, dimensions: '20x15x8 cm', status: 'active', featured: 1, visibility: 'public', metaTitle: 'Bluetooth Headphones', metaDescription: 'Noise-cancelling wireless headphones.' },
      { name: 'Smartphone 5G Pro', slug: 'smartphone-5g-pro', sku: 'SKU-1002', description: 'Flagship smartphone with 5G support, AMOLED display and 128GB storage.', shortDescription: 'Latest-gen 5G smartphone.', categorySlug: 'electronics', brand: 'Samsung', price: 899.99, salePrice: 849.99, stockQuantity: 30, stockStatus: 'in_stock', weight: 0.2, dimensions: '15x7x0.8 cm', status: 'active', featured: 1, visibility: 'public', metaTitle: 'Smartphone 5G Pro', metaDescription: 'Fastest 5G smartphone.' },
      { name: 'Gaming Laptop Xtreme', slug: 'gaming-laptop-xtreme', sku: 'SKU-1003', description: 'High-performance gaming laptop with RTX graphics and 16GB RAM.', shortDescription: 'Ultimate gaming laptop for pros.', categorySlug: 'gaming', brand: 'Asus', price: 1499.99, salePrice: null, stockQuantity: 15, stockStatus: 'in_stock', weight: 2.5, dimensions: '38x26x2.5 cm', status: 'active', featured: 0, visibility: 'public', metaTitle: 'Gaming Laptop', metaDescription: 'Powerful gaming laptop with RTX.' },
      { name: 'Cotton T-Shirt', slug: 'cotton-tshirt', sku: 'SKU-1004', description: 'Comfortable cotton T-shirt available in multiple colors.', shortDescription: 'Soft cotton T-shirt.', categorySlug: 'clothing', brand: 'H&M', price: 19.99, salePrice: 14.99, stockQuantity: 200, stockStatus: 'in_stock', weight: 0.25, dimensions: '30x25x2 cm', status: 'active', featured: 0, visibility: 'public', metaTitle: 'Cotton T-Shirt', metaDescription: 'Soft cotton tee.' },
      { name: 'Denim Jeans', slug: 'denim-jeans', sku: 'SKU-1005', description: 'Stylish slim-fit denim jeans.', shortDescription: 'Slim-fit denim jeans for men.', categorySlug: 'clothing', brand: 'Levis', price: 49.99, salePrice: 39.99, stockQuantity: 120, stockStatus: 'in_stock', weight: 0.8, dimensions: '40x30x4 cm', status: 'active', featured: 0, visibility: 'public', metaTitle: 'Denim Jeans', metaDescription: 'Durable slim-fit jeans.' },
      { name: 'Microwave Oven 30L', slug: 'microwave-oven-30l', sku: 'SKU-1006', description: '30L microwave oven with grill and convection mode.', shortDescription: 'Smart convection microwave oven.', categorySlug: 'home-kitchen', brand: 'LG', price: 299.99, salePrice: 279.99, stockQuantity: 40, stockStatus: 'in_stock', weight: 12.0, dimensions: '45x35x30 cm', status: 'active', featured: 1, visibility: 'public', metaTitle: 'Microwave Oven 30L', metaDescription: 'Smart convection microwave.' },
      { name: 'Wooden Coffee Table', slug: 'wooden-coffee-table', sku: 'SKU-1007', description: 'Elegant wooden coffee table with storage.', shortDescription: 'Solid wood table with storage.', categorySlug: 'home-kitchen', brand: 'IKEA', price: 199.99, salePrice: 159.99, stockQuantity: 25, stockStatus: 'in_stock', weight: 20.0, dimensions: '100x60x45 cm', status: 'active', featured: 0, visibility: 'public', metaTitle: 'Wooden Coffee Table', metaDescription: 'Elegant coffee table.' },
      { name: 'Running Shoes', slug: 'running-shoes', sku: 'SKU-1008', description: 'Lightweight running shoes with breathable mesh and cushioned sole.', shortDescription: 'Sports running shoes.', categorySlug: 'clothing', brand: 'Nike', price: 89.99, salePrice: 69.99, stockQuantity: 100, stockStatus: 'in_stock', weight: 0.7, dimensions: '32x20x12 cm', status: 'active', featured: 1, visibility: 'public', metaTitle: 'Running Shoes', metaDescription: 'Lightweight running sneakers.' },
      { name: 'Smartwatch Series 5', slug: 'smartwatch-series-5', sku: 'SKU-1009', description: 'Smartwatch with heart rate monitor, GPS and sleep tracking.', shortDescription: 'Stylish smartwatch.', categorySlug: 'electronics', brand: 'Apple', price: 399.99, salePrice: 379.99, stockQuantity: 45, stockStatus: 'in_stock', weight: 0.15, dimensions: '4x4x1 cm', status: 'active', featured: 1, visibility: 'public', metaTitle: 'Smartwatch Series 5', metaDescription: 'Smartwatch with GPS.' },
      { name: 'Leather Wallet', slug: 'leather-wallet', sku: 'SKU-1010', description: 'Genuine leather wallet with RFID protection and multiple card slots.', shortDescription: 'RFID safe wallet.', categorySlug: 'accessories', brand: 'Fossil', price: 59.99, salePrice: 49.99, stockQuantity: 80, stockStatus: 'in_stock', weight: 0.2, dimensions: '12x10x2 cm', status: 'active', featured: 0, visibility: 'public', metaTitle: 'Leather Wallet', metaDescription: 'Stylish RFID leather wallet.' }
    ];

    const productIdMap = {}; // slug -> id
    for (const p of products) {
      const [existing] = await connection.execute('SELECT id FROM products WHERE slug = ?', [p.slug]);
      if (existing.length > 0) {
        productIdMap[p.slug] = existing[0].id;
        console.log(`Product exists: ${p.slug} -> id ${existing[0].id}`);
        continue;
      }

      const categoryId = categoryIdMap[p.categorySlug] || null;
      const [res] = await connection.execute(
        `INSERT INTO products
         (name, slug, sku, description, shortDescription, categoryId, brand, price, salePrice, stockQuantity, stockStatus, weight, dimensions, status, featured, visibility, metaTitle, metaDescription, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.name, p.slug, p.sku, p.description, p.shortDescription, categoryId, p.brand,
          p.price, p.salePrice, p.stockQuantity, p.stockStatus, p.weight, p.dimensions, p.status,
          p.featured, p.visibility, p.metaTitle, p.metaDescription, now, now
        ]
      );
      productIdMap[p.slug] = res.insertId;
      console.log(`Inserted product ${p.slug} -> id ${res.insertId}`);
    }

    // ---------- PRODUCT IMAGES ----------
    const productImages = [
      { productSlug: 'wireless-bluetooth-headphones', imageUrl: 'https://example.com/images/headphones1.jpg', publicId: 'img_1001_1', altText: 'Wireless Bluetooth Headphones - main', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'wireless-bluetooth-headphones', imageUrl: 'https://example.com/images/headphones2.jpg', publicId: 'img_1001_2', altText: 'Wireless Bluetooth Headphones - side', sortOrder: 2, isPrimary: 0 },
      { productSlug: 'smartphone-5g-pro', imageUrl: 'https://example.com/images/smartphone1.jpg', publicId: 'img_1002_1', altText: 'Smartphone 5G Pro - front', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'smartphone-5g-pro', imageUrl: 'https://example.com/images/smartphone2.jpg', publicId: 'img_1002_2', altText: 'Smartphone 5G Pro - back', sortOrder: 2, isPrimary: 0 },
      { productSlug: 'gaming-laptop-xtreme', imageUrl: 'https://example.com/images/laptop1.jpg', publicId: 'img_1003_1', altText: 'Gaming Laptop Xtreme - open', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'cotton-tshirt', imageUrl: 'https://example.com/images/tshirt1.jpg', publicId: 'img_1004_1', altText: 'Cotton T-Shirt - front', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'denim-jeans', imageUrl: 'https://example.com/images/jeans1.jpg', publicId: 'img_1005_1', altText: 'Denim Jeans - front', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'microwave-oven-30l', imageUrl: 'https://example.com/images/microwave1.jpg', publicId: 'img_1006_1', altText: 'Microwave Oven 30L', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'wooden-coffee-table', imageUrl: 'https://example.com/images/coffeetable1.jpg', publicId: 'img_1007_1', altText: 'Wooden Coffee Table', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'running-shoes', imageUrl: 'https://example.com/images/shoes1.jpg', publicId: 'img_1008_1', altText: 'Running Shoes - pair', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'smartwatch-series-5', imageUrl: 'https://example.com/images/smartwatch1.jpg', publicId: 'img_1009_1', altText: 'Smartwatch Series 5', sortOrder: 1, isPrimary: 1 },
      { productSlug: 'leather-wallet', imageUrl: 'https://example.com/images/wallet1.jpg', publicId: 'img_1010_1', altText: 'Leather Wallet - open', sortOrder: 1, isPrimary: 1 }
    ];

    for (const img of productImages) {
      const productId = productIdMap[img.productSlug];
      if (!productId) {
        console.warn(`Skipping image for unknown product slug: ${img.productSlug}`);
        continue;
      }
      // skip if same imageUrl already exists for that product
      const [rows] = await connection.execute('SELECT id FROM product_images WHERE productId = ? AND imageUrl = ?', [productId, img.imageUrl]);
      if (rows.length > 0) {
        console.log(`Image exists for productId ${productId} -> ${img.imageUrl}`);
        continue;
      }
      await connection.execute(
        `INSERT INTO product_images (productId, imageUrl, publicId, altText, sortOrder, isPrimary, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [productId, img.imageUrl, img.publicId, img.altText, img.sortOrder, img.isPrimary, now]
      );
      console.log(`Inserted image for productId ${productId}`);
    }

    // ---------- PRODUCT ATTRIBUTES ----------
    const productAttributes = [
      { productSlug: 'wireless-bluetooth-headphones', name: 'Color', value: 'Black' },
      { productSlug: 'wireless-bluetooth-headphones', name: 'Connectivity', value: 'Bluetooth 5.2' },
      { productSlug: 'smartphone-5g-pro', name: 'Storage', value: '128GB' },
      { productSlug: 'smartphone-5g-pro', name: 'RAM', value: '8GB' },
      { productSlug: 'gaming-laptop-xtreme', name: 'GPU', value: 'NVIDIA RTX 4060' },
      { productSlug: 'gaming-laptop-xtreme', name: 'RAM', value: '16GB' },
      { productSlug: 'cotton-tshirt', name: 'Material', value: '100% Cotton' },
      { productSlug: 'running-shoes', name: 'Size', value: '10 (US)' },
      { productSlug: 'smartwatch-series-5', name: 'Water Resistant', value: '5 ATM' },
      { productSlug: 'leather-wallet', name: 'Material', value: 'Genuine Leather' }
    ];

    for (const a of productAttributes) {
      const productId = productIdMap[a.productSlug];
      if (!productId) {
        console.warn(`Skipping attribute for unknown product slug: ${a.productSlug}`);
        continue;
      }
      // avoid duplicates (same name/value)
      const [rows] = await connection.execute('SELECT id FROM product_attributes WHERE productId = ? AND name = ? AND value = ?', [productId, a.name, a.value]);
      if (rows.length > 0) {
        console.log(`Attribute exists for productId ${productId}: ${a.name}=${a.value}`);
        continue;
      }
      await connection.execute(
        `INSERT INTO product_attributes (productId, name, value, createdAt)
         VALUES (?, ?, ?, ?)`,
        [productId, a.name, a.value, now]
      );
      console.log(`Inserted attribute for productId ${productId}: ${a.name}`);
    }

    // ---------- ORDERS ----------
    // We'll create a few orders linking existing users and products.
    // Note: shippingAddress and billingAddress are JSON fields.
    const orders = [
      {
        orderNumber: 'ORD-20251001-0001',
        customerEmail: 'priya@example.com',
        status: 'delivered',
        totalAmount: 269.98,
        subtotal: 249.98,
        taxAmount: 10.00,
        shippingAmount: 9.00,
        discountAmount: 0.00,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        shippingAddress: { name: 'Priya Patel', line1: 'Flat 12, MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN', phone: '919876543210' },
        billingAddress: { name: 'Priya Patel', line1: 'Flat 12, MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN' },
        orderDate: new Date('2025-10-01T10:15:00'),
        shippedDate: new Date('2025-10-02T09:00:00'),
        deliveredDate: new Date('2025-10-03T16:30:00'),
        notes: 'Leave at door if not available',
        items: [
          { productSlug: 'wireless-bluetooth-headphones', quantity: 1, price: 179.99 },
          { productSlug: 'leather-wallet', quantity: 1, price: 49.99 }
        ]
      },
      {
        orderNumber: 'ORD-20251002-0002',
        customerEmail: 'rohit@example.com',
        status: 'shipped',
        totalAmount: 1499.99,
        subtotal: 1499.99,
        taxAmount: 0.00,
        shippingAmount: 0.00,
        discountAmount: 0.00,
        paymentMethod: 'stripe',
        paymentStatus: 'paid',
        shippingAddress: { name: 'Rohit Singh', line1: 'House 5, Sector 12', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN', phone: '919112223334' },
        billingAddress: { name: 'Rohit Singh', line1: 'House 5, Sector 12', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
        orderDate: new Date('2025-10-02T11:30:00'),
        shippedDate: new Date('2025-10-03T08:00:00'),
        deliveredDate: null,
        notes: null,
        items: [
          { productSlug: 'gaming-laptop-xtreme', quantity: 1, price: 1499.99 }
        ]
      },
      {
        orderNumber: 'ORD-20251002-0003',
        customerEmail: 'priya@example.com',
        status: 'processing',
        totalAmount: 69.99,
        subtotal: 69.99,
        taxAmount: 0.00,
        shippingAmount: 0.00,
        discountAmount: 0.00,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        shippingAddress: { name: 'Priya Patel', line1: 'Flat 12, MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN', phone: '919876543210' },
        billingAddress: { name: 'Priya Patel', line1: 'Flat 12, MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN' },
        orderDate: new Date('2025-10-02T14:00:00'),
        shippedDate: null,
        deliveredDate: null,
        notes: null,
        items: [
          { productSlug: 'running-shoes', quantity: 1, price: 69.99 }
        ]
      },
      {
        orderNumber: 'ORD-20251003-0004',
        customerEmail: 'sneha@example.com',
        status: 'cancelled',
        totalAmount: 59.99,
        subtotal: 59.99,
        taxAmount: 0.00,
        shippingAmount: 0.00,
        discountAmount: 0.00,
        paymentMethod: 'razorpay',
        paymentStatus: 'failed',
        shippingAddress: { name: 'Sneha Verma', line1: 'Noida Sector 18', city: 'Noida', state: 'Uttar Pradesh', postalCode: '201301', country: 'IN', phone: '919998887776' },
        billingAddress: { name: 'Sneha Verma', line1: 'Noida Sector 18', city: 'Noida', state: 'Uttar Pradesh', postalCode: '201301', country: 'IN' },
        orderDate: new Date('2025-10-03T09:20:00'),
        shippedDate: null,
        deliveredDate: null,
        notes: 'Customer cancelled before processing',
        items: [
          { productSlug: 'leather-wallet', quantity: 1, price: 59.99 }
        ]
      }
    ];

    const orderIdMap = {}; // orderNumber -> id
    for (const o of orders) {
      // skip if orderNumber exists
      const [existing] = await connection.execute('SELECT id FROM orders WHERE orderNumber = ?', [o.orderNumber]);
      if (existing.length > 0) {
        orderIdMap[o.orderNumber] = existing[0].id;
        console.log(`Order exists: ${o.orderNumber} -> id ${existing[0].id}`);
        continue;
      }

      // find customerId
      const customerId = userIdMap[o.customerEmail];
      if (!customerId) {
        console.warn(`Skipping order ${o.orderNumber} because customer ${o.customerEmail} not found`);
        continue;
      }

      const [res] = await connection.execute(
        `INSERT INTO orders
          (orderNumber, customerId, status, totalAmount, subtotal, taxAmount, shippingAmount, discountAmount, paymentMethod, paymentStatus, shippingAddress, billingAddress, orderDate, shippedDate, deliveredDate, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          o.orderNumber, customerId, o.status, o.totalAmount, o.subtotal, o.taxAmount, o.shippingAmount, o.discountAmount,
          o.paymentMethod, o.paymentStatus, JSON.stringify(o.shippingAddress), JSON.stringify(o.billingAddress),
          o.orderDate, o.shippedDate, o.deliveredDate, o.notes, now, now
        ]
      );
      orderIdMap[o.orderNumber] = res.insertId;
      console.log(`Inserted order ${o.orderNumber} -> id ${res.insertId}`);

      // insert order items
      for (const it of o.items) {
        const productId = productIdMap[it.productSlug];
        if (!productId) {
          console.warn(`Skipping order item: product ${it.productSlug} not found`);
          continue;
        }
        await connection.execute(
          `INSERT INTO order_items (orderId, productId, productName, productSku, quantity, price, total, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [res.insertId, productId, it.productSlug.replace(/-/g, ' '), null, it.quantity, it.price, (it.price * it.quantity), now]
        );
      }
    }

    // ---------- REVIEWS ----------
    const reviews = [
      { productSlug: 'wireless-bluetooth-headphones', userEmail: 'priya@example.com', orderNumber: 'ORD-20251001-0001', rating: 5, title: 'Amazing sound', comment: 'These headphones have excellent noise cancellation and comfy pads.', productQualityRating: 5, shippingRating: 5, sellerRating: 5, status: 'approved', adminReply: null },
      { productSlug: 'gaming-laptop-xtreme', userEmail: 'rohit@example.com', orderNumber: 'ORD-20251002-0002', rating: 4, title: 'Great performance', comment: 'Runs AAA titles smoothly. Runs hot under heavy load.', productQualityRating: 4, shippingRating: 4, sellerRating: 4, status: 'approved', adminReply: null },
      { productSlug: 'leather-wallet', userEmail: 'priya@example.com', orderNumber: 'ORD-20251001-0001', rating: 4, title: 'Good wallet', comment: 'Nice leather and RFID protection works well.', productQualityRating: 4, shippingRating: 5, sellerRating: 4, status: 'approved', adminReply: 'Thanks for the review!' }
    ];

    for (const r of reviews) {
      const productId = productIdMap[r.productSlug];
      const userId = userIdMap[r.userEmail];
      const orderId = orderIdMap[r.orderNumber] || null;
      if (!productId || !userId) {
        console.warn(`Skipping review for product ${r.productSlug} or user ${r.userEmail} not found`);
        continue;
      }
      // avoid duplicate review by same user for same product + title
      const [rows] = await connection.execute('SELECT id FROM reviews WHERE productId = ? AND userId = ? AND title = ?', [productId, userId, r.title]);
      if (rows.length > 0) {
        console.log(`Review already exists: ${r.title} by ${r.userEmail}`);
        continue;
      }
      await connection.execute(
        `INSERT INTO reviews (productId, userId, orderId, rating, title, comment, productQualityRating, shippingRating, sellerRating, status, adminReply, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, userId, orderId, r.rating, r.title, r.comment, r.productQualityRating, r.shippingRating, r.sellerRating, r.status, r.adminReply, now, now]
      );
      console.log(`Inserted review: ${r.title} by ${r.userEmail}`);
    }

    // ---------- KYC APPLICATIONS ----------
    const kycApplications = [
      { applicationId: 'KYC-20251001-0001', userEmail: 'priya@example.com', documentType: 'aadhaar', documentNumber: 'XXXX-YYYY-ZZZZ', frontImageUrl: 'https://example.com/kyc/priya_aadhaar_front.jpg', backImageUrl: 'https://example.com/kyc/priya_aadhaar_back.jpg', selfieImageUrl: 'https://example.com/kyc/priya_selfie.jpg', status: 'accepted', reviewedByEmail: 'reviewer@example.com', submittedDate: new Date('2025-10-01T12:00:00'), reviewedDate: new Date('2025-10-02T10:00:00') },
      { applicationId: 'KYC-20251002-0002', userEmail: 'sneha@example.com', documentType: 'pan', documentNumber: 'ABCDE1234F', frontImageUrl: 'https://example.com/kyc/sneha_pan.jpg', backImageUrl: null, selfieImageUrl: 'https://example.com/kyc/sneha_selfie.jpg', status: 'pending', reviewedByEmail: null, submittedDate: new Date('2025-10-02T15:30:00'), reviewedDate: null }
    ];

    for (const app of kycApplications) {
      const userId = userIdMap[app.userEmail];
      const reviewedById = app.reviewedByEmail ? userIdMap[app.reviewedByEmail] : null;
      if (!userId) {
        console.warn(`Skipping KYC application ${app.applicationId} because user ${app.userEmail} not found`);
        continue;
      }
      const [rows] = await connection.execute('SELECT id FROM kyc_applications WHERE applicationId = ?', [app.applicationId]);
      if (rows.length > 0) {
        console.log(`KYC application exists: ${app.applicationId}`);
        continue;
      }
      await connection.execute(
        `INSERT INTO kyc_applications (applicationId, userId, documentType, documentNumber, frontImageUrl, backImageUrl, selfieImageUrl, status, rejectionReason, submittedDate, reviewedDate, reviewedBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
        [app.applicationId, userId, app.documentType, app.documentNumber, app.frontImageUrl, app.backImageUrl, app.selfieImageUrl, app.status, app.submittedDate, app.reviewedDate, reviewedById, now, now]
      );
      console.log(`Inserted KYC application ${app.applicationId}`);
    }

    // ---------- RETURN ORDERS ----------
    const returnOrders = [
      { returnId: 'RET-20251003-0001', orderNumber: 'ORD-20251001-0001', customerEmail: 'priya@example.com', productSlug: 'leather-wallet', quantity: 1, reason: 'Damaged on arrival', status: 'QC in Progress', refundAmount: 49.99, trackingNumber: 'TRACK12345', notes: 'Packaging torn', returnDate: new Date('2025-10-03T17:00:00') }
    ];

    for (const r of returnOrders) {
      const orderId = orderIdMap[r.orderNumber];
      const customerId = userIdMap[r.customerEmail];
      const productId = productIdMap[r.productSlug];
      if (!orderId || !customerId || !productId) {
        console.warn(`Skipping return order ${r.returnId} due to missing refs`);
        continue;
      }
      const [rows] = await connection.execute('SELECT id FROM return_orders WHERE returnId = ?', [r.returnId]);
      if (rows.length > 0) {
        console.log(`Return order exists: ${r.returnId}`);
        continue;
      }
      await connection.execute(
        `INSERT INTO return_orders (returnId, orderId, customerId, productId, quantity, reason, status, refundAmount, trackingNumber, notes, returnDate, processedDate, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [r.returnId, orderId, customerId, productId, r.quantity, r.reason, r.status, r.refundAmount, r.trackingNumber, r.notes, r.returnDate, now, now]
      );
      console.log(`Inserted return order ${r.returnId}`);
    }

    // ---------- BLOGS ----------
    const blogs = [
      { title: 'How to Choose the Right Headphones', slug: 'choose-right-headphones', content: '<p>Long guide on headphone types, ANC, battery life...</p>', excerpt: 'Guide to buying headphones', author: 'Amit Sharma', tags: ['audio','headphones','guide'], status: 'published', featuredImage: 'https://example.com/blogs/headphones.jpg', viewCount: 1200, commentCount: 5, publishedAt: new Date('2025-09-25T08:00:00') },
      { title: 'Top 10 Gaming Laptops in 2025', slug: 'top-10-gaming-laptops-2025', content: '<p>Roundup of the best gaming laptops...</p>', excerpt: 'Best gaming laptops list', author: 'Rohit Singh', tags: ['gaming','laptops','review'], status: 'published', featuredImage: 'https://example.com/blogs/gaming-laptops.jpg', viewCount: 2500, commentCount: 10, publishedAt: new Date('2025-09-28T10:00:00') },
      { title: 'Caring for Leather Wallets', slug: 'caring-leather-wallets', content: '<p>Tips to extend life of leather wallets...</p>', excerpt: 'Leather wallet care tips', author: 'Priya Patel', tags: ['leather','wallets','care'], status: 'published', featuredImage: 'https://example.com/blogs/leather-care.jpg', viewCount: 300, commentCount: 2, publishedAt: new Date('2025-10-01T09:00:00') }
    ];

    for (const b of blogs) {
      const [rows] = await connection.execute('SELECT id FROM blogs WHERE slug = ?', [b.slug]);
      if (rows.length > 0) {
        console.log(`Blog exists: ${b.slug}`);
        continue;
      }
      await connection.execute(
        `INSERT INTO blogs (title, slug, content, excerpt, author, tags, status, featuredImage, viewCount, commentCount, publishedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.title, b.slug, b.content, b.excerpt, b.author, JSON.stringify(b.tags), b.status, b.featuredImage, b.viewCount, b.commentCount, b.publishedAt, now, now]
      );
      console.log(`Inserted blog ${b.slug}`);
    }

    // commit transaction
    await connection.commit();
    console.log('Transaction committed — seeding complete ✅');

  } catch (error) {
    console.error('Seeding failed:', error);
    if (connection) {
      try {
        await connection.rollback();
        console.log('Transaction rolled back due to error');
      } catch (rbErr) {
        console.error('Rollback failed:', rbErr);
      }
    }
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding finished');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeding error (exiting):', err);
      process.exit(1);
    });
}

module.exports = seedDatabase;

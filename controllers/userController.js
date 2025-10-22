const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all customers with pagination and filters
// In your getCustomers function

const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [customers] = await pool.execute(
      `SELECT 
        u.*,
        COUNT(o.id) as totalOrders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.totalAmount ELSE 0 END), 0) as totalSpent,
        MAX(o.orderDate) as lastOrderDate
      FROM users u
      LEFT JOIN orders o ON u.id = o.customerId
      WHERE role = "customer"
      GROUP BY u.id
      ORDER BY u.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}`,
       // Make sure you're passing parameters as an array
    );

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       WHERE role = "customer"`,
      []  // Empty array for queries with no parameters
    );

    res.json({
      customers,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// Get single customer
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const [customers] = await pool.execute(
      `SELECT 
        u.*,
        COUNT(o.id) as totalOrders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.totalAmount ELSE 0 END), 0) as totalSpent,
        MAX(o.orderDate) as lastOrderDate
      FROM users u
      LEFT JOIN orders o ON u.id = o.customerId
      WHERE u.id = ? AND u.role = 'customer'
      GROUP BY u.id`,
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = customers[0];

    // Get recent orders
    const [recentOrders] = await pool.execute(
      'SELECT * FROM orders WHERE customerId = ? ORDER BY orderDate DESC LIMIT 5',
      [id]
    );

    // Calculate additional metrics
    customer.averageOrderValue = customer.totalOrders > 0 ? 
      (customer.totalSpent / customer.totalOrders) : 0;
    
    // Determine loyalty tier
    if (customer.totalSpent >= 5000) {
      customer.loyaltyTier = 'platinum';
    } else if (customer.totalSpent >= 2000) {
      customer.loyaltyTier = 'gold';
    } else if (customer.totalSpent >= 500) {
      customer.loyaltyTier = 'silver';
    } else {
      customer.loyaltyTier = 'bronze';
    }

    customer.recentOrders = recentOrders;
    delete customer.password;

    res.json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer'
    });
  }
};

// Update customer status
const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if customer exists
    const [existingCustomer] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND role = "customer"',
      [id]
    );

    if (existingCustomer.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update customer status
    await pool.execute(
      'UPDATE users SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    res.json({
      success: true,
      message: 'Customer status updated successfully'
    });

  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating customer status'
    });
  }
};

// Get customer statistics
const getCustomerStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalCustomers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeCustomers,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactiveCustomers,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspendedCustomers
      FROM users 
      WHERE role = 'customer'
    `);

    const [newCustomers] = await pool.execute(`
      SELECT COUNT(*) as newCustomers
      FROM users 
      WHERE role = 'customer' AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const [topCustomers] = await pool.execute(`
      SELECT 
        u.id,
        u.fullName,
        u.email,
        COUNT(o.id) as totalOrders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.totalAmount ELSE 0 END), 0) as totalSpent
      FROM users u
      LEFT JOIN orders o ON u.id = o.customerId
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY totalSpent DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        newCustomers: newCustomers[0].newCustomers,
        topCustomers: topCustomers
      }
    });

  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer statistics'
    });
  }
};

// Create customer (admin function)
const createCustomer = async (req, res) => {
  try {
    const { fullName, email, password, phone, username } = req.body;

    // Check if customer already exists
    const [existingCustomer] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username || email]
    );

    if (existingCustomer.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer already exists with this email or username'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create customer
    const [result] = await pool.execute(
      'INSERT INTO users (fullName, email, password, phone, username, role) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, email, hashedPassword, phone, username || email, 'customer']
    );

    // Get created customer
    const [newCustomer] = await pool.execute(
      'SELECT id, fullName, email, phone, username, role, status, createdAt FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: newCustomer[0]
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating customer'
    });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  updateCustomerStatus,
  getCustomerStats,
  createCustomer
};
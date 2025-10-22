const { pool } = require('../config/database');

// Get all orders with pagination and filters
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    const search = req.query.search || '';

    let whereConditions = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereConditions.push('o.status = ?');
      queryParams.push(status);
    }

    if (startDate) {
      whereConditions.push('DATE(o.orderDate) >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(o.orderDate) <= ?');
      queryParams.push(endDate);
    }

    if (search) {
      whereConditions.push('(o.orderNumber LIKE ? OR u.fullName LIKE ? OR u.email LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM orders o 
       LEFT JOIN users u ON o.customerId = u.id 
       ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get orders with customer info
    // CHANGE: Use template literals for LIMIT/OFFSET instead of placeholders
    const [orders] = await pool.execute(
      `SELECT 
        o.*,
        u.fullName as customerName,
        u.email as customerEmail,
        u.phone as customerPhone,
        (SELECT COUNT(*) FROM order_items WHERE orderId = o.id) as itemCount
      FROM orders o
      LEFT JOIN users u ON o.customerId = u.id
      ${whereClause}
      ORDER BY o.orderDate DESC
      LIMIT ${limit} OFFSET ${offset}`,
      queryParams  // Remove limit and offset from here
    );

    // Get order items for each order
    for (let order of orders) {
      const [items] = await pool.execute(
        'SELECT * FROM order_items WHERE orderId = ?',
        [order.id]
      );
      order.items = items;

      // Parse JSON fields
      if (order.shippingAddress) {
        try {
          order.shippingAddress = JSON.parse(order.shippingAddress);
        } catch (e) {
          order.shippingAddress = null;
        }
      }

      if (order.billingAddress) {
        try {
          order.billingAddress = JSON.parse(order.billingAddress);
        } catch (e) {
          order.billingAddress = null;
        }
      }
    }

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
};

const getOrdersByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM orders 
       WHERE customerId = ?`,
      [customerId]
    );

    const total = countResult[0].total;

    // Get orders for the specific customer
    // CHANGE: Use template literals for LIMIT/OFFSET instead of placeholders
    const [orders] = await pool.execute(
      `SELECT * 
       FROM orders 
       WHERE customerId = ? 
       ORDER BY orderDate DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      [customerId]  // Remove limit and offset from here
    );

    // Get order items for each order
    for (let order of orders) {
      const [items] = await pool.execute(
        'SELECT * FROM order_items WHERE orderId = ?',
        [order.id]
      );
      order.items = items;

      // Parse JSON fields
      if (order.shippingAddress) {
        try {
          order.shippingAddress = JSON.parse(order.shippingAddress);
        } catch (e) {
          order.shippingAddress = null;
        }
      }

      if (order.billingAddress) {
        try {
          order.billingAddress = JSON.parse(order.billingAddress);
        } catch (e) {
          order.billingAddress = null;
        }
      }
    }

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get orders by customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer orders'
    });
  }
};


// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await pool.execute(
      `SELECT 
        o.*,
        u.fullName as customerName,
        u.email as customerEmail,
        u.phone as customerPhone
      FROM orders o
      LEFT JOIN users u ON o.customerId = u.id
      WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orders[0];

    // Get order items
    const [items] = await pool.execute(
      `SELECT 
        oi.*,
        p.name as productName,
        p.sku as productSku
      FROM order_items oi
      LEFT JOIN products p ON oi.productId = p.id
      WHERE oi.orderId = ?`,
      [id]
    );

    order.items = items;

    // Parse JSON fields
    if (order.shippingAddress) {
      try {
        order.shippingAddress = JSON.parse(order.shippingAddress);
      } catch (e) {
        order.shippingAddress = null;
      }
    }

    if (order.billingAddress) {
      try {
        order.billingAddress = JSON.parse(order.billingAddress);
      } catch (e) {
        order.billingAddress = null;
      }
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if order exists
    const [existingOrder] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (existingOrder.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    const updateFields = ['status = ?', 'updatedAt = CURRENT_TIMESTAMP'];
    const updateParams = [status];

    // Set specific date fields based on status
    if (status === 'shipped') {
      updateFields.push('shippedDate = CURRENT_TIMESTAMP');
    } else if (status === 'delivered') {
      updateFields.push('deliveredDate = CURRENT_TIMESTAMP');
    }

    await pool.execute(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateParams, id]
    );

    // Get updated order
    const [updatedOrder] = await pool.execute(
      `SELECT 
        o.*,
        u.fullName as customerName,
        u.email as customerEmail
      FROM orders o
      LEFT JOIN users u ON o.customerId = u.id
      WHERE o.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder[0]
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
};

// Create order (for testing purposes)
const createOrder = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      customerId,
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes
    } = req.body;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const [product] = await connection.execute(
        'SELECT id, name, sku, price, stockQuantity FROM products WHERE id = ?',
        [item.productId]
      );

      if (product.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }

      const productData = product[0];
      
      if (productData.stockQuantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${productData.name}`
        });
      }

      const itemTotal = productData.price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: item.productId,
        productName: productData.name,
        productSku: productData.sku,
        quantity: item.quantity,
        price: productData.price,
        total: itemTotal
      });
    }

    const taxAmount = subtotal * 0.1; // 10% tax
    const shippingAmount = 50; // Fixed shipping
    const totalAmount = subtotal + taxAmount + shippingAmount;

    // Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        orderNumber, customerId, status, totalAmount, subtotal, 
        taxAmount, shippingAmount, paymentMethod, shippingAddress, 
        billingAddress, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber, customerId, 'pending', totalAmount, subtotal,
        taxAmount, shippingAmount, paymentMethod,
        JSON.stringify(shippingAddress), JSON.stringify(billingAddress), notes
      ]
    );

    const orderId = orderResult.insertId;

    // Create order items and update stock
    for (const item of validatedItems) {
      await connection.execute(
        `INSERT INTO order_items (
          orderId, productId, productName, productSku, quantity, price, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.productName, item.productSku, 
         item.quantity, item.price, item.total]
      );

      // Update product stock
      await connection.execute(
        'UPDATE products SET stockQuantity = stockQuantity - ? WHERE id = ?',
        [item.quantity, item.productId]
      );
    }

    await connection.commit();

    // Get created order
    const [newOrder] = await connection.execute(
      `SELECT 
        o.*,
        u.fullName as customerName,
        u.email as customerEmail
      FROM orders o
      LEFT JOIN users u ON o.customerId = u.id
      WHERE o.id = ?`,
      [orderId]
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  } finally {
    connection.release();
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders,
        SUM(CASE WHEN status = 'delivered' THEN totalAmount ELSE 0 END) as totalRevenue,
        AVG(CASE WHEN status = 'delivered' THEN totalAmount ELSE NULL END) as averageOrderValue
      FROM orders
    `);

    const [recentOrders] = await pool.execute(`
      SELECT COUNT(*) as recentOrders
      FROM orders 
      WHERE orderDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentOrders: recentOrders[0].recentOrders
      }
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order statistics'
    });
  }
};

module.exports = {
  getOrders,
  getOrdersByCustomer,
  getOrder,
  updateOrderStatus,
  createOrder,
  getOrderStats
};
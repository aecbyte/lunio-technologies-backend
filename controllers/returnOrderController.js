const { pool } = require('../config/database');

// Get all return orders with pagination and filters
const getReturnOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    let whereConditions = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereConditions.push('ro.status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push('(ro.returnId LIKE ? OR u.fullName LIKE ? OR u.phone LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (startDate) {
      whereConditions.push('DATE(ro.returnDate) >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(ro.returnDate) <= ?');
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM return_orders ro 
       LEFT JOIN users u ON ro.customerId = u.id 
       LEFT JOIN products p ON ro.productId = p.id
       ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get return orders with related data
    // USE pool.query() instead of pool.execute() for queries with LIMIT/OFFSET
    const [returnOrders] = await pool.query(
      `SELECT 
        ro.*,
        u.fullName as customerName,
        u.phone as customerPhone,
        u.email as customerEmail,
        p.name as productName,
        p.sku as productSku,
        o.orderNumber as originalOrderNumber
      FROM return_orders ro
      LEFT JOIN users u ON ro.customerId = u.id
      LEFT JOIN products p ON ro.productId = p.id
      LEFT JOIN orders o ON ro.orderId = o.id
      ${whereClause}
      ORDER BY ro.returnDate DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: returnOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get return orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching return orders'
    });
  }
};

// Get single return order
const getReturnOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [returnOrders] = await pool.execute(
      `SELECT 
        ro.*,
        u.fullName as customerName,
        u.phone as customerPhone,
        u.email as customerEmail,
        p.name as productName,
        p.sku as productSku,
        o.orderNumber as originalOrderNumber
      FROM return_orders ro
      LEFT JOIN users u ON ro.customerId = u.id
      LEFT JOIN products p ON ro.productId = p.id
      LEFT JOIN orders o ON ro.orderId = o.id
      WHERE ro.id = ?`,
      [id]
    );

    if (returnOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return order not found'
      });
    }

    res.json({
      success: true,
      data: returnOrders[0]
    });

  } catch (error) {
    console.error('Get return order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching return order'
    });
  }
};

// Create return order
const createReturnOrder = async (req, res) => {
  try {
    const {
      orderId,
      customerId,
      productId,
      quantity,
      reason,
      refundAmount,
      notes
    } = req.body;

    // Generate return ID
    const returnId = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Verify the original order exists
    const [originalOrder] = await pool.execute(
      'SELECT id, customerId FROM orders WHERE id = ?',
      [orderId]
    );

    if (originalOrder.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Original order not found'
      });
    }

    // Create return order
    const [result] = await pool.execute(
      `INSERT INTO return_orders (
        returnId, orderId, customerId, productId, quantity, 
        reason, refundAmount, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        returnId, orderId, customerId, productId, quantity,
        reason, refundAmount, notes, 'Return Initiated'
      ]
    );

    // Get created return order with related data
    const [newReturnOrder] = await pool.execute(
      `SELECT 
        ro.*,
        u.fullName as customerName,
        u.phone as customerPhone,
        p.name as productName
      FROM return_orders ro
      LEFT JOIN users u ON ro.customerId = u.id
      LEFT JOIN products p ON ro.productId = p.id
      WHERE ro.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Return order created successfully',
      data: newReturnOrder[0]
    });

  } catch (error) {
    console.error('Create return order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating return order'
    });
  }
};

// Update return order status
const updateReturnOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, notes } = req.body;

    // Check if return order exists
    const [existingOrder] = await pool.execute(
      'SELECT id FROM return_orders WHERE id = ?',
      [id]
    );

    if (existingOrder.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return order not found'
      });
    }

    // Update return order
    const updateFields = ['status = ?', 'updatedAt = CURRENT_TIMESTAMP'];
    const updateParams = [status];

    if (trackingNumber) {
      updateFields.push('trackingNumber = ?');
      updateParams.push(trackingNumber);
    }

    if (notes) {
      updateFields.push('notes = ?');
      updateParams.push(notes);
    }

    // Set processed date for completed statuses
    if (['Returned', 'Scrapped', 'Cancelled'].includes(status)) {
      updateFields.push('processedDate = CURRENT_TIMESTAMP');
    }

    await pool.execute(
      `UPDATE return_orders SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateParams, id]
    );

    // Get updated return order
    const [updatedOrder] = await pool.execute(
      `SELECT 
        ro.*,
        u.fullName as customerName,
        p.name as productName
      FROM return_orders ro
      LEFT JOIN users u ON ro.customerId = u.id
      LEFT JOIN products p ON ro.productId = p.id
      WHERE ro.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Return order status updated successfully',
      data: updatedOrder[0]
    });

  } catch (error) {
    console.error('Update return order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating return order status'
    });
  }
};

// Get return order statistics
const getReturnOrderStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalReturns,
        SUM(CASE WHEN status = 'Return Initiated' THEN 1 ELSE 0 END) as initiatedReturns,
        SUM(CASE WHEN status = 'Return in Progress' THEN 1 ELSE 0 END) as inProgressReturns,
        SUM(CASE WHEN status = 'QC in Progress' THEN 1 ELSE 0 END) as qcInProgressReturns,
        SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as completedReturns,
        SUM(CASE WHEN status = 'Scrapped' THEN 1 ELSE 0 END) as scrappedReturns,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledReturns,
        SUM(refundAmount) as totalRefundAmount,
        AVG(refundAmount) as averageRefundAmount
      FROM return_orders
    `);

    const [recentReturns] = await pool.execute(`
      SELECT COUNT(*) as recentReturns
      FROM return_orders 
      WHERE returnDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentReturns: recentReturns[0].recentReturns
      }
    });

  } catch (error) {
    console.error('Get return order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching return order statistics'
    });
  }
};

module.exports = {
  getReturnOrders,
  getReturnOrder,
  createReturnOrder,
  updateReturnOrderStatus,
  getReturnOrderStats
};
const { pool } = require('../config/database');

// Get all transactions for a customer
const getCustomerTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const transactionType = req.query.transactionType || '';

    let whereConditions = ['t.customerId = ?'];
    let queryParams = [customerId];

    if (status && status !== 'all') {
      whereConditions.push('t.status = ?');
      queryParams.push(status);
    }

    if (transactionType && transactionType !== 'all') {
      whereConditions.push('t.transactionType = ?');
      queryParams.push(transactionType);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM transactions t WHERE ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get transactions
    const [transactions] = await pool.execute(
      `SELECT
        t.*,
        u.fullName as customerName,
        u.email as customerEmail,
        o.orderNumber
      FROM transactions t
      LEFT JOIN users u ON t.customerId = u.id
      LEFT JOIN orders o ON t.orderId = o.id
      WHERE ${whereClause}
      ORDER BY t.createdAt DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get customer transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer transactions'
    });
  }
};

// Get all transactions (admin)
const getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const transactionType = req.query.transactionType || '';
    const paymentMethod = req.query.paymentMethod || '';
    const search = req.query.search || '';

    let whereConditions = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereConditions.push('t.status = ?');
      queryParams.push(status);
    }

    if (transactionType && transactionType !== 'all') {
      whereConditions.push('t.transactionType = ?');
      queryParams.push(transactionType);
    }

    if (paymentMethod && paymentMethod !== 'all') {
      whereConditions.push('t.paymentMethod = ?');
      queryParams.push(paymentMethod);
    }

    if (search) {
      whereConditions.push('(t.transactionId LIKE ? OR u.fullName LIKE ? OR u.email LIKE ? OR o.orderNumber LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM transactions t
       LEFT JOIN users u ON t.customerId = u.id
       LEFT JOIN orders o ON t.orderId = o.id
       ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get transactions
    const [transactions] = await pool.execute(
      `SELECT
        t.*,
        u.fullName as customerName,
        u.email as customerEmail,
        u.phone as customerPhone,
        o.orderNumber
      FROM transactions t
      LEFT JOIN users u ON t.customerId = u.id
      LEFT JOIN orders o ON t.orderId = o.id
      ${whereClause}
      ORDER BY t.createdAt DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
};

// Get single transaction
const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const [transactions] = await pool.execute(
      `SELECT
        t.*,
        u.fullName as customerName,
        u.email as customerEmail,
        u.phone as customerPhone,
        o.orderNumber,
        o.totalAmount as orderAmount
      FROM transactions t
      LEFT JOIN users u ON t.customerId = u.id
      LEFT JOIN orders o ON t.orderId = o.id
      WHERE t.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transactions[0]
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction'
    });
  }
};

// Create transaction
const createTransaction = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      customerId,
      orderId,
      amount,
      currency = 'USD',
      transactionType,
      paymentMethod,
      paymentGateway,
      gatewayTransactionId,
      description,
      metadata
    } = req.body;

    // Verify customer exists
    const [customers] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [customerId]
    );

    if (customers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // If orderId is provided, verify order exists
    if (orderId) {
      const [orders] = await connection.execute(
        'SELECT id FROM orders WHERE id = ?',
        [orderId]
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create transaction
    const [result] = await connection.execute(
      `INSERT INTO transactions (
        transactionId, customerId, orderId, amount, currency,
        transactionType, status, paymentMethod, paymentGateway,
        gatewayTransactionId, description, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, customerId, orderId, amount, currency,
        transactionType, 'pending', paymentMethod, paymentGateway,
        gatewayTransactionId, description, metadata ? JSON.stringify(metadata) : null
      ]
    );

    await connection.commit();

    // Get created transaction
    const [newTransaction] = await connection.execute(
      `SELECT
        t.*,
        u.fullName as customerName,
        u.email as customerEmail,
        o.orderNumber
      FROM transactions t
      LEFT JOIN users u ON t.customerId = u.id
      LEFT JOIN orders o ON t.orderId = o.id
      WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: newTransaction[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating transaction'
    });
  } finally {
    connection.release();
  }
};

// Update transaction status
const updateTransactionStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, failureReason, gatewayTransactionId, metadata } = req.body;

    // Check if transaction exists
    const [existingTransaction] = await connection.execute(
      'SELECT id, status, orderId FROM transactions WHERE id = ?',
      [id]
    );

    if (existingTransaction.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const previousStatus = existingTransaction[0].status;
    const orderId = existingTransaction[0].orderId;

    // Build update query
    const updateFields = ['status = ?', 'updatedAt = CURRENT_TIMESTAMP'];
    const updateParams = [status];

    if (failureReason) {
      updateFields.push('failureReason = ?');
      updateParams.push(failureReason);
    }

    if (gatewayTransactionId) {
      updateFields.push('gatewayTransactionId = ?');
      updateParams.push(gatewayTransactionId);
    }

    if (metadata) {
      updateFields.push('metadata = ?');
      updateParams.push(JSON.stringify(metadata));
    }

    // Update transaction
    await connection.execute(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateParams, id]
    );

    // Update related order payment status if applicable
    if (orderId && status === 'completed' && previousStatus !== 'completed') {
      await connection.execute(
        'UPDATE orders SET paymentStatus = "paid" WHERE id = ?',
        [orderId]
      );
    } else if (orderId && status === 'failed' && previousStatus !== 'failed') {
      await connection.execute(
        'UPDATE orders SET paymentStatus = "failed" WHERE id = ?',
        [orderId]
      );
    } else if (orderId && status === 'refunded' && previousStatus !== 'refunded') {
      await connection.execute(
        'UPDATE orders SET paymentStatus = "refunded" WHERE id = ?',
        [orderId]
      );
    }

    await connection.commit();

    // Get updated transaction
    const [updatedTransaction] = await connection.execute(
      `SELECT
        t.*,
        u.fullName as customerName,
        u.email as customerEmail,
        o.orderNumber
      FROM transactions t
      LEFT JOIN users u ON t.customerId = u.id
      LEFT JOIN orders o ON t.orderId = o.id
      WHERE t.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: updatedTransaction[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Update transaction status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating transaction status'
    });
  } finally {
    connection.release();
  }
};

// Process refund
const processRefund = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { transactionId, amount, reason } = req.body;

    // Get original transaction
    const [transactions] = await connection.execute(
      'SELECT * FROM transactions WHERE transactionId = ? AND status = "completed"',
      [transactionId]
    );

    if (transactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Completed transaction not found'
      });
    }

    const originalTransaction = transactions[0];

    // Validate refund amount
    if (amount > originalTransaction.amount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed original transaction amount'
      });
    }

    // Generate refund transaction ID
    const refundTransactionId = `RFND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create refund transaction
    const [result] = await connection.execute(
      `INSERT INTO transactions (
        transactionId, customerId, orderId, amount, currency,
        transactionType, status, paymentMethod, paymentGateway,
        gatewayTransactionId, description, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        refundTransactionId,
        originalTransaction.customerId,
        originalTransaction.orderId,
        amount,
        originalTransaction.currency,
        'refund',
        'completed',
        originalTransaction.paymentMethod,
        originalTransaction.paymentGateway,
        null,
        reason || 'Refund for transaction ' + transactionId,
        JSON.stringify({ originalTransactionId: transactionId })
      ]
    );

    // Update original transaction status if full refund
    if (amount === originalTransaction.amount) {
      await connection.execute(
        'UPDATE transactions SET status = "refunded" WHERE id = ?',
        [originalTransaction.id]
      );
    }

    await connection.commit();

    // Get created refund transaction
    const [refundTransaction] = await connection.execute(
      `SELECT
        t.*,
        u.fullName as customerName,
        u.email as customerEmail,
        o.orderNumber
      FROM transactions t
      LEFT JOIN users u ON t.customerId = u.id
      LEFT JOIN orders o ON t.orderId = o.id
      WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Refund processed successfully',
      data: refundTransaction[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing refund'
    });
  } finally {
    connection.release();
  }
};

// Get transaction statistics
const getTransactionStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTransactions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingTransactions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedTransactions,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refundedTransactions,
        SUM(CASE WHEN status = 'completed' AND transactionType = 'payment' THEN amount ELSE 0 END) as totalRevenue,
        SUM(CASE WHEN status = 'completed' AND transactionType = 'refund' THEN amount ELSE 0 END) as totalRefunds,
        AVG(CASE WHEN status = 'completed' AND transactionType = 'payment' THEN amount ELSE NULL END) as averageTransactionValue
      FROM transactions
    `);

    const [recentTransactions] = await pool.execute(`
      SELECT COUNT(*) as recentTransactions
      FROM transactions
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [paymentMethodStats] = await pool.execute(`
      SELECT
        paymentMethod,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as totalAmount
      FROM transactions
      WHERE transactionType = 'payment'
      GROUP BY paymentMethod
      ORDER BY totalAmount DESC
    `);

    const [transactionTypeStats] = await pool.execute(`
      SELECT
        transactionType,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as totalAmount
      FROM transactions
      GROUP BY transactionType
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentTransactions: recentTransactions[0].recentTransactions,
        paymentMethodStats: paymentMethodStats,
        transactionTypeStats: transactionTypeStats
      }
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction statistics'
    });
  }
};

module.exports = {
  getCustomerTransactions,
  getAllTransactions,
  getTransaction,
  createTransaction,
  updateTransactionStatus,
  processRefund,
  getTransactionStats
};

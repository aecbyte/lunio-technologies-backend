const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  updateOrderStatus,
  createOrder,
  getOrderStats,
  getOrdersByCustomer
} = require('../controllers/orderController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateOrderStatus, validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/orders
// @desc    Get all orders with pagination and filters
// @access  Private (Admin only)
router.get('/', verifyToken, requireAdmin, validatePagination, getOrders);

// @route   GET /api/v1/orders/:customerId
// @desc    Get all orders for a specific customer with pagination
// @access  Private
router.get('/:customerId', verifyToken, validatePagination, getOrdersByCustomer);

// @route   GET /api/v1/orders/stats
// @desc    Get order statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getOrderStats);

// @route   GET /api/v1/orders/:id
// @desc    Get single order
// @access  Private (Admin only)
router.get('/:id', verifyToken, requireAdmin, validateId, getOrder);

// @route   POST /api/v1/orders
// @desc    Create order (for testing)
// @access  Private
router.post('/', verifyToken, createOrder);

// @route   PUT /api/v1/orders/:id/status
// @desc    Update order status
// @access  Private (Admin only)
router.put(
  '/:id/status',
  verifyToken,
  requireAdmin,
  validateId,
  validateOrderStatus,
  updateOrderStatus
);

module.exports = router;
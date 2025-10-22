const express = require('express');
const router = express.Router();
const {
  getReturnOrders,
  getReturnOrder,
  createReturnOrder,
  updateReturnOrderStatus,
  getReturnOrderStats
} = require('../controllers/returnOrderController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/return-orders
// @desc    Get all return orders with pagination and filters
// @access  Private (Admin only)
router.get('/', verifyToken, requireAdmin, validatePagination, getReturnOrders);

// @route   GET /api/v1/return-orders/stats
// @desc    Get return order statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getReturnOrderStats);

// @route   GET /api/v1/return-orders/:id
// @desc    Get single return order
// @access  Private (Admin only)
router.get('/:id', verifyToken, requireAdmin, validateId, getReturnOrder);

// @route   POST /api/v1/return-orders
// @desc    Create return order
// @access  Private (Admin only)
router.post('/', verifyToken, requireAdmin, createReturnOrder);

// @route   PUT /api/v1/return-orders/:id/status
// @desc    Update return order status
// @access  Private (Admin only)
router.put('/:id/status', verifyToken, requireAdmin, validateId, updateReturnOrderStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  updateCustomerStatus,
  getCustomerStats,
  createCustomer
} = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateId, validatePagination, validateRegister } = require('../middleware/validation');

// @route   GET /api/v1/users/customers
// @desc    Get all customers with pagination and filters
// @access  Private (Admin only)
router.get('/customers', verifyToken, requireAdmin, validatePagination, getCustomers);

// @route   GET /api/v1/users/customers/stats
// @desc    Get customer statistics
// @access  Private (Admin only)
router.get('/customers/stats', verifyToken, requireAdmin, getCustomerStats);

// @route   POST /api/v1/users/customers
// @desc    Create customer (admin function)
// @access  Private (Admin only)
router.post('/customers', verifyToken, requireAdmin, validateRegister, createCustomer);

// @route   GET /api/v1/users/customers/:id
// @desc    Get single customer
// @access  Private (Admin only)
router.get('/customers/:id', verifyToken, requireAdmin, validateId, getCustomer);

// @route   PUT /api/v1/users/customers/:id/status
// @desc    Update customer status
// @access  Private (Admin only)
router.put('/customers/:id/status', verifyToken, requireAdmin, validateId, updateCustomerStatus);

module.exports = router;
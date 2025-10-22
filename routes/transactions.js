const express = require('express');
const router = express.Router();
const {
  getCustomerTransactions,
  getAllTransactions,
  getTransaction,
  createTransaction,
  updateTransactionStatus,
  processRefund,
  getTransactionStats
} = require('../controllers/transactionController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateTransaction, validateTransactionStatus, validateRefund, validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/transactions/stats
// @desc    Get transaction statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getTransactionStats);

// @route   GET /api/v1/transactions
// @desc    Get all transactions with pagination
// @access  Private (Admin only)
router.get('/', verifyToken, requireAdmin, validatePagination, getAllTransactions);

// @route   GET /api/v1/transactions/customer/:customerId
// @desc    Get all transactions for a specific customer
// @access  Private
router.get('/customer/:customerId', verifyToken, validateId, validatePagination, getCustomerTransactions);

// @route   GET /api/v1/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', verifyToken, validateId, getTransaction);

// @route   POST /api/v1/transactions
// @desc    Create new transaction
// @access  Private (Admin only)
router.post('/', verifyToken, requireAdmin, validateTransaction, createTransaction);

// @route   PUT /api/v1/transactions/:id/status
// @desc    Update transaction status
// @access  Private (Admin only)
router.put('/:id/status', verifyToken, requireAdmin, validateId, validateTransactionStatus, updateTransactionStatus);

// @route   POST /api/v1/transactions/refund
// @desc    Process refund
// @access  Private (Admin only)
router.post('/refund', verifyToken, requireAdmin, validateRefund, processRefund);

module.exports = router;

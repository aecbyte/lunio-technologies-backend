const express = require('express');
const router = express.Router();
const {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  getSupportTicketStats
} = require('../controllers/supportController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/support
// @desc    Get all support tickets with pagination and filters
// @access  Private (Admin only)
router.get('/', verifyToken, requireAdmin, validatePagination, getSupportTickets);

// @route   GET /api/v1/support/stats
// @desc    Get support ticket statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getSupportTicketStats);

// @route   POST /api/v1/support
// @desc    Create support ticket
// @access  Private
router.post('/', verifyToken, createSupportTicket);

// @route   PUT /api/v1/support/:id
// @desc    Update support ticket
// @access  Private (Admin only)
router.put('/:id', verifyToken, requireAdmin, validateId, updateSupportTicket);

module.exports = router;
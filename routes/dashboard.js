const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSalesAnalytics
} = require('../controllers/dashboardController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/v1/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getDashboardStats);

// @route   GET /api/v1/dashboard/analytics
// @desc    Get sales analytics
// @access  Private (Admin only)
router.get('/analytics', verifyToken, requireAdmin, getSalesAnalytics);

module.exports = router;
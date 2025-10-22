const express = require('express');
const router = express.Router();
const {
  getReviews,
  getReview,
  createReview,
  updateReviewStatus,
  deleteReview,
  getReviewStats
} = require('../controllers/reviewController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateReview, validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/reviews
// @desc    Get all reviews with pagination and filters
// @access  Private (Admin only)
router.get('/', validatePagination, getReviews);

// @route   GET /api/v1/reviews/stats
// @desc    Get review statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getReviewStats);

// @route   GET /api/v1/reviews/:id
// @desc    Get single review
// @access  Private (Admin only)
router.get('/:id', verifyToken, requireAdmin, validateId, getReview);

// @route   POST /api/v1/reviews
// @desc    Create review
// @access  Private (Customer only)
router.post('/', verifyToken, validateReview, createReview);

// @route   PUT /api/v1/reviews/:id/status
// @desc    Update review status
// @access  Private (Admin only)
router.put('/:id/status', verifyToken, requireAdmin, validateId, updateReviewStatus);

// @route   DELETE /api/v1/reviews/:id
// @desc    Delete review
// @access  Private (Admin only)
router.delete('/:id', verifyToken, requireAdmin, validateId, deleteReview);

module.exports = router;
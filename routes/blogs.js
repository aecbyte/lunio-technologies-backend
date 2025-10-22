const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats
} = require('../controllers/blogController');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validateBlog, validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/blogs
// @desc    Get all blogs with pagination and filters
router.get('/', optionalAuth, validatePagination, getBlogs);

// @route   GET /api/v1/blogs/stats
// @desc    Get blog statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getBlogStats);

// @route   GET /api/v1/blogs/:id
// @desc    Get single blog
// @access  Private (Admin only)
router.get('/:id', verifyToken, requireAdmin, validateId, getBlog);

// @route   POST /api/v1/blogs
// @desc    Create blog
// @access  Private (Admin only)
router.post('/', verifyToken, requireAdmin, validateBlog, createBlog);

// @route   PUT /api/v1/blogs/:id
// @desc    Update blog
// @access  Private (Admin only)
router.put('/:id', verifyToken, requireAdmin, validateId, validateBlog, updateBlog);

// @route   DELETE /api/v1/blogs/:id
// @desc    Delete blog
// @access  Private (Admin only)
router.delete('/:id', verifyToken, requireAdmin, validateId, deleteBlog);

module.exports = router;
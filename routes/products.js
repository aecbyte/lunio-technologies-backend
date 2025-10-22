const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} = require('../controllers/productController');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const { validateProduct, validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/products
// @desc    Get all products with pagination and filters
// @access  Public
router.get('/', validatePagination, optionalAuth, getProducts);

// @route   GET /api/v1/products/categories
// @desc    Get all categories
// @access  Public
router.get('/categories', getCategories);

// @route   GET /api/v1/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', validateId, optionalAuth, getProduct);

// @route   POST /api/v1/products
// @desc    Create product
// @access  Private (Admin only)
router.post(
  '/',
  verifyToken,
  requireAdmin,
  upload.array('images', 10),
  handleMulterError,
  validateProduct,
  createProduct
);

// @route   PUT /api/v1/products/:id
// @desc    Update product
// @access  Private (Admin only)
router.put(
  '/:id',
  verifyToken,
  requireAdmin,
  upload.array('images', 10),
  handleMulterError,
  validateId,
  validateProduct,
  updateProduct
);

// @route   DELETE /api/v1/products/:id
// @desc    Delete product
// @access  Private (Admin only)
router.delete('/:id', verifyToken, requireAdmin, validateId, deleteProduct);

module.exports = router;
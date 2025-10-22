const express = require('express');
const router = express.Router();
const {
  uploadProductImages,
  getProductImages,
  deleteProductImage,
  setPrimaryImage,
  updateImageOrder,
  updateImageAltText,
  deleteAllProductImages
} = require('../controllers/productImageController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const { validateImageUpload } = require('../middleware/imageValidation');

// ============================================
// PUBLIC ROUTES
// ============================================

// @route   GET /api/v1/products/:productId/images
// @desc    Get all images for a product
// @access  Public
router.get('/:productId/images', getProductImages);

// ============================================
// PROTECTED ROUTES (Admin Only)
// ============================================

// @route   POST /api/v1/products/:productId/images
// @desc    Upload images for a product
// @access  Private/Admin
// @body    {replaceAll: boolean, isPrimary: boolean}
// @files   Array of image files (max 10)
router.post(
  '/:productId/images',
  verifyToken,
  requireAdmin,
  upload.array('images', 10),
  handleMulterError,
  validateImageUpload,
  uploadProductImages
);

// @route   DELETE /api/v1/products/:productId/images/:imageId
// @desc    Delete a specific product image
// @access  Private/Admin
router.delete(
  '/:productId/images/:imageId',
  verifyToken,
  requireAdmin,
  deleteProductImage
);

// @route   DELETE /api/v1/products/:productId/images
// @desc    Delete all images for a product
// @access  Private/Admin
router.delete(
  '/:productId/images',
  verifyToken,
  requireAdmin,
  deleteAllProductImages
);

// @route   PUT /api/v1/products/:productId/images/:imageId/primary
// @desc    Set an image as primary
// @access  Private/Admin
router.put(
  '/:productId/images/:imageId/primary',
  verifyToken,
  requireAdmin,
  setPrimaryImage
);

// @route   PUT /api/v1/products/:productId/images/order
// @desc    Update image sort order
// @access  Private/Admin
// @body    {imageOrders: [{imageId: number, sortOrder: number}]}
router.put(
  '/:productId/images/order',
  verifyToken,
  requireAdmin,
  updateImageOrder
);

// @route   PUT /api/v1/products/:productId/images/:imageId/alt-text
// @desc    Update image alt text
// @access  Private/Admin
// @body    {altText: string}
router.put(
  '/:productId/images/:imageId/alt-text',
  verifyToken,
  requireAdmin,
  updateImageAltText
);

module.exports = router;
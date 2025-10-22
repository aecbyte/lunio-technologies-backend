const express = require('express');
const router = express.Router();
const {
  getCustomerAddresses,
  getAllAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAddressStats
} = require('../controllers/addressController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateAddress, validateId, validatePagination } = require('../middleware/validation');

// @route   GET /api/v1/addresses/stats
// @desc    Get address statistics
// @access  Private (Admin only)
router.get('/stats', verifyToken, requireAdmin, getAddressStats);

// @route   GET /api/v1/addresses
// @desc    Get all addresses with pagination
// @access  Private (Admin only)
router.get('/', verifyToken, requireAdmin, validatePagination, getAllAddresses);

// @route   GET /api/v1/addresses/customer/:customerId
// @desc    Get all addresses for a specific customer
// @access  Private
router.get('/:customerId', verifyToken, validateId, getCustomerAddresses);

// @route   GET /api/v1/addresses/:id
// @desc    Get single address
// @access  Private
router.get('/:id', verifyToken, validateId, getAddress);

// @route   POST /api/v1/addresses
// @desc    Create new address
// @access  Private
router.post('/', verifyToken, validateAddress, createAddress);

// @route   PUT /api/v1/addresses/:id
// @desc    Update address
// @access  Private
router.put('/:customerId', verifyToken, validateId, updateAddress);

// @route   PUT /api/v1/addresses/:id/set-default
// @desc    Set address as default
// @access  Private
router.patch('/:customerId/set-default', verifyToken, validateId, setDefaultAddress);

// @route   DELETE /api/v1/addresses/:id
// @desc    Delete address
// @access  Private
router.delete('/:id', verifyToken, validateId, deleteAddress);

module.exports = router;

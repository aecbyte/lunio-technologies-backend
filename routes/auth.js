const express = require('express');
const router = express.Router();
const {
  adminLogin,
  customerLogin,
  registerCustomer,
  getCurrentUser,
  logout
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');

// @route   POST /api/v1/auth/admin/login
// @desc    Admin login
// @access  Public
router.post('/admin/login', validateLogin, adminLogin);

// @route   POST /api/v1/auth/customer/login
// @desc    Customer login
// @access  Public
router.post('/customer/login', validateLogin, customerLogin);

// @route   POST /api/v1/auth/customer/register
// @desc    Register customer
// @access  Public
router.post('/customer/register', validateRegister, registerCustomer);

// @route   GET /api/v1/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', verifyToken, getCurrentUser);

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', verifyToken, logout);

module.exports = router;
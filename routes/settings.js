const express = require('express');
const router = express.Router();
const {
  updateProfile,
  changePassword,
  changeEmail,
  getSystemSettings,
  updateSystemSettings
} = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Profile update validation
const validateProfileUpdate = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

// Email change validation
const validateEmailChange = [
  body('newEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password is required'),
  handleValidationErrors
];

// @route   PUT /api/v1/settings/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', verifyToken, validateProfileUpdate, updateProfile);

// @route   PUT /api/v1/settings/password
// @desc    Change password
// @access  Private
router.put('/password', verifyToken, validatePasswordChange, changePassword);

// @route   PUT /api/v1/settings/email
// @desc    Change email
// @access  Private
router.put('/email', verifyToken, validateEmailChange, changeEmail);

// @route   GET /api/v1/settings/system
// @desc    Get system settings
// @access  Private (Admin only)
router.get('/system', verifyToken, requireAdmin, getSystemSettings);

// @route   PUT /api/v1/settings/system
// @desc    Update system settings
// @access  Private (Admin only)
router.put('/system', verifyToken, requireAdmin, updateSystemSettings);

module.exports = router;
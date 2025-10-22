const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Auth validation rules
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateRegister = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

// Product validation rules
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('sku')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('SKU must be between 2 and 100 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stockQuantity')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  handleValidationErrors
];

// Order validation rules
const validateOrderStatus = [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
  handleValidationErrors
];

// Review validation rules
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  body('productQualityRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Product quality rating must be between 1 and 5'),
  body('shippingRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Shipping rating must be between 1 and 5'),
  body('sellerRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Seller rating must be between 1 and 5'),
  handleValidationErrors
];

// KYC validation rules
const validateKYC = [
  body('documentType')
    .isIn(['aadhaar', 'pan', 'passport', 'driving_license', 'national_id'])
    .withMessage('Invalid document type'),
  body('documentNumber')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Document number must be between 5 and 100 characters'),
  handleValidationErrors
];


const validateAdminKYC = [
  body('documentType')
    .isIn(['aadhaar', 'pan', 'passport', 'driving_license'])
    .withMessage('Invalid document type'),
  body('documentNumber')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Document number must be between 5 and 100 characters'),
  body('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  body('userEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Admin notes must not exceed 500 characters'),
  handleValidationErrors
];

// Blog validation rules
const validateBlog = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters long'),
  body('excerpt')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Excerpt must be between 10 and 500 characters'),
  body('author')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Author name must be between 2 and 100 characters'),
  body('status')
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid blog status'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('featuredImage')
    .optional()
    .isURL()
    .withMessage('Featured image must be a valid URL'),
  handleValidationErrors
];

// Return order validation rules
const validateReturnOrder = [
  body('orderId')
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer'),
  body('customerId')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Return reason must be between 5 and 500 characters'),
  body('refundAmount')
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),
  handleValidationErrors
];

// Support ticket validation rules
const validateSupportTicket = [
  body('customerId')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Subject must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  handleValidationErrors
];

// Address validation rules
const validateAddress = [
  body('customerId')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  body('addressType')
    .isIn(['billing', 'shipping'])
    .withMessage('Address type must be either billing or shipping'),
  body('streetAddress')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Street address must be between 5 and 500 characters'),
  body('addressLine2')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must not exceed 255 characters'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('postalCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Postal code must be between 3 and 20 characters'),
  body('country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value'),
  handleValidationErrors
];

// Transaction validation rules
const validateTransaction = [
  body('customerId')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  body('orderId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('Currency must be between 3 and 10 characters'),
  body('transactionType')
    .isIn(['payment', 'refund', 'chargeback', 'adjustment', 'credit'])
    .withMessage('Invalid transaction type'),
  body('paymentMethod')
    .isIn(['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cash_on_delivery', 'bank_transfer'])
    .withMessage('Invalid payment method'),
  body('paymentGateway')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Payment gateway must not exceed 50 characters'),
  body('gatewayTransactionId')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Gateway transaction ID must not exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  handleValidationErrors
];

// Transaction status validation rules
const validateTransactionStatus = [
  body('status')
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid transaction status'),
  body('failureReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Failure reason must not exceed 500 characters'),
  body('gatewayTransactionId')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Gateway transaction ID must not exceed 255 characters'),
  handleValidationErrors
];

// Refund validation rules
const validateRefund = [
  body('transactionId')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Transaction ID must be between 5 and 100 characters'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  handleValidationErrors
];


// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('customerId')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

const validateIdAdmin = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateRegister,
  validateProduct,
  validateOrderStatus,
  validateReview,
  validateKYC,
  validateAdminKYC,
  validateBlog,
  validateReturnOrder,
  validateSupportTicket,
  validatePagination,
  validateId,
  validateIdAdmin,
  validateAddress,
  validateTransaction,
  validateTransactionStatus,
  validateRefund
};
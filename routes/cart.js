const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart
} = require('../controllers/cartController');

router.get('/', verifyToken, getCart);
router.post('/', verifyToken, addToCart);
router.put('/:id', verifyToken, updateCartItem);
router.delete('/:id', verifyToken, removeFromCart);
router.delete('/', verifyToken, clearCart);
router.post('/sync', verifyToken, syncCart);

module.exports = router;

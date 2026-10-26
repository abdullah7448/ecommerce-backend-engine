const express = require('express');
const {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// কার্টের সব রুটেই লগইন থাকা বাধ্যতামূলক (Protect Middleware)
router.use(protect);

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

router.route('/items/:itemId')
  .patch(updateCartItemQuantity)
  .delete(removeFromCart);

module.exports = router;
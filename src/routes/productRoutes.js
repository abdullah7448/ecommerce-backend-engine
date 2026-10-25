const express = require('express');
const { 
  createProduct, 
  getAllProducts 
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔓 Public Route: সবাই সব প্রোডাক্ট দেখতে পারবে
router.get('/', getAllProducts);

// 🔒 Protected & Authorized Route: শুধু 'vendor' বা 'shop_manager' প্রোডাক্ট আপলোড করতে পারবে
router.post(
  '/', 
  protect, 
  authorize('vendor', 'shop_manager'), 
  createProduct
);

module.exports = router;
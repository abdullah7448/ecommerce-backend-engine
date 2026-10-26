const express = require('express');
const {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔓 Public Routes (সবাই দেখতে পারবে)
router.get('/', getAllProducts);
router.get('/:id', getSingleProduct);

// 🔒 Protected & Authorized Routes (শুধু Vendor, Shop Manager এবং Admin এক্সেস পাবে)
router.post(
  '/',
  protect,
  authorize('vendor', 'shop_manager', 'admin'),
  createProduct
);

router.patch(
  '/:id',
  protect,
  authorize('vendor', 'shop_manager', 'admin'),
  updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('vendor', 'shop_manager', 'admin'),
  deleteProduct
);

module.exports = router;
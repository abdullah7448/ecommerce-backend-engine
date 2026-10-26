const express = require('express');
const {
  createOrder,
  getMyOrders,
  getVendorOrders,
  updateVendorOrderStatus,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

// 🛒 Customer Routes
router.post('/', authorize('customer'), createOrder);
router.get('/my-orders', authorize('customer'), getMyOrders);

// 📦 Vendor & Shop Manager Routes
router.get('/vendor-orders', authorize('vendor', 'shop_manager'), getVendorOrders);
router.patch('/:orderId/vendor-status', authorize('vendor', 'shop_manager'), updateVendorOrderStatus);

module.exports = router;
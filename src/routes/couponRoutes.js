const express = require('express');
const {
  createCoupon,
  applyCoupon,
  getAllCoupons,
  deleteCoupon,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

// 🛒 কাস্টমার কুপন অ্যাপ্লাই করার রুট
router.post('/apply', authorize('customer'), applyCoupon);

// 👑 অ্যাডমিন ও ভেন্ডরদের কুপন ম্যানেজমেন্ট রুট
router.post('/', authorize('admin', 'vendor'), createCoupon);
router.get('/', authorize('admin', 'vendor'), getAllCoupons);
router.delete('/:id', authorize('admin', 'vendor'), deleteCoupon);

module.exports = router;
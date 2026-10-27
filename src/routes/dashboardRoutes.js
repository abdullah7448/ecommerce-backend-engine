const express = require('express');
const {
  getVendorDashboardStats,
  getAdminDashboardStats,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

// 🛍️ ভেন্ডর ও শপ ম্যানেজার ড্যাশবোর্ড স্ট্যাটস
router.get('/vendor', authorize('vendor', 'shop_manager'), getVendorDashboardStats);

// 👑 সিস্টেম অ্যাডমিন ড্যাশবোর্ড স্ট্যাটস
router.get('/admin', authorize('admin'), getAdminDashboardStats);

module.exports = router;
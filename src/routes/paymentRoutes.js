const express = require('express');
const {
  initPayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// 💳 ১. অনলাইন পেমেন্ট শুরু করার জন্য (Customer Only & Protected)
router.post('/init', protect, authorize('customer'), initPayment);

// 🔄 ২. SSLCommerz গেটওয়ে থেকে পেমেন্টের রেজাল্ট ব্যাক পাওয়ার জন্য (Public Webhooks/Callbacks)
router.post('/success/:tran_id', paymentSuccess);
router.post('/fail/:tran_id', paymentFail);
router.post('/cancel/:tran_id', paymentCancel);

module.exports = router;
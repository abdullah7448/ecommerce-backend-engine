const express = require('express');
const {
  createReview,
  getProductReviews,
  deleteReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// mergeParams: true দিয়ে প্রোডাক্ট রুটের সাথে নেস্টেড রুট হিসেবে কাজ করানো যাবে
const router = express.Router({ mergeParams: true });

// 🔓 Public: যেকোনো প্রোডাক্টের রিভিউ দেখা
router.get('/', getProductReviews);

// 🔒 Protected & Authorized
router.post('/', protect, authorize('customer'), createReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
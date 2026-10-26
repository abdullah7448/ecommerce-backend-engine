const express = require('express');
const {
  registerCustomer,
  registerVendor,
  createShopManager,
  getMyShopManagers,
  updateShopManager,
  removeShopManager,
  loginUser,
  updateProfile,
  updatePassword,
  getUserProfile,
  getAllVendors,
  verifyVendor,
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔓 Public Routes
router.post('/register-customer', registerCustomer); // সাধারণ কাস্টমার সাইনআপ
router.post('/register-vendor', registerVendor);     // ভেন্ডর ডিরেক্ট সাইনআপ (শপের তথ্যসহ)
router.post('/login', loginUser);                    // সবার কমন লগইন

// 🔒 Protected Routes (লগইন করা ইউজারদের জন্য)
router.get('/profile', protect, getUserProfile);
router.patch('/update-profile', protect, updateProfile);
router.patch('/update-password', protect, updatePassword);

// --- Shop Manager Management Routes (Only for Vendors) ---
router.post('/shop-managers', protect, authorize('vendor'), createShopManager);
router.get('/shop-managers', protect, authorize('vendor'), getMyShopManagers);
router.patch('/shop-managers/:id', protect, authorize('vendor'), updateShopManager);
router.delete('/shop-managers/:id', protect, authorize('vendor'), removeShopManager);

// 🛡️ Admin Only Routes (ভেন্ডর ম্যানেজমেন্ট)
router.get('/vendors', protect, authorize('admin'), getAllVendors);
router.patch('/vendors/:id/verify', protect, authorize('admin'), verifyVendor);

module.exports = router;
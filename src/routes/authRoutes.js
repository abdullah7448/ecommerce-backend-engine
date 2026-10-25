const express = require('express');
const { registerUser,
        loginUser, 
        getUserProfile, 
        getAllVendors,
        verifyVendor ,
        updateUserRole,
        applyForVendor,
        approveVendorApplication,
    } = require('../controllers/authController');
const { protect , authorize} = require('../middlewares/authMiddleware');

const router = express.Router();

// Register Route: POST /api/v1/auth/register
router.post('/register', registerUser);

// Login Route: POST /api/v1/auth/login
router.post('/login', loginUser);

router.get('/profile', protect, getUserProfile);
router.post('/apply-vendor', protect, applyForVendor);


// 🛡️ Admin Only Vendor Management Routes
router.get('/vendors', protect, authorize('admin'), getAllVendors);
router.patch('/users/:id/role', protect, authorize('admin'), updateUserRole);
router.patch('/vendors/:id/verify', protect, authorize('admin'), verifyVendor);
router.patch('/vendor-applications/:id', protect, authorize('admin'), approveVendorApplication);

module.exports = router;
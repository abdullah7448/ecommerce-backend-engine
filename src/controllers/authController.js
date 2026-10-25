const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ১. চেক করা এই ইমেইলে অলরেডি কোনো ইউজার আছে কি না
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'User already exists with this email',
      });
    }

    // ২. নতুন ইউজার তৈরি করা (মডেলের pre('save') হুক অটোমেটিক পাসওয়ার্ড হ্যাশ করে নেবে)
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    if (user) {
      // ৩. টোকেন জেনারেট করা
      const token = generateToken(user._id, user.role);

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        token,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      res.status(400).json({ status: 'fail', message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ১. ইমেইল দিয়ে ইউজার খোঁজা এবং পাসওয়ার্ড ফিল্ডটি সিলেক্ট করা (যেহেতু মডেলে select: false করা ছিল)
    const user = await User.findOne({ email }).select('+password');

    // ২. ইউজার আছে কি না এবং পাসওয়ার্ড মিলে কি না চেক করা
    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id, user.role);

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        token,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private (Needs Token)
const getUserProfile = async (req, res) => {
  try {
    // req.user মিডলওয়্যার থেকে অলরেডি পাওয়া যাচ্ছে
    const user = req.user;

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get all vendors (Admin Only)
// @route   GET /api/v1/auth/vendors
// @access  Private/Admin
const getAllVendors = async (req, res) => {
  try {
    // শুধু যাদের রোল 'vendor' তাদের খুঁজে বের করা
    const vendors = await User.find({ role: 'vendor' }).select('-password');
    
    res.status(200).json({
      status: 'success',
      results: vendors.length,
      data: { vendors },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Verify or approve a vendor (Admin Only)
// @route   PATCH /api/v1/auth/vendors/:id/verify
// @access  Private/Admin
const verifyVendor = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        status: 'fail',
        message: 'Vendor not found with this ID',
      });
    }

    // ভেরিফিকেশন স্ট্যাটাস টগল বা ট্রু করা
    vendor.isVerified = true;
    await vendor.save();

    res.status(200).json({
      status: 'success',
      message: `Vendor '${vendor.name}' has been verified successfully!`,
      data: { 
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        role: vendor.role,
        isVerified: vendor.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update user role & verification status (Admin Only)
// @route   PATCH /api/v1/auth/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { role, isVerified } = req.body;

    // ১. রোল ভ্যালিডেশন (সঠিক রোল পাঠানো হয়েছে কি না)
    if (role && !['customer', 'vendor', 'shop_manager', 'admin'].includes(role)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid role type' });
    }

    // ২. আপডেট করার জন্য অবজেক্ট তৈরি
    const updateData = {};
    if (role) updateData.role = role;
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;

    // ৩. ডেটাবেসে ইউজার খুঁজে আপডেট করা
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      message: `User role updated successfully to '${user.role}'`,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Apply to become a vendor
// @route   POST /api/v1/auth/apply-vendor
// @access  Private (LoggedIn Users)
const applyForVendor = async (req, res) => {
  try {
    const { shopName, shopDescription, shopAddress, businessLicense, bankAccount } = req.body;

    const user = await User.findById(req.user._id);

    if (user.role === 'vendor') {
      return res.status(400).json({ status: 'fail', message: 'You are already a vendor.' });
    }

    if (user.vendorApplicationStatus === 'pending') {
      return res.status(400).json({ status: 'fail', message: 'Your vendor application is already under review.' });
    }

    // শপের তথ্য এবং আবেদনের স্ট্যাটাস সেভ করা
    user.shopDetails = {
      shopName,
      shopDescription,
      shopAddress,
      businessLicense,
      bankAccount,
    };
    user.vendorApplicationStatus = 'pending';

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Vendor application submitted successfully! Waiting for admin approval.',
      data: {
        vendorApplicationStatus: user.vendorApplicationStatus,
        shopDetails: user.shopDetails,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Approve or Reject Vendor Application (Admin Only)
// @route   PATCH /api/v1/auth/vendor-applications/:id
// @access  Private/Admin
const approveVendorApplication = async (req, res) => {
  try {
    const { status } = req.body; // status: 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ status: 'fail', message: 'Status must be approved or rejected' });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.vendorApplicationStatus !== 'pending') {
      return res.status(404).json({ status: 'fail', message: 'No pending vendor application found for this user.' });
    }

    if (status === 'approved') {
      user.role = 'vendor';
      user.isVerified = true;
      user.vendorApplicationStatus = 'approved';
    } else {
      user.vendorApplicationStatus = 'rejected';
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: `Vendor application has been ${status}.`,
      data: {
        userId: user._id,
        role: user.role,
        isVerified: user.isVerified,
        vendorApplicationStatus: user.vendorApplicationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// module.exports-এ getUserProfile যুক্ত করে দিন
module.exports = {
  registerUser,
  loginUser,
  getUserProfile, 
  getAllVendors,
  verifyVendor,
  updateUserRole,
  applyForVendor,
  approveVendorApplication,
};

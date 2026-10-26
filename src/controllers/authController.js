const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// @desc    Register a normal Customer
// @route   POST /api/v1/auth/register-customer
// @access  Public
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: 'fail', message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      roles: ['customer'], // ডিফল্ট রোল কাস্টমার
      isVerified: true,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'Customer registered successfully',
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Register as a Vendor (Direct Vendor Signup with Shop Details)
// @route   POST /api/v1/auth/register-vendor
// @access  Public
const registerVendor = async (req, res) => {
  try {
    const { name, email, password, shopName, shopDescription, shopAddress, businessLicense, bankAccount } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: 'fail', message: 'User already exists with this email' });
    }

    // ভেন্ডর রেজিস্টার করলে roles অ্যারেতে 'customer' এবং 'vendor' দুটোই থাকতে পারে, 
    // যাতে সে কেনাকাটাও করতে পারে আবার বিক্রিও করতে পারে!
    const vendor = await User.create({
      name,
      email,
      password,
      roles: ['customer', 'vendor'], 
      isVerified: false, // অ্যাডমিন ভেরিফাই না করা পর্যন্ত ফলস থাকবে
      shopDetails: {
        shopName,
        shopDescription,
        shopAddress,
        businessLicense,
        bankAccount,
      },
    });

    const token = generateToken(vendor._id);

    res.status(201).json({
      status: 'success',
      message: 'Vendor registered successfully! Waiting for admin verification.',
      token,
      data: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        roles: vendor.roles,
        isVerified: vendor.isVerified,
        shopDetails: vendor.shopDetails,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Create a Shop Manager for a Vendor
// @route   POST /api/v1/auth/create-shop-manager
// @access  Private (Vendor Only)
const createShopManager = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ১. রিকোয়েস্ট পাঠানো ইউজার আসলেই ভেন্ডর কি না এবং সে ভেরিফাইড কি না চেক করা
    if (!req.user.roles.includes('vendor')) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only vendors can create shop managers.',
      });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({
        status: 'fail',
        message: 'Your vendor account must be verified by admin before adding managers.',
      });
    }

    // ২. ইমেইল অলরেডি এক্সিস্ট করে কি না চেক করা
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'A user with this email already exists',
      });
    }

    // ৩. শপ ম্যানেজার তৈরি করা
    const shopManager = await User.create({
      name,
      email,
      password,
      roles: ['shop_manager'], // রোল শপ ম্যানেজার
      parentVendor: req.user._id, // কার আন্ডারে কাজ করবে, তার আইডি
      isVerified: true, // স্টাফ বা ম্যানেজারদের আলাদা ভেরিফিকেশন লাগে না
    });

    res.status(201).json({
      status: 'success',
      message: 'Shop manager created successfully!',
      data: {
        _id: shopManager._id,
        name: shopManager.name,
        email: shopManager.email,
        roles: shopManager.roles,
        parentVendor: shopManager.parentVendor,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get all shop managers of the logged-in vendor
// @route   GET /api/v1/auth/shop-managers
// @access  Private (Vendor Only)
const getMyShopManagers = async (req, res) => {
  try {
    const managers = await User.find({
      parentVendor: req.user._id,
      roles: 'shop_manager',
    }).select('-password');

    res.status(200).json({
      status: 'success',
      results: managers.length,
      data: { managers },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update Shop Manager details or status (Vendor Only)
// @route   PATCH /api/v1/auth/shop-managers/:id
// @access  Private (Vendor Only)
const updateShopManager = async (req, res) => {
  try {
    const managerId = req.params.id;
    const { name, email, isActive } = req.body;

    const manager = await User.findById(managerId);

    if (!manager || !manager.roles.includes('shop_manager')) {
      return res.status(404).json({ status: 'fail', message: 'Shop manager not found' });
    }

    // সিকিউরিটি চেক: এই ম্যানেজার কি আসলেই এই ভেন্ডরের আন্ডারে?
    if (manager.parentVendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Unauthorized action' });
    }

    if (name) manager.name = name;
    if (email) manager.email = email;
    if (typeof isActive === 'boolean') manager.isActive = isActive; // ইউজার মডেলে isActive ফিল্ড থাকলে কাজ করবে

    await manager.save();

    res.status(200).json({
      status: 'success',
      message: 'Shop manager updated successfully',
      data: { manager },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Remove (Fire) a Shop Manager (Vendor Only)
// @route   DELETE /api/v1/auth/shop-managers/:id
// @access  Private (Vendor Only)
const removeShopManager = async (req, res) => {
  try {
    const managerId = req.params.id;

    const manager = await User.findById(managerId);

    if (!manager || !manager.roles.includes('shop_manager')) {
      return res.status(404).json({ status: 'fail', message: 'Shop manager not found' });
    }

    // সিকিউরিটি চেক
    if (manager.parentVendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'Unauthorized action' });
    }

    await User.findByIdAndDelete(managerId);

    res.status(200).json({
      status: 'success',
      message: 'Shop manager removed (fired) successfully',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update user profile (Name, Email)
// @route   PATCH /api/v1/auth/update-profile
// @access  Private (All Logged-in Users)
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) {
      // ইমেইল চেঞ্জ করতে চাইলে সেটি অলরেডি অন্য কেউ ব্যবহার করছে কি না চেক করা
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({ status: 'fail', message: 'Email is already in use' });
      }
      user.email = email;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        roles: updatedUser.roles,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update password
// @route   PATCH /api/v1/auth/update-password
// @access  Private (All Logged-in Users)
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'fail', message: 'Please provide current and new passwords' });
    }

    // পাসওয়ার্ডসহ ইউজারকে খোঁজা (যেহেতু মডেলে select: false করা আছে)
    const user = await User.findById(req.user._id).select('+password');

    // বর্তমান পাসওয়ার্ড সঠিক কি না চেক করা
    const isMatched = await user.matchPassword(currentPassword);
    if (!isMatched) {
      return res.status(401).json({ status: 'fail', message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ status: 'fail', message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword; // মডেলের pre-save হুক নিজে থেকেই এটি হ্যাশ করে নেবে
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      status: 'success',
      data: { user },
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
    // যাদের roles অ্যারেতে 'vendor' আছে তাদের খুঁজে বের করা
    const vendors = await User.find({ roles: 'vendor' }).select('-password');
    res.status(200).json({
      status: 'success',
      results: vendors.length,
      data: { vendors },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Verify Vendor Account (Admin Only)
// @route   PATCH /api/v1/auth/vendors/:id/verify
// @access  Private/Admin
const verifyVendor = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);

    if (!vendor || !vendor.roles.includes('vendor')) {
      return res.status(404).json({ status: 'fail', message: 'Vendor not found' });
    }

    vendor.isVerified = true;
    await vendor.save();

    res.status(200).json({
      status: 'success',
      message: `Vendor '${vendor.shopDetails.shopName || vendor.name}' has been verified successfully!`,
      data: { vendor },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
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
};
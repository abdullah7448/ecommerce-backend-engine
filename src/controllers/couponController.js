const Coupon = require('../models/couponModel');
const Cart = require('../models/cartModel');

// @desc    Create a new coupon
// @route   POST /api/v1/coupons
// @access  Private (Admin / Vendor)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      expirationDate,
      usageLimit,
    } = req.body;

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ status: 'fail', message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount,
      expirationDate,
      usageLimit,
      createdBy: req.user._id,
    });

    res.status(201).json({
      status: 'success',
      message: 'Coupon created successfully',
      data: { coupon },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/v1/coupons/apply
// @access  Private (Customer Only)
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({ status: 'fail', message: 'Coupon code is required' });
    }

    // ১. কুপন চেক করা
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ status: 'fail', message: 'Invalid or expired coupon code' });
    }

    // ২. মেয়াদ চেক করা
    if (new Date(coupon.expirationDate) < new Date()) {
      return res.status(400).json({ status: 'fail', message: 'Coupon has expired' });
    }

    // ৩. ব্যবহারের লিমিট চেক করা
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ status: 'fail', message: 'Coupon usage limit reached' });
    }

    // ৪. কাস্টমারের কার্ট চেক করা
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Your cart is empty' });
    }

    // ৫. মিনিমাম অর্ডার অ্যামাউন্ট চেক করা
    if (cart.totalPrice < coupon.minOrderAmount) {
      return res.status(400).json({
        status: 'fail',
        message: `Minimum order amount for this coupon is ${coupon.minOrderAmount} BDT`,
      });
    }

    // ৬. ডিসকাউন্ট হিসেব করা
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (cart.totalPrice * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    }

    const finalPrice = Math.max(0, cart.totalPrice - discountAmount);

    res.status(200).json({
      status: 'success',
      message: 'Coupon applied successfully',
      data: {
        couponCode: coupon.code,
        originalTotalPrice: cart.totalPrice,
        discountAmount,
        finalPrice,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get all coupons
// @route   GET /api/v1/coupons
// @access  Private (Admin / Vendor)
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt');
    res.status(200).json({
      status: 'success',
      results: coupons.length,
      data: { coupons },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private (Admin / Vendor)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ status: 'fail', message: 'Coupon not found' });
    }
    res.status(200).json({ status: 'success', message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createCoupon,
  applyCoupon,
  getAllCoupons,
  deleteCoupon,
};
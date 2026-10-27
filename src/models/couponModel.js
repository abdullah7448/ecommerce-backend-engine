const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'], // পার্সেন্টেজ (যেমন 10%) নাকি ফিক্সড টাকা (যেমন 100 BDT)
      required: true,
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
    },
    minOrderAmount: {
      type: Number,
      default: 0, // কুপন ব্যবহারের জন্য সর্বনিম্ন কত টাকার অর্ডার করতে হবে
    },
    maxDiscountAmount: {
      type: Number, // পার্সেন্টেজ ডিসকাউন্টের ক্ষেত্রে সর্বোচ্চ কত টাকা ছাড় পাবে
    },
    expirationDate: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    usageLimit: {
      type: Number,
      default: null, // মোট কতবার কুপনটি ব্যবহার করা যাবে (null = unlimited)
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // কুপনটি কে তৈরি করেছে (Admin অথবা Specific Vendor)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
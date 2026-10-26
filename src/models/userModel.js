const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // সিকিউরিটির জন্য ডিফল্টভাবে হাইড থাকবে
    },
    
    // 🌟 ১. মাল্টি-রোল সিস্টেম (অ্যারে): একজন ইউজার একই সাথে কাস্টমার ও ভেন্ডর হতে পারবে
    roles: {
      type: [{
        type: String,
        enum: ['customer', 'vendor', 'shop_manager', 'admin']
      }],
      default: ['customer'] // নতুন রেজিস্টার করলেই সে কাস্টমার
    },

    // 🔗 ২. শপ ম্যানেজারদের জন্য: সে কোন মূল ভেন্ডরের আন্ডারে কাজ করছে
    parentVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // 🏪 ৩. ভেন্ডরদের জন্য: তার শপের যাবতীয় তথ্য ও লাইসেন্স
    shopDetails: {
      shopName: { type: String, trim: true },
      shopDescription: { type: String },
      shopAddress: { type: String },
      businessLicense: { type: String },
      bankAccount: { type: String },
    },

    // ভেন্ডর বা বিশেষ অ্যাকাউন্ট অ্যাডমিন ভেরিফাই করেছে কি না
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// পাসওয়ার্ড হ্যাশ করার প্রি-সেভ হুক
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// পাসওয়ার্ড ম্যাচ করার মেথড
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
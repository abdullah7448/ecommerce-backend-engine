const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    comparePrice: {
      type: Number, // ডিসকাউন্টের আগের মূল দাম (Optional)
      default: 0,
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      index: true, // ফাস্ট সার্চ বা ফিল্টারিংয়ের জন্য ইনডেক্সিং
    },
    images: [
      {
        type: String, // প্রোডাক্ট ইমেজের ইউআরএল
      },
    ],
    // 🔗 কোন ভেন্ডর বা শপ ম্যানেজার এই প্রোডাক্টটি আপলোড করেছে
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ratings: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true, // ভেন্ডর চাইলে সাময়িকভাবে প্রোডাক্ট হাইড বা পজ করে রাখতে পারে
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
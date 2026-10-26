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
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    
    // ক্যাটাগরি রেফারেন্স (Category Model এর সাথে যুক্ত)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product must belong to a category'],
    },

    // কোন ভেন্ডরের প্রোডাক্ট
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product must belong to a vendor'],
    },

    // 🌟 প্রোডাক্টের ধরণ: Simple, Variable, নাকি Downloadable
    productType: {
      type: String,
      enum: ['simple', 'variable', 'downloadable'],
      default: 'simple',
    },

    // ১. Simple বা Downloadable প্রোডাক্টের জন্য বেসিক প্রাইস ও স্টক
    price: {
      type: Number,
      required: function() {
        return this.productType === 'simple' || this.productType === 'downloadable';
      },
    },
    comparePrice: {
      type: Number, // ডিসকাউন্টের আগের মূল দাম (Regular Price)
    },
    stock: {
      type: Number,
      default: 0,
      required: function() {
        return this.productType === 'simple';
      },
    },

    // ২. Variable প্রোডাক্টের জন্য ভ্যারিয়েশন অ্যারে (যেমন: কালার, সাইজ, প্রতিটির আলাদা দাম ও স্টক)
    variations: [
      {
        attributes: {
          type: Map,
          of: String, // যেমন: { size: "XL", color: "Red" }
        },
        price: { type: Number, required: true },
        comparePrice: { type: Number },
        stock: { type: Number, required: true, default: 0 },
        sku: { type: String }, // Stock Keeping Unit
        image: { type: String },
      },
    ],

    // ৩. Downloadable প্রোডাক্টের জন্য ফাইল লিংক
    downloadableFile: {
      fileUrl: { type: String },
      fileSize: { type: String },
      downloadLimit: { type: Number, default: 5 }, // কয়বার ডাউনলোড করতে পারবে
    },

    images: [
      {
        type: String, // প্রোডাক্টের গ্যালারি ইমেজ লিংকসমূহ
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// সার্চিং ফাস্ট করার জন্য ইনডেক্সিং
productSchema.index({ title: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
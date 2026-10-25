const Product = require('../models/productModel');
const slugify = require('slugify'); // স্লাগ তৈরির জন্য (যেমন: "Smart Watch" -> "smart-watch")

// @desc    Create a new product (Vendor / Shop Manager Only)
// @route   POST /api/v1/products
// @access  Private (Vendor / Shop Manager)
const createProduct = async (req, res) => {
  try {
    const { title, description, price, comparePrice, stock, category, images } = req.body;

    // ১. ভেন্ডর ভেরিফাইড কি না চেক করা
    if (req.user.role === 'vendor' && !req.user.isVerified) {
      return res.status(403).json({
        status: 'fail',
        message: 'Your vendor account is not verified by admin yet.',
      });
    }

    // ২. কার নামে প্রোডাক্ট লিস্ট হবে তা নির্ধারণ করা
    // যদি রিকোয়েস্ট পাঠানো ইউজার shop_manager হয়, তবে তার parentVendor-কে মালিক ধরা হবে
    let vendorId = req.user._id;
    if (req.user.role === 'shop_manager') {
      if (!req.user.parentVendor) {
        return res.status(400).json({
          status: 'fail',
          message: 'Shop manager is not assigned to any valid vendor.',
        });
      }
      vendorId = req.user.parentVendor;
    }

    // ৩. ইউনিক স্লাগ তৈরি করা (টাইটেল দিয়ে)
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    
    // ডুপ্লিকেট স্লাগ এড়ানোর জন্য ইউনিক করার লজিক
    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    // ৪. প্রোডাক্ট ডেটাবেসে সেভ করা
    const product = await Product.create({
      title,
      slug,
      description,
      price,
      comparePrice,
      stock,
      category,
      images,
      vendor: vendorId,
    });

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get all products (Public - with search, filter & pagination)
// @route   GET /api/v1/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).populate('vendor', 'name email phone');
    
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: { products },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
};
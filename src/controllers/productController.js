const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const slugify = require('slugify');

// @desc    Create a new product (Simple, Variable, or Downloadable)
// @route   POST /api/v1/products
// @access  Private (Vendor / Shop Manager / Admin)
const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      productType,
      price,
      comparePrice,
      stock,
      variations,
      downloadableFile,
      images,
    } = req.body;

    // ১. ভেন্ডর ভেরিফাইড কি না চেক করা
    if (req.user.roles.includes('vendor') && !req.user.isVerified) {
      return res.status(403).json({
        status: 'fail',
        message: 'Your vendor account is not verified by admin yet.',
      });
    }

    // ২. কার নামে প্রোডাক্ট লিস্ট হবে তা নির্ধারণ করা (Vendor vs Shop Manager)
    let vendorId = req.user._id;
    if (req.user.roles.includes('shop_manager')) {
      if (!req.user.parentVendor) {
        return res.status(400).json({
          status: 'fail',
          message: 'Shop manager is not assigned to any valid vendor.',
        });
      }
      vendorId = req.user.parentVendor;
    }

    // ৩. ক্যাটাগরি ভ্যালিড কি না চেক করা
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invalid category ID. Category not found.',
      });
    }

    // ৪. Product Type অনুযায়ী ভ্যালিডেশন চেক
    const type = productType || 'simple';

    if (type === 'simple' && (!price || stock === undefined)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Price and Stock are required for a simple product.',
      });
    }

    if (type === 'variable' && (!variations || variations.length === 0)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Variations list is required for a variable product.',
      });
    }

    if (type === 'downloadable' && (!price || !downloadableFile?.fileUrl)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Price and Download File URL are required for downloadable products.',
      });
    }

    // ৫. ইউনিক স্লাগ তৈরি
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    // ৬. ডেটাবেসে প্রোডাক্ট তৈরি
    const product = await Product.create({
      title,
      slug,
      description,
      category,
      vendor: vendorId,
      productType: type,
      price: type !== 'variable' ? price : undefined,
      comparePrice: type !== 'variable' ? comparePrice : undefined,
      stock: type === 'simple' ? stock : 0,
      variations: type === 'variable' ? variations : [],
      downloadableFile: type === 'downloadable' ? downloadableFile : undefined,
      images,
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

// @desc    Get all products (Public - with Search, Category Filter, Sorting & Pagination)
// @route   GET /api/v1/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const queryObj = { ...req.query, isActive: true };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'category'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 🔎 Search Functionality
    if (req.query.search) {
      queryObj.$text = { $search: req.query.search };
    }

    // 📂 Filter by Category Slug or ID
    if (req.query.category) {
      const catObj = await Category.findOne({
        $or: [{ _id: req.query.category }, { slug: req.query.category }],
      });
      if (catObj) {
        queryObj.category = catObj._id;
      }
    }

    // 💰 Price Filtering (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Product.find(JSON.parse(queryStr))
      .populate('category', 'name slug')
      .populate('vendor', 'name email shopDetails');

    // 🔃 Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // 📄 Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const products = await query;
    const totalProducts = await Product.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      status: 'success',
      results: products.length,
      total: totalProducts,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      data: { products },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get single product by ID or Slug
// @route   GET /api/v1/products/:id
// @access  Public
const getSingleProduct = async (req, res) => {
  try {
    const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
    const filter = isObjectId ? { _id: req.params.id } : { slug: req.params.id };

    const product = await Product.findOne(filter)
      .populate('category', 'name slug description')
      .populate('vendor', 'name email shopDetails');

    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update Product (Owner Vendor / Shop Manager / Admin Only)
// @route   PATCH /api/v1/products/:id
// @access  Private (Vendor / Shop Manager / Admin)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    // 🔒 ওনারশিপ চেক
    const isOwner = product.vendor.toString() === req.user._id.toString();
    const isParentVendor = req.user.parentVendor && product.vendor.toString() === req.user.parentVendor.toString();
    const isAdmin = req.user.roles.includes('admin');

    if (!isOwner && !isParentVendor && !isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this product',
      });
    }

    // টাইটেল পাল্টালে স্লাগ অটো-আপডেট হবে
    if (req.body.title) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product: updatedProduct },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Delete Product (Owner Vendor / Shop Manager / Admin Only)
// @route   DELETE /api/v1/products/:id
// @access  Private (Vendor / Shop Manager / Admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    // 🔒 ওনারশিপ চেক
    const isOwner = product.vendor.toString() === req.user._id.toString();
    const isParentVendor = req.user.parentVendor && product.vendor.toString() === req.user.parentVendor.toString();
    const isAdmin = req.user.roles.includes('admin');

    if (!isOwner && !isParentVendor && !isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete this product',
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
};
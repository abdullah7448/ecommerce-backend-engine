const Category = require('../models/categoryModel');
const slugify = require('slugify');

// @desc    Create a new category (Admin or Authorized Vendor)
// @route   POST /api/v1/categories
// @access  Private (Admin / Vendor)
const createCategory = async (req, res) => {
  try {
    const { name, description, image, parentCategory } = req.body;

    const slug = slugify(name, { lower: true, strict: true });

    const categoryExists = await Category.findOne({ slug });
    if (categoryExists) {
      return res.status(400).json({ status: 'fail', message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      parentCategory: parentCategory || null,
    });

    res.status(201).json({
      status: 'success',
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get all categories (Public)
// @route   GET /api/v1/categories
// @access  Public
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).populate('parentCategory', 'name slug');

    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update category (Admin Only)
// @route   PATCH /api/v1/categories/:id
// @access  Private (Admin)
const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (name) {
      req.body.slug = slugify(name, { lower: true, strict: true });
    }

    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ status: 'fail', message: 'Category not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Category updated successfully',
      data: { category },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Delete category (Admin Only)
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
const deleteCategory = async (Layer, res) => {
  try {
    const category = await Category.findByIdAndDelete(Layer.params.id);
    if (!category) {
      return res.status(404).json({ status: 'fail', message: 'Category not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
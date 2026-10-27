const Review = require('../models/reviewModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// 🧮 প্রোডাক্টের অ্যাভারেজ রেটিং অটো-ক্যালকুলেট করার হেলপার
const updateProductRatingStats = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 0,
    });
  }
};

// @desc    Add review for a product (Verified Purchase Only)
// @route   POST /api/v1/products/:productId/reviews
// @access  Private (Customer Only)
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    // ১. কাস্টমার আসলেই এই প্রোডাক্টটি কিনেছে এবং ডেলিভারি পেয়েছে কি না চেক
    const hasPurchased = await Order.findOne({
      customer: userId,
      'vendorOrders.items.product': productId,
      'vendorOrders.orderStatus': 'Delivered',
    });

    if (!hasPurchased) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only review products that you have purchased and received (Delivered).',
      });
    }

    // ২. আগের কোনো রিভিউ আছে কি না চেক
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      return res.status(400).json({
        status: 'fail',
        message: 'You have already reviewed this product.',
      });
    }

    // ৩. রিভিউ তৈরি করা
    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      comment,
      isVerifiedPurchase: true,
    });

    // ৪. প্রোডাক্টের অ্যাভারেজ রেটিং আপডেট করা
    await updateProductRatingStats(productId);

    res.status(201).json({
      status: 'success',
      message: 'Review added successfully',
      data: { review },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get all reviews for a product
// @route   GET /api/v1/products/:productId/reviews
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name avatar')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: { reviews },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Delete a review (User who wrote it or Admin)
// @route   DELETE /api/v1/reviews/:id
// @access  Private (Owner User / Admin)
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ status: 'fail', message: 'Review not found' });
    }

    // ওনারশিপ চেক
    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.roles.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ status: 'fail', message: 'Unauthorized action' });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    // প্রোডাক্ট রেটিং রিক্যালকুলেট করা
    await updateProductRatingStats(productId);

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  deleteReview,
};
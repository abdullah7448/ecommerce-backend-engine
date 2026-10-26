const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

// 🧮 কার্টের মোট প্রাইস হিসাব করার জন্য হেলপার ফাংশন
const calculateTotalPrice = (cart) => {
  cart.totalPrice = cart.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
};

// @desc    Add product to cart (or update quantity if already exists)
// @route   POST /api/v1/cart
// @access  Private (Customer / Logged-in User)
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variationId } = req.body;
    const userId = req.user._id;

    // ১. প্রোডাক্ট ডেটাবেসে আছে কি না চেক করা
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ status: 'fail', message: 'Product not found or inactive' });
    }

    // ২. প্রোডাক্টের টাইপ অনুযায়ী দাম, স্টক ও ভ্যারিয়েশন ভ্যালিডেশন
    let itemPrice = product.price;
    let selectedAttributes = null;

    if (product.productType === 'simple' || product.productType === 'downloadable') {
      if (product.stock < quantity && product.productType === 'simple') {
        return res.status(400).json({ status: 'fail', message: 'Insufficient product stock' });
      }
    } else if (product.productType === 'variable') {
      if (!variationId) {
        return res.status(400).json({ status: 'fail', message: 'Please select a product variation' });
      }
      
      // ভ্যারিয়েশন খুঁজে বের করা
      const selectedVariation = product.variations.id(variationId);
      if (!selectedVariation) {
        return res.status(404).json({ status: 'fail', message: 'Selected variation not found' });
      }

      if (selectedVariation.stock < quantity) {
        return res.status(400).json({ status: 'fail', message: 'Insufficient variation stock' });
      }

      itemPrice = selectedVariation.price;
      selectedAttributes = selectedVariation.attributes;
    }

    // ৩. ইউজারের কার্ট আছে কি না চেক করা, না থাকলে নতুন কার্ট তৈরি করা
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalPrice: 0,
      });
    }

    // ৪. কার্টে প্রোডাক্টটি আগে থেকেই আছে কি না তা চেক করা
    const existingItemIndex = cart.items.findIndex((item) => {
      if (product.productType === 'variable') {
        return (
          item.product.toString() === productId &&
          item.variationId &&
          item.variationId.toString() === variationId
        );
      }
      return item.product.toString() === productId;
    });

    if (existingItemIndex > -1) {
      // প্রোডাক্ট কার্টে থাকলে কোয়ান্টিটি বাড়িয়ে দেওয়া
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // নতুন প্রোডাক্ট হিসেবে কার্টে যোগ করা (ভেন্ডর আইডিসহ)
      cart.items.push({
        product: productId,
        vendor: product.vendor, // 💡 ভিন্ন ভিন্ন ভেন্ডর ট্র্যাক করার জন্য গুরুত্বপূর্ণ
        productType: product.productType,
        variationId: variationId || null,
        selectedAttributes: selectedAttributes,
        quantity: quantity,
        price: itemPrice,
      });
    }

    // ৫. মোট প্রাইজ রি-ক্যালকুলেট করা এবং সেভ করা
    calculateTotalPrice(cart);
    await cart.save();

    // পপুলেট করে সুন্দর রেসপন্স রিটার্ন করা
    await cart.populate([
      { path: 'items.product', select: 'title slug images' },
      { path: 'items.vendor', select: 'name shopDetails' },
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Product added to cart successfully',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get current user's cart
// @route   GET /api/v1/cart
// @access  Private (Customer / Logged-in User)
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate([
      { path: 'items.product', select: 'title slug images price stock' },
      { path: 'items.vendor', select: 'name shopDetails' },
    ]);

    if (!cart) {
      return res.status(200).json({
        status: 'success',
        data: { cart: { items: [], totalPrice: 0 } },
      });
    }

    res.status(200).json({
      status: 'success',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update cart item quantity
// @route   PATCH /api/v1/cart/items/:itemId
// @access  Private (Customer / Logged-in User)
const updateCartItemQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ status: 'fail', message: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ status: 'fail', message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ status: 'fail', message: 'Item not found in cart' });
    }

    item.quantity = quantity;
    calculateTotalPrice(cart);
    await cart.save();

    res.status(200).json({
      status: 'success',
      message: 'Cart item quantity updated',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Remove an item from cart
// @route   DELETE /api/v1/cart/items/:itemId
// @access  Private (Customer / Logged-in User)
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ status: 'fail', message: 'Cart not found' });
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

    calculateTotalPrice(cart);
    await cart.save();

    res.status(200).json({
      status: 'success',
      message: 'Item removed from cart',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/v1/cart
// @access  Private (Customer / Logged-in User)
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (cart) {
      cart.items = [];
      cart.totalPrice = 0;
      await cart.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
};
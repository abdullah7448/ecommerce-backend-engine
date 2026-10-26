const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

// @desc    Create a new order from cart (Multi-Vendor Split Order)
// @route   POST /api/v1/orders
// @access  Private (Customer Only)
const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    // ১. ইউজারের কার্ট খুঁজে বের করা
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Your cart is empty' });
    }

    // ২. স্টক ও প্রোডাক্ট ভ্যালিডেশন চেক করা
    for (let item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        return res.status(400).json({ status: 'fail', message: `A product in your cart is no longer available` });
      }

      if (item.productType === 'simple' && product.stock < item.quantity) {
        return res.status(400).json({ status: 'fail', message: `Insufficient stock for product: ${product.title}` });
      } else if (item.productType === 'variable') {
        const variation = product.variations.id(item.variationId);
        if (!variation || variation.stock < item.quantity) {
          return res.status(400).json({ status: 'fail', message: `Insufficient stock for variation of: ${product.title}` });
        }
      }
    }

    // ৩. কাস্টমার লোকেশন অনুযায়ী পার ভেন্ডর শিপিং চার্জ নির্ধারণ
    // কাস্টমারের city বা address চেক করা (যেমন: ঢাকা হলে ৬০ টাকা, বাইরে হলে ১২০ টাকা)
    const isInsideDhaka = shippingAddress.city.toLowerCase().includes('dhaka');
    const baseShippingChargePerVendor = isInsideDhaka ? 60 : 120;

    // ৪. কার্টের আইটেমগুলোকে ভেন্ডর অনুযায়ী গ্রুপ করা (Vendor-wise Grouping)
    const vendorGroups = {};

    cart.items.forEach((item) => {
      const vendorId = item.vendor.toString();
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = [];
      }
      vendorGroups[vendorId].push({
        product: item.product._id,
        variationId: item.variationId || null,
        quantity: item.quantity,
        price: item.price,
      });
    });

    // ৫. প্রতিটি ভেন্ডরের জন্য 'vendorOrders' অ্যারে তৈরি করা এবং শিপিং চার্জ হিসাব করা
    let vendorOrders = [];
    let grandTotalAmount = 0;

    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      // এই ভেন্ডরের প্রোডাক্টগুলোর সাবটোটাল
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      // আপনার রুল অনুযায়ী: প্রতি ভেন্ডর পার্সেলের জন্য কাস্টমার লোকেশন ভিত্তিক শিপিং চার্জ
      const shippingCharge = baseShippingChargePerVendor;
      const vendorTotal = subtotal + shippingCharge;

      grandTotalAmount += vendorTotal;

      vendorOrders.push({
        vendor: vendorId,
        items,
        subtotal,
        shippingCharge,
        vendorTotal,
        orderStatus: 'Pending',
      });
    }

    // ৬. মূল অর্ডার ডেটাবেসে সেভ করা
    const order = await Order.create({
      customer: userId,
      vendorOrders,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending',
      totalAmount: grandTotalAmount,
    });

    // ৭. স্টক আপডেট করা (প্রোডাক্ট বিক্রি হয়ে যাওয়ার পর স্টক কমানো)
    for (let item of cart.items) {
      if (item.productType === 'simple') {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: -item.quantity },
        });
      } else if (item.productType === 'variable') {
        await Product.updateOne(
          { _id: item.product._id, 'variations._id': item.variationId },
          { $inc: { 'variations.$.stock': -item.quantity } }
        );
      }
    }

    // ৮. অর্ডার সফলভাবে হওয়ার পর কার্ট খালি করে দেওয়া
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get customer's own orders
// @route   GET /api/v1/orders/my-orders
// @access  Private (Customer)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('vendorOrders.items.product', 'title images slug')
      .populate('vendorOrders.vendor', 'name shopDetails');

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get vendor's incoming orders (Vendor / Shop Manager)
// @route   GET /api/v1/orders/vendor-orders
// @access  Private (Vendor / Shop Manager)
const getVendorOrders = async (req, res) => {
  try {
    let vendorId = req.user._id;
    if (req.user.roles.includes('shop_manager')) {
      vendorId = req.user.parentVendor;
    }

    // এমন অর্ডারগুলো খুঁজবে যেখানে vendorOrders অ্যারেতে এই ভেন্ডরের আইডি আছে
    const orders = await Order.find({ 'vendorOrders.vendor': vendorId })
      .populate('customer', 'name email phone')
      .populate('vendorOrders.items.product', 'title images slug');

    // শুধুমাত্র এই ভেন্ডরের সাব-অর্ডারগুলো ফিল্টার করে রেসপন্স সাজানো
    const formattedOrders = orders.map((order) => {
      const specificVendorOrder = order.vendorOrders.find(
        (vo) => vo.vendor.toString() === vendorId.toString()
      );
      return {
        orderId: order._id,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        vendorOrderDetails: specificVendorOrder,
      };
    });

    res.status(200).json({
      status: 'success',
      results: formattedOrders.length,
      data: { orders: formattedOrders },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update Vendor Order Status (e.g., Pending -> Processing -> Shipped -> Delivered)
// @route   PATCH /api/v1/orders/:orderId/vendor-status
// @access  Private (Vendor / Shop Manager)
const updateVendorOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    let vendorId = req.user._id;
    if (req.user.roles.includes('shop_manager')) {
      vendorId = req.user.parentVendor;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    // নির্দিষ্ট ভেন্ডরের সাব-অর্ডারটি খুঁজে বের করা
    const vendorOrder = order.vendorOrders.find(
      (vo) => vo.vendor.toString() === vendorId.toString()
    );

    if (!vendorOrder) {
      return res.status(403).json({ status: 'fail', message: 'You do not have a sub-order in this order' });
    }

    vendorOrder.orderStatus = orderStatus;
    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Order status updated successfully',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getVendorOrders,
  updateVendorOrderStatus,
};
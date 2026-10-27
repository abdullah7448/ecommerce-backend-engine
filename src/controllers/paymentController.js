const SSLCommerzPayment = require('sslcommerz-lts');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = process.env.IS_LIVE === 'true'; // false for sandbox

// @desc    Init Payment via SSLCommerz
// @route   POST /api/v1/payments/init
// @access  Private (Customer Only)
const initPayment = async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    const userId = req.user._id;

    // ১. কার্ট চেক করা
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Your cart is empty' });
    }

    // ২. স্টক ভ্যালিডেশন
    for (let item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        return res.status(400).json({ status: 'fail', message: 'A product in your cart is unavailable' });
      }
      if (item.productType === 'simple' && product.stock < item.quantity) {
        return res.status(400).json({ status: 'fail', message: `Insufficient stock for ${product.title}` });
      }
    }

    // ৩. লোকেশন ভিত্তিক শিপিং চার্জ হিসাব (ঢাকা = ৬০, বাইরে = ১২০ প্রতি ভেন্ডর)
    const isInsideDhaka = shippingAddress.city.toLowerCase().includes('dhaka');
    const baseShippingPerVendor = isInsideDhaka ? 60 : 120;

    // ভেন্ডর অনুযায়ী গ্রুপ করা
    const vendorGroups = {};
    cart.items.forEach((item) => {
      const vId = item.vendor.toString();
      if (!vendorGroups[vId]) vendorGroups[vId] = [];
      vendorGroups[vId].push({
        product: item.product._id,
        variationId: item.variationId || null,
        quantity: item.quantity,
        price: item.price,
      });
    });

    let vendorOrders = [];
    let grandTotalAmount = 0;

    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingCharge = baseShippingPerVendor;
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

    // ৪. ইউনিক ট্রানজ্যাকশন আইডি তৈরি
    const tran_id = `TRAN_${Date.now()}`;

    // ৫. পেন্ডিং অর্ডার ডেটাবেসে সেভ করা (পেমেন্ট সাকসেস হলে এটি পেইড হয়ে যাবে)
    const order = await Order.create({
      customer: userId,
      vendorOrders,
      shippingAddress,
      paymentMethod: 'SSLCommerz',
      paymentStatus: 'Pending',
      totalAmount: grandTotalAmount,
      transactionId: tran_id,
    });

    // ৬. SSLCommerz-এর ডেটা পে-লোড প্রস্তুত করা
    const data = {
      total_amount: grandTotalAmount,
      currency: 'BDT',
      tran_id: tran_id,
      success_url: `http://localhost:5000/api/v1/payments/success/${tran_id}`,
      fail_url: `http://localhost:5000/api/v1/payments/fail/${tran_id}`,
      cancel_url: `http://localhost:5000/api/v1/payments/cancel/${tran_id}`,
      ipn_url: `http://localhost:5000/api/v1/payments/ipn`,
      shipping_method: 'Courier',
      product_name: 'Multi-Vendor E-Commerce Products',
      product_category: 'General',
      product_profile: 'general',
      cus_name: shippingAddress.fullName,
      cus_email: req.user.email,
      cus_add1: shippingAddress.address,
      cus_city: shippingAddress.city,
      cus_postcode: shippingAddress.postalCode || '1000',
      cus_country: 'Bangladesh',
      cus_phone: shippingAddress.phone,
      ship_name: shippingAddress.fullName,
      ship_add1: shippingAddress.address,
      ship_city: shippingAddress.city,
      ship_postcode: shippingAddress.postalCode || '1000',
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then((apiResponse) => {
      // গেটওয়ো রিডাইরেক্ট ইউআরএল রিটার্ন করা
      let GatewayPageURL = apiResponse.GatewayPageURL;
      res.status(200).json({
        status: 'success',
        GatewayPageURL,
        message: 'Redirect to payment gateway',
      });
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Payment Success Callback
// @route   POST /api/v1/payments/success/:tran_id
const paymentSuccess = async (req, res) => {
  try {
    const { tran_id } = req.params;

    const order = await Order.findOne({ transactionId: tran_id });
    if (!order) {
      return res.status(404).redirect('http://localhost:3000/payment/fail');
    }

    if (order.paymentStatus !== 'Paid') {
      order.paymentStatus = 'Paid';
      order.valId = req.body.val_id;
      await order.save();

      // স্টক কমানো (Simple & Variable Product stock decrement)
      for (let vo of order.vendorOrders) {
        for (let item of vo.items) {
          const product = await Product.findById(item.product);
          if (product) {
            if (product.productType === 'simple') {
              product.stock -= item.quantity;
              await product.save();
            } else if (product.productType === 'variable' && item.variationId) {
              await Product.updateOne(
                { _id: item.product, 'variations._id': item.variationId },
                { $inc: { 'variations.$.stock': -item.quantity } }
              );
            }
          }
        }
      }

      // কার্ট খালি করে দেওয়া
      await Cart.findOneAndDelete({ user: order.customer });
    }

    // পেমেন্ট সফল হলে ফ্রন্টএন্ড সাকসেস পেজে রিডাইরেক্ট করা
    res.redirect(`http://localhost:3000/payment/success?tran_id=${tran_id}`);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Payment Fail Callback
// @route   POST /api/v1/payments/fail/:tran_id
const paymentFail = async (req, res) => {
  const { tran_id } = req.params;
  await Order.findOneAndUpdate({ transactionId: tran_id }, { paymentStatus: 'Failed' });
  res.redirect(`http://localhost:3000/payment/fail`);
};

// @desc    Payment Cancel Callback
// @route   POST /api/v1/payments/cancel/:tran_id
const paymentCancel = async (req, res) => {
  const { tran_id } = req.params;
  await Order.findOneAndUpdate({ transactionId: tran_id }, { paymentStatus: 'Cancelled' });
  res.redirect(`http://localhost:3000/payment/cancel`);
};

module.exports = {
  initPayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
};
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // মাল্টি-ভেন্ডর অর্ডারের মূল জাদুকরী পার্ট হলো 'vendorOrders' অ্যারে
    // কাস্টমার একসাথে পেমেন্ট করবে, কিন্তু ব্যাকএন্ড অর্ডারকে ভেন্ডর অনুযায়ী ভাগ করে দেবে
    vendorOrders: [
      {
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        items: [
          {
            product: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Product',
              required: true,
            },
            variationId: { type: mongoose.Schema.Types.ObjectId },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }, // কেনার সময়কার দাম
          },
        ],
        subtotal: { type: Number, required: true }, // এই ভেন্ডরের প্রোডাক্টগুলোর মোট দাম
        shippingCharge: { type: Number, required: true, default: 0 }, // এই ভেন্ডরের লোকেশন অনুযায়ী শিপিং চার্জ
        vendorTotal: { type: Number, required: true }, // subtotal + shippingCharge
        
        orderStatus: {
          type: String,
          enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
          default: 'Pending',
        },
      },
    ],

    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true }, // যেমন: 'Dhaka' বা 'Outside Dhaka'
      postalCode: { type: String },
    },

    paymentMethod: {
      type: String,
      enum: ['COD', 'Online', 'SSLCommerz', 'Bkash'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending',
    },

    totalAmount: {
      type: Number,
      required: true, // সমস্ত ভেন্ডরের সাবটোটাল + সব ভেন্ডরের শিপিং চার্জ মিলিয়ে গ্র্যান্ড টোটাল
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
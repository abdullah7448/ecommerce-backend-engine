const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to a user'],
      unique: true, // প্রতি ইউজারের জন্য একটাইভ কার্ট থাকবে
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true, // মাল্টি-ভেন্ডর অর্ডারিংয়ের জন্য ভেন্ডর আইডি আবশ্যক
        },
        productType: {
          type: String,
          enum: ['simple', 'variable', 'downloadable'],
          required: true,
        },
        // যদি প্রোডাক্টটি variable হয়, তবে কোন ভ্যারিয়েশনটি সিলেক্ট করা হয়েছে
        variationId: {
          type: mongoose.Schema.Types.ObjectId, 
        },
        selectedAttributes: {
          type: Map,
          of: String, // যেমন: { size: "L", color: "Blue" }
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity cannot be less than 1'],
          default: 1,
        },
        price: {
          type: Number,
          required: true, // কার্টে যোগ করার সময়কার একক দাম
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
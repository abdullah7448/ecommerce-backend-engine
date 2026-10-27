const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// ১. সিকিউরিটি এবং পার্সিং মিডলওয়্যার
app.use(helmet()); // HTTP হেডার সিকিউর করে (Common security vulnerabilities থেকে বাঁচায়)
app.use(cors()); // ফ্রন্টএন্ড থেকে এপিআই কল করার অনুমতি দেয়
app.use(express.json()); // ফ্রন্টএন্ড থেকে পাঠানো JSON বডি রিড করতে সাহায্য করে
app.use(express.urlencoded({ extended: true })); // URL encoded ডেটা পার্স করার জন্য

// ২. একটি টেস্ট রুট (সার্ভার ঠিকমতো কাজ করছে কি না দেখার জন্য)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Multi-Vendor E-Commerce Engine API 🚀',
  });
});

//Auth Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/v1/auth', authRoutes);

//Product Routes
const productRoutes = require('./routes/productRoutes');
app.use('/api/v1/products', productRoutes);

//Category Routes
const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api/v1/categories', categoryRoutes);

//Cart Routes
const cartRoutes = require('./routes/cartRoutes');
app.use('/api/v1/cart', cartRoutes);

//Order Routes
const orderRoutes = require('./routes/orderRoutes');
app.use('/api/v1/orders', orderRoutes);

//Payment Routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/v1/payments', paymentRoutes);

//Review Routes
const reviewRoutes = require('./routes/reviewRoutes');
app.use('/api/v1/products/:productId/reviews', reviewRoutes);

//Dashboard Routes
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/v1/dashboard', dashboardRoutes);

//Coupon Routes
const couponRoutes = require('./routes/couponRoutes');
app.use('/api/v1/coupons', couponRoutes);

module.exports = app;
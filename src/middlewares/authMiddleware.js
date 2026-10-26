const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// ১. অথেন্টিকেশন মিডলওয়্যার (লগইন করা আছে কি না চেক করে)
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ডেটাবেস থেকে ইউজার খুঁজে বের করে req.user-এ সেট করা (পাসওয়ার্ড ছাড়া)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ status: 'fail', message: 'User no longer exists' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ status: 'fail', message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ status: 'fail', message: 'Not authorized, no token provided' });
  }
};

// ২. অথরাইজেশন বা রোল-বেসড মিডলওয়্যার (মাল্টি-রোল অ্যারে চেক করার জন্য)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user-এর roles অ্যারে থেকে চেক করা হচ্ছে যে allowedRoles-এর সাথে কোনোটি মিলে কি না
    const hasPermission = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!req.user || !hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: `Your roles ([${req.user ? req.user.roles.join(', ') : 'guest'}]) are not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
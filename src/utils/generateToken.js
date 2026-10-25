const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  // jwt.sign দিয়ে ইউজারের আইডি এবং রোল এনক্রিপ্ট করে টোকেন বানানো হচ্ছে (মেয়াদ ১ দিন)
  return jwt.sign({ id: userId, role: role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

module.exports = generateToken;
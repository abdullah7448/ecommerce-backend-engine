require('dotenv').config(); 
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// প্রথমে ডেটাবেস কানেক্ট হবে, তারপর সার্ভার রান করবে
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});
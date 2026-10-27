const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');

// @desc    Get Vendor Dashboard Analytics
// @route   GET /api/v1/dashboard/vendor
// @access  Private (Vendor / Shop Manager)
const getVendorDashboardStats = async (req, res) => {
  try {
    let vendorId = req.user._id;
    if (req.user.roles.includes('shop_manager')) {
      if (!req.user.parentVendor) {
        return res.status(400).json({ status: 'fail', message: 'Shop manager has no valid parent vendor' });
      }
      vendorId = req.user.parentVendor;
    }

    // ১. এই ভেন্ডরের টোটাল প্রোডাক্ট সংখ্যা
    const totalProducts = await Product.countDocuments({ vendor: vendorId });

    // ২. এই ভেন্ডরের সমস্ত অর্ডার ফেচ করা
    const orders = await Order.find({ 'vendorOrders.vendor': vendorId });

    let totalOrders = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let totalEarnings = 0;

    orders.forEach((order) => {
      // এই ভেন্ডরের সুনির্দিষ্ট সাব-অর্ডার ফিল্টার
      const subOrder = order.vendorOrders.find(
        (vo) => vo.vendor.toString() === vendorId.toString()
      );

      if (subOrder) {
        totalOrders += 1;
        if (subOrder.orderStatus === 'Pending' || subOrder.orderStatus === 'Processing') {
          pendingOrders += 1;
        } else if (subOrder.orderStatus === 'Delivered') {
          deliveredOrders += 1;
          // শুধুমাত্র ডেলিভার্ড অর্ডারের ইনকাম গণনা (ভেন্ডর টোটাল = সাবটোটাল + শিপিং)
          totalEarnings += subOrder.vendorTotal;
        } else if (subOrder.orderStatus === 'Cancelled') {
          cancelledOrders += 1;
        }
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalProducts,
          totalOrders,
          pendingOrders,
          deliveredOrders,
          cancelledOrders,
          totalEarnings,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get System-wide Admin Dashboard Analytics
// @route   GET /api/v1/dashboard/admin
// @access  Private (Admin Only)
const getAdminDashboardStats = async (req, res) => {
  try {
    // ১. ইউজারের পরিসংখ্যান (কতজন কাস্টমার, ভেন্ডর ও পেন্ডিং ভেন্ডর)
    const totalCustomers = await User.countDocuments({ roles: 'customer' });
    const totalVendors = await User.countDocuments({ roles: 'vendor', isVerified: true });
    const pendingVendorApprovals = await User.countDocuments({ roles: 'vendor', isVerified: false });

    // ২. প্ল্যাটফর্মের টোটাল প্রোডাক্ট সংখ্যা
    const totalProducts = await Product.countDocuments({ isActive: true });

    // ৩. পুরো সিস্টেমের মোট অর্ডার ও রেভিনিউ হিসাব
    const allOrders = await Order.find();

    let totalOrders = allOrders.length;
    let totalSalesRevenue = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;

    allOrders.forEach((order) => {
      if (order.paymentStatus === 'Paid' || order.vendorOrders.some(vo => vo.orderStatus === 'Delivered')) {
        totalSalesRevenue += order.totalAmount;
      }

      order.vendorOrders.forEach((vo) => {
        if (vo.orderStatus === 'Pending') pendingOrders += 1;
        if (vo.orderStatus === 'Delivered') deliveredOrders += 1;
      });
    });

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          totalCustomers,
          totalVendors,
          pendingVendorApprovals,
        },
        products: {
          totalProducts,
        },
        sales: {
          totalOrders,
          pendingOrders,
          deliveredOrders,
          totalSalesRevenue,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getVendorDashboardStats,
  getAdminDashboardStats,
};
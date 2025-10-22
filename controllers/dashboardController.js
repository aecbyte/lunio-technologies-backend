const { pool } = require('../config/database');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get basic counts
    const [basicStats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as totalCustomers,
        (SELECT COUNT(*) FROM products WHERE status = 'active') as totalProducts,
        (SELECT COUNT(*) FROM orders) as totalOrders,
        (SELECT COALESCE(SUM(totalAmount), 0) FROM orders WHERE status = 'delivered') as totalRevenue
    `);

    // Get recent orders
    const [recentOrders] = await pool.execute(`
      SELECT 
        o.id,
        o.orderNumber,
        o.totalAmount,
        o.status,
        o.orderDate,
        u.fullName as customerName
      FROM orders o
      LEFT JOIN users u ON o.customerId = u.id
      ORDER BY o.orderDate DESC
      LIMIT 5
    `);

    // Get monthly revenue data
    const [monthlyRevenue] = await pool.execute(`
      SELECT 
        DATE_FORMAT(orderDate, '%Y-%m') as month,
        COALESCE(SUM(totalAmount), 0) as revenue,
        COUNT(*) as orderCount
      FROM orders 
      WHERE status = 'delivered' 
        AND orderDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(orderDate, '%Y-%m')
      ORDER BY month
    `);

    // Get top selling products
    const [topProducts] = await pool.execute(`
      SELECT 
        p.id,
        p.name,
        p.price,
        SUM(oi.quantity) as totalSold,
        SUM(oi.total) as totalRevenue
      FROM products p
      JOIN order_items oi ON p.id = oi.productId
      JOIN orders o ON oi.orderId = o.id
      WHERE o.status = 'delivered'
      GROUP BY p.id, p.name, p.price
      ORDER BY totalSold DESC
      LIMIT 5
    `);

    // Get order status distribution
    const [orderStatusStats] = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    // Get customer growth data
    const [customerGrowth] = await pool.execute(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COUNT(*) as newCustomers
      FROM users 
      WHERE role = 'customer' 
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month
    `);

    // Get recent activities
    const [recentActivities] = await pool.execute(`
      (SELECT 
        'order' as type,
        CONCAT('New order #', orderNumber) as activity,
        orderDate as activityDate
      FROM orders
      ORDER BY orderDate DESC
      LIMIT 3)
      UNION ALL
      (SELECT 
        'customer' as type,
        CONCAT('New customer: ', fullName) as activity,
        createdAt as activityDate
      FROM users
      WHERE role = 'customer'
      ORDER BY createdAt DESC
      LIMIT 3)
      UNION ALL
      (SELECT 
        'review' as type,
        CONCAT('New review for product') as activity,
        createdAt as activityDate
      FROM reviews
      ORDER BY createdAt DESC
      LIMIT 2)
      ORDER BY activityDate DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        basicStats: basicStats[0],
        recentOrders,
        monthlyRevenue,
        topProducts,
        orderStatusStats,
        customerGrowth,
        recentActivities
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// Get sales analytics
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = 'AND orderDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'AND orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'AND orderDate >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      case '1y':
        dateFilter = 'AND orderDate >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default:
        dateFilter = 'AND orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // Get sales data by day
    const [dailySales] = await pool.execute(`
      SELECT 
        DATE(orderDate) as date,
        COUNT(*) as orders,
        COALESCE(SUM(totalAmount), 0) as revenue
      FROM orders 
      WHERE status = 'delivered' ${dateFilter}
      GROUP BY DATE(orderDate)
      ORDER BY date
    `);

    // Get category performance
    const [categoryPerformance] = await pool.execute(`
      SELECT 
        c.name as categoryName,
        COUNT(DISTINCT o.id) as orders,
        SUM(oi.quantity) as itemsSold,
        SUM(oi.total) as revenue
      FROM categories c
      JOIN products p ON c.id = p.categoryId
      JOIN order_items oi ON p.id = oi.productId
      JOIN orders o ON oi.orderId = o.id
      WHERE o.status = 'delivered' ${dateFilter}
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `);

    // Get conversion metrics
    const [conversionMetrics] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT u.id) as totalVisitors,
        COUNT(DISTINCT o.customerId) as totalBuyers,
        COUNT(o.id) as totalOrders,
        AVG(o.totalAmount) as averageOrderValue
      FROM users u
      LEFT JOIN orders o ON u.id = o.customerId AND o.status = 'delivered' ${dateFilter}
      WHERE u.role = 'customer'
    `);

    res.json({
      success: true,
      data: {
        dailySales,
        categoryPerformance,
        conversionMetrics: conversionMetrics[0]
      }
    });

  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sales analytics'
    });
  }
};

module.exports = {
  getDashboardStats,
  getSalesAnalytics
};
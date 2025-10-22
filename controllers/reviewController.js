const { pool } = require('../config/database');

// Get all reviews with pagination and filters
// controllers/reviewController.js
const getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    if (!Number.isFinite(limit) || !Number.isFinite(offset) || limit < 1 || offset < 0) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const limitInt = Math.floor(Number(limit));
    const offsetInt = Math.floor(Number(offset));
    console.log('[getReviews] execute args ->', offsetInt, limitInt, typeof offsetInt, typeof limitInt);

    // FIXED: Use string interpolation (recommended)
    const [reviews] = await pool.execute(
      `SELECT 
        r.*,
        u.fullName as userName,
        u.email as userEmail,
        p.name as productName,
        p.sku as productSku
      FROM reviews r
      LEFT JOIN users u ON r.userId = u.id
      LEFT JOIN products p ON r.productId = p.id
      ORDER BY r.createdAt DESC
      LIMIT ${limitInt} OFFSET ${offsetInt}`
    );

    // count query
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM reviews');
    const total = countResult[0].total || 0;

    res.json({
      reviews,
      pagination: { page, limit: limitInt, total, totalPages: Math.ceil(total / limitInt) }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Get single review
const getReview = async (req, res) => {
  try {
    const { id } = req.params;

    const [reviews] = await pool.execute(
      `SELECT 
        r.*,
        u.fullName as userName,
        u.email as userEmail,
        p.name as productName,
        p.sku as productSku
      FROM reviews r
      LEFT JOIN users u ON r.userId = u.id
      LEFT JOIN products p ON r.productId = p.id
      WHERE r.id = ?`,
      [id]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: reviews[0]
    });

  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching review'
    });
  }
};

// Create review
const createReview = async (req, res) => {
  try {
    const {
      productId,
      orderId,
      rating,
      title,
      comment,
      productQualityRating,
      shippingRating,
      sellerRating
    } = req.body;

    const userId = req.user.id;

    // Check if product exists
    const [product] = await pool.execute(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (product.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user has already reviewed this product
    const [existingReview] = await pool.execute(
      'SELECT id FROM reviews WHERE userId = ? AND productId = ?',
      [userId, productId]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Create review
    const [result] = await pool.execute(
      `INSERT INTO reviews (
        productId, userId, orderId, rating, title, comment,
        productQualityRating, shippingRating, sellerRating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId, userId, orderId, rating, title, comment,
        productQualityRating, shippingRating, sellerRating
      ]
    );

    // Get created review
    const [newReview] = await pool.execute(
      `SELECT 
        r.*,
        u.fullName as userName,
        p.name as productName
      FROM reviews r
      LEFT JOIN users u ON r.userId = u.id
      LEFT JOIN products p ON r.productId = p.id
      WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: newReview[0]
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating review'
    });
  }
};

// Update review status (admin only)
const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    // Check if review exists
    const [existingReview] = await pool.execute(
      'SELECT id FROM reviews WHERE id = ?',
      [id]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update review
    await pool.execute(
      'UPDATE reviews SET status = ?, adminReply = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, adminReply, id]
    );

    // Get updated review
    const [updatedReview] = await pool.execute(
      `SELECT 
        r.*,
        u.fullName as userName,
        p.name as productName
      FROM reviews r
      LEFT JOIN users u ON r.userId = u.id
      LEFT JOIN products p ON r.productId = p.id
      WHERE r.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview[0]
    });

  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating review'
    });
  }
};

// Delete review (admin only)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if review exists
    const [existingReview] = await pool.execute(
      'SELECT id FROM reviews WHERE id = ?',
      [id]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Delete review
    await pool.execute('DELETE FROM reviews WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
};

// Get review statistics
const getReviewStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalReviews,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingReviews,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedReviews,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedReviews,
        AVG(rating) as averageRating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as fiveStarReviews,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as fourStarReviews,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as threeStarReviews,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as twoStarReviews,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as oneStarReviews
      FROM reviews
    `);

    const [recentReviews] = await pool.execute(`
      SELECT COUNT(*) as recentReviews
      FROM reviews 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentReviews: recentReviews[0].recentReviews
      }
    });

  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching review statistics'
    });
  }
};

module.exports = {
  getReviews,
  getReview,
  createReview,
  updateReviewStatus,
  deleteReview,
  getReviewStats
};
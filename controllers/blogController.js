const { pool } = require('../config/database');

// Get all blogs with pagination and filters
const getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const author = req.query.author || '';

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(title LIKE ? OR content LIKE ? OR excerpt LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (author) {
      whereConditions.push('author = ?');
      queryParams.push(author);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM blogs ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get blogs
    const [blogs] = await pool.execute(
      `SELECT * FROM blogs ${whereClause} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
      [...queryParams]
    );

    // Parse tags for each blog
    blogs.forEach(blog => {
      try {
        blog.tags = JSON.parse(blog.tags || '[]');
      } catch (e) {
        blog.tags = [];
      }
    });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching blogs'
    });
  }
};

// Get single blog
const getBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const [blogs] = await pool.execute(
      'SELECT * FROM blogs WHERE id = ?',
      [id]
    );

    if (blogs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const blog = blogs[0];
    
    // Parse tags
    try {
      blog.tags = JSON.parse(blog.tags || '[]');
    } catch (e) {
      blog.tags = [];
    }

    // Increment view count
    await pool.execute(
      'UPDATE blogs SET viewCount = viewCount + 1 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: blog
    });

  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching blog'
    });
  }
};

// Create blog
const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      author,
      tags,
      status,
      featuredImage
    } = req.body;

    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const [existingBlog] = await pool.execute(
      'SELECT id FROM blogs WHERE slug = ?',
      [slug]
    );

    let finalSlug = slug;
    if (existingBlog.length > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    // Set published date if status is published
    const publishedAt = status === 'published' ? new Date() : null;

    // Insert blog
    const [result] = await pool.execute(
      `INSERT INTO blogs (
        title, content, excerpt, author, tags, status, 
        featuredImage, slug, publishedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, content, excerpt, author, JSON.stringify(tags || []), 
        status, featuredImage, finalSlug, publishedAt
      ]
    );

    // Get created blog
    const [newBlog] = await pool.execute(
      'SELECT * FROM blogs WHERE id = ?',
      [result.insertId]
    );

    // Parse tags
    const blog = newBlog[0];
    try {
      blog.tags = JSON.parse(blog.tags || '[]');
    } catch (e) {
      blog.tags = [];
    }

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });

  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating blog'
    });
  }
};

// Update blog
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      excerpt,
      author,
      tags,
      status,
      featuredImage
    } = req.body;

    // Check if blog exists
    const [existingBlog] = await pool.execute(
      'SELECT * FROM blogs WHERE id = ?',
      [id]
    );

    if (existingBlog.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const currentBlog = existingBlog[0];

    // Generate new slug if title changed
    let slug = currentBlog.slug;
    if (title !== currentBlog.title) {
      slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if new slug already exists
      const [existingSlug] = await pool.execute(
        'SELECT id FROM blogs WHERE slug = ? AND id != ?',
        [slug, id]
      );

      if (existingSlug.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    // Set published date if status changed to published
    let publishedAt = currentBlog.publishedAt;
    if (status === 'published' && currentBlog.status !== 'published') {
      publishedAt = new Date();
    } else if (status !== 'published') {
      publishedAt = null;
    }

    // Update blog
    await pool.execute(
      `UPDATE blogs SET 
        title = ?, content = ?, excerpt = ?, author = ?, tags = ?, 
        status = ?, featuredImage = ?, slug = ?, publishedAt = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        title, content, excerpt, author, JSON.stringify(tags || []),
        status, featuredImage, slug, publishedAt, id
      ]
    );

    // Get updated blog
    const [updatedBlog] = await pool.execute(
      'SELECT * FROM blogs WHERE id = ?',
      [id]
    );

    // Parse tags
    const blog = updatedBlog[0];
    try {
      blog.tags = JSON.parse(blog.tags || '[]');
    } catch (e) {
      blog.tags = [];
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });

  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating blog'
    });
  }
};

// Delete blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if blog exists
    const [existingBlog] = await pool.execute(
      'SELECT id FROM blogs WHERE id = ?',
      [id]
    );

    if (existingBlog.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Delete blog
    await pool.execute('DELETE FROM blogs WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });

  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting blog'
    });
  }
};

// Get blog statistics
const getBlogStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalBlogs,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as publishedBlogs,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draftBlogs,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archivedBlogs,
        SUM(viewCount) as totalViews,
        SUM(commentCount) as totalComments
      FROM blogs
    `);

    const [recentBlogs] = await pool.execute(`
      SELECT id, title, author, status, createdAt, viewCount
      FROM blogs 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);

    // Parse tags for recent blogs
    recentBlogs.forEach(blog => {
      try {
        blog.tags = JSON.parse(blog.tags || '[]');
      } catch (e) {
        blog.tags = [];
      }
    });

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentBlogs
      }
    });

  } catch (error) {
    console.error('Get blog stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching blog statistics'
    });
  }
};

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats
};
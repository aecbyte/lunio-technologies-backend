const { pool } = require('../config/database');
const { uploadMultipleImages, deleteImage } = require('../config/cloudinary');
const fs = require('fs').promises;

// Get all KYC applications with pagination and filters
const getKYCApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const documentType = req.query.documentType || '';

    let whereConditions = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereConditions.push('k.status = ?');
      queryParams.push(status);
    }

    if (documentType) {
      whereConditions.push('k.documentType = ?');
      queryParams.push(documentType);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Count query
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM kyc_applications k ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Main query with inline LIMIT/OFFSET
    const mainQuery = `
      SELECT 
        k.*,
        u.fullName as userName,
        u.email as userEmail,
        u.phone as userPhone
      FROM kyc_applications k
      LEFT JOIN users u ON k.userId = u.id
      ${whereClause}
      ORDER BY k.submittedDate DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [applications] = await pool.execute(mainQuery, queryParams);

    res.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get KYC applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC applications',
    });
  }
};



// Get single KYC application
const getKYCApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const [applications] = await pool.execute(
      `SELECT 
        k.*,
        u.fullName as userName,
        u.email as userEmail,
        u.phone as userPhone,
        reviewer.fullName as reviewerName
      FROM kyc_applications k
      LEFT JOIN users u ON k.userId = u.id
      LEFT JOIN users reviewer ON k.reviewedBy = reviewer.id
      WHERE k.id = ?`,
      [id]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    res.json({
      success: true,
      data: applications[0]
    });

  } catch (error) {
    console.error('Get KYC application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC application'
    });
  }
};

// Create KYC application
const createKYCApplication = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    console.log('Creating KYC application with data:', Number(req.body.userId));
    const {
      userId,
      documentType,
      documentNumber
    } = req.body;

    console.log('Creating KYC for user:', userId, documentType, documentNumber);
    // Generate application ID
    const applicationId = `KYC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Check if user already has a pending or approved application
    const [existingApplication] = await connection.execute(
      'SELECT id FROM kyc_applications WHERE userId = ? AND status IN ("pending", "accepted")',
      [userId]
    );

    if (existingApplication.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'User already has a pending or approved KYC application'
      });
    }

    let frontImageUrl = null;
    let backImageUrl = null;
    let selfieImageUrl = null;

    // Handle image uploads
    if (req.files) {
      const filesArray = Object.values(req.files).flat();
      try {
        const uploadedImages = await uploadMultipleImages(filesArray, 'kyc');

        // Map uploaded images to their field names
        filesArray.forEach((file, index) => {
          const uploadResult = uploadedImages.successful?.[index]?.data || uploadedImages[index];

          if (uploadResult) {
            const imageUrl = uploadResult.url || uploadResult.secure_url;

            if (file.fieldname === 'frontImage') {
              frontImageUrl = imageUrl;
            } else if (file.fieldname === 'backImage') {
              backImageUrl = imageUrl;
            } else if (file.fieldname === 'selfieImage') {
              selfieImageUrl = imageUrl;
            }
          }
        });

        // Clean up temporary files
        for (const file of filesArray) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error deleting temp file:', unlinkError);
          }
        }
      } catch (uploadError) {
        console.log('Image upload error:', uploadError);
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: 'Failed to upload images'
        });
      }
    }

    // Create KYC application
    const [result] = await connection.execute(
      `INSERT INTO kyc_applications (
        applicationId, userId, documentType, documentNumber,
        frontImageUrl, backImageUrl, selfieImageUrl
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationId, userId, documentType, documentNumber,
        frontImageUrl, backImageUrl, selfieImageUrl
      ]
    );

    await connection.commit();

    // Get created application
    const [newApplication] = await connection.execute(
      `SELECT 
        k.*,
        u.fullName as userName,
        u.email as userEmail
      FROM kyc_applications k
      LEFT JOIN users u ON k.userId = u.id
      WHERE k.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'KYC application submitted successfully',
      data: newApplication[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create KYC application error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating KYC application'
    });
  } finally {
    connection.release();
  }
};



const getKycStatus = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [applications] = await pool.execute(
      `SELECT 
        id,
        applicationId,
        status,
        submittedDate,
        reviewedDate,
        rejectionReason
      FROM kyc_applications
      WHERE userId = ?
      ORDER BY submittedDate DESC
      LIMIT 1`,
      [customerId]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No KYC application found for this customer'
      });
    }

    res.json({
      success: true,
      data: applications[0].status
    });

  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC status'
    });
  }
}


// Update KYC application status (admin only)
const updateKYCStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const reviewerId = req.user.id;

    // Check if application exists
    const [existingApplication] = await pool.execute(
      'SELECT id FROM kyc_applications WHERE id = ?',
      [id]
    );

    if (existingApplication.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }
    if(rejectionReason && status !== 'rejected') { 
      await pool.execute(
      `UPDATE kyc_applications SET 
        status = ?, 
        rejectionReason = ?, 
        reviewedBy = ?, 
        reviewedDate = CURRENT_TIMESTAMP,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [status, rejectionReason, reviewerId, id]
    );
    }else{
      await pool.execute(
        `UPDATE kyc_applications SET 
          status = ?, 
          rejectionReason = NULL, 
          reviewedBy = ?, 
          reviewedDate = CURRENT_TIMESTAMP,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [status, reviewerId, id]
      );
    }


    // Get updated application
    const [updatedApplication] = await pool.execute(
      `SELECT 
        k.*,
        u.fullName as userName,
        u.email as userEmail,
        reviewer.fullName as reviewerName
      FROM kyc_applications k
      LEFT JOIN users u ON k.userId = u.id
      LEFT JOIN users reviewer ON k.reviewedBy = reviewer.id
      WHERE k.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'KYC application status updated successfully',
      data: updatedApplication[0]
    });

  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating KYC status'
    });
  }
};

// Get KYC statistics
const getKYCStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalApplications,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingApplications,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as acceptedApplications,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedApplications
      FROM kyc_applications
    `);

    const [recentApplications] = await pool.execute(`
      SELECT COUNT(*) as recentApplications
      FROM kyc_applications 
      WHERE submittedDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [documentTypeStats] = await pool.execute(`
      SELECT 
        documentType,
        COUNT(*) as count
      FROM kyc_applications
      GROUP BY documentType
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentApplications: recentApplications[0].recentApplications,
        documentTypeStats: documentTypeStats
      }
    });

  } catch (error) {
    console.error('Get KYC stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC statistics'
    });
  }
};


const createKycApplicationForUser = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      userId,
      userEmail,
      documentType,
      documentNumber,
      adminNotes
    } = req.body;

    console.log('Admin creating KYC for user:', req.body);
    const adminId = req.user.userId;
    const adminName = req.user.fullName;
    console.log(userEmail, userId, adminId, adminName);

    let targetUserId;

    // find user by email
    if (userEmail) {
      const [users] = await connection.execute(
        'SELECT id, fullName, email, status FROM users WHERE email = ?',
        [userEmail]
      );

      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found with provided email'
        });
      }

      targetUserId = users[0].id;
      console.log('Target user found:', users[0], targetUserId);

      if (users[0].status !== 'active') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot create KYC application for inactive user'
        });
      }
    } else if (!targetUserId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Either userId or userEmail must be provided'
      });
    } else {
      return res.status(404).json({
          success: false,
          message: 'Email is required to identify the user'
        });
    }

    // Generate application ID
    const applicationId = `KYC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Check if user already has a pending or approved application
    const [existingApplication] = await connection.execute(
      'SELECT id, status FROM kyc_applications WHERE userId = ? AND status IN ("pending", "accepted")',
      [targetUserId]
    );

    if (existingApplication.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `User already has a ${existingApplication[0].status} KYC application`,
        existingApplicationId: existingApplication[0].id
      });
    }

    let frontImageUrl = null;
    let backImageUrl = null;
    let selfieImageUrl = null;

    // Handle image uploads
    if (req.files) {
      const filesArray = Object.values(req.files).flat();
      try {
        const uploadedImages = await uploadMultipleImages(filesArray, 'kyc');

        // Assign images based on field names
        filesArray.forEach((file, index) => {
          const uploadResult = uploadedImages.successful?.[index]?.data || uploadedImages[index];

          if (uploadResult) {
            const imageUrl = uploadResult.url || uploadResult.secure_url;

            if (file.fieldname === 'frontImage') {
              frontImageUrl = imageUrl;
            } else if (file.fieldname === 'backImage') {
              backImageUrl = imageUrl;
            } else if (file.fieldname === 'selfieImage') {
              selfieImageUrl = imageUrl;
            }
          }
        });

        // Clean up temporary files
        for (const file of filesArray) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error deleting temp file:', unlinkError);
          }
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        await connection.rollback();

        // Clean up files on error
        if (req.files) {
          for (const file of req.files) {
            try {
              await fs.unlink(file.path);
            } catch (unlinkError) {
              console.error('Error deleting temp file:', unlinkError);
            }
          }
        }

        return res.status(500).json({
          success: false,
          message: 'Failed to upload images'
        });
      }
    }

    // Validate that at least front image is provided
    if (!frontImageUrl) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Front document image is required'
      });
    }

    // Create KYC application
    const [result] = await connection.execute(
      `INSERT INTO kyc_applications (
        applicationId, userId, documentType, documentNumber,
        frontImageUrl, backImageUrl, selfieImageUrl
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationId, targetUserId, documentType, documentNumber,
        frontImageUrl, backImageUrl, selfieImageUrl
      ]
    );

    // Log admin action for audit
    const auditLog = {
      action: 'ADMIN_CREATE_KYC',
      adminId: adminId,
      adminName: adminName,
      targetUserId: targetUserId,
      applicationId: applicationId,
      timestamp: new Date().toISOString(),
      notes: adminNotes || null
    };

    console.log('KYC Admin Action:', JSON.stringify(auditLog, null, 2));

    await connection.commit();

    // Get created application with user details
    const [newApplication] = await connection.execute(
      `SELECT
        k.*,
        u.fullName as userName,
        u.email as userEmail,
        u.phone as userPhone
      FROM kyc_applications k
      LEFT JOIN users u ON k.userId = u.id
      WHERE k.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'KYC application created successfully by admin',
      data: {
        ...newApplication[0],
        createdByAdmin: adminName,
        adminNotes: adminNotes || null
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Admin create KYC application error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating KYC application'
    });
  } finally {
    connection.release();
  }
};


module.exports = {
  getKYCApplications,
  getKYCApplication,
  createKYCApplication,
  getKycStatus,
  updateKYCStatus,
  getKYCStats,
  createKycApplicationForUser
};
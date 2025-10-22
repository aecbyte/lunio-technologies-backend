const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, username } = req.body;
    const userId = req.user.id;

    // Check if username is already taken (if provided)
    if (username) {
      const [existingUser] = await pool.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }

    // Update user profile
    await pool.execute(
      'UPDATE users SET fullName = ?, phone = ?, username = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [fullName, phone, username, userId]
    );

    // Get updated user
    const [updatedUser] = await pool.execute(
      'SELECT id, fullName, email, phone, username, role, status FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
};

// Change email
const changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.user.id;

    // Get current user
    const [users] = await pool.execute(
      'SELECT email, password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, users[0].password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Check if email is already taken
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [newEmail, userId]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already taken'
      });
    }

    // Update email
    await pool.execute(
      'UPDATE users SET email = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [newEmail, userId]
    );

    res.json({
      success: true,
      message: 'Email changed successfully'
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing email'
    });
  }
};

// Get system settings
const getSystemSettings = async (req, res) => {
  try {
    // In a real application, you might have a settings table
    // For now, we'll return some default settings
    const settings = {
      siteName: 'Lunio Technologies Admin Panel',
      siteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      adminEmail: process.env.ADMIN_EMAIL || 'admin@kyc.com',
      allowRegistration: true,
      maintenanceMode: false,
      emailNotifications: true,
      smsNotifications: false
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching system settings'
    });
  }
};

// Update system settings
const updateSystemSettings = async (req, res) => {
  try {
    const settings = req.body;

    // In a real application, you would save these to a database
    // For now, we'll just return success
    console.log('System settings updated:', settings);

    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating system settings'
    });
  }
};

module.exports = {
  updateProfile,
  changePassword,
  changeEmail,
  getSystemSettings,
  updateSystemSettings
};
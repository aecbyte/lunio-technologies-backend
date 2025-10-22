const { pool } = require('../config/database');

// Get all addresses for a customer
const getCustomerAddresses = async (req, res) => {
  try {
    const { customerId } = req.params;
    const addressType = req.query.addressType || '';
    
    let whereConditions = ['customerId = ?'];
    let queryParams = [customerId];

    if (addressType && addressType !== 'all') {
      whereConditions.push('addressType = ?');
      queryParams.push(addressType);
    }

    const whereClause = whereConditions.join(' AND ');

    const [addresses] = await pool.execute(
      `SELECT
        a.*,
        u.fullName as customerName,
        u.email as customerEmail
      FROM customer_addresses a
      LEFT JOIN users u ON a.customerId = u.id
      WHERE ${whereClause}
      ORDER BY a.isDefault DESC, a.createdAt DESC`,
      queryParams
    );

    res.json({
      success: true,
      data: addresses,
      count: addresses.length
    });

  } catch (error) {
    console.error('Get customer addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer addresses'
    });
  }
};

// Get all addresses with pagination (admin)
const getAllAddresses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const addressType = req.query.addressType || '';

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(u.fullName LIKE ? OR u.email LIKE ? OR a.city LIKE ? OR a.postalCode LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (addressType && addressType !== 'all') {
      whereConditions.push('a.addressType = ?');
      queryParams.push(addressType);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM customer_addresses a
       LEFT JOIN users u ON a.customerId = u.id
       ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get addresses with customer info
    const [addresses] = await pool.execute(
      `SELECT
        a.*,
        u.fullName as customerName,
        u.email as customerEmail,
        u.phone as customerPhone
      FROM customer_addresses a
      LEFT JOIN users u ON a.customerId = u.id
      ${whereClause}
      ORDER BY a.createdAt DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: addresses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching addresses'
    });
  }
};

// Get single address
const getAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const [addresses] = await pool.execute(
      `SELECT
        a.*,
        u.fullName as customerName,
        u.email as customerEmail,
        u.phone as customerPhone
      FROM customer_addresses a
      LEFT JOIN users u ON a.customerId = u.id
      WHERE a.id = ?`,
      [id]
    );

    if (addresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      data: addresses[0]
    });

  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching address'
    });
  }
};

// Create address
const createAddress = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      customerId,
      addressType,
      streetAddress,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault = false
    } = req.body;

    // Verify customer exists
    const [customers] = await connection.execute(
      'SELECT id FROM users WHERE id = ? AND role = "customer"',
      [customerId]
    );

    if (customers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // If this address is set as default, unset other defaults
    if (isDefault) {
      await connection.execute(
        'UPDATE customer_addresses SET isDefault = FALSE WHERE customerId = ? AND addressType = ?',
        [customerId, addressType]
      );
    }

    // Create address
    const [result] = await connection.execute(
      `INSERT INTO customer_addresses (
        customerId, addressType, streetAddress, addressLine2,
        city, state, postalCode, country, isDefault
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, addressType, streetAddress, addressLine2, city, state, postalCode, country, isDefault]
    );

    await connection.commit();

    // Get created address
    const [newAddress] = await connection.execute(
      `SELECT
        a.*,
        u.fullName as customerName,
        u.email as customerEmail
      FROM customer_addresses a
      LEFT JOIN users u ON a.customerId = u.id
      WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: newAddress[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating address'
    });
  } finally {
    connection.release();
  }
};

// Update address
const updateAddress = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { customerId } = req.params;
    const {
      id,
      addressType,
      streetAddress,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault
    } = req.body;

    // Check if address exists
    const [existingAddress] = await connection.execute(
      'SELECT customerId, addressType FROM customer_addresses WHERE id = ?',
      [id]
    );

    if (existingAddress.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    const currentAddressType = existingAddress[0].addressType;

    // If this address is set as default, unset other defaults
    if (isDefault) {
      const targetAddressType = addressType || currentAddressType;
      await connection.execute(
        'UPDATE customer_addresses SET isDefault = FALSE WHERE customerId = ? AND addressType = ? AND id != ?',
        [customerId, targetAddressType, id]
      );
    }

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    if (addressType) {
      updateFields.push('addressType = ?');
      updateParams.push(addressType);
    }
    if (streetAddress) {
      updateFields.push('streetAddress = ?');
      updateParams.push(streetAddress);
    }
    if (addressLine2 !== undefined) {
      updateFields.push('addressLine2 = ?');
      updateParams.push(addressLine2);
    }
    if (city) {
      updateFields.push('city = ?');
      updateParams.push(city);
    }
    if (state) {
      updateFields.push('state = ?');
      updateParams.push(state);
    }
    if (postalCode) {
      updateFields.push('postalCode = ?');
      updateParams.push(postalCode);
    }
    if (country) {
      updateFields.push('country = ?');
      updateParams.push(country);
    }
    if (isDefault !== undefined) {
      updateFields.push('isDefault = ?');
      updateParams.push(isDefault);
    }

    updateFields.push('updatedAt = CURRENT_TIMESTAMP');

    if (updateFields.length > 1) {
      await connection.execute(
        `UPDATE customer_addresses SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateParams, id]
      );
    }

    await connection.commit();

    // Get updated address
    const [updatedAddress] = await connection.execute(
      `SELECT
        a.*,
        u.fullName as customerName,
        u.email as customerEmail
      FROM customer_addresses a
      LEFT JOIN users u ON a.customerId = u.id
      WHERE a.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: updatedAddress[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating address'
    });
  } finally {
    connection.release();
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if address exists
    const [existingAddress] = await pool.execute(
      'SELECT id FROM customer_addresses WHERE id = ?',
      [id]
    );

    if (existingAddress.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Delete address
    await pool.execute('DELETE FROM customer_addresses WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting address'
    });
  }
};

// Set default address
const setDefaultAddress = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    console.log('Setting default address with params:', req.params, 'and body:', req.body.id, req.body.addressType);
    const { customerId } = req.params;
    const { id, addressType } = req.body;
    // Get address details
    const [addresses] = await connection.execute(
      'SELECT customerId, addressType FROM customer_addresses WHERE id = ?',
      [id]
    );

    if (addresses.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Unset all defaults for this customer and address type
    await connection.execute(
      'UPDATE customer_addresses SET isDefault = FALSE WHERE customerId = ? AND addressType = ?',
      [customerId, addressType]
    );

    // Set this address as default
    await connection.execute(
      'UPDATE customer_addresses SET isDefault = TRUE WHERE id = ?',
      [id]
    );

    await connection.commit();

    // Get updated address
    const [updatedAddress] = await connection.execute(
      `SELECT
        a.*,
        u.fullName as customerName,
        u.email as customerEmail
      FROM customer_addresses a
      LEFT JOIN users u ON a.customerId = u.id
      WHERE a.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Default address set successfully',
      data: updatedAddress[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting default address'
    });
  } finally {
    connection.release();
  }
};

// Get address statistics
const getAddressStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) as totalAddresses,
        SUM(CASE WHEN addressType = 'billing' THEN 1 ELSE 0 END) as billingAddresses,
        SUM(CASE WHEN addressType = 'shipping' THEN 1 ELSE 0 END) as shippingAddresses,
        COUNT(DISTINCT customerId) as customersWithAddresses,
        COUNT(DISTINCT country) as countriesServed,
        SUM(CASE WHEN isDefault = TRUE THEN 1 ELSE 0 END) as defaultAddresses
      FROM customer_addresses
    `);

    const [topCities] = await pool.execute(`
      SELECT
        city,
        state,
        country,
        COUNT(*) as count
      FROM customer_addresses
      GROUP BY city, state, country
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        topCities: topCities
      }
    });

  } catch (error) {
    console.error('Get address stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching address statistics'
    });
  }
};

module.exports = {
  getCustomerAddresses,
  getAllAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAddressStats
};

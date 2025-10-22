const { pool } = require('../config/database');

// Get all support tickets with pagination and filters
const getSupportTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const priority = req.query.priority || '';
    const search = req.query.search || '';

    let whereConditions = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereConditions.push('st.status = ?');
      queryParams.push(status);
    }

    if (priority && priority !== 'all') {
      whereConditions.push('st.priority = ?');
      queryParams.push(priority);
    }

    if (search) {
      whereConditions.push('(st.subject LIKE ? OR st.description LIKE ? OR u.fullName LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM support_tickets st 
       LEFT JOIN users u ON st.customerId = u.id 
       ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get support tickets with customer info
    const [tickets] = await pool.execute(
      `SELECT 
        st.*,
        u.fullName as customerName,
        u.email as customerEmail,
        u.phone as customerPhone,
        assignedUser.fullName as assignedToName
      FROM support_tickets st
      LEFT JOIN users u ON st.customerId = u.id
      LEFT JOIN users assignedUser ON st.assignedTo = assignedUser.id
      ${whereClause}
      ORDER BY st.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}`,
      [...queryParams]
    );

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching support tickets'
    });
  }
};

// Create support ticket
const createSupportTicket = async (req, res) => {
  try {
    const {
      customerId,
      subject,
      description,
      priority = 'medium'
    } = req.body;

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create support ticket
    const [result] = await pool.execute(
      `INSERT INTO support_tickets (
        ticketNumber, customerId, subject, description, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketNumber, customerId, subject, description, priority, 'open']
    );

    // Get created ticket with customer info
    const [newTicket] = await pool.execute(
      `SELECT 
        st.*,
        u.fullName as customerName,
        u.email as customerEmail
      FROM support_tickets st
      LEFT JOIN users u ON st.customerId = u.id
      WHERE st.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: newTicket[0]
    });

  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating support ticket'
    });
  }
};

// Update support ticket
const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo, response } = req.body;

    // Check if ticket exists
    const [existingTicket] = await pool.execute(
      'SELECT id FROM support_tickets WHERE id = ?',
      [id]
    );

    if (existingTicket.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Update ticket
    const updateFields = ['updatedAt = CURRENT_TIMESTAMP'];
    const updateParams = [];

    if (status) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    if (priority) {
      updateFields.push('priority = ?');
      updateParams.push(priority);
    }

    if (assignedTo) {
      updateFields.push('assignedTo = ?');
      updateParams.push(assignedTo);
    }

    if (response) {
      updateFields.push('adminResponse = ?');
      updateParams.push(response);
    }

    await pool.execute(
      `UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateParams, id]
    );

    // Get updated ticket
    const [updatedTicket] = await pool.execute(
      `SELECT 
        st.*,
        u.fullName as customerName,
        assignedUser.fullName as assignedToName
      FROM support_tickets st
      LEFT JOIN users u ON st.customerId = u.id
      LEFT JOIN users assignedUser ON st.assignedTo = assignedUser.id
      WHERE st.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Support ticket updated successfully',
      data: updatedTicket[0]
    });

  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating support ticket'
    });
  }
};

// Get support ticket statistics
const getSupportTicketStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalTickets,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openTickets,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgressTickets,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedTickets,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedTickets,
        AVG(CASE WHEN satisfactionRating IS NOT NULL THEN satisfactionRating ELSE NULL END) as averageSatisfaction
      FROM support_tickets
    `);

    const [recentTickets] = await pool.execute(`
      SELECT COUNT(*) as recentTickets
      FROM support_tickets 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentTickets: recentTickets[0].recentTickets
      }
    });

  } catch (error) {
    console.error('Get support ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching support ticket statistics'
    });
  }
};

module.exports = {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  getSupportTicketStats
};
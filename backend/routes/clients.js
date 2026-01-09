const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const router = express.Router();

// Get all clients
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, kyc_status } = req.query;
    const offset = (page - 1) * limit;
    const branchId = req.user?.branch_id || null;
    const userRole = req.user?.role || 'user';

    let whereClause = {};
    
    // For borrower role, only show their own client
    if (userRole === 'borrower') {
      whereClause.user_id = req.userId;
    } else if (branchId && userRole !== 'admin' && userRole !== 'general_manager') {
      whereClause.branch_id = branchId;
    }

    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { client_number: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) whereClause.status = status;
    if (kyc_status) whereClause.kyc_status = kyc_status;

    const { count, rows } = await db.Client.findAndCountAll({
      where: whereClause,
      include: [
        { model: db.Branch, as: 'branch', required: false, attributes: ['id', 'name', 'code'] },
        { model: db.User, as: 'creator', required: false, attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        clients: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single client
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role || 'user';
    
    const client = await db.Client.findByPk(req.params.id, {
      include: [
        { model: db.Branch, as: 'branch', required: false },
        { model: db.User, as: 'creator', required: false },
        { model: db.Loan, as: 'loans', required: false },
        { model: db.SavingsAccount, as: 'savingsAccounts', required: false },
        { model: db.Collateral, as: 'collaterals', required: false },
        { model: db.KycDocument, as: 'kycDocuments', required: false }
      ]
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // For borrower role, ensure they can only access their own client
    if (userRole === 'borrower' && client.user_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own client profile.'
      });
    }

    res.json({
      success: true,
      data: { client }
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create client
router.post('/', authenticate, upload.single('profile_image'), async (req, res) => {
  try {
    // Debug logging
    console.log('=== CREATE CLIENT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request file:', req.file ? { filename: req.file.filename, path: req.file.path, size: req.file.size } : 'No file');
    console.log('User ID:', req.userId);
    console.log('User object:', req.user ? { id: req.user.id, role: req.user.role, branch_id: req.user.branch_id } : 'No user');
    
    // Manual validation since express-validator doesn't work well with multipart/form-data
    const errors = [];
    
    const firstName = req.body.first_name ? String(req.body.first_name).trim() : '';
    const lastName = req.body.last_name ? String(req.body.last_name).trim() : '';
    const email = req.body.email ? String(req.body.email).trim() : '';
    
    if (!firstName) {
      errors.push({ param: 'first_name', msg: 'First name is required' });
    }
    
    if (!lastName) {
      errors.push({ param: 'last_name', msg: 'Last name is required' });
    }
    
    if (!email) {
      errors.push({ param: 'email', msg: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ param: 'email', msg: 'Valid email is required' });
    }
    
    if (req.body.branch_id && req.body.branch_id !== '' && isNaN(parseInt(req.body.branch_id))) {
      errors.push({ param: 'branch_id', msg: 'Branch ID must be a number' });
    }
    
    if (errors.length > 0) {
      // Clean up uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, errors });
    }

    // Generate client number
    const clientCount = await db.Client.count();
    const clientNumber = `CL${String(clientCount + 1).padStart(6, '0')}`;

    // Check if client with this email already exists
    const existingClient = await db.Client.findOne({
      where: { email: email }
    });

    if (existingClient) {
      // Clean up uploaded file if client already exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Client with this email already exists'
      });
    }

    // Handle profile image upload
    let profileImagePath = null;
    if (req.file) {
      // File path relative to uploads directory
      profileImagePath = `clients/${req.file.filename}`;
    }

    // Handle total_dues - if provided, set as negative
    let totalDues = 0;
    let duesCurrency = req.body.dues_currency || 'USD';
    if (req.body.total_dues && req.body.total_dues !== '') {
      const duesAmount = parseFloat(req.body.total_dues);
      if (!isNaN(duesAmount) && duesAmount > 0) {
        totalDues = -Math.abs(duesAmount); // Set as negative
      }
    }
    
    // Validate currency
    if (duesCurrency && !['LRD', 'USD'].includes(duesCurrency)) {
      duesCurrency = 'USD'; // Default to USD if invalid
    }

    // Create client
    let client;
    try {
      client = await db.Client.create({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: req.body.phone ? String(req.body.phone).trim() : null,
        client_number: clientNumber,
        created_by: req.userId,
        branch_id: req.body.branch_id && req.body.branch_id !== '' ? parseInt(req.body.branch_id) : (req.user?.branch_id || null),
        status: req.body.status || 'active',
        kyc_status: req.body.kyc_status || 'pending',
        profile_image: profileImagePath,
        total_dues: totalDues,
        dues_currency: duesCurrency
      });
      console.log('Client created successfully:', client.id);
    } catch (createError) {
      console.error('Error creating client:', createError);
      console.error('Error details:', createError.message);
      // Clean up uploaded file if client creation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw createError;
    }

    // Automatically create a borrower user for this client
    let borrowerUser = null;
    try {
      // Check if user with this email already exists
      const existingUser = await db.User.findOne({
        where: { email: email }
      });

      if (!existingUser) {
        // Generate username from email or name
        let baseUsername = email.split('@')[0] || 
                          `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        
        // Ensure username is unique
        let username = baseUsername;
        let usernameExists = await db.User.findOne({ where: { username } });
        let counter = 1;
        while (usernameExists) {
          username = `${baseUsername}${counter}`;
          usernameExists = await db.User.findOne({ where: { username } });
          counter++;
        }
        
        // Generate a temporary password (admin should update this)
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '1!';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create borrower user
        borrowerUser = await db.User.create({
          name: `${firstName} ${lastName}`,
          email: email,
          username: username,
          password: hashedPassword,
          role: 'borrower',
          branch_id: req.body.branch_id && req.body.branch_id !== '' ? parseInt(req.body.branch_id) : (req.user?.branch_id || null),
          phone: req.body.phone ? String(req.body.phone).trim() : null,
          is_active: true,
          email_verified_at: new Date()
        });

        // Link client to user
        await client.update({ user_id: borrowerUser.id });
        console.log('Borrower user created and linked:', borrowerUser.id);
      } else {
        // User exists, just link the client to the existing user
        await client.update({ user_id: existingUser.id });
        borrowerUser = existingUser;
        console.log('Client linked to existing user:', existingUser.id);
      }
    } catch (userError) {
      console.error('Error creating borrower user:', userError);
      // Don't fail client creation if user creation fails
      // Admin can manually create the user later
    }

    res.status(201).json({
      success: true,
      message: borrowerUser 
        ? 'Client created successfully. Borrower user account has been automatically created. Admin should update the password for secure login.'
        : 'Client created successfully',
      data: { 
        client,
        user: borrowerUser ? {
          id: borrowerUser.id,
          username: borrowerUser.username,
          email: borrowerUser.email,
          role: borrowerUser.role,
          note: 'Temporary password set. Admin should update password for secure login.'
        } : null
      }
    });
  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    console.error('=== CREATE CLIENT ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.original?.code || error.code);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Request file:', req.file ? { filename: req.file.filename, path: req.file.path } : 'No file');
    
    // Check for specific database errors
    if (error.name === 'SequelizeValidationError') {
      console.error('Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({ param: e.path, msg: e.message }))
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('Unique constraint error:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'A client with this information already exists',
        errors: error.errors.map(e => ({ param: e.path, msg: e.message }))
      });
    }
    
    if (error.name === 'SequelizeDatabaseError') {
      console.error('Database error:', error.original?.message || error.message);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred',
        error: process.env.NODE_ENV === 'development' ? error.original?.message || error.message : 'Internal server error'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update client
router.put('/:id', authenticate, upload.single('profile_image'), async (req, res) => {
  try {
    const client = await db.Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Handle profile image upload
    const updateData = { ...req.body };
    if (req.file) {
      // Delete old image if exists
      if (client.profile_image) {
        const oldImagePath = path.join(__dirname, '../uploads', client.profile_image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      // File path relative to uploads directory
      updateData.profile_image = `clients/${req.file.filename}`;
    }
    
    // Handle total_dues and dues_currency
    if (req.body.total_dues !== undefined) {
      if (req.body.total_dues && req.body.total_dues !== '') {
        const duesAmount = parseFloat(req.body.total_dues);
        if (!isNaN(duesAmount) && duesAmount > 0) {
          updateData.total_dues = -Math.abs(duesAmount); // Set as negative
        }
      } else {
        updateData.total_dues = 0;
      }
    }
    
    // Handle dues_currency
    if (req.body.dues_currency) {
      if (['LRD', 'USD'].includes(req.body.dues_currency)) {
        updateData.dues_currency = req.body.dues_currency;
      }
    }

    await client.update(updateData);

    // Fetch updated client
    const updatedClient = await db.Client.findByPk(req.params.id);

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: { client: updatedClient }
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get client loans with full details including payment schedules
router.get('/:id/loans', authenticate, async (req, res) => {
  try {
    const loans = await db.Loan.findAll({
      where: { client_id: req.params.id },
      include: [
        { model: db.Branch, as: 'branch', required: false, attributes: ['id', 'name', 'code'] },
        { model: db.Client, as: 'client', required: false, attributes: ['id', 'first_name', 'last_name', 'client_number'] },
        { 
          model: db.LoanRepayment, 
          as: 'repayments', 
          required: false,
          order: [['installment_number', 'ASC']],
          attributes: ['id', 'repayment_number', 'installment_number', 'amount', 'principal_amount', 'interest_amount', 'penalty_amount', 'due_date', 'payment_date', 'status', 'payment_method']
        },
        { model: db.Collateral, as: 'collateral', required: false, attributes: ['id', 'type', 'description', 'estimated_value', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Parse repayment schedules for each loan
    const loansWithSchedules = loans.map(loan => {
      const loanData = loan.toJSON();
      
      // Parse repayment_schedule if it's a string
      if (loanData.repayment_schedule && typeof loanData.repayment_schedule === 'string') {
        try {
          loanData.repayment_schedule = JSON.parse(loanData.repayment_schedule);
        } catch (e) {
          loanData.repayment_schedule = [];
        }
      }
      
      // If no schedule in loan data, try to build from repayments
      if (!loanData.repayment_schedule || loanData.repayment_schedule.length === 0) {
        if (loanData.repayments && loanData.repayments.length > 0) {
          loanData.repayment_schedule = loanData.repayments.map(repayment => ({
            installment_number: repayment.installment_number,
            due_date: repayment.due_date,
            principal_payment: parseFloat(repayment.principal_amount || 0),
            interest_payment: parseFloat(repayment.interest_amount || 0),
            total_payment: parseFloat(repayment.amount || 0),
            status: repayment.status,
            payment_date: repayment.payment_date,
            paid_amount: repayment.payment_date ? parseFloat(repayment.amount || 0) : 0
          }));
        }
      }
      
      return loanData;
    });

    res.json({
      success: true,
      data: { loans: loansWithSchedules }
    });
  } catch (error) {
    console.error('Get client loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client loans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get client savings
router.get('/:id/savings', authenticate, async (req, res) => {
  try {
    const savingsAccounts = await db.SavingsAccount.findAll({
      where: { client_id: req.params.id },
      include: [
        { model: db.Branch, as: 'branch', required: false }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { savingsAccounts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client savings',
      error: error.message
    });
  }
});

// Delete client (soft delete)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const client = await db.Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    await client.destroy(); // Soft delete with paranoid

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: error.message
    });
  }
});

module.exports = router;


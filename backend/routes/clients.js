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
    const { page = 1, limit, search, status, kyc_status, all = false } = req.query;
    // If 'all' is true or no limit specified, fetch all clients (up to 10000 for safety)
    const fetchLimit = (all === 'true' || !limit) ? 10000 : parseInt(limit);
    const offset = (page - 1) * (fetchLimit || 10);
    const branchId = req.user?.branch_id || null;
    const userRole = req.user?.role || 'user';

    let whereClause = {};
    
    // Build base conditions
    const baseConditions = {};
    
    // For borrower role, only show their own client
    if (userRole === 'borrower') {
      baseConditions.user_id = req.userId;
    } else if (branchId && userRole !== 'admin' && userRole !== 'general_manager') {
      baseConditions.branch_id = branchId;
    }

    if (status) baseConditions.status = status;
    if (kyc_status) baseConditions.kyc_status = kyc_status;

    // Build search conditions
    let searchConditions = null;
    if (search) {
      searchConditions = {
        [Op.or]: [
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { client_number: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    // Combine conditions
    if (searchConditions && Object.keys(baseConditions).length > 0) {
      whereClause = {
        [Op.and]: [
          baseConditions,
          searchConditions
        ]
      };
    } else if (searchConditions) {
      whereClause = searchConditions;
    } else {
      whereClause = baseConditions;
    }

    const { count, rows } = await db.Client.findAndCountAll({
      where: whereClause,
      include: [
        { model: db.Branch, as: 'branch', required: false, attributes: ['id', 'name', 'code'] },
        { model: db.User, as: 'creator', required: false, attributes: ['id', 'name'] }
      ],
      limit: fetchLimit,
      offset: offset,
      order: [['createdAt', 'DESC']],
      paranoid: false // Include soft-deleted for accurate count
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

    // Generate client number - find the highest existing client number to avoid duplicates
    let clientNumber;
    try {
      // Find the highest client number (including soft-deleted ones)
      const lastClient = await db.Client.findOne({
        order: [['id', 'DESC']],
        paranoid: false // Include soft-deleted clients
      });
      
      if (lastClient && lastClient.client_number) {
        // Extract number from client_number (e.g., "CL000001" -> 1)
        const match = lastClient.client_number.match(/\d+$/);
        const lastNumber = match ? parseInt(match[0]) : 0;
        clientNumber = `CL${String(lastNumber + 1).padStart(6, '0')}`;
      } else {
        // No clients exist, start from 1
        clientNumber = 'CL000001';
      }
      
      // Double-check uniqueness (in case of race condition)
      const existingClientNumber = await db.Client.findOne({
        where: { client_number: clientNumber },
        paranoid: false
      });
      
      if (existingClientNumber) {
        // If exists, find the next available number
        const clientCount = await db.Client.count({ paranoid: false });
        clientNumber = `CL${String(clientCount + 1).padStart(6, '0')}`;
      }
    } catch (error) {
      console.error('Error generating client number:', error);
      // Fallback to count-based generation
      const clientCount = await db.Client.count({ paranoid: false });
      clientNumber = `CL${String(clientCount + 1).padStart(6, '0')}`;
    }

    // Check if client with this email already exists (including soft-deleted)
    const existingClient = await db.Client.findOne({
      where: { email: email },
      paranoid: false // Check including soft-deleted clients
    });

    if (existingClient && !existingClient.deleted_at) {
      // Clean up uploaded file if client already exists (and is not deleted)
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

    // Create client within a transaction to ensure atomicity
    const transaction = await db.sequelize.transaction();
    let client;
    try {
      // Double-check client number uniqueness within transaction
      const existingClientNumber = await db.Client.findOne({
        where: { client_number: clientNumber },
        paranoid: false,
        transaction
      });
      
      if (existingClientNumber) {
        // Regenerate client number within transaction
        const lastClient = await db.Client.findOne({
          order: [['id', 'DESC']],
          attributes: ['client_number'],
          paranoid: false,
          transaction
        });
        
        if (lastClient && lastClient.client_number) {
          const match = lastClient.client_number.match(/\d+$/);
          const lastNumber = match ? parseInt(match[0]) : 0;
          clientNumber = `CL${String(lastNumber + 1).padStart(6, '0')}`;
        } else {
          const clientCount = await db.Client.count({ paranoid: false, transaction });
          clientNumber = `CL${String(clientCount + 1).padStart(6, '0')}`;
        }
      }
      
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
      }, { transaction });
      
      console.log('Client created successfully:', client.id);
      
      // Commit transaction after successful client creation
      await transaction.commit();
    } catch (createError) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('Error creating client:', createError);
      console.error('Error details:', createError.message);
      console.error('Error stack:', createError.stack);
      
      // Clean up uploaded file if client creation fails
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
      
      // Return more specific error messages
      if (createError.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Client with this email or client number already exists',
          error: createError.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create client',
        error: process.env.NODE_ENV === 'development' ? createError.message : 'Internal server error'
      });
    }

    // Automatically create a borrower user for this client
    let borrowerUser = null;
    try {
      // Check if user with this email already exists
      const existingUser = await db.User.findOne({
        where: { email: email }
      });

      if (!existingUser) {
        // Use client_number as username for borrower login
        let username = clientNumber;
        
        // Ensure username is unique (in case client_number already exists as username)
        let usernameExists = await db.User.findOne({ where: { username } });
        let counter = 1;
        while (usernameExists) {
          username = `${clientNumber}_${counter}`;
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
        ? `Client created successfully. Borrower user account created with username: ${borrowerUser.username} (client number). Admin should update the password for secure login.`
        : 'Client created successfully',
      data: { 
        client,
        user: borrowerUser ? {
          id: borrowerUser.id,
          username: borrowerUser.username,
          email: borrowerUser.email,
          role: borrowerUser.role,
          client_number: clientNumber,
          note: `Username for login: ${borrowerUser.username} (client number). Temporary password set. Admin should update password for secure login.`
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

// Helper function to delete all financial records for a client (soft delete where supported)
async function deleteClientFinancialRecords(clientId, transaction) {
  // 1. Get all loans for this client
  const loans = await db.Loan.findAll({ where: { client_id: clientId }, transaction, paranoid: false });
  const loanIds = loans.map(loan => loan.id);

  // 2. Get all savings accounts for this client
  const savingsAccounts = await db.SavingsAccount.findAll({ where: { client_id: clientId }, transaction, paranoid: false });
  const savingsIds = savingsAccounts.map(savings => savings.id);

  // 3. Get all transaction IDs that need revenue deletion (before deleting transactions)
  const transactionWhere = {
    [db.Sequelize.Op.or]: [
      { client_id: clientId }
    ]
  };
  if (loanIds.length > 0) {
    transactionWhere[db.Sequelize.Op.or].push({ loan_id: { [db.Sequelize.Op.in]: loanIds } });
  }
  if (savingsIds.length > 0) {
    transactionWhere[db.Sequelize.Op.or].push({ savings_account_id: { [db.Sequelize.Op.in]: savingsIds } });
  }

  const allTransactions = await db.Transaction.findAll({
    where: transactionWhere,
    attributes: ['id'],
    transaction
  });
  const transactionIds = allTransactions.map(t => t.id);

  // 4. Delete revenue records associated with transactions (Revenue is not paranoid)
  if (transactionIds.length > 0) {
    await db.Revenue.destroy({
      where: { transaction_id: { [db.Sequelize.Op.in]: transactionIds } },
      transaction
    });
  }

  // 5. Delete loan repayments for all loans (LoanRepayment is not paranoid)
  if (loanIds.length > 0) {
    await db.LoanRepayment.destroy({
      where: { loan_id: { [db.Sequelize.Op.in]: loanIds } },
      transaction
    });

    // 6. Delete collections for all loans (Collection is not paranoid)
    await db.Collection.destroy({
      where: { loan_id: { [db.Sequelize.Op.in]: loanIds } },
      transaction
    });

    // 7. Delete revenue records associated with loans (Revenue is not paranoid)
    await db.Revenue.destroy({
      where: { loan_id: { [db.Sequelize.Op.in]: loanIds } },
      transaction
    });

    // 8. Soft delete loans
    await db.Loan.destroy({
      where: { client_id: clientId },
      transaction
    });
  }

  // 9. Soft delete savings accounts
  if (savingsIds.length > 0) {
    await db.SavingsAccount.destroy({
      where: { client_id: clientId },
      transaction
    });
  }

  // 10. Soft delete all transactions (client_id, loan_id, or savings_account_id)
  await db.Transaction.destroy({
    where: transactionWhere,
    transaction
  });

  // 11. Soft delete collaterals for this client
  await db.Collateral.destroy({
    where: { client_id: clientId },
    transaction
  });

  // 12. Soft delete KYC documents for this client
  await db.KycDocument.destroy({
    where: { client_id: clientId },
    transaction
  });
}

// Update client
router.put('/:id', authenticate, upload.single('profile_image'), async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const client = await db.Client.findByPk(req.params.id, { transaction });
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const wasActive = client.status === 'active';
    const willBeInactive = req.body.status === 'inactive';

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

    await client.update(updateData, { transaction });

    // If client is being made inactive, delete all financial records
    if (wasActive && willBeInactive) {
      await deleteClientFinancialRecords(client.id, transaction);
    }

    await transaction.commit();

    // Fetch updated client
    const updatedClient = await db.Client.findByPk(req.params.id);

    res.json({
      success: true,
      message: willBeInactive && wasActive 
        ? 'Client updated and all financial records deleted successfully' 
        : 'Client updated successfully',
      data: { client: updatedClient }
    });
  } catch (error) {
    await transaction.rollback();
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

// Delete all clients (admin only - use with caution!)
router.delete('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL_CLIENTS') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send { confirm: "DELETE_ALL_CLIENTS" } in request body.'
      });
    }

    // Get all clients first to get their IDs
    const allClients = await db.Client.findAll({
      attributes: ['id'],
      paranoid: false
    });

    // Delete all clients (soft delete)
    const deletedCount = await db.Client.destroy({
      where: {},
      force: false // Soft delete
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} client(s)`,
      deletedCount
    });
  } catch (error) {
    console.error('Delete all clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all clients',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete client (soft delete) and all financial records
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const client = await db.Client.findByPk(req.params.id, { transaction });
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Delete all financial records associated with the client
    await deleteClientFinancialRecords(client.id, transaction);

    // Soft delete associated user account if present
    if (client.user_id) {
      const clientUser = await db.User.findByPk(client.user_id, { transaction });
      if (clientUser) {
        await clientUser.destroy({ transaction });
      }
    }

    // Finally, delete the client
    await client.destroy({ transaction }); // Soft delete with paranoid

    await transaction.commit();

    res.json({
      success: true,
      message: 'Client and all associated financial records deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


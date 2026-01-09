const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get all savings accounts
router.get('/', async (req, res) => {
  try {
    const userRole = req.user?.role || 'user';
    
    // For borrower role, get their client_id and filter by it
    let clientId = null;
    let whereClause = {};
    if (userRole === 'borrower') {
      const client = await db.Client.findOne({ where: { user_id: req.userId } });
      if (client) {
        clientId = client.id;
        whereClause.client_id = clientId;
      }
    }

    const savingsAccounts = await db.SavingsAccount.findAll({
      where: whereClause,
      include: [
        { model: db.Client, as: 'client', required: false },
        { model: db.Branch, as: 'branch', required: false }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { savingsAccounts }
    });
  } catch (error) {
    console.error('Get savings accounts error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch savings accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single savings account
router.get('/:id', async (req, res) => {
  try {
    const savingsAccount = await db.SavingsAccount.findByPk(req.params.id, {
      include: [
        { model: db.Client, as: 'client', required: false },
        { model: db.Branch, as: 'branch', required: false }
      ]
    });

    if (!savingsAccount) {
      return res.status(404).json({
        success: false,
        message: 'Savings account not found'
      });
    }

    // Get transactions for this account
    const transactions = await db.Transaction.findAll({
      where: { savings_account_id: savingsAccount.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      data: {
        savingsAccount,
        transactions
      }
    });
  } catch (error) {
    console.error('Get savings account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch savings account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create savings account
router.post('/', [
  body('client_id').isInt().withMessage('Client ID is required'),
  body('account_type').notEmpty().withMessage('Account type is required'),
  body('currency').optional().isIn(['LRD', 'USD']).withMessage('Currency must be LRD or USD'),
  body('initial_deposit').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Initial deposit must be a positive number'),
  body('interest_rate').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }).withMessage('Interest rate must be a number between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Generate unique account number
    let accountNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const accountCount = await db.SavingsAccount.count({ paranoid: false }); // Include soft-deleted accounts
      accountNumber = `SAV${String(accountCount + 1 + attempts).padStart(8, '0')}`;
      
      // Check if account number already exists
      const existingAccount = await db.SavingsAccount.findOne({
        where: { account_number: accountNumber },
        paranoid: false
      });
      
      if (!existingAccount) {
        isUnique = true;
      } else {
        attempts++;
      }
    }
    
    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique account number. Please try again.'
      });
    }

    // Validate account_type against ENUM values
    const validAccountTypes = ['regular', 'fixed', 'joint'];
    const accountType = req.body.account_type;
    if (!validAccountTypes.includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`
      });
    }

    // Parse interest_rate if provided
    let interestRate = 0;
    if (req.body.interest_rate !== undefined && req.body.interest_rate !== null && req.body.interest_rate !== '') {
      interestRate = parseFloat(req.body.interest_rate);
      if (isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
        return res.status(400).json({
          success: false,
          message: 'Interest rate must be a number between 0 and 100'
        });
      }
    }

    // Handle currency - default to USD if not provided or invalid
    let currency = 'USD';
    if (req.body.currency && ['LRD', 'USD'].includes(req.body.currency)) {
      currency = req.body.currency;
    }

    // Parse initial_deposit
    let initialDeposit = 0;
    if (req.body.initial_deposit !== undefined && req.body.initial_deposit !== null && req.body.initial_deposit !== '') {
      initialDeposit = parseFloat(req.body.initial_deposit);
      if (isNaN(initialDeposit) || initialDeposit < 0) {
        return res.status(400).json({
          success: false,
          message: 'Initial deposit must be a positive number'
        });
      }
    }

    // Handle branch_id
    let branchId = null;
    if (req.body.branch_id && req.body.branch_id !== '' && req.body.branch_id !== null) {
      branchId = parseInt(req.body.branch_id);
      if (isNaN(branchId)) {
        branchId = req.user?.branch_id || null;
      }
    } else {
      branchId = req.user?.branch_id || null;
    }

    // Verify client exists
    const client = await db.Client.findByPk(parseInt(req.body.client_id));
    if (!client) {
      return res.status(400).json({
        success: false,
        message: 'Client not found'
      });
    }

    const savingsAccount = await db.SavingsAccount.create({
      client_id: parseInt(req.body.client_id),
      account_type: accountType,
      account_number: accountNumber,
      balance: initialDeposit,
      interest_rate: interestRate,
      branch_id: branchId,
      status: 'active',
      created_by: req.userId,
      opening_date: req.body.opening_date || new Date(),
      currency: currency // Currency for the savings account (LRD or USD)
    });

    // If there's an initial deposit, create a transaction for it
    if (initialDeposit > 0) {
      try {
        // Generate unique transaction number
        let transactionNumber;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!isUnique && attempts < maxAttempts) {
          const transactionCount = await db.Transaction.count({ paranoid: false });
          transactionNumber = `TXN${String(transactionCount + 1 + attempts).padStart(8, '0')}`;
          
          const existingTransaction = await db.Transaction.findOne({
            where: { transaction_number: transactionNumber },
            paranoid: false
          });
          
          if (!existingTransaction) {
            isUnique = true;
          } else {
            attempts++;
          }
        }
        
        if (isUnique) {
          await db.Transaction.create({
            transaction_number: transactionNumber,
            client_id: savingsAccount.client_id,
            savings_account_id: savingsAccount.id,
            type: 'deposit',
            amount: initialDeposit,
            currency: currency,
            description: `Initial deposit for ${accountNumber}`,
            transaction_date: savingsAccount.opening_date || new Date(),
            status: 'completed',
            branch_id: branchId,
            created_by: req.userId
          });
        }
      } catch (transactionError) {
        // Log error but don't fail account creation
        console.error('Failed to create initial deposit transaction:', transactionError);
      }
    }

    // Reload savings account with relations
    await savingsAccount.reload({
      include: [
        { model: db.Client, as: 'client', required: false },
        { model: db.Branch, as: 'branch', required: false }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Savings account created successfully',
      data: { savingsAccount }
    });
  } catch (error) {
    console.error('Create savings account error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    
    // Handle specific database errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({ param: e.path, msg: e.message }))
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Account number already exists',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid client or branch reference',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create savings account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Deposit to savings account
router.post('/:id/deposit', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid deposit amount is required'),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const savingsAccount = await db.SavingsAccount.findByPk(req.params.id, {
      include: [{ model: db.Client, as: 'client', required: false }]
    });

    if (!savingsAccount) {
      return res.status(404).json({
        success: false,
        message: 'Savings account not found'
      });
    }

    if (savingsAccount.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Account is not active'
      });
    }

    const depositAmount = parseFloat(req.body.amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Deposit amount must be a positive number'
      });
    }
    const newBalance = parseFloat(savingsAccount.balance || 0) + depositAmount;

    // Create transaction with unique transaction number
    let transactionNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const transactionCount = await db.Transaction.count({ paranoid: false });
      transactionNumber = `TXN${String(transactionCount + 1 + attempts).padStart(8, '0')}`;
      
      const existingTransaction = await db.Transaction.findOne({
        where: { transaction_number: transactionNumber },
        paranoid: false
      });
      
      if (!existingTransaction) {
        isUnique = true;
      } else {
        attempts++;
      }
    }
    
    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique transaction number. Please try again.'
      });
    }

    const transaction = await db.Transaction.create({
      transaction_number: transactionNumber,
      client_id: savingsAccount.client_id,
      savings_account_id: savingsAccount.id,
      type: 'deposit',
      amount: depositAmount,
      currency: savingsAccount.currency || 'USD', // Include currency from savings account
      description: req.body.description || `Deposit to ${savingsAccount.account_number}`,
      transaction_date: new Date(),
      status: 'completed',
      branch_id: savingsAccount.branch_id,
      created_by: req.userId
    });

    // Update savings account balance
    await savingsAccount.update({ balance: newBalance });

    // Create notification
    await db.Notification.create({
      user_id: savingsAccount.client?.user_id,
      title: 'Deposit Received',
      message: `Your deposit of $${depositAmount.toFixed(2)} has been credited to account ${savingsAccount.account_number}.`,
      type: 'savings_deposit',
      related_id: savingsAccount.id,
      is_read: false
    });

    res.json({
      success: true,
      message: 'Deposit processed successfully',
      data: {
        transaction,
        savings_account: {
          account_number: savingsAccount.account_number,
          balance: newBalance
        },
        receipt: {
          transaction_number: transactionNumber,
          account_number: savingsAccount.account_number,
          client_name: `${savingsAccount.client?.first_name} ${savingsAccount.client?.last_name}`,
          amount: depositAmount,
          balance: newBalance,
          date: transaction.transaction_date,
          type: 'deposit',
          description: transaction.description
        }
      }
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process deposit',
      error: error.message
    });
  }
});

// Withdraw from savings account
router.post('/:id/withdraw', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid withdrawal amount is required'),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const savingsAccount = await db.SavingsAccount.findByPk(req.params.id, {
      include: [{ model: db.Client, as: 'client', required: false }]
    });

    if (!savingsAccount) {
      return res.status(404).json({
        success: false,
        message: 'Savings account not found'
      });
    }

    if (savingsAccount.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Account is not active'
      });
    }

    const withdrawalAmount = parseFloat(req.body.amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount must be a positive number'
      });
    }
    
    const currentBalance = parseFloat(savingsAccount.balance || 0);

    if (withdrawalAmount > currentBalance) {
      const currencySymbol = savingsAccount.currency === 'LRD' ? 'LRD' : '$';
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Current balance: ${currencySymbol}${currentBalance.toFixed(2)}`
      });
    }

    const newBalance = currentBalance - withdrawalAmount;

    // Create transaction with unique transaction number
    let transactionNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const transactionCount = await db.Transaction.count({ paranoid: false });
      transactionNumber = `TXN${String(transactionCount + 1 + attempts).padStart(8, '0')}`;
      
      const existingTransaction = await db.Transaction.findOne({
        where: { transaction_number: transactionNumber },
        paranoid: false
      });
      
      if (!existingTransaction) {
        isUnique = true;
      } else {
        attempts++;
      }
    }
    
    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique transaction number. Please try again.'
      });
    }

    const transaction = await db.Transaction.create({
      transaction_number: transactionNumber,
      client_id: savingsAccount.client_id,
      savings_account_id: savingsAccount.id,
      type: 'withdrawal',
      amount: withdrawalAmount,
      currency: savingsAccount.currency || 'USD', // Include currency from savings account
      description: req.body.description || `Withdrawal from ${savingsAccount.account_number}`,
      transaction_date: new Date(),
      status: 'completed',
      branch_id: savingsAccount.branch_id,
      created_by: req.userId
    });

    // Update savings account balance
    await savingsAccount.update({ balance: newBalance });

    // Create notification
    await db.Notification.create({
      user_id: savingsAccount.client?.user_id,
      title: 'Withdrawal Processed',
      message: `Withdrawal of $${withdrawalAmount.toFixed(2)} has been processed from account ${savingsAccount.account_number}.`,
      type: 'savings_withdrawal',
      related_id: savingsAccount.id,
      is_read: false
    });

    res.json({
      success: true,
      message: 'Withdrawal processed successfully',
      data: {
        transaction,
        savings_account: {
          account_number: savingsAccount.account_number,
          balance: newBalance
        },
        receipt: {
          transaction_number: transactionNumber,
          account_number: savingsAccount.account_number,
          client_name: `${savingsAccount.client?.first_name} ${savingsAccount.client?.last_name}`,
          amount: withdrawalAmount,
          balance: newBalance,
          date: transaction.transaction_date,
          type: 'withdrawal',
          description: transaction.description
        }
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message
    });
  }
});

// Update savings account
router.put('/:id', [
  body('account_type').optional().notEmpty(),
  body('interest_rate').optional().isFloat({ min: 0, max: 100 }),
  body('currency').optional().isIn(['LRD', 'USD'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const savingsAccount = await db.SavingsAccount.findByPk(req.params.id);
    if (!savingsAccount) {
      return res.status(404).json({
        success: false,
        message: 'Savings account not found'
      });
    }

    // Prepare update data
    const updateData = {};

    // Only update fields that are provided
    if (req.body.account_type) {
      const validAccountTypes = ['regular', 'fixed', 'joint'];
      if (validAccountTypes.includes(req.body.account_type)) {
        updateData.account_type = req.body.account_type;
      }
    }

    if (req.body.interest_rate !== undefined && req.body.interest_rate !== null && req.body.interest_rate !== '') {
      const interestRate = parseFloat(req.body.interest_rate);
      if (!isNaN(interestRate) && interestRate >= 0 && interestRate <= 100) {
        updateData.interest_rate = interestRate;
      }
    }

    if (req.body.currency && ['LRD', 'USD'].includes(req.body.currency)) {
      updateData.currency = req.body.currency;
    }

    if (req.body.branch_id !== undefined && req.body.branch_id !== null && req.body.branch_id !== '') {
      const branchId = parseInt(req.body.branch_id);
      if (!isNaN(branchId)) {
        updateData.branch_id = branchId;
      } else {
        updateData.branch_id = null;
      }
    }

    if (req.body.status && ['active', 'inactive', 'closed', 'pending'].includes(req.body.status)) {
      updateData.status = req.body.status;
    }

    await savingsAccount.update(updateData);

    // Reload to get updated data
    await savingsAccount.reload();

    res.json({
      success: true,
      message: 'Savings account updated successfully',
      data: { savingsAccount }
    });
  } catch (error) {
    console.error('Update savings account error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    
    // Handle specific database errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({ param: e.path, msg: e.message }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update savings account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete savings account
router.delete('/:id', async (req, res) => {
  try {
    const savingsAccount = await db.SavingsAccount.findByPk(req.params.id);
    if (!savingsAccount) {
      return res.status(404).json({
        success: false,
        message: 'Savings account not found'
      });
    }

    await savingsAccount.destroy();

    res.json({
      success: true,
      message: 'Savings account deleted successfully'
    });
  } catch (error) {
    console.error('Delete savings account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete savings account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


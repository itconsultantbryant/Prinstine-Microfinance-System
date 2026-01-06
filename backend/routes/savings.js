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
  body('initial_deposit').optional().isFloat({ min: 0 }).withMessage('Initial deposit must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Generate account number
    const accountCount = await db.SavingsAccount.count();
    const accountNumber = `SAV${String(accountCount + 1).padStart(8, '0')}`;

    const savingsAccount = await db.SavingsAccount.create({
      ...req.body,
      account_number: accountNumber,
      balance: req.body.initial_deposit || 0,
      branch_id: req.body.branch_id || req.user?.branch_id || null,
      status: 'active',
      created_by: req.userId
    });

    res.status(201).json({
      success: true,
      message: 'Savings account created successfully',
      data: { savingsAccount }
    });
  } catch (error) {
    console.error('Create savings account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create savings account',
      error: error.message
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
    const newBalance = parseFloat(savingsAccount.balance || 0) + depositAmount;

    // Create transaction
    const transactionCount = await db.Transaction.count();
    const transactionNumber = `TXN${String(transactionCount + 1).padStart(8, '0')}`;

    const transaction = await db.Transaction.create({
      transaction_number: transactionNumber,
      client_id: savingsAccount.client_id,
      savings_account_id: savingsAccount.id,
      type: 'deposit',
      amount: depositAmount,
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
    const currentBalance = parseFloat(savingsAccount.balance || 0);

    if (withdrawalAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    const newBalance = currentBalance - withdrawalAmount;

    // Create transaction
    const transactionCount = await db.Transaction.count();
    const transactionNumber = `TXN${String(transactionCount + 1).padStart(8, '0')}`;

    const transaction = await db.Transaction.create({
      transaction_number: transactionNumber,
      client_id: savingsAccount.client_id,
      savings_account_id: savingsAccount.id,
      type: 'withdrawal',
      amount: withdrawalAmount,
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
  body('interest_rate').optional().isFloat({ min: 0, max: 100 })
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

    await savingsAccount.update(req.body);

    res.json({
      success: true,
      message: 'Savings account updated successfully',
      data: { savingsAccount }
    });
  } catch (error) {
    console.error('Update savings account error:', error);
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


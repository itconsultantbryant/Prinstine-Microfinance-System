const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get all transactions
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

    // Get limit from query params, default to 100
    const limit = parseInt(req.query.limit) || 100;
    
    const transactions = await db.Transaction.findAll({
      where: whereClause,
      include: [
        { model: db.Client, as: 'client', required: false },
        { model: db.Loan, as: 'loan', required: false },
        { model: db.Branch, as: 'branch', required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit: limit
    });

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create transaction
router.post('/', [
  body('client_id').isInt().withMessage('Client ID is required'),
  body('type').isIn(['deposit', 'withdrawal', 'loan_payment', 'loan_disbursement', 'fee', 'interest', 'penalty', 'transfer', 'push_back', 'personal_interest_payment', 'general_interest', 'due_payment']).withMessage('Valid transaction type is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Generate transaction number
    const transactionCount = await db.Transaction.count();
    const transactionNumber = `TXN${String(transactionCount + 1).padStart(8, '0')}`;

    // Determine currency for transaction
    let currency = req.body.currency || 'USD';
    
    // If transaction is related to a loan, inherit currency from loan
    if (req.body.loan_id && !req.body.currency) {
      const loan = await db.Loan.findByPk(req.body.loan_id);
      if (loan && loan.currency) {
        currency = loan.currency;
      }
    }
    
    // If transaction is related to a savings account, inherit currency from savings
    if (req.body.savings_account_id && !req.body.currency) {
      const savings = await db.SavingsAccount.findByPk(req.body.savings_account_id);
      if (savings && savings.currency) {
        currency = savings.currency;
      }
    }
    
    // If due payment, inherit currency from client's dues_currency
    if (req.body.type === 'due_payment' && req.body.client_id && !req.body.currency) {
      const client = await db.Client.findByPk(req.body.client_id);
      if (client && client.dues_currency) {
        currency = client.dues_currency;
      }
    }
    
    // Validate currency
    if (!['LRD', 'USD'].includes(currency)) {
      currency = 'USD'; // Default to USD if invalid
    }

    const transaction = await db.Transaction.create({
      ...req.body,
      transaction_number: transactionNumber,
      branch_id: req.body.branch_id || req.user?.branch_id || null,
      status: 'completed',
      transaction_date: req.body.transaction_date || new Date(),
      created_by: req.userId,
      currency: currency // Set currency for transaction
    });

    // Handle due payment - reduce client's total_dues (only if same currency)
    if (req.body.type === 'due_payment' && req.body.client_id) {
      const client = await db.Client.findByPk(req.body.client_id);
      if (client) {
        // Only process payment if currency matches client's dues currency
        if (client.dues_currency === currency) {
          const paymentAmount = parseFloat(req.body.amount || 0);
          const currentDues = parseFloat(client.total_dues || 0);
          // Add payment amount to negative dues (reduces the negative balance)
          const newDues = Math.min(0, currentDues + paymentAmount);
          await client.update({ total_dues: newDues });
        } else {
          console.warn(`Due payment currency (${currency}) does not match client dues currency (${client.dues_currency})`);
        }
      }
    }

    // Get client for receipt
    const client = await db.Client.findByPk(req.body.client_id);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { 
        transaction,
        receipt: {
          transaction_number: transactionNumber,
          client_name: client ? `${client.first_name} ${client.last_name}` : '',
          amount: req.body.amount,
          date: transaction.transaction_date,
          type: req.body.type,
          description: req.body.description
        }
      }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id, {
      include: [
        { model: db.Client, as: 'client', required: false },
        { model: db.Loan, as: 'loan', required: false },
        { model: db.SavingsAccount, as: 'savingsAccount', required: false },
        { model: db.Branch, as: 'branch', required: false }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update transaction
router.put('/:id', [
  body('amount').optional().isFloat({ min: 0.01 }),
  body('type').optional().isIn(['deposit', 'withdrawal', 'loan_payment', 'loan_disbursement', 'fee', 'interest', 'penalty', 'transfer', 'push_back'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transaction = await db.Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.update(req.body);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.destroy();

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


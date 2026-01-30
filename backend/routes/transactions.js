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
    } else if (req.query.client_id) {
      const queryClientId = parseInt(req.query.client_id);
      if (!isNaN(queryClientId)) {
        whereClause.client_id = queryClientId;
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
  body('currency').optional().isIn(['LRD', 'USD']).withMessage('Currency must be LRD or USD'),
  body('purpose').notEmpty().withMessage('Purpose of transaction is required'),
  body('description').optional().isString(),
  body('loan_id').optional().isInt(),
  body('savings_account_id').optional().isInt(),
  body('transaction_date').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Validate client exists
    const client = await db.Client.findByPk(req.body.client_id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Validate loan if provided
    if (req.body.loan_id) {
      const loan = await db.Loan.findByPk(req.body.loan_id);
      if (!loan) {
        return res.status(404).json({ success: false, message: 'Loan not found' });
      }
    }

    // Validate savings account if provided
    if (req.body.savings_account_id) {
      const savings = await db.SavingsAccount.findByPk(req.body.savings_account_id);
      if (!savings) {
        return res.status(404).json({ success: false, message: 'Savings account not found' });
      }
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
    
    // If due payment, validate and inherit currency from client's dues_currency
    if (req.body.type === 'due_payment') {
      if (client.dues_currency) {
        // If currency provided, validate it matches client's dues currency
        if (req.body.currency && req.body.currency !== client.dues_currency) {
          return res.status(400).json({ 
            success: false, 
            message: `Due payment currency must match client's dues currency (${client.dues_currency})` 
          });
        }
        // If no currency provided, use client's dues currency
        if (!req.body.currency) {
          currency = client.dues_currency;
        }
      }
    }
    
    // Validate currency
    if (!['LRD', 'USD'].includes(currency)) {
      currency = 'USD'; // Default to USD if invalid
    }

    // Prepare transaction data
    const transactionData = {
      transaction_number: transactionNumber,
      client_id: parseInt(req.body.client_id),
      loan_id: req.body.loan_id ? parseInt(req.body.loan_id) : null,
      savings_account_id: req.body.savings_account_id ? parseInt(req.body.savings_account_id) : null,
      type: req.body.type,
      amount: parseFloat(req.body.amount),
      currency: currency,
      description: req.body.description || null,
      purpose: req.body.purpose || null, // Include purpose field
      branch_id: req.body.branch_id ? parseInt(req.body.branch_id) : (req.user?.branch_id || null),
      status: 'completed',
      transaction_date: req.body.transaction_date ? new Date(req.body.transaction_date) : new Date(),
      created_by: req.userId
    };

    const transaction = await db.Transaction.create(transactionData);

    // Handle due payment - add or reduce client's total_dues (only if same currency)
    if (req.body.type === 'due_payment' && client) {
      const paymentAmount = parseFloat(req.body.amount || 0);
      const currentDues = parseFloat(client.total_dues || 0);
      const updatedCurrency = client.dues_currency || currency;

      // If client has no dues currency yet, set it from the transaction
      if (!client.dues_currency && updatedCurrency) {
        await client.update({ dues_currency: updatedCurrency });
      }

      // Currency should already match at this point (validated above)
      if (updatedCurrency === currency) {
        let newDues = 0;
        if (currentDues >= 0) {
          // No outstanding dues yet - treat this as adding dues
          newDues = -Math.abs(paymentAmount);
        } else {
          // Reduce outstanding dues (stored as negative)
          newDues = Math.min(0, currentDues + paymentAmount);
        }
        await client.update({ total_dues: newDues });
      } else {
        console.warn(`Due payment currency (${currency}) does not match client dues currency (${updatedCurrency})`);
      }
    }

    // Reload transaction with associations for response
    const createdTransaction = await db.Transaction.findByPk(transaction.id, {
      include: [
        { model: db.Client, as: 'client', required: false },
        { model: db.Loan, as: 'loan', required: false },
        { model: db.SavingsAccount, as: 'savingsAccount', required: false }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { 
        transaction: createdTransaction,
        receipt: {
          transaction_number: transactionNumber,
          client_name: client ? `${client.first_name} ${client.last_name}` : '',
          amount: req.body.amount,
          currency: currency,
          date: transaction.transaction_date,
          type: req.body.type,
          description: req.body.description
        }
      }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
  body('type').optional().isIn(['deposit', 'withdrawal', 'loan_payment', 'loan_disbursement', 'fee', 'interest', 'penalty', 'transfer', 'push_back', 'personal_interest_payment', 'general_interest', 'due_payment']),
  body('currency').optional().isIn(['LRD', 'USD'])
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

// Delete transaction (soft delete) and related revenue
router.delete('/:id', async (req, res) => {
  const dbTransaction = await db.sequelize.transaction();
  try {
    const transaction = await db.Transaction.findByPk(req.params.id, { transaction: dbTransaction });
    if (!transaction) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await db.Revenue.destroy({
      where: { transaction_id: transaction.id },
      transaction: dbTransaction
    });

    await transaction.destroy({ transaction: dbTransaction });

    await dbTransaction.commit();

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    await dbTransaction.rollback();
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


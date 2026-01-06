const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'general_manager', 'accountant', 'finance'));

// Get chart of accounts
router.get('/chart-of-accounts', async (req, res) => {
  try {
    const accounts = await db.ChartOfAccount.findAll({
      order: [['code', 'ASC']]
    });

    res.json({
      success: true,
      data: { accounts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart of accounts',
      error: error.message
    });
  }
});

// Get general ledger
router.get('/general-ledger', async (req, res) => {
  try {
    // Try to get entries, but handle case where table might be empty
    let entries = [];
    try {
      entries = await db.GeneralLedger.findAll({
        include: [
          { 
            model: db.ChartOfAccount, 
            as: 'account',
            required: false,
            attributes: ['id', 'code', 'name', 'type']
          },
          { 
            model: db.Branch, 
            as: 'branch',
            required: false,
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['transaction_date', 'DESC']],
        limit: 100
      });
    } catch (dbError) {
      // If table doesn't exist or has issues, return empty array
      console.log('General Ledger table may be empty:', dbError.message);
      entries = [];
    }

    res.json({
      success: true,
      data: { entries }
    });
  } catch (error) {
    console.error('General Ledger Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch general ledger',
      error: error.message
    });
  }
});

// Create chart of account
router.post('/chart-of-accounts', [
  body('code').notEmpty().withMessage('Account code is required'),
  body('name').notEmpty().withMessage('Account name is required'),
  body('type').isIn(['asset', 'liability', 'equity', 'revenue', 'expense']).withMessage('Valid account type is required'),
  body('normal_balance').isIn(['debit', 'credit']).withMessage('Normal balance is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check if code already exists
    const existingAccount = await db.ChartOfAccount.findOne({
      where: { code: req.body.code }
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'Account code already exists'
      });
    }

    const account = await db.ChartOfAccount.create({
      ...req.body,
      balance: req.body.opening_balance || 0,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { account }
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message
    });
  }
});

module.exports = router;


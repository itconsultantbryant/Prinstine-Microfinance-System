const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();
const { LOAN_TYPES, getLoanTypeConfig } = require('../config/loanTypes');

// Get loan type configurations
router.get('/types', authenticate, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        loan_types: LOAN_TYPES
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan types',
      error: error.message
    });
  }
});

// Get all loans
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, loan_type } = req.query;
    const offset = (page - 1) * limit;
    const branchId = req.user?.branch_id || null;
    const userRole = req.user?.role || 'user';

    // For borrower role, get their client_id and filter by it
    let clientId = null;
    if (userRole === 'borrower') {
      const client = await db.Client.findOne({ where: { user_id: req.userId } });
      if (client) {
        clientId = client.id;
      }
    }

    let whereClause = {};
    if (userRole === 'borrower' && clientId) {
      // For borrowers, only show their own loans
      whereClause.client_id = clientId;
    } else if (branchId && userRole !== 'admin' && userRole !== 'general_manager') {
      whereClause.branch_id = branchId;
    }

    if (search) {
      whereClause[Op.or] = [
        { loan_number: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) whereClause.status = status;
    if (loan_type) whereClause.loan_type = loan_type;

    const { count, rows } = await db.Loan.findAndCountAll({
      where: whereClause,
      include: [
        { model: db.Client, as: 'client', required: false, attributes: ['id', 'first_name', 'last_name', 'client_number'] },
        { model: db.Branch, as: 'branch', required: false, attributes: ['id', 'name'] },
        { model: db.Collateral, as: 'collateral', required: false }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        loans: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get loans error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single loan
router.get('/:id', authenticate, async (req, res) => {
  try {
    const loan = await db.Loan.findByPk(req.params.id, {
      include: [
        { model: db.Client, as: 'client', required: false, attributes: ['id', 'first_name', 'last_name', 'client_number', 'email', 'phone'] },
        { model: db.Branch, as: 'branch', required: false, attributes: ['id', 'name', 'code'] },
        { model: db.Collateral, as: 'collateral', required: false, attributes: ['id', 'type', 'description', 'estimated_value', 'currency', 'status'] },
        { 
          model: db.LoanRepayment, 
          as: 'repayments', 
          required: false,
          attributes: ['id', 'repayment_number', 'installment_number', 'amount', 'principal_amount', 'interest_amount', 'penalty_amount', 'due_date', 'payment_date', 'status', 'payment_method']
        }
      ]
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Parse repayment schedule if it's a string
    if (loan.repayment_schedule && typeof loan.repayment_schedule === 'string') {
      try {
        loan.repayment_schedule = JSON.parse(loan.repayment_schedule);
      } catch (e) {
        console.error('Error parsing repayment schedule:', e);
        loan.repayment_schedule = [];
      }
    }

    res.json({
      success: true,
      data: { loan }
    });
  } catch (error) {
    console.error('Get loan error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create loan (or loan request for borrowers)
router.post('/', authenticate, [
  body('client_id').optional().isInt().withMessage('Client ID must be a number'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('interest_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Valid interest rate is required'),
  body('term_months').isInt({ min: 1 }).withMessage('Valid term is required')
], async (req, res) => {
  try {
    // Log request body for debugging
    console.log('Loan creation request:', {
      body: req.body,
      userId: req.userId,
      userRole: req.user?.role
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      const errorMessages = errors.array().map(e => `${e.param}: ${e.msg}`).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Validation failed: ${errorMessages}`,
        error: errorMessages,
        errors: errors.array() 
      });
    }

    const userRole = req.user?.role || 'user';
    let clientId = req.body.client_id ? parseInt(req.body.client_id) : null;

    // For borrower role, get their client_id automatically
    if (userRole === 'borrower') {
      const client = await db.Client.findOne({ where: { user_id: req.userId } });
      if (!client) {
        return res.status(400).json({
          success: false,
          message: 'Client profile not found. Please contact support.'
        });
      }
      clientId = client.id;
      // For borrowers, set status to 'pending' (loan request)
      req.body.status = 'pending';
    } else {
      // For non-borrower roles, client_id is required
      if (!clientId || isNaN(clientId)) {
        return res.status(400).json({
          success: false,
          message: 'Client ID is required for loan creation.'
        });
      }

      // Verify client exists
      const client = await db.Client.findByPk(clientId);
      if (!client) {
        return res.status(400).json({
          success: false,
          message: 'Client not found. Please select a valid client.'
        });
      }
    }

    const loanCalculation = require('../services/loanCalculation');
    const { getLoanTypeConfig, calculateUpfrontAmount, calculatePrincipalAmount } = require('../config/loanTypes');
    
    // Generate loan number
    const loanCount = await db.Loan.count();
    const loanNumber = `LN${String(loanCount + 1).padStart(6, '0')}`;

    const loanType = req.body.loan_type || 'personal';
    const loanTypeConfig = getLoanTypeConfig(loanType);
    
    // Validate required numeric fields
    if (!loanTypeConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid loan type: ${loanType}.`
      });
    }

    // Get loan amount (total requested)
    const loanAmount = parseFloat(req.body.amount);
    if (isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid loan amount is required (must be greater than 0).'
      });
    }
    
    // Get interest rate (from form or loan type config)
    let interestRate = parseFloat(req.body.interest_rate);
    if (isNaN(interestRate) || interestRate < 0) {
      interestRate = loanTypeConfig.interestRate || 0;
    }
    
    const termMonths = parseInt(req.body.term_months);
    if (isNaN(termMonths) || termMonths < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid loan term is required (must be at least 1 month).'
      });
    }

    const interestMethod = req.body.interest_method || loanTypeConfig.interestMethod || 'declining_balance';
    const paymentFrequency = req.body.payment_frequency || 'monthly';
    const disbursementDate = req.body.disbursement_date || new Date().toISOString().split('T')[0];

    // Handle different loan types
    // Personal and Excess: 10% interest on loan amount, no upfront
    // Other loans: upfront is a fee, interest is calculated on principal
    let scheduleData;
    let totalInterest;
    let totalAmount;
    let principal;
    let upfrontAmount;
    let upfrontPercentage;
    let defaultChargesPercentage;
    let defaultChargesAmount;
    
    if (loanType === 'personal' || loanType === 'excess') {
      // Personal/Excess loans: 10% interest calculated on full loan amount, no upfront
      // Interest is distributed: Personal (30% admin, 40% client, 30% general), Excess (20% admin, 30% client, 50% general)
      upfrontPercentage = 0;
      upfrontAmount = 0;
      principal = loanAmount; // Full loan amount (no upfront deduction)
      defaultChargesPercentage = 0;
      defaultChargesAmount = 0;
      
      // Generate schedule with interest calculated on the full loan amount
      try {
        scheduleData = loanCalculation.generateRepaymentSchedule(
          loanAmount, // Use full loan amount (no upfront deduction)
          interestRate, // 10% interest
          termMonths,
          interestMethod,
          paymentFrequency,
          disbursementDate
        );
        
        if (!scheduleData || !scheduleData.schedule || !Array.isArray(scheduleData.schedule) || scheduleData.schedule.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Failed to generate repayment schedule. Please check loan parameters.'
          });
        }
      } catch (scheduleError) {
        console.error('Schedule generation error:', scheduleError);
        return res.status(400).json({
          success: false,
          message: 'Failed to generate repayment schedule: ' + scheduleError.message
        });
      }
      
      // Total interest = schedule interest (calculated on loan amount)
      totalInterest = scheduleData.total_interest || 0;
      // Total amount = loan amount + interest
      totalAmount = scheduleData.total_amount || loanAmount;
    } else {
      // Other loan types: Upfront is a fee, interest is calculated on principal
      // Calculate upfront percentage and amount
      upfrontPercentage = parseFloat(req.body.upfront_percentage) || loanTypeConfig.upfrontPercentage;
      upfrontAmount = calculateUpfrontAmount(loanAmount, upfrontPercentage);
      
      // Calculate principal amount (after upfront deduction)
      principal = calculatePrincipalAmount(loanAmount, upfrontAmount);
      
      // Get default charges (only for Emergency and Micro loans)
      defaultChargesPercentage = loanTypeConfig.hasDefaultCharges 
        ? (parseFloat(req.body.default_charges_percentage) || 0)
        : 0;
      defaultChargesAmount = defaultChargesPercentage > 0 
        ? (principal * defaultChargesPercentage / 100)
        : 0;
      
      // Generate repayment schedule based on principal
      try {
        scheduleData = loanCalculation.generateRepaymentSchedule(
          principal,
          interestRate,
          termMonths,
          interestMethod,
          paymentFrequency,
          disbursementDate
        );
        
        if (!scheduleData || !scheduleData.schedule || !Array.isArray(scheduleData.schedule) || scheduleData.schedule.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Failed to generate repayment schedule. Please check loan parameters.'
          });
        }
      } catch (scheduleError) {
        console.error('Schedule generation error:', scheduleError);
        return res.status(400).json({
          success: false,
          message: 'Failed to generate repayment schedule: ' + scheduleError.message
        });
      }
      
      // Total interest = schedule interest (calculated on principal)
      totalInterest = scheduleData.total_interest || 0;
      // Total amount = principal + schedule interest + default charges
      totalAmount = (scheduleData.total_amount || principal) + defaultChargesAmount;
    }
    
    // Outstanding balance = principal + total interest (from schedule) + default charges
    // For Personal/Excess loans, principal is the loan amount and interest is calculated on it
    const outstandingBalance = principal + totalInterest + defaultChargesAmount;

    // Validate collateral_id if provided
    let collateralId = null;
    if (req.body.collateral_id) {
      const collateralIdInt = parseInt(req.body.collateral_id);
      if (!isNaN(collateralIdInt)) {
        // Verify collateral exists and belongs to the client
        const collateral = await db.Collateral.findByPk(collateralIdInt);
        if (collateral && collateral.client_id === clientId) {
          collateralId = collateralIdInt;
        } else if (collateral && collateral.client_id !== clientId) {
          return res.status(400).json({
            success: false,
            message: 'Selected collateral does not belong to the selected client.'
          });
        }
      }
    }

    // Prepare loan data, ensuring proper types
    const loanData = {
      loan_number: loanNumber,
      client_id: clientId, // Already validated and parsed
      amount: loanAmount, // Total loan amount requested
      principal_amount: principal, // Principal after upfront deduction
      interest_rate: interestRate,
      term_months: termMonths,
      loan_type: loanType,
      payment_frequency: paymentFrequency,
      interest_method: interestMethod,
      loan_purpose: req.body.loan_purpose ? String(req.body.loan_purpose).trim() : null,
      collateral_id: collateralId,
      disbursement_date: disbursementDate,
      branch_id: req.body.branch_id ? parseInt(req.body.branch_id) : (req.user?.branch_id || null),
      status: userRole === 'borrower' ? 'pending' : 'pending',
      outstanding_balance: outstandingBalance, // Principal + total interest + default charges
      monthly_payment: scheduleData.monthly_payment || 0,
      total_interest: totalInterest || 0, // Total interest (calculated on loan amount or principal)
      total_amount: totalAmount || loanAmount, // Total amount (loan amount + interest + charges)
      repayment_schedule: JSON.stringify(scheduleData.schedule || []),
      application_date: disbursementDate,
      notes: req.body.notes ? String(req.body.notes).trim() : null,
      created_by: req.userId,
      upfront_percentage: upfrontPercentage,
      upfront_amount: upfrontAmount,
      default_charges_percentage: defaultChargesPercentage,
      default_charges_amount: defaultChargesAmount
    };

    const loan = await db.Loan.create(loanData);

    // Create repayment schedule entries
    try {
      for (const scheduleItem of scheduleData.schedule) {
        await db.LoanRepayment.create({
          loan_id: loan.id,
          repayment_number: `${loanNumber}-${String(scheduleItem.installment_number).padStart(3, '0')}`,
          installment_number: scheduleItem.installment_number,
          amount: scheduleItem.total_payment,
          principal_amount: scheduleItem.principal_amount,
          interest_amount: scheduleItem.interest_amount,
          due_date: scheduleItem.due_date,
          payment_date: null,
          status: 'pending',
          created_by: req.userId
        });
      }
    } catch (repaymentError) {
      console.error('Error creating repayment schedule entries:', repaymentError);
      // Continue even if repayment entries fail - loan is still created
    }

    const isBorrowerRequest = userRole === 'borrower';
    
    res.status(201).json({
      success: true,
      message: isBorrowerRequest 
        ? 'Loan request submitted successfully! It will be reviewed by a loan officer, head of micro loan, or admin.'
        : 'Loan created successfully',
      data: { 
        loan,
        repayment_schedule: scheduleData.schedule,
        schedule_summary: {
          total_interest: totalInterest,
          total_amount: totalAmount,
          monthly_payment: scheduleData.monthly_payment,
          upfront_amount: upfrontAmount,
          principal_amount: principal,
          default_charges_amount: defaultChargesAmount
        }
      }
    });
  } catch (error) {
    console.error('Create loan error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Check for specific error types
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.name === 'SequelizeDatabaseError') {
      // Database constraint errors (like ENUM value not found)
      if (error.message.includes('enum') || error.message.includes('loan_type')) {
        errorMessage = 'Invalid loan type. Please ensure the database has been migrated.';
        console.error('ENUM error detected - database may need migration');
      } else {
        errorMessage = error.message;
      }
    } else if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Validation failed: ' + error.errors.map(e => e.message).join(', ');
      statusCode = 400;
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = 'Loan number already exists';
      statusCode = 400;
    } else if (process.env.NODE_ENV === 'development') {
      errorMessage = error.message;
      if (error.errors) {
        errorMessage += ' - ' + JSON.stringify(error.errors);
      }
    }
    
    res.status(statusCode).json({
      success: false,
      message: 'Failed to create loan',
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        details: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    });
  }
});

// Approve loan
router.post('/:id/approve', authenticate, authorize('admin', 'branch_manager', 'general_manager', 'micro_loan_officer', 'head_micro_loan', 'supervisor'), async (req, res) => {
  try {
    const loan = await db.Loan.findByPk(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    await loan.update({ status: 'approved' });

    res.json({
      success: true,
      message: 'Loan approved successfully',
      data: { loan }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve loan',
      error: error.message
    });
  }
});

// Disburse loan
router.post('/:id/disburse', authenticate, authorize('admin', 'branch_manager', 'general_manager', 'finance'), async (req, res) => {
  try {
    const loan = await db.Loan.findByPk(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    await loan.update({
      status: 'disbursed',
      disbursement_date: new Date()
    });

    res.json({
      success: true,
      message: 'Loan disbursed successfully',
      data: { loan }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to disburse loan',
      error: error.message
    });
  }
});

// Calculate repayment schedule (preview)
router.post('/calculate-schedule', authenticate, async (req, res) => {
  try {
    const loanCalculation = require('../services/loanCalculation');
    const { getLoanTypeConfig, calculateUpfrontAmount, calculatePrincipalAmount } = require('../config/loanTypes');
    
    const { 
      loan_amount, 
      upfront_percentage, 
      loan_type,
      interest_rate, 
      term_months, 
      interest_method, 
      payment_frequency, 
      start_date,
      default_charges_percentage
    } = req.body;

    // If loan_amount and upfront_percentage are provided, calculate principal
    let principal = parseFloat(req.body.principal) || 0;
    let upfrontAmount = 0;
    let totalInterest = 0;
    let totalAmount = 0;
    
    if (loan_amount && upfront_percentage) {
      const loanAmount = parseFloat(loan_amount);
      const upfrontPct = parseFloat(upfront_percentage);
      upfrontAmount = calculateUpfrontAmount(loanAmount, upfrontPct);
      principal = calculatePrincipalAmount(loanAmount, upfrontAmount);
    }

    if (!principal || principal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Principal amount is required'
      });
    }

    const loanType = loan_type || 'personal';
    const loanTypeConfig = getLoanTypeConfig(loanType);
    const interestRate = parseFloat(interest_rate) || loanTypeConfig.interestRate;
    
    // Calculate default charges if applicable
    const defaultChargesPercentage = loanTypeConfig.hasDefaultCharges 
      ? (parseFloat(default_charges_percentage) || 0)
      : 0;
    const defaultChargesAmount = defaultChargesPercentage > 0 
      ? (principal * defaultChargesPercentage / 100)
      : 0;

    // Generate schedule
    let scheduleData;
    if (loanType === 'personal' && interestRate === 0) {
      // Personal loan: upfront is interest
      totalInterest = upfrontAmount;
      scheduleData = loanCalculation.generateRepaymentSchedule(
        principal,
        0,
        term_months,
        interest_method || 'declining_balance',
        payment_frequency || 'monthly',
        start_date
      );
      scheduleData.total_interest = totalInterest;
      scheduleData.total_amount = loan_amount || (principal + upfrontAmount);
      totalAmount = scheduleData.total_amount;
    } else {
      scheduleData = loanCalculation.generateRepaymentSchedule(
        principal,
        interestRate,
        term_months,
        interest_method || 'declining_balance',
        payment_frequency || 'monthly',
        start_date
      );
      totalInterest = scheduleData.total_interest;
      totalAmount = scheduleData.total_amount + defaultChargesAmount;
    }

    res.json({
      success: true,
      data: {
        ...scheduleData,
        total_interest: totalInterest,
        total_amount: totalAmount,
        upfront_amount: upfrontAmount,
        principal_amount: principal,
        default_charges_amount: defaultChargesAmount
      }
    });
  } catch (error) {
    console.error('Calculate schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate schedule',
      error: error.message
    });
  }
});

// Get repayment schedule
router.get('/:id/schedule', authenticate, async (req, res) => {
  try {
    const loan = await db.Loan.findByPk(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Parse repayment_schedule if it's a string
    let schedule = [];
    try {
      if (loan.repayment_schedule) {
        schedule = typeof loan.repayment_schedule === 'string' 
          ? JSON.parse(loan.repayment_schedule) 
          : loan.repayment_schedule;
      }
    } catch (parseError) {
      console.error('Error parsing repayment schedule:', parseError);
      schedule = [];
    }

    // If no schedule in loan, try to get from repayments
    if (!schedule || schedule.length === 0) {
      const repayments = await db.LoanRepayment.findAll({
        where: { loan_id: loan.id },
        order: [['installment_number', 'ASC']]
      });
      
      schedule = repayments.map(r => ({
        installment_number: r.installment_number,
        due_date: r.due_date,
        principal_payment: parseFloat(r.principal_amount || 0),
        interest_payment: parseFloat(r.interest_amount || 0),
        total_payment: parseFloat(r.amount || 0),
        outstanding_balance: 0, // Would need to calculate
        status: r.status || 'pending',
        paid_amount: r.payment_date ? parseFloat(r.amount || 0) : 0,
        payment_date: r.payment_date
      }));
    }

    const repayments = await db.LoanRepayment.findAll({
      where: { loan_id: loan.id },
      order: [['installment_number', 'ASC']]
    });

    const scheduleWithPayments = schedule.map((item) => {
      const repayment = repayments.find(r => r.installment_number === item.installment_number);
      return {
        ...item,
        status: repayment ? repayment.status : (item.status || 'pending'),
        paid_amount: repayment && repayment.payment_date ? parseFloat(repayment.amount || 0) : 0,
        payment_date: repayment ? repayment.payment_date : null
      };
    });

    res.json({
      success: true,
      data: {
        loan: {
          loan_number: loan.loan_number,
          amount: loan.amount,
          interest_rate: loan.interest_rate,
          term_months: loan.term_months,
          interest_method: loan.interest_method,
          monthly_payment: loan.monthly_payment,
          total_interest: loan.total_interest,
          total_amount: loan.total_amount
        },
        schedule: scheduleWithPayments
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Loan repayment
router.post('/:id/repay', authenticate, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid payment amount is required'),
  body('payment_method').optional().isIn(['cash', 'bank_transfer', 'mobile_money', 'check']),
  body('payment_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Repayment validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Ensure amount is a number
    const paymentAmount = parseFloat(req.body.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const loan = await db.Loan.findByPk(req.params.id, {
      include: [{ model: db.Client, as: 'client', required: false }]
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    if (loan.status !== 'active' && loan.status !== 'disbursed') {
      return res.status(400).json({
        success: false,
        message: 'Loan is not active for repayment'
      });
    }

    const outstandingBalance = parseFloat(loan.outstanding_balance || loan.amount);

    if (paymentAmount > outstandingBalance) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds outstanding balance'
      });
    }

    // Find next due repayment (pending or partial)
    const nextRepayment = await db.LoanRepayment.findOne({
      where: {
        loan_id: loan.id,
        status: { [Op.in]: ['pending', 'partial'] }
      },
      order: [['due_date', 'ASC'], ['installment_number', 'ASC']]
    });

    if (!nextRepayment) {
      return res.status(400).json({
        success: false,
        message: 'No pending repayments found'
      });
    }

    // Calculate payment breakdown
    const interestAmount = Math.min(paymentAmount, parseFloat(nextRepayment.interest_amount || 0));
    const principalAmount = paymentAmount - interestAmount;
    const penaltyAmount = 0; // Can be calculated based on overdue days

    // Update repayment
    const remainingAmount = parseFloat(nextRepayment.amount) - paymentAmount;
    if (remainingAmount <= 0.01) {
      await nextRepayment.update({
        amount: paymentAmount,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        penalty_amount: penaltyAmount,
        payment_date: req.body.payment_date || new Date().toISOString().split('T')[0],
        payment_method: req.body.payment_method || 'cash',
        status: 'completed',
        transaction_id: null // Will be set after transaction creation
      });
    } else {
      await nextRepayment.update({
        amount: paymentAmount,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        penalty_amount: penaltyAmount,
        payment_date: req.body.payment_date || new Date().toISOString().split('T')[0],
        payment_method: req.body.payment_method || 'cash',
        status: 'partial'
      });
    }

    // Create main loan payment transaction
    const transactionCount = await db.Transaction.count();
    const transactionNumber = `TXN${String(transactionCount + 1).padStart(8, '0')}`;

    const transaction = await db.Transaction.create({
      transaction_number: transactionNumber,
      client_id: loan.client_id,
      loan_id: loan.id,
      type: 'loan_payment',
      amount: paymentAmount,
      description: `Loan repayment for ${loan.loan_number}`,
      transaction_date: req.body.payment_date || new Date(),
      status: 'completed',
      branch_id: loan.branch_id,
      created_by: req.userId
    });

    // Update repayment with transaction ID
    await nextRepayment.update({ transaction_id: transaction.id });

    // Handle interest distribution if interest amount > 0 and loan type is personal or excess
    if (interestAmount > 0 && (loan.loan_type === 'personal' || loan.loan_type === 'excess')) {
      const { getLoanTypeConfig } = require('../config/loanTypes');
      const loanTypeConfig = getLoanTypeConfig(loan.loan_type);
      
      // Get interest distribution configuration
      if (loanTypeConfig.interestDistribution) {
        const { admin, client, general } = loanTypeConfig.interestDistribution;
        
        // Calculate shares
        const adminShare = interestAmount * admin;
        const clientShare = interestAmount * client;
        const generalShare = interestAmount * general;
        
        // Create Revenue entry for admin share
        if (adminShare > 0) {
          try {
            const revenueCount = await db.Revenue.count();
            const revenueNumber = `REV${String(revenueCount + 1).padStart(8, '0')}`;
            
            await db.Revenue.create({
              revenue_number: revenueNumber,
              source: 'loan_interest',
              loan_id: loan.id,
              transaction_id: transaction.id,
              amount: adminShare,
              description: `Admin revenue share from ${loan.loan_type} loan ${loan.loan_number} interest payment`,
              revenue_date: req.body.payment_date || new Date(),
              created_by: req.userId
            });
          } catch (revenueError) {
            console.error('Error creating revenue entry:', revenueError);
            // Continue even if revenue creation fails
          }
        }
        
        // Check if client has savings accounts for personal interest
        const savingsAccounts = await db.SavingsAccount.findAll({
          where: { 
            client_id: loan.client_id,
            status: 'active'
          }
        });

        if (savingsAccounts.length > 0 && clientShare > 0) {
          // Personal Interest Payment: Client share goes to client's savings
          const currentTransactionCount = await db.Transaction.count();
          let transactionCounter = currentTransactionCount + 1;
          
          const personalInterestTransactionNumber = `TXN${String(transactionCounter++).padStart(8, '0')}`;
          await db.Transaction.create({
            transaction_number: personalInterestTransactionNumber,
            client_id: loan.client_id,
            loan_id: loan.id,
            savings_account_id: savingsAccounts[0].id, // Use first active savings account
            type: 'personal_interest_payment',
            amount: clientShare,
            description: `Personal interest payment from ${loan.loan_type} loan ${loan.loan_number}`,
            transaction_date: req.body.payment_date || new Date(),
            status: 'completed',
            branch_id: loan.branch_id,
            created_by: req.userId
          });

          // Credit personal interest to savings account
          await savingsAccounts[0].update({
            balance: parseFloat(savingsAccounts[0].balance || 0) + clientShare
          });
        }

        // General Interest: Share general interest among all clients with savings
        if (generalShare > 0) {
          // Get all active savings accounts (all clients with savings)
          const allSavingsAccounts = await db.SavingsAccount.findAll({
            where: { status: 'active' },
            include: [{ model: db.Client, as: 'client', required: true }]
          });

          if (allSavingsAccounts.length > 0) {
            // Calculate share per savings account
            const generalInterestSharePerAccount = generalShare / allSavingsAccounts.length;
            
            // Get transaction counter for general interest transactions
            const currentTransactionCount = await db.Transaction.count();
            let transactionCounter = currentTransactionCount + 1;

            // Distribute general interest to all savings accounts
            for (let i = 0; i < allSavingsAccounts.length; i++) {
              const account = allSavingsAccounts[i];
              // Get next transaction number
              const generalInterestTransactionNumber = `TXN${String(transactionCounter++).padStart(8, '0')}`;
              
              // Create general interest transaction for each account
              await db.Transaction.create({
                transaction_number: generalInterestTransactionNumber,
                client_id: account.client_id,
                loan_id: loan.id,
                savings_account_id: account.id,
                type: 'general_interest',
                amount: generalInterestSharePerAccount,
                description: `General interest share from ${loan.loan_type} loan ${loan.loan_number}`,
                transaction_date: req.body.payment_date || new Date(),
                status: 'completed',
                branch_id: loan.branch_id,
                created_by: req.userId
              });

              // Credit general interest to savings account
              await account.update({
                balance: parseFloat(account.balance || 0) + generalInterestSharePerAccount
              });
            }
          }
        }
      }
    }

    // Update loan
    const newOutstanding = Math.max(0, outstandingBalance - principalAmount);
    const newTotalPaid = (parseFloat(loan.total_paid || 0) + paymentAmount);

    await loan.update({
      outstanding_balance: newOutstanding,
      total_paid: newTotalPaid,
      status: newOutstanding <= 0.01 ? 'completed' : loan.status
    });

    // Create notification for client
    await db.Notification.create({
      user_id: loan.client?.user_id,
      title: 'Loan Repayment Received',
      message: `Your payment of $${paymentAmount.toFixed(2)} for loan ${loan.loan_number} has been received.`,
      type: 'loan_repayment',
      related_id: loan.id,
      is_read: false
    });

    res.json({
      success: true,
      message: 'Repayment processed successfully',
      data: {
        repayment: nextRepayment,
        transaction,
        loan: {
          outstanding_balance: newOutstanding,
          total_paid: newTotalPaid,
          status: loan.status
        },
        receipt: {
          transaction_number: transactionNumber,
          loan_number: loan.loan_number,
          client_name: `${loan.client?.first_name} ${loan.client?.last_name}`,
          amount: paymentAmount,
          principal: principalAmount,
          interest: interestAmount,
          penalty: penaltyAmount,
          date: transaction.transaction_date,
          outstanding_balance: newOutstanding,
          payment_method: req.body.payment_method || 'cash',
          description: req.body.description || `Loan repayment for ${loan.loan_number}`
        }
      }
    });
  } catch (error) {
    console.error('Repayment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process repayment',
      error: error.message
    });
  }
});

// Update loan
router.put('/:id', authenticate, [
  body('amount').optional().isFloat({ min: 0 }),
  body('interest_rate').optional().isFloat({ min: 0, max: 100 }),
  body('term_months').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const loan = await db.Loan.findByPk(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // If loan amount, interest rate, or term changed, regenerate schedule
    if (req.body.amount || req.body.interest_rate || req.body.term_months) {
      const loanCalculation = require('../services/loanCalculation');
      const principal = parseFloat(req.body.amount || loan.amount);
      const interestRate = parseFloat(req.body.interest_rate || loan.interest_rate);
      const termMonths = parseInt(req.body.term_months || loan.term_months);
      const interestMethod = req.body.interest_method || loan.interest_method || 'declining_balance';
      const paymentFrequency = req.body.payment_frequency || loan.payment_frequency || 'monthly';
      const disbursementDate = loan.disbursement_date || loan.application_date || new Date().toISOString().split('T')[0];

      const scheduleData = loanCalculation.generateRepaymentSchedule(
        principal,
        interestRate,
        termMonths,
        interestMethod,
        paymentFrequency,
        disbursementDate
      );

      // Delete old repayments
      await db.LoanRepayment.destroy({ where: { loan_id: loan.id } });

      // Create new repayments
      for (const scheduleItem of scheduleData.schedule) {
        await db.LoanRepayment.create({
          loan_id: loan.id,
          repayment_number: `${loan.loan_number}-${String(scheduleItem.installment_number).padStart(3, '0')}`,
          installment_number: scheduleItem.installment_number,
          amount: scheduleItem.total_payment,
          principal_amount: scheduleItem.principal_payment,
          interest_amount: scheduleItem.interest_payment,
          due_date: scheduleItem.due_date,
          payment_date: null,
          status: 'pending',
          created_by: req.userId
        });
      }

      await loan.update({
        ...req.body,
        monthly_payment: scheduleData.monthly_payment,
        total_interest: scheduleData.total_interest,
        total_amount: scheduleData.total_amount,
        repayment_schedule: JSON.stringify(scheduleData.schedule)
      });
    } else {
      await loan.update(req.body);
    }

    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: { loan }
    });
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update loan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete loan (soft delete)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const loan = await db.Loan.findByPk(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    await loan.destroy(); // Soft delete with paranoid

    res.json({
      success: true,
      message: 'Loan deleted successfully'
    });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete loan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

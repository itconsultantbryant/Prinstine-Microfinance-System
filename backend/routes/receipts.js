const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Generate receipt for transaction
router.get('/transaction/:id', async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id, {
      include: [
        { model: db.Client, as: 'client' },
        { model: db.Loan, as: 'loan' },
        { model: db.SavingsAccount, as: 'savingsAccount' }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const receipt = {
      transaction_number: transaction.transaction_number,
      client_name: transaction.client ? `${transaction.client.first_name} ${transaction.client.last_name}` : '',
      loan_number: transaction.loan?.loan_number,
      account_number: transaction.savingsAccount?.account_number,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.transaction_date,
      description: transaction.description,
      status: transaction.status
    };

    res.json({
      success: true,
      data: { receipt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: error.message
    });
  }
});

// Generate receipt for loan repayment
router.get('/repayment/:id', async (req, res) => {
  try {
    const repayment = await db.LoanRepayment.findByPk(req.params.id, {
      include: [
        { 
          model: db.Loan, 
          as: 'loan',
          include: [{ model: db.Client, as: 'client' }]
        },
        { model: db.Transaction, as: 'transaction' }
      ]
    });

    if (!repayment) {
      return res.status(404).json({
        success: false,
        message: 'Repayment not found'
      });
    }

    const receipt = {
      transaction_number: repayment.transaction?.transaction_number || repayment.repayment_number,
      loan_number: repayment.loan?.loan_number,
      client_name: repayment.loan?.client ? `${repayment.loan.client.first_name} ${repayment.loan.client.last_name}` : '',
      amount: repayment.amount,
      principal: repayment.principal_amount,
      interest: repayment.interest_amount,
      penalty: repayment.penalty_amount,
      date: repayment.payment_date,
      payment_method: repayment.payment_method,
      outstanding_balance: repayment.loan?.outstanding_balance
    };

    res.json({
      success: true,
      data: { receipt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: error.message
    });
  }
});

module.exports = router;


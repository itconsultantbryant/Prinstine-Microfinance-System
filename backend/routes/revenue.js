const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticate);

// Get all revenue (admin only)
router.get('/', authorize('admin', 'finance', 'general_manager'), async (req, res) => {
  try {
    const { startDate, endDate, source } = req.query;
    
    let whereClause = {};
    
    if (startDate && endDate) {
      whereClause.revenue_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (source) {
      whereClause.source = source;
    }

    const revenues = await db.Revenue.findAll({
      where: whereClause,
      include: [
        { model: db.Loan, as: 'loan', required: false, attributes: ['id', 'loan_number', 'loan_type'] },
        { model: db.Transaction, as: 'transaction', required: false, attributes: ['id', 'transaction_number'] },
        { model: db.User, as: 'creator', required: false, attributes: ['id', 'name', 'email'] }
      ],
      order: [['revenue_date', 'DESC']]
    });

    // Calculate totals
    const totalRevenue = revenues.reduce((sum, rev) => sum + parseFloat(rev.amount || 0), 0);
    const revenueBySource = revenues.reduce((acc, rev) => {
      const source = rev.source || 'other';
      acc[source] = (acc[source] || 0) + parseFloat(rev.amount || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        revenues,
        summary: {
          totalRevenue,
          revenueBySource,
          count: revenues.length
        }
      }
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get revenue summary/statistics
router.get('/summary', authorize('admin', 'finance', 'general_manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.revenue_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get total revenue
    const totalRevenue = await db.Revenue.sum('amount', { where: whereClause }) || 0;

    // Get revenue by source
    const revenues = await db.Revenue.findAll({ where: whereClause });
    const revenueBySource = revenues.reduce((acc, rev) => {
      const source = rev.source || 'other';
      acc[source] = (acc[source] || 0) + parseFloat(rev.amount || 0);
      return acc;
    }, {});

    // Get revenue from loans
    const loanRevenue = await db.Revenue.sum('amount', {
      where: {
        ...whereClause,
        source: 'loan_interest'
      }
    }) || 0;

    // Get revenue from savings
    const savingsRevenue = await db.Revenue.sum('amount', {
      where: {
        ...whereClause,
        source: 'savings_interest'
      }
    }) || 0;

    // Get revenue from fees
    const feesRevenue = await db.Revenue.sum('amount', {
      where: {
        ...whereClause,
        source: 'fees'
      }
    }) || 0;

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(totalRevenue),
        loanRevenue: parseFloat(loanRevenue),
        savingsRevenue: parseFloat(savingsRevenue),
        feesRevenue: parseFloat(feesRevenue),
        revenueBySource,
        count: revenues.length
      }
    });
  } catch (error) {
    console.error('Get revenue summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


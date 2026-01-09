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
        { model: db.Loan, as: 'loan', required: false, attributes: ['id', 'loan_number', 'loan_type', 'currency'] },
        { model: db.Transaction, as: 'transaction', required: false, attributes: ['id', 'transaction_number', 'currency'] },
        { model: db.User, as: 'creator', required: false, attributes: ['id', 'name', 'email'] }
      ],
      order: [['revenue_date', 'DESC']]
    });

    // Calculate currency-separated totals
    let totalRevenueLRD = 0;
    let totalRevenueUSD = 0;
    const revenueBySourceLRD = {};
    const revenueBySourceUSD = {};
    
    revenues.forEach(rev => {
      const currency = rev.currency || 'USD';
      const amount = parseFloat(rev.amount || 0);
      const source = rev.source || 'other';
      
      if (currency === 'LRD') {
        totalRevenueLRD += amount;
        revenueBySourceLRD[source] = (revenueBySourceLRD[source] || 0) + amount;
      } else {
        totalRevenueUSD += amount;
        revenueBySourceUSD[source] = (revenueBySourceUSD[source] || 0) + amount;
      }
    });

    // Overall totals (for backward compatibility)
    const totalRevenue = totalRevenueLRD + totalRevenueUSD;
    const revenueBySource = {};
    Object.keys({ ...revenueBySourceLRD, ...revenueBySourceUSD }).forEach(source => {
      revenueBySource[source] = (revenueBySourceLRD[source] || 0) + (revenueBySourceUSD[source] || 0);
    });

    res.json({
      success: true,
      data: {
        revenues,
        summary: {
          totalRevenue,
          revenueBySource,
          count: revenues.length,
          // Currency-separated data
          lrd: {
            totalRevenue: totalRevenueLRD,
            revenueBySource: revenueBySourceLRD
          },
          usd: {
            totalRevenue: totalRevenueUSD,
            revenueBySource: revenueBySourceUSD
          }
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

    // Get all revenues for currency separation
    const revenues = await db.Revenue.findAll({ where: whereClause });

    // Calculate currency-separated totals
    let totalRevenueLRD = 0;
    let totalRevenueUSD = 0;
    let loanRevenueLRD = 0;
    let loanRevenueUSD = 0;
    let savingsRevenueLRD = 0;
    let savingsRevenueUSD = 0;
    let feesRevenueLRD = 0;
    let feesRevenueUSD = 0;
    const revenueBySourceLRD = {};
    const revenueBySourceUSD = {};

    revenues.forEach(rev => {
      const currency = rev.currency || 'USD';
      const amount = parseFloat(rev.amount || 0);
      const source = rev.source || 'other';
      
      if (currency === 'LRD') {
        totalRevenueLRD += amount;
        revenueBySourceLRD[source] = (revenueBySourceLRD[source] || 0) + amount;
        
        if (source === 'loan_interest') {
          loanRevenueLRD += amount;
        } else if (source === 'savings_interest') {
          savingsRevenueLRD += amount;
        } else if (source === 'fees') {
          feesRevenueLRD += amount;
        }
      } else {
        totalRevenueUSD += amount;
        revenueBySourceUSD[source] = (revenueBySourceUSD[source] || 0) + amount;
        
        if (source === 'loan_interest') {
          loanRevenueUSD += amount;
        } else if (source === 'savings_interest') {
          savingsRevenueUSD += amount;
        } else if (source === 'fees') {
          feesRevenueUSD += amount;
        }
      }
    });

    // Overall totals (for backward compatibility)
    const totalRevenue = totalRevenueLRD + totalRevenueUSD;
    const loanRevenue = loanRevenueLRD + loanRevenueUSD;
    const savingsRevenue = savingsRevenueLRD + savingsRevenueUSD;
    const feesRevenue = feesRevenueLRD + feesRevenueUSD;
    const revenueBySource = {};
    Object.keys({ ...revenueBySourceLRD, ...revenueBySourceUSD }).forEach(source => {
      revenueBySource[source] = (revenueBySourceLRD[source] || 0) + (revenueBySourceUSD[source] || 0);
    });

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(totalRevenue),
        loanRevenue: parseFloat(loanRevenue),
        savingsRevenue: parseFloat(savingsRevenue),
        feesRevenue: parseFloat(feesRevenue),
        revenueBySource,
        count: revenues.length,
        // Currency-separated data
        lrd: {
          totalRevenue: totalRevenueLRD,
          loanRevenue: loanRevenueLRD,
          savingsRevenue: savingsRevenueLRD,
          feesRevenue: feesRevenueLRD,
          revenueBySource: revenueBySourceLRD
        },
        usd: {
          totalRevenue: totalRevenueUSD,
          loanRevenue: loanRevenueUSD,
          savingsRevenue: savingsRevenueUSD,
          feesRevenue: feesRevenueUSD,
          revenueBySource: revenueBySourceUSD
        }
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


const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get dashboard data
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.user?.role || 'user';
    const branchId = req.user?.branch_id || null;

    // For borrower role, get their client_id and filter by it
    let clientId = null;
    if (userRole === 'borrower') {
      const client = await db.Client.findOne({ where: { user_id: userId } });
      if (client) {
        clientId = client.id;
      } else {
        // If borrower doesn't have a client record, return empty data
        return res.json({
          success: true,
          data: {
            statistics: {
              totalClients: 0,
              activeLoans: 0,
              totalSavings: 0,
              overdueLoans: 0,
              totalTransactions: 0,
              portfolioValue: 0,
              totalCollections: 0
            },
            recentLoans: [],
            recentTransactions: []
          }
        });
      }
    }

    let whereClause = {};
    if (userRole === 'borrower' && clientId) {
      // For borrowers, filter by their client_id
      whereClause.client_id = clientId;
    } else if (branchId && userRole !== 'admin' && userRole !== 'general_manager') {
      whereClause.branch_id = branchId;
    }

      // Get statistics
      let totalClients = 0;
      let activeLoans = 0;
      let totalSavingsResult = null;
      let overdueLoans = 0;
      let totalTransactions = 0;
      let recentLoans = [];
      let recentTransactions = [];

      try {
        const results = await Promise.allSettled([
          db.Client.count({ where: whereClause }),
          db.Loan.count({ 
            where: { 
              ...whereClause,
              status: { [Op.in]: ['active', 'disbursed'] }
            }
          }),
          db.SavingsAccount.sum('balance', { 
            where: { 
              ...whereClause,
              status: 'active'
            }
          }),
          db.Loan.count({ 
            where: { 
              ...whereClause,
              status: 'overdue'
            }
          }),
          db.Transaction.count({ where: whereClause }),
          db.Loan.findAll({
            where: whereClause,
            include: [
              { model: db.Client, as: 'client', required: false, attributes: ['id', 'first_name', 'last_name', 'client_number'] },
              { model: db.Branch, as: 'branch', required: false, attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 5
          }),
          db.Transaction.findAll({
            where: whereClause,
            include: [
              { model: db.Client, as: 'client', required: false, attributes: ['id', 'first_name', 'last_name'] },
              { model: db.Loan, as: 'loan', required: false, attributes: ['id', 'loan_number'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
          })
        ]);

        totalClients = results[0].status === 'fulfilled' ? (results[0].value || 0) : 0;
        if (results[0].status === 'rejected') console.error('Error counting clients:', results[0].reason);
        
        activeLoans = results[1].status === 'fulfilled' ? (results[1].value || 0) : 0;
        if (results[1].status === 'rejected') console.error('Error counting active loans:', results[1].reason);
        
        totalSavingsResult = results[2].status === 'fulfilled' ? results[2].value : null;
        if (results[2].status === 'rejected') console.error('Error summing savings:', results[2].reason);
        
        overdueLoans = results[3].status === 'fulfilled' ? (results[3].value || 0) : 0;
        if (results[3].status === 'rejected') console.error('Error counting overdue loans:', results[3].reason);
        
        totalTransactions = results[4].status === 'fulfilled' ? (results[4].value || 0) : 0;
        if (results[4].status === 'rejected') console.error('Error counting transactions:', results[4].reason);
        
        recentLoans = results[5].status === 'fulfilled' ? (results[5].value || []) : [];
        if (results[5].status === 'rejected') console.error('Error fetching recent loans:', results[5].reason);
        
        recentTransactions = results[6].status === 'fulfilled' ? (results[6].value || []) : [];
        if (results[6].status === 'rejected') console.error('Error fetching recent transactions:', results[6].reason);
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        console.error('Error stack:', error.stack);
        // Continue with default values
      }

      const totalSavings = totalSavingsResult !== null && totalSavingsResult !== undefined ? parseFloat(totalSavingsResult) : 0;

      // Calculate portfolio value
      let portfolioValue = 0;
      try {
        const portfolioValueResult = await db.Loan.sum('outstanding_balance', {
          where: {
            ...whereClause,
            status: { [Op.in]: ['active', 'disbursed'] }
          }
        });
        portfolioValue = portfolioValueResult !== null && portfolioValueResult !== undefined ? parseFloat(portfolioValueResult) : 0;
      } catch (error) {
        console.error('Error calculating portfolio value:', error);
      }

      // Calculate total collections
      let totalCollections = 0;
      try {
        const totalCollectionsResult = await db.Transaction.sum('amount', {
          where: {
            ...whereClause,
            type: 'loan_payment'
          }
        });
        totalCollections = totalCollectionsResult !== null && totalCollectionsResult !== undefined ? parseFloat(totalCollectionsResult) : 0;
      } catch (error) {
        console.error('Error calculating total collections:', error);
      }

    res.json({
      success: true,
      data: {
        statistics: {
          totalClients: totalClients || 0,
          activeLoans: activeLoans || 0,
          totalSavings: totalSavings,
          overdueLoans: overdueLoans || 0,
          totalTransactions: totalTransactions || 0,
          portfolioValue: portfolioValue,
          totalCollections: totalCollections
        },
        recentLoans,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get real-time updates
router.get('/realtime', authenticate, async (req, res) => {
  try {
    const branchId = req.user?.branch_id || null;
    const userRole = req.user?.role || 'user';

    let whereClause = {};
    if (branchId && userRole !== 'admin' && userRole !== 'general_manager') {
      whereClause.branch_id = branchId;
    }

    const [pendingLoans, pendingClients, recentActivities] = await Promise.all([
      db.Loan.count({ where: { ...whereClause, status: 'pending' } }).catch(() => 0),
      db.Client.count({ where: { ...whereClause, kyc_status: 'pending' } }).catch(() => 0),
      db.Transaction.findAll({
        where: whereClause,
        include: [
          { model: db.Client, as: 'client', required: false, attributes: ['first_name', 'last_name'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      }).catch(() => [])
    ]);

    res.json({
      success: true,
      data: {
        pendingLoans,
        pendingClients,
        recentActivities
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time data',
      error: error.message
    });
  }
});

// Get historical data for charts
router.get('/historical', authenticate, async (req, res) => {
  try {
    const branchId = req.user?.branch_id || null;
    const userRole = req.user?.role || 'user';

    let whereClause = {};
    if (branchId && userRole !== 'admin' && userRole !== 'general_manager') {
      whereClause.branch_id = branchId;
    }

    // Get last 6 months of data
    const months = [];
    const portfolioValues = [];
    const collections = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      months.push(monthName);

      // Calculate portfolio value for this month (simplified - in production, use actual historical data)
      const portfolioResult = await db.Loan.sum('outstanding_balance', {
        where: {
          ...whereClause,
          status: { [Op.in]: ['active', 'disbursed'] },
          createdAt: { [Op.lte]: date }
        }
      });
      portfolioValues.push(portfolioResult ? parseFloat(portfolioResult) : 0);

      // Calculate collections for this month
      const collectionsResult = await db.Transaction.sum('amount', {
        where: {
          ...whereClause,
          type: 'loan_payment',
          createdAt: {
            [Op.gte]: new Date(date.getFullYear(), date.getMonth(), 1),
            [Op.lt]: new Date(date.getFullYear(), date.getMonth() + 1, 1)
          }
        }
      });
      collections.push(collectionsResult ? parseFloat(collectionsResult) : 0);
    }

    res.json({
      success: true,
      data: {
        months,
        portfolioValues,
        collections
      }
    });
  } catch (error) {
    console.error('Historical data error:', error);
    // Return empty data structure instead of error to prevent frontend crashes
    res.json({
      success: true,
      data: {
        months: [],
        portfolioValues: [],
        collections: []
      }
    });
  }
});

module.exports = router;


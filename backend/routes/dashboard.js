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

    let loansWhere = {};
    let savingsWhere = {};
    let transactionsWhere = {};
    let clientsWhere = {};
    if (userRole === 'borrower' && clientId) {
      // For borrowers, filter by their client_id (loans/savings/transactions)
      loansWhere.client_id = clientId;
      savingsWhere.client_id = clientId;
      transactionsWhere.client_id = clientId;
      // Clients table uses id, not client_id
      clientsWhere.id = clientId;
    } else if (branchId && userRole !== 'admin' && userRole !== 'general_manager') {
      loansWhere.branch_id = branchId;
      savingsWhere.branch_id = branchId;
      transactionsWhere.branch_id = branchId;
      clientsWhere.branch_id = branchId;
    }

      // Get statistics with currency separation (LRD and USD)
      let totalClients = 0;
      let activeLoans = 0;
      let overdueLoans = 0;
      let totalTransactions = 0;
      let recentLoans = [];
      let recentTransactions = [];

      // Currency-separated statistics
      let totalSavingsLRD = 0;
      let totalSavingsUSD = 0;
      let totalLoansLRD = 0;
      let totalLoansUSD = 0;
      let outstandingLoansLRD = 0;
      let outstandingLoansUSD = 0;
      let totalCollectionsLRD = 0;
      let totalCollectionsUSD = 0;
      let portfolioValueLRD = 0;
      let portfolioValueUSD = 0;
      
      // Financial metrics
      let totalDuesLRD = 0;
      let totalDuesUSD = 0;
      let outstandingDuesLRD = 0;
      let outstandingDuesUSD = 0;
      let clientsWithOutstandingDuesLRD = 0;
      let clientsWithOutstandingDuesUSD = 0;
      let clientsPaidDuesLRD = 0;
      let clientsPaidDuesUSD = 0;
      let totalFinesLRD = 0;
      let totalFinesUSD = 0;
      
      // Borrower-specific interest calculations
      let personalInterestLRD = 0;
      let personalInterestUSD = 0;
      let generalInterestLRD = 0;
      let generalInterestUSD = 0;

      try {
        // Fetch all data at once for efficiency
        const [clientsCount, allLoans, allSavings, allTransactions, allClients, loansList, transactionsList] = await Promise.all([
          db.Client.count({ where: clientsWhere }).catch(() => 0),
          db.Loan.findAll({ 
            where: loansWhere,
            attributes: ['id', 'currency', 'amount', 'outstanding_balance', 'status']
          }).catch(() => []),
          db.SavingsAccount.findAll({ 
            where: { 
              ...savingsWhere,
              status: 'active'
            },
            attributes: ['id', 'currency', 'balance']
          }).catch(() => []),
          db.Transaction.findAll({ 
            where: transactionsWhere,
            attributes: ['id', 'client_id', 'currency', 'amount', 'type']
          }).catch(() => []),
          db.Client.findAll({
            where: clientsWhere,
            attributes: ['id', 'total_dues', 'dues_currency']
          }).catch(() => []),
          db.Loan.findAll({
            where: loansWhere,
            include: [
              { model: db.Client, as: 'client', required: false, attributes: ['id', 'first_name', 'last_name', 'client_number'] },
              { model: db.Branch, as: 'branch', required: false, attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 5
          }).catch(() => []),
          db.Transaction.findAll({
            where: transactionsWhere,
            include: [
              { model: db.Client, as: 'client', required: false, attributes: ['id', 'first_name', 'last_name'] },
              { model: db.Loan, as: 'loan', required: false, attributes: ['id', 'loan_number'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
          }).catch(() => [])
        ]);

        totalClients = clientsCount || 0;
        recentLoans = loansList || [];
        recentTransactions = transactionsList || [];
        
        // Calculate currency-separated totals
        allLoans.forEach(loan => {
          const currency = loan.currency || 'USD';
          const amount = parseFloat(loan.amount || 0);
          const outstanding = parseFloat(loan.outstanding_balance || 0);
          
          if (loan.status === 'active' || loan.status === 'disbursed') {
            if (currency === 'LRD') {
              totalLoansLRD += amount;
              outstandingLoansLRD += outstanding;
              portfolioValueLRD += outstanding;
            } else {
              totalLoansUSD += amount;
              outstandingLoansUSD += outstanding;
              portfolioValueUSD += outstanding;
            }
          }
          if (loan.status === 'overdue') {
            if (currency === 'LRD') {
              // Count overdue loans
            } else {
              // Count overdue loans
            }
          }
        });
        
        activeLoans = allLoans.filter(l => l.status === 'active' || l.status === 'disbursed').length;
        overdueLoans = allLoans.filter(l => l.status === 'overdue').length;
        
        // Calculate currency-separated savings
        allSavings.forEach(saving => {
          const currency = saving.currency || 'USD';
          const balance = parseFloat(saving.balance || 0);
          if (currency === 'LRD') {
            totalSavingsLRD += balance;
          } else {
            totalSavingsUSD += balance;
          }
        });
        
        // Calculate currency-separated transactions
        // For borrowers, also calculate personal interest, general interest, and fines
        
        allTransactions.forEach(transaction => {
          const currency = transaction.currency || 'USD';
          const amount = parseFloat(transaction.amount || 0);
          
          if (transaction.type === 'loan_payment') {
            if (currency === 'LRD') {
              totalCollectionsLRD += amount;
            } else {
              totalCollectionsUSD += amount;
            }
          }
          
          if (transaction.type === 'penalty' || transaction.type === 'fee') {
            if (currency === 'LRD') {
              totalFinesLRD += amount;
            } else {
              totalFinesUSD += amount;
            }
          }
          
          // Calculate personal interest and general interest for borrowers
          if (userRole === 'borrower') {
            if (transaction.type === 'personal_interest_payment') {
              if (currency === 'LRD') {
                personalInterestLRD += amount;
              } else {
                personalInterestUSD += amount;
              }
            }
            
            if (transaction.type === 'general_interest') {
              if (currency === 'LRD') {
                generalInterestLRD += amount;
              } else {
                generalInterestUSD += amount;
              }
            }
          }
        });
        
        totalTransactions = allTransactions.length;
        
        // Calculate currency-separated dues
        allClients.forEach(client => {
          const duesCurrency = client.dues_currency || 'USD';
          const totalDues = parseFloat(client.total_dues || 0);
          
          if (totalDues < 0) { // Outstanding dues (negative)
            if (duesCurrency === 'LRD') {
              totalDuesLRD += totalDues;
              outstandingDuesLRD += Math.abs(totalDues);
              clientsWithOutstandingDuesLRD++;
            } else {
              totalDuesUSD += totalDues;
              outstandingDuesUSD += Math.abs(totalDues);
              clientsWithOutstandingDuesUSD++;
            }
          } else if (totalDues === 0) {
            // Client has paid all dues - check if they had dues before
            const duesPayments = allTransactions.filter(t => 
              t.client_id === client.id && t.type === 'due_payment'
            );
            if (duesPayments.length > 0) {
              if (duesCurrency === 'LRD') {
                clientsPaidDuesLRD++;
              } else {
                clientsPaidDuesUSD++;
              }
            }
          }
        });
        
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        console.error('Error stack:', error.stack);
        // Continue with default values
      }

      const totalSavings = totalSavingsLRD + totalSavingsUSD;
      const portfolioValue = portfolioValueLRD + portfolioValueUSD;
      const totalCollections = totalCollectionsLRD + totalCollectionsUSD;

      // Get clients with outstanding dues (for admin dashboard) - separated by currency
      let clientsWithDuesLRD = [];
      let clientsWithDuesUSD = [];
      if (userRole === 'admin' || userRole === 'finance' || userRole === 'general_manager' || userRole === 'head_micro_loan' || userRole === 'supervisor') {
        try {
          const allClientsWithDues = await db.Client.findAll({
            where: {
              total_dues: { [Op.lt]: 0 } // Negative values indicate outstanding dues
            },
            attributes: ['id', 'client_number', 'first_name', 'last_name', 'email', 'total_dues', 'dues_currency'],
            order: [['total_dues', 'ASC']], // Most negative first (most outstanding)
            limit: 50 // Get more to separate by currency
          });
          
          clientsWithDuesLRD = allClientsWithDues.filter(c => (c.dues_currency || 'USD') === 'LRD').slice(0, 10);
          clientsWithDuesUSD = allClientsWithDues.filter(c => (c.dues_currency || 'USD') === 'USD').slice(0, 10);
        } catch (error) {
          console.error('Error fetching clients with dues:', error);
        }
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
          totalCollections: totalCollections,
          // Currency-separated totals
          lrd: {
            totalSavings: totalSavingsLRD,
            totalLoans: totalLoansLRD,
            outstandingLoans: outstandingLoansLRD,
            portfolioValue: portfolioValueLRD,
            totalCollections: totalCollectionsLRD,
            totalDues: totalDuesLRD,
            outstandingDues: outstandingDuesLRD,
            monthlyDues: outstandingDuesLRD / 12,
            clientsWithOutstandingDues: clientsWithOutstandingDuesLRD,
            clientsPaidDues: clientsPaidDuesLRD,
            totalFines: totalFinesLRD,
            outstandingSavings: totalSavingsLRD, // Outstanding savings = total savings in LRD
            // Borrower-specific fields
            personalInterest: userRole === 'borrower' ? personalInterestLRD : 0,
            generalInterest: userRole === 'borrower' ? generalInterestLRD : 0
          },
          usd: {
            totalSavings: totalSavingsUSD,
            totalLoans: totalLoansUSD,
            outstandingLoans: outstandingLoansUSD,
            portfolioValue: portfolioValueUSD,
            totalCollections: totalCollectionsUSD,
            totalDues: totalDuesUSD,
            outstandingDues: outstandingDuesUSD,
            monthlyDues: outstandingDuesUSD / 12,
            clientsWithOutstandingDues: clientsWithOutstandingDuesUSD,
            clientsPaidDues: clientsPaidDuesUSD,
            totalFines: totalFinesUSD,
            outstandingSavings: totalSavingsUSD, // Outstanding savings = total savings in USD
            // Borrower-specific fields
            personalInterest: userRole === 'borrower' ? personalInterestUSD : 0,
            generalInterest: userRole === 'borrower' ? generalInterestUSD : 0
          },
          // Overall totals (for backward compatibility)
          totalLoans: totalLoansLRD + totalLoansUSD,
          totalOutstandingLoans: outstandingLoansLRD + outstandingLoansUSD,
          totalOutstandingSavings: totalSavingsLRD + totalSavingsUSD
        },
        recentLoans,
        recentTransactions,
        clientsWithDues: {
          lrd: clientsWithDuesLRD || [],
          usd: clientsWithDuesUSD || [],
          all: [...(clientsWithDuesLRD || []), ...(clientsWithDuesUSD || [])].slice(0, 10) // Combined for backward compatibility
        }
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


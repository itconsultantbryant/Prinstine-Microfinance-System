const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin')); // Only admin can access recycle bin

const buildClientTransactionWhere = (clientId, loanIds, savingsIds) => {
  const transactionWhere = {
    [Op.or]: [
      { client_id: clientId }
    ]
  };
  if (loanIds.length > 0) {
    transactionWhere[Op.or].push({ loan_id: { [Op.in]: loanIds } });
  }
  if (savingsIds.length > 0) {
    transactionWhere[Op.or].push({ savings_account_id: { [Op.in]: savingsIds } });
  }
  return transactionWhere;
};

const restoreClientRelations = async (clientId, transaction) => {
  const loans = await db.Loan.findAll({
    where: { client_id: clientId },
    attributes: ['id'],
    paranoid: false,
    transaction
  });
  const loanIds = loans.map(loan => loan.id);

  const savingsAccounts = await db.SavingsAccount.findAll({
    where: { client_id: clientId },
    attributes: ['id'],
    paranoid: false,
    transaction
  });
  const savingsIds = savingsAccounts.map(savings => savings.id);

  const transactionWhere = buildClientTransactionWhere(clientId, loanIds, savingsIds);

  const transactions = await db.Transaction.findAll({
    where: transactionWhere,
    attributes: ['id'],
    paranoid: false,
    transaction
  });
  const transactionIds = transactions.map(t => t.id);

  await db.Loan.restore({
    where: { client_id: clientId, deleted_at: { [Op.ne]: null } },
    transaction
  });

  await db.SavingsAccount.restore({
    where: { client_id: clientId, deleted_at: { [Op.ne]: null } },
    transaction
  });

  await db.Transaction.restore({
    where: {
      ...transactionWhere,
      deleted_at: { [Op.ne]: null }
    },
    transaction
  });

  if (loanIds.length > 0) {
    await db.LoanRepayment.restore({
      where: { loan_id: { [Op.in]: loanIds }, deleted_at: { [Op.ne]: null } },
      transaction
    });

    await db.Collection.restore({
      where: { loan_id: { [Op.in]: loanIds }, deleted_at: { [Op.ne]: null } },
      transaction
    });
  }

  if (loanIds.length > 0 || transactionIds.length > 0) {
    await db.Revenue.restore({
      where: {
        deleted_at: { [Op.ne]: null },
        [Op.or]: [
          loanIds.length > 0 ? { loan_id: { [Op.in]: loanIds } } : null,
          transactionIds.length > 0 ? { transaction_id: { [Op.in]: transactionIds } } : null
        ].filter(Boolean)
      },
      transaction
    });
  }

  await db.Collateral.restore({
    where: { client_id: clientId, deleted_at: { [Op.ne]: null } },
    transaction
  });

  await db.KycDocument.restore({
    where: { client_id: clientId, deleted_at: { [Op.ne]: null } },
    transaction
  });
};

const permanentDeleteClientRelations = async (clientId, transaction) => {
  const loans = await db.Loan.findAll({
    where: { client_id: clientId },
    attributes: ['id'],
    paranoid: false,
    transaction
  });
  const loanIds = loans.map(loan => loan.id);

  const savingsAccounts = await db.SavingsAccount.findAll({
    where: { client_id: clientId },
    attributes: ['id'],
    paranoid: false,
    transaction
  });
  const savingsIds = savingsAccounts.map(savings => savings.id);

  const transactionWhere = buildClientTransactionWhere(clientId, loanIds, savingsIds);

  const transactions = await db.Transaction.findAll({
    where: transactionWhere,
    attributes: ['id'],
    paranoid: false,
    transaction
  });
  const transactionIds = transactions.map(t => t.id);

  if (loanIds.length > 0) {
    await db.LoanRepayment.destroy({ where: { loan_id: { [Op.in]: loanIds } }, force: true, transaction });
    await db.Collection.destroy({ where: { loan_id: { [Op.in]: loanIds } }, force: true, transaction });
  }

  if (loanIds.length > 0 || transactionIds.length > 0) {
    await db.Revenue.destroy({
      where: {
        [Op.or]: [
          loanIds.length > 0 ? { loan_id: { [Op.in]: loanIds } } : null,
          transactionIds.length > 0 ? { transaction_id: { [Op.in]: transactionIds } } : null
        ].filter(Boolean)
      },
      force: true,
      transaction
    });
  }

  await db.Transaction.destroy({ where: transactionWhere, force: true, transaction });
  await db.Loan.destroy({ where: { client_id: clientId }, force: true, transaction });
  await db.SavingsAccount.destroy({ where: { client_id: clientId }, force: true, transaction });
  await db.Collateral.destroy({ where: { client_id: clientId }, force: true, transaction });
  await db.KycDocument.destroy({ where: { client_id: clientId }, force: true, transaction });
};

// Get all deleted items
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; // 'client', 'loan', 'transaction', 'savings', 'collateral', 'kyc', 'branch'

    const typeMatch = (...values) => !type || values.includes(type);

    let deletedClients = [];
    let deletedLoans = [];
    let deletedTransactions = [];
    let deletedSavings = [];
    let deletedCollaterals = [];
    let deletedKycDocs = [];
    let deletedBranches = [];
    let deletedUsers = [];
    let deletedRevenues = [];
    let deletedLoanRepayments = [];
    let deletedCollections = [];

    if (typeMatch('user', 'users')) {
      deletedUsers = await db.User.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Branch, as: 'branch', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('client', 'clients')) {
      deletedClients = await db.Client.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Branch, as: 'branch', required: false },
          { model: db.User, as: 'creator', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('loan', 'loans')) {
      deletedLoans = await db.Loan.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Client, as: 'client', required: false },
          { model: db.Branch, as: 'branch', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('transaction', 'transactions')) {
      deletedTransactions = await db.Transaction.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Client, as: 'client', required: false },
          { model: db.Loan, as: 'loan', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('savings')) {
      deletedSavings = await db.SavingsAccount.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Client, as: 'client', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('collateral', 'collaterals')) {
      deletedCollaterals = await db.Collateral.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Client, as: 'client', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('kyc', 'kyc_docs', 'kyc_documents')) {
      deletedKycDocs = await db.KycDocument.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Client, as: 'client', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('branch', 'branches')) {
      deletedBranches = await db.Branch.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('revenue', 'revenues')) {
      deletedRevenues = await db.Revenue.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Loan, as: 'loan', required: false },
          { model: db.Transaction, as: 'transaction', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('loan_repayment', 'loan_repayments', 'repayments')) {
      deletedLoanRepayments = await db.LoanRepayment.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Loan, as: 'loan', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    if (typeMatch('collection', 'collections')) {
      deletedCollections = await db.Collection.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        include: [
          { model: db.Loan, as: 'loan', required: false }
        ],
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    res.json({
      success: true,
      data: {
        users: deletedUsers,
        clients: deletedClients,
        loans: deletedLoans,
        transactions: deletedTransactions,
        savings: deletedSavings,
        collaterals: deletedCollaterals,
        kyc_documents: deletedKycDocs,
        branches: deletedBranches,
        revenues: deletedRevenues,
        loan_repayments: deletedLoanRepayments,
        collections: deletedCollections
      }
    });
  } catch (error) {
    console.error('Get deleted items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deleted items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Restore client
router.post('/clients/:id/restore', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const client = await db.Client.findOne({
      where: {
        id: req.params.id,
        deleted_at: { [Op.ne]: null }
      },
      paranoid: false,
      transaction
    });

    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Deleted client not found'
      });
    }

    if (client.user_id) {
      const user = await db.User.findOne({
        where: {
          id: client.user_id,
          deleted_at: { [Op.ne]: null }
        },
        paranoid: false,
        transaction
      });
      if (user) {
        await user.restore({ transaction });
      }
    }

    await client.restore({ transaction });
    await restoreClientRelations(client.id, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Client restored successfully',
      data: { client }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Restore client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore client',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Restore loan
router.post('/loans/:id/restore', async (req, res) => {
  try {
    const loan = await db.Loan.findOne({
      where: {
        id: req.params.id,
        deleted_at: { [Op.ne]: null }
      },
      paranoid: false
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Deleted loan not found'
      });
    }

    await loan.restore();

    res.json({
      success: true,
      message: 'Loan restored successfully',
      data: { loan }
    });
  } catch (error) {
    console.error('Restore loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore loan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Permanently delete client
router.delete('/clients/:id', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const client = await db.Client.findOne({
      where: {
        id: req.params.id,
        deleted_at: { [Op.ne]: null }
      },
      paranoid: false,
      transaction
    });

    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Deleted client not found'
      });
    }

    await permanentDeleteClientRelations(client.id, transaction);

    if (client.user_id) {
      await db.User.destroy({
        where: { id: client.user_id },
        force: true,
        transaction,
        paranoid: false
      });
    }

    await client.destroy({ force: true, transaction }); // Permanent delete

    await transaction.commit();

    res.json({
      success: true,
      message: 'Client permanently deleted'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Permanent delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete client',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Permanently delete loan
router.delete('/loans/:id', async (req, res) => {
  try {
    const loan = await db.Loan.findOne({
      where: {
        id: req.params.id,
        deleted_at: { [Op.ne]: null }
      },
      paranoid: false
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Deleted loan not found'
      });
    }

    await loan.destroy({ force: true });

    res.json({
      success: true,
      message: 'Loan permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete loan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Generic restore function
const restoreItem = async (model, id, itemName) => {
  const item = await model.findOne({
    where: {
      id: id,
      deleted_at: { [Op.ne]: null }
    },
    paranoid: false
  });

  if (!item) {
    throw new Error(`Deleted ${itemName} not found`);
  }

  await item.restore();
  return item;
};

// Generic permanent delete function
const permanentDeleteItem = async (model, id, itemName) => {
  const item = await model.findOne({
    where: {
      id: id,
      deleted_at: { [Op.ne]: null }
    },
    paranoid: false
  });

  if (!item) {
    throw new Error(`Deleted ${itemName} not found`);
  }

  await item.destroy({ force: true });
  return item;
};

// Restore routes for all types
router.post('/transactions/:id/restore', async (req, res) => {
  try {
    const transaction = await restoreItem(db.Transaction, req.params.id, 'transaction');
    res.json({ success: true, message: 'Transaction restored successfully', data: { transaction } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/savings/:id/restore', async (req, res) => {
  try {
    const savings = await restoreItem(db.SavingsAccount, req.params.id, 'savings account');
    res.json({ success: true, message: 'Savings account restored successfully', data: { savings } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/collaterals/:id/restore', async (req, res) => {
  try {
    const collateral = await restoreItem(db.Collateral, req.params.id, 'collateral');
    res.json({ success: true, message: 'Collateral restored successfully', data: { collateral } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/kyc/:id/restore', async (req, res) => {
  try {
    const kyc = await restoreItem(db.KycDocument, req.params.id, 'KYC document');
    res.json({ success: true, message: 'KYC document restored successfully', data: { kyc } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/branches/:id/restore', async (req, res) => {
  try {
    const branch = await restoreItem(db.Branch, req.params.id, 'branch');
    res.json({ success: true, message: 'Branch restored successfully', data: { branch } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/revenues/:id/restore', async (req, res) => {
  try {
    const revenue = await restoreItem(db.Revenue, req.params.id, 'revenue');
    res.json({ success: true, message: 'Revenue restored successfully', data: { revenue } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/loan-repayments/:id/restore', async (req, res) => {
  try {
    const repayment = await restoreItem(db.LoanRepayment, req.params.id, 'loan repayment');
    res.json({ success: true, message: 'Loan repayment restored successfully', data: { repayment } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/collections/:id/restore', async (req, res) => {
  try {
    const collection = await restoreItem(db.Collection, req.params.id, 'collection');
    res.json({ success: true, message: 'Collection restored successfully', data: { collection } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Permanent delete routes for all types
router.delete('/transactions/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.Transaction, req.params.id, 'transaction');
    res.json({ success: true, message: 'Transaction permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.delete('/savings/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.SavingsAccount, req.params.id, 'savings account');
    res.json({ success: true, message: 'Savings account permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.delete('/collaterals/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.Collateral, req.params.id, 'collateral');
    res.json({ success: true, message: 'Collateral permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.delete('/kyc/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.KycDocument, req.params.id, 'KYC document');
    res.json({ success: true, message: 'KYC document permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.delete('/branches/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.Branch, req.params.id, 'branch');
    res.json({ success: true, message: 'Branch permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.delete('/revenues/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.Revenue, req.params.id, 'revenue');
    res.json({ success: true, message: 'Revenue permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.delete('/loan-repayments/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.LoanRepayment, req.params.id, 'loan repayment');
    res.json({ success: true, message: 'Loan repayment permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.delete('/collections/:id', async (req, res) => {
  try {
    await permanentDeleteItem(db.Collection, req.params.id, 'collection');
    res.json({ success: true, message: 'Collection permanently deleted' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Restore user
router.post('/users/:id/restore', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await db.User.findOne({
      where: { id: req.params.id, deleted_at: { [Op.ne]: null } },
      paranoid: false,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Deleted user not found' });
    }

    await user.restore({ transaction });

    const client = await db.Client.findOne({
      where: { user_id: user.id },
      paranoid: false,
      transaction
    });

    if (client && client.deleted_at) {
      await client.restore({ transaction });
      await restoreClientRelations(client.id, transaction);
    }

    await transaction.commit();

    res.json({ success: true, message: 'User restored successfully', data: { user } });
  } catch (error) {
    await transaction.rollback();
    res.status(404).json({ success: false, message: error.message });
  }
});

// Permanent delete user
router.delete('/users/:id', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await db.User.findOne({
      where: { id: req.params.id, deleted_at: { [Op.ne]: null } },
      paranoid: false,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Deleted user not found' });
    }

    const client = await db.Client.findOne({
      where: { user_id: user.id },
      paranoid: false,
      transaction
    });

    if (client) {
      await permanentDeleteClientRelations(client.id, transaction);
      await client.destroy({ force: true, transaction });
    }

    await user.destroy({ force: true, transaction });

    await transaction.commit();

    res.json({ success: true, message: 'User permanently deleted' });
  } catch (error) {
    await transaction.rollback();
    res.status(404).json({ success: false, message: error.message });
  }
});

module.exports = router;


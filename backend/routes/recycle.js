const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin')); // Only admin can access recycle bin

// Get all deleted items
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; // 'client', 'loan', 'transaction', 'savings', 'collateral', 'kyc', 'branch'

    let deletedClients = [];
    let deletedLoans = [];
    let deletedTransactions = [];
    let deletedSavings = [];
    let deletedCollaterals = [];
    let deletedKycDocs = [];
    let deletedBranches = [];

    if (!type || type === 'client') {
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

    if (!type || type === 'loan') {
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

    if (!type || type === 'transaction') {
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

    if (!type || type === 'savings') {
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

    if (!type || type === 'collateral') {
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

    if (!type || type === 'kyc') {
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

    if (!type || type === 'branch') {
      deletedBranches = await db.Branch.findAll({
        where: {
          deleted_at: { [Op.ne]: null }
        },
        order: [['deleted_at', 'DESC']],
        paranoid: false
      });
    }

    res.json({
      success: true,
      data: {
        clients: deletedClients,
        loans: deletedLoans,
        transactions: deletedTransactions,
        savings: deletedSavings,
        collaterals: deletedCollaterals,
        kyc_documents: deletedKycDocs,
        branches: deletedBranches
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
  try {
    const client = await db.Client.findOne({
      where: {
        id: req.params.id,
        deleted_at: { [Op.ne]: null }
      },
      paranoid: false
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Deleted client not found'
      });
    }

    await client.restore();

    res.json({
      success: true,
      message: 'Client restored successfully',
      data: { client }
    });
  } catch (error) {
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
  try {
    const client = await db.Client.findOne({
      where: {
        id: req.params.id,
        deleted_at: { [Op.ne]: null }
      },
      paranoid: false
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Deleted client not found'
      });
    }

    await client.destroy({ force: true }); // Permanent delete

    res.json({
      success: true,
      message: 'Client permanently deleted'
    });
  } catch (error) {
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

module.exports = router;


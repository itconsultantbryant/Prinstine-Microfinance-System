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
    const { type } = req.query; // 'client' or 'loan'

    let deletedClients = [];
    let deletedLoans = [];

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
        paranoid: false // Include soft-deleted records
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
        paranoid: false // Include soft-deleted records
      });
    }

    res.json({
      success: true,
      data: {
        clients: deletedClients,
        loans: deletedLoans
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

    await loan.destroy({ force: true }); // Permanent delete

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

module.exports = router;


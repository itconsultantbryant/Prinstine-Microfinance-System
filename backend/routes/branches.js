const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get all branches - allow all authenticated users to view branches
router.get('/', async (req, res) => {
  try {
    const branches = await db.Branch.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { branches }
    });
  } catch (error) {
    console.error('Get branches error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single branch
router.get('/:id', async (req, res) => {
  try {
    const branch = await db.Branch.findByPk(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    res.json({
      success: true,
      data: { branch }
    });
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create branch
router.post('/', authorize('admin'), [
  body('name').notEmpty().withMessage('Branch name is required'),
  body('code').notEmpty().withMessage('Branch code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check if branch code already exists
    const existingBranch = await db.Branch.findOne({
      where: { code: req.body.code }
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'Branch code already exists'
      });
    }

    const branch = await db.Branch.create({
      name: req.body.name,
      code: req.body.code,
      address: req.body.address || null,
      city: req.body.city || null,
      state: req.body.state || null,
      country: req.body.country || null,
      phone: req.body.phone || null,
      email: req.body.email || null,
      manager_name: req.body.manager_name || null,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: { branch }
    });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create branch',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update branch
router.put('/:id', authorize('admin'), [
  body('name').optional().notEmpty().withMessage('Branch name cannot be empty'),
  body('code').optional().notEmpty().withMessage('Branch code cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const branch = await db.Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Check if code is being changed and if new code already exists
    if (req.body.code && req.body.code !== branch.code) {
      const existingBranch = await db.Branch.findOne({
        where: { code: req.body.code }
      });

      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message: 'Branch code already exists'
        });
      }
    }

    await branch.update(req.body);

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: { branch }
    });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update branch',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete branch (soft delete)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const branch = await db.Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    await branch.destroy(); // Soft delete with paranoid

    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


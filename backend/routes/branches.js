const express = require('express');
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

module.exports = router;


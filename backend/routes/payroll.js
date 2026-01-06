const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'hr'));

// Get all payrolls
router.get('/', async (req, res) => {
  try {
    const payrolls = await db.Payroll.findAll({
      include: [
        { model: db.Staff, as: 'staff' },
        { model: db.User, as: 'user' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { payrolls }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payrolls',
      error: error.message
    });
  }
});

module.exports = router;


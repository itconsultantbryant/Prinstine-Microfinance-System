const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'hr'));

// Get all staff
router.get('/', async (req, res) => {
  try {
    const staff = await db.Staff.findAll({
      include: [
        { model: db.Branch, as: 'branch' },
        { model: db.User, as: 'user' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { staff }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff',
      error: error.message
    });
  }
});

module.exports = router;


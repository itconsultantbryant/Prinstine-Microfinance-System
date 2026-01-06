const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get all collections
router.get('/', async (req, res) => {
  try {
    const collections = await db.Collection.findAll({
      include: [{ model: db.Loan, as: 'loan' }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { collections }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collections',
      error: error.message
    });
  }
});

module.exports = router;


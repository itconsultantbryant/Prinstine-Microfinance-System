const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'general_manager', 'branch_manager', 'loan_officer', 'hr', 'borrower', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'finance', 'teller', 'customer_service', 'accountant'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, username, password, role, branch_id } = req.body;

    // Check if user exists
    const existingUser = await db.User.findOne({
      where: { [Op.or]: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.User.create({
      name,
      email,
      username,
      password: hashedPassword,
      role: role || 'borrower',
      branch_id: branch_id || null,
      is_active: true,
      email_verified_at: new Date()
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login
router.post('/login', [
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', req.body.email);
    console.log('Body:', JSON.stringify(req.body));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg || 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;
    console.log('Looking for user with email:', email);

    // Find user - try email first, then username, case-insensitive
    let user;
    try {
      const emailLower = email.toLowerCase().trim();
      
      // Check database dialect to use appropriate case-insensitive query
      const isPostgres = db.sequelize.options.dialect === 'postgres';
      
      if (isPostgres) {
        // PostgreSQL: Use iLike for case-insensitive search
        user = await db.User.findOne({
          where: {
            [Op.or]: [
              db.sequelize.where(
                db.sequelize.fn('LOWER', db.sequelize.col('email')),
                emailLower
              ),
              db.sequelize.where(
                db.sequelize.fn('LOWER', db.sequelize.col('username')),
                emailLower
              )
            ]
          },
          attributes: { exclude: [] }
        });
      } else {
        // SQLite: Use lowercase comparison
        user = await db.User.findOne({
          where: {
            [Op.or]: [
              db.sequelize.where(
                db.sequelize.fn('LOWER', db.sequelize.col('email')),
                emailLower
              ),
              db.sequelize.where(
                db.sequelize.fn('LOWER', db.sequelize.col('username')),
                emailLower
              )
            ]
          },
          attributes: { exclude: [] }
        });
      }
      
      console.log('User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('User email:', user.email, 'Username:', user.username);
      }
    } catch (dbError) {
      console.error('Database error finding user:', dbError);
      console.error('Error stack:', dbError.stack);
      return res.status(500).json({
        success: false,
        message: 'Database error. Please try again.',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    if (!user) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User found:', user.email, 'Active:', user.is_active);

    // Check if user is active
    if (!user.is_active) {
      console.log('User is inactive');
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Verify password
    if (!user.password) {
      console.log('User has no password');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('Comparing password...');
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password match:', isPasswordValid);
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError);
      console.error('Bcrypt stack:', bcryptError.stack);
      return res.status(500).json({
        success: false,
        message: 'Password verification failed',
        error: process.env.NODE_ENV === 'development' ? bcryptError.message : undefined
      });
    }

    if (!isPasswordValid) {
      console.log('Password mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('Generating token...');
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    console.log('Token generated');

    // Get branch separately if needed
    let branch = null;
    if (user.branch_id) {
      try {
        branch = await db.Branch.findByPk(user.branch_id, {
          attributes: ['id', 'name', 'code']
        });
        console.log('Branch found:', branch ? 'Yes' : 'No');
      } catch (err) {
        console.warn('Could not fetch branch:', err.message);
      }
    }

    console.log('Login successful for:', user.email);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          branch_id: user.branch_id,
          branch: branch
        },
        token
      }
    });
  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during login',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.userId, {
      include: [{ model: db.Branch, as: 'branch' }],
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;


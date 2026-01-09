const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create new user (admin only)
router.post('/', authorize('admin'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'finance', 'general_manager', 'branch_manager', 'loan_officer', 'hr', 'borrower', 'teller', 'customer_service', 'accountant']).withMessage('Invalid role'),
  body('branch_id').optional().isInt().withMessage('Branch ID must be a number'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, username, password, role, branch_id, phone } = req.body;

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
      phone: phone || null,
      is_active: true,
      email_verified_at: new Date()
    });

    // If user is a borrower, automatically create a client record
    if (role === 'borrower') {
      try {
        // Generate client number (matching the format used in clients route)
        const clientCount = await db.Client.count();
        const clientNumber = `CL${String(clientCount + 1).padStart(6, '0')}`;

        // Split name into first and last name
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(' ') || 'Client';

        // Create client record linked to the user
        await db.Client.create({
          client_number: clientNumber,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          status: 'active',
          kyc_status: 'pending',
          branch_id: branch_id || null,
          user_id: user.id, // Link client to user
          created_by: req.userId // Admin who created the user
        });
      } catch (clientError) {
        console.error('Error creating client record for borrower:', clientError);
        // Don't fail user creation if client creation fails - log it
        // The client can be created later if needed
      }
    }

    // Fetch user with branch info
    const createdUser = await db.User.findByPk(user.id, {
      include: [{ model: db.Branch, as: 'branch', required: false }],
      attributes: { exclude: ['password'] }
    });

    res.status(201).json({
      success: true,
      message: role === 'borrower' 
        ? 'User created successfully. Client record has been automatically created.' 
        : 'User created successfully',
      data: { user: createdUser }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all users (admin only)
router.get('/', authorize('admin', 'general_manager'), async (req, res) => {
  try {
    const users = await db.User.findAll({
      include: [{ model: db.Branch, as: 'branch', required: false }],
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    // Users can only view their own profile unless admin
    if (req.user.role !== 'admin' && parseInt(req.params.id) !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await db.User.findByPk(req.params.id, {
      include: [{ model: db.Branch, as: 'branch', required: false }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update user (profile update)
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('username').optional().notEmpty().withMessage('Username cannot be empty'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'finance', 'general_manager', 'branch_manager', 'loan_officer', 'hr', 'borrower', 'teller', 'customer_service', 'accountant']).withMessage('Invalid role'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Only admin can update other users
    if (req.user.role !== 'admin' && parseInt(req.params.id) !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can update other users.'
      });
    }

    const user = await db.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // If password is provided, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      // Remove password from update if not provided
      delete updateData.password;
    }
    
    await user.update(updateData);

    const updatedUser = await db.User.findByPk(req.params.id, {
      include: [{ model: db.Branch, as: 'branch', required: false }],
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete user (soft delete - admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (parseInt(req.params.id) === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Soft delete - check if User model has paranoid mode
    // If not, we'll just set is_active to false
    try {
      await user.destroy(); // This will work if paranoid mode is enabled
    } catch (destroyError) {
      // If destroy fails (no paranoid mode), just deactivate
      await user.update({ is_active: false });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


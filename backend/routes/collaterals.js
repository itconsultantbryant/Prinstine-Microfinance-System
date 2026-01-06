const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.use(authenticate);

// Get all collaterals
router.get('/', async (req, res) => {
  try {
    const userRole = req.user?.role || 'user';
    
    // For borrower role, get their client_id and filter by it
    let clientId = null;
    let whereClause = {};
    if (userRole === 'borrower') {
      const client = await db.Client.findOne({ where: { user_id: req.userId } });
      if (client) {
        clientId = client.id;
        whereClause.client_id = clientId;
      }
    }

    const collaterals = await db.Collateral.findAll({
      where: whereClause,
      include: [{ model: db.Client, as: 'client', required: false }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { collaterals }
    });
  } catch (error) {
    console.error('Get collaterals error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaterals',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single collateral
router.get('/:id', async (req, res) => {
  try {
    const collateral = await db.Collateral.findByPk(req.params.id, {
      include: [{ model: db.Client, as: 'client', required: false }]
    });

    if (!collateral) {
      return res.status(404).json({
        success: false,
        message: 'Collateral not found'
      });
    }

    res.json({
      success: true,
      data: { collateral }
    });
  } catch (error) {
    console.error('Get collateral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collateral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create collateral
router.post('/', upload.array('documents', 10), [
  body('client_id').isInt().withMessage('Client ID is required'),
  body('type').notEmpty().withMessage('Collateral type is required'),
  body('estimated_value').isFloat({ min: 0 }).withMessage('Valid estimated value is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Process uploaded files
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push({
          filename: file.filename,
          originalname: file.originalname,
          path: `/uploads/collaterals/${file.filename}`,
          mimetype: file.mimetype,
          size: file.size,
          uploaded_at: new Date().toISOString()
        });
      });
    }

    const collateral = await db.Collateral.create({
      ...req.body,
      status: req.body.status || 'pending',
      documents: documents.length > 0 ? JSON.stringify(documents) : null
    });

    res.status(201).json({
      success: true,
      message: 'Collateral created successfully',
      data: { collateral }
    });
  } catch (error) {
    // Delete uploaded files if creation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    console.error('Create collateral error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create collateral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update collateral
router.put('/:id', upload.array('documents', 10), [
  body('type').optional().notEmpty().withMessage('Collateral type cannot be empty'),
  body('estimated_value').optional().isFloat({ min: 0 }).withMessage('Valid estimated value is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const collateral = await db.Collateral.findByPk(req.params.id);
    if (!collateral) {
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Collateral not found'
      });
    }

    // Process new uploaded files
    let existingDocuments = [];
    try {
      if (collateral.documents) {
        existingDocuments = typeof collateral.documents === 'string' 
          ? JSON.parse(collateral.documents) 
          : collateral.documents;
      }
    } catch (e) {
      existingDocuments = [];
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        existingDocuments.push({
          filename: file.filename,
          originalname: file.originalname,
          path: `/uploads/collaterals/${file.filename}`,
          mimetype: file.mimetype,
          size: file.size,
          uploaded_at: new Date().toISOString()
        });
      });
    }

    const updateData = { ...req.body };
    if (req.files && req.files.length > 0) {
      updateData.documents = JSON.stringify(existingDocuments);
    }

    await collateral.update(updateData);

    res.json({
      success: true,
      message: 'Collateral updated successfully',
      data: { collateral }
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    console.error('Update collateral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update collateral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete collateral
router.delete('/:id', async (req, res) => {
  try {
    const collateral = await db.Collateral.findByPk(req.params.id);
    if (!collateral) {
      return res.status(404).json({
        success: false,
        message: 'Collateral not found'
      });
    }

    // Delete associated files
    if (collateral.documents) {
      try {
        const documents = typeof collateral.documents === 'string' 
          ? JSON.parse(collateral.documents) 
          : collateral.documents;
        documents.forEach(doc => {
          const filePath = path.join(__dirname, '..', doc.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      } catch (e) {
        console.error('Error deleting collateral files:', e);
      }
    }

    await collateral.destroy();

    res.json({
      success: true,
      message: 'Collateral deleted successfully'
    });
  } catch (error) {
    console.error('Delete collateral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete collateral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get collateral document
router.get('/:id/document/:docIndex', async (req, res) => {
  try {
    const collateral = await db.Collateral.findByPk(req.params.id);
    if (!collateral || !collateral.documents) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const documents = typeof collateral.documents === 'string' 
      ? JSON.parse(collateral.documents) 
      : collateral.documents;
    
    const docIndex = parseInt(req.params.docIndex);
    if (docIndex < 0 || docIndex >= documents.length) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documents[docIndex];
    const filePath = path.join(__dirname, '..', document.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;


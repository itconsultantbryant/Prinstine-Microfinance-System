const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.use(authenticate);

// Get all KYC documents
router.get('/', async (req, res) => {
  try {
    const documents = await db.KycDocument.findAll({
      include: [{ model: db.Client, as: 'client', required: false }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Get KYC documents error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYC documents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single KYC document
router.get('/:id', async (req, res) => {
  try {
    const document = await db.KycDocument.findByPk(req.params.id, {
      include: [{ model: db.Client, as: 'client', required: false }]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'KYC document not found'
      });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    console.error('Get KYC document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYC document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create KYC document
router.post('/', upload.single('document'), [
  body('client_id').isInt().withMessage('Client ID is required'),
  body('document_type').notEmpty().withMessage('Document type is required'),
  body('document_number').notEmpty().withMessage('Document number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let filePath = null;
    if (req.file) {
      filePath = `/uploads/kyc/${req.file.filename}`;
    }

    const kycDocument = await db.KycDocument.create({
      ...req.body,
      file_path: filePath,
      status: req.body.status || 'pending',
      verified_by: null,
      verified_at: null
    });

    res.status(201).json({
      success: true,
      message: 'KYC document created successfully',
      data: { document: kycDocument }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Create KYC document error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create KYC document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update KYC document
router.put('/:id', upload.single('document'), [
  body('document_type').optional().notEmpty().withMessage('Document type cannot be empty'),
  body('document_number').optional().notEmpty().withMessage('Document number cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const document = await db.KycDocument.findByPk(req.params.id);
    if (!document) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'KYC document not found'
      });
    }

    // Delete old file if new one is uploaded
    if (req.file) {
      if (document.file_path) {
        const oldFilePath = path.join(__dirname, '..', document.file_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      req.body.file_path = `/uploads/kyc/${req.file.filename}`;
    }

    await document.update(req.body);

    res.json({
      success: true,
      message: 'KYC document updated successfully',
      data: { document }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Update KYC document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update KYC document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Approve/Reject KYC document
router.post('/:id/approve', authorize('admin', 'micro_loan_officer', 'head_micro_loan', 'general_manager', 'branch_manager'), async (req, res) => {
  try {
    const document = await db.KycDocument.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'KYC document not found'
      });
    }

    const status = req.body.status || 'verified'; // 'verified' or 'rejected'

    await document.update({
      status,
      verified_by: req.userId,
      verified_at: new Date()
    });

    // Update client KYC status if verified
    if (status === 'verified') {
      await db.Client.update(
        { kyc_status: 'verified' },
        { where: { id: document.client_id } }
      );
    }

    res.json({
      success: true,
      message: `KYC document ${status === 'verified' ? 'approved' : 'rejected'} successfully`,
      data: { document }
    });
  } catch (error) {
    console.error('Approve KYC document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve KYC document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete KYC document
router.delete('/:id', async (req, res) => {
  try {
    const document = await db.KycDocument.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'KYC document not found'
      });
    }

    // Delete associated file
    if (document.file_path) {
      const filePath = path.join(__dirname, '..', document.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'KYC document deleted successfully'
    });
  } catch (error) {
    console.error('Delete KYC document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete KYC document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get KYC document file
router.get('/:id/document', async (req, res) => {
  try {
    const document = await db.KycDocument.findByPk(req.params.id);
    if (!document || !document.file_path) {
      return res.status(404).json({
        success: false,
        message: 'Document file not found'
      });
    }

    const filePath = path.join(__dirname, '..', document.file_path);
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


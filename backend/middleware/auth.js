const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token || 
                  req.query?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Access denied.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Try to get user with branch, fallback to without if it fails
      let user;
      try {
        user = await db.User.findByPk(decoded.id, {
          include: [{ 
            model: db.Branch, 
            as: 'branch',
            required: false,
            attributes: ['id', 'name', 'code']
          }]
        });
      } catch (includeError) {
        // If include fails, try without it
        user = await db.User.findByPk(decoded.id);
      }

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive.'
        });
      }

      req.user = user;
      req.userId = user.id;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: error.message
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };


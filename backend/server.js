const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const branchRoutes = require('./routes/branches');
const clientRoutes = require('./routes/clients');
const loanRoutes = require('./routes/loans');
const savingsRoutes = require('./routes/savings');
const transactionRoutes = require('./routes/transactions');
const accountingRoutes = require('./routes/accounting');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const collectionRoutes = require('./routes/collections');
const payrollRoutes = require('./routes/payroll');
const staffRoutes = require('./routes/staff');
const kycRoutes = require('./routes/kyc');
const collateralRoutes = require('./routes/collaterals');
const notificationRoutes = require('./routes/notifications');
const receiptRoutes = require('./routes/receipts');
const revenueRoutes = require('./routes/revenue');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS configuration
// If CORS_ORIGIN is "*", allow all origins
const allowAllOrigins = process.env.CORS_ORIGIN === '*' || process.env.CORS_ORIGIN === '"*"';

const allowedOrigins = process.env.CORS_ORIGIN && !allowAllOrigins
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5000'];

// Add Render URLs if in production
if (process.env.NODE_ENV === 'production') {
  if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    allowedOrigins.push(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
  }
  // Add custom domain if provided (from Render custom domain feature)
  if (process.env.CUSTOM_DOMAIN) {
    allowedOrigins.push(`https://${process.env.CUSTOM_DOMAIN}`);
    allowedOrigins.push(`http://${process.env.CUSTOM_DOMAIN}`);
  }
  // Add frontend URL if provided
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  // Allow all Render domains in production (regex pattern)
  allowedOrigins.push(/^https:\/\/.*\.onrender\.com$/);
  // Allow custom domains (common patterns)
  // Note: This is a fallback - specific domains should be added via CUSTOM_DOMAIN env var
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // If CORS_ORIGIN is "*", allow all origins
    if (allowAllOrigins) {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed origin
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development' || isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      console.log('CORS_ORIGIN env:', process.env.CORS_ORIGIN);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    app: 'Prinstine Microfinance Loans and Savings'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/collaterals', collateralRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/recycle', require('./routes/recycle'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Serve frontend static files in production (if frontend is built)
if (process.env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND === 'true') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  // Serve static files from frontend dist
  app.use(express.static(frontendPath));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    // Serve index.html for all other routes (SPA fallback)
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler for API routes only
app.use((req, res) => {
  // Only return JSON for API routes
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  } else if (process.env.NODE_ENV !== 'production' || process.env.SERVE_FRONTEND !== 'true') {
    res.status(404).send('Not found');
  }
});

// Database connection and server start
db.sequelize.authenticate()
  .then(async () => {
    console.log('✅ Database connection established successfully.');
    
    // Sync database - use alter: true to add new columns automatically
    // The postinstall script also runs migrations, but this ensures schema is up to date
    await db.sequelize.sync({ alter: true });
    
           // Run additional migrations for ENUM changes (PostgreSQL requires special handling)
           try {
             const addExcessLoanType = require('./scripts/add-excess-loan-type');
             await addExcessLoanType();
           } catch (migrationError) {
             console.error('⚠️  Migration warning (non-critical):', migrationError.message);
             // Continue even if migration fails - it might already be applied
           }
           
           // Run currency fields migration
           try {
             const addCurrencyFields = require('./scripts/add-currency-fields');
             await addCurrencyFields();
           } catch (currencyError) {
             console.error('⚠️  Currency migration warning (non-critical):', currencyError.message);
             // Continue even if migration fails - it might already be applied
           }
    
    return Promise.resolve();
  })
  .then(async () => {
    // Check if admin user exists, if not, seed the database
    let adminExists = await db.User.findOne({
      where: { email: 'admin@microfinance.com' }
    });
    
    if (!adminExists) {
      console.log('⚠️  Admin user not found. Seeding database...');
      try {
        const bcrypt = require('bcryptjs');
        
        // Create branch if it doesn't exist
        const [branch] = await db.Branch.findOrCreate({
          where: { code: 'MB001' },
          defaults: {
            name: 'Main Branch',
            code: 'MB001',
            address: '123 Main Street',
            city: 'City',
            state: 'State',
            country: 'Country',
            phone: '+1234567890',
            email: 'main@microfinance.com',
            manager_name: 'Branch Manager',
            is_active: true
          }
        });

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const [adminUser, created] = await db.User.findOrCreate({
          where: { email: 'admin@microfinance.com' },
          defaults: {
            name: 'Admin User',
            email: 'admin@microfinance.com',
            username: 'admin',
            password: adminPassword,
            role: 'admin',
            branch_id: branch.id,
            is_active: true,
            email_verified_at: new Date()
          }
        });
        
        if (created) {
          console.log('✅ Admin user created successfully!');
        } else {
          console.log('✅ Admin user already exists.');
        }
        
        // Verify the admin user was created
        adminExists = await db.User.findOne({
          where: { email: 'admin@microfinance.com' }
        });
        
        if (adminExists) {
          console.log('✅ Admin user verified in database.');
          console.log('📧 Default admin credentials:');
          console.log('   Email: admin@microfinance.com');
          console.log('   Password: admin123');
          console.log('   User ID:', adminExists.id);
          console.log('   Is Active:', adminExists.is_active);
        } else {
          console.error('❌ Admin user creation failed - user not found after creation');
        }
      } catch (seedError) {
        console.error('❌ Seeding failed:', seedError);
        console.error('Error stack:', seedError.stack);
        // Don't exit - continue with server start
      }
    } else {
      console.log('✅ Admin user exists. Database ready.');
      console.log('📧 Admin credentials:');
      console.log('   Email: admin@microfinance.com');
      console.log('   Password: admin123');
      console.log('   User ID:', adminExists.id);
      console.log('   Is Active:', adminExists.is_active);
    }
    
    return Promise.resolve();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  });

module.exports = app;


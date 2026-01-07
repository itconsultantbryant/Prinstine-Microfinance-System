const db = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addLoanEnhancementFields() {
  try {
    console.log('🔄 Adding loan enhancement fields...');
    
    const sequelize = db.sequelize;
    const dialect = sequelize.options.dialect;
    
    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loans' 
      AND column_name IN ('upfront_percentage', 'upfront_amount', 'default_charges_percentage', 'default_charges_amount')
    `);
    
    const existingColumns = results.map(r => r.column_name);
    
    if (dialect === 'postgres') {
      // PostgreSQL
      if (!existingColumns.includes('upfront_percentage')) {
        await sequelize.query(`
          ALTER TABLE loans 
          ADD COLUMN upfront_percentage DECIMAL(5, 2) DEFAULT 0
        `);
        console.log('✅ Added upfront_percentage column');
      }
      
      if (!existingColumns.includes('upfront_amount')) {
        await sequelize.query(`
          ALTER TABLE loans 
          ADD COLUMN upfront_amount DECIMAL(15, 2) DEFAULT 0
        `);
        console.log('✅ Added upfront_amount column');
      }
      
      if (!existingColumns.includes('default_charges_percentage')) {
        await sequelize.query(`
          ALTER TABLE loans 
          ADD COLUMN default_charges_percentage DECIMAL(5, 2) DEFAULT 0
        `);
        console.log('✅ Added default_charges_percentage column');
      }
      
      if (!existingColumns.includes('default_charges_amount')) {
        await sequelize.query(`
          ALTER TABLE loans 
          ADD COLUMN default_charges_amount DECIMAL(15, 2) DEFAULT 0
        `);
        console.log('✅ Added default_charges_amount column');
      }
    } else {
      // SQLite
      console.log('⚠️  SQLite detected. Please run migrations manually or use sync({ alter: true })');
      console.log('   The model will handle column creation automatically.');
    }
    
    console.log('✅ Loan enhancement fields migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addLoanEnhancementFields();


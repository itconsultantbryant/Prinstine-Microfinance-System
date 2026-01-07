const db = require('../config/database');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Sync database schema
    await db.sequelize.sync({ alter: true });
    
    // Run loan enhancement fields migration
    console.log('🔄 Running loan enhancement fields migration...');
    try {
      const sequelize = db.sequelize;
      const dialect = sequelize.options.dialect;
      
      if (dialect === 'postgres') {
        // PostgreSQL - Check if columns exist
        try {
          const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'loans' 
            AND column_name IN ('upfront_percentage', 'upfront_amount', 'default_charges_percentage', 'default_charges_amount')
          `);
          
          const existingColumns = results.map(r => r.column_name);
          
          if (!existingColumns.includes('upfront_percentage')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN upfront_percentage DECIMAL(5, 2) DEFAULT 0`);
            console.log('✅ Added upfront_percentage column');
          }
          
          if (!existingColumns.includes('upfront_amount')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN upfront_amount DECIMAL(15, 2) DEFAULT 0`);
            console.log('✅ Added upfront_amount column');
          }
          
          if (!existingColumns.includes('default_charges_percentage')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN default_charges_percentage DECIMAL(5, 2) DEFAULT 0`);
            console.log('✅ Added default_charges_percentage column');
          }
          
          if (!existingColumns.includes('default_charges_amount')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN default_charges_amount DECIMAL(15, 2) DEFAULT 0`);
            console.log('✅ Added default_charges_amount column');
          }
        } catch (err) {
          // Columns might already exist, that's okay
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.warn('⚠️  Warning adding loan columns:', err.message);
          }
        }
      } else {
        // SQLite - Use PRAGMA to check columns
        try {
          const [tableInfo] = await sequelize.query(`PRAGMA table_info(loans)`);
          const existingColumns = tableInfo.map(col => col.name);
          
          if (!existingColumns.includes('upfront_percentage')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN upfront_percentage DECIMAL(5, 2) DEFAULT 0`);
            console.log('✅ Added upfront_percentage column');
          }
          
          if (!existingColumns.includes('upfront_amount')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN upfront_amount DECIMAL(15, 2) DEFAULT 0`);
            console.log('✅ Added upfront_amount column');
          }
          
          if (!existingColumns.includes('default_charges_percentage')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN default_charges_percentage DECIMAL(5, 2) DEFAULT 0`);
            console.log('✅ Added default_charges_percentage column');
          }
          
          if (!existingColumns.includes('default_charges_amount')) {
            await sequelize.query(`ALTER TABLE loans ADD COLUMN default_charges_amount DECIMAL(15, 2) DEFAULT 0`);
            console.log('✅ Added default_charges_amount column');
          }
        } catch (err) {
          // Columns might already exist, that's okay
          if (!err.message.includes('duplicate column')) {
            console.warn('⚠️  Warning adding loan columns:', err.message);
          }
        }
      }
    } catch (loanMigrationError) {
      console.warn('⚠️  Loan enhancement migration warning:', loanMigrationError.message);
      // Don't fail the entire migration if this fails
    }
    
    console.log('✅ Database migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();


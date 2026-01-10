const db = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addPurposeColumn() {
  try {
    console.log('Adding purpose column to transactions table...\n');

    // Check if column already exists
    try {
      const [results] = await db.sequelize.query(`
        PRAGMA table_info(transactions)
      `, { type: QueryTypes.SELECT });
      
      const columns = results || [];
      const purposeExists = columns.some(col => col.name === 'purpose');
      
      if (purposeExists) {
        console.log('⚠️  Column already exists: transactions.purpose');
        console.log('\n✅ Migration completed (no changes needed)!');
        process.exit(0);
        return;
      }
    } catch (error) {
      // If PRAGMA doesn't work (e.g., PostgreSQL), try a different approach
      console.log('Checking column existence...');
    }

    // Add purpose column
    try {
      await db.sequelize.query(`
        ALTER TABLE transactions 
        ADD COLUMN purpose VARCHAR(255)
      `, { type: QueryTypes.RAW });
      console.log('✅ Added column: transactions.purpose');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('⚠️  Column already exists: transactions.purpose');
      } else {
        console.error('❌ Error adding transactions.purpose:', error.message);
        throw error;
      }
    }

    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addPurposeColumn();


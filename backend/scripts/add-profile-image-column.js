const db = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addProfileImageColumn() {
  try {
    console.log('🔄 Adding profile_image column to clients table...');
    
    // Check if using SQLite or PostgreSQL
    const dialect = db.sequelize.getDialect();
    
    if (dialect === 'sqlite') {
      // SQLite - add column directly
      try {
        // Check if column exists first
        const tableInfo = await db.sequelize.query(`PRAGMA table_info(clients)`, { type: QueryTypes.SELECT });
        const columnExists = tableInfo.some(col => col.name === 'profile_image');
        
        if (!columnExists) {
          await db.sequelize.query(`
            ALTER TABLE clients 
            ADD COLUMN profile_image VARCHAR(255)
          `, { type: QueryTypes.RAW });
          console.log('✅ Added column: clients.profile_image');
        } else {
          console.log('⚠️  Column already exists: clients.profile_image');
        }
      } catch (error) {
        if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
          console.log('⚠️  Column already exists: clients.profile_image');
        } else {
          console.error('❌ Error adding clients.profile_image:', error.message);
          throw error;
        }
      }
    } else {
      // PostgreSQL - add column directly
      try {
        await db.sequelize.query(`
          ALTER TABLE clients 
          ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255)
        `, { type: QueryTypes.RAW });
        console.log('✅ Added column: clients.profile_image');
      } catch (error) {
        if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
          console.log('⚠️  Column already exists: clients.profile_image');
        } else {
          console.error('❌ Error adding clients.profile_image:', error.message);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addProfileImageColumn();


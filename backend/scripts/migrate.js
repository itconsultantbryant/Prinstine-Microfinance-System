const db = require('../config/database');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Sync database schema
    await db.sequelize.sync({ alter: true });
    
    console.log('✅ Database migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();


const db = require('../config/database');

async function addTotalDuesColumn() {
  try {
    console.log('🔄 Adding total_dues column to clients table...');

    const queryInterface = db.sequelize.getQueryInterface();
    const dialect = db.sequelize.options.dialect;

    // Check if column exists
    let columnExists = false;
    if (dialect === 'postgres') {
      const [results] = await db.sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'total_dues'`
      );
      columnExists = results.length > 0;
    } else if (dialect === 'sqlite') {
      const [results] = await db.sequelize.query(`PRAGMA table_info(clients)`);
      columnExists = results.some(col => col.name === 'total_dues');
    }

    if (!columnExists) {
      await queryInterface.addColumn('clients', 'total_dues', {
        type: db.Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        allowNull: false
      });
      console.log('✅ Added total_dues column');
    } else {
      console.log('ℹ️ total_dues column already exists');
    }

    console.log('✅ Total dues column migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

module.exports = addTotalDuesColumn;


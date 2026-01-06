const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');

async function clearAllData() {
  try {
    console.log('🗑️  Starting data cleanup...');
    
    const dialect = db.sequelize.getDialect();
    console.log(`📊 Database dialect: ${dialect}`);
    
    // Disable foreign key checks temporarily (for SQLite)
    if (dialect === 'sqlite') {
      await db.sequelize.query('PRAGMA foreign_keys = OFF', { type: QueryTypes.RAW });
    } else {
      // PostgreSQL - disable triggers temporarily
      await db.sequelize.query('SET session_replication_role = replica', { type: QueryTypes.RAW });
    }
    
    // Delete all data in order (respecting foreign keys)
    console.log('📝 Deleting all data...');
    
    // Delete in reverse order of dependencies
    await db.LoanRepayment.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared LoanRepayments');
    
    await db.Collection.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Collections');
    
    await db.Transaction.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Transactions');
    
    await db.Loan.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Loans');
    
    await db.SavingsAccount.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared SavingsAccounts');
    
    await db.Collateral.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Collaterals');
    
    await db.KycDocument.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared KycDocuments');
    
    await db.Client.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Clients');
    
    await db.Payroll.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Payrolls');
    
    await db.Staff.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Staff');
    
    await db.GeneralLedger.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared GeneralLedger');
    
    await db.JournalEntry.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared JournalEntries');
    
    await db.Expense.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Expenses');
    
    await db.Revenue.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Revenues');
    
    await db.Transfer.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Transfers');
    
    await db.Notification.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared Notifications');
    
    await db.AuditLog.destroy({ where: {}, force: true, truncate: true });
    console.log('✅ Cleared AuditLogs');
    
    // Delete all users except admin
    await db.User.destroy({ 
      where: { 
        role: { [db.Sequelize.Op.ne]: 'admin' }
      },
      force: true
    });
    console.log('✅ Cleared non-admin users');
    
    // Reset sequences/auto-increment (for SQLite, this happens automatically)
    if (dialect === 'postgres') {
      // Reset sequences for PostgreSQL
      const tables = [
        'users', 'clients', 'loans', 'savings_accounts', 'transactions',
        'collaterals', 'kyc_documents', 'loan_repayments', 'collections',
        'staff', 'payrolls', 'general_ledger', 'journal_entries',
        'expenses', 'revenues', 'transfers', 'notifications', 'audit_logs'
      ];
      
      for (const table of tables) {
        try {
          await db.sequelize.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false)`, { type: QueryTypes.RAW });
        } catch (err) {
          // Ignore if sequence doesn't exist
        }
      }
      console.log('✅ Reset PostgreSQL sequences');
    }
    
    // Re-enable foreign key checks
    if (dialect === 'sqlite') {
      await db.sequelize.query('PRAGMA foreign_keys = ON', { type: QueryTypes.RAW });
    } else {
      await db.sequelize.query('SET session_replication_role = DEFAULT', { type: QueryTypes.RAW });
    }
    
    // Ensure admin user exists
    const adminExists = await db.User.findOne({ where: { email: 'admin@microfinance.com' } });
    if (!adminExists) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      const branch = await db.Branch.findOne();
      
      await db.User.create({
        name: 'Admin User',
        email: 'admin@microfinance.com',
        username: 'admin',
        password: adminPassword,
        role: 'admin',
        branch_id: branch ? branch.id : null,
        is_active: true,
        email_verified_at: new Date()
      });
      console.log('✅ Created admin user');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Ensure at least one branch exists
    const branchExists = await db.Branch.findOne();
    if (!branchExists) {
      await db.Branch.create({
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
      });
      console.log('✅ Created main branch');
    } else {
      console.log('✅ Branch already exists');
    }
    
    console.log('\n✅ Data cleanup completed successfully!');
    console.log('📧 Admin credentials:');
    console.log('   Email: admin@microfinance.com');
    console.log('   Password: admin123');
    console.log('\n🔄 System is now ready for real-time data!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    console.error('Error stack:', error.stack);
    
    // Re-enable foreign key checks on error
    try {
      if (db.sequelize.getDialect() === 'sqlite') {
        await db.sequelize.query('PRAGMA foreign_keys = ON', { type: QueryTypes.RAW });
      } else {
        await db.sequelize.query('SET session_replication_role = DEFAULT', { type: QueryTypes.RAW });
      }
    } catch (e) {
      // Ignore
    }
    
    process.exit(1);
  }
}

clearAllData();


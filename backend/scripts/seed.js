const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Sync database first
    console.log('📊 Syncing database...');
    await db.sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // Create branch
    const branch = await db.Branch.findOrCreate({
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
    const admin = await db.User.findOrCreate({
      where: { email: 'admin@microfinance.com' },
      defaults: {
        name: 'Admin User',
        email: 'admin@microfinance.com',
        username: 'admin',
        password: adminPassword,
        role: 'admin',
        branch_id: branch[0].id,
        is_active: true,
        email_verified_at: new Date()
      }
    });

    console.log('✅ Seeding completed successfully!');
    console.log('📧 Admin credentials:');
    console.log('   Email: admin@microfinance.com');
    console.log('   Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();


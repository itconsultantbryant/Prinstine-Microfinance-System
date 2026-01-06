const db = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to database...\n');

    // Add missing Client columns
    const clientColumns = [
      { name: 'primary_phone_country', type: 'VARCHAR(10)' },
      { name: 'secondary_phone', type: 'VARCHAR(20)' },
      { name: 'secondary_phone_country', type: 'VARCHAR(10)' },
      { name: 'marital_status', type: 'VARCHAR(20)' },
      { name: 'identification_type', type: 'VARCHAR(50)' },
      { name: 'identification_number', type: 'VARCHAR(50)' },
      { name: 'zip_code', type: 'VARCHAR(20)' },
      { name: 'employer', type: 'VARCHAR(255)' },
      { name: 'employee_number', type: 'VARCHAR(50)' },
      { name: 'tax_number', type: 'VARCHAR(50)' }
    ];

    for (const col of clientColumns) {
      try {
        await db.sequelize.query(`
          ALTER TABLE clients 
          ADD COLUMN ${col.name} ${col.type}
        `, { type: QueryTypes.RAW });
        console.log(`✅ Added column: clients.${col.name}`);
      } catch (error) {
        if (error.message.includes('duplicate column')) {
          console.log(`⚠️  Column already exists: clients.${col.name}`);
        } else {
          console.error(`❌ Error adding clients.${col.name}:`, error.message);
        }
      }
    }

    // Add missing Loan columns
    const loanColumns = [
      { name: 'loan_purpose', type: 'VARCHAR(255)' },
      { name: 'application_date', type: 'DATE' },
      { name: 'monthly_payment', type: 'DECIMAL(15,2)' },
      { name: 'total_interest', type: 'DECIMAL(15,2) DEFAULT 0' },
      { name: 'total_amount', type: 'DECIMAL(15,2)' },
      { name: 'repayment_schedule', type: 'TEXT' },
      { name: 'next_due_date', type: 'DATE' },
      { name: 'next_payment_amount', type: 'DECIMAL(15,2)' }
    ];

    for (const col of loanColumns) {
      try {
        await db.sequelize.query(`
          ALTER TABLE loans 
          ADD COLUMN ${col.name} ${col.type}
        `, { type: QueryTypes.RAW });
        console.log(`✅ Added column: loans.${col.name}`);
      } catch (error) {
        if (error.message.includes('duplicate column')) {
          console.log(`⚠️  Column already exists: loans.${col.name}`);
        } else {
          console.error(`❌ Error adding loans.${col.name}:`, error.message);
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

addMissingColumns();


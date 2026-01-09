const db = require('../config/database');

async function addCurrencyFields() {
  try {
    const sequelize = db.sequelize;
    const dialect = sequelize.options.dialect;

    console.log('🔄 Adding currency fields to database...');

    if (dialect === 'postgres') {
      // PostgreSQL - Add currency fields and ENUMs
      
      // Create ENUM types if they don't exist
      try {
        await sequelize.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_enum') THEN
              CREATE TYPE currency_enum AS ENUM ('LRD', 'USD');
            END IF;
          END $$;
        `);
        console.log('✅ Created currency_enum type');
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.warn('⚠️  Warning creating currency_enum:', err.message);
        }
      }

      // Add currency field to loans table
      try {
        const [loanColumns] = await sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'loans' 
          AND column_name = 'currency'
        `);
        
        if (loanColumns.length === 0) {
          await sequelize.query(`ALTER TABLE loans ADD COLUMN currency currency_enum DEFAULT 'USD' NOT NULL`);
          console.log('✅ Added currency column to loans table');
        } else {
          console.log('✅ Currency column already exists in loans table');
        }
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.warn('⚠️  Warning adding currency to loans:', err.message);
        }
      }

      // Add currency field to savings_accounts table
      try {
        const [savingsColumns] = await sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'savings_accounts' 
          AND column_name = 'currency'
        `);
        
        if (savingsColumns.length === 0) {
          await sequelize.query(`ALTER TABLE savings_accounts ADD COLUMN currency currency_enum DEFAULT 'USD' NOT NULL`);
          console.log('✅ Added currency column to savings_accounts table');
        } else {
          console.log('✅ Currency column already exists in savings_accounts table');
        }
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.warn('⚠️  Warning adding currency to savings_accounts:', err.message);
        }
      }

      // Add dues_currency field to clients table
      try {
        const [clientColumns] = await sequelize.query(`
          SELECT column_name, data_type, udt_name
          FROM information_schema.columns 
          WHERE table_name = 'clients' 
          AND column_name = 'dues_currency'
        `);
        
        if (clientColumns.length === 0) {
          // Add as VARCHAR(3) to match model definition
          await sequelize.query(`ALTER TABLE clients ADD COLUMN dues_currency VARCHAR(3) DEFAULT 'USD' NOT NULL`);
          console.log('✅ Added dues_currency column to clients table');
        } else {
          // Check if it's an ENUM and needs conversion
          const column = clientColumns[0];
          if (column.udt_name && column.udt_name.includes('enum')) {
            // Convert ENUM to VARCHAR(3)
            await sequelize.query(`
              ALTER TABLE clients 
              ALTER COLUMN dues_currency TYPE VARCHAR(3) 
              USING dues_currency::text
            `);
            await sequelize.query(`ALTER TABLE clients ALTER COLUMN dues_currency SET DEFAULT 'USD'`);
            console.log('✅ Converted dues_currency from ENUM to VARCHAR(3)');
          } else {
            console.log('✅ dues_currency column already exists in clients table');
          }
        }
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.warn('⚠️  Warning adding dues_currency to clients:', err.message);
        }
      }

      // Update transactions table currency column to use ENUM
      try {
        const [transColumns] = await sequelize.query(`
          SELECT column_name, data_type, udt_name
          FROM information_schema.columns 
          WHERE table_name = 'transactions' 
          AND column_name = 'currency'
        `);
        
        if (transColumns.length > 0 && transColumns[0].udt_name !== 'currency_enum') {
          // First update existing NULL or non-LRD/USD values
          await sequelize.query(`UPDATE transactions SET currency = 'USD' WHERE currency IS NULL OR currency NOT IN ('LRD', 'USD')`);
          
          // Alter column to use ENUM
          await sequelize.query(`ALTER TABLE transactions ALTER COLUMN currency TYPE currency_enum USING currency::currency_enum`);
          await sequelize.query(`ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'USD'`);
          await sequelize.query(`ALTER TABLE transactions ALTER COLUMN currency SET NOT NULL`);
          console.log('✅ Updated transactions.currency to use currency_enum');
        } else {
          console.log('✅ transactions.currency already uses currency_enum');
        }
      } catch (err) {
        console.warn('⚠️  Warning updating transactions currency:', err.message);
      }

    } else {
      // SQLite - Add columns with CHECK constraint
      try {
        const [loanInfo] = await sequelize.query(`PRAGMA table_info(loans)`);
        const loanColumns = loanInfo.map(col => col.name);
        
        if (!loanColumns.includes('currency')) {
          await sequelize.query(`ALTER TABLE loans ADD COLUMN currency TEXT DEFAULT 'USD' CHECK(currency IN ('LRD', 'USD')) NOT NULL`);
          console.log('✅ Added currency column to loans table');
        } else {
          console.log('✅ Currency column already exists in loans table');
        }
      } catch (err) {
        if (!err.message.includes('duplicate column')) {
          console.warn('⚠️  Warning adding currency to loans:', err.message);
        }
      }

      try {
        const [savingsInfo] = await sequelize.query(`PRAGMA table_info(savings_accounts)`);
        const savingsColumns = savingsInfo.map(col => col.name);
        
        if (!savingsColumns.includes('currency')) {
          await sequelize.query(`ALTER TABLE savings_accounts ADD COLUMN currency TEXT DEFAULT 'USD' CHECK(currency IN ('LRD', 'USD')) NOT NULL`);
          console.log('✅ Added currency column to savings_accounts table');
        } else {
          console.log('✅ Currency column already exists in savings_accounts table');
        }
      } catch (err) {
        if (!err.message.includes('duplicate column')) {
          console.warn('⚠️  Warning adding currency to savings_accounts:', err.message);
        }
      }

      try {
        const [clientInfo] = await sequelize.query(`PRAGMA table_info(clients)`);
        const clientColumns = clientInfo.map(col => col.name);
        
        if (!clientColumns.includes('dues_currency')) {
          await sequelize.query(`ALTER TABLE clients ADD COLUMN dues_currency TEXT DEFAULT 'USD' CHECK(dues_currency IN ('LRD', 'USD')) NOT NULL`);
          console.log('✅ Added dues_currency column to clients table');
        } else {
          console.log('✅ dues_currency column already exists in clients table');
        }
      } catch (err) {
        if (!err.message.includes('duplicate column')) {
          console.warn('⚠️  Warning adding dues_currency to clients:', err.message);
        }
      }

      try {
        const [transInfo] = await sequelize.query(`PRAGMA table_info(transactions)`);
        const transColumns = transInfo.map(col => col.name);
        
        if (transColumns.includes('currency')) {
          // Update existing values and add constraint
          await sequelize.query(`UPDATE transactions SET currency = 'USD' WHERE currency IS NULL OR currency NOT IN ('LRD', 'USD')`);
          // Note: SQLite doesn't support ALTER COLUMN for CHECK constraints, so we'll need to recreate the table
          // For now, just ensure values are correct
          console.log('✅ Updated transactions currency values');
        }
      } catch (err) {
        console.warn('⚠️  Warning updating transactions currency:', err.message);
      }
    }

    console.log('✅ Currency fields migration completed!');
  } catch (error) {
    console.error('❌ Error in currency fields migration:', error);
    throw error;
  }
}

module.exports = addCurrencyFields;

// Run if called directly
if (require.main === module) {
  addCurrencyFields()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}


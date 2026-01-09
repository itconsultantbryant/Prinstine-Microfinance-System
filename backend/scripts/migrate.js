const db = require('../config/database');
const addTotalDuesColumn = require('./add-total-dues-column');
const addCurrencyFields = require('./add-currency-fields');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    const sequelize = db.sequelize;
    const dialect = sequelize.options.dialect;
    
    // First, fix any existing ENUM columns that should be VARCHAR
    if (dialect === 'postgres') {
      console.log('🔄 Checking for ENUM columns that need conversion...');
      
      // Helper function to convert currency column from ENUM to VARCHAR
      const convertCurrencyColumn = async (tableName, columnName, enumTypeName) => {
        try {
          const [columns] = await sequelize.query(`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = '${tableName}' 
            AND column_name = '${columnName}'
          `);
          
          if (columns.length > 0) {
            const column = columns[0];
            // Check if it's an ENUM type
            const [enumTypes] = await sequelize.query(`
              SELECT t.typname 
              FROM pg_type t 
              JOIN pg_enum e ON t.oid = e.enumtypid 
              WHERE t.typname = '${enumTypeName}'
              LIMIT 1
            `);
            
            if (enumTypes.length > 0 || (column.udt_name && column.udt_name.includes('enum'))) {
              console.log(`🔄 Converting ${tableName}.${columnName} from ENUM to VARCHAR(3)...`);
              try {
                await sequelize.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} DROP DEFAULT`);
                await sequelize.query(`
                  ALTER TABLE ${tableName} 
                  ALTER COLUMN ${columnName} TYPE VARCHAR(3) 
                  USING ${columnName}::text
                `);
                await sequelize.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET DEFAULT 'USD'`);
                await sequelize.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL`);
                console.log(`✅ Converted ${tableName}.${columnName} to VARCHAR(3)`);
                
                // Drop the enum type
                try {
                  await sequelize.query(`DROP TYPE IF EXISTS ${enumTypeName}`);
                  console.log(`✅ Dropped ${enumTypeName} type`);
                } catch (dropEnumError) {
                  if (!dropEnumError.message.includes('does not exist')) {
                    console.warn(`⚠️  Could not drop ${enumTypeName}:`, dropEnumError.message);
                  }
                }
              } catch (convertError) {
                console.warn(`⚠️  Error converting ${tableName}.${columnName}, trying drop and recreate:`, convertError.message);
                try {
                  await sequelize.query(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName} CASCADE`);
                  await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(3) DEFAULT 'USD' NOT NULL`);
                  console.log(`✅ Recreated ${tableName}.${columnName} as VARCHAR(3)`);
                } catch (recreateError) {
                  console.warn(`⚠️  Error recreating ${tableName}.${columnName}:`, recreateError.message);
                }
              }
            } else {
              console.log(`✅ ${tableName}.${columnName} is already VARCHAR`);
            }
          } else {
            // Column doesn't exist - create it as VARCHAR(3)
            console.log(`🔄 Creating ${tableName}.${columnName} column as VARCHAR(3)...`);
            try {
              await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(3) DEFAULT 'USD' NOT NULL`);
              console.log(`✅ Created ${tableName}.${columnName} as VARCHAR(3)`);
            } catch (createError) {
              if (!createError.message.includes('already exists') && !createError.message.includes('duplicate')) {
                console.warn(`⚠️  Error creating ${tableName}.${columnName}:`, createError.message);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️  Error processing ${tableName}.${columnName}:`, error.message);
        }
      };
      
      // Convert all currency columns
      try {
        await convertCurrencyColumn('clients', 'dues_currency', 'enum_clients_dues_currency');
        await convertCurrencyColumn('loans', 'currency', 'enum_loans_currency');
        await convertCurrencyColumn('transactions', 'currency', 'enum_transactions_currency');
        await convertCurrencyColumn('savings_accounts', 'currency', 'enum_savings_accounts_currency');
      } catch (preSyncError) {
        console.warn('⚠️  Pre-sync migration warning:', preSyncError.message);
      }
    }
    
    // Sync database schema (but skip altering dues_currency if it exists)
    // We'll handle it manually in the migration scripts
    console.log('🔄 Syncing database schema...');
    try {
      await db.sequelize.sync({ alter: true });
    } catch (syncError) {
      // If sync fails due to dues_currency ENUM issue, try to fix it and retry
      if (syncError.message && syncError.message.includes('dues_currency') && dialect === 'postgres') {
        console.log('⚠️  Sync failed, attempting to fix dues_currency column...');
        try {
          // Force convert to VARCHAR
          await sequelize.query(`
            ALTER TABLE clients 
            ALTER COLUMN dues_currency TYPE VARCHAR(3) 
            USING CASE 
              WHEN dues_currency::text IN ('LRD', 'USD') THEN dues_currency::text 
              ELSE 'USD' 
            END
          `);
          await sequelize.query(`ALTER TABLE clients ALTER COLUMN dues_currency SET DEFAULT 'USD'`);
          await sequelize.query(`ALTER TABLE clients ALTER COLUMN dues_currency SET NOT NULL`);
          console.log('✅ Fixed dues_currency, retrying sync...');
          await db.sequelize.sync({ alter: true });
        } catch (retryError) {
          console.warn('⚠️  Retry sync failed:', retryError.message);
          throw syncError; // Throw original error
        }
      } else {
        throw syncError;
      }
    }
    
    // Run total dues column migration
    console.log('🔄 Running total dues column migration...');
    try {
      await addTotalDuesColumn();
    } catch (duesMigrationError) {
      console.warn('⚠️  Total dues migration warning:', duesMigrationError.message);
    }
    
    // Run currency fields migration
    console.log('🔄 Running currency fields migration...');
    try {
      await addCurrencyFields();
    } catch (currencyMigrationError) {
      console.warn('⚠️  Currency fields migration warning:', currencyMigrationError.message);
    }
    
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


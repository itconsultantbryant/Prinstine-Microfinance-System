const db = require('../config/database');

async function addExcessLoanType() {
  try {
    const sequelize = db.sequelize;
    const dialect = sequelize.options.dialect;

    console.log('🔄 Adding "excess" to loan_type ENUM...');

    if (dialect === 'postgres') {
      // PostgreSQL: Use ALTER TYPE to add the new value
      try {
        // First, try to find the actual enum name
        const [enumResults] = await sequelize.query(`
          SELECT DISTINCT t.typname
          FROM pg_type t 
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname LIKE '%loan_type%' OR t.typname LIKE '%loans%'
          LIMIT 1;
        `);
        
        let enumName = null;
        if (enumResults && enumResults.length > 0) {
          enumName = enumResults[0].typname;
        } else {
          // Try common enum naming patterns
          const possibleNames = ['enum_loans_loan_type', 'loans_loan_type_enum', 'loan_type_enum'];
          for (const name of possibleNames) {
            try {
              const [check] = await sequelize.query(`
                SELECT 1 FROM pg_type WHERE typname = '${name}';
              `);
              if (check && check.length > 0) {
                enumName = name;
                break;
              }
            } catch (e) {
              // Continue to next name
            }
          }
        }
        
        if (enumName) {
          // Check if 'excess' already exists
          const [existingValues] = await sequelize.query(`
            SELECT e.enumlabel
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = '${enumName}' AND e.enumlabel = 'excess';
          `);
          
          if (!existingValues || existingValues.length === 0) {
            await sequelize.query(`ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS 'excess';`);
            console.log(`✅ "excess" added to ${enumName} successfully.`);
          } else {
            console.log('✅ "excess" already exists in enum.');
          }
        } else {
          // Try the standard approach
          try {
            await sequelize.query(`
              DO $$ 
              BEGIN
                IF NOT EXISTS (
                  SELECT 1 FROM pg_enum 
                  WHERE enumlabel = 'excess' 
                  AND enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = 'enum_loans_loan_type'
                  )
                ) THEN
                  ALTER TYPE enum_loans_loan_type ADD VALUE 'excess';
                END IF;
              END $$;
            `);
            console.log('✅ "excess" added to enum_loans_loan_type successfully.');
          } catch (standardError) {
            console.log('⚠️  Could not automatically add "excess" to enum. Manual migration may be required.');
            console.log('⚠️  Error:', standardError.message);
            // Don't throw - let the sync handle it
          }
        }
      } catch (error) {
        console.log('⚠️  Could not add "excess" to enum automatically:', error.message);
        console.log('⚠️  The enum will be updated on next database sync.');
        // Don't throw - this is not critical if sync handles it
      }
    } else {
      // SQLite doesn't have strict ENUMs, so this is mainly for PostgreSQL
      console.log('✅ SQLite detected - no ENUM migration needed.');
    }
  } catch (error) {
    console.error('❌ Error in addExcessLoanType:', error.message);
    // Don't throw - let the server continue
  }
}

module.exports = addExcessLoanType;


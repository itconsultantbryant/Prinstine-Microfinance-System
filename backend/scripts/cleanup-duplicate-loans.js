const db = require('../config/database');

async function cleanupDuplicateLoans() {
  try {
    console.log('🔍 Checking for duplicate loan numbers...');
    
    // Find all loans grouped by loan_number
    const allLoans = await db.Loan.findAll({
      attributes: ['id', 'loan_number', 'client_id', 'amount', 'status', 'created_at', 'deleted_at'],
      order: [['created_at', 'ASC']], // Oldest first - keep the first one
      paranoid: false // Include soft-deleted
    });
    
    // Group by loan_number to find duplicates
    const loanNumberMap = {};
    allLoans.forEach(loan => {
      if (!loanNumberMap[loan.loan_number]) {
        loanNumberMap[loan.loan_number] = [];
      }
      loanNumberMap[loan.loan_number].push({
        id: loan.id,
        client_id: loan.client_id,
        amount: loan.amount,
        status: loan.status,
        created_at: loan.created_at,
        deleted_at: loan.deleted_at
      });
    });
    
    // Find duplicates
    const duplicates = [];
    Object.keys(loanNumberMap).forEach(loanNumber => {
      if (loanNumberMap[loanNumber].length > 1) {
        // Sort by created_at - keep the oldest one
        const sortedLoans = loanNumberMap[loanNumber].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        duplicates.push({
          loan_number: loanNumber,
          count: sortedLoans.length,
          keep: sortedLoans[0], // Keep the first one
          delete: sortedLoans.slice(1) // Delete the rest
        });
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate loan numbers found!');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${duplicates.length} duplicate loan number(s):\n`);
    
    duplicates.forEach(dup => {
      console.log(`\n📋 Loan Number: ${dup.loan_number}`);
      console.log(`   Total duplicates: ${dup.count}`);
      console.log(`   Keeping: ID ${dup.keep.id} (created: ${dup.keep.created_at})`);
      console.log(`   To delete:`);
      dup.delete.forEach(loan => {
        console.log(`     - ID ${loan.id} (created: ${loan.created_at}, status: ${loan.status})`);
      });
    });
    
    // Delete duplicate loans (keep the first one)
    console.log('\n🗑️  Deleting duplicate loans...');
    let deletedCount = 0;
    
    for (const dup of duplicates) {
      for (const loanToDelete of dup.delete) {
        try {
          const loan = await db.Loan.findByPk(loanToDelete.id, { paranoid: false });
          if (loan) {
            // Delete associated repayments first
            await db.LoanRepayment.destroy({ where: { loan_id: loan.id } });
            
            // Delete the loan (force delete if already soft-deleted)
            const wasDeleted = loan.deleted_at !== null;
            await loan.destroy({ force: wasDeleted });
            
            console.log(`   ✅ Deleted loan ID ${loanToDelete.id} (Loan Number: ${dup.loan_number})`);
            deletedCount++;
          }
        } catch (error) {
          console.error(`   ❌ Failed to delete loan ID ${loanToDelete.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} duplicate loan(s).`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up duplicate loans:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupDuplicateLoans();
}

module.exports = cleanupDuplicateLoans;


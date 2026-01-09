const db = require('../config/database');
const { Op } = require('sequelize');

async function deleteClientByName(clientName) {
  const transaction = await db.sequelize.transaction();
  try {
    // Find client by name (checking both first_name and last_name, or full name)
    const nameParts = clientName.trim().split(/\s+/).filter(p => p.length > 0);
    let whereClause;
    
    // Use LIKE for SQLite compatibility (case-insensitive search)
    if (nameParts.length === 1) {
      // Single name - check first_name or last_name or full name combination
      whereClause = {
        [Op.or]: [
          { first_name: { [Op.like]: `%${nameParts[0]}%` } },
          { last_name: { [Op.like]: `%${nameParts[0]}%` } },
          { 
            [Op.or]: [
              db.sequelize.where(
                db.sequelize.fn('lower', db.sequelize.col('first_name') || ' ' || db.sequelize.col('last_name')),
                { [Op.like]: `%${nameParts[0].toLowerCase()}%` }
              )
            ]
          }
        ]
      };
    } else {
      // Multiple names - try exact match first, then partial
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      whereClause = {
        [Op.or]: [
          // Exact match: first_name matches first part AND last_name matches last part
          {
            [Op.and]: [
              { first_name: { [Op.like]: `%${firstName}%` } },
              { last_name: { [Op.like]: `%${lastName}%` } }
            ]
          },
          // Reverse: last_name matches first part AND first_name matches last part
          {
            [Op.and]: [
              { first_name: { [Op.like]: `%${lastName}%` } },
              { last_name: { [Op.like]: `%${firstName}%` } }
            ]
          },
          // Either name contains any part
          {
            [Op.or]: [
              { first_name: { [Op.like]: `%${firstName}%` } },
              { last_name: { [Op.like]: `%${lastName}%` } },
              { first_name: { [Op.like]: `%${lastName}%` } },
              { last_name: { [Op.like]: `%${firstName}%` } }
            ]
          }
        ]
      };
    }

    const clients = await db.Client.findAll({
      where: whereClause,
      attributes: ['id', 'first_name', 'last_name', 'client_number'],
      transaction
    });

    if (clients.length === 0) {
      console.log(`❌ No client found matching: ${clientName}`);
      await transaction.rollback();
      return;
    }

    if (clients.length > 1) {
      console.log(`⚠️  Multiple clients found matching "${clientName}":`);
      clients.forEach(c => {
        console.log(`   - ${c.first_name} ${c.last_name} (ID: ${c.id}, Client #: ${c.client_number})`);
      });
      await transaction.rollback();
      return;
    }

    const client = clients[0];
    console.log(`\n🗑️  Deleting client: ${client.first_name} ${client.last_name} (ID: ${client.id}, Client #: ${client.client_number})`);

    // Import the delete function from clients route
    // Since we can't import it directly, we'll replicate the logic
    const clientId = client.id;

    // 1. Get all loans for this client
    const loans = await db.Loan.findAll({ where: { client_id: clientId }, transaction });
    const loanIds = loans.map(loan => loan.id);
    console.log(`   - Found ${loans.length} loan(s)`);

    // 2. Get all savings accounts for this client
    const savingsAccounts = await db.SavingsAccount.findAll({ where: { client_id: clientId }, transaction });
    const savingsIds = savingsAccounts.map(savings => savings.id);
    console.log(`   - Found ${savingsAccounts.length} savings account(s)`);

    // 3. Get all transaction IDs that need revenue deletion
    const transactionWhere = {
      [Op.or]: [
        { client_id: clientId }
      ]
    };
    if (loanIds.length > 0) {
      transactionWhere[Op.or].push({ loan_id: { [Op.in]: loanIds } });
    }
    if (savingsIds.length > 0) {
      transactionWhere[Op.or].push({ savings_account_id: { [Op.in]: savingsIds } });
    }

    const allTransactions = await db.Transaction.findAll({
      where: transactionWhere,
      attributes: ['id'],
      transaction
    });
    const transactionIds = allTransactions.map(t => t.id);
    console.log(`   - Found ${allTransactions.length} transaction(s)`);

    // 4. Delete revenue records associated with transactions
    if (transactionIds.length > 0) {
      const revenueCount = await db.Revenue.destroy({
        where: { transaction_id: { [Op.in]: transactionIds } },
        force: true,
        transaction
      });
      console.log(`   - Deleted ${revenueCount} revenue record(s)`);
    }

    // 5. Delete loan repayments for all loans
    if (loanIds.length > 0) {
      const repaymentCount = await db.LoanRepayment.destroy({
        where: { loan_id: { [Op.in]: loanIds } },
        force: true,
        transaction
      });
      console.log(`   - Deleted ${repaymentCount} loan repayment(s)`);

      // 6. Delete collections for all loans
      const collectionCount = await db.Collection.destroy({
        where: { loan_id: { [Op.in]: loanIds } },
        force: true,
        transaction
      });
      console.log(`   - Deleted ${collectionCount} collection(s)`);

      // 7. Delete revenue records associated with loans
      const loanRevenueCount = await db.Revenue.destroy({
        where: { loan_id: { [Op.in]: loanIds } },
        force: true,
        transaction
      });
      console.log(`   - Deleted ${loanRevenueCount} loan revenue record(s)`);

      // 8. Delete loans
      const loanCount = await db.Loan.destroy({
        where: { client_id: clientId },
        force: true,
        transaction
      });
      console.log(`   - Deleted ${loanCount} loan(s)`);
    }

    // 9. Delete savings accounts
    if (savingsIds.length > 0) {
      const savingsCount = await db.SavingsAccount.destroy({
        where: { client_id: clientId },
        force: true,
        transaction
      });
      console.log(`   - Deleted ${savingsCount} savings account(s)`);
    }

    // 10. Delete all transactions
    const transactionCount = await db.Transaction.destroy({
      where: transactionWhere,
      force: true,
      transaction
    });
    console.log(`   - Deleted ${transactionCount} transaction(s)`);

    // 11. Delete collaterals for this client
    const collateralCount = await db.Collateral.destroy({
      where: { client_id: clientId },
      force: true,
      transaction
    });
    console.log(`   - Deleted ${collateralCount} collateral(s)`);

    // 12. Delete KYC documents for this client
    const kycCount = await db.KycDocument.destroy({
      where: { client_id: clientId },
      force: true,
      transaction
    });
    console.log(`   - Deleted ${kycCount} KYC document(s)`);

    // 13. Finally, soft delete the client
    await client.destroy({ transaction });
    console.log(`   - Soft deleted client (can be restored from recycle bin)`);

    await transaction.commit();
    console.log(`✅ Successfully deleted client: ${client.first_name} ${client.last_name}\n`);
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error deleting client "${clientName}":`, error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting client deletion process...\n');
    
    // Connect to database
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Delete clients
    const clientsToDelete = ['Test Clientt', 'James Kollie'];
    
    for (const clientName of clientsToDelete) {
      await deleteClientByName(clientName);
    }

    console.log('✅ All clients deleted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();


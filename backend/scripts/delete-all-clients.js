/**
 * Script to delete all clients from the system
 * Usage: node backend/scripts/delete-all-clients.js
 * 
 * WARNING: This will soft-delete all clients. They can be restored from the Recycle Bin.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/database');

async function deleteAllClients() {
  try {
    console.log('Connecting to database...');
    await db.sequelize.authenticate();
    console.log('Database connection established.');

    // Get all clients
    const allClients = await db.Client.findAll({
      attributes: ['id', 'client_number', 'first_name', 'last_name', 'email'],
      paranoid: false // Include soft-deleted to see all
    });

    console.log(`\nFound ${allClients.length} client(s) in the system.`);
    
    if (allClients.length === 0) {
      console.log('No clients to delete.');
      process.exit(0);
    }

    // Show clients that will be deleted
    console.log('\nClients to be deleted:');
    allClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.client_number} - ${client.first_name} ${client.last_name} (${client.email})`);
    });

    // Delete all clients (soft delete)
    console.log('\nDeleting all clients...');
    const deletedCount = await db.Client.destroy({
      where: {},
      force: false // Soft delete
    });

    console.log(`\n✅ Successfully deleted ${deletedCount} client(s).`);
    console.log('Note: Clients are soft-deleted and can be restored from the Recycle Bin.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting clients:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the script
deleteAllClients();


const db = require('../config/database');
const { Op } = require('sequelize');

async function searchAllClients() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Search for all clients (including soft-deleted)
    const allClients = await db.Client.findAll({
      attributes: ['id', 'first_name', 'last_name', 'client_number', 'email', 'deleted_at'],
      paranoid: false,
      order: [['first_name', 'ASC']]
    });

    console.log(`Found ${allClients.length} total clients (including deleted):\n`);
    allClients.forEach((client, index) => {
      const status = client.deleted_at ? '(DELETED)' : '(ACTIVE)';
      console.log(`${index + 1}. ${client.first_name} ${client.last_name} ${status} (ID: ${client.id}, Client #: ${client.client_number})`);
    });

    // Search specifically for variations
    console.log('\n--- Searching for name variations ---\n');
    const searchTerms = ['Test', 'Clientt', 'James', 'Kollie', 'Kolie', 'Sam'];
    
    for (const term of searchTerms) {
      const matches = await db.Client.findAll({
        attributes: ['id', 'first_name', 'last_name', 'client_number', 'email', 'deleted_at'],
        where: {
          [Op.or]: [
            { first_name: { [Op.like]: `%${term}%` } },
            { last_name: { [Op.like]: `%${term}%` } }
          ]
        },
        paranoid: false
      });

      if (matches.length > 0) {
        console.log(`Matches for "${term}":`);
        matches.forEach(client => {
          const status = client.deleted_at ? '(DELETED)' : '(ACTIVE)';
          console.log(`  - ${client.first_name} ${client.last_name} ${status} (ID: ${client.id})`);
        });
        console.log('');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

searchAllClients();


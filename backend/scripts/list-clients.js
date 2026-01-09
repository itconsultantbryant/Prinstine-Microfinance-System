const db = require('../config/database');
const { Op } = require('sequelize');

async function listClients() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    const clients = await db.Client.findAll({
      attributes: ['id', 'first_name', 'last_name', 'client_number', 'email'],
      where: {
        deleted_at: null
      },
      order: [['first_name', 'ASC']]
    });

    console.log(`Found ${clients.length} active clients:\n`);
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.first_name} ${client.last_name} (ID: ${client.id}, Client #: ${client.client_number}, Email: ${client.email || 'N/A'})`);
    });

    // Also check for clients with "Test" or "James" in their name
    console.log('\n--- Searching for "Test" or "James" ---\n');
    const testClients = await db.Client.findAll({
      attributes: ['id', 'first_name', 'last_name', 'client_number', 'email'],
      where: {
        deleted_at: null,
        [Op.or]: [
          { first_name: { [Op.like]: '%Test%' } },
          { last_name: { [Op.like]: '%Test%' } },
          { first_name: { [Op.like]: '%James%' } },
          { last_name: { [Op.like]: '%James%' } },
          { first_name: { [Op.like]: '%Kollie%' } },
          { last_name: { [Op.like]: '%Kollie%' } }
        ]
      }
    });

    if (testClients.length > 0) {
      console.log(`Found ${testClients.length} matching client(s):\n`);
      testClients.forEach((client) => {
        console.log(`- ${client.first_name} ${client.last_name} (ID: ${client.id}, Client #: ${client.client_number})`);
      });
    } else {
      console.log('No clients found matching "Test" or "James"');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listClients();


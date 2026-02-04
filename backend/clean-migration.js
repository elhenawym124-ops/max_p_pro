const { Client } = require('pg');

async function cleanMigration() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'max',
        password: '0165676135',
        port: 5432,
    });

    try {
        await client.connect();
        await client.query("DELETE FROM _prisma_migrations WHERE migration_name = '20260128213503_add_products_vector';");
        console.log('✅ Migration entry removed from DB');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

cleanMigration();

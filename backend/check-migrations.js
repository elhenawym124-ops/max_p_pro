const { Client } = require('pg');

async function checkMigrations() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'max',
        password: '0165676135',
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT migration_name FROM _prisma_migrations;');
        console.log(res.rows.map(r => r.migration_name).join(', '));
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

checkMigrations();

const { Client } = require('pg');

async function listExtensions() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'max',
        password: '0165676135',
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT name FROM pg_available_extensions ORDER BY name;');
        console.log(res.rows.map(r => r.name).join(', '));
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

listExtensions();

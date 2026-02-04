const { Client } = require('pg');

async function checkVersion() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'max',
        password: '0165676135',
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT version();');
        console.log(res.rows[0].version);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

checkVersion();

const { Client } = require('pg');

async function enableVector() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'max',
        password: '0165676135',
        port: 5432,
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('✅ Extension pgvector enabled/verified');
    } catch (err) {
        console.error('❌ Failed to enable pgvector:', err.message);
    } finally {
        await client.end();
    }
}

enableVector();

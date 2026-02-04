require('dotenv').config();
const postgresVectorService = require('./services/postgresVectorService');

async function checkStats() {
    try {
        const stats = await postgresVectorService.getStats();
        console.log('📊 PostgreSQL Stats:', stats);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await postgresVectorService.close();
    }
}

checkStats();

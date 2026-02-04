require('dotenv').config();
const postgresVectorService = require('./services/postgresVectorService');

async function checkFinalStats() {
    try {
        const stats = await postgresVectorService.getStats();
        console.log('📊 FINAL PostgreSQL Stats:', stats);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await postgresVectorService.close();
        process.exit(0);
    }
}

checkFinalStats();

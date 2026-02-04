const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProduction() {
    console.log('🔍 Starting Production Check...');

    // 1. Check server.js for route definitions
    const serverPath = path.join(__dirname, 'server.js');
    if (fs.existsSync(serverPath)) {
        const serverContent = fs.readFileSync(serverPath, 'utf8');

        console.log('📄 [CODE] Checking server.js routes...');

        if (serverContent.includes('analytics/track/product-view')) {
            console.log('✅ [CODE] Route "/api/v1/analytics/track/product-view" FOUND in server.js');
        } else {
            console.error('❌ [CODE] Route "/api/v1/analytics/track/product-view" NOT FOUND in server.js');
        }

        if (serverContent.includes('analytics/track/conversion')) {
            console.log('✅ [CODE] Route "/api/v1/analytics/track/conversion" FOUND in server.js');
        }
    } else {
        console.error('❌ [CODE] server.js is MISSING!');
    }

    // 2. Check Database Schema (DB Sync)
    try {
        const count = await prisma.storeVisit.count();
        console.log(`✅ [DB] StoreVisit table exists. Count: ${count}`);
        console.log('🎉 Database schema appears correct.');
    } catch (error) {
        console.error('❌ [DB] Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkProduction();

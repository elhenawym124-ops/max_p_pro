// Enhanced Server Startup with Detailed Error Logging
require('dotenv').config();
const { initializeSharedDatabase } = require('../services/sharedDatabase');

async function testDatabaseInit() {
    console.log('🔍 Starting detailed database initialization test...\n');

    try {
        console.log('Step 1: Calling initializeSharedDatabase()...');
        await initializeSharedDatabase();
        console.log('✅ Step 1: SUCCESS - Database initialized');

        console.log('\nStep 2: Getting Prisma client...');
        const { getSharedPrismaClient } = require('../services/sharedDatabase');
        const prisma = getSharedPrismaClient();
        console.log('✅ Step 2: SUCCESS - Got Prisma client');

        console.log('\nStep 3: Testing simple query...');
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Step 3: SUCCESS - Query result:', result);

        console.log('\nStep 4: Testing Company.findFirst()...');
        const company = await prisma.company.findFirst();
        console.log('✅ Step 4: SUCCESS - Company:', company ? `Found: ${company.id}` : 'No companies found');

        console.log('\n✅ ALL TESTS PASSED! Database is fully functional.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code);
        console.error('\nFull Error Stack:');
        console.error(error.stack);
        console.error('\nFull Error Object:');
        console.error(JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

testDatabaseInit();

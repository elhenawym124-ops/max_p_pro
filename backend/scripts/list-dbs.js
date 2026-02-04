
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function listDatabases() {
    const prisma = new PrismaClient();
    try {
        console.log('🔍 Connecting to remote server to list databases...');

        // Raw query to show databases
        const databases = await prisma.$queryRawUnsafe('SHOW DATABASES;');

        console.log('\n📂 Available Databases on 92.113.22.70:');
        console.log('----------------------------------------');
        databases.forEach(db => {
            console.log(` - ${db.Database}`);
        });
        console.log('----------------------------------------');

        console.log(`\nYour current .env uses: ${process.env.DATABASE_URL.split('/').pop().split('?')[0]}`);

    } catch (error) {
        console.error('❌ Error listing databases:', error.message);
        console.log('💡 Access blocked? You might not have permission to show all databases.');
    } finally {
        await prisma.$disconnect();
    }
}

listDatabases();

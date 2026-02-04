const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const result = dotenv.config();

if (result.error) {
    console.error('❌ Failed to load .env file:', result.error);
    process.exit(1);
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function main() {
    console.log('🔍 Starting Database Diagnostics...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'null');

    try {
        console.log('🔄 Attempting to connect to database...');
        await prisma.$connect();
        console.log('✅ Connected to database successfully!');

        console.log('🔄 Running test query (SELECT 1)...');
        const res = await prisma.$queryRaw`SELECT 1 as result`;
        console.log('✅ Test query succeeded:', res);

        console.log('🔄 Checking User table...');
        const userCount = await prisma.user.count();
        console.log('✅ User count:', userCount);

        if (userCount > 0) {
            const user = await prisma.user.findFirst();
            console.log('✅ Sample user found:', user.email);
        }

    } catch (error) {
        console.error('❌ Database Diagnosis Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.stack) {
            console.error('Error Stack:', error.stack.substring(0, 500));
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();

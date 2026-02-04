const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAssets() {
    try {
        const assets = await prisma.asset.findMany();
        console.log('Total Assets:', assets.length);
        if (assets.length > 0) {
            console.log('Sample Asset:', assets[0]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkAssets();

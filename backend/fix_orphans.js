const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for orphan attendance records...');
    // Find attendance records where userId does not exist in User table
    // Since we can't easily do "where not exists" with simplified prisma api if relation is broken, 
    // we might need raw query or fetch all IDs.

    // Let's try raw query for safety and speed
    try {
        const deleted = await prisma.$executeRaw`
      DELETE FROM hr_attendance 
      WHERE userId NOT IN (SELECT id FROM users)
    `;
        console.log(`Deleted ${deleted} orphan attendance records.`);
    } catch (e) {
        console.error('Error deleting orphans:', e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

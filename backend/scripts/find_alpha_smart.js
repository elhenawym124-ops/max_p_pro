
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function findAlpha() {
    console.log('🔍 Smart Search for Alpha...');
    const prisma = getSharedPrismaClient();

    // Fetch ALL emails
    const all = await prisma.company.findMany({
        select: { id: true, email: true, name: true }
    });

    console.log(`Checking ${all.length} companies...`);

    const matches = all.filter(c => c.email.toLowerCase().includes('alpha'));

    if (matches.length > 0) {
        console.log('✅ Found matches:');
        matches.forEach(c => {
            console.log(`ID: ${c.id}`);
            console.log(`Email: "${c.email}"`); // Quotes to see whitespace
            console.log(`Name: ${c.name}`);
        });

        // If exact match (ignoring case), delete it?
        // No, just report for now.
    } else {
        console.log('❌ No company email contains "alpha"');
        console.log('First 10 emails in DB:');
        all.slice(0, 10).forEach(c => console.log(`- "${c.email}"`));
    }

    setTimeout(() => process.exit(0), 2000);
}

findAlpha();


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Available models/keys on prisma instance:');
    const keys = Object.keys(prisma);
    // Filter for potential model names (usually start with lowercase letter and not $)
    const models = keys.filter(k => !k.startsWith('$') && !k.startsWith('_'));
    console.log(models);

    // Check specifically for employee variations
    console.log('Has employee?', 'employee' in prisma);
    console.log('Has Employee?', 'Employee' in prisma);
    console.log('Has hr_employees?', 'hr_employees' in prisma);
    console.log('Has hrEmployee?', 'hrEmployee' in prisma);

    await prisma.$disconnect();
}

main().catch(console.error);

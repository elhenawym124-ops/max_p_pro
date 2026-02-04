
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findInfo() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'mokhtar@mokhtar.com' }
        });
        console.log('User:', user ? `${user.firstName} ${user.lastName} (${user.id})` : 'Not Found');

        const companies = await prisma.company.findMany({
            where: {
                name: {
                    contains: 'تسويق'
                }
            }
        });

        console.log('Marketing Companies found:');
        companies.forEach(c => console.log(`- ${c.name} (${c.id})`));

        const companies2 = await prisma.company.findMany({
            where: {
                name: {
                    contains: 'Marketing'
                }
            }
        });
        console.log('Marketing Companies (English) found:');
        companies2.forEach(c => console.log(`- ${c.name} (${c.id})`));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findInfo();

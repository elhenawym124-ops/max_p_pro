const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const companyId = 'cmgj92byv003djutl34dkh6ab';
        const users = await prisma.user.findMany({
            where: { companyId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                companyId: true,
                employeeNumber: true,
                departmentId: true,
                positionId: true,
                isActive: true,
                role: true
            }
        });

        console.log('--- Users in Mimi Store ---');
        console.log(JSON.stringify(users, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

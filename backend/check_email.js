const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmail() {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                email: {
                    contains: 'shroukmagdi74'
                }
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                companyId: true,
                status: true
            }
        });

        console.log('Found employees:', JSON.stringify(employees, null, 2));

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkEmail();

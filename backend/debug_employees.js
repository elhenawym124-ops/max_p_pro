const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97';
    console.log('Checking employees for company:', companyId);

    // Check all users in this company
    const users = await prisma.user.findMany({
        where: { companyId },
        include: { employee: true }
    });

    console.log('Users found:', users.map(u => ({
        id: u.id,
        email: u.email,
        hasEmployee: !!u.employee,
        employeeId: u.employee?.id
    })));

    // Check all employees in this company
    const employees = await prisma.employee.findMany({
        where: { companyId }
    });

    console.log('Employees found:', employees.map(e => ({
        id: e.id,
        userId: e.userId,
        employeeNumber: e.employeeNumber,
        firstName: e.firstName
    })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

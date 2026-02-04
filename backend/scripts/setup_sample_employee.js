const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const companyId = 'cmgj92byv003djutl34dkh6ab';

        // 1. Get or create a department
        let department = await prisma.department.findFirst({ where: { companyId } });
        if (!department) {
            department = await prisma.department.create({
                data: {
                    name: 'المبيعات',
                    companyId
                }
            });
            console.log(`Created department: ${department.name}`);
        }

        // 2. Get or create a position
        let position = await prisma.position.findFirst({ where: { companyId } });
        if (!position) {
            position = await prisma.position.create({
                data: {
                    title: 'مدير مبيعات',
                    companyId,
                    departmentId: department.id
                }
            });
            console.log(`Created position: ${position.title}`);
        }

        // 3. Find users in this company
        const users = await prisma.user.findMany({ where: { companyId } });

        if (users.length === 0) {
            console.log('No users found in company');
            return;
        }

        // 4. Update the first user to be an active employee
        const targetUser = users[0];
        const updatedUser = await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                employeeNumber: 'EMP001',
                departmentId: department.id,
                positionId: position.id,
                baseSalary: 10000,
                isActive: true
            }
        });

        console.log(`Updated user ${updatedUser.firstName} ${updatedUser.lastName} with employee data.`);
        console.log(`Employee Number: ${updatedUser.employeeNumber}`);
        console.log(`Salary: ${updatedUser.baseSalary}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

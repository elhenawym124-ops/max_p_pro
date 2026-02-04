const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Find Mokhtar (COMPANY_ADMIN)
        const mokhtar = await prisma.user.findFirst({
            where: {
                OR: [
                    { firstName: { contains: 'Mokhtar' } },
                    { email: { contains: 'mokhtar' } }
                ]
            },
            include: { company: true }
        });

        if (!mokhtar) {
            console.log('Mokhtar not found');
            return;
        }

        console.log('--- Current User (Mokhtar) ---');
        console.log(`ID: ${mokhtar.id}`);
        console.log(`Email: ${mokhtar.email}`);
        console.log(`Company: ${mokhtar.company?.name} (${mokhtar.companyId})`);

        const companyId = mokhtar.companyId;

        // 2. Count active employees in this company
        const activeEmployeesCount = await prisma.user.count({
            where: {
                companyId,
                isActive: true,
                OR: [
                    { employeeNumber: { not: null } },
                    { departmentId: { not: null } },
                    { positionId: { not: null } }
                ]
            }
        });

        console.log('\n--- Employee Stats ---');
        console.log(`Active Employees matching payroll criteria: ${activeEmployeesCount}`);

        // 3. Check employees with baseSalary missing
        const employeesMissingSalary = await prisma.user.count({
            where: {
                companyId,
                isActive: true,
                baseSalary: null
            }
        });
        console.log(`Active Employees with NULL baseSalary: ${employeesMissingSalary}`);

        // 4. Check existing payrolls for Jan 2026
        const payrollCount = await prisma.payroll.count({
            where: {
                companyId,
                month: 1,
                year: 2026
            }
        });
        console.log(`\n--- Payroll Records for Jan 2026 ---`);
        console.log(`Existing Records: ${payrollCount}`);

        // 5. If 0, check if there are any payrolls at all
        const anyPayrollCount = await prisma.payroll.count({
            where: { companyId }
        });
        console.log(`Total Payroll Records (all time): ${anyPayrollCount}`);

        // 6. Check attendance for Jan 2026
        const attendanceCount = await prisma.attendance.count({
            where: {
                companyId,
                date: {
                    gte: new Date(2026, 0, 1),
                    lte: new Date(2026, 0, 31, 23, 59, 59)
                }
            }
        });
        console.log(`\n--- Attendance Records for Jan 2026 ---`);
        console.log(`Records found: ${attendanceCount}`);

    } catch (error) {
        console.error('Error during inspection:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

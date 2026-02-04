const { getSharedPrismaClient } = require('../services/sharedDatabase');
const payrollService = require('../services/hr/payrollService');
const prisma = getSharedPrismaClient();

async function verify() {
    try {
        console.log('🚀 Starting Advanced Penalty Verification...');

        // 1. Setup Company & Employee
        const employee = await prisma.employee.findFirst({
            include: { company: true }
        });
        if (!employee) throw new Error('No employee found');
        const company = employee.company;

        console.log(`Using Company: ${company.name}`);
        console.log(`Using Employee: ${employee.firstName} (Base Salary: ${employee.baseSalary})`);

        // 2. Setup Settings
        await prisma.hRSettings.upsert({
            where: { companyId: company.id },
            update: {
                workStartTime: '09:00',
                lateGracePeriod: 15,
                monthlyLateLimit: 2,
                lateWarningLevels: JSON.stringify([
                    { count: 1, deductionFactor: 0.25 },
                    { count: 2, deductionFactor: 0.5 },
                    { count: 3, deductionFactor: 1.0 }
                ])
            },
            create: {
                companyId: company.id,
                workStartTime: '09:00',
                monthlyLateLimit: 2
            }
        });

        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        // 3. Clear existing data for this month
        await prisma.attendance.deleteMany({
            where: {
                employeeId: employee.id,
                date: {
                    gte: new Date(year, month - 1, 1),
                    lte: new Date(year, month, 0)
                }
            }
        });

        await prisma.payroll.deleteMany({
            where: { employeeId: employee.id, month, year }
        });

        // 4. Create 5 Late Attendances
        console.log('Creating 5 Late Attendance Records...');
        for (let i = 1; i <= 5; i++) {
            const date = new Date(year, month - 1, i, 12, 0, 0); // Midday to avoid TZ shifts
            await prisma.attendance.create({
                data: {
                    companyId: company.id,
                    employeeId: employee.id,
                    date: date,
                    checkIn: new Date(new Date(date).setHours(10, 0)), // 1 hour late
                    lateMinutes: 60,
                    status: 'LATE'
                }
            });
        }
        console.log('Successfully created 5 records.');

        // 5. Generate Payroll
        const payroll = await payrollService.createPayroll(company.id, employee.id, {
            month, year,
            allowances: {},
            deductions: {},
            bonuses: 0
        });

        console.log('✅ Payroll Generated!');
        console.log(`Monthly Late Limit: 2`);
        console.log(`Late Occurrences: 5`);
        console.log(`Daily Rate: ${(parseFloat(employee.baseSalary) / payroll.workingDays).toFixed(2)}`);
        console.log(`Late Penalty Amount: ${payroll.latePenalty}`);
        console.log(`Late Details: ${JSON.parse(payroll.deductions).lateDetails}`);

        // Expected Deduction: (0.25 + 0.5 + 1.0) * dailyRate
        const dailyRate = parseFloat(employee.baseSalary) / payroll.workingDays;
        const expectedPenalty = (0.25 + 0.5 + 1.0) * dailyRate;

        console.log(`Expected Penalty: ${expectedPenalty.toFixed(2)}`);

        if (Math.abs(payroll.latePenalty - expectedPenalty) < 0.1) {
            console.log('✅ Advanced Penalty Logic Verified Successfully!');
        } else {
            console.error('❌ Advanced Penalty Logic Verification FAILED!');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();

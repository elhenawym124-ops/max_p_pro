const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const payrollService = require('../services/hr/payrollService');

async function verify() {
    try {
        console.log('🚀 Starting Verification...');

        // 1. Setup Company & Employee
        const employee = await prisma.employee.findFirst({
            include: { company: true }
        });
        if (!employee) throw new Error('No employee found');
        const company = employee.company;

        console.log(`Using Company: ${company.name} (${company.id})`);
        console.log(`Using Employee: ${employee.firstName} (Base: ${employee.baseSalary})`);

        // 2. Setup Settings
        await prisma.hRSettings.upsert({
            where: { companyId: company.id },
            update: {
                workStartTime: '09:00',
                lateGracePeriod: 15,
                overtimeRate: 1.5
            },
            create: {
                companyId: company.id,
                workStartTime: '09:00'
            }
        });

        // 3. Create Attendance (75 mins late -> 1 hour penalty)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        today.setDate(15); // Mid-month

        // Clear all attendance for this employee for the whole month to start fresh
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        await prisma.attendance.deleteMany({
            where: {
                employeeId: employee.id,
                date: {
                    gte: monthStart,
                    lte: monthEnd
                }
            }
        });

        console.log('Creating Test Attendance Record...');

        await prisma.attendance.create({
            data: {
                companyId: company.id,
                employeeId: employee.id,
                date: today,
                checkIn: new Date(new Date(today).setHours(10, 15)), // 75 mins late from 9:00
                lateMinutes: 75,
                status: 'LATE'
            }
        });

        // 4. Generate Payroll
        // Clear existing payroll
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        await prisma.payroll.deleteMany({
            where: { employeeId: employee.id, month, year }
        });

        const payroll = await payrollService.createPayroll(company.id, employee.id, {
            month, year,
            allowances: {},
            deductions: {},
            bonuses: 0
        });

        console.log('✅ Payroll Generated!');
        console.log(`Late Penalty: ${payroll.latePenalty}`);
        console.log(`Absent Days: ${payroll.absentDays}`);
        console.log(`Attendance Deduction: ${payroll.attendanceDeduction}`);
        console.log(`Net Salary: ${payroll.netSalary}`);

        if (payroll.latePenalty > 0) {
            console.log('✅ Penalty applied correctly.');
        } else {
            console.error('❌ Penalty NOT applied (Expected > 0)');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();

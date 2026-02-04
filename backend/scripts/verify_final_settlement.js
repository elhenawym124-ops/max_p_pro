const { getSharedPrismaClient } = require('../services/sharedDatabase');
const resignationService = require('../services/hr/resignationService');
const prisma = getSharedPrismaClient();

async function verify() {
    try {
        console.log('🚀 Starting Final Settlement Verification...');

        // 1. Setup Employee
        const employee = await prisma.employee.findFirst({
            include: { company: true }
        });
        if (!employee) throw new Error('No employee found');
        const companyId = employee.companyId;

        console.log(`Using Employee: ${employee.firstName} (Base Salary: ${employee.baseSalary}, Leaves: ${employee.annualLeaveBalance})`);

        // 2. Clear old resignations for this employee
        await prisma.resignation.deleteMany({
            where: { employeeId: employee.id }
        });

        // 3. Create a resignation
        const today = new Date();
        // Use midday to avoid timezone shifts
        const resignationDate = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);
        const lastWorkingDay = new Date(today.getFullYear(), today.getMonth(), 15, 12, 0, 0);

        const resignation = await resignationService.createResignation(companyId, employee.id, {
            resignationDate: resignationDate.toISOString(),
            lastWorkingDay: lastWorkingDay.toISOString(),
            reason: 'Testing Settlement',
            status: 'PENDING'
        });

        console.log(`Resignation created. Last Working Day: ${resignation.lastWorkingDay.toISOString()}`);

        // 4. Create an active advance
        await prisma.advanceRequest.deleteMany({
            where: { employeeId: employee.id, isPaidOff: false }
        });

        await prisma.advanceRequest.create({
            data: {
                companyId: companyId,
                employeeId: employee.id,
                amount: 1000,
                remainingBalance: 400,
                repaymentType: 'INSTALLMENTS',
                monthlyAmount: 200,
                status: 'APPROVED',
                isPaidOff: false,
                reason: 'Test Advance'
            }
        });

        console.log('Advance of 400 remaining created.');

        // 5. Calculate Settlement
        const settlement = await resignationService.calculateFinalSettlement(companyId, resignation.id);

        console.log('----------------Settlement Result----------------');
        console.log(`Remaining Salary (15 days): ${settlement.remainingSalary}`);
        console.log(`Leave Compensation (${employee.annualLeaveBalance} days): ${settlement.leaveCompensation}`);
        console.log(`Advance Debt Recovery: ${settlement.advanceDebt}`);
        console.log(`Final Settlement Total: ${settlement.finalSettlementAmount}`);
        console.log('--------------------------------------------------');

        // Expected Salary: (BaseSalary / 30) * 15
        const daily = parseFloat(employee.baseSalary) / 30;
        const expectedSalary = daily * 15;
        const expectedLeaves = employee.annualLeaveBalance * daily;
        const expectedTotal = expectedSalary + expectedLeaves - 400;

        console.log(`Expected Total: ${expectedTotal.toFixed(2)}`);

        if (Math.abs(settlement.finalSettlementAmount - expectedTotal) < 1) {
            console.log('✅ Final Settlement Logic Verified!');
        } else {
            console.error('❌ Final Settlement Logic Verification FAILED!');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();

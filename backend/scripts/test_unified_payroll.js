const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const payrollService = require('../services/hr/payrollService');

async function test() {
    const email = 'mokhta100r@mokhtar.com';
    console.log(`🚀 Starting Unified Payroll Test for: ${email}`);

    try {
        // 1. Get User and Company
        const user = await prisma.user.findUnique({
            where: { email },
            include: { company: true }
        });

        if (!user) throw new Error(`User ${email} not found`);
        const companyId = user.companyId;

        console.log(`✅ User: ${user.firstName} (Base Salary: ${user.baseSalary})`);

        // 2. Configure Smart Rules for testing
        // Let's set Absence Rate = 1.0, Delay Tiers, and Daily Cap = 1.0 day
        console.log('⚙️ Configuring Test HR Rules...');
        await prisma.hRSettings.update({
            where: { companyId },
            data: {
                absencePenaltyRate: "1.0",
                maxDailyDeductionDays: "1.0",
                delayPenaltyTiers: JSON.stringify([
                    { minMinutes: 15, deductionDays: 0.25 },
                    { minMinutes: 30, deductionDays: 0.5 },
                    { minMinutes: 60, deductionDays: 1.0 }
                ])
            }
        });

        // 3. Clear existing test data for current month (Jan 2026 for mock)
        const month = 1;
        const year = 2026;
        const testDate_Late = new Date(2026, 0, 15); // Jan 15
        const testDate_Absent = new Date(2026, 0, 16); // Jan 16

        await prisma.attendance.deleteMany({ where: { userId: user.id, date: { in: [testDate_Late, testDate_Absent] } } });
        await prisma.manualDeduction.deleteMany({ where: { employeeId: user.id, effectiveMonth: month, effectiveYear: year, reason: 'Test Violation' } });
        await prisma.payroll.deleteMany({ where: { userId: user.id, month, year } });

        // 4. MOCK SCENARIO:
        // Day 1 (15th): Late arrival (20 mins -> 0.25 day) + Manual Violation (0.8 day) 
        // Total before cap: 1.05 days. Should be capped at 1.0 day.

        console.log('📝 Creating Scenario: Day 1 (Late + Manual Penalty)...');
        // Manual Deduction for 15th
        const baseSalary = parseFloat(user.baseSalary) || 10000; // Fallback for testing
        const dailyRate = baseSalary / 26; // Approx
        const manualAmount = dailyRate * 0.8;

        await prisma.manualDeduction.create({
            data: {
                company: { connect: { id: companyId } },
                employeeId: user.id,
                type: 'VIOLATION',
                amount: manualAmount.toFixed(2).replace(/[^\d.]/g, ''),
                reason: 'Test Violation',
                date: testDate_Late,
                effectiveMonth: month,
                effectiveYear: year,
                status: 'APPROVED',
                createdBy: user.id
            }
        });

        // Late Attendance for 15th
        await prisma.attendance.create({
            data: {
                company: { connect: { id: companyId } },
                user: { connect: { id: user.id } },
                date: testDate_Late,
                status: 'LATE',
                lateMinutes: 20 // Should trigger 0.25 tier
            }
        });

        // Day 2 (16th): Simple Absence (Should incur 1.0 day penalty)
        // No attendance record = Absent logic will catch it

        // 5. GENERATE PAYROLL
        console.log('💰 Generating Test Payroll...');
        const payroll = await payrollService.createPayroll(companyId, user.id, {
            month,
            year,
            allowances: {},
            deductions: {},
            bonuses: 0
        });

        console.log('\n📊 TEST RESULTS:');
        console.log(`Base Salary: ${payroll.baseSalary}`);
        console.log(`Total Deductions: ${payroll.totalDeductions}`);
        console.log(`Net Salary: ${payroll.netSalary}`);

        console.log('\n🔍 Logic Check:');
        const deductionsData = JSON.parse(payroll.deductions);
        console.log(`- Absence Penalty (should be ~1 day): ${deductionsData.attendance || 'N/A'}`);
        console.log(`- Manual Penalty (should include capped amount): ${deductionsData.manual || 'N/A'}`);
        console.log(`- Details: ${deductionsData.details || 'None'}`);

        if (deductionsData.capNotes) {
            console.log(`- 🛡️ CAP TRIGGERED: ${deductionsData.capNotes}`);
            console.log('✅ PASS: Daily limit was successfully applied to prevent excessive deduction.');
        } else {
            console.log('⚠️ Cap not triggered in reports (Check logic if totals are correct)');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();

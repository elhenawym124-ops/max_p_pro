const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkPayrolls() {
  try {
    const prisma = getSharedPrismaClient();
    
    // Get payrolls for February 2026
    const payrolls = await prisma.payroll.findMany({
      where: {
        month: 2,
        year: 2026
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get user data separately
    const userIds = [...new Set(payrolls.map(p => p.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        baseSalary: true
      }
    });
    const usersMap = new Map(users.map(u => [u.id, u]));
    
    console.log(`\n📊 Found ${payrolls.length} payroll(s) for February 2026:\n`);
    
    payrolls.forEach((p, index) => {
      const user = usersMap.get(p.userId);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Payroll #${index + 1}:`);
      console.log(`👤 Employee: ${user?.firstName} ${user?.lastName}`);
      console.log(`📅 Created: ${p.createdAt}`);
      console.log(`📊 Working Days: ${p.workingDays}`);
      console.log(`📊 Actual Work Days: ${p.actualWorkDays}`);
      console.log(`💰 Base Salary (Full): ${user?.baseSalary} ج.م`);
      console.log(`💰 Base Salary (in payroll): ${p.baseSalary} ج.م`);
      console.log(`💰 Allowances: ${p.totalAllowances} ج.م`);
      console.log(`💰 Gross: ${p.grossSalary} ج.م`);
      console.log(`💰 Deductions: ${p.totalDeductions} ج.م`);
      console.log(`💰 Net Salary: ${p.netSalary} ج.م`);
      console.log(`📌 Status: ${p.status}`);
      
      // Check if it's calculated correctly
      const today = new Date();
      if (today.getDate() === 1 && today.getMonth() === 1) { // Feb 1
        const expectedRatio = 1 / p.workingDays;
        const expectedBaseSalary = parseFloat(user?.baseSalary || 0) * expectedRatio;
        console.log(`\n🔍 Verification (for day 1):`);
        console.log(`   Expected ratio: ${(expectedRatio * 100).toFixed(2)}%`);
        console.log(`   Expected base salary: ${expectedBaseSalary.toFixed(2)} ج.م`);
        console.log(`   Actual base salary: ${p.baseSalary} ج.م`);
        console.log(`   ${Math.abs(expectedBaseSalary - parseFloat(p.baseSalary)) < 1 ? '✅ CORRECT' : '❌ WRONG - Full month salary!'}`);
      }
    });
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPayrolls();

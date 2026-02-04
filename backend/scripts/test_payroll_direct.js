const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testPayrollDirect() {
  try {
    const prisma = getSharedPrismaClient();
    
    // Find a user with salary
    const user = await prisma.user.findFirst({
      where: {
        baseSalary: { not: null },
        isActive: true
      }
    });
    
    if (!user) {
      console.log('❌ No user with salary found');
      return;
    }
    
    console.log('✅ Found user:', {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      baseSalary: user.baseSalary,
      companyId: user.companyId
    });
    
    // Import payroll service
    const payrollService = require('../services/hr/payrollService');
    
    console.log('\n📊 Calling getPayrollProjection...\n');
    
    const projection = await payrollService.getPayrollProjection(user.companyId, user.id);
    
    console.log('✅ Projection Result:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Month/Year: ${projection.month}/${projection.year}`);
    console.log(`📊 Working Days (Total): ${projection.workingDays}`);
    console.log(`📊 Days Passed: ${projection.daysPassedWorking}`);
    console.log(`📊 Earned Ratio: ${(projection.earnedRatio * 100).toFixed(2)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💰 Base Salary (Full): ${user.baseSalary} ج.م`);
    console.log(`💰 Base Salary (Earned): ${projection.baseSalary.toFixed(2)} ج.م`);
    console.log(`💰 Allowances (Earned): ${projection.totalAllowances.toFixed(2)} ج.م`);
    console.log(`💰 Gross Salary: ${projection.grossSalary.toFixed(2)} ج.م`);
    console.log(`💰 Deductions: ${projection.totalDeductions.toFixed(2)} ج.م`);
    console.log(`💰 Social Insurance: ${projection.socialInsurance.toFixed(2)} ج.م`);
    console.log(`💰 Tax: ${projection.taxAmount.toFixed(2)} ج.م`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ NET SALARY: ${projection.netSalary.toFixed(2)} ج.م`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Verification
    const expectedRatio = projection.daysPassedWorking / projection.workingDays;
    const expectedBaseSalary = parseFloat(user.baseSalary) * expectedRatio;
    
    console.log('\n🔍 Verification:');
    console.log(`Expected Ratio: ${expectedRatio.toFixed(4)}`);
    console.log(`Actual Ratio: ${projection.earnedRatio.toFixed(4)}`);
    console.log(`Expected Base Salary: ${expectedBaseSalary.toFixed(2)} ج.م`);
    console.log(`Actual Base Salary: ${projection.baseSalary.toFixed(2)} ج.م`);
    console.log(`Match: ${Math.abs(expectedBaseSalary - projection.baseSalary) < 0.01 ? '✅ CORRECT' : '❌ WRONG'}`);
    
    // Check if it's calculating for 1 day only
    const today = new Date();
    if (today.getDate() === 1) {
      console.log('\n⚠️ Today is the 1st of the month');
      console.log(`Days passed should be 1, actual: ${projection.daysPassedWorking}`);
      console.log(`Ratio should be ~5%, actual: ${(projection.earnedRatio * 100).toFixed(2)}%`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testPayrollDirect();

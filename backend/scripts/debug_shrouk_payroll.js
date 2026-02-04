const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();

  const user = await prisma.user.findFirst({
    where: { email: 'shrouk00@gmail.com' }
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  const payroll = await prisma.payroll.findFirst({
    where: {
      userId: user.id,
      month: 2,
      year: 2026
    }
  });

  if (!payroll) {
    console.log('❌ Payroll not found');
    return;
  }

  console.log('📊 Shrouk Payroll Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`💰 Base Salary: ${payroll.baseSalary} ج.م`);
  console.log(`💰 Allowances: ${payroll.totalAllowances} ج.م`);
  console.log(`💰 Overtime: ${payroll.overtimeAmount} ج.م`);
  console.log(`💰 Bonuses: ${payroll.bonuses} ج.م`);
  console.log(`💰 Gross Salary: ${payroll.grossSalary} ج.م`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`❌ Deductions: ${payroll.totalDeductions} ج.م`);
  console.log(`❌ Social Insurance: ${payroll.socialInsurance} ج.م`);
  console.log(`❌ Tax: ${payroll.taxAmount} ج.م`);
  console.log(`❌ Attendance Deduction: ${payroll.attendanceDeduction} ج.م`);
  console.log(`❌ Late Penalty: ${payroll.latePenalty} ج.م`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ NET SALARY: ${payroll.netSalary} ج.م`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Check deductions details
  if (payroll.deductions) {
    console.log('\n📋 Deductions breakdown:');
    const deductions = typeof payroll.deductions === 'string' 
      ? JSON.parse(payroll.deductions) 
      : payroll.deductions;
    console.log(JSON.stringify(deductions, null, 2));
  }
}

main().catch(e => console.error('❌ Error:', e.message));

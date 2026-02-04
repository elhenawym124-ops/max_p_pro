const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function deleteAndRegenerate() {
  try {
    const prisma = getSharedPrismaClient();
    
    console.log('🗑️ Deleting old payrolls for February 2026...');
    
    const deleted = await prisma.payroll.deleteMany({
      where: {
        month: 2,
        year: 2026
      }
    });
    
    console.log(`✅ Deleted ${deleted.count} payroll(s)`);
    
    console.log('\n📊 Regenerating payrolls...');
    
    const payrollService = require('../services/hr/payrollService');
    
    // Get all active employees
    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
        baseSalary: { not: null }
      }
    });
    
    console.log(`Found ${employees.length} employees with salary`);
    
    for (const emp of employees) {
      try {
        console.log(`\n👤 Creating payroll for: ${emp.firstName} ${emp.lastName}`);
        
        const payroll = await payrollService.createPayroll(
          emp.companyId,
          emp.id,
          { month: 2, year: 2026 }
        );
        
        console.log(`✅ Created payroll - Net Salary: ${payroll.netSalary.toFixed(2)} ج.م`);
      } catch (error) {
        console.error(`❌ Failed for ${emp.firstName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Done! Check the payrolls now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteAndRegenerate();

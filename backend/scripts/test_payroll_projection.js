const axios = require('axios');

async function testPayrollProjection() {
  try {
    // First, let's generate a token for testing
    const { PrismaClient } = require('../prisma/generated/mysql');
    const prisma = new PrismaClient();
    const jwt = require('jsonwebtoken');
    
    // Find Shrouk's user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'shrouk' } },
          { firstName: { contains: 'Shrouk' } },
          { firstName: { contains: 'شروق' } }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ Found user:', {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      companyId: user.companyId,
      baseSalary: user.baseSalary
    });
    
    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        companyId: user.companyId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('\n📡 Testing /api/v1/hr/payroll/my-projection...\n');
    
    // Test the projection endpoint
    const response = await axios.get('https://maxp-ai.pro/api/v1/hr/payroll/my-projection', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      const proj = response.data.projection;
      console.log('✅ Projection received:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📅 Month/Year: ${proj.month}/${proj.year}`);
      console.log(`📊 Working Days (Total): ${proj.workingDays}`);
      console.log(`📊 Days Passed: ${proj.daysPassedWorking}`);
      console.log(`📊 Earned Ratio: ${(proj.earnedRatio * 100).toFixed(2)}%`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`💰 Base Salary (Full Month): ${user.baseSalary} ج.م`);
      console.log(`💰 Base Salary (Earned): ${proj.baseSalary.toFixed(2)} ج.م`);
      console.log(`💰 Allowances (Earned): ${proj.totalAllowances.toFixed(2)} ج.م`);
      console.log(`💰 Gross Salary: ${proj.grossSalary.toFixed(2)} ج.م`);
      console.log(`💰 Deductions: ${proj.totalDeductions.toFixed(2)} ج.م`);
      console.log(`💰 Social Insurance: ${proj.socialInsurance.toFixed(2)} ج.م`);
      console.log(`💰 Tax: ${proj.taxAmount.toFixed(2)} ج.م`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ NET SALARY: ${proj.netSalary.toFixed(2)} ج.م`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Check if it's correct
      const expectedRatio = proj.daysPassedWorking / proj.workingDays;
      const expectedBaseSalary = user.baseSalary * expectedRatio;
      
      console.log('\n🔍 Verification:');
      console.log(`Expected Base Salary: ${expectedBaseSalary.toFixed(2)} ج.م`);
      console.log(`Actual Base Salary: ${proj.baseSalary.toFixed(2)} ج.م`);
      console.log(`Match: ${Math.abs(expectedBaseSalary - proj.baseSalary) < 0.01 ? '✅' : '❌'}`);
    } else {
      console.log('❌ Failed:', response.data);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPayrollProjection();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeductions() {
  try {
    const companyId = 'cmkvo8czx0000vbe859dddrd1'; // f22
    
    console.log('🔍 Finding user shrouk0@gmail.com...');
    
    const user = await prisma.user.findFirst({
      where: { 
        email: 'shrouk0@gmail.com',
        companyId
      },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true
      }
    });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email, `(ID: ${user.id})`);
    
    // البحث عن الخصومات
    console.log('\n🔍 Searching for deductions...');
    
    const deductions = await prisma.manualDeduction.findMany({
      where: {
        companyId,
        employeeId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n📊 Found ${deductions.length} deductions:`);
    
    if (deductions.length === 0) {
      console.log('⚠️ No deductions found for this employee');
      console.log('\n💡 This is why "My Deductions" page is empty!');
    } else {
      deductions.forEach((d, i) => {
        console.log(`\n${i + 1}. Deduction:`);
        console.log(`   - ID: ${d.id}`);
        console.log(`   - Amount: ${d.amount} EGP`);
        console.log(`   - Type: ${d.type}`);
        console.log(`   - Reason: ${d.reason}`);
        console.log(`   - Status: ${d.status}`);
        console.log(`   - Date: ${d.date}`);
        console.log(`   - Created: ${d.createdAt}`);
      });
    }
    
    // فحص الخصومات التلقائية من الراتب
    console.log('\n🔍 Checking payroll deductions...');
    
    const payrolls = await prisma.payroll.findMany({
      where: {
        companyId,
        employeeId: user.id
      },
      select: {
        id: true,
        month: true,
        year: true,
        deductions: true,
        totalDeductions: true,
        attendanceDeduction: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`\n📊 Found ${payrolls.length} payroll records:`);
    payrolls.forEach((p, i) => {
      console.log(`\n${i + 1}. Payroll ${p.month}/${p.year}:`);
      console.log(`   - Total Deductions: ${p.totalDeductions}`);
      console.log(`   - Attendance Deduction: ${p.attendanceDeduction}`);
      console.log(`   - Deductions Details:`, p.deductions);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeductions();

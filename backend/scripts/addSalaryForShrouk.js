const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBaseSalary() {
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
        lastName: true,
        baseSalary: true
      }
    });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('📊 Current base salary:', user.baseSalary);
    
    // تحديث الراتب الأساسي إلى 10000 جنيه
    const newBaseSalary = 10000;
    
    console.log(`💰 Updating base salary to ${newBaseSalary}...`);
    
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { 
        baseSalary: newBaseSalary,
        hireDate: new Date('2026-01-01'), // تاريخ التعيين
        contractType: 'FULL_TIME' // نوع العقد
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        baseSalary: true,
        hireDate: true,
        contractType: true
      }
    });
    
    console.log('✅ User updated successfully!');
    console.log('📊 New details:');
    console.log(`  - Base Salary: ${updated.baseSalary} EGP`);
    console.log(`  - Hire Date: ${updated.hireDate}`);
    console.log(`  - Contract Type: ${updated.contractType}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addBaseSalary();

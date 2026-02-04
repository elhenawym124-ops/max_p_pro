const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBaseSalary() {
  try {
    const companyId = 'cmgj92byv003djutl34dkh6ab'; // Mimi Store
    const userId = 'cmiug0rm70vbdjuewr9cuiy82'; // mokhtar@mokhtar.com
    
    console.log('🔍 Finding user mokhtar@mokhtar.com...');
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
    
    // تحديث الراتب الأساسي إلى 12000 جنيه
    const newBaseSalary = 12000;
    
    console.log(`💰 Updating base salary to ${newBaseSalary}...`);
    
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { 
        baseSalary: newBaseSalary,
        hireDate: new Date('2026-01-01'),
        contractType: 'FULL_TIME'
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

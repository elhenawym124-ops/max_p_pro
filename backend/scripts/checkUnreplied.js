const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const total = await prisma.conversation.count();
    const withTrue = await prisma.conversation.count({ where: { lastMessageIsFromCustomer: true } });
    const withFalse = await prisma.conversation.count({ where: { lastMessageIsFromCustomer: false } });
    const activeUnreplied = await prisma.conversation.count({ 
      where: { 
        status: { in: ['ACTIVE', 'PENDING'] }, 
        lastMessageIsFromCustomer: true 
      } 
    });
    
    console.log('📊 إحصائيات قاعدة البيانات:');
    console.log('   - إجمالي المحادثات:', total);
    console.log('   - lastMessageIsFromCustomer = true:', withTrue);
    console.log('   - lastMessageIsFromCustomer = false:', withFalse);
    console.log('   - غير مردود عليها (ACTIVE/PENDING + true):', activeUnreplied);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();

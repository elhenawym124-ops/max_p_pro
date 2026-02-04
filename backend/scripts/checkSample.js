const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Sample unreplied conversations
    const unreplied = await prisma.conversation.findMany({
      where: {
        lastMessageIsFromCustomer: true,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      take: 5,
      select: {
        id: true,
        status: true,
        lastMessageIsFromCustomer: true,
        unreadCount: true,
        lastMessageAt: true
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    
    console.log('📋 عينة من المحادثات غير المردود عليها:');
    console.log(JSON.stringify(unreplied, null, 2));
    
    // Check if there are any issues
    const issues = [];
    
    // Check for null values
    const nullLastMsg = await prisma.conversation.count({
      where: { lastMessageIsFromCustomer: null }
    });
    if (nullLastMsg > 0) {
      issues.push(`⚠️ ${nullLastMsg} محادثة بقيمة null في lastMessageIsFromCustomer`);
    }
    
    // Check status distribution
    const statusCounts = await prisma.conversation.groupBy({
      by: ['status'],
      _count: true
    });
    console.log('\n📊 توزيع الحالات:');
    statusCounts.forEach(s => console.log(`   - ${s.status}: ${s._count}`));
    
    if (issues.length > 0) {
      console.log('\n⚠️ مشاكل محتملة:');
      issues.forEach(i => console.log(i));
    } else {
      console.log('\n✅ لا توجد مشاكل!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();

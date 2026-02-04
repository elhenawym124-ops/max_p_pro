/**
 * فحص تقدم الاختبار والمحادثة في قاعدة البيانات
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const COMPANY_ID = 'cmem8ayyr004cufakqkcsyn97'; // شركة التسويق

async function checkProgress() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    console.log('\n🔍 فحص تقدم الاختبار...\n');

    // البحث عن المحادثات الاختبارية
    const conversations = await getSharedPrismaClient().conversation.findMany({
      where: {
        companyId: COMPANY_ID,
        channel: 'TEST'
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: 5,
      include: {
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    if (conversations.length === 0) {
      console.log('⚠️  لم يتم العثور على محادثات اختبارية');
      console.log('   الاختبار ربما لم يبدأ بعد أو لم يتم إنشاء المحادثة\n');
      return;
    }

    console.log(`✅ تم العثور على ${conversations.length} محادثة اختبارية:\n`);

    for (const conv of conversations) {
      const messageCount = conv._count.messages;
      const lastMessage = await getSharedPrismaClient().message.findFirst({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'desc' },
        select: {
          content: true,
          isFromCustomer: true,
          createdAt: true
        }
      });

      console.log(` conversation ID: ${conv.id}`);
      console.log(`   - عدد الرسائل: ${messageCount}`);
      console.log(`   - آخر تحديث: ${new Date(conv.lastMessageAt).toLocaleString('ar-EG')}`);
      
      if (lastMessage) {
        const preview = lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
        console.log(`   - آخر رسالة: ${preview}`);
        console.log(`   - من: ${lastMessage.isFromCustomer ? 'العميل' : 'AI'}`);
      }
      
      console.log(`   - رابط: /test-chat?conversationId=${conv.id}\n`);
    }

    // إحصائيات سريعة
    const totalMessages = await getSharedPrismaClient().message.count({
      where: {
        conversation: {
          companyId: COMPANY_ID,
          channel: 'TEST'
        }
      }
    });

    const aiMessages = await getSharedPrismaClient().message.count({
      where: {
        conversation: {
          companyId: COMPANY_ID,
          channel: 'TEST'
        },
        isFromCustomer: false
      }
    });

    const userMessages = await getSharedPrismaClient().message.count({
      where: {
        conversation: {
          companyId: COMPANY_ID,
          channel: 'TEST'
        },
        isFromCustomer: true
      }
    });

    console.log('📊 الإحصائيات:');
    console.log(`   - إجمالي الرسائل: ${totalMessages}`);
    console.log(`   - رسائل المستخدم: ${userMessages}`);
    console.log(`   - ردود AI: ${aiMessages}`);
    console.log('');

    // إذا كان هناك محادثة نشطة حديثة
    if (conversations[0] && conversations[0]._count.messages > 0) {
      const latestConv = conversations[0];
      const progress = (latestConv._count.messages / 2); // كل سؤال = رسالة + رد
      console.log(`📈 التقدم المتوقع: ${progress} سؤال من 50 (${((progress / 50) * 100).toFixed(1)}%)`);
      console.log(`   - المحادثة النشطة: ${latestConv.id}`);
      console.log(`   - رابط مباشر: /test-chat?conversationId=${latestConv.id}\n`);
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
    console.error(error.stack);
  }
}

// تشغيل كل 10 ثواني
setInterval(checkProgress, 10000);

// تشغيل مرة فورية
checkProgress();

// إيقاف بعد 30 دقيقة
setTimeout(() => {
  console.log('\n⏱️  انتهى وقت المراقبة\n');
  process.exit(0);
}, 30 * 60 * 1000);



/**
 * سكريبت للتحقق من الرسائل في قاعدة البيانات
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const COMPANY_ID = 'cmem8ayyr004cufakqkcsyn97'; // شركة التسويق

async function checkMessages() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 فحص الرسائل في قاعدة البيانات');
    console.log('='.repeat(60) + '\n');

    // البحث عن customer اختبار
    const testCustomer = await getSharedPrismaClient().customer.findFirst({
      where: {
        companyId: COMPANY_ID,
        firstName: 'عميل اختبار',
        lastName: 'Test Customer'
      }
    });

    if (!testCustomer) {
      console.log('❌ لم يتم العثور على customer اختبار');
      return;
    }

    console.log(`✅ تم العثور على customer: ${testCustomer.id}`);
    console.log(`   الاسم: ${testCustomer.firstName} ${testCustomer.lastName}`);
    console.log(`   Company ID: ${testCustomer.companyId}\n`);

    // البحث عن محادثات TEST
    const conversations = await getSharedPrismaClient().conversation.findMany({
      where: {
        companyId: COMPANY_ID,
        channel: 'TEST',
        customerId: testCustomer.id
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: 5
    });

    console.log(`📊 عدد المحادثات: ${conversations.length}\n`);

    if (conversations.length === 0) {
      console.log('❌ لم يتم العثور على محادثات TEST');
      return;
    }

    // فحص كل محادثة
    for (const conv of conversations) {
      console.log(`\n💬 المحادثة: ${conv.id}`);
      console.log(`   Channel: ${conv.channel}`);
      console.log(`   Status: ${conv.status}`);
      console.log(`   Last Message: ${conv.lastMessageAt}`);
      console.log(`   Preview: ${conv.lastMessagePreview || 'لا يوجد'}`);

      // جلب الرسائل
      const messages = await getSharedPrismaClient().message.findMany({
        where: {
          conversationId: conv.id
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log(`   📨 عدد الرسائل: ${messages.length}`);

      if (messages.length > 0) {
        console.log(`   📝 أول 3 رسائل:`);
        messages.slice(0, 3).forEach((msg, idx) => {
          const sender = msg.isFromCustomer ? '👤 العميل' : '🤖 AI';
          const preview = (msg.content || '').substring(0, 50);
          console.log(`      ${idx + 1}. ${sender}: ${preview}${preview.length >= 50 ? '...' : ''}`);
        });
      } else {
        console.log(`   ⚠️ لا توجد رسائل في هذه المحادثة!`);
      }
    }

    // فحص آخر محادثة بالتفصيل
    if (conversations.length > 0) {
      const lastConv = conversations[0];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 تفاصيل آخر محادثة: ${lastConv.id}`);
      console.log('='.repeat(60));

      const allMessages = await getSharedPrismaClient().message.findMany({
        where: {
          conversationId: lastConv.id
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log(`\n📊 إجمالي الرسائل: ${allMessages.length}\n`);

      allMessages.forEach((msg, idx) => {
        const sender = msg.isFromCustomer ? '👤 العميل' : '🤖 AI';
        const time = new Date(msg.createdAt).toLocaleString('ar-EG');
        const content = (msg.content || '').substring(0, 100);
        console.log(`[${idx + 1}] ${sender} (${time}):`);
        console.log(`    ${content}${content.length >= 100 ? '...' : ''}\n`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ انتهى الفحص');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ خطأ في فحص الرسائل:', error);
    console.error(error.stack);
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

checkMessages();



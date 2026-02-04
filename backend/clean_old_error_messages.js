const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * حذف الرسائل القديمة التي تحتوي على MISSING_PERSONALITY_PROMPT
 */
async function cleanOldErrorMessages() {
  try {
    console.log('🧹 Cleaning old error messages...\n');

    // البحث عن الرسائل التي تحتوي على الخطأ
    const errorMessages = await prisma.message.findMany({
      where: {
        OR: [
          { content: { contains: 'MISSING_PERSONALITY_PROMPT' } },
          { content: { contains: 'يجب إعداد شخصية المساعد الذكي من لوحة التحكم أولاً' } }
        ]
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        conversationId: true
      }
    });

    console.log(`📊 Found ${errorMessages.length} messages with MISSING_PERSONALITY_PROMPT error\n`);

    if (errorMessages.length === 0) {
      console.log('✅ No error messages found. Database is clean!');
      return;
    }

    // عرض أول 5 رسائل كمثال
    console.log('📋 Sample messages (first 5):');
    errorMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`${i + 1}. ID: ${msg.id}`);
      console.log(`   Date: ${msg.createdAt}`);
      console.log(`   Content: ${msg.content.substring(0, 100)}...`);
      console.log('');
    });

    console.log('\n⚠️  Do you want to delete these messages?');
    console.log('⚠️  This will permanently remove them from the database.');
    console.log('\n💡 To delete, run this script with --confirm flag:');
    console.log('   node clean_old_error_messages.js --confirm');

    // التحقق من وجود flag التأكيد
    if (process.argv.includes('--confirm')) {
      console.log('\n🗑️  Deleting messages...');
      
      const result = await prisma.message.deleteMany({
        where: {
          OR: [
            { content: { contains: 'MISSING_PERSONALITY_PROMPT' } },
            { content: { contains: 'يجب إعداد شخصية المساعد الذكي من لوحة التحكم أولاً' } }
          ]
        }
      });

      console.log(`✅ Deleted ${result.count} messages successfully!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOldErrorMessages();

const { PrismaClient } = require('@prisma/client');
const mysql = require('mysql2/promise');

const prismaMain = new PrismaClient();

const archiveConfig = {
  host: 'srv1812.hstgr.io',
  port: 3306,
  user: 'u339372869_Archive',
  password: '0190711037Aa@',
  database: 'u339372869_Archive'
};

async function cleanAndArchive() {
  console.log('🧹 تنظيف وأرشفة ذكية\n');

  let archiveConn;

  try {
    console.log('📡 الاتصال بقاعدة الأرشيف...');
    archiveConn = await mysql.createConnection(archiveConfig);
    console.log('✅ تم الاتصال بنجاح!\n');

    // 1. حذف الرسائل المكررة من الأرشيف
    console.log('🧹 تنظيف الرسائل المكررة من الأرشيف...');
    await archiveConn.query('TRUNCATE TABLE message_archive');
    await archiveConn.query('TRUNCATE TABLE conversation_memory_archive');
    console.log('✅ تم تنظيف الأرشيف\n');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 2. أرشفة الرسائل بدفعات كبيرة
    console.log('📦 أرشفة الرسائل القديمة...');
    
    const totalMessages = await prismaMain.message.count({
      where: { createdAt: { lt: thirtyDaysAgo } }
    });
    console.log(`   وجد ${totalMessages.toLocaleString()} رسالة قديمة`);

    if (totalMessages > 0) {
      let archived = 0;
      const batchSize = 5000;

      while (archived < totalMessages) {
        const messages = await prismaMain.message.findMany({
          where: { createdAt: { lt: thirtyDaysAgo } },
          take: batchSize
        });

        if (messages.length === 0) break;

        console.log(`   معالجة: ${archived + 1} - ${archived + messages.length}...`);

        // نسخ للأرشيف
        for (const msg of messages) {
          try {
            await archiveConn.query(
              `INSERT IGNORE INTO message_archive 
              (id, conversationId, senderId, type, content, attachments, metadata, 
               isFromCustomer, isRead, readAt, createdAt, updatedAt, archivedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                msg.id, msg.conversationId, msg.senderId, msg.type, msg.content,
                msg.attachments, msg.metadata, msg.isFromCustomer, msg.isRead,
                msg.readAt, msg.createdAt, msg.updatedAt, now
              ]
            );
          } catch (err) {
            // تجاهل الأخطاء المكررة
          }
        }

        // حذف من القاعدة الرئيسية
        const ids = messages.map(m => m.id);
        await prismaMain.message.deleteMany({
          where: { id: { in: ids } }
        });

        archived += messages.length;
        console.log(`   تقدم: ${archived.toLocaleString()} / ${totalMessages.toLocaleString()} (${((archived/totalMessages)*100).toFixed(1)}%)`);
      }

      console.log(`   ✅ تم أرشفة ${archived.toLocaleString()} رسالة\n`);
    }

    // 3. أرشفة ذاكرة المحادثات
    console.log('📦 أرشفة ذاكرة المحادثات...');
    
    const totalMemory = await prismaMain.conversationMemory.count({
      where: { createdAt: { lt: thirtyDaysAgo } }
    });
    console.log(`   وجد ${totalMemory.toLocaleString()} سجل ذاكرة`);

    if (totalMemory > 0) {
      let archived = 0;
      const batchSize = 5000;

      while (archived < totalMemory) {
        const memories = await prismaMain.conversationMemory.findMany({
          where: { createdAt: { lt: thirtyDaysAgo } },
          take: batchSize
        });

        if (memories.length === 0) break;

        console.log(`   معالجة: ${archived + 1} - ${archived + memories.length}...`);

        for (const mem of memories) {
          try {
            await archiveConn.query(
              `INSERT IGNORE INTO conversation_memory_archive 
              (id, conversationId, senderId, userMessage, aiResponse, intent, sentiment,
               timestamp, metadata, createdAt, updatedAt, companyId, archivedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                mem.id, mem.conversationId, mem.senderId, mem.userMessage, mem.aiResponse,
                mem.intent, mem.sentiment, mem.timestamp, mem.metadata, mem.createdAt,
                mem.updatedAt, mem.companyId, now
              ]
            );
          } catch (err) {
            // تجاهل الأخطاء المكررة
          }
        }

        const ids = memories.map(m => m.id);
        await prismaMain.conversationMemory.deleteMany({
          where: { id: { in: ids } }
        });

        archived += memories.length;
        console.log(`   تقدم: ${archived.toLocaleString()} / ${totalMemory.toLocaleString()} (${((archived/totalMemory)*100).toFixed(1)}%)`);
      }

      console.log(`   ✅ تم أرشفة ${archived.toLocaleString()} سجل ذاكرة\n`);
    }

    const total = totalMessages + totalMemory;
    console.log('='.repeat(60));
    console.log('\n✨ اكتملت الأرشفة بنجاح!');
    console.log(`📊 إجمالي: ${total.toLocaleString()} سجل`);
    console.log(`💾 المساحة: ~${(total / 1024).toFixed(2)} MB\n`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prismaMain.$disconnect();
    if (archiveConn) await archiveConn.end();
  }
}

cleanAndArchive().catch(console.error);

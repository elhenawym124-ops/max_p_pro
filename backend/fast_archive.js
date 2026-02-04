const mysql = require('mysql2/promise');

async function fastArchive() {
  console.log('⚡ أرشفة سريعة - طريقة محسّنة\n');

  const mainConfig = {
    host: '92.113.22.70',
    user: 'u339372869_test2',
    password: '0165676135Aa@A',
    database: 'u339372869_test2'
  };

  let mainConn;

  try {
    console.log('📡 الاتصال بقاعدة البيانات الرئيسية...');
    mainConn = await mysql.createConnection(mainConfig);
    console.log('✅ تم الاتصال بنجاح!\n');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateStr = thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

    // 1. نسخ الرسائل بكميات كبيرة
    console.log('📦 نسخ الرسائل القديمة...');
    
    const [countResult] = await mainConn.query(
      'SELECT COUNT(*) as count FROM messages WHERE createdAt < ?',
      [dateStr]
    );
    const messageCount = countResult[0].count;
    console.log(`   وجد ${messageCount.toLocaleString()} رسالة قديمة`);

    if (messageCount > 0) {
      console.log('   جاري النسخ بدفعات كبيرة...');
      
      const batchSize = 10000; // دفعات كبيرة
      let offset = 0;
      let totalCopied = 0;

      while (offset < messageCount) {
        // جلب دفعة
        const [messages] = await mainConn.query(
          `SELECT * FROM messages WHERE createdAt < ? LIMIT ? OFFSET ?`,
          [dateStr, batchSize, offset]
        );

        if (messages.length === 0) break;

        // إدراج في قاعدة الأرشيف
        const values = messages.map(msg => [
          msg.id, msg.conversationId, msg.senderId, msg.type, msg.content,
          msg.attachments, msg.metadata, msg.isFromCustomer, msg.isRead,
          msg.readAt, msg.createdAt, msg.updatedAt, new Date()
        ]);

        const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
        const flatValues = values.flat();

        await mainConn.query(
          `INSERT INTO u339372869_Archive.message_archive 
          (id, conversationId, senderId, type, content, attachments, metadata, 
           isFromCustomer, isRead, readAt, createdAt, updatedAt, archivedAt)
          VALUES ${placeholders}`,
          flatValues
        );

        totalCopied += messages.length;
        offset += batchSize;
        
        const progress = ((offset / messageCount) * 100).toFixed(1);
        console.log(`   تقدم: ${totalCopied.toLocaleString()} / ${messageCount.toLocaleString()} (${progress}%)`);
      }

      console.log(`   ✅ تم نسخ ${totalCopied.toLocaleString()} رسالة للأرشيف`);

      // حذف من القاعدة الرئيسية
      console.log('   جاري الحذف من القاعدة الرئيسية...');
      const [deleteResult] = await mainConn.query(
        'DELETE FROM messages WHERE createdAt < ?',
        [dateStr]
      );
      
      console.log(`   ✅ تم حذف ${deleteResult.affectedRows.toLocaleString()} رسالة\n`);
    } else {
      console.log('   ✅ لا توجد رسائل قديمة\n');
    }

    // 2. نسخ ذاكرة المحادثات
    console.log('📦 نسخ ذاكرة المحادثات...');
    
    const [memoryCountResult] = await mainConn.query(
      'SELECT COUNT(*) as count FROM conversation_memory WHERE createdAt < ?',
      [dateStr]
    );
    const memoryCount = memoryCountResult[0].count;
    console.log(`   وجد ${memoryCount.toLocaleString()} سجل ذاكرة قديم`);

    if (memoryCount > 0) {
      const [memories] = await mainConn.query(
        'SELECT * FROM conversation_memory WHERE createdAt < ?',
        [dateStr]
      );

      const values = memories.map(mem => [
        mem.id, mem.conversationId, mem.senderId, mem.userMessage, mem.aiResponse,
        mem.intent, mem.sentiment, mem.timestamp, mem.metadata, mem.createdAt,
        mem.updatedAt, mem.companyId, new Date()
      ]);

      const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const flatValues = values.flat();

      await mainConn.query(
        `INSERT INTO u339372869_Archive.conversation_memory_archive 
        (id, conversationId, senderId, userMessage, aiResponse, intent, sentiment,
         timestamp, metadata, createdAt, updatedAt, companyId, archivedAt)
        VALUES ${placeholders}`,
        flatValues
      );
      
      console.log(`   ✅ تم نسخ ${memoryCount.toLocaleString()} سجل للأرشيف`);

      const [deleteMemResult] = await mainConn.query(
        'DELETE FROM conversation_memory WHERE createdAt < ?',
        [dateStr]
      );
      
      console.log(`   ✅ تم حذف ${deleteMemResult.affectedRows.toLocaleString()} سجل\n`);
    } else {
      console.log('   ✅ لا توجد ذاكرة قديمة\n');
    }

    const totalArchived = messageCount + memoryCount;
    console.log('='.repeat(60));
    console.log('\n✨ اكتملت الأرشفة السريعة بنجاح!');
    console.log(`📊 إجمالي السجلات المؤرشفة: ${totalArchived.toLocaleString()}`);
    console.log(`💾 المساحة المحررة: ~${(totalArchived / 1024).toFixed(2)} MB\n`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error.stack);
  } finally {
    if (mainConn) await mainConn.end();
  }
}

fastArchive().catch(console.error);

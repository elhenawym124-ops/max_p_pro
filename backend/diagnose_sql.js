const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function diagnose() {
    console.log('🛸 SQL Diagnostics Running...');

    try {
        // 1. Get approximate counts from information_schema
        const tableStats = await prisma.$queryRaw`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND TABLE_NAME IN ('messages', 'whatsapp_messages', 'image_gallery', 'products')
    `;
        console.log('\n--- Table Stats (Approx) ---');
        console.table(tableStats);

        // 2. Get breakdown of Message images per company
        const chatBreakdown = await prisma.$queryRaw`
      SELECT c.name, COUNT(m.id) as count
      FROM messages m
      JOIN conversations conv ON m.conversationId = conv.id
      JOIN companies c ON conv.companyId = c.id
      WHERE m.type = 'IMAGE'
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 10
    `;
        console.log('\n--- Chat Images Breakdown ---');
        console.table(chatBreakdown);

        // 3. Get breakdown of WhatsApp images per company
        const waBreakdown = await prisma.$queryRaw`
      SELECT c.name, COUNT(wm.id) as count
      FROM whatsapp_messages wm
      JOIN whatsapp_sessions ws ON wm.sessionId = ws.id
      JOIN companies c ON ws.companyId = c.id
      WHERE wm.messageType = 'IMAGE'
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 10
    `;
        console.log('\n--- WhatsApp Images Breakdown ---');
        console.table(waBreakdown);

    } catch (err) {
        console.error('❌ SQL Diagnostics failed:', err);
    }
    process.exit(0);
}

diagnose();

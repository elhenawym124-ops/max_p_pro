/**
 * Script لتحديث عمود lastMessageIsFromCustomer للمحادثات الموجودة
 * يجب تشغيله مرة واحدة بعد إضافة العمود الجديد
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAllConversations() {
  console.log('🚀 Starting to update lastMessageIsFromCustomer for all conversations...');
  
  try {
    // Get all conversations
    const conversations = await prisma.conversation.findMany({
      select: {
        id: true,
        status: true
      }
    });
    
    console.log(`📊 Found ${conversations.length} conversations to process`);
    
    let updated = 0;
    let errors = 0;
    const batchSize = 100;
    
    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (conv) => {
        try {
          // Get the last message for this conversation
          const lastMessage = await prisma.message.findFirst({
            where: { conversationId: conv.id },
            orderBy: { createdAt: 'desc' },
            select: { isFromCustomer: true }
          });
          
          // Count unread messages from customer
          const unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              isFromCustomer: true,
              isRead: false
            }
          });
          
          // Update the conversation
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              lastMessageIsFromCustomer: lastMessage?.isFromCustomer ?? false,
              unreadCount: unreadCount
            }
          });
          
          updated++;
        } catch (err) {
          console.error(`❌ Error updating conversation ${conv.id}:`, err.message);
          errors++;
        }
      }));
      
      console.log(`📈 Progress: ${Math.min(i + batchSize, conversations.length)}/${conversations.length} (${updated} updated, ${errors} errors)`);
    }
    
    console.log(`\n✅ Completed! Updated ${updated} conversations, ${errors} errors`);
    
    // Show stats
    const unrepliedCount = await prisma.conversation.count({
      where: {
        status: { in: ['ACTIVE', 'PENDING'] },
        lastMessageIsFromCustomer: true
      }
    });
    
    console.log(`\n📊 Stats:`);
    console.log(`   - Total conversations: ${conversations.length}`);
    console.log(`   - Unreplied conversations: ${unrepliedCount}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllConversations();

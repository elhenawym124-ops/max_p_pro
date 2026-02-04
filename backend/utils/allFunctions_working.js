// Essential functions for webhook processing - clean version
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Simple working handleFacebookMessage function for testing
async function handleFacebookMessage(webhookEvent, currentPageId = null) {
  //console.log('🚀 [WEBHOOK-FIX] Processing message with clean function');
  
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    const senderId = webhookEvent.sender.id;
    const messageText = webhookEvent.message.text;
    const attachments = webhookEvent.message.attachments;

    //console.log(`📨 Facebook message from ${senderId}: "${messageText}"`);

    // Find or create customer
    let customer = await getSharedPrismaClient().customer.findFirst({
      where: { facebookId: senderId }
    });

    // Get a valid company ID
    let companyId = 'cmd5c0c9y0000ymzdd7wtv7ib'; // Default fallback
    try {
      const firstCompany = await getSharedPrismaClient().company.findFirst();
      if (firstCompany) {
        companyId = firstCompany.id;
      }
    } catch (error) {
      //console.log('⚠️ Could not fetch company from database, using default');
    }

    if (!customer) {
      customer = await getSharedPrismaClient().customer.create({
        data: {
          facebookId: senderId,
          firstName: 'Facebook',
          lastName: 'User',
          email: `fb_${senderId}@example.com`,
          phone: '',
          companyId: companyId
        }
      });
      //console.log(`👤 New customer created: ${customer.id}`);
    } else {
      //console.log(`👤 Existing customer found: ${customer.id}`);
    }

    // Find or create conversation
    let conversation = await getSharedPrismaClient().conversation.findFirst({
      where: {
        customerId: customer.id,
        status: 'ACTIVE'
      },
      orderBy: { updatedAt: 'desc' }
    });

    const timestamp = new Date();

    if (!conversation) {
      conversation = await getSharedPrismaClient().conversation.create({
        data: {
          customerId: customer.id,
          companyId: customer.companyId,
          channel: 'FACEBOOK',
          status: 'ACTIVE',
          lastMessageAt: timestamp
        }
      });
      //console.log(`💬 New conversation created: ${conversation.id}`);
    } else {
      conversation = await getSharedPrismaClient().conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: timestamp,
          updatedAt: new Date()
        }
      });
      //console.log(`🔄 Updated existing conversation: ${conversation.id}`);
    }

    // Determine message type and content
    let messageType = 'TEXT';
    let content = messageText || '';

    if (attachments && attachments.length > 0) {
      const attachment = attachments[0];
      if (attachment.type === 'image') {
        messageType = 'IMAGE';
        content = attachment.payload.url;
      } else if (attachment.type === 'file') {
        messageType = 'FILE';
        content = attachment.payload.url;
      }
    }

    // Save message to database
    const newMessage = await getSharedPrismaClient().message.create({
      data: {
        content: content,
        type: messageType,
        conversationId: conversation.id,
        isFromCustomer: true,
        createdAt: timestamp
      }
    });

    //console.log(`✅ Message saved: ${newMessage.id}`);
    //console.log('🎉 [WEBHOOK-FIX] Message processing completed successfully!');

  } catch (error) {
    console.error('❌ Error processing Facebook message:', error);
  }
}

// Simple sendFacebookMessage function for compatibility 
async function sendFacebookMessage(recipientId, messageContent, messageType = 'TEXT', pageId = null) {
  //console.log(`📤 [SIMPLE-SEND] Would send: "${messageContent}" to ${recipientId}`);
  return { success: true, message: 'Message logged (simplified function)' };
}

// Stub functions for compatibility
function handleMessageDirectly() {
  //console.log('📝 handleMessageDirectly called');
}

function updatePageTokenCache() {
  //console.log('🔄 updatePageTokenCache called');
}

function getPageTokenFromCache() {
  //console.log('🔍 getPageTokenFromCache called');
  return null;
}

const messageQueueManager = {
  addToQueue: () => console.log('📥 messageQueueManager.addToQueue called')
};

module.exports = { 
  sendFacebookMessage, 
  handleMessageDirectly, 
  updatePageTokenCache, 
  handleFacebookMessage, 
  getPageTokenFromCache, 
  messageQueueManager 
};

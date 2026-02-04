// Essential functions for webhook processing with AI integration
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const aiAgentService = require('../services/aiAgentService');
const socketService = require('../services/socketService');

// Enhanced handleFacebookMessage function with AI processing
async function handleFacebookMessage(webhookEvent, currentPageId = null) {
  //console.log('🚀 [WEBHOOK] Processing message with AI integration');
  
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

    // Save customer message to database
    const newMessage = await getSharedPrismaClient().message.create({
      data: {
        content: content,
        type: messageType,
        conversationId: conversation.id,
        isFromCustomer: true,
        createdAt: timestamp
      }
    });

    //console.log(`✅ Customer message saved: ${newMessage.id}`);

    // Emit customer message via Socket.IO
    const io = socketService.getIO();
    if (io) {
      const customerSocketData = {
        id: newMessage.id,
        conversationId: newMessage.conversationId,
        content: newMessage.content,
        type: newMessage.type.toLowerCase(),
        isFromCustomer: true,
        timestamp: newMessage.createdAt
      };
      //console.log(`🔌 [SOCKET] Emitting customer message:`, customerSocketData);
      io.emit('new_message', customerSocketData);
    }

    // 🤖 Process message with AI Agent
    //console.log('🤖 Processing message with AI Agent...');
    try {
      const aiMessageData = {
        conversationId: conversation.id,
        senderId: senderId,
        content: messageText || '',
        attachments: attachments || [],
        timestamp: timestamp,
        companyId: customer.companyId,
        customerData: {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          email: customer.email,
          orderCount: 0,
          companyId: customer.companyId
        }
      };

      const aiResponse = await aiAgentService.processCustomerMessage(aiMessageData);
      
      if (aiResponse && aiResponse.content && !aiResponse.silent) {
        //console.log('🤖 AI Response generated:', aiResponse.content);

        // Save AI response to database
        const aiMessage = await getSharedPrismaClient().message.create({
          data: {
            content: aiResponse.content,
            type: 'TEXT',
            conversationId: conversation.id,
            isFromCustomer: false,
            metadata: JSON.stringify({
              aiGenerated: true,
              confidence: aiResponse.confidence,
              intent: aiResponse.intent,
              sentiment: aiResponse.sentiment
            }),
            createdAt: new Date()
          }
        });

        //console.log(`✅ AI message saved: ${aiMessage.id}`);

        // Emit AI response via Socket.IO
        if (io) {
          const aiSocketData = {
            id: aiMessage.id,
            conversationId: aiMessage.conversationId,
            content: aiMessage.content,
            type: 'text',
            isFromCustomer: false,
            timestamp: aiMessage.createdAt,
            metadata: {
              aiGenerated: true,
              confidence: aiResponse.confidence
            }
          };
          //console.log(`🔌 [SOCKET] Emitting AI response:`, aiSocketData);
          io.emit('new_message', aiSocketData);
        }

        // Update conversation with latest message info
        await getSharedPrismaClient().conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: aiResponse.content.length > 100 ? 
              aiResponse.content.substring(0, 100) + '...' : aiResponse.content
          }
        });

        //console.log('🎉 [WEBHOOK] Message processing with AI completed successfully!');
      } else {
        //console.log('🤖 AI response was silent or empty - no reply sent');
      }
    } catch (aiError) {
      console.error('❌ Error processing message with AI:', aiError);
      //console.log('📝 Message saved but AI processing failed');
    }

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

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const aiAgentService = require('../services/aiAgentService');
const memoryService = require('../services/memoryService'); // ✅ NEW
const { v4: uuidv4 } = require('uuid'); // ✅ FIX: Add uuid for message id generation

/**
 * Test Chat Controller
 * Handles test conversations for AI testing
 */

// ✅ NEW: Track messages that have been processed to prevent duplicates
const processedMessages = new Set();

/**
 * Get all test conversations for the company
 */
exports.getConversations = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    const conversations = await safeQuery(async () => {
      return await prisma.conversation.findMany({
        where: {
          companyId,
          channel: 'TEST'
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: {
          lastMessageAt: 'desc'
        }
      });
    }, 5);

    res.json({
      success: true,
      data: conversations.map(conv => ({
        id: conv.id,
        customerId: conv.customerId,
        customerName: conv.customer ? `${conv.customer.firstName} ${conv.customer.lastName}`.trim() : 'Test User',
        customerAvatar: conv.customer?.avatar || null,
        lastMessage: conv.lastMessagePreview || 'No messages',
        lastMessageTime: conv.lastMessageAt || conv.createdAt,
        unreadCount: conv.unreadCount || 0,
        createdAt: conv.createdAt
      })),
      pagination: {
        total: conversations.length,
        page: 1,
        limit: 100
      }
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test conversations',
      error: error.message
    });
  }
};

/**
 * Create new test conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // Create or get test customer
    let customer = await safeQuery(async () => {
      return await prisma.customer.findFirst({
        where: {
          companyId,
          firstName: 'Test',
          lastName: 'User'
        }
      });
    }, 5);

    if (!customer) {
      customer = await safeQuery(async () => {
        return await prisma.customer.create({
          data: {
            companyId,
            firstName: 'Test',
            lastName: 'User',
            email: `test-${Date.now()}@test.com`,
            phone: '0000000000'
          }
        });
      }, 5);
    }

    // Validate customer exists
    if (!customer || !customer.id) {
      console.error('❌ [TEST-CHAT] Failed to create/find customer');
      return res.status(500).json({
        success: false,
        message: 'Failed to create test customer'
      });
    }

    // Create conversation
    const conversation = await safeQuery(async () => {
      return await prisma.conversation.create({
        data: {
          companyId,
          customerId: customer.id,
          channel: 'TEST',
          status: 'ACTIVE',
          lastMessagePreview: 'New test conversation',
          lastMessageAt: new Date()
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });
    }, 5);

    res.json({
      success: true,
      data: {
        id: conversation.id,
        customerId: conversation.customerId,
        customerName: `${conversation.customer.firstName} ${conversation.customer.lastName}`,
        customerAvatar: conversation.customer.avatar,
        lastMessage: conversation.lastMessagePreview,
        lastMessageTime: conversation.lastMessageAt,
        unreadCount: 0,
        createdAt: conversation.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test conversation',
      error: error.message
    });
  }
};

/**
 * Create BULK test conversations
 */
exports.createBulkConversations = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { count = 5 } = req.body;

    // Validate count (max 20 to prevent abuse)
    const validCount = Math.min(Math.max(parseInt(count) || 5, 1), 20);

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // Create or get test customer
    let customer = await safeQuery(async () => {
      return await prisma.customer.findFirst({
        where: {
          companyId,
          firstName: 'Test',
          lastName: 'User'
        }
      });
    }, 5);

    if (!customer) {
      customer = await safeQuery(async () => {
        return await prisma.customer.create({
          data: {
            companyId,
            firstName: 'Test',
            lastName: 'User',
            email: `test-${Date.now()}@test.com`,
            phone: '0000000000'
          }
        });
      }, 5);
    }

    const createdConversations = [];

    // Run in transaction or parallel? Parallel is fine for this
    await Promise.all(Array.from({ length: validCount }).map(async (_, index) => {
      const conversation = await safeQuery(async () => {
        return await prisma.conversation.create({
          data: {
            companyId,
            customerId: customer.id,
            channel: 'TEST',
            status: 'ACTIVE',
            lastMessagePreview: `New test conversation ${index + 1}`,
            lastMessageAt: new Date(),
            metadata: JSON.stringify({ isBulkCreated: true, bulkIndex: index })
          }
        });
      }, 5);
      createdConversations.push(conversation);
    }));

    res.json({
      success: true,
      message: `Successfully created ${createdConversations.length} conversations`,
      count: createdConversations.length
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error creating bulk conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bulk conversations',
      error: error.message
    });
  }
};

/**
 * Get messages for a conversation
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // Verify conversation belongs to company
    const conversation = await safeQuery(async () => {
      return await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          companyId
        }
      });
    }, 10);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Get messages
    const messages = await safeQuery(async () => {
      return await prisma.message.findMany({
        where: {
          conversationId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    }, 5);

    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isFromCustomer: msg.isFromCustomer,
        type: msg.type,
        createdAt: msg.createdAt,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }))
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
};

/**
 * Send message in a conversation
 */
exports.sendMessage = async (req, res) => {
  console.log('📨 [TEST-CHAT] ========== sendMessage called ==========');
  console.log('📨 [TEST-CHAT] conversationId:', req.params?.conversationId);
  console.log('📨 [TEST-CHAT] message:', req.body?.message?.substring(0, 50));
  console.log('📨 [TEST-CHAT] images:', req.files?.length || 0); // ✅ NEW
  console.log('📨 [TEST-CHAT] companyId:', req.user?.companyId);

  try {
    const { conversationId } = req.params;
    const { message, platform, postId, adId, messageType, metadata: extraMetadata } = req.body; // ✅ DYNAMIC
    const images = req.files || []; // ✅ NEW: الصور من multer
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    if (!message && images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message or images are required'
      });
    }

    // ✅ NEW: Prevent duplicate processing of the same message
    const messageKey = `${conversationId}_${message || 'images'}_${Date.now()}`;
    if (processedMessages.has(messageKey)) {
      console.log(`⚠️ [TEST-CHAT] Message already processed, skipping duplicate: ${messageKey}`);
      return res.status(200).json({
        success: true,
        message: 'Message already processed',
        data: {
          userMessage: null,
          aiMessage: null,
          aiResponse: {
            success: false,
            silent: true,
            silentReason: 'الرسالة قيد المعالجة بالفعل'
          }
        }
      });
    }

    // Add to processed messages set and clean up after 1 minute
    processedMessages.add(messageKey);
    setTimeout(() => {
      processedMessages.delete(messageKey);
    }, 60000);

    const prisma = getSharedPrismaClient();

    // Verify conversation belongs to company
    const conversation = await safeQuery(async () => {
      return await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          companyId
        }
      });
    }, 10);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // ✅ إعداد attachments إذا كانت هناك صور
    const attachments = images.map(file => ({
      type: 'image',
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      size: file.size
    }));

    // ✅ NEW: Check if message already exists (prevent duplicates)
    const existingMessage = await safeQuery(async () => {
      return await prisma.message.findFirst({
        where: {
          conversationId,
          content: message || '',
          isFromCustomer: true,
          createdAt: {
            gte: new Date(Date.now() - 5000) // Within last 5 seconds
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }, 3);

    let userMessage;
    if (existingMessage) {
      console.log('⚠️ [TEST-CHAT] Duplicate message detected, using existing:', existingMessage.id);
      userMessage = existingMessage;
    } else {
      // Create user message
      userMessage = await safeQuery(async () => {
        return await prisma.message.create({
          data: {
            id: uuidv4(), // ✅ FIX: Add required id field
            conversationId,
            content: message || '', // ✅ يمكن إرسال صور بدون نص
            isFromCustomer: true,
            type: images.length > 0 ? 'IMAGE' : 'TEXT', // ✅ تحديد النوع
            metadata: JSON.stringify({
              attachments: attachments.length > 0 ? attachments : undefined,
              imageCount: images.length,
              platform, // ✅ NEW
              postId,   // ✅ NEW
              adId,     // ✅ NEW
              replyToMessageId: req.body.replyToMessageId, // ✅ NEW: دعم الرد
              extraMetadata // ✅ NEW
            })
          }
        });
      }, 5);
    }

    // Update conversation
    await safeQuery(async () => {
      await safeQuery(async () => {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessagePreview: message.substring(0, 100),
            lastMessageAt: new Date()
          }
        });
      }, 5);
    }, 2);

    // ✅ Generate AI response using AI Agent Service
    let aiResponse = null;
    let aiResponseMessage = null;
    let aiResponseImages = []; // ✅ NEW: لحفظ الصور من AI
    // suggestions feature removed by user request
    let extractedDetails = null; // ✅ NEW: البيانات المستخرجة

    try {
      console.log('🤖 [TEST-CHAT] Generating AI response...');

      // Get customer data
      const customer = await safeQuery(async () => {
        return await prisma.customer.findUnique({
          where: { id: conversation.customerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            companyId: true
          }
        });
      }, 5);

      // Prepare message data for AI processing
      const messageData = {
        conversationId,
        senderId: conversation.customerId,
        content: message,
        attachments: [],
        customerData: customer,
        companyId,
        timestamp: new Date(),
        platform: platform || 'test-chat', // ✅ DYNAMIC
        postId: postId || null,             // ✅ NEW
        adId: adId || null,                 // ✅ NEW
        messageType: messageType || 'text', // ✅ NEW
        metadata: {
          ...(extraMetadata || {}),
          replyToMessageId: req.body.replyToMessageId // ✅ NEW
        }
      };

      // ✅ إضافة الصور للـ messageData
      if (attachments.length > 0) {
        messageData.attachments = attachments;
      }

      // ✅ NEW: Handling Reply Context if exists
      if (req.body.replyToMessageId) {
        try {
          const originalMessage = await safeQuery(async () => {
            return await prisma.message.findUnique({
              where: { id: req.body.replyToMessageId }
            });
          }, 5);
          if (originalMessage) {
            messageData.replyContext = {
              isReply: true,
              originalMessage: {
                content: originalMessage.content,
                createdAt: originalMessage.createdAt,
                isFromCustomer: originalMessage.isFromCustomer
              }
            };
          }
        } catch (replyErr) {
          console.error('⚠️ [TEST-CHAT] Error fetching reply message:', replyErr);
        }
      }

      // Process message with AI
      console.log('🔍🔍🔍 [TEST-CHAT-DEBUG] Calling processCustomerMessage with companyId:', companyId);
      console.log('🔍🔍🔍 [TEST-CHAT-DEBUG] messageData.companyId:', messageData.companyId);
      aiResponse = await aiAgentService.processCustomerMessage(messageData);

      console.log('✅ [TEST-CHAT] AI response generated:', JSON.stringify({
        success: aiResponse?.success,
        hasContent: !!aiResponse?.content,
        contentLength: aiResponse?.content?.length,
        model: aiResponse?.model,
        silent: aiResponse?.silent,
        silentReason: aiResponse?.silentReason,
        error: aiResponse?.error,
        imagesCount: aiResponse?.images?.length || 0 // ✅ NEW
      }, null, 2));


      // ❌ REMOVED: Smart Suggestions feature - disabled by user request
      // (Previously generated reply suggestions using AI)

      // ✅ NEW: Get Extraction Status from OrderProcessor
      try {
        const memoryLimit = 20;
        const conversationMemory = await memoryService.getConversationMemory(
          conversationId,
          conversation.customerId,
          memoryLimit,
          companyId
        );
        extractedDetails = await aiAgentService.getOrderProcessor().extractOrderDetailsFromMemory(
          conversationMemory,
          companyId,
          message
        );
      } catch (extError) {
        console.error('⚠️ [TEST-CHAT] Extraction error:', extError);
      }

      // ✅ NEW: حفظ الصور من AI response
      if (aiResponse && aiResponse.images && aiResponse.images.length > 0) {
        aiResponseImages = aiResponse.images;
        console.log(`📸 [TEST-CHAT] AI returned ${aiResponseImages.length} images`);
      }

      // If AI generated a response, save it as a message
      if (aiResponse && aiResponse.success && aiResponse.content) {
        // ✅ تحديد نوع الرسالة بناءً على وجود الصور
        const messageType = aiResponseImages.length > 0 ? 'IMAGE' : 'TEXT';

        // ✅ NEW: Check if AI response message already exists (prevent duplicates)
        const existingAiMessage = await safeQuery(async () => {
          return await prisma.message.findFirst({
            where: {
              conversationId,
              content: aiResponse.content,
              isFromCustomer: false,
              createdAt: {
                gte: new Date(Date.now() - 5000) // Within last 5 seconds
              }
            },
            orderBy: { createdAt: 'desc' }
          });
        }, 3);

        if (existingAiMessage) {
          console.log('⚠️ [TEST-CHAT] Duplicate AI message detected, using existing:', existingAiMessage.id);
          aiResponseMessage = existingAiMessage;
        } else {
          aiResponseMessage = await safeQuery(async () => {
            return await prisma.message.create({
              data: {
                id: uuidv4(), // ✅ FIX: Add required id field
                conversationId,
                content: aiResponse.content,
                isFromCustomer: false,
                type: messageType, // ✅ FIXED: استخدام النوع الصحيح
                metadata: JSON.stringify({
                  aiGenerated: true,
                  model: aiResponse.model || null,
                  processingTime: aiResponse.processingTime || null,
                  confidence: aiResponse.confidence || null,
                  attachments: aiResponseImages.length > 0 ? aiResponseImages.map(img => ({
                    type: 'image',
                    url: img.payload?.url || img.url || img,
                    filename: img.payload?.title || 'product-image.jpg'
                  })) : undefined,
                  imageCount: aiResponseImages.length
                })
              }
            });
          }, 5);
        }

        // Update conversation with AI response
        await safeQuery(async () => {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessagePreview: aiResponse.content.substring(0, 100),
              lastMessageAt: new Date()
            }
          });
        }, 5);

        // ✅ NEW: إرسال socket event للـ real-time update
        try {
          const socketService = require('../services/socketService');
          const io = socketService.getIO();

          if (io && aiResponseMessage) {
            const socketData = {
              id: aiResponseMessage.id,
              conversationId: aiResponseMessage.conversationId,
              content: aiResponseMessage.content,
              type: aiResponseMessage.type.toLowerCase(),
              isFromCustomer: false,
              timestamp: aiResponseMessage.createdAt,
              metadata: aiResponseMessage.metadata ? JSON.parse(aiResponseMessage.metadata) : null,
              attachments: aiResponseImages.length > 0 ? aiResponseImages.map(img => ({
                type: 'image',
                url: img.payload?.url || img.url || img,
                filename: img.payload?.title || 'product-image.jpg'
              })) : undefined,
              lastMessageIsFromCustomer: false,
              lastCustomerMessageIsUnread: false,
              companyId: companyId,
              platform: 'test-chat',
              channel: 'TEST_CHAT'
            };

            // ✅ FIX: Disable Socket emission for Test Chat Controller to prevent duplication
            // The Test Chat Frontend ALREADY receives the message via the API response (res.json).
            // Emitting here causes the frontend to render it twice (once from API, once from Socket).
            /* 
            io.to(`company_${companyId}`).emit('new_message', socketData);
            console.log(`⚡ [TEST-CHAT-SOCKET] AI message emitted to company ${companyId}`, {
              messageId: socketData.id,
              conversationId: socketData.conversationId,
              content: socketData.content?.substring(0, 50)
            });
            */
            console.log(`⚡ [TEST-CHAT-SOCKET] Skipped socket emission to prevent UI duplication (handled by API response)`);
          }
        } catch (socketError) {
          console.error('⚠️ [TEST-CHAT] Failed to emit socket event:', socketError.message);
          // لا نوقف العملية إذا فشل socket - الرد محفوظ في قاعدة البيانات
        }
      }

      // ✅ NEW: Synchronize with Conversation Memory (Critical for RAG Context)
      if (aiResponseMessage) { // Only save if we actually sent a response
        try {
          await memoryService.saveInteraction({
            conversationId,
            senderId: conversation.customerId,
            companyId,
            userMessage: message,
            aiResponse: aiResponseMessage.content,
            intent: aiResponse?.intent || 'unknown',
            sentiment: aiResponse?.sentiment || 'neutral',
            timestamp: new Date()
          });
          console.log('💾 [TEST-CHAT] Memory synchronized successfully');
        } catch (memError) {
          console.error('⚠️ [TEST-CHAT] Failed to sync memory:', memError.message);
        }
      }
    } catch (aiError) {
      console.error('❌ [TEST-CHAT] Error generating AI response:', aiError);
      // ✅ FIX: حفظ الخطأ في aiResponse
      aiResponse = {
        success: false,
        error: aiError.message,
        silentReason: `خطأ في توليد الرد: ${aiError.message}`
      };
    }

    // ✅ تحديد حالة النظام الصامت
    const isSilent = aiResponse && (aiResponse.silent || aiResponse.silentReason || (!aiResponse.success && !aiResponse.content));

    // ✅ LOG: طباعة الـ response النهائي
    console.log('📤 [TEST-CHAT] Final response:', JSON.stringify({
      hasAiMessage: !!aiResponseMessage,
      aiMessageContent: aiResponseMessage?.content?.substring(0, 50),
      isSilent,
      aiResponseSuccess: aiResponse?.success,
      aiResponseError: aiResponse?.error,
      silentReason: aiResponse?.silentReason
    }, null, 2));

    res.json({
      success: true,
      data: {
        userMessage: {
          id: userMessage.id,
          content: userMessage.content,
          isFromCustomer: userMessage.isFromCustomer,
          type: userMessage.type,
          createdAt: userMessage.createdAt,
          metadata: userMessage.metadata ? JSON.parse(userMessage.metadata) : null
        },
        // ✅ FIX: إرسال aiMessage بدلاً من aiResponse للتوافق مع Frontend
        aiMessage: aiResponseMessage ? {
          id: aiResponseMessage.id,
          content: aiResponseMessage.content,
          isFromCustomer: aiResponseMessage.isFromCustomer,
          type: aiResponseMessage.type,
          createdAt: aiResponseMessage.createdAt,
          metadata: aiResponseMessage.metadata ? JSON.parse(aiResponseMessage.metadata) : null,
          images: aiResponseImages, // ✅ NEW: إضافة الصور للـ response
          aiResponseInfo: aiResponse ? {
            success: aiResponse.success,
            model: aiResponse.model || aiResponse.generationMetadata?.model,
            keyName: aiResponse.keyName || aiResponse.generationMetadata?.keyName,
            provider: aiResponse.provider || aiResponse.generationMetadata?.provider, // ✅ NEW
            agentMode: aiResponse.agentMode, // ✅ NEW: Agent Mode (LEGACY/MODERN)
            processingTime: aiResponse.processingTime || aiResponse.generationMetadata?.processingTime,
            imagesCount: aiResponseImages.length // ✅ NEW
          } : null
        } : null,
        // ✅ FIX: إضافة معلومات النظام الصامت
        aiResponse: {
          success: aiResponse?.success || false,
          silent: isSilent,
          silentReason: aiResponse?.silentReason || aiResponse?.error || (isSilent ? 'لم يتم توليد رد' : null),
          error: aiResponse?.error || null,
          model: aiResponse?.model || aiResponse?.generationMetadata?.model || null,
          keyName: aiResponse?.keyName || aiResponse?.generationMetadata?.keyName || null, // ✅ Add keyName properly
          provider: aiResponse?.provider || aiResponse?.generationMetadata?.provider || null, // ✅ NEW
          agentMode: aiResponse?.agentMode || null, // ✅ NEW
          processingTime: aiResponse?.processingTime || aiResponse?.generationMetadata?.processingTime || null,
          content: aiResponse?.content || null
        },
        // suggestions: [], // REMOVED
        extractedDetails // ✅ NEW
      }
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * Run quick test - إرسال أسئلة اختبار وتحليل النتائج
 */
exports.runQuickTest = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { questionCount = 8 } = req.body;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // إنشاء محادثة اختبار جديدة
    let customer = await safeQuery(async () => {
      return await prisma.customer.findFirst({
        where: { companyId, firstName: 'Test', lastName: 'User' }
      });
    }, 5);

    if (!customer) {
      customer = await safeQuery(async () => {
        await prisma.customer.create({
          data: {
            companyId,
            firstName: 'Test',
            lastName: 'User',
            email: `test-${Date.now()}@test.com`,
            phone: '0000000000'
          }
        });
      }, 5);
    }

    const conversation = await safeQuery(async () => {
      return await prisma.conversation.create({
        data: {
          companyId,
          customerId: customer.id,
          channel: 'TEST',
          status: 'ACTIVE',
          lastMessagePreview: 'Quick Test',
          lastMessageAt: new Date()
        }
      });
    }, 5);

    // أسئلة اختبار افتراضية
    const testQuestions = [
      'مرحبا',
      'عايز اعرف الاسعار',
      'ايه المنتجات المتاحة؟',
      'عندكم توصيل؟',
      'ازاي اطلب؟',
      'شكرا',
      'عايز اتكلم مع حد',
      'باي'
    ].slice(0, questionCount);

    const results = {
      totalQuestions: testQuestions.length,
      succeeded: 0,
      failed: 0,
      silent: 0,
      responses: []
    };

    // إرسال الأسئلة واحدة تلو الأخرى
    for (const question of testQuestions) {
      try {
        // حفظ رسالة المستخدم
        const userMessage = await safeQuery(async () => {
          return await prisma.message.create({
            data: {
              conversationId: conversation.id,
              content: question,
              isFromCustomer: true,
              type: 'TEXT',
              metadata: JSON.stringify({})
            }
          });
        }, 5);

        // توليد رد AI
        const messageData = {
          conversationId: conversation.id,
          senderId: customer.id,
          content: question,
          attachments: [],
          customerData: customer,
          companyId,
          timestamp: new Date()
        };

        const startTime = Date.now();
        const aiResponse = await aiAgentService.processCustomerMessage(messageData);
        const processingTime = Date.now() - startTime;

        if (aiResponse && aiResponse.success && aiResponse.content) {
          // حفظ رد AI
          await safeQuery(async () => {
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                content: aiResponse.content,
                isFromCustomer: false,
                type: 'TEXT',
                metadata: JSON.stringify({
                  aiGenerated: true,
                  model: aiResponse.model,
                  processingTime
                })
              }
            });
          }, 5);

          results.succeeded++;
          results.responses.push({
            question,
            response: aiResponse.content,
            model: aiResponse.model,
            processingTime,
            success: true
          });
        } else if (aiResponse?.silent || aiResponse?.silentReason) {
          results.silent++;
          results.responses.push({
            question,
            response: null,
            silent: true,
            silentReason: aiResponse.silentReason,
            success: false
          });
        } else {
          results.failed++;
          results.responses.push({
            question,
            response: null,
            error: aiResponse?.error || 'No response',
            success: false
          });
        }
      } catch (questionError) {
        results.failed++;
        results.responses.push({
          question,
          response: null,
          error: questionError.message,
          success: false
        });
      }

      // تأخير بسيط بين الأسئلة
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // تحديث المحادثة
    await safeQuery(async () => {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessagePreview: `اختبار سريع - ${results.succeeded}/${results.totalQuestions} نجح`,
          lastMessageAt: new Date()
        }
      });
    }, 5);

    // حساب الجودة
    const qualityCheck = {
      withResponse: results.succeeded,
      appropriate: results.succeeded,
      inappropriate: 0,
      averageProcessingTime: results.responses
        .filter(r => r.processingTime)
        .reduce((sum, r) => sum + r.processingTime, 0) / (results.succeeded || 1)
    };

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        results,
        qualityCheck
      }
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error running quick test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run quick test',
      error: error.message
    });
  }
};

/**
 * Analyze and fix - تحليل شامل للمشاكل
 */
exports.analyzeAndFix = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // جلب آخر محادثات الاختبار
    const testConversations = await safeQuery(async () => {
      return await prisma.conversation.findMany({
        where: { companyId, channel: 'TEST' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 10
      });
    }, 5);

    const analysis = {
      totalQuestions: 0,
      analyzed: 0,
      problems: [],
      fixes: [],
      improvements: [],
      summary: {
        successRate: 0,
        problemRate: 0
      },
      conversationId: testConversations[0]?.id || null
    };

    let successCount = 0;
    let problemCount = 0;

    for (const conv of testConversations) {
      const messages = conv.messages || [];

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        if (msg.isFromCustomer) {
          analysis.totalQuestions++;
          analysis.analyzed++;

          // البحث عن الرد التالي
          const nextMsg = messages[i + 1];

          if (nextMsg && !nextMsg.isFromCustomer) {
            successCount++;

            // فحص جودة الرد
            if (nextMsg.content.length < 10) {
              problemCount++;
              analysis.problems.push({
                question: msg.content,
                issue: 'رد قصير جداً',
                response: nextMsg.content
              });
              analysis.fixes.push({
                problem: 'رد قصير',
                suggestion: 'زيادة تفاصيل الرد'
              });
            }
          } else {
            problemCount++;
            analysis.problems.push({
              question: msg.content,
              issue: 'لا يوجد رد',
              response: null
            });
          }
        }
      }
    }

    // حساب النسب
    analysis.summary.successRate = analysis.totalQuestions > 0
      ? Math.round((successCount / analysis.totalQuestions) * 100)
      : 0;
    analysis.summary.problemRate = analysis.totalQuestions > 0
      ? Math.round((problemCount / analysis.totalQuestions) * 100)
      : 0;

    // اقتراحات التحسين
    if (analysis.summary.successRate < 80) {
      analysis.improvements.push('تحسين نسبة الردود الناجحة');
    }
    if (problemCount > 0) {
      analysis.improvements.push('مراجعة الأسئلة التي لم يتم الرد عليها');
    }

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error analyzing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze',
      error: error.message
    });
  }
};

/**
 * Delete a test conversation
 */
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // Verify conversation belongs to company
    const conversation = await safeQuery(async () => {
      return await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          companyId,
          channel: 'TEST' // Only allow deleting test conversations
        }
      });
    }, 10);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Test conversation not found'
      });
    }

    // Delete messages first
    await safeQuery(async () => {
      await prisma.message.deleteMany({
        where: { conversationId }
      });
    }, 5);

    // Delete conversation
    await safeQuery(async () => {
      await prisma.conversation.delete({
        where: { id: conversationId }
      });
    }, 5);

    res.json({
      success: true,
      message: 'Test conversation deleted successfully'
    });

  } catch (error) {
    console.error('❌ [TEST-CHAT] Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

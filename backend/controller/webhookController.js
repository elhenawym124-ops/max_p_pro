const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient, safeQuery, healthCheck } = require('../services/sharedDatabase');
const socketService = require('../services/socketService');
const { messageQueueManager } = require('../routes/queueRoutes');
const { updateConversationLastMessageStatus, resetConversationUnreadCount } = require('../utils/allFunctions');
const { isPermissionError, getPermissionErrorMessage } = require('../utils/dbPermissionHelper');

// ⚠️ CRITICAL: Always use safeQuery() instead of direct prisma calls
// This ensures proper connection management and retry logic
function getPrisma() {
  return getSharedPrismaClient();
}

// Simple in-memory storage for tracking processed messages
const processedMessages = new Map();
let lastWebhookPageId = null;

// ⚡ Cache for AI-generated messages (to mark them as AI when echo arrives)
const aiMessagesCache = new Map();
const AI_CACHE_DURATION = 60 * 1000; // 1 minute

// ⚡ Cache for Facebook pages to avoid repeated database queries
const facebookPagesCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ⚡ Cache for AI settings to check if AI is enabled
const aiSettingsCache = new Map();
const AI_SETTINGS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 2 min)

// ⚡ OPTIMIZED CHECK: Check cache first, then fetch from DB if needed
async function checkIfAIEnabled(companyId) {
  // Check cache first
  const cached = aiSettingsCache.get(companyId);
  if (cached && (Date.now() - cached.timestamp) < AI_SETTINGS_CACHE_DURATION) {
    return cached.autoReplyEnabled || false;
  }

  // Cache miss - fetch from database synchronously
  console.log(`⚠️ [AI-CACHE-MISS] Fetching AI settings from DB for company: ${companyId}`);

  try {
    const aiSettings = await safeQuery(async () => {
      const prisma = getPrisma();
      // ✅ Safety check: ensure prisma is initialized
      if (!prisma || !prisma.aiSetting) {
        console.warn('⚠️ [AI-SETTINGS] Prisma client not ready');
        return null;
      }
      return await prisma.aiSetting.findUnique({
        where: { companyId },
        select: { autoReplyEnabled: true }
      });
    }, 3); // 3 retries for reliability

    const isEnabled = aiSettings?.autoReplyEnabled || false;

    // Update cache
    aiSettingsCache.set(companyId, {
      autoReplyEnabled: isEnabled,
      timestamp: Date.now()
    });

    console.log(`✅ [AI-SETTINGS] Company ${companyId}: AI ${isEnabled ? 'ENABLED' : 'DISABLED'} (from DB)`);
    return isEnabled;

  } catch (error) {
    console.error(`❌ [AI-SETTINGS] Failed to load for company ${companyId}:`, error.message);
    // On error, default to false but don't cache error state
    return false;
  }
}

// ⚡ DEPRECATED: Legacy sync function - kept for compatibility but now just returns false
// Use checkIfAIEnabled (async) instead
function checkIfAIEnabledSync(companyId) {
  const cached = aiSettingsCache.get(companyId);
  if (cached && (Date.now() - cached.timestamp) < AI_SETTINGS_CACHE_DURATION) {
    return cached.autoReplyEnabled || false;
  }
  // Load in background for next time
  loadAISettingsInBackground(companyId).catch(() => { });
  // Return false for sync calls (legacy behavior)
  console.log(`⚠️ [AI-SYNC-CHECK] Sync check for ${companyId} - returning false (use async checkIfAIEnabled)`);
  return false;
}

// Load AI settings in background (for future messages)
async function loadAISettingsInBackground(companyId) {
  try {
    // ⚡ OPTIMIZATION: Use safeQuery for faster database access
    const aiSettings = await safeQuery(async () => {
      const prisma = getPrisma();
      // ✅ Safety check: ensure prisma is initialized
      if (!prisma || !prisma.aiSetting) {
        console.warn('⚠️ [AI-SETTINGS] Prisma client not ready, skipping AI settings load');
        return null;
      }
      return await prisma.aiSetting.findUnique({
        where: { companyId },
        select: { autoReplyEnabled: true }
      });
    }, 1); // ⚡ Only 1 retry for speed

    const isEnabled = aiSettings?.autoReplyEnabled || false;

    // Cache the result
    aiSettingsCache.set(companyId, {
      autoReplyEnabled: isEnabled,
      timestamp: Date.now()
    });

  } catch (error) {
    // Cache as disabled on error (safer default)
    aiSettingsCache.set(companyId, {
      autoReplyEnabled: false,
      timestamp: Date.now()
    });
  }
}

// ⚡ NEW: Pre-load AI settings on startup for all companies
async function preloadAISettingsForAllCompanies() {
  try {
    const prisma = getPrisma();
    const allCompanies = await prisma.company.findMany({
      select: { id: true }
    });


    // Load settings for all companies in parallel (but limit concurrency)
    const batchSize = 10;
    for (let i = 0; i < allCompanies.length; i += batchSize) {
      const batch = allCompanies.slice(i, i + batchSize);
      await Promise.all(
        batch.map(company => loadAISettingsInBackground(company.id))
      );
    }

  } catch (error) {
  }
}

// ⚡ Start pre-loading on module load (non-blocking)
// setImmediate(() => {
//   preloadAISettingsForAllCompanies().catch(() => { });
// });


// Function to get Facebook page with caching
async function getCachedFacebookPage(pageId) {
  const cached = facebookPagesCache.get(pageId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    // Using cached data
    return cached.data;
  }

  // Cache miss - fetching from database
  const pageData = await safeQuery(async () => {
    const prisma = getPrisma();
    return await prisma.facebookPage.findUnique({
      where: { pageId: pageId }
    });
  }, 2);

  if (pageData && pageData.status === 'connected') {
    //console.log(`✅ [PAGE-CACHE] Using connected page: ${pageData.pageName}`);
  }

  facebookPagesCache.set(pageId, {
    data: pageData,
    timestamp: Date.now()
  });

  return pageData;
}

// دالة للتحقق من صحة محتوى الرسالة
function isValidMessageContent(content) {
  if (!content) return false;
  const trimmed = content.trim();
  // تجاهل الرسائل الفارغة أو التي تحتوي فقط على علامات التوصيل أو مسافات
  if (trimmed.length === 0) return false;
  // تجاهل الرسائل التي تحتوي فقط على علامات ✓✗×
  if (/^[✓✗×\s]+$/.test(trimmed)) return false;
  return true;
}

// Auto-cleanup for processedMessages and cache to prevent memory leak
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleanedCount = 0;

  // Clean processed messages
  for (const [messageId, timestamp] of processedMessages.entries()) {
    if (timestamp < oneHourAgo) {
      processedMessages.delete(messageId);
      cleanedCount++;
    }
  }

  // Clean Facebook pages cache
  let cacheCleanedCount = 0;
  for (const [pageId, cached] of facebookPagesCache.entries()) {
    if ((Date.now() - cached.timestamp) > CACHE_DURATION) {
      facebookPagesCache.delete(pageId);
      cacheCleanedCount++;
    }
  }

  if (cleanedCount > 0 || cacheCleanedCount > 0) {
    //console.log(`🧹 [CLEANUP] Messages: ${cleanedCount}, Cache: ${cacheCleanedCount}`);
  }
}, 30 * 60 * 1000); // Every 30 minutes

const getWebhook = async (req, res) => {
  const VERIFY_TOKEN = 'simple_chat_verify_token_2025';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      //console.log('✅ Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      //console.log('❌ Webhook verification failed - token mismatch');
      res.sendStatus(403);
    }
  } else {
    //console.log('❌ Missing mode or token');
    res.sendStatus(400);
  }
}

const postWebhook = async (req, res) => {
  try {
    // CRITICAL: Respond to Facebook immediately (within 5 seconds)
    res.status(200).send('EVENT_RECEIVED');

    const body = req.body;

    // NEW: Skip processing entirely during DB cooldown to avoid log spam and futile retries
    try {
      const db = await healthCheck();
      if (db?.status === 'cooldown') {
        // Database is in cooldown; drop processing silently (response already sent)
        return;
      }
    } catch { /* ignore health check errors */ }

    // Validate request body
    if (!body || !body.entry) {
      //console.log('⚠️ [WEBHOOK] Invalid webhook body received');
      return;
    }

    // Check if webhook contains actual messages
    const hasActualMessages = body?.entry?.some(entry =>
      entry.messaging?.some(msg => msg.message?.text || msg.message?.attachments)
    );

    // Check if webhook contains feed events (which may include comments)
    const hasFeedEvents = body?.entry?.some(entry =>
      entry.changes?.some(change => change.field === 'feed' && change.value)
    );

    // 🔍 Check for referral BEFORE skipping
    const hasReferralAnywhere = body?.entry?.some(entry =>
      entry.messaging?.some(msg => msg.referral)
    );

    // 🆕 Check for read receipts (message_reads)
    const hasReadReceipts = body?.entry?.some(entry =>
      entry.messaging?.some(msg => msg.read?.watermark)
    );

    if (hasReferralAnywhere) {
    }

    // Skip logging for non-message events (delivery, etc.)
    // BUT: Don't skip if there's a referral or read receipts
    if (!hasActualMessages && !hasFeedEvents && !hasReferralAnywhere && !hasReadReceipts) {
      return;
    }

    if (body?.object === 'page') {
      // 🔍 Check if webhook contains referral data before processing
      const hasReferralInBody = body?.entry?.some(entry =>
        entry.messaging?.some(msg => msg.referral)
      );

      if (hasReferralInBody) {
      }

      // Process each entry in the webhook
      for (const entry of body?.entry || []) {
        try {

          // NEW: Check if this page still exists in our database AND is connected
          // If not, ignore the webhook event to prevent processing orphaned events
          // ⚡ Using cache to avoid repeated database queries
          const pageExists = await getCachedFacebookPage(entry.id);

          // 🔒 CRITICAL FIX: Check both existence AND connection status
          if (!pageExists) {
            //console.log(`⚠️ [WEBHOOK] Ignoring webhook event from unregistered page: ${entry.id}`);
            continue;
          }

          if (pageExists.status === 'disconnected') {
            //console.log(`⚠️ [WEBHOOK] Ignoring webhook event from DISCONNECTED page: ${pageExists.pageName} (${entry.id})`);
            // console.log(`   This page was disconnected at: ${pageExists.disconnectedAt}`);
            // console.log(`   Please unsubscribe this page from webhooks in Facebook settings`);
            continue;
          }

          // Save Page ID from webhook
          if (entry.id) {
            lastWebhookPageId = entry.id;
          }

          // Process messaging events (existing code)
          if (entry.messaging && entry.messaging.length > 0) {
            try {
              // ⚡ Process messages in parallel for better performance
              const messagePromises = entry.messaging.map(async (webhookEvent) => {
                try {

                  // 🆕 Handle read receipts (message_reads)
                  if (webhookEvent.read?.watermark) {
                    await handleReadReceipt(webhookEvent, entry.id);
                    return;
                  }

                  // Check if this is an echo message (sent from the page itself)
                  const isEchoMessage = webhookEvent.message?.is_echo === true;
                  const senderId = webhookEvent.sender?.id;
                  const recipientId = webhookEvent.message?.from?.id || webhookEvent.recipient?.id || entry.id;

                  // NEW: Store the page ID that received this message
                  // This is critical for replying correctly
                  const receivingPageId = entry.id;

                  // Debug logging
                  if (webhookEvent.message) {
                  }

                  // ✅ Handle echo messages (replies from page)
                  if (isEchoMessage) {
                    await handlePageReply(webhookEvent, receivingPageId);
                    return;
                  } else {
                  }

                  // 🆕 Extract postId from referral (fast - no API calls)
                  if (webhookEvent.referral) {

                    let postId = null;
                    // Extract post_id from different possible locations
                    if (webhookEvent.referral.ads_context_data?.post_id) {
                      postId = webhookEvent.referral.ads_context_data.post_id;
                    } else if (webhookEvent.referral.post_id) {
                      postId = webhookEvent.referral.post_id;
                    } else if (webhookEvent.referral.post_ref) {
                      postId = webhookEvent.referral.post_ref;
                    } else if (webhookEvent.referral.ad_ref) {
                      postId = webhookEvent.referral.ad_ref;
                    } else if (webhookEvent.referral.ad_id) {
                      // For ads, we can use ad_id as fallback
                      postId = webhookEvent.referral.ad_id;
                    } else {
                    }

                    // Attach postId to webhookEvent for use in handleMessage
                    if (postId) {
                      webhookEvent._extractedPostId = postId;
                    } else {
                    }
                  } else {
                    // Check if this message has a message object (to confirm it's being processed)
                    if (webhookEvent.message) {
                      // Don't log every regular message, just silently process
                    }
                  }

                  // Handle postback events (button clicks, etc.)
                  if (webhookEvent.postback) {
                    // يمكن إضافة معالجة إضافية هنا لاحقاً
                    return;
                  }

                  // 🎯 Customer message
                  //console.log(`📨 [MSG] ${webhookEvent.message?.mid?.slice(-8)} from ${senderId}`);

                  // Check for text message or referral (even without message text)
                  // Referral can come without message text (OPEN_THREAD event)
                  if (webhookEvent.referral) {
                    // Process referral event (even if no message text)
                    // If there's a message, process it normally
                    if (webhookEvent.message && webhookEvent.message.text) {
                      await handleMessage(webhookEvent, receivingPageId);
                    } else if (webhookEvent.message) {
                      // Non-text message (images, files, etc.)
                      const messageId = webhookEvent.message.mid;
                      if (processedMessages.has(messageId)) {
                        return;
                      }
                      processedMessages.set(messageId, Date.now());
                      await handleMessage(webhookEvent, receivingPageId);
                    } else {
                      // Referral without message - still process to create conversation
                      await handleMessage(webhookEvent, receivingPageId);
                    }
                  } else if (webhookEvent.message && webhookEvent.message.text) {
                    await handleMessage(webhookEvent, receivingPageId);
                  } else if (webhookEvent.message) {
                    // Non-text message (images, files, etc.)
                    const messageId = webhookEvent.message.mid;
                    if (processedMessages.has(messageId)) {
                      return;
                    }
                    processedMessages.set(messageId, Date.now());
                    await handleMessage(webhookEvent, receivingPageId);
                  }
                } catch (msgError) {
                  //console.error('❌ [WEBHOOK] Error processing message event:', msgError.message);
                }
              });

              // ⚡ Wait for all messages to be processed in parallel
              await Promise.all(messagePromises);
            } catch (messagingError) {
            }
          }

          // Process feed events (NEW CODE - includes comments, posts, etc.)
          if (entry.changes && entry.changes.length > 0) {
            try {
              for (const change of entry.changes) {
                try {
                  if (change.field === 'feed' && change.value) {
                    // Check if this is a comment event
                    if (change.value.item === 'comment') {
                      // NEW: Check if this comment is from our own page (our bot's reply)
                      if (isCommentFromOurPage(change.value, entry.id)) {
                        //console.log(`🤖 [COMMENT] Ignoring comment from our own page: ${change.value.comment_id}`);
                        continue;
                      }

                      await handleComment(change.value, entry.id);
                    }
                    // We can add more feed event types here in the future
                  }
                } catch (changeError) {
                  // Continue to next change instead of crashing
                }
              }
            } catch (feedError) {
              // Continue to next entry instead of crashing
            }
          }
        } catch (entryError) {
          // Continue to next entry instead of crashing
        }
      }
    }
  } catch (error) {
    // Already sent response to Facebook, so just log and continue
  }
}

// NEW: Function to handle Facebook page replies (echo messages)
async function handlePageReply(webhookEvent, pageId = null) {
  try {
    const messageId = webhookEvent.message?.mid;
    if (!messageId) {
      return;
    }

    const messageText = webhookEvent.message?.text || '';
    const hasAttachments = webhookEvent.message?.attachments && webhookEvent.message.attachments.length > 0;


    // ⚡ CRITICAL: Check if this echo message was already processed
    if (processedMessages.has(messageId)) {
      return;
    }

    // Mark as processed immediately to prevent duplicates
    processedMessages.set(messageId, Date.now());

    // Better extraction of recipient ID from echo messages
    // For echo messages, the recipient is actually the customer who receives the message
    const recipientId = webhookEvent.recipient?.id; // Customer who received the message
    const pageSenderId = webhookEvent.sender.id; // Page that sent the message

    // Processing page reply (already logged in postWebhook)

    // Validate that we have a recipient ID
    if (!recipientId) {
      //console.log(`⚠️ [PAGE-REPLY] No recipient ID found in webhook event`);
      return;
    }

    // ⚡ Get companyId from the Facebook page first - استخدام Cache
    // نحتاجه مبكراً لإرسال instant_echo للشركة الصحيحة
    const facebookPage = await getCachedFacebookPage(pageId);

    // ⚡ ULTRA-FAST ECHO: إرسال Socket event فوراً بعد جلب companyId
    // هذا يسمح للفرونت إند بعرض الرسالة فوراً بينما نحن نحفظها في الخلفية
    if (facebookPage && facebookPage.companyId) {
      try {
        const io = socketService.getIO();
        if (io) {
          // نرسل الرسالة مباشرة لمستخدمي الشركة فقط
          const instantEcho = {
            type: 'instant_echo',
            messageId: messageId,
            recipientId: recipientId,
            pageSenderId: pageSenderId,
            content: messageText || '📎 مرفق',
            timestamp: new Date(webhookEvent.timestamp),
            hasAttachments: hasAttachments,
            attachments: hasAttachments ? webhookEvent.message.attachments : null,
            isFromCustomer: false,
            // معلومات أولية - هيتم تحديثها لاحقاً
            isPending: true,
            needsConfirmation: true,
            // 🏢 Company Isolation
            companyId: facebookPage.companyId
          };

          // ✅ إرسال للشركة فقط - Company Isolation
          io.to(`company_${facebookPage.companyId}`).emit('instant_echo', instantEcho);
          //console.log(`⚡ [INSTANT-ECHO] Sent to company ${facebookPage.companyId}: ${messageId.slice(-8)}`);
        }
      } catch (instantError) {
        //console.error(`❌ [INSTANT-ECHO] Failed:`, instantError.message);
      }
    }

    // ⚡ Step 2 disabled for performance (manual message check)

    if (!facebookPage || !facebookPage.companyId) {
      return;
    }

    // Find the customer who received this message with BOTH facebookId AND companyId
    let customer = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.customer.findUnique({
        where: {
          customer_facebook_company: {
            facebookId: recipientId,
            companyId: facebookPage.companyId
          }
        }
      });
    }, 2); // ⚡ تقليل retries من 5 إلى 2 لتسريع Echo

    if (!customer) {
      //console.log(`⚠️ [PAGE-REPLY] Customer not found for Facebook ID: ${recipientId}`);
      // console.log(`🚫 [PAGE-REPLY] Skipping echo message - customer should exist from previous conversation`);

      // 📊 تسجيل الإحصائيات معطل مؤقتاً بسبب مشاكل الصلاحيات
      // TODO: إعادة تفعيل بعد إصلاح صلاحيات قاعدة البيانات

      return;
    }

    // Customer found

    // Find existing conversation for this customer
    let conversation = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.conversation.findFirst({
        where: {
          customerId: customer.id,
          status: { in: ['ACTIVE', 'RESOLVED'] }
        },
        orderBy: { lastMessageAt: 'desc' }
      });
    }, 2); // ⚡ تقليل retries من 5 إلى 2 لتسريع Echo

    // If no conversation exists, create one
    if (!conversation) {
      // Creating new conversation
      // Create a user-friendly preview for new conversation
      let initialPreview = messageText;
      if (hasAttachments && (!messageText || messageText.trim().length === 0)) {
        const attachment = webhookEvent.message.attachments[0];
        const attachmentType = attachment.type.toUpperCase();
        if (attachmentType === 'TEMPLATE') {
          initialPreview = '📋 رسالة منتج';
        } else if (attachmentType === 'IMAGE') {
          initialPreview = '📷 صورة';
        } else if (attachmentType === 'VIDEO') {
          initialPreview = '🎥 فيديو';
        } else if (attachmentType === 'FILE') {
          initialPreview = '📎 ملف';
        } else if (attachmentType === 'AUDIO') {
          initialPreview = '🎵 صوت';
        } else {
          initialPreview = `[${attachmentType}]`;
        }
      } else if (initialPreview && initialPreview.length > 100) {
        initialPreview = initialPreview.substring(0, 100) + '...';
      }

      conversation = await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.conversation.create({
          data: {
            customerId: customer.id,
            companyId: customer.companyId,
            channel: 'FACEBOOK',
            status: 'ACTIVE',
            lastMessageAt: new Date(webhookEvent.timestamp),
            lastMessagePreview: initialPreview
          }
        });
      }, 3);

      // Conversation created
    }

    // التحقق من صحة محتوى الرسالة قبل الحفظ
    // ✅ السماح بالرسائل التي تحتوي على attachments حتى بدون نص
    // ❌ رفض فقط الرسائل التي لا تحتوي على نص ولا attachments
    if (!isValidMessageContent(messageText) && !hasAttachments) {
      // 📊 تسجيل الإحصائيات معطل مؤقتاً بسبب مشاكل الصلاحيات
      // TODO: إعادة تفعيل بعد إصلاح صلاحيات قاعدة البيانات
      return; // Exit function without saving
    }

    // تحديد نوع الرسالة بناءً على المحتوى (يجب تحديده قبل فحص existingMessage)
    let messageType = 'TEXT';
    let messageContent = messageText;

    // إذا كانت الرسالة تحتوي على attachments فقط بدون نص
    if (hasAttachments && (!messageText || messageText.trim().length === 0)) {
      const attachment = webhookEvent.message.attachments[0];
      const attachmentType = attachment.type.toLowerCase();

      if (attachmentType === 'image') {
        messageType = 'IMAGE';
        messageContent = attachment.payload?.url || '[صورة]';
      } else if (attachmentType === 'video') {
        messageType = 'VIDEO';
        messageContent = attachment.payload?.url || '[فيديو]';
      } else if (attachmentType === 'audio') {
        messageType = 'AUDIO';
        messageContent = attachment.payload?.url || '[صوت]';
      } else if (attachmentType === 'file') {
        messageType = 'FILE';
        messageContent = attachment.payload?.url || '[ملف]';
      } else if (attachmentType === 'template') {
        // معالجة الرسائل التي تحتوي على أزرار (template)
        messageType = 'TEMPLATE';
        const template = attachment.payload;

        // استخراج المحتوى من template
        if (template?.template_type === 'generic' && template?.elements && template.elements.length > 0) {
          const element = template.elements[0];
          // استخدام عنوان العنصر أو النص كمحتوى
          messageContent = element.title || element.subtitle || element.image_url ||
            (element.buttons && element.buttons[0]?.url) ||
            '[رسالة منتج]';
        } else if (template?.template_type === 'button') {
          // رسالة مع أزرار فقط
          messageContent = template.text || '[رسالة مع أزرار]';
        } else {
          messageContent = '[رسالة template]';
        }
      } else if (attachmentType === 'fallback') {
        // بعض الرسائل تأتي كـ fallback
        messageType = 'FILE';
        messageContent = attachment.payload?.url || attachment.url || '[مرفق]';
      } else {
        // أي نوع آخر غير معروف
        messageType = attachment.type.toUpperCase();
        messageContent = attachment.payload?.url || `[${attachment.type}]`;
      }

      // إذا كان هناك أكثر من مرفق، نسجل ذلك
      if (webhookEvent.message.attachments.length > 1) {
      }
    }

    // ⚡ Check if this message is AI-generated
    const aiMetadata = aiMessagesCache.get(messageId);
    const isAIGenerated = !!aiMetadata;

    if (isAIGenerated) {
      //console.log(`🤖 [AI-ECHO] Detected AI-generated message: ${messageId.slice(-8)}`);
      // Clean up cache
      aiMessagesCache.delete(messageId);
    }

    // 🆕 FIX: قراءة معرف المرسل (الموظف) من conversation metadata
    let senderUserId = null; // معرف الموظف (User.id)
    let senderUserName = null; // اسم الموظف

    //console.log(`🔍 [ECHO-DEBUG] Conversation metadata exists: ${!!conversation.metadata}`);

    try {
      if (conversation.metadata) {
        let convMetadata = {};
        try {
          convMetadata = JSON.parse(conversation.metadata);
          // console.log(`📝 [ECHO-DEBUG] Parsed conversation metadata:`, JSON.stringify(convMetadata));
        } catch (parseError) {
          convMetadata = {};
        }

        if (convMetadata.lastSenderId) {
          senderUserId = convMetadata.lastSenderId;
          senderUserName = convMetadata.lastSenderName || 'موظف';
          // console.log(`👤 [ECHO-SENDER] Using sender from metadata: ${senderUserName} (${senderUserId})`);
        } else {
          // console.warn(`⚠️ [ECHO-SENDER] No lastSenderId found in conversation metadata`);
        }
      } else {
        // console.warn(`⚠️ [ECHO-SENDER] No metadata found in conversation`);
      }
    } catch (e) {
    }

    // 📊 تحديد نوع الرسالة والمحتوى قبل فحص existingMessage (يستخدم في حالة existingMessage)
    let statMessageType = messageType;
    let statMessageContent = messageContent;

    // 🔍 CRITICAL: Check if message already exists (instant save or broadcast)
    const existingMessage = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          OR: [
            {
              metadata: {
                contains: messageId // Check if facebookMessageId exists in metadata
              }
            },
            {
              // Check if this is an instant-saved message matching content and timestamp
              isFromCustomer: false,
              content: hasAttachments ? { contains: messageText || '' } : messageText,
              type: hasAttachments ? webhookEvent.message.attachments[0].type.toUpperCase() : 'TEXT',
              createdAt: {
                // Match messages within 10 seconds
                gte: new Date(webhookEvent.timestamp - 10000),
                lte: new Date(webhookEvent.timestamp + 10000)
              }
            }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }, 3);

    if (existingMessage) {

      // تحديث الرسالة الموجودة بـ Facebook Message ID إذا لم يكن موجود
      try {
        const existingMetadata = JSON.parse(existingMessage.metadata || '{}');
        if (!existingMetadata.facebookMessageId) {
          await safeQuery(async () => {
            const prisma = getPrisma();
            return await prisma.message.update({
              where: { id: existingMessage.id },
              data: {
                metadata: JSON.stringify({
                  ...existingMetadata,
                  facebookMessageId: messageId,
                  echoReceived: true,
                  echoTimestamp: new Date(webhookEvent.timestamp)
                })
              }
            });
          }, 3);
        }
      } catch (updateError) {
      }

      // 📊 تسجيل الإحصائيات معطل مؤقتاً بسبب مشاكل الصلاحيات
      // TODO: إعادة تفعيل بعد إصلاح صلاحيات قاعدة البيانات

      return; // Exit early to prevent duplicate
    }

    // Resolve reply_to reference if present (customer replied to a specific message)
    const replyToMid = webhookEvent.message?.reply_to?.mid;
    let replyMeta = {};
    if (replyToMid) {
      try {
        const parentMsg = await safeQuery(async () => {
          const prisma = getPrisma();
          return await prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              metadata: { contains: replyToMid }
            },
            orderBy: { createdAt: 'desc' }
          });
        }, 3);
        if (parentMsg) {
          const snippet = parentMsg.type === 'IMAGE' ? '📷 صورة' : parentMsg.type === 'FILE' ? '📎 ملف' : (parentMsg.content || '').substring(0, 80);
          replyMeta = {
            replyToResolvedMessageId: parentMsg.id,
            replyToContentSnippet: snippet,
            replyToSenderIsCustomer: !!parentMsg.isFromCustomer,
            replyToType: parentMsg.type
          };
        }
      } catch (e) {
        // ignore errors
      }
    }

    // Save the page reply as a message in the existing conversation
    const pageReplyMessage = await safeQuery(async () => {
      const prisma = getPrisma();

      // ✅ FIX: Check if message already exists (created by AI Agent)
      // We look for a message in this conversation with the same content and recent timestamp
      // OR matching metadata if possible.
      // Since AI agent saves message with 'sent' status and specific metadata, we should try to deduplicate.

      // Dedup logic: Find message from PAGE (senderId=employeeId/pageId) with same content created in last 60 seconds
      // ⚡ Wide window (60s) to handle slow webhooks or clock skew
      const existingMessage = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          isFromCustomer: false,
          content: messageContent, // Prisma exact match
          createdAt: {
            gt: new Date(Date.now() - 60000) // 60 seconds window
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fallback: If no exact match, try partial match for AI messages that might have varied slightly (whitespace)
      // Only do this if we suspect it's an AI echo (senderUserId matches page or similar)
      let matchedMessage = existingMessage;

      if (!matchedMessage) {
        const recentMessages = await prisma.message.findMany({
          where: {
            conversationId: conversation.id,
            isFromCustomer: false,
            createdAt: { gt: new Date(Date.now() - 60000) }
          }
        });

        // Fuzzy match: content includes or is included by messageContent (ignoring whitespace)
        const cleanNew = messageContent.trim();
        matchedMessage = recentMessages.find(m => {
          const cleanOld = (m.content || '').trim();
          return cleanOld === cleanNew || (cleanOld.length > 10 && cleanNew.includes(cleanOld));
        });
      }

      if (matchedMessage) {
        console.log(`♻️ [WEBHOOK] Duplicate Echo detected. Updating Msg ID ${matchedMessage.id}`);
        // Update the existing message with FB Message ID and confirm delivery
        return await prisma.message.update({
          where: { id: matchedMessage.id },
          data: {
            metadata: JSON.stringify({
              ...JSON.parse(matchedMessage.metadata || '{}'),
              facebookMessageId: messageId, // Update info
              echoConfirmed: true
            }),
            // Ensure it's marked as from page (should be already)
          }
        });
      }

      // If not found, create new (Standard behavior for manual replies or business suite)
      return await prisma.message.create({
        data: {
          id: uuidv4(),
          content: messageContent,
          type: messageType,
          conversationId: conversation.id,
          isFromCustomer: false, // This is from the page, not the customer
          senderId: senderUserId, // 🆕 FIX: حفظ معرف الموظف الذي أرسل الرسالة
          attachments: hasAttachments ? JSON.stringify(webhookEvent.message.attachments) : null,
          metadata: JSON.stringify({
            platform: 'facebook',
            source: isAIGenerated ? 'ai_agent' : 'page_reply',
            senderId: pageSenderId, // Facebook page ID
            employeeId: senderUserId, // 🆕 معرف الموظف
            employeeName: senderUserName, // 🆕 اسم الموظف
            recipientId: recipientId,
            isFacebookReply: true, // Mark as Facebook page reply
            facebookMessageId: messageId, // Store the Facebook message ID
            replyToFacebookMessageId: replyToMid,
            hasAttachments: hasAttachments,
            timestamp: new Date(webhookEvent.timestamp),
            // ⚡ Add AI metadata if available
            ...(isAIGenerated && aiMetadata ? {
              isAIGenerated: true,
              intent: aiMetadata.intent,
              sentiment: aiMetadata.sentiment,
              confidence: aiMetadata.confidence,
              // ✅ Add rich metadata for UI
              keyName: aiMetadata.keyName,
              model: aiMetadata.model,
              processingTime: aiMetadata.processingTime,
              provider: aiMetadata.provider
            } : {}),
            ...replyMeta
          }),
          createdAt: new Date(webhookEvent.timestamp),
          updatedAt: new Date(webhookEvent.timestamp) // ✅ FIX: Add required updatedAt field
        }
      });
    }, 2); // ⚡ تقليل retries من 5 إلى 2 لتسريع Echo

    // 📊 تسجيل الإحصائيات معطل مؤقتاً بسبب مشاكل الصلاحيات
    // TODO: إعادة تفعيل بعد إصلاح صلاحيات قاعدة البيانات

    // 🆕 Update lastMessageIsFromCustomer (this is a page reply, so false)
    await updateConversationLastMessageStatus(conversation.id, false);

    // تنظيف الـ metadata بعد حفظ الرسالة
    if (senderUserId) {
      try {
        // Safely parse metadata - use empty object if parsing fails
        let convMetadata = {};
        try {
          if (conversation.metadata) {
            convMetadata = JSON.parse(conversation.metadata);
          }
        } catch (parseError) {
          convMetadata = {};
        }

        delete convMetadata.lastSenderId;
        delete convMetadata.lastSenderName;

        await safeQuery(async () => {
          const prisma = getPrisma();
          return await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: JSON.stringify(convMetadata)
            }
          });
        }, 3);
      } catch (e) {
      }
    }

    // ⚡ Emit confirmation Socket.IO event (الرسالة اتحفظت بنجاح)
    const io = socketService.getIO();
    if (io) {
      try {
        const parsedMetadata = JSON.parse(pageReplyMessage.metadata);
        const socketData = {
          id: pageReplyMessage.id,
          conversationId: pageReplyMessage.conversationId,
          content: pageReplyMessage.content,
          type: pageReplyMessage.type.toLowerCase(),
          isFromCustomer: pageReplyMessage.isFromCustomer,
          timestamp: pageReplyMessage.createdAt,
          metadata: parsedMetadata,
          attachments: pageReplyMessage.attachments, // Keep as string for frontend to parse
          isFacebookReply: true, // Mark as Facebook page reply for frontend
          facebookMessageId: messageId, // Include Facebook message ID
          // ⚡ Add isAiGenerated flag for frontend styling
          isAiGenerated: parsedMetadata.isAIGenerated || false,
          // 🆕 Add flags for unread tab filtering
          lastMessageIsFromCustomer: pageReplyMessage.isFromCustomer,
          lastCustomerMessageIsUnread: pageReplyMessage.isFromCustomer && !pageReplyMessage.isRead,
          // ✅ Flag للتأكيد - Frontend يستبدل الرسالة المؤقتة بهذه
          isConfirmed: true,
          isPending: false,
          // 🏢 Company Isolation
          companyId: facebookPage.companyId,
          // 📱 Platform identification for filtering
          platform: 'facebook',
          channel: 'FACEBOOK'
        };

        // ✅ إرسال event تأكيد منفصل مع عزل الشركة
        io.to(`company_${facebookPage.companyId}`).emit('echo_confirmed', socketData);
        io.to(`company_${facebookPage.companyId}`).emit('new_message', socketData);
        //console.log(`✅ [ECHO-CONFIRMED] ${messageId.slice(-8)} -> Conv ${conversation.id}`);
      } catch (socketError) {
        // Don't throw - message is already saved
      }
    } else {
      //console.log(`❌ [PAGE-REPLY] Socket.IO not available - message saved but not broadcast`);
    }

    // Update conversation last message
    // Create a user-friendly preview based on message type
    let preview = messageContent;
    if (messageType === 'TEMPLATE') {
      preview = '📋 رسالة منتج';
    } else if (messageType === 'IMAGE') {
      preview = '📷 صورة';
    } else if (messageType === 'VIDEO') {
      preview = '🎥 فيديو';
    } else if (messageType === 'FILE') {
      preview = '📎 ملف';
    } else if (messageType === 'AUDIO') {
      preview = '🎵 صوت';
    } else if (preview && preview.length > 100) {
      preview = preview.substring(0, 100) + '...';
    }

    // Sanitize preview to prevent hex escape errors
    if (preview) {
      // Remove any problematic characters that could cause hex escape issues
      preview = preview.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
      preview = preview.replace(/\\x[0-9A-Fa-f]{0,1}(?![0-9A-Fa-f])/g, ''); // Remove incomplete hex escapes like \x0 or \x
      preview = preview.replace(/\\x(?![0-9A-Fa-f]{2})/g, ''); // Remove \x not followed by 2 hex digits
      preview = preview.replace(/[\uD800-\uDFFF]/g, ''); // Remove lone surrogates
      preview = preview.replace(/\\/g, '\\\\'); // Escape remaining backslashes
      // Trim and ensure it's a valid string
      preview = preview.trim();
      // Final safety: if still problematic, use a safe fallback
      try {
        JSON.stringify(preview); // Test if it can be serialized
      } catch (e) {
        console.warn('⚠️ [PREVIEW] Failed to serialize preview, using fallback');
        preview = '[رسالة]'; // Safe fallback
      }
    }

    try {
      await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(webhookEvent.timestamp),
            lastMessagePreview: preview || ''
          }
        });
      }, 3);
    } catch (updateError) {
      // Don't throw - this is non-critical, message is already saved
    }

    // Processing completed

  } catch (error) {
  }
}

// NEW: Function to check if a comment is from our own page
function isCommentFromOurPage(commentData, pageId) {
  try {
    // PRIMARY CHECK: If sender ID matches page ID, this is definitely our own comment
    if (commentData.from?.id === pageId) {
      // console.log(`🤖 [COMMENT] Detected our own comment by sender ID match: ${commentData.comment_id}`);
      return true;
    }

    // SECONDARY CHECK: If the comment text matches our standard response
    // We'll check against a more generic pattern since responses can be customized
    if (commentData.message.includes("Thank you for your comment") ||
      commentData.message.includes("We'll get back to you soon")) {
      // console.log(`🤖 [COMMENT] Detected our standard response pattern: ${commentData.comment_id}`);
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

// Simplified message handling function with QUEUE SYSTEM
async function handleMessage(webhookEvent, pageId = null) {
  const startTime = Date.now();
  const messageId = webhookEvent.message?.mid || `msg_${Date.now()}`;
  try {
    const senderId = webhookEvent.sender.id;
    // 🆕 Handle referral events without message object (OPEN_THREAD events)
    const messageText = webhookEvent.message?.text || null;
    const attachments = webhookEvent.message?.attachments || null;
    const hasReferral = !!webhookEvent.referral;

    // Extract the recipient page ID from the webhook event
    const recipientPageId = webhookEvent.recipient?.id || pageId;

    // ⚡ DEBUG: Log immediately with timestamp

    // ⚡ OPTIMIZATION: Prepare message data immediately
    const messageData = {
      senderId,
      messageText: messageText || (hasReferral ? '[referral]' : '[attachment]'),
      webhookEvent,
      pageId: recipientPageId,
      timestamp: Date.now()
    };

    // ⚡ Get companyId asynchronously (don't block) - use cache first if available
    const cached = facebookPagesCache.get(recipientPageId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      // ⚡ Fast path: Use cached data immediately
      const facebookPage = cached.data;
      if (facebookPage && facebookPage.companyId) {
        const companyId = facebookPage.companyId;

        // ⚡ Pre-load AI settings in background for faster future checks
        loadAISettingsInBackground(companyId).catch(() => { });

        // 🆕 For referral events without message, process directly (don't queue)
        if (hasReferral && !webhookEvent.message) {
          const { handleFacebookMessage } = require('../utils/allFunctions');
          handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
          });
          return;
        }

        // ⚡ INSTANT PREVIEW: إرسال إشعار فوري للفرونت إند قبل المعالجة
        try {
          const io = socketService.getIO();
          if (io) {
            const instantPreview = {
              type: 'message_preview',
              senderId: senderId,
              content: messageText || (hasReferral ? '📌 جاي من منشور' : '📎 مرفق'),
              timestamp: new Date(),
              companyId: companyId,
              pageId: recipientPageId,
              isProcessing: true
            };
            io.to(`company_${companyId}`).emit('message_preview', instantPreview);
          }
        } catch (previewError) {
          // Ignore preview errors
        }

        // ⚡ CRITICAL FIX: Fast sync check - if AI disabled or not in cache, process directly
        const aiEnabled = checkIfAIEnabledSync(companyId);

        if (!aiEnabled) {
          // ⚡ AI معطل = معالجة فورية تماماً بدون أي صف
          const { handleFacebookMessage } = require('../utils/allFunctions');
          // ⚡ CRITICAL: Process immediately without any delay
          // Don't use setImmediate - process NOW to avoid any delay
          handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
          });
          // ⚡ NOTE: loadAISettingsInBackground already called in checkIfAIEnabledSync
        } else {
          // ⏱️ AI مفعّل = استخدم الصف
          const queueStartTime = Date.now();
          messageQueueManager.addToQueue(senderId, messageData, companyId).then(() => {
          }).catch(error => {
          });
        }
        return;
      }
    }

    // ⚡ Slow path: Fetch from database (non-blocking)
    getCachedFacebookPage(recipientPageId).then(facebookPage => {
      if (!facebookPage || !facebookPage.companyId) {
        // Fallback to direct processing
        const { handleFacebookMessage } = require('../utils/allFunctions');
        handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
        });
        return;
      }

      const companyId = facebookPage.companyId;

      // ⚡ Pre-load AI settings in background for faster future checks
      loadAISettingsInBackground(companyId).catch(() => { });

      // 🆕 For referral events without message, process directly (don't queue)
      if (hasReferral && !webhookEvent.message) {
        const { handleFacebookMessage } = require('../utils/allFunctions');
        // ⚡ CRITICAL: Use setImmediate to process in next tick (non-blocking)
        setImmediate(() => {
          handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
          });
        });
        return;
      }

      // ⚡ INSTANT PREVIEW: إرسال إشعار فوري للفرونت إند قبل المعالجة
      try {
        const io = socketService.getIO();
        if (io) {
          const instantPreview = {
            type: 'message_preview',
            senderId: senderId,
            content: messageText || (hasReferral ? '📌 جاي من منشور' : '📎 مرفق'),
            timestamp: new Date(),
            companyId: companyId,
            pageId: recipientPageId,
            isProcessing: true // علامة أن الرسالة قيد المعالجة
          };

          // إرسال للشركة فقط
          io.to(`company_${companyId}`).emit('message_preview', instantPreview);
          // console.log(`⚡ [INSTANT] Preview sent to company ${companyId}`);
        }
      } catch (previewError) {
        // لا نوقف المعالجة إذا فشل الإرسال الفوري
        // console.warn(`⚠️ [INSTANT] Preview failed:`, previewError.message);
      }

      // ⚡ CRITICAL FIX: Fast sync check - if AI disabled or not in cache, process directly
      const aiEnabled = checkIfAIEnabledSync(companyId);

      if (!aiEnabled) {
        // ⚡ AI معطل = معالجة فورية تماماً بدون أي صف
        const { handleFacebookMessage } = require('../utils/allFunctions');
        // ⚡ CRITICAL: Process immediately without any delay
        // Don't use setImmediate - process NOW to avoid any delay
        handleFacebookMessage(webhookEvent, recipientPageId).catch(error => {
        });
        // ⚡ NOTE: loadAISettingsInBackground already called in checkIfAIEnabledSync
      } else {
        // ⏱️ AI مفعّل = استخدم الصف
        messageQueueManager.addToQueue(senderId, messageData, companyId).catch(error => {
        });
      }
    }).catch(error => {
      // Fallback to direct processing
      const { handleFacebookMessage } = require('../utils/allFunctions');
      handleFacebookMessage(webhookEvent, recipientPageId).catch(fallbackError => {
      });
    });

  } catch (error) {

    // Fallback to direct processing if queue fails
    try {
      const recipientPageId = webhookEvent.recipient?.id || pageId;
      const { handleFacebookMessage } = require('../utils/allFunctions');
      await handleFacebookMessage(webhookEvent, recipientPageId);
    } catch (fallbackError) {
    }
  }
}

// NEW: Function to handle Facebook comments
async function handleComment(commentData, pageId = null) {
  try {

    // 🤖 Call the proper AI processing function for comments
    const { handleFacebookComment } = require('../utils/allFunctions');
    await handleFacebookComment(commentData, pageId);

  } catch (error) {
  }
}

// Simple function to send response to Facebook
async function sendFacebookResponse(recipientId, messageText) {
  try {
    // Implementation would go here
  } catch (error) {
  }
}

// ⚡ Function to mark a message as AI-generated (called from allFunctions.js)
function markMessageAsAI(facebookMessageId, aiMetadata) {
  if (facebookMessageId) {
    aiMessagesCache.set(facebookMessageId, {
      ...aiMetadata,
      timestamp: Date.now()
    });
  }
}

// Function to invalidate AI settings cache (called when AI settings are updated)
function invalidateAISettingsCache(companyId) {
  if (aiSettingsCache.has(companyId)) {
    aiSettingsCache.delete(companyId);
  }
}

// 🆕 Handle read receipts (message_reads) from Facebook
async function handleReadReceipt(webhookEvent, pageId) {
  try {
    const senderId = webhookEvent.sender?.id; // Customer who read the messages
    const watermark = webhookEvent.read?.watermark; // Timestamp of last read message

    if (!senderId || !watermark) {
      return;
    }


    // Get the Facebook page to find companyId
    const facebookPage = await getCachedFacebookPage(pageId);
    if (!facebookPage || !facebookPage.companyId) {
      return;
    }

    // Find the conversation for this customer
    const conversation = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.conversation.findFirst({
        where: {
          companyId: facebookPage.companyId,
          customer: {
            facebookId: senderId
          }
        },
        select: { id: true }
      });
    }, 1);

    if (!conversation) {
      return;
    }

    // Update all messages sent before watermark to 'read' status
    let updatedCount = 0;
    try {
      updatedCount = await safeQuery(async () => {
        const prisma = getPrisma();
        const result = await prisma.message.updateMany({
          where: {
            conversationId: conversation.id,
            isFromCustomer: false,
            isRead: false, // Only update unread messages
            createdAt: { lte: new Date(watermark) }
          },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
        return result.count;
      }, 1);
    } catch (updateError) {
      if (isPermissionError(updateError)) {
        // Silently handle permission errors - they're expected if DB user lacks UPDATE permissions
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [DB-PERMISSION] Cannot mark messages as read: ${getPermissionErrorMessage(updateError)}`);
        }
        updatedCount = 0;
      } else {
        throw updateError;
      }
    }

    if (updatedCount > 0) {

      // Emit socket event to update frontend
      const io = socketService.getIO();
      if (io) {
        io.to(`company_${facebookPage.companyId}`).emit('messages_read', {
          conversationId: conversation.id,
          customerId: senderId,
          watermark: watermark,
          readAt: new Date()
        });
      }
    }
  } catch (error) {
  }
}

module.exports = { getWebhook, postWebhook, markMessageAsAI, invalidateAISettingsCache, handleReadReceipt };
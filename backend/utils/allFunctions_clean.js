// Imports and required modules
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { securityMonitor } = require('../middleware/securityMonitor');
const fetch = require('node-fetch');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Global variables
const processedMessages = new Map();
const pageTokenCache = new Map();
let lastWebhookPageId = null;

class MessageQueueManager {
  constructor() {
    this.processingCustomers = new Set();
    this.customerQueues = new Map();
    this.batchTimers = new Map(); // مؤقتات التجميع
    this.BATCH_WAIT_TIME = 5000; // 5 ثواني انتظار افتراضي
    this.companyBatchSettings = new Map(); // إعدادات خاصة بكل شركة
  }

  /**
   * الحصول على إعدادات الطابور لشركة معينة
   */
  async getCompanyQueueSettings(companyId) {
    // التحقق من الكاش أولاً
    if (this.companyBatchSettings.has(companyId)) {
      const cached = this.companyBatchSettings.get(companyId);
      // إعادة تحميل كل 5 دقائق
      if (Date.now() - cached.lastUpdated < 5 * 60 * 1000) {
        return cached.settings;
      }
    }

    try {
      // محاولة قراءة الإعدادات من قاعدة البيانات
      const aiSettings = await getSharedPrismaClient().aiSettings.findUnique({
        where: { companyId },
        select: { queueSettings: true }
      });

      let settings = {
        batchWaitTime: 5000,
        enabled: true,
        maxBatchSize: 10
      };

      if (aiSettings && aiSettings.queueSettings) {
        const parsedSettings = typeof aiSettings.queueSettings === 'string'
          ? JSON.parse(aiSettings.queueSettings)
          : aiSettings.queueSettings;

        settings = {
          ...settings,
          ...parsedSettings
        };
      }

      // حفظ في الكاش
      this.companyBatchSettings.set(companyId, {
        settings,
        lastUpdated: Date.now()
      });

      //console.log(`🔧 [ADAPTIVE-QUEUE] Loaded queue settings for company ${companyId}:`, settings);
      return settings;

    } catch (error) {
      console.error(`❌ [ADAPTIVE-QUEUE] Failed to load queue settings for company ${companyId}:`, error);

      // الإعدادات الافتراضية في حالة الخطأ
      const defaultSettings = {
        batchWaitTime: 5000,
        enabled: true,
        maxBatchSize: 10
      };

      // حفظ الإعدادات الافتراضية في الكاش
      this.companyBatchSettings.set(companyId, {
        settings: defaultSettings,
        lastUpdated: Date.now()
      });

      return defaultSettings;
    }
  }

  /**
   * إضافة رسالة لقائمة الانتظار مع التجميع التكيفي
   */
  async addToQueue(customerId, messageData, companyId) {
    if (!this.customerQueues.has(customerId)) {
      this.customerQueues.set(customerId, []);
    }

    const queue = this.customerQueues.get(customerId);
    queue.push({
      ...messageData,
      queuedAt: Date.now(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId
    });

    //console.log(`📥 [ADAPTIVE-QUEUE] Added message to queue for customer ${customerId}. Queue length: ${queue.length}`);

    // الحصول على إعدادات الشركة
    const queueSettings = await this.getCompanyQueueSettings(companyId);
    const batchWaitTime = queueSettings.enabled ? queueSettings.batchWaitTime : 0;

    // إلغاء المؤقت السابق إذا كان موجوداً
    if (this.batchTimers.has(customerId)) {
      clearTimeout(this.batchTimers.get(customerId));
      //console.log(`⏰ [ADAPTIVE-QUEUE] Cancelled previous timer for customer ${customerId}`);
    }

    if (batchWaitTime > 0 && queueSettings.enabled) {
      // بدء مؤقت جديد للتجميع
      const timer = setTimeout(() => {
        //console.log(`⏰ [ADAPTIVE-QUEUE] Batch timer expired for customer ${customerId} (${batchWaitTime}ms), processing ${queue.length} messages`);
        this.processBatch(customerId);
      }, batchWaitTime);

      this.batchTimers.set(customerId, timer);
      //console.log(`⏰ [ADAPTIVE-QUEUE] Started ${batchWaitTime}ms batch timer for customer ${customerId}`);
    } else {
      // معالجة فورية إذا كان النظام معطل
      //console.log(`⚡ [ADAPTIVE-QUEUE] Queue system disabled, processing immediately for customer ${customerId}`);
      setTimeout(() => this.processBatch(customerId), 100); // تأخير بسيط لتجنب التداخل
    }

    return queue.length;
  }

  /**
   * معالجة مجموعة الرسائل المجمعة
   */
  async processBatch(customerId) {
    if (this.processingCustomers.has(customerId)) {
      //console.log(`⚠️ [ADAPTIVE-QUEUE] Customer ${customerId} already being processed`);
      return;
    }

    const queue = this.customerQueues.get(customerId);
    if (!queue || queue.length === 0) {
      return;
    }

    // تنظيف المؤقت
    if (this.batchTimers.has(customerId)) {
      clearTimeout(this.batchTimers.get(customerId));
      this.batchTimers.delete(customerId);
    }

    this.processingCustomers.add(customerId);
    //console.log(`🔄 [ADAPTIVE-QUEUE] Starting batch processing for customer ${customerId}. ${queue.length} messages in batch`);

    // مهلة زمنية قصوى للمعالجة (5 دقائق)
    const MAX_PROCESSING_TIME = 5 * 60 * 1000;
    const processingTimeout = setTimeout(() => {
      console.error(`⏰ [ADAPTIVE-QUEUE] Processing timeout for customer ${customerId} - forcing cleanup`);
      this.processingCustomers.delete(customerId);
      this.customerQueues.delete(customerId);
      this.batchTimers.delete(customerId);
    }, MAX_PROCESSING_TIME);

    try {
      if (queue.length === 1) {
        // رسالة واحدة فقط - معالجة عادية
        //console.log(`📨 [ADAPTIVE-QUEUE] Single message processing for customer ${customerId}`);
        const messageData = queue.shift();
        await this.processSingleMessage(messageData);
      } else {
        // رسائل متعددة - معالجة كمجموعة
        //console.log(`📨 [ADAPTIVE-QUEUE] Batch processing ${queue.length} messages for customer ${customerId}`);
        await this.processBatchedMessages(customerId, [...queue]);
        queue.length = 0; // تفريغ الطابور
      }
    } catch (error) {
      console.error(`❌ [ADAPTIVE-QUEUE] Error in batch processing for customer ${customerId}:`, error);
    } finally {
      clearTimeout(processingTimeout);
      this.processingCustomers.delete(customerId);
      this.customerQueues.delete(customerId);
      //console.log(`✅ [ADAPTIVE-QUEUE] Finished batch processing for customer ${customerId}`);
    }
  }

  /**
   * معالجة مجموعة من الرسائل المجمعة كسياق واحد
   */
  async processBatchedMessages(customerId, messages) {
    //console.log(`🔗 [BATCH-PROCESSING] Processing ${messages.length} batched messages for customer ${customerId}`);

    // دمج الرسائل في سياق واحد
    const batchedContent = messages.map((msg, index) => {
      return `[${index + 1}] ${msg.messageText}`;
    }).join(' | ');

    //console.log(`📝 [BATCH-PROCESSING] Combined message: "${batchedContent}"`);

    // إرسال رد سريع للإشعار بالمعالجة
    try {
      await this.sendQuickAcknowledgment(customerId, messages.length);
    } catch (ackError) {
      console.warn(`⚠️ [BATCH-PROCESSING] Failed to send acknowledgment:`, ackError.message);
    }

    // معالجة الرسائل المجمعة كرسالة واحدة
    const combinedWebhookEvent = {
      ...messages[0].webhookEvent,
      message: {
        ...messages[0].webhookEvent.message,
        text: batchedContent,
        mid: `batch_${Date.now()}_${messages.length}msgs`
      },
      batchInfo: {
        totalMessages: messages.length,
        firstMessageTime: messages[0].queuedAt,
        lastMessageTime: messages[messages.length - 1].queuedAt,
        isBatch: true
      }
    };

    // استدعاء دالة معالجة فيسبوك مع الرسالة المدمجة
    const correctPageId = messages[0].webhookEvent.recipient?.id || lastWebhookPageId;
    //console.log(`🎯 [BATCH-PROCESSING] Using pageId: ${correctPageId} for batched messages`);

    await handleFacebookMessage(combinedWebhookEvent, correctPageId);
  }

  /**
   * إرسال إشعار سريع للعميل بأن الرسائل قيد المعالجة
   */
  async sendQuickAcknowledgment(customerId, messageCount) {
    //console.log(`⚡ [QUICK-ACK] Sending acknowledgment for ${messageCount} messages to customer ${customerId}`);

    // يمكن إضافة إرسال رد سريع هنا إذا أردنا
    // مثال: "جاري تحضير المعلومات لك..."
    // لكن سنتركه للآن لتجنب التعقيد
  }

  /**
   * معالجة رسالة واحدة
   */
  async processSingleMessage(messageData) {
    const { senderId, messageText, webhookEvent } = messageData;

    //console.log(`📨 [SINGLE] Processing message from ${senderId}: "${messageText}"`);

    // استدعاء دالة معالجة فيسبوك العادية مع pageId الصحيح
    const correctPageId = webhookEvent.recipient?.id || lastWebhookPageId;
    //console.log(`🎯 [PAGE-FIX] Using correct pageId: ${correctPageId} for message from ${senderId}`);

    await handleFacebookMessage(webhookEvent, correctPageId);
  }

  /**
   * فحص حالة الطوابير والتجميع التكيفي
   */
  getQueueStats() {
    const stats = {
      totalQueues: this.customerQueues.size,
      processingCustomers: this.processingCustomers.size,
      activeBatchTimers: this.batchTimers.size,
      totalPendingMessages: 0,
      batchWaitTime: this.BATCH_WAIT_TIME,
      queueDetails: []
    };

    for (const [customerId, queue] of this.customerQueues) {
      stats.totalPendingMessages += queue.length;
      stats.queueDetails.push({
        customerId,
        queueLength: queue.length,
        isProcessing: this.processingCustomers.has(customerId),
        hasBatchTimer: this.batchTimers.has(customerId)
      });
    }

    return stats;
  }
}
const messageQueueManager = new MessageQueueManager();

function updatePageTokenCache(pageId, pageAccessToken, pageName, companyId) {
  pageTokenCache.set(pageId, {
    pageAccessToken: pageAccessToken,
    pageName: pageName,
    companyId: companyId, // 🔐 حفظ companyId للعزل
    lastUsed: Date.now()
  });

  //console.log(`💾 [PAGE-CACHE] تم تحديث cache للصفحة: ${pageName} (${pageId}) - شركة: ${companyId}`);
}


async function getPageToken(pageId) {
  // فحص cache أولاً
  if (pageTokenCache.has(pageId)) {
    const cached = pageTokenCache.get(pageId);
    //console.log(`⚡ [PAGE-CACHE] استخدام cache للصفحة: ${cached.pageName}`);
    return cached;
  }

  // البحث في قاعدة البيانات
  try {
    const page = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId }
    });

    if (page && page.pageAccessToken) {
      updatePageTokenCache(pageId, page.pageAccessToken, page.pageName, page.companyId);
      return {
        pageAccessToken: page.pageAccessToken,
        pageName: page.pageName,
        companyId: page.companyId, // 🔐 إضافة companyId للعزل
        lastUsed: Date.now()
      };
    }
  } catch (error) {
    console.error(`❌ [PAGE-CACHE] خطأ في البحث عن الصفحة ${pageId}:`, error);
  }

  return null;
}

// Helper function to get page token from cache
async function getPageTokenFromCache(pageId) {
  return await getPageToken(pageId);
}


async function handleMessageDirectly(senderId, messageText, webhookEvent) {
  const now = Date.now();

  // فحص الرسائل المكررة بناءً على message ID
  const messageId = webhookEvent.message?.mid;
  if (messageId && processedMessages.has(messageId)) {
    //console.log(`🔄 [DIRECT] رسالة مكررة تم تجاهلها: ${messageId}`);
    return;
  }

  // إضافة معرف الرسالة للقائمة المعالجة
  if (messageId) {
    processedMessages.set(messageId, now);

    // تنظيف الرسائل القديمة (أكثر من 10 دقائق)
    const OLD_MESSAGE_THRESHOLD = 10 * 60 * 1000; // 10 دقائق
    for (const [id, timestamp] of processedMessages.entries()) {
      if (now - timestamp > OLD_MESSAGE_THRESHOLD) {
        processedMessages.delete(id);
      }
    }
  }

  try {
    //console.log(`📨 [DIRECT] إضافة رسالة للطابور من ${senderId}: "${messageText}"`);

    // الحصول على companyId من pageId
    const pageId = webhookEvent.recipient?.id;
    let companyId = 'cmd5c0c9y0000ymzdd7wtv7ib'; // default fallback

    if (pageId) {
      try {
        const pageInfo = await getPageTokenFromCache(pageId);
        if (pageInfo && pageInfo.companyId) {
          companyId = pageInfo.companyId;
          //console.log(`🏢 [DIRECT] استخدام companyId من الصفحة: ${companyId}`);
        }
      } catch (error) {
        //console.log(`⚠️ [DIRECT] لا يمكن الحصول على companyId، استخدام الافتراضي`);
      }
    }

    // إضافة الرسالة لنظام الطوابير الذكي مع companyId
    await messageQueueManager.addToQueue(senderId, {
      senderId,
      messageText,
      webhookEvent,
      timestamp: now
    }, companyId);

    //console.log(`📥 [QUEUE] رسالة مضافة لطابور العميل ${senderId} للشركة ${companyId}`);

  } catch (error) {
    console.error('🚨 [DIRECT] خطأ في إضافة الرسالة للطابور:', {
      customerId: senderId,
      error: error.message,
      timestamp: new Date().toISOString(),
      messageContent: messageText || 'undefined'
    });
  }
}



// Handle Facebook messages (WITH AI AGENT)
async function handleFacebookMessage(webhookEvent, currentPageId = null) {
  try {
    const senderId = webhookEvent.sender.id;
    const messageText = webhookEvent.message.text;
    let attachments = webhookEvent.message.attachments;
    // استخراج معلومات الرد على الرسالة (reply_to)
    const replyTo = webhookEvent.message.reply_to;

    // 🔍 إضافة لوج مفصل لفهم بنية الرسالة
    //console.log(`🔍 [MESSAGE-STRUCTURE] Full message object:`, JSON.stringify(webhookEvent.message, null, 2));
    //console.log(`🔍 [REPLY-CHECK] reply_to field:`, replyTo);

    // Fix timestamp conversion - use current time for safety
    const timestamp = new Date();

    // استخدام pageId من الرسالة الحالية أو fallback لآخر webhook
    const messagePageId = currentPageId || webhookEvent.recipient?.id || lastWebhookPageId;
    //console.log(`📄 [MESSAGE-PAGE] Using page ID for this message: ${messagePageId}`);

    //console.log(`📨 Message from ${senderId}: "${messageText}"`);
    //console.log(`🔍 [WEBHOOK-DEBUG] Full message object:`, JSON.stringify(webhookEvent.message, null, 2));
    //console.log(`📎 [WEBHOOK-DEBUG] Attachments from webhook:`, attachments);
    //console.log(`📎 [WEBHOOK-DEBUG] Attachments type:`, typeof attachments);
    //console.log(`📎 [WEBHOOK-DEBUG] Attachments length:`, attachments ? attachments.length : 'undefined');

    // 🚨 تشخيص مفصل لمشكلة الصور
    if (!attachments || attachments.length === 0) {
      //console.log(`❌ [IMAGE-ISSUE] لا توجد مرفقات في الـ webhook!`);
      //console.log(`❌ [IMAGE-ISSUE] هذا يعني أن Facebook لا يرسل بيانات الصور`);
      //console.log(`💡 [IMAGE-ISSUE] تحقق من إعدادات Webhook في Facebook Developer Console`);
      //console.log(`💡 [IMAGE-ISSUE] تأكد من إضافة "message_attachments" في Webhook Fields`);
    } else {
      //console.log(`✅ [IMAGE-FOUND] تم العثور على ${attachments.length} مرفق في الـ webhook`);
      attachments.forEach((att, i) => {
        //console.log(`📎 [ATTACHMENT-${i + 1}] النوع: ${att.type}, الرابط: ${att.payload?.url}`);
      });
    }

    // 🚨 إذا لم توجد attachments في webhook، استخدم Graph API للحصول عليها
    if (!attachments && webhookEvent.message.mid) {
      //console.log(`🔍 [GRAPH-API] No attachments in webhook, fetching from Graph API...`);
      try {
        const messageId = webhookEvent.message.mid;
        const pageData = await getPageToken(messagePageId);

        if (pageData && pageData.pageAccessToken) {
          //console.log(`🔍 [GRAPH-API] Fetching message ${messageId} with attachments...`);

          const graphResponse = await fetch(`https://graph.facebook.com/v18.0/${messageId}?fields=message,attachments&access_token=${pageData.pageAccessToken}`);

          if (graphResponse.ok) {
            const messageData = await graphResponse.json();
            //console.log(`✅ [GRAPH-API] Message data received:`, JSON.stringify(messageData, null, 2));

            if (messageData.attachments && messageData.attachments.data) {
              attachments = messageData.attachments.data;
              //console.log(`✅ [GRAPH-API] Found ${attachments.length} attachments via Graph API`);
            }
          } else {
            //console.log(`❌ [GRAPH-API] Failed to fetch message: ${graphResponse.status} ${graphResponse.statusText}`);
          }
        } else {
          //console.log(`❌ [GRAPH-API] No page access token available`);
        }
      } catch (graphError) {
        console.error(`❌ [GRAPH-API] Error fetching attachments:`, graphError.message);
      }
    }

    //console.log(`📎 [FINAL-ATTACHMENTS] Final attachments:`, attachments);
    //console.log(`📎 [FINAL-ATTACHMENTS] Final attachments length:`, attachments ? attachments.length : 'undefined');

    // إضافة لوج لمعلومات الرد
    if (replyTo) {
      //console.log(`↩️ [REPLY-DEBUG] This message is a reply to message ID: ${replyTo.mid}`);
    } else {
      //console.log(`📝 [REPLY-DEBUG] This is a new message (not a reply)`);
    }

    // Find or create customer
    // 🔐 تحديد الشركة الصحيحة بناءً على الصفحة أولاً
    let pageData = null;
    if (messagePageId) {
      pageData = await getPageToken(messagePageId);
    }

    // رفض استخدام fallback خطير - لا يوجد صفحة افتراضية
    if (!pageData) {
      console.error(`❌ [SECURITY] No page data found for pageId: ${messagePageId}`);
      console.error(`📱 [SECURITY] Refusing dangerous fallback - no default page allowed`);

      // تسجيل محاولة خرق العزل
      securityMonitor.logSuspiciousAttempt('UNKNOWN_PAGE_ACCESS', {
        pageId: messagePageId,
        senderId: senderId,
        companyId: null,
        message: 'محاولة الوصول من صفحة غير مسجلة - تم منعها'
      });

      // رفض الطلب - إنهاء المعالجة
      console.error(`🚫 [SECURITY] Request rejected - unknown page: ${messagePageId}`);
      return; // إنهاء المعالجة بدون رد
    }

    // تحديد الشركة المستهدفة - نظام آمن بدون fallback
    let targetCompanyId = null;
    if (pageData?.companyId) {
      targetCompanyId = pageData.companyId;
      //console.log(`🏢 [COMPANY-DEBUG] Using company from page: ${targetCompanyId}`);
    } else {
      // تسجيل محاولة خرق العزل
      securityMonitor.logSuspiciousAttempt('MISSING_COMPANY_ID', {
        pageId: messagePageId,
        senderId: senderId,
        companyId: null,
        message: 'محاولة وصول بدون معرف شركة - تم منعها'
      });

      // رفض الطلب بدلاً من استخدام fallback خطير
      console.error(`❌ [SECURITY] لم يتم تمرير companyId - رفض الطلب للأمان`);
      console.error(`📱 [SECURITY] Page ID: ${messagePageId}, Sender: ${senderId}`);

      // إرسال رسالة خطأ للمستخدم
      await sendFacebookMessage(senderId,
        'عذراً، حدث خطأ في تحديد هوية الشركة. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.',
        'TEXT', messagePageId);

      // رفض الطلب - إنهاء المعالجة
      console.error(`🚫 [SECURITY] Request rejected - company ID missing`);
      return; // إنهاء المعالجة بدون رد
    }

    // التحقق من صحة الشركة المحددة
    const companyExists = await getSharedPrismaClient().company.findUnique({
      where: { id: targetCompanyId }
    });

    if (!companyExists) {
      // تسجيل محاولة الوصول لشركة غير موجودة
      securityMonitor.logSuspiciousAttempt('INVALID_COMPANY_ID', {
        pageId: messagePageId,
        senderId: senderId,
        companyId: targetCompanyId,
        message: `محاولة الوصول لشركة غير موجودة: ${targetCompanyId}`
      });

      console.error(`❌ [SECURITY] شركة غير موجودة: ${targetCompanyId}`);
      console.error(`📱 [SECURITY] Page ID: ${messagePageId}, Sender: ${senderId}`);

      // رفض الطلب - إنهاء المعالجة
      console.error(`🚫 [SECURITY] Request rejected - company not found: ${targetCompanyId}`);
      return; // إنهاء المعالجة بدون رد
    }

    //console.log(`✅ [SECURITY] تم التحقق من صحة الشركة: ${companyExists.name} (${targetCompanyId})`);
    //console.log(`🔍 [CUSTOMER-DEBUG] Looking for customer with facebookId: ${senderId} in company: ${targetCompanyId}`);
    let customer = await getSharedPrismaClient().customer.findFirst({
      where: {
        facebookId: senderId,
        companyId: targetCompanyId // 🔐 البحث مع العزل
      }
    });

    // إذا لم نجد العميل في الشركة الحالية، فحص إذا كان موجود في شركة أخرى
    if (!customer) {
      const existingCustomer = await getSharedPrismaClient().customer.findFirst({
        where: { facebookId: senderId }
      });

      if (existingCustomer) {
        //console.log(`⚠️ [CUSTOMER-DEBUG] Customer exists in different company: ${existingCustomer.companyId}, moving to: ${targetCompanyId}`);

        // نقل العميل للشركة الصحيحة
        customer = await getSharedPrismaClient().customer.update({
          where: { id: existingCustomer.id },
          data: { companyId: targetCompanyId }
        });

        // نقل جميع المحادثات للشركة الجديدة
        await getSharedPrismaClient().conversation.updateMany({
          where: { customerId: customer.id },
          data: { companyId: targetCompanyId }
        });

        //console.log(`✅ [CUSTOMER-DEBUG] Customer moved to correct company: ${targetCompanyId}`);
      }
    }

    if (customer) {
      //console.log(`✅ [CUSTOMER-DEBUG] Found existing customer: ${customer.firstName} ${customer.lastName} (${customer.id})`);
    } else {
      //console.log(`❌ [CUSTOMER-DEBUG] No existing customer found for facebookId: ${senderId}`);
    }

    // إذا كان العميل موجود لكن اسمه "Facebook User"، نحدث اسمه
    if (customer && (customer.firstName === 'Facebook' || customer.lastName === 'User')) {
      //console.log(`🔄 Updating existing customer name for: ${senderId}`);

      // محاولة جلب معلومات المستخدم الحقيقية من Facebook
      if (pageData && pageData.pageAccessToken) {
        try {
          const userInfo = await getFacebookUserInfo(senderId, pageData.pageAccessToken);

          if (userInfo.first_name !== 'Facebook' || userInfo.last_name !== 'User') {
            // تحديث اسم العميل
            customer = await getSharedPrismaClient().customer.update({
              where: { id: customer.id },
              data: {
                firstName: userInfo.first_name || customer.firstName,
                lastName: userInfo.last_name || customer.lastName
              }
            });
            //console.log(`✅ Updated customer name: ${customer.firstName} ${customer.lastName} (${customer.id})`);
          }
        } catch (error) {
          //console.log(`⚠️ Could not fetch Facebook user info for ${senderId}, keeping default name`);
        }
      }
    }

    if (!customer) {
      // التحقق من صحة companyId قبل إنشاء العميل
      if (!targetCompanyId || targetCompanyId === 'null' || targetCompanyId === 'undefined') {
        console.error(`❌ [SECURITY] Cannot create customer without valid companyId: ${targetCompanyId}`);
        console.error(`📱 [SECURITY] Page ID: ${messagePageId}, Sender: ${senderId}`);

        // تسجيل محاولة خرق العزل
        securityMonitor.logSuspiciousAttempt('CUSTOMER_CREATION_WITHOUT_COMPANY', {
          pageId: messagePageId,
          senderId: senderId,
          companyId: targetCompanyId,
          message: 'محاولة إنشاء عميل بدون شركة صحيحة - تم منعها'
        });

        // رفض الطلب - إنهاء المعالجة
        console.error(`🚫 [SECURITY] Customer creation rejected - invalid company: ${targetCompanyId}`);
        return; // إنهاء المعالجة بدون رد
      }

      // إنشاء عميل جديد مع companyId صحيح
      //console.log(`👤 [CUSTOMER-DEBUG] Creating new customer for facebookId: ${senderId} in company: ${targetCompanyId}`);

      // جلب معلومات المستخدم الحقيقية من Facebook
      let userInfo = { first_name: 'Facebook', last_name: 'User' };
      if (pageData && pageData.pageAccessToken) {
        try {
          userInfo = await getFacebookUserInfo(senderId, pageData.pageAccessToken);
        } catch (error) {
          //console.log(`⚠️ Could not fetch Facebook user info, using default name`);
        }
      }

      customer = await getSharedPrismaClient().customer.create({
        data: {
          facebookId: senderId,
          firstName: userInfo?.first_name || `عميل فيسبوك`,
          lastName: userInfo?.last_name || `${senderId.slice(-4)}`,
          email: `facebook_${senderId}@example.com`,
          phone: '',
          companyId: targetCompanyId // 🔐 استخدام الشركة الصحيحة
        }
      });
      //console.log(`👤 New customer created: ${customer.firstName} ${customer.lastName} (${customer.id})`);

      // تم إزالة رسالة طلب الاسم بناءً على طلب المستخدم
    }

    // Find or create conversation (include RESOLVED to maintain continuity)
    //console.log(`🔍 [CONVERSATION-DEBUG] Looking for conversation for customer: ${customer.id}`);
    let conversation = await getSharedPrismaClient().conversation.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ['ACTIVE', 'RESOLVED'] }
      },
      orderBy: { updatedAt: 'desc' }  // Get the most recent conversation
    });

    if (conversation) {
      //console.log(`✅ [CONVERSATION-DEBUG] Found existing conversation: ${conversation.id} (status: ${conversation.status})`);
    } else {
      //console.log(`❌ [CONVERSATION-DEBUG] No existing conversation found for customer: ${customer.id}`);
    }

    // If found a RESOLVED conversation, reactivate it
    if (conversation && conversation.status === 'RESOLVED') {
      conversation = await getSharedPrismaClient().conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'ACTIVE',
          lastMessageAt: timestamp,
          updatedAt: new Date()
        }
      });
      //console.log(`🔄 Reactivated conversation: ${conversation.id}`);
    } else if (conversation && conversation.status === 'ACTIVE') {
      // Update existing active conversation
      conversation = await getSharedPrismaClient().conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: timestamp,
          updatedAt: new Date()
        }
      });
      //console.log(`🔄 Updated existing active conversation: ${conversation.id}`);
    }

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

      // 🔌 إرسال Socket.IO event للمحادثة الجديدة - FIXED
      try {
        const socketService = require('../services/socketService');
        const io = socketService.getIO();

        if (io) {
          const conversationData = {
            id: conversation.id,
            customerId: conversation.customerId,
            companyId: conversation.companyId,
            channel: conversation.channel,
            status: conversation.status,
            lastMessageAt: conversation.lastMessageAt,
            customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عميل غير معروف',
            lastMessage: 'محادثة جديدة',
            lastMessageTime: conversation.lastMessageAt || conversation.createdAt,
            unreadCount: 0,
            platform: 'facebook',
            customerAvatar: null,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customer: {
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone
            },
            // Add page information
            pageName: pageData?.pageName || null,
            pageId: messagePageId
          };

          //console.log(`🔌 [SOCKET-CONVERSATION] Emitting new conversation event:`, conversationData);

          // إرسال بطريقتين لضمان الوصول
          io.to(`company_${conversation.companyId}`).emit('conversation:new', conversationData);
          io.emit('new_conversation_broadcast', {
            ...conversationData,
            targetCompanyId: conversation.companyId
          });

          //console.log(`✅ [SOCKET-CONVERSATION] New conversation event sent for company: ${conversation.companyId}`);
        } else {
          console.error(`❌ [SOCKET-CONVERSATION] Socket.IO instance not available!`);
        }
      } catch (socketError) {
        console.error(`❌ [SOCKET-CONVERSATION] Error sending socket event:`, socketError);
      }
    }

    // Determine message type and content based on attachments
    let messageType = 'TEXT';
    let content = messageText || '';
    let attachmentsData = [];

    if (attachments && attachments.length > 0) {
      const attachment = attachments[0];
      //console.log(`📎 [ATTACHMENT-DEBUG] Processing attachment:`, attachment);

      if (attachment.type === 'image') {
        messageType = 'IMAGE';
        content = attachment.payload.url; // حفظ رابط الصورة في content
        //console.log(`🖼️ [IMAGE-DEBUG] Image URL: ${content}`);
        //console.log(`🖼️ [IMAGE-DEBUG] Message type set to: ${messageType}`);
      } else if (attachment.type === 'file') {
        messageType = 'FILE';
        content = attachment.payload.url;
        //console.log(`📁 [FILE-DEBUG] File URL: ${content}`);
        //console.log(`📁 [FILE-DEBUG] Message type set to: ${messageType}`);
      }

      // حفظ معلومات المرفقات مع الحماية
      const AttachmentValidator = require('./utils/attachmentValidator');
      attachmentsData = AttachmentValidator.createSafeAttachments(attachments);
    }

    // Save message to database
    //console.log(`💾 [SAVE-DEBUG] Saving message with type: ${messageType}, content: ${content.substring(0, 50)}...`);
    //console.log(`💾 [SAVE-DEBUG] Attachments data:`, attachmentsData);

    const messageData = {
      content: content,
      type: messageType,
      conversationId: conversation.id,
      isFromCustomer: true,
      attachments: attachmentsData ? JSON.stringify(attachmentsData) : null,
      metadata: JSON.stringify({
        platform: 'facebook',
        source: 'messenger',
        senderId: senderId,
        hasAttachments: !!attachments,
        messageType: messageType,
        // إضافة معلومات الرد
        replyTo: replyTo ? {
          messageId: replyTo.mid,
          isReply: true
        } : null,
        // إضافة معلومات المرفقات في metadata أيضاً
        attachments: attachmentsData
      }),
      createdAt: timestamp
    };

    //console.log(`💾 [SAVE-DEBUG] Full message data:`, messageData);

    // التحقق النهائي من صحة البيانات قبل الحفظ
    const AttachmentValidator = require('./utils/attachmentValidator');
    const validation = AttachmentValidator.validateMessageBeforeSave(messageData);

    if (validation.warnings.length > 0) {
      //console.log('⚠️ [VALIDATION] Warnings:', validation.warnings);
    }

    if (validation.fixes.length > 0) {
      //console.log('🔧 [VALIDATION] Applied fixes:', validation.fixes);
    }

    const newMessage = await getSharedPrismaClient().message.create({
      data: messageData
    });

    //console.log(`✅ Message saved: ${newMessage.id}`);
    //console.log(`✅ [SAVE-RESULT] Saved message type: ${newMessage.type}, content: ${newMessage.content.substring(0, 50)}...`);

    // 🔌 إرسال Socket.IO event للرسالة الجديدة - محسن للملفات
    const io = socketService.getIO();
    if (io) {
      // استخراج معلومات الملف للـ Socket
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;

      if ((newMessage.type === 'IMAGE' || newMessage.type === 'FILE') && newMessage.attachments) {
        try {
          const attachments = JSON.parse(newMessage.attachments);
          if (attachments && attachments.length > 0) {
            const attachment = attachments[0];
            fileUrl = attachment.url || attachment.fileUrl;
            fileName = attachment.name || attachment.fileName;
            fileSize = attachment.size || attachment.fileSize;
          }
        } catch (e) {
          console.warn(`⚠️ Failed to parse attachments for socket emission`);
        }
      }

      const socketData = {
        id: newMessage.id,
        conversationId: newMessage.conversationId,
        content: newMessage.content,
        type: newMessage.type.toLowerCase(),
        isFromCustomer: newMessage.isFromCustomer,
        timestamp: newMessage.createdAt,
        attachments: newMessage.attachments ? JSON.parse(newMessage.attachments) : null,
        metadata: newMessage.metadata ? JSON.parse(newMessage.metadata) : null,
        // إضافة معلومات الملف للوصول السهل
        fileUrl: fileUrl,
        fileName: fileName,
        fileSize: fileSize
      };

      //console.log(`🔌 [SOCKET] Emitting new_message event:`, socketData);
      io.emit('new_message', socketData);

    }

    // البحث عن الرسالة الأصلية المُرد عليها
    let originalMessage = null;
    if (replyTo) {
      //console.log(`🔍 [REPLY-SEARCH] Searching for original message with Facebook ID: ${replyTo.mid}`);

      // البحث في الرسائل السابقة في نفس المحادثة
      const recentMessages = await getSharedPrismaClient().message.findMany({
        where: {
          conversationId: conversation.id,
          isFromCustomer: false // رسائل من النظام/الذكاء الاصطناعي
        },
        orderBy: { createdAt: 'desc' },
        take: 10 // آخر 10 رسائل
      });

      // محاولة العثور على الرسالة بناءً على التوقيت أو المحتوى
      if (recentMessages.length > 0) {
        // أخذ آخر رسالة من النظام كرسالة مُرد عليها (تقريبي)
        originalMessage = recentMessages[0];
        //console.log(`✅ [REPLY-FOUND] Found potential original message: ${originalMessage.id} - "${originalMessage.content?.substring(0, 50)}..."`);
      } else {
        //console.log(`❌ [REPLY-NOT-FOUND] Could not find original message for reply`);
      }
    }

    // Prepare message data for AI Agent
    const aiMessageData = {
      conversationId: conversation.id,
      senderId: senderId,
      content: messageText || '',
      attachments: attachmentsData || [], // استخدام البيانات المُعالجة بدلاً من الخام
      timestamp: timestamp,
      companyId: customer.companyId, // 🔐 إضافة companyId للعزل
      // إضافة معلومات الرد
      replyContext: replyTo ? {
        isReply: true,
        originalMessageId: replyTo.mid,
        originalMessage: originalMessage ? {
          id: originalMessage.id,
          content: originalMessage.content,
          createdAt: originalMessage.createdAt
        } : null
      } : null,
      customerData: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        email: customer.email,
        orderCount: 0, // يمكن حسابه لاحقاً
        companyId: customer.companyId // 🔐 إضافة companyId في customerData أيضاً
      }
    };

    // Check if AI is enabled for this conversation
    //console.log('🔍 Checking AI status for conversation:', conversation.id);
    try {
      const conversationRecord = await getSharedPrismaClient().conversation.findUnique({
        where: { id: conversation.id },
        select: { metadata: true }
      });

      // Parse metadata to get aiEnabled status
      let aiEnabled = true; // Default to true
      if (conversationRecord?.metadata) {
        try {
          const metadata = typeof conversationRecord.metadata === 'string'
            ? JSON.parse(conversationRecord.metadata)
            : conversationRecord.metadata;
          aiEnabled = metadata.aiEnabled ?? true;
        } catch (parseError) {
          console.error('❌ Error parsing conversation metadata:', parseError);
          aiEnabled = true; // Default to true if parsing fails
        }
      }

      //console.log('🤖 AI Status for conversation:', aiEnabled ? 'ENABLED' : 'DISABLED');

      if (!aiEnabled) {
        //console.log('⏸️ AI is disabled for this conversation - skipping AI processing');
        //console.log('📝 [AI-DISABLED] Message saved but no AI response will be generated');
        return; // Exit early without AI processing
      }
    } catch (error) {
      console.error('❌ Error checking AI status:', error);
      // Continue with AI processing if check fails (fail-safe)
    }

    // Send message to AI Agent
    //console.log('🚀 Sending message to AI Agent:', aiMessageData);
    const aiResponse = await aiAgent.sendMessage(aiMessageData);

    if (aiResponse) {
      //console.log('🤖 AI Response:', aiResponse);

      // Save AI response to database
      const aiMessage = await getSharedPrismaClient().message.create({
        data: {
          content: aiResponse,
          type: 'TEXT',
          conversationId: conversation.id,
          isFromCustomer: false,
          createdAt: new Date()
        }
      });

      //console.log(`✅ AI Message saved: ${aiMessage.id}`);

      // 🔌 Emit AI response to Socket.IO
      const io = socketService.getIO();
      if (io) {
        const socketData = {
          id: aiMessage.id,
          conversationId: aiMessage.conversationId,
          content: aiMessage.content,
          type: aiMessage.type.toLowerCase(),
          isFromCustomer: aiMessage.isFromCustomer,
          timestamp: aiMessage.createdAt,
          attachments: aiMessage.attachments ? JSON.parse(aiMessage.attachments) : null,
          metadata: aiMessage.metadata ? JSON.parse(aiMessage.metadata) : null
        };

        //console.log(`🔌 [SOCKET] Emitting ai_response event:`, socketData);
        io.emit('ai_response', socketData);

      }
    } else {
      //console.log('⚠️ No AI response received');
    }

  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

// Simplified allFunctions.js for Facebook webhook handling


// Simplified function to handle messages directly
async function handleMessageDirectly(senderId, messageText, webhookEvent) {
  try {
    //console.log(`📨 Direct message from ${senderId}: "${messageText}"`);

    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

    // Find or create customer
    let customer = await getSharedPrismaClient().customer.findFirst({
      where: { facebookId: senderId }
    });

    // Get a valid company ID
    let companyId = 'cmd5c0c9y0000ymzdd7wtv7ib'; // Default fallback
    try {
      // Try to get the first company from the database
      const firstCompany = await getSharedPrismaClient().company.findFirst();
      if (firstCompany) {
        companyId = firstCompany.id;
      }
    } catch (error) {
      //console.log('⚠️ Could not fetch company from database, using default');
    }

    if (!customer) {
      // Create new customer with a valid company ID
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
      // Update existing conversation
      conversation = await getSharedPrismaClient().conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: timestamp,
          updatedAt: new Date()
        }
      });
      //console.log(`🔄 Updated existing conversation: ${conversation.id}`);
    }

    // Save message to database
    const newMessage = await getSharedPrismaClient().message.create({
      data: {
        content: messageText,
        type: 'TEXT',
        conversationId: conversation.id,
        isFromCustomer: true,
        createdAt: timestamp
      }
    });

    //console.log(`✅ Message saved: ${newMessage.id}`);

  } catch (error) {
    console.error('❌ Error processing direct message:', error);
  }
}

// Simplified function to handle Facebook messages
async function handleFacebookMessage(webhookEvent, currentPageId = null) {
  try {
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
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
      // Try to get the first company from the database
      const firstCompany = await getSharedPrismaClient().company.findFirst();
      if (firstCompany) {
        companyId = firstCompany.id;
      }
    } catch (error) {
      //console.log('⚠️ Could not fetch company from database, using default');
    }

    if (!customer) {
      // Create new customer with a valid company ID
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
      // Update existing conversation
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

  } catch (error) {
    console.error('❌ Error processing Facebook message:', error);
  }
}

// Send message to Facebook Messenger (Enhanced with validation)
// Import production Facebook fix and fallback functions
const {
  validateFacebookRecipientStrict,
  sendProductionFacebookMessage,
  handleProductionFacebookError
} = require('../production-facebook-fix');

async function sendFacebookMessage(recipientId, messageContent, messageType = 'TEXT', pageId = null) {
  const startTime = Date.now();

  // Validate the recipient ID
  if (!validateFacebookRecipientStrict(recipientId)) {
    console.error('❌ Invalid recipient ID:', recipientId);
    throw new Error('Invalid recipient ID');
  }

  // Send the message to Facebook
  const result = await sendProductionFacebookMessage(recipientId, messageContent, messageType, pageId);
  if (result.success) {
    //console.log('✅ Message sent successfully:', result.messageId);
  } else {
    console.error('❌ Error sending message:', result.error);
    throw new Error('Message sending failed');
  }
}

async function handleMessageDirectly(recipientId, messageContent, messageType = 'TEXT', pageId = null) {
  try {
    await sendFacebookMessage(recipientId, messageContent, messageType, pageId);
  } catch (error) {
    console.error('❌ Error handling message directly:', error);
  }
}

async function updatePageTokenCache(pageId, token) {
  try {
    const page = await Page.findOne({ pageId });

    if (!page) {
      await Page.create({ pageId, token });
      //console.log(`✅ New page token saved: ${pageId}`);
    } else {
      page.token = token;
      await page.save();
      //console.log(`✅ Existing page token updated: ${pageId}`);
    }

  } catch (error) {
    console.error('❌ Error updating page token:', error);
  }
}

async function handleFacebookMessage(message) {
  try {
    const timestamp = Date.now();
    const senderId = message.from.id;
    const pageId = message.page.id;
    const content = message.text;

    // Process the message with the AI
    const aiResponse = await processMessageWithAI(senderId, content);

    // Save the message to the database
    const newMessage = await Message.create({
      senderId,
      pageId,
      content,
      aiResponse,
      metadata: {
        createdAt: timestamp
      }
    });

    //console.log(`✅ Message saved: ${newMessage.id}`);

  } catch (error) {
    console.error('❌ Error processing Facebook message:', error);
  }
}

async function getPageTokenFromCache(pageId) {
  try {
    const page = await Page.findOne({ pageId });

    if (!page) {
      console.error('❌ Page token not found in cache:', pageId);
      return null;
    }

    return page.token;

  } catch (error) {
    console.error('❌ Error getting page token from cache:', error);
    return null;
  }
}

module.exports = { sendFacebookMessage, handleMessageDirectly, updatePageTokenCache, handleFacebookMessage, getPageTokenFromCache, messageQueueManager }

//console.log('🔄 [RESPONSE-SOURCE] Should Escalate:', aiResponse.shouldEscalate);
//console.log('🧠 [RESPONSE-SOURCE] Memory Used:', aiResponse.memoryUsed);
//console.log('📚 [RESPONSE-SOURCE] RAG Data Used:', aiResponse.ragDataUsed);
//console.log('🤐 [RESPONSE-SOURCE] Silent Mode:', aiResponse.silent || false);


//console.log('🔍 [AI-DEBUG] Full AI response structure:', JSON.stringify(aiResponse, null, 2));

if (aiResponse) {
  //console.log('✅ AI Agent generated response:', aiResponse.content);
  //console.log('🔍 [DEBUG] aiResponse.content type:', typeof aiResponse.content);
  //console.log('🔍 [DEBUG] aiResponse.content length:', aiResponse.content?.length);
  //console.log('🔍 [DEBUG] aiResponse.silent value:', aiResponse.silent);
  //console.log('🔍 [DEBUG] aiResponse.silent type:', typeof aiResponse.silent);

  // 🤐 التحقق من النظام الصامت أولاً قبل أي معالجة أخرى
  if (aiResponse.silent) {
    //console.log('🤐 [SILENT-MODE] AI returned silent response - no message will be sent to customer');
    //console.log('🔍 [SILENT-DEBUG] Silent response details:', {
    //   error: aiResponse.error,
    //   errorType: aiResponse.errorType,
    //   success: aiResponse.success
    // });

    // إرسال إشعار خطأ للنظام الداخلي
    await simpleMonitor.logError(new Error(`Silent AI Error: ${aiResponse.error}`), {
      customerId: senderId,
      conversationId: conversation?.id,
      errorType: aiResponse.errorType || 'no_api_key',
      silent: true,
      timestamp: new Date().toISOString(),
      messageContent: messageText || 'non-text message'
    });

    // إنشاء إشعار للمطورين
    try {
      await getSharedPrismaClient().notification.create({
        data: {
          title: 'خطأ في مفتاح API',
          message: `لا يوجد مفتاح API نشط للشركة. العميل ${senderId} أرسل رسالة لكن النظام لم يرد.`,
          type: 'ERROR',
          priority: 'HIGH',
          companyId: facebookPage.companyId,
          metadata: JSON.stringify({
            customerId: senderId,
            errorType: aiResponse.errorType,
            originalMessage: messageText,
            timestamp: new Date().toISOString()
          })
        }
      });
      //console.log('📢 تم إرسال إشعار خطأ للمطورين');
    } catch (notificationError) {
      console.error('❌ فشل في إرسال الإشعار:', notificationError);
    }

    // 🚫 الخروج بدون إرسال أي رد للعميل
    //console.log('🤐 [SILENT-MODE] Exiting without sending any message to customer');
    return;
  }

  // Send AI response back to Facebook
  let responseContent = aiResponse.content;

  // إذا كان هناك تحليل صورة، استخدمه بدلاً من المحتوى العادي
  if (!responseContent && aiResponse.imageAnalysis) {
    //console.log('🖼️ Using image analysis as response content');
    responseContent = aiResponse.imageAnalysis;
  }

  // إذا لم يكن هناك محتوى، فحص حالة نظام الأنماط (إلا إذا كان النظام صامت)
  if (!responseContent) {
    // 🤐 التحقق من النظام الصامت أولاً
    if (aiResponse.silent) {
      //console.log('🤐 [SILENT-MODE] AI returned silent response - no message will be sent to customer');
      //console.log('🔍 [SILENT-DEBUG] Silent response details:', {
      //   error: aiResponse.error,
      //   errorType: aiResponse.errorType,
      //   success: aiResponse.success
      // });

      // إرسال إشعار خطأ للنظام الداخلي
      await simpleMonitor.logError(new Error(`Silent AI Error: ${aiResponse.error}`), {
        customerId: senderId,
        conversationId: conversation?.id,
        errorType: aiResponse.errorType || 'no_api_key',
        silent: true,
        timestamp: new Date().toISOString(),
        messageContent: messageText || 'non-text message'
      });

      // 🚫 الخروج بدون إرسال أي رد للعميل
      //console.log('🤐 [SILENT-MODE] Exiting without sending any message to customer');
      return;
    }

    // ❌ REMOVED: Pattern System check (was consuming AI quota)
    // استخدام الرد الافتراضي
    responseContent = 'مرحباً! كيف يمكنني مساعدتك اليوم؟ 😊';
    }
  }

  //console.log('🔍 [DEBUG] responseContent before check:', responseContent);

  // 🤐 فحص المحتوى الفارغ أو null (النظام الصامت)
  if (!responseContent || !responseContent.trim()) {
    // 🤐 النظام الصامت - لا نرسل رسالة خطأ للعميل
    //console.log('🚨 [SILENT-SYSTEM-ERROR] Empty AI response detected - staying silent');
    console.error('🚨 [SILENT-SYSTEM-ERROR] Empty AI response:', {
      customerId: senderId,
      conversationId: conversation?.id,
      timestamp: new Date().toISOString(),
      messageContent: messageText || 'non-text message'
    });

    // 📊 تسجيل الرد الفارغ في نظام المراقبة
    simpleMonitor.logResponse(processingTime, true, false);

    // 🚫 لا نرسل أي رسالة للعميل - النظام صامت تماماً
    //console.log('🤐 [SILENT-MODE] Empty response but no fallback message sent to customer');
    return; // خروج صامت
  }

  //console.log(`📤 Sending response: "${responseContent.substring(0, 50)}..."`);

  const textResult = await sendFacebookMessage(senderId, responseContent, 'TEXT', messagePageId);
  if (textResult.success) {
    //console.log('✅ Text response sent successfully');

    // 📊 تسجيل الرد الناجح في نظام المراقبة
    simpleMonitor.logResponse(processingTime, false, true);

    // 🚫 تم إلغاء حفظ الردود السريعة لضمان الدقة مع المنتجات المتعددة
    //console.log(`🎯 [NO-CACHE] لا يتم حفظ الردود - كل رد مخصص ودقيق`);

    // تسجيل للمراقبة فقط
    const originalMessage = messageData.content;
    if (originalMessage) {
      //console.log(`📝 [PROCESSED] تمت معالجة الرسالة: "${originalMessage.substring(0, 30)}..." بنجاح`);
    }
  } else {
    //console.log('❌ Failed to send text response:', textResult.error);
  }

  // تسجيل مفصل للصور
  //console.log('🔍 [IMAGE-DEBUG] Checking for images in AI response...');
  //console.log('🔍 [IMAGE-DEBUG] aiResponse.images:', aiResponse.images);
  //console.log('🔍 [IMAGE-DEBUG] aiResponse.images type:', typeof aiResponse.images);
  //console.log('🔍 [IMAGE-DEBUG] aiResponse.images length:', aiResponse.images ? aiResponse.images.length : 'undefined');

  // إرسال الصور إذا كانت متاحة
  if (aiResponse.images && aiResponse.images.length > 0) {
    //console.log(`📸 Processing ${aiResponse.images.length} product images...`);

    // فلترة الصور الصالحة فقط
    const validImages = aiResponse.images.filter(image => {
      if (!image || !image.payload || !image.payload.url) {
        //console.log('❌ [IMAGE-FILTER] Invalid image structure');
        return false;
      }

      const url = image.payload.url;

      // فحص أن الرابط يبدأ بـ http أو https
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        //console.log(`❌ [IMAGE-FILTER] Invalid URL protocol: ${url}`);
        return false;
      }

      // فحص أن الرابط يحتوي على نقطة (domain)
      if (!url.includes('.')) {
        //console.log(`❌ [IMAGE-FILTER] Invalid URL format: ${url}`);
        return false;
      }

      // فحص أن الرابط ليس مجرد حرف واحد
      if (url.length < 10) {
        //console.log(`❌ [IMAGE-FILTER] URL too short: ${url}`);
        return false;
      }

      // فحص أن الرابط لا يحتوي على أحرف غريبة فقط
      if (url === 'h' || url === 't' || url.length === 1) {
        //console.log(`❌ [IMAGE-FILTER] Invalid single character URL: ${url}`);
        return false;
      }

      try {
        new URL(url);
        //console.log(`✅ [IMAGE-FILTER] Valid URL: ${url}`);
        return true;
      } catch (error) {
        //console.log(`❌ [IMAGE-FILTER] Invalid URL format: ${url} - ${error.message}`);
        return false;
      }
    });

    //console.log(`📸 Filtered ${validImages.length}/${aiResponse.images.length} valid images`);

    if (validImages.length > 0) {
      // إرسال رسالة تأكيد أولاً
      const confirmResult = await sendFacebookMessage(senderId, `📸 جاري إرسال ${validImages.length} صور للمنتجات...`, 'TEXT', messagePageId);
      await new Promise(resolve => setTimeout(resolve, 1000));

      let sentCount = 0;
      //console.log(`📸 [IMAGE-LOOP] Starting to send ${validImages.length} images...`);
      //console.log(`📸 [DEBUG] About to enter image sending loop and then follow-up message...`);

      // ✅ FIX: إنشاء timestamps متسقة لجميع الصور
      const baseTimestamp = new Date();
      const imageMessages = [];
      const socketMessages = [];

      for (const image of validImages) {
        //console.log(`📸 [IMAGE-LOOP] Sending image ${sentCount + 1}/${validImages.length}: ${image.payload.url}`);
        //console.log(`📸 [IMAGE-LOOP] About to call sendFacebookMessage...`);

        try {
          const result = await sendFacebookMessage(senderId, image.payload.url, 'IMAGE', messagePageId);
          //console.log(`📸 [IMAGE-LOOP] sendFacebookMessage returned:`, result);

          if (result.success) {
            sentCount++;
            //console.log(`✅ Image ${sentCount}/${validImages.length} sent successfully - ID: ${result.messageId}`);

            // ✅ FIX: إعداد بيانات الرسالة مع timestamp متسق
            const messageData = {
              content: image.payload.url,
              type: 'IMAGE',
              conversationId: conversationId,
              isFromCustomer: false,
              attachments: JSON.stringify([{
                type: 'image',
                url: image.payload.url,
                title: image.title || null
              }]),
              metadata: JSON.stringify({
                platform: 'facebook',
                source: 'ai_response',
                messageId: result.messageId,
                imageIndex: sentCount,
                totalImages: validImages.length,
                isAIGenerated: true // ✅ إضافة علامة الذكاء الاصطناعي
              }),
              createdAt: new Date(baseTimestamp.getTime() + sentCount - 1) // ✅ timestamps متتالية
            };

            imageMessages.push(messageData);

            // إعداد بيانات Socket.IO
            const socketData = {
              id: `temp_${sentCount}`, // سيتم تحديثه بالـ ID الحقيقي
              conversationId: conversationId,
              content: image.payload.url,
              type: 'image',
              isFromCustomer: false,
              senderId: 'ai_agent',
              senderName: 'الذكاء الاصطناعي',
              timestamp: messageData.createdAt,
              fileUrl: image.payload.url,
              fileName: image.title || `AI_Image_${sentCount}`,
              isAiGenerated: true // ✅ علامة الذكاء الاصطناعي للواجهة
            };

            socketMessages.push(socketData);

          } else {
            //console.log(`❌ Failed to send image ${sentCount + 1}/${validImages.length}:`, result.error);
          }
        } catch (error) {
          //console.log(`❌ [IMAGE-LOOP] Error in sendFacebookMessage:`, error);
        }

        //console.log(`📸 [IMAGE-LOOP] About to wait 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // ✅ تقليل التأخير
        //console.log(`📸 [IMAGE-LOOP] Wait completed, continuing loop...`);
      }

      // ✅ FIX: حفظ جميع الصور في قاعدة البيانات كدفعة واحدة
      if (imageMessages.length > 0) {
        try {
          //console.log(`💾 [BATCH-SAVE] Saving ${imageMessages.length} image messages to database...`);

          const savedMessages = await Promise.all(
            imageMessages.map(messageData =>
              getSharedPrismaClient().message.create({ data: messageData })
            )
          );

          //console.log(`✅ [BATCH-SAVE] Successfully saved ${savedMessages.length} image messages`);

          // ✅ FIX: إرسال Socket.IO كدفعة منظمة
          const io = require('./src/services/socketService').getIO();
          //console.log(`🔌 [SOCKET-IO-CHECK] Socket.IO instance available:`, !!io);

          if (io) {
            //console.log(`🔌 [SOCKET-BATCH] Starting to emit ${savedMessages.length} AI image messages`);
            //console.log(`🔌 [SOCKET-BATCH] Socket.IO connected clients:`, io.engine.clientsCount);

            // تحديث IDs الحقيقية وإرسال الرسائل
            for (let i = 0; i < savedMessages.length; i++) {
              const savedMsg = savedMessages[i];
              const socketData = {
                id: savedMsg.id, // ✅ ID حقيقي من قاعدة البيانات
                conversationId: savedMsg.conversationId,
                content: savedMsg.content,
                type: 'image',
                isFromCustomer: false,
                senderId: 'ai_agent',
                senderName: 'الذكاء الاصطناعي',
                timestamp: savedMsg.createdAt,
                fileUrl: savedMsg.content,
                fileName: `AI_Image_${i + 1}`,
                attachments: JSON.parse(savedMsg.attachments),
                metadata: JSON.parse(savedMsg.metadata),
                isAiGenerated: true // ✅ علامة واضحة للذكاء الاصطناعي
              };

              // إرسال عبر Socket.IO للواجهة الأمامية
              //console.log(`🔌 [SOCKET-AI-IMAGE] Emitting image ${i + 1}:`, {
              //   id: socketData.id,
              //   type: socketData.type,
              //   fileUrl: socketData.fileUrl,
              //   fileName: socketData.fileName,
              //   conversationId: socketData.conversationId
              // });

              io.emit('new_message', socketData);
              //console.log(`✅ [SOCKET-AI-IMAGE] Successfully emitted image ${i + 1} to frontend`);

              // تأخير قصير لضمان الترتيب في الواجهة
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            //console.log(`✅ [SOCKET-BATCH] Successfully sent ${savedMessages.length} AI image messages to frontend`);
            //console.log(`🔌 [SOCKET-BATCH] Frontend should now see new AI images in conversation: ${savedMessages[0]?.conversationId}`);
          } else {
            console.error(`❌ [SOCKET-ERROR] No Socket.IO instance available! Images won't reach frontend.`);
          }
        } catch (batchSaveError) {
          console.error(`❌ [BATCH-SAVE] Failed to save image messages:`, batchSaveError);

          // Fallback: حفظ فردي في حالة فشل الدفعة
          for (const messageData of imageMessages) {
            try {
              const imageMessage = await getSharedPrismaClient().message.create({ data: messageData });
              //console.log(`💾 [FALLBACK-SAVE] Saved individual image message: ${imageMessage.id}`);
            } catch (individualError) {
              console.error(`❌ [FALLBACK-SAVE] Failed individual save:`, individualError);
            }
          }
        }
      }

      //console.log(`📸 [IMAGE-LOOP] Finished sending images. Total sent: ${sentCount}/${validImages.length}`);
      //console.log(`📸 [IMAGE-LOOP] Now proceeding to smart follow-up message...`);

      // رسالة تأكيد نهائية ذكية
      if (sentCount > 0) {
        try {
          //console.log(`🎯 [SMART-FOLLOW-UP] Calling generateSmartFollowUpMessage with sentCount: ${sentCount}`);
          const smartFollowUpMessage = await generateSmartFollowUpMessage(sentCount, validImages, messageText, senderId);

          // فحص إذا كانت الرسالة null (النظام الصامت)
          if (smartFollowUpMessage) {
            //console.log(`📤 [SMART-FOLLOW-UP] Sending smart message: "${smartFollowUpMessage}"`);
            const followUpResult = await sendFacebookMessage(senderId, smartFollowUpMessage, 'TEXT', messagePageId);
            //console.log(`✅ [SMART-FOLLOW-UP] Smart follow-up message sent successfully`);

            // حفظ رسالة المتابعة في قاعدة البيانات
            if (followUpResult.success) {
              try {
                const followUpMessage = await getSharedPrismaClient().message.create({
                  data: {
                    content: smartFollowUpMessage,
                    type: 'TEXT',
                    conversationId: conversationId,
                    isFromCustomer: false, // من الذكاء الصناعي
                    metadata: JSON.stringify({
                      platform: 'facebook',
                      source: 'ai_follow_up',
                      messageId: followUpResult.messageId,
                      followUpType: 'smart_image_follow_up',
                      imageCount: sentCount
                    })
                  }
                });
                //console.log(`💾 [FOLLOW-UP-SAVE] Saved follow-up message to database: ${followUpMessage.id}`);
              } catch (saveError) {
                console.error(`❌ [FOLLOW-UP-SAVE] Failed to save follow-up message:`, saveError);
              }
            }
          } else {
            //console.log(`🤐 [SILENT-MODE] Smart follow-up returned null - staying silent`);
          }
        } catch (smartError) {
          // 🤐 النظام الصامت - تسجيل الخطأ داخلياً فقط
          console.error('🚨 [SILENT-SYSTEM-ERROR] Smart follow-up error:', {
            customerId: senderId,
            error: smartError.message,
            timestamp: new Date().toISOString(),
            sentCount: sentCount
          });

          // 🚫 لا نرسل رسالة fallback للعميل - النظام صامت
          //console.log('🤐 [SILENT-MODE] Smart follow-up error but no fallback message sent');
        }
      } else {
        // 🤐 النظام الصامت - لا نرسل رسالة خطأ للعميل
        //console.log('🤐 [SILENT-MODE] Image sending error but no error message sent to customer');
        await simpleMonitor.logError(new Error('Image sending failed'), {
          customerId: senderId,
          errorType: 'image_sending_error',
          silent: true,
          timestamp: new Date().toISOString()
        });
      }
      //console.log(`📸 [DEBUG] Finished processing images section. Moving to next part...`);
    } else {
      //console.log('⚠️ No valid images found to send');
      // 🤐 النظام الصامت - لا نرسل رسالة خطأ للعميل
      //console.log('🤐 [SILENT-MODE] No valid images but no error message sent to customer');
      await simpleMonitor.logError(new Error('No valid images found'), {
        customerId: senderId,
        errorType: 'no_valid_images',
        silent: true,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    //console.log('🔍 [IMAGE-DEBUG] No images found in AI response - skipping image sending');
    //console.log('🔍 [IMAGE-DEBUG] Full aiResponse structure:', JSON.stringify(aiResponse, null, 2));
  }

  // Save AI response to database (only if not silent)
  if (!aiResponse.silent) {
    const contentToSave = aiResponse.content || aiResponse.imageAnalysis || responseContent;
    const aiMessage = await getSharedPrismaClient().message.create({
      data: {
        content: contentToSave,
        type: 'TEXT',
        conversationId: conversation.id,
        isFromCustomer: false,
        metadata: JSON.stringify({
          platform: 'facebook',
          source: 'ai_agent',
          intent: aiResponse.intent,
          sentiment: aiResponse.sentiment,
          confidence: aiResponse.confidence,
          shouldEscalate: aiResponse.shouldEscalate,
          isAIGenerated: true, // 🤖 تحديد أن هذه رسالة من الذكاء الصناعي
          aiModel: aiResponse.model || 'unknown',
          processingTime: aiResponse.processingTime || 0,
          timestamp: new Date().toISOString()
        }),
        createdAt: new Date()
      }
    });

    // 🔌 إرسال Socket.IO event لرسالة الذكاء الصناعي
    const io = socketService.getIO();
    if (io) {
      const socketData = {
        id: aiMessage.id,
        conversationId: aiMessage.conversationId,
        content: aiMessage.content,
        type: 'text',
        isFromCustomer: false,
        senderId: 'ai_agent',
        senderName: 'الذكاء الاصطناعي',
        timestamp: aiMessage.createdAt,
        metadata: JSON.parse(aiMessage.metadata)
      };

      //console.log(`🔌 [SOCKET-AI] Emitting AI message event:`, socketData);
      io.emit('new_message', socketData);
    }
    //console.log('💾 [SAVE] تم حفظ الرد في قاعدة البيانات');
  } else {
    //console.log('🤐 [SILENT-SAVE] لم يتم حفظ الرد - النظام صامت');
  }

  // 🤐 النظام الصامت - لا تصعيد تلقائي للعميل
  if (aiResponse.shouldEscalate && !aiResponse.silent) {
    //console.log('🚨 Escalating to human agent (traditional escalation)');

    // إرسال رسالة متابعة للعميل (للحالات العادية فقط)
    setTimeout(async () => {
      try {
        const escalationMessage = `مرحباً! 👋

كيف يمكنني مساعدتك اليوم؟

✍️ **اكتب لي:** وصف المنتج اللي عايزه
📱 **أو:** أحولك لزميلي للمساعدة المباشرة

أنا هنا لمساعدتك! 😊`;

        const followUpResult = await sendFacebookMessage(senderId, escalationMessage, 'TEXT', messagePageId);
        if (followUpResult.success) {
          //console.log('✅ Professional follow-up message sent');
        } else {
          //console.log('❌ Failed to send follow-up:', followUpResult.error);
        }
      } catch (escalationError) {
        console.error('❌ Error sending follow-up:', escalationError);
      }
    }, 3000);
  }

} else {
  //console.log('📝 AI Agent disabled or no response - Manual response required');
}


// Import Facebook validation functions


// Send message to Facebook Messenger (Enhanced with validation)
// Import production Facebook fix and fallback functions
const {
  validateFacebookRecipientStrict,
  sendProductionFacebookMessage,
  handleProductionFacebookError
} = require('../production-facebook-fix');

async function sendFacebookMessage(recipientId, messageContent, messageType = 'TEXT', pageId = null) {
  try {
    //console.log(`📤 [FACEBOOK-SEND] Production send initiated for ${recipientId}`);

    // Basic recipient ID validation
    if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
      //console.log('❌ [FACEBOOK-SEND] Invalid recipient ID:', recipientId);
      return {
        success: false,
        error: 'INVALID_RECIPIENT_ID',
        message: 'معرف المستلم غير صحيح',
        userFriendly: true
      };
    }

    // Skip sending for test IDs that are not valid Facebook IDs
    if (recipientId.includes('test-') || recipientId.length < 10) {
      //console.log('⚠️ [FACEBOOK-SEND] Skipping Facebook send for test ID:', recipientId);
      return { success: true, message: 'Test ID - message not sent to Facebook' };
    }

    // تحديد الصفحة المناسبة للإرسال - ENHANCED WITH PERMISSION CHECKING
    let pageData = null;
    let actualPageId = null;

    // 🔧 ENHANCED: Check for preferred page in conversation metadata first
    try {
      const conversation = await getSharedPrismaClient().conversation.findFirst({
        where: {
          customer: { facebookId: recipientId },
          channel: 'FACEBOOK'
        }
      });

      if (conversation && conversation.metadata) {
        try {
          const metadata = JSON.parse(conversation.metadata);
          if (metadata.preferredPageId) {
            //console.log(`🎯 [PAGE-SELECT] Using preferred page from conversation: ${metadata.preferredPageId}`);
            pageData = await getPageToken(metadata.preferredPageId);
            actualPageId = metadata.preferredPageId;
            if (pageData) {
              //console.log(`✅ [PAGE-SELECT] Found preferred page: ${metadata.preferredPageName}`);
            }
          }
        } catch (e) {
          //console.log('⚠️ [PAGE-SELECT] Could not parse conversation metadata');
        }
      }
    } catch (e) {
      //console.log('⚠️ [PAGE-SELECT] Could not check conversation metadata');
    }

    // أولاً: استخدام Page ID المحدد إذا كان متوفراً (فقط إذا لم يتم العثور على preferred page)
    if (!pageData && pageId) {
      pageData = await getPageToken(pageId);
      actualPageId = pageId;
      //console.log(`🎯 [PAGE-SELECT] استخدام الصفحة المحددة: ${pageId}`);

      // إذا لم نجد الصفحة، نحاول البحث بالاسم
      if (!pageData && pageId === '675323792321557') {
        //console.log(`🔍 [PAGE-SELECT] البحث عن Swan-store في cache...`);
        pageData = pageTokenCache.get('Swan-store');
        if (pageData) {
          actualPageId = '675323792321557';
          //console.log(`✅ [PAGE-SELECT] تم العثور على Swan-store في cache`);
        }
      }
    }

    // ثانياً: استخدام آخر Page ID من webhook
    if (!pageData && lastWebhookPageId) {
      pageData = await getPageToken(lastWebhookPageId);
      actualPageId = lastWebhookPageId;
      //console.log(`🔄 [PAGE-SELECT] استخدام آخر صفحة من webhook: ${lastWebhookPageId}`);
    }

    // ثالثاً: البحث عن الصفحة الافتراضية
    if (!pageData) {
      const defaultPage = await getSharedPrismaClient().facebookPage.findFirst({
        where: { status: 'connected' },
        orderBy: { connectedAt: 'desc' }
      });

      if (defaultPage) {
        pageData = {
          pageAccessToken: defaultPage.pageAccessToken,
          pageName: defaultPage.pageName,
          companyId: defaultPage.companyId, // 🔐 إضافة companyId للعزل
          lastUsed: Date.now()
        };
        actualPageId = defaultPage.pageId; // تخزين pageId الفعلي
        updatePageTokenCache(defaultPage.pageId, defaultPage.pageAccessToken, defaultPage.pageName, defaultPage.companyId);
        //console.log(`🔄 [PAGE-SELECT] استخدام الصفحة الافتراضية: ${defaultPage.pageName} - شركة: ${defaultPage.companyId}`);
      } else {
        console.error(`❌ [SECURITY] No valid page found`);
        return {
          success: false,
          error: 'NO_VALID_PAGE',
          message: 'لم يتم العثور على صفحة فيسبوك صالحة'
        };
      }
    }

    if (!pageData || !pageData.pageAccessToken) {
      //console.log('⚠️ Facebook Page Access Token not found - Message saved to database only');
      return { success: false, error: 'No active page found' };
    }

    if (!actualPageId) {
      //console.log('⚠️ Page ID not found - Cannot send message');
      return { success: false, error: 'Page ID not found' };
    }

    const PAGE_ACCESS_TOKEN = pageData.pageAccessToken;
    //console.log(`🔑 Using Page Access Token for page: ${pageData.pageName} (${actualPageId})`);

    // 🔧 PRODUCTION: Use strict validation and enhanced sending
    const result = await sendProductionFacebookMessage(
      recipientId,
      messageContent,
      messageType,
      actualPageId,
      PAGE_ACCESS_TOKEN
    );

    if (result.success) {
      //console.log(`✅ [FACEBOOK-SEND] Message sent successfully: ${result.messageId}`);
      return result;
    } else if (result.blocked) {
      console.error(`🚫 [FACEBOOK-SEND] Message blocked by validation: ${result.message}`);
      if (result.solutions) {
        //console.log('🔧 [FACEBOOK-SEND] Suggested solutions:');
        result.solutions.forEach(solution => {
          //console.log(`   - ${solution}`);
        });
      }
      return result;
    } else {
      console.error(`❌ [FACEBOOK-SEND] Failed to send message: ${result.message}`);
      if (result.solutions) {
        //console.log('🔧 [FACEBOOK-SEND] Suggested solutions:');
        result.solutions.forEach(solution => {
          //console.log(`   - ${solution}`);
        });
      }
      return result;
    }

  } catch (error) {
    console.error('❌ [FACEBOOK-SEND] Error in production Facebook message:', error);

    // Check if it's a Facebook API error with structured response
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      const enhancedError = handleProductionFacebookError(fbError, recipientId, pageId);
      //console.log('🔧 [FACEBOOK-SEND] Enhanced error from catch:', enhancedError.message);
      return enhancedError;
    }

    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'خطأ في الشبكة أو الاتصال',
      details: error.message
    };
  }
}


module.exports = { sendFacebookMessage, handleMessageDirectly, updatePageTokenCache, handleFacebookMessage, getPageTokenFromCache, messageQueueManager }


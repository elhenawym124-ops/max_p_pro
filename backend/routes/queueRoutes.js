const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

function getPrisma() {
  return getSharedPrismaClient();
}

// const prisma = getPrisma(); // ❌ Removed to prevent early loading issues

// متغير لتخزين آخر page ID من الـ webhook
let lastWebhookPageId = null;

// استيراد handleFacebookMessage من allFunctions
let handleFacebookMessage = null;
try {
  const allFunctions = require('../utils/allFunctions');
  handleFacebookMessage = allFunctions.handleFacebookMessage;
} catch (error) {
  console.error('❌ [QUEUE] Error loading handleFacebookMessage:', error.message);
}

class MessageQueueManager {
  constructor() {
    this.processingCustomers = new Set();
    this.customerQueues = new Map();
    this.batchTimers = new Map(); // مؤقتات التجميع
    this.BATCH_WAIT_TIME = 300; // ⚡ OPTIMIZED: 300ms لتجميع الرسائل المتتالية (كان 500ms)
    this.companyBatchSettings = new Map(); // إعدادات خاصة بكل شركة
    this.queueTimestamps = new Map(); // ⚡ NEW: تتبع وقت آخر رسالة لكل queue

    // ⚡ NEW: Cleanup دوري للـ queues القديمة (كل دقيقة)
    this.startPeriodicCleanup();
  }

  /**
   * ⚡ NEW: تنظيف دوري للـ queues القديمة
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupOldQueues();
    }, 60 * 1000); // كل دقيقة
  }

  /**
   * ⚡ NEW: تنظيف الـ queues التي لم يتم استخدامها لمدة 5 دقائق
   */
  cleanupOldQueues() {
    const now = Date.now();
    const MAX_QUEUE_AGE = 5 * 60 * 1000; // 5 دقائق
    let cleanedCount = 0;

    // تنظيف الـ queues القديمة
    for (const [customerId, timestamp] of this.queueTimestamps.entries()) {
      if (now - timestamp > MAX_QUEUE_AGE) {
        // إذا كان الـ queue قديم ولم يتم معالجته، ننظفه
        if (!this.processingCustomers.has(customerId)) {
          // إلغاء أي timer نشط
          if (this.batchTimers.has(customerId)) {
            clearTimeout(this.batchTimers.get(customerId));
            this.batchTimers.delete(customerId);
          }

          // حذف الـ queue
          this.customerQueues.delete(customerId);
          this.queueTimestamps.delete(customerId);
          cleanedCount++;
        }
      }
    }

    // تنظيف الـ processingCustomers التي عالقة (أكثر من 10 دقائق)
    const MAX_PROCESSING_TIME = 10 * 60 * 1000; // 10 دقائق
    for (const customerId of this.processingCustomers) {
      const queue = this.customerQueues.get(customerId);
      if (queue && queue.length > 0) {
        const oldestMessage = queue[0];
        if (oldestMessage && (now - oldestMessage.queuedAt) > MAX_PROCESSING_TIME) {
          console.error(`⚠️ [QUEUE-CLEANUP] Force cleaning stuck processing customer ${customerId} (${now - oldestMessage.queuedAt}ms old)`);
          this.processingCustomers.delete(customerId);
          this.customerQueues.delete(customerId);
          this.queueTimestamps.delete(customerId);
          if (this.batchTimers.has(customerId)) {
            clearTimeout(this.batchTimers.get(customerId));
            this.batchTimers.delete(customerId);
          }
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [QUEUE-CLEANUP] Cleaned ${cleanedCount} old/stuck queue(s)`);
    }
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
        select: {
          autoReplyEnabled: true,
          maxRepliesPerCustomer: true,
          queueSettings: true
        }
      });

      // ⚡ SOLUTION: حساب batchWaitTime بناءً على حالة AI
      // إذا AI معطل = معالجة فورية تماماً (0ms)
      // إذا AI مفعّل = استخدام التجميع
      let batchWaitTime = 0; // افتراضي: فوري (0ms) - بدون تأخير
      let queueEnabled = false; // افتراضي: معطل - معالجة فورية

      if (aiSettings?.autoReplyEnabled) {
        // إذا كان AI مفعّل، استخدم التجميع
        queueEnabled = true;
        // استخدم maxRepliesPerCustomer بعد تحويله من ثواني إلى ميللي ثانية
        const waitTimeInSeconds = aiSettings.maxRepliesPerCustomer || 5;
        batchWaitTime = Math.min(waitTimeInSeconds * 1000, 2000); // Maximum 2 seconds even with AI
        console.log(`✅ [QUEUE-CONFIG] AI is ENABLED - using batching: batchWaitTime=${batchWaitTime}ms (capped at 2s)`);
      } else {
        // ⚡ CRITICAL: AI معطل = معالجة فورية تماماً بدون أي تأخير
        queueEnabled = false;
        batchWaitTime = 0; // فوري تماماً
        console.log(`⚡ [QUEUE-CONFIG] AI is DISABLED - INSTANT processing (0ms delay, no batching)`);
      }

      let settings = {
        enabled: queueEnabled, // ⚡ يتم تفعيل التجميع فقط إذا كان AI مفعّل
        maxBatchSize: 10,
        batchWaitTime: batchWaitTime
      };

      if (aiSettings && aiSettings.queueSettings) {
        const parsedSettings = typeof aiSettings.queueSettings === 'string'
          ? JSON.parse(aiSettings.queueSettings)
          : aiSettings.queueSettings;

        // فقط تطبيق إعدادات إضافية، لكن نحافظ على enabled و batchWaitTime حسب حالة AI
        settings = {
          ...settings,
          ...parsedSettings,
          // ⚡ Force override: enabled و batchWaitTime يتم تحديدهما حسب حالة AI فقط
          enabled: queueEnabled,
          batchWaitTime: batchWaitTime
        };
      }

      // حفظ في الكاش
      this.companyBatchSettings.set(companyId, {
        settings,
        lastUpdated: Date.now()
      });

      console.log(`🔧 [QUEUE-CONFIG] Final queue settings for company ${companyId}:`, settings);
      return settings;

    } catch (error) {
      console.error(`❌ [ADAPTIVE-QUEUE] Failed to load queue settings for company ${companyId}:`, error);

      // الإعدادات الافتراضية في حالة الخطأ - افتراضي: معالجة فورية (AI معطل)
      const defaultSettings = {
        batchWaitTime: 0, // ⚡ DEFAULT: 0ms - معالجة فورية (افتراضياً AI معطل)
        enabled: false, // ⚡ DEFAULT: معطل - معالجة فورية
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
    const queueStartTime = Date.now();
    const messageId = messageData.webhookEvent?.message?.mid || `msg_${Date.now()}`;

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

    // ⚡ NEW: تحديث timestamp للـ queue
    this.queueTimestamps.set(customerId, Date.now());

    // ⚡ DEBUG: Log immediately with timestamp
    console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - queueStartTime}ms] 📥 [QUEUE] Message added to queue for customer ${customerId}, company ${companyId} (queue size: ${queue.length})`);

    // ⚡ OPTIMIZATION: Try to get settings from cache first (synchronous check)
    let queueSettings = null;
    let batchWaitTime = 0; // ⚡ DEFAULT: 0ms - معالجة فورية (افتراضياً AI معطل)
    let isQueueEnabled = false; // ⚡ DEFAULT: معطل - معالجة فورية

    // Check cache first (fast, synchronous)
    if (this.companyBatchSettings.has(companyId)) {
      const cached = this.companyBatchSettings.get(companyId);
      if (Date.now() - cached.lastUpdated < 5 * 60 * 1000) {
        queueSettings = cached.settings;
        isQueueEnabled = queueSettings.enabled || false;
        batchWaitTime = isQueueEnabled ? queueSettings.batchWaitTime : 0;
      }
    }

    // If not in cache, get settings asynchronously (but don't block)
    if (!queueSettings) {
      // ⚡ DEFAULT: معالجة فورية (افتراضياً AI معطل)
      queueSettings = {
        enabled: false, // ⚡ DEFAULT: معطل - معالجة فورية
        batchWaitTime: 0, // ⚡ DEFAULT: 0ms - فوري
        maxBatchSize: 10
      };
      isQueueEnabled = false;
      batchWaitTime = 0;

      // Fetch actual settings in background (non-blocking) - for future messages
      this.getCompanyQueueSettings(companyId).then(settings => {
        // Update cache with real settings for future messages
        if (settings) {
          this.companyBatchSettings.set(companyId, {
            settings: settings,
            lastUpdated: Date.now()
          });
        }
      }).catch(error => {
        console.error(`❌ [QUEUE] Error loading queue settings for company ${companyId}:`, error.message);
      });
    }

    // إلغاء المؤقت السابق إذا كان موجوداً
    if (this.batchTimers.has(customerId)) {
      clearTimeout(this.batchTimers.get(customerId));
      //console.log(`⏰ [ADAPTIVE-QUEUE] Cancelled previous timer for customer ${customerId}, restarting`);
    }

    // ⚡ SOLUTION: معالجة فورية إذا AI معطل، تجميع فقط إذا AI مفعّل
    if (!isQueueEnabled || batchWaitTime === 0) {
      // ⚡ AI معطل = معالجة فورية تماماً بدون أي تأخير
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - queueStartTime}ms] ⚡ [INSTANT-AI-OFF] AI is DISABLED - Processing message IMMEDIATELY (0ms delay) for customer ${customerId}`);
      setImmediate(() => this.processBatch(customerId));
    } else if (queue.length === 1 && !this.processingCustomers.has(customerId)) {
      // ⚡ AI مفعّل + أول رسالة - معالجة فورية (لا ننتظر للتجميع)
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - queueStartTime}ms] ⚡ [INSTANT-AI-ON] AI enabled but first message - Processing IMMEDIATELY for customer ${customerId}`);
      setImmediate(() => this.processBatch(customerId));
    } else if (queue.length > 1 && batchWaitTime > 0 && isQueueEnabled) {
      // ⚡ AI مفعّل + رسائل متتالية - استخدم التجميع
      const optimizedBatchWaitTime = Math.min(batchWaitTime, 1000); // Maximum 1 second delay

      const timer = setTimeout(() => {
        console.log(`⏰ [BATCH-AI-ON] Timer expired for customer ${customerId} - processing ${queue.length} message(s) (AI enabled)`);
        this.processBatch(customerId);
      }, optimizedBatchWaitTime);

      this.batchTimers.set(customerId, timer);
      console.log(`⏰ [BATCH-AI-ON] Started ${optimizedBatchWaitTime}ms timer for customer ${customerId} (${queue.length} message(s) queued, AI enabled)`);
    } else {
      // Fallback: معالجة فورية
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - queueStartTime}ms] ⚡ [FALLBACK] Processing message IMMEDIATELY for customer ${customerId}`);
      setImmediate(() => this.processBatch(customerId));
    }

    return queue.length;
  }

  /**
   * معالجة مجموعة الرسائل المجمعة
   */
  async processBatch(customerId) {
    const batchStartTime = Date.now();
    const messageId = this.customerQueues.get(customerId)?.[0]?.webhookEvent?.message?.mid || `msg_${Date.now()}`;

    if (this.processingCustomers.has(customerId)) {
      const queue = this.customerQueues.get(customerId);
      const queueSize = queue ? queue.length : 0;
      const oldestMessageAge = queue && queue.length > 0 ? Date.now() - queue[0].queuedAt : 0;
      console.warn(`⚠️ [QUEUE-BLOCKED] Customer ${customerId} already being processed! Queue size: ${queueSize}, Oldest message age: ${oldestMessageAge}ms`);

      // ⚡ FIX: إذا كان الـ queue كبير جداً أو الرسالة قديمة جداً، نضطر للمعالجة
      if (queueSize > 5 || oldestMessageAge > 10000) { // أكثر من 5 رسائل أو أقدم من 10 ثواني
        console.error(`🚨 [QUEUE-OVERLOAD] Queue overloaded for customer ${customerId}! Forcing immediate processing despite ongoing process`);
        // لا نعيد return - نكمل المعالجة
      } else {
        return;
      }
    }

    const queue = this.customerQueues.get(customerId);
    if (!queue || queue.length === 0) {
      return;
    }

    // ⚡ NEW: Log queue stats before processing
    const queueStats = {
      queueSize: queue.length,
      oldestMessageAge: queue.length > 0 ? Date.now() - queue[0].queuedAt : 0,
      totalProcessingCustomers: this.processingCustomers.size,
      totalQueues: this.customerQueues.size,
      activeTimers: this.batchTimers.size
    };
    console.log(`📊 [QUEUE-STATS] Before processing customer ${customerId}:`, queueStats);

    // تنظيف المؤقت
    if (this.batchTimers.has(customerId)) {
      clearTimeout(this.batchTimers.get(customerId));
      this.batchTimers.delete(customerId);
    }

    this.processingCustomers.add(customerId);
    const processingCount = this.processingCustomers.size;
    const totalQueues = this.customerQueues.size;
    console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - batchStartTime}ms] 🔄 [BATCH] Starting batch processing for customer ${customerId}. ${queue.length} messages in batch`);
    console.log(`📊 [QUEUE-LOAD] Current load: ${processingCount} processing, ${totalQueues} total queues`);

    // ⚡ WARNING: إذا كان في load عالي
    if (processingCount > 10) {
      console.warn(`⚠️ [QUEUE-HIGH-LOAD] High queue load detected! ${processingCount} customers being processed simultaneously`);
    }

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
        const messageData = queue.shift();
        const singleMsgStartTime = Date.now();
        console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${singleMsgStartTime - batchStartTime}ms] 📨 [BATCH] Starting single message processing for customer ${customerId}`);
        // ✅ RESTORE: Use await to ensure message is saved before clearing queue (like in backup)
        await this.processSingleMessage(messageData);
        console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - singleMsgStartTime}ms] ✅ [BATCH] Single message processing completed`);
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
      const processingTime = Date.now() - batchStartTime;
      this.processingCustomers.delete(customerId);

      // ⚡ FIX: فقط احذف الـ queue إذا كانت فارغة (لا تحذفها إذا كانت تحتوي على رسائل جديدة)
      const remainingQueue = this.customerQueues.get(customerId);
      if (!remainingQueue || remainingQueue.length === 0) {
        this.customerQueues.delete(customerId);
        this.queueTimestamps.delete(customerId);
        console.log(`✅ [BATCH] Completed processing for customer ${customerId} in ${processingTime}ms - queue cleared`);
      } else {
        // ⚡ إذا كانت هناك رسائل جديدة، اترك الـ queue للمعالجة التالية
        console.log(`⚠️ [BATCH] Queue for customer ${customerId} still has ${remainingQueue.length} message(s) after ${processingTime}ms - keeping queue for next processing`);

        // ⚡ WARNING: إذا كان الـ processing time طويل جداً
        if (processingTime > 5000) {
          console.error(`🚨 [BATCH-SLOW] Slow processing detected! Customer ${customerId} took ${processingTime}ms to process. This may cause message delays.`);
        }
      }

      // ⚡ Log final queue stats
      const finalStats = {
        remainingProcessing: this.processingCustomers.size,
        totalQueues: this.customerQueues.size,
        activeTimers: this.batchTimers.size
      };
      console.log(`📊 [QUEUE-STATS] After processing customer ${customerId}:`, finalStats);
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
    const correctPageId = messages[0].webhookEvent.recipient?.id || messages[0].pageId || lastWebhookPageId;
    console.log(`🔗 [BATCH] Processing ${messages.length} messages together for customer ${customerId}`);

    if (handleFacebookMessage) {
      await handleFacebookMessage(combinedWebhookEvent, correctPageId);
    } else {
      console.error('❌ [QUEUE] handleFacebookMessage not available');
    }
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
    const singleStartTime = Date.now();
    const { senderId, messageText, webhookEvent, companyId } = messageData;
    const messageId = webhookEvent.message?.mid || `msg_${Date.now()}`;
    const customerId = senderId;

    console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [0ms] 📨 [SINGLE] Processing message from ${senderId}: "${messageText?.substring(0, 50)}..."`);

    // ⚡ FIX: إضافة timeout للمعالجة (30 ثانية كحد أقصى)
    const PROCESSING_TIMEOUT = 30 * 1000; // 30 ثانية
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Processing timeout after ${PROCESSING_TIMEOUT}ms`));
      }, PROCESSING_TIMEOUT);
    });

    try {
      // استدعاء دالة معالجة فيسبوك العادية مع pageId الصحيح
      const correctPageId = webhookEvent.recipient?.id || lastWebhookPageId;
      const handleStartTime = Date.now();
      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${handleStartTime - singleStartTime}ms] 🎯 [SINGLE] Calling handleFacebookMessage with pageId: ${correctPageId}`);

      // ✅ RESTORE: Use await to ensure message is saved immediately (like in backup)
      // ⚡ FIX: استخدام Promise.race لضمان timeout
      await Promise.race([
        handleFacebookMessage(webhookEvent, correctPageId),
        timeoutPromise
      ]);

      console.log(`⏱️ [TIMING-${messageId.slice(-8)}] [${Date.now() - singleStartTime}ms] ✅ [SINGLE] handleFacebookMessage completed`);
    } catch (error) {
      console.error(`❌ [SINGLE] Error processing message ${messageId.slice(-8)}:`, error.message);

      // ⚡ FIX: في حالة timeout أو خطأ، تأكد من تنظيف الـ queue
      const queue = this.customerQueues.get(customerId);
      if (queue && queue.length > 0) {
        // إزالة الرسالة التي فشلت من الـ queue
        const failedIndex = queue.findIndex(msg => msg.id === messageData.id);
        if (failedIndex !== -1) {
          queue.splice(failedIndex, 1);
          console.log(`🧹 [SINGLE] Removed failed message from queue for customer ${customerId}`);
        }
      }

      // إعادة throw الخطأ للتعامل معه في processBatch
      throw error;
    }
  }

  /**
   * فحص حالة الطوابير والتجميع التكيفي
   */
  getQueueStats() {
    const now = Date.now();
    const stats = {
      totalQueues: this.customerQueues.size,
      processingCustomers: this.processingCustomers.size,
      activeBatchTimers: this.batchTimers.size,
      totalPendingMessages: 0,
      batchWaitTime: this.BATCH_WAIT_TIME,
      queueDetails: [],
      stuckQueues: 0, // ⚡ NEW: عدد الـ queues العالقة
      oldestQueueAge: 0 // ⚡ NEW: عمر أقدم queue
    };

    for (const [customerId, queue] of this.customerQueues) {
      const queueAge = this.queueTimestamps.has(customerId)
        ? now - this.queueTimestamps.get(customerId)
        : 0;

      stats.totalPendingMessages += queue.length;

      // ⚡ NEW: تحديد إذا كان الـ queue عالق (أكثر من 5 دقائق)
      const isStuck = queueAge > 5 * 60 * 1000 && !this.processingCustomers.has(customerId);
      if (isStuck) {
        stats.stuckQueues++;
      }

      if (queueAge > stats.oldestQueueAge) {
        stats.oldestQueueAge = queueAge;
      }

      stats.queueDetails.push({
        customerId,
        queueLength: queue.length,
        isProcessing: this.processingCustomers.has(customerId),
        hasBatchTimer: this.batchTimers.has(customerId),
        queueAge: queueAge, // ⚡ NEW: عمر الـ queue
        oldestMessageAge: queue.length > 0 ? now - queue[0].queuedAt : 0, // ⚡ NEW: عمر أقدم رسالة
        isStuck: isStuck // ⚡ NEW: هل الـ queue عالق
      });
    }

    return stats;
  }

  /**
   * إبطال كاش إعدادات شركة معينة (للتحديث الفوري)
   */
  invalidateCompanyCache(companyId) {
    if (this.companyBatchSettings.has(companyId)) {
      this.companyBatchSettings.delete(companyId);
      console.log(`🗑️ [QUEUE-CACHE] Invalidated cache for company ${companyId}`);
    }
  }

  /**
   * إيقاف جميع المؤقتات وتنظيف النظام
   */
  shutdown() {
    //console.log('🛑 [ADAPTIVE-QUEUE] Shutting down adaptive queue system...');

    // إيقاف جميع المؤقتات
    for (const [customerId, timer] of this.batchTimers) {
      clearTimeout(timer);
      //console.log(`⏰ [ADAPTIVE-QUEUE] Cleared batch timer for customer ${customerId}`);
    }

    // تنظيف جميع المتغيرات
    this.batchTimers.clear();
    this.customerQueues.clear();
    this.processingCustomers.clear();
    this.queueTimestamps.clear();

    //console.log('✅ [ADAPTIVE-QUEUE] Adaptive queue system shutdown complete');
  }
}

// إنشاء مدير الطوابير
const messageQueueManager = new MessageQueueManager();


router.get('/', async (req, res) => {
  try {
    const stats = messageQueueManager.getQueueStats();

    // ⚡ NEW: Calculate load metrics
    const loadMetrics = {
      isHighLoad: stats.processingCustomers > 10 || stats.totalPendingMessages > 50,
      averageQueueSize: stats.totalQueues > 0 ? (stats.totalPendingMessages / stats.totalQueues).toFixed(2) : 0,
      oldestQueueAgeSeconds: (stats.oldestQueueAge / 1000).toFixed(2),
      stuckQueuesPercentage: stats.totalQueues > 0 ? ((stats.stuckQueues / stats.totalQueues) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        loadMetrics: loadMetrics,
        warnings: [
          ...(loadMetrics.isHighLoad ? ['⚠️ High queue load detected!'] : []),
          ...(stats.stuckQueues > 0 ? [`⚠️ ${stats.stuckQueues} stuck queue(s) detected!`] : []),
          ...(stats.oldestQueueAge > 5 * 60 * 1000 ? [`⚠️ Oldest queue is ${loadMetrics.oldestQueueAgeSeconds}s old!`] : [])
        ]
      },
      system: {
        type: 'Adaptive Batching Queue',
        version: '2.0',
        features: [
          'Sequential message processing',
          'Adaptive message batching',
          'Context-aware grouping',
          'AI-based delay configuration',
          'Dynamic batch window based on maxRepliesPerCustomer',
          'Queue load monitoring',
          'Stuck queue detection'
        ]
      }
    });
  } catch (error) {
    console.error('❌ Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      timestamp: new Date().toISOString()
    });
  }
});


module.exports = router;
module.exports.messageQueueManager = messageQueueManager;
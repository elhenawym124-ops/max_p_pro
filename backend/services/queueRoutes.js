const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

function getPrisma() {
  return getSharedPrismaClient();
}

const prisma = getPrisma();

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
    this.BATCH_WAIT_TIME = 500; // 500ms لتجميع الرسائل المتتالية من العميل
    this.companyBatchSettings = new Map(); // إعدادات خاصة بكل شركة
  }

  /**
   * الحصول على إعدادات الطابور لشركة معينة
   */
  async getCompanyQueueSettings(companyId) {
    // التحقق من الكاش أولاً
    if (this.companyBatchSettings.has(companyId)) {
      const cached = this.companyBatchSettings.get(companyId);
      // إعادة تحميل كل 30 دقيقة (محسّن من 5 دقائق)
      if (Date.now() - cached.lastUpdated < 30 * 60 * 1000) {
        return cached.settings;
      }
    }

    try {
      // محاولة قراءة الإعدادات من قاعدة البيانات
      const aiSettings = await prisma.aiSettings.findUnique({
        where: { companyId },
        select: { 
          autoReplyEnabled: true,
          maxRepliesPerCustomer: true,
          queueSettings: true
        }
      });

      // حساب batchWaitTime بناءً على حالة AI
      let batchWaitTime = 500; // القيمة الافتراضية عندما AI معطّل
      
      if (aiSettings?.autoReplyEnabled) {
        // إذا كان AI مفعّل، استخدم maxRepliesPerCustomer بعد تحويله من ثواني إلى ميللي ثانية
        const waitTimeInSeconds = aiSettings.maxRepliesPerCustomer || 5;
        batchWaitTime = waitTimeInSeconds * 1000;
        console.log(`✅ [QUEUE-CONFIG] AI is enabled - using maxRepliesPerCustomer: ${waitTimeInSeconds} seconds (${batchWaitTime}ms)`);
      } else {
        console.log(`⚠️ [QUEUE-CONFIG] AI is disabled - using default batchWaitTime: 500ms`);
      }

      let settings = {
        enabled: true,
        maxBatchSize: 10
      };

      if (aiSettings && aiSettings.queueSettings) {
        const parsedSettings = typeof aiSettings.queueSettings === 'string' 
          ? JSON.parse(aiSettings.queueSettings) 
          : aiSettings.queueSettings;
        
        settings = { ...settings, ...parsedSettings };
      }

      // تطبيق batchWaitTime المحسوب بناءً على AI (يأخذ الأولوية)
      settings.batchWaitTime = batchWaitTime;

      // حفظ في الكاش
      this.companyBatchSettings.set(companyId, {
        settings,
        lastUpdated: Date.now()
      });

      console.log(`🔧 [QUEUE-CONFIG] Final queue settings for company ${companyId}:`, settings);
      return settings;

    } catch (error) {
      console.error(`❌ [ADAPTIVE-QUEUE] Failed to load queue settings for company ${companyId}:`, error);
      
      // الإعدادات الافتراضية في حالة الخطأ
      const defaultSettings = {
        batchWaitTime: 500, // 500ms لتجميع رسائل العميل المتتالية
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
      //console.log(`⏰ [ADAPTIVE-QUEUE] Cancelled previous timer for customer ${customerId}, restarting`);
    }
    
    // بدء مؤقت للتجميع (حتى لو كانت رسالة واحدة، ننتظر احتمال وصول رسائل أخرى)
    if (batchWaitTime > 0 && queueSettings.enabled) {
      const timer = setTimeout(() => {
        console.log(`⏰ [BATCH] Timer expired for customer ${customerId} - processing ${queue.length} message(s)`);
        this.processBatch(customerId);
      }, batchWaitTime);
      
      this.batchTimers.set(customerId, timer);
      console.log(`⏰ [BATCH] Started ${batchWaitTime}ms timer for customer ${customerId} (${queue.length} message(s) queued)`);
    } else {
      // معالجة فورية إذا كان النظام معطل
      //console.log(`⚡ [ADAPTIVE-QUEUE] Queue system disabled, processing immediately for customer ${customerId}`);
      setTimeout(() => this.processBatch(customerId), 50); // تأخير بسيط لتجنب التداخل
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
    
    //console.log('✅ [ADAPTIVE-QUEUE] Adaptive queue system shutdown complete');
  }
}

// إنشاء مدير الطوابير
const messageQueueManager = new MessageQueueManager();


router.get('/', async (req, res) => {
  try {
    const stats = messageQueueManager.getQueueStats();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: stats,
      system: {
        type: 'Adaptive Batching Queue',
        version: '2.0',
        features: [
          'Sequential message processing',
          'Adaptive message batching',
          'Context-aware grouping',
          'AI-based delay configuration',
          'Dynamic batch window based on maxRepliesPerCustomer'
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
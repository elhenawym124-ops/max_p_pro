const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const { messageQueueManager } = require('./queueRoutes');
const verifyToken = require('../utils/verifyToken');

// Apply authentication middleware to all routes except public ones
// Public routes (no auth required): /currencies
router.use((req, res, next) => {
  // Skip authentication for public routes
  if (req.path === '/currencies') {
    return next();
  }
  // Apply authentication to all other routes
  verifyToken.authenticateToken(req, res, next);
});

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (token === 'mock-access-token' || token.includes('mock-signature')) {
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      role: 'COMPANY_ADMIN',
      companyId: 'cmd5c0c9y0000ymzdd7wtv7ib'
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'رمز المصادقة غير صحيح',
    code: 'INVALID_TOKEN'
  });
};

// Get company settings
router.get('/company', async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || 'cmd5c0c9y0000ymzdd7wtv7ib';

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Parse settings if they exist
    let settings = {};
    try {
      settings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      //console.log('Error parsing company settings:', error);
      settings = {};
    }

    // Default settings with safe values
    const defaultSettings = {
      currency: 'EGP',
      currencySymbol: 'جنيه',
      language: 'ar',
      timezone: 'Africa/Cairo',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'ar-EG',
      // Add safe defaults for frontend
      autoReply: false,
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    };

    const finalSettings = { ...defaultSettings, ...settings };

    // Ensure all nested objects exist
    if (!finalSettings.workingHours) {
      finalSettings.workingHours = defaultSettings.workingHours;
    }
    if (!finalSettings.notifications) {
      finalSettings.notifications = defaultSettings.notifications;
    }

    await getSharedPrismaClient().$disconnect();

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        settings: finalSettings
      }
    });

  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      details: error.message
    });
  }
});

// Update company settings
router.put('/company', async (req, res) => {
  try {
    const companyId = req.body.companyId || req.user?.companyId || 'cmd5c0c9y0000ymzdd7wtv7ib';
    const newSettings = req.body.settings || {};

    //console.log('Updating company settings:', companyId, newSettings);

    // Get current company
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Parse existing settings
    let currentSettings = {};
    try {
      currentSettings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      //console.log('Error parsing existing settings, starting fresh');
      currentSettings = {};
    }

    // Merge settings
    const updatedSettings = { ...currentSettings, ...newSettings };

    // Update company
    const updatedCompany = await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: {
        settings: JSON.stringify(updatedSettings)
      }
    });

    //console.log('Company settings updated successfully');

    await getSharedPrismaClient().$disconnect();

    res.json({
      success: true,
      data: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        settings: updatedSettings
      },
      message: 'تم تحديث الإعدادات بنجاح'
    });

  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

// Currency presets
router.get('/currencies', (req, res) => {
  const currencies = [
    {
      code: 'EGP',
      name: 'جنيه مصري',
      symbol: 'جنيه',
      symbolEn: 'EGP'
    },
    {
      code: 'SAR',
      name: 'ريال سعودي',
      symbol: 'ريال',
      symbolEn: 'SAR'
    },
    {
      code: 'AED',
      name: 'درهم إماراتي',
      symbol: 'درهم',
      symbolEn: 'AED'
    },
    {
      code: 'USD',
      name: 'دولار أمريكي',
      symbol: '$',
      symbolEn: 'USD'
    }
  ];

  res.json({
    success: true,
    data: currencies
  });
});

// ✅ Get aiMaxTokens value from database (for debugging)
router.get('/ai/max-tokens-check', async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const companyId = req.user.companyId;
    const aiSettings = await getSharedPrismaClient().aiSetting.findUnique({
      where: { companyId },
      select: {
        companyId: true,
        aiMaxTokens: true,
        updatedAt: true
      }
    });

    const { DEFAULT_AI_SETTINGS } = require('../services/aiAgent/aiConstants');

    res.json({
      success: true,
      data: {
        companyId,
        aiMaxTokens: aiSettings?.aiMaxTokens ?? null,
        defaultValue: DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS,
        actualValue: aiSettings?.aiMaxTokens ?? DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS,
        lastUpdated: aiSettings?.updatedAt?.toISOString() || null,
        status: aiSettings?.aiMaxTokens ?
          (aiSettings.aiMaxTokens === DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS ? 'default' : 'custom') :
          'not_set'
      }
    });
  } catch (error) {
    console.error('Error checking aiMaxTokens:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get AI settings (with database fallback)
router.get('/ai', async (req, res) => {
  try {
    //console.log('📥 [AI-SETTINGS] GET request received');

    // التحقق من وجود معلومات المستخدم والشركة
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لإعدادات AI',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    //console.log('🏢 [AI-SETTINGS] Loading settings for company:', companyId);

    let settings = {
      qualityEvaluationEnabled: true,
      autoReplyEnabled: false,
      confidenceThreshold: 0.7,
      multimodalEnabled: true,
      ragEnabled: true,
      replyMode: 'all', // ✅ NEW: Default reply mode
      companyId // إضافة companyId للتحقق
    };

    // أولاً: محاولة قراءة من قاعدة البيانات
    try {

      const aiSettings = await getSharedPrismaClient().aiSetting.findUnique({
        where: { companyId },
        select: {
          qualityEvaluationEnabled: true,
          autoReplyEnabled: true,
          confidenceThreshold: true,
          multimodalEnabled: true,
          ragEnabled: true,
          replyMode: true, // ✅ NEW: Include reply mode
          // Advanced fields
          aiTemperature: true,
          aiTopP: true,
          aiTopK: true,
          aiMaxTokens: true,
          aiResponseStyle: true,
          enableDiversityCheck: true,
          enableToneAdaptation: true,
          enableEmotionalResponse: true,
          enableSmartSuggestions: true,
          enableLongTermMemory: true,
          maxMessagesPerConversation: true,
          memoryRetentionDays: true,
          minQualityScore: true,
          enableLowQualityAlerts: true,
          companyId: true, // إضافة companyId للتحقق
          // ✅ FIX: Add personalityPrompt and responsePrompt to select

          responsePrompt: true
        }
      });

      if (aiSettings) {
        settings = { ...settings, ...aiSettings };
        // Safe defaults for advanced fields if not present
        settings.replyMode = settings.replyMode || 'all'; // ✅ NEW: Ensure reply mode has default
        settings.aiTemperature = settings.aiTemperature ?? 0.7;
        settings.aiTopP = settings.aiTopP ?? 0.9;
        settings.aiTopK = settings.aiTopK ?? 40;
        settings.aiMaxTokens = settings.aiMaxTokens ?? 2048; // ✅ توحيد: 2048
        settings.aiResponseStyle = settings.aiResponseStyle || 'balanced';
        settings.enableDiversityCheck = settings.enableDiversityCheck !== false;
        settings.enableToneAdaptation = settings.enableToneAdaptation !== false;
        settings.enableEmotionalResponse = settings.enableEmotionalResponse !== false;
        settings.enableSmartSuggestions = settings.enableSmartSuggestions || false;
        settings.enableLongTermMemory = settings.enableLongTermMemory || false;
        settings.maxMessagesPerConversation = settings.maxMessagesPerConversation || 50;
        settings.memoryRetentionDays = settings.memoryRetentionDays || 30;
        settings.minQualityScore = settings.minQualityScore ?? 70;
        settings.enableLowQualityAlerts = settings.enableLowQualityAlerts !== false;
        //console.log('✅ [AI-SETTINGS] Loaded from database:', settings);

        res.json({
          success: true,
          data: settings
        });
        return;
      }
    } catch (dbError) {
      console.error(`❌ [AI-SETTINGS] Database error:`, dbError);
      //console.log(`⚠️ [AI-SETTINGS] Database not available, using temporary system: ${dbError.message}`);
    }

    // ❌ REMOVED: Temporary JSON file fallback (caused shared state issues)
    /*
    const fs = require('fs');
    ...
    */
    // If we are here, DB query failed or returned nothing, and we already handled settings object above.
    // Ensure we return the safe defaults we initialized at the top.

    //console.log('🔧 [AI-SETTINGS] Using system defaults (DB record missing or error)');


    const response = {
      success: true,
      data: settings
    };

    //console.log('📤 [AI-SETTINGS] Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ [AI-SETTINGS] Error fetching AI settings:', error.message);
    console.error('❌ [AI-SETTINGS] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI settings',
      details: error.message
    });
  }
});

// Update AI settings (with database fallback)
router.put('/ai', async (req, res) => {
  try {
    //console.log('📥 [AI-SETTINGS] Received update request:', req.body);

    // التحقق من وجود معلومات المستخدم والشركة
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب لتحديث إعدادات AI',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    console.log('🏢 [AI-SETTINGS-API] Updating settings for company:', companyId);

    const {
      qualityEvaluationEnabled, autoReplyEnabled, confidenceThreshold, multimodalEnabled, ragEnabled,
      replyMode, // ✅ NEW: Reply mode setting
      // Advanced fields
      aiTemperature, aiTopP, aiTopK, aiMaxTokens, aiResponseStyle,
      enableDiversityCheck, enableToneAdaptation, enableEmotionalResponse,
      enableSmartSuggestions, enableLongTermMemory,
      maxMessagesPerConversation, memoryRetentionDays,
      minQualityScore, enableLowQualityAlerts,
      // ✅ FIX: Add personalityPrompt and responsePrompt
      responsePrompt
    } = req.body;

    console.log('🔥 [AI-SETTINGS-UPDATE] HIT - Processing Update Request');
    console.log('🔥 [AI-SETTINGS-UPDATE] AutoReplyEnabled (Incoming):', autoReplyEnabled, 'Type:', typeof autoReplyEnabled);
    console.log('🔥 [AI-SETTINGS-UPDATE] ReplyMode (Incoming):', replyMode);

    const updateData = {};
    if (qualityEvaluationEnabled !== undefined) updateData.qualityEvaluationEnabled = qualityEvaluationEnabled;
    if (autoReplyEnabled !== undefined) updateData.autoReplyEnabled = autoReplyEnabled;
    if (confidenceThreshold !== undefined) updateData.confidenceThreshold = confidenceThreshold;
    if (multimodalEnabled !== undefined) updateData.multimodalEnabled = multimodalEnabled;
    if (ragEnabled !== undefined) updateData.ragEnabled = ragEnabled;
    if (replyMode !== undefined) updateData.replyMode = replyMode; // ✅ FIXED: Check for undefined, not truthy

    console.log('🔍 [AI-SETTINGS-API] updateData object:', JSON.stringify(updateData));
    // Advanced fields
    if (aiTemperature !== undefined) updateData.aiTemperature = aiTemperature;
    if (aiTopP !== undefined) updateData.aiTopP = aiTopP;
    if (aiTopK !== undefined) updateData.aiTopK = aiTopK;
    if (aiMaxTokens !== undefined) updateData.aiMaxTokens = aiMaxTokens;
    if (aiResponseStyle) updateData.aiResponseStyle = aiResponseStyle;
    if (enableDiversityCheck !== undefined) updateData.enableDiversityCheck = enableDiversityCheck;
    if (enableToneAdaptation !== undefined) updateData.enableToneAdaptation = enableToneAdaptation;
    if (enableEmotionalResponse !== undefined) updateData.enableEmotionalResponse = enableEmotionalResponse;
    if (enableSmartSuggestions !== undefined) updateData.enableSmartSuggestions = enableSmartSuggestions;
    if (enableLongTermMemory !== undefined) updateData.enableLongTermMemory = enableLongTermMemory;
    if (maxMessagesPerConversation !== undefined) updateData.maxMessagesPerConversation = maxMessagesPerConversation;
    if (memoryRetentionDays !== undefined) updateData.memoryRetentionDays = memoryRetentionDays;
    if (minQualityScore !== undefined) updateData.minQualityScore = minQualityScore;
    if (enableLowQualityAlerts !== undefined) updateData.enableLowQualityAlerts = enableLowQualityAlerts;

    // ✅ FIX: Add personalityPrompt and responsePrompt to updateData

    if (responsePrompt !== undefined) updateData.responsePrompt = responsePrompt;

    // أولاً: محاولة حفظ في قاعدة البيانات
    try {
      const aiSettings = await getSharedPrismaClient().aiSetting.upsert({
        where: { companyId },
        update: updateData,
        create: {
          companyId,
          qualityEvaluationEnabled: qualityEvaluationEnabled !== false,
          autoReplyEnabled: autoReplyEnabled || false,
          confidenceThreshold: confidenceThreshold || 0.7,
          multimodalEnabled: multimodalEnabled !== false,
          ragEnabled: ragEnabled !== false,
          replyMode: replyMode || 'all', // ✅ NEW: Default to "all"
          // ✅ Advanced defaults (using constants)
          aiTemperature: aiTemperature ?? 0.7, // Will be overridden by constants in settingsManager
          aiTopP: aiTopP ?? 0.9,
          aiTopK: aiTopK ?? 40,
          aiMaxTokens: aiMaxTokens ?? 2048, // ✅ توحيد: 2048 (متوافق مع constants)
          aiResponseStyle: aiResponseStyle || 'balanced',
          enableDiversityCheck: enableDiversityCheck !== undefined ? enableDiversityCheck : true,
          enableToneAdaptation: enableToneAdaptation !== undefined ? enableToneAdaptation : true,
          enableEmotionalResponse: enableEmotionalResponse !== undefined ? enableEmotionalResponse : true,
          enableSmartSuggestions: enableSmartSuggestions || false,
          enableLongTermMemory: enableLongTermMemory || false,
          maxMessagesPerConversation: maxMessagesPerConversation ?? 50,
          memoryRetentionDays: memoryRetentionDays ?? 30,
          minQualityScore: minQualityScore ?? 70,
          enableLowQualityAlerts: enableLowQualityAlerts !== undefined ? enableLowQualityAlerts : true,
          // ✅ FIX: Add personalityPrompt and responsePrompt to create

          responsePrompt: responsePrompt || null,
          updatedAt: new Date()
        }
      });

      console.log('✅ [AI-SETTINGS-API] Saved to database successfully');
      console.log('🔍 [AI-SETTINGS-API] Saved replyMode value:', aiSettings.replyMode);
      console.log('🔍 [AI-SETTINGS-API] Saved aiMaxTokens value:', aiSettings.aiMaxTokens); // ✅ إضافة logging للقيمة المحفوظة
      console.log('🔍 [AI-SETTINGS-API] Full saved object:', JSON.stringify({
        id: aiSettings.id,
        companyId: aiSettings.companyId,
        replyMode: aiSettings.replyMode,
        aiMaxTokens: aiSettings.aiMaxTokens, // ✅ إضافة aiMaxTokens للـ logging
        autoReplyEnabled: aiSettings.autoReplyEnabled
      }));

      // إبطال كاش الطوابير والتحديث الفوري
      messageQueueManager.invalidateCompanyCache(companyId);
      // إبطال كاش إعدادات AI في webhookController
      const { invalidateAISettingsCache } = require('../controller/webhookController');
      invalidateAISettingsCache(companyId);

      res.json({
        success: true,
        data: {
          ...updateData,
          updatedAt: new Date().toISOString()
        },
        message: 'AI settings updated successfully in database'
      });
      return;
    } catch (dbError) {
      //console.log(`⚠️ [AI-SETTINGS] Database not available, using temporary system: ${dbError.message}`);
    }

    // ❌ REMOVED: Temporary JSON file fallback
    /*
    const fs = require('fs');
    ...
    */

    // If DB update failed, we must report error, NOT fall back to a local file that other companies might read
    console.error('❌ [AI-SETTINGS] Database update failed and file fallback is disabled.');
    res.status(500).json({
      success: false,
      error: 'Failed to update settings in database',
      details: 'Database unavailable'
    });
    return;

    //console.log(`✅ [AI-SETTINGS] Updated settings:`, settings);

    const response = {
      success: true,
      data: settings,
      message: 'AI settings updated successfully'
    };

    //console.log('📤 [AI-SETTINGS] Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ [AI-SETTINGS] Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI settings'
    });
  }
});

// Get Queue Settings
router.get('/queue', async (req, res) => {
  try {
    //console.log('📥 [QUEUE-SETTINGS] GET request received');

    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لإعدادات الطوابير',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    //console.log('🏢 [QUEUE-SETTINGS] Loading queue settings for company:', companyId);

    let settings = {
      batchWaitTime: 500,
      enabled: true,
      maxBatchSize: 10,
      description: 'إعدادات تجميع الرسائل المتتالية',
      companyId
    };

    // Try to get from database first
    try {
      const aiSettings = await getSharedPrismaClient().aiSetting.findUnique({
        where: { companyId },
        select: {
          companyId: true,
          maxRepliesPerCustomer: true,
          queueSettings: true
        }
      });

      if (aiSettings) {
        // دمج queueSettings إذا كانت موجودة
        if (aiSettings.queueSettings) {
          const parsedSettings = typeof aiSettings.queueSettings === 'string'
            ? JSON.parse(aiSettings.queueSettings)
            : aiSettings.queueSettings;

          settings = { ...settings, ...parsedSettings };
        }

        // استخدام maxRepliesPerCustomer كـ batchWaitTime (المصدر الأساسي)
        // maxRepliesPerCustomer بالثواني - نحوله إلى ميللي ثانية
        if (aiSettings.maxRepliesPerCustomer) {
          settings.batchWaitTime = aiSettings.maxRepliesPerCustomer * 1000;
        }

        console.log('✅ [QUEUE-SETTINGS] Loaded from database:', settings);

        res.json({ success: true, data: settings });
        return;
      }
    } catch (dbError) {
      console.error(`❌ [QUEUE-SETTINGS] Database error:`, dbError);
      console.log(`⚠️ [QUEUE-SETTINGS] Using default settings`);
    }

    // Return default settings
    const response = { success: true, data: settings };
    //console.log('📤 [QUEUE-SETTINGS] Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ [QUEUE-SETTINGS] Error fetching queue settings:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue settings',
      details: error.message
    });
  }
});

// Update Queue Settings
router.put('/queue', async (req, res) => {
  try {
    //console.log('📥 [QUEUE-SETTINGS] Received update request:', req.body);

    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب لتحديث إعدادات الطوابير',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    //console.log('🏢 [QUEUE-SETTINGS] Updating settings for company:', companyId);

    const { batchWaitTime, enabled, maxBatchSize, description } = req.body;

    // Validate input
    if (batchWaitTime && (batchWaitTime < 1000 || batchWaitTime > 30000)) {
      return res.status(400).json({
        success: false,
        error: 'وقت الانتظار يجب أن يكون بين 1 و 30 ثانية'
      });
    }

    if (maxBatchSize && (maxBatchSize < 1 || maxBatchSize > 50)) {
      return res.status(400).json({
        success: false,
        error: 'حد المجموعة يجب أن يكون بين 1 و 50 رسالة'
      });
    }

    // batchWaitTime يأتي بالمللي ثانية من الواجهة (1-30 ثانية = 1000-30000 ميللي ثانية)
    // نحوله إلى ثواني لحفظه في maxRepliesPerCustomer
    const maxRepliesValue = batchWaitTime ? Math.floor(batchWaitTime / 1000) : 5;

    const queueSettingsData = {
      batchWaitTime: batchWaitTime || 500,
      enabled: enabled !== false,
      maxBatchSize: maxBatchSize || 10,
      description: description || 'إعدادات تجميع الرسائل المتتالية',
      updatedAt: new Date().toISOString()
    };

    try {
      // Try to save to database
      const aiSettings = await getSharedPrismaClient().aiSetting.upsert({
        where: { companyId },
        update: {
          queueSettings: JSON.stringify(queueSettingsData),
          maxRepliesPerCustomer: maxRepliesValue, // حفظ في maxRepliesPerCustomer
          updatedAt: new Date()
        },
        create: {
          companyId,
          queueSettings: JSON.stringify(queueSettingsData),
          maxRepliesPerCustomer: maxRepliesValue, // حفظ في maxRepliesPerCustomer
          autoReplyEnabled: false,
          confidenceThreshold: 0.7,
          updatedAt: new Date()
        },
        select: {
          queueSettings: true,
          maxRepliesPerCustomer: true,
          companyId: true,
          updatedAt: true
        }
      });

      //console.log('✅ [QUEUE-SETTINGS] Saved to database:', aiSettings);

      // إبطال كاش الطوابير والتحديث الفوري
      messageQueueManager.invalidateCompanyCache(companyId);
      // إبطال كاش إعدادات AI في webhookController
      const { invalidateAISettingsCache } = require('../controller/webhookController');
      invalidateAISettingsCache(companyId);

      res.json({
        success: true,
        data: {
          ...queueSettingsData,
          companyId: aiSettings.companyId,
          savedAt: aiSettings.updatedAt
        },
        message: 'تم حفظ إعدادات الطوابير بنجاح في قاعدة البيانات'
      });
      return;

    } catch (dbError) {
      console.error('❌ [QUEUE-SETTINGS] Database error:', dbError);

      // Fallback to file storage
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(__dirname, '../../temp_queue_settings.json');

      try {
        let fileSettings = {};

        // Read existing file if it exists
        if (fs.existsSync(settingsPath)) {
          const existingData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          fileSettings = existingData;
        }

        fileSettings[companyId] = queueSettingsData;
        fs.writeFileSync(settingsPath, JSON.stringify(fileSettings, null, 2));
        //console.log('✅ [QUEUE-SETTINGS] Saved to file fallback');

        res.json({
          success: true,
          data: queueSettingsData,
          message: 'تم حفظ إعدادات الطوابير بنجاح (نظام مؤقت)',
          fallback: true
        });
      } catch (fileError) {
        console.error('❌ [QUEUE-SETTINGS] File fallback error:', fileError);
        throw fileError;
      }
    }
  } catch (error) {
    console.error('❌ [QUEUE-SETTINGS] Error updating queue settings:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update queue settings',
      details: error.message
    });
  }
});

// ============================================
// 💡 Recommendation Settings Endpoints
// ============================================

// Get recommendation settings
router.get('/recommendation-settings', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لإعدادات التوصيات',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;

    // محاولة جلب الإعدادات من قاعدة البيانات
    try {
      // البحث في Company.settings JSON field
      const company = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId },
        select: { settings: true }
      });

      if (company && company.settings) {
        try {
          const parsedSettings = JSON.parse(company.settings);
          if (parsedSettings.recommendationSettings) {
            return res.json({
              success: true,
              data: parsedSettings.recommendationSettings
            });
          }
        } catch (e) {
          // JSON parsing failed, continue to defaults
        }
      }
    } catch (dbError) {
      console.error('❌ [RECOMMENDATION-SETTINGS] Database error:', dbError);
    }

    // إعدادات افتراضية
    const defaultSettings = {
      companyId,
      enableRelatedProducts: true,
      enableFrequentlyBought: true,
      enableUpsell: true,
      enableCartRecommendations: true,
      relatedProductsLimit: 6,
      frequentlyBoughtLimit: 4,
      upsellLimit: 4,
      cartRecommendationsLimit: 6,
      minOrdersForFrequentlyBought: 5,
      upsellPriceRange: 20
    };

    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('❌ [RECOMMENDATION-SETTINGS] Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendation settings',
      details: error.message
    });
  }
});

// Update recommendation settings
router.post('/recommendation-settings', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب لتحديث إعدادات التوصيات',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    const settings = req.body;

    // التحقق من البيانات
    if (!settings.companyId || settings.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة غير متطابق'
      });
    }

    try {
      // جلب الإعدادات الحالية للشركة
      const company = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId },
        select: { settings: true }
      });

      let currentSettings = {};
      if (company && company.settings) {
        try {
          currentSettings = JSON.parse(company.settings);
        } catch (e) {
          currentSettings = {};
        }
      }

      // تحديث إعدادات التوصيات
      currentSettings.recommendationSettings = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      // حفظ في قاعدة البيانات
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: {
          settings: JSON.stringify(currentSettings)
        }
      });

      res.json({
        success: true,
        data: currentSettings.recommendationSettings,
        message: 'تم حفظ إعدادات التوصيات بنجاح'
      });
    } catch (dbError) {
      console.error('❌ [RECOMMENDATION-SETTINGS] Database error:', dbError);
      res.status(500).json({
        success: false,
        error: 'Failed to save recommendation settings',
        details: dbError.message
      });
    }
  } catch (error) {
    console.error('❌ [RECOMMENDATION-SETTINGS] Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recommendation settings',
      details: error.message
    });
  }
});

module.exports = router;


/**
 * Settings Manager Module
 * 
 * هذا الـ module مسؤول عن إدارة إعدادات الذكاء الاصطناعي: جلب الإعدادات، تحديثها، جلب prompts الشركة
 * تم نقله من aiAgentService.js لتسهيل الصيانة
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const redisCacheService = require('../redisCacheService');
// ✅ استخدام الـ constants المركزي
const { DEFAULT_AI_SETTINGS } = require('./aiConstants');

class SettingsManager {
  constructor(aiAgentService) {
    // ❌ REMOVED: this.prisma - لا نستخدم Prisma client مباشرة، بل نستخدم getSharedPrismaClient() داخل safeQuery
    // this.prisma = getSharedPrismaClient(); // ❌ Removed to prevent stale client usage
    // ✅ حفظ reference لـ aiAgentService للوصول للدوال المساعدة
    this.aiAgentService = aiAgentService;

    // ✅ Redis Cache Configuration
    this.CACHE_TTL_SECONDS = 300; // 5 minutes default for Redis
  }

  /**
   * Helper: Get from cache (Async)
   */
  async getFromCache(key) {
    return await redisCacheService.get(key);
  }

  /**
   * Helper: Set to cache (Async)
   */
  async setCache(key, data, ttlSeconds = this.CACHE_TTL_SECONDS) {
    await redisCacheService.set(key, data, ttlSeconds);
  }

  /**
   * Helper: Invalidate cache for a company
   */
  async invalidateCompanyCache(companyId) {
    await Promise.all([
      redisCacheService.del(`settings_${companyId}`),
      redisCacheService.del(`prompts_${companyId}`),
      redisCacheService.del(`prompts_v2_${companyId}_normal`),
      redisCacheService.del(`prompts_v2_${companyId}_custom`)
    ]);
    console.log(`🧹 [CACHE-INVALIDATE] Cleared Redis settings cache for ${companyId}`);
  }

  /**
   * Get company prompts and settings
   */
  async getCompanyPrompts(companyId, customPrompt = null) {
    console.log('🔍 [GET-COMPANY-PROMPTS] Getting company prompts for:', companyId);

    // 1. Security Check & Default Fallback
    const defaultResponse = {
      personalityPrompt: `أنت مساعد ذكي محترف وودود لخدمة العملاء.
تتحدث بشكل طبيعي ومحترم مع العملاء باللغة العربية.
تساعد العملاء في الإجابة على استفساراتهم وتقديم المساعدة.
تكون مفيداً ومهذباً في جميع التعاملات.`,
      responseRules: null,
      hasCustomPrompts: false,
      source: 'default_fallback'
    };

    if (!companyId) {
      console.error('❌ [SECURITY] companyId is required for getCompanyPrompts');
      return { ...defaultResponse, source: 'security_fallback' };
    }

    try {
      // ✅ Cache Check (Highest priority after direct customPrompt check below)
      const cacheKey = `prompts_v2_${companyId}_${customPrompt ? 'custom' : 'normal'}`;
      const cached = await this.getFromCache(cacheKey);
      if (cached) return cached;

      // 2. Fetch Base Settings first (Response Rules source)
      let aiSettings = null;
      try {
        aiSettings = await safeQuery(async () => {
          const prisma = getSharedPrismaClient();
          if (!prisma || !prisma.aiSettings) {
            throw new Error('Prisma client not initialized');
          }
          return await prisma.aiSettings.findFirst({ where: { companyId } });
        }, 5);
      } catch (e) {
        console.error('❌ Error fetching AI settings:', e.message);
      }

      const responseRules = aiSettings?.responseRules || null;
      let personalityPrompt = null;
      let source = 'unknown';

      // 3. Resolve Personality Prompt (Priority Order)

      // A. HIGHEST: Custom prompt from messageData (Comments/Posts)
      if (customPrompt && customPrompt.trim()) {
        personalityPrompt = customPrompt.trim();
        source = 'custom_message_prompt';
      }

      // B. SECOND: Custom Rules from aiSettings.responseRules
      if (!personalityPrompt && responseRules) {
        try {
          const rules = JSON.parse(responseRules);
          const customRules = rules.customRules?.trim();
          if (customRules && !this._isPlaceholder(customRules)) {
            personalityPrompt = customRules;
            source = 'response_rules_custom';
          }
        } catch (e) {
          console.error('❌ Error parsing responseRules for persona:', e.message);
        }
      }

      // C. THIRD: SystemPrompt Override
      if (!personalityPrompt) {
        try {
          const activeSystemPrompt = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma || !prisma.systemPrompt) {
              throw new Error('Prisma client not initialized');
            }
            return await prisma.systemPrompt.findFirst({
              where: { isActive: true, companyId },
              orderBy: { updatedAt: 'desc' }
            });
          }, 5);

          if (activeSystemPrompt?.content && !this._isPlaceholder(activeSystemPrompt.content)) {
            personalityPrompt = activeSystemPrompt.content.trim();
            source = 'system_prompt_override';
          }
        } catch (e) {
          console.error('❌ Error checking system prompts:', e.message);
        }
      }

      // 4. Final Construction & Fallback
      const result = {
        personalityPrompt: personalityPrompt || defaultResponse.personalityPrompt,
        responseRules: responseRules,
        hasCustomPrompts: source !== 'default_fallback' && !!personalityPrompt,
        source: personalityPrompt ? source : 'default_fallback'
      };

      console.log(`✅ [GET-COMPANY-PROMPTS] Resolved Prompt. Source: ${result.source}, HasRules: ${!!result.responseRules}`);

      await this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('❌ Error in getCompanyPrompts:', error);
      return { ...defaultResponse, source: 'error_fallback' };
    }
  }

  /**
   * Helper: Check if prompt content is a placeholder
   */
  _isPlaceholder(content) {
    if (!content) return true;
    const trimmed = content.trim();
    return (
      trimmed.startsWith('# يجب إعداد شخصية المساعد الذكي') ||
      trimmed.startsWith('#يجب إعداد شخصية المساعد الذكي') ||
      trimmed.includes('يجب إعداد شخصية المساعد الذكي من لوحة التحكم') ||
      trimmed.startsWith('يجب إعداد شخصية المساعد الذكي')
    );
  }

  /**
   * Reload system prompt (called when prompt is activated)
   */
  async reloadSystemPrompt() {
    try {
      ////console.log('🔄 Reloading system prompt...');
      // Clear any cached prompts if needed
      if (this.aiAgentService.cachedPrompts) {
        this.aiAgentService.cachedPrompts = null;
      }

      // ✅ Clear internal cache
      await redisCacheService.flush();
      console.log('🧹 [CACHE-CLEAR] Cleared all settings cache due to system prompt reload');

      ////console.log('✅ System prompt reloaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error reloading system prompt:', error);
      return false;
    }
  }

  /**
   * Get AI settings
   */
  async getSettings(companyId) {
    try {
      // ✅ Cache Check for Settings
      if (companyId) {
        const cached = await this.getFromCache(`settings_${companyId}`);
        if (cached) return cached;
      }

      ////console.log('🔍 [aiAgentService] Loading settings from database...');

      // Require companyId for security
      if (!companyId) {
        console.error('❌ [SECURITY] companyId is required for getSettings');
        return {
          isEnabled: false,
          workingHours: { start: '09:00', end: '18:00' },
          workingHoursEnabled: false,
          maxRepliesPerCustomer: 5,
          multimodalEnabled: true,
          ragEnabled: true,
          learningEnabled: true,
          replyMode: 'all' // ✅ Default reply mode
        };
      }

      const company = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        if (!prisma || !prisma.company) {
          throw new Error('Prisma client not initialized');
        }
        return await prisma.company.findUnique({ where: { id: companyId } });
      }, 5); // Priority 5 - عملية عادية (جلب إعدادات)
      ////console.log(`🏢 [aiAgentService] Using specific company: ${companyId}`);
      if (!company) {
        ////console.log('❌ [aiAgentService] No company found');
        return {
          isEnabled: false,
          workingHours: { start: '09:00', end: '18:00' },
          workingHoursEnabled: false,
          maxRepliesPerCustomer: 5,
          multimodalEnabled: true,
          ragEnabled: true,
          learningEnabled: true,
          replyMode: 'all' // ✅ Default reply mode
        };
      }

      ////console.log(`🏢 [aiAgentService] Company: ${company.id}`);

      // Get AI settings for the company
      const aiSettings = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        if (!prisma || !prisma.aiSettings) {
          throw new Error('Prisma client not initialized');
        }
        return await prisma.aiSettings.findFirst({
          where: { companyId: company.id },
          select: {
            id: true,
            companyId: true,
            replyMode: true, // ✅ Explicitly select replyMode
            autoReplyEnabled: true,
            maxRepliesPerCustomer: true,
            multimodalEnabled: true,
            ragEnabled: true,
            workingHours: true,
            workingHoursEnabled: true,
            maxMessagesPerConversation: true,
            memoryRetentionDays: true,
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
            minQualityScore: true,
            enableLowQualityAlerts: true,
            maxConversationsPerUser: true,
            autoCleanup: true,
            compressionEnabled: true
          }
        });
      }, 5); // Priority 5 - عملية عادية (جلب إعدادات)

      // //console.log(`⚙️ [aiAgentService] AI Settings found: ${!!aiSettings}`);
      // //console.log(`🔍 [aiAgentService] Raw aiSettings from DB:`, {
      //   id: aiSettings?.id,
      //   companyId: aiSettings?.companyId,
      //   replyMode: aiSettings?.replyMode,
      //   autoReplyEnabled: aiSettings?.autoReplyEnabled,
      //   allKeys: aiSettings ? Object.keys(aiSettings) : []
      // });

      // ✅ Enhanced logging for replyMode debugging
      if (aiSettings) {
        // //console.log(`🔍 [aiAgentService] ReplyMode value from DB: "${aiSettings.replyMode}" (type: ${typeof aiSettings.replyMode})`);
        // //console.log(`🔍 [aiAgentService] ReplyMode === 'new_only': ${aiSettings.replyMode === 'new_only'}`);
        // //console.log(`🔍 [aiAgentService] ReplyMode === 'all': ${aiSettings.replyMode === 'all'}`);
      }

      if (!aiSettings) {
        ////console.log('❌ [aiAgentService] No AI settings found, returning defaults');
        return {
          isEnabled: false,
          workingHours: { start: '09:00', end: '18:00' },
          workingHoursEnabled: false,
          maxRepliesPerCustomer: 5,
          multimodalEnabled: true,
          ragEnabled: true,
          learningEnabled: true,
          replyMode: 'all' // ✅ Default reply mode
        };
      }

      ////console.log('🔍 [aiAgentService] Raw settings:', {
      //   autoReplyEnabled: aiSettings.autoReplyEnabled,
      //   workingHours: aiSettings.workingHours,
      //   maxRepliesPerCustomer: aiSettings.maxRepliesPerCustomer,
      //   multimodalEnabled: aiSettings.multimodalEnabled,
      //   ragEnabled: aiSettings.ragEnabled,
      //   hasPersonalityPrompt: !!aiSettings.personalityPrompt
      // });

      // Parse working hours
      let workingHours = { start: '09:00', end: '18:00' };
      try {
        if (aiSettings.workingHours) {
          workingHours = JSON.parse(aiSettings.workingHours);
          ////console.log('✅ [aiAgentService] Working hours parsed:', workingHours);
        }
      } catch (e) {
        ////console.log('⚠️ [aiAgentService] Failed to parse working hours, using defaults');
      }

      // Check if working hours are enabled (for now, disable working hours check)
      const workingHoursEnabled = false; // aiSettings.workingHoursEnabled || false;
      ////console.log(`🕐 [aiAgentService] Working hours check ${workingHoursEnabled ? 'ENABLED' : 'DISABLED'} - AI will work ${workingHoursEnabled ? 'within working hours only' : '24/7'}`);

      const settings = {
        isEnabled: aiSettings.autoReplyEnabled || false,
        autoReplyEnabled: aiSettings.autoReplyEnabled || false, // ✅ Alias for backward compatibility
        workingHours,
        workingHoursEnabled,
        maxRepliesPerCustomer: aiSettings.maxRepliesPerCustomer || 5,
        multimodalEnabled: aiSettings.multimodalEnabled || true,
        ragEnabled: aiSettings.ragEnabled || true,
        learningEnabled: true, // Always enabled for now
        replyMode: aiSettings.replyMode ?? 'all', // ✅ FIXED: Use nullish coalescing instead of ||
        // Memory controls
        maxMessagesPerConversation: aiSettings.maxMessagesPerConversation || 50,
        memoryRetentionDays: aiSettings.memoryRetentionDays || 30,
        // ✅ Dynamic generation config (القيم من قاعدة البيانات - مصدرها الواجهة)
        // ⚠️ القيمة الافتراضية موجودة في الواجهة فقط (AIManagement.tsx)
        aiTemperature: aiSettings.aiTemperature ?? DEFAULT_AI_SETTINGS.TEMPERATURE,
        aiTopP: aiSettings.aiTopP ?? DEFAULT_AI_SETTINGS.TOP_P,
        aiTopK: aiSettings.aiTopK ?? DEFAULT_AI_SETTINGS.TOP_K,
        aiMaxTokens: aiSettings.aiMaxTokens ?? DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS, // ⚠️ fallback فقط
        aiResponseStyle: aiSettings.aiResponseStyle || 'balanced',
        // Smart behavior toggles
        enableDiversityCheck: aiSettings.enableDiversityCheck !== false,
        enableToneAdaptation: aiSettings.enableToneAdaptation !== false,
        enableEmotionalResponse: aiSettings.enableEmotionalResponse !== false,
        enableSmartSuggestions: aiSettings.enableSmartSuggestions || false,
        enableLongTermMemory: aiSettings.enableLongTermMemory || false,
        minQualityScore: aiSettings.minQualityScore ?? 70,
        enableLowQualityAlerts: aiSettings.enableLowQualityAlerts !== false
      };

      // ✅ Enhanced logging: Show what we're returning
      //console.log(`📤 [aiAgentService] Returning settings with replyMode: "${settings.replyMode}"`);
      //console.log(`📤 [aiAgentService] Raw replyMode from DB: "${aiSettings.replyMode}" (type: ${typeof aiSettings.replyMode})`);

      // ✅ Update Cache
      if (companyId) {
        await this.setCache(`settings_${companyId}`, settings);
      }
      return settings;

    } catch (error) {
      console.error('❌ [aiAgentService] Error loading settings:', error);
      return {
        isEnabled: false,
        autoReplyEnabled: false, // ✅ Alias for backward compatibility
        workingHours: { start: '09:00', end: '18:00' },
        workingHoursEnabled: false,
        maxRepliesPerCustomer: 5,
        multimodalEnabled: true,
        ragEnabled: true,
        learningEnabled: true,
        replyMode: 'all' // ✅ Default reply mode
      };
    }
  }

  /**
   * Update AI settings in database
   */
  async updateSettings(settings, companyId) {
    try {
      console.log('🔧 [AIAgent] Updating AI settings:', {
        companyId,
        settingsKeys: Object.keys(settings),
        hasPersonalityPrompt: !!settings.personalityPrompt,
        personalityPromptLength: settings.personalityPrompt ? settings.personalityPrompt.length : 0,
        hasResponseRules: !!settings.responseRules,
        responseRulesLength: settings.responseRules ? settings.responseRules.length : 0
      });

      // Require companyId for security
      if (!companyId) {
        throw new Error('Company ID is required for security');
      }

      const company = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        if (!prisma || !prisma.company) {
          throw new Error('Prisma client not initialized');
        }
        return await prisma.company.findUnique({ where: { id: companyId } });
      }, 5); // Priority 5 - عملية عادية

      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }

      // Check if AI settings exist
      let aiSettings = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        if (!prisma || !prisma.aiSettings) {
          throw new Error('Prisma client not initialized');
        }
        return await prisma.aiSettings.findUnique({
          where: { companyId: company.id }
        });
      }, 5); // Priority 5 - عملية عادية

      if (aiSettings) {
        // Update existing settings
        aiSettings = await safeQuery(async () => {
          const prisma = getSharedPrismaClient();
          if (!prisma || !prisma.aiSettings) {
            throw new Error('Prisma client not initialized');
          }
          return await prisma.aiSettings.update({
            where: { companyId: company.id },
            data: {
              autoReplyEnabled: settings.isEnabled !== undefined ? settings.isEnabled : aiSettings.autoReplyEnabled,
              workingHours: settings.workingHours ? JSON.stringify(settings.workingHours) : aiSettings.workingHours,
              workingHoursEnabled: settings.workingHoursEnabled !== undefined ? settings.workingHoursEnabled : aiSettings.workingHoursEnabled,
              maxRepliesPerCustomer: settings.maxRepliesPerCustomer !== undefined ? settings.maxRepliesPerCustomer : aiSettings.maxRepliesPerCustomer,
              multimodalEnabled: settings.multimodalEnabled !== undefined ? settings.multimodalEnabled : aiSettings.multimodalEnabled,
              ragEnabled: settings.ragEnabled !== undefined ? settings.ragEnabled : aiSettings.ragEnabled,
              replyMode: settings.replyMode !== undefined ? settings.replyMode : aiSettings.replyMode,
              responseRules: settings.responseRules !== undefined ? settings.responseRules : aiSettings.responseRules,
              updatedAt: new Date()
            }
          });
        }, 5); // Priority 5 - عملية عادية
      } else {
        // Create new settings
        aiSettings = await safeQuery(async () => {
          const prisma = getSharedPrismaClient();
          if (!prisma || !prisma.aiSettings) {
            throw new Error('Prisma client not initialized');
          }
          return await prisma.aiSettings.create({
            data: {
              companyId: company.id,
              autoReplyEnabled: settings.isEnabled || false,
              workingHours: settings.workingHours ? JSON.stringify(settings.workingHours) : JSON.stringify({ start: '09:00', end: '18:00' }),
              workingHoursEnabled: settings.workingHoursEnabled || false,
              maxRepliesPerCustomer: settings.maxRepliesPerCustomer || 5,
              multimodalEnabled: settings.multimodalEnabled !== undefined ? settings.multimodalEnabled : true,
              ragEnabled: settings.ragEnabled !== undefined ? settings.ragEnabled : true,
              replyMode: settings.replyMode || 'all',
              responseRules: settings.responseRules || null
            }
          });
        }, 5); // Priority 5 - عملية عادية
      }

      ////console.log('✅ [AIAgent] AI settings updated successfully');
      ////console.log('✅ [AIAgent] AI settings updated successfully');

      // ✅ Invalidate cache
      await this.invalidateCompanyCache(companyId);

      return aiSettings;

    } catch (error) {
      console.error('❌ [AIAgent] Error updating settings:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Snapshot Strategy - Load ALL company settings to cache on startup
   * Reduces DB hits for the first request of every company
   */
  async loadAllCompanySettings() {
    try {
      console.log('🚀 [SETTINGS-MGR] Starting settings snapshot/pre-warm...');
      const start = Date.now();

      // 1. Get all active companies
      const companies = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        if (!prisma || !prisma.company) {
          throw new Error('Prisma client not initialized');
        }
        return await prisma.company.findMany({
          where: { isActive: true },
          select: { id: true, name: true }
        });
      }, 5);

      if (!companies || companies.length === 0) {
        console.log('⚠️ [SETTINGS-MGR] No active companies found for snapshot.');
        return;
      }

      console.log(`📋 [SETTINGS-MGR] Found ${companies.length} active companies. Loading settings...`);

      // 2. Load settings for each company parallelly (batches of 10 to avoid DB spike?)
      // Since it's startup, parallel is fine, but maybe capped.
      // Promise.all is fine for < 100 companies.

      const promises = companies.map(async (company) => {
        try {
          // Both calls will fetch from DB (if cache empty) and Set Cache
          await Promise.all([
            this.getSettings(company.id),
            this.getCompanyPrompts(company.id)
          ]);
        } catch (e) {
          console.error(`❌ [SETTINGS-MGR] Failed to load snapshot for ${company.name} (${company.id}):`, e.message);
        }
      });

      await Promise.all(promises);

      const duration = Date.now() - start;
      console.log(`✅ [SETTINGS-MGR] Snapshot complete. Loaded ${companies.length} companies in ${duration}ms`);

    } catch (error) {
      console.error('❌ [SETTINGS-MGR] Snapshot loading failed:', error);
    }
  }
}

module.exports = SettingsManager;

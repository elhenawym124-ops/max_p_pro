/**
 * System Manager Service
 * إدارة أنظمة النظام - تفعيل وتعطيل الأنظمة المختلفة
 */

const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

class SystemManager {
  constructor() {
    // ✅ FIX: Use lazy-loading for Prisma - don't call getSharedPrismaClient at module load time
    this._prisma = null;
    this.systems = new Map();
    this.systemInstances = new Map();

    //console.log('🔧 [SystemManager] Service initialized');
    this.initializeSystemDefinitions();
  }

  // ✅ Lazy getter for Prisma client
  get prisma() {
    if (!this._prisma) {
      this._prisma = getSharedPrismaClient();
    }
    return this._prisma;
  }

  /**
   * تعريف الأنظمة المتاحة
   */
  initializeSystemDefinitions() {
    const systemDefinitions = [
      {
        systemName: 'qualityMonitor',
        displayName: 'Quality Monitor',
        description: 'تقييم جودة كل رد بـ AI',
        category: 'ai_learning',
        defaultEnabled: true,
        config: {
          evaluateEveryResponse: true,
          aiCalls: 'very_high',
          resourceUsage: 'high'
        }
      },
      {
        systemName: 'simpleMonitor',
        displayName: 'Simple Monitor',
        description: 'مراقبة النظام كل 5 دقائق',
        category: 'monitoring',
        defaultEnabled: true,
        config: {
          interval: 300000, // 5 minutes
          aiCalls: 'none',
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'simpleAlerts',
        displayName: 'Simple Alerts',
        description: 'تنبيهات النظام كل 5 دقائق',
        category: 'monitoring',
        defaultEnabled: true,
        config: {
          interval: 300000,
          aiCalls: 'none',
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'reportGenerator',
        displayName: 'Report Generator',
        description: 'تقارير دورية يومية',
        category: 'monitoring',
        defaultEnabled: true,
        config: {
          dailyReports: true,
          aiCalls: 'none',
          resourceUsage: 'low'
        }
      },
      // ✅ New Active Services
      {
        systemName: 'broadcastSchedulerService',
        displayName: 'Broadcast Scheduler',
        description: 'جدولة وإرسال حملات البث',
        category: 'general',
        defaultEnabled: true,
        config: {
          resourceUsage: 'medium'
        }
      },
      {
        systemName: 'billingNotificationService',
        displayName: 'Billing Notifications',
        description: 'تنبيهات الفواتير والاشتراكات',
        category: 'general',
        defaultEnabled: true,
        config: {
          resourceUsage: 'low'
        }
      },
      {
        systemName: 'turboTrackingScheduler',
        displayName: 'Turbo Tracking',
        description: 'تتبع طلبات Turbo للشحن',
        category: 'monitoring',
        defaultEnabled: true,
        config: {
          resourceUsage: 'medium'
        }
      },
      {
        systemName: 'wooCommerceAutoSyncScheduler',
        displayName: 'WooCommerce Sync',
        description: 'مزامنة تلقائية مع WooCommerce',
        category: 'general',
        defaultEnabled: true,
        config: {
          resourceUsage: 'medium'
        }
      },
      // ✅ أنظمة إدارة مفاتيح Gemini
      {
        systemName: 'centralKeysSystem',
        displayName: 'Central Keys System',
        description: 'نظام المفاتيح المركزية - مفاتيح مشتركة لجميع الشركات',
        category: 'api_keys',
        defaultEnabled: true,
        config: {
          keyType: 'CENTRAL',
          aiCalls: 'high',
          resourceUsage: 'high'
        }
      },
      {
        systemName: 'companyKeysSystem',
        displayName: 'Company Keys System',
        description: 'نظام مفاتيح الشركات - كل شركة لها مفاتيحها الخاصة',
        category: 'api_keys',
        defaultEnabled: true,
        config: {
          keyType: 'COMPANY',
          aiCalls: 'high',
          resourceUsage: 'high'
        }
      },
      // ✅ نظام تبديل المفاتيح
      {
        systemName: 'keyRotationStrategy',
        displayName: 'Key Rotation Strategy',
        description: 'استراتيجية تبديل المفاتيح - MODEL_FIRST أو KEY_FIRST',
        category: 'api_keys',
        defaultEnabled: true,
        config: {
          strategy: 'MODEL_FIRST',
          description: {
            MODEL_FIRST: 'يجرب نفس النموذج على كل المفاتيح ثم ينتقل للنموذج التالي',
            KEY_FIRST: 'يستهلك كل نماذج المفتاح ثم ينتقل للمفتاح التالي'
          },
          aiCalls: 'none',
          resourceUsage: 'none'
        }
      }
    ];

    // حفظ تعريفات الأنظمة
    systemDefinitions.forEach(system => {
      this.systems.set(system.systemName, system);
    });

    //console.log(`🔧 [SystemManager] Loaded ${systemDefinitions.length} system definitions`);
  }

  /**
   * تهيئة إعدادات الأنظمة في قاعدة البيانات
   */
  async initializeSystemSettings() {
    try {
      console.log('🔄 [SystemManager] Starting system initialization...');

      // إنشاء الجدول إذا لم يكن موجود (fallback)
      await this.createSystemSettingsTable();

      // 1. إضافة الأنظمة المفقودة وتحديث الموجودة
      console.log(`Checking ${this.systems.size} defined systems...`);
      for (const [systemName, definition] of this.systems) {
        await this.ensureSystemExists(systemName, definition);
      }

      // 2. حذف الأنظمة القديمة التي تم إلغاؤها من الكود
      // نحصل على جميع الأنظمة من قاعدة البيانات
      const dbSystems = await this.getAllSystems();
      console.log(`Found ${dbSystems.length} systems in database.`);

      for (const dbSystem of dbSystems) {
        // إذا كان النظام موجود في قاعدة البيانات ولكن غير موجود في تعريفات الكود
        if (!this.systems.has(dbSystem.systemName)) {
          console.log(`🗑️ [SystemManager] Removing obsolete system: ${dbSystem.systemName}`);
          try {
            await executeWithRetry(async () => {
              await this.prisma.systemSettings.delete({
                where: { systemName: dbSystem.systemName }
              });
            });
            console.log(`✅ [SystemManager] Removed ${dbSystem.systemName}`);
          } catch (delError) {
            console.error(`❌ [SystemManager] Failed to remove ${dbSystem.systemName}:`, delError.message);
          }
        }
      }

      console.log('✅ [SystemManager] System initialization completed.');
    } catch (error) {
      console.error('❌ [SystemManager] Failed to initialize system settings:', error);
    }
  }

  /**
   * إنشاء جدول system_settings (fallback)
   * ✅ FIX: Skip CREATE TABLE - table should be created via Prisma migrations
   * This prevents permission errors when DB user doesn't have CREATE privilege
   */
  async createSystemSettingsTable() {
    // ✅ FIX: Skip CREATE TABLE to avoid permission errors
    // The table should already exist from Prisma migrations
    // If it doesn't exist, Prisma ORM calls will fail gracefully
    return;
  }

  /**
   * التأكد من وجود النظام في قاعدة البيانات
   */
  async ensureSystemExists(systemName, definition) {
    try {
      // SECURITY FIX: Use Prisma Upsert for atomic create/update
      // Prevents Race Conditions (TOCTOU) and Stale Data
      await executeWithRetry(async () => {
        await this.prisma.systemSettings.upsert({
          where: { systemName },
          update: {
            displayName: definition.displayName,
            description: definition.description,
            category: definition.category,
            // Note: We don't update isEnabled to preserve user preference
            config: JSON.stringify(definition.config), // Ensure config is always up to date structure-wise
            updatedAt: new Date()
          },
          create: {
            id: `sys_${systemName}`,
            systemName,
            displayName: definition.displayName,
            description: definition.description,
            category: definition.category,
            isEnabled: definition.defaultEnabled,
            config: JSON.stringify(definition.config),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      });
      //console.log(`✅ [SystemManager] Ensured system: ${systemName}`);
    } catch (error) {
      console.error(`❌ [SystemManager] Error ensuring system ${systemName}:`, error);
    }
  }

  /**
   * الحصول على جميع الأنظمة
   */
  async getAllSystems() {
    try {
      // SECURITY FIX: Use Prisma ORM instead of raw SQL
      const systems = await executeWithRetry(async () => {
        return await this.prisma.systemSettings.findMany({
          orderBy: [
            { category: 'asc' },
            { displayName: 'asc' }
          ]
        });
      });
      return systems || [];
    } catch (error) {
      console.error('❌ [SystemManager] Error getting systems:', error);
      return [];
    }
  }

  /**
   * تفعيل/تعطيل نظام
   */
  async toggleSystem(systemName, isEnabled) {
    try {
      // SECURITY FIX: Use Prisma ORM instead of raw SQL
      await executeWithRetry(async () => {
        await this.prisma.systemSettings.update({
          where: { systemName },
          data: {
            isEnabled,
            lastStatusChange: new Date(),
            updatedAt: new Date()
          }
        });
      });

      // تطبيق التغيير على النظام الفعلي
      await this.applySystemChange(systemName, isEnabled);

      //console.log(`🔧 [SystemManager] ${systemName} ${isEnabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error(`❌ [SystemManager] Error toggling ${systemName}:`, error);
      return false;
    }
  }

  /**
   * تطبيق التغيير على النظام الفعلي
   */
  async applySystemChange(systemName, isEnabled) {
    try {
      switch (systemName) {
        // ❌ REMOVED: Pattern System
        // case 'autoPatternDetection':
        //   await this.toggleAutoPatternDetection(isEnabled);
        //   break;
        case 'qualityMonitor':
          await this.toggleQualityMonitor(isEnabled);
          break;
        case 'centralKeysSystem':
          await this.toggleCentralKeysSystem(isEnabled);
          break;
        case 'companyKeysSystem':
          await this.toggleCompanyKeysSystem(isEnabled);
          break;
        // ✅ ADDED: Missing System Handlers
        case 'simpleMonitor':
        case 'simpleAlerts':
        case 'reportGenerator':
        case 'broadcastSchedulerService':
        case 'billingNotificationService':
        case 'turboTrackingScheduler':
        case 'wooCommerceAutoSyncScheduler':
          await this.toggleMonitoringService(systemName, isEnabled);
          break;
        case 'securityMonitoring':
          console.log(`🔒 [SystemManager] Security Monitoring ${isEnabled ? 'enabled' : 'disabled'} (Placeholder)`);
          break;
        case 'keyRotationStrategy':
          // لا يحتاج handler خاص - يتم قراءة الإعداد من config
          console.log(`🔄 [SystemManager] Key Rotation Strategy updated`);
          break;
        default:
        //console.log(`ℹ️ [SystemManager] No specific handler for ${systemName}`);
      }
    } catch (error) {
      console.error(`❌ [SystemManager] Error applying change to ${systemName}:`, error);
    }
  }

  /**
   * تفعيل/تعطيل Auto Pattern Detection
   */
  // ❌ REMOVED: Pattern System
  // async toggleAutoPatternDetection(isEnabled) {
  //   try {
  //     const autoPatternService = require('./autoPatternDetectionService');
  //     if (isEnabled) {
  //       autoPatternService.start();
  //     } else {
  //       autoPatternService.stop();
  //     }
  //   } catch (error) {
  //     console.error('❌ [SystemManager] Error toggling AutoPatternDetection:', error);
  //   }
  // }

  /**
   * تفعيل/تعطيل Quality Monitor
   */
  async toggleQualityMonitor(isEnabled) {
    try {
      const aiAgentService = require('./aiAgentService');
      if (aiAgentService && aiAgentService.qualityMonitor) {
        aiAgentService.qualityMonitor.setEnabled(isEnabled);
        console.log(`🔧 [SystemManager] Quality Monitor ${isEnabled ? 'enabled' : 'disabled'}`);
      } else {
        console.warn('⚠️ [SystemManager] QualityMonitor service not found in aiAgentService');
      }
    } catch (error) {
      console.error('❌ [SystemManager] Error toggling QualityMonitor:', error);
    }
  }

  /**
   * ✅ تفعيل/تعطيل نظام المفاتيح المركزية
   * عند التعطيل: يتم تعطيل جميع المفاتيح المركزية
   * عند التفعيل: يتم إعادة تفعيل المفاتيح المركزية
   */
  async toggleCentralKeysSystem(isEnabled) {
    try {
      console.log(`🔑 [SystemManager] ${isEnabled ? 'تفعيل' : 'تعطيل'} نظام المفاتيح المركزية...`);

      // تحديث حالة جميع المفاتيح المركزية
      const result = await executeWithRetry(async () => {
        return await this.prisma.aIKey.updateMany({
          where: { keyType: 'CENTRAL' },
          data: {
            isActive: isEnabled,
            updatedAt: new Date()
          }
        });
      });

      console.log(`✅ [SystemManager] تم ${isEnabled ? 'تفعيل' : 'تعطيل'} ${result.count} مفتاح مركزي`);

      // إبطال الـ cache في ModelManager
      try {
        const aiAgentService = require('./aiAgentService');
        if (aiAgentService && aiAgentService.getModelManager) {
          aiAgentService.getModelManager().clearAllCaches();
          console.log('✅ [SystemManager] Cleared ModelManager cache');
        }
      } catch (e) {
        console.warn('⚠️ [SystemManager] Failed to clear ModelManager cache:', e.message);
      }

      return true;
    } catch (error) {
      console.error('❌ [SystemManager] Error toggling Central Keys System:', error);
      return false;
    }
  }

  /**
   * ✅ تفعيل/تعطيل خدمات المراقبة العامة
   */
  async toggleMonitoringService(systemName, isEnabled) {
    try {
      // Dynamic import based on system name
      const serviceName = `./${systemName}`;
      const service = require(serviceName);

      if (service) {
        if (isEnabled && service.start) {
          service.start();
        } else if (!isEnabled && service.stop) {
          service.stop();
        }
        console.log(`✅ [SystemManager] ${systemName} has been ${isEnabled ? 'started' : 'stopped'}`);
      }
    } catch (error) {
      console.warn(`⚠️ [SystemManager] Could not toggle ${systemName}: Service not found or invalid interface.`);
    }
  }

  /**
   * ✅ تفعيل/تعطيل نظام مفاتيح الشركات
   * عند التعطيل: يتم تعطيل جميع مفاتيح الشركات
   * عند التفعيل: يتم إعادة تفعيل مفاتيح الشركات
   */
  async toggleCompanyKeysSystem(isEnabled) {
    try {
      console.log(`🔑 [SystemManager] ${isEnabled ? 'تفعيل' : 'تعطيل'} نظام مفاتيح الشركات...`);

      // تحديث حالة جميع مفاتيح الشركات
      const result = await executeWithRetry(async () => {
        return await this.prisma.aIKey.updateMany({
          where: { keyType: 'COMPANY' },
          data: {
            isActive: isEnabled,
            updatedAt: new Date()
          }
        });
      });

      console.log(`✅ [SystemManager] تم ${isEnabled ? 'تفعيل' : 'تعطيل'} ${result.count} مفتاح شركة`);

      // إبطال الـ cache في ModelManager
      try {
        const aiAgentService = require('./aiAgentService');
        if (aiAgentService && aiAgentService.getModelManager) {
          aiAgentService.getModelManager().clearAllCaches();
        }
      } catch (e) {
        // Ignore
      }

      return true;
    } catch (error) {
      console.error('❌ [SystemManager] Error toggling Company Keys System:', error);
      return false;
    }
  }

  /**
   * ✅ الحصول على حالة أنظمة المفاتيح
   */
  async getKeysSystemStatus() {
    try {
      const [centralKeys, companyKeys] = await Promise.all([
        this.prisma.aIKey.count({ where: { keyType: 'CENTRAL', isActive: true } }),
        this.prisma.aIKey.count({ where: { keyType: 'COMPANY', isActive: true } })
      ]);

      const [totalCentral, totalCompany] = await Promise.all([
        this.prisma.aIKey.count({ where: { keyType: 'CENTRAL' } }),
        this.prisma.aIKey.count({ where: { keyType: 'COMPANY' } })
      ]);

      return {
        centralKeys: {
          active: centralKeys,
          total: totalCentral,
          isEnabled: centralKeys > 0
        },
        companyKeys: {
          active: companyKeys,
          total: totalCompany,
          isEnabled: companyKeys > 0
        }
      };
    } catch (error) {
      console.error('❌ [SystemManager] Error getting keys system status:', error);
      return null;
    }
  }

  /**
   * ✅ الحصول على استراتيجية تبديل المفاتيح
   * @returns {Promise<string>} 'MODEL_FIRST' | 'KEY_FIRST'
   */
  async getKeyRotationStrategy() {
    try {
      const setting = await executeWithRetry(async () => {
        return await this.prisma.systemSettings.findFirst({
          where: { systemName: 'keyRotationStrategy' },
          select: { config: true }
        });
      });

      if (setting && setting.config) {
        const config = JSON.parse(setting.config);
        return config.strategy || 'MODEL_FIRST';
      }
      return 'MODEL_FIRST'; // Default
    } catch (error) {
      console.error('❌ [SystemManager] Error getting key rotation strategy:', error);
      return 'MODEL_FIRST';
    }
  }

  /**
   * ✅ تحديث استراتيجية تبديل المفاتيح
   * @param {string} strategy - 'MODEL_FIRST' | 'KEY_FIRST'
   */
  async setKeyRotationStrategy(strategy) {
    try {
      if (!['MODEL_FIRST', 'KEY_FIRST'].includes(strategy)) {
        throw new Error('Invalid strategy. Must be MODEL_FIRST or KEY_FIRST');
      }

      const currentSetting = await this.prisma.systemSettings.findFirst({
        where: { systemName: 'keyRotationStrategy' }
      });

      if (currentSetting) {
        const config = currentSetting.config ? JSON.parse(currentSetting.config) : {};
        config.strategy = strategy;

        await executeWithRetry(async () => {
          await this.prisma.systemSettings.update({
            where: { systemName: 'keyRotationStrategy' },
            data: {
              config: JSON.stringify(config),
              updatedAt: new Date()
            }
          });
        });
      } else {
        // إنشاء الإعداد إذا لم يكن موجوداً
        await this.ensureSystemExists('keyRotationStrategy', this.systems.get('keyRotationStrategy'));
      }

      console.log(`🔄 [SystemManager] Key Rotation Strategy set to: ${strategy}`);

      // إبطال الـ cache في ModelManager
      try {
        const aiAgentService = require('./aiAgentService');
        if (aiAgentService && aiAgentService.getModelManager) {
          aiAgentService.getModelManager().clearAllCaches();
        }
      } catch (e) {
        // Ignore
      }

      return true;
    } catch (error) {
      console.error('❌ [SystemManager] Error setting key rotation strategy:', error);
      return false;
    }
  }

  /**
   * فحص حالة نظام
   */
  async isSystemEnabled(systemName) {
    try {
      // SECURITY FIX: Use Prisma ORM instead of raw SQL
      const result = await executeWithRetry(async () => {
        return await this.prisma.systemSettings.findFirst({
          where: { systemName },
          select: { isEnabled: true }
        });
      });
      return result ? result.isEnabled : false;
    } catch (error) {
      console.error(`❌ [SystemManager] Error checking ${systemName}:`, error);
      return false;
    }
  }

  /**
   * الحصول على إحصائيات الأنظمة
   */
  async getSystemStats() {
    try {
      const systems = await this.getAllSystems();
      const stats = {
        total: systems.length,
        enabled: systems.filter(s => s.isEnabled).length,
        disabled: systems.filter(s => !s.isEnabled).length,
        byCategory: {}
      };

      // تجميع حسب الفئة
      systems.forEach(system => {
        if (!stats.byCategory[system.category]) {
          stats.byCategory[system.category] = { total: 0, enabled: 0, disabled: 0 };
        }
        stats.byCategory[system.category].total++;
        if (system.isEnabled) {
          stats.byCategory[system.category].enabled++;
        } else {
          stats.byCategory[system.category].disabled++;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ [SystemManager] Error getting stats:', error);
      return null;
    }
  }
}

// إنشاء instance واحد
const systemManager = new SystemManager();

module.exports = systemManager;

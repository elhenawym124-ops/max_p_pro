/**
 * Controller for Quota Aggregation and Round-Robin Monitoring
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Get AIAgentService instance
let aiAgentService = null;
function getAIAgentService() {
  if (!aiAgentService) {
    aiAgentService = require('../services/aiAgentService');
  }
  return aiAgentService;
}

/**
 * Get comprehensive quota aggregation system status
 */
async function getQuotaSystemStatus(req, res) {
  try {
    console.log('📊 [QUOTA-MONITORING] Getting quota system status...');

    const aiAgentService = getAIAgentService();
    if (!aiAgentService) {
      throw new Error('AIAgentService is not available');
    }

    const modelManager = aiAgentService.getModelManager();
    if (!modelManager) {
      throw new Error('ModelManager is not available');
    }

    // 1. Get all companies
    const companies = await getSharedPrismaClient().company.findMany({
      select: {
        id: true,
        name: true
      }
    });
    console.log(`📊 [QUOTA-MONITORING] Found ${companies.length} companies`);

    // 2. Get system-wide statistics
    const totalKeys = await getSharedPrismaClient().aIKey.count({
      where: { isActive: true }
    });
    console.log(`📊 [QUOTA-MONITORING] Total active keys: ${totalKeys}`);

    const totalModels = await getSharedPrismaClient().aIKeyModel.count({
      where: { isEnabled: true }
    });
    console.log(`📊 [QUOTA-MONITORING] Total enabled models: ${totalModels}`);

    const excludedModelsCount = await getSharedPrismaClient().excludedModel.count({
      where: {
        retryAt: {
          gt: new Date()
        }
      }
    });

    // 3. Get supported models
    const supportedModels = modelManager.getSupportedModels();
    console.log(`📊 [QUOTA-MONITORING] Supported models: ${supportedModels.length}`, supportedModels);

    // 4. Pre-fetch all company settings and models in batch (OPTIMIZATION)
    console.log(`📊 [QUOTA-MONITORING] Pre-fetching company settings and models...`);

    const companyIds = companies.map(c => c.id);
    const companySettings = await getSharedPrismaClient().company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, useCentralKeys: true }
    });
    const companySettingsMap = new Map(companySettings.map(c => [c.id, c.useCentralKeys || false]));

    // جلب كل النماذج دفعة واحدة
    const allModels = await getSharedPrismaClient().aIKeyModel.findMany({
      where: {
        model: { in: supportedModels },
        isEnabled: true,
        key: { isActive: true }
      },
      include: {
        key: {
          select: {
            id: true,
            name: true,
            priority: true,
            apiKey: true,
            companyId: true,
            keyType: true,
            provider: true,
            isActive: true
          }
        }
      }
    });

    // تنظيم النماذج حسب النموذج والشركة
    const modelsByModelAndCompany = new Map();
    const centralModelsByModel = new Map();

    // تجميع المفاتيح المركزية حسب النموذج
    for (const modelRecord of allModels) {
      const modelName = modelRecord.model;
      const key = modelRecord.key;

      if (key.keyType === 'CENTRAL' && key.companyId === null) {
        if (!centralModelsByModel.has(modelName)) {
          centralModelsByModel.set(modelName, []);
        }
        centralModelsByModel.get(modelName).push(modelRecord);
      } else if (key.keyType === 'COMPANY' && key.companyId) {
        const key2 = `${modelName}_${key.companyId}`;
        if (!modelsByModelAndCompany.has(key2)) {
          modelsByModelAndCompany.set(key2, []);
        }
        modelsByModelAndCompany.get(key2).push(modelRecord);
      }
    }

    // إضافة المفاتيح المركزية للشركات التي useCentralKeys = true
    for (const modelName of supportedModels) {
      const centralModels = centralModelsByModel.get(modelName) || [];
      for (const company of companies) {
        if (companySettingsMap.get(company.id)) {
          const key2 = `${modelName}_${company.id}`;
          if (!modelsByModelAndCompany.has(key2)) {
            modelsByModelAndCompany.set(key2, []);
          }
          // إضافة المفاتيح المركزية (بدون تكرار)
          centralModels.forEach(cm => {
            if (!modelsByModelAndCompany.get(key2).some(m => m.id === cm.id)) {
              modelsByModelAndCompany.get(key2).push(cm);
            }
          });
        }
      }
    }

    // إضافة المفاتيح المركزية كـ fallback للشركات التي لا تملك مفاتيح
    for (const modelName of supportedModels) {
      const centralModels = centralModelsByModel.get(modelName) || [];
      for (const company of companies) {
        const key2 = `${modelName}_${company.id}`;
        const existing = modelsByModelAndCompany.get(key2) || [];
        if (existing.length === 0 && centralModels.length > 0) {
          modelsByModelAndCompany.set(key2, [...centralModels]);
        }
      }
    }

    console.log(`✅ [QUOTA-MONITORING] Pre-fetched ${allModels.length} models, organized into ${modelsByModelAndCompany.size} groups`);

    // 5. Calculate quota for each model (using pre-fetched data) - PARALLEL EXECUTION
    console.log(`📊 [QUOTA-MONITORING] Calculating quotas for ${supportedModels.length} models across ${companies.length} companies (parallel with pre-fetched data)...`);

    // إنشاء جميع الـ promises بشكل متوازي
    const quotaPromises = [];
    for (const modelName of supportedModels) {
      for (const company of companies) {
        quotaPromises.push(
          modelManager.calculateTotalQuotaWithPreFetchedModels(
            modelName,
            company.id,
            modelsByModelAndCompany.get(`${modelName}_${company.id}`) || [],
            companySettingsMap.get(company.id) || false
          )
            .then(quota => ({ modelName, companyId: company.id, quota }))
            .catch(error => {
              console.error(`Error calculating quota for ${modelName} - ${company.id}:`, error);
              return { modelName, companyId: company.id, quota: null };
            })
        );
      }
    }

    // تنفيذ كل الاستعلامات بشكل متوازي
    const quotaResults = await Promise.all(quotaPromises);
    console.log(`✅ [QUOTA-MONITORING] Completed ${quotaResults.length} quota calculations`);

    // تجميع النتائج حسب النموذج
    const modelQuotas = [];
    for (const modelName of supportedModels) {
      let totalRPM = 0;
      let totalRPMUsed = 0;
      let totalTPM = 0;
      let totalTPMUsed = 0;
      let totalRPD = 0;
      let totalRPDUsed = 0;
      let totalAvailableModels = 0;
      let totalModelsCount = 0;

      const modelResults = quotaResults.filter(r => r.modelName === modelName && r.quota);
      for (const result of modelResults) {
        if (result.quota) {
          totalRPM += result.quota.totalRPM;
          totalRPMUsed += result.quota.totalRPMUsed;
          totalTPM += result.quota.totalTPM;
          totalTPMUsed += result.quota.totalTPMUsed;
          totalRPD += result.quota.totalRPD;
          totalRPDUsed += result.quota.totalRPDUsed;
          totalAvailableModels += result.quota.availableModels.length;
          totalModelsCount += result.quota.totalModels;
        }
      }

      const rpmPercentage = totalRPM > 0 ? (totalRPMUsed / totalRPM) * 100 : 0;
      const tpmPercentage = totalTPM > 0 ? (totalTPMUsed / totalTPM) * 100 : 0;
      const rpdPercentage = totalRPD > 0 ? (totalRPDUsed / totalRPD) * 100 : 0;

      modelQuotas.push({
        modelName,
        totalRPM,
        totalRPMUsed,
        rpmPercentage: parseFloat(rpmPercentage.toFixed(2)),
        totalTPM,
        totalTPMUsed,
        tpmPercentage: parseFloat(tpmPercentage.toFixed(2)),
        totalRPD,
        totalRPDUsed,
        rpdPercentage: parseFloat(rpdPercentage.toFixed(2)),
        availableModels: totalAvailableModels,
        totalModels: totalModelsCount,
        status: rpmPercentage >= 80 || tpmPercentage >= 80 ? 'warning' : rpdPercentage >= 100 ? 'error' : 'healthy'
      });
    }

    // 5. Get excluded models
    const excludedModelsData = await getSharedPrismaClient().excludedModel.findMany({
      where: {
        retryAt: {
          gt: new Date()
        }
      },
      orderBy: {
        retryAt: 'asc'
      }
    });

    // Get key info for excluded models - BATCH QUERY
    const keyIds = excludedModelsData.map(ex => ex.keyId).filter(Boolean);
    const keysMap = new Map();

    if (keyIds.length > 0) {
      const keys = await getSharedPrismaClient().aIKey.findMany({
        where: { id: { in: keyIds } },
        select: { id: true, name: true, companyId: true }
      });
      keys.forEach(key => {
        keysMap.set(key.id, { name: key.name, companyId: key.companyId });
      });
    }

    const excludedModels = excludedModelsData.map(ex => ({
      ...ex,
      key: ex.keyId ? (keysMap.get(ex.keyId) || { name: 'Unknown', companyId: null }) : { name: 'Unknown', companyId: null }
    }));

    // 6. Get Round-Robin status
    const lastUsedKeyId = modelManager.lastUsedGlobalKeyId;
    let lastUsedKeyInfo = null;
    if (lastUsedKeyId) {
      const lastUsedKey = await getSharedPrismaClient().aIKey.findUnique({
        where: { id: lastUsedKeyId },
        select: {
          id: true,
          name: true,
          companyId: true
        }
      });
      if (lastUsedKey) {
        lastUsedKeyInfo = {
          keyId: lastUsedKey.id,
          keyName: lastUsedKey.name,
          companyId: lastUsedKey.companyId
        };
      }
    }

    // 7. Get recent errors (from logs or error tracking)
    const recentErrors = []; // يمكن إضافة نظام تتبع الأخطاء لاحقاً

    const responseData = {
      success: true,
      data: {
        systemStats: {
          totalKeys,
          totalModels,
          excludedModelsCount,
          supportedModelsCount: supportedModels.length,
          lastUsedKey: lastUsedKeyInfo
        },
        modelQuotas,
        excludedModels: excludedModels.map(ex => ({
          id: ex.id,
          modelName: ex.modelName,
          keyId: ex.keyId,
          keyName: ex.key?.name || 'Unknown',
          companyId: ex.companyId,
          reason: ex.reason,
          excludedAt: ex.excludedAt,
          retryAt: ex.retryAt,
          retryCount: ex.retryCount,
          lastRetryAt: ex.lastRetryAt
        })),
        recentErrors,
        cacheStats: {
          quotaCacheSize: modelManager.quotaCache?.size || 0,
          excludedModelsCacheSize: modelManager.excludedModels?.size || 0
        }
      }
    };

    console.log(`📊 [QUOTA-MONITORING] Response:`, {
      totalKeys: responseData.data.systemStats.totalKeys,
      totalModels: responseData.data.systemStats.totalModels,
      modelQuotasCount: responseData.data.modelQuotas.length,
      excludedModelsCount: responseData.data.excludedModels.length
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ [QUOTA-MONITORING] Error getting quota system status:', error);
    console.error('❌ [QUOTA-MONITORING] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة النظام',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get detailed quota for a specific company
 */
async function getCompanyQuotaDetails(req, res) {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const aiAgentService = getAIAgentService();
    const modelManager = aiAgentService.getModelManager();

    const supportedModels = modelManager.getSupportedModels();
    const modelQuotas = [];

    for (const modelName of supportedModels) {
      try {
        const quota = await modelManager.calculateTotalQuota(modelName, companyId);

        modelQuotas.push({
          modelName,
          ...quota,
          rpmPercentage: parseFloat(quota.rpmPercentage.toFixed(2)),
          tpmPercentage: parseFloat(quota.tpmPercentage.toFixed(2)),
          rpdPercentage: parseFloat(quota.rpdPercentage.toFixed(2)),
          status: quota.rpmPercentage >= 80 || quota.tpmPercentage >= 80 ? 'warning' : quota.rpdPercentage >= 100 ? 'error' : 'healthy'
        });
      } catch (error) {
        console.error(`Error calculating quota for ${modelName}:`, error);
      }
    }

    // Get excluded models for this company
    const excludedModelsData = await getSharedPrismaClient().excludedModel.findMany({
      where: {
        companyId: companyId,
        retryAt: {
          gt: new Date()
        }
      },
      orderBy: {
        retryAt: 'asc'
      }
    });

    // Get key info for excluded models
    const excludedModels = await Promise.all(
      excludedModelsData.map(async (ex) => {
        let keyInfo = { name: 'Unknown' };
        if (ex.keyId) {
          try {
            const key = await getSharedPrismaClient().aIKey.findUnique({
              where: { id: ex.keyId },
              select: { name: true }
            });
            if (key) {
              keyInfo = { name: key.name };
            }
          } catch (error) {
            console.error(`Error fetching key info for ${ex.keyId}:`, error);
          }
        }
        return { ...ex, key: keyInfo };
      })
    );

    res.json({
      success: true,
      data: {
        companyId,
        modelQuotas,
        excludedModels: excludedModels.map(ex => ({
          id: ex.id,
          modelName: ex.modelName,
          keyId: ex.keyId,
          keyName: ex.key?.name || 'Unknown',
          reason: ex.reason,
          excludedAt: ex.excludedAt,
          retryAt: ex.retryAt,
          retryCount: ex.retryCount
        }))
      }
    });

  } catch (error) {
    console.error('Error getting company quota details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الكوتة',
      error: error.message
    });
  }
}

/**
 * Get Round-Robin status
 */
async function getRoundRobinStatus(req, res) {
  try {
    const aiAgentService = getAIAgentService();
    const modelManager = aiAgentService.getModelManager();

    const lastUsedKeyId = modelManager.lastUsedGlobalKeyId;
    let lastUsedKeyInfo = null;

    if (lastUsedKeyId) {
      const lastUsedKey = await getSharedPrismaClient().aIKey.findUnique({
        where: { id: lastUsedKeyId },
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (lastUsedKey) {
        lastUsedKeyInfo = {
          keyId: lastUsedKey.id,
          keyName: lastUsedKey.name,
          companyId: lastUsedKey.companyId,
          companyName: lastUsedKey.company?.name || 'Unknown'
        };
      }
    }

    // Get all active keys with their models count
    const activeKeys = await getSharedPrismaClient().aIKey.findMany({
      where: { isActive: true },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        models: {
          where: { isEnabled: true },
          select: {
            id: true,
            model: true,
            lastUsed: true
          }
        }
      },
      orderBy: {
        priority: 'asc'
      }
    });

    console.log(`📊 [QUOTA-MONITORING] Round-Robin: Found ${activeKeys.length} active keys`);
    console.log(`📊 [QUOTA-MONITORING] Round-Robin: Last used key ID: ${lastUsedKeyId || 'None'}`);

    const responseData = {
      success: true,
      data: {
        lastUsedKey: lastUsedKeyInfo,
        activeKeys: activeKeys.map(key => ({
          keyId: key.id,
          keyName: key.name,
          companyId: key.companyId,
          companyName: key.company?.name || 'Unknown',
          priority: key.priority,
          modelsCount: key.models.length,
          isLastUsed: key.id === lastUsedKeyId
        })),
        totalActiveKeys: activeKeys.length
      }
    };

    console.log(`📊 [QUOTA-MONITORING] Round-Robin Response:`, {
      totalActiveKeys: responseData.data.totalActiveKeys,
      lastUsedKey: responseData.data.lastUsedKey?.keyName || 'None'
    });

    res.json(responseData);

  } catch (error) {
    console.error('Error getting Round-Robin status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة Round-Robin',
      error: error.message
    });
  }
}

/**
 * Get system errors and warnings
 * ✅ تم إصلاح المشكلة: استخدام Batch Processing بدل 100+ query متوازي
 */
async function getSystemErrors(req, res) {
  try {
    const aiAgentService = getAIAgentService();
    const modelManager = aiAgentService.getModelManager();

    const errors = [];
    const warnings = [];

    // Check for models with high quota usage - BATCH PROCESSING
    const supportedModels = modelManager.getSupportedModels();
    const companies = await getSharedPrismaClient().company.findMany({
      select: { id: true, name: true }
    });

    // ✅ FIX: معالجة بـ batches بدل كل الـ queries مرة واحدة
    const MAX_CONCURRENT = 10; // حد أقصى 10 queries متوازية
    const allTasks = [];

    for (const modelName of supportedModels) {
      for (const company of companies) {
        allTasks.push({ modelName, company });
      }
    }

    console.log(`📊 [SYSTEM-ERRORS] Processing ${allTasks.length} quota checks in batches of ${MAX_CONCURRENT}...`);

    // معالجة بـ batches
    const checkResults = [];
    for (let i = 0; i < allTasks.length; i += MAX_CONCURRENT) {
      const batch = allTasks.slice(i, i + MAX_CONCURRENT);

      const batchPromises = batch.map(task =>
        modelManager.calculateTotalQuota(task.modelName, task.company.id)
          .then(quota => ({ modelName: task.modelName, company: task.company, quota, error: null }))
          .catch(error => ({ modelName: task.modelName, company: task.company, quota: null, error }))
      );

      const batchResults = await Promise.all(batchPromises);
      checkResults.push(...batchResults);

      // Log progress every 50 tasks
      if (i > 0 && i % 50 === 0) {
        console.log(`📊 [SYSTEM-ERRORS] Processed ${i}/${allTasks.length} quota checks...`);
      }
    }

    console.log(`✅ [SYSTEM-ERRORS] Completed ${checkResults.length} quota checks`);

    // معالجة النتائج
    for (const result of checkResults) {
      if (result.error) {
        errors.push({
          type: 'calculation_error',
          modelName: result.modelName,
          companyId: result.company.id,
          companyName: result.company.name,
          message: `خطأ في حساب الكوتة: ${result.error.message}`,
          severity: 'error',
          timestamp: new Date()
        });
        continue;
      }

      const quota = result.quota;
      if (!quota) continue;

      if (quota.rpmPercentage >= 80 || quota.tpmPercentage >= 80) {
        warnings.push({
          type: 'high_quota_usage',
          modelName: result.modelName,
          companyId: result.company.id,
          companyName: result.company.name,
          message: `نموذج ${result.modelName} قرب يخلص الكوتة (RPM: ${quota.rpmPercentage.toFixed(1)}%, TPM: ${quota.tpmPercentage.toFixed(1)}%)`,
          severity: 'warning',
          timestamp: new Date()
        });
      }

      if (quota.rpdPercentage >= 100) {
        errors.push({
          type: 'rpd_exhausted',
          modelName: result.modelName,
          companyId: result.company.id,
          companyName: result.company.name,
          message: `نموذج ${result.modelName} استنفد RPD (${quota.rpdPercentage.toFixed(1)}%)`,
          severity: 'error',
          timestamp: new Date()
        });
      }
    }

    // Check excluded models
    const excludedModelsData = await getSharedPrismaClient().excludedModel.findMany({
      where: {
        retryAt: {
          gt: new Date()
        }
      }
    });

    // Get key info for excluded models - BATCH QUERY
    const keyIds = excludedModelsData.map(ex => ex.keyId).filter(Boolean);
    const keysMap = new Map();

    if (keyIds.length > 0) {
      const keys = await getSharedPrismaClient().aIKey.findMany({
        where: { id: { in: keyIds } },
        select: { id: true, name: true }
      });
      keys.forEach(key => {
        keysMap.set(key.id, { name: key.name });
      });
    }

    const excludedModels = excludedModelsData.map(ex => ({
      ...ex,
      key: ex.keyId ? (keysMap.get(ex.keyId) || { name: 'Unknown' }) : { name: 'Unknown' }
    }));

    excludedModels.forEach(ex => {
      warnings.push({
        type: 'excluded_model',
        modelName: ex.modelName,
        keyId: ex.keyId,
        keyName: ex.key?.name || 'Unknown',
        message: `نموذج ${ex.modelName} مستثنى - السبب: ${ex.reason}`,
        severity: 'warning',
        retryAt: ex.retryAt,
        timestamp: ex.excludedAt
      });
    });

    res.json({
      success: true,
      data: {
        errors,
        warnings,
        totalErrors: errors.length,
        totalWarnings: warnings.length
      }
    });

  } catch (error) {
    console.error('Error getting system errors:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأخطاء',
      error: error.message
    });
  }
}

module.exports = {
  getQuotaSystemStatus,
  getCompanyQuotaDetails,
  getRoundRobinStatus,
  getSystemErrors
};



const imageStudioService = require('../services/imageStudioService');

/**
 * Image Studio Controller
 * التحكم في عمليات توليد الصور
 */

/**
 * الحصول على إعدادات الاستديو (السوبر أدمن فقط)
 */
const getSettings = async (req, res) => {
  try {
    // التحقق من صلاحية السوبر أدمن
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول لهذه الصفحة'
      });
    }

    const settings = await imageStudioService.getStudioSettings();

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error getting settings:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الإعدادات'
    });
  }
};

/**
 * تحديث إعدادات الاستديو (السوبر أدمن فقط)
 */
const updateSettings = async (req, res) => {
  try {
    // التحقق من صلاحية السوبر أدمن
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول لهذه الصفحة'
      });
    }

    const {
      enabled,
      selectedKeyId,
      basicModelName,
      proModelName,
      defaultModel,
      maxImagesPerRequest,
      maxRequestsPerDay,
      allowedCompanies
    } = req.body;

    const updateData = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (selectedKeyId !== undefined) updateData.selectedKeyId = selectedKeyId || null;
    if (basicModelName) updateData.basicModelName = basicModelName;
    if (proModelName) updateData.proModelName = proModelName;
    if (defaultModel) updateData.defaultModel = defaultModel;
    if (maxImagesPerRequest) updateData.maxImagesPerRequest = parseInt(maxImagesPerRequest);
    if (maxRequestsPerDay) updateData.maxRequestsPerDay = parseInt(maxRequestsPerDay);
    if (allowedCompanies !== undefined) {
      updateData.allowedCompanies = allowedCompanies ? JSON.stringify(allowedCompanies) : null;
    }

    const settings = await imageStudioService.updateStudioSettings(updateData);

    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      settings
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث الإعدادات'
    });
  }
};

/**
 * توليد صورة جديدة
 */
const generateImage = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { prompt, modelType = 'basic', useMagicPrompt = false, aspectRatio = '1:1' } = req.body;

    // التحقق من البيانات المطلوبة
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب إدخال وصف للصورة'
      });
    }

    if (!['basic', 'pro'].includes(modelType)) {
      return res.status(400).json({
        success: false,
        error: 'نوع النموذج غير صحيح'
      });
    }

    // توليد الصورة (أو إضافتها للطابور)
    const result = await imageStudioService.generateImage({
      prompt,
      modelType,
      useMagicPrompt,
      aspectRatio,
      companyId,
      userId
    });

    res.json({
      success: true,
      message: result.queued ? 'تم إضافة طلبك لقائمة الانتظار' : 'تم توليد الصورة بنجاح',
      data: result
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error generating image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ في توليد الصورة'
    });
  }
};

/**
 * تعديل صورة (Edit/Try-On)
 */
const editImage = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { imageBase64, maskBase64, prompt } = req.body;

    // التحقق
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'يجب توفير الصورة المراد تعديلها' });
    }

    const start = Date.now();
    const result = await imageStudioService.editImage({
      imageBase64,
      maskBase64,
      prompt,
      companyId,
      userId
    });

    res.json({
      success: true,
      data: {
        ...result,
        duration: Date.now() - start
      }
    });

  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error editing image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل تعديل الصورة'
    });
  }
};

/**
 * التحقق من حالة مهمة توليد (Job Status)
 */
const checkJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const job = await executeWithRetry(async () => {
      return await prisma.imageStudioHistory.findFirst({
        where: {
          id: id,
          companyId: companyId
        }
      });
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'المهمة غير موجودة'
      });
    }

    res.json({
      success: true,
      status: job.status,
      data: job
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error checking job status:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في التحقق من الحالة'
    });
  }
};

/**
 * التحقق من صلاحية الوصول للاستديو
 */
const checkAccess = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const accessCheck = await imageStudioService.checkCompanyAccess(companyId);

    res.json({
      success: true,
      access: accessCheck
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error checking access:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في التحقق من الصلاحيات'
    });
  }
};

/**
 * الحصول على النماذج المتاحة
 */
const getAvailableModels = async (req, res) => {
  try {
    const models = await imageStudioService.getAvailableModels();

    res.json({
      success: true,
      models
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error getting models:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب النماذج'
    });
  }
};

/**
 * الحصول على سجل التوليد
 */
const getHistory = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { limit = 20, offset = 0, status } = req.query;

    const result = await imageStudioService.getCompanyHistory(companyId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب السجل'
    });
  }
};

/**
 * الحصول على الإحصائيات
 */
const getStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30 } = req.query;

    const stats = await imageStudioService.getCompanyStats(companyId, parseInt(days));

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الإحصائيات'
    });
  }
};

/**
 * الحصول على إحصائيات عامة (السوبر أدمن فقط)
 */
const getGlobalStats = async (req, res) => {
  try {
    // التحقق من صلاحية السوبر أدمن
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول لهذه الصفحة'
      });
    }

    const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    // إحصائيات عامة
    const totalImages = await executeWithRetry(() => prisma.imageStudioHistory.count());
    const completedImages = await prisma.imageStudioHistory.count({
      where: { status: 'completed' }
    });
    const failedImages = await prisma.imageStudioHistory.count({
      where: { status: 'failed' }
    });

    // أكثر الشركات استخداماً
    const topCompanies = await prisma.imageStudioHistory.groupBy({
      by: ['companyId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // الاستخدام حسب النموذج
    const modelUsage = await prisma.imageStudioHistory.groupBy({
      by: ['modelType'],
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      stats: {
        totalImages,
        completedImages,
        failedImages,
        successRate: totalImages > 0 ? ((completedImages / totalImages) * 100).toFixed(2) : 0,
        topCompanies,
        modelUsage
      }
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error getting global stats:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الإحصائيات العامة'
    });
  }
};

/**
 * الحصول على سجلات التوليد (السوبر أدمن فقط)
 */
const getGenerationLogs = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول لهذه الصفحة'
      });
    }

    const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const { status, limit = 50, offset = 0, companyId, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (search) {
      where.OR = [
        { prompt: { contains: search } },
        { userId: { contains: search } }
      ];
    }

    const logs = await prisma.imageStudioHistory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.imageStudioHistory.count({ where });

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب السجلات'
    });
  }
};

/**
 * الحصول على قائمة مفاتيح Gemini النشطة (السوبر أدمن فقط)
 */
const getActiveKeys = async (req, res) => {
  try {
    // التحقق من صلاحية السوبر أدمن
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول لهذه الصفحة'
      });
    }

    const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    // جلب جميع مفاتيح Gemini النشطة
    const keys = await executeWithRetry(async () => {
      return await prisma.aiKey.findMany({ // FIXED: aiKey (camelCase)
        where: {
          provider: 'GOOGLE',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          apiKey: true,
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      });
    });

    // إخفاء جزء من المفتاح للأمان
    const safeKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      keyType: 'GOOGLE',
      maskedKey: key.apiKey ? `${key.apiKey.substring(0, 10)}...${key.apiKey.substring(key.apiKey.length - 4)}` : 'N/A',
      isActive: key.isActive,
      priority: 1
    }));

    res.json({
      success: true,
      keys: safeKeys
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error getting active keys:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب المفاتيح'
    });
  }
};

/**
 * توليد محتوى إعلاني باستخدام Gemini
 */
const generateAd = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { productInfo, platform = 'facebook' } = req.body;

    if (!productInfo) {
      return res.status(400).json({ success: false, error: 'يجب توفير معلومات المنتج' });
    }

    const result = await imageStudioService.generateAdContent({
      productInfo,
      platform,
      companyId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error generating ad:', error);
    res.status(500).json({ success: false, error: 'فشل توليد محتوى الإعلان' });
  }
};

/**
 * حفظ الصورة في المعرض
 */
const saveToGallery = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const { id: userId, companyId } = req.user;

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'يجب توفير رابط الصورة' });
    }

    const item = await imageStudioService.saveToGallery(userId, companyId, imageUrl);

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error saving to gallery:', error);
    res.status(500).json({
      success: false,
      error: 'فشل حفظ الصورة في المعرض'
    });
  }
};

/**
 * تبديل منتج في مشهد (Virtual Try-On)
 */
const swapProduct = async (req, res) => {
  try {
    const { sceneImage, productImage } = req.body;
    const { id: userId, companyId } = req.user;

    if (!sceneImage || !productImage) {
      return res.status(400).json({ success: false, error: 'يجب توفير صورة المشهد وصورة المنتج' });
    }

    const result = await imageStudioService.swapProduct({
      sceneImageBase64: sceneImage,
      productImageBase64: productImage,
      companyId,
      userId
    });

    res.json(result);
  } catch (error) {
    console.error('❌ [STUDIO-CONTROLLER] Error in swapProduct:', error);
    res.status(500).json({ success: false, error: error.message || 'فشل تبديل المنتج' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  generateImage,
  checkAccess,
  getAvailableModels,
  getHistory,
  getStats,
  getGlobalStats,
  getActiveKeys,
  checkJobStatus,
  editImage,
  getGenerationLogs,
  generateAd,
  saveToGallery,
  swapProduct
};

const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * 🚚 Controller لإدارة خيارات التوصيل
 */

/**
 * جلب جميع خيارات التوصيل للشركة
 * GET /api/delivery-options
 */
exports.getDeliveryOptions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔍 [DELIVERY-OPTIONS] Getting options for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const options = await prisma.deliveryOption.findMany({
      where: { companyId },
      orderBy: { sortOrder: 'asc' }
    });

    console.log(`✅ [DELIVERY-OPTIONS] Found ${options.length} options`);

    return res.status(200).json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS] Error fetching options:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب خيارات التوصيل',
      error: error.message
    });
  }
};

/**
 * جلب خيارات التوصيل النشطة فقط
 * GET /api/delivery-options/active
 */
exports.getActiveDeliveryOptions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔍 [DELIVERY-OPTIONS] Getting active options for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const options = await prisma.deliveryOption.findMany({
      where: { 
        companyId,
        isActive: true 
      },
      orderBy: { sortOrder: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS] Error fetching active options:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب خيارات التوصيل النشطة',
      error: error.message
    });
  }
};

/**
 * جلب خيارات التوصيل للواجهة العامة (بدون مصادقة)
 * GET /api/public/delivery-options/:companyId
 */
exports.getPublicDeliveryOptions = async (req, res) => {
  try {
    // Support both req.company (from middleware) and req.params.companyId
    const companyId = req.company?.id || req.params.companyId;
    const prisma = getPrisma();

    console.log('🔍 [DELIVERY-OPTIONS-PUBLIC] Getting options for company:', companyId);
    console.log('🔍 [DELIVERY-OPTIONS-PUBLIC] req.company:', req.company);
    console.log('🔍 [DELIVERY-OPTIONS-PUBLIC] req.params:', req.params);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const options = await prisma.deliveryOption.findMany({
      where: { 
        companyId,
        isActive: true 
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        deliveryTime: true,
        price: true,
        icon: true,
        isDefault: true,
        isActive: true
      }
    });

    return res.status(200).json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS-PUBLIC] Error fetching options:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب خيارات التوصيل',
      error: error.message
    });
  }
};

/**
 * إنشاء خيار توصيل جديد
 * POST /api/delivery-options
 */
exports.createDeliveryOption = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, deliveryTime, price, icon, isDefault, isActive, sortOrder } = req.body;
    const prisma = getPrisma();

    console.log('➕ [DELIVERY-OPTIONS] Creating option for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // التحقق من البيانات المطلوبة
    if (!name || !deliveryTime || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'الاسم ووقت التوصيل والسعر مطلوبة'
      });
    }

    // إذا كان هذا الخيار افتراضي، إلغاء الافتراضي من الخيارات الأخرى
    if (isDefault) {
      await prisma.deliveryOption.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // إنشاء الخيار
    const option = await prisma.deliveryOption.create({
      data: {
        companyId,
        name,
        description: description || null,
        deliveryTime,
        price: parseFloat(price),
        icon: icon || null,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : false,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0
      }
    });

    console.log('✅ [DELIVERY-OPTIONS] Option created:', option.id);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء خيار التوصيل بنجاح',
      data: option
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS] Error creating option:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء خيار التوصيل',
      error: error.message
    });
  }
};

/**
 * تحديث خيار توصيل
 * PUT /api/delivery-options/:id
 */
exports.updateDeliveryOption = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { name, description, deliveryTime, price, icon, isDefault, isActive, sortOrder } = req.body;
    const prisma = getPrisma();

    console.log('🔄 [DELIVERY-OPTIONS] Updating option:', id);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // التحقق من أن الخيار ينتمي للشركة
    const existingOption = await prisma.deliveryOption.findFirst({
      where: { id, companyId }
    });

    if (!existingOption) {
      return res.status(404).json({
        success: false,
        message: 'خيار التوصيل غير موجود'
      });
    }

    // إذا كان هذا الخيار سيصبح افتراضي، إلغاء الافتراضي من الخيارات الأخرى
    if (isDefault && !existingOption.isDefault) {
      await prisma.deliveryOption.updateMany({
        where: { 
          companyId, 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    // بناء بيانات التحديث
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (deliveryTime !== undefined) updateData.deliveryTime = deliveryTime;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (icon !== undefined) updateData.icon = icon;
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    // تحديث الخيار
    const option = await prisma.deliveryOption.update({
      where: { id },
      data: updateData
    });

    console.log('✅ [DELIVERY-OPTIONS] Option updated:', option.id);

    return res.status(200).json({
      success: true,
      message: 'تم تحديث خيار التوصيل بنجاح',
      data: option
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS] Error updating option:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث خيار التوصيل',
      error: error.message
    });
  }
};

/**
 * تبديل حالة خيار التوصيل (تفعيل/تعطيل)
 * PATCH /api/delivery-options/:id/toggle
 */
exports.toggleDeliveryOption = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔄 [DELIVERY-OPTIONS] Toggling option:', id);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // التحقق من أن الخيار ينتمي للشركة
    const existingOption = await prisma.deliveryOption.findFirst({
      where: { id, companyId }
    });

    if (!existingOption) {
      return res.status(404).json({
        success: false,
        message: 'خيار التوصيل غير موجود'
      });
    }

    // تبديل الحالة
    const option = await prisma.deliveryOption.update({
      where: { id },
      data: { isActive: !existingOption.isActive }
    });

    console.log(`✅ [DELIVERY-OPTIONS] Option ${option.isActive ? 'activated' : 'deactivated'}`);

    return res.status(200).json({
      success: true,
      message: `تم ${option.isActive ? 'تفعيل' : 'تعطيل'} خيار التوصيل بنجاح`,
      data: option
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS] Error toggling option:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير حالة خيار التوصيل',
      error: error.message
    });
  }
};

/**
 * حذف خيار توصيل
 * DELETE /api/delivery-options/:id
 */
exports.deleteDeliveryOption = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🗑️ [DELIVERY-OPTIONS] Deleting option:', id);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // التحقق من أن الخيار ينتمي للشركة
    const existingOption = await prisma.deliveryOption.findFirst({
      where: { id, companyId }
    });

    if (!existingOption) {
      return res.status(404).json({
        success: false,
        message: 'خيار التوصيل غير موجود'
      });
    }

    // حذف الخيار
    await prisma.deliveryOption.delete({
      where: { id }
    });

    console.log('✅ [DELIVERY-OPTIONS] Option deleted');

    return res.status(200).json({
      success: true,
      message: 'تم حذف خيار التوصيل بنجاح'
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS] Error deleting option:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف خيار التوصيل',
      error: error.message
    });
  }
};

/**
 * جلب الخيار الافتراضي
 * GET /api/delivery-options/default
 */
exports.getDefaultDeliveryOption = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔍 [DELIVERY-OPTIONS] Getting default option for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const option = await prisma.deliveryOption.findFirst({
      where: { 
        companyId,
        isDefault: true,
        isActive: true
      }
    });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد خيار توصيل افتراضي'
      });
    }

    return res.status(200).json({
      success: true,
      data: option
    });
  } catch (error) {
    console.error('❌ [DELIVERY-OPTIONS] Error fetching default option:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب خيار التوصيل الافتراضي',
      error: error.message
    });
  }
};

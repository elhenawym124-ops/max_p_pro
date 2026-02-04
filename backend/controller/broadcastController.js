const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const { sendFacebookMessage } = require('../utils/allFunctions');
const socketService = require('../services/socketService');

console.log('🚀 [BROADCAST CONTROLLER] تم تحميل وحدة تحكم البرودكاست بنجاح');

// ==================== HELPER FUNCTIONS ====================

/**
 * استبدال المتغيرات في الرسالة بالبيانات الفعلية للعميل
 * @param {string} message - نص الرسالة الذي يحتوي على متغيرات
 * @param {Object} customer - بيانات العميل
 * @returns {string} - الرسالة بعد استبدال المتغيرات
 */
const replaceMessageVariables = (message, customer) => {
  if (!message || !customer) return message;

  let personalizedMessage = message;

  // استبدال متغير اسم العميل الكامل
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عزيزي العميل';
  personalizedMessage = personalizedMessage.replace(/{customerName}/g, fullName);

  // استبدال متغير الاسم الأول
  const firstName = customer.firstName || 'عزيزي العميل';
  personalizedMessage = personalizedMessage.replace(/{firstName}/g, firstName);

  // استبدال متغير الاسم الأخير
  const lastName = customer.lastName || '';
  personalizedMessage = personalizedMessage.replace(/{lastName}/g, lastName);

  return personalizedMessage;
};

// ==================== CAMPAIGN MANAGEMENT ====================

/**
 * إنشاء حملة برودكاست جديدة
 */
exports.createCampaign = async (req, res) => {
  try {
    console.log('🚀 [CREATE CAMPAIGN] بدء إنشاء حملة جديدة');
    const companyId = req.user.companyId;
    const userId = req.user.id;
    console.log(`📊 [CREATE CAMPAIGN] معرف الشركة: ${companyId}, معرف المستخدم: ${userId}`);


    let {
      name,
      message,
      targetAudience,
      scheduledAt,
      tags,
      priority,
      includeImages,
      trackClicks,
      autoResend,
      sendNow
    } = req.body;

    // استقبال الصور من req.files
    let images = [];
    if (req.files && req.files.length > 0) {
      // بناء رابط URL للصورة بناءً على اسم الملف
      const baseUrl = req.protocol + '://' + req.get('host');
      images = req.files.map(file => baseUrl + '/uploads/broadcast_images/' + file.filename);
    }

    console.log('📝 [CREATE CAMPAIGN] بيانات الحملة المستلمة:', {
      name,
      targetAudience,
      scheduledAt,
      priority,
      sendNow,
      messageLength: message?.length || 0,
      imagesCount: images.length
    });

    // ⚠️ تحقق: إذا كان sendNow و scheduledAt موجودين معاً، نتجاهل sendNow
    if (sendNow && scheduledAt) {
      console.log('⚠️ [CREATE CAMPAIGN] تم تجاهل sendNow لأن هناك وقت مجدول');
      sendNow = false;
    }

    // 🛡️ PROTECTION: إذا كان هناك scheduledAt في المستقبل، لا يمكن إرسال فوري
    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt);
      const now = new Date();

      // تحويل للتوقيت المحلي للعرض
      const scheduledLocal = new Date(scheduledTime.getTime());
      const nowLocal = new Date(now.getTime());

      if (scheduledTime > now) {
        const diffMinutes = Math.round((scheduledTime - now) / 1000 / 60);
        console.log(`⏰ [CREATE CAMPAIGN] الحملة مجدولة للمستقبل:`);
        console.log(`   📅 الوقت المجدول (UTC): ${scheduledTime.toISOString()}`);
        console.log(`   📅 الوقت المجدول (محلي): ${scheduledLocal.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`);
        console.log(`   🕐 الوقت الحالي (UTC): ${now.toISOString()}`);
        console.log(`   🕐 الوقت الحالي (محلي): ${nowLocal.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`);
        console.log(`   ⏱️  الفرق: ${diffMinutes} دقيقة`);

        // تأكد أن sendNow = false للحملات المجدولة
        if (sendNow) {
          console.log('🛑 [CREATE CAMPAIGN] إجبار sendNow = false لأن الحملة مجدولة للمستقبل');
          sendNow = false;
        }
      } else {
        console.log(`⚠️ [CREATE CAMPAIGN] تحذير: الوقت المجدول في الماضي! سيتم الإرسال فوراً`);
        console.log(`   📅 الوقت المجدول (UTC): ${scheduledTime.toISOString()}`);
        console.log(`   📅 الوقت المجدول (محلي): ${scheduledLocal.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`);
        console.log(`   🕐 الوقت الحالي (UTC): ${now.toISOString()}`);
        console.log(`   🕐 الوقت الحالي (محلي): ${nowLocal.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`);
      }
    }

    // التحقق من الحقول المطلوبة
    if (!name || !message || !targetAudience) {
      console.log('❌ [CREATE CAMPAIGN] بيانات مفقودة - فشل التحقق من الحقول المطلوبة');
      return res.status(400).json({
        success: false,
        message: 'الاسم والرسالة والجمهور المستهدف مطلوبة'
      });
    }

    // 🔄 لا نحسب المستلمين الآن - سيتم الحساب وقت الإرسال
    // حساب المستلمين النشطاء (آخر 24 ساعة) سيتم في sendCampaign أو scheduler
    console.log('💡 [CREATE CAMPAIGN] سيتم حساب المستلمين النشطاء تلقائياً وقت الإرسال (آخر 24 ساعة)');

    console.log('💾 [CREATE CAMPAIGN] إنشاء الحملة في قاعدة البيانات');
    // تحويل tags و images إلى JSON strings أو null
    let tagsString = null;
    if (tags) {
      if (Array.isArray(tags)) {
        tagsString = tags.length > 0 ? JSON.stringify(tags) : null;
      } else if (typeof tags === 'string' && tags.trim() !== '') {
        tagsString = tags;
      }
    }

    let imagesString = null;
    if (images && Array.isArray(images) && images.length > 0) {
      imagesString = JSON.stringify(images);
    }

    // إنشاء الحملة
    // Generate ID for BroadcastCampaign (no default in schema)
    const generateId = () => 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

    const campaign = await getSharedPrismaClient().broadcastCampaign.create({
      data: {
        id: generateId(),
        name,
        message,
        targetAudience,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        tags: tagsString,
        priority: priority || 'medium',
        includeImages: (includeImages === true || includeImages === 'true'),
        trackClicks: trackClicks !== false,
        autoResend: (autoResend === true || autoResend === 'true'),
        images: imagesString,
        status: sendNow ? 'sending' : (scheduledAt ? 'scheduled' : 'draft'),
        recipientCount: 0, // سيتم حسابه وقت الإرسال بناءً على النشاط في آخر 24 ساعة
        companyId,
        creatorId: userId,
        updatedAt: new Date()
      },
      include: {
        company: {
          select: {
            name: true
          }
        },
      }
    });

    console.log(`✅ [CREATE CAMPAIGN] تم إنشاء الحملة بنجاح - معرف الحملة: ${campaign.id}, الحالة: ${campaign.status}`);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحملة بنجاح',
      data: campaign
    });

  } catch (error) {
    console.error('❌ [CREATE CAMPAIGN] خطأ في إنشاء الحملة:', error.message);
    console.error('🔍 [CREATE CAMPAIGN] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء الحملة',
      error: error.message
    });
  }
};

/**
 * الحصول على جميع الحملات
 */
exports.getCampaigns = async (req, res) => {
  try {
    console.log('📋 [GET CAMPAIGNS] بدء جلب قائمة الحملات');
    const companyId = req.user.companyId;
    const { status, page = 1, limit = 10 } = req.query;
    console.log(`🔍 [GET CAMPAIGNS] معايير البحث - الشركة: ${companyId}, الحالة: ${status || 'الكل'}, الصفحة: ${page}, الحد: ${limit}`);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      companyId,
      ...(status && { status })
    };

    console.log('🔄 [GET CAMPAIGNS] تنفيذ استعلام قاعدة البيانات');
    const [campaigns, total] = await Promise.all([
      getSharedPrismaClient().broadcastCampaign.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          company: {
            select: {
              name: true
            }
          }
        }
      }),
      getSharedPrismaClient().broadcastCampaign.count({ where })
    ]);

    console.log(`✅ [GET CAMPAIGNS] تم جلب ${campaigns.length} حملة من أصل ${total} حملة`);

    res.json({
      success: true,
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ [GET CAMPAIGNS] خطأ في جلب الحملات:', error.message);
    console.error('🔍 [GET CAMPAIGNS] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الحملات',
      error: error.message
    });
  }
};

/**
 * الحصول على حملة واحدة
 */
exports.getCampaign = async (req, res) => {
  try {
    console.log('📋 [GET CAMPAIGN] بدء جلب تفاصيل الحملة');
    const companyId = req.user.companyId;
    const { campaignId } = req.params;
    console.log(`🔍 [GET CAMPAIGN] معرف الشركة: ${companyId}, معرف الحملة: ${campaignId}`);

    console.log('🔍 [GET CAMPAIGN] البحث عن الحملة مع التفاصيل');
    const campaign = await getSharedPrismaClient().broadcastCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      },
      include: {
        company: {
          select: {
            name: true
          }
        },
        recipients: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!campaign) {
      console.log('❌ [GET CAMPAIGN] الحملة غير موجودة');
      return res.status(404).json({
        success: false,
        message: 'الحملة غير موجودة'
      });
    }

    console.log(`✅ [GET CAMPAIGN] تم العثور على الحملة - الاسم: ${campaign.name}, الحالة: ${campaign.status}, المستلمين: ${campaign.recipients?.length || 0}`);

    res.json({
      success: true,
      data: campaign
    });

  } catch (error) {
    console.error('❌ [GET CAMPAIGN] خطأ في جلب الحملة:', error.message);
    console.error('🔍 [GET CAMPAIGN] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الحملة',
      error: error.message
    });
  }
};

/**
 * تحديث حملة
 */
exports.updateCampaign = async (req, res) => {
  try {
    console.log('✏️ [UPDATE CAMPAIGN] بدء تحديث الحملة');
    const companyId = req.user.companyId;
    const { campaignId } = req.params;
    const updateData = req.body;
    console.log(`🔍 [UPDATE CAMPAIGN] معرف الشركة: ${companyId}, معرف الحملة: ${campaignId}`);
    console.log('📝 [UPDATE CAMPAIGN] بيانات التحديث:', Object.keys(updateData));

    console.log('🔍 [UPDATE CAMPAIGN] التحقق من وجود الحملة');
    // التحقق من وجود الحملة
    const existingCampaign = await getSharedPrismaClient().broadcastCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      }
    });

    if (!existingCampaign) {
      console.log('❌ [UPDATE CAMPAIGN] الحملة غير موجودة');
      return res.status(404).json({
        success: false,
        message: 'الحملة غير موجودة'
      });
    }

    console.log(`📋 [UPDATE CAMPAIGN] تم العثور على الحملة - الاسم: ${existingCampaign.name}, الحالة: ${existingCampaign.status}`);

    // لا يمكن تعديل الحملات المرسلة
    if (existingCampaign.status === 'sent') {
      console.log('⚠️ [UPDATE CAMPAIGN] لا يمكن تعديل حملة تم إرسالها');
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل حملة تم إرسالها'
      });
    }

    console.log('🔄 [UPDATE CAMPAIGN] تحديث بيانات الحملة في قاعدة البيانات');

    // تحويل tags و images إلى JSON strings أو null إذا كانت موجودة
    const processedData = { ...updateData };

    if ('tags' in processedData) {
      if (Array.isArray(processedData.tags)) {
        processedData.tags = processedData.tags.length > 0 ? JSON.stringify(processedData.tags) : null;
      } else if (typeof processedData.tags === 'string' && processedData.tags.trim() === '') {
        processedData.tags = null;
      }
      // إذا كان string غير فارغ، نتركه كما هو
    }

    if ('images' in processedData) {
      if (Array.isArray(processedData.images)) {
        processedData.images = processedData.images.length > 0 ? JSON.stringify(processedData.images) : null;
      } else if (typeof processedData.images === 'string' && processedData.images.trim() === '') {
        processedData.images = null;
      }
      // إذا كان string غير فارغ، نتركه كما هو
    }

    if (processedData.scheduledAt) {
      processedData.scheduledAt = new Date(processedData.scheduledAt);
    } else if ('scheduledAt' in processedData && processedData.scheduledAt === null) {
      processedData.scheduledAt = null;
    } else {
      delete processedData.scheduledAt;
    }

    const campaign = await getSharedPrismaClient().broadcastCampaign.update({
      where: { id: campaignId },
      data: processedData
    });

    console.log(`✅ [UPDATE CAMPAIGN] تم تحديث الحملة بنجاح`);

    res.json({
      success: true,
      message: 'تم تحديث الحملة بنجاح',
      data: campaign
    });

  } catch (error) {
    console.error('❌ [UPDATE CAMPAIGN] خطأ في تحديث الحملة:', error.message);
    console.error('🔍 [UPDATE CAMPAIGN] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الحملة',
      error: error.message
    });
  }
};

/**
 * حذف/إلغاء حملة
 */
exports.cancelCampaign = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { campaignId } = req.params;

    const campaign = await getSharedPrismaClient().broadcastCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'الحملة غير موجودة'
      });
    }

    // إذا كانت الحملة قيد الإرسال، نوقفها
    if (campaign.status === 'sending') {
      await getSharedPrismaClient().broadcastCampaign.update({
        where: { id: campaignId },
        data: { status: 'cancelled' }
      });
    } else {
      // حذف الحملة
      await getSharedPrismaClient().broadcastCampaign.delete({
        where: { id: campaignId }
      });
    }

    res.json({
      success: true,
      message: 'تم إلغاء الحملة بنجاح'
    });

  } catch (error) {
    console.error('❌ Error cancelling campaign:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إلغاء الحملة',
      error: error.message
    });
  }
};

/**
 * إيقاف حملة مؤقتاً
 */
exports.pauseCampaign = async (req, res) => {
  try {
    console.log('⏸️ [PAUSE CAMPAIGN] بدء إيقاف الحملة مؤقتاً');
    const companyId = req.user.companyId;
    const { campaignId } = req.params;
    console.log(`🔍 [PAUSE CAMPAIGN] معرف الشركة: ${companyId}, معرف الحملة: ${campaignId}`);

    console.log('🔍 [PAUSE CAMPAIGN] البحث عن الحملة');
    const campaign = await getSharedPrismaClient().broadcastCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      }
    });

    if (!campaign) {
      console.log('❌ [PAUSE CAMPAIGN] الحملة غير موجودة');
      return res.status(404).json({
        success: false,
        message: 'الحملة غير موجودة'
      });
    }

    console.log(`📋 [PAUSE CAMPAIGN] تم العثور على الحملة - الاسم: ${campaign.name}, الحالة: ${campaign.status}`);

    if (campaign.status !== 'sending' && campaign.status !== 'scheduled') {
      console.log(`⚠️ [PAUSE CAMPAIGN] لا يمكن إيقاف الحملة - الحالة الحالية: ${campaign.status}`);
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إيقاف هذه الحملة'
      });
    }

    console.log('🔄 [PAUSE CAMPAIGN] تحديث حالة الحملة إلى "paused"');
    const updatedCampaign = await getSharedPrismaClient().broadcastCampaign.update({
      where: { id: campaignId },
      data: { status: 'paused' }
    });

    console.log(`✅ [PAUSE CAMPAIGN] تم إيقاف الحملة مؤقتاً بنجاح`);

    res.json({
      success: true,
      message: 'تم إيقاف الحملة مؤقتاً',
      data: updatedCampaign
    });

  } catch (error) {
    console.error('❌ [PAUSE CAMPAIGN] خطأ في إيقاف الحملة:', error.message);
    console.error('🔍 [PAUSE CAMPAIGN] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إيقاف الحملة',
      error: error.message
    });
  }
};

/**
 * استئناف حملة متوقفة
 */
exports.resumeCampaign = async (req, res) => {
  try {
    console.log('▶️ [RESUME CAMPAIGN] بدء استئناف الحملة');
    const companyId = req.user.companyId;
    const { campaignId } = req.params;
    console.log(`🔍 [RESUME CAMPAIGN] معرف الشركة: ${companyId}, معرف الحملة: ${campaignId}`);

    console.log('🔍 [RESUME CAMPAIGN] البحث عن الحملة');
    const campaign = await getSharedPrismaClient().broadcastCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      }
    });

    if (!campaign) {
      console.log('❌ [RESUME CAMPAIGN] الحملة غير موجودة');
      return res.status(404).json({
        success: false,
        message: 'الحملة غير موجودة'
      });
    }

    console.log(`📋 [RESUME CAMPAIGN] تم العثور على الحملة - الاسم: ${campaign.name}, الحالة: ${campaign.status}`);

    if (campaign.status !== 'paused') {
      console.log(`⚠️ [RESUME CAMPAIGN] الحملة ليست متوقفة - الحالة الحالية: ${campaign.status}`);
      return res.status(400).json({
        success: false,
        message: 'الحملة ليست متوقفة'
      });
    }

    const newStatus = campaign.scheduledAt ? 'scheduled' : 'sending';
    console.log(`🔄 [RESUME CAMPAIGN] تحديث حالة الحملة إلى "${newStatus}"`);

    const updatedCampaign = await getSharedPrismaClient().broadcastCampaign.update({
      where: { id: campaignId },
      data: { status: newStatus }
    });

    console.log(`✅ [RESUME CAMPAIGN] تم استئناف الحملة بنجاح`);

    res.json({
      success: true,
      message: 'تم استئناف الحملة',
      data: updatedCampaign
    });

  } catch (error) {
    console.error('❌ [RESUME CAMPAIGN] خطأ في استئناف الحملة:', error.message);
    console.error('🔍 [RESUME CAMPAIGN] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في استئناف الحملة',
      error: error.message
    });
  }
};

/**
 * إرسال حملة
 */
exports.sendCampaign = async (req, res) => {
  try {
    console.log('🚀 [SEND CAMPAIGN] بدء عملية إرسال الحملة');
    const companyId = req.user.companyId;
    const { campaignId } = req.params;
    console.log(`📊 [SEND CAMPAIGN] معرف الشركة: ${companyId}, معرف الحملة: ${campaignId}`);

    console.log('🔍 [SEND CAMPAIGN] البحث عن الحملة في قاعدة البيانات');
    const campaign = await getSharedPrismaClient().broadcastCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      }
    });

    if (!campaign) {
      console.log('❌ [SEND CAMPAIGN] الحملة غير موجودة');
      return res.status(404).json({
        success: false,
        message: 'الحملة غير موجودة'
      });
    }

    console.log(`📋 [SEND CAMPAIGN] تم العثور على الحملة - الاسم: ${campaign.name}, الحالة: ${campaign.status}`);

    // Parse images from JSON string to array
    let campaignImages = [];
    if (campaign.images) {
      try {
        campaignImages = typeof campaign.images === 'string' ? JSON.parse(campaign.images) : campaign.images;
        if (!Array.isArray(campaignImages)) {
          campaignImages = [];
        }
      } catch (error) {
        console.error('❌ [SEND CAMPAIGN] خطأ في تحليل صور الحملة:', error);
        campaignImages = [];
      }
    }
    // Update campaign object with parsed images
    campaign.images = campaignImages;

    if (campaign.status === 'sent') {
      console.log('⚠️ [SEND CAMPAIGN] الحملة تم إرسالها بالفعل');
      return res.status(400).json({
        success: false,
        message: 'تم إرسال هذه الحملة بالفعل'
      });
    }

    console.log('🔄 [SEND CAMPAIGN] تحديث حالة الحملة إلى "sending"');
    // تحديث حالة الحملة
    await getSharedPrismaClient().broadcastCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'sending',
        sentAt: new Date()
      }
    });

    console.log(`👥 [SEND CAMPAIGN] جلب المحادثات المستهدفة للجمهور: ${campaign.targetAudience}`);
    // جلب المحادثات المستهدفة
    let conversations = [];

    // حساب وقت آخر 24 ساعة
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log(`⏰ [SEND CAMPAIGN] فلترة المحادثات التي تم التفاعل معها بعد: ${twentyFourHoursAgo.toISOString()}`);

    if (campaign.targetAudience === 'all') {
      console.log('🌐 [SEND CAMPAIGN] جلب جميع المحادثات النشطة (آخر رسالة من العميل في آخر 24 ساعة)');
      conversations = await getSharedPrismaClient().conversation.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          messages: {
            some: {
              isFromCustomer: true,
              createdAt: {
                gte: twentyFourHoursAgo
              }
            }
          }
        },
        include: {
          customer: true,
          messages: {
            where: {
              isFromCustomer: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });
    } else {
      console.log(`📋 [SEND CAMPAIGN] جلب المحادثات للجمهور المخصص: ${campaign.targetAudience}`);
      // منطق للجمهور المستهدف المخصص
      conversations = await getSharedPrismaClient().conversation.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          messages: {
            some: {
              isFromCustomer: true,
              createdAt: {
                gte: twentyFourHoursAgo
              }
            }
          }
        },
        include: {
          customer: true,
          messages: {
            where: {
              isFromCustomer: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });
    }

    console.log(`📊 [SEND CAMPAIGN] تم جلب ${conversations.length} محادثة نشطة`);

    console.log('📝 [SEND CAMPAIGN] إنشاء سجلات المستلمين');
    // Generate ID helper function
    const generateId = () => 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

    // إنشاء سجلات المستلمين
    const recipients = conversations.map(conv => ({
      id: generateId(),
      campaignId: campaign.id,
      conversationId: conv.id,
      customerPhone: conv.customer.phone || '',
      customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
      messengerUserId: conv.customer.facebookId,
      status: 'pending',
      updatedAt: new Date()
    }));

    if (recipients.length > 0) {
      console.log(`💾 [SEND CAMPAIGN] حفظ ${recipients.length} مستلم في قاعدة البيانات`);
      await getSharedPrismaClient().broadcastRecipient.createMany({
        data: recipients
      });
    } else {
      console.log('⚠️ [SEND CAMPAIGN] لا توجد مستلمين للحملة');
    }

    // ==================== إرسال الرسائل عبر Facebook Messenger ====================
    console.log('📤 [SEND CAMPAIGN] بدء إرسال الرسائل عبر Facebook Messenger');

    let sentCount = 0;
    let failedCount = 0;
    const sendResults = [];
    const totalRecipients = conversations.length;

    // Get Socket.IO instance for progress updates
    const io = socketService.getIO();

    if (!io) {
      console.error('❌ [SEND CAMPAIGN] Socket.IO instance not available!');
    } else {
      console.log('✅ [SEND CAMPAIGN] Socket.IO instance ready');
    }

    // إرسال إشعار بدء الحملة
    const startEvent = {
      campaignId: campaign.id,
      status: 'started',
      total: totalRecipients,
      sent: 0,
      failed: 0,
      progress: 0
    };
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 [SOCKET] Emitting campaign:progress (STARTED)');
    console.log('   Campaign ID:', campaign.id);
    console.log('   Total Recipients:', totalRecipients);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    io.emit('campaign:progress', startEvent);

    // Send messages to each customer
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      try {
        // Skip if customer doesn't have Facebook ID
        if (!conv.customer.facebookId) {
          console.log(`⚠️ [SEND CAMPAIGN] تخطي العميل ${conv.customer.firstName} - لا يوجد Facebook ID`);
          failedCount++;

          // Update recipient status
          await getSharedPrismaClient().broadcastRecipient.updateMany({
            where: {
              campaignId: campaign.id,
              conversationId: conv.id
            },
            data: {
              status: 'failed',
              failureReason: 'No Facebook ID',
              sentAt: new Date()
            }
          });

          continue;
        }

        console.log(`📨 [SEND CAMPAIGN] إرسال رسالة إلى ${conv.customer.firstName} ${conv.customer.lastName} (${conv.customer.facebookId})`);

        // 🔍 جلب Page ID من metadata المحادثة
        let conversationPageId = null;
        if (conv.metadata) {
          try {
            const metadata = JSON.parse(conv.metadata);
            if (metadata.pageId) {
              conversationPageId = metadata.pageId;
              console.log(`🎯 [SEND CAMPAIGN] استخدام Page ID من المحادثة: ${conversationPageId}`);
            }
          } catch (error) {
            console.log(`⚠️ [SEND CAMPAIGN] خطأ في قراءة metadata: ${error.message}`);
          }
        }

        // إذا لم يتم العثور على Page ID في metadata، استخدم أول صفحة متصلة
        if (!conversationPageId) {
          const defaultPage = await getSharedPrismaClient().facebookPage.findFirst({
            where: {
              companyId: companyId,
              status: 'connected'
            },
            orderBy: {
              connectedAt: 'desc'
            }
          });

          if (defaultPage) {
            conversationPageId = defaultPage.pageId;
            console.log(`🔄 [SEND CAMPAIGN] استخدام الصفحة الافتراضية: ${defaultPage.pageName} (${conversationPageId})`);
          } else {
            console.log(`❌ [SEND CAMPAIGN] لا توجد صفحة Facebook متصلة للعميل ${conv.customer.firstName}`);
            failedCount++;

            await getSharedPrismaClient().broadcastRecipient.updateMany({
              where: {
                campaignId: campaign.id,
                conversationId: conv.id
              },
              data: {
                status: 'failed',
                failureReason: 'No connected Facebook page',
                sentAt: new Date()
              }
            });

            continue;
          }
        }

        // 🚀 CRITICAL FIX: حفظ الرسالة في database قبل الإرسال لتجنب race condition
        // حفظ الرسالة النصية إذا وجدت
        const savedMessages = [];

        // ✨ استبدال المتغيرات بالبيانات الفعلية للعميل
        const personalizedMessage = replaceMessageVariables(campaign.message, conv.customer);
        console.log(`✨ [PERSONALIZATION] Original: "${campaign.message}" => Personalized: "${personalizedMessage}"`);

        if (personalizedMessage && personalizedMessage.trim().length > 0) {
          // Generate ID helper function
          const generateId = () => 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

          const textMessage = await getSharedPrismaClient().message.create({
            data: {
              id: generateId(),
              conversationId: conv.id,
              content: personalizedMessage,
              isFromCustomer: false,
              type: 'TEXT',
              senderId: null,
              metadata: JSON.stringify({
                isBroadcast: true,
                campaignId: campaign.id,
                campaignName: campaign.name,
                sentAt: new Date().toISOString(),
                originalMessage: campaign.message,
                hasVariables: campaign.message !== personalizedMessage
              })
            }
          });
          savedMessages.push(textMessage);
          console.log(`💾 [BROADCAST] Saved message BEFORE sending: ${textMessage.id}`);
        }

        let sendResult;
        // إذا كانت الحملة تحتوي على صور، أرسل كل صورة كرسالة منفصلة
        if (campaign.images && Array.isArray(campaign.images) && campaign.images.length > 0) {
          // حفظ كل صورة كرسالة منفصلة قبل الإرسال
          for (const imageUrl of campaign.images) {
            // Generate ID helper function
            const generateId = () => 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

            const imageMessage = await getSharedPrismaClient().message.create({
              data: {
                id: generateId(),
                conversationId: conv.id,
                content: imageUrl,
                isFromCustomer: false,
                type: 'IMAGE',
                senderId: null,
                metadata: JSON.stringify({
                  isBroadcast: true,
                  campaignId: campaign.id,
                  campaignName: campaign.name,
                  sentAt: new Date().toISOString()
                })
              }
            });
            savedMessages.push(imageMessage);
          }

          // أرسل الرسالة النصية المخصصة أولاً إذا موجودة
          if (personalizedMessage && personalizedMessage.trim().length > 0) {
            sendResult = await sendFacebookMessage(
              conv.customer.facebookId,
              personalizedMessage,
              'TEXT',
              conversationPageId
            );
          }
          // أرسل كل صورة
          for (const imageUrl of campaign.images) {
            const imageResult = await sendFacebookMessage(
              conv.customer.facebookId,
              imageUrl,
              'IMAGE',
              conversationPageId
            );
            // إذا فشل إرسال الصورة، اعتبرها فشل للعميل
            if (!imageResult.success) {
              sendResult = imageResult;
              break;
            }
            sendResult = imageResult;
          }
        } else {
          // أرسل فقط الرسالة النصية المخصصة
          sendResult = await sendFacebookMessage(
            conv.customer.facebookId,
            personalizedMessage,
            'TEXT',
            conversationPageId
          );
        }

        if (sendResult.success) {
          console.log(`✅ [SEND CAMPAIGN] تم إرسال الرسالة بنجاح إلى ${conv.customer.firstName}`);
          sentCount++;

          // Update recipient status to sent
          await getSharedPrismaClient().broadcastRecipient.updateMany({
            where: {
              campaignId: campaign.id,
              conversationId: conv.id
            },
            data: {
              status: 'sent',
              sentAt: new Date()
            }
          });

          // ✅ تحديث الرسائل المحفوظة بـ facebookMessageId لمنع التكرار عند استقبال echo
          if (sendResult.messageId && savedMessages.length > 0) {
            for (const msg of savedMessages) {
              const currentMetadata = JSON.parse(msg.metadata || '{}');
              await getSharedPrismaClient().message.update({
                where: { id: msg.id },
                data: {
                  metadata: JSON.stringify({
                    ...currentMetadata,
                    facebookMessageId: sendResult.messageId
                  })
                }
              });
            }
            console.log(`🔖 [BROADCAST] Updated message with Facebook ID: ${sendResult.messageId}`);
          }

          // ✅ الرسائل محفوظة مسبقاً قبل الإرسال

          sendResults.push({
            customerId: conv.customer.id,
            customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
            status: 'sent',
            success: true
          });
        } else {
          console.log(`❌ [SEND CAMPAIGN] فشل إرسال الرسالة إلى ${conv.customer.firstName}: ${sendResult.error || sendResult.message}`);
          failedCount++;

          // ❌ حذف الرسائل المحفوظة لأن الإرسال فشل
          for (const msg of savedMessages) {
            await getSharedPrismaClient().message.delete({
              where: { id: msg.id }
            });
          }

          // Update recipient status to failed
          await getSharedPrismaClient().broadcastRecipient.updateMany({
            where: {
              campaignId: campaign.id,
              conversationId: conv.id
            },
            data: {
              status: 'failed',
              failureReason: sendResult.error || sendResult.message || 'Unknown error',
              sentAt: new Date()
            }
          });

          sendResults.push({
            customerId: conv.customer.id,
            customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
            status: 'failed',
            success: false,
            error: sendResult.error || sendResult.message
          });
        }

        // إرسال تحديث التقدم بعد كل رسالة
        const progress = Math.round(((i + 1) / totalRecipients) * 100);
        const progressEvent = {
          campaignId: campaign.id,
          status: 'sending',
          total: totalRecipients,
          sent: sentCount,
          failed: failedCount,
          progress: progress,
          currentRecipient: `${conv.customer.firstName} ${conv.customer.lastName}`
        };
        console.log(`📊 [PROGRESS] ${progress}% - Sent: ${sentCount}, Failed: ${failedCount}`);
        io.emit('campaign:progress', progressEvent);

        // Add a small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ [SEND CAMPAIGN] خطأ في إرسال الرسالة إلى ${conv.customer.firstName}:`, error.message);
        failedCount++;

        // Update recipient status to failed
        await getSharedPrismaClient().broadcastRecipient.updateMany({
          where: {
            campaignId: campaign.id,
            conversationId: conv.id
          },
          data: {
            status: 'failed',
            failureReason: error.message,
            sentAt: new Date()
          }
        }).catch(err => console.error('Error updating recipient status:', err));

        sendResults.push({
          customerId: conv.customer.id,
          customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
          status: 'failed',
          success: false,
          error: error.message
        });
      }
    }

    console.log(`📊 [SEND CAMPAIGN] نتائج الإرسال - نجح: ${sentCount}, فشل: ${failedCount}`);

    // 🔔 إرسال إشعار الإتمام قبل التحديث (في حالة حدوث خطأ في DB)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 [SOCKET] Emitting campaign:progress (COMPLETED)');
    console.log('   Campaign ID:', campaign.id);
    console.log('   Total:', totalRecipients);
    console.log('   Sent:', sentCount);
    console.log('   Failed:', failedCount);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    io.emit('campaign:progress', {
      campaignId: campaign.id,
      status: 'completed',
      total: totalRecipients,
      sent: sentCount,
      failed: failedCount,
      progress: 100
    });

    console.log('🔄 [SEND CAMPAIGN] تحديث إحصائيات الحملة');
    // تحديث عدد المرسل إليهم
    try {
      await getSharedPrismaClient().broadcastCampaign.update({
        where: { id: campaignId },
        data: {
          recipientCount: recipients.length,
          sentCount: sentCount,
          failedCount: failedCount,
          deliveredCount: sentCount, // Initially same as sent, will be updated by webhooks
          status: sentCount > 0 ? 'sent' : 'failed'
        }
      });
      console.log('✅ [SEND CAMPAIGN] تم تحديث إحصائيات الحملة بنجاح');
    } catch (updateError) {
      console.error('❌ [SEND CAMPAIGN] خطأ في تحديث إحصائيات الحملة:', updateError);
      // لا نوقف العملية - الحملة تم إرسالها بنجاح
    }

    console.log(`✅ [SEND CAMPAIGN] تم إرسال الحملة بنجاح - المستلمين: ${recipients.length}, نجح: ${sentCount}, فشل: ${failedCount}`);

    res.json({
      success: true,
      message: sentCount > 0 ? 'تم إرسال الحملة بنجاح' : 'فشل إرسال الحملة',
      campaignId: campaign.id,
      recipientCount: recipients.length,
      sentCount: sentCount,
      failedCount: failedCount,
      details: sendResults
    });

  } catch (error) {
    console.error('❌ [SEND CAMPAIGN] خطأ في إرسال الحملة:', error.message);
    console.error('🔍 [SEND CAMPAIGN] تفاصيل الخطأ:', error);

    // إرسال إشعار فشل الحملة عبر Socket.IO
    try {
      const io = socketService.getIO();
      if (io) {
        io.emit('campaign:progress', {
          campaignId: req.params.campaignId || 'unknown',
          status: 'failed',
          total: 0,
          sent: 0,
          failed: 0,
          progress: 0,
          error: error.message
        });
      }
    } catch (socketError) {
      console.error('❌ [SEND CAMPAIGN] Failed to emit error event:', socketError);
    }

    res.status(500).json({
      success: false,
      message: 'فشل في إرسال الحملة',
      error: error.message
    });
  }
};

// ==================== ANALYTICS ====================

/**
 * الحصول على إحصائيات البرودكاست
 */
exports.getAnalytics = async (req, res) => {
  try {
    console.log('📊 [GET ANALYTICS] بدء جلب إحصائيات البرودكاست');
    const companyId = req.user.companyId;
    const { period = '30d' } = req.query;
    console.log(`🔍 [GET ANALYTICS] معرف الشركة: ${companyId}, الفترة: ${period}`);

    // حساب التاريخ بناءً على الفترة
    const now = new Date();
    let startDate = new Date();

    if (period === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(now.getDate() - 90);
    }

    console.log(`📅 [GET ANALYTICS] نطاق التاريخ: من ${startDate.toISOString()} إلى ${now.toISOString()}`);

    console.log('🔄 [GET ANALYTICS] تنفيذ استعلامات الإحصائيات');
    // إحصائيات الحملات
    const [
      totalCampaigns,
      activeCampaigns,
      campaignsThisMonth,
      allCampaigns
    ] = await Promise.all([
      getSharedPrismaClient().broadcastCampaign.count({
        where: { companyId }
      }),
      getSharedPrismaClient().broadcastCampaign.count({
        where: {
          companyId,
          status: { in: ['sending', 'scheduled'] }
        }
      }),
      getSharedPrismaClient().broadcastCampaign.count({
        where: {
          companyId,
          createdAt: { gte: startDate }
        }
      }),
      getSharedPrismaClient().broadcastCampaign.findMany({
        where: {
          companyId,
          status: 'sent'
        },
        select: {
          recipientCount: true,
          sentCount: true,
          deliveredCount: true,
          openedCount: true,
          clickedCount: true
        }
      })
    ]);

    console.log(`📈 [GET ANALYTICS] إحصائيات أولية - إجمالي الحملات: ${totalCampaigns}, النشطة: ${activeCampaigns}, هذا الشهر: ${campaignsThisMonth}`);

    // حساب الإحصائيات
    const totalRecipients = allCampaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);
    const totalSent = allCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
    const totalDelivered = allCampaigns.reduce((sum, c) => sum + (c.deliveredCount || 0), 0);
    const totalOpened = allCampaigns.reduce((sum, c) => sum + (c.openedCount || 0), 0);
    const totalClicked = allCampaigns.reduce((sum, c) => sum + (c.clickedCount || 0), 0);

    const averageOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const averageClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const averageDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    console.log(`📊 [GET ANALYTICS] إحصائيات محسوبة - المرسل: ${totalSent}, المسلم: ${totalDelivered}, المفتوح: ${totalOpened}, النقرات: ${totalClicked}`);

    // أفضل وقت للإرسال (مبسط)
    const bestPerformingTime = '10:00 AM';

    console.log(`✅ [GET ANALYTICS] تم حساب الإحصائيات بنجاح - معدل التسليم: ${averageDeliveryRate.toFixed(1)}%, معدل الفتح: ${averageOpenRate.toFixed(1)}%, معدل النقر: ${averageClickRate.toFixed(1)}%`);

    res.json({
      success: true,
      totalCampaigns,
      activeCampaigns,
      campaignsThisMonth,
      totalRecipients,
      averageOpenRate: Math.round(averageOpenRate * 10) / 10,
      averageClickRate: Math.round(averageClickRate * 10) / 10,
      averageDeliveryRate: Math.round(averageDeliveryRate * 10) / 10,
      totalRevenue: 0,
      bestPerformingTime,
      campaignMetrics: []
    });

  } catch (error) {
    console.error('❌ [GET ANALYTICS] خطأ في جلب الإحصائيات:', error.message);
    console.error('🔍 [GET ANALYTICS] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      error: error.message
    });
  }
};

/**
 * الحصول على إحصائيات حملة محددة
 */
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { campaignId } = req.params;

    const campaign = await getSharedPrismaClient().broadcastCampaign.findFirst({
      where: {
        id: campaignId,
        companyId
      },
      include: {
        recipients: {
          select: {
            status: true,
            sentAt: true,
            deliveredAt: true,
            openedAt: true,
            clickedAt: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'الحملة غير موجودة'
      });
    }

    const deliveryRate = campaign.recipientCount > 0
      ? (campaign.deliveredCount / campaign.recipientCount) * 100
      : 0;

    const openRate = campaign.sentCount > 0
      ? (campaign.openedCount / campaign.sentCount) * 100
      : 0;

    const clickRate = campaign.sentCount > 0
      ? (campaign.clickedCount / campaign.sentCount) * 100
      : 0;

    res.json({
      success: true,
      data: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        sentAt: campaign.sentAt,
        recipientCount: campaign.recipientCount,
        deliveredCount: campaign.deliveredCount,
        openedCount: campaign.openedCount,
        clickedCount: campaign.clickedCount,
        failedCount: campaign.failedCount,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10
      }
    });

  } catch (error) {
    console.error('❌ Error fetching campaign analytics:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات الحملة',
      error: error.message
    });
  }
};

// ==================== CUSTOMER LISTS ====================

/**
 * إنشاء قائمة عملاء جديدة
 */
exports.createCustomerList = async (req, res) => {
  try {
    console.log('➕ [CREATE CUSTOMER LIST] بدء إنشاء قائمة عملاء جديدة');
    const companyId = req.user.companyId;
    const { name, description, criteria } = req.body;
    console.log(`🔍 [CREATE CUSTOMER LIST] معرف الشركة: ${companyId}`);
    console.log('📝 [CREATE CUSTOMER LIST] بيانات القائمة:', { name, description, criteria });

    // التحقق من الحقول المطلوبة
    if (!name || !criteria) {
      console.log('❌ [CREATE CUSTOMER LIST] بيانات مفقودة');
      return res.status(400).json({
        success: false,
        message: 'الاسم والمعايير مطلوبة'
      });
    }

    // حساب عدد العملاء بناءً على المعايير
    console.log('🔍 [CREATE CUSTOMER LIST] حساب عدد العملاء بناءً على المعايير');
    let whereCondition = { companyId };

    if (criteria.type === 'active' && criteria.lastActivity) {
      const hours = parseInt(criteria.lastActivity);
      const dateThreshold = new Date();
      dateThreshold.setHours(dateThreshold.getHours() - hours);
      whereCondition.status = 'ACTIVE';
      whereCondition.messages = {
        some: {
          isFromCustomer: true,
          createdAt: {
            gte: dateThreshold
          }
        }
      };
    } else if (criteria.type === 'inactive' && criteria.lastActivity) {
      const days = parseInt(criteria.lastActivity);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      whereCondition.updatedAt = { lt: dateThreshold };
    } else if (criteria.type === 'all') {
      whereCondition.status = 'ACTIVE';
    }

    const count = await getSharedPrismaClient().conversation.count({ where: whereCondition });
    console.log(`📊 [CREATE CUSTOMER LIST] عدد العملاء المطابقين: ${count}`);

    // إنشاء القائمة
    console.log('💾 [CREATE CUSTOMER LIST] حفظ القائمة في قاعدة البيانات');
    const list = await getSharedPrismaClient().customerList.create({
      data: {
        name,
        description: description || '',
        criteria,
        count,
        companyId
      }
    });

    console.log(`✅ [CREATE CUSTOMER LIST] تم إنشاء القائمة بنجاح - معرف القائمة: ${list.id}`);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القائمة بنجاح',
      data: list
    });

  } catch (error) {
    console.error('❌ [CREATE CUSTOMER LIST] خطأ في إنشاء القائمة:', error.message);
    console.error('🔍 [CREATE CUSTOMER LIST] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء القائمة',
      error: error.message
    });
  }
};

/**
 * الحصول على قوائم العملاء
 */
exports.getCustomerLists = async (req, res) => {
  try {
    console.log('📋 [GET CUSTOMER LISTS] بدء جلب قوائم العملاء');
    const companyId = req.user.companyId;
    console.log(`🔍 [GET CUSTOMER LISTS] معرف الشركة: ${companyId}`);

    console.log('👥 [GET CUSTOMER LISTS] حساب إجمالي العملاء النشطين');
    // Get total customer count
    const totalCustomers = await getSharedPrismaClient().conversation.count({
      where: {
        companyId,
        status: 'ACTIVE'
      }
    });

    console.log(`📊 [GET CUSTOMER LISTS] إجمالي العملاء النشطين: ${totalCustomers}`);

    // حساب العملاء النشطين في آخر 24 ساعة
    console.log('⏰ [GET CUSTOMER LISTS] حساب العملاء النشطين في آخر 24 ساعة');
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const activeIn24Hours = await getSharedPrismaClient().conversation.count({
      where: {
        companyId,
        status: 'ACTIVE',
        messages: {
          some: {
            isFromCustomer: true,
            createdAt: {
              gte: last24Hours
            }
          }
        }
      }
    });

    console.log(`📊 [GET CUSTOMER LISTS] العملاء النشطين في آخر 24 ساعة: ${activeIn24Hours}`);

    console.log('📋 [GET CUSTOMER LISTS] جلب القوائم المخصصة');
    const lists = await getSharedPrismaClient().customerList.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📝 [GET CUSTOMER LISTS] تم جلب ${lists.length} قائمة مخصصة`);

    // Add default lists
    const allLists = [
      {
        id: 'all',
        name: 'جميع العملاء',
        description: 'جميع العملاء النشطين',
        count: totalCustomers,
        criteria: { type: 'all' },
        isDefault: true,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'active-24h',
        name: 'نشطين في آخر 24 ساعة',
        description: 'العملاء الذين تواصلوا معك في آخر 24 ساعة',
        count: activeIn24Hours,
        criteria: { type: 'active', lastActivity: '24' },
        isDefault: true,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      ...lists
    ];

    console.log(`✅ [GET CUSTOMER LISTS] تم إرجاع ${allLists.length} قائمة (شاملة القائمة الافتراضية)`);

    res.json({
      success: true,
      data: allLists
    });

  } catch (error) {
    console.error('❌ [GET CUSTOMER LISTS] خطأ في جلب قوائم العملاء:', error.message);
    console.error('🔍 [GET CUSTOMER LISTS] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب قوائم العملاء',
      error: error.message
    });
  }
};

/**
 * الحصول على العملاء في قائمة محددة
 */
/**
 * الحصول على العملاء في قائمة محددة
 */
exports.getCustomersInList = async (req, res) => {
  try {
    console.log('👥 [GET CUSTOMERS IN LIST] بدء جلب العملاء في القائمة');
    const companyId = req.user.companyId;
    const { listId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    console.log(`🔍 [GET CUSTOMERS IN LIST] معرف الشركة: ${companyId}, معرف القائمة: ${listId}, الصفحة: ${page}, الحد: ${limit}`);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // حالة خاصة: جميع العملاء
    if (listId === 'all') {
      console.log('🌐 [GET CUSTOMERS IN LIST] جلب جميع العملاء النشطين');
      const conversations = await getSharedPrismaClient().conversation.findMany({
        where: {
          companyId,
          status: 'ACTIVE'
        },
        skip,
        take: parseInt(limit),
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              facebookId: true,
              createdAt: true,
              updatedAt: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      console.log(`📊 [GET CUSTOMERS IN LIST] تم جلب ${conversations.length} محادثة نشطة`);

      // تحويل البيانات لصيغة Customer
      const customers = conversations.map(conv => ({
        id: conv.customer.id,
        name: `${conv.customer.firstName || ''} ${conv.customer.lastName || ''}`.trim(),
        email: conv.customer.email || '',
        phone: conv.customer.phone || '',
        lastActivity: conv.updatedAt,
        totalSpent: 0, // يمكن حسابها من Orders
        location: 'غير محدد',
        status: conv.status === 'ACTIVE' ? 'active' : 'inactive'
      }));

      console.log(`✅ [GET CUSTOMERS IN LIST] تم تحويل ${customers.length} عميل للإرجاع`);

      return res.json({
        success: true,
        data: customers
      });
    }

    // حالة خاصة: العملاء النشطين في آخر 24 ساعة
    if (listId === 'active-24h') {
      console.log('⏰ [GET CUSTOMERS IN LIST] جلب العملاء النشطين في آخر 24 ساعة');
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const conversations = await getSharedPrismaClient().conversation.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          messages: {
            some: {
              isFromCustomer: true,
              createdAt: {
                gte: last24Hours
              }
            }
          }
        },
        skip,
        take: parseInt(limit),
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              facebookId: true,
              createdAt: true,
              updatedAt: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      console.log(`📊 [GET CUSTOMERS IN LIST] تم جلب ${conversations.length} محادثة نشطة في آخر 24 ساعة`);

      // تحويل البيانات لصيغة Customer
      const customers = conversations.map(conv => ({
        id: conv.customer.id,
        name: `${conv.customer.firstName || ''} ${conv.customer.lastName || ''}`.trim(),
        email: conv.customer.email || '',
        phone: conv.customer.phone || '',
        lastActivity: conv.updatedAt,
        totalSpent: 0,
        location: 'غير محدد',
        status: conv.status === 'ACTIVE' ? 'active' : 'inactive'
      }));

      console.log(`✅ [GET CUSTOMERS IN LIST] تم تحويل ${customers.length} عميل للإرجاع`);

      return res.json({
        success: true,
        data: customers
      });
    }

    console.log(`📋 [GET CUSTOMERS IN LIST] البحث عن القائمة المخصصة: ${listId}`);
    // للقوائم المخصصة
    const list = await getSharedPrismaClient().customerList.findFirst({
      where: {
        id: listId,
        companyId
      }
    });

    if (!list) {
      console.log('❌ [GET CUSTOMERS IN LIST] القائمة غير موجودة');
      return res.status(404).json({
        success: false,
        message: 'القائمة غير موجودة'
      });
    }

    console.log(`📝 [GET CUSTOMERS IN LIST] تم العثور على القائمة: ${list.name}`);

    // جلب العملاء بناءً على معايير القائمة
    let whereCondition = { companyId };

    // تطبيق المعايير حسب نوع القائمة
    if (list.criteria.type === 'active' && list.criteria.lastActivity) {
      const hours = parseInt(list.criteria.lastActivity);
      const dateThreshold = new Date();
      dateThreshold.setHours(dateThreshold.getHours() - hours);

      whereCondition.status = 'ACTIVE';
      whereCondition.messages = {
        some: {
          isFromCustomer: true,
          createdAt: {
            gte: dateThreshold
          }
        }
      };
    } else if (list.criteria.type === 'all') {
      whereCondition.status = 'ACTIVE';
    }

    const conversations = await getSharedPrismaClient().conversation.findMany({
      where: whereCondition,
      skip,
      take: parseInt(limit),
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    const customers = conversations.map(conv => ({
      id: conv.customer.id,
      name: `${conv.customer.firstName || ''} ${conv.customer.lastName || ''}`.trim(),
      email: conv.customer.email || '',
      phone: conv.customer.phone || '',
      lastActivity: conv.updatedAt,
      totalSpent: 0,
      location: 'غير محدد',
      status: conv.status === 'ACTIVE' ? 'active' : 'inactive'
    }));

    res.json({
      success: true,
      data: customers
    });

  } catch (error) {
    console.error('❌ [GET CUSTOMERS IN LIST] خطأ في جلب العملاء:', error.message);
    console.error('🔍 [GET CUSTOMERS IN LIST] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب العملاء',
      error: error.message
    });
  }
};

// ==================== SETTINGS ====================

/**
 * الحصول على إعدادات البرودكاست
 */
exports.getSettings = async (req, res) => {
  try {
    console.log('⚙️ [GET SETTINGS] بدء جلب إعدادات البرودكاست');
    const companyId = req.user.companyId;
    console.log(`🔍 [GET SETTINGS] معرف الشركة: ${companyId}`);

    console.log('🔍 [GET SETTINGS] البحث عن الإعدادات الحالية');
    let settings = await getSharedPrismaClient().broadcastSettings.findUnique({
      where: { companyId }
    });

    // إنشاء إعدادات افتراضية إذا لم تكن موجودة
    if (!settings) {
      console.log('📝 [GET SETTINGS] لم يتم العثور على إعدادات، إنشاء إعدادات افتراضية');
      settings = await getSharedPrismaClient().broadcastSettings.create({
        data: {
          companyId,
          defaultSendTime: '10:00',
          timezone: 'Asia/Riyadh',
          maxRecipientsPerCampaign: 5000,
          maxCampaignsPerDay: 10,
          enableDeliveryReports: true,
          enableOpenTracking: true,
          enableClickTracking: true,
          enableUnsubscribeTracking: true,
          notifyOnCampaignSent: true,
          notifyOnHighUnsubscribeRate: true,
          notifyOnLowDeliveryRate: true,
          requireApprovalForHighVolume: false,
          highVolumeThreshold: 1000,
          enableContentFiltering: false,
          blockedWords: [],
          messagesPerMinute: 60,
          messagesPerHour: 1000,
          messagesPerDay: 10000,
          unsubscribeText: 'للإلغاء اكتب STOP'
        }
      });
      console.log('✅ [GET SETTINGS] تم إنشاء الإعدادات الافتراضية بنجاح');
    } else {
      console.log('📋 [GET SETTINGS] تم العثور على الإعدادات الحالية');
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('❌ [GET SETTINGS] خطأ في جلب الإعدادات:', error.message);
    console.error('🔍 [GET SETTINGS] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإعدادات',
      error: error.message
    });
  }
};

/**
 * تحديث إعدادات البرودكاست
 */
exports.updateSettings = async (req, res) => {
  try {
    console.log('🔧 [UPDATE SETTINGS] بدء تحديث إعدادات البرودكاست');
    const companyId = req.user.companyId;
    const updateData = req.body;
    console.log(`🔍 [UPDATE SETTINGS] معرف الشركة: ${companyId}`);
    console.log('📝 [UPDATE SETTINGS] بيانات التحديث:', Object.keys(updateData));

    console.log('🔍 [UPDATE SETTINGS] التحقق من وجود الإعدادات');
    // التحقق من وجود الإعدادات
    let settings = await getSharedPrismaClient().broadcastSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      console.log('📝 [UPDATE SETTINGS] إنشاء إعدادات جديدة');
      // إنشاء إعدادات جديدة
      settings = await getSharedPrismaClient().broadcastSettings.create({
        data: {
          companyId,
          ...updateData
        }
      });
      console.log('✅ [UPDATE SETTINGS] تم إنشاء الإعدادات الجديدة بنجاح');
    } else {
      console.log('🔄 [UPDATE SETTINGS] تحديث الإعدادات الموجودة');
      // تحديث الإعدادات الموجودة
      settings = await getSharedPrismaClient().broadcastSettings.update({
        where: { companyId },
        data: updateData
      });
      console.log('✅ [UPDATE SETTINGS] تم تحديث الإعدادات بنجاح');
    }

    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: settings
    });

  } catch (error) {
    console.error('❌ [UPDATE SETTINGS] خطأ في تحديث الإعدادات:', error.message);
    console.error('🔍 [UPDATE SETTINGS] تفاصيل الخطأ:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الإعدادات',
      error: error.message
    });
  }
};



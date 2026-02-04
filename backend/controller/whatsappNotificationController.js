/**
 * 🔔 WhatsApp Notification Controller
 * التحكم في إشعارات WhatsApp
 */

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ إعدادات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

async function getNotificationSettings(req, res) {
  try {
    const { companyId } = req.user;

    let settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
      where: { companyId }
    }));

    if (!settings) {
      settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.create({
        data: { companyId }
      }));
    }

    const sessions = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findMany({
      where: { companyId, status: 'CONNECTED' },
      select: { id: true, name: true, phoneNumber: true }
    }));

    res.json({
      success: true,
      settings,
      sessions
    });
  } catch (error) {
    console.error('❌ Error getting notification settings:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإعدادات' });
  }
}

async function updateNotificationSettings(req, res) {
  try {
    const { companyId } = req.user;

    const settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.upsert({
      where: { companyId },
      update: req.body,
      create: { companyId, ...req.body }
    }));

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ Error updating notification settings:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الإعدادات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 القوالب
// ═══════════════════════════════════════════════════════════════════════════════

async function getTemplates(req, res) {
  try {
    const { companyId } = req.user;
    const { category, eventType } = req.query;

    const where = { companyId };
    if (category) where.category = category;
    if (eventType) where.eventType = eventType;

    const templates = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { eventType: 'asc' }]
    }));

    const defaultTemplates = WhatsAppNotificationService.DEFAULT_TEMPLATES;
    const existingEvents = templates.map(t => t.eventType);

    const allTemplates = [...templates];

    for (const [evtType, template] of Object.entries(defaultTemplates)) {
      if (!existingEvents.includes(evtType)) {
        allTemplates.push({
          id: null,
          eventType: evtType,
          name: template.name,
          content: template.content,
          variables: JSON.stringify(template.variables),
          isDefault: true,
          isActive: true,
          category: getCategoryForEvent(evtType)
        });
      }
    }

    res.json({
      success: true,
      templates: allTemplates
    });
  } catch (error) {
    console.error('❌ Error getting templates:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب القوالب' });
  }
}

async function getTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    }));

    if (!template) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('❌ Error getting template:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب القالب' });
  }
}

async function createTemplate(req, res) {
  try {
    const { companyId } = req.user;

    const {
      name,
      category,
      eventType,
      content,
      contentWithMedia,
      mediaUrl,
      mediaType,
      hasButtons,
      buttons,
      hasList,
      listData,
      variables,
      isDefault
    } = req.body;

    if (!name || !category || !eventType || !content) {
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }

    const template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.create({
      data: {
        companyId,
        name,
        category,
        eventType,
        content,
        contentWithMedia: contentWithMedia || false,
        mediaUrl,
        mediaType,
        hasButtons: hasButtons || false,
        buttons: buttons ? JSON.stringify(buttons) : null,
        hasList: hasList || false,
        listData: listData ? JSON.stringify(listData) : null,
        variables: variables ? JSON.stringify(variables) : null,
        isDefault: isDefault || false
      }
    }));

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء القالب' });
  }
}

async function updateTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const existing = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    }));

    if (!existing) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    const {
      name,
      content,
      contentWithMedia,
      mediaUrl,
      mediaType,
      hasButtons,
      buttons,
      hasList,
      listData,
      variables,
      isActive,
      isDefault
    } = req.body;

    const template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.update({
      where: { id },
      data: {
        name,
        content,
        contentWithMedia,
        mediaUrl,
        mediaType,
        hasButtons,
        buttons: buttons ? JSON.stringify(buttons) : existing.buttons,
        hasList,
        listData: listData ? JSON.stringify(listData) : existing.listData,
        variables: variables ? JSON.stringify(variables) : existing.variables,
        isActive,
        isDefault
      }
    }));

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث القالب' });
  }
}

async function deleteTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const existing = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
      where: { id, companyId }
    }));

    if (!existing) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.delete({
      where: { id }
    }));

    res.json({
      success: true,
      message: 'تم حذف القالب بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف القالب' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 السجلات والإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

async function getNotificationLogs(req, res) {
  try {
    const { companyId } = req.user;
    const {
      page = 1,
      limit = 20,
      category,
      eventType,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const where = { companyId };

    if (category) where.category = category;
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { recipientPhone: { contains: search } },
        { recipientName: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const [logs, total] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          template: { select: { name: true } },
          order: { select: { orderNumber: true } },
          customer: { select: { firstName: true, lastName: true } }
        }
      })),
      safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.count({ where }))
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error getting notification logs:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب السجلات' });
  }
}

async function getNotificationStats(req, res) {
  try {
    const { companyId } = req.user;
    const { days = 30 } = req.query;

    const stats = await WhatsAppNotificationService.getNotificationStats(companyId, parseInt(days));

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 الإرسال اليدوي
// ═══════════════════════════════════════════════════════════════════════════════

async function sendManualNotification(req, res) {
  try {
    const { companyId } = req.user;
    const {
      recipientPhone,
      recipientName,
      category,
      eventType,
      content,
      variables,
      templateId
    } = req.body;

    if (!recipientPhone || !content) {
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }

    const result = await WhatsAppNotificationService.sendNotification({
      companyId,
      recipientPhone,
      recipientName,
      recipientType: 'CUSTOMER',
      category: category || 'SYSTEM',
      eventType: eventType || 'PROMOTIONAL',
      variables: variables || {},
      priority: 1
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'تم إرسال الإشعار بنجاح',
        notificationId: result.notificationId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.reason,
        message: getErrorMessage(result.reason)
      });
    }
  } catch (error) {
    console.error('❌ Error sending manual notification:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الإشعار' });
  }
}

async function sendTestNotification(req, res) {
  try {
    const { companyId } = req.user;
    const { phone, eventType } = req.body;

    console.log('📤 [TEST-NOTIFICATION] Request:', { phone, eventType, companyId });

    if (!phone || !eventType) {
      console.log('❌ [TEST-NOTIFICATION] Missing data:', { phone, eventType });
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }

    let settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
      where: { companyId }
    }));

    if (!settings) {
      settings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.create({
        data: { companyId }
      }));
    }

    console.log('⚙️ [TEST-NOTIFICATION] Settings:', {
      found: !!settings,
      defaultSessionId: settings?.defaultSessionId
    });

    if (!settings?.isEnabled) {
      console.log('❌ [TEST-NOTIFICATION] Notifications disabled');
      return res.status(400).json({ error: 'الإشعارات معطلة' });
    }

    const testVariables = {
      customerName: 'عميل اختباري',
      employeeName: 'موظف اختباري',
      orderNumber: '12345',
      total: '500',
      currency: 'EGP',
      productName: 'منتج اختباري',
      price: '100',
      itemCount: '3',
      trackingNumber: 'TRK123456',
      estimatedDays: '2-3',
      discount: '20',
      couponCode: 'TEST20',
      startDate: new Date().toLocaleDateString('ar-EG'),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
      month: 'يناير',
      netSalary: '5000',
      startTime: '09:00'
    };

    if (eventType === 'OTP') {
      testVariables.otpCode = String(Math.floor(1000 + Math.random() * 9000));
    }

    console.log('📞 [TEST-NOTIFICATION] Calling service with:', {
      phone,
      eventType,
      category: getCategoryForEvent(eventType)
    });

    const result = await WhatsAppNotificationService.sendNotification({
      companyId,
      recipientPhone: phone,
      recipientName: 'اختبار',
      recipientType: 'CUSTOMER',
      category: getCategoryForEvent(eventType),
      eventType,
      variables: testVariables,
      priority: 1
    });

    console.log('📊 [TEST-NOTIFICATION] Result:', result);

    if (result.success) {
      console.log('✅ [TEST-NOTIFICATION] Success');
      res.json({
        success: true,
        message: 'تم إرسال الإشعار الاختباري بنجاح'
      });
    } else {
      console.log('❌ [TEST-NOTIFICATION] Failed:', result.reason);
      res.status(400).json({
        success: false,
        error: result.reason,
        message: getErrorMessage(result.reason)
      });
    }
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الإشعار الاختباري' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 تفضيلات العملاء
// ═══════════════════════════════════════════════════════════════════════════════

async function getCustomerPreferences(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId } = req.params;

    let preferences = await safeQuery(() => getSharedPrismaClient().customerNotificationPreference.findUnique({
      where: { companyId_customerId: { companyId, customerId } }
    }));

    if (!preferences) {
      const customer = await safeQuery(() => getSharedPrismaClient().customer.findFirst({
        where: { id: customerId, companyId },
        select: { phone: true }
      }));

      if (!customer) {
        return res.status(404).json({ error: 'العميل غير موجود' });
      }

      preferences = await safeQuery(() => getSharedPrismaClient().customerNotificationPreference.create({
        data: {
          companyId,
          customerId,
          phone: customer.phone || ''
        }
      }));
    }

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('❌ Error getting customer preferences:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التفضيلات' });
  }
}

async function updateCustomerPreferences(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId } = req.params;

    const customer = await safeQuery(() => getSharedPrismaClient().customer.findFirst({
      where: { id: customerId, companyId }
    }));

    if (!customer) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const preferences = await safeQuery(() => getSharedPrismaClient().customerNotificationPreference.upsert({
      where: { companyId_customerId: { companyId, customerId } },
      update: req.body,
      create: {
        companyId,
        customerId,
        phone: customer.phone || '',
        ...req.body
      }
    }));

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('❌ Error updating customer preferences:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث التفضيلات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 دوال مساعدة
// ═══════════════════════════════════════════════════════════════════════════════

function getCategoryForEvent(eventType) {
  if (eventType.startsWith('ORDER_') || eventType.startsWith('PAYMENT_')) return 'ORDERS';
  if (eventType.startsWith('CART_')) return 'ABANDONED_CART';
  if (eventType.startsWith('BACK_IN_STOCK') || eventType.startsWith('PRICE_') || eventType.startsWith('NEW_PRODUCT')) return 'PRODUCTS';
  if (eventType.startsWith('ATTENDANCE_') || eventType.startsWith('LEAVE_') || eventType.startsWith('PAYROLL') || eventType.startsWith('BIRTHDAY_EMPLOYEE') || eventType.startsWith('WARNING_') || eventType.startsWith('ANNOUNCEMENT')) return 'HR';
  if (eventType === 'OTP') return 'SYSTEM';
  return 'MARKETING';
}

function getErrorMessage(reason) {
  const messages = {
    'notifications_disabled': 'الإشعارات معطلة',
    'no_session': 'لم يتم تحديد جلسة افتراضية',
    'session_not_connected': 'الجلسة غير متصلة',
    'no_template': 'القالب غير موجود',
    'invalid_phone': 'رقم الهاتف غير صالح',
    'send_failed': 'فشل في إرسال الرسالة',
    'customer_opted_out': 'العميل ألغى اشتراكه في الإشعارات'
  };
  return messages[reason] || 'حدث خطأ غير معروف';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 التصدير
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getNotificationLogs,
  getNotificationStats,
  sendManualNotification,
  sendTestNotification,
  getCustomerPreferences,
  updateCustomerPreferences
};

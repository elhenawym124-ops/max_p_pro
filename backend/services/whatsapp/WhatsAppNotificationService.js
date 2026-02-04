/**
 * 🔔 WhatsApp Notification Service
 * خدمة إدارة الإشعارات التلقائية عبر WhatsApp
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
const WhatsAppManager = require('./WhatsAppManager');

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 القوالب الافتراضية
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TEMPLATES = {
  // إشعارات الطلبات
  ORDER_CREATED: {
    name: 'تأكيد الطلب',
    content: `مرحباً {customerName} 👋

شكراً لطلبك! ✅

📦 رقم الطلب: #{orderNumber}
💰 المبلغ الإجمالي: {total} {currency}

سنقوم بتجهيز طلبك في أقرب وقت.

للاستفسار، تواصل معنا مباشرة.`,
    variables: ['customerName', 'orderNumber', 'total', 'currency']
  },

  ORDER_CONFIRMED: {
    name: 'تأكيد الطلب',
    content: `مرحباً {customerName} 👋

تم تأكيد طلبك رقم #{orderNumber} ✅

سيتم البدء في تجهيزه قريباً.`,
    variables: ['customerName', 'orderNumber']
  },

  ORDER_PROCESSING: {
    name: 'الطلب قيد التجهيز',
    content: `مرحباً {customerName} 📦

طلبك رقم #{orderNumber} قيد التجهيز الآن!

سنخبرك عند الشحن.`,
    variables: ['customerName', 'orderNumber']
  },

  ORDER_SHIPPED: {
    name: 'تم شحن الطلب',
    content: `مرحباً {customerName} 🚚

تم شحن طلبك رقم #{orderNumber}!

📍 رقم التتبع: {trackingNumber}

سيصلك خلال {estimatedDays} أيام.`,
    variables: ['customerName', 'orderNumber', 'trackingNumber', 'estimatedDays']
  },

  ORDER_OUT_FOR_DELIVERY: {
    name: 'الطلب في الطريق',
    content: `مرحباً {customerName} 🎉

طلبك رقم #{orderNumber} في الطريق إليك!

📞 سيتواصل معك المندوب قريباً.

يرجى التأكد من توفرك لاستلام الطلب.`,
    variables: ['customerName', 'orderNumber']
  },

  ORDER_DELIVERED: {
    name: 'تم التوصيل',
    content: `مرحباً {customerName} ✅

تم توصيل طلبك رقم #{orderNumber} بنجاح!

نتمنى أن تكون راضياً عن منتجاتنا 😊

شكراً لثقتك بنا! 🙏`,
    variables: ['customerName', 'orderNumber']
  },

  ORDER_CANCELLED: {
    name: 'إلغاء الطلب',
    content: `مرحباً {customerName}

تم إلغاء طلبك رقم #{orderNumber}.

السبب: {reason}

إذا كان لديك أي استفسار، تواصل معنا.`,
    variables: ['customerName', 'orderNumber', 'reason']
  },

  PAYMENT_REMINDER: {
    name: 'تذكير بالدفع',
    content: `مرحباً {customerName} 👋

لديك طلب معلق رقم #{orderNumber} بقيمة {total} {currency}.

يرجى إتمام الدفع لتأكيد الطلب.

للمساعدة، تواصل معنا.`,
    variables: ['customerName', 'orderNumber', 'total', 'currency']
  },

  // إشعارات المنتجات
  BACK_IN_STOCK: {
    name: 'المنتج متوفر',
    content: `مرحباً {customerName} 🎉

المنتج الذي طلبته متوفر الآن!

📦 {productName}
💰 السعر: {price} {currency}

اطلبه الآن قبل نفاد الكمية!`,
    variables: ['customerName', 'productName', 'price', 'currency']
  },

  PRICE_DROP: {
    name: 'تخفيض السعر',
    content: `مرحباً {customerName} 🔥

خبر سار! تم تخفيض سعر المنتج الذي تابعته:

📦 {productName}
💰 السعر الجديد: {newPrice} {currency}
🏷️ كان: {oldPrice} {currency}

وفر {discount}%! اطلب الآن!`,
    variables: ['customerName', 'productName', 'newPrice', 'oldPrice', 'currency', 'discount']
  },

  // العربة المتروكة
  CART_ABANDONED_1H: {
    name: 'تذكير العربة - ساعة',
    content: `مرحباً {customerName} 👋

لاحظنا أنك تركت منتجات في عربة التسوق!

🛒 لديك {itemCount} منتج بقيمة {total} {currency}

أكمل طلبك الآن قبل نفاد الكمية!`,
    variables: ['customerName', 'itemCount', 'total', 'currency']
  },

  CART_ABANDONED_24H: {
    name: 'تذكير العربة - يوم',
    content: `مرحباً {customerName} 👋

منتجاتك لا تزال في انتظارك! 🛒

لديك {itemCount} منتج بقيمة {total} {currency}

لا تفوت الفرصة، أكمل طلبك الآن!`,
    variables: ['customerName', 'itemCount', 'total', 'currency']
  },

  CART_ABANDONED_WITH_DISCOUNT: {
    name: 'تذكير العربة مع خصم',
    content: `مرحباً {customerName} 🎁

هدية خاصة لك!

خصم {discount}% على عربة التسوق الخاصة بك!

🛒 {itemCount} منتج
💰 السعر بعد الخصم: {discountedTotal} {currency}

استخدم الكود: {couponCode}

العرض ساري لمدة 24 ساعة فقط!`,
    variables: ['customerName', 'itemCount', 'discount', 'discountedTotal', 'currency', 'couponCode']
  },

  // التسويق
  PROMOTIONAL: {
    name: 'عرض ترويجي',
    content: `مرحباً {customerName} 🎉

{promotionTitle}

{promotionDescription}

🏷️ خصم يصل إلى {discount}%

العرض ساري حتى {endDate}

تسوق الآن!`,
    variables: ['customerName', 'promotionTitle', 'promotionDescription', 'discount', 'endDate']
  },

  COUPON_SENT: {
    name: 'كوبون خصم',
    content: `مرحباً {customerName} 🎁

لديك كوبون خصم خاص!

🏷️ الكود: {couponCode}
💰 الخصم: {discount}%
📅 صالح حتى: {expiryDate}

استخدمه في طلبك القادم!`,
    variables: ['customerName', 'couponCode', 'discount', 'expiryDate']
  },

  BIRTHDAY_WISH: {
    name: 'تهنئة عيد ميلاد',
    content: `عيد ميلاد سعيد {customerName}! 🎂🎉

نتمنى لك عاماً سعيداً!

هديتنا لك: خصم {discount}% على طلبك القادم!

🎁 الكود: {couponCode}

كل عام وأنت بخير! 💝`,
    variables: ['customerName', 'discount', 'couponCode']
  },

  REVIEW_REQUEST: {
    name: 'طلب تقييم',
    content: `مرحباً {customerName} 😊

نأمل أنك استمتعت بمنتجاتنا!

نود سماع رأيك في طلبك رقم #{orderNumber}

تقييمك يساعدنا على التحسين 🌟

شكراً لك!`,
    variables: ['customerName', 'orderNumber']
  },

  // الموارد البشرية
  ATTENDANCE_REMINDER: {
    name: 'تذكير الحضور',
    content: `صباح الخير {employeeName} ☀️

تذكير: لا تنسَ تسجيل حضورك اليوم.

⏰ وقت بدء العمل: {startTime}

يوم موفق!`,
    variables: ['employeeName', 'startTime']
  },

  ATTENDANCE_CONFIRMED: {
    name: 'تأكيد الحضور',
    content: `✅ تم تسجيل حضورك بنجاح {employeeName}!

⏰ وقت الحضور: {checkInTime}
📅 التاريخ: {date}

شكراً لالتزامك بالمواعيد! 💚`,
    variables: ['employeeName', 'checkInTime', 'date']
  },

  ATTENDANCE_LATE: {
    name: 'إشعار التأخير',
    content: `مرحباً {employeeName}

تم تسجيل تأخير اليوم {date}.

⏰ وقت الحضور: {checkInTime}
📝 مدة التأخير: {lateMinutes} دقيقة

يرجى الالتزام بمواعيد العمل.`,
    variables: ['employeeName', 'date', 'checkInTime', 'lateMinutes']
  },

  ATTENDANCE_LATE_WITH_DEDUCTION: {
    name: 'إشعار التأخير مع الخصم',
    content: `⚠️ تم تسجيل تأخير {employeeName}

📅 التاريخ: {date}
⏰ وقت الحضور: {checkInTime}
📝 مدة التأخير: {lateMinutes} دقيقة
💰 الخصم: {deductionAmount} {currency}

يرجى الالتزام بمواعيد العمل لتجنب الخصومات.`,
    variables: ['employeeName', 'date', 'checkInTime', 'lateMinutes', 'deductionAmount', 'currency']
  },

  CHECKOUT_CONFIRMED: {
    name: 'تأكيد الانصراف',
    content: `👋 تم تسجيل انصرافك {employeeName}

⏰ وقت الانصراف: {checkOutTime}
📅 التاريخ: {date}
📊 ساعات العمل اليوم: {workHours} ساعة

شكراً لجهودك اليوم! 🙏`,
    variables: ['employeeName', 'checkOutTime', 'date', 'workHours']
  },

  LEAVE_APPROVED: {
    name: 'الموافقة على الإجازة',
    content: `مرحباً {employeeName} ✅

تمت الموافقة على طلب إجازتك!

📅 من: {startDate}
📅 إلى: {endDate}
📝 النوع: {leaveType}

إجازة سعيدة! 🌴`,
    variables: ['employeeName', 'startDate', 'endDate', 'leaveType']
  },

  LEAVE_REJECTED: {
    name: 'رفض الإجازة',
    content: `مرحباً {employeeName}

للأسف، تم رفض طلب إجازتك.

📅 من: {startDate}
📅 إلى: {endDate}
📝 السبب: {reason}

يمكنك التواصل مع الإدارة للمزيد من التفاصيل.`,
    variables: ['employeeName', 'startDate', 'endDate', 'reason']
  },

  PAYROLL_READY: {
    name: 'الراتب جاهز',
    content: `مرحباً {employeeName} 💰

تم إيداع راتبك لشهر {month}!

💵 المبلغ الصافي: {netSalary} {currency}

شكراً لجهودك! 🙏`,
    variables: ['employeeName', 'month', 'netSalary', 'currency']
  },

  BIRTHDAY_EMPLOYEE: {
    name: 'عيد ميلاد موظف',
    content: `عيد ميلاد سعيد {employeeName}! 🎂🎉

نتمنى لك عاماً مليئاً بالنجاح والسعادة!

فريق العمل يتمنى لك كل التوفيق! 💝

كل عام وأنت بخير!`,
    variables: ['employeeName']
  },

  WARNING_ISSUED: {
    name: 'إنذار',
    content: `مرحباً {employeeName}

تم إصدار إنذار بتاريخ {date}.

📝 السبب: {reason}
⚠️ النوع: {warningType}

يرجى مراجعة الإدارة.`,
    variables: ['employeeName', 'date', 'reason', 'warningType']
  },

  ANNOUNCEMENT: {
    name: 'إعلان',
    content: `📢 إعلان هام

{title}

{content}

{signature}`,
    variables: ['title', 'content', 'signature']
  },

  OTP: {
    name: 'كود الواتساب لتسجيل الدخول',
    content: `كود الواتساب لتسجيل الدخول: {otpCode}`,
    variables: ['otpCode']
  },

  ASSET_REQUEST_APPROVED: {
    name: 'الموافقة على طلب عهدة',
    content: `مرحباً {employeeName} ✅
    
تمت الموافقة على طلبك للحصول على: {assetType}

سيقوم فريق الدعم بتجهيز الأصل لك في أقرب وقت.

شكراً لك!`,
    variables: ['employeeName', 'assetType']
  },

  ASSET_REQUEST_REJECTED: {
    name: 'رفض طلب عهدة',
    content: `مرحباً {employeeName} ❌
    
نأسف، تم رفض طلبك للحصول على: {assetType}

السبب: {reason}

يمكنك التواصل مع الإدارة للمزيد من التفاصيل.`,
    variables: ['employeeName', 'assetType', 'reason']
  },

  ASSET_REQUEST_FULFILLED: {
    name: 'تسليم عهدة',
    content: `مرحباً {employeeName} 📦
    
تم تسليمك العهدة التالية بنجاح:
✅ {assetName}

يرجى مراجعة تفاصيل العهدة في لوحة التحكم الخاصة بك.

يوم موفق!`,
    variables: ['employeeName', 'assetName']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 الدوال المساعدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * استبدال المتغيرات في القالب
 */
function replaceVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

/**
 * التحقق من ساعات الهدوء
 */
function isQuietHours(settings) {
  if (!settings.quietHoursEnabled) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime > endTime) {
    // ساعات الهدوء تمتد لليوم التالي (مثل 22:00 - 08:00)
    return currentTime >= startTime || currentTime < endTime;
  } else {
    return currentTime >= startTime && currentTime < endTime;
  }
}

/**
 * تنسيق رقم الهاتف
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;

  // إزالة كل شيء ما عدا الأرقام
  let cleaned = phone.replace(/\D/g, '');

  // إضافة كود مصر إذا لم يكن موجوداً
  if (cleaned.startsWith('0')) {
    cleaned = '20' + cleaned.substring(1);
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = '20' + cleaned;
  }

  return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 دوال الإرسال
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار
 */
async function sendNotification(options) {
  const {
    companyId,
    recipientPhone,
    recipientName,
    recipientType = 'CUSTOMER',
    category,
    eventType,
    variables = {},
    orderId,
    customerId,
    productId,
    employeeId,
    cartId,
    priority = 5,
    scheduleAt = null
  } = options;

  const prisma = getSharedPrismaClient();

  try {
    // 1. جلب إعدادات الإشعارات
    const settings = await prisma.whatsAppNotificationSettings.findUnique({
      where: { companyId }
    });

    if (!settings || !settings.isEnabled) {
      console.log(`⚠️ Notifications disabled for company ${companyId}`);
      return { success: false, reason: 'notifications_disabled' };
    }

    // 2. التحقق من الجلسة (مع fallback إذا لم توجد جلسة افتراضية)
    let sessionId = settings.defaultSessionId;
    if (!sessionId) {
      const connected = await prisma.whatsAppSession.findFirst({
        where: {
          companyId,
          status: 'CONNECTED'
        },
        select: { id: true },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      });

      if (connected?.id) {
        sessionId = connected.id;
        console.log(`ℹ️ Using fallback connected session for company ${companyId}: ${sessionId}`);
      }
    }

    if (!sessionId) {
      console.log(`⚠️ No session available for company ${companyId}`);
      return { success: false, reason: 'no_session' };
    }

    let session = WhatsAppManager.getSession(sessionId);
    if (!session || session.status !== 'connected') {
      console.log(`⚠️ Session not connected: ${sessionId}`);

      // Try one more fallback: pick any CONNECTED session from DB and see if runtime is connected
      const connected = await prisma.whatsAppSession.findFirst({
        where: {
          companyId,
          status: 'CONNECTED',
          id: { not: sessionId }
        },
        select: { id: true },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      });

      if (connected?.id) {
        const fallbackId = connected.id;
        const fallbackSession = WhatsAppManager.getSession(fallbackId);
        if (fallbackSession && fallbackSession.status === 'connected') {
          sessionId = fallbackId;
          session = fallbackSession;
          console.log(`ℹ️ Using fallback runtime-connected session for company ${companyId}: ${sessionId}`);
        }
      }
    }

    if (!session || session.status !== 'connected') {
      return { success: false, reason: 'session_not_connected' };
    }

    // 3. التحقق من ساعات الهدوء
    if (isQuietHours(settings) && !scheduleAt) {
      // جدولة للصباح
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);
      tomorrow.setHours(endHour, endMin, 0, 0);

      return scheduleNotification({
        ...options,
        scheduleAt: tomorrow
      });
    }

    // 4. جلب القالب
    let template = await prisma.whatsAppNotificationTemplate.findFirst({
      where: {
        companyId,
        eventType,
        isActive: true
      },
      orderBy: { isDefault: 'desc' }
    });

    // استخدام القالب الافتراضي إذا لم يوجد
    if (!template && DEFAULT_TEMPLATES[eventType]) {
      const defaultTemplate = DEFAULT_TEMPLATES[eventType];
      template = {
        content: defaultTemplate.content,
        hasButtons: false,
        hasList: false
      };
    }

    if (!template) {
      console.log(`⚠️ No template found for event: ${eventType}`);
      return { success: false, reason: 'no_template' };
    }

    // 5. تجهيز المحتوى
    const content = replaceVariables(template.content, {
      ...variables,
      customerName: recipientName || 'عميلنا العزيز',
      employeeName: recipientName || 'الموظف العزيز'
    });

    // 6. تنسيق رقم الهاتف
    const formattedPhone = formatPhoneNumber(recipientPhone);
    if (!formattedPhone) {
      console.log(`⚠️ Invalid phone number: ${recipientPhone}`);
      return { success: false, reason: 'invalid_phone' };
    }

    // 7. إنشاء سجل الإشعار
    const notificationLog = await prisma.whatsAppNotificationLog.create({
      data: {
        companyId,
        templateId: template.id || null,
        sessionId,
        recipientPhone: formattedPhone,
        recipientName,
        recipientType,
        category,
        eventType,
        content,
        orderId,
        customerId,
        productId,
        employeeId,
        cartId,
        status: 'SENDING'
      }
    });

    // 8. إرسال الرسالة
    try {
      const jid = `${formattedPhone}@s.whatsapp.net`;

      let result;
      if (template.hasButtons && template.buttons) {
        const buttons = JSON.parse(template.buttons);
        result = await WhatsAppMessageHandler.sendButtons(sessionId, jid, content, buttons);
      } else if (template.hasList && template.listData) {
        const listData = JSON.parse(template.listData);
        result = await WhatsAppMessageHandler.sendList(sessionId, jid, listData);
      } else {
        result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
      }

      // تحديث السجل
      await prisma.whatsAppNotificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          whatsappMessageId: result?.key?.id
        }
      });

      // تحديث إحصائيات القالب
      if (template.id) {
        await prisma.whatsAppNotificationTemplate.update({
          where: { id: template.id },
          data: { sentCount: { increment: 1 } }
        });
      }

      console.log(`✅ Notification sent: ${eventType} to ${formattedPhone}`);
      return { success: true, notificationId: notificationLog.id };

    } catch (sendError) {
      // تحديث السجل بالخطأ
      await prisma.whatsAppNotificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: sendError.message
        }
      });

      console.error(`❌ Failed to send notification:`, sendError);
      return { success: false, reason: 'send_failed', error: sendError.message };
    }

  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * جدولة إشعار
 */
async function scheduleNotification(options) {
  const prisma = getSharedPrismaClient();

  try {
    const {
      companyId,
      recipientPhone,
      recipientName,
      recipientType = 'CUSTOMER',
      category,
      eventType,
      variables = {},
      orderId,
      customerId,
      productId,
      employeeId,
      cartId,
      priority = 5,
      scheduleAt
    } = options;

    // جلب الإعدادات
    const settings = await prisma.whatsAppNotificationSettings.findUnique({
      where: { companyId }
    });

    if (!settings || !settings.defaultSessionId) {
      return { success: false, reason: 'no_settings' };
    }

    // جلب القالب
    let template = await prisma.whatsAppNotificationTemplate.findFirst({
      where: { companyId, eventType, isActive: true }
    });

    if (!template && DEFAULT_TEMPLATES[eventType]) {
      template = { content: DEFAULT_TEMPLATES[eventType].content };
    }

    if (!template) {
      return { success: false, reason: 'no_template' };
    }

    // تجهيز المحتوى
    const content = replaceVariables(template.content, {
      ...variables,
      customerName: recipientName || 'عميلنا العزيز',
      employeeName: recipientName || 'الموظف العزيز'
    });

    // إضافة للطابور
    const queueItem = await prisma.whatsAppNotificationQueue.create({
      data: {
        companyId,
        templateId: template.id || null,
        sessionId: settings.defaultSessionId,
        recipientPhone: formatPhoneNumber(recipientPhone),
        recipientName,
        recipientType,
        category,
        eventType,
        content,
        orderId,
        customerId,
        productId,
        employeeId,
        cartId,
        scheduledAt: scheduleAt,
        priority,
        status: 'PENDING'
      }
    });

    console.log(`📅 Notification scheduled: ${eventType} at ${scheduleAt}`);
    return { success: true, queueId: queueItem.id };

  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 إشعارات الطلبات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار طلب جديد
 */
async function sendOrderCreatedNotification(order) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: order.companyId }
  });

  if (!settings?.orderNotificationsEnabled || !settings?.orderCreatedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = order.customerPhone || order.customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: order.companyId,
    recipientPhone: phone,
    recipientName: order.customerName || order.customer?.firstName,
    recipientType: 'CUSTOMER',
    category: 'ORDERS',
    eventType: 'ORDER_CREATED',
    variables: {
      orderNumber: order.orderNumber,
      total: order.total?.toString(),
      currency: order.currency || 'EGP'
    },
    orderId: order.id,
    customerId: order.customerId,
    priority: 1
  });
}

/**
 * إرسال إشعار تحديث حالة الطلب
 */
async function sendOrderStatusNotification(order, newStatus, oldStatus) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: order.companyId }
  });

  if (!settings?.orderNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  // تحديد نوع الإشعار بناءً على الحالة
  const statusEventMap = {
    'CONFIRMED': { event: 'ORDER_CONFIRMED', enabled: settings.orderConfirmedEnabled },
    'PROCESSING': { event: 'ORDER_PROCESSING', enabled: settings.orderProcessingEnabled },
    'SHIPPED': { event: 'ORDER_SHIPPED', enabled: settings.orderShippedEnabled },
    'OUT_FOR_DELIVERY': { event: 'ORDER_OUT_FOR_DELIVERY', enabled: settings.orderShippedEnabled },
    'DELIVERED': { event: 'ORDER_DELIVERED', enabled: settings.orderDeliveredEnabled },
    'CANCELLED': { event: 'ORDER_CANCELLED', enabled: settings.orderCancelledEnabled }
  };

  const statusConfig = statusEventMap[newStatus];
  if (!statusConfig || !statusConfig.enabled) {
    return { success: false, reason: 'status_notification_disabled' };
  }

  const phone = order.customerPhone || order.customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: order.companyId,
    recipientPhone: phone,
    recipientName: order.customerName || order.customer?.firstName,
    recipientType: 'CUSTOMER',
    category: 'ORDERS',
    eventType: statusConfig.event,
    variables: {
      orderNumber: order.orderNumber,
      total: order.total?.toString(),
      currency: order.currency || 'EGP',
      trackingNumber: order.turboTrackingNumber || '',
      estimatedDays: '2-3',
      reason: ''
    },
    orderId: order.id,
    customerId: order.customerId,
    priority: 2
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛒 إشعارات العربة المتروكة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار عربة متروكة
 */
async function sendAbandonedCartNotification(cart, reminderType = 'CART_ABANDONED_1H') {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: cart.companyId }
  });

  if (!settings?.abandonedCartEnabled) {
    return { success: false, reason: 'disabled' };
  }

  // التحقق من تفضيلات العميل
  if (cart.customerId) {
    const preference = await prisma.customerNotificationPreference.findUnique({
      where: { companyId_customerId: { companyId: cart.companyId, customerId: cart.customerId } }
    });

    if (preference && !preference.abandonedCart) {
      return { success: false, reason: 'customer_opted_out' };
    }
  }

  const phone = cart.customerPhone || cart.customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType = reminderType;
  let variables = {
    itemCount: cart.items?.length?.toString() || '0',
    total: cart.total?.toString() || '0',
    currency: cart.currency || 'EGP'
  };

  // إضافة خصم للتذكير الأخير
  if (reminderType === 'CART_ABANDONED_WITH_DISCOUNT' && settings.abandonedCartDiscountEnabled) {
    const discountPercent = settings.abandonedCartDiscountPercent;
    const discountedTotal = cart.total * (1 - discountPercent / 100);

    variables = {
      ...variables,
      discount: discountPercent.toString(),
      discountedTotal: discountedTotal.toFixed(2),
      couponCode: `CART${Date.now().toString(36).toUpperCase()}`
    };
  }

  return sendNotification({
    companyId: cart.companyId,
    recipientPhone: phone,
    recipientName: cart.customerName || cart.customer?.firstName,
    recipientType: 'CUSTOMER',
    category: 'ABANDONED_CART',
    eventType,
    variables,
    customerId: cart.customerId,
    cartId: cart.id,
    priority: 3
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 إشعارات المنتجات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار المنتج متوفر
 */
async function sendBackInStockNotification(product, customer) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: product.companyId }
  });

  if (!settings?.productNotificationsEnabled || !settings?.backInStockEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = customer.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: product.companyId,
    recipientPhone: phone,
    recipientName: customer.firstName,
    recipientType: 'CUSTOMER',
    category: 'PRODUCTS',
    eventType: 'BACK_IN_STOCK',
    variables: {
      productName: product.name,
      price: product.price?.toString(),
      currency: 'EGP'
    },
    productId: product.id,
    customerId: customer.id,
    priority: 4
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 إشعارات الموارد البشرية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال تذكير الحضور
 */
async function sendAttendanceReminderNotification(employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceReminderEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_REMINDER',
    variables: {
      startTime: '09:00'
    },
    employeeId: employee.id,
    priority: 3
  });
}

/**
 * إرسال تأكيد الحضور
 */
async function sendAttendanceConfirmedNotification(attendance, employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_CONFIRMED',
    variables: {
      employeeName: employee.firstName || employee.name,
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      date: attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG') : ''
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار التأخير مع الخصم
 */
async function sendAttendanceLateWithDeductionNotification(attendance, employee, companyId, deductionAmount = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_LATE_WITH_DEDUCTION',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG') : '',
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      lateMinutes: attendance.lateMinutes?.toString() || '0',
      deductionAmount: deductionAmount.toString(),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال تأكيد الانصراف
 */
async function sendCheckoutConfirmedNotification(attendance, employee, companyId, workHours = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'CHECKOUT_CONFIRMED',
    variables: {
      employeeName: employee.firstName || employee.name,
      checkOutTime: attendance.checkOut ? new Date(attendance.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      date: attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG') : '',
      workHours: workHours.toFixed(1)
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الموافقة على الإجازة
 */
async function sendLeaveApprovalNotification(leaveRequest, approved = true) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: leaveRequest.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.leaveApprovalEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = leaveRequest.user || leaveRequest.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: leaveRequest.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
    variables: {
      startDate: leaveRequest.startDate?.toLocaleDateString('ar-EG'),
      endDate: leaveRequest.endDate?.toLocaleDateString('ar-EG'),
      leaveType: leaveRequest.type || 'إجازة',
      reason: leaveRequest.rejectionReason || ''
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الراتب
 */
async function sendPayrollNotification(payroll) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: payroll.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.payrollEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = payroll.user || payroll.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  return sendNotification({
    companyId: payroll.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'PAYROLL_READY',
    variables: {
      month: monthNames[new Date(payroll.month).getMonth()],
      netSalary: payroll.netSalary?.toString(),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 1
  });
}

/**
 * إرسال إشعار حالة طلب العهدة
 */
async function sendAssetRequestNotification(request, employee, status) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: request.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType;
  let variables = {
    employeeName: employee.firstName || employee.name,
    assetType: request.assetType,
    assetName: request.assets?.name || request.assetName || ''
  };

  if (status === 'APPROVED') {
    eventType = 'ASSET_REQUEST_APPROVED';
  } else if (status === 'REJECTED') {
    eventType = 'ASSET_REQUEST_REJECTED';
    variables.reason = request.rejectionReason || 'غير محدد';
  } else if (status === 'FULFILLED') {
    eventType = 'ASSET_REQUEST_FULFILLED';
  }

  if (!eventType) return { success: false, reason: 'invalid_status' };

  return sendNotification({
    companyId: request.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType,
    variables,
    employeeId: employee.id,
    priority: 2
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 معالج الطابور
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * معالجة الإشعارات المجدولة
 */
async function processNotificationQueue() {
  const prisma = getSharedPrismaClient();

  try {
    // جلب الإشعارات المستحقة
    const pendingNotifications = await prisma.whatsAppNotificationQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() }
      },
      orderBy: [
        { priority: 'asc' },
        { scheduledAt: 'asc' }
      ],
      take: 50
    });

    console.log(`📬 Processing ${pendingNotifications.length} queued notifications`);

    for (const notification of pendingNotifications) {
      // تحديث الحالة
      await prisma.whatsAppNotificationQueue.update({
        where: { id: notification.id },
        data: { status: 'PROCESSING' }
      });

      try {
        // التحقق من الجلسة
        const session = WhatsAppManager.getSession(notification.sessionId);
        if (!session || session.status !== 'connected') {
          throw new Error('Session not connected');
        }

        // إرسال الرسالة
        const jid = `${notification.recipientPhone}@s.whatsapp.net`;

        let result;
        if (notification.buttons) {
          const buttons = JSON.parse(notification.buttons);
          result = await WhatsAppMessageHandler.sendButtons(notification.sessionId, jid, notification.content, buttons);
        } else {
          result = await WhatsAppMessageHandler.sendText(notification.sessionId, jid, notification.content);
        }

        // إنشاء سجل
        await prisma.whatsAppNotificationLog.create({
          data: {
            companyId: notification.companyId,
            templateId: notification.templateId,
            sessionId: notification.sessionId,
            recipientPhone: notification.recipientPhone,
            recipientName: notification.recipientName,
            recipientType: notification.recipientType,
            category: notification.category,
            eventType: notification.eventType,
            content: notification.content,
            orderId: notification.orderId,
            customerId: notification.customerId,
            productId: notification.productId,
            employeeId: notification.employeeId,
            cartId: notification.cartId,
            status: 'SENT',
            sentAt: new Date(),
            whatsappMessageId: result?.key?.id
          }
        });

        // تحديث الطابور
        await prisma.whatsAppNotificationQueue.update({
          where: { id: notification.id },
          data: { status: 'COMPLETED', processedAt: new Date() }
        });

        console.log(`✅ Queued notification sent: ${notification.eventType}`);

      } catch (error) {
        // زيادة عداد المحاولات
        const newRetryCount = notification.retryCount + 1;

        if (newRetryCount >= notification.maxRetries) {
          await prisma.whatsAppNotificationQueue.update({
            where: { id: notification.id },
            data: { status: 'FAILED', retryCount: newRetryCount }
          });
        } else {
          // إعادة الجدولة بعد 5 دقائق
          await prisma.whatsAppNotificationQueue.update({
            where: { id: notification.id },
            data: {
              status: 'PENDING',
              retryCount: newRetryCount,
              scheduledAt: new Date(Date.now() + 5 * 60 * 1000)
            }
          });
        }

        console.error(`❌ Failed to process queued notification:`, error);
      }

      // تأخير بين الرسائل لتجنب الحظر
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Error processing notification queue:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات الإشعارات
 */
async function getNotificationStats(companyId, dateRange = 30) {
  const prisma = getSharedPrismaClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const [total, sent, delivered, read, failed, byCategory, byEvent] = await Promise.all([
    // إجمالي
    prisma.whatsAppNotificationLog.count({
      where: { companyId, createdAt: { gte: startDate } }
    }),
    // المرسلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'SENT', createdAt: { gte: startDate } }
    }),
    // المستلمة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'DELIVERED', createdAt: { gte: startDate } }
    }),
    // المقروءة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'READ', createdAt: { gte: startDate } }
    }),
    // الفاشلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'FAILED', createdAt: { gte: startDate } }
    }),
    // حسب التصنيف
    prisma.whatsAppNotificationLog.groupBy({
      by: ['category'],
      where: { companyId, createdAt: { gte: startDate } },
      _count: true
    }),
    // حسب الحدث
    prisma.whatsAppNotificationLog.groupBy({
      by: ['eventType'],
      where: { companyId, createdAt: { gte: startDate } },
      _count: true
    })
  ]);

  return {
    total,
    sent,
    delivered,
    read,
    failed,
    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
    readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : 0,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {}),
    byEvent: byEvent.reduce((acc, item) => {
      acc[item.eventType] = item._count;
      return acc;
    }, {})
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 التصدير
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // القوالب الافتراضية
  DEFAULT_TEMPLATES,

  // الدوال المساعدة
  replaceVariables,
  formatPhoneNumber,
  isQuietHours,

  // الإرسال
  sendNotification,
  scheduleNotification,

  // إشعارات الطلبات
  sendOrderCreatedNotification,
  sendOrderStatusNotification,

  // إشعارات العربة المتروكة
  sendAbandonedCartNotification,

  // إشعارات المنتجات
  sendBackInStockNotification,

  // إشعارات الموارد البشرية
  sendAttendanceReminderNotification,
  sendAttendanceConfirmedNotification,
  sendAttendanceLateWithDeductionNotification,
  sendCheckoutConfirmedNotification,
  sendLeaveApprovalNotification,
  sendPayrollNotification,
  sendAssetRequestNotification,

  // معالج الطابور
  processNotificationQueue,

  // الإحصائيات
  getNotificationStats
};

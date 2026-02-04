const express = require('express');
const router = express.Router();
const EnhancedOrderService = require('../services/enhancedOrderService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const { requireAuth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

// دالة لتحويل payment method إلى القيم المطلوبة في schema
function mapPaymentMethod(method) {
  const mapping = {
    'cash': 'CASH',
    'cash_on_delivery': 'CASH',
    'CASH_ON_DELIVERY': 'CASH',
    'credit_card': 'CREDIT_CARD',
    'bank_transfer': 'BANK_TRANSFER',
    'paypal': 'PAYPAL',
    'stripe': 'STRIPE'
  };
  return mapping[method?.toLowerCase()] || 'CASH';
}

/**
 * جلب الطلبات المحسنة
 * GET /api/v1/orders-enhanced
 */
router.get('/', async (req, res) => {
  try {
    // التحقق من وجود المستخدم المصادق عليه
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }

    const enhancedOrderService = new EnhancedOrderService();

    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      conversationId,
      dateFrom,
      dateTo,
      minConfidence,
      extractionMethod,
      onlyUnseen,
      export: isExport
    } = req.query;

    // استخدام companyId من المستخدم المسجل دخوله
    const companyId = req.user?.companyId;

    if (!companyId) {
      console.error('❌ [ENHANCED-ORDERS] Missing companyId:', {
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        companyId: req.user?.companyId
      });
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        code: 'COMPANY_ID_REQUIRED',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    const result = await enhancedOrderService.getEnhancedOrders(companyId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      customerId,
      conversationId,
      dateFrom,
      dateTo,
      minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
      extractionMethod,
      onlyUnseen: onlyUnseen === 'true'
    });

    await enhancedOrderService.disconnect();

    // إذا كان طلب تصدير، إنشاء ملف Excel
    if (isExport === 'true') {
      const XLSX = require('xlsx');

      // تحويل البيانات لتنسيق Excel
      const excelData = result.orders.map(order => {
        // دمج تفاصيل المنتجات في سطر واحد (اسم + لون + مقاس)
        const productDetails = (order.items || []).map(item => {
          let details = item.productName || 'منتج غير محدد';
          if (item.productColor) details += ` - ${item.productColor}`;
          if (item.productSize) details += ` - ${item.productSize}`;
          return details;
        }).join(', ');

        return {
          'رقم الطلب': order.orderNumber,
          'اسم العميل': order.customerName || 'غير محدد',
          'رقم الهاتف': order.customerPhone || 'غير محدد',
          'العنوان': order.customerAddress || 'غير محدد',
          'المدينة': order.city || 'غير محدد',
          'المنتج': productDetails || 'غير محدد',
          'الكمية': order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          'السعر الإجمالي': order.total,
          'العملة': order.currency,
          'الحالة': order.status,
          'حالة الدفع': order.paymentStatus,
          'طريقة الاستخراج': order.extractionMethod,
          'مستوى الثقة': order.confidence ? `${(order.confidence * 100).toFixed(1)}%` : 'غير محدد',
          'تاريخ الإنشاء': new Date(order.createdAt).toLocaleString('ar-EG'),
          'تاريخ التحديث': new Date(order.updatedAt).toLocaleString('ar-EG')
        };
      });

      // إنشاء workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // تحسين عرض الأعمدة
      const colWidths = [
        { wch: 15 }, // رقم الطلب
        { wch: 20 }, // اسم العميل
        { wch: 15 }, // رقم الهاتف
        { wch: 30 }, // العنوان
        { wch: 15 }, // المدينة
        { wch: 25 }, // المنتج
        { wch: 10 }, // الكمية
        { wch: 15 }, // السعر
        { wch: 10 }, // العملة
        { wch: 15 }, // الحالة
        { wch: 15 }, // حالة الدفع
        { wch: 20 }, // طريقة الاستخراج
        { wch: 15 }, // مستوى الثقة
        { wch: 20 }, // تاريخ الإنشاء
        { wch: 20 }  // تاريخ التحديث
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'الطلبات المحسنة');

      // إنشاء buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // إرسال الملف
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="enhanced-orders-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } else {
      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
        message: 'تم جلب الطلبات بنجاح'
      });
    }

  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات المحسنة:', error);
    console.error('❌ [ENHANCED-ORDERS] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      hasUser: !!req.user,
      companyId: req.user?.companyId
    });
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب الطلبات',
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error.stack,
        details: {
          hasUser: !!req.user,
          companyId: req.user?.companyId
        }
      })
    });
  }
});

/**
 * نقل الطلبات من الملفات إلى قاعدة البيانات
 * POST /api/v1/orders-enhanced/migrate-from-files
 */
router.post('/migrate-from-files', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    //console.log('🚀 بدء نقل الطلبات من الملفات...');

    const ordersDir = path.join(__dirname, '../../orders');

    if (!fs.existsSync(ordersDir)) {
      return res.status(404).json({
        success: false,
        error: 'مجلد الطلبات غير موجود'
      });
    }

    const files = fs.readdirSync(ordersDir).filter(file => file.endsWith('.json'));
    //console.log(`📁 تم العثور على ${files.length} ملف طلب`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    // نقل آخر 10 طلبات فقط للاختبار
    const recentFiles = files.slice(-10);

    for (const file of recentFiles) {
      try {
        const filePath = path.join(ordersDir, file);
        const orderData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // تحقق من وجود الطلب
        const existingOrder = await getSharedPrismaClient().order.findUnique({
          where: { orderNumber: orderData.orderNumber }
        });

        if (existingOrder) {
          //console.log(`⏭️  تم تخطي ${orderData.orderNumber}`);
          skippedCount++;
          continue;
        }

        // إنشاء عميل
        let customer = await getSharedPrismaClient().customer.findFirst({
          where: {
            OR: [
              { firstName: orderData.customerName || 'عميل غير محدد' },
              { phone: orderData.customerPhone || '' }
            ]
          }
        });

        if (!customer) {
          customer = await getSharedPrismaClient().customer.create({
            data: {
              firstName: orderData.customerName || 'عميل غير محدد',
              lastName: '',
              phone: orderData.customerPhone || '',
              email: orderData.customerEmail || '',
              companyId: 'cmdt8nrjq003vufuss47dqc45'
            }
          });
        }

        // إنشاء الطلب
        const newOrder = await getSharedPrismaClient().order.create({
          data: {
            orderNumber: orderData.orderNumber,
            customerId: customer.id,
            companyId: 'cmdt8nrjq003vufuss47dqc45', // Company ID الافتراضي
            total: orderData.total || 0,
            subtotal: orderData.subtotal || 0,
            status: (orderData.status || 'pending').toUpperCase(),
            paymentStatus: (orderData.paymentStatus || 'pending').toUpperCase(),
            paymentMethod: mapPaymentMethod(orderData.paymentMethod || 'cash'),
            shippingAddress: typeof orderData.shippingAddress === 'object'
              ? JSON.stringify(orderData.shippingAddress)
              : orderData.shippingAddress || '',
            notes: orderData.notes || '',
            extractionMethod: 'file_migration',
            confidence: 0.8,
            sourceType: 'migrated',
            conversationId: orderData.items?.[0]?.metadata?.conversationId || null,
            createdAt: new Date(orderData.createdAt || Date.now())
          }
        });

        // إضافة عناصر الطلب
        if (orderData.items && orderData.items.length > 0) {
          for (const item of orderData.items) {
            await getSharedPrismaClient().orderItem.create({
              data: {
                orderId: newOrder.id,
                productName: item.name || 'منتج غير محدد',
                productColor: item.metadata?.color || '',
                productSize: item.metadata?.size || '',
                price: item.price || 0,
                quantity: item.quantity || 1,
                total: item.total || 0
              }
            });
          }
        }

        //console.log(`✅ تم نقل ${orderData.orderNumber}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ خطأ في ${file}:`, error.message);
        errorCount++;
        errors.push({ file, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'تم نقل الطلبات بنجاح',
      stats: {
        total: recentFiles.length,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      errors
    });

  } catch (error) {
    console.error('❌ خطأ في نقل الطلبات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في نقل الطلبات',
      details: error.message
    });
  }
});

/**
 * جلب إحصائيات الطلبات المحسنة
 * GET /api/v1/orders-enhanced/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();

    const { dateFrom, dateTo } = req.query;
    const companyId = req.user.companyId;

    const stats = await enhancedOrderService.getOrderStats(companyId, dateFrom, dateTo);

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: stats,
      message: 'تم جلب الإحصائيات بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات الطلبات:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب الإحصائيات'
    });
  }
});

/**
 * جلب طلب محدد
 * GET /api/v1/orders-enhanced/:id
 */
// Duplicate route removed - see lines 649+ for the correct implementation using getOrderById service method

/**
 * إنشاء طلب محسن يدوياً
 * POST /api/v1/orders-enhanced
 */
console.log('🚧 [ENHANCED-ORDERS] Route initialization');
router.post('/', async (req, res) => {
  try {
    console.log('📝 [ENHANCED-ORDERS] Received POST / request');
    // Auth check handled by middleware
    // console.log('👤 [ENHANCED-ORDERS] User:', req.user ? `${req.user.email} (${req.user.companyId})` : 'UNDEFINED');

    const enhancedOrderService = new EnhancedOrderService();

    // 🔍 Check if user has an affiliate profile (regardless of role)
    let affiliateId = null;
    let orderSource = 'manual';

    try {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      const affiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });

      if (affiliate) {
        affiliateId = affiliate.id;
        orderSource = 'AFFILIATE_DIRECT';
        console.log('✅ [ENHANCED-ORDERS] Affiliate detected:', { affiliateId, userId: req.user.id });
      }
    } catch (affiliateError) {
      console.error('⚠️ [ENHANCED-ORDERS] Error fetching affiliate:', affiliateError);
    }

    const orderData = {
      ...req.body,
      companyId: req.user.companyId,
      extractionMethod: 'manual',

      // Affiliate info
      ...(affiliateId && { affiliateId, orderSource }),

      // Creator info
      createdBy: req.user.id,
      createdByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
    };

    console.log('📦 [ENHANCED-ORDERS] Processing order data:', JSON.stringify(orderData.products || orderData.productName, null, 2));

    const result = await enhancedOrderService.createEnhancedOrder(orderData);

    await enhancedOrderService.disconnect();

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في إنشاء الطلب'
    });
  }
});

/**
 * تحديث حالة الطلب
 * PATCH /api/v1/orders-enhanced/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const { id } = req.params;
    const { status, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // ✅ SECURITY FIX: Ensure order belongs to company
    const order = await enhancedOrderService.getPrisma().order.findFirst({
      where: {
        id,
        companyId: companyId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود أو غير مصرح به'
      });
    }

    const updatedOrder = await enhancedOrderService.getPrisma().order.update({
      where: { id },
      data: {
        status,
        notes: notes ? `${notes}\n---\nتحديث الحالة: ${new Date().toLocaleString('ar-EG')}` : undefined,
        updatedAt: new Date()
      },
      include: {
        customer: true,
        conversation: true,
        items: true
      }
    });

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: updatedOrder,
      message: 'تم تحديث حالة الطلب بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في تحديث حالة الطلب'
    });
  }
});

/**
 * تحديث validation status
 * PATCH /api/v1/orders-enhanced/:id/validation
 */
router.patch('/:id/validation', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const { id } = req.params;
    const { validationStatus, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // ✅ SECURITY FIX: Ensure order belongs to company
    const order = await enhancedOrderService.getPrisma().order.findFirst({
      where: {
        id,
        companyId: companyId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود أو غير مصرح به'
      });
    }

    const updatedOrder = await enhancedOrderService.getPrisma().order.update({
      where: { id },
      data: {
        validationStatus,
        notes: notes ? `${notes}\n---\nتحديث التحقق: ${new Date().toLocaleString('ar-EG')}` : undefined,
        updatedAt: new Date()
      }
    });

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: updatedOrder,
      message: 'تم تحديث حالة التحقق بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث حالة التحقق:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في تحديث حالة التحقق'
    });
  }
});

/**
 * حذف طلب
 * DELETE /api/v1/orders-enhanced/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const { id } = req.params;

    // FIXED: Add company isolation for security
    // حذف عناصر الطلب أولاً
    // SECURITY WARNING: Ensure companyId filter is included

    // First verify the order belongs to the user's company
    const order = await enhancedOrderService.getPrisma().order.findFirst({
      where: {
        id,
        companyId: req.user.companyId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود أو غير مصرح به'
      });
    }

    // حذف عناصر الطلب أولاً
    await enhancedOrderService.getPrisma().orderItem.deleteMany({
      where: {
        orderId: id
      }
    });

    // حذف الطلب
    await enhancedOrderService.getPrisma().order.delete({
      where: { id }
    });

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      message: 'تم حذف الطلب بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في حذف الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في حذف الطلب'
    });
  }
});

/**
 * إحصائيات المحادثات المكتملة
 * GET /api/v1/orders-enhanced/conversations/stats
 */
router.get('/conversations/stats', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();

    const { dateFrom, dateTo } = req.query;
    const companyId = req.user.companyId;

    const stats = await enhancedOrderService.getConversationCompletionStats(companyId, dateFrom, dateTo);

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: stats,
      message: 'تم جلب إحصائيات المحادثات بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المحادثات:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب إحصائيات المحادثات'
    });
  }
});

/**
 * جلب المحادثات المرتبطة بالطلبات
 * GET /api/v1/orders-enhanced/conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();

    const {
      page = 1,
      limit = 20,
      status = 'RESOLVED',
      hasOrder = true
    } = req.query;

    const companyId = req.user.companyId;

    const result = await enhancedOrderService.getOrderConversations(companyId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      hasOrder: hasOrder === 'true'
    });

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: result.conversations,
      pagination: result.pagination,
      message: 'تم جلب المحادثات بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في جلب المحادثات:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب المحادثات'
    });
  }
});

/**
 * مقارنة الطلبات (قديم vs جديد)
 * GET /api/v1/orders-enhanced/compare
 */
router.get('/compare/systems', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const SimpleOrderService = require('../services/simpleOrderService');
    const simpleOrderService = new SimpleOrderService();

    const companyId = req.user.companyId;

    // جلب إحصائيات النظام المحسن
    const enhancedStats = await enhancedOrderService.getOrderStats(companyId);

    // جلب إحصائيات النظام القديم
    const simpleStats = await simpleOrderService.getDataQualityStats();

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: {
        enhanced: enhancedStats,
        simple: simpleStats,
        comparison: {
          totalOrdersImprovement: enhancedStats.totalOrders - (simpleStats?.totalOrders || 0),
          avgConfidenceImprovement: enhancedStats.avgConfidence - 0.5, // متوسط النظام القديم
          dataQualityImprovement: 'محسن بشكل كبير'
        }
      },
      message: 'تم جلب مقارنة الأنظمة بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في مقارنة الأنظمة:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في مقارنة الأنظمة'
    });
  }
});

// Get single order details
router.get('/:id', async (req, res) => {
  try {
    // التحقق من وجود المستخدم المصادق عليه
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }

    const { id } = req.params;
    const companyId = req.user.companyId;
    const enhancedOrderService = new EnhancedOrderService();

    const result = await enhancedOrderService.getOrderById(id, companyId);

    await enhancedOrderService.disconnect();

    if (result.success) {
      res.json({
        success: true,
        data: result.order,
        message: 'تم جلب تفاصيل الطلب بنجاح'
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'الطلب غير موجود'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الطلب'
    });
  }
});

module.exports = router;


const express = require('express');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const socketService = require('../services/socketService');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const simpleOrderService = require('../services/simpleOrderService');
const orderService = require('../services/orderService');
const cashbackService = require('../services/cashbackService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { validateOrderItems, validateEgyptianPhone } = require('../utils/orderValidation');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// الحصول على الطلبات البسيطة
// الحصول على الطلبات البسيطة (مع Pagination & Filtering)
router.get('/simple', requireAuth, async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    // التأكد من وجود req.user و companyId (requireAuth يجب أن يضمن ذلك)
    if (!req.user) {
      console.error(`[ORDERS] /simple - req.user is null/undefined`);
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول'
      });
    }

    const companyId = req.user?.companyId;

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ORDERS] /simple request - req.user:`, req.user ? { id: req.user.id, email: req.user.email, companyId: req.user.companyId } : 'null');
      console.log(`[ORDERS] /simple request - companyId:`, companyId);
    }

    if (!companyId) {
      console.error(`[ORDERS] /simple - Missing companyId. req.user:`, req.user);
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    // استخراج معاملات الفلترة والصفحات
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const paymentStatus = req.query.paymentStatus;
    const search = req.query.search;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const onlyUnseen = req.query.onlyUnseen === 'true';

    // "Fetch Top N" Strategy:
    // لجلب الصفحة رقم P، نحتاج لجلب أول (P * limit) عنصر من الجدولين
    // ثم دمجهم، ترتيبهم، وأخذ الشريحة المناسبة.
    // تحسين: إذا كانت الصفحة الأولى، لا نحتاج لجلب أكثر من limit لكل جدول.
    const fetchLimit = page === 1 ? limit : (page * limit);

    // Log only in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📦 [ORDERS] Fetching page ${page} (limit ${limit}) for company: ${companyId}`);
    }

    // بناء شروط البحث (Where Clause)
    const whereClause = { companyId };
    const guestWhereClause = { companyId };

    // 🕵️ Affiliate Filtering Logic
    let affiliateId = req.query.affiliateId;

    // 🔒 Security: If user is an AFFILIATE, enforce their own affiliateId
    if (req.user.role === 'AFFILIATE') {
      const affiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (affiliate) {
        affiliateId = affiliate.id;
      } else {
        // If user is affiliate role but no affiliate profile, return empty
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page, limit, pages: 0 }
        });
      }
    }

    if (affiliateId) {
      whereClause.affiliateId = affiliateId;
      guestWhereClause.affiliateId = affiliateId;
    }

    // Filter by Creator (if specified)
    if (req.query.createdBy) {
      whereClause.createdBy = req.query.createdBy;
      // Guest orders don't have createdBy field in schema yet, but if they did:
      // guestWhereClause.createdBy = req.query.createdBy; 
    }

    console.log('🔍 [ORDERS-GET] Filters:', {
      role: req.user.role,
      userId: req.user.id,
      affiliateIdArg: req.query.affiliateId,
      createdByArg: req.query.createdBy,
      resolvedAffiliateId: affiliateId,
      whereClause
    });

    // 0. Filter by Viewed Status
    if (onlyUnseen) {
      whereClause.isViewed = false;
      guestWhereClause.isViewed = false;
    }

    // 1. Filter by Status
    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase();
      guestWhereClause.status = status.toLowerCase(); // Guest orders use lowercase usually
    }

    // 2. Filter by Payment Status
    if (paymentStatus && paymentStatus !== 'all') {
      whereClause.paymentStatus = paymentStatus.toUpperCase();
      // GuestOrder doesn't have paymentStatus field in the mapped object usually, but let's check schema
      // Schema says GuestOrder has paymentMethod, but paymentStatus is hardcoded to pending in previous code.
      // We will skip paymentStatus filter for GuestOrders if they don't support it, or assume 'pending'.
      if (paymentStatus.toLowerCase() === 'pending') {
        // Guest orders are usually pending payment
      } else {
        // If filtering by PAID, GuestOrders might not match
        // For now, let's apply it if we can, or just filter in memory for guests if needed.
        // Actually, previous code hardcoded paymentStatus: 'pending' for guests.
      }
    }

    // 3. Filter by Date Range
    if (startDate || endDate) {
      whereClause.createdAt = {};
      guestWhereClause.createdAt = {};

      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
        guestWhereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
        guestWhereClause.createdAt.lte = end;
      }
    }

    // 4. Search (Complex because it spans multiple fields)
    if (search) {
      const searchInt = parseInt(search);
      const searchCondition = {
        OR: [
          { orderNumber: { contains: search } },
          { customer: { firstName: { contains: search } } },
          { customer: { lastName: { contains: search } } },
          { customer: { phone: { contains: search } } }
        ]
      };

      // Merge search into whereClause
      Object.assign(whereClause, searchCondition);

      const guestSearchCondition = {
        OR: [
          { orderNumber: { contains: search } },
          { guestName: { contains: search } },
          { guestPhone: { contains: search } },
          { guestEmail: { contains: search } }
        ]
      };
      Object.assign(guestWhereClause, guestSearchCondition);
    }

    // تنفيذ الاستعلامات (Top N)
    // Debug: Log query structure before execution (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ORDERS-DEBUG] Query structure:', JSON.stringify({
        where: whereClause,
        take: fetchLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          orderItems: { include: { product: { select: { id: true, name: true, images: true } } } },
          conversation: { select: { id: true, channel: true } }
        }
      }, null, 2));
    }

    const [regularOrders, guestOrders, totalRegular, totalGuest] = await Promise.all([
      // Fetch Regular Orders
      getSharedPrismaClient().order.findMany({
        where: whereClause,
        take: fetchLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true }
          },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, images: true } }
            }
          },
          conversation: { select: { id: true, channel: true } }
        }
      }),
      // Fetch Guest Orders
      getSharedPrismaClient().guestOrder.findMany({
        where: guestWhereClause,
        take: fetchLimit,
        orderBy: { createdAt: 'desc' }
      }),
      // Count Total Regular (for pagination metadata)
      getSharedPrismaClient().order.count({ where: whereClause }),
      // Count Total Guest (for pagination metadata)
      getSharedPrismaClient().guestOrder.count({ where: guestWhereClause })
    ]);

    console.log(`📦 [ORDERS] Found ${regularOrders.length} regular, ${guestOrders.length} guest (Top ${fetchLimit})`);

    // Debug: Log items for first few orders BEFORE mapping
    if (regularOrders.length > 0) {
      const firstOrder = regularOrders[0];
      console.log(`🔍 [ORDERS-DEBUG] First order BEFORE mapping:`, {
        orderNumber: firstOrder.orderNumber,
        orderId: firstOrder.id,
        itemsCount: firstOrder.orderItems ? firstOrder.orderItems.length : 0,
        firstItem: firstOrder.orderItems?.[0] || null
      });

      // Also check if items exist in database for this order
      const itemsCount = await getSharedPrismaClient().orderItem.count({
        where: { orderId: firstOrder.id }
      });
      console.log(`🔍 [ORDERS-DEBUG] Items count in database for order ${firstOrder.orderNumber}:`, itemsCount);
    }

    // تحويل البيانات (Mapping)
    const formattedRegularOrders = regularOrders.map(order => {
      let shippingAddress = order.shippingAddress || '';
      try {
        if (typeof shippingAddress === 'string' && shippingAddress.startsWith('{')) {
          shippingAddress = JSON.parse(shippingAddress);
        }
      } catch (e) { }

      // PRIORITY: Use order.customerName from WooCommerce first
      // This ensures each order shows the actual customer name from WooCommerce
      let finalCustomerName = '';

      // First: Try order.customerName (from WooCommerce)
      if (order.customerName && order.customerName.trim()) {
        finalCustomerName = order.customerName.trim();
      }
      // Second: Fallback to Customer relation if customerName is empty
      else if (order.customer) {
        const firstName = order.customer.firstName || '';
        const lastName = order.customer.lastName || '';
        finalCustomerName = `${firstName} ${lastName}`.trim();
      }
      // Final fallback: empty string
      else {
        finalCustomerName = '';
      }

      // Debug logging for all orders to help diagnose the issue
      const orderIndex = regularOrders.indexOf(order);
      if (orderIndex < 5) {
        console.log(`📦 [ORDER-API] Order #${orderIndex + 1} - ${order.orderNumber}:`, {
          hasCustomer: !!order.customer,
          customerId: order.customerId,
          customerFirstName: order.customer?.firstName || 'N/A',
          customerLastName: order.customer?.lastName || 'N/A',
          storedCustomerName: order.customerName || 'N/A',
          finalCustomerName: finalCustomerName || 'EMPTY'
        });
      }

      // Debug: Log items for first few orders
      if (regularOrders.indexOf(order) < 3) {
        console.log(`📦 [ORDER-ITEMS] Order ${order.orderNumber}:`, {
          hasItems: !!order.orderItems,
          itemsIsArray: Array.isArray(order.orderItems),
          itemsLength: order.orderItems?.length || 0,
          firstItem: order.orderItems?.[0] ? {
            id: order.orderItems[0].id,
            productId: order.orderItems[0].productId,
            hasProduct: !!order.orderItems[0].product,
            productName: order.orderItems[0].product?.name,
            price: order.orderItems[0].price,
            quantity: order.orderItems[0].quantity
          } : null
        });
      }

      return {
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerName: finalCustomerName,
        customerPhone: order.customer?.phone || order.customerPhone || '',
        customerEmail: order.customer?.email || order.customerEmail || '',
        customerAddress: order.customerAddress || '',
        city: order.city || '',
        governorate: order.governorate || '',
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        status: order.status.toLowerCase(),
        paymentStatus: order.paymentStatus.toLowerCase(),
        paymentMethod: order.paymentMethod.toLowerCase().replace('_', '_on_'),
        shippingAddress: shippingAddress,
        items: Array.isArray(order.orderItems) && order.orderItems.length > 0 ? order.orderItems.map(item => {
          const parsedMetadata = JSON.parse(item.metadata || '{}');
          return {
            id: item.id,
            productId: item.productId,
            name: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productName: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            metadata: {
              ...parsedMetadata,
              color: item.productColor || parsedMetadata.color || parsedMetadata.productColor,
              size: item.productSize || parsedMetadata.size || parsedMetadata.productSize
            }
          };
        }) : [],
        trackingNumber: order.trackingNumber,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        metadata: order.metadata ? JSON.parse(order.metadata) : {},
        isViewed: order.isViewed ?? false,
        sourceType: order.sourceType || 'unknown',
        extractionMethod: order.extractionMethod || 'unknown',
        orderSource: order.orderSource || 'REGULAR',
        conversationId: order.conversationId,
        conversation: order.conversation,
        affiliateId: order.affiliateId,
        affiliate: order.affiliate,
        createdBy: order.createdBy,
        createdByName: order.createdByName,
        createdByUser: order.createdByUser
      };
    });

    const formattedGuestOrders = guestOrders.map(order => {
      let items = order.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }

      let shippingAddress = order.shippingAddress || {};
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
      }

      return {
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerName: order.guestName || '',
        customerPhone: order.guestPhone || '',
        customerEmail: order.guestEmail || '',
        total: order.total || 0,
        subtotal: order.total || 0,
        tax: 0,
        shipping: order.shippingCost || 0,
        status: order.status?.toLowerCase() || 'pending',
        paymentStatus: 'pending',
        paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
        shippingAddress: shippingAddress,
        items: Array.isArray(items) ? items.map(item => ({
          id: item.productId || '',
          productId: item.productId || '',
          name: item.name || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          total: (item.price || 0) * (item.quantity || 1),
          metadata: {}
        })) : [],
        trackingNumber: null,
        notes: order.notes || '',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        metadata: { source: 'storefront', isGuestOrder: true },
        isViewed: order.isViewed ?? false
      };
    });

    // دمج وترتيب (Merge & Sort)
    const allFetchedOrders = [...formattedRegularOrders, ...formattedGuestOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // تطبيق Pagination (Slice)
    // بما أننا جلبنا Top N، فالصفحة المطلوبة هي آخر (limit) عنصر في المصفوفة المدمجة
    // ولكن يجب أن نأخذ في الاعتبار الـ offset
    // الـ offset الحقيقي في المصفوفة المدمجة هو (page - 1) * limit
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = allFetchedOrders.slice(startIndex, endIndex);

    const totalOrders = totalRegular + totalGuest;

    console.log(`📊 [ORDERS] Returning ${paginatedOrders.length} orders (Page ${page}/${Math.ceil(totalOrders / limit)})`);

    res.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        total: totalOrders,
        page: page,
        limit: limit,
        pages: Math.ceil(totalOrders / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching simple orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلبات',
      error: error.message
    });
  }
});

// إحصائيات الطلبات البسيطة
router.get('/simple/stats', requireAuth, async (req, res) => {
  try {
    // ✅ الحصول على companyId من المستخدم المصادق عليه
    const companyId = req.user?.companyId || null;

    // ✅ الحصول على معاملات التاريخ (dateFrom و dateTo)
    const { dateFrom, dateTo } = req.query;

    console.log(`📊 [ORDERS-STATS] Request from user:`, {
      userId: req.user?.id,
      email: req.user?.email,
      companyId: companyId,
      dateFrom,
      dateTo
    });

    if (!companyId) {
      console.error('❌ [ORDERS-STATS] No companyId found in request');
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const stats = await simpleOrderService.getSimpleStats(companyId, dateFrom || null, dateTo || null);

    console.log(`✅ [ORDERS-STATS] Stats sent for companyId: ${companyId}`, {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      dateFrom,
      dateTo
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching simple stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// تحديث حالة الطلب البسيط
router.post('/simple/:orderNumber/status', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, notes } = req.body;

    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [ORDER-STATUS-UPDATE] Request received:', {
        orderNumber,
        hasUser: !!req.user,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        userObject: req.user
      });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      console.error('❌ [ORDER-STATUS-UPDATE] Missing companyId:', {
        hasUser: !!req.user,
        user: req.user
      });
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب مطلوبة'
      });
    }

    // 🔧 Use OrderService for proper auto-shipping logic
    console.log('🔧 [ORDER-STATUS-UPDATE] Using OrderService for proper Turbo integration...');

    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

    try {
      // 1. Check for Call Attempt Requirements if status is DELIVERY_FAILED (or similar)
      const FAILED_STATUSES = ['DELIVERY_FAILED', 'NO_ANSWER', 'CANCELLED']; // Adjust based on exact enum names
      if (FAILED_STATUSES.includes(status.toUpperCase())) {
        const order = await getSharedPrismaClient().order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          }
        });

        if (order && order.callAttempts < 3) {
          return res.status(400).json({
            success: false,
            message: `لا يمكن تحويل الطلب لهذه الحالة قبل إجراء 3 محاولات اتصال على الأقل (المحاولات الحالية: ${order.callAttempts})`
          });
        }
      }

      // Try using OrderService first (for regular orders with Turbo support)
      const updatedOrder = await orderService.setCompanyId(companyId).updateOrderStatus(orderNumber, companyId, status.toUpperCase(), notes, userId, userName);

      if (updatedOrder) {
        console.log(`✅ [ORDER-STATUS-UPDATE] Updated regular order via OrderService: ${orderNumber}`);
        return res.json({
          success: true,
          message: 'تم تحديث حالة الطلب بنجاح',
          data: {
            orderType: 'regular',
            orderNumber,
            status: updatedOrder.status,
            turboShipmentId: updatedOrder.turboShipmentId,
            turboTrackingNumber: updatedOrder.turboTrackingNumber
          }
        });
      }
    } catch (orderServiceError) {
      console.log('⚠️ [ORDER-STATUS-UPDATE] OrderService failed, trying direct update:', orderServiceError.message);

      // Fallback: Check for Regular Order (search by id OR orderNumber)
      const existingRegularOrder = await getSharedPrismaClient().order.findFirst({
        where: {
          OR: [
            { id: orderNumber, companyId },
            { orderNumber: orderNumber, companyId }
          ]
        }
      });

      if (existingRegularOrder) {
        const updatedRegularOrder = await getSharedPrismaClient().order.update({
          where: { id: existingRegularOrder.id },
          data: {
            status: status.toUpperCase(),
            notes: notes || undefined,
            statusHistory: {
              create: {
                status: status.toUpperCase(),
                oldStatus: existingRegularOrder.status,
                reason: notes || 'Direct Update',
                changedBy: userId,
                userName: userName
              }
            },
            updatedAt: new Date()
          }
        });

        console.log(`✅ [ORDER-STATUS-UPDATE] Updated regular order via direct update: ${orderNumber}`);
        return res.json({
          success: true,
          message: 'تم تحديث حالة الطلب بنجاح',
          data: { orderType: 'regular', orderNumber, status: updatedRegularOrder.status }
        });
      }

      // If regular order not found, check for Guest Order (search by id OR orderNumber)
      const existingGuestOrder = await getSharedPrismaClient().guestOrder.findFirst({
        where: {
          OR: [
            { id: orderNumber, companyId },
            { orderNumber: orderNumber, companyId }
          ]
        }
      });

      if (existingGuestOrder) {
        const updatedGuestOrder = await getSharedPrismaClient().guestOrder.update({
          where: { id: existingGuestOrder.id },
          data: {
            status: status.toUpperCase(),
            notes: notes || undefined,
            statusHistory: {
              create: {
                status: status.toUpperCase(),
                oldStatus: existingGuestOrder.status,
                reason: notes || 'Direct Update',
                changedBy: userId,
                userName: userName
              }
            },
            updatedAt: new Date()
          }
        });

        if (status.toUpperCase() === 'DELIVERED') {
          try {
            let meta = {};
            try {
              meta = updatedGuestOrder.metadata ? JSON.parse(updatedGuestOrder.metadata) : {};
            } catch (e) {
              meta = {};
            }

            const walletCustomerId = meta.walletCustomerId;
            if (walletCustomerId) {
              const prisma = getSharedPrismaClient();
              await WalletService.createWallet(walletCustomerId, companyId);

              const already = await prisma.walletTransaction.findFirst({
                where: {
                  wallet: { customerId: walletCustomerId },
                  type: 'CASHBACK',
                  metadata: { contains: updatedGuestOrder.id }
                }
              });

              if (!already) {
                const baseAmount = Math.max(0, (Number(updatedGuestOrder.total) || 0) - (Number(updatedGuestOrder.discountAmount) || 0));
                if (baseAmount > 0) {
                  const result = await WalletService.addToWallet(
                    walletCustomerId,
                    baseAmount * 0.05,
                    'CASHBACK',
                    `Cashback from storefront order ${updatedGuestOrder.orderNumber}`,
                    { guestOrderId: updatedGuestOrder.id, orderNumber: updatedGuestOrder.orderNumber, baseAmount, cashbackRate: 0.05, excludesShipping: true, trigger: 'delivered' }
                  );

                  try {
                    await prisma.walletTransaction.update({
                      where: { id: result.transaction.id },
                      data: { orderId: null }
                    });
                  } catch (e) {
                  }
                }
              }
            }
          } catch (e) {
            console.error('❌ [CASHBACK] Failed to add cashback on guest order delivered:', e?.message);
          }
        }

        console.log(`✅ [ORDER-STATUS-UPDATE] Updated guest order via direct update: ${orderNumber}`);
        return res.json({
          success: true,
          message: 'تم تحديث حالة الطلب بنجاح',
          data: { orderType: 'guest', orderNumber, status: updatedGuestOrder.status }
        });
      }

      // If neither order type found
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }

  } catch (error) {
    console.error('❌ Error updating simple order status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الطلب',
      error: error.message
    });
  }
});

// تسجيل محاولة اتصال
router.post('/simple/:orderNumber/call-attempt', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { notes, result } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const order = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const [log, updatedOrder] = await getSharedPrismaClient().$transaction([
      getSharedPrismaClient().callAttemptLog.create({
        data: {
          orderId: order.id,
          userId,
          notes,
          result
        }
      }),
      getSharedPrismaClient().order.update({
        where: { id: order.id },
        data: {
          callAttempts: { increment: 1 },
          lastCallAttemptAt: new Date()
        }
      })
    ]);

    res.json({
      success: true,
      message: 'تم تسجيل محاولة الاتصال بنجاح',
      data: {
        callAttempts: updatedOrder.callAttempts,
        lastCallAttemptAt: updatedOrder.lastCallAttemptAt
      }
    });
  } catch (error) {
    console.error('Error logging call attempt:', error);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل محاولة الاتصال' });
  }
});

// تعليم الطلب كمقروء
router.post('/simple/:orderNumber/viewed', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const order = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (order) {
      await getSharedPrismaClient().order.update({
        where: { id: order.id },
        data: { isViewed: true }
      });
    }

    return res.json({ success: true, message: 'تم تعليم الطلب كمقروء' });

  } catch (error) {
    console.error('Error marking order as viewed:', error);
    res.status(500).json({ success: false, message: 'خطأ في العملية' });
  }
});

// تحديث حالة الدفع للطلب البسيط
router.post('/simple/:orderNumber/payment-status', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { paymentStatus, notes } = req.body;

    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [PAYMENT-STATUS-UPDATE] Request received:', {
        orderNumber,
        hasUser: !!req.user,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        userObject: req.user
      });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      console.error('❌ [PAYMENT-STATUS-UPDATE] Missing companyId:', {
        hasUser: !!req.user,
        user: req.user
      });
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'حالة الدفع مطلوبة'
      });
    }

    // 1. Try Regular Order (search by id OR orderNumber)
    const existingRegularOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (existingRegularOrder) {
      const userId = req.user?.id;
      const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

      await getSharedPrismaClient().order.update({
        where: { id: existingRegularOrder.id },
        data: {
          paymentStatus: paymentStatus.toUpperCase(),
          notes: notes || undefined,
          updatedAt: new Date(),
          statusHistory: {
            create: {
              status: existingRegularOrder.status, // Keep same status
              oldStatus: existingRegularOrder.status,
              reason: `Payment Update: ${paymentStatus.toUpperCase()}${notes ? ' - ' + notes : ''}`,
              changedBy: userId,
              userName: userName
            }
          }
        }
      });

      if (paymentStatus.toUpperCase() === 'COMPLETED') {
        try {
          await cashbackService.applyCashbackForPaidOrder({
            orderId: existingRegularOrder.id,
            companyId,
            changedBy: userId
          });
        } catch (e) {
          console.error('❌ [CASHBACK] Failed to apply cashback for paid order:', {
            orderId: existingRegularOrder.id,
            companyId,
            error: e?.message
          });
        }
      }

      console.log(`✅ [PAYMENT-STATUS-UPDATE] Updated regular order: ${orderNumber}`);
      return res.json({
        success: true,
        message: 'تم تحديث حالة الدفع بنجاح',
        data: { orderType: 'regular', orderNumber, paymentStatus: paymentStatus.toUpperCase() }
      });
    }

    // 2. Try Guest Order (search by id OR orderNumber)
    const existingGuestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (existingGuestOrder) {
      const userId = req.user?.id;
      const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

      await getSharedPrismaClient().guestOrder.update({
        where: { id: existingGuestOrder.id },
        data: {
          paymentStatus: paymentStatus.toUpperCase(),
          notes: notes || undefined,
          updatedAt: new Date(),
          statusHistory: {
            create: {
              status: existingGuestOrder.status,
              oldStatus: existingGuestOrder.status,
              reason: `Payment Update: ${paymentStatus.toUpperCase()}${notes ? ' - ' + notes : ''}`,
              changedBy: userId,
              userName: userName
            }
          }
        }
      });

      console.log(`✅ [PAYMENT-STATUS-UPDATE] Updated guest order: ${orderNumber}`);
      return res.json({
        success: true,
        message: 'تم تحديث حالة الدفع بنجاح',
        data: { orderType: 'guest', orderNumber, paymentStatus: paymentStatus.toUpperCase() }
      });
    }

    // If neither order type found
    return res.status(404).json({
      success: false,
      message: 'الطلب غير موجود'
    });

    const orderType = regularOrder.count > 0 ? 'regular' : 'guest';
    console.log(`✅ [PAYMENT-STATUS-UPDATE] Updated ${orderType} order: ${orderNumber}`);

    res.json({
      success: true,
      message: 'تم تحديث حالة الدفع بنجاح',
      data: { orderType, orderNumber, paymentStatus: paymentStatus.toUpperCase() }
    });

  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الدفع',
      error: error.message
    });
  }
});

// الحصول على جميع الطلبات
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId } = req.query;
    const skip = (page - 1) * limit;

    // التأكد من وجود companyId من المستخدم المصادق عليه
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const where = { companyId }; // فلترة بـ companyId
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (req.query.onlyUnseen === 'true') where.isViewed = false;

    const orders = await getSharedPrismaClient().order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          },
        },
        conversation: {
          select: {
            id: true,
            channel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Ensure where clause includes companyId for security
    if (!where.companyId && req.user?.companyId) {
      where.companyId = req.user.companyId;
    }
    // Security: Ensure company isolation for order count
    if (!where.companyId) {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      where.companyId = req.user.companyId;
    }
    const total = await getSharedPrismaClient().order.count({ where });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلبات',
      error: error.message
    });
  }
});

// إضافة ملاحظة للطلب
router.post('/simple/:orderNumber/notes', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { content } = req.body;
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'محتوى الملاحظة مطلوب' });
    }

    // 1. Try to find regular order by id OR orderNumber
    const regularOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (regularOrder) {
      const note = await getSharedPrismaClient().orderNote.create({
        data: {
          id: uuidv4(),
          orderId: regularOrder.id,
          authorId: userId,
          authorName: userName,
          content: content.trim(),
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      console.log(`✅ [ORDER-NOTE] Added note to regular order: ${orderNumber}`);
      return res.json({ success: true, data: note });
    }

    // 2. Try guest order
    const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (guestOrder) {
      const note = await getSharedPrismaClient().orderNote.create({
        data: {
          id: uuidv4(),
          guestOrderId: guestOrder.id,
          authorId: userId,
          authorName: userName,
          content: content.trim(),
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      console.log(`✅ [ORDER-NOTE] Added note to guest order: ${orderNumber}`);
      return res.json({ success: true, data: note });
    }

    // Order not found
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

  } catch (error) {
    console.error('❌ Error adding note:', error);
    res.status(500).json({ success: false, message: 'خطأ في إضافة الملاحظة', error: error.message });
  }
});

// الحصول على طلب بسيط محدد بالرقم
router.get('/simple/:orderNumber', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    // التأكد من وجود req.user (requireAuth يجب أن يضمن ذلك)
    if (!req.user) {
      console.error('❌ [ORDER-DETAIL] req.user is null/undefined');
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول'
      });
    }

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [ORDER-DETAIL] Request for order:', orderNumber);
      console.log('🔍 [ORDER-DETAIL] req.user:', { id: req.user.id, email: req.user.email, companyId: req.user.companyId });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      console.error('❌ [ORDER-DETAIL] Missing companyId!', {
        user: req.user,
        hasUser: !!req.user,
        orderNumber
      });
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    console.log('🔍 [ORDER-DETAIL] Searching for order:', { orderNumber, companyId });

    // Debug: Log query structure before execution (development only)
    if (process.env.NODE_ENV !== 'production') {
      const queryStructure = {
        where: { orderNumber, companyId },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          },
          conversation: {
            select: {
              id: true,
              channel: true
            }
          }
        }
      };
      // console.log('[ORDER-DETAIL-DEBUG] Query structure:', JSON.stringify(queryStructure, null, 2));
    }

    // Try to find regular order first (search by id OR orderNumber)
    let order = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productColor: true,  // ✅ FIX: Include color
            productSize: true,   // ✅ FIX: Include size
            productSku: true,    // ✅ FIX: Include SKU
            productDetails: true, // ✅ FIX: Include details
            price: true,
            quantity: true,
            total: true,
            metadata: true,
            variant: {
              select: {
                id: true,
                name: true,  // ✅ Correct: Variant name (e.g. "Red / L")
                type: true,  // ✅ Correct: Variant type
                sku: true,
                metadata: true // ✅ Correct: JSON metadata
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        },
        conversation: {
          select: {
            id: true,
            channel: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        affiliate: {
          select: {
            id: true,
            affiliateCode: true,
            status: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        orderNotes: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    let isGuestOrder = false;
    let guestOrder = null;

    // If not found, try guest order
    if (!order) {
      console.log('🔍 [ORDER-DETAIL] Regular order not found, trying guest order...');
      guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
        where: {
          OR: [
            { id: orderNumber, companyId },
            { orderNumber: orderNumber, companyId }
          ]
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          affiliate: {
            select: {
              id: true,
              affiliateCode: true,
              status: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          order_notes: { // ✅ FIX: GuestOrder uses order_notes (snake_case)
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          statusHistory: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (guestOrder) {
        isGuestOrder = true;
        console.log('✅ [ORDER-DETAIL] Found guest order:', orderNumber);
      }
    }

    // If neither found, return 404
    if (!order && !guestOrder) {
      console.error('❌ [ORDER-DETAIL] Order not found:', {
        orderNumber,
        companyId,
        searchedRegular: true,
        searchedGuest: true
      });
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود',
        orderNumber,
        companyId
      });
    }

    // Debug: Log items for regular order
    if (order) {
      console.log(`🔍 [ORDER-DETAIL] Regular order found:`, {
        orderNumber: order.orderNumber,
        orderId: order.id,
        hasItems: !!order.orderItems,
        itemsIsArray: Array.isArray(order.orderItems),
        itemsLength: order.orderItems?.length || 0,
        firstItem: order.orderItems?.[0] ? {
          id: order.orderItems[0].id,
          productId: order.orderItems[0].productId,
          productName: order.orderItems[0].productName,
          hasProduct: !!order.orderItems[0].product,
          productNameFromProduct: order.orderItems[0].product?.name,
          variantData: order.orderItems[0].variant, // Inspect variant data
          variantId: order.orderItems[0].variantId
        } : null
      });

      // Also check if items exist in database for this order
      const itemsCount = await getSharedPrismaClient().orderItem.count({
        where: { orderId: order.id }
      });
      console.log(`🔍 [ORDER-DETAIL] Items count in database for order ${order.orderNumber}:`, itemsCount);
      console.log(`📝 [ORDER-DETAIL] Notes found:`, order.orderNotes?.length || 0); // DEBUG LOG
    }

    let formattedOrder;

    if (isGuestOrder && guestOrder) {
      // Format guest order
      let items = guestOrder.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }

      let shippingAddress = guestOrder.shippingAddress || {};
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
      }

      formattedOrder = {
        id: guestOrder.orderNumber,
        orderNumber: guestOrder.orderNumber,
        customerName: guestOrder.guestName || '',
        customerPhone: guestOrder.guestPhone || '',
        customerEmail: guestOrder.guestEmail || '',
        customerAddress: typeof shippingAddress === 'object' ? (shippingAddress.address || shippingAddress.street || '') : '',
        city: typeof shippingAddress === 'object' ? (shippingAddress.city || '') : '',
        total: guestOrder.total || 0,
        subtotal: guestOrder.total || 0,
        tax: 0,
        shipping: guestOrder.shippingCost || 0,
        status: guestOrder.status?.toLowerCase() || 'pending',
        paymentStatus: 'pending',
        paymentMethod: guestOrder.paymentMethod?.toLowerCase() || 'cash_on_delivery',
        shippingAddress: shippingAddress,
        // ✅ FIX: Async map to fetch variant details if missing
        items: await Promise.all((Array.isArray(items) ? items : []).map(async (item) => {
          let color = item.productColor || item.color || (item.metadata && item.metadata.color) || '';
          let size = item.productSize || item.size || (item.metadata && item.metadata.size) || '';
          let details = item.productDetails || item.details || (item.metadata && item.metadata.details) || '';

          // If color/size/details missing but variantId exists, fetch from DB
          if ((!color || !size || !details) && item.variantId) {
            try {
              const variant = await getSharedPrismaClient().productVariant.findUnique({
                where: { id: item.variantId }
              });
              if (variant) {
                // 1. Try direct fields
                if (!color) color = variant.color || '';
                if (!size) size = variant.size || '';

                // 2. Try metadata attributes (fallback)
                if ((!color || !size || !details) && variant.metadata) {
                  try {
                    const metadata = typeof variant.metadata === 'string'
                      ? JSON.parse(variant.metadata)
                      : variant.metadata;

                    if (metadata && metadata.attributeValues) {
                      // Try Arabic keys first
                      if (!color) color = metadata.attributeValues['اللون'] || metadata.attributeValues['color'] || metadata.attributeValues['Color'] || '';
                      if (!size) size = metadata.attributeValues['المقاس'] || metadata.attributeValues['size'] || metadata.attributeValues['Size'] || '';
                      if (!details) details = metadata.attributeValues['التفاصيل'] || metadata.attributeValues['details'] || metadata.attributeValues['Details'] || '';
                    }
                  } catch (e) {
                    // Ignore parse error
                  }
                }

                // 3. Try parsing from name as last resort (e.g. "ابيض - 38")
                if ((!color || !size) && variant.name && variant.name.includes('-')) {
                  const parts = variant.name.split('-').map(p => p.trim());
                  if (parts.length >= 2) {
                    // Assuming format like "Color - Size" or "Attribute1 - Attribute2"
                    // This is a guess, but better than nothing
                    if (!color && isNaN(parts[0])) color = parts[0];
                    if (!size) size = parts[parts.length - 1];
                  }
                }
              }
            } catch (e) {
              console.warn(`Error fetching variant ${item.variantId}:`, e.message);
            }
          }

          return {
            id: item.productId || item.id || '',
            productId: item.productId || '',
            productName: item.name || item.productName || 'منتج غير محدد',
            name: item.name || item.productName || 'منتج غير محدد',
            // ✅ FIX: Add productColor, productSize, and productDetails directly for frontend
            productColor: color,
            productSize: size,
            productDetails: details,
            productImage: item.image || (item.metadata && (item.metadata.image || item.metadata.productImage)) || '',
            price: item.price || 0,
            quantity: item.quantity || 1,
            total: (item.price || 0) * (item.quantity || 1),
            metadata: {
              ...(item.metadata || {}),
              color: color,
              size: size,
              details: details,
              image: item.image || (item.metadata && (item.metadata.image || item.metadata.productImage)) || ''
            }
          };
        })),
        trackingNumber: null,
        notes: guestOrder.notes || '',
        createdAt: guestOrder.createdAt,
        updatedAt: guestOrder.updatedAt,
        metadata: { source: 'storefront', isGuestOrder: true },
        // ✅ Turbo Shipping Fields - Get from GuestOrder
        turboShipmentId: guestOrder.turboShipmentId || null,
        turboTrackingNumber: guestOrder.turboTrackingNumber || null,
        turboShipmentStatus: guestOrder.turboShipmentStatus || null,
        turboLabelUrl: guestOrder.turboLabelUrl || null,
        turboMetadata: guestOrder.turboMetadata || null,
        orderNotes: guestOrder.order_notes || [], // ✅ FIX: Use snake_case from DB
        statusHistory: guestOrder.statusHistory || []
      };

      console.log('📦 [ORDER-DETAIL] GuestOrder Turbo fields:', {
        turboShipmentId: formattedOrder.turboShipmentId,
        turboTrackingNumber: formattedOrder.turboTrackingNumber,
        turboShipmentStatus: formattedOrder.turboShipmentStatus,
        turboLabelUrl: formattedOrder.turboLabelUrl,
        turboMetadata: formattedOrder.turboMetadata ? 'exists' : 'null'
      });
    } else {
      // Format regular order
      // Parse shippingAddress if it's a JSON string
      let shippingAddress = order.shippingAddress || '';
      try {
        if (typeof shippingAddress === 'string' && shippingAddress.startsWith('{')) {
          shippingAddress = JSON.parse(shippingAddress);
        }
      } catch (e) {
        // Keep as string if parsing fails
      }

      // تحويل البيانات للصيغة المتوافقة مع الـ frontend
      // PRIORITY: Use order.customerName from WooCommerce first
      let finalCustomerName = '';

      // First: Try order.customerName (from WooCommerce)
      if (order.customerName && order.customerName.trim()) {
        finalCustomerName = order.customerName.trim();
      }
      // Second: Fallback to Customer relation if customerName is empty
      else if (order.customer) {
        const firstName = order.customer.firstName || '';
        const lastName = order.customer.lastName || '';
        finalCustomerName = `${firstName} ${lastName}`.trim();
      }
      // Final fallback: empty string
      else {
        finalCustomerName = '';
      }

      formattedOrder = {
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerName: finalCustomerName,
        customerPhone: order.customerPhone || order.customer?.phone || '',
        customerEmail: order.customerEmail || order.customer?.email || '',
        customerAddress: order.customerAddress || '',
        city: order.city || '',
        governorate: order.governorate || '',
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        status: order.status.toLowerCase(),
        paymentStatus: order.paymentStatus.toLowerCase(),
        paymentMethod: order.paymentMethod.toLowerCase().replace('_', '_on_'),
        shippingAddress: shippingAddress,
        items: order.orderItems.map(item => {
          const parsedMetadata = JSON.parse(item.metadata || '{}');
          return {
            id: item.id,
            productId: item.productId,
            name: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productName: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            // ✅ FIX: Add productColor, productSize, and productDetails directly for frontend
            productColor: item.productColor || parsedMetadata.color || parsedMetadata.productColor || parsedMetadata.originalData?.productColor || '',
            productSize: item.productSize || parsedMetadata.size || parsedMetadata.productSize || parsedMetadata.originalData?.productSize || '',
            productDetails: item.productDetails || parsedMetadata.details || parsedMetadata.productDetails || '',
            productImage: (() => {
              if (item.product?.images) {
                try {
                  const images = typeof item.product.images === 'string' ? JSON.parse(item.product.images) : item.product.images;
                  return Array.isArray(images) ? images[0] : null;
                } catch (e) { return null; }
              }
              return parsedMetadata.image || parsedMetadata.productImage || null;
            })(),
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            metadata: {
              ...parsedMetadata,
              color: item.productColor || parsedMetadata.color || parsedMetadata.productColor,
              size: item.productSize || parsedMetadata.size || parsedMetadata.productSize,
              details: item.productDetails || parsedMetadata.details || parsedMetadata.productDetails,
              image: item.product?.images ? (typeof item.product.images === 'string' ? JSON.parse(item.product.images)[0] : item.product.images[0]) : (parsedMetadata.image || parsedMetadata.productImage)
            }
          };
        }),
        trackingNumber: order.trackingNumber,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        metadata: order.metadata ? JSON.parse(order.metadata) : {},
        // Turbo Shipping Fields
        turboShipmentId: order.turboShipmentId,
        turboTrackingNumber: order.turboTrackingNumber,
        turboShipmentStatus: order.turboShipmentStatus,
        turboLabelUrl: order.turboLabelUrl,
        turboMetadata: order.turboMetadata,
        turboBranchId: order.turboBranchId,
        // Source & Meta Fields
        sourceType: order.sourceType || 'unknown',
        extractionMethod: order.extractionMethod || 'unknown',
        orderSource: order.orderSource || 'REGULAR',
        conversationId: order.conversationId,
        conversation: order.conversation,
        affiliateId: order.affiliateId,
        affiliate: order.affiliate,
        createdBy: order.createdBy,
        createdByName: order.createdByName,
        createdByUser: order.createdByUser,
        // Scheduled Order Fields
        isScheduled: order.isScheduled || false,
        scheduledDeliveryDate: order.scheduledDeliveryDate || null,
        scheduledNotes: order.scheduledNotes || null,
        autoTransitionEnabled: order.autoTransitionEnabled || false,
        scheduledTransitionedAt: order.scheduledTransitionedAt || null,
        orderNotes: order.orderNotes || [],
        statusHistory: order.statusHistory || []
      };

      console.log('📦 [ORDER-DETAIL] Regular Order Turbo fields:', {
        turboShipmentId: formattedOrder.turboShipmentId,
        turboTrackingNumber: formattedOrder.turboTrackingNumber,
        turboShipmentStatus: formattedOrder.turboShipmentStatus,
        turboLabelUrl: formattedOrder.turboLabelUrl,
        turboMetadata: formattedOrder.turboMetadata ? 'exists' : 'null'
      });
    }

    res.json({
      success: true,
      data: formattedOrder
    });

  } catch (error) {
    console.error('❌ Error fetching simple order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلب',
      error: error.message
    });
  }
});

// الحصول على طلب محدد
router.get('/:orderNumber', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await orderService.getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلب',
      error: error.message
    });
  }
});

// تحديث حالة الطلب
router.patch('/:orderNumber/status', requireAuth, async (req, res) => {
  console.log(`🔍 [ORDERS-ROUTE-DEBUG] PATCH /:orderNumber/status called:`);
  console.log(`   - Order Number: ${req.params.orderNumber}`);
  console.log(`   - New Status: ${req.body.status}`);
  console.log(`   - Company ID: ${req.user?.companyId}`);
  console.log(`   - User: ${req.user?.firstName} ${req.user?.lastName}`);

  try {
    const { orderNumber } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      console.log(`❌ [ORDERS-ROUTE-DEBUG] Missing status`);
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب مطلوبة'
      });
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'WOO_TAGHEZ'];
    if (!validStatuses.includes(status)) {
      console.log(`❌ [ORDERS-ROUTE-DEBUG] Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب غير صحيحة'
      });
    }

    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    console.log(`📞 [ORDERS-ROUTE-DEBUG] Calling orderService.updateOrderStatus...`);
    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';
    const order = await orderService.updateOrderStatus(orderNumber, companyId, status, notes, userId, userName);

    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الطلب',
      error: error.message
    });
  }
});

// تأكيد الطلب
router.post('/:orderNumber/confirm', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { shippingAddress } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const order = await orderService.confirmOrder(orderNumber, companyId, shippingAddress);

    res.json({
      success: true,
      message: 'تم تأكيد الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error confirming order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تأكيد الطلب',
      error: error.message
    });
  }
});

// إلغاء الطلب
router.post('/:orderNumber/cancel', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { reason } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const order = await orderService.cancelOrder(orderNumber, companyId, reason);

    res.json({
      success: true,
      message: 'تم إلغاء الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء الطلب',
      error: error.message
    });
  }
});

// إحصائيات الطلبات
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const { days = 30, companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const stats = await orderService.getOrderStats(companyId, parseInt(days));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الطلبات',
      error: error.message
    });
  }
});

// طلبات العميل
router.get('/customer/:customerId', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 10 } = req.query;
    const compID = req.user?.companyId;
    if (!compID) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const orders = await orderService.getCustomerOrders(customerId, compID, parseInt(limit));

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب طلبات العميل',
      error: error.message
    });
  }
});

// إنشاء طلب بسيط من المحادثة (باستخدام EnhancedOrderService)
router.post('/simple', requireAuth, async (req, res) => {
  try {
    const EnhancedOrderService = require('../services/enhancedOrderService');
    const enhancedOrderService = new EnhancedOrderService();

    const companyId = req.user?.companyId;

    // 🔍 Check if user has an affiliate profile (regardless of role)
    let affiliateId = null;
    let orderSource = 'manual';

    console.log('🔍 [ORDER-DEBUG] Checking affiliate for userId:', req.user?.id, 'Role:', req.user?.role);

    try {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      const affiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });

      console.log('🔍 [ORDER-DEBUG] Affiliate query result:', affiliate ? `Found ID: ${affiliate.id}` : 'Not Found');

      // Only set affiliateId if one exists AND the user explicitly wants to act as affiliate
      // OR if they are strictly an AFFILIATE role
      // For now, let's assume if they have an affiliate profile, they get the commission
      if (affiliate) {
        affiliateId = affiliate.id;
        orderSource = 'AFFILIATE_DIRECT';
        console.log('✅ [ORDER-DEBUG] Affiliate detected:', { affiliateId, userId: req.user.id, role: req.user.role });
      }
    } catch (affiliateError) {
      console.error('⚠️ [ORDER-DEBUG] Error fetching affiliate:', affiliateError);
    }

    const {
      customerId,
      conversationId,
      items,
      subtotal,
      shipping,
      total,
      city,
      customerPhone,
      shippingAddress,
      notes
    } = req.body;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    // التحقق من البيانات المطلوبة
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الطلب غير مكتملة'
      });
    }

    // ✨ Logging للبيانات المستلمة من Frontend
    console.log('🔍 [ORDER-DEBUG] Received items from Frontend:', JSON.stringify(items, null, 2));

    // تحويل items للصيغة المتوافقة مع EnhancedOrderService
    const products = items.map(item => {
      console.log(`🔍 [ORDER-DEBUG] Processing item:`, {
        productName: item.productName,
        productColor: item.productColor,
        productSize: item.productSize,
        variantId: item.variantId
      });

      return {
        productId: item.productId,
        productName: item.productName,
        productColor: item.productColor,
        productSize: item.productSize,
        price: parseFloat(item.price),
        quantity: item.quantity,
        total: parseFloat(item.total),
        variantId: item.variantId
      };
    });

    console.log('✅ [ORDER-DEBUG] Converted products:', JSON.stringify(products, null, 2));

    // تحضير بيانات الطلب بنفس صيغة الـ AI
    const orderData = {
      companyId,
      customerId,
      conversationId,

      // معلومات المنتجات
      productName: products.map(p => p.productName).join(', '),
      productColor: products[0]?.productColor,
      productSize: products[0]?.productSize,
      productPrice: products[0]?.price,
      quantity: products.reduce((sum, p) => sum + p.quantity, 0),

      // معلومات الشحن
      customerAddress: shippingAddress || '',
      city: city || 'غير محدد',
      customerPhone: customerPhone || '',

      // التكاليف
      subtotal: parseFloat(subtotal) || 0,
      shipping: parseFloat(shipping) || 0,
      total: parseFloat(total) || 0,

      // ملاحظات
      notes: notes || '',

      // معلومات الاستخراج
      extractionMethod: 'manual_order_modal',
      confidence: 1.0,
      sourceType: 'manual',

      // Affiliate info
      ...(affiliateId && { affiliateId, orderSource }),

      // Creator info
      createdBy: req.user.id,
      createdByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,

      // المنتجات للحفظ في OrderItems
      products: products
    };

    console.log('📝 [ORDER-DEBUG] Final orderData:', {
      companyId,
      customerId,
      conversationId,
      itemsCount: products.length,
      total: orderData.total,
      affiliateId: orderData.affiliateId || 'NOT SET',
      orderSource: orderData.orderSource || 'NOT SET',
      firstProductColor: orderData.productColor,
      firstProductSize: orderData.productSize,
      allProducts: products.map(p => ({
        name: p.productName,
        color: p.productColor,
        size: p.productSize
      }))
    });

    // إنشاء الطلب باستخدام نفس service الـ AI
    const result = await enhancedOrderService.createEnhancedOrder(orderData);
    await enhancedOrderService.disconnect();

    if (result.success) {
      console.log('✅ Order created successfully:', result.order.orderNumber);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الطلب بنجاح',
        data: result.order
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الطلب',
      error: error.message
    });
  }
});

// إنشاء طلب بسيط (للاختبار)
router.post('/create-simple', requireAuth, async (req, res) => {
  try {
    const orderData = req.body;

    // التحقق من البيانات المطلوبة
    const requiredFields = ['productName', 'productPrice'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} مطلوب`
        });
      }
    }

    const result = await simpleOrderService.createSimpleOrder(orderData);

    // حفظ الطلب في ملف
    await simpleOrderService.saveOrderToFile(result.order);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: result.order
    });

  } catch (error) {
    console.error('❌ Error creating simple order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الطلب',
      error: error.message
    });
  }
});

// إنشاء طلب يدوي (للاختبار)
router.post('/create', requireAuth, async (req, res) => {
  try {
    const orderData = req.body;

    // التحقق من البيانات المطلوبة
    const requiredFields = ['customerId', 'companyId', 'productName', 'productPrice'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} مطلوب`
        });
      }
    }

    const order = await orderService.createOrderFromConversation(orderData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الطلب',
      error: error.message
    });
  }
});

// Bulk Status Update
router.post('/bulk/status', requireAuth, async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Order IDs required' });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status required' });
    }

    // Update Regular Orders
    const regularUpdate = await getSharedPrismaClient().order.updateMany({
      where: {
        companyId,
        orderNumber: { in: orderIds }
      },
      data: {
        status: status.toUpperCase(),
        updatedAt: new Date()
      }
    });

    // Update Guest Orders
    const guestUpdate = await getSharedPrismaClient().guestOrder.updateMany({
      where: {
        companyId,
        orderNumber: { in: orderIds }
      },
      data: {
        status: status.toLowerCase(), // Guest orders often use lowercase
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Orders updated successfully',
      data: {
        regularUpdated: regularUpdate.count,
        guestUpdated: guestUpdate.count
      }
    });

  } catch (error) {
    console.error('❌ Error bulk updating orders:', error);
    res.status(500).json({ success: false, message: 'Failed to update orders', error: error.message });
  }
});

// Bulk Delete
router.post('/bulk/delete', requireAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Order IDs required' });
    }

    // Delete Regular Orders
    const regularDelete = await getSharedPrismaClient().order.deleteMany({
      where: {
        companyId,
        orderNumber: { in: orderIds }
      }
    });

    // Delete Guest Orders
    const guestDelete = await getSharedPrismaClient().guestOrder.deleteMany({
      where: {
        companyId,
        orderNumber: { in: orderIds }
      }
    });

    res.json({
      success: true,
      message: 'Orders deleted successfully',
      data: {
        regularDeleted: regularDelete.count,
        guestDeleted: guestDelete.count
      }
    });

  } catch (error) {
    console.error('❌ Error bulk deleting orders:', error);
    res.status(500).json({ success: false, message: 'Failed to delete orders', error: error.message });
  }
});

// Export Orders
router.get('/export', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { status, paymentStatus, search, startDate, endDate } = req.query;

    // Build Filters (Same as /simple)
    const whereClause = { companyId };
    const guestWhereClause = { companyId };

    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase();
      guestWhereClause.status = status.toLowerCase();
    }

    if (paymentStatus && paymentStatus !== 'all') {
      whereClause.paymentStatus = paymentStatus.toUpperCase();
      // Guest orders logic for payment status (simplified)
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      guestWhereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
        guestWhereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
        guestWhereClause.createdAt.lte = end;
      }
    }

    if (search) {
      const searchCondition = {
        OR: [
          { orderNumber: { contains: search } },
          { customer: { firstName: { contains: search } } },
          { customer: { lastName: { contains: search } } },
          { customer: { phone: { contains: search } } }
        ]
      };
      Object.assign(whereClause, searchCondition);

      const guestSearchCondition = {
        OR: [
          { orderNumber: { contains: search } },
          { guestName: { contains: search } },
          { guestPhone: { contains: search } },
          { guestEmail: { contains: search } }
        ]
      };
      Object.assign(guestWhereClause, guestSearchCondition);
    }

    // Fetch All Data (No Pagination)
    const [regularOrders, guestOrders] = await Promise.all([
      getSharedPrismaClient().order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, orderItems: true }
      }),
      getSharedPrismaClient().guestOrder.findMany({
        where: guestWhereClause,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Format Data for Excel
    const allOrders = [
      ...regularOrders.map(o => ({
        'Order Number': o.orderNumber,
        'Date': o.createdAt,
        'Customer Name': o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : '',
        'Phone': o.customer?.phone || '',
        'Total': o.total,
        'Status': o.status,
        'Payment Status': o.paymentStatus,
        'Type': 'Regular'
      })),
      ...guestOrders.map(o => ({
        'Order Number': o.orderNumber,
        'Date': o.createdAt,
        'Customer Name': o.guestName || '',
        'Phone': o.guestPhone || '',
        'Total': o.total,
        'Status': o.status,
        'Payment Status': 'Pending',
        'Type': 'Guest'
      }))
    ].sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Create Workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(allOrders);
    xlsx.utils.book_append_sheet(wb, ws, 'Orders');

    // Generate Buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send Response
    res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error exporting orders:', error);
    res.status(500).json({ success: false, message: 'Export failed', error: error.message });
  }
});

// Update Order Details (Address, Notes, Alternative Phone, City, Governorate)
router.put('/simple/:orderNumber', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { shippingAddress, notes, customerName, customerPhone, alternativePhone, city, governorate } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // ✅ Validation: Check phone numbers if provided
    if (customerPhone) {
      const phoneValidation = validateEgyptianPhone(customerPhone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: phoneValidation.error || 'رقم الهاتف غير صحيح'
        });
      }
    }

    if (alternativePhone && alternativePhone.trim() !== '') {
      const altPhoneValidation = validateEgyptianPhone(alternativePhone);
      if (!altPhoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `الرقم البديل: ${altPhoneValidation.error}`
        });
      }
    }

    // Try Regular Order (search by id OR orderNumber)
    const regularOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (regularOrder) {
      let currentMetadata = {};
      try {
        currentMetadata = regularOrder.metadata ? JSON.parse(regularOrder.metadata) : {};
      } catch (e) {
        console.error('❌ [ORDER-UPDATE] Error parsing regularOrder metadata:', e);
        currentMetadata = {};
      }
      if (alternativePhone !== undefined) {
        currentMetadata.alternativePhone = alternativePhone;
      }

      // Handle shippingAddress - merge with governorate if provided
      let updatedShippingAddress = regularOrder.shippingAddress;
      if (shippingAddress || governorate !== undefined || city !== undefined) {
        try {
          // Parse existing shippingAddress if it's a string
          if (typeof updatedShippingAddress === 'string') {
            updatedShippingAddress = JSON.parse(updatedShippingAddress);
          } else if (!updatedShippingAddress || typeof updatedShippingAddress !== 'object') {
            updatedShippingAddress = {};
          }

          // Merge with new shippingAddress if provided
          if (shippingAddress) {
            updatedShippingAddress = { ...updatedShippingAddress, ...shippingAddress };
          }

          // Add governorate if provided
          if (governorate !== undefined && governorate !== null && governorate !== '') {
            updatedShippingAddress.governorate = governorate;
            console.log('✅ [ORDER-UPDATE] Setting governorate:', governorate);
          }

          // Add city if provided
          if (city !== undefined && city !== null && city !== '') {
            updatedShippingAddress.city = city;
            console.log('✅ [ORDER-UPDATE] Setting city:', city);
          }

          console.log('📦 [ORDER-UPDATE] Updated shippingAddress:', JSON.stringify(updatedShippingAddress));
        } catch (e) {
          console.error('❌ [ORDER-UPDATE] Error parsing shippingAddress:', e);
          // If parsing fails, create new object
          updatedShippingAddress = shippingAddress || { city, governorate };
        }
      }

      const updateData = {
        shippingAddress: updatedShippingAddress ? JSON.stringify(updatedShippingAddress) : undefined,
        notes: notes !== undefined ? notes : undefined,
        city: city !== undefined ? city : undefined,
        customerName: customerName !== undefined ? customerName : undefined, // ✅ FIX: Update customer name
        customerPhone: customerPhone !== undefined ? customerPhone : undefined, // ✅ FIX: Update customer phone
        metadata: JSON.stringify(currentMetadata),
        updatedAt: new Date()
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const updatedOrder = await getSharedPrismaClient().order.update({
        where: { id: regularOrder.id },
        data: updateData,
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true
            }
          },
          company: {
            select: {
              id: true,
              turboApiKey: true,
              turboEnabled: true
            }
          }
        }
      });

      // 🚚 Turbo Integration: تحديث الشحنة تلقائياً إذا كانت موجودة
      if (updatedOrder.turboShipmentId && updatedOrder.company?.turboEnabled && updatedOrder.company?.turboApiKey) {
        try {
          const TurboService = require('../services/turboService');
          const turboService = new TurboService(updatedOrder.company.turboApiKey, companyId);

          // تحضير بيانات الطلب
          const orderData = turboService.formatOrderForTurbo(updatedOrder, updatedOrder.customer, updatedOrder.items);

          // تحديث الشحنة
          await turboService.updateShipment(updatedOrder.turboShipmentId, orderData);

          console.log(`✅ [TURBO] Shipment updated automatically for order ${orderNumber}`);
        } catch (turboError) {
          // لا نوقف العملية إذا فشل Turbo - فقط نسجل الخطأ
          console.error(`❌ [TURBO] Failed to update shipment for order ${orderNumber}:`, turboError.message);
        }
      }

      // Socket Emit
      try {
        if (socketService?.getIO()) {
          socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
            orderNumber,
            ...updateData,
            shippingAddress: typeof updateData.shippingAddress === 'string' ? (function () {
              try { return JSON.parse(updateData.shippingAddress); } catch (e) { return {}; }
            })() : (updateData.shippingAddress || {})
          });
        }
      } catch (socketError) {
        console.error('❌ [ORDER-UPDATE] Error emitting socket update:', socketError);
      }

      return res.json({ success: true, message: 'Order updated successfully' });
    }

    // Try Guest Order (search by id OR orderNumber)
    const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (guestOrder) {
      let currentMetadata = { source: 'storefront', isGuestOrder: true };
      try {
        currentMetadata = guestOrder.metadata ? JSON.parse(guestOrder.metadata) : { source: 'storefront', isGuestOrder: true };
      } catch (e) {
        console.error('❌ [ORDER-UPDATE] Error parsing guestOrder metadata:', e);
        // keep default
      }
      if (alternativePhone !== undefined) {
        currentMetadata.alternativePhone = alternativePhone;
      }

      // Handle city and governorate for GuestOrder (stored in shippingAddress JSON)
      let updatedShippingAddress = guestOrder.shippingAddress;
      try {
        if (typeof updatedShippingAddress === 'string') {
          updatedShippingAddress = JSON.parse(updatedShippingAddress);
        }
        if (city !== undefined) {
          updatedShippingAddress.city = city;
        }
        if (governorate !== undefined) {
          updatedShippingAddress.governorate = governorate;
        }
        if (shippingAddress) {
          // Merge with new shippingAddress if provided
          updatedShippingAddress = { ...updatedShippingAddress, ...shippingAddress };
        }
      } catch (e) {
        // If parsing fails, create new object
        updatedShippingAddress = shippingAddress || { city, governorate };
      }

      const updateData = {
        shippingAddress: JSON.stringify(updatedShippingAddress),
        notes: notes !== undefined ? notes : undefined,
        guestName: customerName !== undefined ? customerName : undefined,
        guestPhone: customerPhone !== undefined ? customerPhone : undefined,
        // metadata: JSON.stringify(currentMetadata), // ❌ REMOVED: GuestOrder schema does not have metadata field
        updatedAt: new Date()
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      await getSharedPrismaClient().guestOrder.update({
        where: { id: guestOrder.id },
        data: updateData
      });

      // Socket Emit
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderNumber,
          shippingAddress,
          notes,
          customerName,
          customerPhone,
          metadata: currentMetadata
        });
      }

      return res.json({ success: true, message: 'Order updated successfully' });
    }

    res.status(404).json({ success: false, message: 'Order not found' });

  } catch (error) {
    console.error('❌ [ORDER-UPDATE] Error updating order:', error);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ success: false, message: 'Failed to update order', error: error.message });
  }
});

// Update Order Items
router.put('/simple/:orderNumber/items', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { items, total, subtotal, tax, shipping } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // ✅ Validation: Check items
    const itemsValidation = validateOrderItems(items);
    if (!itemsValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: itemsValidation.error || 'يوجد خطأ في المنتجات'
      });
    }

    // Try Regular Order (search by id OR orderNumber)
    const regularOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (regularOrder) {
      // Transaction: Delete old items, Create new items, Update totals
      await getSharedPrismaClient().$transaction(async (prisma) => {
        // Delete existing items
        await prisma.orderItem.deleteMany({
          where: { orderId: regularOrder.id }
        });

        // Create new items
        for (const item of items) {
          // التحقق من وجود المنتج قبل إضافته
          let validProductId = null;
          if (item.productId) {
            try {
              const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, companyId: true }
              });

              // التأكد من أن المنتج موجود وأنه تابع لنفس الشركة
              if (product && product.companyId === companyId) {
                validProductId = item.productId;
              } else {
                console.log(`⚠️ [ORDER-UPDATE] Product ${item.productId} not found or belongs to different company, using null`);
              }
            } catch (productError) {
              console.log(`⚠️ [ORDER-UPDATE] Error checking product ${item.productId}:`, productError.message);
            }
          }

          await prisma.orderItem.create({
            data: {
              orderId: regularOrder.id,
              productId: validProductId, // null إذا لم يكن المنتج موجوداً
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              productName: item.productName || item.name || null, // ✅ FIX: Persist product details
              productColor: item.productColor || item.color || null, // ✅ FIX: Persist product details
              productSize: item.productSize || item.size || null, // ✅ FIX: Persist product details
              productDetails: item.productDetails || item.details || null, // ✅ FIX: Persist product details
              productSku: item.productSku || item.sku || null,
              metadata: JSON.stringify(item.metadata || {})
            }
          });
        }

        // Update Order Totals
        await prisma.order.update({
          where: { id: regularOrder.id },
          data: {
            total,
            subtotal,
            tax,
            shipping,
            updatedAt: new Date()
          }
        });
      }, {
        maxWait: 30000,
        timeout: 30000
      });

      // Socket Emit
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderNumber,
          total,
          shipping,
          _refetch: true
        });
      }

      return res.json({ success: true, message: 'Order items updated successfully' });
    }

    // Try Guest Order
    const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: { orderNumber, companyId }
    });

    if (guestOrder) {
      // Guest Order stores items as JSON, much easier
      await getSharedPrismaClient().guestOrder.update({
        where: { id: guestOrder.id },
        data: {
          items: JSON.stringify(items),
          total,
          shippingCost: shipping,
          updatedAt: new Date()
        }
      });

      // Socket Emit
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderNumber,
          total,
          shipping,
          _refetch: true
        });
      }

      return res.json({ success: true, message: 'Order items updated successfully' });
    }

    res.status(404).json({ success: false, message: 'Order not found' });

  } catch (error) {
    console.error('❌ Error updating order items:', error);
    res.status(500).json({ success: false, message: 'Failed to update order items', error: error.message });
  }
});

module.exports = router;

const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getWooCommerceAutoExportService } = require('./wooCommerceAutoExportService');
const WalletService = require('./walletService');

class OrderService {
  constructor(companyId = null) {
    this.companyId = companyId;
    //console.log('🛒 OrderService initialized', companyId ? `for company ${companyId}` : 'without companyId');
  }

  setCompanyId(companyId) {
    this.companyId = companyId;
    return this;
  }

  getPrisma() {
    return getSharedPrismaClient();
  }

  // إنشاء طلب جديد من المحادثة (نسخة مبسطة)
  async createOrderFromConversation(data) {
    try {
      const {
        conversationId,
        customerId,
        companyId,
        productName,
        productColor,
        productSize,
        productPrice,
        quantity = 1,
        customerName,
        customerPhone,
        city,
        notes
      } = data;

      //console.log('🛒 Creating new order from conversation:', {
      //   conversationId,
      //   customerId,
      //   productName,
      //   productColor,
      //   productSize,
      //   productPrice,
      //   quantity
      // });

      // إنشاء رقم طلب فريد
      const orderNumber = await this.generateOrderNumber(companyId);

      // حساب المجموع
      const subtotal = parseFloat(productPrice) * quantity;
      const shipping = parseFloat(this.calculateShipping(city, subtotal));
      const total = subtotal + shipping;

      // إنشاء الطلب بدون items (سنضيفها لاحقاً)
      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.create({
          data: {
            orderNumber,
            customerId,
            companyId,
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: 0,
            shipping: parseFloat(shipping.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            currency: 'EGP',
            notes: `طلب من المحادثة\nالمنتج: ${productName}\nاللون: ${productColor}\nالمقاس: ${productSize}\nاسم العميل: ${customerName}\nالهاتف: ${customerPhone}\nالمدينة: ${city}\nالمحادثة: ${conversationId}\n${notes || ''}`,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            paymentMethod: 'CASH',
            isViewed: false
          }
        });
      }, 5);

      // جلب الطلب مع بيانات العميل
      const orderWithCustomer = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            customer: true
          }
        });
      }, 3);

      // تحديث إحصائيات العميل
      await this.updateCustomerStats(customerId, parseFloat(total));

      // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية)
      try {
        const wooExportService = getWooCommerceAutoExportService();
        wooExportService.exportOrderAsync(order.id);
      } catch (wooError) {
        console.log('⚠️ [ORDER-SERVICE] WooCommerce auto-export skipped:', wooError.message);
      }

      //console.log('✅ Order created successfully:', order.orderNumber);
      return orderWithCustomer;

    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  }

  // إنشاء رقم طلب فريد
  async generateOrderNumber(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;

    // Check if sequential numbering is enabled
    if (effectiveCompanyId) {
      const settings = await this.getOrderSettings(effectiveCompanyId);
      if (settings?.enableSequentialOrders) {
        return await this.getNextSequentialOrderNumber(effectiveCompanyId);
      }
    }

    // Fallback to timestamp-based numbering
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  // Get next sequential order number with atomic increment
  async getNextSequentialOrderNumber(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;
    if (!effectiveCompanyId) throw new Error('Company ID is required for sequential numbering');

    const prisma = this.getPrisma();

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get or create settings
      let settings = await tx.orderInvoiceSettings.findUnique({
        where: { companyId: effectiveCompanyId }
      });

      if (!settings) {
        // Create default settings if not exists
        settings = await tx.orderInvoiceSettings.create({
          data: {
            companyId: effectiveCompanyId,
            enableSequentialOrders: true,
            orderPrefix: 'ORD',
            nextOrderNumber: 1,
            orderNumberFormat: 'PREFIX-XXXXXX'
          }
        });
      }

      const currentNumber = settings.nextOrderNumber;
      const prefix = settings.orderPrefix || 'ORD';

      // Format number without leading zeros
      const paddedNumber = currentNumber.toString();
      const orderNumber = `${prefix}-${paddedNumber}`;

      // Increment for next order
      await tx.orderInvoiceSettings.update({
        where: { companyId: effectiveCompanyId },
        data: { nextOrderNumber: currentNumber + 1 }
      });

      return orderNumber;
    });

    return result;
  }

  // Get order settings
  async getOrderSettings(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;
    if (!effectiveCompanyId) return null;

    const prisma = this.getPrisma();
    return await prisma.orderInvoiceSettings.findUnique({
      where: { companyId: effectiveCompanyId }
    });
  }

  // حساب تكلفة الشحن
  calculateShipping(city, subtotal) {
    // شحن مجاني للطلبات أكثر من 250 جنيه
    if (subtotal >= 250) {
      return 0;
    }

    // تكلفة الشحن حسب المدينة
    const shippingRates = {
      'القاهرة': 50,
      'الإسكندرية': 50,
      'الجيزة': 50,
      'default': 75
    };

    return shippingRates[city] || shippingRates.default;
  }

  // البحث عن المنتج أو إنشاؤه
  async findOrCreateProduct(productName, companyId) {
    try {
      // البحث عن المنتج الموجود
      let product = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.product.findFirst({
          where: {
            name: productName,
            companyId
          }
        });
      }, 3);

      // إنشاء المنتج إذا لم يكن موجود
      if (!product) {
        product = await safeQuery(async () => {
          const prisma = this.getPrisma();
          return await prisma.product.create({
            data: {
              name: productName,
              sku: `AI-${Date.now()}`, // إنشاء SKU تلقائي
              companyId,
              price: 0, // سيتم تحديثه لاحقاً
              isActive: true,
              metadata: JSON.stringify({
                createdFromOrder: true,
                source: 'ai_agent'
              })
            }
          });
        }, 5);
        //console.log('📦 Created new product:', productName);
      }

      return product.id;
    } catch (error) {
      console.error('❌ Error finding/creating product:', error);
      // إرجاع null إذا فشل
      return null;
    }
  }

  // تحديث إحصائيات العميل
  async updateCustomerStats(customerId, orderTotal) {
    try {
      // التحقق من وجود العميل أولاً
      const customer = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.customer.findUnique({
          where: { id: customerId }
        });
      }, 3);

      if (customer) {
        await safeQuery(async () => {
          const prisma = this.getPrisma();
          return await prisma.customer.update({
            where: { id: customerId },
            data: {
              orderCount: { increment: 1 },
              totalSpent: { increment: parseFloat(orderTotal) },
              lastOrderAt: new Date()
            }
          });
        }, 5);
        //console.log('📊 Customer stats updated');
      }
    } catch (error) {
      console.error('❌ Error updating customer stats:', error);
    }
  }

  // الحصول على طلبات العميل
  async getCustomerOrders(customerId, companyId, limit = 10) {
    try {
      const orders = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.findMany({
          where: {
            customerId,
            companyId // ✅ SECURITY: Ensure company isolation
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        });
      }, 3);

      return orders;
    } catch (error) {
      console.error('❌ Error fetching customer orders:', error);
      return [];
    }
  }

  // الحصول على طلب بالرقم
  async getOrderByNumber(orderNumber, companyId) {
    try {
      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();
        // Search by id OR orderNumber
        return await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            },
            customer: true
          }
        });
      }, 3);

      return order;
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      return null;
    }
  }

  // تحديث حالة الطلب
  async updateOrderStatus(orderNumber, companyId, status, notes = null, userId = null, userName = null) {
    console.log(`🔄 [ORDER-SERVICE-DEBUG] updateOrderStatus called:`);
    console.log(`   - Order Number: ${orderNumber}`);
    console.log(`   - New Status: ${status}`);
    console.log(`   - Notes: ${notes || 'None'}`);
    console.log(`   - Company ID: ${companyId}`);
    console.log(`   - User ID: ${userId || 'None'}`);
    console.log(`   - User Name: ${userName || 'None'}`);

    try {
      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();

        // 🔍 Debug: Log exact search parameters
        console.log(`🔍 [ORDER-SERVICE-SEARCH] Searching for order:`, {
          orderNumber,
          companyId,
          orderNumberType: typeof orderNumber,
          companyIdType: typeof companyId
        });

        // Find order first to ensure it belongs to company (search by id OR orderNumber)
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          }
        });

        console.log(`🔍 [ORDER-SERVICE-SEARCH] Search result:`, {
          found: !!existingOrder,
          orderId: existingOrder?.id,
          orderNumber: existingOrder?.orderNumber,
          orderCompanyId: existingOrder?.companyId
        });

        if (!existingOrder) {
          // Try to find the order without companyId filter to see if it exists at all
          const orderWithoutCompanyFilter = await prisma.order.findFirst({
            where: {
              OR: [
                { id: orderNumber },
                { orderNumber: orderNumber }
              ]
            }
          });

          if (orderWithoutCompanyFilter) {
            console.error(`❌ [ORDER-SERVICE] Order found but belongs to different company:`, {
              orderNumber,
              requestedCompanyId: companyId,
              actualCompanyId: orderWithoutCompanyFilter.companyId
            });
            throw new Error('الطلب غير موجود أو غير تابع لهذه الشركة');
          } else {
            console.error(`❌ [ORDER-SERVICE] Order not found in database:`, { orderNumber });
            throw new Error('الطلب غير موجود أو غير تابع لهذه الشركة');
          }
        }
        // Enforce allowed transitions if configured
        try {
          const statusConfig = await prisma.orderStatusConfig.findFirst({
            where: {
              companyId: existingOrder.companyId,
              code: existingOrder.status,
              statusType: 'order',
              isActive: true
            }
          });
          if (statusConfig?.allowedNextStatuses) {
            let allowed = null;
            try { allowed = JSON.parse(statusConfig.allowedNextStatuses); } catch (e) { allowed = null; }
            if (Array.isArray(allowed) && !allowed.includes(status)) {
              throw new Error(`لا يمكن الانتقال من الحالة ${existingOrder.status} إلى ${status}`);
            }
          }
        } catch (transitionError) {
          console.error('❌ [ORDER-SERVICE] Invalid status transition:', transitionError.message);
          throw transitionError;
        }

        return await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            status,
            notes: notes || undefined,
            updatedAt: new Date(),
            statusHistory: {
              create: {
                status: status,
                oldStatus: existingOrder.status,
                changedBy: userId,
                userName: userName,
                reason: notes || undefined
              }
            }
          },
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
                turboEnabled: true,
                turboAutoCreate: true
              }
            }
          }
        });
      }, 5);

      // 🚚 Turbo Integration: إنشاء شحنة تلقائياً إذا تم تحديث الحالة إلى CONFIRMED
      console.log(`🔍 [TURBO-DEBUG] Checking auto shipment for order ${orderNumber}:`);
      console.log(`   - New Status: ${status}`);
      console.log(`   - Company ID: ${order.companyId}`);
      console.log(`   - Turbo Enabled: ${order.company?.turboEnabled}`);
      console.log(`   - Auto Create: ${order.company?.turboAutoCreate}`);
      console.log(`   - Has API Key: ${order.company?.turboApiKey ? 'Yes' : 'No'}`);
      console.log(`   - Existing Shipment ID: ${order.turboShipmentId || 'None'}`);

      if (status === 'CONFIRMED' && order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey) {
        console.log(`✅ [TURBO-DEBUG] All conditions met for auto shipment creation`);
        try {
          // التحقق من عدم وجود شحنة سابقة
          if (!order.turboShipmentId) {
            console.log(`🚀 [TURBO-DEBUG] Creating new shipment for order ${orderNumber}`);
            const TurboService = require('./turboService');
            const turboService = new TurboService(order.company.turboApiKey, order.companyId);

            // تحضير بيانات الطلب
            console.log(`📋 [TURBO-DEBUG] Formatting order data...`);
            const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);
            console.log(`📋 [TURBO-DEBUG] Order data prepared:`, {
              customerName: orderData.customerName,
              customerPhone: orderData.customerPhone,
              city: orderData.city,
              governorate: orderData.governorate,
              itemsCount: orderData.items?.length || 0
            });

            // إنشاء الشحنة
            console.log(`📦 [TURBO-DEBUG] Calling Turbo API...`);
            const shipmentResult = await turboService.createShipment(orderData);
            console.log(`📦 [TURBO-DEBUG] Turbo API response:`, {
              success: shipmentResult.success,
              shipmentId: shipmentResult.shipmentId,
              trackingNumber: shipmentResult.trackingNumber,
              status: shipmentResult.status
            });

            // حفظ معلومات الشحنة في قاعدة البيانات
            console.log(`💾 [TURBO-DEBUG] Saving shipment data to database...`);
            await safeQuery(async () => {
              const prisma = this.getPrisma();
              return await prisma.order.update({
                where: { id: order.id },
                data: {
                  turboShipmentId: String(shipmentResult.shipmentId || ''),
                  turboTrackingNumber: String(shipmentResult.trackingNumber || ''),
                  turboShipmentStatus: shipmentResult.status,
                  turboLabelUrl: shipmentResult.labelUrl,
                  turboMetadata: JSON.stringify(shipmentResult.data)
                }
              });
            }, 3);

            console.log(`✅ [TURBO] Shipment created automatically for order ${orderNumber}: ${shipmentResult.trackingNumber}`);
          } else {
            console.log(`ℹ️ [TURBO] Shipment already exists for order ${orderNumber}: ${order.turboTrackingNumber}`);
          }
        } catch (turboError) {
          // لا نوقف العملية إذا فشل Turbo - فقط نسجل الخطأ
          console.error(`❌ [TURBO] Failed to create shipment for order ${orderNumber}:`, turboError.message);
          console.error(`❌ [TURBO-DEBUG] Full error:`, turboError);
        }
      } else {
        console.log(`❌ [TURBO-DEBUG] Auto shipment conditions not met:`);
        if (status !== 'CONFIRMED') console.log(`   - Status is '${status}', not 'CONFIRMED'`);
        if (!order.company?.turboEnabled) console.log(`   - Turbo not enabled`);
        if (!order.company?.turboAutoCreate) console.log(`   - Auto create disabled`);
        if (!order.company?.turboApiKey) console.log(`   - No API key`);
      }

      // 🔄 Returns Integration: إنشاء طلب إرجاع تلقائياً إذا كانت الحالة "مسترد" أو "مرتجع"
      // 🔄 Returns Integration: إنشاء طلب إرجاع تلقائياً إذا كانت الحالة "مسترد" أو "مرتجع"
      const returnStatuses = ['REFUNDED', 'RETURNED', 'PARTIALLY_REFUNDED'];

      let shouldCreateReturn = returnStatuses.includes(status);

      // If not a direct match, check if it maps to a system return status
      if (!shouldCreateReturn) {
        try {
          const newStatusConfig = await prisma.orderStatusConfig.findFirst({
            where: {
              companyId: existingOrder.companyId,
              code: status,
              statusType: 'order',
              isActive: true
            }
          });

          if (newStatusConfig && newStatusConfig.mapsToSystem && returnStatuses.includes(newStatusConfig.mapsToSystem)) {
            shouldCreateReturn = true;
            console.log(`🔄 [RETURNS-AUTO] Custom status '${status}' maps to '${newStatusConfig.mapsToSystem}', triggering return request.`);
          }
        } catch (configError) {
          console.warn('⚠️ [RETURNS-AUTO] Failed to check status config mapping:', configError.message);
        }
      }

      if (shouldCreateReturn) {
        console.log(`🔄 [RETURNS-AUTO] Triggering auto return request for order ${orderNumber} (Status: ${status})`);
        try {
          await this.autoCreateReturnRequest(order, userId, status);
        } catch (returnError) {
          console.error(`❌ [RETURNS-AUTO] Failed to create auto return request for order ${orderNumber}:`, returnError.message);
        }
      }

      // 💰 Affiliate & Commission: حساب العمولات عند تأكيد الطلب
      if (status === 'CONFIRMED' || status === 'DELIVERED') {
        try {
          const commissionService = require('./commissionService');
          const dropshippingService = require('./dropshippingService');

          // التحقق من وجود عمولات سابقة
          const prisma = this.getPrisma();
          const existingCommissions = await prisma.commission.findMany({
            where: { orderId: order.id }
          });

          if (existingCommissions.length === 0) {
            // توجيه الطلب للتاجر إذا كان dropshipped
            if (order.isDropshipped || order.orderItems?.some(item => item.product?.isDropshipped)) {
              await dropshippingService.routeOrderToMerchant(order.id);
            }

            // حساب العمولات
            await commissionService.calculateCommissions(order.id);
            console.log(`✅ [COMMISSION] Calculated commissions for order ${orderNumber}`);
          }
        } catch (commissionError) {
          console.error(`❌ [COMMISSION] Failed to calculate commissions for order ${orderNumber}:`, commissionError.message);
          // لا نوقف العملية إذا فشل حساب العمولات
        }
      }

      // 💰 Cashback: إضافة كاش باك عند تأكيد الطلب
      if (status === 'DELIVERED') {
        try {
          // التحقق من وجود cashback سابق
          const prisma = this.getPrisma();
          const existingCashback = await prisma.walletTransaction.findFirst({
            where: {
              orderId: order.id,
              type: 'CASHBACK'
            }
          });

          if (!existingCashback && order.customerId) {
            // إضافة 5% cashback
            const baseAmount = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
            await WalletService.addCashback(
              order.customerId,
              order.id,
              baseAmount,
              0.05 // 5% cashback
            );
            console.log(`💰 [CASHBACK] Added 5% cashback (${baseAmount * 0.05} EGP) for order ${orderNumber}`);
          }
        } catch (cashbackError) {
          console.error(`❌ [CASHBACK] Failed to add cashback for order ${orderNumber}:`, cashbackError.message);
          // لا نوقف العملية إذا فشل إضافة الكاش باك
        }
      }

      //console.log(`✅ Order ${orderNumber} status updated to ${status}`);
      return order;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  // إنشاء طلب إرجاع تلقائياً
  async autoCreateReturnRequest(order, userId, status) {
    try {
      const prisma = this.getPrisma();

      // التحقق من عدم وجود طلب إرجاع مسبق
      const existingRequest = await prisma.returnRequest.findFirst({
        where: { orderId: order.id }
      });

      if (existingRequest) {
        console.log(`ℹ️ [RETURNS-AUTO] Return request already exists for order ${order.orderNumber}`);
        return;
      }

      // البحث عن سبب افتراضي أو إنشاء واحد
      let reason = await prisma.returnReason.findFirst({
        where: { companyId: order.companyId, isActive: true }
      });

      if (!reason) {
        console.log(`ℹ️ [RETURNS-AUTO] No return reasons found, creating a default one...`);
        reason = await prisma.returnReason.create({
          data: {
            reason: 'تغيير حالة تلقائي',
            description: 'تم إنشاء هذا السبب تلقائياً من نظام إدارة الطلبات',
            companyId: order.companyId
          }
        });
      }

      // إنشاء طلب الإرجاع
      const request = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          companyId: order.companyId,
          reasonId: reason.id,
          status: 'PENDING',
          adminNotes: `تم إنشاء هذا الطلب تلقائياً عند تغيير حالة الطلب الأصلي إلى: ${status}`,
          responsibleParty: 'OTHER',
          isReviewed: false
        }
      });

      // تسجيل هذا الإجراء في سجل نشاط المرتجع
      await prisma.returnActivityLog.create({
        data: {
          returnRequestId: request.id,
          userId: userId || undefined,
          action: 'AUTO_CREATED',
          details: `تم إنشاء الطلب تلقائياً بسبب تحديث حالة الطلب لـ ${status}`
        }
      });

      console.log(`✅ [RETURNS-AUTO] Return request ${request.id} created automatically for order ${order.orderNumber}`);
    } catch (error) {
      console.error('❌ [RETURNS-AUTO] Error in autoCreateReturnRequest:', error);
      throw error;
    }
  }

  // تأكيد الطلب
  async confirmOrder(orderNumber, companyId, shippingAddress = null) {
    try {
      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();

        // Find order first to ensure it belongs to company (search by id OR orderNumber)
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          }
        });

        if (!existingOrder) {
          throw new Error('الطلب غير موجود أو غير تابع لهذه الشركة');
        }

        return await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            status: 'CONFIRMED',
            shippingAddress: shippingAddress || undefined,
            updatedAt: new Date(),
            statusHistory: {
              create: {
                status: 'CONFIRMED',
                oldStatus: existingOrder.status,
                changedBy: null,
                userName: null,
                reason: 'Order confirmed'
              }
            }
          },
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
                turboEnabled: true,
                turboAutoCreate: true
              }
            }
          }
        });
      }, 5);

      // 🚚 Turbo Integration: إنشاء شحنة تلقائياً إذا كان مفعّل
      if (order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey) {
        try {
          const TurboService = require('./turboService');
          const turboService = new TurboService(order.company.turboApiKey, order.companyId);

          // تحضير بيانات الطلب
          const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

          // إنشاء الشحنة
          const shipmentResult = await turboService.createShipment(orderData);

          // حفظ معلومات الشحنة في قاعدة البيانات
          await safeQuery(async () => {
            const prisma = this.getPrisma();
            return await prisma.order.update({
              where: { id: order.id },
              data: {
                turboShipmentId: String(shipmentResult.shipmentId || ''),
                turboTrackingNumber: String(shipmentResult.trackingNumber || ''),
                turboShipmentStatus: shipmentResult.status,
                turboLabelUrl: shipmentResult.labelUrl,
                turboMetadata: JSON.stringify(shipmentResult.data)
              }
            });
          }, 3);

          console.log(`✅ [TURBO] Shipment created automatically for order ${orderNumber}: ${shipmentResult.trackingNumber}`);
        } catch (turboError) {
          // لا نوقف العملية إذا فشل Turbo - فقط نسجل الخطأ
          console.error(`❌ [TURBO] Failed to create shipment for order ${orderNumber}:`, turboError.message);
        }
      }

      //console.log(`✅ Order ${orderNumber} confirmed`);
      return order;
    } catch (error) {
      console.error('❌ Error confirming order:', error);
      throw error;
    }
  }

  // إلغاء الطلب
  async cancelOrder(orderNumber, companyId, reason = null) {
    try {
      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();

        // Find order first to ensure it belongs to company (search by id OR orderNumber)
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          }
        });

        if (!existingOrder) {
          throw new Error('الطلب غير موجود أو غير تابع لهذه الشركة');
        }

        return await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            status: 'CANCELLED',
            notes: reason || 'تم إلغاء الطلب',
            updatedAt: new Date()
          }
        });
      }, 5);

      // تحديث إحصائيات العميل (تقليل العدد والمبلغ)
      await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.customer.update({
          where: { id: order.customerId },
          data: {
            orderCount: { decrement: 1 },
            totalSpent: { decrement: parseFloat(order.total) }
          }
        });
      }, 5);

      //console.log(`❌ Order ${orderNumber} cancelled`);
      return order;
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      throw error;
    }
  }

  // إحصائيات الطلبات
  async getOrderStats(companyId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.aggregate({
          where: {
            companyId,
            createdAt: { gte: startDate }
          },
          _count: { id: true },
          _sum: { total: true },
          _avg: { total: true }
        });
      }, 3);

      return {
        totalOrders: stats._count.id || 0,
        totalRevenue: parseFloat(stats._sum.total || 0),
        averageOrderValue: parseFloat(stats._avg.total || 0),
        period: `${days} days`
      };
    } catch (error) {
      console.error('❌ Error fetching order stats:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        period: `${days} days`
      };
    }
  }
}

const orderService = new OrderService();
orderService.OrderService = OrderService;
orderService.orderService = orderService;

module.exports = orderService;

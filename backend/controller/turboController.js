/**
 * Turbo Shipping Controller
 * تحكم في عمليات Turbo للشحن
 */

const TurboService = require('../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

/**
 * Helper function to find order by orderNumber in all schemas
 */
async function findOrderByNumber(orderNumber, companyId) {
  const prisma = getSharedPrismaClient();
  
  console.log('🔍 [FIND-ORDER] Searching for order:', { orderNumber, companyId });
  
  // Try Order table first
  let order = await safeQuery(async () => {
    return await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber,
        companyId: companyId
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
  }, 3);

  if (order) {
    console.log('✅ [FIND-ORDER] Found in Order table:', { id: order.id, orderNumber: order.orderNumber, tableType: 'Order' });
  }

  // If not found, try GuestOrder
  if (!order) {
    console.log('🔍 [FIND-ORDER] Not found in Order table, trying GuestOrder...');
    const guestOrder = await safeQuery(async () => {
      return await prisma.guestOrder.findFirst({
        where: {
          orderNumber: orderNumber,
          companyId: companyId
        }
      });
    }, 3);

    if (guestOrder) {
      // Convert GuestOrder to Order-like format
      let items = guestOrder.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }

      let shippingAddress = guestOrder.shippingAddress || {};
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
      }

      // Get company info
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: companyId },
          select: {
            id: true,
            turboApiKey: true,
            turboEnabled: true,
            turboAutoCreate: true
          }
        });
      }, 2);

      console.log('✅ [FIND-ORDER] Found in GuestOrder table:', { id: guestOrder.id, orderNumber: guestOrder.orderNumber, tableType: 'GuestOrder' });
      
      order = {
        id: guestOrder.id,
        orderNumber: guestOrder.orderNumber,
        tableType: 'GuestOrder', // Track which table this came from
        customerName: guestOrder.guestName || '',
        customerPhone: guestOrder.guestPhone || '',
        customerEmail: guestOrder.guestEmail || '',
        customerAddress: typeof shippingAddress === 'object' ? (shippingAddress.address || shippingAddress.street || '') : '',
        city: typeof shippingAddress === 'object' ? (shippingAddress.city || '') : '',
        customer: {
          firstName: guestOrder.guestName?.split(' ')[0] || '',
          lastName: guestOrder.guestName?.split(' ').slice(1).join(' ') || '',
          phone: guestOrder.guestPhone || '',
          email: guestOrder.guestEmail || ''
        },
        items: items.map((item) => ({
          id: item.id || Math.random().toString(),
          productId: item.productId || null,
          productName: item.name || item.productName || 'منتج',
          quantity: item.quantity || 1,
          price: item.price || 0,
          total: item.total || (item.price || 0) * (item.quantity || 1),
          product: null
        })),
        total: guestOrder.finalTotal || guestOrder.total || 0,
        subtotal: guestOrder.total || 0,
        shipping: guestOrder.shippingCost || 0,
        tax: 0,
        company: company,
        companyId: companyId,
        status: 'CONFIRMED',
        paymentMethod: guestOrder.paymentMethod || 'CASH',
        notes: guestOrder.notes || '',
        turboShipmentId: null,
        turboTrackingNumber: null,
        turboShipmentStatus: null,
        turboLabelUrl: null,
        turboBranchId: null
      };
    }
  }

  return order;
}

/**
 * إنشاء شحنة جديدة
 */
const createShipment = async (req, res) => {
  try {
    const { orderId } = req.params; // Can be orderNumber or orderId
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب باستخدام orderNumber في جميع schemas
    let order = await findOrderByNumber(orderId, companyId);

    // If not found by orderNumber, try as id
    if (!order) {
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            customer: true,
            items: {
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
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        searchedValue: orderId
      });
    }

    if (order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this order'
      });
    }

    // التحقق من تفعيل Turbo
    if (!order.company.turboEnabled || !order.company.turboApiKey) {
      return res.status(400).json({
        success: false,
        error: 'Turbo is not enabled or API key is not configured'
      });
    }

    // التحقق من عدم وجود شحنة سابقة
    if (order.turboShipmentId) {
      return res.status(400).json({
        success: false,
        error: 'Shipment already exists for this order',
        shipmentId: order.turboShipmentId,
        trackingNumber: order.turboTrackingNumber
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(order.company.turboApiKey, companyId);

    // تحضير بيانات الطلب
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items);

    // إنشاء الشحنة
    const result = await turboService.createShipment(orderData);

    console.log('✅ [TURBO-CONTROLLER] Shipment created successfully:', {
      shipmentId: result.shipmentId,
      trackingNumber: result.trackingNumber,
      status: result.status
    });

    // حفظ معلومات الشحنة في قاعدة البيانات
    console.log('💾 [TURBO-CONTROLLER] Saving shipment data to database...');
    
    const updateData = {
      turboShipmentId: String(result.shipmentId || ''),
      turboTrackingNumber: String(result.trackingNumber || ''),
      turboShipmentStatus: result.status,
      turboLabelUrl: result.labelUrl,
      turboMetadata: result.data ? JSON.stringify(result.data) : null
    };

    console.log('📝 [TURBO-CONTROLLER] Update data:', updateData);
    console.log('📊 [TURBO-CONTROLLER] Order table type:', order.tableType || 'Order');

    let updateResult;
    
    // Check if this is a GuestOrder
    if (order.tableType === 'GuestOrder') {
      console.log('🔄 [TURBO-CONTROLLER] Updating GuestOrder by orderNumber:', order.orderNumber);
      updateResult = await safeQuery(async () => {
        return await prisma.guestOrder.updateMany({
          where: { 
            orderNumber: order.orderNumber,
            companyId: companyId
          },
          data: updateData
        });
      }, 3);
      console.log('✅ [TURBO-CONTROLLER] GuestOrder update result:', updateResult);
    } else {
      // Regular Order table
      if (order.orderNumber) {
        console.log('🔄 [TURBO-CONTROLLER] Updating Order by orderNumber:', order.orderNumber);
        updateResult = await safeQuery(async () => {
          return await prisma.order.updateMany({
            where: { 
              orderNumber: order.orderNumber,
              companyId: companyId
            },
            data: updateData
          });
        }, 3);
        console.log('✅ [TURBO-CONTROLLER] Order update result (updateMany):', updateResult);
      } else if (order.id) {
        // Fallback: update by id if orderNumber not available
        console.log('🔄 [TURBO-CONTROLLER] Updating Order by id:', order.id);
        updateResult = await safeQuery(async () => {
          return await prisma.order.update({
            where: { id: order.id },
            data: updateData
          });
        }, 3);
        console.log('✅ [TURBO-CONTROLLER] Order update result (update):', updateResult);
      }
    }

    // التحقق من نجاح الحفظ
    let verifyOrder;
    if (order.tableType === 'GuestOrder') {
      verifyOrder = await safeQuery(async () => {
        return await prisma.guestOrder.findFirst({
          where: order.orderNumber ? { orderNumber: order.orderNumber, companyId } : { id: order.id },
          select: {
            id: true,
            orderNumber: true,
            turboShipmentId: true,
            turboTrackingNumber: true,
            turboShipmentStatus: true
          }
        });
      }, 3);
    } else {
      verifyOrder = await safeQuery(async () => {
        return await prisma.order.findFirst({
          where: order.orderNumber ? { orderNumber: order.orderNumber, companyId } : { id: order.id },
          select: {
            id: true,
            orderNumber: true,
            turboShipmentId: true,
            turboTrackingNumber: true,
            turboShipmentStatus: true
          }
        });
      }, 3);
    }

    console.log('🔍 [TURBO-CONTROLLER] Verification - Order after update:', verifyOrder);

    res.json({
      success: true,
      data: {
        shipmentId: result.shipmentId,
        trackingNumber: result.trackingNumber,
        status: result.status,
        labelUrl: result.labelUrl,
        estimatedDelivery: result.estimatedDelivery
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error creating shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create shipment'
    });
  }
};

/**
 * تتبع الشحنة
 */
const trackShipment = async (req, res) => {
  try {
    const { orderId } = req.params; // Can be orderNumber or orderId
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب باستخدام orderNumber في جميع schemas
    let order = await findOrderByNumber(orderId, companyId);

    // If not found by orderNumber, try as id
    if (!order) {
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            }
          }
        });
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        searchedValue: orderId
      });
    }

    if (order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this order'
      });
    }

    if (!order.turboTrackingNumber) {
      return res.status(400).json({
        success: false,
        error: 'No tracking number found for this order'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(order.company.turboApiKey, companyId);

    // تتبع الشحنة
    const result = await turboService.trackShipment(order.turboTrackingNumber);

    // إذا لم تكن الوظيفة مدعومة، إرجاع رسالة واضحة
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Tracking not available',
        message: result.message || 'Turbo API قد لا يدعم تتبع الشحنة مباشرة. يتم تحديث الحالة تلقائياً عبر webhooks.'
      });
    }

    // تحديث حالة الشحنة في قاعدة البيانات
    if (result.status !== order.turboShipmentStatus) {
      if (order.orderNumber) {
        await safeQuery(async () => {
          return await prisma.order.updateMany({
            where: { 
              orderNumber: order.orderNumber,
              companyId: companyId
            },
            data: {
              turboShipmentStatus: result.status,
              turboMetadata: JSON.stringify(result.data)
            }
          });
        }, 3);
      } else if (order.id) {
        await safeQuery(async () => {
          return await prisma.order.update({
            where: { id: order.id },
            data: {
              turboShipmentStatus: result.status,
              turboMetadata: JSON.stringify(result.data)
            }
          });
        }, 3);
      }
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error tracking shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track shipment'
    });
  }
};

/**
 * حساب تكلفة الشحن
 */
const calculateShippingCost = async (req, res) => {
  try {
    const { city, governorate, address, weight, length, width, height, orderId } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // جلب إعدادات الشركة
    const company = await safeQuery(async () => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          turboApiKey: true,
          turboEnabled: true
        }
      });
    }, 3);

    if (!company || !company.turboEnabled || !company.turboApiKey) {
      return res.status(400).json({
        success: false,
        error: 'Turbo is not enabled or API key is not configured'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(company.turboApiKey, companyId);

    // حساب التكلفة
    const result = await turboService.calculateShippingCost(
      { city, governorate, address },
      weight || 1,
      length && width && height ? { length, width, height } : null
    );

    // إذا لم تكن الوظيفة مدعومة، إرجاع رسالة واضحة
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Shipping cost calculation not available',
        message: result.message || 'Turbo API لا يدعم حساب تكلفة الشحن مباشرة'
      });
    }

    // إذا كان هناك orderId، احفظ السعر الفعلي في الطلب
    if (orderId && result.success && result.cost) {
      try {
        const order = await findOrderByNumber(orderId, companyId);
        if (order) {
          // تحديث turboMetadata لحفظ السعر الفعلي
          let metadata = {};
          try {
            metadata = order.turboMetadata ? JSON.parse(order.turboMetadata) : {};
          } catch (e) {
            metadata = {};
          }
          metadata.actualShippingCost = result.cost;
          metadata.actualShippingCostCalculatedAt = new Date().toISOString();

          if (order.orderNumber) {
            await safeQuery(async () => {
              return await prisma.order.updateMany({
                where: {
                  orderNumber: order.orderNumber,
                  companyId: companyId
                },
                data: {
                  turboMetadata: JSON.stringify(metadata)
                }
              });
            }, 3);
          } else if (order.id) {
            await safeQuery(async () => {
              return await prisma.order.update({
                where: { id: order.id },
                data: {
                  turboMetadata: JSON.stringify(metadata)
                }
              });
            }, 3);
          }
        }
      } catch (saveError) {
        console.error('❌ [TURBO-CONTROLLER] Error saving actual shipping cost:', saveError);
        // لا نوقف العملية، فقط نسجل الخطأ
      }
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error calculating shipping cost:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate shipping cost'
    });
  }
};

/**لهف 
 * إنشاء شحنات لعدة طلبات دفعة واحدة
 */
const bulkCreateShipments = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order IDs array is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // جلب إعدادات الشركة
    const company = await safeQuery(async () => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          turboApiKey: true,
          turboEnabled: true
        }
      });
    }, 3);

    if (!company || !company.turboEnabled || !company.turboApiKey) {
      return res.status(400).json({
        success: false,
        error: 'Turbo is not enabled or API key is not configured'
      });
    }

    // جلب الطلبات
    const orders = await safeQuery(async () => {
      return await prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { in: orderIds } },
            { id: { in: orderIds } }
          ],
          companyId: companyId,
          turboShipmentId: null // فقط الطلبات التي ليس لها شحنة
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
              turboEnabled: true
            }
          }
        },
        take: 100 // حد أقصى 100 طلب في كل مرة
      });
    }, 3);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No orders found or all orders already have shipments'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(company.turboApiKey, companyId);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // معالجة كل طلب
    for (const order of orders) {
      try {
        // التحقق من وجود شحنة سابقة
        if (order.turboShipmentId) {
          results.skipped.push({
            orderNumber: order.orderNumber,
            reason: 'Shipment already exists'
          });
          continue;
        }

        // تحضير بيانات الطلب
        const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

        // إنشاء الشحنة
        const result = await turboService.createShipment(orderData);

        // حفظ معلومات الشحنة
        if (order.orderNumber) {
          await safeQuery(async () => {
            return await prisma.order.updateMany({
              where: {
                orderNumber: order.orderNumber,
                companyId: companyId
              },
              data: {
                turboShipmentId: String(result.shipmentId || ''),
                turboTrackingNumber: String(result.trackingNumber || ''),
                turboShipmentStatus: result.status,
                turboLabelUrl: result.labelUrl,
                turboMetadata: JSON.stringify(result.data)
              }
            });
          }, 3);
        } else if (order.id) {
          await safeQuery(async () => {
            return await prisma.order.update({
              where: { id: order.id },
              data: {
                turboShipmentId: String(result.shipmentId || ''),
                turboTrackingNumber: String(result.trackingNumber || ''),
                turboShipmentStatus: result.status,
                turboLabelUrl: result.labelUrl,
                turboMetadata: JSON.stringify(result.data)
              }
            });
          }, 3);
        }

        results.success.push({
          orderNumber: order.orderNumber,
          shipmentId: result.shipmentId,
          trackingNumber: result.trackingNumber
        });

        // إضافة تأخير صغير بين الطلبات لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ [TURBO-CONTROLLER] Error creating shipment for order ${order.orderNumber}:`, error);
        results.failed.push({
          orderNumber: order.orderNumber,
          error: error.message || 'Failed to create shipment'
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: orders.length,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        results: results
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error in bulk create shipments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create bulk shipments'
    });
  }
};

/**
 * جلب مقارنة أسعار الشحن للطلب
 */
const getShippingComparison = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) {
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId }
        });
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this order'
      });
    }

    // جلب السعر الفعلي من turboMetadata
    let actualCost = 0;
    try {
      if (order.turboMetadata) {
        const metadata = JSON.parse(order.turboMetadata);
        actualCost = parseFloat(metadata.actualShippingCost || 0);
      }
    } catch (e) {
      console.error('❌ [TURBO-CONTROLLER] Error parsing turboMetadata:', e);
    }

    // السعر المحدد للعميل
    const customerCost = parseFloat(order.shipping || 0);
    const difference = actualCost - customerCost;

    res.json({
      success: true,
      data: {
        actualCost,
        customerCost,
        difference,
        orderId: order.id,
        orderNumber: order.orderNumber,
        currency: order.currency || 'EGP'
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting shipping comparison:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get shipping comparison'
    });
  }
};

/**
 * إلغاء الشحنة
 */
const cancelShipment = async (req, res) => {
  try {
    const { orderId } = req.params; // Can be orderNumber or orderId
    const { reason } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب باستخدام orderNumber في جميع schemas
    let order = await findOrderByNumber(orderId, companyId);

    // If not found by orderNumber, try as id
    if (!order) {
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            }
          }
        });
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        searchedValue: orderId
      });
    }

    if (order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this order'
      });
    }

    if (!order.turboShipmentId) {
      return res.status(400).json({
        success: false,
        error: 'No shipment found for this order'
      });
    }

    // التحقق من وجود Turbo API key
    if (!order.company?.turboApiKey) {
      return res.status(400).json({
        success: false,
        error: 'Turbo API key is not configured for this company'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(order.company.turboApiKey, companyId);

    // إلغاء الشحنة
    const result = await turboService.cancelShipment(order.turboShipmentId, reason);

    // تحديث حالة الطلب
    if (order.orderNumber) {
      await safeQuery(async () => {
        return await prisma.order.updateMany({
          where: { 
            orderNumber: order.orderNumber,
            companyId: companyId
          },
          data: {
            turboShipmentStatus: 'cancelled',
            turboMetadata: JSON.stringify(result.data)
          }
        });
      }, 3);
    } else if (order.id) {
      await safeQuery(async () => {
        return await prisma.order.update({
          where: { id: order.id },
          data: {
            turboShipmentStatus: 'cancelled',
            turboMetadata: JSON.stringify(result.data)
          }
        });
      }, 3);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error cancelling shipment:', error);
    
    // تحديد status code بناءً على نوع الخطأ
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to cancel shipment';
    let arabicMessage = 'فشل في إلغاء الشحنة';
    
    // معالجة رسائل الخطأ الخاصة من Turbo API
    if (error.message) {
      if (error.message.includes('Invalid authentication key')) {
        arabicMessage = 'مفتاح API الخاص بـ Turbo غير صحيح أو منتهي الصلاحية. يرجى التحقق من إعدادات Turbo في الشركة';
        statusCode = 401;
      } else if (error.message.includes('لا يمكن التبلغ على الالغاء')) {
        arabicMessage = 'لا يمكن إلغاء هذه الشحنة - قد تكون في حالة متقدمة (تم التسليم أو في الطريق)';
        statusCode = 400;
      } else if (error.message.includes('government not found')) {
        arabicMessage = 'المحافظة غير موجودة في Turbo API';
        statusCode = 400;
      } else if (error.message.includes('Turbo API error')) {
        statusCode = 400;
        // استخراج الرسالة العربية من الخطأ إن أمكن
        const match = error.message.match(/Turbo API error: (.+)/);
        if (match && match[1]) {
          arabicMessage = match[1];
        }
      } else if (error.message.includes('Turbo API key is not configured')) {
        arabicMessage = 'مفتاح API الخاص بـ Turbo غير موجود. يرجى إضافة مفتاح API في إعدادات الشركة';
        statusCode = 400;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: arabicMessage
    });
  }
};

/**
 * طباعة ملصق الشحنة
 */
const printLabel = async (req, res) => {
  try {
    const { orderId } = req.params; // Can be orderNumber or orderId
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب باستخدام orderNumber في جميع schemas
    let order = await findOrderByNumber(orderId, companyId);

    // If not found by orderNumber, try as id
    if (!order) {
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            }
          }
        });
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        searchedValue: orderId
      });
    }

    if (order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this order'
      });
    }

    if (!order.turboShipmentId) {
      return res.status(400).json({
        success: false,
        error: 'No shipment found for this order'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(order.company.turboApiKey, companyId);

    // طباعة الملصق
    const result = await turboService.printLabel(order.turboShipmentId);

    // تحديث رابط الملصق في قاعدة البيانات
    if (result.labelUrl) {
      if (order.orderNumber) {
        await safeQuery(async () => {
          return await prisma.order.updateMany({
            where: { 
              orderNumber: order.orderNumber,
              companyId: companyId
            },
            data: {
              turboLabelUrl: result.labelUrl
            }
          });
        }, 3);
      } else if (order.id) {
        await safeQuery(async () => {
          return await prisma.order.update({
            where: { id: order.id },
            data: {
              turboLabelUrl: result.labelUrl
            }
          });
        }, 3);
      }
    }

    // إرجاع PDF كـ base64 أو URL
    if (result.labelPdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="label-${order.orderNumber}.pdf"`);
      res.send(Buffer.from(result.labelPdf, 'base64'));
    } else if (result.labelUrl) {
      res.json({
        success: true,
        data: {
          labelUrl: result.labelUrl
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate label'
      });
    }
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error printing label:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to print label'
    });
  }
};

/**
 * جلب قائمة المحافظات من Turbo API
 */
const getGovernments = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // جلب إعدادات الشركة
    const company = await safeQuery(async () => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          turboApiKey: true,
          turboEnabled: true
        }
      });
    }, 3);

    // إنشاء خدمة Turbo (سيستخدم fallback إذا لم يكن API key موجود)
    const turboService = new TurboService(company?.turboApiKey || null, companyId);

    // جلب المحافظات (سيرجع fallback list إذا فشل API)
    const result = await turboService.getGovernments();

    console.log('📋 [TURBO-CONTROLLER] Governments result:', {
      success: result?.success,
      count: result?.count,
      hasGovernments: !!result?.governments,
      isFallback: result?.isFallback
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting governments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get governments'
    });
  }
};

/**
 * جلب قائمة المناطق بناءً على المحافظة
 */
const getAreas = async (req, res) => {
  try {
    const { governmentId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!governmentId) {
      return res.status(400).json({
        success: false,
        error: 'Government ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // جلب إعدادات الشركة
    const company = await safeQuery(async () => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          turboApiKey: true,
          turboEnabled: true
        }
      });
    }, 3);

    if (!company || !company.turboEnabled || !company.turboApiKey) {
      return res.status(400).json({
        success: false,
        error: 'Turbo is not enabled or API key is not configured'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(company.turboApiKey, companyId);

    // جلب المناطق
    const result = await turboService.getAreas(governmentId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting areas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get areas'
    });
  }
};

/**
 * توليد HTML للبوليصة
 */
function generateWaybillHTML(waybillData) {
  const {
    orderNumber,
    turboOrderCode,
    orderDate,
    receiverName,
    receiverPhone,
    receiverPhone2,
    receiverAddress,
    receiverCity,
    receiverState,
    items = [],
    totalValue,
    shippingCost,
    amountToCollect,
    notes
  } = waybillData;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بوليصة شحن - ${orderNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .waybill {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .order-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 6px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-weight: bold;
            color: #64748b;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #1e293b;
            font-size: 16px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            background: #2563eb;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .customer-details {
            padding: 15px;
            background: #f8fafc;
            border-radius: 6px;
            border-right: 4px solid #2563eb;
        }
        .detail-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-label {
            font-weight: bold;
            color: #64748b;
            min-width: 120px;
        }
        .detail-value {
            color: #1e293b;
            flex: 1;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .items-table th {
            background: #f1f5f9;
            padding: 12px;
            text-align: right;
            border: 1px solid #e2e8f0;
            font-weight: bold;
            color: #475569;
        }
        .items-table td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            text-align: right;
        }
        .items-table tr:hover {
            background: #f8fafc;
        }
        .totals {
            margin-top: 20px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 6px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .total-row.final {
            border-top: 2px solid #2563eb;
            border-bottom: none;
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-top: 10px;
            padding-top: 15px;
        }
        .notes {
            margin-top: 20px;
            padding: 15px;
            background: #fef3c7;
            border-right: 4px solid #f59e0b;
            border-radius: 4px;
        }
        .print-btn {
            display: block;
            width: 200px;
            margin: 30px auto 0;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .print-btn:hover {
            background: #1d4ed8;
        }
        @media print {
            body { background: white; padding: 0; }
            .waybill { box-shadow: none; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <div class="waybill">
        <div class="header">
            <h1>🚚 بوليصة شحن</h1>
            <p style="color: #64748b; margin-top: 5px;">Turbo Shipping Waybill</p>
        </div>

        <div class="order-info">
            <div class="info-item">
                <span class="info-label">رقم الطلب</span>
                <span class="info-value">${orderNumber || 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">كود الشحنة</span>
                <span class="info-value">${turboOrderCode || 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">تاريخ الطلب</span>
                <span class="info-value">${orderDate ? new Date(orderDate).toLocaleDateString('ar-EG') : 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">عدد المنتجات</span>
                <span class="info-value">${items.length} منتج</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📍 بيانات المستلم</div>
            <div class="customer-details">
                <div class="detail-row">
                    <span class="detail-label">الاسم:</span>
                    <span class="detail-value">${receiverName || 'غير محدد'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">الهاتف:</span>
                    <span class="detail-value">${receiverPhone || 'غير محدد'}</span>
                </div>
                ${receiverPhone2 ? `
                <div class="detail-row">
                    <span class="detail-label">هاتف بديل:</span>
                    <span class="detail-value">${receiverPhone2}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">العنوان:</span>
                    <span class="detail-value">${receiverAddress || 'غير محدد'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">المدينة:</span>
                    <span class="detail-value">${receiverCity || 'غير محدد'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">المحافظة:</span>
                    <span class="detail-value">${receiverState || 'غير محدد'}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📦 تفاصيل الشحنة</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th style="width: 80px;">الكمية</th>
                        <th style="width: 100px;">السعر</th>
                        <th style="width: 100px;">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                    <tr>
                        <td>${item.name || 'منتج'}</td>
                        <td>${item.quantity || 0}</td>
                        <td>${(item.price || 0).toFixed(2)} ج.م</td>
                        <td>${(item.total || 0).toFixed(2)} ج.م</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">
                    <span>قيمة المنتجات:</span>
                    <span>${(totalValue || 0).toFixed(2)} ج.م</span>
                </div>
                <div class="total-row">
                    <span>تكلفة الشحن:</span>
                    <span>${(shippingCost || 0).toFixed(2)} ج.م</span>
                </div>
                <div class="total-row final">
                    <span>المبلغ المستحق:</span>
                    <span>${(amountToCollect || 0).toFixed(2)} ج.م</span>
                </div>
            </div>
        </div>

        ${notes ? `
        <div class="notes">
            <strong>📝 ملاحظات:</strong><br>
            ${notes}
        </div>
        ` : ''}

        <button class="print-btn" onclick="window.print()">🖨️ طباعة البوليصة</button>
    </div>
</body>
</html>
  `;
}

/**
 * طباعة البوليصة
 * Public endpoint - لا يتطلب مصادقة
 */
const printWaybill = async (req, res) => {
  try {
    const { orderId } = req.params; // Can be orderNumber or orderId
    const prisma = getSharedPrismaClient();

    console.log('📄 [WAYBILL] Fetching waybill for order:', orderId);

    // البحث عن الطلب بدون companyId (public access)
    let order = null;
    
    // Try by orderNumber first (works for both Order and GuestOrder)
    if (orderId.startsWith('ORD-')) {
      // Try Order table
      order = await safeQuery(async () => {
        return await prisma.order.findFirst({
          where: { orderNumber: orderId },
          include: {
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            },
            customer: true,
            orderItems: {
              include: {
                product: true
              }
            }
          }
        });
      }, 3);

      // If not found, try GuestOrder
      if (!order) {
        const guestOrder = await safeQuery(async () => {
          return await prisma.guestOrder.findFirst({
            where: { orderNumber: orderId }
          });
        }, 3);

        if (guestOrder) {
          // Convert to order format
          let items = guestOrder.items || [];
          if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { items = []; }
          }

          let shippingAddress = guestOrder.shippingAddress || {};
          if (typeof shippingAddress === 'string') {
            try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
          }

          const company = await safeQuery(async () => {
            return await prisma.company.findUnique({
              where: { id: guestOrder.companyId },
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            });
          }, 2);

          order = {
            id: guestOrder.id,
            orderNumber: guestOrder.orderNumber,
            companyId: guestOrder.companyId,
            customerName: guestOrder.guestName || '',
            customerPhone: guestOrder.guestPhone || '',
            customerEmail: guestOrder.guestEmail || '',
            customerAddress: typeof shippingAddress === 'object' ? (shippingAddress.address || '') : '',
            city: typeof shippingAddress === 'object' ? (shippingAddress.city || '') : '',
            total: parseFloat(guestOrder.total || 0),
            subtotal: parseFloat(guestOrder.subtotal || 0),
            shipping: parseFloat(guestOrder.shipping || 0),
            turboShipmentId: guestOrder.turboShipmentId,
            turboTrackingNumber: guestOrder.turboTrackingNumber,
            turboShipmentStatus: guestOrder.turboShipmentStatus,
            notes: guestOrder.notes || '',
            orderItems: items.map(item => ({
              productName: item.name || item.productName || '',
              quantity: item.quantity || 1,
              price: parseFloat(item.price || 0),
              total: parseFloat(item.total || 0)
            })),
            items: items,
            customer: {
              firstName: guestOrder.guestName?.split(' ')[0] || '',
              phone: guestOrder.guestPhone || ''
            },
            company: company
          };
        }
      }
    } else {
      // Try by ID
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            },
            customer: true,
            orderItems: {
              include: {
                product: true
              }
            }
          }
        });
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        searchedValue: orderId
      });
    }

    // إنشاء خدمة Turbo (public endpoint - no auth required)
    const turboService = new TurboService(order.company?.turboApiKey || null, order.companyId);

    // تحضير بيانات الطلب
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items || []);

    // جلب البوليصة
    // إذا كان هناك shipmentId، نحاول جلبها من API، وإلا نولد بوليصة محلية
    const shipmentId = order.turboShipmentId || order.turboTrackingNumber || order.orderNumber;
    const result = await turboService.printWaybill(shipmentId, orderData);

    console.log('📄 [WAYBILL] Request headers:', {
      accept: req.headers.accept,
      format: req.query.format
    });

    // إذا كانت البوليصة PDF من API
    if (result.waybillPdf) {
      console.log('✅ [WAYBILL] Returning PDF from Turbo API');
      const pdfBuffer = Buffer.from(result.waybillPdf, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="waybill-${order.orderNumber || orderId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    }

    // إذا كانت بيانات البوليصة المحلية، نعيدها كـ JSON أو HTML
    const waybillData = result.waybillData || result;
    console.log('📄 [TURBO-CONTROLLER] Returning local waybill data:', {
      hasData: !!waybillData,
      orderNumber: waybillData?.orderNumber,
      turboOrderCode: waybillData?.turboOrderCode,
      itemsCount: waybillData?.items?.length || 0
    });
    
    // إذا كان الطلب يريد PDF ولكن لا توجد بوليصة من API، نرجع خطأ
    if (req.headers.accept?.includes('application/pdf')) {
      console.log('⚠️ [WAYBILL] PDF requested but not available from API');
      return res.status(404).json({
        success: false,
        error: 'البوليصة غير متوفرة بصيغة PDF. يرجى إنشاء الشحنة أولاً على Turbo.'
      });
    }
    
    // إذا كان الطلب يريد HTML (للطباعة في صفحة جديدة)
    if (req.query.format === 'html' || req.headers.accept?.includes('text/html')) {
      const html = generateWaybillHTML(waybillData);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
    
    // إرجاع JSON للـ API
    res.json({
      success: true,
      message: 'تم جلب بيانات البوليصة. يمكنك طباعتها من المتصفح.',
      data: {
        waybillData: waybillData,
        fromApi: result.fromApi || false
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error printing waybill:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to print waybill'
    });
  }
};

/**
 * تحليل العنوان باستخدام AI
 */
const parseAddress = async (req, res) => {
  try {
    const { address, orderId } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    const TurboAIParser = require('../services/turboAIParser');
    const parser = new TurboAIParser(null, companyId);

    const result = await parser.parseAddress(address, orderId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error parsing address:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse address'
    });
  }
};

/**
 * جلب النماذج المتاحة من Gemini
 */
const getAIModels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const TurboAIParser = require('../services/turboAIParser');
    const parser = new TurboAIParser(null, companyId);

    const models = await parser.getAvailableModels();

    if (models === false) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch models. Check API key and connection.'
      });
    }

    res.json({
      success: true,
      data: {
        models: models,
        count: models.length
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting AI models:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get AI models'
    });
  }
};

/**
 * جلب فروع Turbo
 */
const getBranches = async (req, res) => {
  try {
    const { city, governorate } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // جلب إعدادات الشركة
    const company = await safeQuery(async () => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          turboApiKey: true,
          turboEnabled: true
        }
      });
    }, 3);

    if (!company || !company.turboEnabled || !company.turboApiKey) {
      return res.status(400).json({
        success: false,
        error: 'Turbo is not enabled or API key is not configured'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(company.turboApiKey, companyId);

    // جلب الفروع
    const result = await turboService.getBranches(city, governorate);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting branches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get branches'
    });
  }
};

/**
 * تحديث بيانات الشحنة يدوياً
 */
const updateShipment = async (req, res) => {
  try {
    const { orderId } = req.params; // Can be orderNumber or orderId
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) {
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            customer: true,
            items: {
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
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        searchedValue: orderId
      });
    }

    if (order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this order'
      });
    }

    if (!order.turboShipmentId) {
      return res.status(400).json({
        success: false,
        error: 'No shipment found for this order'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(order.company.turboApiKey, companyId);

    // تحضير بيانات الطلب
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items);

    // تحديث الشحنة
    const result = await turboService.updateShipment(order.turboShipmentId, orderData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error updating shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update shipment'
    });
  }
};

/**
 * تحديث بيانات الشحنة (Legacy - kept for backward compatibility)
 */
const updateShipmentLegacy = async (req, res) => {
  try {
    const { orderId } = req.params; // Can be orderNumber or orderId
    const updateData = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب باستخدام orderNumber في جميع schemas
    let order = await findOrderByNumber(orderId, companyId);

    // If not found by orderNumber, try as id
    if (!order) {
      order = await safeQuery(async () => {
        return await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            }
          }
        });
      }, 3);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        searchedValue: orderId
      });
    }

    if (order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this order'
      });
    }

    if (!order.turboShipmentId) {
      return res.status(400).json({
        success: false,
        error: 'No shipment found for this order'
      });
    }

    // إنشاء خدمة Turbo
    const turboService = new TurboService(order.company.turboApiKey, companyId);

    // تحديث الشحنة
    const result = await turboService.updateShipment(order.turboShipmentId, updateData);

    // تحديث بيانات الطلب
    const orderUpdateData = {};
    if (updateData.address) orderUpdateData.shippingAddress = updateData.address;
    if (updateData.city) orderUpdateData.city = updateData.city;
    if (updateData.phone) orderUpdateData.customerPhone = updateData.phone;
    if (updateData.name) orderUpdateData.customerName = updateData.name;

    if (Object.keys(orderUpdateData).length > 0) {
      if (order.orderNumber) {
        await safeQuery(async () => {
          return await prisma.order.updateMany({
            where: { 
              orderNumber: order.orderNumber,
              companyId: companyId
            },
            data: orderUpdateData
          });
        }, 3);
      } else if (order.id) {
        await safeQuery(async () => {
          return await prisma.order.update({
            where: { id: order.id },
            data: orderUpdateData
          });
        }, 3);
      }
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error updating shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update shipment'
    });
  }
};

/**
 * إضافة تذكرة دعم إلى Turbo
 * POST /api/turbo/tickets
 */
const addTicket = async (req, res) => {
  try {
    const { 
      description, 
      type, 
      inquiryTypeId, 
      inquiry_type_id,
      complaintTypeId,
      complaint_type_id,
      complaintTypeTitleId,
      complaint_type_title_id,
      entityId,
      entity_id
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }

    const ticketType = type || 3;
    
    // Validate required fields based on type
    if (ticketType === 1 && !inquiryTypeId && !inquiry_type_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'inquiry_type_id is required for inquiry type (type = 1)' 
      });
    }

    if (ticketType === 2) {
      if (!complaintTypeId && !complaint_type_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'complaint_type_id is required for complain type (type = 2)' 
        });
      }
      if (!complaintTypeTitleId && !complaint_type_title_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'complaint_type_title_id is required for complain type (type = 2)' 
        });
      }
      if (!entityId && !entity_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'entity_id is required for complain type (type = 2)' 
        });
      }
    }

    const turboService = new TurboService(null, companyId);
    const result = await turboService.addTicket(
      description.trim(), 
      ticketType,
      inquiryTypeId || inquiry_type_id,
      complaintTypeId || complaint_type_id,
      complaintTypeTitleId || complaint_type_title_id,
      entityId || entity_id
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, message: result.message });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error adding ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to add ticket' });
  }
};

/**
 * جلب أنواع الاستفسارات من Turbo
 * GET /api/turbo/inquiries-types
 */
const getInquiriesTypes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }

    const turboService = new TurboService(null, companyId);
    const result = await turboService.getInquiriesTypes();

    // حتى لو كان success: true مع types فارغة (404 case)، نعيد 200
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting inquiries types:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get inquiries types', types: [] });
  }
};

/**
 * جلب قائمة التذاكر من Turbo
 * GET /api/turbo/tickets
 */
const getTickets = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { page = 1, per_page = 10 } = req.query;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }

    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTickets(parseInt(page), parseInt(per_page));

    // حتى لو كان success: true مع tickets فارغة (404 case)، نعيد 200
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting tickets:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get tickets', tickets: [] });
  }
};

/**
 * جلب تفاصيل تذكرة معينة من Turbo
 * GET /api/turbo/tickets/:id
 */
const getTicket = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }

    if (!id) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    }

    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicket(id);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, message: result.message, ticket: null });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get ticket', ticket: null });
  }
};

/**
 * جلب سجل التذكرة من Turbo
 * GET /api/turbo/tickets/:id/log
 */
const getTicketLog = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }

    if (!id) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    }

    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicketLog(id);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, message: result.message, ticket: null, logs: [] });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket log:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get ticket log', ticket: null, logs: [] });
  }
};

/**
 * الرد على تذكرة في Turbo
 * POST /api/turbo/tickets/:id/reply
 */
const replyToTicket = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { message } = req.body;
    const imageFile = req.file; // من multer middleware

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }

    if (!id) {
      return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    }

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const turboService = new TurboService(null, companyId);
    
    // تحضير بيانات الصورة إذا كانت موجودة
    // multer.memoryStorage() يضع الملف في req.file.buffer
    let imageData = null;
    if (imageFile && imageFile.buffer) {
      imageData = {
        buffer: imageFile.buffer,
        originalname: imageFile.originalname || 'image.jpg',
        mimetype: imageFile.mimetype || 'image/jpeg',
        size: imageFile.size
      };
    }

    const result = await turboService.replyToTicket(id, message, imageData);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, message: result.message });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error replying to ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reply to ticket' });
  }
};

/**
 * جلب عدد التذاكر غير المقروءة من Turbo
 * GET /api/turbo/tickets/unread-count
 */
const getUnreadTicketsCount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }

    const turboService = new TurboService(null, companyId);
    const result = await turboService.getUnreadTicketsCount();

    // حتى لو كان success: true مع counts صفر (404 case)، نعيد 200
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting unread tickets count:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get unread tickets count', counts: { tickets: 0, missions: 0, orders: 0 } });
  }
};

module.exports = {
  createShipment,
  bulkCreateShipments,
  trackShipment,
  calculateShippingCost,
  getShippingComparison,
  cancelShipment,
  printLabel,
  printWaybill,
  parseAddress,
  getAIModels,
  getBranches,
  getGovernments,
  getAreas,
  updateShipment,
  addTicket,
  getInquiriesTypes,
  getTickets,
  getTicket,
  getTicketLog,
  replyToTicket,
  getUnreadTicketsCount
};


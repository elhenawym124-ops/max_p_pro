const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${year}${month}${day}-${timestamp}`;
}

// Batch: جلب جميع الطلبات مرة واحدة
async function fetchOrdersBatch(orderIds) {
  const prisma = getSharedPrismaClient();
  
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { id: { in: orderIds } },
        { orderNumber: { in: orderIds } }
      ]
    },
    include: {
      customer: true,
      company: true,
      orderItems: {
        include: {
          product: true
        }
      }
    }
  });

  return orders;
}

// Batch: جلب الفواتير الموجودة مرة واحدة
async function fetchExistingInvoicesBatch(orderIds) {
  const prisma = getSharedPrismaClient();
  
  const existingInvoices = await prisma.orderInvoice.findMany({
    where: {
      orderId: { in: orderIds }
    }
  });

  // تحويل إلى Map للبحث السريع
  const invoiceMap = new Map();
  existingInvoices.forEach(inv => {
    invoiceMap.set(inv.orderId, inv);
  });

  return invoiceMap;
}

// إنشاء بيانات الفاتورة من الطلب
function buildInvoiceData(order, userId) {
  return {
    invoiceNumber: generateInvoiceNumber(),
    orderId: order.id,
    companyId: order.companyId,
    
    issueDate: new Date(),
    dueDate: null,
    
    subtotal: order.subtotal,
    tax: order.tax,
    taxRate: 0,
    shipping: order.shipping,
    discount: order.discount,
    totalAmount: order.total,
    currency: order.currency || 'EGP',
    
    customerName: order.customerName || `${order.customer.firstName} ${order.customer.lastName}`,
    customerPhone: order.customerPhone || order.customer.phone,
    customerEmail: order.customerEmail || order.customer.email,
    customerAddress: order.customerAddress || order.shippingAddress,
    city: order.city,
    governorate: order.governorate,
    
    companyName: order.company.name,
    companyPhone: order.company.phone,
    companyEmail: order.company.email,
    companyAddress: order.company.address,
    companyLogo: order.company.logo,
    
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
    paidAt: order.paymentStatus === 'PAID' ? new Date() : null,
    
    notes: order.notes,
    terms: 'شكراً لتعاملكم معنا.',
    
    generatedBy: userId,
    printCount: 0,
    emailCount: 0
  };
}

// توليد فواتير متعددة بكفاءة عالية
async function bulkGenerateInvoicesOptimized(orderIds, userId = null) {
  const prisma = getSharedPrismaClient();
  const results = {
    success: [],
    existing: [],
    failed: []
  };

  try {
    console.log(`🚀 [INVOICE-BATCH] Fetching ${orderIds.length} orders...`);
    
    // 1. جلب جميع الطلبات مرة واحدة (Batch Query)
    const orders = await fetchOrdersBatch(orderIds);
    
    // إنشاء Map للبحث السريع
    const orderMap = new Map();
    orders.forEach(order => {
      orderMap.set(order.id, order);
      orderMap.set(order.orderNumber, order);
      if (order.externalOrderId) {
        orderMap.set(order.externalOrderId, order);
      }
    });

    console.log(`📦 [INVOICE-BATCH] Found ${orders.length}/${orderIds.length} orders`);

    // 2. جلب الفواتير الموجودة مرة واحدة
    const orderIdsFound = orders.map(o => o.id);
    const existingInvoicesMap = await fetchExistingInvoicesBatch(orderIdsFound);
    
    console.log(`📋 [INVOICE-BATCH] Found ${existingInvoicesMap.size} existing invoices`);

    // 3. تحضير بيانات الفواتير الجديدة
    const invoicesToCreate = [];
    
    for (const orderIdOrNumber of orderIds) {
      const order = orderMap.get(orderIdOrNumber);
      
      if (!order) {
        results.failed.push({
          orderId: orderIdOrNumber,
          error: 'الطلب غير موجود'
        });
        continue;
      }

      // التحقق من وجود فاتورة
      const existingInvoice = existingInvoicesMap.get(order.id);
      
      if (existingInvoice) {
        // إضافة بيانات الطلب للفاتورة الموجودة
        existingInvoice.order = {
          orderNumber: order.orderNumber,
          orderItems: order.orderItems
        };
        
        results.existing.push({
          orderId: orderIdOrNumber,
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          invoice: existingInvoice
        });
      } else {
        invoicesToCreate.push({
          order,
          orderIdOrNumber,
          data: buildInvoiceData(order, userId)
        });
      }
    }

    console.log(`✨ [INVOICE-BATCH] Creating ${invoicesToCreate.length} new invoices...`);

    // 4. إنشاء جميع الفواتير دفعة واحدة (Batch Insert)
    if (invoicesToCreate.length > 0) {
      const createdInvoices = await prisma.orderInvoice.createMany({
        data: invoicesToCreate.map(item => item.data),
        skipDuplicates: true
      });

      console.log(`✅ [INVOICE-BATCH] Created ${createdInvoices.count} invoices`);

      // جلب الفواتير المُنشأة مع بيانات الطلب الكاملة
      const newInvoices = await prisma.orderInvoice.findMany({
        where: {
          orderId: { in: invoicesToCreate.map(item => item.order.id) }
        },
        include: {
          order: {
            include: {
              orderItems: true
            }
          }
        }
      });

      // ربط النتائج
      const newInvoiceMap = new Map();
      newInvoices.forEach(inv => {
        newInvoiceMap.set(inv.orderId, inv);
      });

      invoicesToCreate.forEach(item => {
        const invoice = newInvoiceMap.get(item.order.id);
        if (invoice) {
          results.success.push({
            orderId: item.orderIdOrNumber,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            invoice: invoice // إضافة الفاتورة الكاملة
          });
        }
      });
    }

    return results;

  } catch (error) {
    console.error('❌ [INVOICE-BATCH] Error:', error);
    throw error;
  }
}

// الدالة القديمة (للتوافق)
async function generateInvoiceForOrder(orderIdOrNumber, userId = null) {
  try {
    const prisma = getSharedPrismaClient();

    // البحث عن الطلب
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrNumber },
          { orderNumber: orderIdOrNumber },
          { orderNumber: { contains: orderIdOrNumber } }
        ]
      },
      include: {
        customer: true,
        company: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      order = await prisma.order.findFirst({
        where: { externalOrderId: orderIdOrNumber },
        include: {
          customer: true,
          company: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });
    }

    if (!order) {
      throw new Error('الطلب غير موجود');
    }

    // التحقق من وجود فاتورة سابقة
    const existingInvoice = await prisma.orderInvoice.findUnique({
      where: { orderId: order.id }
    });

    if (existingInvoice) {
      return {
        success: true,
        invoice: existingInvoice,
        message: 'الفاتورة موجودة بالفعل'
      };
    }

    const invoiceData = buildInvoiceData(order, userId);

    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.create({
        data: invoiceData,
        include: {
          order: {
            include: {
              orderItems: true
            }
          }
        }
      });
    });

    return {
      success: true,
      invoice,
      message: 'تم إنشاء الفاتورة بنجاح'
    };

  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}

module.exports = {
  generateInvoiceForOrder,
  bulkGenerateInvoicesOptimized
};

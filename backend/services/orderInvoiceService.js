const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${year}${month}${day}-${timestamp}`;
}

async function generateInvoiceForOrder(orderIdOrNumber, userId = null) {
  try {
    const prisma = getSharedPrismaClient();

    console.log('🔍 [INVOICE] Searching for order:', orderIdOrNumber);

    // البحث عن الطلب بـ id أو orderNumber (يدعم جميع التنسيقات)
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrNumber },
          { orderNumber: orderIdOrNumber },
          // البحث بـ orderNumber الذي يحتوي على النص (للتنسيقات القديمة)
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

    // إذا لم يتم العثور على الطلب، حاول البحث بـ externalOrderId
    if (!order) {
      order = await prisma.order.findFirst({
        where: {
          externalOrderId: orderIdOrNumber
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
    }

    console.log('📦 [INVOICE] Order found:', order ? `${order.orderNumber} (${order.id})` : 'NOT FOUND');

    if (!order) {
      console.error('❌ [INVOICE] Order not found in database:', orderIdOrNumber);
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

    const invoiceData = {
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
      terms: 'شكراً لتعاملكم معنا. يرجى الدفع خلال 7 أيام من تاريخ الفاتورة.',
      
      generatedBy: userId,
      printCount: 0,
      emailCount: 0
    };

    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.create({
        data: invoiceData,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
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

async function getInvoiceByOrderId(orderId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.findUnique({
        where: { orderId },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          }
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

async function getInvoiceById(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          }
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

async function getInvoiceByNumber(invoiceNumber) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.findUnique({
        where: { invoiceNumber },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          }
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

async function getAllInvoices(companyId, filters = {}) {
  try {
    const prisma = getSharedPrismaClient();
    
    const {
      page = 1,
      limit = 20,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { companyId };

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } }
      ];
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) where.issueDate.lte = new Date(dateTo);
    }

    const [invoices, total] = await executeWithRetry(async () => {
      return await Promise.all([
        prisma.orderInvoice.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true
              }
            }
          },
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder
          }
        }),
        prisma.orderInvoice.count({ where })
      ]);
    });

    const stats = await executeWithRetry(async () => {
      return await prisma.orderInvoice.aggregate({
        where: { companyId },
        _count: { id: true },
        _sum: { totalAmount: true }
      });
    });

    const paidStats = await executeWithRetry(async () => {
      return await prisma.orderInvoice.aggregate({
        where: { companyId, paymentStatus: 'PAID' },
        _count: { id: true },
        _sum: { totalAmount: true }
      });
    });

    return {
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalInvoices: stats._count.id,
        totalAmount: stats._sum.totalAmount || 0,
        paidInvoices: paidStats._count.id,
        paidAmount: paidStats._sum.totalAmount || 0,
        pendingInvoices: stats._count.id - paidStats._count.id,
        pendingAmount: (stats._sum.totalAmount || 0) - (paidStats._sum.totalAmount || 0)
      }
    };

  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

async function updateInvoicePaymentStatus(invoiceId, paymentStatus, paidAt = null) {
  try {
    const prisma = getSharedPrismaClient();
    
    const updateData = { paymentStatus };
    
    if (paymentStatus === 'PAID' && !paidAt) {
      updateData.paidAt = new Date();
    } else if (paidAt) {
      updateData.paidAt = new Date(paidAt);
    }

    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: {
          order: true
        }
      });
    });

    if (paymentStatus === 'PAID') {
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: { paymentStatus: 'PAID' }
      });
    }

    return invoice;
  } catch (error) {
    console.error('Error updating invoice payment status:', error);
    throw error;
  }
}

async function incrementPrintCount(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: {
          printCount: { increment: 1 },
          printedAt: new Date()
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error incrementing print count:', error);
    throw error;
  }
}

async function incrementEmailCount(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: {
          emailCount: { increment: 1 },
          emailedAt: new Date()
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error incrementing email count:', error);
    throw error;
  }
}

async function deleteInvoice(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    await executeWithRetry(async () => {
      return await prisma.orderInvoice.delete({
        where: { id: invoiceId }
      });
    });

    return { success: true, message: 'تم حذف الفاتورة بنجاح' };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
}

async function updateInvoice(invoiceId, updateData) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
}

module.exports = {
  generateInvoiceForOrder,
  getInvoiceByOrderId,
  getInvoiceById,
  getInvoiceByNumber,
  getAllInvoices,
  updateInvoicePaymentStatus,
  incrementPrintCount,
  incrementEmailCount,
  deleteInvoice,
  updateInvoice,
  generateInvoiceNumber
};

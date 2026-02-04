const express = require('express');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const router = express.Router();
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Generate unique invoice number
 */
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${year}${month}-${timestamp}`;
}

/**
 * @route GET /api/v1/admin/invoices
 * @desc Get all invoices with filtering and pagination
 * @access Super Admin
 */
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.company = {
        name: {
          contains: search
        }
      };
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) where.issueDate.lte = new Date(dateTo);
    }

    // Get invoices with related data
    const [invoices, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().invoice.findMany({
          where,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                currency: true
              }
            },
            subscription: {
              select: {
                id: true,
                planType: true,
                status: true
              }
            },
            invoice_items: true,
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                paidAt: true,
                method: true
              }
            }
          },
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder
          }
        }),
        getSharedPrismaClient().invoice.count({ where })
      ]);
    });

    // Calculate statistics
    const stats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.groupBy({
        by: ['status'],
        _count: {
          id: true
        },
        _sum: {
          totalAmount: true
        }
      });
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: stat._count.id,
        amount: stat._sum.totalAmount || 0
      };
      return acc;
    }, {});

    // Calculate total revenue
    const totalRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.aggregate({
        where: { status: 'PAID' },
        _sum: {
          totalAmount: true
        }
      });
    });

    // Map invoice_items to items for frontend compatibility
    const mappedInvoices = invoices.map(invoice => ({
      ...invoice,
      items: invoice.invoice_items,
      invoice_items: undefined
    }));

    res.json({
      success: true,
      message: 'تم جلب بيانات الفواتير بنجاح',
      data: {
        invoices: mappedInvoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: {
          total,
          byStatus: statusStats,
          totalRevenue: totalRevenue._sum.totalAmount || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الفواتير',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/admin/invoices/:id
 * @desc Get invoice details
 * @access Super Admin
 */
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.findUnique({
        where: { id },
        include: {
          company: true,
          subscription: true,
          invoice_items: true,
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    res.json({
      success: true,
      message: 'تم جلب بيانات الفاتورة بنجاح',
      data: {
        ...invoice,
        items: invoice.invoice_items,
        invoice_items: undefined
      }
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الفاتورة',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/admin/invoices
 * @desc Create new invoice
 * @access Super Admin
 */
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      companyId,
      subscriptionId,
      type = 'SUBSCRIPTION',
      dueDate,
      items,
      taxRate = 0,
      discountAmount = 0,
      notes,
      paymentTerms = 'Net 30'
    } = req.body;

    // Validate company exists
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    // Calculate totals
    let subtotal = 0;
    const invoiceItems = items.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice
      };
    });

    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create invoice with items
    const invoice = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          companyId,
          subscriptionId,
          type,
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          currency: company.currency,
          notes,
          paymentTerms,
          invoice_items: {
            create: invoiceItems
          }
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          invoice_items: true
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفاتورة بنجاح',
      data: invoice
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الفاتورة',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/admin/invoices/:id/status
 * @desc Update invoice status
 * @access Super Admin
 */
router.put('/:id/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة الفاتورة غير صحيحة'
      });
    }

    const updateData = { status };

    if (status === 'PAID') {
      updateData.paidDate = new Date();
    }

    const invoice = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.update({
        where: { id },
        data: updateData,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          invoice_items: true,
          payments: true
        }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث حالة الفاتورة بنجاح',
      data: invoice
    });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الفاتورة',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/admin/invoices/:id/send
 * @desc Send invoice to company
 * @access Super Admin
 */
router.post('/:id/send', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.findUnique({
        where: { id },
        include: {
          company: true,
          invoice_items: true
        }
      });
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    // Update invoice status to SENT
    const updatedInvoice = await getSharedPrismaClient().invoice.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // TODO: Send email notification
    // await sendInvoiceEmail(invoice);

    res.json({
      success: true,
      message: 'تم إرسال الفاتورة بنجاح',
      data: updatedInvoice
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الفاتورة',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/admin/invoices/stats
 * @desc Get invoice statistics
 * @access Super Admin
 */
router.get('/stats/overview', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get statistics
    const [
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue,
      recentInvoices
    ] = await Promise.all([
      getSharedPrismaClient().invoice.count(),
      getSharedPrismaClient().invoice.count({ where: { status: 'PAID' } }),
      getSharedPrismaClient().invoice.count({ where: { status: 'OVERDUE' } }),
      getSharedPrismaClient().invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { totalAmount: true }
      }),
      getSharedPrismaClient().invoice.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          company: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate monthly revenue trend
    const monthlyRevenue = await getSharedPrismaClient().invoice.groupBy({
      by: ['issueDate'],
      where: {
        status: 'PAID',
        issueDate: { gte: startDate }
      },
      _sum: {
        totalAmount: true
      }
    });

    res.json({
      success: true,
      message: 'تم جلب إحصائيات الفواتير بنجاح',
      data: {
        overview: {
          totalInvoices,
          paidInvoices,
          overdueInvoices,
          pendingInvoices: totalInvoices - paidInvoices - overdueInvoices,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          averageInvoiceValue: paidInvoices > 0 ? (totalRevenue._sum.totalAmount || 0) / paidInvoices : 0
        },
        recentInvoices,
        monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الفواتير',
      error: error.message
    });
  }
});

module.exports = router;


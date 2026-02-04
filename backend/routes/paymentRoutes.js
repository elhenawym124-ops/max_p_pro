const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const router = express.Router();
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Generate unique payment number
 */
function generatePaymentNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `PAY-${year}${month}-${timestamp}`;
}

/**
 * @route GET /api/v1/admin/payments
 * @desc Get all payments with filtering and pagination
 * @access Super Admin
 */
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      method,
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
    
    if (method) {
      where.method = method;
    }
    
    if (search) {
      where.company = {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Get payments with related data
    const [payments, total] = await Promise.all([
      getSharedPrismaClient().payment.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              dueDate: true
            }
          },
          subscription: {
            select: {
              id: true,
              planType: true,
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
      getSharedPrismaClient().payment.count({ where })
    ]);

    // Calculate statistics
    const stats = await getSharedPrismaClient().payment.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: stat._count.id,
        amount: stat._sum.amount || 0
      };
      return acc;
    }, {});

    res.json({
      success: true,
      message: 'تم جلب بيانات المدفوعات بنجاح',
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: {
          total,
          byStatus: statusStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المدفوعات',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/admin/payments/:id
 * @desc Get payment details
 * @access Super Admin
 */
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await getSharedPrismaClient().payment.findUnique({
      where: { id },
      include: {
        company: true,
        invoice: {
          include: {
            items: true
          }
        },
        subscription: true
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'المدفوعة غير موجودة'
      });
    }

    res.json({
      success: true,
      message: 'تم جلب بيانات المدفوعة بنجاح',
      data: payment
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المدفوعة',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/admin/payments
 * @desc Record new payment
 * @access Super Admin
 */
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      companyId,
      invoiceId,
      subscriptionId,
      amount,
      currency = 'EGP',
      method = 'BANK_TRANSFER',
      gateway,
      transactionId,
      notes
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

    // Validate invoice if provided
    let invoice = null;
    if (invoiceId) {
      invoice = await getSharedPrismaClient().invoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة'
        });
      }
    }

    // Create payment
    const payment = await getSharedPrismaClient().payment.create({
      data: {
        paymentNumber: generatePaymentNumber(),
        companyId,
        invoiceId,
        subscriptionId,
        amount,
        currency,
        status: 'COMPLETED',
        method,
        gateway,
        transactionId,
        paidAt: new Date(),
        metadata: notes ? { notes } : null
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true
          }
        }
      }
    });

    // Update invoice status if payment covers full amount
    if (invoice && amount >= invoice.totalAmount) {
      await getSharedPrismaClient().invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidDate: new Date()
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المدفوعة بنجاح',
      data: payment
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل المدفوعة',
      error: error.message
    });
  }
});

module.exports = router;


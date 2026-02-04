const { requireAuth } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/payment-receipts';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف صورة'), false);
    }
  }
});

// جلب أرقام المحافظ النشطة
router.get('/wallet-numbers', requireAuth, async (req, res) => {
  try {
    const walletNumbers = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.findMany({
        where: {
          isActive: true
        },
        orderBy: { createdAt: 'asc' }
      });
    });

    res.json({
      success: true,
      data: walletNumbers
    });
  } catch (error) {
    console.error('خطأ في جلب أرقام المحافظ:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      user: req.user
    });
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أرقام المحافظ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// جلب تفاصيل فاتورة للدفع
router.get('/invoice/:invoiceId', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.findUnique({
        where: { id: invoiceId },
        include: {
          company: {
            select: {
              name: true,
              email: true
            }
          },
          subscription: {
            select: {
              planType: true
            }
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

    // التحقق من أن الفاتورة غير مدفوعة
    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'هذه الفاتورة مدفوعة بالفعل'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('خطأ في جلب الفاتورة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفاتورة'
    });
  }
});

// رفع إيصال الدفع
router.post('/submit-receipt', requireAuth, upload.single('receipt'), async (req, res) => {
  try {
    const { invoiceId, walletNumberId, subscriptionId, amount, purpose } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب رفع صورة الإيصال'
      });
    }

    if (!walletNumberId) {
      return res.status(400).json({
        success: false,
        message: 'يجب اختيار رقم المحفظة'
      });
    }

    // التحقق من وجود رقم المحفظة
    const walletNumber = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.findUnique({
        where: { id: walletNumberId }
      });
    });

    if (!walletNumber || !walletNumber.isActive) {
      return res.status(400).json({
        success: false,
        message: 'رقم المحفظة غير صالح أو غير نشط'
      });
    }

    let finalInvoiceId = invoiceId;

    // إذا كان تجديد اشتراك بدون فاتورة، نقوم بإنشاء فاتورة
    if (!invoiceId && subscriptionId && purpose === 'subscription_renewal') {
      const companyId = req.user.companyId;
      
      const newInvoice = await executeWithRetry(async () => {
        return await getSharedPrismaClient().invoice.create({
          data: {
            invoiceNumber: `INV-${Date.now()}`,
            companyId: companyId,
            subscriptionId: subscriptionId,
            totalAmount: parseFloat(amount) || 7500,
            status: 'PENDING',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            description: 'تجديد الاشتراك'
          }
        });
      });
      
      finalInvoiceId = newInvoice.id;
    } else if (invoiceId) {
      // التحقق من وجود الفاتورة
      const invoice = await executeWithRetry(async () => {
        return await getSharedPrismaClient().invoice.findUnique({
          where: { id: invoiceId }
        });
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة'
        });
      }

      if (invoice.status === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'هذه الفاتورة مدفوعة بالفعل'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير invoiceId أو subscriptionId'
      });
    }

    // حفظ إيصال الدفع
    const paymentReceipt = await executeWithRetry(async () => {
      return await getSharedPrismaClient().paymentReceipt.create({
        data: {
          invoiceId: finalInvoiceId,
          walletNumberId,
          receiptImage: req.file.path,
          status: 'PENDING'
        }
      });
    });

    res.json({
      success: true,
      message: 'تم إرسال الإيصال بنجاح، سيتم مراجعته قريباً',
      data: paymentReceipt
    });
  } catch (error) {
    console.error('خطأ في رفع الإيصال:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الإيصال',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === APIs الإدارة ===

// جلب جميع أرقام المحافظ (للإدارة)
router.get('/admin/wallet-numbers', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const walletNumbers = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.findMany({
        orderBy: { createdAt: 'desc' }
      });
    });

    res.json({
      success: true,
      data: walletNumbers
    });
  } catch (error) {
    console.error('خطأ في جلب أرقام المحافظ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أرقام المحافظ'
    });
  }
});

// إضافة رقم محفظة جديد
router.post('/admin/wallet-numbers', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, number, icon, color } = req.body;

    const walletNumber = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.create({
        data: {
          name,
          number,
          icon,
          color,
          isActive: true
        }
      });
    });

    res.json({
      success: true,
      message: 'تم إضافة رقم المحفظة بنجاح',
      data: walletNumber
    });
  } catch (error) {
    console.error('خطأ في إضافة رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة رقم المحفظة'
    });
  }
});

// تحديث رقم محفظة
router.put('/admin/wallet-numbers/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, icon, color, isActive } = req.body;

    const walletNumber = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.update({
        where: { id },
        data: {
          name,
          number,
          icon,
          color,
          isActive
        }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث رقم المحفظة بنجاح',
      data: walletNumber
    });
  } catch (error) {
    console.error('خطأ في تحديث رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث رقم المحفظة'
    });
  }
});

// حذف رقم محفظة
router.delete('/admin/wallet-numbers/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف رقم المحفظة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف رقم المحفظة'
    });
  }
});

// جلب الإيصالات في الانتظار
router.get('/admin/pending-receipts', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get receipts with correct schema relations
    const [receipts, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().paymentReceipt.findMany({
          where: { status: 'PENDING' },
          include: {
            invoices: { // FIXED: Plural relation
              include: {
                company: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            wallet_numbers: true // FIXED: Plural/Snake_case relation
          },
          orderBy: { submittedAt: 'desc' },
          skip: parseInt(skip),
          take: parseInt(limit)
        }),
        getSharedPrismaClient().paymentReceipt.count({
          where: { status: 'PENDING' }
        })
      ]);
    });

    // Map relations back to frontend expected structure
    const mappedReceipts = receipts.map(receipt => ({
      ...receipt,
      invoice: receipt.invoices,
      invoices: undefined,
      walletNumber: receipt.wallet_numbers,
      wallet_numbers: undefined
    }));

    res.json({
      success: true,
      data: mappedReceipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('خطأ في جلب الإيصالات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإيصالات'
    });
  }
});

// مراجعة إيصال الدفع
router.post('/admin/review-receipt/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    const receipt = await executeWithRetry(async () => {
      return await getSharedPrismaClient().paymentReceipt.findUnique({
        where: { id },
        include: { invoices: true } // FIXED: Plural relation
      });
    });

    if (!receipt) {
      // ...
    }

    if (receipt.status !== 'PENDING') {
      // ...
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    await executeWithRetry(async () => {
      // تحديث حالة الإيصال
      await getSharedPrismaClient().paymentReceipt.update({
        where: { id },
        data: {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: 'admin', // يمكن تحسينه لاحقاً
          notes
        }
      });

      // إذا تم الموافقة، تحديث حالة الفاتورة
      if (action === 'approve') {
        await getSharedPrismaClient().invoice.update({
          where: { id: receipt.invoiceId },
          data: {
            status: 'PAID',
            paidDate: new Date()
          }
        });

        // إنشاء سجل دفع
        // Access invoice via singular relation if it was included that way, but we used singular 'invoices' (mapped?)
        // Wait, 'invoiceId' is on receipt.
        // We need totalAmount. It's in the included invoice.
        // We changed include to 'invoices' (plural).
        // Since it's a relation to ONE invoice, 'invoices' property will be an OBJECT (if it's one-to-one or many-to-one)
        // CHECK SCHEMA: invoices Invoice @relation(...)
        // So receipt.invoices will be the Invoice object.

        await getSharedPrismaClient().payment.create({
          data: {
            paymentNumber: `PAY-${Date.now()}`,
            invoiceId: receipt.invoiceId,
            companyId: receipt.invoices.companyId, // Updated to use .invoices
            amount: receipt.invoices.totalAmount, // Updated to use .invoices
            status: 'COMPLETED',
            method: 'WALLET_TRANSFER',
            paidAt: new Date()
          }
        });
      }
    });

    res.json({
      success: true,
      message: action === 'approve' ? 'تم تأكيد الدفع بنجاح' : 'تم رفض الإيصال'
    });
  } catch (error) {
    console.error('خطأ في مراجعة الإيصال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مراجعة الإيصال'
    });
  }
});

module.exports = router;

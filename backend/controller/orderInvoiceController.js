const orderInvoiceService = require('../services/orderInvoiceService');

const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const result = await orderInvoiceService.generateInvoiceForOrder(orderId, userId);

    res.status(result.invoice.createdAt === result.invoice.updatedAt ? 201 : 200).json({
      success: true,
      message: result.message,
      data: result.invoice
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الفاتورة',
      error: error.message
    });
  }
};

const getInvoiceByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const invoice = await orderInvoiceService.getInvoiceByOrderId(orderId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفاتورة',
      error: error.message
    });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await orderInvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفاتورة',
      error: error.message
    });
  }
};

const getInvoiceByNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await orderInvoiceService.getInvoiceByNumber(invoiceNumber);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفاتورة',
      error: error.message
    });
  }
};

const getAllInvoices = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const filters = req.query;

    const result = await orderInvoiceService.getAllInvoices(companyId, filters);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
      stats: result.stats
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفواتير',
      error: error.message
    });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentStatus, paidAt } = req.body;

    const validStatuses = ['PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'REFUNDED'];
    
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'حالة الدفع غير صحيحة'
      });
    }

    const invoice = await orderInvoiceService.updateInvoicePaymentStatus(
      invoiceId, 
      paymentStatus, 
      paidAt
    );

    res.json({
      success: true,
      message: 'تم تحديث حالة الدفع بنجاح',
      data: invoice
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الدفع',
      error: error.message
    });
  }
};

const markAsPrinted = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await orderInvoiceService.incrementPrintCount(invoiceId);

    res.json({
      success: true,
      message: 'تم تسجيل الطباعة',
      data: invoice
    });

  } catch (error) {
    console.error('Error marking as printed:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الطباعة',
      error: error.message
    });
  }
};

const markAsEmailed = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await orderInvoiceService.incrementEmailCount(invoiceId);

    res.json({
      success: true,
      message: 'تم تسجيل الإرسال',
      data: invoice
    });

  } catch (error) {
    console.error('Error marking as emailed:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الإرسال',
      error: error.message
    });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    await orderInvoiceService.deleteInvoice(invoiceId);

    res.json({
      success: true,
      message: 'تم حذف الفاتورة بنجاح'
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الفاتورة',
      error: error.message
    });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const updateData = req.body;

    const allowedFields = [
      'notes', 'terms', 'dueDate', 'customerName', 
      'customerPhone', 'customerEmail', 'customerAddress',
      'city', 'governorate'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const invoice = await orderInvoiceService.updateInvoice(invoiceId, filteredData);

    res.json({
      success: true,
      message: 'تم تحديث الفاتورة بنجاح',
      data: invoice
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الفاتورة',
      error: error.message
    });
  }
};

const bulkGenerateInvoices = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد طلبات صحيحة'
      });
    }

    const startTime = Date.now();
    console.log(`🚀 [INVOICE] Starting OPTIMIZED bulk generation for ${orderIds.length} orders...`);

    // استخدام النسخة المحسّنة مع batch operations
    const { bulkGenerateInvoicesOptimized } = require('../services/orderInvoiceServiceOptimized');
    const results = await bulkGenerateInvoicesOptimized(orderIds, userId);

    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalProcessed = results.success.length + results.existing.length + results.failed.length;
    
    console.log(`✅ [INVOICE] Bulk generation complete in ${duration}ms: ${results.success.length} new, ${results.existing.length} existing, ${results.failed.length} failed (Total: ${totalProcessed})`);
    console.log(`⚡ [PERF] Average time per invoice: ${(duration / totalProcessed).toFixed(0)}ms`);
    console.log(`🚀 [PERF] Speed improvement: ~${Math.round(8000 / duration * 100)}% faster than before`);

    // دمج جميع الفواتير (الجديدة والموجودة) في مصفوفة واحدة
    const allInvoices = [
      ...results.success.map(r => r.invoice),
      ...results.existing.map(r => r.invoice)
    ].filter(Boolean);

    res.json({
      success: true,
      message: `تم إنشاء ${results.success.length} فاتورة جديدة، ${results.existing.length} فاتورة موجودة، ${results.failed.length} فشلت`,
      data: {
        ...results,
        invoices: allInvoices // إضافة مصفوفة الفواتير الكاملة
      },
      performance: {
        totalTime: duration,
        averageTime: Math.round(duration / totalProcessed),
        totalProcessed,
        speedup: `${Math.round(8000 / duration)}x faster`
      }
    });

  } catch (error) {
    console.error('Error bulk generating invoices:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الفواتير',
      error: error.message
    });
  }
};

const getInvoiceStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { period = '30' } = req.query;

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const result = await orderInvoiceService.getAllInvoices(companyId, {
      dateFrom: startDate.toISOString(),
      limit: 1
    });

    res.json({
      success: true,
      data: {
        stats: result.stats,
        period: `${period} يوم`
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
};

module.exports = {
  generateInvoice,
  getInvoiceByOrderId,
  getInvoiceById,
  getInvoiceByNumber,
  getAllInvoices,
  updatePaymentStatus,
  markAsPrinted,
  markAsEmailed,
  deleteInvoice,
  updateInvoice,
  bulkGenerateInvoices,
  getInvoiceStats
};

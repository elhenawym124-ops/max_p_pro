const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

const generatePaymentNumber = async (companyId) => {
  const lastPayment = await safeQuery(() =>
    getSharedPrismaClient().supplierPayment.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })
  );

  const lastNumber = lastPayment ? parseInt(lastPayment.paymentNumber.split('-').pop()) : 0;
  return `SP-${String(lastNumber + 1).padStart(6, '0')}`;
};

exports.createSupplierPayment = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      supplierId,
      purchaseInvoiceId,
      paymentDate,
      amount,
      paymentMethod,
      referenceNumber,
      bankName,
      checkNumber,
      checkDate,
      notes
    } = req.body;

    if (!supplierId || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'المورد والمبلغ وطريقة الدفع مطلوبة' });
    }

    const paymentAmount = parseFloat(amount);

    if (purchaseInvoiceId) {
      const invoice = await safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.findFirst({
          where: { id: purchaseInvoiceId, companyId }
        })
      );

      if (!invoice) {
        return res.status(404).json({ message: 'الفاتورة غير موجودة' });
      }

      if (paymentAmount > parseFloat(invoice.remainingAmount)) {
        return res.status(400).json({ message: 'المبلغ المدفوع أكبر من المبلغ المتبقي' });
      }
    }

    const paymentNumber = await generatePaymentNumber(companyId);

    const payment = await safeQuery(() =>
      getSharedPrismaClient().supplierPayment.create({
        data: {
          companyId,
          supplierId,
          purchaseInvoiceId: purchaseInvoiceId || null,
          paymentNumber,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: paymentAmount,
          paymentMethod,
          referenceNumber,
          bankName,
          checkNumber,
          checkDate: checkDate ? new Date(checkDate) : null,
          notes,
          createdBy: userId
        },
        include: {
          supplier: true,
          purchaseInvoice: true
        }
      })
    );

    await safeQuery(() =>
      getSharedPrismaClient().supplier.update({
        where: { id: supplierId },
        data: {
          currentBalance: {
            decrement: paymentAmount
          }
        }
      })
    );

    if (purchaseInvoiceId) {
      const invoice = await safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.findUnique({
          where: { id: purchaseInvoiceId }
        })
      );

      const newPaidAmount = parseFloat(invoice.paidAmount) + paymentAmount;
      const newRemainingAmount = parseFloat(invoice.totalAmount) - newPaidAmount;

      let newStatus = invoice.status;
      if (newRemainingAmount <= 0) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.update({
          where: { id: purchaseInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus
          }
        })
      );
    }

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      payment
    });
  } catch (error) {
    console.error('Error creating supplier payment:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدفعة: ' + error.message,
      error: error.message
    });
  }
};

exports.getAllSupplierPayments = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, supplierId, paymentMethod, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (supplierId) where.supplierId = supplierId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) {
      where.OR = [
        { paymentNumber: { contains: search } },
        { referenceNumber: { contains: search } },
        { notes: { contains: search } }
      ];
    }

    const [payments, total] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().supplierPayment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true, phone: true }
          },
          purchaseInvoice: {
            select: { id: true, invoiceNumber: true }
          }
        }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where }))
    ]);

    res.json({
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المدفوعات' });
  }
};

exports.getSupplierPaymentById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const payment = await safeQuery(() => getSharedPrismaClient().supplierPayment.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        purchaseInvoice: {
          include: {
            items: true
          }
        }
      }
    }));

    if (!payment) {
      return res.status(404).json({ message: 'الدفعة غير موجودة' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching supplier payment:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الدفعة' });
  }
};

exports.updateSupplierPayment = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id = req.params.id } = req.params;
    const {
      paymentDate,
      paymentMethod,
      referenceNumber,
      bankName,
      checkNumber,
      checkDate,
      notes
    } = req.body;

    const existingPayment = await safeQuery(() => getSharedPrismaClient().supplierPayment.findFirst({
      where: { id, companyId }
    }));

    if (!existingPayment) {
      return res.status(404).json({ message: 'الدفعة غير موجودة' });
    }

    const payment = await safeQuery(() => getSharedPrismaClient().supplierPayment.update({
      where: { id },
      data: {
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        paymentMethod,
        referenceNumber,
        bankName,
        checkNumber,
        checkDate: checkDate ? new Date(checkDate) : undefined,
        notes
      },
      include: {
        supplier: true,
        purchaseInvoice: true
      }
    }));

    res.json({
      message: 'تم تحديث الدفعة بنجاح',
      payment
    });
  } catch (error) {
    console.error('Error updating supplier payment:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث الدفعة' });
  }
};

exports.deleteSupplierPayment = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const payment = await safeQuery(() => getSharedPrismaClient().supplierPayment.findFirst({
      where: { id, companyId }
    }));

    if (!payment) {
      return res.status(404).json({ message: 'الدفعة غير موجودة' });
    }

    await safeQuery(() =>
      getSharedPrismaClient().supplier.update({
        where: { id: payment.supplierId },
        data: {
          currentBalance: {
            increment: parseFloat(payment.amount)
          }
        }
      })
    );

    if (payment.purchaseInvoiceId) {
      const invoice = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findUnique({
        where: { id: payment.purchaseInvoiceId }
      }));

      const newPaidAmount = parseFloat(invoice.paidAmount) - parseFloat(payment.amount);
      const newRemainingAmount = parseFloat(invoice.totalAmount) - newPaidAmount;

      let newStatus = 'PENDING';
      if (newPaidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.update({
          where: { id: payment.purchaseInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus
          }
        })
      );
    }

    await safeQuery(() => getSharedPrismaClient().supplierPayment.delete({
      where: { id }
    }));

    res.json({ message: 'تم حذف الدفعة بنجاح' });
  } catch (error) {
    console.error('Error deleting supplier payment:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الدفعة' });
  }
};

exports.getSupplierPaymentStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [totalPayments, totalAmount, cashPayments, bankTransfers, checks] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.aggregate({
        where: { companyId },
        _sum: { amount: true }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId, paymentMethod: 'CASH' } })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId, paymentMethod: 'BANK_TRANSFER' } })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId, paymentMethod: 'CHECK' } }))
    ]);

    res.json({
      totalPayments,
      totalAmount: totalAmount._sum.amount || 0,
      cashPayments,
      bankTransfers,
      checks
    });
  } catch (error) {
    console.error('Error fetching supplier payment stats:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
};

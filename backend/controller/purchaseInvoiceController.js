const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

const generateInvoiceNumber = async (companyId) => {
  const lastInvoice = await safeQuery(() =>
    getSharedPrismaClient().purchaseInvoice.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })
  );

  const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-').pop()) : 0;
  return `PI-${String(lastNumber + 1).padStart(6, '0')}`;
};

exports.createPurchaseInvoice = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      supplierId,
      purchaseOrderId,
      invoiceDate,
      dueDate,
      items,
      notes,
      shippingCost,
      discountAmount
    } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: 'المورد والأصناف مطلوبة' });
    }

    const invoiceNumber = await generateInvoiceNumber(companyId);

    let subtotal = 0;
    let taxAmount = 0;

    const invoiceItems = items.map(item => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const taxRate = parseFloat(item.taxRate || 0);
      const discountRate = parseFloat(item.discountRate || 0);

      const itemSubtotal = quantity * unitPrice;
      const itemDiscount = itemSubtotal * (discountRate / 100);
      const itemTax = (itemSubtotal - itemDiscount) * (taxRate / 100);
      const totalPrice = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      return {
        productId: item.productId || null,
        productName: item.productName,
        description: item.description,
        quantity,
        unitPrice,
        taxRate,
        discountRate,
        totalPrice,
        notes: item.notes
      };
    });

    const shipping = parseFloat(shippingCost || 0);
    const discount = parseFloat(discountAmount || 0);
    const totalAmount = subtotal + taxAmount + shipping - discount;

    const invoice = await safeQuery(() =>
      getSharedPrismaClient().purchaseInvoice.create({
        data: {
          companyId,
          supplierId,
          purchaseOrderId: purchaseOrderId || null,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotal,
          taxAmount,
          discountAmount: discount,
          shippingCost: shipping,
          totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
          notes,
          createdBy: userId,
          items: {
            create: invoiceItems
          }
        },
        include: {
          items: true,
          supplier: true,
          purchaseOrder: true
        }
      })
    );

    await safeQuery(() =>
      getSharedPrismaClient().supplier.update({
        where: { id: supplierId },
        data: {
          currentBalance: {
            increment: totalAmount
          }
        }
      })
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفاتورة بنجاح',
      invoice
    });
  } catch (error) {
    console.error('Error creating purchase invoice:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الفاتورة: ' + error.message,
      error: error.message,
      details: error.stack
    });
  }
};

exports.getAllPurchaseInvoices = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, status, supplierId, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { notes: { contains: search } }
      ];
    }

    const [invoices, total] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true, phone: true }
          },
          purchaseOrder: {
            select: { id: true, orderNumber: true }
          },
          _count: {
            select: { items: true, payments: true }
          }
        }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where }))
    ]);

    res.json({
      invoices,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching purchase invoices:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الفواتير' });
  }
};

exports.getPurchaseInvoiceById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const invoice = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    }));

    if (!invoice) {
      return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching purchase invoice:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الفاتورة' });
  }
};

exports.updatePurchaseInvoice = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const {
      supplierId,
      invoiceDate,
      dueDate,
      status,
      notes
    } = req.body;

    const existingInvoice = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findFirst({
      where: { id, companyId }
    }));

    if (!existingInvoice) {
      return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    }

    if (existingInvoice.status === 'PAID') {
      return res.status(400).json({ message: 'لا يمكن تعديل فاتورة مدفوعة بالكامل' });
    }

    const invoice = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.update({
      where: { id },
      data: {
        supplierId,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        notes
      },
      include: {
        items: true,
        supplier: true,
        payments: true
      }
    }));

    res.json({
      message: 'تم تحديث الفاتورة بنجاح',
      invoice
    });
  } catch (error) {
    console.error('Error updating purchase invoice:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث الفاتورة' });
  }
};

exports.deletePurchaseInvoice = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const invoice = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { payments: true }
        }
      }
    }));

    if (!invoice) {
      return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    }

    if (invoice._count.payments > 0) {
      return res.status(400).json({ message: 'لا يمكن حذف فاتورة مرتبطة بمدفوعات' });
    }

    await safeQuery(() =>
      getSharedPrismaClient().supplier.update({
        where: { id: invoice.supplierId },
        data: {
          currentBalance: {
            decrement: invoice.totalAmount
          }
        }
      })
    );

    await safeQuery(() => getSharedPrismaClient().purchaseInvoice.delete({
      where: { id }
    }));

    res.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (error) {
    console.error('Error deleting purchase invoice:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الفاتورة' });
  }
};

exports.getPurchaseInvoiceStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [totalInvoices, pendingInvoices, overdueInvoices, totalAmount, paidAmount, pendingAmount] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where: { companyId, status: 'PENDING' } })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where: { companyId, status: 'OVERDUE' } })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.aggregate({
        where: { companyId, status: { notIn: ['CANCELLED'] } },
        _sum: { totalAmount: true }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.aggregate({
        where: { companyId, status: { notIn: ['CANCELLED'] } },
        _sum: { paidAmount: true }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.aggregate({
        where: { companyId, status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { remainingAmount: true }
      }))
    ]);

    res.json({
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount: totalAmount._sum.totalAmount || 0,
      paidAmount: paidAmount._sum.paidAmount || 0,
      pendingAmount: pendingAmount._sum.remainingAmount || 0
    });
  } catch (error) {
    console.error('Error fetching purchase invoice stats:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
};

exports.checkOverdueInvoices = async (req, res) => {
  try {
    const { companyId } = req.user;

    const overdueInvoices = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: new Date() }
      }
    }));

    for (const invoice of overdueInvoices) {
      await safeQuery(() => getSharedPrismaClient().purchaseInvoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' }
      }));
    }

    res.json({
      message: 'تم تحديث حالة الفواتير المتأخرة',
      count: overdueInvoices.length
    });
  } catch (error) {
    console.error('Error checking overdue invoices:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء فحص الفواتير المتأخرة' });
  }
};

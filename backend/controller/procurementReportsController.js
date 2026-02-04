const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

exports.getProcurementDashboard = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [
      totalSuppliers,
      activeSuppliers,
      totalPurchaseOrders,
      pendingOrders,
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      totalPayments,
      totalPurchaseAmount,
      totalPaidAmount,
      totalPendingAmount,
      topSuppliers,
      recentOrders,
      recentInvoices,
      recentPayments
    ] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().supplier.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().supplier.count({ where: { companyId, isActive: true } })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where: { companyId, status: { in: ['PENDING', 'APPROVED'] } } })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where: { companyId, status: 'PENDING' } })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({ where: { companyId, status: 'OVERDUE' } })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.aggregate({
        where: { companyId, status: { notIn: ['CANCELLED'] } },
        _sum: { totalAmount: true }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.aggregate({
        where: { companyId },
        _sum: { amount: true }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.aggregate({
        where: { companyId, status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { remainingAmount: true }
      })),
      safeQuery(() => getSharedPrismaClient().supplier.findMany({
        where: { companyId },
        orderBy: { currentBalance: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          currentBalance: true,
          _count: {
            select: {
              purchaseOrders: true,
              purchaseInvoices: true
            }
          }
        }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          supplier: { select: { id: true, name: true } }
        }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          supplier: { select: { id: true, name: true } }
        }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          supplier: { select: { id: true, name: true } }
        }
      }))
    ]);

    res.json({
      summary: {
        totalSuppliers,
        activeSuppliers,
        totalPurchaseOrders,
        pendingOrders,
        totalInvoices,
        pendingInvoices,
        overdueInvoices,
        totalPayments,
        totalPurchaseAmount: totalPurchaseAmount._sum.totalAmount || 0,
        totalPaidAmount: totalPaidAmount._sum.amount || 0,
        totalPendingAmount: totalPendingAmount._sum.remainingAmount || 0
      },
      topSuppliers,
      recentOrders,
      recentInvoices,
      recentPayments
    });
  } catch (error) {
    console.error('Error fetching procurement dashboard:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب لوحة المعلومات' });
  }
};

exports.getSupplierReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, supplierId } = req.query;

    const where = { companyId };
    if (supplierId) where.id = supplierId;

    const suppliers = await safeQuery(() => getSharedPrismaClient().supplier.findMany({
      where,
      include: {
        purchaseOrders: {
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            }
          }
        },
        purchaseInvoices: {
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            }
          }
        },
        supplierPayments: {
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            }
          }
        }
      }
    }));

    const report = suppliers.map(supplier => {
      const totalOrders = supplier.purchaseOrders.length;
      const totalOrderAmount = supplier.purchaseOrders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount), 0
      );
      const totalInvoices = supplier.purchaseInvoices.length;
      const totalInvoiceAmount = supplier.purchaseInvoices.reduce(
        (sum, invoice) => sum + parseFloat(invoice.totalAmount), 0
      );
      const totalPayments = supplier.supplierPayments.length;
      const totalPaidAmount = supplier.supplierPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount), 0
      );

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        totalOrders,
        totalOrderAmount,
        totalInvoices,
        totalInvoiceAmount,
        totalPayments,
        totalPaidAmount,
        currentBalance: supplier.currentBalance,
        rating: supplier.rating
      };
    });

    res.json({ report });
  } catch (error) {
    console.error('Error generating supplier report:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء التقرير' });
  }
};

exports.getPurchaseOrderReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, status, supplierId } = req.query;

    const where = { companyId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined
      };
    }

    const orders = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    }));

    const summary = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
      byStatus: {}
    };

    orders.forEach(order => {
      if (!summary.byStatus[order.status]) {
        summary.byStatus[order.status] = { count: 0, amount: 0 };
      }
      summary.byStatus[order.status].count++;
      summary.byStatus[order.status].amount += parseFloat(order.totalAmount);
    });

    res.json({ summary, orders });
  } catch (error) {
    console.error('Error generating purchase order report:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء التقرير' });
  }
};

exports.getInvoiceReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, status, supplierId } = req.query;

    const where = { companyId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined
      };
    }

    const invoices = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    }));

    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0),
      totalPaid: invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0),
      totalPending: invoices.reduce((sum, inv) => sum + parseFloat(inv.remainingAmount), 0),
      byStatus: {}
    };

    invoices.forEach(invoice => {
      if (!summary.byStatus[invoice.status]) {
        summary.byStatus[invoice.status] = { count: 0, amount: 0, paid: 0, pending: 0 };
      }
      summary.byStatus[invoice.status].count++;
      summary.byStatus[invoice.status].amount += parseFloat(invoice.totalAmount);
      summary.byStatus[invoice.status].paid += parseFloat(invoice.paidAmount);
      summary.byStatus[invoice.status].pending += parseFloat(invoice.remainingAmount);
    });

    res.json({ summary, invoices });
  } catch (error) {
    console.error('Error generating invoice report:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء التقرير' });
  }
};

exports.getPaymentReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, paymentMethod, supplierId } = req.query;

    const where = { companyId };
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (supplierId) where.supplierId = supplierId;
    if (startDate || endDate) {
      where.paymentDate = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined
      };
    }

    const payments = await safeQuery(() => getSharedPrismaClient().supplierPayment.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseInvoice: { select: { id: true, invoiceNumber: true } }
      },
      orderBy: { paymentDate: 'desc' }
    }));

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
      byMethod: {}
    };

    payments.forEach(payment => {
      if (!summary.byMethod[payment.paymentMethod]) {
        summary.byMethod[payment.paymentMethod] = { count: 0, amount: 0 };
      }
      summary.byMethod[payment.paymentMethod].count++;
      summary.byMethod[payment.paymentMethod].amount += parseFloat(payment.amount);
    });

    res.json({ summary, payments });
  } catch (error) {
    console.error('Error generating payment report:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء التقرير' });
  }
};

exports.getProductPurchaseReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, productId } = req.query;

    const whereParams = { companyId };
    if (startDate || endDate) {
      whereParams.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined
      };
    }

    const orderItems = await safeQuery(() => getSharedPrismaClient().purchaseOrderItem.findMany({
      where: {
        purchaseOrder: whereParams,
        productId: productId || undefined
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        purchaseOrder: {
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            status: true,
            supplier: { select: { id: true, name: true } }
          }
        }
      }
    }));

    const productSummary = {};

    orderItems.forEach(item => {
      const key = item.productId || item.productName;
      if (!productSummary[key]) {
        productSummary[key] = {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: 0,
          totalAmount: 0,
          orders: []
        };
      }
      productSummary[key].totalQuantity += parseFloat(item.quantity);
      productSummary[key].totalAmount += parseFloat(item.totalPrice);
      productSummary[key].orders.push({
        orderNumber: item.purchaseOrder.orderNumber,
        orderDate: item.purchaseOrder.orderDate,
        supplierName: item.purchaseOrder.supplier.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      });
    });

    res.json({
      productSummary: Object.values(productSummary)
    });
  } catch (error) {
    console.error('Error generating product purchase report:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء التقرير' });
  }
};

exports.getAgingReport = async (req, res) => {
  try {
    const { companyId } = req.user;

    const invoices = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] }
      },
      include: {
        supplier: { select: { id: true, name: true } }
      }
    }));

    const today = new Date();
    const aging = {
      current: { count: 0, amount: 0, invoices: [] },
      days30: { count: 0, amount: 0, invoices: [] },
      days60: { count: 0, amount: 0, invoices: [] },
      days90: { count: 0, amount: 0, invoices: [] },
      over90: { count: 0, amount: 0, invoices: [] }
    };

    invoices.forEach(invoice => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const daysPastDue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
      const amount = parseFloat(invoice.remainingAmount);

      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        supplierName: invoice.supplier.name,
        dueDate: invoice.dueDate,
        daysPastDue,
        remainingAmount: amount
      };

      if (daysPastDue <= 0) {
        aging.current.count++;
        aging.current.amount += amount;
        aging.current.invoices.push(invoiceData);
      } else if (daysPastDue <= 30) {
        aging.days30.count++;
        aging.days30.amount += amount;
        aging.days30.invoices.push(invoiceData);
      } else if (daysPastDue <= 60) {
        aging.days60.count++;
        aging.days60.amount += amount;
        aging.days60.invoices.push(invoiceData);
      } else if (daysPastDue <= 90) {
        aging.days90.count++;
        aging.days90.amount += amount;
        aging.days90.invoices.push(invoiceData);
      } else {
        aging.over90.count++;
        aging.over90.amount += amount;
        aging.over90.invoices.push(invoiceData);
      }
    });

    res.json({ aging });
  } catch (error) {
    console.error('Error generating aging report:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء التقرير' });
  }
};

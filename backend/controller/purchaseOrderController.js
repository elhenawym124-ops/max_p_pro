const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

const generateOrderNumber = async (companyId) => {
  const lastOrder = await safeQuery(() =>
    getSharedPrismaClient().purchaseOrder.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })
  );

  const lastNumber = lastOrder ? parseInt(lastOrder.orderNumber.split('-').pop()) : 0;
  return `PO-${String(lastNumber + 1).padStart(6, '0')}`;
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      supplierId,
      orderDate,
      expectedDelivery,
      items,
      paymentTerms,
      notes,
      shippingCost,
      discountAmount
    } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: 'المورد والأصناف مطلوبة' });
    }

    const orderNumber = await generateOrderNumber(companyId);

    let subtotal = 0;
    let taxAmount = 0;

    const orderItems = items.map(item => {
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

    const purchaseOrder = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.create({
        data: {
          companyId,
          supplierId,
          orderNumber,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
          subtotal,
          taxAmount,
          discountAmount: discount,
          shippingCost: shipping,
          totalAmount,
          paymentTerms,
          notes,
          createdBy: userId,
          items: {
            create: orderItems
          }
        },
        include: {
          items: true,
          supplier: true
        }
      })
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء أمر الشراء بنجاح',
      purchaseOrder
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء أمر الشراء: ' + error.message,
      error: error.message,
      details: error.stack
    });
  }
};

exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, status, supplierId, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { notes: { contains: search } }
      ];
    }

    const [orders, total] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().purchaseOrder.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true, phone: true }
          },
          _count: {
            select: { items: true }
          }
        }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where }))
    ]);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب أوامر الشراء' });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, stock: true }
            }
          }
        },
        invoices: true
      }
    }));

    if (!order) {
      return res.status(404).json({ message: 'أمر الشراء غير موجود' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب أمر الشراء' });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const {
      supplierId,
      orderDate,
      expectedDelivery,
      status,
      paymentTerms,
      notes,
      shippingCost,
      discountAmount
    } = req.body;

    const existingOrder = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findFirst({
      where: { id, companyId }
    }));

    if (!existingOrder) {
      return res.status(404).json({ message: 'أمر الشراء غير موجود' });
    }

    if (existingOrder.status === 'RECEIVED' || existingOrder.status === 'CLOSED') {
      return res.status(400).json({ message: 'لا يمكن تعديل أمر شراء مستلم أو مغلق' });
    }

    const order = await safeQuery(() => getSharedPrismaClient().purchaseOrder.update({
      where: { id },
      data: {
        supplierId,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
        status,
        paymentTerms,
        notes,
        shippingCost: shippingCost ? parseFloat(shippingCost) : undefined,
        discountAmount: discountAmount ? parseFloat(discountAmount) : undefined
      },
      include: {
        items: true,
        supplier: true
      }
    }));

    res.json({
      message: 'تم تحديث أمر الشراء بنجاح',
      order
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث أمر الشراء' });
  }
};

exports.approvePurchaseOrder = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findFirst({
      where: { id, companyId }
    }));

    if (!order) {
      return res.status(404).json({ message: 'أمر الشراء غير موجود' });
    }

    if (order.status !== 'DRAFT' && order.status !== 'PENDING') {
      return res.status(400).json({ message: 'لا يمكن الموافقة على هذا الأمر' });
    }

    const updatedOrder = await safeQuery(() => getSharedPrismaClient().purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date()
      },
      include: {
        items: true,
        supplier: true
      }
    }));

    res.json({
      message: 'تمت الموافقة على أمر الشراء بنجاح',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error approving purchase order:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء الموافقة على أمر الشراء' });
  }
};

exports.receiveItems = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { items, receivedDate } = req.body;

    const order = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findFirst({
      where: { id, companyId },
      include: { items: true }
    }));

    if (!order) {
      return res.status(404).json({ message: 'أمر الشراء غير موجود' });
    }

    if (order.status !== 'APPROVED' && order.status !== 'SENT' && order.status !== 'PARTIALLY_RECEIVED') {
      return res.status(400).json({ message: 'لا يمكن استلام أصناف من هذا الأمر' });
    }

    for (const item of items) {
      const orderItem = order.items.find(i => i.id === item.itemId);
      if (!orderItem) continue;

      const newReceivedQty = parseFloat(orderItem.receivedQuantity) + parseFloat(item.receivedQuantity);

      await safeQuery(() => getSharedPrismaClient().purchaseOrderItem.update({
        where: { id: item.itemId },
        data: { receivedQuantity: newReceivedQty }
      }));

      if (orderItem.productId && item.updateInventory) {
        const product = await safeQuery(() => getSharedPrismaClient().product.findUnique({
          where: { id: orderItem.productId }
        }));

        if (product) {
          await safeQuery(() => getSharedPrismaClient().product.update({
            where: { id: orderItem.productId },
            data: {
              stock: product.stock + parseInt(item.receivedQuantity),
              cost: parseFloat(orderItem.unitPrice)
            }
          }));
        }
      }
    }

    const updatedOrder = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findFirst({
      where: { id },
      include: { items: true }
    }));

    const allReceived = updatedOrder.items.every(
      item => parseFloat(item.receivedQuantity) >= parseFloat(item.quantity)
    );

    const partiallyReceived = updatedOrder.items.some(
      item => parseFloat(item.receivedQuantity) > 0
    );

    let newStatus = order.status;
    if (allReceived) {
      newStatus = 'RECEIVED';
    } else if (partiallyReceived) {
      newStatus = 'PARTIALLY_RECEIVED';
    }

    const finalOrder = await safeQuery(() => getSharedPrismaClient().purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date()
      },
      include: {
        items: true,
        supplier: true
      }
    }));

    if (newStatus === 'RECEIVED') {
      try {
        const lastInvoice = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' }
        }));
        const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-').pop()) : 0;
        const invoiceNumber = `PI-${String(lastNumber + 1).padStart(6, '0')}`;

        await safeQuery(() => getSharedPrismaClient().purchaseInvoice.create({
          data: {
            companyId,
            supplierId: order.supplierId,
            purchaseOrderId: order.id,
            invoiceNumber,
            invoiceDate: new Date(),
            subtotal: order.subtotal,
            taxAmount: order.taxAmount,
            discountAmount: order.discountAmount,
            shippingCost: order.shippingCost,
            totalAmount: order.totalAmount,
            paidAmount: 0,
            remainingAmount: order.totalAmount,
            status: 'PENDING',
            createdBy: order.createdBy,
            items: {
              create: order.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
                discountRate: item.discountRate,
                totalPrice: item.totalPrice
              }))
            }
          }
        }));

        await safeQuery(() => getSharedPrismaClient().supplier.update({
          where: { id: order.supplierId },
          data: {
            currentBalance: { increment: order.totalAmount }
          }
        }));
      } catch (invError) {
        console.error('Error creating automated invoice:', invError);
      }
    }

    res.json({
      message: 'تم استلام الأصناف بنجاح',
      order: finalOrder
    });
  } catch (error) {
    console.error('Error receiving items:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء استلام الأصناف' });
  }
};

exports.cancelPurchaseOrder = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findFirst({
      where: { id, companyId }
    }));

    if (!order) {
      return res.status(404).json({ message: 'أمر الشراء غير موجود' });
    }

    if (order.status === 'RECEIVED' || order.status === 'CLOSED') {
      return res.status(400).json({ message: 'لا يمكن إلغاء أمر شراء مستلم أو مغلق' });
    }

    const updatedOrder = await safeQuery(() => getSharedPrismaClient().purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        items: true,
        supplier: true
      }
    }));

    res.json({
      message: 'تم إلغاء أمر الشراء بنجاح',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إلغاء أمر الشراء' });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() => getSharedPrismaClient().purchaseOrder.findFirst({
      where: { id, companyId }
    }));

    if (!order) {
      return res.status(404).json({ message: 'أمر الشراء غير موجود' });
    }

    if (order.status !== 'DRAFT' && order.status !== 'CANCELLED') {
      return res.status(400).json({ message: 'يمكن حذف المسودات والأوامر الملغاة فقط' });
    }

    await safeQuery(() => getSharedPrismaClient().purchaseOrder.delete({
      where: { id }
    }));

    res.json({ message: 'تم حذف أمر الشراء بنجاح' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف أمر الشراء' });
  }
};

exports.getPurchaseOrderStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [totalOrders, draftOrders, pendingOrders, approvedOrders, totalAmount] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where: { companyId, status: 'DRAFT' } })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where: { companyId, status: 'PENDING' } })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where: { companyId, status: 'APPROVED' } })),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.aggregate({
        where: { companyId, status: { notIn: ['CANCELLED'] } },
        _sum: { totalAmount: true }
      }))
    ]);

    res.json({
      totalOrders,
      draftOrders,
      pendingOrders,
      approvedOrders,
      totalAmount: totalAmount._sum.totalAmount || 0
    });
  } catch (error) {
    console.error('Error fetching purchase order stats:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
};

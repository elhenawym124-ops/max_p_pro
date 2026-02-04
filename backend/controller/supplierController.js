const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

exports.createSupplier = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      name,
      contactPerson,
      email,
      phone,
      mobile,
      address,
      city,
      country,
      taxNumber,
      commercialRegister,
      paymentTerms,
      creditLimit,
      rating,
      notes,
      isActive
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'اسم المورد مطلوب' });
    }

    const supplier = await safeQuery(() =>
      getSharedPrismaClient().supplier.create({
        data: {
          companyId,
          name,
          contactPerson,
          email,
          phone,
          mobile,
          address,
          city,
          country: country || 'Egypt',
          taxNumber,
          commercialRegister,
          paymentTerms,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null,
          rating: rating ? parseInt(rating) : 0,
          notes,
          isActive: isActive !== undefined ? isActive : true,
          createdBy: userId
        }
      })
    );

    res.status(201).json({
      success: true,
      message: 'تم إضافة المورد بنجاح',
      supplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة المورد: ' + error.message,
      error: error.message
    });
  }
};

exports.getAllSuppliers = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, search, isActive } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [suppliers, total] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().supplier.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              purchaseOrders: true,
              purchaseInvoices: true
            }
          }
        }
      })),
      safeQuery(() => getSharedPrismaClient().supplier.count({ where }))
    ]);

    res.json({
      suppliers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الموردين' });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        purchaseInvoices: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        supplierPayments: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    }));

    if (!supplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات المورد' });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const {
      name,
      contactPerson,
      email,
      phone,
      mobile,
      address,
      city,
      country,
      taxNumber,
      commercialRegister,
      paymentTerms,
      creditLimit,
      rating,
      notes,
      isActive
    } = req.body;

    const existingSupplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId }
    }));

    if (!existingSupplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.update({
      where: { id },
      data: {
        name,
        contactPerson,
        email,
        phone,
        mobile,
        address,
        city,
        country,
        taxNumber,
        commercialRegister,
        paymentTerms,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        rating: rating ? parseInt(rating) : existingSupplier.rating,
        notes,
        isActive
      }
    }));

    res.json({
      message: 'تم تحديث بيانات المورد بنجاح',
      supplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث بيانات المورد' });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            purchaseInvoices: true
          }
        }
      }
    }));

    if (!supplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    if (supplier._count.purchaseOrders > 0 || supplier._count.purchaseInvoices > 0) {
      return res.status(400).json({
        message: 'لا يمكن حذف المورد لأنه مرتبط بأوامر شراء أو فواتير'
      });
    }

    await safeQuery(() => getSharedPrismaClient().supplier.delete({
      where: { id }
    }));

    res.json({ message: 'تم حذف المورد بنجاح' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف المورد' });
  }
};

exports.getSupplierStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const supplier = await safeQuery(() => getSharedPrismaClient().supplier.findFirst({
      where: { id, companyId }
    }));

    if (!supplier) {
      return res.status(404).json({ message: 'المورد غير موجود' });
    }

    const [totalOrders, totalInvoices, totalPaid, pendingAmount] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({
        where: { supplierId: id, companyId }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.count({
        where: { supplierId: id, companyId }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.aggregate({
        where: { supplierId: id, companyId },
        _sum: { amount: true }
      })),
      safeQuery(() => getSharedPrismaClient().purchaseInvoice.aggregate({
        where: {
          supplierId: id,
          companyId,
          status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] }
        },
        _sum: { remainingAmount: true }
      }))
    ]);

    res.json({
      totalOrders,
      totalInvoices,
      totalPaid: totalPaid._sum.amount || 0,
      pendingAmount: pendingAmount._sum.remainingAmount || 0,
      currentBalance: supplier.currentBalance
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب إحصائيات المورد' });
  }
};

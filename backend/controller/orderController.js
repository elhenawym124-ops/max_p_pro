const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const getAllOrders = async (req, res) => {
  try {
    // Mock orders data with complete structure
    const mockOrders = [
      {
        id: 'ORD-001',
        customerName: 'أحمد محمد',
        customerEmail: 'ahmed@example.com',
        customerPhone: '+966501234567',
        total: 250.00,
        subtotal: 220.00,
        tax: 20.00,
        shipping: 10.00,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'cash_on_delivery',
        shippingAddress: {
          street: 'شارع الملك فهد',
          city: 'الرياض',
          state: 'الرياض',
          zipCode: '12345',
          country: 'السعودية'
        },
        items: [
          {
            id: '1',
            productId: 'cmdfynvxd0007ufegvkqvnajx',
            name: 'كوتشي اسكوتش',
            price: 310.00,
            quantity: 1,
            total: 310.00
          }
        ],
        trackingNumber: null,
        notes: 'توصيل سريع',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ORD-002',
        customerName: 'فاطمة علي',
        customerEmail: 'fatima@example.com',
        customerPhone: '+966507654321',
        total: 180.50,
        subtotal: 160.00,
        tax: 15.50,
        shipping: 5.00,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'credit_card',
        shippingAddress: {
          street: 'شارع العليا',
          city: 'جدة',
          state: 'مكة المكرمة',
          zipCode: '23456',
          country: 'السعودية'
        },
        items: [
          {
            id: '2',
            productId: 'cmdfynvxd0007ufegvkqvnajx',
            name: 'كوتشي اسكوتش',
            price: 310.00,
            quantity: 1,
            total: 310.00
          }
        ],
        trackingNumber: 'TRK123456789',
        notes: 'تم التوصيل بنجاح',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // يوم واحد مضى
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ORD-003',
        customerName: 'محمد السعيد',
        customerEmail: 'mohammed@example.com',
        customerPhone: '+966509876543',
        total: 620.00,
        subtotal: 550.00,
        tax: 55.00,
        shipping: 15.00,
        status: 'processing',
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        shippingAddress: {
          street: 'شارع الأمير محمد بن عبدالعزيز',
          city: 'الدمام',
          state: 'الشرقية',
          zipCode: '34567',
          country: 'السعودية'
        },
        items: [
          {
            id: '3',
            productId: 'cmdfynvxd0007ufegvkqvnajx',
            name: 'كوتشي اسكوتش',
            price: 310.00,
            quantity: 2,
            total: 620.00
          }
        ],
        trackingNumber: 'TRK987654321',
        notes: 'طلب عاجل',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // يومين مضيا
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: mockOrders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, notes } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    console.log(`🔍 [ORDER-CONTROLLER-DEBUG] Update request received:`);
    console.log(`   - Order ID: ${id}`);
    console.log(`   - New Status: ${status}`);
    console.log(`   - Company ID: ${companyId}`);
    console.log(`   - User:`, req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Unknown');

    if (!companyId) {
      console.log(`❌ [ORDER-CONTROLLER-DEBUG] No company ID found`);
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // استخدام OrderService الحقيقي
    console.log(`🔧 [ORDER-CONTROLLER-DEBUG] Preparing OrderService...`);
    const orderService = require('../services/orderService');

    // تحديث حالة الطلب (id هنا قد يكون id أو orderNumber) مع تمرير companyId والمستخدم
    console.log(`📞 [ORDER-CONTROLLER-DEBUG] Calling updateOrderStatus with companyId and user...`);
    const updatedOrder = await orderService.updateOrderStatus(
      id,
      companyId,
      status,
      notes,
      req.user?.id || null,
      req.user ? `${req.user.firstName} ${req.user.lastName}` : null
    );

    res.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        trackingNumber: updatedOrder.turboTrackingNumber || trackingNumber,
        turboShipmentId: updatedOrder.turboShipmentId,
        updatedAt: updatedOrder.updatedAt.toISOString()
      },
      message: 'تم تحديث حالة الطلب بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in updateOrder controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order'
    });
  }
}

const getOneOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Mock single order data
    const mockOrder = {
      id: id,
      customerName: 'أحمد محمد',
      customerEmail: 'ahmed@example.com',
      customerPhone: '+966501234567',
      total: 250.00,
      subtotal: 220.00,
      tax: 20.00,
      shipping: 10.00,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      shippingAddress: {
        street: 'شارع الملك فهد',
        city: 'الرياض',
        state: 'الرياض',
        zipCode: '12345',
        country: 'السعودية'
      },
      items: [
        {
          id: '1',
          productId: 'cmdfynvxd0007ufegvkqvnajx',
          name: 'كوتشي اسكوتش',
          price: 310.00,
          quantity: 1,
          total: 310.00
        }
      ],
      trackingNumber: null,
      notes: 'توصيل سريع',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: mockOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const deleteAllOrders = async (req, res) => {
  try {
    console.log('🗑️ [ORDERS] Delete all orders request received');

    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // حذف جميع الطلبات للشركة
    const deleteResult = await getSharedPrismaClient().order.deleteMany({
      where: {
        companyId: companyId
      }
    });

    console.log(`✅ [ORDERS] Deleted ${deleteResult.count} orders for company ${companyId}`);

    res.json({
      success: true,
      message: `تم حذف ${deleteResult.count} طلب بنجاح`,
      deletedCount: deleteResult.count
    });

  } catch (error) {
    console.error('❌ [ORDERS] Error deleting all orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الطلبات',
      error: error.message
    });
  }
};

module.exports = { getAllOrders, updateOrder, getOneOrder, deleteAllOrders }

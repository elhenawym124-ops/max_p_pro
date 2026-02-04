const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const PolicyPdfService = require('../services/policyPdfService');
const HtmlPolicyService = require('../services/htmlPolicyService');

// Generate and download policy HTML (for better Arabic support)
router.get('/generate/:orderNumber', requireAuth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    console.log(`� Generating policy HTML for order: ${orderNumber}, company: ${companyId}`);

    const prisma = getSharedPrismaClient();

    // Try to find regular order first
    let order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber,
        companyId: companyId
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true
      }
    });

    // If not found, try guest orders
    if (!order) {
      order = await prisma.guestOrder.findFirst({
        where: {
          orderNumber: orderNumber,
          companyId: companyId
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Transform the order data for HTML generation
    const orderData = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      tax: order.tax,
      total: order.total,
      shippingAddress: order.shippingAddress,
      customer: order.customer || null,
      guestInfo: order.guestInfo || {
        name: order.guestName,
        email: order.guestEmail,
        phone: order.guestPhone
      },
      items: order.items?.map(item => ({
        productName: item.product?.name || item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      })) || []
    };

    console.log(`📊 Order data prepared:`, {
      orderNumber: orderData.orderNumber,
      itemsCount: orderData.items.length,
      total: orderData.total
    });

    // Generate HTML using HtmlPolicyService (better Arabic support)
    const htmlPolicyService = new HtmlPolicyService();
    const htmlContent = await htmlPolicyService.generatePolicyHtml(orderData);

    console.log(`✅ HTML generated successfully`);

    // Set response headers for HTML display
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Send the HTML content
    res.send(htmlContent);

  } catch (error) {
    console.error('❌ Error generating policy HTML:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate policy HTML',
      error: error.message
    });
  }
});

function transformOrderForPdf(order, isGuestOrder = false) {
  if (isGuestOrder) {
    // Transform guest order
    let items = order.items || [];
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
    }

    let shippingAddress = order.shippingAddress || {};
    if (typeof shippingAddress === 'string') {
      try {
        shippingAddress = JSON.parse(shippingAddress);
      } catch (e) {
        shippingAddress = {};
      }
    }

    return {
      id: order.orderNumber,
      orderNumber: order.orderNumber,
      customerName: order.guestName || 'عميل ضيف',
      customerPhone: order.guestPhone || '',
      customerEmail: order.guestEmail || '',
      customerAddress: typeof shippingAddress === 'object' ?
        `${shippingAddress.street || ''} ${shippingAddress.area || ''}`.trim() :
        shippingAddress || '',
      city: typeof shippingAddress === 'object' ?
        shippingAddress.city || shippingAddress.governorate || '' :
        order.city || '',
      total: order.total || 0,
      subtotal: order.total || 0,
      tax: 0,
      shipping: order.shippingCost || 0,
      status: order.status?.toLowerCase() || 'pending',
      paymentStatus: 'pending',
      paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
      items: Array.isArray(items) ? items.map(item => ({
        id: item.productId || '',
        productId: item.productId || '',
        name: item.name || item.productName || 'منتج غير محدد',
        productName: item.name || item.productName || 'منتج غير محدد',
        price: item.price || 0,
        quantity: item.quantity || 1,
        total: (item.price || 0) * (item.quantity || 1),
        metadata: {}
      })) : [],
      trackingNumber: order.trackingNumber || null,
      notes: order.notes || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  } else {
    // Transform regular order
    let shippingAddress = order.shippingAddress || '';
    try {
      if (typeof shippingAddress === 'string' && shippingAddress.startsWith('{')) {
        shippingAddress = JSON.parse(shippingAddress);
      }
    } catch (e) { }

    // Get customer name
    let finalCustomerName = '';
    if (order.customerName && order.customerName.trim()) {
      finalCustomerName = order.customerName.trim();
    } else if (order.customer) {
      const firstName = order.customer.firstName || '';
      const lastName = order.customer.lastName || '';
      finalCustomerName = `${firstName} ${lastName}`.trim();
    }

    return {
      id: order.orderNumber,
      orderNumber: order.orderNumber,
      customerName: finalCustomerName || 'عميل غير محدد',
      customerPhone: order.customerPhone || order.customer?.phone || '',
      customerEmail: order.customerEmail || order.customer?.email || '',
      customerAddress: order.customerAddress || '',
      city: order.city || '',
      total: order.total || 0,
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      shipping: order.shipping || 0,
      status: order.status?.toLowerCase() || 'pending',
      paymentStatus: order.paymentStatus?.toLowerCase() || 'pending',
      paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
      items: Array.isArray(order.orderItems) && order.orderItems.length > 0 ?
        order.orderItems.map(item => {
          const parsedMetadata = JSON.parse(item.metadata || '{}');
          return {
            id: item.id,
            productId: item.productId,
            name: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productName: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            price: item.price || 0,
            quantity: item.quantity || 1,
            total: item.total || 0,
            metadata: {
              ...parsedMetadata,
              color: item.productColor || parsedMetadata.color || parsedMetadata.productColor,
              size: item.productSize || parsedMetadata.size || parsedMetadata.productSize
            }
          };
        }) : [],
      trackingNumber: order.trackingNumber || null,
      notes: order.notes || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }
}

module.exports = router;

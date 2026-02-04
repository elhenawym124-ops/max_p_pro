const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const jwt = require('jsonwebtoken');
const socketService = require('../services/socketService');
const orderService = require('../services/orderService');
const WalletService = require('../services/walletService');
const { trackAffiliateReferral, linkOrderToAffiliate } = require('../middleware/affiliateTracking');
const affiliateService = require('../services/affiliateService');
const commissionService = require('../services/commissionService');
const dropshippingService = require('../services/dropshippingService');

/**
 * Public Orders Routes
 * No authentication required - for guest users
 * Company isolation through subdomain middleware
 */

// Log all requests to this router
router.use((req, res, next) => {
  console.log(`🌐 [PUBLIC-ORDERS] ${req.method} ${req.path}`);
  next();
});

// Track affiliate referrals
router.use(trackAffiliateReferral);

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

function coerceCartItemsToArray(rawItems) {
  if (!rawItems) return [];
  if (Array.isArray(rawItems)) return rawItems;

  // If stored as JSON string in DB
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
    } catch (_) {
      return [];
    }
  }

  // If stored as an object containing items
  if (typeof rawItems === 'object' && Array.isArray(rawItems.items)) {
    return rawItems.items;
  }

  return [];
}

// Helper function to map payment method string to enum
function mapPaymentMethodToEnum(method) {
  const methodMap = {
    'cash': 'CASH',
    'card': 'CREDIT_CARD',
    'bank_transfer': 'BANK_TRANSFER',
    'online': 'STRIPE', // ONLINE maps to STRIPE
    'paypal': 'PAYPAL',
    'stripe': 'STRIPE',
    'cod': 'CASH'
  };
  return methodMap[method?.toLowerCase()] || 'CASH';
}

function tryDecodeCustomerToken(authHeader) {
  try {
    if (!authHeader) return null;
    const token = String(authHeader).startsWith('Bearer ')
      ? String(authHeader).split(' ')[1]
      : null;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (decoded?.role !== 'CUSTOMER') return null;

    const customerId = decoded.customerId || decoded.userId || decoded.id;
    const companyId = decoded.companyId;
    if (!customerId || !companyId) return null;

    return { customerId, companyId };
  } catch (_) {
    return null;
  }
}

// Create new order
router.post('/', async (req, res) => {
  try {
    console.log('📝 [CREATE-ORDER] ===== Create Order Request =====');
    console.log('📝 [CREATE-ORDER] Body:', JSON.stringify(req.body, null, 2));

    const { company } = req;
    const cartId = req.headers['x-cart-id'] || req.cookies?.cart_id;

    console.log('🏢 [CREATE-ORDER] Company:', company?.id);
    console.log('🛒 [CREATE-ORDER] Cart ID:', cartId);

    const {
      guestEmail,
      guestPhone,
      guestName,
      shippingAddress,
      paymentMethod,
      couponCode,
      notes,
      items, // ✅ Support direct items array (for testing or direct checkout)
      pixelEventId, // Event ID from frontend Pixel for deduplication
      useWallet,
      walletAmount
    } = req.body;

    if (!guestPhone || !guestName || !shippingAddress) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول المطلوبة يجب ملؤها (الاسم، الهاتف، العنوان)'
      });
    }

    const prisma = getPrisma();

    let cartItems = [];
    let cartTotal = 0;
    let shouldDeleteCart = false;

    // ✅ Support two modes: cart-based or direct items
    if (items && Array.isArray(items) && items.length > 0) {
      // Direct items mode (for testing or quick checkout)
      console.log('📦 [PUBLIC-ORDER] Using direct items mode');
      cartItems = items;
      cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // ✅ FIX: Also clear cart if cartId exists (user might have items in cart)
      if (cartId) {
        shouldDeleteCart = true;
        console.log('🛒 [PUBLIC-ORDER] Will also clear cart after direct order');
      }
    } else if (cartId) {
      // Cart-based mode (normal flow)
      console.log('🛒 [PUBLIC-ORDER] Using cart mode');
      const cart = await prisma.guestCart.findUnique({
        where: { cartId }
      });

      const coercedItems = cart ? coerceCartItemsToArray(cart.items) : [];
      if (!cart || coercedItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'السلة فارغة'
        });
      }

      cartItems = coercedItems;
      cartTotal = Number(cart.total) || 0;
      shouldDeleteCart = true;
    } else {
      return res.status(400).json({
        success: false,
        error: 'يجب توفير سلة أو عناصر للطلب'
      });
    }

    // Normalize cart items (ensure productId exists)
    cartItems = (cartItems || []).map((item) => {
      const normalized = { ...item };
      if (!normalized.productId && normalized.id) {
        normalized.productId = normalized.id;
      }
      return normalized;
    });

    const invalidItem = cartItems.find((item) => !item?.productId);
    if (invalidItem) {
      console.log('❌ [CREATE-ORDER] Invalid cart item (missing productId):', invalidItem);
      return res.status(400).json({
        success: false,
        error: 'بيانات السلة غير صحيحة: يوجد منتج بدون معرف (productId)'
      });
    }

    // Verify stock again
    for (const item of cartItems) {
      console.log('🔍 [CREATE-ORDER] Checking product:', item.productId, 'variantId:', item.variantId, 'quantity:', item.quantity);

      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          companyId: company.id // Ensure product belongs to this company
        },
        include: { product_variants: true }
      });

      console.log('🔍 [CREATE-ORDER] Product found:', product ? 'Yes' : 'No', 'Stock:', product?.stock, 'TrackInventory:', product?.trackInventory);

      if (!product) {
        console.log('❌ [CREATE-ORDER] Product not found:', item.productId);
        return res.status(400).json({
          success: false,
          error: `المنتج غير موجود: ${item.name || 'Unknown'}`
        });
      }

      // Check variant stock if variantId is provided
      if (item.variantId) {
        const variant = product.product_variants?.find(v => v.id === item.variantId);
        console.log('🔍 [CREATE-ORDER] Variant found:', variant ? 'Yes' : 'No', 'Stock:', variant?.stock, 'TrackInventory:', variant?.trackInventory);

        if (!variant) {
          console.log('❌ [CREATE-ORDER] Variant not found:', item.variantId);
          return res.status(400).json({
            success: false,
            error: `الاختيار غير موجود للمنتج: ${item.name || product.name}`
          });
        }

        if (variant.trackInventory !== false && variant.stock < item.quantity) {
          console.log('❌ [CREATE-ORDER] Insufficient variant stock:', variant.stock, 'requested:', item.quantity);
          return res.status(400).json({
            success: false,
            error: `المخزون غير كافي للاختيار: ${variant.name}. المتوفر: ${variant.stock}`
          });
        }

        // ✅ ENRICH ITEM with Variant Details (Color, Size, Metadata)
        // This ensures the saved JSON contains all display info
        item.variantName = variant.name;
        item.metadata = variant.metadata; // Save full metadata

        let color = variant.color;
        let size = variant.size;

        // 1. Try metadata
        if (variant.metadata) {
          try {
            const meta = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
            if (!color && meta.attributeValues) {
              color = meta.attributeValues['اللون'] || meta.attributeValues['color'] || meta.attributeValues['Color'];
            }
            if (!size && meta.attributeValues) {
              size = meta.attributeValues['المقاس'] || meta.attributeValues['size'] || meta.attributeValues['Size'];
            }
            if (!color) color = meta.color;
            if (!size) size = meta.size;
          } catch (e) { }
        }

        // 2. Try name parsing (Robust)
        if (variant.name && (!color || !size)) {
          const name = variant.name;
          // If explicit type is color and no separator
          if (variant.type === 'color' && !name.includes('-') && !name.includes('|')) {
            if (!color) color = name.trim();
          } else {
            // Handle separators
            const parts = name.split(/\s*[-–|]\s*/).filter(p => p.trim());
            if (parts.length >= 2) {
              if (!color && isNaN(parseFloat(parts[0]))) color = parts[0].trim();
              if (!size) size = parts[parts.length - 1].trim();
            } else if (parts.length === 1) {
              const val = parts[0].trim();
              if (isNaN(parseFloat(val)) && !color) color = val;
              else if (!size) size = val;
            }
          }
        }

        // 3. Extract Image (Product or Variant)
        let image = '';
        try {
          // 3.1 Try variant metadata image
          if (variant.metadata) {
            const meta = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
            if (meta.image) image = meta.image;
          }

          // 3.2 If no variant image, try product image
          if (!image && product.images) {
            // product.images is usually a JSON array or comma separated string
            // e.g. "[\"url1\", \"url2\"]" or "url1,url2"
            let images = [];
            if (product.images.startsWith('[')) {
              images = JSON.parse(product.images);
            } else {
              images = product.images.split(',');
            }
            if (images.length > 0) image = images[0];
          }
        } catch (e) { console.log('⚠️ Error extracting image:', e.message); }

        item.productColor = color || '';
        item.productSize = size || '';
        item.image = image; // ✅ Save image for frontend
        item.productImage = image; // ✅ Duplicate for safety
        item.variant = {
          id: variant.id,
          name: variant.name,
          metadata: variant.metadata
        };
        // Add to metadata as well for redundancy
        if (typeof item.metadata === 'object' && item.metadata !== null) {
          item.metadata.image = image;
        } else if (image) {
          item.metadata = { image };
        }

        console.log(`✅ [CREATE-ORDER] Enriched item ${item.productId}: Color=${item.productColor}, Size=${item.productSize}, Image=${image ? 'Yes' : 'No'}`);
      } else {
        // Check main product stock if no variant and tracking is enabled
        if (product.trackInventory !== false && product.stock < item.quantity) {
          console.log('❌ [CREATE-ORDER] Insufficient stock:', product.stock, 'requested:', item.quantity);
          return res.status(400).json({
            success: false,
            error: `المخزون غير كافي للمنتج: ${item.name || product.name}. المتوفر: ${product.stock}`
          });
        }
      }
    }

    // Calculate shipping
    let shippingCost = 0;
    if (shippingAddress?.governorate) {
      const shippingZones = await prisma.shippingZone.findMany({
        where: {
          companyId: company.id,
          isActive: true
        }
      });

      // Find matching zone (governorates is stored as JSON string)
      const matchingZone = shippingZones.find(zone => {
        let govs = [];
        try {
          // Parse JSON string if it's a string, otherwise use as-is
          if (typeof zone.governorates === 'string') {
            govs = JSON.parse(zone.governorates);
          } else if (Array.isArray(zone.governorates)) {
            govs = zone.governorates;
          }
        } catch (e) {
          console.error('❌ [CREATE-ORDER] Error parsing governorates:', e);
          govs = [];
        }

        return govs.some(gov =>
          gov.toLowerCase().includes(shippingAddress.governorate.toLowerCase()) ||
          shippingAddress.governorate.toLowerCase().includes(gov.toLowerCase())
        );
      });

      if (matchingZone) {
        shippingCost = parseFloat(matchingZone.price) || 0;
        console.log('✅ [CREATE-ORDER] Shipping cost calculated:', shippingCost, 'for governorate:', shippingAddress.governorate);
      } else {
        console.log('⚠️ [CREATE-ORDER] No matching shipping zone found for:', shippingAddress.governorate);
      }
    }

    // Apply coupon
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          companyId: company.id,
          isActive: true,
          OR: [
            { expiryDate: null },
            { expiryDate: { gt: new Date() } }
          ]
        }
      });

      if (coupon) {
        if (coupon.type === 'PERCENTAGE') {
          discountAmount = (cartTotal * coupon.value) / 100;
        } else {
          discountAmount = coupon.value;
        }
      }
    }

    const finalTotal = (Number(cartTotal) || 0) + (Number(shippingCost) || 0) - (Number(discountAmount) || 0);

    // Wallet usage (optional - requires CUSTOMER token)
    const customerAuth = tryDecodeCustomerToken(req.headers.authorization);
    const wantsWallet = useWallet === true || useWallet === 'true' || Number(walletAmount) > 0;
    const requestedWalletAmount = walletAmount !== undefined && walletAmount !== null && walletAmount !== ''
      ? Number(walletAmount)
      : 0;

    if (wantsWallet) {
      if (!customerAuth) {
        return res.status(401).json({
          success: false,
          error: 'يجب تسجيل الدخول كعميل لاستخدام المحفظة'
        });
      }

      if (customerAuth.companyId !== company.id) {
        return res.status(403).json({
          success: false,
          error: 'رمز العميل لا يطابق شركة المتجر'
        });
      }

      if (!Number.isFinite(requestedWalletAmount) || requestedWalletAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'قيمة المحفظة غير صحيحة'
        });
      }
    }

    // Get affiliate code from cookies or query
    const affiliateCode = req.cookies?.affiliateCode || req.query.ref || req.query.affiliate;
    let affiliateReferralId = null;
    let affiliateId = null;
    let orderSource = 'REGULAR';

    // Track affiliate referral if code exists
    if (affiliateCode) {
      try {
        const prisma = getSharedPrismaClient();
        const affiliate = await prisma.affiliate.findFirst({
          where: {
            affiliateCode,
            status: 'ACTIVE'
          }
        });

        if (affiliate) {
          affiliateId = affiliate.id;
          orderSource = 'AFFILIATE_REFERRAL';

          // البحث عن أو إنشاء العميل لربط الإحالة
          let customer = await prisma.customer.findFirst({
            where: {
              companyId: company.id,
              phone: guestPhone
            }
          });

          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                firstName: guestName.split(' ')[0] || guestName,
                lastName: guestName.split(' ').slice(1).join(' ') || '',
                phone: guestPhone,
                email: guestEmail,
                companyId: company.id,
                status: 'CUSTOMER'
              }
            });
          }

          // تتبع الإحالة (سيتم تحسين trackReferral لمنع التكرار)
          const referral = await affiliateService.trackReferral(affiliateCode, customer.id, {
            url: req.originalUrl,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            source: req.query.source || 'direct'
          });

          affiliateReferralId = referral.id;
        }

      } catch (error) {
        console.error('⚠️ [CREATE-ORDER] Error tracking affiliate:', error.message);
        // Continue without affiliate tracking
      }
    }

    // Generate order number using centralized service
    const orderNumber = await orderService.generateOrderNumber(company.id);

    // Create order and update stock in a transaction to ensure data consistency
    // ✅ FIX: Increased timeout to 30 seconds to prevent "Transaction already closed" errors
    const order = await prisma.$transaction(async (tx) => {
      let walletApplied = 0;
      let walletBalanceBefore = null;
      let walletBalanceAfter = null;
      let walletIdForTxn = null;

      if (wantsWallet && customerAuth) {
        // Ensure wallet exists
        let wallet = await tx.customerWallet.findFirst({
          where: {
            customerId: customerAuth.customerId,
            companyId: company.id,
            isActive: true
          }
        });

        if (!wallet) {
          wallet = await tx.customerWallet.create({
            data: {
              customerId: customerAuth.customerId,
              companyId: company.id,
              balance: 0,
              totalEarned: 0,
              totalSpent: 0,
              currency: 'EGP',
              isActive: true
            }
          });
        }

        walletIdForTxn = wallet.id;

        walletBalanceBefore = wallet.balance;
        walletApplied = Math.min(Number(wallet.balance) || 0, requestedWalletAmount, Number(finalTotal) || 0);

        if (walletApplied <= 0) {
          throw new Error('رصيد المحفظة غير كاف');
        }

        walletBalanceAfter = walletBalanceBefore - walletApplied;

        await tx.customerWallet.update({
          where: { id: wallet.id },
          data: {
            balance: walletBalanceAfter,
            totalSpent: (Number(wallet.totalSpent) || 0) + walletApplied
          }
        });
      }

      const finalTotalAfterWallet = Math.max(0, (Number(finalTotal) || 0) - walletApplied);

      // Create order
      // Note: items and shippingAddress must be JSON strings for Prisma
      const orderMetadata = {};
      if (affiliateReferralId) {
        orderMetadata.affiliateReferralId = affiliateReferralId;
        orderMetadata.affiliateId = affiliateId;
        orderMetadata.orderSource = orderSource;
      }

      if (customerAuth && customerAuth.companyId === company.id) {
        orderMetadata.walletCustomerId = customerAuth.customerId;
      }

      if (walletApplied > 0) {
        orderMetadata.walletApplied = walletApplied;
        orderMetadata.walletCustomerId = customerAuth.customerId;
        orderMetadata.walletBalanceBefore = walletBalanceBefore;
        orderMetadata.walletBalanceAfter = walletBalanceAfter;
      }

      const newOrder = await tx.guestOrder.create({
        data: {
          orderNumber,
          guestEmail,
          guestPhone,
          guestName,
          items: JSON.stringify(cartItems),
          total: cartTotal,
          shippingCost,
          discountAmount,
          finalTotal: finalTotalAfterWallet,
          shippingAddress: JSON.stringify(shippingAddress),
          paymentMethod,
          notes,
          companyId: company.id,
          metadata: Object.keys(orderMetadata).length > 0 ? JSON.stringify(orderMetadata) : null
        }
      });

      if (walletApplied > 0 && customerAuth) {
        await tx.walletTransaction.create({
          data: {
            walletId: walletIdForTxn,
            type: 'DEBIT',
            amount: walletApplied,
            balanceBefore: walletBalanceBefore,
            balanceAfter: walletBalanceAfter,
            description: `Used for storefront order ${orderNumber}`,
            metadata: JSON.stringify({ guestOrderId: newOrder.id, orderNumber })
          }
        });
      }

      // Update stock
      for (const item of cartItems) {
        // Update variant stock if variant is selected
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
          });

          if (variant && variant.trackInventory !== false) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            });
            console.log('✅ [CREATE-ORDER] Updated variant stock:', item.variantId, 'decremented by:', item.quantity);
          }
        }

        // Update main product stock if tracking is enabled
        if (!item.productId) {
          throw new Error('Missing productId in cart item during stock update');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (product && product.trackInventory !== false) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
          console.log('✅ [CREATE-ORDER] Updated product stock:', item.productId, 'decremented by:', item.quantity);
        }
      }

      return newOrder;
    }, {
      maxWait: 30000, // Maximum time to wait to acquire a transaction slot
      timeout: 30000  // Maximum time the transaction can run
    });

    // Delete cart (only if using cart mode)
    if (shouldDeleteCart && cartId) {
      try {
        // Check if cart exists before attempting to delete
        const existingCart = await prisma.guestCart.findUnique({
          where: { cartId }
        });

        if (existingCart) {
          await prisma.guestCart.delete({
            where: { cartId }
          });
          console.log('✅ [CREATE-ORDER] Cart deleted successfully:', cartId);
        } else {
          console.log('⚠️ [CREATE-ORDER] Cart not found, skipping delete:', cartId);
        }
      } catch (error) {
        // Don't fail the order creation if cart deletion fails
        console.error('❌ [CREATE-ORDER] Error deleting cart (non-critical):', error.message);
      }

      // Clear cookie regardless of deletion success
      res.clearCookie('cart_id');
    }

    // Track Purchase event via Facebook Conversions API (Server-side)
    try {
      const storefrontSettings = await prisma.storefrontSettings.findUnique({
        where: { companyId: company.id }
      });

      if (storefrontSettings &&
        storefrontSettings.facebookConvApiEnabled &&
        storefrontSettings.facebookPixelId &&
        storefrontSettings.facebookConvApiToken &&
        storefrontSettings.capiTrackPurchase !== false) {

        const FacebookConversionsService = require('../services/facebookConversionsService');
        const fbService = new FacebookConversionsService(
          storefrontSettings.facebookPixelId,
          storefrontSettings.facebookConvApiToken,
          storefrontSettings.facebookConvApiTestCode
        );

        // Use event ID from frontend Pixel for deduplication, or generate new one
        // This ensures the same event is not counted twice (Pixel + CAPI)
        const eventId = pixelEventId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('🔄 [Facebook CAPI] Using event ID for deduplication:', eventId);

        // Extract user data from request
        const userData = {
          email: guestEmail,
          phone: guestPhone,
          firstName: guestName?.split(' ')[0] || null,
          lastName: guestName?.split(' ').slice(1).join(' ') || null,
          city: shippingAddress?.city || shippingAddress?.governorate || null,
          country: 'eg',
          zip: shippingAddress?.zipCode || null,
          ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          pageUrl: req.headers['referer'] || `${req.protocol}://${req.get('host')}${req.originalUrl}`
        };

        // Prepare order data
        const orderData = {
          orderNumber: order.orderNumber,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          })),
          total: finalTotal
        };

        // Send Purchase event
        await fbService.trackPurchase(userData, orderData, eventId);
        console.log('✅ [Facebook CAPI] Purchase event tracked for order:', order.orderNumber);
      }
    } catch (capiError) {
      // Don't fail the order creation if CAPI fails
      console.error('❌ [Facebook CAPI] Error tracking Purchase event:', capiError);
    }

    // Emit socket event for real-time updates
    try {
      if (socketService && socketService.getIO()) {
        const enhancedOrder = {
          ...order,
          // Add any necessary fields for the frontend to render immediately without refetching if possible
          // or just sending the basic order is enough if frontend refetches or adapts it.
          // Following the structure in Orders.tsx might be needed.
          customerName: order.guestName,
          customerPhone: order.guestPhone,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          items: cartItems, // simplified
          createdAt: order.createdAt
        };
        socketService.getIO().to(`company_${company.id}`).emit('order:created', enhancedOrder);
        console.log('📡 [SOCKET] Emitted order:created event');
      }
    } catch (socketError) {
      console.error('❌ [SOCKET] Error emitting event:', socketError);
    }

    // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية)
    // ملاحظة: guestOrder مختلف عن Order، لكن يمكننا إنشاء Order من guestOrder للتصدير
    try {
      const { getWooCommerceAutoExportService } = require('../services/wooCommerceAutoExportService');
      const wooExportService = getWooCommerceAutoExportService();

      // إنشاء Order من guestOrder للتصدير
      // نحتاج لإنشاء customer أولاً إذا لم يكن موجوداً
      const prisma = getPrisma();

      // البحث عن أو إنشاء customer
      let customer = await prisma.customer.findFirst({
        where: {
          phone: order.guestPhone,
          companyId: company.id
        }
      });

      // If order was placed by an authenticated customer, prefer linking to that customer record
      if (customerAuth && customerAuth.companyId === company.id) {
        const tokenCustomer = await prisma.customer.findUnique({
          where: { id: customerAuth.customerId }
        });
        if (tokenCustomer && tokenCustomer.companyId === company.id) {
          customer = tokenCustomer;
        }
      }

      if (!customer) {
        // إنشاء customer جديد
        customer = await prisma.customer.create({
          data: {
            name: order.guestName,
            phone: order.guestPhone,
            email: order.guestEmail || null,
            companyId: company.id,
            status: 'CUSTOMER',
            metadata: JSON.stringify({ source: 'guest_order', guestOrderId: order.id })
          }
        });
      }

      // إنشاء Order من guestOrder مع جلب الأسعار التاريخية (تاجر ومنصة)
      const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      const orderItems = await Promise.all(parsedItems.map(async (item) => {
        // جلب تفاصيل المنتج للتأكد من الأسعار وقت الطلب
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { merchantProducts: true }
        });
        const merchantProduct = product?.merchantProducts?.[0];

        return {
          productName: item.name || item.productName || 'منتج',
          quantity: item.quantity || 1,
          price: parseFloat(item.price || 0),
          total: parseFloat((item.price || 0) * (item.quantity || 1)),
          productSku: item.productSku || item.sku || null,
          productId: item.productId || null,
          variantId: item.variantId || null,
          merchantPrice: merchantProduct ? Number(merchantProduct.merchantPrice) : null,
          basePrice: product ? Number(product.basePrice || product.price) : null,
          metadata: item.metadata ? (typeof item.metadata === 'string' ? item.metadata : JSON.stringify(item.metadata)) : null
        };
      }));

      // Check for affiliate referral from guestOrder metadata
      let affiliateReferralId = null;
      let affiliateId = null;
      let orderSource = 'REGULAR';

      if (order.metadata) {
        try {
          const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
          if (metadata.affiliateReferralId) {
            affiliateReferralId = metadata.affiliateReferralId;
            affiliateId = metadata.affiliateId;
            orderSource = metadata.orderSource || 'AFFILIATE_REFERRAL';
          }
        } catch (e) {
          // Ignore metadata parsing errors
        }
      }

      const createdOrder = await prisma.order.create({
        data: {
          orderNumber: order.orderNumber,
          customerId: customer.id,
          companyId: company.id,
          customerName: order.guestName,
          customerPhone: order.guestPhone,
          customerEmail: order.guestEmail || null,
          customerAddress: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : shippingAddress,
          shippingAddress: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : shippingAddress,
          city: shippingAddress?.city || '',
          subtotal: parseFloat(order.total) - parseFloat(order.shippingCost || 0),
          shipping: parseFloat(order.shippingCost || 0),
          discount: parseFloat(order.discountAmount || 0),
          total: parseFloat(order.finalTotal),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: mapPaymentMethodToEnum(paymentMethod || 'cash'),
          notes: order.notes || `طلب من الموقع - ${order.orderNumber}`,
          sourceType: 'storefront',
          isViewed: false,
          affiliateReferralId,
          affiliateId,
          orderSource,
          items: {
            create: orderItems
          }
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

      // Update referral to mark as converted
      if (affiliateReferralId) {
        try {
          await prisma.affiliateReferral.update({
            where: { id: affiliateReferralId },
            data: {
              converted: true,
              convertedAt: new Date(),
              orderId: createdOrder.id
            }
          });
        } catch (error) {
          console.error('⚠️ [GUEST-ORDER] Error updating referral:', error.message);
        }
      }

      // Calculate commissions and route to merchant if needed
      try {
        // Check if order needs dropshipping
        const productIds = orderItems.filter(item => item.productId).map(item => item.productId);
        if (productIds.length > 0) {
          const products = await prisma.product.findMany({
            where: {
              id: { in: productIds }
            },
            select: { id: true, isDropshipped: true }
          });

          const needsDropshipping = products.some(p => p.isDropshipped);
          if (needsDropshipping) {
            await dropshippingService.routeOrderToMerchant(createdOrder.id);
          }
        }

        // Calculate commissions (will be triggered when order is confirmed)
        // We'll calculate when status changes to CONFIRMED
      } catch (error) {
        console.error('⚠️ [GUEST-ORDER] Error processing dropshipping:', error.message);
        // Continue without stopping
      }

      // تصدير Order إلى WooCommerce
      wooExportService.exportOrderAsync(createdOrder.id);
      console.log('✅ [GUEST-ORDER] Order created and queued for WooCommerce export:', createdOrder.orderNumber);
    } catch (wooError) {
      // لا نوقف العملية إذا فشل التصدير
      console.log('⚠️ [GUEST-ORDER] WooCommerce auto-export skipped:', wooError.message);
    }


    res.json({
      success: true,
      data: order,
      message: 'تم إنشاء الطلب بنجاح'
    });
  } catch (error) {
    console.error('❌ [CREATE-ORDER] Error creating order:', error);
    console.error('❌ [CREATE-ORDER] Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track order by order number and phone (query params)
router.get('/track', async (req, res) => {
  try {
    console.log('🔍 [TRACK-ORDER] ===== Track Order Request =====');
    const { company } = req;
    const { orderNumber, phone } = req.query;

    console.log('🏢 [TRACK-ORDER] Company ID:', company?.id);
    console.log('📋 [TRACK-ORDER] Order Number:', orderNumber);
    console.log('📞 [TRACK-ORDER] Phone:', phone);

    if (!orderNumber || !phone) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب ورقم الهاتف مطلوبان'
      });
    }

    const prisma = getPrisma();

    // البحث في GuestOrder أولاً
    let order = await prisma.guestOrder.findFirst({
      where: {
        orderNumber: orderNumber,
        guestPhone: phone,
        companyId: company.id
      }
    });

    console.log('🔍 [TRACK-ORDER] GuestOrder found:', !!order);

    // إذا لم يتم العثور عليه في GuestOrder، ابحث في Order العادي
    if (!order) {
      order = await prisma.order.findFirst({
        where: {
          orderNumber: orderNumber,
          companyId: company.id
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });

      console.log('🔍 [TRACK-ORDER] Regular Order found:', !!order);

      // التحقق من رقم الهاتف للطلب العادي
      if (order && order.customer && order.customer.phone !== phone) {
        console.log('❌ [TRACK-ORDER] Phone mismatch for regular order');
        order = null;
      }

      // تحويل Order العادي لنفس صيغة GuestOrder
      if (order) {
        order = {
          ...order,
          guestName: order.customer?.name || order.customerName,
          guestPhone: order.customer?.phone || order.phone,
          items: order.orderItems?.map(item => ({
            name: item.product?.name || item.productName,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          })) || []
        };
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو رقم الهاتف غير صحيح'
      });
    }

    // إعادة حساب الشحن بناءً على المحافظة إذا لم يكن محسوباً
    let updatedOrder = { ...order };

    // إعادة حساب المجموع الفرعي من المنتجات
    let calculatedSubtotal = 0;
    if (order.items && Array.isArray(order.items)) {
      calculatedSubtotal = order.items.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseInt(item.quantity || 0);
        const itemTotal = itemPrice * itemQuantity;

        console.log('🧮 [ITEM-CALC]', {
          name: item.name,
          price: item.price,
          priceAsNumber: itemPrice,
          quantity: item.quantity,
          quantityAsNumber: itemQuantity,
          itemTotal: itemTotal
        });

        return sum + itemTotal;
      }, 0);

      console.log('🧮 [TRACK-ORDER] Calculated subtotal from items:', calculatedSubtotal);
      console.log('🧮 [TRACK-ORDER] Original total in DB:', order.total);

      // استخدام المجموع المحسوب إذا كان مختلف عن المحفوظ
      if (Math.abs(calculatedSubtotal - (order.total || 0)) > 1) {
        console.log('⚠️ [TRACK-ORDER] Total mismatch, using calculated subtotal');
        updatedOrder.total = calculatedSubtotal;
      }
    }

    if (order.shippingCost === 0 && order.shippingAddress) {
      try {
        let governorate = '';

        // استخراج المحافظة من العنوان
        if (typeof order.shippingAddress === 'string') {
          // إذا كان العنوان string، حاول استخراج المحافظة
          governorate = order.shippingAddress.split(',')[0]?.trim();
        } else if (order.shippingAddress && typeof order.shippingAddress === 'object') {
          governorate = order.shippingAddress.governorate;
        }

        console.log('🏛️ [TRACK-ORDER] Governorate for shipping:', governorate);

        if (governorate) {
          // البحث عن تكلفة الشحن للمحافظة
          const shippingZone = await prisma.shippingZone.findFirst({
            where: {
              companyId: company.id,
              governorate: governorate
            }
          });

          if (shippingZone) {
            console.log('📦 [TRACK-ORDER] Shipping cost found:', shippingZone.cost);
            updatedOrder.shippingCost = parseFloat(shippingZone.cost || 0);
          }
        }
      } catch (shippingError) {
        console.error('❌ [TRACK-ORDER] Error calculating shipping:', shippingError);
      }
    }

    // إعادة حساب الإجمالي النهائي في جميع الحالات
    const subtotal = parseFloat(updatedOrder.total || 0);
    const shipping = parseFloat(updatedOrder.shippingCost || 0);
    const discount = parseFloat(updatedOrder.discountAmount || 0);

    updatedOrder.finalTotal = subtotal + shipping - discount;

    console.log('🧮 [TRACK-ORDER] Final calculation:', {
      subtotal: updatedOrder.total,
      shipping: updatedOrder.shippingCost,
      discount: updatedOrder.discountAmount,
      finalTotal: updatedOrder.finalTotal
    });

    console.log('✅ [TRACK-ORDER] Order details:', {
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      total: updatedOrder.total,
      shippingCost: updatedOrder.shippingCost,
      discountAmount: updatedOrder.discountAmount,
      finalTotal: updatedOrder.finalTotal,
      items: updatedOrder.items?.length || 0,
      shippingAddress: typeof updatedOrder.shippingAddress === 'object'
        ? updatedOrder.shippingAddress?.governorate
        : 'string format'
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('❌ [TRACK-ORDER] Error tracking order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track order by order number (legacy route)
router.get('/:orderNumber/track', async (req, res) => {
  try {
    const { company } = req;
    const { orderNumber } = req.params;

    const prisma = getPrisma();
    const order = await prisma.guestOrder.findFirst({
      where: {
        orderNumber,
        companyId: company.id
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search orders by email
router.get('/search', async (req, res) => {
  try {
    const { company } = req;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني مطلوب'
      });
    }

    const prisma = getPrisma();
    const orders = await prisma.guestOrder.findMany({
      where: {
        guestEmail: email,
        companyId: company.id
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order details by ID or order number
router.get('/:id', async (req, res) => {
  console.log('🎯 [GET-ORDER-ROUTE] Route handler called!', req.params);
  try {
    const { company } = req;
    const { id } = req.params;

    console.log('📦 [GET-ORDER] Fetching order:', { id, companyId: company?.id });

    const prisma = getPrisma();

    // Try to find by ID first, then by order number
    let order = await prisma.guestOrder.findFirst({
      where: {
        id,
        companyId: company.id
      }
    });

    console.log('🔍 [GET-ORDER] Search by ID result:', order ? 'Found' : 'Not found');

    // If not found by ID, try by order number
    if (!order) {
      console.log('🔍 [GET-ORDER] Trying by order number...');
      order = await prisma.guestOrder.findFirst({
        where: {
          orderNumber: id,
          companyId: company.id
        }
      });
      console.log('🔍 [GET-ORDER] Search by orderNumber result:', order ? 'Found' : 'Not found');
    }

    if (!order) {
      console.log('❌ [GET-ORDER] Order not found');
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    console.log('✅ [GET-ORDER] Order found:', order.orderNumber);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('❌ [GET-ORDER] Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update guest order status
router.patch('/orders/:orderNumber/status', async (req, res) => {
  console.log('🔄 [UPDATE-GUEST-ORDER-STATUS] Route handler called!', req.params);
  try {
    const { company } = req;
    const { orderNumber } = req.params;
    const { status, notes } = req.body;

    console.log('📦 [UPDATE-GUEST-ORDER-STATUS] Updating order:', {
      orderNumber,
      status,
      companyId: company?.id
    });

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'حالة الطلب مطلوبة'
      });
    }

    const prisma = getPrisma();

    // Find the guest order
    const existingOrder = await prisma.guestOrder.findFirst({
      where: {
        orderNumber,
        companyId: company.id
      }
    });

    if (!existingOrder) {
      console.log('❌ [UPDATE-GUEST-ORDER-STATUS] Order not found');
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // Update the order status
    const updatedOrder = await prisma.guestOrder.update({
      where: {
        id: existingOrder.id
      },
      data: {
        status: status.toUpperCase(),
        notes: notes ? `${existingOrder.notes || ''}\n${notes}` : existingOrder.notes,
        updatedAt: new Date()
      }
    });

    console.log('✅ [UPDATE-GUEST-ORDER-STATUS] Order status updated:', updatedOrder.orderNumber);
    res.json({
      success: true,
      data: updatedOrder,
      message: 'تم تحديث حالة الطلب بنجاح'
    });
  } catch (error) {
    console.error('❌ [UPDATE-GUEST-ORDER-STATUS] Error updating order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update guest order payment status
router.patch('/orders/:orderNumber/payment-status', async (req, res) => {
  console.log('💳 [UPDATE-GUEST-ORDER-PAYMENT] Route handler called!', req.params);
  try {
    const { company } = req;
    const { orderNumber } = req.params;
    const { paymentStatus, notes } = req.body;

    console.log('📦 [UPDATE-GUEST-ORDER-PAYMENT] Updating order:', {
      orderNumber,
      paymentStatus,
      companyId: company?.id
    });

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        error: 'حالة الدفع مطلوبة'
      });
    }

    const prisma = getPrisma();

    // Find the guest order
    const existingOrder = await prisma.guestOrder.findFirst({
      where: {
        orderNumber,
        companyId: company.id
      }
    });

    if (!existingOrder) {
      console.log('❌ [UPDATE-GUEST-ORDER-PAYMENT] Order not found');
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // Update the order payment status
    const updatedOrder = await prisma.guestOrder.update({
      where: {
        id: existingOrder.id
      },
      data: {
        paymentStatus: paymentStatus.toUpperCase(),
        notes: notes ? `${existingOrder.notes || ''}\n${notes}` : existingOrder.notes,
        updatedAt: new Date()
      }
    });

    console.log('✅ [UPDATE-GUEST-ORDER-PAYMENT] Order payment status updated:', updatedOrder.orderNumber);
    res.json({
      success: true,
      data: updatedOrder,
      message: 'تم تحديث حالة الدفع بنجاح'
    });
  } catch (error) {
    console.error('❌ [UPDATE-GUEST-ORDER-PAYMENT] Error updating payment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

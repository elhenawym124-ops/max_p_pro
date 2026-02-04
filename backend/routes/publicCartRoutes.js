const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Public Cart Routes
 * No authentication required - for guest users
 * Company isolation through subdomain middleware
 */

// Get shared Prisma client instance (same as conversationController)
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Middleware to get or create cart_id
const getCartId = (req, res, next) => {
  console.log('🛒 [CART-MIDDLEWARE] ===== Cart ID Check =====');
  console.log('📋 [CART-MIDDLEWARE] Headers x-cart-id:', req.headers['x-cart-id']);
  console.log('🍪 [CART-MIDDLEWARE] Cookies:', req.cookies);
  console.log('🍪 [CART-MIDDLEWARE] Cookie cart_id:', req.cookies?.cart_id);

  let cartId = req.headers['x-cart-id'] || req.cookies?.cart_id;

  // Fix: Always create a new cartId if current one is undefined or invalid
  if (!cartId || cartId === 'undefined') {
    cartId = uuidv4();
    console.log('✨ [CART-MIDDLEWARE] Creating NEW cart_id:', cartId);
    res.cookie('cart_id', cartId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  } else {
    console.log('✅ [CART-MIDDLEWARE] Using EXISTING cart_id:', cartId);
  }

  req.cartId = cartId;
  console.log('🔧 [CART-MIDDLEWARE] Final cartId set to req.cartId:', req.cartId);
  next();
};

// Apply cart middleware to all routes
router.use(getCartId);

// Get cart
// Route is mounted at /api/v1/public/cart, so use '/' here
router.get('/', async (req, res) => {
  try {
    const { company } = req;

    if (!company || !company.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم ?companyId=xxx في URL'
      });
    }

    const cartId = req.cartId;

    if (!cartId) {
      return res.status(400).json({ success: false, error: 'Cart ID is required' });
    }

    console.log('📦 [GET-CART] ===== Get Cart Request =====');
    console.log('🏢 [GET-CART] Company ID:', company?.id);
    console.log('🛒 [GET-CART] Cart ID:', cartId);

    let cart = await getSharedPrismaClient().guestCart.findUnique({
      where: { cartId }
    });

    console.log('📊 [GET-CART] Cart found:', !!cart);
    if (cart) {
      console.log('📦 [GET-CART] Cart items count:', cart.items?.length || 0);
      console.log('💰 [GET-CART] Cart total:', cart.total);
    }

    if (!cart) {
      cart = await getSharedPrismaClient().guestCart.create({
        data: {
          cartId,
          companyId: company.id,
          items: JSON.stringify([]),
          total: 0,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
    }

    // Parse items from JSON string to array for response
    const cartData = {
      ...cart,
      items: cart.items ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items) : []
    };

    res.json({ success: true, data: cartData });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add item to cart
// Route is mounted at /api/v1/public/cart, so use '/add' here
router.post('/add', async (req, res) => {
  try {
    const { company } = req;
    const cartId = req.cartId;
    const { productId, variantId, quantity = 1 } = req.body;

    if (!cartId) {
      return res.status(400).json({ success: false, error: 'Cart ID is required' });
    }

    console.log('➕ [ADD-TO-CART] ===== Add to Cart Request =====');
    console.log('🏢 [ADD-TO-CART] Company ID:', company?.id);
    console.log('🛒 [ADD-TO-CART] Cart ID:', cartId);
    console.log('📦 [ADD-TO-CART] Product ID:', productId);
    console.log('🔢 [ADD-TO-CART] Quantity:', quantity);
    console.log('📋 [ADD-TO-CART] Request body:', req.body);
    console.log('🍪 [ADD-TO-CART] Headers x-cart-id:', req.headers['x-cart-id']);

    // Verify product exists and belongs to company
    const product = await getSharedPrismaClient().product.findFirst({
      where: {
        id: productId,
        companyId: company.id,
        isActive: true
      },
      include: { product_variants: true }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // Check stock
    let stock = product.stock;
    let price = product.price;

    if (variantId) {
      const variant = product.product_variants?.find(v => v.id === variantId);
      if (!variant) {
        return res.status(404).json({
          success: false,
          error: 'المتغير غير موجود'
        });
      }
      stock = variant.stock;
      price = variant.price || parseFloat(product.price);
    }

    if (stock < quantity) {
      return res.status(400).json({
        success: false,
        error: 'المخزون غير كافي'
      });
    }

    // Get or create cart
    let cart = await getSharedPrismaClient().guestCart.findUnique({
      where: { cartId }
    });

    if (!cart) {
      cart = await getSharedPrismaClient().guestCart.create({
        data: {
          cartId,
          companyId: company.id,
          items: JSON.stringify([]),
          total: 0,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Update cart items - parse from JSON string to array
    const items = cart.items ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items) : [];
    const existingItemIndex = items.findIndex(
      item => item.productId === productId && item.variantId === variantId
    );

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += quantity;
    } else {
      // Get first image - handle both array and string formats
      let image = null;
      console.log('🖼️ [ADD-TO-CART] Product images:', product.images);
      console.log('🖼️ [ADD-TO-CART] Images type:', typeof product.images);

      // Try to parse if it's a JSON string
      let parsedImages = product.images;
      if (typeof product.images === 'string') {
        try {
          parsedImages = JSON.parse(product.images);
          console.log('🖼️ [ADD-TO-CART] Parsed JSON images:', parsedImages);
        } catch (e) {
          // Not JSON, use as-is
          console.log('🖼️ [ADD-TO-CART] Not JSON, using string directly');
        }
      }

      if (Array.isArray(parsedImages) && parsedImages.length > 0) {
        image = typeof parsedImages[0] === 'string' ? parsedImages[0] : parsedImages[0]?.url;
        console.log('🖼️ [ADD-TO-CART] Extracted image from array:', image);
      } else if (typeof parsedImages === 'string') {
        image = parsedImages;
        console.log('🖼️ [ADD-TO-CART] Using string image:', image);
      }

      console.log('🖼️ [ADD-TO-CART] Final image URL:', image);

      items.push({
        productId,
        variantId,
        quantity,
        price: parseFloat(price),
        name: product.name,
        image: image
      });
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cart = await getSharedPrismaClient().guestCart.update({
      where: { cartId },
      data: { items: JSON.stringify(items), total }
    });

    console.log('✅ [ADD-TO-CART] Cart updated successfully');
    console.log('📊 [ADD-TO-CART] Final cart items count:', items.length);
    console.log('💰 [ADD-TO-CART] Final cart total:', cart.total);
    console.log('🆔 [ADD-TO-CART] Returning cartId:', cart.cartId);

    // Parse items from JSON string to array for response
    const cartData = {
      ...cart,
      items: items
    };

    res.json({ success: true, data: cartData });
  } catch (error) {
    console.error('❌ [ADD-TO-CART] Error adding to cart:', error);
    console.error('❌ [ADD-TO-CART] Error stack:', error.stack);
    console.error('❌ [ADD-TO-CART] Request body:', req.body);
    console.error('❌ [ADD-TO-CART] Company:', req.company);
    console.error('❌ [ADD-TO-CART] Cart ID:', req.cartId);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update cart item quantity
router.put('/update', async (req, res) => {
  try {
    const { company } = req;
    const cartId = req.cartId;
    const { productId, variantId, quantity } = req.body;

    if (!cartId) {
      return res.status(400).json({ success: false, error: 'Cart ID is required' });
    }

    let cart = await getSharedPrismaClient().guestCart.findUnique({
      where: { cartId }
    });

    if (!cart) {
      // Create empty cart if it doesn't exist
      cart = await getSharedPrismaClient().guestCart.create({
        data: {
          cartId,
          companyId: company.id,
          items: JSON.stringify([]),
          total: 0,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
    }

    // Parse items from JSON string to array
    const items = cart.items ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items) : [];
    const itemIndex = items.findIndex(
      item => item.productId === productId && item.variantId === variantId
    );

    if (itemIndex >= 0) {
      if (quantity <= 0) {
        items.splice(itemIndex, 1);
      } else {
        items[itemIndex].quantity = quantity;
      }

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      cart = await getSharedPrismaClient().guestCart.update({
        where: { cartId },
        data: { items: JSON.stringify(items), total }
      });
    }

    // Parse items from JSON string to array for response
    const cartData = {
      ...cart,
      items: cart.items ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items) : []
    };

    res.json({ success: true, data: cartData });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove item from cart
router.delete('/remove', async (req, res) => {
  try {
    const { company } = req;
    const cartId = req.cartId;
    const { productId, variantId } = req.body;

    if (!cartId) {
      return res.status(400).json({ success: false, error: 'Cart ID is required' });
    }

    let cart = await getSharedPrismaClient().guestCart.findUnique({
      where: { cartId }
    });

    if (!cart) {
      // Create empty cart if it doesn't exist
      cart = await getSharedPrismaClient().guestCart.create({
        data: {
          cartId,
          companyId: company.id,
          items: JSON.stringify([]),
          total: 0,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
      const cartData = {
        ...cart,
        items: []
      };
      return res.json({ success: true, data: cartData });
    }

    // Parse items from JSON string to array
    const items = cart.items ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items) : [];
    const filteredItems = items.filter(
      item => !(item.productId === productId && item.variantId === variantId)
    );

    const total = filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cart = await getSharedPrismaClient().guestCart.update({
      where: { cartId },
      data: { items: JSON.stringify(filteredItems), total }
    });

    // Parse items from JSON string to array for response
    const cartData = {
      ...cart,
      items: filteredItems
    };

    res.json({ success: true, data: cartData });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear cart
router.delete('/clear', async (req, res) => {
  try {
    const { company } = req;
    const cartId = req.cartId;

    if (!cartId) {
      return res.status(400).json({ success: false, error: 'Cart ID is required' });
    }

    // Check if cart exists first
    const existingCart = await getSharedPrismaClient().guestCart.findUnique({
      where: { cartId }
    });

    if (!existingCart) {
      // Create empty cart if it doesn't exist
      const cart = await getSharedPrismaClient().guestCart.create({
        data: {
          cartId,
          companyId: company.id,
          items: JSON.stringify([]),
          total: 0,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
      const cartData = {
        ...cart,
        items: []
      };
      return res.json({ success: true, data: cartData });
    }

    // Update existing cart
    const cart = await getSharedPrismaClient().guestCart.update({
      where: { cartId },
      data: { items: JSON.stringify([]), total: 0 }
    });

    // Parse items from JSON string to array for response
    const cartData = {
      ...cart,
      items: []
    };

    res.json({ success: true, data: cartData });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper to normalize Arabic text for matching
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا') // Normalize Aleph
    .replace(/[ة]/g, 'ه')   // Normalize Taa Marbuta
    .replace(/[ي]/g, 'ى');  // Normalize Ya
};

// Shipping calculation handler (reusable function)
const calculateShippingHandler = async (req, res) => {
  try {
    const { company } = req;

    if (!company || !company.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم ?companyId=xxx في URL'
      });
    }

    const { city, governorate } = req.query;

    // Normalize search term
    const rawSearchTerm = (governorate || city || '');
    const searchTerm = normalizeText(rawSearchTerm);

    console.log(`🔍 [SHIPPING-CALC] Searching for: "${rawSearchTerm}" (Normalized: "${searchTerm}")`);

    const shippingZones = await getSharedPrismaClient().shippingZone.findMany({
      where: {
        companyId: company.id,
        isActive: true
      },
      include: {
        shippingMethods: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    // Find matching zone
    const matchingZone = shippingZones.find(zone => {
      let govs = [];
      try {
        if (typeof zone.governorates === 'string') {
          govs = JSON.parse(zone.governorates);
        } else if (Array.isArray(zone.governorates)) {
          govs = zone.governorates;
        }
      } catch (e) {
        console.error(`Error parsing governorates for zone ${zone.id}`, e);
        govs = []; // Treat as empty if parse fails
      }

      if (!Array.isArray(govs)) govs = [govs]; // Handle single string case if any

      return govs.some(gov => {
        const normalizedGov = normalizeText(gov);
        // Check for inclusion in both directions
        return normalizedGov.includes(searchTerm) || searchTerm.includes(normalizedGov);
      });
    });

    if (matchingZone) {
      console.log(`✅ [SHIPPING-CALC] Match Found: Zone "${matchingZone.name}" with ${matchingZone.shippingMethods.length} methods`);

      // Process methods and return array of options
      const methods = matchingZone.shippingMethods.map(method => {
        let settings = {};
        try {
          settings = typeof method.settings === 'string' ? JSON.parse(method.settings) : method.settings;
        } catch (e) {
          console.error(`Error parsing settings for method ${method.id}`, e);
        }

        return {
          id: method.id,
          title: method.title,
          type: method.type,
          cost: parseFloat(settings.cost || 0),
          deliveryTime: matchingZone.deliveryTime || 'غير محدد'
        };
      });

      // If no methods configured, fall back to legacy zone price
      if (methods.length === 0) {
        console.log(`⚠️ [SHIPPING-CALC] No methods found, using legacy zone price`);
        return res.json({
          success: true,
          data: {
            methods: [{
              id: 'legacy',
              title: 'توصيل قياسي',
              type: 'flat_rate',
              cost: parseFloat(matchingZone.price || 0),
              deliveryTime: matchingZone.deliveryTime || 'غير محدد'
            }]
          }
        });
      }

      res.json({
        success: true,
        data: { methods }
      });
    } else {
      console.log(`❌ [SHIPPING-CALC] No Match Found`);
      res.json({
        success: true,
        data: {
          methods: [],
          message: 'لم يتم العثور على منطقة شحن مطابقة'
        }
      });
    }
  } catch (error) {
    console.error('Error calculating/estimating shipping:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Calculate shipping routes - support multiple paths
// When mounted on /api/v1/public/cart: /cart/shipping/calculate
router.get('/shipping/calculate', calculateShippingHandler);
// When mounted on /api/v1/public/shipping: /shipping/calculate and /calculate
router.get('/calculate', calculateShippingHandler);

// Estimate shipping routes - support multiple paths
// When mounted on /api/v1/public/shipping: /shipping/estimate and /estimate
router.get('/estimate', calculateShippingHandler);

// Get payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    // Return available payment methods
    res.json({
      success: true,
      data: [
        {
          id: 'CASH_ON_DELIVERY',
          name: 'الدفع عند الاستلام',
          description: 'ادفع نقداً عند استلام الطلب',
          isActive: true
        },
        {
          id: 'CREDIT_CARD',
          name: 'بطاقة ائتمان',
          description: 'الدفع ببطاقة الائتمان',
          isActive: false
        },
        {
          id: 'BANK_TRANSFER',
          name: 'تحويل بنكي',
          description: 'التحويل المباشر للحساب البنكي',
          isActive: false
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


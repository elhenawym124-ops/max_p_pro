const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Public Products Routes
 * No authentication required - accessible by anyone
 * Company isolation through subdomain middleware
 */

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

// Get all public products
// Route is mounted at /api/v1/public/products, so use '/' here
router.get('/', async (req, res) => {
  try {
    const { company } = req; // from middleware

    if (!company || !company.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم ?companyId=xxx في URL'
      });
    }

    const {
      category,
      search,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
      minPrice,
      maxPrice,
      minRating,
      inStock
    } = req.query;

    const prisma = getPrisma();
    const where = {
      companyId: company.id,
      isActive: true
    };

    // Filtering
    if (category) {
      where.categoryId = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Stock filter - only filter if explicitly requested
    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    // Note: Rating filter would require a reviews/ratings system
    // For now, we'll skip it as it's part of Phase 5

    // Sorting
    const orderBy = { [sort]: order };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        include: {
          category: true,
          product_variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    // تحويل Decimal fields إلى numbers لكل منتج
    const formattedProducts = products.map(product => ({
      ...product,
      price: parseFloat(product.price) || 0,
      comparePrice: product.comparePrice ? parseFloat(product.comparePrice) : null,
      cost: product.cost ? parseFloat(product.cost) : null,
      weight: product.weight ? parseFloat(product.weight) : null,
      product_variants: product.product_variants?.map(variant => ({
        ...variant,
        price: variant.price ? parseFloat(variant.price) : null,
        comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : null,
        cost: variant.cost ? parseFloat(variant.cost) : null
      })) || [],
      variants: product.product_variants?.map(variant => ({
        ...variant,
        price: variant.price ? parseFloat(variant.price) : null,
        comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : null,
        cost: variant.cost ? parseFloat(variant.cost) : null
      })) || []
    }));

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recently viewed products (MUST come before /products/:id to avoid route conflict)
// Route is mounted at /api/v1/public/products, so use '/recently-viewed' here
router.get('/recently-viewed', async (req, res) => {
  try {
    const { company } = req;
    const { limit = 8 } = req.query;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || 'anonymous';

    console.log('🔍 [RecentlyViewed] Fetching products:', {
      companyId: company.id,
      sessionId: sessionId.substring(0, 20) + '...', // Log partial session ID for privacy
      limit: parseInt(limit)
    });

    const prisma = getPrisma();

    const recentlyViewed = await prisma.recentlyViewed.findMany({
      where: {
        companyId: company.id,
        sessionId
      },
      include: {
        products: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        viewedAt: 'desc'
      },
      take: parseInt(limit)
    });

    // تحويل Decimal fields إلى numbers لكل منتج
    const formattedProducts = recentlyViewed.map(rv => {
      const product = rv.products;
      return {
        ...product,
        price: parseFloat(product.price) || 0,
        comparePrice: product.comparePrice ? parseFloat(product.comparePrice) : null,
        cost: product.cost ? parseFloat(product.cost) : null,
        weight: product.weight ? parseFloat(product.weight) : null
      };
    });

    console.log('✅ [RecentlyViewed] Returning products:', {
      count: formattedProducts.length,
      productIds: formattedProducts.map(p => p.id)
    });

    res.json({
      success: true,
      data: formattedProducts
    });
  } catch (error) {
    console.error('Error fetching recently viewed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product navigation (previous/next) - MUST be before /:id
router.get('/navigation', async (req, res) => {
  try {
    const { company } = req;

    if (!company || !company.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم ?companyId=xxx في URL'
      });
    }

    const { currentProductId, categoryId, type = 'sameCategory' } = req.query;

    if (!currentProductId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المنتج الحالي مطلوب'
      });
    }

    const prisma = getPrisma();

    // Get current product
    const currentProduct = await prisma.product.findFirst({
      where: {
        id: currentProductId,
        companyId: company.id,
        isActive: true
      },
      select: {
        id: true,
        categoryId: true,
        createdAt: true
      }
    });

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const where = {
      companyId: company.id,
      isActive: true
    };

    // Filter by category if sameCategory
    if (type === 'sameCategory' && (categoryId || currentProduct.categoryId)) {
      where.categoryId = categoryId || currentProduct.categoryId;
    }

    // Get all products ordered by createdAt
    const allProducts = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Find current product index
    const currentIndex = allProducts.findIndex(p => p.id === currentProductId);

    if (currentIndex === -1) {
      return res.json({
        success: true,
        data: {
          previous: null,
          next: null
        }
      });
    }

    const previous = currentIndex > 0 ? allProducts[currentIndex - 1] : null;
    const next = currentIndex < allProducts.length - 1 ? allProducts[currentIndex + 1] : null;

    res.json({
      success: true,
      data: {
        previous,
        next
      }
    });
  } catch (error) {
    console.error('Error fetching product navigation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product details by ID
router.get('/:id', async (req, res) => {
  try {
    const { company } = req;

    if (!company || !company.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم ?companyId=xxx في URL'
      });
    }

    const { id } = req.params;

    const prisma = getPrisma();
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        companyId: company.id,
        isActive: true
      },
      include: {
        category: true,
        product_variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // تحويل Decimal fields إلى numbers
    const formattedProduct = {
      ...product,
      price: parseFloat(product.price) || 0,
      comparePrice: product.comparePrice ? parseFloat(product.comparePrice) : null,
      cost: product.cost ? parseFloat(product.cost) : null,
      weight: product.weight ? parseFloat(product.weight) : null,
      product_variants: product.product_variants?.map(variant => ({
        ...variant,
        price: variant.price ? parseFloat(variant.price) : null,
        comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : null,
        cost: variant.cost ? parseFloat(variant.cost) : null
      })) || [],
      variants: product.product_variants?.map(variant => ({
        ...variant,
        price: variant.price ? parseFloat(variant.price) : null,
        comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : null,
        cost: variant.cost ? parseFloat(variant.cost) : null
      })) || []
    };

    res.json({ success: true, data: formattedProduct });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product quick view data (lightweight version for modal)
router.get('/:id/quick', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;

    const prisma = getPrisma();
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        companyId: company.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        comparePrice: true,
        images: true,
        stock: true,
        sku: true,
        category: {
          select: {
            id: true,
            name: true
          }
        },
        product_variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            stock: true
          },
          orderBy: { sortOrder: 'asc' },
          take: 5 // Limit variants for quick view
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product quick view:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sold count for a product
router.get('/:id/sold-count', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;

    if (!company || !company.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم ?companyId=xxx في URL'
      });
    }

    const prisma = getPrisma();

    // Count order items for this product
    // First get orderIds for this company and status
    const orders = await prisma.order.findMany({
      where: {
        companyId: company.id,
        status: {
          not: 'CANCELLED'
        }
      },
      select: {
        id: true
      }
    });

    const orderIds = orders.map(o => o.id);

    const soldCount = await prisma.orderItem.count({
      where: {
        product: {
          OR: [{ id }, { slug: id }]
        },
        orderId: {
          in: orderIds
        }
      }
    });

    res.json({
      success: true,
      data: {
        productId: id,
        soldCount
      }
    });
  } catch (error) {
    console.error('Error fetching sold count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record product view (for recently viewed)
router.post('/products/:id/view', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || 'anonymous';

    console.log('👁️ [RecentlyViewed] Recording view:', {
      productId: id,
      companyId: company.id,
      sessionId: sessionId.substring(0, 20) + '...' // Log partial session ID for privacy
    });

    const prisma = getPrisma();

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        companyId: company.id,
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // Check if already exists
    const existing = await prisma.recentlyViewed.findFirst({
      where: {
        sessionId,
        productId: id,
        companyId: company.id
      }
    });

    if (existing) {
      // Update viewedAt
      await prisma.recentlyViewed.update({
        where: { id: existing.id },
        data: { viewedAt: new Date() }
      });
      console.log('✅ [RecentlyViewed] Updated existing view record');
    } else {
      // Create new
      await prisma.recentlyViewed.create({
        data: {
          sessionId,
          productId: id,
          companyId: company.id
        }
      });
      console.log('✅ [RecentlyViewed] Created new view record');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording product view:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Subscribe to back in stock notifications
router.post('/products/:id/back-in-stock', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;
    const { customerName, customerEmail, customerPhone, notifyEmail, notifySMS } = req.body;

    if (!customerName) {
      return res.status(400).json({
        success: false,
        error: 'الاسم مطلوب'
      });
    }

    const prisma = getPrisma();

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        companyId: company.id,
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // Check if already subscribed
    const existing = await prisma.backInStockNotification.findFirst({
      where: {
        productId: id,
        companyId: company.id,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        isNotified: false
      }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'أنت مسجل بالفعل في قائمة الانتظار'
      });
    }

    // Create notification subscription
    await prisma.backInStockNotification.create({
      data: {
        productId: id,
        companyId: company.id,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        notifyEmail: notifyEmail || false,
        notifySMS: notifySMS || false
      }
    });

    res.json({
      success: true,
      message: 'تم تسجيل طلب الإشعار بنجاح'
    });
  } catch (error) {
    console.error('Error subscribing to back in stock:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const { company } = req;

    if (!company || !company.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم ?companyId=xxx في URL'
      });
    }

    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      where: {
        companyId: company.id,
        isActive: true
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true, stock: { gt: 0 } }
            }
          }
        }
      }
    });

    // Transform categories to include productsCount
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      parentId: category.parentId,
      productsCount: category._count?.products || 0
    }));

    res.json({ success: true, data: formattedCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get category by ID
router.get('/categories/:id', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;

    const prisma = getPrisma();
    const category = await prisma.category.findFirst({
      where: {
        id,
        companyId: company.id,
        isActive: true
      },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true, stock: { gt: 0 } }
            }
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'الفئة غير موجودة'
      });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get store info
router.get('/store-info', async (req, res) => {
  try {
    const { company } = req;

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        description: company.description || '',
        logo: company.logo || null,
        subdomain: company.subdomain || null,
        contactEmail: company.email || null,
        contactPhone: company.phone || null
      }
    });
  } catch (error) {
    console.error('Error fetching store info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get featured products
router.get('/featured-products', async (req, res) => {
  try {
    const { company } = req;
    const { limit = 8 } = req.query;

    const prisma = getPrisma();
    const products = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        stock: { gt: 0 }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: parseInt(limit),
      include: {
        category: true,
        product_variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get related products
router.get('/:id/related', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;
    const { limit = 6, companyId } = req.query;

    if (!company && !companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد معرف الشركة'
      });
    }

    const targetCompanyId = company?.id || companyId;
    const prisma = getPrisma();

    // Get the current product
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        companyId: targetCompanyId,
        isActive: true
      },
      include: {
        category: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // Find related products (same category, different product)
    const relatedProducts = await prisma.product.findMany({
      where: {
        companyId: targetCompanyId,
        isActive: true,
        stock: { gt: 0 },
        id: { not: product.id },
        ...(product.categoryId && { categoryId: product.categoryId })
      },
      take: parseInt(limit),
      include: {
        category: true,
        product_variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ success: true, data: relatedProducts });
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get frequently bought together products
router.get('/:id/frequently-bought-together', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;
    const { limit = 3, companyId } = req.query;

    if (!company && !companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد معرف الشركة'
      });
    }

    const targetCompanyId = company?.id || companyId;
    const prisma = getPrisma();

    // Get the current product
    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: targetCompanyId,
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // For now, return products from the same category
    // In the future, this could be based on order history
    const frequentlyBought = await prisma.product.findMany({
      where: {
        companyId: targetCompanyId,
        isActive: true,
        stock: { gt: 0 },
        id: { not: id },
        ...(product.categoryId && { categoryId: product.categoryId })
      },
      take: parseInt(limit),
      include: {
        category: true,
        product_variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ success: true, data: frequentlyBought });
  } catch (error) {
    console.error('Error fetching frequently bought together:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get volume discounts for a product
router.get('/:id/volume-discounts', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;
    const { companyId } = req.query;

    if (!company && !companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد معرف الشركة'
      });
    }

    const targetCompanyId = company?.id || companyId;
    const prisma = getPrisma();

    // Get the current product
    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: targetCompanyId,
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // Check if product has volume discounts in metadata
    // For now, return empty array as volume discounts are not yet implemented in the schema
    // This endpoint exists to prevent 404 errors
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Error fetching volume discounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

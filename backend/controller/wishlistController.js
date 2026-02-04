const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * ❤️ Controller لإدارة قائمة الرغبات (Wishlist)
 */

/**
 * جلب قائمة الرغبات
 * GET /api/v1/public/wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    const { company } = req;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || 'anonymous';
    
    const prisma = getPrisma();
    
    const wishlistItems = await prisma.wishlist.findMany({
      where: {
        companyId: company.id,
        sessionId
      },
      include: {
        product: {
          include: {
            category: true,
            product_variants: {
              where: { isActive: true },
              take: 5
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        items: wishlistItems,
        count: wishlistItems.length
      }
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * إضافة منتج لقائمة الرغبات
 * POST /api/v1/public/wishlist
 */
exports.addToWishlist = async (req, res) => {
  try {
    const { company } = req;
    const { productId, variantId } = req.body;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || 'anonymous';
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المنتج مطلوب'
      });
    }

    const prisma = getPrisma();

    // التحقق من وجود المنتج
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
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

    // التحقق من وجود المنتج في القائمة
    const existing = await prisma.wishlist.findFirst({
      where: {
        sessionId,
        productId,
        variantId: variantId || null,
        companyId: company.id
      }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'المنتج موجود بالفعل في قائمة الرغبات',
        data: existing
      });
    }

    // إضافة المنتج
    const wishlistItem = await prisma.wishlist.create({
      data: {
        sessionId,
        productId,
        variantId: variantId || null,
        companyId: company.id
      },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تمت إضافة المنتج لقائمة الرغبات',
      data: wishlistItem
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * حذف منتج من قائمة الرغبات
 * DELETE /api/v1/public/wishlist/:productId
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const { company } = req;
    const { productId } = req.params;
    const { variantId } = req.query;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || 'anonymous';

    const prisma = getPrisma();

    const deleted = await prisma.wishlist.deleteMany({
      where: {
        sessionId,
        productId,
        variantId: variantId || null,
        companyId: company.id
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود في قائمة الرغبات'
      });
    }

    res.json({
      success: true,
      message: 'تم حذف المنتج من قائمة الرغبات'
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * جلب عدد المنتجات في قائمة الرغبات
 * GET /api/v1/public/wishlist/count
 */
exports.getWishlistCount = async (req, res) => {
  try {
    const { company } = req;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || 'anonymous';

    const prisma = getPrisma();

    const count = await prisma.wishlist.count({
      where: {
        companyId: company.id,
        sessionId
      }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting wishlist count:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * مسح قائمة الرغبات بالكامل
 * DELETE /api/v1/public/wishlist/clear
 */
exports.clearWishlist = async (req, res) => {
  try {
    const { company } = req;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || 'anonymous';

    const prisma = getPrisma();

    await prisma.wishlist.deleteMany({
      where: {
        companyId: company.id,
        sessionId
      }
    });

    res.json({
      success: true,
      message: 'تم مسح قائمة الرغبات'
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


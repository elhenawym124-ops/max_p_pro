const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * ⭐ Controller لإدارة التقييمات والمراجعات
 */

/**
 * جلب التقييمات لمنتج
 * GET /api/v1/public/products/:productId/reviews
 */
exports.getProductReviews = async (req, res) => {
  try {
    const { company } = req;
    const { productId } = req.params;
    const { page = 1, limit = 10, minRating } = req.query;

    const prisma = getPrisma();

    const where = {
      productId,
      companyId: company.id,
      isApproved: true
    };

    if (minRating) {
      where.rating = { gte: parseInt(minRating) };
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.productReview.count({ where })
    ]);

    // Calculate average rating
    const allReviews = await prisma.productReview.findMany({
      where: {
        productId,
        companyId: company.id,
        isApproved: true
      },
      select: { rating: true }
    });

    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: allReviews.filter(r => r.rating === rating).length
    }));

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          averageRating: avgRating.toFixed(1),
          totalReviews: allReviews.length,
          ratingDistribution
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * إضافة تقييم جديد
 * POST /api/v1/public/products/:productId/reviews
 */
exports.createReview = async (req, res) => {
  try {
    const { company } = req;
    const { productId } = req.params;
    const { customerName, customerEmail, customerPhone, rating, title, comment } = req.body;

    if (!customerName || !rating) {
      return res.status(400).json({
        success: false,
        error: 'الاسم والتقييم مطلوبان'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    const prisma = getPrisma();

    // Check if product exists
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

    // Get storefront settings to check if moderation is enabled
    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId: company.id }
    });

    const isApproved = settings?.reviewsModerationEnabled === false;

    // Create review
    const review = await prisma.productReview.create({
      data: {
        productId,
        companyId: company.id,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        rating: parseInt(rating),
        title: title || null,
        comment: comment || null,
        isApproved
      }
    });

    res.json({
      success: true,
      message: isApproved
        ? 'تم إضافة التقييم بنجاح'
        : 'تم إرسال التقييم وانتظار الموافقة',
      data: review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * تحديث تقييم (للمساعدة - helpful)
 * PUT /api/v1/public/reviews/:reviewId/helpful
 */
exports.markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const prisma = getPrisma();

    const review = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        helpfulCount: { increment: 1 }
      }
    });

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * جلب جميع التقييمات (للإدارة)
 * GET /api/v1/reviews
 */
exports.getAllReviews = async (req, res) => {
  try {
    // Check if req.user exists
    if (!req.user) {
      console.error('❌ [REVIEWS] req.user is missing');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get companyId from req.user
    // JWT token structure: { userId, email, role, companyId, ... }
    const companyId = req.user.companyId;

    console.log('🔍 [REVIEWS] req.user:', {
      id: req.user.id || req.user.userId,
      email: req.user.email,
      companyId: companyId,
      role: req.user.role,
      fullUser: req.user
    });

    if (!companyId) {
      console.error('❌ [REVIEWS] Company ID not found in req.user:', req.user);
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data',
        debug: {
          userId: req.user.id || req.user.userId,
          hasCompanyId: !!req.user.companyId,
          hasCompany: !!req.user.company
        }
      });
    }

    const { page = 1, limit = 20, isApproved, rating, productId, search } = req.query;

    const prisma = getPrisma();

    const where = {
      companyId
    };

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    if (rating) {
      where.rating = parseInt(rating);
    }

    if (productId) {
      where.productId = productId;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { title: { contains: search } },
        { comment: { contains: search } },
        { products: { name: { contains: search } } }
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        include: {
          products: {
            select: {
              id: true,
              name: true,
              images: true
            }
          }
        }
      }),
      prisma.productReview.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * الموافقة على تقييم
 * PUT /api/v1/reviews/:reviewId/approve
 */
exports.approveReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const companyId = req.user.companyId || req.user.company?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data'
      });
    }

    const { reviewId } = req.params;

    const prisma = getPrisma();

    // Check if review exists and belongs to company
    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'التقييم غير موجود'
      });
    }

    const updatedReview = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        isApproved: true
      },
      include: {
        products: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم الموافقة على التقييم بنجاح',
      data: updatedReview
    });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * رفض/إلغاء الموافقة على تقييم
 * PUT /api/v1/reviews/:reviewId/reject
 */
exports.rejectReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const companyId = req.user.companyId || req.user.company?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data'
      });
    }

    const { reviewId } = req.params;

    const prisma = getPrisma();

    // Check if review exists and belongs to company
    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'التقييم غير موجود'
      });
    }

    const updatedReview = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        isApproved: false
      },
      include: {
        products: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم رفض التقييم',
      data: updatedReview
    });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * حذف تقييم
 * DELETE /api/v1/reviews/:reviewId
 */
exports.deleteReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const companyId = req.user.companyId || req.user.company?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data'
      });
    }

    const { reviewId } = req.params;

    const prisma = getPrisma();

    // Check if review exists and belongs to company
    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'التقييم غير موجود'
      });
    }

    await prisma.productReview.delete({
      where: { id: reviewId }
    });

    res.json({
      success: true,
      message: 'تم حذف التقييم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * تنفيذ إجراء جماعي
 * POST /api/v1/reviews/bulk-action
 */
exports.bulkAction = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const companyId = req.user.companyId || req.user.company?.id;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID not found' });
    }

    const { action, ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب تحديد عناصر للعملية' });
    }

    const prisma = getPrisma();

    let result;
    if (action === 'approve') {
      result = await prisma.productReview.updateMany({
        where: { id: { in: ids }, companyId },
        data: { isApproved: true }
      });
    } else if (action === 'reject') {
      result = await prisma.productReview.updateMany({
        where: { id: { in: ids }, companyId },
        data: { isApproved: false }
      });
    } else if (action === 'delete') {
      result = await prisma.productReview.deleteMany({
        where: { id: { in: ids }, companyId }
      });
    } else {
      return res.status(400).json({ success: false, error: 'إجراء غير صالح' });
    }

    res.json({
      success: true,
      message: 'تم تنفيذ العملية بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error in bulk action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


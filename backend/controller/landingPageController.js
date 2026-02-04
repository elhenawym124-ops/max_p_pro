const { getSharedPrismaClient } = require('../services/sharedDatabase');

function getPrisma() {
  return getSharedPrismaClient();
}

// إنشاء صفحة Landing Page جديدة
exports.createLandingPage = async (req, res) => {
  try {
    const { title, slug, content, productId, metaTitle, metaDescription } = req.body;
    const companyId = req.user.companyId;

    // التحقق من عدم تكرار الـ slug
    const existingPage = await getPrisma().landingPage.findFirst({
      where: { slug, companyId }
    });

    if (existingPage) {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    const landingPage = await getPrisma().landingPage.create({
      data: {
        companyId,
        productId: productId || null,
        title,
        slug,
        content,
        metaTitle,
        metaDescription,
        isPublished: false
      }
    });

    res.json(landingPage);
  } catch (error) {
    console.error('Error creating landing page:', error);
    res.status(500).json({ error: 'Failed to create landing page' });
  }
};

// جلب جميع صفحات Landing Pages للشركة
exports.getAllLandingPages = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { page = 1, limit = 20, search = '', productId } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      companyId,
      ...(search && {
        OR: [
          { title: { contains: search } },
          { slug: { contains: search } }
        ]
      }),
      ...(productId && { productId })
    };

    const [pages, total] = await Promise.all([
      getPrisma().landingPage.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, image: true, price: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      getPrisma().landingPage.count({ where })
    ]);

    res.json({
      pages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching landing pages:', error);
    res.status(500).json({ error: 'Failed to fetch landing pages' });
  }
};

// جلب صفحة Landing Page واحدة
exports.getLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const page = await getPrisma().landingPage.findFirst({
      where: { id, companyId },
      include: {
        product: true
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    res.json(page);
  } catch (error) {
    console.error('Error fetching landing page:', error);
    res.status(500).json({ error: 'Failed to fetch landing page' });
  }
};

// تحديث صفحة Landing Page
exports.updateLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, productId, metaTitle, metaDescription, isPublished } = req.body;
    const companyId = req.user.companyId;

    // التحقق من الملكية
    const existingPage = await getPrisma().landingPage.findFirst({
      where: { id, companyId }
    });

    if (!existingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    // التحقق من عدم تكرار الـ slug
    if (slug && slug !== existingPage.slug) {
      const duplicateSlug = await getPrisma().landingPage.findFirst({
        where: { slug, companyId, id: { not: id } }
      });

      if (duplicateSlug) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
    }

    const updatedPage = await getPrisma().landingPage.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        productId: productId || null,
        metaTitle,
        metaDescription,
        isPublished
      },
      include: {
        product: true
      }
    });

    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating landing page:', error);
    res.status(500).json({ error: 'Failed to update landing page' });
  }
};

// حذف صفحة Landing Page
exports.deleteLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // التحقق من الملكية
    const existingPage = await getPrisma().landingPage.findFirst({
      where: { id, companyId }
    });

    if (!existingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    await getPrisma().landingPage.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Landing page deleted successfully' });
  } catch (error) {
    console.error('Error deleting landing page:', error);
    res.status(500).json({ error: 'Failed to delete landing page' });
  }
};

// نشر/إلغاء نشر صفحة
const togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const page = await getPrisma().landingPage.findFirst({
      where: { id, companyId }
    });

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const updatedPage = await getPrisma().landingPage.update({
      where: { id },
      data: { isPublished: !page.isPublished }
    });

    res.json(updatedPage);
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({ error: 'Failed to toggle publish status' });
  }
};

// نسخ صفحة Landing Page
const duplicateLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const originalPage = await getPrisma().landingPage.findFirst({
      where: { id, companyId }
    });

    if (!originalPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    // إنشاء slug جديد
    const newSlug = `${originalPage.slug}-copy-${Date.now()}`;

    const duplicatedPage = await getPrisma().landingPage.create({
      data: {
        companyId,
        productId: originalPage.productId,
        title: `${originalPage.title} (نسخة)`,
        slug: newSlug,
        content: originalPage.content,
        metaTitle: originalPage.metaTitle,
        metaDescription: originalPage.metaDescription,
        isPublished: false
      }
    });

    res.json(duplicatedPage);
  } catch (error) {
    console.error('Error duplicating landing page:', error);
    res.status(500).json({ error: 'Failed to duplicate landing page' });
  }
};

// جلب صفحة عامة (للعرض للعملاء)
exports.getPublicLandingPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await getPrisma().landingPage.findFirst({
      where: { slug, isPublished: true },
      include: {
        product: true,
        company: {
          select: { 
            id: true,
            name: true, 
            logo: true,
            domain: true
          }
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // زيادة عدد المشاهدات
    await getPrisma().landingPage.update({
      where: { id: page.id },
      data: { views: { increment: 1 } }
    });

    res.json(page);
  } catch (error) {
    console.error('Error fetching public landing page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
};

// تسجيل تحويل (Conversion)
const recordConversion = async (req, res) => {
  try {
    const { slug } = req.params;
    const { type = 'purchase' } = req.body; // purchase, lead, signup, etc.

    const page = await getPrisma().landingPage.findFirst({
      where: { slug, isPublished: true }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // زيادة عدد التحويلات
    await getPrisma().landingPage.update({
      where: { id: page.id },
      data: { conversions: { increment: 1 } }
    });

    res.json({ success: true, message: 'Conversion recorded' });
  } catch (error) {
    console.error('Error recording conversion:', error);
    res.status(500).json({ error: 'Failed to record conversion' });
  }
};

// إحصائيات Landing Pages
const getLandingPageStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const stats = await getPrisma().landingPage.aggregate({
      where: { companyId },
      _count: { id: true },
      _sum: {
        views: true,
        conversions: true
      }
    });

    const publishedCount = await getPrisma().landingPage.count({
      where: { companyId, isPublished: true }
    });

    const topPages = await getPrisma().landingPage.findMany({
      where: { companyId },
      orderBy: { views: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        conversions: true
      }
    });

    res.json({
      total: stats._count.id,
      published: publishedCount,
      totalViews: stats._sum.views || 0,
      totalConversions: stats._sum.conversions || 0,
      conversionRate: stats._sum.views 
        ? ((stats._sum.conversions || 0) / stats._sum.views * 100).toFixed(2)
        : 0,
      topPages
    });
  } catch (error) {
    console.error('Error fetching landing page stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

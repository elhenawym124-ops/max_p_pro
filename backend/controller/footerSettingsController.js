const { PrismaClient } = require('@prisma/client');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Footer Settings Controller
 * Handles footer information management
 */

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * Get footer settings
 */
exports.getFooterSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = getPrisma();

    let settings = await prisma.footerSettings.findUnique({
      where: { companyId }
    });

    // Create default settings if not exists
    if (!settings) {
      // Get company info for defaults
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, email: true, phone: true, address: true }
      });

      settings = await prisma.footerSettings.create({
        data: {
          companyId,
          aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
          showAboutStore: true,
          email: company?.email || '',
          showEmail: true,
          phone: company?.phone || '',
          showPhone: true,
          address: company?.address || '',
          showAddress: true,
          showQuickLinks: true,
          copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
          showCopyright: true
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات الفوتر',
      error: error.message
    });
  }
};

/**
 * Update footer settings
 */
exports.updateFooterSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const updateData = req.body;
    const prisma = getPrisma();

    // Check if settings exist
    let settings = await prisma.footerSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      // Create new settings
      settings = await prisma.footerSettings.create({
        data: {
          companyId,
          ...updateData
        }
      });
    } else {
      // Update existing settings
      settings = await prisma.footerSettings.update({
        where: { companyId },
        data: updateData
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث إعدادات الفوتر بنجاح',
      data: settings
    });
  } catch (error) {
    console.error('Error updating footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات الفوتر',
      error: error.message
    });
  }
};

/**
 * Reset footer settings to defaults
 */
exports.resetFooterSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = getPrisma();

    // Get company info for defaults
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true, phone: true, address: true }
    });

    const settings = await prisma.footerSettings.upsert({
      where: { companyId },
      update: {
        aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
        showAboutStore: true,
        email: company?.email || '',
        showEmail: true,
        phone: company?.phone || '',
        showPhone: true,
        address: company?.address || '',
        showAddress: true,
        showQuickLinks: true,
        copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
        showCopyright: true
      },
      create: {
        companyId,
        aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
        showAboutStore: true,
        email: company?.email || '',
        showEmail: true,
        phone: company?.phone || '',
        showPhone: true,
        address: company?.address || '',
        showAddress: true,
        showQuickLinks: true,
        copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
        showCopyright: true
      }
    });

    res.json({
      success: true,
      message: 'تم إعادة تعيين إعدادات الفوتر بنجاح',
      data: settings
    });
  } catch (error) {
    console.error('Error resetting footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة تعيين إعدادات الفوتر',
      error: error.message
    });
  }
};

/**
 * Get public footer settings (for storefront)
 * Supports both companyId and slug
 */
exports.getPublicFooterSettings = async (req, res) => {
  try {
    // Use company from middleware (set by getCompanyFromSubdomain) or fallback to params
    const companyId = req.company?.id || req.params?.companyId;
    const prisma = getPrisma();

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // Determine if companyId is actually a slug or an ID
    let actualCompanyId = companyId;
    
    // Check if it looks like a slug (contains hyphens or is shorter than typical CUID)
    const looksLikeSlug = companyId.includes('-') || companyId.length < 20;
    
    if (looksLikeSlug) {
      const company = await prisma.company.findUnique({
        where: { slug: companyId },
        select: { id: true }
      });
      
      if (company) {
        actualCompanyId = company.id;
      }
    }

    const settings = await prisma.footerSettings.findUnique({
      where: { companyId: actualCompanyId },
      select: {
        aboutStore: true,
        showAboutStore: true,
        email: true,
        showEmail: true,
        phone: true,
        showPhone: true,
        address: true,
        showAddress: true,
        showQuickLinks: true,
        copyrightText: true,
        showCopyright: true
      }
    });

    if (!settings) {
      // Return default settings if not configured
      const company = await prisma.company.findUnique({
        where: { id: actualCompanyId },
        select: { name: true, email: true, phone: true, address: true }
      });

      return res.json({
        success: true,
        data: {
          aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
          showAboutStore: true,
          email: company?.email || '',
          showEmail: true,
          phone: company?.phone || '',
          showPhone: true,
          address: company?.address || '',
          showAddress: true,
          showQuickLinks: true,
          copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
          showCopyright: true
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching public footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات الفوتر',
      error: error.message
    });
  }
};

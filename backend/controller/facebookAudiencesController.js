/**
 * Facebook Audiences Controller
 * 
 * Controller للتعامل مع طلبات Facebook Audiences Management
 */

const FacebookAudiencesService = require('../services/facebookAudiencesService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * جلب Access Token للشركة
 */
async function getCompanyAdsAccessToken(companyId) {
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { 
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true
      }
    });

    return company?.facebookAdsAccessToken || company?.facebookUserAccessToken || null;
  } catch (error) {
    console.error('❌ Error getting company access token:', error);
    return null;
  }
}

/**
 * ============================================
 * Custom Audiences Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/audiences/custom
 * جلب جميع Custom Audiences
 */
const getCustomAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // جلب Audiences من قاعدة البيانات
    const audiences = await getSharedPrismaClient().facebookCustomAudience.findMany({
      where: { companyId },
      include: {
        adAccount: true,
        facebook_lookalike_audiences: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: audiences || []
    });
  } catch (error) {
    console.error('❌ Error getting custom audiences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching custom audiences',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/custom
 * إنشاء Custom Audience جديد
 */
const createCustomAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const {
      name,
      description,
      audienceType, // CUSTOMER_LIST, WEBSITE, ENGAGEMENT, APP_ACTIVITY, VIDEO_VIEW
      adAccountId,
      // Customer List
      customerList,
      customerListId,
      // Website
      pixelId,
      eventType,
      retentionDays,
      // Engagement
      engagementType,
      // Video View
      videoId,
      videoViewDuration
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !audienceType) {
      return res.status(400).json({
        success: false,
        error: 'Name and audience type are required'
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // جلب Ad Account
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: {
        companyId,
        ...(adAccountId && { accountId: adAccountId }),
        isActive: true
      }
    });

    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    // إنشاء Service
    const audiencesService = new FacebookAudiencesService(accessToken, adAccount.accountId);

    let facebookResult;
    
    // إنشاء Audience حسب النوع
    switch (audienceType) {
      case 'CUSTOMER_LIST':
        if (!customerList || customerList.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Customer list is required'
          });
        }
        facebookResult = await audiencesService.createCustomerListAudience({
          name,
          description,
          customerList,
          adAccountId: adAccount.accountId
        });
        break;

      case 'WEBSITE':
        if (!pixelId) {
          return res.status(400).json({
            success: false,
            error: 'Pixel ID is required for website audience'
          });
        }
        facebookResult = await audiencesService.createWebsiteAudience({
          name,
          description,
          pixelId,
          eventType,
          retentionDays,
          adAccountId: adAccount.accountId
        });
        break;

      case 'ENGAGEMENT':
        if (!engagementType) {
          return res.status(400).json({
            success: false,
            error: 'Engagement type is required'
          });
        }
        facebookResult = await audiencesService.createEngagementAudience({
          name,
          description,
          engagementType,
          adAccountId: adAccount.accountId
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid audience type'
        });
    }

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error
      });
    }

    // حفظ Audience في قاعدة البيانات
    const audience = await getSharedPrismaClient().facebookCustomAudience.create({
      data: {
        companyId,
        adAccountId: adAccount.id,
        name,
        description,
        audienceType,
        facebookAudienceId: facebookResult.audienceId,
        customerListId,
        pixelId,
        eventType,
        retentionDays,
        engagementType,
        videoId,
        videoViewDuration,
        status: 'ACTIVE'
      }
    });

    // جلب Audience Size
    const sizeResult = await audiencesService.getAudienceSize(facebookResult.audienceId);
    if (sizeResult.success) {
      await getSharedPrismaClient().facebookCustomAudience.update({
        where: { id: audience.id },
        data: { audienceSize: sizeResult.size }
      });
    }

    res.json({
      success: true,
      data: audience,
      message: 'Custom Audience created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating custom audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/audiences/custom/:id
 * جلب معلومات Custom Audience
 */
const getCustomAudience = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const audience = await getSharedPrismaClient().facebookCustomAudience.findFirst({
      where: { id, companyId },
      include: {
        adAccount: true,
        lookalikeAudiences: true
      }
    });

    if (!audience) {
      return res.status(404).json({
        success: false,
        error: 'Custom Audience not found'
      });
    }

    res.json({
      success: true,
      data: audience
    });
  } catch (error) {
    console.error('❌ Error getting custom audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/audiences/custom/:id
 * حذف Custom Audience
 */
const deleteCustomAudience = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const audience = await getSharedPrismaClient().facebookCustomAudience.findFirst({
      where: { id, companyId }
    });

    if (!audience) {
      return res.status(404).json({
        success: false,
        error: 'Custom Audience not found'
      });
    }

    // حذف من Facebook
    if (audience.facebookAudienceId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const audiencesService = new FacebookAudiencesService(accessToken);
        await audiencesService.deleteCustomAudience(audience.facebookAudienceId);
      }
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookCustomAudience.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Custom Audience deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting custom audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * Lookalike Audiences Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/audiences/lookalike
 * جلب جميع Lookalike Audiences
 */
const getLookalikeAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const audiences = await getSharedPrismaClient().facebookLookalikeAudience.findMany({
      where: { companyId },
      include: {
        adAccount: true,
        sourceAudience: {
          select: {
            id: true,
            name: true,
            audienceType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: audiences || []
    });
  } catch (error) {
    console.error('❌ Error getting lookalike audiences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching lookalike audiences',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/lookalike
 * إنشاء Lookalike Audience جديد
 */
const createLookalikeAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const {
      name,
      description,
      sourceAudienceId, // Internal ID للـ Custom Audience
      country,
      ratio = 1,
      adAccountId
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !sourceAudienceId || !country) {
      return res.status(400).json({
        success: false,
        error: 'Name, source audience ID, and country are required'
      });
    }

    // التحقق من Source Audience
    const sourceAudience = await getSharedPrismaClient().facebookCustomAudience.findFirst({
      where: {
        id: sourceAudienceId,
        companyId
      }
    });

    if (!sourceAudience || !sourceAudience.facebookAudienceId) {
      return res.status(400).json({
        success: false,
        error: 'Source Custom Audience not found or not synced with Facebook'
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // جلب Ad Account
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: {
        companyId,
        ...(adAccountId && { accountId: adAccountId }),
        isActive: true
      }
    });

    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    // إنشاء Service
    const audiencesService = new FacebookAudiencesService(accessToken, adAccount.accountId);

    // إنشاء Lookalike Audience في Facebook
    const facebookResult = await audiencesService.createLookalikeAudience({
      name,
      description,
      sourceAudienceId: sourceAudience.facebookAudienceId,
      country,
      ratio,
      adAccountId: adAccount.accountId
    });

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error
      });
    }

    // حفظ Lookalike Audience في قاعدة البيانات
    const lookalikeAudience = await getSharedPrismaClient().facebookLookalikeAudience.create({
      data: {
        companyId,
        adAccountId: adAccount.id,
        sourceAudienceId,
        name,
        description,
        facebookAudienceId: facebookResult.audienceId,
        lookalikeSpec: JSON.stringify({ country, ratio }),
        country,
        ratio,
        status: 'ACTIVE'
      }
    });

    // جلب Audience Size
    const sizeResult = await audiencesService.getAudienceSize(facebookResult.audienceId);
    if (sizeResult.success) {
      await getSharedPrismaClient().facebookLookalikeAudience.update({
        where: { id: lookalikeAudience.id },
        data: { audienceSize: sizeResult.size }
      });
    }

    res.json({
      success: true,
      data: lookalikeAudience,
      message: 'Lookalike Audience created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating lookalike audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getCustomAudiences,
  createCustomAudience,
  getCustomAudience,
  deleteCustomAudience,
  getLookalikeAudiences,
  createLookalikeAudience
};



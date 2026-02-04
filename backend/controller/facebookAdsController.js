/**
 * Facebook Ads Controller
 * 
 * Controller للتعامل مع طلبات Facebook Ads Management
 */

const FacebookAdsService = require('../services/facebookAdsService');
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

    // أولوية لـ Ads Access Token، ثم User Access Token
    return company?.facebookAdsAccessToken || company?.facebookUserAccessToken || null;
  } catch (error) {
    console.error('❌ Error getting company access token:', error);
    return null;
  }
}

/**
 * جلب أو إنشاء Ad Account للشركة
 */
async function getOrCreateAdAccount(companyId, adAccountId = null) {
  try {
    // إذا كان هناك adAccountId، احصل عليه
    if (adAccountId) {
      const account = await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: {
          companyId,
          accountId: adAccountId
        }
      });
      
      if (account) {
        return account;
      }
    }

    // جلب Ad Account الافتراضي للشركة
    const defaultAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: {
        companyId,
        isActive: true
      }
    });

    return defaultAccount;
  } catch (error) {
    console.error('❌ Error getting Ad Account:', error);
    return null;
  }
}

/**
 * ============================================
 * Campaign Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/campaigns
 * جلب جميع الحملات
 */
const getCampaigns = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // جلب الحملات من قاعدة البيانات
    const campaigns = await getSharedPrismaClient().facebookCampaign.findMany({
      where: { companyId },
      include: {
        facebook_adsets: {
          include: {
            facebook_ads: {
              include: {
                facebook_ad_insights: {
                  take: 1,
                  orderBy: { date: 'desc' }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: campaigns,
      count: campaigns.length
    });
  } catch (error) {
    console.error('❌ Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns
 * إنشاء حملة جديدة
 */
const createCampaign = async (req, res) => {
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
      objective,
      status = 'PAUSED',
      budgetType,
      budgetAmount,
      startDate,
      endDate,
      pixelId,
      adAccountId,
      // Campaign settings
      description,
      specialAdCategories,
      budgetOptimization,
      spendLimit,
      timezone,
      buyingType = 'AUCTION',
      bidStrategy,
      // Targeting settings
      conversionLocation,
      optimizationGoal,
      targeting,
      // Placements settings
      placementType,
      placements
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !objective || !budgetType || !budgetAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, objective, budgetType, budgetAmount'
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found. Please connect your Facebook account first.'
      });
    }

    // جلب أو إنشاء Ad Account
    const adAccount = await getOrCreateAdAccount(companyId, adAccountId);
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found. Please set up your Ad Account first.'
      });
    }

    // إنشاء Service
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // إنشاء الحملة في Facebook مع كل البيانات
    const facebookResult = await adsService.createCampaign({
      name,
      objective,
      status,
      adAccountId: adAccount.accountId,
      specialAdCategories: specialAdCategories || [],
      budgetOptimization: budgetOptimization || false,
      budgetType,
      budgetAmount,
      spendLimit,
      buyingType,
      bidStrategy
    });

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error
      });
    }

    // حفظ الحملة في قاعدة البيانات مع كل البيانات
    const campaign = await getSharedPrismaClient().facebookCampaign.create({
      data: {
        companyId,
        adAccountId: adAccount.id,
        name,
        objective,
        status,
        facebookCampaignId: facebookResult.campaignId,
        budgetType,
        budgetAmount,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        pixelId,
        // حفظ كل الإعدادات في JSON
        settings: JSON.stringify({
          description,
          specialAdCategories,
          budgetOptimization,
          spendLimit,
          timezone,
          buyingType,
          bidStrategy,
          // Targeting settings
          conversionLocation,
          optimizationGoal,
          targeting,
          // Placements settings
          placementType,
          placements
        })
      }
    });

    // إذا كان هناك targeting، ننشئ Ad Set تلقائياً
    if (targeting && facebookResult.campaignId) {
      try {
        const adSetResult = await adsService.createAdSet(facebookResult.campaignId, {
          name: `${name} - Ad Set`,
          status,
          targeting,
          budgetType: budgetOptimization ? undefined : budgetType,
          budgetAmount: budgetOptimization ? undefined : budgetAmount,
          optimizationGoal: optimizationGoal || 'LINK_CLICKS',
          billingEvent: 'IMPRESSIONS',
          placementType,
          placements
        });

        if (adSetResult.success) {
          // حفظ Ad Set في قاعدة البيانات
          await getSharedPrismaClient().facebookAdSet.create({
            data: {
              companyId,
              campaignId: campaign.id,
              facebookAdSetId: adSetResult.adSetId,
              name: `${name} - Ad Set`,
              status,
              targeting: JSON.stringify(targeting),
              budgetType: budgetOptimization ? null : budgetType,
              budgetAmount: budgetOptimization ? null : budgetAmount,
              optimizationGoal: optimizationGoal || 'LINK_CLICKS'
            }
          });
          console.log('✅ Ad Set created automatically:', adSetResult.adSetId);
        }
      } catch (adSetError) {
        console.warn('⚠️ Failed to create automatic Ad Set:', adSetError.message);
        // لا نفشل الحملة إذا فشل إنشاء Ad Set
      }
    }

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/full-ad
 * إنشاء إعلان كامل (Campaign + AdSet + Ad) في خطوة واحدة
 * هذا هو الـ endpoint الرئيسي لإنشاء إعلان من الـ Wizard
 */
const createFullAd = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;

    // التحقق من وجود Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Ads Access Token not found. Please connect your Facebook account first.'
      });
    }

    // جلب Ad Account النشط
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'No active Facebook Ad Account found. Please add an Ad Account first.'
      });
    }

    // إنشاء الـ Service
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // التحقق من البيانات المطلوبة
    const {
      campaignName,
      objective,
      budgetAmount,
      pageId,
      primaryText,
      headline,
      linkUrl
    } = data;

    if (!campaignName) {
      return res.status(400).json({ success: false, error: 'Campaign name is required' });
    }
    if (!objective) {
      return res.status(400).json({ success: false, error: 'Campaign objective is required' });
    }
    if (!budgetAmount || budgetAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid budget amount is required' });
    }
    if (!pageId) {
      return res.status(400).json({ success: false, error: 'Facebook Page ID is required' });
    }
    if (!primaryText) {
      return res.status(400).json({ success: false, error: 'Ad primary text is required' });
    }
    if (!linkUrl) {
      return res.status(400).json({ success: false, error: 'Destination URL is required' });
    }

    console.log('🚀 Creating Full Ad for company:', companyId);

    // إنشاء الإعلان الكامل
    const result = await adsService.createFullAd(data);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        step: result.step,
        partialSuccess: result.partialSuccess,
        results: result.results
      });
    }

    // حفظ البيانات في قاعدة البيانات
    try {
      // حفظ Campaign
      const campaign = await getSharedPrismaClient().facebookCampaign.create({
        data: {
          companyId,
          adAccountId: adAccount.id,
          name: data.campaignName,
          objective: data.objective,
          status: data.status || 'PAUSED',
          facebookCampaignId: result.campaignId,
          budgetType: data.budgetType || 'DAILY',
          budgetAmount: data.budgetAmount,
          startDate: data.startTime ? new Date(data.startTime) : null,
          endDate: data.endTime ? new Date(data.endTime) : null,
          settings: JSON.stringify({
            budgetOptimization: data.budgetOptimization,
            bidStrategy: data.bidStrategy,
            specialAdCategories: data.specialAdCategories
          })
        }
      });

      // حفظ AdSet
      const adSet = await getSharedPrismaClient().facebookAdSet.create({
        data: {
          companyId,
          campaignId: campaign.id,
          facebookAdSetId: result.adSetId,
          name: data.adSetName || `${data.campaignName} - AdSet`,
          status: data.status || 'PAUSED',
          targeting: JSON.stringify(data.targeting || {}),
          budgetType: data.budgetOptimization ? null : (data.budgetType || 'DAILY'),
          budgetAmount: data.budgetOptimization ? null : data.budgetAmount,
          optimizationGoal: data.optimizationGoal || 'LINK_CLICKS'
        }
      });

      // حفظ Ad
      const ad = await getSharedPrismaClient().facebookAd.create({
        data: {
          companyId,
          adSetId: adSet.id,
          facebookAdId: result.adId,
          name: data.adName || `${data.campaignName} - Ad`,
          status: data.status || 'PAUSED',
          creativeType: data.creativeType || 'SINGLE_IMAGE',
          creativeData: JSON.stringify({
            primaryText: data.primaryText,
            headline: data.headline,
            description: data.description,
            callToAction: data.callToAction,
            linkUrl: data.linkUrl,
            creativeId: result.creativeId
          })
        }
      });

      console.log('✅ Full Ad saved to database');

      res.json({
        success: true,
        data: {
          campaign,
          adSet,
          ad,
          facebookIds: {
            campaignId: result.campaignId,
            adSetId: result.adSetId,
            adId: result.adId,
            creativeId: result.creativeId
          }
        },
        message: 'Full ad created successfully!'
      });

    } catch (dbError) {
      console.error('⚠️ Database save error (ad was created on Facebook):', dbError);
      
      // الإعلان تم إنشاؤه على Facebook لكن فشل الحفظ في DB
      res.json({
        success: true,
        warning: 'Ad created on Facebook but failed to save locally',
        facebookIds: {
          campaignId: result.campaignId,
          adSetId: result.adSetId,
          adId: result.adId,
          creativeId: result.creativeId
        },
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Error creating full ad:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/campaigns/:id
 * جلب تفاصيل حملة
 */
const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        facebook_adsets: {
          include: {
            facebook_ads: {
              include: {
                facebook_ad_insights: {
                  take: 30,
                  orderBy: { date: 'desc' }
                }
              }
            }
          }
        },
        adAccount: true
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('❌ Error getting campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * PUT /api/v1/facebook-ads/campaigns/:id
 * تحديث حملة
 */
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const updateData = req.body;

    // جلب الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // تحديث في Facebook إذا كان موجود
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(campaign.facebookCampaignId, updateData);
      }
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/campaigns/:id
 * حذف حملة
 */
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // جلب الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // حذف من Facebook إذا كان موجود
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.deleteCampaign(campaign.facebookCampaignId);
      }
    }

    // حذف من قاعدة البيانات (CASCADE سيحذف AdSets و Ads تلقائياً)
    await getSharedPrismaClient().facebookCampaign.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:id/pause
 * إيقاف حملة
 */
const pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // إيقاف في Facebook
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(campaign.facebookCampaignId, { status: 'PAUSED' });
      }
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: { status: 'PAUSED' }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Campaign paused successfully'
    });
  } catch (error) {
    console.error('❌ Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:id/resume
 * استئناف حملة
 */
const resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // تفعيل في Facebook
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(campaign.facebookCampaignId, { status: 'ACTIVE' });
      }
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Campaign resumed successfully'
    });
  } catch (error) {
    console.error('❌ Error resuming campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * Ad Accounts Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/ad-accounts
 * جلب Ad Accounts المتاحة
 */
const getAdAccounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found. Please connect your Facebook account first.',
        code: 'NO_ACCESS_TOKEN'
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const result = await adsService.getAdAccounts();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to fetch Ad Accounts from Facebook',
        code: 'FACEBOOK_API_ERROR'
      });
    }

    res.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('❌ Error getting Ad Accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching Ad Accounts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ============================================
 * AdSet Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/campaigns/:campaignId/adsets
 * جلب جميع AdSets في حملة
 */
const getAdSets = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const companyId = req.user?.companyId;

    // التحقق من أن الحملة تخص الشركة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const adSets = await getSharedPrismaClient().facebookAdSet.findMany({
      where: { campaignId },
      include: {
        facebook_ads: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: adSets,
      count: adSets.length
    });
  } catch (error) {
    console.error('❌ Error getting AdSets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:campaignId/adsets
 * إنشاء AdSet جديد
 */
const createAdSet = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const companyId = req.user?.companyId;
    const {
      name,
      status = 'PAUSED',
      targeting,
      budgetType,
      budgetAmount,
      optimizationGoal,
      billingEvent,
      ageMin,
      ageMax,
      genders,
      locations,
      interests,
      behaviors
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !budgetType || !budgetAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, budgetType, budgetAmount'
      });
    }

    // التحقق من الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
      include: { adAccount: true }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
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

    // الحصول على Ad Account
    const adAccount = campaign.adAccount || await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found. Please set up your Ad Account first.'
      });
    }

    // إنشاء AdSet في Facebook
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    
    // استخدام Facebook Campaign ID إذا كان موجود، وإلا استخدام campaign ID
    const fbCampaignId = campaign.facebookCampaignId || campaign.id;
    
    const facebookResult = await adsService.createAdSet(
      fbCampaignId,
      {
        name,
        status,
        targeting: targeting || {
          ageMin,
          ageMax,
          genders,
          locations,
          interests,
          behaviors
        },
        budgetType,
        budgetAmount,
        optimizationGoal,
        billingEvent
      }
    );

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error
      });
    }

    // حفظ AdSet في قاعدة البيانات
    const adSet = await getSharedPrismaClient().facebookAdSet.create({
      data: {
        campaignId,
        name,
        status,
        facebookAdSetId: facebookResult.adSetId,
        targeting: targeting ? JSON.stringify(targeting) : null,
        ageMin,
        ageMax,
        genders: genders ? JSON.stringify(genders) : null,
        locations: locations ? JSON.stringify(locations) : null,
        interests: interests ? JSON.stringify(interests) : null,
        behaviors: behaviors ? JSON.stringify(behaviors) : null,
        budgetType,
        budgetAmount,
        optimizationGoal,
        billingEvent
      }
    });

    res.json({
      success: true,
      data: adSet,
      message: 'AdSet created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating AdSet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/adsets/:id
 * حذف AdSet
 */
const deleteAdSet = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const adSet = await getSharedPrismaClient().facebookAdSet.findFirst({
      where: { id },
      include: {
        campaign: true
      }
    });

    if (!adSet || adSet.campaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: 'AdSet not found'
      });
    }

    // حذف من Facebook
    if (adSet.facebookAdSetId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        // TODO: إضافة deleteAdSet في Service
      }
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookAdSet.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'AdSet deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting AdSet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * Ads Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/adsets/:adSetId/ads
 * جلب جميع الإعلانات في AdSet
 */
const getAds = async (req, res) => {
  try {
    const { adSetId } = req.params;
    const companyId = req.user?.companyId;

    // التحقق من أن AdSet تخص الشركة
    const adSet = await getSharedPrismaClient().facebookAdSet.findFirst({
      where: { id: adSetId },
      include: { campaign: true }
    });

    if (!adSet || adSet.campaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: 'AdSet not found'
      });
    }

    const ads = await getSharedPrismaClient().facebookAd.findMany({
      where: { adSetId },
      include: {
        insights: {
          take: 7,
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: ads,
      count: ads.length
    });
  } catch (error) {
    console.error('❌ Error getting Ads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/adsets/:adSetId/ads
 * إنشاء إعلان جديد
 */
const createAd = async (req, res) => {
  try {
    const { adSetId } = req.params;
    const companyId = req.user?.companyId;
    const {
      name,
      status = 'PAUSED',
      creativeType = 'SINGLE_IMAGE',
      primaryText,
      headline,
      description,
      callToAction,
      imageUrl,
      videoUrl,
      linkUrl,
      productId
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !primaryText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, primaryText'
      });
    }

    // التحقق من AdSet
    const adSet = await getSharedPrismaClient().facebookAdSet.findFirst({
      where: { id: adSetId },
      include: { 
        campaign: {
          include: { adAccount: true }
        }
      }
    });

    if (!adSet || adSet.campaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: 'AdSet not found'
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    
    let facebookAdId = null;
    let imageHash = null;

    // إنشاء الإعلان في Facebook إذا كان هناك Access Token و AdSet ID
    if (accessToken && adSet.facebookAdSetId) {
      const adAccount = adSet.campaign.adAccount || await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true }
      });

      if (adAccount) {
        const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

        // رفع الصورة إذا كانت موجودة
        if (imageUrl && creativeType === 'SINGLE_IMAGE') {
          const uploadResult = await adsService.uploadImage(imageUrl);
          if (uploadResult.success) {
            imageHash = uploadResult.hash;
          }
        }

        // إنشاء الإعلان في Facebook
        const facebookResult = await adsService.createAd(adSet.facebookAdSetId, {
          name,
          status,
          creativeType,
          primaryText,
          headline,
          description,
          callToAction,
          imageHash,
          linkUrl
        });

        if (facebookResult.success) {
          facebookAdId = facebookResult.adId;
        }
      }
    }

    // حفظ الإعلان في قاعدة البيانات
    const ad = await getSharedPrismaClient().facebookAd.create({
      data: {
        adSetId,
        companyId,
        name,
        status,
        facebookAdId,
        creativeType,
        primaryText,
        headline,
        description,
        callToAction,
        imageUrl,
        videoUrl,
        imageHash,
        linkUrl,
        productId
      }
    });

    res.json({
      success: true,
      data: ad,
      message: 'Ad created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating Ad:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * PUT /api/v1/facebook-ads/ads/:id
 * تحديث إعلان
 */
const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const updateData = req.body;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id, companyId }
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookAd.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Ad updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating Ad:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/ads/:id
 * حذف إعلان
 */
const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id, companyId }
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookAd.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting Ad:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * Insights Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/ads/:adId/insights
 * جلب إحصائيات إعلان
 */
const getAdInsights = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id: adId, companyId }
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }

    // جلب من قاعدة البيانات المحلية
    const whereClause = { adId };
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const insights = await getSharedPrismaClient().facebookAdInsight.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 30
    });

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('❌ Error getting Ad insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/ads/:adId/sync-insights
 * مزامنة إحصائيات إعلان من Facebook
 */
const syncAdInsights = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.body;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id: adId, companyId }
    });

    if (!ad || !ad.facebookAdId) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found or not synced with Facebook'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const dateRange = startDate && endDate ? { since: startDate, until: endDate } : null;
    
    const result = await adsService.getInsights(ad.facebookAdId, dateRange);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // حفظ الإحصائيات في قاعدة البيانات
    const savedInsights = [];
    for (const insight of result.data) {
      const saved = await getSharedPrismaClient().facebookAdInsight.upsert({
        where: {
          adId_date: {
            adId,
            date: new Date(insight.date_start || new Date())
          }
        },
        update: {
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
          ctr: parseFloat(insight.ctr) || 0,
          cpc: parseFloat(insight.cpc) || 0,
          spend: parseFloat(insight.spend) || 0,
          reach: parseInt(insight.reach) || 0,
          frequency: parseFloat(insight.frequency) || 0
        },
        create: {
          adId,
          date: new Date(insight.date_start || new Date()),
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
          ctr: parseFloat(insight.ctr) || 0,
          cpc: parseFloat(insight.cpc) || 0,
          spend: parseFloat(insight.spend) || 0,
          reach: parseInt(insight.reach) || 0,
          frequency: parseFloat(insight.frequency) || 0
        }
      });
      savedInsights.push(saved);
    }

    // تحديث lastSyncAt
    await getSharedPrismaClient().facebookAd.update({
      where: { id: adId },
      data: { lastSyncAt: new Date() }
    });

    res.json({
      success: true,
      data: savedInsights,
      message: `Synced ${savedInsights.length} insights`
    });
  } catch (error) {
    console.error('❌ Error syncing Ad insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/campaigns/:campaignId/insights
 * جلب إحصائيات حملة (مجمعة)
 */
const getCampaignInsights = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
      include: {
        facebook_adsets: {
          include: {
            facebook_ads: {
              include: {
                facebook_ad_insights: {
                  take: 30,
                  orderBy: { date: 'desc' }
                }
              }
            }
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // تجميع الإحصائيات
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalReach = 0;
    let totalConversions = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;

    campaign.facebook_adsets.forEach(adSet => {
      adSet.facebook_ads.forEach(ad => {
        ad.facebook_ad_insights.forEach(insight => {
          totalImpressions += insight.impressions;
          totalClicks += insight.clicks;
          totalSpend += insight.spend;
          totalReach += insight.reach;
          totalConversions += insight.conversions;
          totalPurchases += insight.purchases;
          totalPurchaseValue += insight.purchaseValue;
        });
      });
    });

    const aggregatedInsights = {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      reach: totalReach,
      conversions: totalConversions,
      purchases: totalPurchases,
      purchaseValue: totalPurchaseValue,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      roas: totalSpend > 0 ? totalPurchaseValue / totalSpend : 0
    };

    res.json({
      success: true,
      data: aggregatedInsights,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        adSetsCount: campaign.facebook_adsets.length,
        adsCount: campaign.facebook_adsets.reduce((sum, as) => sum + as.facebook_ads.length, 0)
      }
    });
  } catch (error) {
    console.error('❌ Error getting campaign insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * Sync Endpoints
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/sync
 * مزامنة جميع الحملات من Facebook
 */
const syncFromFacebook = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adAccountId } = req.body;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // جلب Ad Account
    const adAccount = await getOrCreateAdAccount(companyId, adAccountId);
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // جلب الحملات من Facebook
    const campaignsResult = await adsService.getCampaigns(adAccount.accountId, [
      'id', 'name', 'objective', 'status', 'created_time', 'updated_time',
      'daily_budget', 'lifetime_budget'
    ]);

    if (!campaignsResult.success) {
      return res.status(400).json(campaignsResult);
    }

    const syncedCampaigns = [];

    for (const fbCampaign of campaignsResult.data) {
      // البحث عن الحملة المحلية أو إنشاء جديدة
      const existingCampaign = await getSharedPrismaClient().facebookCampaign.findFirst({
        where: {
          companyId,
          facebookCampaignId: fbCampaign.id
        }
      });

      const campaignData = {
        name: fbCampaign.name,
        objective: fbCampaign.objective,
        status: fbCampaign.status,
        facebookCampaignId: fbCampaign.id,
        budgetType: fbCampaign.daily_budget ? 'DAILY' : 'LIFETIME',
        budgetAmount: (fbCampaign.daily_budget || fbCampaign.lifetime_budget || 0) / 100,
        lastSyncAt: new Date()
      };

      let campaign;
      if (existingCampaign) {
        campaign = await getSharedPrismaClient().facebookCampaign.update({
          where: { id: existingCampaign.id },
          data: campaignData
        });
      } else {
        campaign = await getSharedPrismaClient().facebookCampaign.create({
          data: {
            ...campaignData,
            companyId,
            adAccountId: adAccount.id
          }
        });
      }

      syncedCampaigns.push(campaign);
    }

    res.json({
      success: true,
      data: syncedCampaigns,
      message: `Synced ${syncedCampaigns.length} campaigns from Facebook`
    });
  } catch (error) {
    console.error('❌ Error syncing from Facebook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/ad-accounts/save
 * حفظ Ad Account
 */
const saveAdAccount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { accountId, name, currency, timezone } = req.body;

    if (!accountId || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountId, name'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // حفظ أو تحديث Ad Account
    const adAccount = await getSharedPrismaClient().facebookAdAccount.upsert({
      where: {
        companyId_accountId: {
          companyId,
          accountId
        }
      },
      update: {
        name,
        currency: currency || 'USD',
        timezone,
        accessToken,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        companyId,
        accountId,
        name,
        currency: currency || 'USD',
        timezone,
        accessToken,
        isActive: true
      }
    });

    res.json({
      success: true,
      data: adAccount,
      message: 'Ad Account saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving Ad Account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/saved-ad-accounts
 * جلب Ad Accounts المحفوظة
 */
const getSavedAdAccounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const adAccounts = await getSharedPrismaClient().facebookAdAccount.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: adAccounts
    });
  } catch (error) {
    console.error('❌ Error getting saved Ad Accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/upload-image
 * رفع صورة إلى Facebook
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف'
      });
    }

    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Access Token غير موجود'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'Ad Account غير موجود'
      });
    }

    // Upload to Facebook
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const FormData = require('form-data');
    
    const formData = new FormData();
    formData.append('bytes', req.file.buffer, { filename: req.file.originalname || 'image.jpg' });
    formData.append('access_token', accessToken);

    const axios = require('axios');
    const uploadResponse = await axios.post(
      `https://graph.facebook.com/v18.0/act_${adAccount.accountId}/adimages`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    const hash = uploadResponse.data.images?.[0]?.hash;
    if (!hash) {
      throw new Error('فشل في الحصول على Image Hash');
    }

    res.json({
      success: true,
      hash: hash,
      data: uploadResponse.data
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'فشل في رفع الصورة'
    });
  }
};

/**
 * POST /api/v1/facebook-ads/upload-video
 * رفع فيديو إلى Facebook
 */
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف'
      });
    }

    const { name } = req.body;
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Access Token غير موجود'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'Ad Account غير موجود'
      });
    }

    // Upload to Facebook
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const FormData = require('form-data');
    
    const formData = new FormData();
    formData.append('name', name || 'Video Ad');
    formData.append('video_file_chunk', req.file.buffer, { filename: req.file.originalname || 'video.mp4' });
    formData.append('access_token', accessToken);

    const axios = require('axios');
    const uploadResponse = await axios.post(
      `https://graph.facebook.com/v18.0/act_${adAccount.accountId}/advideos`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const videoId = uploadResponse.data.id;
    if (!videoId) {
      throw new Error('فشل في الحصول على Video ID');
    }

    res.json({
      success: true,
      videoId: videoId,
      data: uploadResponse.data
    });
  } catch (error) {
    console.error('❌ Error uploading video:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'فشل في رفع الفيديو'
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Custom Audiences
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/audiences
 * جلب Custom Audiences
 */
const getCustomAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getCustomAudiences();

    res.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('❌ Error getting Custom Audiences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences
 * إنشاء Custom Audience
 */
const createCustomAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, subtype } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Audience name is required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createCustomAudience({ name, description, subtype });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        audienceId: result.audienceId,
        ...result.data
      }
    });
  } catch (error) {
    console.error('❌ Error creating Custom Audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/:id/users
 * إضافة مستخدمين لـ Custom Audience
 */
const addUsersToAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Users array is required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.addUsersToCustomAudience(id, users);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error adding users to audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/lookalike
 * إنشاء Lookalike Audience
 */
const createLookalikeAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, sourceAudienceId, country, ratio } = req.body;

    if (!name || !sourceAudienceId || !country) {
      return res.status(400).json({
        success: false,
        error: 'name, sourceAudienceId, and country are required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createLookalikeAudience({ name, sourceAudienceId, country, ratio });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        audienceId: result.audienceId,
        ...result.data
      }
    });
  } catch (error) {
    console.error('❌ Error creating Lookalike Audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: A/B Testing
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/ab-tests
 * إنشاء A/B Test
 */
const createABTest = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, startTime, endTime, cells } = req.body;

    if (!name || !cells || cells.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'name and at least 2 cells are required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createABTest({ name, description, startTime, endTime, cells });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        studyId: result.studyId,
        ...result.data
      }
    });
  } catch (error) {
    console.error('❌ Error creating A/B Test:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ab-tests/:id
 * جلب نتائج A/B Test
 */
const getABTestResults = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.getABTestResults(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error getting A/B Test results:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Lead Generation
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/lead-forms
 * إنشاء Lead Form
 */
const createLeadForm = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pageId, name, questions, privacyPolicyUrl, thankYouPage } = req.body;

    if (!pageId || !name || !questions || !privacyPolicyUrl) {
      return res.status(400).json({
        success: false,
        error: 'pageId, name, questions, and privacyPolicyUrl are required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.createLeadForm(pageId, { name, questions, privacyPolicyUrl, thankYouPage });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        formId: result.formId,
        ...result.data
      }
    });
  } catch (error) {
    console.error('❌ Error creating Lead Form:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/lead-forms/:id/leads
 * جلب Leads من Form
 */
const getLeads = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.getLeads(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error getting Leads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Conversion API (CAPI)
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/conversions
 * إرسال Conversion Event
 */
const sendConversionEvent = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pixelId, eventName, eventSourceUrl, userData, customData, actionSource } = req.body;

    if (!pixelId || !eventName) {
      return res.status(400).json({
        success: false,
        error: 'pixelId and eventName are required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.sendConversionEvent(pixelId, {
      eventName,
      eventSourceUrl,
      userData,
      customData,
      actionSource
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error sending Conversion Event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Ad Scheduling
 * ============================================
 */

/**
 * PUT /api/v1/facebook-ads/adsets/:id/schedule
 * تحديث جدولة Ad Set
 */
const updateAdSetSchedule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'schedule array is required'
      });
    }

    // جلب Ad Set من قاعدة البيانات
    const adSet = await getSharedPrismaClient().facebookAdSet.findFirst({
      where: { id, companyId }
    });

    if (!adSet) {
      return res.status(404).json({
        success: false,
        error: 'Ad Set not found'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.updateAdSetSchedule(adSet.facebookAdSetId, schedule);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error updating Ad Set schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// v22.0: Dynamic Creative Optimization
const createDynamicCreative = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createDynamicCreative(data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Advantage+ Shopping
const createAdvantagePlusShoppingCampaign = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAdvantagePlusShoppingCampaign(data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Async Reports
const createAsyncReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAsyncReport(data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAsyncReportStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { reportRunId } = req.params;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.getAsyncReportStatus(reportRunId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAsyncReportResults = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { reportRunId } = req.params;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.getAsyncReportResults(reportRunId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Creative Formats
const createCollectionCreative = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createCollectionCreative(data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createStoriesReelsCreative = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createStoriesReelsCreative(data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createInstantExperience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pageId, name, components } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.createInstantExperience(pageId, { name, components });
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Automation Rules
const createAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAutomatedRule(data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAutomatedRules = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getAutomatedRules();
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.updateAutomatedRule(id, data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.deleteAutomatedRule(id);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Attribution Settings
const updateAttributionSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adSetId } = req.params;
    const settings = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.updateAttributionSettings(adSetId, settings);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Ad Set Management
const updateAdSet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const data = req.body;
    const adSet = await getSharedPrismaClient().facebookAdSet.findFirst({ where: { id, companyId } });
    if (!adSet) return res.status(404).json({ success: false, error: 'Ad Set not found' });
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.updateAdSet(adSet.facebookAdSetId, data);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateFrequencyCap = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { maxFrequency, intervalDays } = req.body;
    const adSet = await getSharedPrismaClient().facebookAdSet.findFirst({ where: { id, companyId } });
    if (!adSet) return res.status(404).json({ success: false, error: 'Ad Set not found' });
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.updateFrequencyCap(adSet.facebookAdSetId, { maxFrequency, intervalDays });
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Advanced Targeting
const searchTargetingOptions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { query, type } = req.query;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.searchTargetingOptions(query, type);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTargetingSuggestions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { targetingList } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getTargetingSuggestions(targetingList);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReachEstimate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { targeting } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getReachEstimate(targeting);
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Ad Preview
const getAdPreview = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adId } = req.params;
    const { format } = req.query;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.getAdPreview(adId, format);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCreativePreview = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { creativeId } = req.params;
    const { format } = req.query;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getCreativePreview(creativeId, format);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Saved Audiences
const createSavedAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, targeting } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createSavedAudience({ name, description, targeting });
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSavedAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    if (!adAccount) return res.status(404).json({ success: false, error: 'Ad Account not found' });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getSavedAudiences();
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteSavedAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) return res.status(400).json({ success: false, error: 'Access Token not found' });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({ where: { companyId, isActive: true } });
    const adsService = new FacebookAdsService(accessToken, adAccount?.accountId);
    const result = await adsService.deleteSavedAudience(id);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ============================================
 * Facebook Pages & Pixels
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/pages
 * جلب Facebook Pages
 */
const getFacebookPages = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Ads Access Token not found. Please connect your Facebook account.'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'No active Facebook Ad Account found.'
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getFacebookPages();

    res.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('Error getting Facebook Pages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/pixels
 * جلب Facebook Pixels
 */
const getFacebookPixels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Ads Access Token not found. Please connect your Facebook account.'
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true }
    });

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: 'No active Facebook Ad Account found.'
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getFacebookPixels();

    res.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('Error getting Facebook Pixels:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  // Campaigns
  getCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  
  // 🚀 Full Ad Creation (Campaign + AdSet + Ad)
  createFullAd,
  
  // Ad Accounts
  getAdAccounts,
  saveAdAccount,
  getSavedAdAccounts,
  
  // AdSets
  getAdSets,
  createAdSet,
  deleteAdSet,
  
  // Ads
  getAds,
  createAd,
  updateAd,
  deleteAd,
  
  // Insights
  getAdInsights,
  syncAdInsights,
  getCampaignInsights,
  
  // Sync
  syncFromFacebook,
  
  // Upload
  uploadImage,
  uploadVideo,

  // v22.0: Custom Audiences
  getCustomAudiences,
  createCustomAudience,
  addUsersToAudience,
  createLookalikeAudience,

  // v22.0: A/B Testing
  createABTest,
  getABTestResults,

  // v22.0: Lead Generation
  createLeadForm,
  getLeads,

  // v22.0: Conversion API
  sendConversionEvent,

  // Facebook Pages & Pixels
  getFacebookPages,
  getFacebookPixels,

  // v22.0: Ad Scheduling
  updateAdSetSchedule,

  // v22.0: Dynamic Creative Optimization
  createDynamicCreative,

  // v22.0: Advantage+ Shopping
  createAdvantagePlusShoppingCampaign,

  // v22.0: Async Reports
  createAsyncReport,
  getAsyncReportStatus,
  getAsyncReportResults,

  // v22.0: Creative Formats
  createCollectionCreative,
  createStoriesReelsCreative,
  createInstantExperience,

  // v22.0: Automation Rules
  createAutomatedRule,
  getAutomatedRules,
  updateAutomatedRule,
  deleteAutomatedRule,

  // v22.0: Attribution
  updateAttributionSettings,

  // v22.0: Ad Set Management
  updateAdSet,
  updateFrequencyCap,

  // v22.0: Advanced Targeting
  searchTargetingOptions,
  getTargetingSuggestions,
  getReachEstimate,

  // v22.0: Ad Preview
  getAdPreview,
  getCreativePreview,

  // v22.0: Saved Audiences
  createSavedAudience,
  getSavedAudiences,
  deleteSavedAudience,

  // v22.0: Ad Recommendations
  getAdRecommendations: async (req, res) => {
    try {
      const { adId } = req.params;
      const companyId = req.user?.companyId;
      
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Facebook Ads Access Token not found.'
        });
      }

      const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true }
      });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: 'No active Facebook Ad Account found.'
        });
      }

      const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
      const result = await adsService.getAdRecommendations(adId);

      res.json(result);
    } catch (error) {
      console.error('Error getting Ad Recommendations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  applyAdRecommendation: async (req, res) => {
    try {
      const { adId } = req.params;
      const { recommendationId } = req.body;
      const companyId = req.user?.companyId;
      
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Facebook Ads Access Token not found.'
        });
      }

      const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true }
      });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: 'No active Facebook Ad Account found.'
        });
      }

      const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
      const result = await adsService.applyAdRecommendation(adId, recommendationId);

      res.json(result);
    } catch (error) {
      console.error('Error applying Ad Recommendation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // v22.0: Instagram Reels Ads
  createInstagramReelsCreative: async (req, res) => {
    try {
      const companyId = req.user?.companyId;
      const accessToken = await getCompanyAdsAccessToken(companyId);
      
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Facebook Ads Access Token not found.'
        });
      }

      const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true }
      });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: 'No active Facebook Ad Account found.'
        });
      }

      const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
      const result = await adsService.createInstagramReelsCreative(req.body);

      res.json(result);
    } catch (error) {
      console.error('Error creating Instagram Reels Creative:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // v22.0: WhatsApp Ads
  createWhatsAppAd: async (req, res) => {
    try {
      const companyId = req.user?.companyId;
      const accessToken = await getCompanyAdsAccessToken(companyId);
      
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Facebook Ads Access Token not found.'
        });
      }

      const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true }
      });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: 'No active Facebook Ad Account found.'
        });
      }

      const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
      const result = await adsService.createWhatsAppAd(req.body);

      res.json(result);
    } catch (error) {
      console.error('Error creating WhatsApp Ad:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // v22.0: Ad Quality Metrics
  getAdQualityMetrics: async (req, res) => {
    try {
      const { adId } = req.params;
      const companyId = req.user?.companyId;
      
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Facebook Ads Access Token not found.'
        });
      }

      const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true }
      });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: 'No active Facebook Ad Account found.'
        });
      }

      const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
      const result = await adsService.getAdQualityMetrics(adId);

      res.json(result);
    } catch (error) {
      console.error('Error getting Ad Quality Metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};



/**
 * Facebook Ad Test Controller
 * 
 * Controller للتعامل مع طلبات A/B Testing للإعلانات
 */

const FacebookAdTestService = require('../services/facebookAdTestService');
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
 * جلب أو إنشاء Ad Account للشركة
 */
async function getOrCreateAdAccount(companyId) {
  try {
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: {
        companyId,
        isActive: true
      }
    });

    return adAccount;
  } catch (error) {
    console.error('❌ Error getting Ad Account:', error);
    return null;
  }
}

/**
 * ============================================
 * Test Management Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/tests
 * جلب جميع A/B Tests
 */
exports.getTests = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const { status, testType } = req.query;

    const where = { companyId };
    if (status) where.status = status;
    if (testType) where.testType = testType;

    const tests = await getSharedPrismaClient().facebookAdTest.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        facebook_ad_test_variants: {
          include: {
            adSet: {
              select: {
                id: true,
                name: true
              }
            },
            ad: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            variantType: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: tests
    });
  } catch (error) {
    console.error('❌ Error fetching tests:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch tests'
    });
  }
};

/**
 * GET /api/v1/facebook-ads/tests/:id
 * جلب Test واحد
 */
exports.getTest = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        campaign: true,
        variantsList: {
          include: {
            adSet: true,
            ad: true
          },
          orderBy: {
            variantType: 'asc'
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('❌ Error fetching test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch test'
    });
  }
};

/**
 * POST /api/v1/facebook-ads/tests
 * إنشاء A/B Test جديد
 */
exports.createTest = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      name,
      description,
      testType,
      campaignId,
      variants,
      trafficSplit = 50,
      minimumResults = 100,
      autoPromote = false
    } = req.body;

    if (!name || !testType || !variants || variants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, testType, and at least 2 variants'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getOrCreateAdAccount(companyId);
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    // التحقق من Campaign
    if (campaignId) {
      const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
        where: {
          id: campaignId,
          companyId
        }
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
    }

    const testService = new FacebookAdTestService(accessToken, adAccount.accountId);

    // إنشاء Test في قاعدة البيانات
    const test = await getSharedPrismaClient().facebookAdTest.create({
      data: {
        companyId,
        name,
        description,
        testType,
        campaignId: campaignId || null,
        variants: JSON.stringify(variants),
        trafficSplit,
        minimumResults,
        autoPromote,
        status: 'DRAFT'
      },
      include: {
        campaign: true,
        variantsList: true
      }
    });

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('❌ Error creating test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create test'
    });
  }
};

/**
 * PUT /api/v1/facebook-ads/tests/:id
 * تحديث Test
 */
exports.updateTest = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    // لا يمكن تحديث Test إذا كان RUNNING
    if (test.status === 'RUNNING' && updateData.status && updateData.status !== 'RUNNING') {
      // Allow status change
    } else if (test.status === 'RUNNING') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update test while running. Please pause it first.'
      });
    }

    // تحديث البيانات
    if (updateData.variants) {
      updateData.variants = JSON.stringify(updateData.variants);
    }

    const updatedTest = await getSharedPrismaClient().facebookAdTest.update({
      where: { id },
      data: updateData,
      include: {
        campaign: true,
        variantsList: true
      }
    });

    res.json({
      success: true,
      data: updatedTest
    });
  } catch (error) {
    console.error('❌ Error updating test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update test'
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/tests/:id
 * حذف Test
 */
exports.deleteTest = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        variantsList: true
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    // لا يمكن حذف Test إذا كان RUNNING
    if (test.status === 'RUNNING') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete test while running. Please pause it first.'
      });
    }

    // حذف Test (Cascade سيحذف Variants)
    await getSharedPrismaClient().facebookAdTest.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete test'
    });
  }
};

/**
 * POST /api/v1/facebook-ads/tests/:id/start
 * بدء Test
 */
exports.startTest = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        variantsList: true,
        campaign: {
          include: {
            adAccount: true
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    if (test.status !== 'DRAFT' && test.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        error: `Cannot start test with status: ${test.status}`
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getOrCreateAdAccount(companyId);
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    const testService = new FacebookAdTestService(accessToken, adAccount.accountId);

    // إنشاء Variants إذا لم تكن موجودة
    if (test.variantsList.length === 0) {
      // TODO: إنشاء Variants بناءً على Test Type
      return res.status(400).json({
        success: false,
        error: 'No variants found. Please create variants first.'
      });
    }

    // بدء Test
    const startResult = await testService.startTest(id, test.variantsList);

    if (!startResult.success) {
      return res.status(400).json(startResult);
    }

    // تحديث حالة Test
    const updatedTest = await getSharedPrismaClient().facebookAdTest.update({
      where: { id },
      data: {
        status: 'RUNNING',
        startDate: new Date()
      },
      include: {
        campaign: true,
        variantsList: true
      }
    });

    res.json({
      success: true,
      data: updatedTest
    });
  } catch (error) {
    console.error('❌ Error starting test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start test'
    });
  }
};

/**
 * POST /api/v1/facebook-ads/tests/:id/pause
 * إيقاف Test
 */
exports.pauseTest = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        variantsList: true
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    if (test.status !== 'RUNNING') {
      return res.status(400).json({
        success: false,
        error: `Cannot pause test with status: ${test.status}`
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getOrCreateAdAccount(companyId);
    const testService = new FacebookAdTestService(accessToken, adAccount?.accountId);

    // إيقاف Test
    const pauseResult = await testService.pauseTest(id, test.variantsList);

    if (!pauseResult.success) {
      return res.status(400).json(pauseResult);
    }

    // تحديث حالة Test
    const updatedTest = await getSharedPrismaClient().facebookAdTest.update({
      where: { id },
      data: {
        status: 'PAUSED'
      },
      include: {
        campaign: true,
        variantsList: true
      }
    });

    res.json({
      success: true,
      data: updatedTest
    });
  } catch (error) {
    console.error('❌ Error pausing test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pause test'
    });
  }
};

/**
 * POST /api/v1/facebook-ads/tests/:id/analyze
 * تحليل نتائج Test
 */
exports.analyzeTest = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        variantsList: true
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    if (test.variantsList.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 variants required for analysis'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getOrCreateAdAccount(companyId);
    const testService = new FacebookAdTestService(accessToken, adAccount?.accountId);

    // تحليل النتائج
    const analysisResult = await testService.analyzeTestResults(test.variantsList);

    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    // تحديث Test بالنتائج
    const analysis = analysisResult.analysis;
    const winnerVariant = analysis.winner ? test.variantsList.find(v => v.id === analysis.winner.winnerId) : null;

    const updateData = {
      confidenceLevel: analysis.confidenceLevel,
      totalImpressions: analysis.variantA.impressions + analysis.variantB.impressions,
      totalClicks: analysis.variantA.clicks + analysis.variantB.clicks,
      totalConversions: analysis.variantA.conversions + analysis.variantB.conversions,
      totalSpend: analysis.variantA.spend + analysis.variantB.spend
    };

    if (winnerVariant) {
      updateData.winnerVariantId = winnerVariant.id;
      
      // تحديث Variants
      for (const variant of test.variantsList) {
        await getSharedPrismaClient().facebookAdTestVariant.update({
          where: { id: variant.id },
          data: {
            isWinner: variant.id === winnerVariant.id,
            pValue: analysis.pValue,
            confidenceLevel: analysis.confidenceLevel,
            impressions: variant.id === test.variantsList[0].id ? analysis.variantA.impressions : analysis.variantB.impressions,
            clicks: variant.id === test.variantsList[0].id ? analysis.variantA.clicks : analysis.variantB.clicks,
            conversions: variant.id === test.variantsList[0].id ? analysis.variantA.conversions : analysis.variantB.conversions,
            spend: variant.id === test.variantsList[0].id ? analysis.variantA.spend : analysis.variantB.spend,
            ctr: variant.id === test.variantsList[0].id ? analysis.variantA.ctr : analysis.variantB.ctr,
            cpc: variant.id === test.variantsList[0].id ? analysis.variantA.cpc : analysis.variantB.cpc,
            cpa: variant.id === test.variantsList[0].id ? analysis.variantA.cpa : analysis.variantB.cpa,
            roas: variant.id === test.variantsList[0].id ? analysis.variantA.roas : analysis.variantB.roas
          }
        });
      }
    }

    const updatedTest = await getSharedPrismaClient().facebookAdTest.update({
      where: { id },
      data: updateData,
      include: {
        campaign: true,
        variantsList: true
      }
    });

    res.json({
      success: true,
      data: {
        test: updatedTest,
        analysis: analysisResult.analysis
      }
    });
  } catch (error) {
    console.error('❌ Error analyzing test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze test'
    });
  }
};

/**
 * POST /api/v1/facebook-ads/tests/:id/promote-winner
 * تعزيز الفائز (Promote Winner)
 */
exports.promoteWinner = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        variantsList: true
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    if (!test.winnerVariantId) {
      return res.status(400).json({
        success: false,
        error: 'No winner determined yet. Please analyze test first.'
      });
    }

    const winnerVariant = test.variantsList.find(v => v.id === test.winnerVariantId);
    const loserVariants = test.variantsList.filter(v => v.id !== test.winnerVariantId);

    if (!winnerVariant) {
      return res.status(400).json({
        success: false,
        error: 'Winner variant not found'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const adAccount = await getOrCreateAdAccount(companyId);
    const testService = new FacebookAdTestService(accessToken, adAccount?.accountId);

    // تعزيز الفائز
    const promoteResult = await testService.promoteWinner(winnerVariant, loserVariants);

    if (!promoteResult.success) {
      return res.status(400).json(promoteResult);
    }

    // تحديث حالة Test
    const updatedTest = await getSharedPrismaClient().facebookAdTest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endDate: new Date()
      },
      include: {
        campaign: true,
        variantsList: true
      }
    });

    res.json({
      success: true,
      data: updatedTest,
      message: 'Winner promoted successfully'
    });
  } catch (error) {
    console.error('❌ Error promoting winner:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to promote winner'
    });
  }
};

/**
 * GET /api/v1/facebook-ads/tests/:id/results
 * جلب نتائج Test
 */
exports.getTestResults = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const test = await getSharedPrismaClient().facebookAdTest.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        variantsList: {
          orderBy: {
            variantType: 'asc'
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    res.json({
      success: true,
      data: {
        test,
        results: test.variantsList
      }
    });
  } catch (error) {
    console.error('❌ Error fetching test results:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch test results'
    });
  }
};

module.exports = exports;



/**
 * Facebook Ads Routes
 * 
 * Routes للتعامل مع Facebook Ads Management API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const facebookAdsController = require('../controller/facebookAdsController');
const facebookAudiencesController = require('../controller/facebookAudiencesController');
const facebookCatalogController = require('../controller/facebookCatalogController');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    
    if (file.fieldname === 'image' && allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else if (file.fieldname === 'video' && allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'), false);
    }
  }
});

/**
 * ============================================
 * Sync Routes
 * ============================================
 */

// POST /api/v1/facebook-ads/sync - مزامنة الحملات من Facebook
router.post('/sync', facebookAdsController.syncFromFacebook);

/**
 * ============================================
 * 🚀 Full Ad Creation (Campaign + AdSet + Ad)
 * ============================================
 */

// POST /api/v1/facebook-ads/full-ad - إنشاء إعلان كامل (Wizard)
router.post('/full-ad', facebookAdsController.createFullAd);

/**
 * ============================================
 * Campaign Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/campaigns - جلب جميع الحملات
router.get('/campaigns', facebookAdsController.getCampaigns);

// POST /api/v1/facebook-ads/campaigns - إنشاء حملة جديدة
router.post('/campaigns', facebookAdsController.createCampaign);

// GET /api/v1/facebook-ads/campaigns/:id - جلب تفاصيل حملة
router.get('/campaigns/:id', facebookAdsController.getCampaign);

// PUT /api/v1/facebook-ads/campaigns/:id - تحديث حملة
router.put('/campaigns/:id', facebookAdsController.updateCampaign);

// DELETE /api/v1/facebook-ads/campaigns/:id - حذف حملة
router.delete('/campaigns/:id', facebookAdsController.deleteCampaign);

// POST /api/v1/facebook-ads/campaigns/:id/pause - إيقاف حملة
router.post('/campaigns/:id/pause', facebookAdsController.pauseCampaign);

// POST /api/v1/facebook-ads/campaigns/:id/resume - استئناف حملة
router.post('/campaigns/:id/resume', facebookAdsController.resumeCampaign);

// GET /api/v1/facebook-ads/campaigns/:campaignId/insights - جلب إحصائيات حملة
router.get('/campaigns/:campaignId/insights', facebookAdsController.getCampaignInsights);

/**
 * ============================================
 * AdSet Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/campaigns/:campaignId/adsets - جلب AdSets في حملة
router.get('/campaigns/:campaignId/adsets', facebookAdsController.getAdSets);

// POST /api/v1/facebook-ads/campaigns/:campaignId/adsets - إنشاء AdSet
router.post('/campaigns/:campaignId/adsets', facebookAdsController.createAdSet);

// DELETE /api/v1/facebook-ads/adsets/:id - حذف AdSet
router.delete('/adsets/:id', facebookAdsController.deleteAdSet);

/**
 * ============================================
 * Ads Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/adsets/:adSetId/ads - جلب الإعلانات في AdSet
router.get('/adsets/:adSetId/ads', facebookAdsController.getAds);

// POST /api/v1/facebook-ads/adsets/:adSetId/ads - إنشاء إعلان جديد
router.post('/adsets/:adSetId/ads', facebookAdsController.createAd);

// PUT /api/v1/facebook-ads/ads/:id - تحديث إعلان
router.put('/ads/:id', facebookAdsController.updateAd);

// DELETE /api/v1/facebook-ads/ads/:id - حذف إعلان
router.delete('/ads/:id', facebookAdsController.deleteAd);

/**
 * ============================================
 * Upload Routes
 * ============================================
 */

// POST /api/v1/facebook-ads/upload-image - رفع صورة
router.post('/upload-image', upload.single('image'), facebookAdsController.uploadImage);

// POST /api/v1/facebook-ads/upload-video - رفع فيديو
router.post('/upload-video', upload.single('video'), facebookAdsController.uploadVideo);

/**
 * ============================================
 * Insights Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/ads/:adId/insights - جلب إحصائيات إعلان
router.get('/ads/:adId/insights', facebookAdsController.getAdInsights);

// POST /api/v1/facebook-ads/ads/:adId/sync-insights - مزامنة إحصائيات إعلان
router.post('/ads/:adId/sync-insights', facebookAdsController.syncAdInsights);

/**
 * ============================================
 * Ad Accounts Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/ad-accounts - جلب Ad Accounts من Facebook
router.get('/ad-accounts', facebookAdsController.getAdAccounts);

// GET /api/v1/facebook-ads/saved-ad-accounts - جلب Ad Accounts المحفوظة
router.get('/saved-ad-accounts', facebookAdsController.getSavedAdAccounts);

// POST /api/v1/facebook-ads/ad-accounts/save - حفظ Ad Account
router.post('/ad-accounts/save', facebookAdsController.saveAdAccount);

/**
 * ============================================
 * Audiences Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/audiences/custom - جلب جميع Custom Audiences
router.get('/audiences/custom', facebookAudiencesController.getCustomAudiences);

// POST /api/v1/facebook-ads/audiences/custom - إنشاء Custom Audience
router.post('/audiences/custom', facebookAudiencesController.createCustomAudience);

// GET /api/v1/facebook-ads/audiences/custom/:id - جلب معلومات Custom Audience
router.get('/audiences/custom/:id', facebookAudiencesController.getCustomAudience);

// DELETE /api/v1/facebook-ads/audiences/custom/:id - حذف Custom Audience
router.delete('/audiences/custom/:id', facebookAudiencesController.deleteCustomAudience);

// GET /api/v1/facebook-ads/audiences/lookalike - جلب جميع Lookalike Audiences
router.get('/audiences/lookalike', facebookAudiencesController.getLookalikeAudiences);

// POST /api/v1/facebook-ads/audiences/lookalike - إنشاء Lookalike Audience
router.post('/audiences/lookalike', facebookAudiencesController.createLookalikeAudience);

/**
 * ============================================
 * Facebook Pages & Pixels Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/pages - جلب Facebook Pages
router.get('/pages', facebookAdsController.getFacebookPages);

// GET /api/v1/facebook-ads/pixels - جلب Facebook Pixels
router.get('/pixels', facebookAdsController.getFacebookPixels);

/**
 * ============================================
 * Product Catalog Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/catalogs - جلب جميع Catalogs
router.get('/catalogs', facebookCatalogController.getCatalogs);

// POST /api/v1/facebook-ads/catalogs - إنشاء Catalog جديد
router.post('/catalogs', facebookCatalogController.createCatalog);

// GET /api/v1/facebook-ads/catalogs/:id - جلب Catalog واحد
router.get('/catalogs/:id', facebookCatalogController.getCatalog);

// DELETE /api/v1/facebook-ads/catalogs/:id - حذف Catalog
router.delete('/catalogs/:id', facebookCatalogController.deleteCatalog);

// POST /api/v1/facebook-ads/catalogs/:catalogId/sync-products - Sync Products مع Catalog
router.post('/catalogs/:catalogId/sync-products', facebookCatalogController.syncProducts);

// GET /api/v1/facebook-ads/catalogs/:catalogId/products - جلب المنتجات في Catalog
router.get('/catalogs/:catalogId/products', facebookCatalogController.getCatalogProducts);

/**
 * ============================================
 * Dynamic Ads Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/catalogs/:catalogId/product-sets - جلب Product Sets
router.get('/catalogs/:catalogId/product-sets', facebookCatalogController.getProductSets);

// POST /api/v1/facebook-ads/catalogs/:catalogId/product-sets - إنشاء Product Set
router.post('/catalogs/:catalogId/product-sets', facebookCatalogController.createProductSet);

// POST /api/v1/facebook-ads/adsets/:adSetId/dynamic-ads - إنشاء Dynamic Product Ad
router.post('/adsets/:adSetId/dynamic-ads', facebookCatalogController.createDynamicAd);

/**
 * ============================================
 * A/B Testing Routes
 * ============================================
 */

const facebookAdTestController = require('../controller/facebookAdTestController');

// GET /api/v1/facebook-ads/tests - جلب جميع Tests
router.get('/tests', facebookAdTestController.getTests);

// GET /api/v1/facebook-ads/tests/:id - جلب Test واحد
router.get('/tests/:id', facebookAdTestController.getTest);

// POST /api/v1/facebook-ads/tests - إنشاء Test جديد
router.post('/tests', facebookAdTestController.createTest);

// PUT /api/v1/facebook-ads/tests/:id - تحديث Test
router.put('/tests/:id', facebookAdTestController.updateTest);

// DELETE /api/v1/facebook-ads/tests/:id - حذف Test
router.delete('/tests/:id', facebookAdTestController.deleteTest);

// POST /api/v1/facebook-ads/tests/:id/start - بدء Test
router.post('/tests/:id/start', facebookAdTestController.startTest);

// POST /api/v1/facebook-ads/tests/:id/pause - إيقاف Test
router.post('/tests/:id/pause', facebookAdTestController.pauseTest);

// POST /api/v1/facebook-ads/tests/:id/analyze - تحليل نتائج Test
router.post('/tests/:id/analyze', facebookAdTestController.analyzeTest);

// POST /api/v1/facebook-ads/tests/:id/promote-winner - تعزيز الفائز
router.post('/tests/:id/promote-winner', facebookAdTestController.promoteWinner);

// GET /api/v1/facebook-ads/tests/:id/results - جلب نتائج Test
router.get('/tests/:id/results', facebookAdTestController.getTestResults);

/**
 * ============================================
 * v22.0 New Features Routes
 * ============================================
 */

// --- Custom Audiences (v22.0) ---
// GET /api/v1/facebook-ads/audiences - جلب Custom Audiences
router.get('/audiences', facebookAdsController.getCustomAudiences);

// POST /api/v1/facebook-ads/audiences - إنشاء Custom Audience
router.post('/audiences', facebookAdsController.createCustomAudience);

// POST /api/v1/facebook-ads/audiences/:id/users - إضافة مستخدمين لـ Audience
router.post('/audiences/:id/users', facebookAdsController.addUsersToAudience);

// POST /api/v1/facebook-ads/audiences/lookalike - إنشاء Lookalike Audience
router.post('/audiences/lookalike', facebookAdsController.createLookalikeAudience);

// --- A/B Testing (v22.0) ---
// POST /api/v1/facebook-ads/ab-tests - إنشاء A/B Test
router.post('/ab-tests', facebookAdsController.createABTest);

// GET /api/v1/facebook-ads/ab-tests/:id - جلب نتائج A/B Test
router.get('/ab-tests/:id', facebookAdsController.getABTestResults);

// --- Lead Generation (v22.0) ---
// POST /api/v1/facebook-ads/lead-forms - إنشاء Lead Form
router.post('/lead-forms', facebookAdsController.createLeadForm);

// GET /api/v1/facebook-ads/lead-forms/:id/leads - جلب Leads
router.get('/lead-forms/:id/leads', facebookAdsController.getLeads);

// --- Conversion API (v22.0) ---
// POST /api/v1/facebook-ads/conversions - إرسال Conversion Event
router.post('/conversions', facebookAdsController.sendConversionEvent);

// --- Ad Scheduling (v22.0) ---
// PUT /api/v1/facebook-ads/adsets/:id/schedule - تحديث جدولة Ad Set
router.put('/adsets/:id/schedule', facebookAdsController.updateAdSetSchedule);

// --- Dynamic Creative Optimization (v22.0) ---
// POST /api/v1/facebook-ads/creatives/dynamic - إنشاء Dynamic Creative
router.post('/creatives/dynamic', facebookAdsController.createDynamicCreative);

// --- Advantage+ Shopping (v22.0) ---
// POST /api/v1/facebook-ads/campaigns/advantage-plus-shopping - إنشاء Advantage+ Shopping Campaign
router.post('/campaigns/advantage-plus-shopping', facebookAdsController.createAdvantagePlusShoppingCampaign);

// --- Async Reports (v22.0) ---
// POST /api/v1/facebook-ads/reports/async - إنشاء Async Report
router.post('/reports/async', facebookAdsController.createAsyncReport);
// GET /api/v1/facebook-ads/reports/async/:reportRunId/status - جلب حالة Report
router.get('/reports/async/:reportRunId/status', facebookAdsController.getAsyncReportStatus);
// GET /api/v1/facebook-ads/reports/async/:reportRunId/results - جلب نتائج Report
router.get('/reports/async/:reportRunId/results', facebookAdsController.getAsyncReportResults);

// --- Creative Formats (v22.0) ---
// POST /api/v1/facebook-ads/creatives/collection - إنشاء Collection Creative
router.post('/creatives/collection', facebookAdsController.createCollectionCreative);
// POST /api/v1/facebook-ads/creatives/stories-reels - إنشاء Stories/Reels Creative
router.post('/creatives/stories-reels', facebookAdsController.createStoriesReelsCreative);
// POST /api/v1/facebook-ads/instant-experience - إنشاء Instant Experience
router.post('/instant-experience', facebookAdsController.createInstantExperience);

// --- Automation Rules (v22.0) ---
// GET /api/v1/facebook-ads/rules - جلب Automated Rules
router.get('/rules', facebookAdsController.getAutomatedRules);
// POST /api/v1/facebook-ads/rules - إنشاء Automated Rule
router.post('/rules', facebookAdsController.createAutomatedRule);
// PUT /api/v1/facebook-ads/rules/:id - تحديث Automated Rule
router.put('/rules/:id', facebookAdsController.updateAutomatedRule);
// DELETE /api/v1/facebook-ads/rules/:id - حذف Automated Rule
router.delete('/rules/:id', facebookAdsController.deleteAutomatedRule);

// --- Attribution Settings (v22.0) ---
// PUT /api/v1/facebook-ads/adsets/:adSetId/attribution - تحديث Attribution Settings
router.put('/adsets/:adSetId/attribution', facebookAdsController.updateAttributionSettings);

// --- Ad Set Management (v22.0) ---
// PUT /api/v1/facebook-ads/adsets/:id - تحديث Ad Set
router.put('/adsets/:id', facebookAdsController.updateAdSet);
// PUT /api/v1/facebook-ads/adsets/:id/frequency-cap - تحديث Frequency Cap
router.put('/adsets/:id/frequency-cap', facebookAdsController.updateFrequencyCap);

// --- Advanced Targeting (v22.0) ---
// GET /api/v1/facebook-ads/targeting/search - البحث عن Targeting Options
router.get('/targeting/search', facebookAdsController.searchTargetingOptions);
// POST /api/v1/facebook-ads/targeting/suggestions - جلب Targeting Suggestions
router.post('/targeting/suggestions', facebookAdsController.getTargetingSuggestions);
// POST /api/v1/facebook-ads/targeting/reach-estimate - جلب Reach Estimate
router.post('/targeting/reach-estimate', facebookAdsController.getReachEstimate);

// --- Ad Preview (v22.0) ---
// GET /api/v1/facebook-ads/ads/:adId/preview - جلب Ad Preview
router.get('/ads/:adId/preview', facebookAdsController.getAdPreview);
// GET /api/v1/facebook-ads/creatives/:creativeId/preview - جلب Creative Preview
router.get('/creatives/:creativeId/preview', facebookAdsController.getCreativePreview);

// --- Saved Audiences (v22.0) ---
// GET /api/v1/facebook-ads/saved-audiences - جلب Saved Audiences
router.get('/saved-audiences', facebookAdsController.getSavedAudiences);
// POST /api/v1/facebook-ads/saved-audiences - إنشاء Saved Audience
router.post('/saved-audiences', facebookAdsController.createSavedAudience);
// DELETE /api/v1/facebook-ads/saved-audiences/:id - حذف Saved Audience
router.delete('/saved-audiences/:id', facebookAdsController.deleteSavedAudience);

module.exports = router;


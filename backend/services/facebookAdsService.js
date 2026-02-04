/**
 * Facebook Ads Service - v22.0 (Latest)
 * 
 * Service للتعامل مع Facebook Marketing API v22.0
 * آخر تحديث: يناير 2025
 * 
 * المزايا المدعومة:
 * ═══════════════════════════════════════════════════
 * ✅ Simplified Campaign Objectives (OUTCOME_*)
 * ✅ Advantage+ Creative (Individual Enhancements)
 * ✅ Advantage+ Audience & Placements
 * ✅ Enhanced Location Targeting (-6.7% cost)
 * ✅ A/B Testing
 * ✅ Dynamic Creative Optimization
 * ✅ Custom & Lookalike Audiences
 * ✅ Lead Generation Forms
 * ✅ Conversion API (CAPI)
 * ✅ Attribution Settings
 * ✅ Scheduled Ads
 * ═══════════════════════════════════════════════════
 */

const axios = require('axios');
const FormData = require('form-data');
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// ═══════════════════════════════════════════════════
// Campaign Objectives Mapping (v22.0 Simplified)
// ═══════════════════════════════════════════════════
const OBJECTIVE_MAPPING = {
  // Legacy -> Simplified (v22.0)
  'LINK_CLICKS': 'OUTCOME_TRAFFIC',
  'CONVERSIONS': 'OUTCOME_SALES',
  'LEAD_GENERATION': 'OUTCOME_LEADS',
  'BRAND_AWARENESS': 'OUTCOME_AWARENESS',
  'REACH': 'OUTCOME_AWARENESS',
  'VIDEO_VIEWS': 'OUTCOME_ENGAGEMENT',
  'POST_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
  'PAGE_LIKES': 'OUTCOME_ENGAGEMENT',
  'APP_INSTALLS': 'OUTCOME_APP_PROMOTION',
  'MESSAGES': 'OUTCOME_ENGAGEMENT',
  'CATALOG_SALES': 'OUTCOME_SALES',
  'STORE_VISITS': 'OUTCOME_TRAFFIC',
  // Already simplified (pass through)
  'OUTCOME_AWARENESS': 'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS': 'OUTCOME_LEADS',
  'OUTCOME_APP_PROMOTION': 'OUTCOME_APP_PROMOTION',
  'OUTCOME_TRAFFIC': 'OUTCOME_TRAFFIC',
  'OUTCOME_SALES': 'OUTCOME_SALES'
};

class FacebookAdsService {
  constructor(accessToken, adAccountId = null) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.apiVersion = 'v22.0'; // ✅ Updated to latest version
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * الحصول على Account ID بالصيغة الصحيحة
   */
  getAccountId() {
    return this.adAccountId?.startsWith('act_') 
      ? this.adAccountId 
      : `act_${this.adAccountId}`;
  }

  /**
   * تحويل Objective القديم للجديد (v22.0 Simplified)
   */
  normalizeObjective(objective) {
    return OBJECTIVE_MAPPING[objective] || objective;
  }

  /**
   * ============================================
   * Campaign Methods
   * ============================================
   */

  /**
   * إنشاء حملة جديدة
   */
  async createCampaign(data) {
    try {
      const {
        name,
        objective,
        status = 'PAUSED',
        adAccountId = this.adAccountId,
        // الحقول الجديدة
        specialAdCategories = [],
        budgetOptimization = false,
        budgetType,
        budgetAmount,
        spendLimit,
        buyingType = 'AUCTION',
        bidStrategy
      } = data;

      if (!adAccountId) {
        throw new Error('Ad Account ID is required');
      }

      // ✅ v22.0: تحويل Objective للصيغة الجديدة (Simplified)
      const normalizedObjective = this.normalizeObjective(objective);

      // بناء بيانات الحملة (v22.0 format)
      const campaignData = {
        name,
        objective: normalizedObjective,
        status,
        special_ad_categories: specialAdCategories,
        buying_type: buyingType
      };

      // ✅ v22.0: Advantage+ Budget Optimization (CBO) - Enhanced
      if (budgetOptimization && budgetAmount) {
        campaignData.is_campaign_budget_optimization_on = true;
        
        // ✅ v22.0: Budget Rebalance Flag
        if (data.budgetRebalance !== undefined) {
          campaignData.budget_rebalance_flag = data.budgetRebalance;
        }
        
        // ✅ v22.0: Lifetime Budget Optimization
        if (data.lifetimeBudgetOptimization !== undefined) {
          campaignData.lifetime_budget_optimization = data.lifetimeBudgetOptimization;
        }
        
        // تحديد نوع الميزانية (Facebook يتوقع القيمة بالسنتات)
        if (budgetType === 'DAILY') {
          campaignData.daily_budget = Math.round(budgetAmount * 100);
        } else if (budgetType === 'LIFETIME') {
          campaignData.lifetime_budget = Math.round(budgetAmount * 100);
        }
      }

      // إضافة حد الإنفاق إذا كان موجود
      if (spendLimit) {
        campaignData.spend_cap = Math.round(spendLimit * 100);
      }

      // إضافة Bid Strategy إذا كان موجود
      if (bidStrategy) {
        campaignData.bid_strategy = bidStrategy;
      }

      console.log('📤 Creating Facebook campaign with data:', JSON.stringify(campaignData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${adAccountId}/campaigns`,
        campaignData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      console.log('✅ Facebook campaign created:', response.data.id);

      return {
        success: true,
        campaignId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.response?.data || error.message
      };
    }
  }

  /**
   * تحديث حملة
   */
  async updateCampaign(campaignId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${campaignId}`,
        data,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Facebook campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * حذف حملة
   */
  async deleteCampaign(campaignId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${campaignId}`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error deleting Facebook campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب معلومات حملة
   */
  async getCampaign(campaignId, fields = ['id', 'name', 'objective', 'status', 'created_time', 'updated_time']) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${campaignId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: fields.join(',')
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Facebook campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع الحملات
   */
  async getCampaigns(adAccountId = null, fields = ['id', 'name', 'objective', 'status']) {
    try {
      const accountId = adAccountId || this.adAccountId;
      
      if (!accountId) {
        throw new Error('Ad Account ID is required');
      }

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/campaigns`,
        {
          params: {
            access_token: this.accessToken,
            fields: fields.join(','),
            limit: 100
          }
        }
      );

      return {
        success: true,
        data: response.data.data || [],
        paging: response.data.paging || null
      };
    } catch (error) {
      console.error('❌ Error getting Facebook campaigns:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * AdSet Methods
   * ============================================
   */

  /**
   * إنشاء AdSet جديد
   */
  async createAdSet(campaignId, data) {
    try {
      const {
        name,
        status = 'PAUSED',
        targeting,
        budgetType,
        budgetAmount,
        optimizationGoal,
        billingEvent,
        placementType,
        placements,
        performanceGoal,
        conversionEvent,
        conversionLocation,
        attributionWindow,
        pixelId,
        bidStrategy,
        bidValue
      } = data;

      // بناء بيانات الاستهداف
      const targetingSpec = this.buildTargetingSpec(targeting);

      // استخدام Ad Account ID الصحيح (act_ prefix)
      const accountId = this.adAccountId?.startsWith('act_') 
        ? this.adAccountId 
        : `act_${this.adAccountId}`;

      // بناء بيانات الميزانية (فقط إذا لم يكن CBO مفعل)
      let budgetData = {};
      if (budgetType && budgetAmount) {
        budgetData = budgetType === 'DAILY' 
          ? { daily_budget: Math.round(budgetAmount * 100) } // Facebook expects cents
          : { lifetime_budget: Math.round(budgetAmount * 100) };
      }

      // تحديد optimization_goal الصحيح بناءً على نوع الحملة
      let finalOptimizationGoal = optimizationGoal || 'LINK_CLICKS';
      let promotedObject = {};

      // للمبيعات والـ Leads - استخدام OFFSITE_CONVERSIONS
      if (conversionEvent && pixelId) {
        finalOptimizationGoal = 'OFFSITE_CONVERSIONS';
        promotedObject = {
          pixel_id: pixelId,
          custom_event_type: conversionEvent // PURCHASE, ADD_TO_CART, etc.
        };
      }

      // بناء Attribution Spec
      const attributionSpec = this.buildAttributionSpec(attributionWindow);

      // بناء Bid Strategy
      const bidData = this.buildBidStrategy(bidStrategy, bidValue);

      const adSetData = {
        name,
        status,
        campaign_id: campaignId,
        ...budgetData,
        billing_event: billingEvent || 'IMPRESSIONS',
        optimization_goal: finalOptimizationGoal,
        targeting: targetingSpec,
        ...bidData
      };

      // إضافة promoted_object للتحويلات
      if (Object.keys(promotedObject).length > 0) {
        adSetData.promoted_object = promotedObject;
      }

      // إضافة Attribution Spec
      if (attributionSpec && attributionSpec.length > 0) {
        adSetData.attribution_spec = attributionSpec;
      }

      // ✅ v22.0: Advantage+ Placements (Automatic) or Manual Placements
      if (placementType === 'AUTOMATIC' || !placementType) {
        // Enable Advantage+ Placements (default in v22.0)
        adSetData.targeting = {
          ...adSetData.targeting,
          targeting_automation: {
            ...(adSetData.targeting.targeting_automation || {}),
            advantage_placement: 1
          }
        };
      } else if (placementType === 'MANUAL' && placements && placements.length > 0) {
        // Manual Placements
        adSetData.targeting = {
          ...adSetData.targeting,
          ...this.buildPlacementsSpec(placements)
        };
      }

      console.log('📤 Creating Facebook AdSet with data:', JSON.stringify(adSetData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adsets`,
        adSetData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      console.log('✅ Facebook AdSet created:', response.data.id);

      return {
        success: true,
        adSetId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook AdSet:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.response?.data || error.message
      };
    }
  }

  /**
   * بناء Placements Spec
   */
  buildPlacementsSpec(placements) {
    const placementSpec = {
      publisher_platforms: [],
      facebook_positions: [],
      instagram_positions: [],
      messenger_positions: [],
      audience_network_positions: []
    };

    const platformMap = {
      'FACEBOOK_FEED': { platform: 'facebook', position: 'feed' },
      'FACEBOOK_STORIES': { platform: 'facebook', position: 'story' },
      'FACEBOOK_REELS': { platform: 'facebook', position: 'facebook_reels' },
      'FACEBOOK_MARKETPLACE': { platform: 'facebook', position: 'marketplace' },
      'FACEBOOK_RIGHT_COLUMN': { platform: 'facebook', position: 'right_hand_column' },
      'INSTAGRAM_FEED': { platform: 'instagram', position: 'stream' },
      'INSTAGRAM_STORIES': { platform: 'instagram', position: 'story' },
      'INSTAGRAM_REELS': { platform: 'instagram', position: 'reels' },
      'INSTAGRAM_EXPLORE': { platform: 'instagram', position: 'explore' },
      'MESSENGER_INBOX': { platform: 'messenger', position: 'messenger_home' },
      'MESSENGER_STORIES': { platform: 'messenger', position: 'story' },
      'AUDIENCE_NETWORK': { platform: 'audience_network', position: 'classic' }
    };

    placements.forEach(placement => {
      const mapping = platformMap[placement];
      if (mapping) {
        if (!placementSpec.publisher_platforms.includes(mapping.platform)) {
          placementSpec.publisher_platforms.push(mapping.platform);
        }
        
        const positionKey = `${mapping.platform}_positions`;
        if (placementSpec[positionKey] && !placementSpec[positionKey].includes(mapping.position)) {
          placementSpec[positionKey].push(mapping.position);
        }
      }
    });

    // إزالة المصفوفات الفارغة
    Object.keys(placementSpec).forEach(key => {
      if (Array.isArray(placementSpec[key]) && placementSpec[key].length === 0) {
        delete placementSpec[key];
      }
    });

    return placementSpec;
  }

  /**
   * بناء Targeting Spec (v22.0 Enhanced)
   */
  buildTargetingSpec(targeting) {
    if (!targeting) {
      return {};
    }

    const spec = {};

    // Age targeting
    if (targeting.ageMin) spec.age_min = targeting.ageMin;
    if (targeting.ageMax) spec.age_max = targeting.ageMax;
    
    // Gender targeting (1 = male, 2 = female)
    if (targeting.genders && targeting.genders.length > 0) {
      spec.genders = targeting.genders.map(g => {
        if (g === 'male' || g === '1') return 1;
        if (g === 'female' || g === '2') return 2;
        return parseInt(g) || g;
      });
    }
    
    // ✅ v22.0: Enhanced Location Targeting (-6.7% cost improvement)
    if (targeting.locations && targeting.locations.length > 0) {
      spec.geo_locations = {
        countries: targeting.locations,
        location_types: ['home', 'recent'] // v22.0: تحسين الاستهداف الجغرافي
      };
    }

    // City targeting (v22.0)
    if (targeting.cities && targeting.cities.length > 0) {
      spec.geo_locations = spec.geo_locations || {};
      spec.geo_locations.cities = targeting.cities.map(city => ({
        key: city.key || city,
        radius: city.radius || 25,
        distance_unit: city.distance_unit || 'kilometer'
      }));
    }

    // Region targeting (v22.0)
    if (targeting.regions && targeting.regions.length > 0) {
      spec.geo_locations = spec.geo_locations || {};
      spec.geo_locations.regions = targeting.regions.map(r => ({ key: r }));
    }

    // Interest targeting
    if (targeting.interests && targeting.interests.length > 0) {
      spec.interests = targeting.interests.map(i => 
        typeof i === 'object' ? i : { id: i, name: i }
      );
    }
    
    // Behavior targeting
    if (targeting.behaviors && targeting.behaviors.length > 0) {
      spec.behaviors = targeting.behaviors.map(b => 
        typeof b === 'object' ? b : { id: b }
      );
    }
    
    // Custom Audiences
    if (targeting.customAudiences && targeting.customAudiences.length > 0) {
      spec.custom_audiences = targeting.customAudiences.map(aud => ({ id: aud }));
    }

    // Lookalike Audiences
    if (targeting.lookalikeAudiences && targeting.lookalikeAudiences.length > 0) {
      spec.custom_audiences = [
        ...(spec.custom_audiences || []),
        ...targeting.lookalikeAudiences.map(aud => ({ id: aud }))
      ];
    }

    // Excluded Audiences
    if (targeting.excludedAudiences && targeting.excludedAudiences.length > 0) {
      spec.excluded_custom_audiences = targeting.excludedAudiences.map(aud => ({ id: aud }));
    }

    // ✅ v22.0: Advantage+ Audience (Targeting Automation) - Enhanced
    if (targeting.advantageAudience !== false) {
      // Default to enabled if not explicitly disabled
      spec.targeting_automation = {
        advantage_audience: targeting.advantageAudience === true ? 1 : (targeting.advantageAudience || 1)
      };
      
      // ✅ v22.0: Audience Expansion Settings
      if (targeting.audienceExpansion) {
        spec.targeting_automation.audience_expansion = targeting.audienceExpansion;
      }
      
      // ✅ v22.0: Lookalike Expansion
      if (targeting.lookalikeExpansion !== undefined) {
        spec.targeting_automation.lookalike_expansion = targeting.lookalikeExpansion;
      }
    }

    // ✅ v22.0: Detailed Targeting Expansion - Enhanced
    if (targeting.targetingExpansion) {
      spec.targeting_optimization = targeting.targetingExpansion === true 
        ? 'expansion_all' 
        : targeting.targetingExpansion;
    }

    // Flexible targeting (AND/OR logic)
    if (targeting.flexibleSpec && targeting.flexibleSpec.length > 0) {
      spec.flexible_spec = targeting.flexibleSpec;
    }

    // Exclusions
    if (targeting.exclusions) {
      spec.exclusions = targeting.exclusions;
    }

    return spec;
  }

  /**
   * ============================================
   * Ad Methods
   * ============================================
   */

  /**
   * إنشاء إعلان جديد
   */
  async createAd(adSetId, creativeData) {
    try {
      const {
        name,
        status = 'PAUSED',
        creativeType = 'SINGLE_IMAGE',
        primaryText,
        headline,
        description,
        callToAction,
        imageHash,
        videoId,
        linkUrl
      } = creativeData;

      // إنشاء Creative أولاً
      const creativeResult = await this.createCreative({
        creativeType,
        primaryText,
        headline,
        description,
        callToAction,
        imageHash,
        videoId,
        linkUrl
      });

      if (!creativeResult.success) {
        return creativeResult;
      }

      // إنشاء Ad مع ربطه بالـ Creative
      const adData = {
        name,
        status,
        adset_id: adSetId,
        creative: {
          creative_id: creativeResult.creativeId
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/ads`,
        adData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        adId: response.data.id,
        creativeId: creativeResult.creativeId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook Ad:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إنشاء Creative (v22.0 with Individual Enhancements)
   */
  async createCreative(data) {
    try {
      const {
        creativeType,
        primaryText,
        headline,
        description,
        callToAction,
        imageHash,
        videoId,
        linkUrl,
        // ✅ v22.0: Individual Advantage+ Creative Enhancements
        advantageCreative = false,
        textGeneration = false,
        imageEnhancement = false,
        musicEnhancement = false,
        imageTemplates = false,
        videoHighlight = false,
        textOptimizations = false
      } = data;

      const creativeData = {
        object_story_spec: {
          page_id: data.pageId, // يجب أن يكون موجود
          link_data: {
            link: linkUrl,
            message: primaryText,
            name: headline,
            description: description,
            call_to_action: {
              type: callToAction || 'LEARN_MORE'
            }
          }
        }
      };

      // إضافة الصورة أو الفيديو
      if (creativeType === 'SINGLE_IMAGE' && imageHash) {
        creativeData.object_story_spec.link_data.image_hash = imageHash;
      } else if (creativeType === 'SINGLE_VIDEO' && videoId) {
        creativeData.object_story_spec.video_id = videoId;
      }

      // ✅ v22.0: Individual Advantage+ Creative Enhancements
      // في v22.0، كل Enhancement منفصل (بدلاً من standard_enhancements كحزمة واحدة)
      if (advantageCreative) {
        creativeData.degrees_of_freedom_spec = {
          creative_features_spec: {}
        };

        // Text Generation (AI-generated ad copy variations)
        if (textGeneration) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.text_generation = {
            enroll_status: 'OPT_IN'
          };
        }

        // Text Optimizations (optimize existing text)
        if (textOptimizations) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.text_optimizations = {
            enroll_status: 'OPT_IN'
          };
        }

        // Image Enhancement (crop, filter, brightness)
        if (imageEnhancement && imageHash) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.image_enhancement = {
            enroll_status: 'OPT_IN'
          };
        }

        // Image Templates (add overlays, frames)
        if (imageTemplates && imageHash) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.image_templates = {
            enroll_status: 'OPT_IN'
          };
        }

        // Video Highlight (auto-trim to best moments)
        if (videoHighlight && videoId) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.video_highlight = {
            enroll_status: 'OPT_IN'
          };
        }

        // Music Enhancement (add background music)
        if (musicEnhancement && videoId) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.music = {
            enroll_status: 'OPT_IN'
          };
        }
      }

      console.log('📤 Creating Creative (v22.0):', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/adcreatives`,
        creativeData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      console.log('✅ Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * 🚀 CREATE FULL AD (Campaign + AdSet + Ad)
   * ============================================
   * هذه الدالة تنشئ إعلان كامل بخطوة واحدة
   * تقوم بإنشاء: Campaign → AdSet → Creative → Ad
   */
  async createFullAd(data) {
    try {
      console.log('🚀 Starting Full Ad Creation...');
      
      const {
        // Campaign Data
        campaignName,
        objective,
        specialAdCategories = [],
        buyingType = 'AUCTION',
        
        // Ad Set Level - الميزات الجديدة
        performanceGoal,
        conversionEvent,
        conversionLocation,
        attributionWindow,
        dynamicCreative = false,
        pixelId,
        
        // Budget Data
        budgetOptimization = false, // CBO
        budgetType = 'DAILY',
        budgetAmount,
        bidStrategy,
        bidValue,
        frequencyCap,
        frequencyCapInterval,
        spendLimit,
        
        // Schedule Data
        startTime,
        endTime,
        
        // AdSet Data
        adSetName,
        optimizationGoal = 'LINK_CLICKS',
        billingEvent = 'IMPRESSIONS',
        
        // Targeting Data
        targeting = {},
        
        // Placements Data
        placementType = 'AUTOMATIC',
        placements = [],
        
        // Ad Creative Data
        adName,
        pageId,
        creativeType = 'SINGLE_IMAGE',
        primaryText,
        headline,
        description,
        callToAction = 'LEARN_MORE',
        linkUrl,
        displayLink,
        urlParameters,
        imageUrl,
        imageHash,
        videoUrl,
        videoId,
        carouselCards = [],
        textVariations = [],
        headlineVariations = [],
        leadFormId,
        
        // Advantage+ Creative Enhancements (v22.0)
        advantageCreative = false,
        textGeneration = false,
        imageEnhancement = false,
        musicEnhancement = false,
        imageTemplates = false,
        videoHighlight = false,
        textOptimizations = false,
        
        // Status
        status = 'PAUSED'
      } = data;

      const results = {
        campaign: null,
        adSet: null,
        creative: null,
        ad: null,
        errors: []
      };

      // ========================================
      // Step 1: Create Campaign
      // ========================================
      console.log('📦 Step 1: Creating Campaign...');
      
      const campaignData = {
        name: campaignName,
        objective,
        status,
        specialAdCategories,
        buyingType,
        bidStrategy
      };

      // إذا كان CBO مفعل، أضف الميزانية على مستوى الحملة
      if (budgetOptimization) {
        campaignData.budgetOptimization = true;
        campaignData.budgetType = budgetType;
        campaignData.budgetAmount = budgetAmount;
        if (spendLimit) campaignData.spendLimit = spendLimit;
      }

      const campaignResult = await this.createCampaign(campaignData);
      
      if (!campaignResult.success) {
        console.error('❌ Campaign creation failed:', campaignResult.error);
        return {
          success: false,
          step: 'campaign',
          error: campaignResult.error,
          results
        };
      }
      
      results.campaign = campaignResult;
      console.log('✅ Campaign created:', campaignResult.campaignId);

      // ========================================
      // Step 2: Create AdSet
      // ========================================
      console.log('📦 Step 2: Creating AdSet...');
      
      const adSetData = {
        name: adSetName || `${campaignName} - AdSet`,
        status,
        targeting,
        optimizationGoal,
        billingEvent,
        placementType,
        placements,
        
        // الميزات الجديدة
        performanceGoal,
        conversionEvent,
        conversionLocation,
        attributionWindow,
        pixelId,
        bidStrategy,
        bidValue,
        frequencyCap,
        frequencyCapInterval
      };

      // إذا لم يكن CBO مفعل، أضف الميزانية على مستوى AdSet
      if (!budgetOptimization) {
        adSetData.budgetType = budgetType;
        adSetData.budgetAmount = budgetAmount;
      }

      // إضافة الجدولة
      if (startTime) adSetData.startTime = startTime;
      if (endTime) adSetData.endTime = endTime;

      const adSetResult = await this.createAdSet(campaignResult.campaignId, adSetData);
      
      if (!adSetResult.success) {
        console.error('❌ AdSet creation failed:', adSetResult.error);
        results.errors.push({ step: 'adSet', error: adSetResult.error });
        
        // محاولة حذف الحملة التي تم إنشاؤها
        console.log('🗑️ Rolling back: Deleting campaign...');
        await this.deleteCampaign(campaignResult.campaignId);
        
        return {
          success: false,
          step: 'adSet',
          error: adSetResult.error,
          results
        };
      }
      
      results.adSet = adSetResult;
      console.log('✅ AdSet created:', adSetResult.adSetId);

      // ========================================
      // Step 3: Upload Media (if needed)
      // ========================================
      let finalImageHash = imageHash;
      let finalVideoId = videoId;

      if (creativeType === 'SINGLE_IMAGE' && imageUrl && !imageHash) {
        console.log('📦 Step 3a: Uploading Image...');
        const uploadResult = await this.uploadImage(imageUrl);
        if (uploadResult.success) {
          finalImageHash = uploadResult.hash;
          console.log('✅ Image uploaded:', finalImageHash);
        } else {
          console.warn('⚠️ Image upload failed, continuing without image');
          results.errors.push({ step: 'imageUpload', error: uploadResult.error });
        }
      }

      if (creativeType === 'SINGLE_VIDEO' && videoUrl && !videoId) {
        console.log('📦 Step 3b: Uploading Video...');
        const uploadResult = await this.uploadVideo(videoUrl);
        if (uploadResult.success) {
          finalVideoId = uploadResult.videoId;
          console.log('✅ Video uploaded:', finalVideoId);
        } else {
          console.warn('⚠️ Video upload failed, continuing without video');
          results.errors.push({ step: 'videoUpload', error: uploadResult.error });
        }
      }

      // ========================================
      // Step 4: Create Ad (includes Creative)
      // ========================================
      console.log('📦 Step 4: Creating Ad...');
      
      const adCreativeData = {
        name: adName || `${campaignName} - Ad`,
        status,
        pageId,
        creativeType,
        primaryText,
        headline,
        description,
        callToAction,
        linkUrl,
        imageHash: finalImageHash,
        videoId: finalVideoId,
        // Advantage+ Creative
        advantageCreative,
        textGeneration,
        imageEnhancement,
        musicEnhancement,
        imageTemplates,
        videoHighlight,
        textOptimizations
      };

      const adResult = await this.createAd(adSetResult.adSetId, adCreativeData);
      
      if (!adResult.success) {
        console.error('❌ Ad creation failed:', adResult.error);
        results.errors.push({ step: 'ad', error: adResult.error });
        
        // لا نحذف Campaign و AdSet لأنهم قد يكونوا مفيدين
        // المستخدم يمكنه إضافة Ad لاحقاً
        
        return {
          success: false,
          step: 'ad',
          error: adResult.error,
          results,
          partialSuccess: true, // Campaign و AdSet تم إنشاؤهم بنجاح
          message: 'Campaign and AdSet created successfully, but Ad creation failed. You can add an Ad manually.'
        };
      }
      
      results.ad = adResult;
      results.creative = { creativeId: adResult.creativeId };
      console.log('✅ Ad created:', adResult.adId);

      // ========================================
      // Success!
      // ========================================
      console.log('🎉 Full Ad Creation Complete!');
      
      return {
        success: true,
        campaignId: campaignResult.campaignId,
        adSetId: adSetResult.adSetId,
        adId: adResult.adId,
        creativeId: adResult.creativeId,
        results,
        message: 'Full ad created successfully!'
      };

    } catch (error) {
      console.error('❌ Error in createFullAd:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        step: 'unknown'
      };
    }
  }

  /**
   * ============================================
   * Creative Media Upload Methods
   * ============================================
   */

  /**
   * رفع صورة إلى Facebook
   */
  async uploadImage(imageUrl) {
    try {
      // أولاً: تحميل الصورة من URL
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      // رفع الصورة إلى Facebook
      const formData = new FormData();
      const buffer = Buffer.from(imageResponse.data);
      formData.append('bytes', buffer, { filename: 'image.jpg' });
      formData.append('access_token', this.accessToken);

      const uploadResponse = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/adimages`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );

      const hash = uploadResponse.data.images?.[0]?.hash;
      
      return {
        success: true,
        hash: hash,
        data: uploadResponse.data
      };
    } catch (error) {
      console.error('❌ Error uploading image to Facebook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * رفع فيديو إلى Facebook
   */
  async uploadVideo(videoUrl, videoData = {}) {
    try {
      // أولاً: تحميل الفيديو من URL
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'stream'
      });

      // رفع الفيديو إلى Facebook
      const accountId = this.adAccountId?.startsWith('act_') 
        ? this.adAccountId 
        : `act_${this.adAccountId}`;

      const formData = new FormData();
      formData.append('name', videoData.name || 'Video Ad');
      formData.append('video_file_chunk', videoResponse.data);
      formData.append('access_token', this.accessToken);

      if (videoData.description) {
        formData.append('description', videoData.description);
      }

      const uploadResponse = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/advideos`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return {
        success: true,
        videoId: uploadResponse.data.id,
        data: uploadResponse.data
      };
    } catch (error) {
      console.error('❌ Error uploading video to Facebook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * رفع عدة صور (لـ Carousel Ads)
   */
  async uploadMultipleImages(imageUrls) {
    try {
      const uploadPromises = imageUrls.map(url => this.uploadImage(url));
      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: failed.length === 0,
        hashes: successful.map(r => r.hash),
        failed: failed.length,
        results: results
      };
    } catch (error) {
      console.error('❌ Error uploading multiple images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * إنشاء Carousel Creative
   */
  async createCarouselCreative(data) {
    try {
      const {
        pageId,
        name,
        images, // Array of {imageHash, link}
        primaryText,
        headline,
        description,
        callToAction,
        linkUrl
      } = data;

      if (!pageId || !images || images.length === 0) {
        throw new Error('Page ID and images are required');
      }

      const creativeData = {
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: linkUrl,
            message: primaryText,
            name: headline,
            description: description,
            call_to_action: {
              type: callToAction || 'LEARN_MORE'
            },
            child_attachments: images.map(img => ({
              link: img.link || linkUrl,
              image_hash: img.imageHash,
              name: img.headline || headline,
              description: img.description || description
            }))
          }
        }
      };

      const accountId = this.adAccountId?.startsWith('act_') 
        ? this.adAccountId 
        : `act_${this.adAccountId}`;

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating carousel creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Insights Methods
   * ============================================
   */

  /**
   * جلب إحصائيات إعلان
   */
  async getInsights(adId, dateRange = null, breakdowns = []) {
    try {
      const params = {
        access_token: this.accessToken,
        fields: [
          'impressions',
          'clicks',
          'ctr',
          'cpc',
          'spend',
          'reach',
          'frequency',
          'actions',
          'cost_per_action_type',
          'link_clicks',
          'cost_per_link_click',
          'landing_page_views',
          'purchases',
          'purchase_value',
          'roas'
        ].join(',')
      };

      if (dateRange) {
        params.time_range = JSON.stringify({
          since: dateRange.since,
          until: dateRange.until
        });
      }

      // إضافة Breakdowns إذا كانت موجودة
      if (breakdowns && breakdowns.length > 0) {
        params.breakdowns = breakdowns.join(',');
      }

      const response = await axios.get(
        `${this.baseUrl}/${adId}/insights`,
        { params }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook insights:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب Insights مع Breakdown مفصل
   */
  async getInsightsWithBreakdown(adId, breakdownType, dateRange = null) {
    try {
      // Breakdown types: age, gender, placement, device_type, country, etc.
      const breakdowns = [breakdownType];
      return await this.getInsights(adId, dateRange, breakdowns);
    } catch (error) {
      console.error('❌ Error getting insights with breakdown:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ============================================
   * Helper Methods
   * ============================================
   */

  /**
   * التحقق من صحة Access Token
   */
  async validateAccessToken() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        userId: response.data.id,
        name: response.data.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب Ad Accounts المتاحة
   */
  async getAdAccounts() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/adaccounts`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,account_id,currency,timezone_name,business,funding_source_details,amount_spent',
            limit: 100
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook Ad Accounts:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0 New Features: Custom Audiences
   * ============================================
   */

  /**
   * إنشاء Custom Audience من قائمة عملاء
   */
  async createCustomAudience(data) {
    try {
      const {
        name,
        description,
        subtype = 'CUSTOM', // CUSTOM, WEBSITE, APP, OFFLINE_CONVERSION, ENGAGEMENT
        customerFileSource = 'USER_PROVIDED_ONLY'
      } = data;

      const accountId = this.getAccountId();

      const audienceData = {
        name,
        description,
        subtype,
        customer_file_source: customerFileSource
      };

      console.log('📤 Creating Custom Audience:', JSON.stringify(audienceData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        audienceData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Custom Audience created:', response.data.id);

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Custom Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إضافة مستخدمين لـ Custom Audience
   */
  async addUsersToCustomAudience(audienceId, users) {
    try {
      // users: array of { email, phone, firstName, lastName, etc. }
      const schema = ['EMAIL', 'PHONE', 'FN', 'LN'];
      const data = users.map(user => [
        user.email ? this.hashValue(user.email.toLowerCase()) : '',
        user.phone ? this.hashValue(user.phone) : '',
        user.firstName ? this.hashValue(user.firstName.toLowerCase()) : '',
        user.lastName ? this.hashValue(user.lastName.toLowerCase()) : ''
      ]);

      const payload = {
        payload: {
          schema,
          data
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/${audienceId}/users`,
        payload,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error adding users to Custom Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إنشاء Lookalike Audience
   */
  async createLookalikeAudience(data) {
    try {
      const {
        name,
        sourceAudienceId, // Custom Audience ID to base lookalike on
        country, // Target country code
        ratio = 0.01 // 1% = 0.01, 10% = 0.10
      } = data;

      const accountId = this.getAccountId();

      const audienceData = {
        name,
        subtype: 'LOOKALIKE',
        origin_audience_id: sourceAudienceId,
        lookalike_spec: JSON.stringify({
          type: 'similarity',
          country,
          ratio
        })
      };

      console.log('📤 Creating Lookalike Audience:', JSON.stringify(audienceData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        audienceData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Lookalike Audience created:', response.data.id);

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Lookalike Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Custom Audiences
   */
  async getCustomAudiences() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,subtype,approximate_count,delivery_status,operation_status',
            limit: 100
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Custom Audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0 New Features: A/B Testing
   * ============================================
   */

  /**
   * إنشاء A/B Test (Ad Study)
   */
  async createABTest(data) {
    try {
      const {
        name,
        description,
        startTime,
        endTime,
        type = 'SPLIT_TEST', // SPLIT_TEST, HOLDOUT
        objectiveType = 'CONVERSIONS',
        cells // Array of { name, campaignId } or { name, adSetId }
      } = data;

      const accountId = this.getAccountId();

      const studyData = {
        name,
        description,
        start_time: startTime,
        end_time: endTime,
        type,
        cells: cells.map(cell => ({
          name: cell.name,
          treatment_percentage: cell.percentage || Math.floor(100 / cells.length),
          adsets: cell.adSetId ? [cell.adSetId] : undefined,
          campaigns: cell.campaignId ? [cell.campaignId] : undefined
        }))
      };

      console.log('📤 Creating A/B Test:', JSON.stringify(studyData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/ad_studies`,
        studyData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ A/B Test created:', response.data.id);

      return {
        success: true,
        studyId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating A/B Test:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب نتائج A/B Test
   */
  async getABTestResults(studyId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${studyId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,start_time,end_time,type,cells{id,name,treatment_percentage,adsets,campaigns},results'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting A/B Test results:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0 New Features: Lead Generation
   * ============================================
   */

  /**
   * إنشاء Lead Form
   */
  async createLeadForm(pageId, data) {
    try {
      const {
        name,
        questions, // Array of { type, key, label }
        privacyPolicyUrl,
        thankYouPage = {},
        followUpActionUrl
      } = data;

      const formData = {
        name,
        questions: questions.map(q => ({
          type: q.type || 'CUSTOM',
          key: q.key,
          label: q.label
        })),
        privacy_policy: {
          url: privacyPolicyUrl
        },
        thank_you_page: {
          title: thankYouPage.title || 'شكراً لك!',
          body: thankYouPage.body || 'سنتواصل معك قريباً',
          button_text: thankYouPage.buttonText || 'زيارة الموقع',
          button_type: thankYouPage.buttonType || 'VIEW_WEBSITE',
          website_url: thankYouPage.websiteUrl || followUpActionUrl
        }
      };

      console.log('📤 Creating Lead Form:', JSON.stringify(formData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${pageId}/leadgen_forms`,
        formData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Lead Form created:', response.data.id);

      return {
        success: true,
        formId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Lead Form:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Leads من Form
   */
  async getLeads(formId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${formId}/leads`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name',
            limit: 100
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Leads:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0 New Features: Conversion API (CAPI)
   * ============================================
   */

  /**
   * إرسال Conversion Event عبر CAPI
   */
  async sendConversionEvent(pixelId, eventData) {
    try {
      const {
        eventName, // Purchase, Lead, AddToCart, etc.
        eventTime = Math.floor(Date.now() / 1000),
        eventSourceUrl,
        userData = {},
        customData = {},
        actionSource = 'website' // website, app, phone_call, chat, etc.
      } = eventData;

      const event = {
        event_name: eventName,
        event_time: eventTime,
        event_source_url: eventSourceUrl,
        action_source: actionSource,
        user_data: {
          em: userData.email ? [this.hashValue(userData.email.toLowerCase())] : undefined,
          ph: userData.phone ? [this.hashValue(userData.phone)] : undefined,
          fn: userData.firstName ? [this.hashValue(userData.firstName.toLowerCase())] : undefined,
          ln: userData.lastName ? [this.hashValue(userData.lastName.toLowerCase())] : undefined,
          ct: userData.city ? [this.hashValue(userData.city.toLowerCase())] : undefined,
          st: userData.state ? [this.hashValue(userData.state.toLowerCase())] : undefined,
          zp: userData.zipCode ? [this.hashValue(userData.zipCode)] : undefined,
          country: userData.country ? [this.hashValue(userData.country.toLowerCase())] : undefined,
          external_id: userData.externalId ? [this.hashValue(userData.externalId)] : undefined,
          client_ip_address: userData.ipAddress,
          client_user_agent: userData.userAgent,
          fbc: userData.fbc, // Facebook Click ID
          fbp: userData.fbp  // Facebook Browser ID
        },
        custom_data: {
          value: customData.value,
          currency: customData.currency || 'EGP',
          content_ids: customData.contentIds,
          content_type: customData.contentType,
          content_name: customData.contentName,
          content_category: customData.contentCategory,
          num_items: customData.numItems,
          order_id: customData.orderId
        }
      };

      // إزالة القيم الفارغة
      Object.keys(event.user_data).forEach(key => {
        if (!event.user_data[key]) delete event.user_data[key];
      });
      Object.keys(event.custom_data).forEach(key => {
        if (event.custom_data[key] === undefined) delete event.custom_data[key];
      });

      const payload = {
        data: [event]
      };

      console.log('📤 Sending Conversion Event (CAPI):', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${pixelId}/events`,
        payload,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Conversion Event sent:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error sending Conversion Event:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Hash value for CAPI (SHA256)
   */
  hashValue(value) {
    if (!value) return null;
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(value.toString()).digest('hex');
  }

  /**
   * ============================================
   * v22.0: Ad Scheduling
   * ============================================
   */

  /**
   * تحديث Ad Set مع جدولة
   */
  async updateAdSetSchedule(adSetId, schedule) {
    try {
      // schedule: array of { days: [0-6], start_minute, end_minute, timezone_type }
      // days: 0 = Sunday, 6 = Saturday
      const scheduleData = {
        pacing_type: ['day_parting'],
        adset_schedule: schedule.map(s => ({
          days: s.days,
          start_minute: s.startMinute || 0,
          end_minute: s.endMinute || 1440, // 24 hours = 1440 minutes
          timezone_type: s.timezoneType || 'USER'
        }))
      };

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        scheduleData,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Ad Set schedule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Dynamic Creative Optimization (DCO)
   * ============================================
   */

  /**
   * إنشاء Dynamic Creative
   * يجمع عناصر إبداعية متعددة ويختبرها تلقائياً
   */
  async createDynamicCreative(data) {
    try {
      const {
        pageId,
        name,
        // Multiple assets
        images = [], // Array of image hashes
        videos = [], // Array of video IDs
        titles = [], // Array of headlines
        bodies = [], // Array of primary texts
        descriptions = [], // Array of descriptions
        callToActions = [], // Array of CTAs
        linkUrls = [], // Array of URLs
        // Settings
        optimizeCreativeForEachPerson = true
      } = data;

      if (!pageId) {
        throw new Error('Page ID is required');
      }

      const accountId = this.getAccountId();

      // Build asset feed spec
      const assetFeedSpec = {
        optimization_type: 'DEGREES_OF_FREEDOM',
        images: images.map(hash => ({ hash })),
        videos: videos.map(id => ({ video_id: id })),
        titles: titles.map(text => ({ text })),
        bodies: bodies.map(text => ({ text })),
        descriptions: descriptions.map(text => ({ text })),
        call_to_action_types: callToActions.length > 0 ? callToActions : ['LEARN_MORE'],
        link_urls: linkUrls.map(url => ({ website_url: url })),
        ad_formats: ['SINGLE_IMAGE', 'SINGLE_VIDEO', 'CAROUSEL']
      };

      // Remove empty arrays
      Object.keys(assetFeedSpec).forEach(key => {
        if (Array.isArray(assetFeedSpec[key]) && assetFeedSpec[key].length === 0) {
          delete assetFeedSpec[key];
        }
      });

      const creativeData = {
        name: name || 'Dynamic Creative',
        object_story_spec: {
          page_id: pageId
        },
        asset_feed_spec: assetFeedSpec,
        degrees_of_freedom_spec: {
          creative_features_spec: {
            standard_enhancements: {
              enroll_status: optimizeCreativeForEachPerson ? 'OPT_IN' : 'OPT_OUT'
            }
          }
        }
      };

      console.log('📤 Creating Dynamic Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Dynamic Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Dynamic Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Advantage+ Shopping Campaigns
   * ============================================
   */

  /**
   * إنشاء Advantage+ Shopping Campaign
   */
  async createAdvantagePlusShoppingCampaign(data) {
    try {
      const {
        name,
        status = 'PAUSED',
        budgetType = 'DAILY',
        budgetAmount,
        catalogId,
        pixelId,
        countryTargeting = [],
        existingCustomerBudgetPercentage = 0
      } = data;

      const accountId = this.getAccountId();

      // Campaign data for Advantage+ Shopping
      const campaignData = {
        name,
        objective: 'OUTCOME_SALES',
        status,
        special_ad_categories: [],
        buying_type: 'AUCTION',
        smart_promotion_type: 'GUIDED_CREATION'
      };

      // Add budget
      if (budgetType === 'DAILY') {
        campaignData.daily_budget = Math.round(budgetAmount * 100);
      } else {
        campaignData.lifetime_budget = Math.round(budgetAmount * 100);
      }

      console.log('📤 Creating Advantage+ Shopping Campaign:', JSON.stringify(campaignData, null, 2));

      const campaignResponse = await axios.post(
        `${this.baseUrl}/${accountId}/campaigns`,
        campaignData,
        { params: { access_token: this.accessToken } }
      );

      const campaignId = campaignResponse.data.id;
      console.log('✅ Advantage+ Shopping Campaign created:', campaignId);

      // Create Ad Set with Advantage+ settings
      const adSetData = {
        name: `${name} - Ad Set`,
        campaign_id: campaignId,
        status,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        promoted_object: {
          pixel_id: pixelId,
          custom_event_type: 'PURCHASE'
        },
        targeting: {
          geo_locations: {
            countries: countryTargeting.length > 0 ? countryTargeting : ['EG']
          },
          targeting_automation: {
            advantage_audience: 1
          }
        },
        // Advantage+ Shopping specific
        existing_customer_budget_percentage: existingCustomerBudgetPercentage
      };

      if (catalogId) {
        adSetData.promoted_object.product_catalog_id = catalogId;
      }

      const adSetResponse = await axios.post(
        `${this.baseUrl}/${accountId}/adsets`,
        adSetData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Advantage+ Ad Set created:', adSetResponse.data.id);

      return {
        success: true,
        campaignId,
        adSetId: adSetResponse.data.id,
        data: {
          campaign: campaignResponse.data,
          adSet: adSetResponse.data
        }
      };
    } catch (error) {
      console.error('❌ Error creating Advantage+ Shopping Campaign:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Advanced Reporting (Async Reports)
   * ============================================
   */

  /**
   * إنشاء Async Report
   */
  async createAsyncReport(data) {
    try {
      const {
        level = 'ad', // account, campaign, adset, ad
        fields = [],
        datePreset = 'last_30d',
        timeRange,
        breakdowns = [],
        filtering = [],
        sorting = []
      } = data;

      const accountId = this.getAccountId();

      const defaultFields = [
        'campaign_id', 'campaign_name',
        'adset_id', 'adset_name',
        'ad_id', 'ad_name',
        'impressions', 'clicks', 'spend',
        'ctr', 'cpc', 'cpm',
        'reach', 'frequency',
        'actions', 'conversions',
        'cost_per_action_type'
      ];

      const reportParams = {
        level,
        fields: fields.length > 0 ? fields : defaultFields,
        breakdowns: breakdowns.length > 0 ? breakdowns : undefined,
        filtering: filtering.length > 0 ? filtering : undefined,
        sorting: sorting.length > 0 ? sorting : undefined
      };

      if (timeRange) {
        reportParams.time_range = timeRange;
      } else {
        reportParams.date_preset = datePreset;
      }

      console.log('📤 Creating Async Report:', JSON.stringify(reportParams, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/insights`,
        reportParams,
        { 
          params: { 
            access_token: this.accessToken,
            // Request async report
            is_async: true
          } 
        }
      );

      console.log('✅ Async Report created:', response.data.report_run_id);

      return {
        success: true,
        reportRunId: response.data.report_run_id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Async Report:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب حالة Async Report
   */
  async getAsyncReportStatus(reportRunId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${reportRunId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,account_id,async_status,async_percent_completion,date_start,date_stop'
          }
        }
      );

      return {
        success: true,
        status: response.data.async_status,
        percentComplete: response.data.async_percent_completion,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Async Report status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب نتائج Async Report
   */
  async getAsyncReportResults(reportRunId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${reportRunId}/insights`,
        {
          params: {
            access_token: this.accessToken,
            limit: 500
          }
        }
      );

      return {
        success: true,
        data: response.data.data || [],
        paging: response.data.paging
      };
    } catch (error) {
      console.error('❌ Error getting Async Report results:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Creative Formats (Collection, Stories, Reels)
   * ============================================
   */

  /**
   * إنشاء Collection Ad Creative
   */
  async createCollectionCreative(data) {
    try {
      const {
        pageId,
        name,
        instantExperienceId, // Canvas ID
        coverImageHash,
        coverVideoId,
        headline,
        primaryText,
        products = [], // Array of product IDs from catalog
        catalogId
      } = data;

      const accountId = this.getAccountId();

      const creativeData = {
        name: name || 'Collection Ad',
        object_story_spec: {
          page_id: pageId,
          template_data: {
            call_to_action: {
              type: 'LEARN_MORE'
            },
            description: primaryText,
            link: instantExperienceId ? undefined : data.linkUrl,
            message: headline,
            retailer_item_ids: products.slice(0, 4) // Max 4 products in collection
          }
        }
      };

      // Add cover media
      if (coverImageHash) {
        creativeData.object_story_spec.template_data.image_hash = coverImageHash;
      } else if (coverVideoId) {
        creativeData.object_story_spec.template_data.video_id = coverVideoId;
      }

      // Link to Instant Experience
      if (instantExperienceId) {
        creativeData.object_story_spec.template_data.canvas_id = instantExperienceId;
      }

      console.log('📤 Creating Collection Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Collection Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Collection Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إنشاء Stories/Reels Creative
   */
  async createStoriesReelsCreative(data) {
    try {
      const {
        pageId,
        instagramAccountId,
        name,
        videoId, // Required for Stories/Reels
        primaryText,
        linkUrl,
        callToAction = 'LEARN_MORE',
        format = 'STORIES' // STORIES or REELS
      } = data;

      if (!videoId) {
        throw new Error('Video ID is required for Stories/Reels');
      }

      const accountId = this.getAccountId();

      const creativeData = {
        name: name || `${format} Ad`,
        object_story_spec: {
          page_id: pageId,
          instagram_actor_id: instagramAccountId,
          video_data: {
            video_id: videoId,
            message: primaryText,
            call_to_action: {
              type: callToAction,
              value: {
                link: linkUrl
              }
            }
          }
        },
        // Specify placement format
        platform_customizations: {
          instagram: {
            [format.toLowerCase()]: {
              video_id: videoId
            }
          }
        }
      };

      console.log('📤 Creating Stories/Reels Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Stories/Reels Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Stories/Reels Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * إنشاء Instant Experience (Canvas)
   */
  async createInstantExperience(pageId, data) {
    try {
      const {
        name,
        components = [] // Array of component objects
      } = data;

      const canvasData = {
        name: name || 'Instant Experience',
        body_element_ids: components.map(c => c.id).filter(Boolean)
      };

      console.log('📤 Creating Instant Experience:', JSON.stringify(canvasData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${pageId}/canvas`,
        canvasData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Instant Experience created:', response.data.id);

      return {
        success: true,
        canvasId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Instant Experience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Automation Rules
   * ============================================
   */

  /**
   * إنشاء Automated Rule
   */
  async createAutomatedRule(data) {
    try {
      const {
        name,
        entityType = 'AD', // CAMPAIGN, ADSET, AD
        filterField,
        filterOperator,
        filterValue,
        actionType, // PAUSE, UNPAUSE, CHANGE_BUDGET, CHANGE_BID, SEND_NOTIFICATION
        actionValue,
        evaluationSpec = {},
        scheduleSpec = {}
      } = data;

      const accountId = this.getAccountId();

      const ruleData = {
        name,
        evaluation_spec: {
          evaluation_type: evaluationSpec.type || 'SCHEDULE',
          filters: [
            {
              field: filterField,
              operator: filterOperator,
              value: filterValue
            }
          ],
          ...evaluationSpec
        },
        execution_spec: {
          execution_type: actionType,
          execution_options: actionValue ? [{ value: actionValue }] : undefined
        },
        schedule_spec: {
          schedule_type: scheduleSpec.type || 'DAILY',
          ...scheduleSpec
        }
      };

      console.log('📤 Creating Automated Rule:', JSON.stringify(ruleData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adrules_library`,
        ruleData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Automated Rule created:', response.data.id);

      return {
        success: true,
        ruleId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Automated Rule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Automated Rules
   */
  async getAutomatedRules() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/adrules_library`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,status,evaluation_spec,execution_spec,schedule_spec,created_time'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Automated Rules:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * تحديث Automated Rule
   */
  async updateAutomatedRule(ruleId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${ruleId}`,
        data,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Automated Rule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * حذف Automated Rule
   */
  async deleteAutomatedRule(ruleId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${ruleId}`,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error deleting Automated Rule:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Attribution Settings
   * ============================================
   */

  /**
   * تحديث Attribution Settings للـ Ad Set
   */
  async updateAttributionSettings(adSetId, settings) {
    try {
      const {
        attributionWindow = '7d_click_1d_view', // 1d_click, 7d_click, 1d_view, 7d_click_1d_view
        useUnifiedAttributionSetting = true
      } = settings;

      // Map to Facebook format
      const attributionSpec = [];
      
      if (attributionWindow.includes('click')) {
        const clickDays = attributionWindow.includes('7d_click') ? 7 : 1;
        attributionSpec.push({
          event_type: 'CLICK_THROUGH',
          window_days: clickDays
        });
      }
      
      if (attributionWindow.includes('view')) {
        const viewDays = attributionWindow.includes('1d_view') ? 1 : 7;
        attributionSpec.push({
          event_type: 'VIEW_THROUGH',
          window_days: viewDays
        });
      }

      const updateData = {
        attribution_spec: attributionSpec,
        use_new_app_click: useUnifiedAttributionSetting
      };

      console.log('📤 Updating Attribution Settings:', JSON.stringify(updateData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        updateData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Attribution Settings updated');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Attribution Settings:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Ad Set Management (Update, Frequency Cap)
   * ============================================
   */

  /**
   * تحديث Ad Set
   */
  async updateAdSet(adSetId, data) {
    try {
      const {
        name,
        status,
        budgetType,
        budgetAmount,
        optimizationGoal,
        bidAmount,
        targeting,
        startTime,
        endTime
      } = data;

      const updateData = {};

      if (name) updateData.name = name;
      if (status) updateData.status = status;
      if (optimizationGoal) updateData.optimization_goal = optimizationGoal;
      if (bidAmount) updateData.bid_amount = Math.round(bidAmount * 100);
      if (startTime) updateData.start_time = startTime;
      if (endTime) updateData.end_time = endTime;

      // Budget
      if (budgetType && budgetAmount) {
        if (budgetType === 'DAILY') {
          updateData.daily_budget = Math.round(budgetAmount * 100);
        } else {
          updateData.lifetime_budget = Math.round(budgetAmount * 100);
        }
      }

      // Targeting
      if (targeting) {
        updateData.targeting = this.buildTargetingSpec(targeting);
      }

      console.log('📤 Updating Ad Set:', JSON.stringify(updateData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        updateData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Ad Set updated');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Ad Set:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * تحديث Frequency Cap
   */
  async updateFrequencyCap(adSetId, frequencyCap) {
    try {
      const {
        maxFrequency = 2, // Max impressions per user
        intervalDays = 7 // Time window in days
      } = frequencyCap;

      const updateData = {
        frequency_control_specs: [
          {
            event: 'IMPRESSIONS',
            interval_days: intervalDays,
            max_frequency: maxFrequency
          }
        ]
      };

      console.log('📤 Updating Frequency Cap:', JSON.stringify(updateData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        updateData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Frequency Cap updated');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Frequency Cap:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Advanced Targeting
   * ============================================
   */

  /**
   * البحث عن Targeting Options
   */
  async searchTargetingOptions(query, type = 'adinterest') {
    try {
      // Types: adinterest, adinterestsuggestion, adinterestvalid, 
      //        adTargetingCategory, adgeolocation, adlocale, etc.
      
      const response = await axios.get(
        `${this.baseUrl}/search`,
        {
          params: {
            access_token: this.accessToken,
            type,
            q: query,
            limit: 50
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error searching targeting options:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Targeting Suggestions
   */
  async getTargetingSuggestions(targetingList) {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/targetingsuggestions`,
        {
          params: {
            access_token: this.accessToken,
            targeting_list: JSON.stringify(targetingList)
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting targeting suggestions:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Reach Estimate
   */
  async getReachEstimate(targeting) {
    try {
      const accountId = this.getAccountId();
      const targetingSpec = this.buildTargetingSpec(targeting);

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/reachestimate`,
        {
          params: {
            access_token: this.accessToken,
            targeting_spec: JSON.stringify(targetingSpec),
            optimize_for: 'OFFSITE_CONVERSIONS'
          }
        }
      );

      return {
        success: true,
        data: {
          users: response.data.users,
          usersLowerBound: response.data.users_lower_bound,
          usersUpperBound: response.data.users_upper_bound,
          estimate_ready: response.data.estimate_ready
        }
      };
    } catch (error) {
      console.error('❌ Error getting reach estimate:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * بناء Targeting Spec المتقدم (مع Language, Connection, Zip)
   */
  buildAdvancedTargetingSpec(targeting) {
    const spec = this.buildTargetingSpec(targeting);

    // Language Targeting
    if (targeting.locales && targeting.locales.length > 0) {
      spec.locales = targeting.locales; // e.g., [6, 24] for Arabic, English
    }

    // Connection Targeting
    if (targeting.connections) {
      if (targeting.connections.pages && targeting.connections.pages.length > 0) {
        spec.connections = targeting.connections.pages.map(id => ({ id }));
      }
      if (targeting.connections.excludedPages && targeting.connections.excludedPages.length > 0) {
        spec.excluded_connections = targeting.connections.excludedPages.map(id => ({ id }));
      }
      if (targeting.connections.friendsOfConnections && targeting.connections.friendsOfConnections.length > 0) {
        spec.friends_of_connections = targeting.connections.friendsOfConnections.map(id => ({ id }));
      }
    }

    // Zip Code Targeting
    if (targeting.zipCodes && targeting.zipCodes.length > 0) {
      spec.geo_locations = spec.geo_locations || {};
      spec.geo_locations.zips = targeting.zipCodes.map(zip => ({
        key: zip.key || zip,
        name: zip.name,
        primary_city_id: zip.primaryCityId,
        region_id: zip.regionId,
        country: zip.country || 'US'
      }));
    }

    // Device Targeting
    if (targeting.devices) {
      if (targeting.devices.platforms && targeting.devices.platforms.length > 0) {
        spec.user_os = targeting.devices.platforms; // ['iOS', 'Android']
      }
      if (targeting.devices.deviceTypes && targeting.devices.deviceTypes.length > 0) {
        spec.user_device = targeting.devices.deviceTypes;
      }
    }

    // Education Targeting
    if (targeting.education) {
      if (targeting.education.schools && targeting.education.schools.length > 0) {
        spec.education_schools = targeting.education.schools.map(s => ({ id: s }));
      }
      if (targeting.education.majors && targeting.education.majors.length > 0) {
        spec.education_majors = targeting.education.majors.map(m => ({ id: m }));
      }
      if (targeting.education.statuses && targeting.education.statuses.length > 0) {
        spec.education_statuses = targeting.education.statuses;
      }
    }

    // Work Targeting
    if (targeting.work) {
      if (targeting.work.employers && targeting.work.employers.length > 0) {
        spec.work_employers = targeting.work.employers.map(e => ({ id: e }));
      }
      if (targeting.work.positions && targeting.work.positions.length > 0) {
        spec.work_positions = targeting.work.positions.map(p => ({ id: p }));
      }
    }

    // Life Events
    if (targeting.lifeEvents && targeting.lifeEvents.length > 0) {
      spec.life_events = targeting.lifeEvents.map(e => ({ id: e }));
    }

    // Relationship Status
    if (targeting.relationshipStatuses && targeting.relationshipStatuses.length > 0) {
      spec.relationship_statuses = targeting.relationshipStatuses;
    }

    return spec;
  }

  /**
   * ============================================
   * Ad Preview
   * ============================================
   */

  /**
   * جلب Ad Preview
   */
  async getAdPreview(adId, format = 'DESKTOP_FEED_STANDARD') {
    try {
      // Formats: DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, 
      //          INSTAGRAM_STANDARD, INSTAGRAM_STORY, RIGHT_COLUMN_STANDARD, etc.
      
      const response = await axios.get(
        `${this.baseUrl}/${adId}/previews`,
        {
          params: {
            access_token: this.accessToken,
            ad_format: format
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Ad Preview:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Creative Preview
   */
  async getCreativePreview(creativeId, format = 'DESKTOP_FEED_STANDARD') {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/generatepreviews`,
        {
          params: {
            access_token: this.accessToken,
            creative_id: creativeId,
            ad_format: format
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Creative Preview:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Saved Audiences
   * ============================================
   */

  /**
   * إنشاء Saved Audience
   */
  async createSavedAudience(data) {
    try {
      const {
        name,
        description,
        targeting
      } = data;

      const accountId = this.getAccountId();
      const targetingSpec = this.buildAdvancedTargetingSpec(targeting);

      const audienceData = {
        name,
        description,
        targeting: targetingSpec
      };

      console.log('📤 Creating Saved Audience:', JSON.stringify(audienceData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/saved_audiences`,
        audienceData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Saved Audience created:', response.data.id);

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Saved Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * جلب Saved Audiences
   */
  async getSavedAudiences() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/saved_audiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,targeting,approximate_count'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Saved Audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * حذف Saved Audience
   */
  async deleteSavedAudience(audienceId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${audienceId}`,
        { params: { access_token: this.accessToken } }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error deleting Saved Audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * Facebook Pages & Pixels
   * ============================================
   */

  /**
   * جلب Facebook Pages
   */
  async getFacebookPages() {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v22.0/me/accounts`, // ✅ Updated to v22.0
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,category,access_token'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook Pages:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: []
      };
    }
  }

  /**
   * جلب Facebook Pixels
   */
  async getFacebookPixels() {
    try {
      const accountId = this.getAccountId();

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/adspixels`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,code'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting Facebook Pixels:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: []
      };
    }
  }

  /**
   * ============================================
   * Helper Functions للميزات الجديدة
   * ============================================
   */

  /**
   * بناء Attribution Spec
   */
  buildAttributionSpec(attributionWindow) {
    if (!attributionWindow) {
      return [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ];
    }

    const spec = [];

    // Parse attribution window
    // Formats: '7d_click_1d_view', '1d_click_1d_view', '7d_click', '1d_click'
    if (attributionWindow.includes('click')) {
      const clickDays = attributionWindow.includes('7d_click') ? 7 : 1;
      spec.push({
        event_type: 'CLICK_THROUGH',
        window_days: clickDays
      });
    }

    if (attributionWindow.includes('view')) {
      const viewDays = attributionWindow.includes('1d_view') ? 1 : 7;
      spec.push({
        event_type: 'VIEW_THROUGH',
        window_days: viewDays
      });
    }

    return spec.length > 0 ? spec : null;
  }

  /**
   * بناء Bid Strategy
   */
  buildBidStrategy(bidStrategy, bidValue) {
    const bidData = {};

    if (!bidStrategy) {
      return bidData;
    }

    switch (bidStrategy) {
      case 'LOWEST_COST':
        // No additional fields needed
        break;

      case 'COST_CAP':
        if (bidValue) {
          bidData.bid_strategy = 'COST_CAP';
          bidData.bid_amount = Math.round(bidValue * 100); // Convert to cents
        }
        break;

      case 'BID_CAP':
        if (bidValue) {
          bidData.bid_strategy = 'LOWEST_COST_WITH_BID_CAP';
          bidData.bid_amount = Math.round(bidValue * 100);
        }
        break;

      case 'TARGET_COST':
        if (bidValue) {
          bidData.bid_strategy = 'COST_CAP';
          bidData.bid_amount = Math.round(bidValue * 100);
        }
        break;

      case 'ROAS':
        if (bidValue) {
          bidData.bid_strategy = 'LOWEST_COST_WITH_MIN_ROAS';
          bidData.min_roas_target = bidValue; // ROAS is a multiplier, not cents
        }
        break;

      default:
        break;
    }

    return bidData;
  }

  /**
   * ============================================
   * v22.0: Ad Recommendations API
   * ============================================
   */

  /**
   * جلب توصيات الإعلان
   */
  async getAdRecommendations(adId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${adId}/recommendations`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,title,description,reason,link,action_type,priority'
          }
        }
      );

      return {
        success: true,
        recommendations: response.data.data || [],
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Ad Recommendations:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        recommendations: []
      };
    }
  }

  /**
   * تطبيق توصية على الإعلان
   */
  async applyAdRecommendation(adId, recommendationId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${adId}/apply_recommendation`,
        {
          recommendation_id: recommendationId
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error applying Ad Recommendation:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0: Instagram Reels Ads
   * ============================================
   */

  /**
   * إنشاء Instagram Reels Ad Creative
   */
  async createInstagramReelsCreative(data) {
    try {
      const {
        pageId,
        instagramAccountId,
        videoId, // Required for Reels
        primaryText,
        callToAction,
        linkUrl,
        // Reels-specific options
        coverImageHash,
        musicId,
        // Advantage+ Creative for Reels
        advantageCreative = true
      } = data;

      if (!videoId) {
        throw new Error('Video ID is required for Instagram Reels');
      }

      const accountId = this.getAccountId();

      const creativeData = {
        name: data.name || 'Instagram Reels Ad',
        object_story_spec: {
          page_id: pageId,
          instagram_actor_id: instagramAccountId,
          video_data: {
            video_id: videoId,
            image_url: coverImageHash ? undefined : data.imageUrl,
            image_hash: coverImageHash,
            message: primaryText,
            call_to_action: {
              type: callToAction || 'LEARN_MORE',
              value: {
                link: linkUrl
              }
            }
          }
        },
        product_set_id: data.productSetId,
        url_tags: data.urlTags
      };

      // ✅ v22.0: Advantage+ Creative for Reels
      if (advantageCreative) {
        creativeData.degrees_of_freedom_spec = {
          creative_features_spec: {
            video_highlight: {
              enroll_status: 'OPT_IN' // Auto-trim to best moments
            }
          }
        };

        // Music for Reels
        if (musicId) {
          creativeData.object_story_spec.video_data.music_id = musicId;
        }
      }

      console.log('📤 Creating Instagram Reels Creative:', JSON.stringify(creativeData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/adcreatives`,
        creativeData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ Instagram Reels Creative created:', response.data.id);

      return {
        success: true,
        creativeId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Instagram Reels Creative:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0: WhatsApp Ads Support
   * ============================================
   */

  /**
   * إنشاء WhatsApp Click-to-Message Ad
   */
  async createWhatsAppAd(data) {
    try {
      const {
        pageId,
        whatsappBusinessAccountId,
        creativeId,
        adSetId,
        name,
        status = 'PAUSED'
      } = data;

      if (!whatsappBusinessAccountId) {
        throw new Error('WhatsApp Business Account ID is required');
      }

      const accountId = this.getAccountId();

      const adData = {
        name: name || 'WhatsApp Click-to-Message Ad',
        status,
        adset_id: adSetId,
        creative: {
          creative_id: creativeId
        },
        // WhatsApp-specific fields
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: `https://wa.me/${whatsappBusinessAccountId}`,
            call_to_action: {
              type: 'MESSAGE_PAGE'
            }
          }
        }
      };

      console.log('📤 Creating WhatsApp Ad:', JSON.stringify(adData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/ads`,
        adData,
        { params: { access_token: this.accessToken } }
      );

      console.log('✅ WhatsApp Ad created:', response.data.id);

      return {
        success: true,
        adId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating WhatsApp Ad:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * ============================================
   * v22.0: Ad Quality & Relevance Metrics
   * ============================================
   */

  /**
   * جلب Ad Quality Metrics
   */
  async getAdQualityMetrics(adId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${adId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,quality_score'
          }
        }
      );

      return {
        success: true,
        metrics: {
          qualityRanking: response.data.quality_ranking,
          engagementRateRanking: response.data.engagement_rate_ranking,
          conversionRateRanking: response.data.conversion_rate_ranking,
          qualityScore: response.data.quality_score
        },
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting Ad Quality Metrics:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

// Export
module.exports = FacebookAdsService;
module.exports.OBJECTIVE_MAPPING = OBJECTIVE_MAPPING;



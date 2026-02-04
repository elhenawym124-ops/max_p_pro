/**
 * Facebook Ads Service
 * 
 * Service للتعامل مع Facebook Ads Management API
 */

import { apiClient } from './apiClient';

// ============================================
// Types & Interfaces
// ============================================

export interface FacebookCampaign {
  id: string;
  companyId: string;
  adAccountId?: string;
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  facebookCampaignId?: string;
  budgetType: 'DAILY' | 'LIFETIME';
  budgetAmount: number;
  startDate?: string;
  endDate?: string;
  pixelId?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  adSets?: FacebookAdSet[];
}

export interface FacebookAdSet {
  id: string;
  campaignId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  facebookAdSetId?: string;
  targeting?: TargetingData;
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  lookalikeAudiences?: string[];
  budgetType: 'DAILY' | 'LIFETIME';
  budgetAmount: number;
  optimizationGoal?: string;
  billingEvent?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  ads?: FacebookAd[];
}

export interface FacebookAd {
  id: string;
  adSetId: string;
  companyId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  facebookAdId?: string;
  creativeType: 'SINGLE_IMAGE' | 'SINGLE_VIDEO' | 'CAROUSEL' | 'COLLECTION';
  primaryText: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  imageUrl?: string;
  videoUrl?: string;
  imageHash?: string;
  videoId?: string;
  linkUrl?: string;
  productId?: string;
  creative?: any;
  createdAt: string;
  updatedAt: string;
  insights?: FacebookAdInsight[];
}

export interface FacebookAdInsight {
  id: string;
  adId: string;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  conversions: number;
  cpa: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  costPerLinkClick: number;
  landingPageViews: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  breakdown?: any;
}

export interface TargetingData {
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  lookalikeAudiences?: string[];
}

export interface FacebookAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name?: string;
}

export interface CreateCampaignData {
  name: string;
  objective: string;
  status?: 'ACTIVE' | 'PAUSED';
  budgetType: 'DAILY' | 'LIFETIME';
  budgetAmount: number;
  startDate?: string;
  endDate?: string;
  pixelId?: string;
  adAccountId?: string;
  // الحقول الجديدة
  description?: string;
  specialAdCategories?: string[];
  budgetOptimization?: boolean;
  spendLimit?: number;
  timezone?: string;
  buyingType?: string;
  bidStrategy?: string;
}

export interface CreateAdSetData {
  name: string;
  status?: 'ACTIVE' | 'PAUSED';
  targeting?: TargetingData;
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
  budgetType: 'DAILY' | 'LIFETIME';
  budgetAmount: number;
  optimizationGoal?: string;
  billingEvent?: string;
}

export interface CreateAdData {
  adSetId: string;
  name: string;
  status?: 'ACTIVE' | 'PAUSED';
  creativeType: 'SINGLE_IMAGE' | 'SINGLE_VIDEO' | 'CAROUSEL' | 'COLLECTION';
  primaryText: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  productId?: string;
}

/**
 * 🚀 Full Ad Creation Data
 * بيانات إنشاء إعلان كامل (Campaign + AdSet + Ad)
 */
export interface CreateFullAdData {
  // Campaign Data
  campaignName: string;
  objective: string;
  specialAdCategories?: string[];
  buyingType?: 'AUCTION' | 'RESERVED';
  
  // Budget Data
  budgetOptimization?: boolean; // CBO
  budgetType?: 'DAILY' | 'LIFETIME';
  budgetAmount: number;
  bidStrategy?: string;
  spendLimit?: number;
  
  // Schedule Data
  startTime?: string;
  endTime?: string;
  
  // AdSet Data
  adSetName?: string;
  optimizationGoal?: string;
  billingEvent?: string;
  
  // Targeting Data
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    locations?: string[];
    cities?: any[];
    regions?: string[];
    interests?: any[];
    behaviors?: any[];
    customAudiences?: string[];
    lookalikeAudiences?: string[];
    excludedAudiences?: string[];
    advantageAudience?: boolean;
    targetingExpansion?: boolean;
  };
  
  // Placements Data
  placementType?: 'AUTOMATIC' | 'MANUAL';
  placements?: string[];
  
  // Ad Creative Data
  adName?: string;
  pageId: string;
  creativeType?: 'SINGLE_IMAGE' | 'SINGLE_VIDEO' | 'CAROUSEL';
  primaryText: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  linkUrl: string;
  imageUrl?: string;
  imageHash?: string;
  videoUrl?: string;
  videoId?: string;
  
  // Advantage+ Creative Enhancements (v22.0)
  advantageCreative?: boolean;
  textGeneration?: boolean;
  imageEnhancement?: boolean;
  musicEnhancement?: boolean;
  imageTemplates?: boolean;
  videoHighlight?: boolean;
  textOptimizations?: boolean;
  
  // Status
  status?: 'ACTIVE' | 'PAUSED';
}

export interface FullAdResult {
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  creativeId?: string;
  error?: string;
  step?: string;
  partialSuccess?: boolean;
  data?: {
    campaign: any;
    adSet: any;
    ad: any;
    facebookIds: {
      campaignId: string;
      adSetId: string;
      adId: string;
      creativeId: string;
    };
  };
}

// ============================================
// Service Functions
// ============================================

/**
 * 🚀 إنشاء إعلان كامل (Campaign + AdSet + Ad)
 * هذه الدالة الرئيسية لإنشاء إعلان من الـ Wizard
 */
export const createFullAd = async (data: CreateFullAdData): Promise<FullAdResult> => {
  try {
    const response = await apiClient.post('/facebook-ads/full-ad', data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating full ad:', error);
    throw error;
  }
};

/**
 * جلب جميع الحملات
 */
export const getCampaigns = async (): Promise<FacebookCampaign[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/campaigns');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching campaigns:', error);
    throw error;
  }
};

/**
 * جلب حملة واحدة
 */
export const getCampaign = async (id: string): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.get(`/facebook-ads/campaigns/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching campaign:', error);
    throw error;
  }
};

/**
 * إنشاء حملة جديدة
 */
export const createCampaign = async (data: CreateCampaignData): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.post('/facebook-ads/campaigns', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating campaign:', error);
    throw error;
  }
};

/**
 * تحديث حملة
 */
export const updateCampaign = async (id: string, data: Partial<CreateCampaignData>): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.put(`/facebook-ads/campaigns/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error updating campaign:', error);
    throw error;
  }
};

/**
 * حذف حملة
 */
export const deleteCampaign = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/campaigns/${id}`);
  } catch (error: any) {
    console.error('❌ Error deleting campaign:', error);
    throw error;
  }
};

/**
 * إيقاف حملة
 */
export const pauseCampaign = async (id: string): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.post(`/facebook-ads/campaigns/${id}/pause`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error pausing campaign:', error);
    throw error;
  }
};

/**
 * استئناف حملة
 */
export const resumeCampaign = async (id: string): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.post(`/facebook-ads/campaigns/${id}/resume`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error resuming campaign:', error);
    throw error;
  }
};

/**
 * جلب Ad Accounts المتاحة
 */
export const getAdAccounts = async (): Promise<FacebookAdAccount[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/ad-accounts');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching Ad Accounts:', error);
    throw error;
  }
};

// ============================================
// Campaign Objectives (v22.0 Simplified)
// ============================================

export const CAMPAIGN_OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'الوعي', description: 'زيادة الوعي بعلامتك التجارية والوصول لأكبر عدد', icon: '👁️' },
  { value: 'OUTCOME_TRAFFIC', label: 'الزيارات', description: 'زيادة عدد الزوار لموقعك أو تطبيقك', icon: '🔗' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'التفاعل', description: 'زيادة التفاعل مع المحتوى والرسائل', icon: '💬' },
  { value: 'OUTCOME_LEADS', label: 'العملاء المحتملين', description: 'جمع معلومات العملاء المحتملين', icon: '📋' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'ترويج التطبيق', description: 'زيادة تثبيت واستخدام التطبيق', icon: '📱' },
  { value: 'OUTCOME_SALES', label: 'المبيعات', description: 'زيادة المبيعات والتحويلات على موقعك', icon: '🛒' },
] as const;

// v22.0: Objective Mapping (Legacy -> Simplified)
export const OBJECTIVE_MAPPING: Record<string, string> = {
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
};

// ============================================
// Call to Action Types (v22.0)
// ============================================

export const CALL_TO_ACTION_TYPES = [
  { value: 'LEARN_MORE', label: 'اعرف المزيد' },
  { value: 'SHOP_NOW', label: 'تسوق الآن' },
  { value: 'SIGN_UP', label: 'سجل الآن' },
  { value: 'DOWNLOAD', label: 'تحميل' },
  { value: 'BOOK_TRAVEL', label: 'احجز الآن' },
  { value: 'CONTACT_US', label: 'اتصل بنا' },
  { value: 'GET_QUOTE', label: 'احصل على عرض سعر' },
  { value: 'SUBSCRIBE', label: 'اشترك' },
  { value: 'GET_OFFER', label: 'احصل على العرض' },
  { value: 'SEND_MESSAGE', label: 'أرسل رسالة' },
  { value: 'WHATSAPP_MESSAGE', label: 'راسلنا على واتساب' },
  { value: 'CALL_NOW', label: 'اتصل الآن' },
  { value: 'APPLY_NOW', label: 'قدم الآن' },
  { value: 'BUY_NOW', label: 'اشتري الآن' },
  { value: 'ORDER_NOW', label: 'اطلب الآن' },
  { value: 'WATCH_MORE', label: 'شاهد المزيد' },
] as const;

// ============================================
// v22.0: Advantage+ Creative Enhancements
// ============================================

export const ADVANTAGE_CREATIVE_ENHANCEMENTS = [
  { value: 'text_generation', label: 'توليد النصوص', description: 'إنشاء نسخ إعلانية متنوعة بالذكاء الاصطناعي' },
  { value: 'text_optimizations', label: 'تحسين النصوص', description: 'تحسين النصوص الحالية تلقائياً' },
  { value: 'image_enhancement', label: 'تحسين الصور', description: 'قص وتعديل الصور تلقائياً' },
  { value: 'image_templates', label: 'قوالب الصور', description: 'إضافة إطارات وتأثيرات' },
  { value: 'video_highlight', label: 'مقاطع الفيديو', description: 'قص أفضل اللحظات تلقائياً' },
  { value: 'music', label: 'الموسيقى', description: 'إضافة موسيقى خلفية للفيديو' },
] as const;

// ============================================
// v22.0: Optimization Goals
// ============================================

export const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: 'نقرات الرابط', objectives: ['OUTCOME_TRAFFIC'] },
  { value: 'LANDING_PAGE_VIEWS', label: 'مشاهدات صفحة الهبوط', objectives: ['OUTCOME_TRAFFIC'] },
  { value: 'IMPRESSIONS', label: 'مرات الظهور', objectives: ['OUTCOME_AWARENESS'] },
  { value: 'REACH', label: 'الوصول', objectives: ['OUTCOME_AWARENESS'] },
  { value: 'THRUPLAY', label: 'مشاهدات الفيديو', objectives: ['OUTCOME_ENGAGEMENT'] },
  { value: 'POST_ENGAGEMENT', label: 'التفاعل مع المنشور', objectives: ['OUTCOME_ENGAGEMENT'] },
  { value: 'LEAD_GENERATION', label: 'توليد العملاء', objectives: ['OUTCOME_LEADS'] },
  { value: 'QUALITY_LEAD', label: 'عملاء محتملين جودة', objectives: ['OUTCOME_LEADS'] },
  { value: 'OFFSITE_CONVERSIONS', label: 'التحويلات', objectives: ['OUTCOME_SALES'] },
  { value: 'VALUE', label: 'قيمة التحويلات', objectives: ['OUTCOME_SALES'] },
  { value: 'APP_INSTALLS', label: 'تثبيت التطبيق', objectives: ['OUTCOME_APP_PROMOTION'] },
] as const;

/**
 * ============================================
 * AdSet Functions
 * ============================================
 */

/**
 * جلب AdSets في حملة
 */
export const getAdSets = async (campaignId: string): Promise<FacebookAdSet[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/campaigns/${campaignId}/adsets`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching AdSets:', error);
    throw error;
  }
};

/**
 * إنشاء AdSet جديد
 */
export const createAdSet = async (campaignId: string, data: CreateAdSetData): Promise<FacebookAdSet> => {
  try {
    const response = await apiClient.post(`/facebook-ads/campaigns/${campaignId}/adsets`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating AdSet:', error);
    throw error;
  }
};

/**
 * حذف AdSet
 */
export const deleteAdSet = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/adsets/${id}`);
  } catch (error: any) {
    console.error('❌ Error deleting AdSet:', error);
    throw error;
  }
};

/**
 * ============================================
 * Ads Functions
 * ============================================
 */

/**
 * جلب الإعلانات في AdSet
 */
export const getAds = async (adSetId: string): Promise<FacebookAd[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/adsets/${adSetId}/ads`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching Ads:', error);
    throw error;
  }
};

/**
 * إنشاء إعلان جديد
 */
export const createAd = async (adSetId: string, data: CreateAdData): Promise<FacebookAd> => {
  try {
    const response = await apiClient.post(`/facebook-ads/adsets/${adSetId}/ads`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating Ad:', error);
    throw error;
  }
};

/**
 * تحديث إعلان
 */
export const updateAd = async (id: string, data: Partial<CreateAdData>): Promise<FacebookAd> => {
  try {
    const response = await apiClient.put(`/facebook-ads/ads/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error updating Ad:', error);
    throw error;
  }
};

/**
 * حذف إعلان
 */
export const deleteAd = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/ads/${id}`);
  } catch (error: any) {
    console.error('❌ Error deleting Ad:', error);
    throw error;
  }
};

/**
 * ============================================
 * Insights Functions
 * ============================================
 */

/**
 * جلب إحصائيات إعلان
 */
export const getAdInsights = async (adId: string, startDate?: string, endDate?: string): Promise<FacebookAdInsight[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get(`/facebook-ads/ads/${adId}/insights?${params.toString()}`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching Ad insights:', error);
    throw error;
  }
};

/**
 * مزامنة إحصائيات إعلان من Facebook
 */
export const syncAdInsights = async (adId: string, startDate?: string, endDate?: string): Promise<FacebookAdInsight[]> => {
  try {
    const response = await apiClient.post(`/facebook-ads/ads/${adId}/sync-insights`, { startDate, endDate });
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error syncing Ad insights:', error);
    throw error;
  }
};

/**
 * جلب إحصائيات حملة (مجمعة)
 */
export const getCampaignInsights = async (campaignId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/facebook-ads/campaigns/${campaignId}/insights`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching campaign insights:', error);
    throw error;
  }
};

/**
 * ============================================
 * Sync Functions
 * ============================================
 */

/**
 * مزامنة الحملات من Facebook
 */
export const syncFromFacebook = async (adAccountId?: string): Promise<FacebookCampaign[]> => {
  try {
    const response = await apiClient.post('/facebook-ads/sync', { adAccountId });
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error syncing from Facebook:', error);
    throw error;
  }
};

/**
 * حفظ Ad Account
 */
export const saveAdAccount = async (data: { accountId: string; name: string; currency?: string; timezone?: string }): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/ad-accounts/save', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error saving Ad Account:', error);
    throw error;
  }
};

/**
 * جلب Ad Accounts المحفوظة
 */
export const getSavedAdAccounts = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/saved-ad-accounts');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching saved Ad Accounts:', error);
    throw error;
  }
};

// ============================================
// Audiences Types
// ============================================

export interface FacebookCustomAudience {
  id: string;
  companyId: string;
  adAccountId?: string;
  name: string;
  description?: string;
  audienceType: 'CUSTOMER_LIST' | 'WEBSITE' | 'ENGAGEMENT' | 'APP_ACTIVITY' | 'VIDEO_VIEW';
  facebookAudienceId?: string;
  customerListId?: string;
  matchRate?: number;
  pixelId?: string;
  eventType?: string;
  retentionDays?: number;
  engagementType?: string;
  videoId?: string;
  videoViewDuration?: number;
  status: 'ACTIVE' | 'DELETED';
  audienceSize?: number;
  createdAt: string;
  updatedAt: string;
  lookalikeAudiences?: FacebookLookalikeAudience[];
}

export interface FacebookLookalikeAudience {
  id: string;
  companyId: string;
  adAccountId?: string;
  sourceAudienceId: string;
  sourceAudience?: FacebookCustomAudience;
  name: string;
  description?: string;
  facebookAudienceId?: string;
  country: string;
  ratio: number; // 1-10
  status: 'ACTIVE' | 'DELETED';
  audienceSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomAudienceData {
  name: string;
  description?: string;
  audienceType: 'CUSTOMER_LIST' | 'WEBSITE' | 'ENGAGEMENT';
  adAccountId?: string;
  // Customer List
  customerList?: Array<{
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }>;
  customerListId?: string;
  // Website
  pixelId?: string;
  eventType?: string;
  retentionDays?: number;
  // Engagement
  engagementType?: string;
}

export interface CreateLookalikeAudienceData {
  name: string;
  description?: string;
  sourceAudienceId: string;
  country: string;
  ratio: number; // 1-10
  adAccountId?: string;
}

// ============================================
// Audiences Functions
// ============================================

/**
 * جلب جميع Custom Audiences
 */
export const getCustomAudiences = async (): Promise<FacebookCustomAudience[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/audiences/custom');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching custom audiences:', error);
    throw error;
  }
};

/**
 * إنشاء Custom Audience
 */
export const createCustomAudience = async (data: CreateCustomAudienceData): Promise<FacebookCustomAudience> => {
  try {
    const response = await apiClient.post('/facebook-ads/audiences/custom', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating custom audience:', error);
    throw error;
  }
};

/**
 * جلب معلومات Custom Audience
 */
export const getCustomAudience = async (id: string): Promise<FacebookCustomAudience> => {
  try {
    const response = await apiClient.get(`/facebook-ads/audiences/custom/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching custom audience:', error);
    throw error;
  }
};

/**
 * حذف Custom Audience
 */
export const deleteCustomAudience = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/audiences/custom/${id}`);
  } catch (error: any) {
    console.error('❌ Error deleting custom audience:', error);
    throw error;
  }
};

/**
 * جلب جميع Lookalike Audiences
 */
export const getLookalikeAudiences = async (): Promise<FacebookLookalikeAudience[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/audiences/lookalike');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching lookalike audiences:', error);
    throw error;
  }
};

/**
 * إنشاء Lookalike Audience
 */
export const createLookalikeAudience = async (data: CreateLookalikeAudienceData): Promise<FacebookLookalikeAudience> => {
  try {
    const response = await apiClient.post('/facebook-ads/audiences/lookalike', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating lookalike audience:', error);
    throw error;
  }
};

// ============================================
// Product Catalog Types
// ============================================

export interface FacebookProductCatalog {
  id: string;
  companyId: string;
  adAccountId?: string;
  name: string;
  description?: string;
  facebookCatalogId?: string;
  catalogType: string;
  isActive: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED';
  lastSyncAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  totalProducts: number;
  syncedProducts: number;
  createdAt: string;
  updatedAt: string;
  products?: FacebookCatalogProduct[];
  feeds?: FacebookProductFeed[];
  dynamicAds?: FacebookDynamicAd[];
}

export interface FacebookCatalogProduct {
  id: string;
  catalogId: string;
  productId?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  sku?: string;
  price?: number;
  currency?: string;
  availability: string;
  inventory?: number;
  imageUrl?: string;
  facebookProductId?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED' | 'UPDATED';
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  product?: any;
}

export interface FacebookProductFeed {
  id: string;
  catalogId: string;
  name: string;
  feedType: string;
  format: string;
  fileUrl?: string;
  facebookFeedId?: string;
  feedUrl?: string;
  schedule?: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface FacebookDynamicAd {
  id: string;
  companyId: string;
  catalogId: string;
  adSetId?: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  facebookAdId?: string;
  productSetId?: string;
  templateUrl?: string;
  templateId?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCatalogData {
  name: string;
  description?: string;
  businessId: string;
  catalogType?: string;
  adAccountId?: string;
}

export interface SyncProductsData {
  productIds?: string[];
  syncAll?: boolean;
}

// ============================================
// Product Catalog Functions
// ============================================

/**
 * جلب جميع Catalogs
 */
export const getCatalogs = async (businessId?: string): Promise<FacebookProductCatalog[]> => {
  try {
    const params = businessId ? `?businessId=${businessId}` : '';
    const response = await apiClient.get(`/facebook-ads/catalogs${params}`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching catalogs:', error);
    throw error;
  }
};

/**
 * إنشاء Catalog جديد
 */
export const createCatalog = async (data: CreateCatalogData): Promise<FacebookProductCatalog> => {
  try {
    const response = await apiClient.post('/facebook-ads/catalogs', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating catalog:', error);
    throw error;
  }
};

/**
 * جلب Catalog واحد
 */
export const getCatalog = async (id: string): Promise<FacebookProductCatalog> => {
  try {
    const response = await apiClient.get(`/facebook-ads/catalogs/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching catalog:', error);
    throw error;
  }
};

/**
 * حذف Catalog
 */
export const deleteCatalog = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/catalogs/${id}`);
  } catch (error: any) {
    console.error('❌ Error deleting catalog:', error);
    throw error;
  }
};

/**
 * Sync Products مع Catalog
 */
export const syncProducts = async (catalogId: string, data: SyncProductsData): Promise<any> => {
  try {
    const response = await apiClient.post(`/facebook-ads/catalogs/${catalogId}/sync-products`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error syncing products:', error);
    throw error;
  }
};

/**
 * جلب المنتجات في Catalog
 */
export const getCatalogProducts = async (catalogId: string, page: number = 1, limit: number = 50): Promise<{
  data: FacebookCatalogProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  try {
    const response = await apiClient.get(`/facebook-ads/catalogs/${catalogId}/products?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching catalog products:', error);
    throw error;
  }
};

export interface CreateDynamicAdData {
  name: string;
  catalogId: string;
  productSetId: string;
  templateUrl?: string;
  status?: 'ACTIVE' | 'PAUSED';
  headline?: string;
  description?: string;
  callToAction?: string;
}

// ============================================
// A/B Testing Types
// ============================================

export interface FacebookAdTest {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  testType: 'CREATIVE' | 'TARGETING' | 'BUDGET' | 'PLACEMENT';
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  campaignId?: string;
  campaign?: FacebookCampaign;
  variants: string; // JSON string
  winnerVariantId?: string;
  confidenceLevel?: number;
  testDuration?: number;
  startDate?: string;
  endDate?: string;
  trafficSplit: number;
  minimumResults: number;
  autoPromote: boolean;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  createdAt: string;
  updatedAt: string;
  variantsList?: FacebookAdTestVariant[];
}

export interface FacebookAdTestVariant {
  id: string;
  testId: string;
  name: string;
  variantType: 'VARIANT_A' | 'VARIANT_B' | 'CONTROL';
  variantData: string; // JSON string
  adSetId?: string;
  adSet?: FacebookAdSet;
  adId?: string;
  ad?: FacebookAd;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  isWinner: boolean;
  pValue?: number;
  confidenceLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdTestData {
  name: string;
  description?: string;
  testType: 'CREATIVE' | 'TARGETING' | 'BUDGET' | 'PLACEMENT';
  campaignId?: string;
  variants: Array<{
    name: string;
    creative?: any;
    targeting?: any;
    budgetType?: 'DAILY' | 'LIFETIME';
    budgetAmount?: number;
  }>;
  trafficSplit?: number;
  minimumResults?: number;
  autoPromote?: boolean;
}

/**
 * جلب Product Sets للـ Catalog
 */
export const getProductSets = async (catalogId: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/catalogs/${catalogId}/product-sets`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching product sets:', error);
    throw error;
  }
};

/**
 * إنشاء Product Set
 */
export const createProductSet = async (catalogId: string, data: {
  name: string;
  productIds?: string[];
  filter?: any;
}): Promise<any> => {
  try {
    const response = await apiClient.post(`/facebook-ads/catalogs/${catalogId}/product-sets`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating product set:', error);
    throw error;
  }
};

/**
 * إنشاء Dynamic Product Ad
 */
export const createDynamicAd = async (adSetId: string, data: CreateDynamicAdData): Promise<FacebookDynamicAd> => {
  try {
    const response = await apiClient.post(`/facebook-ads/adsets/${adSetId}/dynamic-ads`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating dynamic ad:', error);
    throw error;
  }
};

/**
 * ============================================
 * A/B Testing Functions
 * ============================================
 */

/**
 * جلب جميع A/B Tests
 */
export const getAdTests = async (status?: string, testType?: string): Promise<FacebookAdTest[]> => {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (testType) params.append('testType', testType);
    
    const response = await apiClient.get(`/facebook-ads/tests?${params.toString()}`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching ad tests:', error);
    throw error;
  }
};

/**
 * جلب Test واحد
 */
export const getAdTest = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.get(`/facebook-ads/tests/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching ad test:', error);
    throw error;
  }
};

/**
 * إنشاء A/B Test جديد
 */
export const createAdTest = async (data: CreateAdTestData): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post('/facebook-ads/tests', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating ad test:', error);
    throw error;
  }
};

/**
 * تحديث A/B Test
 */
export const updateAdTest = async (id: string, data: Partial<CreateAdTestData>): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.put(`/facebook-ads/tests/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error updating ad test:', error);
    throw error;
  }
};

/**
 * حذف A/B Test
 */
export const deleteAdTest = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/tests/${id}`);
  } catch (error: any) {
    console.error('❌ Error deleting ad test:', error);
    throw error;
  }
};

/**
 * بدء A/B Test
 */
export const startAdTest = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post(`/facebook-ads/tests/${id}/start`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error starting ad test:', error);
    throw error;
  }
};

/**
 * إيقاف A/B Test
 */
export const pauseAdTest = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post(`/facebook-ads/tests/${id}/pause`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error pausing ad test:', error);
    throw error;
  }
};

/**
 * تحليل نتائج A/B Test
 */
export const analyzeAdTest = async (id: string): Promise<{
  test: FacebookAdTest;
  analysis: any;
}> => {
  try {
    const response = await apiClient.post(`/facebook-ads/tests/${id}/analyze`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error analyzing ad test:', error);
    throw error;
  }
};

/**
 * تعزيز الفائز (Promote Winner)
 */
export const promoteWinner = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post(`/facebook-ads/tests/${id}/promote-winner`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error promoting winner:', error);
    throw error;
  }
};

/**
 * جلب نتائج A/B Test
 */
export const getAdTestResults = async (id: string): Promise<{
  test: FacebookAdTest;
  results: FacebookAdTestVariant[];
}> => {
  try {
    const response = await apiClient.get(`/facebook-ads/tests/${id}/results`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching ad test results:', error);
    throw error;
  }
};

/**
 * ============================================
 * v22.0 New Features Functions
 * ============================================
 */

// --- Conversion API (CAPI) ---
export interface ConversionEventData {
  pixelId: string;
  eventName: 'Purchase' | 'Lead' | 'AddToCart' | 'ViewContent' | 'InitiateCheckout' | 'CompleteRegistration' | 'Contact' | 'Subscribe' | string;
  eventSourceUrl?: string;
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
    ipAddress?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    contentIds?: string[];
    contentType?: string;
    contentName?: string;
    contentCategory?: string;
    numItems?: number;
    orderId?: string;
  };
  actionSource?: 'website' | 'app' | 'phone_call' | 'chat' | 'email' | 'physical_store';
}

/**
 * إرسال Conversion Event عبر CAPI
 */
export const sendConversionEvent = async (data: ConversionEventData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/conversions', data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error sending conversion event:', error);
    throw error;
  }
};

// --- Lead Generation ---
export interface LeadFormQuestion {
  type: 'EMAIL' | 'PHONE' | 'FULL_NAME' | 'FIRST_NAME' | 'LAST_NAME' | 'CITY' | 'STATE' | 'ZIP' | 'COUNTRY' | 'CUSTOM';
  key: string;
  label: string;
}

export interface CreateLeadFormData {
  pageId: string;
  name: string;
  questions: LeadFormQuestion[];
  privacyPolicyUrl: string;
  thankYouPage?: {
    title?: string;
    body?: string;
    buttonText?: string;
    buttonType?: string;
    websiteUrl?: string;
  };
}

/**
 * إنشاء Lead Form
 */
export const createLeadForm = async (data: CreateLeadFormData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/lead-forms', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating lead form:', error);
    throw error;
  }
};

/**
 * جلب Leads من Form
 */
export const getLeads = async (formId: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/lead-forms/${formId}/leads`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching leads:', error);
    throw error;
  }
};

// --- Ad Scheduling ---
export interface AdSchedule {
  days: number[]; // 0 = Sunday, 6 = Saturday
  startMinute: number; // 0-1440
  endMinute: number; // 0-1440
  timezoneType?: 'USER' | 'ADVERTISER';
}

/**
 * تحديث جدولة Ad Set
 */
export const updateAdSetSchedule = async (adSetId: string, schedule: AdSchedule[]): Promise<any> => {
  try {
    const response = await apiClient.put(`/facebook-ads/adsets/${adSetId}/schedule`, { schedule });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating ad set schedule:', error);
    throw error;
  }
};

// --- A/B Testing (v22.0 API) ---
export interface CreateABTestData {
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  cells: Array<{
    name: string;
    campaignId?: string;
    adSetId?: string;
    percentage?: number;
  }>;
}

/**
 * إنشاء A/B Test عبر Facebook API
 */
export const createFacebookABTest = async (data: CreateABTestData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/ab-tests', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating A/B test:', error);
    throw error;
  }
};

/**
 * جلب نتائج A/B Test من Facebook
 */
export const getFacebookABTestResults = async (studyId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/facebook-ads/ab-tests/${studyId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching A/B test results:', error);
    throw error;
  }
};

// --- Audiences (v22.0 API) ---
/**
 * جلب Audiences من Facebook API مباشرة
 */
export const getFacebookAudiences = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/audiences');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching audiences:', error);
    throw error;
  }
};

/**
 * إنشاء Custom Audience عبر Facebook API
 */
export const createFacebookCustomAudience = async (data: { name: string; description?: string; subtype?: string }): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/audiences', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating custom audience:', error);
    throw error;
  }
};

/**
 * إضافة مستخدمين لـ Custom Audience
 */
export const addUsersToAudience = async (audienceId: string, users: Array<{ email?: string; phone?: string; firstName?: string; lastName?: string }>): Promise<any> => {
  try {
    const response = await apiClient.post(`/facebook-ads/audiences/${audienceId}/users`, { users });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error adding users to audience:', error);
    throw error;
  }
};

/**
 * إنشاء Lookalike Audience عبر Facebook API
 */
export const createFacebookLookalikeAudience = async (data: { name: string; sourceAudienceId: string; country: string; ratio?: number }): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/audiences/lookalike', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating lookalike audience:', error);
    throw error;
  }
};

// ============================================
// v22.0: Dynamic Creative Optimization
// ============================================
export interface DynamicCreativeData {
  pageId: string;
  name?: string;
  images?: string[];
  videos?: string[];
  titles?: string[];
  bodies?: string[];
  descriptions?: string[];
  callToActions?: string[];
  linkUrls?: string[];
}

export const createDynamicCreative = async (data: DynamicCreativeData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/creatives/dynamic', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating dynamic creative:', error);
    throw error;
  }
};

// ============================================
// v22.0: Advantage+ Shopping
// ============================================
export interface AdvantagePlusShoppingData {
  name: string;
  status?: string;
  budgetType?: 'DAILY' | 'LIFETIME';
  budgetAmount: number;
  catalogId?: string;
  pixelId: string;
  countryTargeting?: string[];
}

export const createAdvantagePlusShoppingCampaign = async (data: AdvantagePlusShoppingData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/campaigns/advantage-plus-shopping', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating Advantage+ Shopping campaign:', error);
    throw error;
  }
};

// ============================================
// v22.0: Async Reports
// ============================================
export interface AsyncReportData {
  level?: 'account' | 'campaign' | 'adset' | 'ad';
  fields?: string[];
  datePreset?: string;
  timeRange?: { since: string; until: string };
  breakdowns?: string[];
  filtering?: any[];
  sorting?: any[];
}

export const createAsyncReport = async (data: AsyncReportData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/reports/async', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating async report:', error);
    throw error;
  }
};

export const getAsyncReportStatus = async (reportRunId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/facebook-ads/reports/async/${reportRunId}/status`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error getting async report status:', error);
    throw error;
  }
};

export const getAsyncReportResults = async (reportRunId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/facebook-ads/reports/async/${reportRunId}/results`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error getting async report results:', error);
    throw error;
  }
};

// ============================================
// v22.0: Creative Formats
// ============================================
export interface CollectionCreativeData {
  pageId: string;
  name?: string;
  instantExperienceId?: string;
  coverImageHash?: string;
  coverVideoId?: string;
  headline?: string;
  primaryText?: string;
  products?: string[];
  catalogId?: string;
  linkUrl?: string;
}

export const createCollectionCreative = async (data: CollectionCreativeData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/creatives/collection', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating collection creative:', error);
    throw error;
  }
};

export interface StoriesReelsCreativeData {
  pageId: string;
  instagramAccountId?: string;
  name?: string;
  videoId: string;
  primaryText?: string;
  linkUrl?: string;
  callToAction?: string;
  format?: 'STORIES' | 'REELS';
}

export const createStoriesReelsCreative = async (data: StoriesReelsCreativeData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/creatives/stories-reels', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating stories/reels creative:', error);
    throw error;
  }
};

export const createInstantExperience = async (data: { pageId: string; name?: string; components?: any[] }): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/instant-experience', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating instant experience:', error);
    throw error;
  }
};

// ============================================
// v22.0: Automation Rules
// ============================================
export interface AutomatedRuleData {
  name: string;
  entityType?: 'CAMPAIGN' | 'ADSET' | 'AD';
  filterField: string;
  filterOperator: string;
  filterValue: any;
  actionType: 'PAUSE' | 'UNPAUSE' | 'CHANGE_BUDGET' | 'CHANGE_BID' | 'SEND_NOTIFICATION';
  actionValue?: any;
  evaluationSpec?: any;
  scheduleSpec?: any;
}

export const getAutomatedRules = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/rules');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error getting automated rules:', error);
    throw error;
  }
};

export const createAutomatedRule = async (data: AutomatedRuleData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/rules', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating automated rule:', error);
    throw error;
  }
};

export const updateAutomatedRule = async (ruleId: string, data: Partial<AutomatedRuleData>): Promise<any> => {
  try {
    const response = await apiClient.put(`/facebook-ads/rules/${ruleId}`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error updating automated rule:', error);
    throw error;
  }
};

export const deleteAutomatedRule = async (ruleId: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/rules/${ruleId}`);
  } catch (error: any) {
    console.error('❌ Error deleting automated rule:', error);
    throw error;
  }
};

// ============================================
// v22.0: Attribution Settings
// ============================================
export interface AttributionSettings {
  attributionWindow?: '1d_click' | '7d_click' | '1d_view' | '7d_click_1d_view';
  useUnifiedAttributionSetting?: boolean;
}

export const updateAttributionSettings = async (adSetId: string, settings: AttributionSettings): Promise<any> => {
  try {
    const response = await apiClient.put(`/facebook-ads/adsets/${adSetId}/attribution`, settings);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error updating attribution settings:', error);
    throw error;
  }
};

// ============================================
// v22.0: Ad Set Management
// ============================================
export interface UpdateAdSetData {
  name?: string;
  status?: string;
  budgetType?: 'DAILY' | 'LIFETIME';
  budgetAmount?: number;
  optimizationGoal?: string;
  bidAmount?: number;
  targeting?: any;
  startTime?: string;
  endTime?: string;
}

export const updateAdSet = async (adSetId: string, data: UpdateAdSetData): Promise<any> => {
  try {
    const response = await apiClient.put(`/facebook-ads/adsets/${adSetId}`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error updating ad set:', error);
    throw error;
  }
};

export const updateFrequencyCap = async (adSetId: string, data: { maxFrequency?: number; intervalDays?: number }): Promise<any> => {
  try {
    const response = await apiClient.put(`/facebook-ads/adsets/${adSetId}/frequency-cap`, data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error updating frequency cap:', error);
    throw error;
  }
};

// ============================================
// v22.0: Advanced Targeting
// ============================================
export const searchTargetingOptions = async (query: string, type?: string): Promise<any[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/targeting/search', { params: { query, type } });
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error searching targeting options:', error);
    throw error;
  }
};

export const getTargetingSuggestions = async (targetingList: any[]): Promise<any[]> => {
  try {
    const response = await apiClient.post('/facebook-ads/targeting/suggestions', { targetingList });
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error getting targeting suggestions:', error);
    throw error;
  }
};

export const getReachEstimate = async (targeting: any): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/targeting/reach-estimate', { targeting });
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error getting reach estimate:', error);
    throw error;
  }
};

// ============================================
// v22.0: Ad Preview
// ============================================
export const getAdPreview = async (adId: string, format?: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/ads/${adId}/preview`, { params: { format } });
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error getting ad preview:', error);
    throw error;
  }
};

export const getCreativePreview = async (creativeId: string, format?: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/creatives/${creativeId}/preview`, { params: { format } });
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error getting creative preview:', error);
    throw error;
  }
};

// ============================================
// v22.0: Saved Audiences
// ============================================
export interface SavedAudienceData {
  name: string;
  description?: string;
  targeting: any;
}

export const getSavedAudiences = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/saved-audiences');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error getting saved audiences:', error);
    throw error;
  }
};

export const createSavedAudience = async (data: SavedAudienceData): Promise<any> => {
  try {
    const response = await apiClient.post('/facebook-ads/saved-audiences', data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error creating saved audience:', error);
    throw error;
  }
};

export const deleteSavedAudience = async (audienceId: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/saved-audiences/${audienceId}`);
  } catch (error: any) {
    console.error('❌ Error deleting saved audience:', error);
    throw error;
  }
};

export const facebookAdsService = {
  // 🚀 Full Ad Creation (Campaign + AdSet + Ad)
  createFullAd,
  
  // Campaigns
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  
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
  
  // Audiences
  getCustomAudiences,
  createCustomAudience,
  getCustomAudience,
  deleteCustomAudience,
  getLookalikeAudiences,
  createLookalikeAudience,
  
  // Catalogs
  getCatalogs,
  createCatalog,
  getCatalog,
  deleteCatalog,
  syncProducts,
  getCatalogProducts,
  
  // Dynamic Ads
  getProductSets,
  createProductSet,
  createDynamicAd,
  
  // A/B Testing
  getAdTests,
  getAdTest,
  createAdTest,
  updateAdTest,
  deleteAdTest,
  startAdTest,
  pauseAdTest,
  analyzeAdTest,
  promoteWinner,
  getAdTestResults,
  
  // Sync
  syncFromFacebook,
  
  // Ad Accounts
  getAdAccounts,
  saveAdAccount,
  getSavedAdAccounts,

  // v22.0: Conversion API
  sendConversionEvent,

  // v22.0: Lead Generation
  createLeadForm,
  getLeads,

  // v22.0: Ad Scheduling
  updateAdSetSchedule,

  // v22.0: A/B Testing (Facebook API)
  createFacebookABTest,
  getFacebookABTestResults,

  // v22.0: Audiences (Facebook API)
  getFacebookAudiences,
  createFacebookCustomAudience,
  addUsersToAudience,
  createFacebookLookalikeAudience,

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
  getAutomatedRules,
  createAutomatedRule,
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
  getSavedAudiences,
  createSavedAudience,
  deleteSavedAudience,
  
  // Constants
  CAMPAIGN_OBJECTIVES,
  CALL_TO_ACTION_TYPES,
  OBJECTIVE_MAPPING,
  ADVANTAGE_CREATIVE_ENHANCEMENTS,
  OPTIMIZATION_GOALS,
};

/**
 * جلب Facebook Pages المتاحة
 */
export const getFacebookPages = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/pages');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching Facebook Pages:', error);
    throw error;
  }
};

/**
 * جلب Facebook Pixels المتاحة
 */
export const getFacebookPixels = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/facebook-ads/pixels');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching Facebook Pixels:', error);
    throw error;
  }
};

export default facebookAdsService;


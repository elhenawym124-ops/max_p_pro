/**
 * 🚀 Create Ad Wizard
 * 
 * صفحة إنشاء إعلان كامل (Campaign + AdSet + Ad)
 * تتبع منطق Facebook Ads Manager الصحيح
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Target,
  DollarSign,
  Users,
  Layout,
  Image,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Calendar,
  Globe,
  Zap,
  Eye,
  Facebook,
  Instagram,
  MessageCircle,
  Search,
  X,
  Heart,
  Smartphone
} from 'lucide-react';
import { facebookAdsService, CreateFullAdData } from '../../services/facebookAdsService';

// ============================================
// Types
// ============================================

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface CarouselCard {
  id: string;
  imageUrl: string;
  headline: string;
  description: string;
  linkUrl: string;
}

interface TextVariation {
  id: string;
  text: string;
}

interface HeadlineVariation {
  id: string;
  text: string;
}

interface FormData {
  // Step 1: Campaign
  campaignName: string;
  objective: string;
  specialAdCategories: string[];
  
  // Step 2: Ad Set Level
  performanceGoal: string;
  conversionEvent: string;
  conversionLocation: string;
  attributionWindow: string;
  dynamicCreative: boolean;
  pixelId: string;
  budgetOptimization: boolean;
  budgetType: 'DAILY' | 'LIFETIME';
  budgetAmount: number;
  bidStrategy: string;
  bidValue?: number;
  startTime: string;
  endTime: string;
  frequencyCap?: number;
  frequencyCapInterval?: 'DAY' | 'WEEK' | 'MONTH';
  
  // Step 3: Targeting
  ageMin: number;
  ageMax: number;
  genders: string[];
  locations: string[];
  interests: string[];
  advantageAudience: boolean;
  
  // Step 4: Placements
  placementType: 'AUTOMATIC' | 'MANUAL';
  placements: string[];
  
  // Step 5: Ad Creative
  pageId: string;
  creativeType: 'SINGLE_IMAGE' | 'SINGLE_VIDEO' | 'CAROUSEL' | 'FLEXIBLE';
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  linkUrl: string;
  displayLink: string;
  urlParameters: string;
  imageUrl: string;
  videoUrl: string;
  carouselCards: CarouselCard[];
  flexibleAssets: { id: string; type: 'IMAGE' | 'VIDEO'; url: string }[];
  textVariations: TextVariation[];
  headlineVariations: HeadlineVariation[];
  useLeadForm: boolean;
  leadFormId?: string;
  
  // Advantage+ Creative
  advantageCreative: boolean;
  textGeneration: boolean;
  imageEnhancement: boolean;
  
  // Status
  status: 'ACTIVE' | 'PAUSED';
}

// ============================================
// Constants
// ============================================

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'هدف الحملة', description: 'اختر هدف حملتك الإعلانية', icon: <Target className="w-5 h-5" /> },
  { id: 2, title: 'الميزانية والجدولة', description: 'حدد ميزانيتك ومواعيد الإعلان', icon: <DollarSign className="w-5 h-5" /> },
  { id: 3, title: 'الاستهداف', description: 'حدد جمهورك المستهدف', icon: <Users className="w-5 h-5" /> },
  { id: 4, title: 'المواضع', description: 'اختر أين يظهر إعلانك', icon: <Layout className="w-5 h-5" /> },
  { id: 5, title: 'المحتوى الإبداعي', description: 'أنشئ إعلانك', icon: <Image className="w-5 h-5" /> },
  { id: 6, title: 'المراجعة والنشر', description: 'راجع وانشر إعلانك', icon: <CheckCircle className="w-5 h-5" /> }
];

const OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'الوعي', description: 'زيادة الوعي بعلامتك التجارية', icon: <Eye className="w-6 h-6" /> },
  { value: 'OUTCOME_TRAFFIC', label: 'الزيارات', description: 'زيادة زيارات موقعك', icon: <Globe className="w-6 h-6" /> },
  { value: 'OUTCOME_ENGAGEMENT', label: 'التفاعل', description: 'زيادة التفاعل مع منشوراتك', icon: <Users className="w-6 h-6" /> },
  { value: 'OUTCOME_LEADS', label: 'العملاء المحتملين', description: 'جمع بيانات العملاء', icon: <Target className="w-6 h-6" /> },
  { value: 'OUTCOME_SALES', label: 'المبيعات', description: 'زيادة المبيعات والتحويلات', icon: <DollarSign className="w-6 h-6" /> },
  { value: 'OUTCOME_APP_PROMOTION', label: 'ترويج التطبيق', description: 'زيادة تحميلات التطبيق', icon: <Zap className="w-6 h-6" /> }
];

const SPECIAL_AD_CATEGORIES = [
  { value: 'NONE', label: 'لا شيء' },
  { value: 'HOUSING', label: 'إسكان' },
  { value: 'EMPLOYMENT', label: 'توظيف' },
  { value: 'CREDIT', label: 'ائتمان' },
  { value: 'ISSUES_ELECTIONS_POLITICS', label: 'قضايا اجتماعية أو سياسية' }
];

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'أقل تكلفة', description: 'الحصول على أكبر عدد من النتائج بأقل تكلفة' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'حد أقصى للمزايدة', description: 'التحكم في الحد الأقصى للمزايدة' },
  { value: 'COST_CAP', label: 'حد التكلفة', description: 'الحفاظ على متوسط تكلفة محدد' }
];

const CALL_TO_ACTIONS = [
  { value: 'LEARN_MORE', label: 'معرفة المزيد' },
  { value: 'SHOP_NOW', label: 'تسوق الآن' },
  { value: 'SIGN_UP', label: 'سجل الآن' },
  { value: 'CONTACT_US', label: 'تواصل معنا' },
  { value: 'DOWNLOAD', label: 'تحميل' },
  { value: 'GET_OFFER', label: 'احصل على العرض' },
  { value: 'BOOK_NOW', label: 'احجز الآن' },
  { value: 'SEND_MESSAGE', label: 'أرسل رسالة' }
];

const PLACEMENTS = [
  { id: 'FACEBOOK_FEED', label: 'Facebook Feed', platform: 'facebook', icon: <Facebook className="w-4 h-4" /> },
  { id: 'FACEBOOK_STORIES', label: 'Facebook Stories', platform: 'facebook', icon: <Facebook className="w-4 h-4" /> },
  { id: 'FACEBOOK_REELS', label: 'Facebook Reels', platform: 'facebook', icon: <Facebook className="w-4 h-4" /> },
  { id: 'FACEBOOK_INSTREAM', label: 'Facebook In-Stream Videos', platform: 'facebook', icon: <Facebook className="w-4 h-4" /> },
  { id: 'INSTAGRAM_FEED', label: 'Instagram Feed', platform: 'instagram', icon: <Instagram className="w-4 h-4" /> },
  { id: 'INSTAGRAM_STORIES', label: 'Instagram Stories', platform: 'instagram', icon: <Instagram className="w-4 h-4" /> },
  { id: 'INSTAGRAM_REELS', label: 'Instagram Reels', platform: 'instagram', icon: <Instagram className="w-4 h-4" /> },
  { id: 'INSTAGRAM_EXPLORE', label: 'Instagram Explore', platform: 'instagram', icon: <Instagram className="w-4 h-4" /> },
  { id: 'MESSENGER_INBOX', label: 'Messenger Inbox', platform: 'messenger', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'MESSENGER_STORIES', label: 'Messenger Stories', platform: 'messenger', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'AUDIENCE_NETWORK', label: 'Audience Network', platform: 'network', icon: <Globe className="w-4 h-4" /> }
];

const COUNTRIES = [
  { code: 'EG', name: 'مصر' },
  { code: 'SA', name: 'السعودية' },
  { code: 'AE', name: 'الإمارات' },
  { code: 'KW', name: 'الكويت' },
  { code: 'QA', name: 'قطر' },
  { code: 'BH', name: 'البحرين' },
  { code: 'OM', name: 'عمان' },
  { code: 'JO', name: 'الأردن' },
  { code: 'LB', name: 'لبنان' },
  { code: 'MA', name: 'المغرب' }
];

const INTEREST_CATEGORIES = [
  { name: 'التسوق', query: 'shopping', icon: '🛍️' },
  { name: 'الموضة', query: 'fashion', icon: '👗' },
  { name: 'التكنولوجيا', query: 'technology', icon: '💻' },
  { name: 'الرياضة', query: 'sports', icon: '⚽' },
  { name: 'السفر', query: 'travel', icon: '✈️' },
  { name: 'الطعام', query: 'food', icon: '🍔' },
  { name: 'الصحة', query: 'health', icon: '💪' },
  { name: 'الأعمال', query: 'business', icon: '💼' },
  { name: 'الترفيه', query: 'entertainment', icon: '🎬' },
  { name: 'الجمال', query: 'beauty', icon: '💄' }
];

const RELATIONSHIP_OPTIONS = [
  { value: 1, label: 'أعزب/عزباء' },
  { value: 2, label: 'في علاقة' },
  { value: 3, label: 'مخطوب/ة' },
  { value: 4, label: 'متزوج/ة' }
];

const LANGUAGES = [
  { id: 6, name: 'العربية' },
  { id: 24, name: 'الإنجليزية' },
  { id: 10, name: 'الفرنسية' },
  { id: 25, name: 'التركية' }
];

const DEVICE_PLATFORMS = [
  { value: 'iOS', label: 'iOS', icon: '📱' },
  { value: 'Android', label: 'Android', icon: '🤖' }
];

const EDUCATION_LEVELS = [
  { value: 1, label: 'ثانوية عامة' },
  { value: 2, label: 'بعض الكلية' },
  { value: 3, label: 'درجة جامعية' },
  { value: 4, label: 'ماجستير' },
  { value: 5, label: 'دكتوراه' }
];

const JOB_TITLES = [
  { value: 'business_owner', label: 'صاحب عمل' },
  { value: 'manager', label: 'مدير' },
  { value: 'engineer', label: 'مهندس' },
  { value: 'doctor', label: 'طبيب' },
  { value: 'teacher', label: 'معلم' },
  { value: 'sales', label: 'مبيعات' },
  { value: 'marketing', label: 'تسويق' },
  { value: 'student', label: 'طالب' }
];

const BEHAVIORS = [
  { id: 'travel_frequent', name: 'مسافرون متكررون', category: 'السفر' },
  { id: 'online_shoppers', name: 'متسوقون عبر الإنترنت', category: 'التسوق' },
  { id: 'tech_early_adopters', name: 'متبنو التكنولوجيا المبكرون', category: 'التكنولوجيا' },
  { id: 'mobile_device_users', name: 'مستخدمو الأجهزة المحمولة', category: 'الأجهزة' },
  { id: 'gamers', name: 'اللاعبون', category: 'الترفيه' },
  { id: 'small_business_owners', name: 'أصحاب الأعمال الصغيرة', category: 'الأعمال' }
];

const INCOME_LEVELS = [
  { value: 'top_5', label: 'أعلى 5%' },
  { value: 'top_10', label: 'أعلى 10%' },
  { value: 'top_25', label: 'أعلى 25%' },
  { value: 'top_50', label: 'أعلى 50%' }
];

const LIFE_EVENTS = [
  { id: 'anniversary_1year', name: 'الذكرى السنوية الأولى', category: 'علاقات' },
  { id: 'engaged_1year', name: 'مخطوبون (سنة واحدة)', category: 'علاقات' },
  { id: 'newlywed_1year', name: 'متزوجون حديثاً (سنة واحدة)', category: 'علاقات' },
  { id: 'recently_moved', name: 'انتقلوا مؤخراً', category: 'حياة' },
  { id: 'new_job', name: 'وظيفة جديدة', category: 'عمل' },
  { id: 'birthday', name: 'عيد ميلاد قريب', category: 'احتفالات' }
];

const PARENTS_OPTIONS = [
  { id: 'expecting_parent', name: 'آباء متوقعون', age: 'جميع الأعمار' },
  { id: 'new_parents', name: 'آباء جدد (0-12 شهر)', age: '0-12 شهر' },
  { id: 'parents_toddler', name: 'آباء أطفال صغار', age: '1-2 سنة' },
  { id: 'parents_preschooler', name: 'آباء أطفال ما قبل المدرسة', age: '3-5 سنوات' },
  { id: 'parents_teen', name: 'آباء مراهقين', age: '13-18 سنة' }
];

const PERFORMANCE_GOALS = [
  { value: 'MAXIMIZE_CONVERSIONS', label: 'زيادة عدد التحويلات', description: 'احصل على أكبر عدد من التحويلات' },
  { value: 'MAXIMIZE_CONVERSION_VALUE', label: 'زيادة قيمة التحويلات', description: 'احصل على أعلى قيمة إجمالية' },
  { value: 'MAXIMIZE_ROAS', label: 'زيادة عائد الإنفاق', description: 'احصل على أفضل عائد على الاستثمار' }
];

const CONVERSION_EVENTS = [
  { value: 'PURCHASE', label: 'شراء (Purchase)', icon: '🛒', description: 'عند إتمام عملية شراء' },
  { value: 'ADD_TO_CART', label: 'إضافة للسلة', icon: '🛍️', description: 'عند إضافة منتج للسلة' },
  { value: 'INITIATE_CHECKOUT', label: 'بدء الدفع', icon: '💳', description: 'عند بدء عملية الدفع' },
  { value: 'VIEW_CONTENT', label: 'مشاهدة المحتوى', icon: '👁️', description: 'عند مشاهدة صفحة منتج' },
  { value: 'LEAD', label: 'عميل محتمل', icon: '📝', description: 'عند ملء نموذج' },
  { value: 'COMPLETE_REGISTRATION', label: 'تسجيل', icon: '✅', description: 'عند إتمام التسجيل' }
];

const CONVERSION_LOCATIONS = [
  { value: 'WEBSITE', label: 'الموقع الإلكتروني', icon: '🌐' },
  { value: 'APP', label: 'التطبيق', icon: '📱' },
  { value: 'MESSENGER', label: 'Messenger', icon: '💬' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: '📞' }
];

const ATTRIBUTION_WINDOWS = [
  { value: '7d_click_1d_view', label: '7 أيام نقر + يوم مشاهدة', description: 'الافتراضي - موصى به' },
  { value: '1d_click_1d_view', label: 'يوم نقر + يوم مشاهدة', description: 'لدورة شراء قصيرة' },
  { value: '7d_click', label: '7 أيام نقر فقط', description: 'بدون تتبع المشاهدة' },
  { value: '1d_click', label: 'يوم نقر فقط', description: 'تتبع دقيق جداً' }
];

interface TargetingOption {
  id: string;
  name: string;
  audience_size?: number;
}

// ============================================
// Component
// ============================================

const CreateAdWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Advanced Targeting State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TargetingOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<TargetingOption[]>([]);
  const [relationshipStatuses, setRelationshipStatuses] = useState<number[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [showAdvancedTargeting, setShowAdvancedTargeting] = useState(false);
  
  // Audiences State
  const [customAudiences, setCustomAudiences] = useState<any[]>([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<any[]>([]);
  const [selectedCustomAudiences, setSelectedCustomAudiences] = useState<string[]>([]);
  const [selectedLookalikeAudiences, setSelectedLookalikeAudiences] = useState<string[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(false);
  
  // Detailed Demographics State
  const [selectedEducation, setSelectedEducation] = useState<number[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectedIncome, setSelectedIncome] = useState<string[]>([]);
  const [selectedLifeEvents, setSelectedLifeEvents] = useState<string[]>([]);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [excludedAudiences, setExcludedAudiences] = useState<string[]>([]);
  
  // Pages & Pixels State
  const [facebookPages, setFacebookPages] = useState<any[]>([]);
  const [facebookPixels, setFacebookPixels] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPixels, setLoadingPixels] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    // Step 1
    campaignName: '',
    objective: '',
    specialAdCategories: [],
    
    // Step 2 - Ad Set Level
    performanceGoal: 'MAXIMIZE_CONVERSIONS',
    conversionEvent: 'PURCHASE',
    conversionLocation: 'WEBSITE',
    attributionWindow: '7d_click_1d_view',
    dynamicCreative: false,
    pixelId: '',
    budgetOptimization: true,
    budgetType: 'DAILY',
    budgetAmount: 10,
    bidStrategy: 'LOWEST_COST',
    bidValue: undefined,
    startTime: '',
    endTime: '',
    frequencyCap: undefined,
    frequencyCapInterval: undefined,
    
    // Step 3
    ageMin: 18,
    ageMax: 65,
    genders: [],
    locations: ['EG'],
    interests: [],
    advantageAudience: false,
    
    // Step 4
    placementType: 'AUTOMATIC',
    placements: [],
    
    // Step 5
    pageId: '',
    creativeType: 'SINGLE_IMAGE',
    primaryText: '',
    headline: '',
    description: '',
    callToAction: 'LEARN_MORE',
    linkUrl: '',
    displayLink: '',
    urlParameters: '',
    imageUrl: '',
    videoUrl: '',
    carouselCards: [],
    flexibleAssets: [],
    textVariations: [],
    headlineVariations: [],
    useLeadForm: false,
    leadFormId: undefined,
    advantageCreative: false,
    textGeneration: false,
    imageEnhancement: false,
    
    // Status
    status: 'PAUSED'
  });

  // ============================================
  // Validation
  // ============================================
  
  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    switch (step) {
      case 1:
        if (!formData.campaignName.trim()) {
          newErrors['campaignName'] = 'اسم الحملة مطلوب';
        }
        if (!formData.objective) {
          newErrors['objective'] = 'هدف الحملة مطلوب';
        }
        break;
        
      case 2:
        if (!formData.budgetAmount || formData.budgetAmount < 1) {
          newErrors['budgetAmount'] = 'الميزانية يجب أن تكون أكبر من 0';
        }
        break;
        
      case 3:
        if (formData.locations.length === 0) {
          newErrors['locations'] = 'يجب اختيار موقع واحد على الأقل';
        }
        if (formData.ageMin < 13 || formData.ageMax > 65) {
          newErrors['age'] = 'العمر يجب أن يكون بين 13 و 65';
        }
        break;
        
      case 4:
        if (formData.placementType === 'MANUAL' && formData.placements.length === 0) {
          newErrors['placements'] = 'يجب اختيار موضع واحد على الأقل';
        }
        break;
        
      case 5:
        if (!formData.pageId.trim()) {
          newErrors['pageId'] = 'معرف الصفحة مطلوب';
        }
        if (!formData.primaryText.trim()) {
          newErrors['primaryText'] = 'النص الأساسي مطلوب';
        }
        if (!formData.linkUrl.trim()) {
          newErrors['linkUrl'] = 'رابط الوجهة مطلوب';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================
  // Handlers
  // ============================================
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const fieldKey = field as string;
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: '' }));
    }
  };
  
  const toggleArrayValue = (field: keyof FormData, value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    handleChange(field, newArray);
  };

  // Search for interests
  const handleSearchInterests = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const results = await facebookAdsService.searchTargetingOptions(query, 'adinterest');
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const addInterest = (interest: TargetingOption) => {
    if (!selectedInterests.find(i => i.id === interest.id)) {
      setSelectedInterests(prev => [...prev, interest]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeInterest = (id: string) => {
    setSelectedInterests(prev => prev.filter(i => i.id !== id));
  };

  const toggleRelationshipStatus = (value: number) => {
    setRelationshipStatuses(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleLanguage = (id: number) => {
    setSelectedLanguages(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleDevice = (value: string) => {
    setSelectedDevices(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // Load audiences, pages, and pixels on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingAudiences(true);
        setLoadingPages(true);
        setLoadingPixels(true);
        
        const [custom, lookalike, pages, pixels] = await Promise.all([
          facebookAdsService.getCustomAudiences(),
          facebookAdsService.getLookalikeAudiences(),
          facebookAdsService.getFacebookPages(),
          facebookAdsService.getFacebookPixels()
        ]);
        
        setCustomAudiences(custom || []);
        setLookalikeAudiences(lookalike || []);
        setFacebookPages(pages || []);
        setFacebookPixels(pixels || []);
        
        // Auto-select first page and pixel if available
        if (pages && pages.length > 0 && !formData.pageId) {
          handleChange('pageId', pages[0].id);
        }
        if (pixels && pixels.length > 0 && !formData.pixelId) {
          handleChange('pixelId', pixels[0].id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingAudiences(false);
        setLoadingPages(false);
        setLoadingPixels(false);
      }
    };
    loadData();
  }, []);

  const toggleCustomAudience = (id: string) => {
    setSelectedCustomAudiences(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleLookalikeAudience = (id: string) => {
    setSelectedLookalikeAudiences(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;
    
    try {
      setLoading(true);
      
      const data: CreateFullAdData = {
        // Campaign
        campaignName: formData.campaignName,
        objective: formData.objective,
        specialAdCategories: formData.specialAdCategories.filter(c => c !== 'NONE'),
        
        // Ad Set Level - الميزات الجديدة
        performanceGoal: formData.performanceGoal,
        conversionEvent: formData.conversionEvent,
        conversionLocation: formData.conversionLocation,
        attributionWindow: formData.attributionWindow,
        dynamicCreative: formData.dynamicCreative,
        pixelId: formData.pixelId,
        
        // Budget
        budgetOptimization: formData.budgetOptimization,
        budgetType: formData.budgetType,
        budgetAmount: formData.budgetAmount,
        bidStrategy: formData.bidStrategy,
        ...(formData.bidValue && { bidValue: formData.bidValue }),
        ...(formData.frequencyCap && { frequencyCap: formData.frequencyCap }),
        ...(formData.frequencyCapInterval && { frequencyCapInterval: formData.frequencyCapInterval }),
        
        // Schedule
        ...(formData.startTime && { startTime: formData.startTime }),
        ...(formData.endTime && { endTime: formData.endTime }),
        
        // Targeting
        targeting: {
          ageMin: formData.ageMin,
          ageMax: formData.ageMax,
          ...(formData.genders.length > 0 && { genders: formData.genders }),
          locations: formData.locations,
          ...(formData.interests.length > 0 && { interests: formData.interests.map(i => ({ id: i, name: i })) }),
          advantageAudience: formData.advantageAudience
        },
        
        // Placements
        placementType: formData.placementType,
        ...(formData.placementType === 'MANUAL' && formData.placements.length > 0 && { placements: formData.placements }),
        
        // Creative
        pageId: formData.pageId,
        creativeType: formData.creativeType,
        primaryText: formData.primaryText,
        ...(formData.headline && { headline: formData.headline }),
        ...(formData.description && { description: formData.description }),
        callToAction: formData.callToAction,
        linkUrl: formData.linkUrl,
        ...(formData.displayLink && { displayLink: formData.displayLink }),
        ...(formData.urlParameters && { urlParameters: formData.urlParameters }),
        ...(formData.creativeType === 'SINGLE_IMAGE' && formData.imageUrl && { imageUrl: formData.imageUrl }),
        ...(formData.creativeType === 'SINGLE_VIDEO' && formData.videoUrl && { videoUrl: formData.videoUrl }),
        ...(formData.creativeType === 'CAROUSEL' && formData.carouselCards.length > 0 && { carouselCards: formData.carouselCards }),
        ...(formData.creativeType === 'FLEXIBLE' && formData.flexibleAssets.length > 0 && { flexibleAssets: formData.flexibleAssets }),
        ...(formData.textVariations.length > 0 && { textVariations: formData.textVariations }),
        ...(formData.headlineVariations.length > 0 && { headlineVariations: formData.headlineVariations }),
        ...(formData.useLeadForm && formData.leadFormId && { leadFormId: formData.leadFormId }),
        
        // Advantage+ Creative
        advantageCreative: formData.advantageCreative,
        textGeneration: formData.textGeneration,
        imageEnhancement: formData.imageEnhancement,
        
        // Status
        status: formData.status
      };
      
      const result = await facebookAdsService.createFullAd(data);
      
      if (result.success) {
        toast.success('تم إنشاء الإعلان بنجاح! 🎉');
        navigate('/advertising/facebook-ads');
      } else {
        toast.error(result.error || 'فشل في إنشاء الإعلان');
      }
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(error?.response?.data?.error || 'حدث خطأ أثناء إنشاء الإعلان');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Render Steps
  // ============================================
  
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          اسم الحملة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.campaignName}
          onChange={(e) => handleChange('campaignName', e.target.value)}
          placeholder="مثال: حملة رمضان 2024"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            errors.campaignName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.campaignName && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.campaignName}
          </p>
        )}
      </div>
      
      {/* Objective */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          هدف الحملة <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              type="button"
              onClick={() => handleChange('objective', obj.value)}
              className={`p-4 border-2 rounded-xl text-center transition-all ${
                formData.objective === obj.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <div className={`mx-auto mb-2 ${formData.objective === obj.value ? 'text-blue-500' : 'text-gray-400'}`}>
                {obj.icon}
              </div>
              <div className="font-medium">{obj.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{obj.description}</div>
            </button>
          ))}
        </div>
        {errors.objective && (
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.objective}
          </p>
        )}
      </div>
      
      {/* Special Ad Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          فئة الإعلان الخاصة
        </label>
        <select
          value={formData.specialAdCategories[0] || 'NONE'}
          onChange={(e) => handleChange('specialAdCategories', e.target.value === 'NONE' ? [] : [e.target.value])}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {SPECIAL_AD_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          إذا كان إعلانك يتعلق بالإسكان أو التوظيف أو الائتمان، يجب تحديد الفئة المناسبة
        </p>
      </div>

      {/* Conversion Events - للأهداف التي تحتاج تتبع */}
      {(formData.objective === 'OUTCOME_SALES' || formData.objective === 'OUTCOME_LEADS') && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            حدث التحويل
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            اختر الحدث الذي تريد تتبعه وتحسين الإعلان من أجله
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'PURCHASE', label: 'شراء', icon: '🛒' },
              { value: 'ADD_TO_CART', label: 'إضافة للسلة', icon: '🛍️' },
              { value: 'LEAD', label: 'عميل محتمل', icon: '📝' },
              { value: 'COMPLETE_REGISTRATION', label: 'تسجيل', icon: '✅' },
              { value: 'CONTACT', label: 'تواصل', icon: '📞' },
              { value: 'SUBSCRIBE', label: 'اشتراك', icon: '📧' }
            ].map((event) => (
              <button
                key={event.value}
                type="button"
                className="p-3 bg-white border-2 border-green-300 rounded-lg hover:border-green-500 transition-colors text-right"
              >
                <span className="text-xl ml-2">{event.icon}</span>
                <span className="text-sm font-medium">{event.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 تأكد من تثبيت Facebook Pixel على موقعك لتتبع هذه الأحداث
          </p>
        </div>
      )}
    </div>
  );
  
  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Performance Goal - للمبيعات فقط */}
      {(formData.objective === 'OUTCOME_SALES' || formData.objective === 'OUTCOME_LEADS') && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            هدف الأداء (Performance Goal)
          </h4>
          <div className="space-y-3">
            {PERFORMANCE_GOALS.map((goal) => (
              <label
                key={goal.value}
                className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.performanceGoal === goal.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="performanceGoal"
                  value={goal.value}
                  checked={formData.performanceGoal === goal.value}
                  onChange={(e) => handleChange('performanceGoal', e.target.value)}
                  className="mt-1 text-green-600"
                />
                <div className="mr-3">
                  <div className="font-medium text-gray-900">{goal.label}</div>
                  <div className="text-sm text-gray-500">{goal.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Facebook Pixel Selection */}
      {(formData.objective === 'OUTCOME_SALES' || formData.objective === 'OUTCOME_LEADS') && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Facebook Pixel <span className="text-red-500">*</span>
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            اختر البكسل لتتبع التحويلات على موقعك
          </p>
          {loadingPixels ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">جاري تحميل البكسلات...</span>
            </div>
          ) : facebookPixels.length > 0 ? (
            <select
              value={formData.pixelId}
              onChange={(e) => handleChange('pixelId', e.target.value)}
              className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">اختر البكسل</option>
              {facebookPixels.map((pixel) => (
                <option key={pixel.id} value={pixel.id}>
                  {pixel.name} (ID: {pixel.id})
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ لا توجد بكسلات متاحة. يرجى إنشاء بكسل من إعدادات Facebook Business Manager.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Conversion Event & Location */}
      {(formData.objective === 'OUTCOME_SALES' || formData.objective === 'OUTCOME_LEADS') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conversion Event */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              حدث التحويل
            </h4>
            <select
              value={formData.conversionEvent}
              onChange={(e) => handleChange('conversionEvent', e.target.value)}
              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CONVERSION_EVENTS.map((event) => (
                <option key={event.value} value={event.value}>
                  {event.icon} {event.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-2">
              {CONVERSION_EVENTS.find(e => e.value === formData.conversionEvent)?.description}
            </p>
          </div>

          {/* Conversion Location */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              موقع التحويل
            </h4>
            <select
              value={formData.conversionLocation}
              onChange={(e) => handleChange('conversionLocation', e.target.value)}
              className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {CONVERSION_LOCATIONS.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.icon} {location.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Attribution Window */}
      {(formData.objective === 'OUTCOME_SALES' || formData.objective === 'OUTCOME_LEADS') && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            نافذة الإحالة (Attribution Window)
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            المدة الزمنية التي يُنسب فيها التحويل إلى إعلانك
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ATTRIBUTION_WINDOWS.map((window) => (
              <label
                key={window.value}
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.attributionWindow === window.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="attributionWindow"
                  value={window.value}
                  checked={formData.attributionWindow === window.value}
                  onChange={(e) => handleChange('attributionWindow', e.target.value)}
                  className="mt-1 text-orange-600"
                />
                <div className="mr-3">
                  <div className="font-medium text-sm text-gray-900">{window.label}</div>
                  <div className="text-xs text-gray-500">{window.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Creative */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              المحتوى الديناميكي (Dynamic Creative)
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              اختبار تلقائي لتركيبات مختلفة من الصور والنصوص والعناوين
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.dynamicCreative}
              onChange={(e) => handleChange('dynamicCreative', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>
      </div>

      {/* Budget Optimization (CBO) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              تحسين ميزانية الحملة (CBO)
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              دع Facebook يوزع الميزانية تلقائياً على المجموعات الإعلانية الأفضل أداءً
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.budgetOptimization}
              onChange={(e) => handleChange('budgetOptimization', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      
      {/* Budget Type & Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">نوع الميزانية</label>
          <select
            value={formData.budgetType}
            onChange={(e) => handleChange('budgetType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="DAILY">يومية</option>
            <option value="LIFETIME">إجمالية</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المبلغ (USD) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={formData.budgetAmount}
            onChange={(e) => handleChange('budgetAmount', parseFloat(e.target.value) || 0)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.budgetAmount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.budgetAmount && (
            <p className="mt-1 text-sm text-red-500">{errors.budgetAmount}</p>
          )}
        </div>
      </div>
      
      {/* Bid Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">استراتيجية المزايدة</label>
        <div className="space-y-3">
          {BID_STRATEGIES.map((strategy) => (
            <label
              key={strategy.value}
              className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                formData.bidStrategy === strategy.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="bidStrategy"
                value={strategy.value}
                checked={formData.bidStrategy === strategy.value}
                onChange={(e) => handleChange('bidStrategy', e.target.value)}
                className="mt-1 text-blue-600"
              />
              <div className="mr-3">
                <div className="font-medium">{strategy.label}</div>
                <div className="text-sm text-gray-500">{strategy.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      
      {/* Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          الجدولة (اختياري)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">تاريخ البدء</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">تاريخ الانتهاء</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Advantage+ Audience */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Advantage+ Audience
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              دع Facebook يجد أفضل جمهور لإعلانك تلقائياً باستخدام الذكاء الاصطناعي
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.advantageAudience}
              onChange={(e) => handleChange('advantageAudience', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>
      
      {/* Age Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">الفئة العمرية</label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">من</label>
            <select
              value={formData.ageMin}
              onChange={(e) => handleChange('ageMin', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 53 }, (_, i) => i + 13).map(age => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
          </div>
          <span className="text-gray-400 mt-6">—</span>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">إلى</label>
            <select
              value={formData.ageMax}
              onChange={(e) => handleChange('ageMax', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 53 }, (_, i) => i + 13).map(age => (
                <option key={age} value={age}>{age}+</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">الجنس</label>
        <div className="flex gap-4">
          {[
            { value: '', label: 'الكل' },
            { value: '1', label: 'ذكور' },
            { value: '2', label: 'إناث' }
          ].map((gender) => (
            <button
              key={gender.value}
              type="button"
              onClick={() => handleChange('genders', gender.value ? [gender.value] : [])}
              className={`flex-1 py-3 px-4 border-2 rounded-xl font-medium transition-all ${
                (formData.genders.length === 0 && gender.value === '') ||
                (formData.genders.includes(gender.value) && gender.value !== '')
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {gender.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Locations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          المواقع <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => toggleArrayValue('locations', country.code)}
              className={`py-2 px-3 border-2 rounded-lg text-sm font-medium transition-all ${
                formData.locations.includes(country.code)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {country.name}
            </button>
          ))}
        </div>
        {errors.locations && (
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.locations}
          </p>
        )}
      </div>

      {/* Advanced Targeting Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvancedTargeting(!showAdvancedTargeting)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <Heart className="w-4 h-4" />
          {showAdvancedTargeting ? 'إخفاء الاستهداف المتقدم' : 'إظهار الاستهداف المتقدم (الاهتمامات، اللغات، الأجهزة...)'}
        </button>
      </div>

      {/* Advanced Targeting Options */}
      {showAdvancedTargeting && (
        <div className="space-y-6 bg-gray-50 p-4 rounded-xl">
          {/* Interests Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              الاهتمامات
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchInterests(e.target.value);
                }}
                placeholder="ابحث عن اهتمام (مثال: تسوق، موضة، تقنية...)"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {searchLoading && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-white">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => addInterest(result)}
                    className="w-full px-4 py-2 text-right hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                  >
                    <span className="text-sm">{result.name}</span>
                    {result.audience_size && (
                      <span className="text-xs text-gray-500">
                        {(result.audience_size / 1000000).toFixed(1)}M
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Interests */}
            {selectedInterests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedInterests.map((interest) => (
                  <span
                    key={interest.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm"
                  >
                    {interest.name}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest.id)}
                      className="p-0.5 hover:bg-pink-200 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Categories */}
            <div className="mt-3 flex flex-wrap gap-2">
              {INTEREST_CATEGORIES.map((cat) => (
                <button
                  key={cat.query}
                  type="button"
                  onClick={() => {
                    setSearchQuery(cat.query);
                    handleSearchInterests(cat.query);
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm flex items-center gap-1"
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة الاجتماعية</label>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => toggleRelationshipStatus(status.value)}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    relationshipStatuses.includes(status.value)
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              اللغات
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => toggleLanguage(lang.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedLanguages.includes(lang.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Devices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-500" />
              نظام التشغيل
            </label>
            <div className="flex gap-3">
              {DEVICE_PLATFORMS.map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => toggleDevice(platform.value)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    selectedDevices.includes(platform.value)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-xl ml-2">{platform.icon}</span>
                  {platform.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {selectedDevices.length === 0 ? 'الكل (افتراضي)' : `محدد: ${selectedDevices.join(', ')}`}
            </p>
          </div>

          {/* Detailed Demographics */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              الديموغرافيا التفصيلية
            </h4>

            <div className="space-y-4">
              {/* Education */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المستوى التعليمي</label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVELS.map((edu) => (
                    <button
                      key={edu.value}
                      type="button"
                      onClick={() => {
                        setSelectedEducation(prev =>
                          prev.includes(edu.value) ? prev.filter(e => e !== edu.value) : [...prev, edu.value]
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedEducation.includes(edu.value)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {edu.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Titles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المسمى الوظيفي</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TITLES.map((job) => (
                    <button
                      key={job.value}
                      type="button"
                      onClick={() => {
                        setSelectedJobs(prev =>
                          prev.includes(job.value) ? prev.filter(j => j !== job.value) : [...prev, job.value]
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedJobs.includes(job.value)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {job.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Income */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">مستوى الدخل</label>
                <div className="flex flex-wrap gap-2">
                  {INCOME_LEVELS.map((income) => (
                    <button
                      key={income.value}
                      type="button"
                      onClick={() => {
                        setSelectedIncome(prev =>
                          prev.includes(income.value) ? prev.filter(i => i !== income.value) : [...prev, income.value]
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedIncome.includes(income.value)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {income.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Behaviors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السلوكيات</label>
                <div className="grid grid-cols-2 gap-2">
                  {BEHAVIORS.map((behavior) => (
                    <button
                      key={behavior.id}
                      type="button"
                      onClick={() => {
                        setSelectedBehaviors(prev =>
                          prev.includes(behavior.id) ? prev.filter(b => b !== behavior.id) : [...prev, behavior.id]
                        );
                      }}
                      className={`p-3 rounded-lg border text-right transition-colors ${
                        selectedBehaviors.includes(behavior.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className="text-sm font-medium">{behavior.name}</p>
                      <p className="text-xs text-gray-500">{behavior.category}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Life Events */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أحداث الحياة</label>
                <div className="grid grid-cols-2 gap-2">
                  {LIFE_EVENTS.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setSelectedLifeEvents(prev =>
                          prev.includes(event.id) ? prev.filter(e => e !== event.id) : [...prev, event.id]
                        );
                      }}
                      className={`p-3 rounded-lg border text-right transition-colors ${
                        selectedLifeEvents.includes(event.id)
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="text-xs text-gray-500">{event.category}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الآباء</label>
                <div className="space-y-2">
                  {PARENTS_OPTIONS.map((parent) => (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => {
                        setSelectedParents(prev =>
                          prev.includes(parent.id) ? prev.filter(p => p !== parent.id) : [...prev, parent.id]
                        );
                      }}
                      className={`w-full p-3 rounded-lg border text-right transition-colors ${
                        selectedParents.includes(parent.id)
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className="text-sm font-medium">{parent.name}</p>
                      <p className="text-xs text-gray-500">{parent.age}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Custom & Lookalike Audiences */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              الجماهير المخصصة والمشابهة
            </h4>
            
            {loadingAudiences ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">جاري تحميل الجماهير...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Custom Audiences */}
                {customAudiences.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الجماهير المخصصة ({customAudiences.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {customAudiences.map((audience) => (
                        <label
                          key={audience.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomAudiences.includes(audience.id)}
                            onChange={() => toggleCustomAudience(audience.id)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{audience.name}</p>
                            <p className="text-xs text-gray-500">
                              {audience.audienceSize?.toLocaleString() || 0} شخص
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lookalike Audiences */}
                {lookalikeAudiences.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الجماهير المشابهة ({lookalikeAudiences.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {lookalikeAudiences.map((audience) => (
                        <label
                          key={audience.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLookalikeAudiences.includes(audience.id)}
                            onChange={() => toggleLookalikeAudience(audience.id)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{audience.name}</p>
                            <p className="text-xs text-gray-500">
                              {audience.audienceSize?.toLocaleString() || 0} شخص • {audience.ratio}% تشابه
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {customAudiences.length === 0 && lookalikeAudiences.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">لا توجد جماهير متاحة</p>
                    <p className="text-xs text-gray-400 mt-1">يمكنك إنشاء جماهير مخصصة من صفحة الجماهير</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Exclude Audiences */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              استبعاد جماهير
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              استبعد أشخاصاً معينين من رؤية إعلانك (مثل: العملاء الحاليين، المشتركين)
            </p>

            {(customAudiences.length > 0 || lookalikeAudiences.length > 0) ? (
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                  {[...customAudiences, ...lookalikeAudiences].map((audience) => (
                    <label
                      key={`exclude-${audience.id}`}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={excludedAudiences.includes(audience.id)}
                        onChange={() => {
                          setExcludedAudiences(prev =>
                            prev.includes(audience.id)
                              ? prev.filter(id => id !== audience.id)
                              : [...prev, audience.id]
                          );
                        }}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{audience.name}</p>
                        <p className="text-xs text-gray-500">
                          {audience.audienceSize?.toLocaleString() || 0} شخص
                        </p>
                      </div>
                      <span className="text-xs text-red-600 font-medium">استبعاد</span>
                    </label>
                  ))}
                </div>
                {excludedAudiences.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      ✓ سيتم استبعاد {excludedAudiences.length} جمهور من رؤية هذا الإعلان
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">لا توجد جماهير متاحة للاستبعاد</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  
  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Placement Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">نوع المواضع</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange('placementType', 'AUTOMATIC')}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === 'AUTOMATIC'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Sparkles className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === 'AUTOMATIC' ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className="font-medium">Advantage+ Placements</div>
            <div className="text-xs text-gray-500 mt-1">دع Facebook يختار أفضل المواضع تلقائياً</div>
          </button>
          <button
            type="button"
            onClick={() => handleChange('placementType', 'MANUAL')}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === 'MANUAL'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Layout className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === 'MANUAL' ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className="font-medium">مواضع يدوية</div>
            <div className="text-xs text-gray-500 mt-1">اختر المواضع بنفسك</div>
          </button>
        </div>
      </div>
      
      {/* Manual Placements */}
      {formData.placementType === 'MANUAL' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            اختر المواضع <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PLACEMENTS.map((placement) => (
              <button
                key={placement.id}
                type="button"
                onClick={() => toggleArrayValue('placements', placement.id)}
                className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-all ${
                  formData.placements.includes(placement.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={formData.placements.includes(placement.id) ? 'text-blue-500' : 'text-gray-400'}>
                  {placement.icon}
                </div>
                <span className="font-medium text-sm">{placement.label}</span>
              </button>
            ))}
          </div>
          {errors.placements && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.placements}
            </p>
          )}
        </div>
      )}
    </div>
  );
  
  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-5">
          {/* Facebook Page Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              صفحة Facebook <span className="text-red-500">*</span>
            </label>
            {loadingPages ? (
              <div className="flex items-center gap-2 text-gray-500 p-3 border border-gray-300 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">جاري تحميل الصفحات...</span>
              </div>
            ) : facebookPages.length > 0 ? (
              <select
                value={formData.pageId}
                onChange={(e) => handleChange('pageId', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.pageId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">اختر الصفحة</option>
                {facebookPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name} {page.category && `(${page.category})`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 mb-2">
                  ⚠️ لا توجد صفحات متاحة. يمكنك إدخال معرف الصفحة يدوياً:
                </p>
                <input
                  type="text"
                  value={formData.pageId}
                  onChange={(e) => handleChange('pageId', e.target.value)}
                  placeholder="مثال: 123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}
            {errors.pageId && (
              <p className="mt-1 text-sm text-red-500">{errors.pageId}</p>
            )}
          </div>
          
          {/* Creative Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">نوع المحتوى</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleChange('creativeType', 'SINGLE_IMAGE')}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === 'SINGLE_IMAGE'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Image className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === 'SINGLE_IMAGE' ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="font-medium text-sm">صورة</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange('creativeType', 'SINGLE_VIDEO')}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === 'SINGLE_VIDEO'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Eye className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === 'SINGLE_VIDEO' ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="font-medium text-sm">فيديو</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange('creativeType', 'CAROUSEL');
                  if (formData.carouselCards.length === 0) {
                    handleChange('carouselCards', [
                      { id: '1', imageUrl: '', headline: '', description: '', linkUrl: '' },
                      { id: '2', imageUrl: '', headline: '', description: '', linkUrl: '' }
                    ]);
                  }
                }}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === 'CAROUSEL'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Layout className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === 'CAROUSEL' ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="font-medium text-sm">دوّار</div>
                <div className="text-xs text-gray-500">2-10 بطاقات</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange('creativeType', 'FLEXIBLE')}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === 'FLEXIBLE'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Sparkles className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === 'FLEXIBLE' ? 'text-green-500' : 'text-gray-400'}`} />
                <div className="font-medium text-sm">مرن</div>
                <div className="text-xs text-gray-500">حتى 10 ملفات</div>
              </button>
            </div>
            {formData.creativeType === 'FLEXIBLE' && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  <strong>التنسيق المرن (Flexible):</strong> ارفع حتى 10 صور أو فيديوهات، وسيختار Facebook تلقائياً أفضل تنسيق (صورة، فيديو، أو دوّار) لكل مستخدم!
                </p>
              </div>
            )}
          </div>
          
          {/* Flexible Assets Upload */}
          {formData.creativeType === 'FLEXIBLE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الصور والفيديوهات (حتى 10 ملفات) <span className="text-red-500">*</span>
              </label>
              
              <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer bg-green-50">
                <Sparkles className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-sm text-gray-700 mb-1 font-medium">
                  ارفع حتى 10 صور أو فيديوهات
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  سيختار Facebook تلقائياً أفضل تنسيق لكل مستخدم
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  اختر الملفات
                </button>
              </div>
              
              {/* Uploaded Assets List */}
              {formData.flexibleAssets.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    الملفات المرفوعة ({formData.flexibleAssets.length}/10)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.flexibleAssets.map((asset, index) => (
                      <div key={asset.id} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                          {asset.type === 'IMAGE' ? (
                            <img src={asset.url} alt={`Asset ${index + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newAssets = formData.flexibleAssets.filter(a => a.id !== asset.id);
                            handleChange('flexibleAssets', newAssets);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black bg-opacity-70 text-white text-xs rounded">
                          {asset.type === 'IMAGE' ? 'صورة' : 'فيديو'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Upload/URL - Single Image/Video */}
          {(formData.creativeType === 'SINGLE_IMAGE' || formData.creativeType === 'SINGLE_VIDEO') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.creativeType === 'SINGLE_IMAGE' ? 'الصورة' : 'الفيديو'} <span className="text-red-500">*</span>
              </label>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50">
                <input
                  type="file"
                  accept={formData.creativeType === 'SINGLE_IMAGE' ? 'image/*' : 'video/*'}
                  className="hidden"
                  id="media-upload"
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Image className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    اسحب وأفلت {formData.creativeType === 'SINGLE_IMAGE' ? 'الصورة' : 'الفيديو'} هنا
                  </p>
                  <p className="text-xs text-gray-400">أو انقر للاختيار من جهازك</p>
                </label>
              </div>
              
              {/* Or URL */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-400">أو أدخل رابط</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <input
                  type="url"
                  value={formData.creativeType === 'SINGLE_IMAGE' ? formData.imageUrl : formData.videoUrl}
                  onChange={(e) => handleChange(formData.creativeType === 'SINGLE_IMAGE' ? 'imageUrl' : 'videoUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Carousel Cards */}
          {formData.creativeType === 'CAROUSEL' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  بطاقات الدوّار ({formData.carouselCards.length}/10)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.carouselCards.length < 10) {
                      handleChange('carouselCards', [
                        ...formData.carouselCards,
                        { id: Date.now().toString(), imageUrl: '', headline: '', description: '', linkUrl: '' }
                      ]);
                    }
                  }}
                  disabled={formData.carouselCards.length >= 10}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + إضافة بطاقة
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {formData.carouselCards.map((card, index) => (
                  <div key={card.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">بطاقة {index + 1}</h5>
                      {formData.carouselCards.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleChange('carouselCards', formData.carouselCards.filter(c => c.id !== card.id));
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Image URL */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">رابط الصورة *</label>
                        <input
                          type="url"
                          value={card.imageUrl}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map(c =>
                              c.id === card.id ? { ...c, imageUrl: e.target.value } : c
                            );
                            handleChange('carouselCards', updated);
                          }}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Headline */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">العنوان *</label>
                        <input
                          type="text"
                          value={card.headline}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map(c =>
                              c.id === card.id ? { ...c, headline: e.target.value } : c
                            );
                            handleChange('carouselCards', updated);
                          }}
                          placeholder="عنوان البطاقة"
                          maxLength={40}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">الوصف</label>
                        <input
                          type="text"
                          value={card.description}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map(c =>
                              c.id === card.id ? { ...c, description: e.target.value } : c
                            );
                            handleChange('carouselCards', updated);
                          }}
                          placeholder="وصف البطاقة"
                          maxLength={20}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Link URL */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">رابط الوجهة *</label>
                        <input
                          type="url"
                          value={card.linkUrl}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map(c =>
                              c.id === card.id ? { ...c, linkUrl: e.target.value } : c
                            );
                            handleChange('carouselCards', updated);
                          }}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {/* Primary Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              النص الأساسي <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.primaryText}
              onChange={(e) => handleChange('primaryText', e.target.value)}
              placeholder="اكتب النص الرئيسي لإعلانك..."
              rows={3}
              maxLength={125}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.primaryText ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between mt-1">
              {errors.primaryText ? (
                <p className="text-sm text-red-500">{errors.primaryText}</p>
              ) : (
                <span></span>
              )}
              <span className="text-xs text-gray-400">{formData.primaryText.length}/125</span>
            </div>
          </div>
          
          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
            <input
              type="text"
              value={formData.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              placeholder="عنوان جذاب لإعلانك"
              maxLength={40}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">{formData.headline.length}/40</p>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="وصف مختصر يظهر أسفل العنوان"
              maxLength={30}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">{formData.description.length}/30</p>
          </div>
          
          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رابط الوجهة <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => handleChange('linkUrl', e.target.value)}
              placeholder="https://yourwebsite.com"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.linkUrl ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.linkUrl && (
              <p className="mt-1 text-sm text-red-500">{errors.linkUrl}</p>
            )}
          </div>

          {/* Display Link & URL Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط العرض (اختياري)
              </label>
              <input
                type="text"
                value={formData.displayLink}
                onChange={(e) => handleChange('displayLink', e.target.value)}
                placeholder="مثال: yoursite.com/sale"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                النص الذي يظهر بدلاً من الرابط الكامل
              </p>
            </div>

            {/* URL Parameters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                معاملات URL (UTM)
              </label>
              <input
                type="text"
                value={formData.urlParameters}
                onChange={(e) => handleChange('urlParameters', e.target.value)}
                placeholder="مثال: utm_source=facebook&utm_campaign=winter"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                لتتبع مصدر الزيارات في Google Analytics
              </p>
            </div>
          </div>
          
          {/* Call to Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">زر الإجراء</label>
            <div className="grid grid-cols-4 gap-2">
              {CALL_TO_ACTIONS.map((cta) => (
                <button
                  key={cta.value}
                  type="button"
                  onClick={() => handleChange('callToAction', cta.value)}
                  className={`py-2 px-3 text-xs rounded-lg border transition-all ${
                    formData.callToAction === cta.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cta.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-gray-100 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              معاينة الإعلان
            </h4>
            
            {/* Facebook Feed Preview */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-3 flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">اسم صفحتك</p>
                  <p className="text-xs text-gray-500">إعلان ممول</p>
                </div>
              </div>
              
              {/* Text */}
              <div className="px-3 pb-2">
                <p className="text-sm text-gray-800">
                  {formData.primaryText || 'النص الأساسي لإعلانك سيظهر هنا...'}
                </p>
              </div>
              
              {/* Image */}
              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400">
                    <Image className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-sm">صورة الإعلان</p>
                  </div>
                )}
              </div>
              
              {/* Link Preview */}
              <div className="p-3 bg-gray-50 border-t">
                <p className="text-xs text-gray-500 truncate">{formData.linkUrl || 'yourwebsite.com'}</p>
                <p className="font-medium text-sm mt-1">{formData.headline || 'العنوان'}</p>
                <p className="text-xs text-gray-500">{formData.description || 'الوصف'}</p>
              </div>
              
              {/* CTA Button */}
              <div className="p-3 border-t">
                <button className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
                  {CALL_TO_ACTIONS.find(c => c.value === formData.callToAction)?.label || 'معرفة المزيد'}
                </button>
              </div>
            </div>
            
            {/* Platform Tabs */}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                <Facebook className="w-3 h-3" /> Facebook
              </button>
              <button className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                <Instagram className="w-3 h-3" /> Instagram
              </button>
            </div>
          </div>
          
          {/* Advantage+ Creative */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl space-y-3 mt-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Advantage+ Creative
            </h4>
            <p className="text-xs text-gray-600">دع Facebook يحسن إعلانك تلقائياً للحصول على أفضل أداء</p>
            
            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium">تحسين النص</span>
                <p className="text-xs text-gray-500">إنشاء نسخ متعددة من النص</p>
              </div>
              <input
                type="checkbox"
                checked={formData.textGeneration}
                onChange={(e) => {
                  handleChange('textGeneration', e.target.checked);
                  if (e.target.checked) handleChange('advantageCreative', true);
                }}
                className="w-5 h-5 text-green-600 rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium">تحسين الصورة</span>
                <p className="text-xs text-gray-500">تعديل السطوع والتباين تلقائياً</p>
              </div>
              <input
                type="checkbox"
                checked={formData.imageEnhancement}
                onChange={(e) => {
                  handleChange('imageEnhancement', e.target.checked);
                  if (e.target.checked) handleChange('advantageCreative', true);
                }}
                className="w-5 h-5 text-green-600 rounded"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">ملخص الإعلان</h3>
        
        {/* Campaign Summary */}
        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">اسم الحملة</span>
            <span className="font-medium">{formData.campaignName}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الهدف</span>
            <span className="font-medium">{OBJECTIVES.find(o => o.value === formData.objective)?.label}</span>
          </div>
          
          {/* Ad Set Level Info */}
          {(formData.objective === 'OUTCOME_SALES' || formData.objective === 'OUTCOME_LEADS') && (
            <>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">هدف الأداء</span>
                <span className="font-medium">{PERFORMANCE_GOALS.find(g => g.value === formData.performanceGoal)?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">حدث التحويل</span>
                <span className="font-medium">{CONVERSION_EVENTS.find(e => e.value === formData.conversionEvent)?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">نافذة الإحالة</span>
                <span className="font-medium">{ATTRIBUTION_WINDOWS.find(w => w.value === formData.attributionWindow)?.label}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الميزانية</span>
            <span className="font-medium">${formData.budgetAmount} / {formData.budgetType === 'DAILY' ? 'يومياً' : 'إجمالي'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">استراتيجية المزايدة</span>
            <span className="font-medium">{BID_STRATEGIES.find(b => b.value === formData.bidStrategy)?.label}</span>
          </div>
          {formData.frequencyCap && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">حد التكرار</span>
              <span className="font-medium">{formData.frequencyCap} مرة / {
                formData.frequencyCapInterval === 'DAY' ? 'يومياً' :
                formData.frequencyCapInterval === 'WEEK' ? 'أسبوعياً' : 'شهرياً'
              }</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">المواقع</span>
            <span className="font-medium">{formData.locations.map(l => COUNTRIES.find(c => c.code === l)?.name).join(', ')}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الفئة العمرية</span>
            <span className="font-medium">{formData.ageMin} - {formData.ageMax}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">المواضع</span>
            <span className="font-medium">{formData.placementType === 'AUTOMATIC' ? 'تلقائي' : `${formData.placements.length} مواضع`}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">نوع المحتوى</span>
            <span className="font-medium">{
              formData.creativeType === 'SINGLE_IMAGE' ? 'صورة' :
              formData.creativeType === 'SINGLE_VIDEO' ? 'فيديو' :
              formData.creativeType === 'CAROUSEL' ? 'دوّار' : 'مرن (Flexible)'
            }</span>
          </div>
          {formData.creativeType === 'FLEXIBLE' && formData.flexibleAssets.length > 0 && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">عدد الملفات</span>
              <span className="font-medium text-green-600">{formData.flexibleAssets.length} ملف</span>
            </div>
          )}
          <div className="flex justify-between py-2">
            <span className="text-gray-600">رابط الوجهة</span>
            <span className="font-medium text-blue-600 truncate max-w-xs">{formData.linkUrl}</span>
          </div>
          {formData.urlParameters && (
            <div className="flex justify-between py-2">
              <span className="text-gray-600">معاملات URL</span>
              <span className="font-medium text-xs text-gray-500 truncate max-w-xs">{formData.urlParameters}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">حالة الإعلان بعد النشر</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange('status', 'PAUSED')}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === 'PAUSED'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">متوقف مؤقتاً</div>
            <div className="text-xs text-gray-500 mt-1">راجع الإعلان قبل تفعيله</div>
          </button>
          <button
            type="button"
            onClick={() => handleChange('status', 'ACTIVE')}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === 'ACTIVE'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">نشط فوراً</div>
            <div className="text-xs text-gray-500 mt-1">ابدأ عرض الإعلان مباشرة</div>
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // Main Render
  // ============================================
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="w-full px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🚀 إنشاء إعلان كامل</h1>
          <p className="text-gray-600 dark:text-gray-400">أنشئ حملة وإعلان احترافي بخطوات بسيطة</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className={`text-xs mt-2 hidden md:block ${
                    currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {WIZARD_STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {WIZARD_STEPS[currentStep - 1].description}
            </p>
          </div>
          
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              currentStep === 1
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
            السابق
          </button>
          
          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
            >
              التالي
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  إنشاء الإعلان
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAdWizard;


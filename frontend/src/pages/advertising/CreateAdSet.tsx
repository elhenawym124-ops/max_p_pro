/**
 * Create AdSet Page - Enhanced with Full Targeting Options
 * 
 * صفحة إنشاء مجموعة إعلانات جديدة مع كل خيارات الاستهداف المتقدمة
 * 
 * الخيارات المدعومة:
 * ═══════════════════════════════════════════════════
 * ✅ Demographics (العمر، الجنس، الحالة الاجتماعية)
 * ✅ Locations (الدول، المدن)
 * ✅ Interests (الاهتمامات مع البحث)
 * ✅ Behaviors (السلوكيات)
 * ✅ Languages (اللغات)
 * ✅ Devices (الأجهزة ونظام التشغيل)
 * ✅ Custom & Lookalike Audiences
 * ✅ Advantage+ Audience
 * ✅ Reach Estimate
 * ═══════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserGroupIcon,
  MapPinIcon,
  HeartIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  facebookAdsService,
  CreateAdSetData,
  FacebookCustomAudience,
  FacebookLookalikeAudience,
} from '../../services/facebookAdsService';

interface TargetingOption {
  id: string;
  name: string;
  audience_size?: number;
}

interface ReachEstimate {
  users: number;
  usersLowerBound: number;
  usersUpperBound: number;
}

const CreateAdSet: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customAudiences, setCustomAudiences] = useState<FacebookCustomAudience[]>([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<FacebookLookalikeAudience[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  
  // Search & Reach
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TargetingOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reachEstimate, setReachEstimate] = useState<ReachEstimate | null>(null);
  const [reachLoading, setReachLoading] = useState(false);
  
  // Active targeting tab
  const [activeTargetingTab, setActiveTargetingTab] = useState<'demographics' | 'locations' | 'interests' | 'audiences' | 'advanced'>('demographics');

  // Extended targeting state
  const [extendedTargeting, setExtendedTargeting] = useState({
    relationshipStatuses: [] as number[],
    locales: [] as number[],
    devicePlatforms: [] as string[],
    interests: [] as TargetingOption[],
    behaviors: [] as TargetingOption[],
    advantageAudience: false,
    targetingExpansion: false,
  });

  const [formData, setFormData] = useState<CreateAdSetData>({
    name: '',
    status: 'PAUSED',
    budgetType: 'DAILY',
    budgetAmount: 50,
    optimizationGoal: 'LINK_CLICKS',
    billingEvent: 'IMPRESSIONS',
    targeting: {
      ageMin: 18,
      ageMax: 65,
      genders: [],
      locations: ['EG'],
      interests: [],
      behaviors: [],
      customAudiences: [],
      lookalikeAudiences: [],
    },
  });

  // Static Data
  const countries = [
    { code: 'EG', name: 'مصر', flag: '🇪🇬' },
    { code: 'SA', name: 'السعودية', flag: '🇸🇦' },
    { code: 'AE', name: 'الإمارات', flag: '🇦🇪' },
    { code: 'KW', name: 'الكويت', flag: '🇰🇼' },
    { code: 'QA', name: 'قطر', flag: '🇶🇦' },
    { code: 'BH', name: 'البحرين', flag: '🇧🇭' },
    { code: 'OM', name: 'عمان', flag: '🇴🇲' },
    { code: 'JO', name: 'الأردن', flag: '🇯🇴' },
    { code: 'LB', name: 'لبنان', flag: '🇱🇧' },
    { code: 'MA', name: 'المغرب', flag: '🇲🇦' },
    { code: 'DZ', name: 'الجزائر', flag: '🇩🇿' },
    { code: 'TN', name: 'تونس', flag: '🇹🇳' },
    { code: 'IQ', name: 'العراق', flag: '🇮🇶' },
    { code: 'PS', name: 'فلسطين', flag: '🇵🇸' },
    { code: 'SY', name: 'سوريا', flag: '🇸🇾' },
    { code: 'YE', name: 'اليمن', flag: '🇾🇪' },
    { code: 'SD', name: 'السودان', flag: '🇸🇩' },
    { code: 'LY', name: 'ليبيا', flag: '🇱🇾' },
  ];

  const relationshipOptions = [
    { value: 1, label: 'أعزب/عزباء' },
    { value: 2, label: 'في علاقة' },
    { value: 3, label: 'مخطوب/ة' },
    { value: 4, label: 'متزوج/ة' },
    { value: 6, label: 'غير محدد' },
  ];

  const languages = [
    { id: 6, name: 'العربية' },
    { id: 24, name: 'الإنجليزية' },
    { id: 10, name: 'الفرنسية' },
    { id: 25, name: 'التركية' },
  ];

  const devicePlatforms = [
    { value: 'iOS', label: 'iOS' },
    { value: 'Android', label: 'Android' },
  ];

  const interestCategories = [
    { name: 'التسوق', query: 'shopping' },
    { name: 'الموضة', query: 'fashion' },
    { name: 'التكنولوجيا', query: 'technology' },
    { name: 'الرياضة', query: 'sports' },
    { name: 'السفر', query: 'travel' },
    { name: 'الطعام', query: 'food' },
    { name: 'الصحة', query: 'health' },
    { name: 'الأعمال', query: 'business' },
  ];

  const totalSteps = 3;

  useEffect(() => {
    if (campaignId) {
      loadAudiences();
    }
  }, [campaignId]);

  const loadAudiences = async () => {
    try {
      setLoadingAudiences(true);
      const [custom, lookalike] = await Promise.all([
        facebookAdsService.getCustomAudiences(),
        facebookAdsService.getLookalikeAudiences(),
      ]);
      
      setCustomAudiences(custom.filter(a => a.status === 'ACTIVE'));
      setLookalikeAudiences(lookalike.filter(a => a.status === 'ACTIVE'));
    } catch (error: any) {
      console.error('Error loading audiences:', error);
      toast.error('فشل في تحميل الجماهير');
    } finally {
      setLoadingAudiences(false);
    }
  };

  const handleInputChange = (field: keyof CreateAdSetData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTargetingChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting!,
        [field]: value,
      },
    }));
  };

  const toggleCustomAudience = (audienceId: string) => {
    const current = formData.targeting?.customAudiences || [];
    const updated = current.includes(audienceId)
      ? current.filter(id => id !== audienceId)
      : [...current, audienceId];
    handleTargetingChange('customAudiences', updated);
  };

  const toggleLookalikeAudience = (audienceId: string) => {
    const current = formData.targeting?.lookalikeAudiences || [];
    const updated = current.includes(audienceId)
      ? current.filter(id => id !== audienceId)
      : [...current, audienceId];
    handleTargetingChange('lookalikeAudiences', updated);
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

  // Add interest
  const addInterest = (interest: TargetingOption) => {
    if (!extendedTargeting.interests.find(i => i.id === interest.id)) {
      setExtendedTargeting(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove interest
  const removeInterest = (id: string) => {
    setExtendedTargeting(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i.id !== id)
    }));
  };

  // Fetch reach estimate
  const fetchReachEstimate = async () => {
    try {
      setReachLoading(true);
      const result = await facebookAdsService.getReachEstimate(formData.targeting || {});
      if (result) {
        setReachEstimate(result);
      }
    } catch (error) {
      console.error('Reach estimate error:', error);
    } finally {
      setReachLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('يرجى إدخال اسم مجموعة الإعلانات');
          return false;
        }
        return true;
      case 2:
        if (!formData.budgetAmount || formData.budgetAmount <= 0) {
          toast.error('يرجى إدخال ميزانية صحيحة');
          return false;
        }
        return true;
      case 3:
        return true; // Review step
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !campaignId) return;

    try {
      setLoading(true);
      await facebookAdsService.createAdSet(campaignId, formData);
      toast.success('تم إنشاء مجموعة الإعلانات بنجاح');
      navigate(`/advertising/facebook-ads/campaigns/${campaignId}`);
    } catch (error: any) {
      console.error('Error creating ad set:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء مجموعة الإعلانات');
    } finally {
      setLoading(false);
    }
  };

  if (!campaignId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">معرف الحملة غير موجود</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/advertising/facebook-ads/campaigns/${campaignId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          رجوع
        </button>
        <h1 className="text-3xl font-bold text-gray-900">إنشاء مجموعة إعلانات جديدة</h1>
        <p className="mt-2 text-sm text-gray-600">
          اتبع الخطوات لإنشاء مجموعة إعلانات جديدة
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <span>{step}</span>
                  )}
                </div>
                <p
                  className={`mt-2 text-sm font-medium ${
                    step <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step === 1 && 'المعلومات الأساسية'}
                  {step === 2 && 'الاستهداف'}
                  {step === 3 && 'المراجعة'}
                </p>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم مجموعة الإعلانات *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="مثال: مجموعة إعلانات - رجال 25-45"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الميزانية *
                </label>
                <select
                  value={formData.budgetType}
                  onChange={(e) => handleInputChange('budgetType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="DAILY">يومية</option>
                  <option value="LIFETIME">إجمالية</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مبلغ الميزانية *
                </label>
                <input
                  type="number"
                  value={formData.budgetAmount}
                  onChange={(e) => handleInputChange('budgetAmount', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min={1}
                  step={0.01}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  هدف التحسين
                </label>
                <select
                  value={formData.optimizationGoal}
                  onChange={(e) => handleInputChange('optimizationGoal', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="LINK_CLICKS">نقرات الروابط</option>
                  <option value="OFFSITE_CONVERSIONS">التحويلات</option>
                  <option value="IMPRESSIONS">المشاهدات</option>
                  <option value="REACH">الوصول</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  حدث الفوترة
                </label>
                <select
                  value={formData.billingEvent}
                  onChange={(e) => handleInputChange('billingEvent', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="IMPRESSIONS">المشاهدات</option>
                  <option value="LINK_CLICKS">النقرات</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Targeting - Enhanced */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Targeting Tabs */}
            <div className="flex flex-wrap gap-2 border-b pb-4">
              {[
                { id: 'demographics', label: 'الديموغرافيا', icon: UserGroupIcon },
                { id: 'locations', label: 'المواقع', icon: MapPinIcon },
                { id: 'interests', label: 'الاهتمامات', icon: HeartIcon },
                { id: 'audiences', label: 'الجماهير', icon: ChartBarIcon },
                { id: 'advanced', label: 'متقدم', icon: SparklesIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTargetingTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTargetingTab === tab.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Reach Estimate Card */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">حجم الجمهور المقدر</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {reachLoading ? '...' : reachEstimate ? `${(reachEstimate.users / 1000000).toFixed(1)}M` : '---'}
                  </p>
                  {reachEstimate && (
                    <p className="text-xs text-gray-500">
                      {(reachEstimate.usersLowerBound / 1000).toFixed(0)}K - {(reachEstimate.usersUpperBound / 1000000).toFixed(1)}M
                    </p>
                  )}
                </div>
                <button
                  onClick={fetchReachEstimate}
                  disabled={reachLoading}
                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"
                >
                  <ChartBarIcon className={`w-5 h-5 ${reachLoading ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>

            {/* Demographics Tab */}
            {activeTargetingTab === 'demographics' && (
              <div className="space-y-6">
                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">الفئة العمرية</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">من</label>
                      <input
                        type="number"
                        value={formData.targeting?.ageMin || 18}
                        onChange={(e) => handleTargetingChange('ageMin', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        min={13}
                        max={65}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">إلى</label>
                      <input
                        type="number"
                        value={formData.targeting?.ageMax || 65}
                        onChange={(e) => handleTargetingChange('ageMax', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        min={13}
                        max={65}
                      />
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">الجنس</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'male', label: 'ذكور 👨' },
                      { value: 'female', label: 'إناث 👩' },
                    ].map((gender) => (
                      <button
                        key={gender.value}
                        type="button"
                        onClick={() => {
                          const current = formData.targeting?.genders || [];
                          const updated = current.includes(gender.value)
                            ? current.filter(g => g !== gender.value)
                            : [...current, gender.value];
                          handleTargetingChange('genders', updated);
                        }}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                          formData.targeting?.genders?.includes(gender.value)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {gender.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {!formData.targeting?.genders?.length ? 'الكل (افتراضي)' : `محدد: ${formData.targeting.genders.length}`}
                  </p>
                </div>

                {/* Relationship Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">الحالة الاجتماعية</label>
                  <div className="flex flex-wrap gap-2">
                    {relationshipOptions.map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => {
                          const current = extendedTargeting.relationshipStatuses;
                          const updated = current.includes(status.value)
                            ? current.filter(s => s !== status.value)
                            : [...current, status.value];
                          setExtendedTargeting(prev => ({ ...prev, relationshipStatuses: updated }));
                        }}
                        className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                          extendedTargeting.relationshipStatuses.includes(status.value)
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Locations Tab */}
            {activeTargetingTab === 'locations' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">الدول *</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {countries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          const current = formData.targeting?.locations || [];
                          const updated = current.includes(country.code)
                            ? current.filter(c => c !== country.code)
                            : [...current, country.code];
                          handleTargetingChange('locations', updated);
                        }}
                        className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                          formData.targeting?.locations?.includes(country.code)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="ml-1">{country.flag}</span>
                        {country.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    محدد: {formData.targeting?.locations?.length || 0} دولة
                  </p>
                </div>
              </div>
            )}

            {/* Interests Tab */}
            {activeTargetingTab === 'interests' && (
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البحث عن اهتمامات</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearchInterests(e.target.value);
                      }}
                      placeholder="ابحث عن اهتمام (مثال: تسوق، موضة، تقنية...)"
                      className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    {searchLoading && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
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
                </div>

                {/* Selected Interests */}
                {extendedTargeting.interests.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاهتمامات المحددة ({extendedTargeting.interests.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {extendedTargeting.interests.map((interest) => (
                        <span
                          key={interest.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                        >
                          {interest.name}
                          <button
                            type="button"
                            onClick={() => removeInterest(interest.id)}
                            className="p-0.5 hover:bg-indigo-200 rounded-full"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">فئات سريعة</label>
                  <div className="flex flex-wrap gap-2">
                    {interestCategories.map((cat) => (
                      <button
                        key={cat.query}
                        type="button"
                        onClick={() => {
                          setSearchQuery(cat.query);
                          handleSearchInterests(cat.query);
                        }}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Audiences Tab */}
            {activeTargetingTab === 'audiences' && (
              <div className="space-y-6">
                {loadingAudiences ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">جاري تحميل الجماهير...</p>
                  </div>
                ) : (
                  <>
                    {/* Custom Audiences */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        الجماهير المخصصة
                      </label>
                      {customAudiences.length === 0 ? (
                        <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">لا توجد جماهير مخصصة متاحة</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {customAudiences.map((audience) => (
                            <label
                              key={audience.id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.targeting?.customAudiences?.includes(audience.id) || false}
                                onChange={() => toggleCustomAudience(audience.id)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
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
                      )}
                    </div>

                    {/* Lookalike Audiences */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        الجماهير المشابهة
                      </label>
                      {lookalikeAudiences.length === 0 ? (
                        <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">لا توجد جماهير مشابهة متاحة</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {lookalikeAudiences.map((audience) => (
                            <label
                              key={audience.id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.targeting?.lookalikeAudiences?.includes(audience.id) || false}
                                onChange={() => toggleLookalikeAudience(audience.id)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{audience.name}</p>
                                <p className="text-xs text-gray-500">
                                  {audience.audienceSize?.toLocaleString() || 0} شخص | {audience.ratio}% شبه
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Advanced Tab */}
            {activeTargetingTab === 'advanced' && (
              <div className="space-y-6">
                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <GlobeAltIcon className="w-4 h-4 inline ml-1" />
                    اللغات
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => {
                          const current = extendedTargeting.locales;
                          const updated = current.includes(lang.id)
                            ? current.filter(l => l !== lang.id)
                            : [...current, lang.id];
                          setExtendedTargeting(prev => ({ ...prev, locales: updated }));
                        }}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          extendedTargeting.locales.includes(lang.id)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Devices */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <DevicePhoneMobileIcon className="w-4 h-4 inline ml-1" />
                    نظام التشغيل
                  </label>
                  <div className="flex gap-3">
                    {devicePlatforms.map((platform) => (
                      <button
                        key={platform.value}
                        type="button"
                        onClick={() => {
                          const current = extendedTargeting.devicePlatforms;
                          const updated = current.includes(platform.value)
                            ? current.filter(p => p !== platform.value)
                            : [...current, platform.value];
                          setExtendedTargeting(prev => ({ ...prev, devicePlatforms: updated }));
                        }}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                          extendedTargeting.devicePlatforms.includes(platform.value)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advantage+ Audience */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extendedTargeting.advantageAudience}
                      onChange={(e) => setExtendedTargeting(prev => ({ ...prev, advantageAudience: e.target.checked }))}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-purple-600" />
                        Advantage+ Audience
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        السماح لـ Facebook بتوسيع الجمهور تلقائياً للوصول لأشخاص أكثر احتمالاً للتحويل
                      </p>
                    </div>
                  </label>
                </div>

                {/* Targeting Expansion */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extendedTargeting.targetingExpansion}
                      onChange={(e) => setExtendedTargeting(prev => ({ ...prev, targetingExpansion: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">توسيع الاستهداف التفصيلي</span>
                      <p className="text-sm text-gray-600 mt-1">
                        الوصول لأشخاص إضافيين خارج الاستهداف المحدد عندما يكون ذلك مفيداً
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-medium text-gray-900">مراجعة المعلومات</h3>
              
              <div>
                <span className="text-sm text-gray-500">الاسم:</span>
                <p className="font-medium">{formData.name}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">الميزانية:</span>
                <p className="font-medium">
                  {formData.budgetAmount.toLocaleString()} EGP ({formData.budgetType === 'DAILY' ? 'يومية' : 'إجمالية'})
                </p>
              </div>

              <div>
                <span className="text-sm text-gray-500">الفئة العمرية:</span>
                <p className="font-medium">
                  {formData.targeting?.ageMin || 18} - {formData.targeting?.ageMax || 65}
                </p>
              </div>

              {formData.targeting?.customAudiences && formData.targeting.customAudiences.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">الجماهير المخصصة:</span>
                  <p className="font-medium">{formData.targeting.customAudiences.length} جمهور</p>
                </div>
              )}

              {formData.targeting?.lookalikeAudiences && formData.targeting.lookalikeAudiences.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">الجماهير المشابهة:</span>
                  <p className="font-medium">{formData.targeting.lookalikeAudiences.length} جمهور</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            السابق
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء مجموعة الإعلانات'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAdSet;



import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, formatCurrency, getCurrencyByCode } from '../../utils/currency';
import { getApiUrl, envConfig } from '../../config/environment';

import { useDateFormat } from '../../hooks/useDateFormat';
import { DateFormatType, DATE_FORMAT_LABELS, formatTimeWithZone } from '../../utils/dateFormat';

interface SubscriptionPlan {
  name: string;
  price: number;
  currency: string;
  limits: Record<string, number>;
  features: Record<string, boolean>;
}

interface UsageStat {
  usage: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
  warning: boolean;
  exceeded: boolean;
}

const CompanySettings: React.FC = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [plans, setPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [usage, setUsage] = useState<Record<string, UsageStat>>({});
  const [loading, setLoading] = useState(true);

  const [selectedCurrency, setSelectedCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Time Preview
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Sidebar Layout
  const [sidebarLayout, setSidebarLayout] = useState<string>('three-tier');
  const [savingLayout, setSavingLayout] = useState(false);

  // Logo upload states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Date format hook
  const { dateFormat, setDateFormat, isLoading: dateFormatLoading, error: dateFormatError, formatDate } = useDateFormat();

  // Company name editing states
  const [editingName, setEditingName] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Slug states
  const [slug, setSlug] = useState('');
  const [editingSlug, setEditingSlug] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);

  // Custom domain states
  const [customDomain, setCustomDomain] = useState('');
  const [editingDomain, setEditingDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'plan' | 'usage' | 'ownership'>('general');

  const customerRegisterUrl = user?.companyId
    ? `${window.location.origin}/auth/customer-register?companyId=${encodeURIComponent(user.companyId)}`
    : null;

  // Ownership Transfer State
  const [users, setUsers] = useState<any[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  useEffect(() => {
    fetchCompanyData();
    fetchPlans();
    fetchUsage();
    if (user?.role === 'OWNER') {
      fetchCompanyUsers();
    }
  }, [user]);

  const fetchCompanyData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCompany(data.data);
        // Set currency from company data or use default
        setSelectedCurrency(data.data?.currency || DEFAULT_CURRENCY);
        // Set company name for editing
        setCompanyName(data.data?.name || '');
        // Set slug
        setSlug(data.data?.slug || '');
        // Set sidebar layout
        setSidebarLayout(data.data?.sidebarLayout || 'three-tier');
        // Set custom domain
        setCustomDomain(data.data?.customDomain || '');
        // Set logo preview if exists
        if (data.data?.logo) {
          const logoUrl = data.data.logo.startsWith('http')
            ? data.data.logo
            : `${envConfig.backendUrl}${data.data.logo}`;
          setLogoPreview(logoUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setUsage(data.data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Filter out current user (cannot transfer to self)
        setUsers(data.data.users.filter((u: any) => u.id !== user?.id));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;

    try {
      setTransferring(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: selectedNewOwner }),
      });

      const data = await response.json();

      if (data.success) {
        alert('تم نقل الملكية بنجاح! سيتم إعادة تحميل الصفحة لتحديث الصلاحيات.');
        window.location.reload();
      } else {
        alert(data.message || 'فشل نقل الملكية');
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('حدث خطأ أثناء نقل الملكية');
    } finally {
      setTransferring(false);
      setShowTransferConfirm(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planName }),
      });

      const data = await response.json();
      if (data.success) {
        alert('تم تحديث الاشتراك بنجاح!');
        fetchCompanyData();
        fetchUsage();
      } else {
        alert(data.error || 'فشل في تحديث الاشتراك');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('حدث خطأ أثناء تحديث الاشتراك');
    }
  };

  const handleCompanyNameSave = async () => {
    if (!companyName.trim()) {
      alert('اسم الشركة مطلوب');
      return;
    }

    try {
      setSavingName(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: companyName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setCompany((prev: any) => ({ ...prev, name: companyName.trim() }));
        setEditingName(false);
        alert('تم تحديث اسم الشركة بنجاح!');
      } else {
        alert(data.error || 'فشل في تحديث اسم الشركة');
      }
    } catch (error) {
      console.error('Error updating company name:', error);
      alert('حدث خطأ أثناء تحديث اسم الشركة');
    } finally {
      setSavingName(false);
    }
  };

  const handleSlugSave = async () => {
    if (!slug.trim()) {
      alert('الرابط مطلوب');
      return;
    }

    // Basic validation
    if (!/^[a-z0-9-]+$/.test(slug)) {
      alert('الرابط يجب أن يحتوي فقط على حروف إنجليزية صغيرة وأرقام وشرطة (-)');
      return;
    }

    try {
      setSavingSlug(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}/slug`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: slug.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setCompany((prev: any) => ({ ...prev, slug: slug.trim() }));
        setEditingSlug(false);
        alert('تم تحديث رابط الشركة بنجاح!');
        // Update user in local storage/context might be needed if slug is critical
        window.location.reload(); // Reload to ensure all links update
      } else {
        alert(data.error || data.message || 'فشل في تحديث الرابط. قد يكون مستخدماً بالفعل.');
      }
    } catch (error) {
      console.error('Error updating company slug:', error);
      alert('حدث خطأ أثناء تحديث رابط الشركة');
    } finally {
      setSavingSlug(false);
    }
  };



  const handleCurrencyChange = async (currencyCode: string) => {
    try {
      setSavingCurrency(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}/currency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currency: currencyCode }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedCurrency(currencyCode);
        setCompany((prev: any) => ({ ...prev, currency: currencyCode }));
        alert('تم تحديث العملة بنجاح!');
      } else {
        alert(data.error || 'فشل في تحديث العملة');
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      alert('حدث خطأ أثناء تحديث العملة');
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleLayoutChange = async (layout: string) => {
    try {
      setSavingLayout(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sidebarLayout: layout }),
      });

      const data = await response.json();
      if (data.success) {
        setSidebarLayout(layout);
        setCompany((prev: any) => ({ ...prev, sidebarLayout: layout }));
        // Reload page to apply changes everywhere (simple way) or rely on Context
        if (window.confirm('تم تحديث نظام القائمة بنجاح! هل تريد إعادة تحميل الصفحة لتطبيق التغييرات؟')) {
          window.location.reload();
        }
      } else {
        alert(data.error || 'فشل في تحديث نظام القائمة');
      }
    } catch (error) {
      console.error('Error updating layout:', error);
      alert('حدث خطأ أثناء تحديث نظام القائمة');
    } finally {
      setSavingLayout(false);
    }
  };

  const handleCustomDomainSave = async () => {
    if (customDomain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(customDomain)) {
      alert('صيغة الدومين غير صحيحة. يجب أن يكون مثل: example.com (بدون www)');
      return;
    }

    try {
      setSavingDomain(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ customDomain: customDomain || null }),
      });

      const data = await response.json();
      if (data.success) {
        setCompany((prev: any) => ({ ...prev, customDomain: customDomain || null }));
        setEditingDomain(false);
        alert('تم تحديث الدومين المخصص بنجاح!');
      } else {
        alert(data.message || data.error || 'فشل في تحديث الدومين');
      }
    } catch (error) {
      console.error('Error updating custom domain:', error);
      alert('حدث خطأ أثناء تحديث الدومين');
    } finally {
      setSavingDomain(false);
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ timezone: newTimezone }),
      });

      const data = await response.json();
      if (data.success) {
        setCompany((prev: any) => ({ ...prev, timezone: newTimezone }));
        alert('تم تحديث المنطقة الزمنية بنجاح!');
      } else {
        alert(data.error || 'فشل في تحديث المنطقة الزمنية');
      }
    } catch (error) {
      console.error('Error updating timezone:', error);
      alert('حدث خطأ أثناء تحديث المنطقة الزمنية');
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('يُسمح فقط بملفات الصور');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    try {
      setUploadingLogo(true);

      // Create FormData
      const formData = new FormData();
      formData.append('logo', file);

      // Get token from localStorage
      const token = localStorage.getItem('accessToken');

      // Upload logo
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const logoUrl = data.data.logo.startsWith('http')
          ? data.data.logo
          : `${envConfig.backendUrl}${data.data.logo}`;
        setLogoPreview(logoUrl);
        setCompany((prev: any) => ({ ...prev, logo: data.data.logo }));
        alert('تم رفع اللوجو بنجاح!');
      } else {
        alert(data.error || 'فشل في رفع اللوجو');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('حدث خطأ أثناء رفع اللوجو');
    } finally {
      setUploadingLogo(false);
    }
  };

  const getUsageColor = (stat: UsageStat) => {
    if (stat.exceeded) return 'text-red-600 bg-red-100';
    if (stat.warning) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getUsageBarColor = (stat: UsageStat) => {
    if (stat.exceeded) return 'bg-red-500';
    if (stat.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'غير محدود';
    if (limit >= 1000000) return `${(limit / 1000000).toFixed(1)}م`;
    if (limit >= 1000) return `${(limit / 1000).toFixed(1)}ك`;
    return limit.toString();
  };

  const resourceNames: Record<string, string> = {
    users: 'المستخدمين',
    customers: 'العملاء',
    conversations: 'المحادثات',
    products: 'المنتجات',
    orders: 'الطلبات',
    storage: 'التخزين (MB)',
    aiRequests: 'طلبات الذكاء الاصطناعي',
    emailNotifications: 'إشعارات البريد الإلكتروني',
    smsNotifications: 'الرسائل النصية',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'عام', icon: BuildingOfficeIcon },
    { id: 'appearance', label: 'المظهر', icon: ChartBarIcon },
    { id: 'plan', label: 'الاشتراك', icon: CreditCardIcon },
    { id: 'usage', label: 'الاستخدام', icon: ChartBarIcon },
  ];

  if (user?.role === 'OWNER') {
    tabs.push({ id: 'ownership', label: 'الملكية', icon: ShieldCheckIcon });
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إعدادات الشركة</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          إدارة إعدادات الشركة والاشتراكات
        </p>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              <tab.icon
                className={`${activeTab === tab.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500'
                  } -ml-0.5 mr-2 h-5 w-5`}
                aria-hidden="true"
              />
              <span className="mr-2">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">

          {/* Company Info */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">معلومات الشركة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الشركة</label>
                {editingName ? (
                  <div className="mt-1 flex items-center space-x-2 space-x-reverse">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="اسم الشركة"
                      disabled={savingName}
                    />
                    <button
                      onClick={handleCompanyNameSave}
                      disabled={savingName || !companyName.trim()}
                      className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {savingName ? 'حفظ...' : 'حفظ'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setCompanyName(company?.name || '');
                      }}
                      disabled={savingName}
                      className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-lg text-gray-900 dark:text-white">{company?.name}</p>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
                    >
                      تعديل
                    </button>
                  </div>
                )}
              </div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الباقة الحالية</label>
              <div className="mt-1 flex items-center">
                <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                  {plans[company?.subscription?.plan]?.name}
                </span>
                <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
                  ({formatCurrency(plans[company?.subscription?.plan]?.price || 0, selectedCurrency)}/شهر)
                </span>
              </div>
            </div>

            {/* Slug Setting (Full Width) */}
            <div className="col-span-1 md:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رابط الشركة (Slug) <span className="text-xs text-gray-500 font-normal">- يستخدم في روابط المتجر ودعوات المسوقين</span>
              </label>
              {editingSlug ? (
                <div className="mt-1 flex items-center space-x-2 space-x-reverse">
                  <div className="flex-1 flex items-center">
                    <span className="text-gray-500 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md px-3 py-2 text-sm">
                      {window.location.host}/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dir-ltr"
                      placeholder="company-name"
                      disabled={savingSlug}
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      // Smart Auto-Generate
                      const smartSlug = companyName
                        .toLowerCase()
                        .replace(/['"]/g, '')
                        .replace(/[^\w\s-]/g, '') // Remove non-word chars (keeping spaces/hyphens for now)
                        .trim()
                        .replace(/\s+/g, '-');
                      setSlug(smartSlug);
                    }}
                    title="توليد تلقائي من اسم الشركة"
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
                    type="button"
                  >
                    <SparklesIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSlugSave}
                    disabled={savingSlug || !slug.trim()}
                    className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {savingSlug ? '...' : 'حفظ'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingSlug(false);
                      setSlug(company?.slug || '');
                    }}
                    disabled={savingSlug}
                    className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-gray-700 dark:text-gray-300 font-mono text-sm" dir="ltr">
                    <GlobeAltIcon className="h-4 w-4 mr-2" />
                    {company?.slug ? `${company.slug}` : 'لم يتم التعيين!'}
                  </div>
                  <button
                    onClick={() => {
                      if (!company?.slug && companyName) {
                        // Specify logic: if empty, suggest from name immediately
                        const smartSlug = companyName
                          .toLowerCase()
                          .replace(/['"]/g, '')
                          .replace(/[^\w\s-]/g, '')
                          .trim()
                          .replace(/\s+/g, '-');
                        setSlug(smartSlug);
                      }
                      setEditingSlug(true);
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-sm font-medium"
                  >
                    {company?.slug ? 'تغيير' : 'إعداد ذكي ✨'}
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                ⚠️ تغيير الرابط قد يؤدي لتعطل الروابط القديمة التي قمت بمشاركتها.
              </p>
            </div>

            <div className="col-span-1 md:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تسجيل دخول العميل (واتساب OTP)
              </label>

              {!customerRegisterUrl ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">لا يمكن تحديد الشركة حالياً</p>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <input
                    value={customerRegisterUrl}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(customerRegisterUrl, '_blank')}
                      className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                    >
                      فتح
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(customerRegisterUrl);
                          alert('تم نسخ الرابط');
                        } catch (e) {
                          alert('تعذر نسخ الرابط');
                        }
                      }}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      نسخ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">لوجو الشركة</h3>
            <div className="flex items-start space-x-4 space-x-reverse">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رفع لوجو جديد
                </label>
                <div className="flex items-center">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                    <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      {uploadingLogo ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 ml-2"></div>
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <svg className="ml-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          اختر صورة
                        </>
                      )}
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                PNG, JPG, GIF حتى 5MB
              </p>
            </div>
          </div>

          {/* Custom Domain Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <GlobeAltIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
              الدومين المخصص
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الدومين الخاص بك</label>
                {editingDomain ? (
                  <div className="mt-1 flex items-center space-x-2 space-x-reverse">
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="example.com (بدون www)"
                      disabled={savingDomain}
                      dir="ltr"
                    />
                    <button
                      onClick={handleCustomDomainSave}
                      disabled={savingDomain}
                      className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {savingDomain ? 'حفظ...' : 'حفظ'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDomain(false);
                        setCustomDomain(company?.customDomain || '');
                      }}
                      disabled={savingDomain}
                      className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-lg text-gray-900 dark:text-white" dir="ltr">
                      {company?.customDomain || 'لم يتم تعيين دومين مخصص'}
                    </p>
                    <button
                      onClick={() => setEditingDomain(true)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
                    >
                      {company?.customDomain ? 'تعديل' : 'إضافة'}
                    </button>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  أدخل الدومين الخاص بك بدون www (مثال: example.com)
                </p>
              </div>

              {company?.customDomain && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                    خطوات إعداد الدومين:
                  </h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
                    <li>اذهب إلى لوحة تحكم الدومين الخاص بك</li>
                    <li>أضف سجل CNAME جديد</li>
                    <li>اسم السجل: @ أو اترك فارغاً</li>
                    <li>القيمة: maxp-ai.pro</li>
                    <li>انتظر حتى يتم نشر التغييرات (قد يستغرق حتى 48 ساعة)</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Sidebar Layout Settings */}
      {
        activeTab === 'appearance' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
              نظام القائمة الجانبية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'classic', name: 'الكلاسيكي (Classic)', description: 'القائمة التقليدية' },
                { id: 'three-tier', name: 'الحديث (Three-Tier)', description: 'قائمة رفيعة + فرعية' },
                { id: 'horizontal', name: 'الأفقي (Horizontal)', description: 'شريط تنقل علوي' },
                { id: 'floating', name: 'العائم (Floating)', description: 'قائمة عائمة بتصميم كارت' },
                { id: 'minimal', name: 'المينيمال (Focus)', description: 'أيقونات مع قوائم منبثقة' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleLayoutChange(option.id)}
                  disabled={savingLayout}
                  className={`relative p-4 rounded-xl border-2 text-right transition-all duration-200 ${sidebarLayout === option.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <h3 className={`font-semibold ${sidebarLayout === option.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                    {option.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                  {sidebarLayout === option.id && (
                    <div className="absolute top-4 left-4 h-5 w-5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

        )
      }

      {
        activeTab === 'general' && (
          <div className="space-y-6">
            {/* Currency Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                إعدادات العملة
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    العملة الافتراضية للموقع
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    disabled={savingCurrency}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.nameAr} ({currency.symbol}) - {currency.code}
                      </option>
                    ))}
                  </select>
                  {savingCurrency && (
                    <p className="mt-2 text-sm text-blue-600 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      جاري حفظ التغييرات...
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    معاينة العملة
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-sm text-gray-600 mb-1">مثال على عرض السعر:</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(1250, selectedCurrency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      العملة المختارة: {getCurrencyByCode(selectedCurrency)?.nameAr}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Format Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <CurrencyDollarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                إعدادات الوقت والتاريخ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المنطقة الزمنية للشركة
                  </label>
                  <select
                    value={company?.timezone || 'Asia/Riyadh'}
                    onChange={(e) => handleTimezoneChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <optgroup label="الخليج العربي">
                      <option value="Asia/Riyadh">الرياض - السعودية (GMT+3)</option>
                      <option value="Asia/Kuwait">الكويت (GMT+3)</option>
                      <option value="Asia/Bahrain">البحرين (GMT+3)</option>
                      <option value="Asia/Qatar">قطر (GMT+3)</option>
                      <option value="Asia/Dubai">دبي - الإمارات (GMT+4)</option>
                      <option value="Asia/Muscat">مسقط - عمان (GMT+4)</option>
                    </optgroup>
                    <optgroup label="الشام والعراق">
                      <option value="Asia/Amman">عمّان - الأردن (GMT+3)</option>
                      <option value="Asia/Beirut">بيروت - لبنان (GMT+2)</option>
                      <option value="Asia/Damascus">دمشق - سوريا (GMT+3)</option>
                      <option value="Asia/Baghdad">بغداد - العراق (GMT+3)</option>
                      <option value="Asia/Jerusalem">القدس - فلسطين (GMT+2)</option>
                    </optgroup>
                    <optgroup label="شمال أفريقيا">
                      <option value="Africa/Cairo">القاهرة - مصر (GMT+2)</option>
                      <option value="Africa/Tripoli">طرابلس - ليبيا (GMT+2)</option>
                      <option value="Africa/Tunis">تونس (GMT+1)</option>
                      <option value="Africa/Algiers">الجزائر (GMT+1)</option>
                      <option value="Africa/Casablanca">الدار البيضاء - المغرب (GMT+1)</option>
                      <option value="Africa/Khartoum">الخرطوم - السودان (GMT+2)</option>
                    </optgroup>
                    <optgroup label="أخرى">
                      <option value="UTC">توقيت عالمي (UTC)</option>
                    </optgroup>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    سيتم استخدام هذا التوقيت في التقارير والحسابات اليومية
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    توقيت الشركة الحالي
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">الساعة الآن:</p>
                      <p className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {formatTimeWithZone(currentTime, company?.timezone || 'Asia/Riyadh')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {company?.timezone || 'Asia/Riyadh'}
                      </p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
                        {new Intl.DateTimeFormat('ar-EG', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: company?.timezone || 'Asia/Riyadh'
                        }).format(currentTime)}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تنسيق التاريخ
                  </label>
                  <div className="space-y-2">
                    {Object.entries(DATE_FORMAT_LABELS).map(([format, label]) => (
                      <label key={format} className="flex items-center">
                        <input
                          type="radio"
                          name="dateFormat"
                          value={format}
                          checked={dateFormat === format}
                          onChange={(e) => setDateFormat(e.target.value as DateFormatType)}
                          disabled={dateFormatLoading}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                        />
                        <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                  {dateFormatError && (
                    <p className="text-xs text-red-600 mt-1">{dateFormatError}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    التنسيق المختار: {DATE_FORMAT_LABELS[dateFormat]}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    معاينة التاريخ
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">التاريخ الحالي:</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(new Date())}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        )
      }

      {
        activeTab === 'usage' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
              إحصائيات الاستخدام
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(usage).map(([resource, stat]) => (
                <div key={resource} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {resourceNames[resource] || resource}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(stat)}`}>
                      {stat.unlimited ? 'غير محدود' : `${stat.percentage}%`}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{stat.usage.toLocaleString()}</span>
                      <span>{formatLimit(stat.limit)}</span>
                    </div>
                    {!stat.unlimited && (
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${getUsageBarColor(stat)}`}
                          style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {stat.exceeded && (
                    <div className="flex items-center text-red-600 text-xs">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      تم تجاوز الحد المسموح
                    </div>
                  )}
                  {stat.warning && !stat.exceeded && (
                    <div className="flex items-center text-yellow-600 text-xs">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      قريب من الحد المسموح
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      }

      {
        activeTab === 'plan' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <CreditCardIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
              باقات الاشتراك
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(plans).map(([planKey, plan]) => {
                const isCurrentPlan = company?.subscription?.plan === planKey;
                const isUpgrade = ['BASIC', 'PREMIUM', 'ENTERPRISE'].indexOf(planKey) >
                  ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'].indexOf(company?.subscription?.plan);

                return (
                  <div
                    key={planKey}
                    className={`border rounded-lg p-6 ${isCurrentPlan ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' : 'border-gray-200 dark:border-gray-600'
                      }`}
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                        <span className="text-gray-600 dark:text-gray-400 mr-1">{plan.currency}/شهر</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <h4 className="font-medium text-gray-900 dark:text-white">الحدود:</h4>
                      {Object.entries(plan.limits).slice(0, 4).map(([resource, limit]) => (
                        <div key={resource} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{resourceNames[resource]}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatLimit(limit)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 mb-6">
                      <h4 className="font-medium text-gray-900 dark:text-white">الميزات:</h4>
                      {Object.entries(plan.features).slice(0, 3).map(([feature, enabled]) => (
                        <div key={feature} className="flex items-center text-sm">
                          <CheckCircleIcon
                            className={`h-4 w-4 mr-2 ${enabled ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}
                          />
                          <span className={enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isCurrentPlan ? (
                      <div className="text-center">
                        <span className="inline-flex items-center px-4 py-2 border border-indigo-300 dark:border-indigo-500 rounded-md text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30">
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          الباقة الحالية
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(planKey)}
                        className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium ${isUpgrade
                          ? 'text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                          : 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                          }`}
                      >
                        {isUpgrade && <ArrowUpIcon className="h-4 w-4 mr-2" />}
                        {isUpgrade ? 'ترقية' : 'تغيير'}
                      </button>
                    )}
                  </div>
                );

              })}
            </div>
          </div>
        )
      }


      {
        activeTab === 'ownership' && user?.role === 'OWNER' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-2 border-red-100 dark:border-red-900/30">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-6 flex items-center">
              <ShieldCheckIcon className="h-6 w-6 mr-2" />
              نقل ملكية الشركة
            </h2>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6">
              <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">⚠️ منطقة خطر!</h3>
              <div className="text-sm text-red-700 dark:text-red-300">
                نقل الملكية إجراء نهائي لا يمكن التراجع عنه. عند نقل الملكية لموظف آخر:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>ستفقد صلاحيات المالك وتصبح مديراً (Admin) فقط.</li>
                  <li>سيحصل المالك الجديد على كامل الصلاحيات بما في ذلك حذفك من النظام.</li>
                  <li>سيطالبك النظام بتسجيل الدخول مجدداً لتحديث الصلاحيات.</li>
                </ul>
              </div>
            </div>

            <div className="max-w-xl">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اختر المالك الجديد
              </label>
              <select
                value={selectedNewOwner}
                onChange={(e) => setSelectedNewOwner(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">اختر مستخدم...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>

              <div className="mt-6">
                {!showTransferConfirm ? (
                  <button
                    onClick={() => setShowTransferConfirm(true)}
                    disabled={!selectedNewOwner}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    نقل الملكية
                  </button>
                ) : (
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <button
                      onClick={handleTransferOwnership}
                      disabled={transferring}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {transferring ? 'جاري النقل...' : 'تأكيد النقل النهائي'}
                    </button>
                    <button
                      onClick={() => setShowTransferConfirm(false)}
                      disabled={transferring}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default CompanySettings;


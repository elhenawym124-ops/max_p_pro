import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingStorefrontIcon,
  TruckIcon,
  ClipboardDocumentCheckIcon,
  GiftIcon,
  SparklesIcon,
  LightBulbIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  HomeIcon,
  PhotoIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';
import { storeSettingsService, Branch, ShippingZone } from '../../services/storeSettingsService';
import { checkoutFormSettingsService, CheckoutFormSettings } from '../../services/checkoutFormSettingsService';
import { footerSettingsService, FooterSettings } from '../../services/footerSettingsService';
import { BranchesSection } from '../../components/store/BranchesSection';
import { ShippingSectionV2 } from '../../components/store/ShippingSectionV2';
import { CheckoutFormSection } from '../../components/store/CheckoutFormSection';
import { FooterSettingsSection } from '../../components/store/FooterSettingsSection';
import { BranchModal } from '../../components/store/BranchModal';
import { ShippingModalV2 } from '../../components/store/ShippingModalV2';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';

const StoreSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'branches' | 'shipping' | 'checkout' | 'footer' | 'promotion' | 'delivery' | 'recommendations' | 'features' | 'homepage' | 'product-images'>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [checkoutSettings, setCheckoutSettings] = useState<Partial<CheckoutFormSettings>>({});
  const [footerSettings, setFooterSettings] = useState<Partial<FooterSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingShipping, setEditingShipping] = useState<ShippingZone | null>(null);

  // Branch form state
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    workingHours: '',
    isActive: true,
  });

  // Shipping form state
  const [shippingForm, setShippingForm] = useState<Partial<ShippingZone>>({
    name: '',
    governorateIds: [],
    governorates: [],
    pricingType: 'flat',
    price: 0,
    deliveryTime: '',
    deliveryTimeType: '1-2',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchesRes, shippingRes, checkoutRes, footerRes, turboRes] = await Promise.all([
        storeSettingsService.getBranches(),
        storeSettingsService.getShippingZones(),
        checkoutFormSettingsService.getSettings(),
        footerSettingsService.getSettings(),
      ]);
      setBranches(branchesRes.data.data || []);
      setShippingZones(shippingRes.data.data || []);
      setCheckoutSettings(checkoutRes.data.data || {});
      setFooterSettings(footerRes.data.data || {});
    } catch (error) {
      toast.error('فشل تحميل البيانات');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Branch operations
  const handleAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      workingHours: '',
      isActive: true,
    });
    setShowBranchModal(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm(branch);
    setShowBranchModal(true);
  };

  const handleSaveBranch = async () => {
    try {
      if (!branchForm.name || !branchForm.phone) {
        toast.error('يرجى ملء جميع الحقول المطلوبة (الاسم والهاتف)');
        return;
      }

      if (editingBranch) {
        await storeSettingsService.updateBranch(editingBranch.id, branchForm);
        toast.success('تم تحديث الفرع بنجاح');
      } else {
        await storeSettingsService.createBranch(branchForm);
        toast.success('تم إضافة الفرع بنجاح');
      }

      setShowBranchModal(false);
      loadData();
    } catch (error) {
      toast.error('فشل حفظ الفرع');
      console.error('Error saving branch:', error);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;

    try {
      await storeSettingsService.deleteBranch(id);
      toast.success('تم حذف الفرع بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل حذف الفرع');
      console.error('Error deleting branch:', error);
    }
  };

  // Shipping operations
  const handleAddShipping = () => {
    setEditingShipping(null);
    setShippingForm({
      name: '',
      governorateIds: [],
      governorates: [],
      pricingType: 'flat',
      price: 0,
      deliveryTime: '1-2 يوم',
      deliveryTimeType: '1-2',
      isActive: true,
    });
    setShowShippingModal(true);
  };

  const handleEditShipping = (zone: ShippingZone) => {
    setEditingShipping(zone);
    setShippingForm({
      ...zone,
      governorateIds: zone.governorateIds || [],
      pricingType: zone.pricingType || 'flat',
      deliveryTimeType: zone.deliveryTimeType || 'custom',
    });
    setShowShippingModal(true);
  };


  const handleSaveShipping = async () => {
    try {
      if (!shippingForm.name?.trim() || !shippingForm.governorateIds?.length || !shippingForm.deliveryTime) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      if (shippingForm.pricingType === 'flat' && (!shippingForm.price || shippingForm.price <= 0)) {
        toast.error('يرجى إدخال سعر صحيح');
        return;
      }

      if (shippingForm.pricingType === 'tiered' && (!shippingForm.pricingTiers?.length || shippingForm.pricingTiers.some(t => !t.price || t.price <= 0))) {
        toast.error('يرجى إدخال أسعار صحيحة لجميع الشرائح');
        return;
      }

      // Generate governorate name variations for backward compatibility
      const governorateNames = shippingForm.governorateIds?.map(id => {
        const gov = EGYPT_GOVERNORATES.find(g => g.id === id);
        return gov?.nameAr;
      }).filter(Boolean) as string[];

      const allVariations: string[] = [];
      governorateNames.forEach(name => {
        const variations = storeSettingsService.generateGovernorateVariations(name);
        allVariations.push(...variations);
      });

      const dataToSave = {
        ...shippingForm,
        governorates: allVariations,
      };

      if (editingShipping) {
        await storeSettingsService.updateShippingZone(editingShipping.id, dataToSave);
        toast.success('تم تحديث منطقة الشحن بنجاح');
      } else {
        await storeSettingsService.createShippingZone(dataToSave);
        toast.success('تم إضافة منطقة الشحن بنجاح');
      }

      setShowShippingModal(false);
      loadData();
    } catch (error) {
      toast.error('فشل حفظ منطقة الشحن');
      console.error('Error saving shipping zone:', error);
    }
  };

  const handleDeleteShipping = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المنطقة؟')) return;

    try {
      await storeSettingsService.deleteShippingZone(id);
      toast.success('تم حذف منطقة الشحن بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل حذف منطقة الشحن');
      console.error('Error deleting shipping zone:', error);
    }
  };

  // Checkout form operations
  const handleSaveCheckoutSettings = async () => {
    try {
      setSaving(true);
      await checkoutFormSettingsService.updateSettings(checkoutSettings);
      toast.success('تم حفظ إعدادات فورم الشيك أوت بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل حفظ الإعدادات');
      console.error('Error saving checkout settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetCheckoutSettings = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين الإعدادات للقيم الافتراضية؟')) return;

    try {
      setSaving(true);
      await checkoutFormSettingsService.resetSettings();
      toast.success('تم إعادة تعيين الإعدادات بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل إعادة تعيين الإعدادات');
      console.error('Error resetting checkout settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Footer settings operations
  const handleSaveFooterSettings = async () => {
    try {
      setSaving(true);
      await footerSettingsService.updateSettings(footerSettings);
      toast.success('تم حفظ إعدادات الفوتر بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل حفظ إعدادات الفوتر');
      console.error('Error saving footer settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetFooterSettings = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين إعدادات الفوتر للقيم الافتراضية؟')) return;

    try {
      setSaving(true);
      await footerSettingsService.resetSettings();
      toast.success('تم إعادة تعيين إعدادات الفوتر بنجاح');
      loadData();
    } catch (error) {
      toast.error('فشل إعادة تعيين إعدادات الفوتر');
      console.error('Error resetting footer settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <BuildingStorefrontIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
          إعدادات المتجر
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة الفروع، الشحن، العروض الترويجية، وخيارات التوصيل</p>
      </div>

      {/* Sidebar Layout */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-2 border border-transparent dark:border-gray-700">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('homepage')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'homepage'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <HomeIcon className="h-5 w-5 ml-3" />
                الصفحة الرئيسية
              </button>
              <button
                onClick={() => setActiveTab('branches')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'branches'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <BuildingStorefrontIcon className="h-5 w-5 ml-3" />
                الفروع
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'shipping'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <TruckIcon className="h-5 w-5 ml-3" />
                الشحن
              </button>
              <button
                onClick={() => setActiveTab('checkout')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'checkout'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <ClipboardDocumentCheckIcon className="h-5 w-5 ml-3" />
                فورم الشيك أوت
              </button>
              <button
                onClick={() => setActiveTab('footer')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'footer'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <DocumentTextIcon className="h-5 w-5 ml-3" />
                الفوتر
              </button>
              <button
                onClick={() => setActiveTab('promotion')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'promotion'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <GiftIcon className="h-5 w-5 ml-3" />
                الترويج والعروض
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'delivery'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <SparklesIcon className="h-5 w-5 ml-3" />
                خيارات التوصيل
              </button>
              <button
                onClick={() => navigate('/settings/storefront-features')}
                className="w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              >
                <GlobeAltIcon className="h-5 w-5 ml-3" />
                ميزات الواجهة
              </button>
              <button
                onClick={() => navigate('/settings/product-images')}
                className="w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              >
                <PhotoIcon className="h-5 w-5 ml-3" />
                إعدادات صور المنتج
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center transition-colors ${activeTab === 'recommendations'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <LightBulbIcon className="h-5 w-5 ml-3" />
                المنتجات المقترحة
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-transparent dark:border-gray-700">
          {activeTab === 'homepage' ? (
            <div className="text-center py-12">
              <HomeIcon className="h-16 w-16 text-indigo-400 dark:text-indigo-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                إدارة الصفحة الرئيسية
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                إنشاء وتخصيص الصفحة الرئيسية لمتجرك بتصميم احترافي وعصري
              </p>
              <button
                onClick={() => navigate('/settings/homepage')}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <HomeIcon className="h-5 w-5 ml-2" />
                إدارة الصفحات الرئيسية
              </button>
            </div>
          ) : activeTab === 'branches' ? (
            <BranchesSection
              branches={branches}
              onAdd={handleAddBranch}
              onEdit={handleEditBranch}
              onDelete={handleDeleteBranch}
            />
          ) : activeTab === 'shipping' ? (
            <ShippingSectionV2
              zones={shippingZones}
              onAdd={handleAddShipping}
              onEdit={handleEditShipping}
              onDelete={handleDeleteShipping}
            />
          ) : activeTab === 'checkout' ? (
            <CheckoutFormSection
              settings={checkoutSettings}
              onChange={setCheckoutSettings}
              onSave={handleSaveCheckoutSettings}
              onReset={handleResetCheckoutSettings}
              loading={saving}
            />
          ) : activeTab === 'footer' ? (
            <FooterSettingsSection
              settings={footerSettings}
              onChange={setFooterSettings}
              onSave={handleSaveFooterSettings}
              onReset={handleResetFooterSettings}
              loading={saving}
            />
          ) : activeTab === 'promotion' ? (
            <div className="text-center py-12">
              <GiftIcon className="h-16 w-16 text-indigo-400 dark:text-indigo-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                إعدادات الترويج والعروض
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                إدارة الشحن المجاني وخصومات الكميات والعروض الترويجية
              </p>
              <a
                href="/settings/promotion"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <GiftIcon className="h-5 w-5 ml-2" />
                فتح صفحة الإعدادات
              </a>
            </div>
          ) : activeTab === 'recommendations' ? (
            <div className="text-center py-12">
              <LightBulbIcon className="h-16 w-16 text-indigo-400 dark:text-indigo-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                إعدادات المنتجات المقترحة
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                تحكم في عرض المنتجات المشابهة، يُشترى معاً، والترقية (Upsell)
              </p>
              <a
                href="/settings/recommendations"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <LightBulbIcon className="h-5 w-5 ml-2" />
                فتح صفحة الإعدادات
              </a>
            </div>
          ) : (
            <div className="text-center py-12">
              <SparklesIcon className="h-16 w-16 text-indigo-400 dark:text-indigo-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                خيارات التوصيل المتعددة
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                إدارة خيارات التوصيل المختلفة (عادي، سريع، فوري) مع أسعار مختلفة
              </p>
              <a
                href="/settings/delivery-options"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <SparklesIcon className="h-5 w-5 ml-2" />
                فتح صفحة الإعدادات
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Branch Modal */}
      {showBranchModal && (
        <BranchModal
          branch={branchForm}
          isEditing={!!editingBranch}
          onClose={() => setShowBranchModal(false)}
          onSave={handleSaveBranch}
          onChange={setBranchForm}
        />
      )}

      {/* Shipping Modal */}
      {showShippingModal && (
        <ShippingModalV2
          zone={shippingForm}
          isEditing={!!editingShipping}
          onClose={() => setShowShippingModal(false)}
          onSave={handleSaveShipping}
          onChange={setShippingForm}
        />
      )}
    </div>
  );
};

export default StoreSettings;


import React, { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { ShippingZone, PricingTier } from '../../services/storeSettingsService';
import { GovernoratesSelector } from './GovernorateSelector';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';

interface ShippingModalV2Props {
  zone: Partial<ShippingZone>;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (zone: Partial<ShippingZone>) => void;
}

const DELIVERY_TIME_OPTIONS = [
  { value: 'same-day', label: 'نفس اليوم', description: 'التوصيل في نفس يوم الطلب' },
  { value: '1-2', label: '1-2 يوم', description: 'التوصيل خلال يوم إلى يومين' },
  { value: '3-5', label: '3-5 أيام', description: 'التوصيل خلال 3 إلى 5 أيام' },
  { value: '5-7', label: '5-7 أيام', description: 'التوصيل خلال 5 إلى 7 أيام' },
  { value: 'custom', label: 'مخصص', description: 'أدخل مدة مخصصة' },
];

export const ShippingModalV2: React.FC<ShippingModalV2Props> = ({
  zone,
  isEditing,
  onClose,
  onSave,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'advanced'>('basic');

  const handleGovernorateChange = (ids: string[]) => {
    const names = ids.map(id => {
      const gov = EGYPT_GOVERNORATES.find(g => g.id === id);
      return gov?.nameAr || '';
    }).filter(Boolean);

    onChange({
      ...zone,
      governorateIds: ids,
      governorates: names,
    });
  };

  const handlePricingTypeChange = (type: 'flat' | 'tiered') => {
    if (type === 'tiered' && !zone.pricingTiers) {
      onChange({
        ...zone,
        pricingType: type,
        pricingTiers: [
          { minWeight: 0, maxWeight: 5, price: 0 },
        ],
      });
    } else {
      onChange({ ...zone, pricingType: type });
    }
  };

  const addPricingTier = () => {
    const tiers = zone.pricingTiers || [];
    const lastTier = tiers[tiers.length - 1];
    const newTier: PricingTier = {
      minWeight: lastTier?.maxWeight || 0,
      maxWeight: (lastTier?.maxWeight || 0) + 5,
      price: 0,
    };
    onChange({
      ...zone,
      pricingTiers: [...tiers, newTier],
    });
  };

  const updatePricingTier = (index: number, tier: PricingTier) => {
    const tiers = [...(zone.pricingTiers || [])];
    tiers[index] = tier;
    onChange({ ...zone, pricingTiers: tiers });
  };

  const removePricingTier = (index: number) => {
    const tiers = zone.pricingTiers?.filter((_, i) => i !== index) || [];
    onChange({ ...zone, pricingTiers: tiers });
  };

  const handleDeliveryTimeTypeChange = (type: string) => {
    const option = DELIVERY_TIME_OPTIONS.find(opt => opt.value === type);
    onChange({
      ...zone,
      deliveryTimeType: type as any,
      deliveryTime: type === 'custom' ? zone.deliveryTime || '' : option?.label || '',
    });
  };

  const isValid = () => {
    if (!zone.name?.trim()) return false;
    if (!zone.governorateIds?.length) return false;
    if (zone.pricingType === 'flat' && (!zone.price || zone.price <= 0)) return false;
    if (zone.pricingType === 'tiered' && (!zone.pricingTiers?.length || zone.pricingTiers.some(t => !t.price || t.price <= 0))) return false;
    if (!zone.deliveryTime?.trim()) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden border border-transparent dark:border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'تعديل منطقة الشحن' : 'إضافة منطقة شحن جديدة'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              المعلومات الأساسية
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pricing'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              التسعير
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'advanced'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              الإعدادات المتقدمة
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Zone Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم المنطقة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={zone.name || ''}
                  onChange={(e) => onChange({ ...zone, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثال: القاهرة الكبرى، الوجه البحري، الصعيد"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  اسم وصفي للمنطقة لسهولة التعرف عليها
                </p>
              </div>

              {/* Governorates Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المحافظات <span className="text-red-500">*</span>
                </label>
                <GovernoratesSelector
                  selectedIds={zone.governorateIds || []}
                  onChange={handleGovernorateChange}
                />
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  مدة التوصيل <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DELIVERY_TIME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleDeliveryTimeTypeChange(option.value)}
                      className={`p-3 rounded-lg border-2 text-right transition-all ${
                        zone.deliveryTimeType === option.value
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
                    </button>
                  ))}
                </div>

                {zone.deliveryTimeType === 'custom' && (
                  <input
                    type="text"
                    value={zone.deliveryTime || ''}
                    onChange={(e) => onChange({ ...zone, deliveryTime: e.target.value })}
                    className="mt-3 w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="أدخل مدة التوصيل المخصصة"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Pricing Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  نوع التسعير <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handlePricingTypeChange('flat')}
                    className={`p-4 rounded-lg border-2 text-right transition-all ${
                      zone.pricingType === 'flat'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">سعر ثابت</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      سعر واحد لجميع الطلبات بغض النظر عن الوزن أو القيمة
                    </div>
                  </button>

                  <button
                    onClick={() => handlePricingTypeChange('tiered')}
                    className={`p-4 rounded-lg border-2 text-right transition-all ${
                      zone.pricingType === 'tiered'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">تسعير متدرج</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      أسعار مختلفة حسب الوزن أو قيمة الطلب
                    </div>
                  </button>
                </div>
              </div>

              {/* Flat Pricing */}
              {zone.pricingType === 'flat' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سعر الشحن (جنيه) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={zone.price || ''}
                    onChange={(e) => onChange({ ...zone, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="50"
                  />
                </div>
              )}

              {/* Tiered Pricing */}
              {zone.pricingType === 'tiered' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      شرائح الأسعار <span className="text-red-500">*</span>
                    </label>
                    <button
                      onClick={addPricingTier}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <PlusIcon className="h-4 w-4" />
                      إضافة شريحة
                    </button>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        يمكنك تحديد أسعار مختلفة حسب الوزن أو قيمة الطلب. سيتم اختيار السعر المناسب تلقائياً عند الطلب.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {zone.pricingTiers?.map((tier, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            الشريحة {index + 1}
                          </span>
                          {zone.pricingTiers && zone.pricingTiers.length > 1 && (
                            <button
                              onClick={() => removePricingTier(index)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              الوزن من (كجم)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={tier.minWeight || ''}
                              onChange={(e) => updatePricingTier(index, { ...tier, minWeight: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              الوزن إلى (كجم)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={tier.maxWeight || ''}
                              onChange={(e) => updatePricingTier(index, { ...tier, maxWeight: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              السعر (جنيه) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tier.price || ''}
                              onChange={(e) => updatePricingTier(index, { ...tier, price: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              قيمة الطلب من (جنيه)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tier.minOrderValue || ''}
                              onChange={(e) => updatePricingTier(index, { ...tier, minOrderValue: parseFloat(e.target.value) || undefined })}
                              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="اختياري"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              قيمة الطلب إلى (جنيه)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tier.maxOrderValue || ''}
                              onChange={(e) => updatePricingTier(index, { ...tier, maxOrderValue: parseFloat(e.target.value) || undefined })}
                              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="اختياري"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Free Shipping Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  حد الشحن المجاني (جنيه)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={zone.freeShippingThreshold || ''}
                  onChange={(e) => onChange({ ...zone, freeShippingThreshold: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  إذا كانت قيمة الطلب أكبر من هذا المبلغ، سيكون الشحن مجاني. اتركه فارغاً لتعطيل الشحن المجاني.
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <input
                  type="checkbox"
                  id="zoneActive"
                  checked={zone.isActive !== false}
                  onChange={(e) => onChange({ ...zone, isActive: e.target.checked })}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <div>
                  <label htmlFor="zoneActive" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    المنطقة نشطة
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    عند التعطيل، لن تظهر هذه المنطقة للعملاء
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {!isValid() && (
                <span className="text-red-600 dark:text-red-400">
                  ⚠️ يرجى ملء جميع الحقول المطلوبة
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={onSave}
                disabled={!isValid()}
                className={`px-6 py-2.5 rounded-md transition-colors font-medium shadow-lg ${
                  isValid()
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {isEditing ? 'حفظ التغييرات' : 'إضافة المنطقة'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

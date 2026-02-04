import React from 'react';
import { XMarkIcon, PlusIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { ShippingZone } from '../../services/storeSettingsService';

interface ShippingModalProps {
  zone: Partial<ShippingZone>;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (zone: Partial<ShippingZone>) => void;
  governorateInput: string;
  onGovernorateInputChange: (value: string) => void;
  onAddGovernorate: () => void;
  onRemoveGovernorate: (index: number) => void;
}

export const ShippingModal: React.FC<ShippingModalProps> = ({
  zone,
  isEditing,
  onClose,
  onSave,
  onChange,
  governorateInput,
  onGovernorateInputChange,
  onAddGovernorate,
  onRemoveGovernorate,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddGovernorate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-transparent dark:border-gray-700 shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
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

          <div className="space-y-6">
            {/* Governorates Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المحافظات <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={governorateInput}
                  onChange={(e) => onGovernorateInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="أدخل اسم المحافظة (مثال: القاهرة)"
                />
                <button
                  onClick={onAddGovernorate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  <PlusIcon className="h-5 w-5 ml-1" />
                  إضافة
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  💡 <strong>ملاحظة:</strong> سيتم إنشاء جميع التنويعات تلقائياً (مع/بدون "ال"، ه/ة) لتطابق مختلف أشكال كتابة اسم المحافظة
                </p>
              </div>

              {/* Display added governorates */}
              {zone.governorates && zone.governorates.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المحافظات والتنويعات المضافة:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {zone.governorates.map((gov, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 text-sm rounded-full"
                      >
                        {gov}
                        <button
                          onClick={() => onRemoveGovernorate(idx)}
                          className="mr-1 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price and Delivery Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مدة التوصيل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={zone.deliveryTime || ''}
                  onChange={(e) => onChange({ ...zone, deliveryTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1-2 أيام"
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="zoneActive"
                checked={zone.isActive !== false}
                onChange={(e) => onChange({ ...zone, isActive: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              <label htmlFor="zoneActive" className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                المنطقة نشطة
              </label>
            </div>

            {/* Example Section */}
            <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                مثال على التنويعات:
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                إذا أضفت "القاهرة" سيتم تلقائياً إضافة التنويعات التالية:
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">القاهرة</span>
                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">قاهرة</span>
                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">القاهره</span>
                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">قاهره</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-lg"
            >
              {isEditing ? 'حفظ التغييرات' : 'إضافة المنطقة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  TruckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ShippingZone } from '../../services/storeSettingsService';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';

interface ShippingSectionV2Props {
  zones: ShippingZone[];
  onAdd: () => void;
  onEdit: (zone: ShippingZone) => void;
  onDelete: (id: string) => void;
}

// Helper function to parse JSON fields
const parseJsonField = (field: any): any[] => {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

export const ShippingSectionV2: React.FC<ShippingSectionV2Props> = ({
  zones,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Analytics
  const analytics = useMemo(() => {
    const totalGovernorates = EGYPT_GOVERNORATES.length;
    const coveredGovIds = new Set<string>();
    const duplicates = new Set<string>();
    
    zones.forEach(zone => {
      if (zone.isActive && zone.governorateIds) {
        const govIds = parseJsonField(zone.governorateIds);
        govIds.forEach(id => {
          if (coveredGovIds.has(id)) {
            duplicates.add(id);
          }
          coveredGovIds.add(id);
        });
      }
    });

    const uncoveredGovs = EGYPT_GOVERNORATES.filter(
      gov => !coveredGovIds.has(gov.id)
    );

    return {
      totalZones: zones.length,
      activeZones: zones.filter(z => z.isActive).length,
      coveredCount: coveredGovIds.size,
      totalGovernorates,
      coveragePercent: Math.round((coveredGovIds.size / totalGovernorates) * 100),
      uncoveredGovs,
      duplicates: Array.from(duplicates),
    };
  }, [zones]);

  // Filter zones
  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      const governorates = parseJsonField(zone.governorates);
      const matchesSearch = zone.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           governorates.some(g => g.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && zone.isActive) ||
                           (filterStatus === 'inactive' && !zone.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [zones, searchTerm, filterStatus]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">مناطق الشحن</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {analytics.totalZones} منطقة • تغطية {analytics.coveragePercent}% من المحافظات
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
              showAnalytics
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <ChartBarIcon className="h-5 w-5" />
            التحليلات
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة منطقة
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            تحليل التغطية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{analytics.totalZones}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">إجمالي المناطق</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.activeZones}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">المناطق النشطة</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.coveragePercent}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">نسبة التغطية</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analytics.uncoveredGovs.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">محافظات غير مغطاة</div>
            </div>
          </div>

          {/* Warnings */}
          {(analytics.duplicates.length > 0 || analytics.uncoveredGovs.length > 0) && (
            <div className="space-y-3">
              {analytics.duplicates.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                        تحذير: محافظات مكررة في أكثر من منطقة ({analytics.duplicates.length})
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {analytics.duplicates.slice(0, 5).map(id => {
                          const gov = EGYPT_GOVERNORATES.find(g => g.id === id);
                          return gov ? (
                            <span key={id} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 text-xs rounded">
                              {gov.nameAr}
                            </span>
                          ) : null;
                        })}
                        {analytics.duplicates.length > 5 && (
                          <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-900/60 text-yellow-900 dark:text-yellow-200 text-xs rounded font-medium">
                            +{analytics.duplicates.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analytics.uncoveredGovs.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-300">
                        محافظات غير مغطاة ({analytics.uncoveredGovs.length})
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {analytics.uncoveredGovs.slice(0, 8).map(gov => (
                          <span key={gov.id} className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs rounded">
                            {gov.nameAr}
                          </span>
                        ))}
                        {analytics.uncoveredGovs.length > 8 && (
                          <span className="px-2 py-1 bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-200 text-xs rounded font-medium">
                            +{analytics.uncoveredGovs.length - 8}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن منطقة أو محافظة..."
            className="w-full pr-10 pl-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">كل المناطق</option>
            <option value="active">النشطة فقط</option>
            <option value="inactive">غير النشطة</option>
          </select>
        </div>
      </div>

      {/* Info Note */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>ملاحظة:</strong> سيتم استخدام هذه المناطق بواسطة الذكاء الصناعي لحساب تكلفة الشحن تلقائياً بناءً على محافظة العميل.
        </p>
      </div>

      {/* Zones List */}
      {filteredZones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-transparent dark:border-gray-700">
          <TruckIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || filterStatus !== 'all' ? 'لا توجد مناطق تطابق البحث' : 'لا توجد مناطق شحن مضافة'}
          </p>
          <button
            onClick={onAdd}
            className="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            إضافة منطقة جديدة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredZones.map((zone) => {
            const governoratesArray = parseJsonField(zone.governorates);
            const governorateIds = parseJsonField(zone.governorateIds);
            
            const governorateNames = governorateIds.map(id => {
              const gov = EGYPT_GOVERNORATES.find(g => g.id === id);
              return gov?.nameAr;
            }).filter(Boolean);
            
            // Fallback to governorates array if no IDs
            // Remove duplicates and variations by keeping only unique base names
            let displayNames = governorateNames.length > 0 ? governorateNames : governoratesArray;
            
            // If using governorates array (old data), remove duplicates
            if (governorateNames.length === 0 && governoratesArray.length > 0) {
              const uniqueNames = new Set<string>();
              governoratesArray.forEach(name => {
                // Normalize: remove "ال" prefix and standardize ة/ه endings
                const normalized = name.replace(/^ال/, '').replace(/ه$/, 'ة');
                // Keep the first occurrence (usually the most common form)
                if (!Array.from(uniqueNames).some(existing => 
                  existing.replace(/^ال/, '').replace(/ه$/, 'ة') === normalized
                )) {
                  uniqueNames.add(name);
                }
              });
              displayNames = Array.from(uniqueNames);
            }

            return (
              <div
                key={zone.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {zone.name || 'منطقة بدون اسم'}
                      </h3>
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          zone.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {zone.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                      {zone.pricingType === 'tiered' && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400">
                          تسعير متدرج
                        </span>
                      )}
                      {zone.freeShippingThreshold && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                          شحن مجاني فوق {zone.freeShippingThreshold} ج.م
                        </span>
                      )}
                    </div>

                    {/* Governorates */}
                    {displayNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {displayNames.slice(0, 8).map((name, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md"
                          >
                            {name}
                          </span>
                        ))}
                        {displayNames.length > 8 && (
                          <span className="px-2.5 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs rounded-md font-medium">
                            +{displayNames.length - 8} أخرى
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-left mr-4">
                    {zone.pricingType === 'flat' ? (
                      <div className="flex items-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        <CurrencyDollarIcon className="h-6 w-6 ml-1" />
                        {zone.price} ج.م
                      </div>
                    ) : (
                      <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                        {zone.pricingTiers?.length || 0} شريحة سعر
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <ClockIcon className="h-4 w-4 ml-1" />
                      {zone.deliveryTime}
                    </div>
                  </div>
                </div>

                {/* Pricing Tiers Preview */}
                {zone.pricingType === 'tiered' && zone.pricingTiers && zone.pricingTiers.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">شرائح الأسعار:</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {zone.pricingTiers.slice(0, 3).map((tier, idx) => (
                        <div key={idx} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                          <div className="text-gray-600 dark:text-gray-400">
                            {tier.minWeight || 0} - {tier.maxWeight || '∞'} كجم
                          </div>
                          <div className="font-bold text-indigo-600 dark:text-indigo-400">
                            {tier.price} ج.م
                          </div>
                        </div>
                      ))}
                      {zone.pricingTiers.length > 3 && (
                        <div className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded flex items-center justify-center text-gray-600 dark:text-gray-400">
                          +{zone.pricingTiers.length - 3} أخرى
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(zone)}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors gap-1"
                  >
                    <PencilIcon className="h-4 w-4" />
                    تعديل
                  </button>
                  <button
                    onClick={() => onDelete(zone.id)}
                    className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

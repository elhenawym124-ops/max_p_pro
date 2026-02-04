import React, { useState, useEffect } from 'react';
import { FunnelIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

interface AdvancedFiltersProps {
  enabled: boolean;
  settings: {
    filterByPrice: boolean;
    filterByRating: boolean;
    filterByBrand: boolean;
    filterByAttributes: boolean;
  };
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  priceRange?: { min: number; max: number };
  brands?: string[];
  attributes?: { name: string; values: string[] }[];
  resultsCount?: number;
}

export interface FilterState {
  priceRange: { min: number; max: number };
  rating: number | null;
  brand: string | null;
  attributes: string[];
  inStock: boolean | null;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  enabled,
  settings,
  onApply,
  onReset,
  priceRange,
  brands = [],
  attributes = [],
  resultsCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate default price range
  const defaultMin = priceRange?.min || 0;
  const defaultMax = priceRange?.max || 10000;
  
  const [filters, setFilters] = useState<FilterState>({
    priceRange: { min: defaultMin, max: defaultMax },
    rating: null,
    brand: null,
    attributes: [],
    inStock: null
  });

  // Update price range when prop changes
  useEffect(() => {
    if (priceRange) {
      setFilters(prev => ({
        ...prev,
        priceRange: {
          min: prev.priceRange.min === defaultMin ? priceRange.min : prev.priceRange.min,
          max: prev.priceRange.max === defaultMax ? priceRange.max : prev.priceRange.max
        }
      }));
    }
  }, [priceRange, defaultMin, defaultMax]);

  if (!enabled) return null;

  const handleApply = () => {
    onApply(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      priceRange: { min: defaultMin, max: defaultMax },
      rating: null,
      brand: null,
      attributes: [],
      inStock: null
    };
    setFilters(resetFilters);
    onReset();
  };

  const handlePriceMinChange = (value: string) => {
    const numValue = parseFloat(value) || defaultMin;
    setFilters({
      ...filters,
      priceRange: {
        ...filters.priceRange,
        min: Math.min(numValue, filters.priceRange.max)
      }
    });
  };

  const handlePriceMaxChange = (value: string) => {
    const numValue = parseFloat(value) || defaultMax;
    setFilters({
      ...filters,
      priceRange: {
        ...filters.priceRange,
        max: Math.max(numValue, filters.priceRange.min)
      }
    });
  };

  const handleAttributeToggle = (attributeValue: string) => {
    setFilters({
      ...filters,
      attributes: filters.attributes.includes(attributeValue)
        ? filters.attributes.filter(a => a !== attributeValue)
        : [...filters.attributes, attributeValue]
    });
  };

  const hasActiveFilters = 
    filters.priceRange.min !== defaultMin ||
    filters.priceRange.max !== defaultMax ||
    filters.rating !== null ||
    filters.brand !== null ||
    filters.attributes.length > 0 ||
    filters.inStock !== null;

  return (
    <>
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-all duration-200 ${
          hasActiveFilters
            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
        }`}
      >
        <FunnelIcon className="h-5 w-5" />
        <span className="font-medium">فلاتر متقدمة</span>
        {hasActiveFilters && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
            !
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">الفلاتر المتقدمة</h2>
                  {resultsCount !== undefined && (
                    <p className="text-sm text-gray-500 mt-1">
                      {resultsCount} منتج
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="إغلاق"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              {/* Price Filter */}
              {settings.filterByPrice && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>السعر</span>
                    <span className="text-xs text-gray-500 font-normal">
                      ({Math.round(filters.priceRange.min)} - {Math.round(filters.priceRange.max)})
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {/* Range Inputs */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">من</label>
                        <input
                          type="number"
                          min={defaultMin}
                          max={defaultMax}
                          value={Math.round(filters.priceRange.min)}
                          onChange={(e) => handlePriceMinChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <span className="text-gray-400 mt-6">-</span>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">إلى</label>
                        <input
                          type="number"
                          min={defaultMin}
                          max={defaultMax}
                          value={Math.round(filters.priceRange.max)}
                          onChange={(e) => handlePriceMaxChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                    
                    {/* Range Slider */}
                    <div className="relative py-4">
                      <div className="relative h-2 bg-gray-200 rounded-full">
                        {/* Active range indicator */}
                        <div
                          className="absolute h-2 bg-indigo-600 rounded-full"
                          style={{
                            right: `${((defaultMax - filters.priceRange.max) / (defaultMax - defaultMin)) * 100}%`,
                            left: `${((filters.priceRange.min - defaultMin) / (defaultMax - defaultMin)) * 100}%`
                          }}
                        ></div>
                        
                        {/* Min slider */}
                        <input
                          type="range"
                          min={defaultMin}
                          max={defaultMax}
                          value={filters.priceRange.min}
                          onChange={(e) => handlePriceMinChange(e.target.value)}
                          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10 slider-thumb"
                        />
                        
                        {/* Max slider */}
                        <input
                          type="range"
                          min={defaultMin}
                          max={defaultMax}
                          value={filters.priceRange.max}
                          onChange={(e) => handlePriceMaxChange(e.target.value)}
                          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-20 slider-thumb"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rating Filter */}
              {settings.filterByRating && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">التقييم</h3>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <label
                        key={rating}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          filters.rating === rating
                            ? 'bg-indigo-50 border-2 border-indigo-500'
                            : 'border-2 border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rating"
                          checked={filters.rating === rating}
                          onChange={() =>
                            setFilters({
                              ...filters,
                              rating: filters.rating === rating ? null : rating
                            })
                          }
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i}>
                              {i < rating ? (
                                <StarIcon className="h-5 w-5 text-yellow-400" />
                              ) : (
                                <StarOutlineIcon className="h-5 w-5 text-gray-300" />
                              )}
                            </span>
                          ))}
                          <span className="text-sm text-gray-600 font-medium mr-auto">
                            {rating} فأكثر
                          </span>
                        </div>
                        {filters.rating === rating && (
                          <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand Filter */}
              {settings.filterByBrand && brands.length > 0 && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">العلامة التجارية</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {brands.map((brand) => (
                      <label
                        key={brand}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                          filters.brand === brand
                            ? 'bg-indigo-50 border border-indigo-500'
                            : 'border border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="brand"
                          checked={filters.brand === brand}
                          onChange={() =>
                            setFilters({
                              ...filters,
                              brand: filters.brand === brand ? null : brand
                            })
                          }
                          className="sr-only"
                        />
                        <span className="flex-1 text-sm text-gray-700">{brand}</span>
                        {filters.brand === brand && (
                          <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Attributes Filter */}
              {settings.filterByAttributes && attributes.length > 0 && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">الخصائص</h3>
                  <div className="space-y-4">
                    {attributes.map((attr) => (
                      <div key={attr.name}>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{attr.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value) => (
                            <button
                              key={value}
                              onClick={() => handleAttributeToggle(`${attr.name}:${value}`)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                filters.attributes.includes(`${attr.name}:${value}`)
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Filter */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">التوفر</h3>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      filters.inStock === true
                        ? 'bg-indigo-50 border-2 border-indigo-500'
                        : 'border-2 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stock"
                      checked={filters.inStock === true}
                      onChange={() =>
                        setFilters({
                          ...filters,
                          inStock: filters.inStock === true ? null : true
                        })
                      }
                      className="sr-only"
                    />
                    <span className="flex-1 text-sm text-gray-700 font-medium">متوفر فقط</span>
                    {filters.inStock === true && (
                      <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                    )}
                  </label>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      filters.inStock === null
                        ? 'bg-indigo-50 border-2 border-indigo-500'
                        : 'border-2 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stock"
                      checked={filters.inStock === null}
                      onChange={() => setFilters({ ...filters, inStock: null })}
                      className="sr-only"
                    />
                    <span className="flex-1 text-sm text-gray-700 font-medium">الكل</span>
                    {filters.inStock === null && (
                      <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                    )}
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8 sticky bottom-0 bg-white pt-4 pb-2">
                <button
                  onClick={handleReset}
                  disabled={!hasActiveFilters}
                  className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                    hasActiveFilters
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  إعادة تعيين
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/50"
                >
                  تطبيق الفلاتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        .slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: none;
        }
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          pointer-events: all;
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          pointer-events: all;
        }
      `}</style>
    </>
  );
};

export default AdvancedFilters;

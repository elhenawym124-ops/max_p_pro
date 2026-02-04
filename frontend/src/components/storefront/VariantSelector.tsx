import React from 'react';

interface Variant {
  id: string;
  name: string;
  type: string;
  stock: number;
  images?: string[];
  price?: number;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariant: string | null;
  onSelect: (variantId: string) => void;
  style: 'buttons' | 'circles' | 'thumbnails' | 'dropdown' | 'swatches' | 'table' | 'grid';
  showName?: boolean;
  showStock?: boolean;
  size?: 'small' | 'medium' | 'large';
  variantType: 'color' | 'size';
  productPrice?: number;
  overrideStyle?: 'buttons' | 'circles' | 'thumbnails' | 'dropdown' | 'swatches' | 'table' | 'grid';
  attributeImages?: { [value: string]: string };
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onSelect,
  style,
  showName = true,
  showStock = true,
  size = 'medium',
  variantType,
  productPrice,
  overrideStyle,
  attributeImages
}) => {
  if (variants.length === 0) return null;

  const activeStyle = overrideStyle || style;

  const sizeClasses = {
    small: 'h-6 w-6 text-xs px-2 py-1',
    medium: 'h-8 w-8 text-sm px-3 py-2',
    large: 'h-10 w-10 text-base px-4 py-3'
  };

  const getColorFromName = (name: string): string => {
    const colorMap: Record<string, string> = {
      'أحمر': '#ef4444',
      'أزرق': '#3b82f6',
      'أخضر': '#10b981',
      'أسود': '#000000',
      'أبيض': '#ffffff',
      'رمادي': '#6b7280',
      'أصفر': '#fbbf24',
      'برتقالي': '#f97316',
      'بنفسجي': '#a855f7',
      'وردي': '#ec4899',
      'بني': '#92400e',
      'ذهبي': '#fbbf24',
      'فضي': '#9ca3af',
      'red': '#ef4444',
      'blue': '#3b82f6',
      'green': '#10b981',
      'black': '#000000',
      'white': '#ffffff',
      'gray': '#6b7280',
      'grey': '#6b7280',
      'yellow': '#fbbf24',
      'orange': '#f97316',
      'purple': '#a855f7',
      'pink': '#ec4899',
      'brown': '#92400e',
      'gold': '#fbbf24',
      'silver': '#9ca3af',
    };
    return colorMap[name.toLowerCase()] || '#6b7280';
  };

  const getPriceDifference = (variantPrice: number | undefined) => {
    if (!productPrice || !variantPrice || Math.abs(variantPrice - productPrice) < 0.1) return null;
    const diff = variantPrice - productPrice;
    return diff > 0 ? `(+${diff})` : `(${diff})`;
  };

  const renderButtons = () => (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const priceDiff = getPriceDifference(variant.price);
        return (
          <button
            key={variant.id}
            onClick={() => onSelect(variant.id)}
            disabled={variant.stock === 0}
            className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${selectedVariant === variant.id
              ? 'border-blue-600 bg-blue-50 text-blue-600'
              : variant.stock === 0
                ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed decoration-slice'
                : 'border-gray-300 hover:border-blue-600'
              }`}
          >
            <span className={variant.stock === 0 ? 'line-through' : ''}>
              {variant.name}
            </span>
            {priceDiff && <span className="text-xs mr-1 font-bold text-gray-500">{priceDiff}</span>}
            {showStock && variant.stock === 0 && <span className="text-xs mr-1 text-red-500 font-normal">(غير متوفر)</span>}
          </button>
        );
      })}
    </div>
  );

  const renderCircles = () => (
    <div className="flex flex-wrap gap-3">
      {variants.map((variant) => {
        const color = getColorFromName(variant.name);
        const image = attributeImages?.[variant.name];

        return (
          <button
            key={variant.id}
            onClick={() => onSelect(variant.id)}
            disabled={variant.stock === 0}
            className={`relative ${sizeClasses[size]} rounded-full border-2 transition-all ${selectedVariant === variant.id
              ? 'border-blue-600 ring-2 ring-blue-200'
              : variant.stock === 0
                ? 'border-gray-200 opacity-40 cursor-not-allowed relative overflow-hidden'
                : 'border-gray-300 hover:border-blue-400'
              }`}
            style={image ? {
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent'
            } : { backgroundColor: color }}
            title={`${variant.name}${productPrice && variant.price ? ` (${variant.price} ج.م)` : ''}`}
          >
            {variant.stock === 0 && (
              <div className="absolute inset-0 bg-gray-400 opacity-20 transform rotate-45 scale-150 border-t border-black" />
            )}
            {selectedVariant === variant.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-full">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
      {showName && (
        <div className="flex items-center gap-2 mt-2 w-full min-h-[1.5rem]">
          {selectedVariant ? (
            (() => {
              const v = variants.find(v => v.id === selectedVariant);
              if (!v) return null;
              const priceDiff = getPriceDifference(v.price);
              return (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <span className="font-medium text-gray-900">{v.name}</span>
                  {priceDiff && <span className="text-sm font-bold text-green-600">{priceDiff}</span>}
                  {v.stock === 0 && <span className="text-sm text-red-500">(غير متوفر)</span>}
                </div>
              );
            })()
          ) : (
            <span className="text-sm text-gray-500">اختر لوناً</span>
          )}
        </div>
      )}
    </div>
  );

  const renderThumbnails = () => (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
      {variants.map((variant) => {
        const priceDiff = getPriceDifference(variant.price);
        return (
          <button
            key={variant.id}
            onClick={() => onSelect(variant.id)}
            disabled={variant.stock === 0}
            className={`group relative border-2 rounded-lg overflow-hidden transition-all text-center ${selectedVariant === variant.id
              ? 'border-blue-600 ring-2 ring-blue-200'
              : variant.stock === 0
                ? 'border-gray-200 opacity-60 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400'
              }`}
          >
            <div className="aspect-w-1 aspect-h-1 w-full bg-gray-100">
              {(attributeImages?.[variant.name] || (variant.images && variant.images.length > 0)) ? (
                <img
                  src={attributeImages?.[variant.name] || variant.images![0]}
                  alt={variant.name}
                  className={`w-full h-16 object-cover ${variant.stock === 0 ? 'grayscale' : ''}`}
                />
              ) : (
                <div
                  className="w-full h-16"
                  style={{ backgroundColor: getColorFromName(variant.name) }}
                />
              )}
            </div>
            {showName && (
              <div className="p-1 text-[10px] sm:text-xs font-medium truncate w-full">
                {variant.name}
              </div>
            )}
            {priceDiff && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-1 rounded-bl shadow-sm">
                {priceDiff}
              </div>
            )}
            {variant.stock === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                <span className="text-xs font-bold text-red-600 bg-white bg-opacity-90 px-1 rounded transform -rotate-12 border border-red-200">نفذت الكمية</span>
              </div>
            )}
            {selectedVariant === variant.id && (
              <div className="absolute top-1 left-1 bg-blue-600 text-white rounded-full p-0.5 shadow-md">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  );

  const renderDropdown = () => (
    <select
      value={selectedVariant || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      <option value="">اختر {variantType === 'color' ? 'اللون' : 'المقاس'}</option>
      {variants.map((variant) => {
        const priceDiff = getPriceDifference(variant.price);
        return (
          <option
            key={variant.id}
            value={variant.id}
            disabled={variant.stock === 0}
          >
            {variant.name}
            {priceDiff ? ` ${priceDiff} ` : ''}
            {showStock && variant.stock === 0 ? ' (خارج المخزون)' : ''}
          </option>
        )
      })}
    </select>
  );

  const renderSwatches = () => (
    <div className="space-y-2">
      {variants.map((variant) => {
        const color = getColorFromName(variant.name);
        const priceDiff = getPriceDifference(variant.price);
        return (
          <button
            key={variant.id}
            onClick={() => onSelect(variant.id)}
            disabled={variant.stock === 0}
            className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${selectedVariant === variant.id
              ? 'border-blue-600 bg-blue-50'
              : variant.stock === 0
                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400'
              }`}
          >
            <div
              className={`${sizeClasses.medium} rounded-full border-2 ${selectedVariant === variant.id ? 'border-blue-600' : 'border-gray-300'
                }`}
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 text-right flex justify-between items-center">
              <div className="font-medium text-gray-900">
                {variant.name}
                {priceDiff && <span className="mr-2 text-green-600 text-sm font-bold">{priceDiff}</span>}
              </div>
              {showStock && (
                <div className="text-xs text-gray-500">
                  {variant.stock > 0 ? `${variant.stock} متبقي` : <span className="text-red-500 font-medium">غير متوفر</span>}
                </div>
              )}
            </div>
            {selectedVariant === variant.id && (
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderTable = () => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="border-b border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-700">المقاس</th>
            {showStock && <th className="border-b border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-700">المخزون</th>}
            <th className="border-b border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-700">السعر</th>
            <th className="border-b border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-700">اختيار</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => {
            const priceDiff = getPriceDifference(variant.price);
            return (
              <tr
                key={variant.id}
                className={`transition-colors ${selectedVariant === variant.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${variant.stock === 0 ? 'bg-gray-50 opacity-60' : ''}`}
              >
                <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">{variant.name}</td>
                {showStock && (
                  <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                    {variant.stock > 0 ? `${variant.stock} قطعة` : <span className="text-red-500 font-medium">نفذت</span>}
                  </td>
                )}
                <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                  {priceDiff ? <span className="text-green-600 font-bold">{priceDiff}</span> : '-'}
                </td>
                <td className="border-b border-gray-100 px-4 py-3">
                  <button
                    onClick={() => onSelect(variant.id)}
                    disabled={variant.stock === 0}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedVariant === variant.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : variant.stock === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-400'
                      }`}
                  >
                    {selectedVariant === variant.id ? 'محدد' : 'اختر'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
      {variants.map((variant) => {
        const priceDiff = getPriceDifference(variant.price);
        return (
          <button
            key={variant.id}
            onClick={() => onSelect(variant.id)}
            disabled={variant.stock === 0}
            className={`p-3 border-2 rounded-lg text-center transition-all flex flex-col items-center justify-center min-h-[80px] ${selectedVariant === variant.id
              ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm'
              : variant.stock === 0
                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:shadow-sm'
              }`}
          >
            <div className="font-bold text-lg">{variant.name}</div>
            {priceDiff && <div className="text-xs text-green-600 font-bold mt-1">{priceDiff}</div>}
            {showStock && (
              <div className="text-xs text-gray-500 mt-1">
                {variant.stock > 0 ? `${variant.stock} متبقي` : <span className="text-red-400">نفذت</span>}
              </div>
            )}
          </button>
        )
      })}
    </div>
  );

  switch (activeStyle) {
    case 'buttons':
      return renderButtons();
    case 'circles':
      return variantType === 'color' ? renderCircles() : renderButtons();
    case 'thumbnails':
      return variantType === 'color' ? renderThumbnails() : renderButtons();
    case 'dropdown':
      return renderDropdown();
    case 'swatches':
      return variantType === 'color' ? renderSwatches() : renderButtons();
    case 'table':
      return variantType === 'size' ? renderTable() : renderButtons();
    case 'grid':
      return renderGrid();
    default:
      return renderButtons();
  }
};

export default VariantSelector;



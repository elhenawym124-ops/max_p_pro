import React, { useState, useEffect } from 'react';

interface ProductTabsProps {
  enabled: boolean;
  product: {
    description?: string;
    specifications?: string;
    shippingInfo?: string;
  };
  reviews?: React.ReactNode;
  settings: {
    tabDescription: boolean;
    tabSpecifications: boolean;
    tabReviews: boolean;
    tabShipping: boolean;
  };
}

const ProductTabs: React.FC<ProductTabsProps> = ({
  enabled,
  product,
  reviews,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<string>('description');

  if (!enabled) {
    // Fallback: show description directly
    return product.description ? (
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">الوصف</h3>
        <div 
          className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      </div>
    ) : null;
  }

  const tabs = [];

  if (settings.tabDescription && product.description) {
    tabs.push({ id: 'description', label: 'الوصف' });
  }
  if (settings.tabSpecifications && product.specifications) {
    tabs.push({ id: 'specifications', label: 'المواصفات' });
  }
  if (settings.tabReviews && reviews) {
    tabs.push({ id: 'reviews', label: 'التقييمات' });
  }
  if (settings.tabShipping && product.shippingInfo) {
    tabs.push({ id: 'shipping', label: 'الشحن والتوصيل' });
  }

  if (tabs.length === 0) return null;

  // Set default active tab on mount
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 'description');
    }
  }, [tabs.length, activeTab]);

  return (
    <div className="mt-8">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'description' && product.description && (
          <div 
            className="text-gray-700 leading-relaxed prose prose-sm max-w-none product-description"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        )}

        {activeTab === 'specifications' && product.specifications && (
          <div>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {product.specifications}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && reviews && (
          <div>{reviews}</div>
        )}

        {activeTab === 'shipping' && product.shippingInfo && (
          <div>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {product.shippingInfo}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductTabs;


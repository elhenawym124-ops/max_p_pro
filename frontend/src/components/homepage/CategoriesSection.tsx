import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';

interface CategoriesSectionProps {
  section: any;
  settings: any;
}

interface Category {
  id: string;
  name: string;
  image?: string;
  description?: string;
  _count?: {
    products: number;
  };
}

// Separate component for category card to handle state properly
const CategoryCard: React.FC<{ 
  category: any; 
  companyId: string;
  index: number;
}> = ({ category, companyId, index }) => {
  const [imageError, setImageError] = useState(false);
  const categoryImage = category.image || category.imageUrl || '/placeholder-category.jpg';
  const productCount = category._count?.products || category.productCount || 0;
  const categoryLink = category.link || `/shop?category=${category.id}&companyId=${companyId}`;
  const hasValidImage = categoryImage && categoryImage !== '/placeholder-category.jpg' && !imageError;

  return (
    <Link
      to={categoryLink}
      className="group relative overflow-hidden rounded-lg aspect-square bg-gradient-to-br from-gray-100 to-gray-200"
    >
      {hasValidImage ? (
        <img
          src={categoryImage}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-gray-700">
          <svg 
            className="w-16 h-16 md:w-20 md:h-20 mb-2 opacity-60" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
            />
          </svg>
          <span className="text-xs md:text-sm font-medium text-center px-2 line-clamp-2">
            {category.name}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4 md:p-6">
        <div className="text-white w-full">
          <h3 className="text-base md:text-lg font-bold mb-1 line-clamp-1 drop-shadow-lg">
            {category.name}
          </h3>
          {productCount > 0 && (
            <p className="text-xs md:text-sm opacity-90 drop-shadow">
              {productCount} منتج
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

const CategoriesSection: React.FC<CategoriesSectionProps> = ({ section, settings }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get categories from API or use provided categories
  useEffect(() => {
    const loadCategories = async () => {
      // If categories are provided in section, use them
      if (section.categories && section.categories.length > 0) {
        setCategories(section.categories);
        setLoading(false);
        return;
      }

      // Otherwise, fetch from API
      try {
        setLoading(true);
        const data = await storefrontApi.getCategories();
        
        if (data.success && data.data) {
          // Limit to section.limit or show all
          const limit = section.limit || data.data.length;
          const categoriesList = data.data.slice(0, limit);
          setCategories(categoriesList);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [section.categories, section.limit]);

  if (loading) {
    return (
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل الأقسام...</p>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  const columns = section.columns || Math.min(categories.length, 6);
  const companyId = getCompanyId();

  return (
    <div 
      className="py-12 md:py-16 bg-white"
      style={{ 
        backgroundColor: section.backgroundColor || settings.colorScheme?.background || '#ffffff'
      }}
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{
              color: settings.colorScheme?.text || '#1a1a1a',
              fontFamily: settings.typography?.headingFont || 'inherit'
            }}
          >
            {section.title || 'تصفح أقسامنا'}
          </h2>
          {section.subtitle && (
            <p 
              className="text-sm md:text-base mt-2"
              style={{
                color: settings.colorScheme?.muted || '#6b7280',
                fontFamily: settings.typography?.bodyFont || 'inherit'
              }}
            >
              {section.subtitle}
            </p>
          )}
        </div>

        {/* Categories Grid */}
        <div className={`grid gap-4 md:gap-6 ${
          columns === 1 ? 'grid-cols-1' :
          columns === 2 ? 'grid-cols-1 sm:grid-cols-2' :
          columns === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
          columns === 4 ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4' :
          columns === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' :
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6'
        }`}>
          {categories.map((category: any, index: number) => {
            return <CategoryCard 
              key={category.id || index} 
              category={category} 
              companyId={companyId}
              index={index}
            />;
          })}
        </div>

        {/* Footer Text (if provided) */}
        {section.footerText && (
          <div className="text-center mt-8 md:mt-12">
            <p 
              className="text-sm md:text-base"
              style={{
                color: settings.colorScheme?.muted || '#6b7280',
                fontFamily: settings.typography?.bodyFont || 'inherit'
              }}
            >
              {section.footerText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesSection;

import React from 'react';
import CategoriesSection from './CategoriesSection';

interface CustomSectionProps {
  section: any;
  settings: any;
}

const CustomSection: React.FC<CustomSectionProps> = ({ section, settings }) => {
  // Handle different custom section types
  switch (section.customType) {
    case 'newsletter':
      return (
        <div 
          className="py-16"
          style={{ 
            backgroundColor: section.backgroundColor || '#4F46E5',
            color: section.textColor || '#ffffff'
          }}
        >
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
            {section.subtitle && (
              <p className="text-lg mb-8 opacity-90">{section.subtitle}</p>
            )}
            <form className="max-w-md mx-auto flex gap-4">
              <input
                type="email"
                placeholder={section.placeholder || 'أدخل بريدك الإلكتروني'}
                className="flex-1 px-4 py-3 rounded-lg text-gray-900"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100"
              >
                {section.buttonText || 'اشترك'}
              </button>
            </form>
          </div>
        </div>
      );

    case 'instagram':
      // Convert Instagram section to Categories section
      return (
        <CategoriesSection 
          section={{
            ...section,
            type: 'categories',
            title: section.title || 'تصفح أقسامنا',
            subtitle: section.subtitle || 'اكتشف مجموعتنا المتنوعة من المنتجات',
            columns: section.columns || 6,
            limit: section.limit || 6,
            footerText: section.footerText
          }} 
          settings={settings} 
        />
      );

    case 'brands':
      return (
        <div className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            {section.title && (
              <h2 className="text-2xl font-bold text-center mb-12">{section.title}</h2>
            )}
            <div className="flex flex-wrap justify-center items-center gap-12">
              {section.brands?.map((brand: any, index: number) => (
                <div key={index} className="grayscale hover:grayscale-0 transition-all">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="h-12 object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default CustomSection;

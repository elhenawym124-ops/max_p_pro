import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import { homepageService, HomepageTemplate } from '../../services/homepageService';

const HomepagePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<HomepageTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      let foundTemplate: any = null;

      // 1. Try system template if ID starts with 'sys_'
      if (id && id.startsWith('sys_')) {
        try {
          const sysResponse = await homepageService.getSystemTemplateById(id);
          if (sysResponse.data) {
            foundTemplate = sysResponse.data;
          }
        } catch (e) {
          console.warn('Template not found in system templates:', e);
        }
      }

      // 2. If not found, try company templates
      if (!foundTemplate) {
        try {
          const response = await homepageService.getTemplates();
          const templates = response.data.data || [];
          foundTemplate = templates.find((t: HomepageTemplate) => t.id === id);
        } catch (e) {
          console.error('Error fetching company templates:', e);
        }
      }

      if (foundTemplate) {
        setTemplate(foundTemplate);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <EyeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            القالب غير موجود
          </h2>
          <button
            onClick={() => navigate('/settings/homepage')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  const content = typeof template.content === 'string'
    ? JSON.parse(template.content)
    : template.content;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/settings/homepage')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center">
                  <EyeIcon className="h-6 w-6 text-indigo-600 ml-2" />
                  معاينة: {template.name}
                </h1>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${template.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
                }`}>
                {template.isActive ? '✅ نشط' : '⚪ غير نشط'}
              </span>
              <button
                onClick={() => navigate(`/settings/homepage/edit/${template.id}`)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                تعديل
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Preview Info Banner */}
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 text-yellow-600 ml-2" />
              <p className="text-sm text-yellow-800">
                <strong>وضع المعاينة:</strong> هذه معاينة للصفحة الرئيسية. التصميم النهائي قد يختلف قليلاً.
              </p>
            </div>
          </div>

          {/* Sections Preview */}
          <div className="p-8">
            {content.sections && content.sections.length > 0 ? (
              <div className="space-y-8">
                {content.sections.map((section: any, index: number) => (
                  <div
                    key={section.id || index}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getSectionIcon(section.type)}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {section.title || getSectionDefaultTitle(section.type)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            نوع القسم: {getSectionTypeLabel(section.type)}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        قسم #{index + 1}
                      </span>
                    </div>

                    {/* Section Preview Content */}
                    <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                      {renderSectionPreview(section)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <EyeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد أقسام في هذه الصفحة</p>
              </div>
            )}
          </div>

          {/* Settings Info */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">إعدادات الصفحة:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">عرض الحاوية:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {content.settings?.containerWidth === 'full' ? 'عرض كامل' : 'محدود'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">المسافات:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {content.settings?.spacing === 'compact' ? 'مضغوط' :
                    content.settings?.spacing === 'relaxed' ? 'واسع' : 'عادي'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">الحركات:</span>
                <span className="font-medium text-gray-900 mr-2">
                  {content.settings?.animation ? 'مفعلة' : 'معطلة'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getSectionIcon = (type: string): string => {
  const icons: Record<string, string> = {
    hero: '🎯',
    features: '⭐',
    products: '🛍️',
    banner: '📢',
    categories: '📁',
    testimonials: '💬',
    custom: '✨',
  };
  return icons[type] || '📄';
};

const getSectionDefaultTitle = (type: string): string => {
  const titles: Record<string, string> = {
    hero: 'قسم البطل',
    features: 'المميزات',
    products: 'المنتجات',
    banner: 'بانر إعلاني',
    categories: 'الفئات',
    testimonials: 'آراء العملاء',
    custom: 'قسم مخصص',
  };
  return titles[type] || 'قسم';
};

const getSectionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    hero: 'Hero Section',
    features: 'Features',
    products: 'Products',
    banner: 'Banner',
    categories: 'Categories',
    testimonials: 'Testimonials',
    custom: 'Custom',
  };
  return labels[type] || type;
};

const renderSectionPreview = (section: any) => {
  switch (section.type) {
    case 'hero':
      return (
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {section.title || 'عنوان القسم البطل'}
          </h2>
          <p className="text-gray-600 mb-6">
            {section.subtitle || 'نص فرعي للقسم'}
          </p>
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg">
            {section.buttonText || 'زر الإجراء'}
          </button>
        </div>
      );

    case 'features':
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center p-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">ميزة {i}</h4>
              <p className="text-sm text-gray-600">وصف الميزة</p>
            </div>
          ))}
        </div>
      );

    case 'products':
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="w-full h-32 bg-gray-200 rounded mb-2"></div>
              <h4 className="font-semibold text-sm text-gray-900">منتج {i}</h4>
              <p className="text-sm text-gray-600">100 جنيه</p>
            </div>
          ))}
        </div>
      );

    case 'banner':
      return (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 rounded-lg text-center">
          <h3 className="text-2xl font-bold mb-2">
            {section.title || 'عنوان البانر'}
          </h3>
          <p className="mb-4">{section.subtitle || 'نص البانر'}</p>
          <button className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold">
            {section.buttonText || 'اكتشف المزيد'}
          </button>
        </div>
      );

    case 'categories':
      return (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-900">فئة {i}</p>
            </div>
          ))}
        </div>
      );

    case 'testimonials':
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full ml-3"></div>
                <div>
                  <p className="font-semibold text-sm">عميل {i}</p>
                  <p className="text-xs text-yellow-500">⭐⭐⭐⭐⭐</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">تعليق العميل هنا...</p>
            </div>
          ))}
        </div>
      );

    case 'hero_grid':
      const items = section.items || [];
      const leftBanner = items.find((i: any) => i.position === 'left') || items[0];
      const centerTop = items.find((i: any) => i.position === 'center-top') || items[1];
      const centerBottom = items.find((i: any) => i.position === 'center-bottom') || items[2];
      const rightBanner = items.find((i: any) => i.position === 'right') || items[3];

      return (
        <div className="grid grid-cols-12 gap-8 mb-8">
          {/* Left Banner (Tall) */}
          {leftBanner && (
            <div className="col-span-12 lg:col-span-3 hidden lg:block relative group overflow-hidden cursor-pointer order-3 lg:order-1">
              <img src={leftBanner.image} alt={leftBanner.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute top-10 left-8">
                <h4 className="text-3xl font-light mb-2" dangerouslySetInnerHTML={{ __html: leftBanner.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' }}></h4>
                <span className="text-2xl font-bold text-[#DB3340]">{leftBanner.price}</span>
              </div>
            </div>
          )}

          {/* Middle Banners (Stacked) */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-8 order-2">
            {centerTop && (
              <div className="relative group overflow-hidden cursor-pointer flex-1">
                <img src={centerTop.image} alt={centerTop.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-8 left-8">
                  <h4 className="text-2xl font-light mb-4" dangerouslySetInnerHTML={{ __html: centerTop.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' }}></h4>
                  <span className="text-[#DB3340] font-bold border-b border-[#DB3340] pb-1 uppercase text-xs tracking-wider">{centerTop.linkText || 'View More'}</span>
                </div>
              </div>
            )}
            {centerBottom && (
              <div className="relative group overflow-hidden cursor-pointer flex-1">
                <img src={centerBottom.image} alt={centerBottom.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-8 left-8">
                  <h4 className="text-2xl font-light mb-4" dangerouslySetInnerHTML={{ __html: centerBottom.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' }}></h4>
                  <span className="text-[#DB3340] font-bold border-b border-[#DB3340] pb-1 uppercase text-xs tracking-wider">{centerBottom.linkText || 'View More'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Banner (Large) */}
          {rightBanner && (
            <div className="col-span-12 lg:col-span-6 relative group overflow-hidden cursor-pointer order-1 lg:order-3">
              <img src={rightBanner.image} alt={rightBanner.title} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute top-12 left-12">
                <h4 className="text-4xl font-light mb-2" dangerouslySetInnerHTML={{ __html: rightBanner.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' }}></h4>
                <p className="text-gray-500 mb-4">{rightBanner.subtitle}</p>
                <span className="text-2xl font-bold text-[#DB3340]">{rightBanner.price}</span>
              </div>
            </div>
          )}
        </div>
      );

    case 'custom':
      if (section.content && section.content.html) {
        return <div dangerouslySetInnerHTML={{ __html: section.content.html }} />;
      }
      return (
        <div className="text-center py-8 text-gray-500">
          <p>معاينة القسم: {section.type}</p>
          <p className="text-sm mt-2">سيتم عرض المحتوى هنا</p>
        </div>
      );

    default:
      return (
        <div className="text-center py-8 text-gray-500">
          <p>معاينة القسم: {section.type}</p>
          <p className="text-sm mt-2">سيتم عرض المحتوى هنا</p>
        </div>
      );
  }
};

export default HomepagePreview;


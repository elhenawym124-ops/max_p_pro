import React from 'react';

interface TemplateRendererProps {
    sections: any[];
    onSectionClick?: (sectionId: string, itemId?: string) => void;
    selectedSectionId?: string | null;
}

const TemplateRenderer: React.FC<TemplateRendererProps> = ({
    sections,
    onSectionClick,
    selectedSectionId
}) => {
    return (
        <div className="space-y-8">
            {sections.map((section: any, index: number) => (
                <div
                    key={section.id || index}
                    onClick={() => onSectionClick && onSectionClick(section.id)}
                    className={`relative transition-all duration-200 ${onSectionClick ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : ''
                        } ${selectedSectionId === section.id ? 'ring-2 ring-indigo-600 shadow-lg scale-[1.01]' : ''
                        }`}
                >
                    {/* Section rendering logic */}
                    {renderSectionContent(section, onSectionClick)}

                    {/* Overlay for selection indication */}
                    {selectedSectionId === section.id && (
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded-bl z-50">
                            تم التحديد
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// Helper functions (moved from HomepagePreview)
const renderSectionContent = (section: any, onSectionClick?: (id: string, itemId?: string) => void) => {

    const handleItemClick = (e: React.MouseEvent, itemId: string) => {
        if (onSectionClick) {
            e.stopPropagation(); // Stop bubbling to section container
            onSectionClick(section.id, itemId);
        }
    };

    switch (section.type) {
        case 'hero':
            return (
                <div className="text-center py-12 bg-gray-100 rounded-lg">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        {section.title || 'عنوان القسم البطل'}
                    </h2>
                    <p className="text-gray-600 mb-8 text-lg">
                        {section.subtitle || 'نص فرعي للقسم'}
                    </p>
                    <button className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow">
                        {section.buttonText || 'زر الإجراء'}
                    </button>
                </div>
            );

        case 'features':
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <span className="text-3xl">⭐</span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">ميزة {i}</h4>
                            <p className="text-sm text-gray-500">وصف مختصر للميزة يوضح الفائدة للعميل.</p>
                        </div>
                    ))}
                </div>
            );

        case 'products':
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="w-full h-48 bg-gray-200 mb-3 relative">
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">صورة المنتج</div>
                            </div>
                            <div className="p-4">
                                <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">منتج تجريبي {i}</h4>
                                <p className="font-bold text-indigo-600">100.00 ج.م</p>
                            </div>
                        </div>
                    ))}
                </div>
            );

        case 'banner':
            return (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-12 rounded-2xl text-center shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold mb-3">
                            {section.title || 'عنوان البانر الإعلاني'}
                        </h3>
                        <p className="mb-6 text-indigo-100 text-lg">{section.subtitle || 'نص توضيحي للبانر يشجع الزوار على اتخاذ إجراء معين.'}</p>
                        <button className="px-8 py-2 bg-white text-indigo-600 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-sm">
                            {section.buttonText || 'اكتشف المزيد'}
                        </button>
                    </div>
                </div>
            );

        case 'categories':
            return (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="text-center group cursor-pointer">
                            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <span className="text-2xl">📁</span>
                            </div>
                            <p className="font-medium text-gray-900 group-hover:text-indigo-600">فئة {i}</p>
                        </div>
                    ))}
                </div>
            );

        case 'testimonials':
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full ml-3"></div>
                                <div>
                                    <p className="font-bold text-gray-900">عميل سعيد {i}</p>
                                    <div className="flex text-yellow-400 text-xs">⭐⭐⭐⭐⭐</div>
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">"تجربة رائعة جداً! الموقع سهل الاستخدام والمنتجات وصلت في الموعد المحدد وبجودة عالية."</p>
                        </div>
                    ))}
                </div>
            );

        case 'hero_grid':
            const items = section.items || [];
            const leftBanner = items.find((i: any) => i.position === 'left') || items[0];
            const itemsLeftIdx = items.findIndex((i: any) => i.position === 'left') !== -1 ? items.findIndex((i: any) => i.position === 'left') : 0;

            const centerTop = items.find((i: any) => i.position === 'center-top') || items[1];
            const itemsTopIdx = items.findIndex((i: any) => i.position === 'center-top') !== -1 ? items.findIndex((i: any) => i.position === 'center-top') : 1;

            const centerBottom = items.find((i: any) => i.position === 'center-bottom') || items[2];
            const itemsBottomIdx = items.findIndex((i: any) => i.position === 'center-bottom') !== -1 ? items.findIndex((i: any) => i.position === 'center-bottom') : 2;

            const rightBanner = items.find((i: any) => i.position === 'right') || items[3];
            const itemsRightIdx = items.findIndex((i: any) => i.position === 'right') !== -1 ? items.findIndex((i: any) => i.position === 'right') : 3;

            return (
                <div className="grid grid-cols-12 gap-8 mb-8">
                    {/* Left Banner (Tall) */}
                    {leftBanner && (
                        <div
                            onClick={(e) => handleItemClick(e, itemsLeftIdx.toString())}
                            className="col-span-12 lg:col-span-3 hidden lg:block relative group overflow-hidden cursor-pointer order-3 lg:order-1 h-full hover:ring-4 hover:ring-indigo-400 hover:ring-opacity-50 transition-all rounded"
                        >
                            <div className="h-full relative">
                                <img src={leftBanner.image} alt={leftBanner.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-10 left-8">
                                    <h4 className="text-3xl font-light mb-2" dangerouslySetInnerHTML={{ __html: leftBanner.title ? leftBanner.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' : '' }}></h4>
                                    <span className="text-2xl font-bold text-[#DB3340]">{leftBanner.price}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Middle Banners (Stacked) */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-8 order-2 h-full">
                        {centerTop && (
                            <div
                                onClick={(e) => handleItemClick(e, itemsTopIdx.toString())}
                                className="relative group overflow-hidden cursor-pointer flex-1 h-1/2 hover:ring-4 hover:ring-indigo-400 hover:ring-opacity-50 transition-all rounded"
                            >
                                <img src={centerTop.image} alt={centerTop.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-8 left-8">
                                    <h4 className="text-2xl font-light mb-4" dangerouslySetInnerHTML={{ __html: centerTop.title ? centerTop.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' : '' }}></h4>
                                    <span className="text-[#DB3340] font-bold border-b border-[#DB3340] pb-1 uppercase text-xs tracking-wider">{centerTop.linkText || 'View More'}</span>
                                </div>
                            </div>
                        )}
                        {centerBottom && (
                            <div
                                onClick={(e) => handleItemClick(e, itemsBottomIdx.toString())}
                                className="relative group overflow-hidden cursor-pointer flex-1 h-1/2 hover:ring-4 hover:ring-indigo-400 hover:ring-opacity-50 transition-all rounded"
                            >
                                <img src={centerBottom.image} alt={centerBottom.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-8 left-8">
                                    <h4 className="text-2xl font-light mb-4" dangerouslySetInnerHTML={{ __html: centerBottom.title ? centerBottom.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' : '' }}></h4>
                                    <span className="text-[#DB3340] font-bold border-b border-[#DB3340] pb-1 uppercase text-xs tracking-wider">{centerBottom.linkText || 'View More'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Banner (Large) */}
                    {rightBanner && (
                        <div
                            onClick={(e) => handleItemClick(e, itemsRightIdx.toString())}
                            className="col-span-12 lg:col-span-6 relative group overflow-hidden cursor-pointer order-1 lg:order-3 h-full hover:ring-4 hover:ring-indigo-400 hover:ring-opacity-50 transition-all rounded"
                        >
                            <div className="h-full relative">
                                <img src={rightBanner.image} alt={rightBanner.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-12 left-12">
                                    <h4 className="text-4xl font-light mb-2" dangerouslySetInnerHTML={{ __html: rightBanner.title ? rightBanner.title.replace(' ', '<br/><strong class="font-bold">') + '</strong>' : '' }}></h4>
                                    <p className="text-gray-500 mb-4">{rightBanner.subtitle}</p>
                                    <span className="text-2xl font-bold text-[#DB3340]">{rightBanner.price}</span>
                                </div>
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
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p>معاينة القسم: {section.type}</p>
                    <p className="text-sm mt-2">سيتم عرض المحتوى هنا</p>
                </div>
            );

        default:
            return (
                <div className="text-center py-8 text-gray-500">
                    <p>نوع غير معروف: {section.type}</p>
                </div>
            );
    }
};

export default TemplateRenderer;

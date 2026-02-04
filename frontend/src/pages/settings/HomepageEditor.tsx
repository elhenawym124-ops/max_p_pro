import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HomeIcon,
  ArrowLeftIcon,
  EyeIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Cog6ToothIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { homepageService, HomepageContent, HomepageSection } from '../../services/homepageService';
import TemplateRenderer from '../../components/homepage/TemplateRenderer';
import { uploadService } from '../../services/uploadService';

const HomepageEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState<HomepageContent>({
    sections: [],
    settings: {
      containerWidth: 'full',
      spacing: 'normal',
      animation: true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const itemRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (selectedItemId && itemRefs.current[selectedItemId]) {
      itemRefs.current[selectedItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedItemId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      console.log('Loading template:', id);

      let template: any = null;
      let isSystemTemplate = false;

      // 1. Try system template if ID starts with 'sys_'
      if (id && id.startsWith('sys_')) {
        try {
          // We use the service method to get system template
          const sysResponse = await homepageService.getSystemTemplateById(id);
          if (sysResponse.data) {
            template = sysResponse.data;
            isSystemTemplate = true;
          }
        } catch (e) {
          console.warn('Template not found in system templates:', e);
        }
      }

      // 2. If not found, try company templates
      if (!template) {
        try {
          const response = await homepageService.getTemplates();
          const templates = response.data.data || [];
          template = templates.find((t: any) => t.id === id);
        } catch (e) {
          console.error('Error fetching company templates:', e);
        }
      }

      if (template) {
        console.log('Template loaded:', template);
        setName(template.name);
        setDescription(template.description || '');

        let parsedContent = template.content;
        if (typeof template.content === 'string') {
          try {
            parsedContent = JSON.parse(template.content);
          } catch (e) {
            console.error('Failed to parse template content', e);
            parsedContent = { sections: [], settings: { containerWidth: 'full', spacing: 'normal', animation: true } };
          }
        }

        // Ensure content has minimal structure
        if (!parsedContent) {
          parsedContent = { sections: [], settings: { containerWidth: 'full', spacing: 'normal', animation: true } };
        }
        if (!parsedContent.sections) parsedContent.sections = [];
        if (!parsedContent.settings) parsedContent.settings = { containerWidth: 'full', spacing: 'normal', animation: true };

        setContent(parsedContent);
      } else {
        toast.error('لم يتم العثور على القالب');
        navigate('/settings/homepage');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('فشل تحميل القالب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditMode && id) {
      loadTemplate();
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الصفحة');
      return;
    }

    try {
      setSaving(true);
      const data = {
        name,
        description,
        content,
      };

      if (isEditMode && id) {
        // Check if it's a system template (by prefix or checking property if we stored it)
        // For now, let's assume if it starts with 'sys_' it's a system template
        if (id.startsWith('sys_')) {
          await homepageService.updateSystemTemplate(id, { ...data, isSystem: true });
          toast.success('تم تحديث قالب النظام بنجاح');
          navigate('/super-admin/homepage-templates'); // Return to super admin
          return;
        }

        await homepageService.updateTemplate(id, data);
        toast.success('تم تحديث الصفحة بنجاح');
      } else {
        await homepageService.createTemplate(data);
        toast.success('تم إنشاء الصفحة بنجاح');
      }

      navigate('/settings/homepage');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('فشل حفظ الصفحة');
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: HomepageSection['type']) => {
    const newSection: HomepageSection = {
      id: `section-${Date.now()}`,
      type,
      title: getSectionDefaultTitle(type),
    };

    setContent({
      ...content,
      sections: [...content.sections, newSection],
    });
  };

  const getSectionDefaultTitle = (type: HomepageSection['type']): string => {
    const titles: Record<HomepageSection['type'], string> = {
      hero: 'قسم البطل',
      features: 'المميزات',
      products: 'المنتجات',
      banner: 'بانر إعلاني',
      categories: 'الفئات',
      testimonials: 'آراء العملاء',
      custom: 'قسم مخصص',
    };
    return titles[type];
  };

  const removeSection = (sectionId: string) => {
    setContent({
      ...content,
      sections: content.sections.filter((s) => s.id !== sectionId),
    });
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...content.sections];
    const temp = newSections[index - 1]!;
    newSections[index - 1] = newSections[index]!;
    newSections[index] = temp;
    setContent({ ...content, sections: newSections });
  };

  const moveSectionDown = (index: number) => {
    if (index === content.sections.length - 1) return;
    const newSections = [...content.sections];
    const temp = newSections[index]!;
    newSections[index] = newSections[index + 1]!;
    newSections[index + 1] = temp;
    setContent({ ...content, sections: newSections });
  };

  const updateSection = (sectionId: string, updates: Partial<HomepageSection>) => {
    setContent({
      ...content,
      sections: content.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  };

  const sectionTypes = [
    { type: 'hero' as const, label: 'قسم البطل', icon: '🎯', description: 'صورة كبيرة مع عنوان وزر' },
    { type: 'features' as const, label: 'المميزات', icon: '⭐', description: 'عرض مميزات المتجر' },
    { type: 'products' as const, label: 'المنتجات', icon: '🛍️', description: 'عرض المنتجات المميزة' },
    { type: 'banner' as const, label: 'بانر', icon: '📢', description: 'بانر إعلاني' },
    { type: 'categories' as const, label: 'الفئات', icon: '📁', description: 'عرض فئات المنتجات' },
    { type: 'testimonials' as const, label: 'التقييمات', icon: '💬', description: 'آراء العملاء' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
                  <HomeIcon className="h-6 w-6 text-indigo-600 ml-2" />
                  {isEditMode ? 'تعديل الصفحة الرئيسية' : 'إنشاء صفحة رئيسية جديدة'}
                </h1>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.open(`/preview/homepage/${id || 'new'}`, '_blank')}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <EyeIcon className="h-5 w-5 ml-2" />
                معاينة
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-5 w-5 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-100 h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Sidebar - Editor & Settings */}
        <div className="w-[400px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-6">

            {/* Editor Header / Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">معلومات الصفحة</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  placeholder="اسم الصفحة"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  placeholder="وصف مختصر..."
                />
              </div>
            </div>

            {/* Selected Section Editor */}
            {selectedSection ? (
              <div className="bg-white rounded-lg shadow-sm border border-indigo-100 ring-4 ring-indigo-50/50">
                <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                  <h3 className="font-bold text-indigo-900 flex items-center">
                    <span className="text-xl mr-2">{sectionTypes.find(t => t.type === content.sections.find(s => s.id === selectedSection)?.type)?.icon}</span>
                    تعديل القسم
                  </h3>
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="text-indigo-400 hover:text-indigo-700"
                  >
                    <span className="sr-only">Close</span>
                    ✕
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {(() => {
                    const section = content.sections.find(s => s.id === selectedSection);
                    if (!section) return null;

                    return (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            العنوان
                          </label>
                          <input
                            type="text"
                            value={section.title || ''}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Common Fields */}
                        {(section.type === 'hero' || section.type === 'banner' || section.type === 'hero_grid') && (
                          <>
                            {section.type !== 'hero_grid' && (
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  العنوان الفرعي
                                </label>
                                <input
                                  type="text"
                                  value={section.subtitle || ''}
                                  onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                                />
                              </div>
                            )}
                          </>
                        )}

                        {/* Hero Grid Items Editor */}
                        {section.type === 'hero_grid' && (
                          <div className="space-y-4 pt-2 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-500">البنرات ({section.items?.length || 0})</p>
                            {section.items?.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                ref={(el) => itemRefs.current[idx.toString()] = el}
                                className={`p-3 rounded border text-sm transition-all duration-300 ${selectedItemId === idx.toString() ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md bg-white' : 'border-gray-200 bg-gray-50'
                                  }`}
                              >
                                <div className="font-medium text-gray-700 mb-2 flex justify-between">
                                  <span>بنر #{idx + 1}</span>
                                  <span className="text-xs text-gray-400 bg-white px-1 rounded border">{item.position}</span>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0 border">
                                      {item.image ? (
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Img</div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <label className="cursor-pointer inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium hover:bg-indigo-100 transition-colors w-full justify-center">
                                        <ArrowUpTrayIcon className="h-3 w-3 mr-1" />
                                        رفع صورة
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const toastId = toast.loading('جاري رفع الصورة...');
                                              try {
                                                const res = await uploadService.uploadProductImage(file);
                                                if (res.success && res.data?.url) {
                                                  const newItems = [...(section.items || [])];
                                                  newItems[idx] = { ...newItems[idx], image: res.data.url };
                                                  updateSection(section.id, { items: newItems });
                                                  toast.success('تم رفع الصورة', { id: toastId });
                                                } else {
                                                  toast.error('فشل الرفع', { id: toastId });
                                                }
                                              } catch (err) {
                                                toast.error('حدث خطأ', { id: toastId });
                                              }
                                            }
                                          }}
                                        />
                                      </label>
                                      <input
                                        placeholder="أو رابط خارجي..."
                                        value={item.image || ''}
                                        onChange={(e) => {
                                          const newItems = [...(section.items || [])];
                                          newItems[idx] = { ...newItems[idx], image: e.target.value };
                                          updateSection(section.id, { items: newItems });
                                        }}
                                        className="w-full mt-1 px-1 py-0.5 text-[10px] border-none bg-transparent text-gray-400 focus:ring-0 placeholder-gray-300"
                                      />
                                    </div>
                                  </div>
                                  <input
                                    placeholder="العنوان"
                                    value={item.title}
                                    onChange={(e) => {
                                      const newItems = [...(section.items || [])];
                                      newItems[idx] = { ...newItems[idx], title: e.target.value };
                                      updateSection(section.id, { items: newItems });
                                    }}
                                    className="w-full px-2 py-1 text-xs border rounded"
                                  />
                                  <div className="flex gap-2">
                                    <input
                                      placeholder={item.price ? "السعر" : "نص الزر"}
                                      value={item.price || item.linkText || ''}
                                      onChange={(e) => {
                                        const newItems = [...(section.items || [])];
                                        if (item.price !== undefined) newItems[idx] = { ...newItems[idx], price: e.target.value };
                                        else newItems[idx] = { ...newItems[idx], linkText: e.target.value };
                                        updateSection(section.id, { items: newItems });
                                      }}
                                      className="w-full px-2 py-1 text-xs border rounded"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Custom HTML Editor */}
                        {section.type === 'custom' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">HTML Code</label>
                            <textarea
                              value={section.content?.html || ''}
                              onChange={(e) => {
                                const newContent = { ...section.content, html: e.target.value };
                                updateSection(section.id, { content: newContent });
                              }}
                              rows={8}
                              className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded bg-gray-50 focus:bg-white"
                            />
                          </div>
                        )}

                        <div className="pt-4 flex gap-2 border-t border-gray-100">
                          <button
                            onClick={() => removeSection(section.id)}
                            className="flex-1 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded text-sm font-medium transition-colors"
                          >
                            حذف القسم
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const idx = content.sections.findIndex(s => s.id === section.id);
                                moveSectionUp(idx);
                              }}
                              className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                              title="تحريك للأعلى"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => {
                                const idx = content.sections.findIndex(s => s.id === section.id);
                                moveSectionDown(idx);
                              }}
                              className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                              title="تحريك للأسفل"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">اضغط على أي قسم في المعاينة لتعديله</p>
              </div>
            )}

            {/* Add Section List */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">إضافة عنصر جديد</h3>
              <div className="grid grid-cols-2 gap-2">
                {sectionTypes.map((section) => (
                  <button
                    key={section.type}
                    onClick={() => addSection(section.type)}
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 hover:border-indigo-500 hover:shadow-sm rounded-lg transition-all group"
                  >
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{section.icon}</span>
                    <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-600">{section.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Global Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">إعدادات عامة</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">عرض كامل</span>
                  <input
                    type="checkbox"
                    checked={content.settings.containerWidth === 'full'}
                    onChange={(e) => setContent({ ...content, settings: { ...content.settings, containerWidth: e.target.checked ? 'full' : 'contained' } })}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">الحركات (Animation)</span>
                  <input
                    type="checkbox"
                    checked={content.settings.animation}
                    onChange={(e) => setContent({ ...content, settings: { ...content.settings, animation: e.target.checked } })}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Main Area - Live Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 relative custom-scrollbar">
          <div className={`min-h-full transition-all duration-300 mx-auto bg-white shadow-xl my-8 ${content.settings.containerWidth === 'full' ? 'max-w-[95%]' : 'max-w-5xl'}`}>

            {/* Preview Header Shim */}
            <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 text-gray-300 uppercase tracking-widest text-xs font-bold select-none">
              <span>Header Preview</span>
              <div className="flex gap-4">
                <span className="w-20 h-2 bg-gray-100 rounded-full"></span>
                <span className="w-20 h-2 bg-gray-100 rounded-full"></span>
                <span className="w-20 h-2 bg-gray-100 rounded-full"></span>
              </div>
            </div>

            {/* Render actual content */}
            <div className="p-0 min-h-[600px] relative">
              {content.sections.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-xl mb-2">الصفحة فارغة</p>
                    <p className="text-sm">ابدأ بإضافة أقسام من القائمة الجانبية</p>
                  </div>
                </div>
              )}

              <div className="p-4">
                <TemplateRenderer
                  sections={content.sections}
                  onSectionClick={(id, itemId) => {
                    setSelectedSection(id);
                    setSelectedItemId(itemId || null);
                  }}
                  selectedSectionId={selectedSection}
                />
              </div>
            </div>

            {/* Footer Shim */}
            <div className="h-64 bg-gray-900 flex items-center justify-center text-gray-700 font-bold uppercase tracking-widest text-xs select-none">
              Footer Preview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomepageEditor;


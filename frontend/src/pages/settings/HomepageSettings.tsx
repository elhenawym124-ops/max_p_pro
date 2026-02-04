import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  EyeIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { homepageService, HomepageTemplate } from '../../services/homepageService';
import { useAuth } from '../../hooks/useAuthSimple';
import { buildStoreUrl } from '../../utils/storeUrl';

const HomepageSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<HomepageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<HomepageTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await homepageService.getTemplates();
      const templatesData = response.data.data || [];
      setTemplates(templatesData);

      // Find active template
      const active = templatesData.find((t: HomepageTemplate) => t.isActive);
      setActiveTemplate(active || null);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('فشل تحميل القوالب');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemo = async () => {
    try {
      await homepageService.createDemoTemplate();
      toast.success('تم إنشاء القالب التجريبي بنجاح');
      loadTemplates();
    } catch (error: any) {
      console.error('Error creating demo:', error);
      toast.error(error.response?.data?.message || 'فشل إنشاء القالب التجريبي');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await homepageService.setActiveTemplate(id);
      toast.success('تم تفعيل الصفحة الرئيسية بنجاح');
      loadTemplates();
    } catch (error) {
      console.error('Error setting active template:', error);
      toast.error('فشل تفعيل الصفحة الرئيسية');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await homepageService.duplicateTemplate(id);
      toast.success('تم نسخ القالب بنجاح');
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('فشل نسخ القالب');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف القالب "${name}"؟`)) return;

    try {
      await homepageService.deleteTemplate(id);
      toast.success('تم حذف القالب بنجاح');
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.response?.data?.message || 'فشل حذف القالب');
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/settings/homepage/edit/${id}`);
  };

  const handlePreview = (id: string) => {
    // Open preview in new tab
    window.open(`/preview/homepage/${id}`, '_blank');
  };

  const handleViewStorefront = () => {
    if (!user?.companyId) {
      toast.error('لا يمكن الوصول للمتجر: معرف الشركة غير موجود');
      return;
    }

    // بناء رابط المتجر
    const slug = user?.company?.slug || user.companyId;
    const storeUrl = buildStoreUrl(slug, '/home');

    // فتح المتجر في تبويب جديد
    window.open(storeUrl, '_blank');
  };

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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <HomeIcon className="h-8 w-8 text-indigo-600 ml-3" />
              إدارة الصفحة الرئيسية
            </h1>
            <p className="mt-2 text-gray-600">
              إنشاء وتخصيص الصفحة الرئيسية لمتجرك بتصميم احترافي وعصري
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleViewStorefront}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
              title="عرض الصفحة الرئيسية في المتجر"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5 ml-2" />
              عرض المتجر
            </button>
            <button
              onClick={handleCreateDemo}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
            >
              <SparklesIcon className="h-5 w-5 ml-2" />
              إنشاء قالب تجريبي
            </button>
            <button
              onClick={() => navigate('/settings/homepage/create')}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إنشاء صفحة جديدة
            </button>
          </div>
        </div>
      </div>

      {/* Active Template Banner */}
      {activeTemplate && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <CheckCircleIcon className="h-6 w-6 text-green-600 ml-3 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  الصفحة الرئيسية النشطة
                </h3>
                <p className="text-gray-700 mt-1">
                  <span className="font-medium">{activeTemplate.name}</span>
                  {activeTemplate.description && (
                    <span className="text-gray-600"> - {activeTemplate.description}</span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  آخر تحديث: {new Date(activeTemplate.updatedAt).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(activeTemplate.id)}
                className="px-3 py-1.5 text-sm bg-white text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50 transition-colors"
              >
                تعديل
              </button>
              <button
                onClick={() => handlePreview(activeTemplate.id)}
                className="px-3 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                معاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <HomeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            لا توجد صفحات رئيسية
          </h3>
          <p className="text-gray-600 mb-6">
            ابدأ بإنشاء صفحة رئيسية جديدة أو استخدم القالب التجريبي
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleCreateDemo}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
            >
              <SparklesIcon className="h-5 w-5 ml-2" />
              إنشاء قالب تجريبي
            </button>
            <button
              onClick={() => navigate('/settings/homepage/create')}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إنشاء صفحة جديدة
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${template.isActive ? 'ring-2 ring-green-500' : ''
                }`}
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100">
                {template.thumbnail ? (
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <HomeIcon className="h-16 w-16 text-indigo-300" />
                  </div>
                )}
                {template.isActive && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <CheckCircleIcon className="h-4 w-4 ml-1" />
                    نشط
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {template.name}
                </h3>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="text-xs text-gray-500 mb-4">
                  آخر تحديث: {new Date(template.updatedAt).toLocaleDateString('ar-EG')}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!template.isActive && (
                    <button
                      onClick={() => handleSetActive(template.id)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    >
                      تفعيل
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(template.id)}
                    className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                  >
                    <PencilIcon className="h-4 w-4 ml-1" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handlePreview(template.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                    title="معاينة"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                    title="نسخ"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                  {!template.isActive && (
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200 transition-colors"
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Templates Library */}
      <div className="mt-12 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-indigo-600" />
          مكتبة القوالب الجاهزة
        </h2>
        <p className="text-gray-600 mb-6">
          اختر من مجموعة القوالب الجاهزة والمصممة بعناية لتبدأ متجرك بشكل احترافي.
        </p>

        <SystemTemplatesList onImport={() => loadTemplates()} />
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <SparklesIcon className="h-6 w-6 text-blue-600 ml-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              نصائح لإنشاء صفحة رئيسية احترافية
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 ml-2">•</span>
                <span>استخدم القالب التجريبي كنقطة انطلاق وقم بتخصيصه حسب احتياجاتك</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 ml-2">•</span>
                <span>يمكنك إنشاء عدة صفحات رئيسية واختبارها قبل التفعيل</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 ml-2">•</span>
                <span>الصفحة النشطة هي التي سيراها عملاؤك عند زيارة متجرك</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 ml-2">•</span>
                <span>استخدم الصور عالية الجودة والنصوص الواضحة لجذب انتباه العملاء</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for System Templates List
const SystemTemplatesList: React.FC<{ onImport: () => void }> = ({ onImport }) => {
  const [templates, setTemplates] = useState<HomepageTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await homepageService.getSystemTemplates();
        setTemplates(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleImport = async (templateId: string, name: string) => {
    if (!confirm(`هل تود استيراد قالب "${name}" إلى متجرك؟`)) return;

    try {
      setLoading(true);
      await homepageService.importSystemTemplate(templateId);
      toast.success('تم استيراد القالب بنجاح');
      onImport(); // Refresh user templates
    } catch (err) {
      toast.error('فشل الاستيراد');
    } finally {
      setLoading(false);
    }
  };

  if (templates.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {templates.map(template => (
        <div key={template.id} className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all group">
          <div className="relative h-40 bg-gray-200 overflow-hidden">
            <img
              src={template.thumbnail || 'https://via.placeholder.com/400x200'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              alt={template.name}
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleImport(template.id, template.name)}
                className="bg-white text-indigo-600 px-4 py-2 rounded-full font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                disabled={loading}
              >
                استخدم القالب
              </button>
            </div>
          </div>
          <div className="p-4">
            <h4 className="font-bold text-gray-900">{template.name}</h4>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HomepageSettings;


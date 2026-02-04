import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

const HomepageSimple: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get companyId from URL or localStorage
    let companyId = searchParams.get('companyId');

    console.log('🏠 [HomepageSimple] URL companyId:', companyId);
    console.log('🏠 [HomepageSimple] localStorage currentCompanyId:', localStorage.getItem('currentCompanyId'));
    console.log('🏠 [HomepageSimple] All URL params:', Object.fromEntries(searchParams.entries()));

    if (!companyId) {
      // Try to get from localStorage
      const storedId = localStorage.getItem('currentCompanyId');
      console.log('🏠 [HomepageSimple] Using stored ID:', storedId);
      companyId = storedId;
    }

    if (!companyId) {
      // Default fallback
      console.log('🏠 [HomepageSimple] Using default fallback ID');
      companyId = 'cmem8ayyr004cufakqkcsyn97';
    }

    console.log('🏠 [HomepageSimple] Final companyId:', companyId);

    // Save to localStorage for future use (only if it looks like a valid ID)
    if (companyId && companyId.startsWith('cm')) {
      localStorage.setItem('currentCompanyId', companyId);
    }

    loadHomepage(companyId);
  }, [searchParams]);

  const loadHomepage = async (companyId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/homepage/public/${companyId}`);
      console.log('🏠 [HomepageSimple] Response:', response.data);

      setData(response.data.data);

    } catch (err: any) {
      console.error('🏠 [HomepageSimple] Error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">خطأ</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            لا توجد صفحة رئيسية
          </h2>
          <p className="text-gray-600">لم يتم إنشاء صفحة رئيسية لهذا المتجر بعد</p>
        </div>
      </div>
    );
  }

  const content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-6 text-center">
        <h1 className="text-3xl font-bold m-0">
          {data.name}
        </h1>
        {data.description && (
          <p className="mt-2 opacity-90">{data.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="w-full px-4 py-8">
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            ✅ نجح! الصفحة الرئيسية تعمل!
          </h2>
          <p className="text-green-700">
            تم تحميل الصفحة الرئيسية بنجاح بدون تسجيل دخول
          </p>
        </div>

        {/* Sections Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900">
            معلومات الصفحة:
          </h3>
          <div className="grid gap-3">
            <div className="text-gray-700">
              <strong>عدد الأقسام:</strong> {content.sections?.length || 0}
            </div>
            <div className="text-gray-700">
              <strong>عرض الحاوية:</strong> {content.settings?.containerWidth || 'N/A'}
            </div>
            <div className="text-gray-700">
              <strong>المسافات:</strong> {content.settings?.spacing || 'N/A'}
            </div>
            <div className="text-gray-700">
              <strong>الحركات:</strong> {content.settings?.animation ? 'مفعلة' : 'معطلة'}
            </div>
          </div>
        </div>

        {/* Sections List */}
        {content.sections && content.sections.length > 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              الأقسام:
            </h3>
            <div className="grid gap-3">
              {content.sections.map((section: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-md border border-gray-200"
                >
                  <div className="font-bold mb-1 text-gray-800">
                    {index + 1}. {section.title || section.type}
                  </div>
                  <div className="text-sm text-gray-600">
                    النوع: {section.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomepageSimple;


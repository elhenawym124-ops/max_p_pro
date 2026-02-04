import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getApiUrl } from '../../config/environment';

interface StorePageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  pageType: string;
  metaTitle?: string;
  metaDescription?: string;
  updatedAt: string;
}

const StorePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<StorePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      // Get companyId from multiple sources
      let companyId = searchParams.get('companyId');
      
      if (!companyId) {
        companyId = localStorage.getItem('companyId');
      }
      
      // If still no companyId, try to get from current URL in shop
      if (!companyId && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        companyId = urlParams.get('companyId');
      }
      
      // Last resort: check if we're coming from shop with companyId in session
      if (!companyId) {
        // Try to get from sessionStorage
        companyId = sessionStorage.getItem('currentCompanyId');
      }
      
      if (!companyId) {
        setError('معرف الشركة مفقود');
        setLoading(false);
        return;
      }
      
      // Save to localStorage and sessionStorage for future use
      localStorage.setItem('companyId', companyId);
      sessionStorage.setItem('currentCompanyId', companyId);

      const response = await fetch(`${getApiUrl()}/store-pages/${companyId}/slug/${slug}`);
      const data = await response.json();

      if (data.success) {
        setPage(data.data);
        
        // Update page title and meta tags
        if (data.data.metaTitle) {
          document.title = data.data.metaTitle;
        } else {
          document.title = data.data.title;
        }
        
        if (data.data.metaDescription) {
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', data.data.metaDescription);
          }
        }
      } else {
        setError(data.error || 'الصفحة غير موجودة');
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      setError('حدث خطأ أثناء تحميل الصفحة');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">الصفحة غير موجودة</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/shop"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            العودة للمتجر
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            {/* Page Header */}
            <div className="border-b border-gray-200 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {page.title}
              </h1>
              <p className="text-sm text-gray-500">
                آخر تحديث: {new Date(page.updatedAt).toLocaleDateString('ar-SA')}
              </p>
            </div>

            {/* Page Content */}
            <div 
              className="prose prose-lg max-w-none text-right"
              dangerouslySetInnerHTML={{ __html: page.content }}
              style={{
                direction: 'rtl',
                lineHeight: '1.8',
              }}
            />

            {/* Back Button */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <a
                href="/shop"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
              >
                <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                العودة للمتجر
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorePage;


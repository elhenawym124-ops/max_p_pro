import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthSimple';

/**
 * صفحة توجيه للمتجر
 * تحصل على companyId من user context وتوجه للمتجر
 */
const StorefrontRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // انتظر تحميل user
    if (isLoading) {
      console.log('⏳ [StorefrontRedirect] Waiting for user to load...');
      return;
    }

    console.log('🔍 [StorefrontRedirect] User loaded:', user);
    
    // محاولة الحصول على companyId من عدة مصادر
    let companyId: string | null = null;
    
    // 1. من user context (الأفضل)
    if (user?.companyId) {
      companyId = user.companyId;
      console.log('✅ [StorefrontRedirect] Using companyId from user:', companyId);
    }
    
    // 2. من localStorage
    if (!companyId) {
      companyId = localStorage.getItem('companyId');
      if (companyId) {
        console.log('✅ [StorefrontRedirect] Using companyId from localStorage:', companyId);
      }
    }
    
    // 3. من URL parameter
    if (!companyId) {
      const urlParams = new URLSearchParams(window.location.search);
      companyId = urlParams.get('companyId');
      if (companyId) {
        console.log('✅ [StorefrontRedirect] Using companyId from URL:', companyId);
      }
    }
    
    if (companyId) {
      // حفظ في localStorage للمرات القادمة
      localStorage.setItem('storefront_companyId', companyId);
      
      // التوجيه للمتجر بدون companyId في URL
      console.log('🚀 [StorefrontRedirect] Redirecting to shop (companyId saved to localStorage):', companyId);
      
      // استخدام replace بدلاً من navigate لتجنب الرجوع
      window.location.href = '/shop';
    } else {
      // إذا لم يكن هناك companyId، اعرض رسالة
      console.error('❌ [StorefrontRedirect] No companyId found');
      console.error('   User:', user);
      console.error('   localStorage:', localStorage.getItem('companyId'));
    }
  }, [navigate, user, isLoading]);

  // عرض loading أثناء الانتظار
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏪</div>
          <h2 className="text-xl font-semibold text-gray-700">جاري التحميل...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          مرحباً بك في المتجر
        </h1>
        <p className="text-gray-600 mb-6">
          للوصول إلى المتجر، يرجى استخدام أحد الروابط التالية:
        </p>
        
        <div className="space-y-4 text-right">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              🌐 استخدام Subdomain (الأفضل)
            </h3>
            <code className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
              http://marketing.localhost:3000/shop
            </code>
            <p className="text-xs text-blue-600 mt-2">
              يتطلب إعداد hosts file
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">
              🔗 استخدام URL Parameter
            </h3>
            <code className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded break-all">
              http://localhost:3000/shop?companyId=xxx
            </code>
            <p className="text-xs text-green-600 mt-2">
              استبدل xxx بمعرف الشركة
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            💡 للمزيد من المعلومات، راجع ملف:
          </p>
          <code className="text-xs text-gray-600">
            SUBDOMAIN_SETUP_GUIDE.md
          </code>
        </div>
      </div>
    </div>
  );
};

export default StorefrontRedirect;

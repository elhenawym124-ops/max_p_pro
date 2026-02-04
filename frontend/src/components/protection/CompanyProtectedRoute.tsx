import React, { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { useCompany } from '../../contexts/CompanyContext';

interface CompanyProtectedRouteProps {
  children: ReactNode;
  requiredCompanyId?: string;
  allowSuperAdmin?: boolean;
  fallback?: ReactNode;
}

const CompanyProtectedRoute: React.FC<CompanyProtectedRouteProps> = ({
  children,
  requiredCompanyId,
  allowSuperAdmin = true,
  fallback
}) => {
  const { user, isAuthenticated } = useAuth();
  const { companyId, canAccessCompany } = useCompany();

  // Check authentication first
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <h3 className="text-yellow-800 font-semibold mb-2">🔐 مطلوب تسجيل الدخول</h3>
            <p className="text-yellow-700 mb-4">يجب تسجيل الدخول للوصول لهذه الصفحة</p>
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Super admin bypass
  if (allowSuperAdmin && user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Check company access
  if (requiredCompanyId && !canAccessCompany(requiredCompanyId)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-red-800 font-semibold mb-2">🚫 ممنوع الوصول</h3>
            <p className="text-red-700 mb-4">ليس لديك صلاحية للوصول لبيانات هذه الشركة</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 mr-2"
            >
              العودة
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has a company
  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <h3 className="text-yellow-800 font-semibold mb-2">⚠️ لا توجد شركة</h3>
            <p className="text-yellow-700 mb-4">لم يتم ربط حسابك بأي شركة</p>
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              تسجيل الدخول مرة أخرى
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// HOC version
export const withCompanyProtection = (
  requiredCompanyId?: string,
  allowSuperAdmin: boolean = true
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    return (props: P) => (
      <CompanyProtectedRoute 
        requiredCompanyId={requiredCompanyId}
        allowSuperAdmin={allowSuperAdmin}
      >
        <Component {...props} />
      </CompanyProtectedRoute>
    );
  };
};

// Role-based protection
interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallback
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <h3 className="text-yellow-800 font-semibold mb-2">🔐 مطلوب تسجيل الدخول</h3>
            <p className="text-yellow-700 mb-4">يجب تسجيل الدخول للوصول لهذه الصفحة</p>
          </div>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-red-800 font-semibold mb-2">🚫 ممنوع الوصول</h3>
            <p className="text-red-700 mb-4">ليس لديك الصلاحية المطلوبة للوصول لهذه الصفحة</p>
            <p className="text-sm text-red-600">الأدوار المطلوبة: {allowedRoles.join(', ')}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default CompanyProtectedRoute;

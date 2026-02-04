import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuthSimple';
import api from '../services/api';

interface Company {
  id: string;
  name: string;
  email: string;
  plan: string;
  currency: string;
  isActive: boolean;
  settings?: any;
}

interface CompanyContextType {
  company: Company | null;
  companyId: string | null;
  isCompanyLoading: boolean;
  companyError: string | null;
  refreshCompany: () => Promise<void>;

  // Helper functions for company-specific operations
  isOwnCompany: (companyId: string) => boolean;
  canAccessCompany: (companyId: string) => boolean;
  getCompanyFilter: () => { companyId: string } | {};
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const companyId = user?.companyId || null;

  // Fetch company data
  const fetchCompany = async () => {
    if (!isAuthenticated || !companyId) {
      setCompany(null);
      return;
    }

    try {
      setIsCompanyLoading(true);
      setCompanyError(null);

      const response = await api.get('companies/current');

      if (response.data && response.data.success) {
        setCompany(response.data.data);
      } else {
        throw new Error(response.data?.message || 'فشل في تحميل بيانات الشركة');
      }
    } catch (error: any) {
      console.error('Error fetching company:', error);
      setCompanyError(error.message || 'فشل في تحميل بيانات الشركة');
    } finally {
      setIsCompanyLoading(false);
    }
  };

  // Load company data when user changes
  useEffect(() => {
    fetchCompany();
  }, [isAuthenticated, companyId]);

  // Listen for company switch events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'companySwitchTimestamp') {
        // Company was switched, force refresh
        fetchCompany();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper functions
  const isOwnCompany = (targetCompanyId: string): boolean => {
    return companyId === targetCompanyId;
  };

  const canAccessCompany = (targetCompanyId: string): boolean => {
    // Super admin can access all companies
    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Regular users can only access their own company
    return isOwnCompany(targetCompanyId);
  };

  const getCompanyFilter = () => {
    // Super admin gets no filter (can see all)
    if (user?.role === 'SUPER_ADMIN') {
      return {};
    }

    // Regular users get company filter
    return companyId ? { companyId } : {};
  };

  const refreshCompany = async () => {
    await fetchCompany();
  };

  const value: CompanyContextType = {
    company,
    companyId,
    isCompanyLoading,
    companyError,
    refreshCompany,
    isOwnCompany,
    canAccessCompany,
    getCompanyFilter,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

// HOC for company-protected components
export const withCompanyProtection = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { company, isCompanyLoading, companyError } = useCompany();

    if (isCompanyLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل بيانات الشركة...</p>
          </div>
        </div>
      );
    }

    if (companyError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <h3 className="text-red-800 font-semibold mb-2">❌ خطأ في تحميل الشركة</h3>
              <p className="text-red-700 mb-4">{companyError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!company) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
              <h3 className="text-yellow-800 font-semibold mb-2">⚠️ لا توجد شركة</h3>
              <p className="text-yellow-700 mb-4">لم يتم العثور على بيانات الشركة</p>
            </div>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default CompanyContext;

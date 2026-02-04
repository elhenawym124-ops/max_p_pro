import React from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../hooks/useAuthSimple';

const CompanyInfo: React.FC = () => {
  const { company, companyId, isCompanyLoading } = useCompany();
  const { user } = useAuth();

  if (isCompanyLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center">
            <span className="text-yellow-700 text-sm">⚠️</span>
          </div>
          <div className="flex-1">
            <p className="text-yellow-800 font-medium text-sm">لا توجد شركة</p>
            <p className="text-yellow-600 text-xs">لم يتم العثور على بيانات الشركة</p>
          </div>
        </div>
      </div>
    );
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'BASIC': return 'bg-gray-100 text-gray-800';
      case 'PRO': return 'bg-blue-100 text-blue-800';
      case 'ENTERPRISE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'BASIC': return 'أساسي';
      case 'PRO': return 'احترافي';
      case 'ENTERPRISE': return 'مؤسسي';
      default: return plan;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-lg">
              {company.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{company.name}</h3>
            <p className="text-sm text-gray-600">{company.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(company.plan)}`}>
                {getPlanName(company.plan)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                }`}>
                {company.isActive ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          </div>
        </div>

        {user?.role === 'SUPER_ADMIN' && (
          <div className="text-xs text-gray-500">
            <p>ID: {companyId}</p>
            <p>العملة: {company.currency}</p>
          </div>
        )}
      </div>

      {/* Company Stats (if available) */}
      {company.settings && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">المنطقة الزمنية:</span>
              <span className="ml-1 font-medium">
                {JSON.parse(company.settings)?.timezone || 'غير محدد'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">اللغة:</span>
              <span className="ml-1 font-medium">
                {JSON.parse(company.settings)?.language === 'ar' ? 'العربية' : 'غير محدد'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* User Role Info */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">دورك في الشركة:</span>
          <span className="font-medium text-blue-600">
            {user?.role === 'COMPANY_ADMIN' ? 'مدير الشركة' :
              user?.role === 'MANAGER' ? 'مدير' :
                user?.role === 'AGENT' ? 'موظف' :
                  user?.role === 'AFFILIATE' ? 'مسوق بالعمولة' :
                    user?.role === 'SUPER_ADMIN' ? 'مدير النظام' :
                      user?.role}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfo;

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { 
  ChevronDownIcon, 
  CheckIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

interface CompanySwitcherProps {
  collapsed?: boolean;
}

const CompanySwitcher: React.FC<CompanySwitcherProps> = ({ collapsed = false }) => {
  const { user, switchCompany, isSwitchingCompany } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if user has no multiple companies
  if (!user?.hasMultipleCompanies || !user?.companies || user.companies.length <= 1) {
    return null;
  }

  const currentCompany = user.companies.find(c => c.isCurrent) || user.company;

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === currentCompany?.id) {
      setIsOpen(false);
      return;
    }

    const success = await switchCompany(companyId);
    if (success) {
      setIsOpen(false);
    }
  };

  // Collapsed version - just show icon
  if (collapsed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSwitchingCompany}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-all disabled:opacity-50"
          title="تبديل الشركة"
        >
          {isSwitchingCompany ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowsRightLeftIcon className="w-4 h-4" />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <p className="px-3 py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">تبديل الشركة</p>
            {user.companies.map(company => (
              <button
                key={company.id}
                onClick={() => handleSwitchCompany(company.id)}
                disabled={isSwitchingCompany}
                className={`w-full px-3 py-1.5 flex items-center justify-between text-right transition-colors disabled:opacity-50 ${
                  company.isCurrent 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-sm truncate">{company.name}</span>
                {company.isCurrent && <CheckIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mr-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Expanded version - compact design
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingCompany}
        className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all disabled:opacity-50"
      >
        <ArrowsRightLeftIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
        
        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate text-right">
          {currentCompany?.name || 'الشركة'}
        </span>

        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50 px-1.5 py-0.5 rounded-full flex-shrink-0">
          {user.companies.length}
        </span>

        {isSwitchingCompany ? (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 left-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {user.companies.map(company => (
            <button
              key={company.id}
              onClick={() => handleSwitchCompany(company.id)}
              disabled={isSwitchingCompany}
              className={`w-full px-3 py-2 flex items-center justify-between text-right transition-colors disabled:opacity-50 ${
                company.isCurrent 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  company.isCurrent 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {company.name}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {company.role}
                </p>
              </div>

              {company.isCurrent && (
                <CheckIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mr-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanySwitcher;

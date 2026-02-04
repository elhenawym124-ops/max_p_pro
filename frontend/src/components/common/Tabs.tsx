import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number | undefined;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  variant = 'default',
  className = '',
}) => {
  const getTabClasses = (tab: Tab) => {
    const isActive = activeTab === tab.id;
    const baseClasses = 'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200';
    
    if (tab.disabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed text-gray-400`;
    }

    switch (variant) {
      case 'pills':
        return `${baseClasses} rounded-lg ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`;
      
      case 'underline':
        return `${baseClasses} border-b-2 ${
          isActive
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }`;
      
      default:
        return `${baseClasses} rounded-t-lg border-t border-x ${
          isActive
            ? 'bg-white text-indigo-600 border-gray-300 -mb-px'
            : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
        }`;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Tabs Navigation */}
      <div className={`flex gap-1 ${variant === 'underline' ? 'border-b border-gray-200' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={getTabClasses(tab)}
            type="button"
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={`${variant === 'default' ? 'bg-white border border-gray-300 rounded-b-lg rounded-tr-lg' : 'mt-4'}`}>
        {children}
      </div>
    </div>
  );
};

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  id,
  activeTab,
  children,
  className = '',
}) => {
  if (activeTab !== id) return null;

  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

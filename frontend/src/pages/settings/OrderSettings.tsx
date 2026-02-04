import React, { useState, useEffect } from 'react';
import {
  Settings, Tag,
  ChevronLeft,
  Calendar,
  Hash
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OrderStatusManager from './OrderStatusManager';
import ScheduledOrderSettings from './ScheduledOrderSettings';
import OrderNumberingSettings from './OrderNumberingSettings';
import OrderInvoiceSettings from './OrderInvoiceSettings';
import RatingSettingsManager from './RatingSettingsManager';
import { Star, FileText } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 📦 Order Settings Page with Sidebar Tabs
// ═══════════════════════════════════════════════════════════════

type TabId = 'status' | 'ratings' | 'scheduled' | 'numbering' | 'invoices';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const OrderSettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>((searchParams.get('tab') as TabId) || 'status');

  // Update URL when tab changes
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs: Tab[] = [
    { id: 'status', label: 'حالات الطلبات', icon: Tag, description: 'إدارة حالات الطلبات والدفع' },
    { id: 'scheduled', label: 'الطلبات المجدولة', icon: Calendar, description: 'إعدادات الطلبات المجدولة' },
    { id: 'numbering', label: 'ترقيم الطلبات', icon: Hash, description: 'تخصيص تسلسل أرقام الطلبات' },
    { id: 'invoices', label: 'إعدادات الفواتير', icon: FileText, description: 'تخصيص وتوليد فواتير الطلبات' },
    { id: 'ratings', label: 'تقييم العملاء', icon: Star, description: 'تصنيف العملاء ومعدل النجاح' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">إعدادات الطلبات</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">إدارة إعدادات الطلبات</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">الإعدادات</h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors ${activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                      }`} />
                    <div className="flex-1">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tab.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'status' && (
              <OrderStatusManager />
            )}
            {activeTab === 'scheduled' && (
              <ScheduledOrderSettings />
            )}
            {activeTab === 'numbering' && (
              <OrderNumberingSettings />
            )}
            {activeTab === 'invoices' && (
              <OrderInvoiceSettings />
            )}
            {activeTab === 'ratings' && (
              <RatingSettingsManager />
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSettings;


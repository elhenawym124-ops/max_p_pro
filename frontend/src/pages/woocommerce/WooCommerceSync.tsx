import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Types
import { SyncLog } from './types';

// Hooks
import { useWooCommerceSettings } from './hooks/useWooCommerceSettings';

// Components
import { ConnectionStatus } from './components/ConnectionStatus';
import { SettingsTab } from './components/SettingsTab';
import { ImportTab } from './components/ImportTab';
import { ExportTab } from './components/ExportTab';
import { ProductsTab } from './components/ProductsTab';
import { StatusMappingTab } from './components/StatusMappingTab';
import { LogsTab } from './components/LogsTab';

export default function WooCommerceSync() {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'settings' | 'logs' | 'status_mapping' | 'products'>('import');
  const [logs, setLogs] = useState<SyncLog[]>([]);

  // Use Settings Hook (Central Logic)
  const {
    loading,
    testingConnection,
    settings,
    settingsForm,
    setSettingsForm,
    ngrokUrl,
    setNgrokUrl,
    loadSettings,
    saveSettings,
    testConnection,
    setupWebhooks
  } = useWooCommerceSettings();

  // Use Effects
  useEffect(() => {
    loadSettings();
    loadSyncLogs();
  }, [loadSettings]);

  // Load logs (Kept simple here as it's read-only)
  const loadSyncLogs = async () => {
    try {
      const response = await fetch('/api/v1/woocommerce/sync-logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Error loading logs', error);
    }
  };

  const syncNow = async () => {
    if (!settings?.syncEnabled) {
      toast.error('يرجى تفعيل المزامنة أولاً من الإعدادات');
      return;
    }

    try {
      const response = await fetch('/api/v1/woocommerce/auto-sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم بدء المزامنة بنجاح');
        loadSyncLogs();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('فشل بدء المزامنة');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-12 px-4 sm:px-6 lg:px-8 dir-rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="text-purple-600">WooCommerce</span>
                <span>ربط وانتقال بيانات</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                إدارة المزامنة بين المتجر والنظام المحلي
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        <ConnectionStatus
          settings={settings}
          loading={loading}
          onSync={syncNow}
        />

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex p-1 gap-1 min-w-max">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'import'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <CloudArrowDownIcon className="h-5 w-5" />
              استيراد طلبات
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'products'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <ShoppingBagIcon className="h-5 w-5" />
              منتجات
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'export'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              تصدير طلبات
            </button>

            <button
              onClick={() => setActiveTab('status_mapping')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'status_mapping'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <MapIcon className="h-5 w-5" />
              خريطة الحالات
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <Cog6ToothIcon className="h-5 w-5" />
              الإعدادات
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'logs'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <ClipboardDocumentListIcon className="h-5 w-5" />
              السجلات
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 animate-fadeIn">
          {activeTab === 'import' && (
            <ImportTab settings={settings} />
          )}

          {activeTab === 'products' && (
            <ProductsTab settings={settings} />
          )}

          {activeTab === 'export' && (
            <ExportTab />
          )}

          {activeTab === 'status_mapping' && (
            <StatusMappingTab
              settings={settings}
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              saveSettings={saveSettings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              saveSettings={saveSettings}
              testConnection={testConnection}
              setupWebhooks={setupWebhooks}
              testingConnection={testingConnection}
              ngrokUrl={ngrokUrl}
              setNgrokUrl={setNgrokUrl}
              loading={loading}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab logs={logs} />
          )}
        </div>
      </div>
    </div>
  );
}

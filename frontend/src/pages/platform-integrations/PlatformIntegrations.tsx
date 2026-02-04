import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    DocumentTextIcon,
    ShoppingCartIcon,
    ShoppingBagIcon
} from '@heroicons/react/24/outline';

// Import existing components
import EasyOrdersImport from '../products/EasyOrdersImport';
import WooCommerceSync from '../woocommerce/WooCommerceSync';

const PlatformIntegrations: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active tab from URL hash or default to 'easyorders'
    const getActiveTab = () => {
        const hash = location.hash.replace('#', '');
        return hash || 'easyorders';
    };

    const [activeTab, setActiveTab] = useState(getActiveTab());

    const tabs = [
        {
            id: 'easyorders',
            label: 'EasyOrders',
            icon: DocumentTextIcon,
            description: 'استيراد الطلبات من EasyOrders',
            component: EasyOrdersImport,
            available: true
        },
        {
            id: 'woocommerce',
            label: 'WooCommerce',
            icon: ShoppingCartIcon,
            description: 'مزامنة مع WooCommerce',
            component: WooCommerceSync,
            available: true
        },
        {
            id: 'shopify',
            label: 'Shopify',
            icon: ShoppingBagIcon,
            description: 'ربط مع Shopify',
            component: () => (
                <div className="p-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-8 shadow-sm">
                            <div className="text-6xl mb-4">🚀</div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">ربط Shopify</h2>
                            <p className="text-yellow-800 dark:text-yellow-400 font-medium mb-2">قريباً...</p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                نعمل على إضافة التكامل مع Shopify. ترقبوا التحديثات القادمة!
                            </p>
                        </div>
                    </div>
                </div>
            ),
            available: false
        }
    ];

    const handleTabChange = (tabId: string) => {
        if (tabs.find(t => t.id === tabId)?.available) {
            setActiveTab(tabId);
            navigate(`#${tabId}`);
        }
    };

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || tabs[0].component;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">الربط مع المنصات</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الربط مع منصات التجارة الإلكترونية</p>
                    </div>
                </div>
            </div>

            <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Tabs */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden lg:sticky lg:top-6">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
                                <h2 className="font-semibold text-gray-900 dark:text-white">المنصات</h2>
                            </div>
                            <nav className="p-2 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible no-scrollbar">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => tab.available && handleTabChange(tab.id)}
                                            disabled={!tab.available}
                                            className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors ${isActive
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50'
                                                : tab.available
                                                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                                                    : 'text-gray-400 dark:text-gray-500 cursor-not-allowed border border-transparent'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                            <div className="flex-1 text-right whitespace-nowrap lg:whitespace-normal">
                                                <div className="font-medium">{tab.label}</div>
                                                <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">{tab.description}</div>
                                            </div>
                                            {!tab.available && (
                                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">
                                                    قريباً
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        <ActiveComponent />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlatformIntegrations;

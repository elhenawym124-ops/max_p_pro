import React, { useState } from 'react';
import {
    ComputerDesktopIcon,
    PlusIcon,
    TagIcon,
    ArrowPathIcon,
    ClipboardDocumentListIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import AssetList from './AssetList';
import AssetStats from './AssetStats';
import AssetCategories from './AssetCategories';
import AssetSuppliers from './AssetSuppliers';
import AssetForm from './AssetForm';
import AssetRequests from './AssetRequests';
import MyAssetRequests from './MyAssetRequests';
import { useAuth } from '../../../hooks/useAuthSimple';

const AssetsDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'list' | 'categories' | 'requests' | 'myRequests' | 'suppliers'>('list');
    const [showAddModal, setShowAddModal] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { user } = useAuth();
    const isHR = ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <ComputerDesktopIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
                        إدارة العهدة والأصول
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        تتبع أصول الشركة، العهد المسلمة للموظفين، وحالتها
                    </p>
                </div>
                <div className="flex space-x-3 space-x-reverse">
                    <button
                        onClick={() => handleRefresh()}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        تحديث
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        إضافة أصل جديد
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <AssetStats refreshTrigger={refreshTrigger} />

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`${activeTab === 'list'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <ComputerDesktopIcon className="h-5 w-5 mr-2" />
                        سجل الأصول
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`${activeTab === 'categories'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <TagIcon className="h-5 w-5 mr-2" />
                        التصنيفات
                    </button>
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`${activeTab === 'suppliers'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <UserGroupIcon className="h-5 w-5 mr-2" />
                        الموردون
                    </button>
                    {isHR && (
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`${activeTab === 'requests'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                            طلبات العهدة
                        </button>
                    )}
                    {!isHR && (
                        <button
                            onClick={() => setActiveTab('myRequests')}
                            className={`${activeTab === 'myRequests'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                            طلباتي
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'list' && <AssetList refreshTrigger={refreshTrigger} />}
                {activeTab === 'categories' && <AssetCategories />}
                {activeTab === 'suppliers' && <AssetSuppliers />}
                {activeTab === 'requests' && isHR && <AssetRequests />}
                {activeTab === 'myRequests' && !isHR && <MyAssetRequests />}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <AssetForm
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        handleRefresh();
                    }}
                />
            )}
        </div>
    );
};

export default AssetsDashboard;

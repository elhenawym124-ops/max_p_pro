import React, { useState } from 'react';
import {
    HomeIcon,
    QuestionMarkCircleIcon,
    UserGroupIcon,
    PlayIcon,
    ChartBarIcon,
    ShieldCheckIcon,
    ComputerDesktopIcon,
    Cog6ToothIcon,
    ClipboardDocumentListIcon,
    TagIcon,
    PlusIcon,
    DocumentIcon,
    DocumentTextIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

import OverviewSection from './sections/OverviewSection';
import WhyAssetsSection from './sections/WhyAssetsSection';
import BenefitsSection from './sections/BenefitsSection';
import HowItWorksSection from './sections/HowItWorksSection';
import KPIsSection from './sections/KPIsSection';
import ComplianceSection from './sections/ComplianceSection';
import DocumentsSection from './sections/DocumentsSection';
import ReceiptFormSection from './sections/ReceiptFormSection';
import AssetRequestsSection from './sections/AssetRequestsSection';
import AssetMaintenanceSection from './sections/AssetMaintenanceSection';
import AssetList from './AssetList';
import AssetCategories from './AssetCategories';
import AssetSuppliers from './AssetSuppliers';
import CustodyHistory from './CustodyHistory';
import AssetForm from './AssetForm';

type SectionId = 'overview' | 'why' | 'benefits' | 'how' | 'kpis' | 'compliance' | 'manage' | 'categories' | 'suppliers' | 'custody' | 'documents' | 'receipts' | 'requests' | 'maintenance';

interface Section {
    id: SectionId;
    title: string;
    icon: React.ElementType;
    color: string;
}

const AssetsOverviewDashboard: React.FC = () => {
    const [activeSection, setActiveSection] = useState<SectionId>('overview');
    const [showAddModal, setShowAddModal] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    const sections: Section[] = [
        { id: 'overview', title: 'نظرة عامة', icon: HomeIcon, color: 'indigo' },
        { id: 'manage', title: 'إدارة الأصول', icon: ComputerDesktopIcon, color: 'teal' },
        { id: 'categories', title: 'التصنيفات', icon: TagIcon, color: 'cyan' },
        { id: 'suppliers', title: 'الموردون', icon: UserGroupIcon, color: 'emerald' },
        { id: 'custody', title: 'العهد النشطة', icon: ClipboardDocumentListIcon, color: 'amber' },
        { id: 'documents', title: 'الوثائق والمرفقات', icon: DocumentIcon, color: 'pink' },
        { id: 'requests', title: 'طلبات العهدة', icon: PlusIcon, color: 'emerald' },
        { id: 'maintenance', title: 'الصيانة والضمان', icon: WrenchScrewdriverIcon, color: 'rose' },
        { id: 'receipts', title: 'النماذج الرسمية', icon: DocumentTextIcon, color: 'violet' },
        { id: 'why', title: 'لماذا النظام؟', icon: QuestionMarkCircleIcon, color: 'blue' },
        { id: 'benefits', title: 'الفوائد', icon: UserGroupIcon, color: 'green' },
        { id: 'how', title: 'كيف يعمل؟', icon: PlayIcon, color: 'orange' },
        { id: 'kpis', title: 'المؤشرات', icon: ChartBarIcon, color: 'purple' },
        { id: 'compliance', title: 'الامتثال', icon: ShieldCheckIcon, color: 'red' }
    ];

    const colorMap = {
        indigo: { active: 'bg-indigo-600 text-white', inactive: 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' },
        blue: { active: 'bg-blue-600 text-white', inactive: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30' },
        green: { active: 'bg-green-600 text-white', inactive: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30' },
        orange: { active: 'bg-orange-600 text-white', inactive: 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30' },
        purple: { active: 'bg-purple-600 text-white', inactive: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30' },
        red: { active: 'bg-red-600 text-white', inactive: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30' },
        teal: { active: 'bg-teal-600 text-white', inactive: 'text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30' },
        cyan: { active: 'bg-cyan-600 text-white', inactive: 'text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30' },
        amber: { active: 'bg-amber-600 text-white', inactive: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30' },
        pink: { active: 'bg-pink-600 text-white', inactive: 'text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30' },
        violet: { active: 'bg-violet-600 text-white', inactive: 'text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30' },
        emerald: { active: 'bg-emerald-600 text-white', inactive: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' },
        rose: { active: 'bg-rose-600 text-white', inactive: 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30' }
    };

    const getColorClasses = (color: string, isActive: boolean) => {
        const colors = colorMap[color as keyof typeof colorMap] || colorMap.indigo;
        return isActive ? colors.active : colors.inactive;
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'overview':
                return <OverviewSection />;
            case 'manage':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">سجل الأصول</h2>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                <PlusIcon className="h-5 w-5" />
                                إضافة أصل جديد
                            </button>
                        </div>
                        <AssetList refreshTrigger={refreshTrigger} />
                    </div>
                );
            case 'categories':
                return <AssetCategories />;
            case 'suppliers':
                return <AssetSuppliers />;
            case 'custody':
                return <CustodyHistory />;
            case 'documents':
                return <DocumentsSection />;
            case 'receipts':
                return <ReceiptFormSection />;
            case 'requests':
                return <AssetRequestsSection />;
            case 'maintenance':
                return <AssetMaintenanceSection />;
            case 'why':
                return <WhyAssetsSection />;
            case 'benefits':
                return <BenefitsSection />;
            case 'how':
                return <HowItWorksSection />;
            case 'kpis':
                return <KPIsSection />;
            case 'compliance':
                return <ComplianceSection />;
            default:
                return <OverviewSection />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Top Navigation */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg">
                                <ComputerDesktopIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                    إدارة الأصول والعهدة
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    نظام شامل لحماية وتتبع أصول الشركة
                                </p>
                            </div>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Cog6ToothIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Section Navigation */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 py-3 overflow-x-auto">
                        {sections.map((section) => {
                            const SectionIcon = section.icon;
                            const isActive = activeSection === section.id;

                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${getColorClasses(section.color, isActive)
                                        }`}
                                >
                                    <SectionIcon className="h-5 w-5" />
                                    {section.title}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderSection()}
            </div>

            {/* Add Asset Modal */}
            {showAddModal && (
                <AssetForm
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        handleRefresh();
                    }}
                />
            )}

            {/* Quick Actions Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 px-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        آخر تحديث: {new Date().toLocaleDateString('ar-EG')}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setActiveSection('manage')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            إدارة الأصول
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetsOverviewDashboard;

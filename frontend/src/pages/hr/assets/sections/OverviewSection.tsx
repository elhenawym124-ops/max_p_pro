import React from 'react';
import {
    ComputerDesktopIcon,
    UserGroupIcon,
    ShieldCheckIcon,
    ChartPieIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

const OverviewSection: React.FC = () => {
    const stats = [
        { label: 'إجمالي الأصول', value: '124', icon: ComputerDesktopIcon, color: 'blue' },
        { label: 'العهد النشطة', value: '85', icon: UserGroupIcon, color: 'indigo' },
        { label: 'تحت الصيانة', value: '12', icon: ShieldCheckIcon, color: 'amber' },
        { label: 'متوفر', value: '27', icon: ChartPieIcon, color: 'green' },
    ];

    const colorClasses: Record<string, string> = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
        green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Hero Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden relative">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">
                        مرحباً بك في نظام إدارة الأصول والعهدة المتطور
                    </h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
                        هنا يمكنك تتبع كل قطعة من أصول شركتك، من الحواسيب والمعدات إلى العهد المكتبية والسيارات. نظامنا يوفر لك الأمان والشفافية التامة.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
                            <ShieldCheckIcon className="h-4 w-4" />
                            حماية كاملة من الفقدان
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                            <ChartPieIcon className="h-4 w-4" />
                            إحصائيات فورية ودقيقة
                        </div>
                    </div>
                </div>
                <ComputerDesktopIcon className="absolute -left-20 -bottom-20 h-80 w-80 text-gray-100 dark:text-gray-700/50 -rotate-12" />
            </div>

            {/* Quick Stats Placeholder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[stat.color]}`}>
                            <stat.icon className="h-7 w-7" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Introduction to Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
                    <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-3">لماذا هذا النظام؟</h3>
                    <p className="text-indigo-700 dark:text-indigo-300 text-sm leading-relaxed mb-4">
                        تعرف على الأسباب الجوهرية التي تجعل إدارة الأصول والعهدة ضرورة لا غنى عنها لأي شركة تسعى للنمو والاحترافية.
                    </p>
                    <button className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:gap-3 transition-all">
                        استكشف المزيد <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" />
                    </button>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-800">
                    <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-3">الفوائد العملية</h3>
                    <p className="text-purple-700 dark:text-purple-300 text-sm leading-relaxed mb-4">
                        اكتشف كيف يستفيد الموظفون وقسم الموارد البشرية والإدارة من نظام موحد ومنظم لإدارة العهد.
                    </p>
                    <button className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm hover:gap-3 transition-all">
                        تعرف على الفوائد <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OverviewSection;

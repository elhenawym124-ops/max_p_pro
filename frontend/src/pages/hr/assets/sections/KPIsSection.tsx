import React from 'react';
import {
    ChartBarIcon,
    ArrowTrendingDownIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    ArrowPathIcon,
    PresentationChartBarIcon
} from '@heroicons/react/24/outline';

const KPIsSection: React.FC = () => {
    const kpis = [
        {
            title: 'نسبة الفقدان',
            description: 'كم جهاز ضاع أو فُقد خلال السنة الحالية مقارنة بالسنوات السابقة.',
            icon: ArrowTrendingDownIcon,
            color: 'red',
            metric: 'كم جهاز ضاع السنة دي؟'
        },
        {
            title: 'تكلفة الصيانة',
            description: 'إجمالي ما صرفته الشركة على الإصلاحات وقطع الغيار للأصول.',
            icon: CurrencyDollarIcon,
            color: 'orange',
            metric: 'كم صرفنا على الإصلاحات؟'
        },
        {
            title: 'متوسط عمر الأصل',
            description: 'المدة الزمنية التي يعيشها الجهاز قبل أن يحتاج إلى بديل.',
            icon: CalendarIcon,
            color: 'blue',
            metric: 'الأجهزة تعيش كام سنة؟'
        },
        {
            title: 'معدل الاستبدال',
            description: 'عدد الأجهزة التي يتم استبدالها سنوياً نتيجة التلف أو التقادم.',
            icon: ArrowPathIcon,
            color: 'purple',
            metric: 'كم جهاز نستبدل سنوياً؟'
        },
        {
            title: 'ROI - العائد على الاستثمار',
            description: 'قياس كفاءة الاستثمار في الأصول وتقليل الهالك.',
            icon: PresentationChartBarIcon,
            color: 'green',
            metric: 'تحسين كفاءة استخدام الأصول'
        }
    ];

    const colorClasses: Record<string, string> = {
        red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">المؤشرات اللي تقدر تقيسها (KPIs)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kpis.map((kpi, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:scale-[1.02] transition-transform"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[kpi.color]}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {kpi.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                            {kpi.description}
                        </p>
                        <div className="pt-4 border-t border-gray-50 dark:border-gray-700">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                السؤال: {kpi.metric}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl text-white overflow-hidden relative">
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-4">هل أنت مستعد لقياس أداء أصولك؟</h3>
                    <p className="opacity-90 max-w-2xl mb-6">
                        ابدأ بتسجيل أصولك الآن وستتمكن قريباً من الحصول على تقارير تفصيلية ورؤى ذكية حول كيفية إدارة مواردك بكفاءة.
                    </p>
                </div>
                <ChartBarIcon className="absolute -right-10 -bottom-10 h-64 w-64 opacity-10 rotate-12" />
            </div>
        </div>
    );
};

export default KPIsSection;

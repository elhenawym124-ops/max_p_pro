import React from 'react';
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    UserIcon,
    PresentationChartLineIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

const BenefitsSection: React.FC = () => {
    const benefitGroups = [
        {
            title: 'للشركة',
            icon: BuildingOfficeIcon,
            color: 'blue',
            benefits: [
                'تقليل الخسائر - معرفة كل حاجة فين',
                'توفير الوقت - ما فيش بحث عن الأجهزة المفقودة',
                'قرارات أفضل - بيانات دقيقة عن الأصول',
                'تخطيط الميزانية - معرفة متى نشتري جديد'
            ]
        },
        {
            title: 'لقسم HR',
            icon: UserGroupIcon,
            color: 'indigo',
            benefits: [
                'سهولة التسليم - كل شيء موثق ومنظم',
                'تقارير سريعة - من عنده إيه بضغطة زر',
                'تنبيهات تلقائية - ما تنسى ترجع العهدة من الموظف المستقيل',
                'أقل أخطاء - كل شيء مسجل في النظام'
            ]
        },
        {
            title: 'للموظف',
            icon: UserIcon,
            color: 'green',
            benefits: [
                'حماية نفسه - إثبات إنه رد العهدة',
                'طلب عهدة بسهولة - من خلال النظام',
                'معرفة مسؤولياته - إيه اللي معاه بالظبط'
            ]
        },
        {
            title: 'للإدارة',
            icon: PresentationChartLineIcon,
            color: 'purple',
            benefits: [
                'رؤية شاملة - كل الأصول في مكان واحد',
                'تحليل الأداء - أي قسم يستخدم إيه',
                'تحسين الكفاءة - استغلال الأصول بشكل أفضل'
            ]
        }
    ];

    const colorClasses: Record<string, string> = {
        blue: 'text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
        indigo: 'text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
        green: 'text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30',
        purple: 'text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">الفوائد العملية للنظام</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {benefitGroups.map((group, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className={`px-6 py-4 flex items-center justify-between border-b ${colorClasses[group.color]}`}>
                            <div className="flex items-center gap-3">
                                <group.icon className="h-6 w-6" />
                                <span className="font-bold text-lg">{group.title}</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <ul className="space-y-4">
                                {group.benefits.map((benefit, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            <CheckCircleIcon className={`h-5 w-5 ${(colorClasses[group.color] || 'text-indigo-600').split(' ')[0]}`} />
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {benefit}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BenefitsSection;

import React from 'react';
import {
    ShieldCheckIcon,
    ClipboardDocumentCheckIcon,
    CurrencyDollarIcon,
    BoltIcon,
    ScaleIcon
} from '@heroicons/react/24/outline';

const WhyAssetsSection: React.FC = () => {
    const reasons = [
        {
            title: 'حماية أصول الشركة',
            icon: ShieldCheckIcon,
            color: 'blue',
            items: [
                'منع ضياع أو سرقة الأجهزة',
                'معرفة مكان كل أصل بالظبط',
                'توثيق من استلم إيه ومتى'
            ]
        },
        {
            title: 'المساءلة والشفافية',
            icon: ClipboardDocumentCheckIcon,
            color: 'indigo',
            items: [
                'كل موظف مسؤول عن العهدة اللي معاه',
                'توقيع رسمي على الاستلام',
                'سجل كامل لكل حركة'
            ]
        },
        {
            title: 'توفير المال',
            icon: CurrencyDollarIcon,
            color: 'green',
            items: [
                'تقليل الفاقد والتالف',
                'معرفة متى نصلح أو نستبدل',
                'تتبع تكاليف الصيانة',
                'حساب الإهلاك للمحاسبة'
            ]
        },
        {
            title: 'تسهيل العمل على HR',
            icon: BoltIcon,
            color: 'orange',
            items: [
                'أتمتة تسليم واسترجاع العهد',
                'ربط مع Onboarding/Offboarding',
                'تقارير جاهزة بضغطة زر'
            ]
        },
        {
            title: 'الالتزام القانوني',
            icon: ScaleIcon,
            color: 'red',
            items: [
                'وثائق رسمية للجرد',
                'إثبات قانوني عند النزاعات',
                'تقارير للمراجعين والمحاسبين'
            ]
        }
    ];

    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    لماذا نحتاج لنظام إدارة الأصول؟
                </h2>
                <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
                    أهمية تتبع الأصول والعهدة لضمان استقرار ونمو الشركة
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reasons.map((reason, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[reason.color]}`}>
                            <reason.icon className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            {reason.title}
                        </h3>
                        <ul className="space-y-3">
                            {reason.items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WhyAssetsSection;

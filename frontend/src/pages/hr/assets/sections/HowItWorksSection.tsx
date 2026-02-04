import React from 'react';
import {
    UserPlusIcon,
    UserMinusIcon,
    ClipboardDocumentListIcon,
    XCircleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

const HowItWorksSection: React.FC = () => {
    const examples = [
        {
            title: 'مثال 1: موظف جديد',
            icon: UserPlusIcon,
            before: [
                'HR تدور على لابتوب متاح',
                'تكتب في ورقة أو إكسل',
                'الموظف ياخد اللابتوب بدون توقيع',
                'بعد سنة ما حد فاكر مين معاه إيه'
            ],
            after: [
                'الموظف يطلب لابتوب من النظام',
                'المدير يوافق',
                'HR تخصص لابتوب وتطبع نموذج',
                'الموظف يوقع ويحفظ كل شيء للأبد'
            ]
        },
        {
            title: 'مثال 2: موظف مستقيل',
            icon: UserMinusIcon,
            before: [
                'HR تحاول تفتكر إيه اللي معاه',
                'ممكن ينسوا حاجة',
                'الموظف يطلع والعهدة معاه'
            ],
            after: [
                'النظام يطلع قائمة بكل عهد الموظف',
                'Checklist لرد كل حاجة',
                'ما يقدر يكمل Offboarding قبل رد كل شيء',
                'صفر فقدان'
            ]
        },
        {
            title: 'مثال 3: جرد سنوي',
            icon: ClipboardDocumentListIcon,
            before: [
                'كل قسم يكتب ورق والتجميع يدوي',
                'أخطاء كثيرة ويأخذ أسابيع'
            ],
            after: [
                'تقرير كامل بضغطة زر',
                'مطابقة تلقائية ومعرفة المفقود فوراً',
                'يأخذ دقائق معدودة'
            ]
        }
    ];

    return (
        <div className="space-y-12 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">أمثلة عملية: كيف يغير النظام عملك</h2>
            </div>

            <div className="space-y-8">
                {examples.map((example, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                            <example.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{example.title}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            {/* Before */}
                            <div className="p-6 bg-red-50/30 dark:bg-red-900/10 border-r border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-400 font-bold">
                                    <XCircleIcon className="h-5 w-5" />
                                    <span>بدون النظام</span>
                                </div>
                                <ul className="space-y-3">
                                    {example.before.map((item, idx) => (
                                        <li key={idx} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* After */}
                            <div className="p-6 bg-green-50/30 dark:bg-green-900/10">
                                <div className="flex items-center gap-2 mb-4 text-green-600 dark:text-green-400 font-bold">
                                    <CheckCircleIcon className="h-5 w-5" />
                                    <span>مع النظام</span>
                                </div>
                                <ul className="space-y-3">
                                    {example.after.map((item, idx) => (
                                        <li key={idx} className="text-gray-800 dark:text-gray-200 font-medium flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HowItWorksSection;

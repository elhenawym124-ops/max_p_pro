import React from 'react';
import {
    ShieldCheckIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    ScaleIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';

const ComplianceSection: React.FC = () => {
    const complianceItems = [
        {
            title: 'الالتزام بسياسات الشركة',
            description: 'التأكد من أن جميع الموظفين يتبعون السياسات المعتمدة لاستخدام الأصول والحفاظ عليها.',
            icon: DocumentTextIcon,
            color: 'blue'
        },
        {
            title: 'الجرد الدوري والتدقيق',
            description: 'سجل كامل لعمليات الجرد السنوية والدورية لإثبات وجود الأصول وحالتها الفعلية.',
            icon: CheckBadgeIcon,
            color: 'green'
        },
        {
            title: 'المسؤولية القانونية',
            description: 'توثيق نماذج الاستلام والتسليم (العهدة) يوفر حماية قانونية للشركة وللموظف في حالة النزاعات.',
            icon: ScaleIcon,
            color: 'indigo'
        },
        {
            title: 'إدارة المخاطر',
            description: 'تحديد المخاطر المتعلقة بفقدان الأصول أو تعرضها للتلف ووضع خطط بديلة للحد منها.',
            icon: ExclamationTriangleIcon,
            color: 'amber'
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <ShieldCheckIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">الامتثال والمعايير</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {complianceItems.map((item, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <item.icon className={`h-5 w-5 text-${item.color}-600`} />
                            {item.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">ملاحظة هامة:</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    يعتبر التوقيع الإلكتروني أو الورقي على نماذج العهدة جزءاً لا يتجزأ من ملف الموظف، ويحق للشركة الخصم من مستحقات الموظف في حال ثبت إهماله أو فقده للعهدة المسلمة إليه وفقاً لقانون العمل واللوائح الداخلية.
                </p>
            </div>
        </div>
    );
};

export default ComplianceSection;

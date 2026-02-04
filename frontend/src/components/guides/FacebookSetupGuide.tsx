import React, { useState } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { buildWebhookUrl } from '../../utils/urlHelper';

interface GuideStep {
  id: number;
  title: string;
  description: string;
  details: string[];
  links?: { text: string; url: string }[];
  code?: string;
}

const FacebookSetupGuide: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  // Generate dynamic webhook URL based on environment
  const webhookUrl = buildWebhookUrl();

  const steps: GuideStep[] = [
    {
      id: 1,
      title: 'إنشاء Facebook App',
      description: 'إنشاء تطبيق Facebook جديد في Facebook Developers',
      details: [
        'اذهب إلى Facebook for Developers',
        'انقر على "My Apps" ثم "Create App"',
        'اختر "Business" كنوع التطبيق',
        'أدخل اسم التطبيق ومعلومات الاتصال',
        'انقر على "Create App ID"'
      ],
      links: [
        { text: 'Facebook for Developers', url: 'https://developers.facebook.com/' }
      ]
    },
    {
      id: 2,
      title: 'إضافة Messenger Platform',
      description: 'إضافة منتج Messenger إلى التطبيق',
      details: [
        'في لوحة تحكم التطبيق، انقر على "Add Product"',
        'ابحث عن "Messenger" وانقر على "Set Up"',
        'ستظهر إعدادات Messenger في القائمة الجانبية'
      ]
    },
    {
      id: 3,
      title: 'إعداد Webhook',
      description: 'ربط التطبيق بخادم المنصة',
      details: [
        'في إعدادات Messenger، اذهب إلى "Webhooks"',
        'انقر على "Add Callback URL"',
        'أدخل Webhook URL من إعدادات المنصة',
        'أدخل Verify Token من إعدادات المنصة',
        'اختر الأحداث المطلوبة (messages, messaging_postbacks, etc.)',
        'انقر على "Verify and Save"'
      ],
      code: webhookUrl
    },
    {
      id: 4,
      title: 'الحصول على Page Access Token',
      description: 'الحصول على رمز الوصول للصفحة',
      details: [
        'في إعدادات Messenger، اذهب إلى "Access Tokens"',
        'انقر على "Add or Remove Pages"',
        'اختر الصفحة التي تريد ربطها',
        'انقر على "Generate Token"',
        'انسخ Page Access Token واحفظه بأمان'
      ]
    },
    {
      id: 5,
      title: 'ربط الصفحة في المنصة',
      description: 'إدخال معلومات الصفحة في إعدادات المنصة',
      details: [
        'اذهب إلى إعدادات Facebook Messenger في المنصة',
        'انقر على "ربط صفحة جديدة"',
        'أدخل اسم الصفحة',
        'أدخل Page ID (يمكن العثور عليه في About الصفحة)',
        'أدخل Page Access Token الذي حصلت عليه',
        'انقر على "ربط الصفحة"'
      ]
    },
    {
      id: 6,
      title: 'اختبار التكامل',
      description: 'التأكد من عمل التكامل بشكل صحيح',
      details: [
        'أرسل رسالة إلى صفحة Facebook من حساب شخصي',
        'تحقق من وصول الرسالة إلى المنصة',
        'جرب الرد من المنصة',
        'تأكد من وصول الرد إلى Facebook Messenger'
      ]
    }
  ];

  const toggleStep = (stepId: number) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ النص إلى الحافظة');
  };

  return (
    <div className="w-full p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <svg className="h-6 w-6 text-blue-600 ml-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            دليل إعداد Facebook Messenger
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            خطوات مفصلة لربط صفحة Facebook بالمنصة
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleStep(step.id)}
                  className="w-full px-4 py-3 text-right flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium ml-3">
                      {step.id}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  {expandedStep === step.id ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {expandedStep === step.id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-3">الخطوات التفصيلية:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        {step.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-start">
                            <span className="ml-2">{detail}</span>
                          </li>
                        ))}
                      </ol>

                      {step.code && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-900 mb-2">مثال على الرابط:</h5>
                          <div className="bg-gray-100 p-3 rounded-md flex items-center justify-between">
                            <code className="text-sm text-gray-800">{step.code}</code>
                            <button
                              onClick={() => copyToClipboard(step.code)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="نسخ"
                            >
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {step.links && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-900 mb-2">روابط مفيدة:</h5>
                          <div className="space-y-1">
                            {step.links.map((link, linkIndex) => (
                              <a
                                key={linkIndex}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                              >
                                {link.text}
                                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Success Message */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 ml-2" />
              <div>
                <h4 className="font-medium text-green-900">نصائح مهمة</h4>
                <ul className="mt-2 text-sm text-green-700 space-y-1">
                  <li>• تأكد من أن صفحة Facebook منشورة وليست مسودة</li>
                  <li>• احفظ Page Access Token في مكان آمن</li>
                  <li>• اختبر التكامل قبل البدء في استخدامه مع العملاء</li>
                  <li>• راجع سياسات Facebook للتأكد من الامتثال</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookSetupGuide;


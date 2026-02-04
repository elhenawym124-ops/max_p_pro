import React, { useState } from 'react';
import { ReceiptPercentIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const TaxesAnalytics: React.FC = () => {
  const [period, setPeriod] = useState('30');

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تحليلات الضرائب</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">الضرائب المحصلة حسب الطلبات والمناطق</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <option value="7">آخر 7 أيام</option>
          <option value="30">آخر 30 يوم</option>
          <option value="90">آخر 90 يوم</option>
          <option value="365">آخر سنة</option>
        </select>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">تحليلات الضرائب - قيد التطوير</h3>
            <p className="text-blue-700 dark:text-blue-300 mt-2">
              هذه الميزة تتطلب تكوين إعدادات الضرائب في WooCommerce وربطها بالنظام.
            </p>
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">المتطلبات:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>تفعيل الضرائب في WooCommerce</li>
                <li>تحديد معدلات الضرائب حسب المنطقة</li>
                <li>مزامنة بيانات الضرائب مع النظام</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 opacity-50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <ReceiptPercentIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الضرائب المحصلة</p>
              <p className="text-2xl font-bold text-gray-400">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 opacity-50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <ReceiptPercentIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متوسط الضريبة لكل طلب</p>
              <p className="text-2xl font-bold text-gray-400">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 opacity-50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <ReceiptPercentIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عدد المناطق الضريبية</p>
              <p className="text-2xl font-bold text-gray-400">--</p>
            </div>
          </div>
        </div>
      </div>

      {/* TODO Section */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4">خطة التنفيذ</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input type="checkbox" disabled className="h-4 w-4" />
            <span className="text-yellow-800 dark:text-yellow-200">إضافة endpoint للضرائب في الباك إند</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" disabled className="h-4 w-4" />
            <span className="text-yellow-800 dark:text-yellow-200">جلب بيانات الضرائب من WooCommerce API</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" disabled className="h-4 w-4" />
            <span className="text-yellow-800 dark:text-yellow-200">تخزين الضرائب في قاعدة البيانات</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" disabled className="h-4 w-4" />
            <span className="text-yellow-800 dark:text-yellow-200">عرض التحليلات في الواجهة</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxesAnalytics;

import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import StorefrontNav from '../../components/StorefrontNav';

const OrderConfirmation: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get('trackingToken');
  const companyId = searchParams.get('companyId');

  return (
    <>
      <StorefrontNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <CheckCircleIcon className="h-20 w-20 text-green-500" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          تم إنشاء طلبك بنجاح! 🎉
        </h1>

        <p className="text-gray-600 mb-8">
          شكراً لك! تم استلام طلبك وسيتم معالجته قريباً
        </p>

        {/* Order Number */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-600 mb-2">رقم الطلب</p>
          <p className="text-2xl font-bold text-gray-900">{orderNumber}</p>
        </div>

        {/* Info */}
        <div className="text-right bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">ماذا بعد؟</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 ml-2">✓</span>
              <span>سنتواصل معك قريباً لتأكيد الطلب</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 ml-2">✓</span>
              <span>يمكنك تتبع طلبك باستخدام رقم الطلب ورقم الهاتف</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 ml-2">✓</span>
              <span>سيتم توصيل الطلب خلال 2-3 أيام عمل</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/shop/track-order?orderNumber=${orderNumber}&companyId=${companyId}`}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            تتبع الطلب
          </Link>
          <Link
            to={`/shop?companyId=${companyId}`}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            متابعة التسوق
          </Link>
        </div>

        {/* Tracking Token Info */}
        {trackingToken && (
          <div className="mt-6 text-xs text-gray-500">
            <p>رمز التتبع: {trackingToken}</p>
            <p className="mt-1">احتفظ بهذا الرمز للتتبع السريع</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default OrderConfirmation;

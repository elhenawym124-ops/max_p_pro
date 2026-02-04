import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import StorefrontNav from '../../components/StorefrontNav';

interface Order {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  guestName: string;
  guestPhone: string;
  shippingAddress: string;
  city: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

const TrackOrder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const getCompanyId = () => {
    return new URLSearchParams(window.location.search).get('companyId') || '';
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': 'قيد المعالجة',
      'CONFIRMED': 'تم التأكيد',
      'PROCESSING': 'جاري التجهيز',
      'SHIPPED': 'تم الشحن',
      'DELIVERED': 'تم التوصيل',
      'CANCELLED': 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'PROCESSING': 'bg-purple-100 text-purple-800',
      'SHIPPED': 'bg-indigo-100 text-indigo-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber || !phone) {
      toast.error('يرجى إدخال رقم الطلب ورقم الهاتف');
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const companyId = getCompanyId();
      
      const response = await fetch(
        `/api/public/orders/track?companyId=${companyId}&orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`
      );
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
      } else {
        setOrder(null);
        toast.error(data.message || 'الطلب غير موجود');
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error('حدث خطأ في تتبع الطلب');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StorefrontNav />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">تتبع الطلب</h1>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رقم الطلب
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ORD-1699356789-ABC123"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
            <span>{loading ? 'جاري البحث...' : 'تتبع الطلب'}</span>
          </button>
        </form>
      </div>

      {/* Order Details */}
      {searched && !loading && (
        order ? (
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">حالة الطلب</h2>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">رقم الطلب:</span>
                  <span className="font-semibold text-gray-900 mr-2">{order.orderNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">حالة الدفع:</span>
                  <span className="font-semibold text-gray-900 mr-2">{order.paymentStatus}</span>
                </div>
                <div>
                  <span className="text-gray-600">طريقة الدفع:</span>
                  <span className="font-semibold text-gray-900 mr-2">
                    {order.paymentMethod === 'CASH' ? 'الدفع عند الاستلام' : order.paymentMethod}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">تاريخ الطلب:</span>
                  <span className="font-semibold text-gray-900 mr-2">
                    {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات العميل</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">الاسم:</span>
                  <span className="font-semibold text-gray-900 mr-2">{order.guestName}</span>
                </div>
                <div>
                  <span className="text-gray-600">الهاتف:</span>
                  <span className="font-semibold text-gray-900 mr-2">{order.guestPhone}</span>
                </div>
                <div>
                  <span className="text-gray-600">المدينة:</span>
                  <span className="font-semibold text-gray-900 mr-2">{order.city}</span>
                </div>
                <div>
                  <span className="text-gray-600">العنوان:</span>
                  <span className="font-semibold text-gray-900 mr-2">{order.shippingAddress}</span>
                </div>
                {order.notes && (
                  <div>
                    <span className="text-gray-600">ملاحظات:</span>
                    <span className="font-semibold text-gray-900 mr-2">{order.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">المنتجات</h2>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-600">الكمية: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{item.total} جنيه</p>
                      <p className="text-sm text-gray-600">{item.price} جنيه × {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">ملخص الطلب</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{order.subtotal} جنيه</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>الشحن:</span>
                  <span className="font-semibold">{order.shipping} جنيه</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>الضرائب:</span>
                    <span className="font-semibold">{order.tax} جنيه</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>الخصم:</span>
                    <span className="font-semibold">-{order.discount} جنيه</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2 flex justify-between text-xl font-bold text-gray-900">
                  <span>الإجمالي:</span>
                  <span>{order.total} جنيه</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">الطلب غير موجود</h3>
            <p className="text-gray-600">
              تأكد من رقم الطلب ورقم الهاتف وحاول مرة أخرى
            </p>
          </div>
        )
      )}
    </div>
    </>
  );
};

export default TrackOrder;


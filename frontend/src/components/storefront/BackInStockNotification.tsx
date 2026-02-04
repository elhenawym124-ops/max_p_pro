import React, { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { backInStockApi } from '../../utils/storefrontApi';

interface BackInStockNotificationProps {
  productId: string;
  enabled: boolean;
  notifyEmail: boolean;
  notifySMS: boolean;
  stock: number;
}

const BackInStockNotification: React.FC<BackInStockNotificationProps> = ({
  productId,
  enabled,
  notifyEmail,
  notifySMS,
  stock
}) => {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: ''
  });

  if (!enabled || stock > 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || (!formData.customerEmail && !formData.customerPhone)) {
      toast.error('يرجى إدخال الاسم ووسيلة الاتصال');
      return;
    }

    try {
      setSubmitting(true);
      const data = await backInStockApi.subscribe(productId, {
        customerName: formData.customerName,
        customerEmail: notifyEmail ? formData.customerEmail : undefined,
        customerPhone: notifySMS ? formData.customerPhone : undefined,
        notifyEmail,
        notifySMS
      });

      if (data.success) {
        toast.success('تم تسجيل طلب الإشعار بنجاح');
        setShowForm(false);
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: ''
        });
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error subscribing to back in stock:', error);
      toast.error('حدث خطأ في تسجيل الإشعار');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <BellIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 mb-2">المنتج غير متوفر حالياً</h3>
          <p className="text-sm text-yellow-800 mb-3">
            أبلغني عند عودة المنتج للمخزون
          </p>

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
            >
              إشعارني عند العودة للمخزون
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="الاسم *"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              {notifyEmail && (
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              )}
              {notifySMS && (
                <input
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'جاري التسجيل...' : 'تسجيل'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackInStockNotification;


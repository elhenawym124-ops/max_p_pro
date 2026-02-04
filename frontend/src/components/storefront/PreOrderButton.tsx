import React, { useState } from 'react';
import { ShoppingCartIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';

interface PreOrderButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    isPreOrder: boolean;
    preOrderDate?: string;
    preOrderMessage?: string;
    enableCheckoutForm?: boolean;
  };
  quantity?: number;
  selectedVariant?: string | null;
}

const PreOrderButton: React.FC<PreOrderButtonProps> = ({
  product,
  quantity = 1,
  selectedVariant
}) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (!product.isPreOrder) return null;

  const handlePreOrder = async () => {
    if (!product.enableCheckoutForm) {
      toast.error('هذا المنتج لا يدعم الطلب المباشر');
      return;
    }

    try {
      setSubmitting(true);

      // إضافة المنتج للسلة (أو معالجة الطلب المسبق)
      const companyId = getCompanyId();
      if (!companyId) {
        toast.error('خطأ في تحديد المتجر');
        return;
      }

      // يمكن إضافة منطق خاص للطلب المسبق هنا
      // حالياً نستخدم نفس منطق إضافة للسلة
      await storefrontApi.addToCart({
        productId: product.id,
        quantity,
        variantId: selectedVariant || undefined
      });

      toast.success('تم إضافة الطلب المسبق للسلة بنجاح');
      
      // الانتقال لصفحة السلة أو Checkout
      navigate('/shop/cart');
    } catch (error: any) {
      console.error('Error adding pre-order to cart:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ في إضافة الطلب المسبق');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const preOrderDate = formatDate(product.preOrderDate);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <CalendarIcon className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-lg text-purple-900 mb-2">
            📦 متوفر للطلب المسبق
          </h3>
          {preOrderDate && (
            <p className="text-sm text-purple-700 mb-2">
              📅 تاريخ التوفر المتوقع: <span className="font-semibold">{preOrderDate}</span>
            </p>
          )}
          {product.preOrderMessage && (
            <p className="text-sm text-purple-600 mb-3">
              {product.preOrderMessage}
            </p>
          )}
          <div className="bg-white rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-600 mb-1">
              💰 السعر: <span className="font-bold text-lg text-purple-900">{product.price} جنيه</span>
            </p>
            <p className="text-xs text-gray-500">
              * يمكنك الدفع الآن أو عند الاستلام
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handlePreOrder}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingCartIcon className="h-6 w-6" />
        <span>{submitting ? 'جاري المعالجة...' : 'طلب مسبق الآن'}</span>
      </button>

      <p className="text-xs text-center text-purple-600 mt-2">
        ✅ سيتم إشعارك عند توفر المنتج
      </p>
    </div>
  );
};

export default PreOrderButton;


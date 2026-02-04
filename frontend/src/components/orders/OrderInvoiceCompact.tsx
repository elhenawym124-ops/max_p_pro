import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  totalAmount: number;
  currency: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  city: string | null;
  companyName: string;
  companyPhone: string | null;
  companyLogo: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  notes: string | null;
  order: {
    orderNumber: string;
    orderItems: Array<{
      productName: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  };
}

const OrderInvoiceCompact: React.FC = () => {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (shouldPrint && invoice && !loading) {
      setTimeout(() => window.print(), 800);
    }
  }, [invoice, loading, searchParams]);

  const fetchInvoice = async () => {
    try {
      const response = await apiClient.get(`/order-invoices/${invoiceId}`);
      setInvoice(response.data.data);
      setLoading(false);
    } catch (err: any) {
      setError('خطأ في جلب الفاتورة');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getPaymentStatusText = (status: string) => {
    const statusMap: any = {
      'PAID': 'مدفوعة',
      'PENDING': 'قيد الانتظار',
      'CANCELLED': 'ملغاة',
      'REFUNDED': 'مستردة',
      'PARTIALLY_PAID': 'مدفوعة جزئياً'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || 'الفاتورة غير موجودة'}</p>
      </div>
    );
  }

  return (
    <div className="invoice-container">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .invoice-page {
            padding: 15mm !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
        }
        
        @media screen {
          .invoice-container {
            background: #f3f4f6;
            min-height: 100vh;
            padding: 20px;
          }
          
          .invoice-page {
            background: white;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      {/* زر الطباعة */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          طباعة الفاتورة
        </button>
      </div>

      <div className="invoice-page" dir="rtl">
        {/* Header - بسيط جداً */}
        <div className="text-right mb-4 text-xs text-gray-500">
          <p>منصة إدارة التواصل والمبيعات الإلكترونية</p>
        </div>

        <div className="flex justify-between items-start mb-6">
          <div className="text-right">
            <p className="text-sm mb-1"><span className="font-bold">فاتورة: </span>{invoice.invoiceNumber}</p>
            <p className="text-sm mb-1"><span className="font-bold">طلب: </span>{invoice.order.orderNumber}</p>
            <p className="text-sm">{new Date(invoice.issueDate).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold mb-1">{invoice.companyName}</h1>
            <p className="text-sm">{invoice.customerPhone || ''}</p>
          </div>
        </div>

        {/* معلومات العميل */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-2 border-b pb-1">معلومات العميل</h3>
          <p className="text-sm mb-1">{invoice.customerName}</p>
          <p className="text-sm mb-1">هاتف: {invoice.customerPhone}</p>
          <p className="text-sm mb-1">العنوان: {invoice.customerAddress || ''}</p>
          <p className="text-sm">المدينة: {invoice.city || ''}</p>
        </div>

        {/* جدول المنتجات - بسيط */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-right py-2 font-bold">المنتج</th>
              <th className="text-center py-2 font-bold">الكمية</th>
              <th className="text-right py-2 font-bold">السعر</th>
              <th className="text-right py-2 font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.order.orderItems.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="text-right py-2">{item.productName}</td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">{formatCurrency(item.price, invoice.currency)}</td>
                <td className="text-right py-2">{formatCurrency(item.total, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* المجاميع - بسيطة */}
        <div className="text-right mb-6 text-sm space-y-1">
          <p>المجموع الفرعي: <span className="font-bold">{formatCurrency(invoice.subtotal, invoice.currency)}</span></p>
          {invoice.shipping > 0 && (
            <p>الشحن: <span className="font-bold">{formatCurrency(invoice.shipping, invoice.currency)}</span></p>
          )}
          <p className="text-base pt-2 border-t border-gray-800">
            <span className="font-bold">الإجمالي: </span>
            <span className="font-bold text-lg">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
          </p>
        </div>

        {/* حالة الدفع */}
        <div className="mb-6 text-sm space-y-1">
          <p className="text-right">حالة الدفع: <span className="font-bold">{getPaymentStatusText(invoice.paymentStatus)}</span></p>
          {invoice.paymentMethod && (
            <p className="text-right">طريقة الدفع: <span className="font-bold">{invoice.paymentMethod}</span></p>
          )}
        </div>

        {/* ملاحظات */}
        {invoice.notes && (
          <div className="mb-4 text-sm">
            <p className="font-bold mb-1">ملاحظات:</p>
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderInvoiceCompact;

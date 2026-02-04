import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  governorrate: string | null;
  companyName: string;
  companyPhone: string | null;
  companyEmail: string | null;
  companyAddress: string | null;
  companyLogo: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  notes: string | null;
  terms: string | null;
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

const PrintMultipleInvoices: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (invoices.length > 0 && !loading) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [invoices, loading]);

  const fetchInvoices = async () => {
    try {
      const ids = searchParams.get('ids');
      if (!ids) {
        setError('لم يتم تحديد فواتير');
        setLoading(false);
        return;
      }

      const invoiceIds = ids.split(',');
      const fetchedInvoices: Invoice[] = [];

      for (const id of invoiceIds) {
        try {
          const response = await apiClient.get(`/order-invoices/${id}`);
          if (response.data.success) {
            fetchedInvoices.push(response.data.data);
          }
        } catch (err) {
          console.error(`Error fetching invoice ${id}:`, err);
        }
      }

      setInvoices(fetchedInvoices);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError('خطأ في جلب الفواتير');
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الفواتير...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-container">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .invoice-page {
            page-break-after: always;
            page-break-inside: avoid;
            padding: 15mm !important;
          }
          
          .invoice-page:last-child {
            page-break-after: auto;
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
          .print-container {
            background: #f3f4f6;
            padding: 20px;
          }
          
          .invoice-page {
            background: white;
            max-width: 210mm;
            margin: 0 auto 20px;
            padding: 20mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      {/* زر الطباعة للشاشة فقط */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          طباعة جميع الفواتير ({invoices.length})
        </button>
      </div>

      {invoices.map((invoice) => (
        <div key={invoice.id} className="invoice-page" dir="rtl">
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
      ))}
    </div>
  );
};

export default PrintMultipleInvoices;

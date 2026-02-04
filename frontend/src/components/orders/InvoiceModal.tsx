import React from 'react';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
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

  const handlePrint = () => {
    window.print();
  };

  // دالة لتحويل العنوان من JSON إلى نص مقروء
  const formatAddress = (address: any) => {
    if (!address) return '';
    
    // إذا كان string، حاول parse
    if (typeof address === 'string') {
      // إذا كان يبدأ بـ { يعني JSON
      if (address.startsWith('{')) {
        try {
          const parsed = JSON.parse(address);
          return formatAddress(parsed); // استدعاء نفس الدالة بعد الـ parse
        } catch (e) {
          return address; // إذا فشل الـ parse، أرجع النص كما هو
        }
      }
      return address;
    }
    
    // إذا كان object، استخرج البيانات
    if (typeof address === 'object') {
      const parts = [];
      if (address.address) parts.push(address.address);
      if (address.area) parts.push(address.area);
      if (address.city) parts.push(address.city);
      if (address.governorate) parts.push(address.governorate);
      if (address.country) parts.push(address.country);
      
      return parts.filter(Boolean).join(', ') || '';
    }
    
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none" 
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header - للشاشة فقط */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold text-gray-800">فاتورة #{invoice.invoiceNumber}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PrinterIcon className="w-5 h-5" />
              طباعة
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* محتوى الفاتورة */}
        <div className="p-6 print:p-8">
          {/* Header الفاتورة */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2">
            <div>
              {invoice.companyLogo && (
                <img src={invoice.companyLogo} alt="Logo" className="h-12 mb-2" />
              )}
              <h1 className="text-xl font-bold">{invoice.companyName}</h1>
              {invoice.companyPhone && <p className="text-sm text-gray-600">{invoice.companyPhone}</p>}
              {invoice.companyAddress && <p className="text-sm text-gray-600">{invoice.companyAddress}</p>}
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-blue-600 mb-2">فاتورة</div>
              <p className="text-sm"><span className="font-semibold">رقم:</span> {invoice.invoiceNumber}</p>
              <p className="text-sm"><span className="font-semibold">طلب:</span> {invoice.order?.orderNumber}</p>
              <p className="text-sm"><span className="font-semibold">التاريخ:</span> {new Date(invoice.issueDate).toLocaleDateString('ar-EG')}</p>
            </div>
          </div>

          {/* معلومات العميل */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-gray-800 mb-2">معلومات العميل</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-semibold">الاسم:</span> {invoice.customerName}</div>
              {invoice.customerPhone && (
                <div><span className="font-semibold">الهاتف:</span> {invoice.customerPhone}</div>
              )}
              {invoice.customerAddress && (
                <div className="col-span-2"><span className="font-semibold">العنوان:</span> {invoice.customerAddress}</div>
              )}
              {invoice.city && (
                <div><span className="font-semibold">المدينة:</span> {invoice.city}</div>
              )}
            </div>
          </div>

          {/* جدول المنتجات */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-right py-2 font-bold">المنتج</th>
                  <th className="text-center py-2 font-bold w-20">الكمية</th>
                  <th className="text-right py-2 font-bold w-24">السعر</th>
                  <th className="text-right py-2 font-bold w-28">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order?.orderItems?.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="text-right py-3">
                      <div className="font-medium">{item.productName}</div>
                      {(item.productColor || item.productSize) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.productColor && <span>اللون: {item.productColor}</span>}
                          {item.productColor && item.productSize && <span> | </span>}
                          {item.productSize && <span>المقاس: {item.productSize}</span>}
                        </div>
                      )}
                    </td>
                    <td className="text-center py-3">{item.quantity}</td>
                    <td className="text-right py-3">{formatCurrency(item.price, invoice.currency)}</td>
                    <td className="text-right py-3 font-semibold">{formatCurrency(item.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* المجاميع */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="font-semibold">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.shipping > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">الشحن:</span>
                  <span className="font-semibold">{formatCurrency(invoice.shipping, invoice.currency)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">الضريبة:</span>
                  <span className="font-semibold">{formatCurrency(invoice.tax, invoice.currency)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">الخصم:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(invoice.discount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 bg-blue-600 text-white px-4 rounded-lg font-bold text-base">
                <span>الإجمالي:</span>
                <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* حالة الدفع */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold">حالة الدفع: </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  invoice.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                  invoice.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {getPaymentStatusText(invoice.paymentStatus)}
                </span>
              </div>
              {invoice.paymentMethod && (
                <div>
                  <span className="font-semibold">طريقة الدفع: </span>
                  <span>{invoice.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>

          {/* ملاحظات */}
          {invoice.notes && (
            <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded text-sm">
              <p className="font-semibold mb-1">ملاحظات:</p>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-center text-gray-500 text-xs">
            <p>شكراً لتعاملكم معنا</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:max-w-none, .print\\:max-w-none * {
            visibility: visible;
          }
          .print\\:max-w-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;

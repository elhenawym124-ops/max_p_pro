import React from 'react';

interface WaybillData {
  orderNumber: string;
  turboOrderCode?: string;
  orderDate: string;
  receiverName: string;
  receiverPhone: string;
  receiverPhone2?: string;
  receiverAddress: string;
  receiverCity: string;
  receiverState: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  totalValue: number;
  shippingCost: number;
  amountToCollect: number;
  notes?: string;
}

interface WaybillGeneratorProps {
  data: WaybillData;
}

/**
 * مولد البوليصة المحلي - يعمل بدون الحاجة للـ Backend
 * يمكن استخدامه لطباعة البوليصة مباشرة من الـ Frontend
 */
export const WaybillGenerator: React.FC<WaybillGeneratorProps> = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="waybill-container" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .waybill-container, .waybill-container * {
            visibility: visible;
          }
          .waybill-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-btn {
            display: none !important;
          }
        }

        .waybill-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .waybill-header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .waybill-header h1 {
          color: #2563eb;
          font-size: 28px;
          margin-bottom: 10px;
        }

        .order-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 30px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 6px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-weight: bold;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .info-value {
          color: #1e293b;
          font-size: 16px;
        }

        .section {
          margin-bottom: 25px;
        }

        .section-title {
          background: #2563eb;
          color: white;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 16px;
        }

        .customer-details {
          padding: 15px;
          background: #f8fafc;
          border-radius: 6px;
          border-right: 4px solid #2563eb;
        }

        .detail-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: bold;
          color: #64748b;
          min-width: 120px;
        }

        .detail-value {
          color: #1e293b;
          flex: 1;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .items-table th {
          background: #f1f5f9;
          padding: 12px;
          text-align: right;
          border: 1px solid #e2e8f0;
          font-weight: bold;
          color: #475569;
        }

        .items-table td {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          text-align: right;
        }

        .items-table tr:hover {
          background: #f8fafc;
        }

        .totals {
          margin-top: 20px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 6px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .total-row.final {
          border-top: 2px solid #2563eb;
          border-bottom: none;
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
          margin-top: 10px;
          padding-top: 15px;
        }

        .notes {
          margin-top: 20px;
          padding: 15px;
          background: #fef3c7;
          border-right: 4px solid #f59e0b;
          border-radius: 4px;
        }

        .print-btn {
          display: block;
          width: 200px;
          margin: 30px auto 0;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .print-btn:hover {
          background: #1d4ed8;
        }
      `}</style>

      <div className="waybill-header">
        <h1>🚚 بوليصة شحن</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Turbo Shipping Waybill</p>
      </div>

      <div className="order-info">
        <div className="info-item">
          <span className="info-label">رقم الطلب</span>
          <span className="info-value">{data.orderNumber || 'غير محدد'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">كود الشحنة</span>
          <span className="info-value">{data.turboOrderCode || 'غير محدد'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">تاريخ الطلب</span>
          <span className="info-value">
            {data.orderDate ? new Date(data.orderDate).toLocaleDateString('ar-EG') : 'غير محدد'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">عدد المنتجات</span>
          <span className="info-value">{data.items.length} منتج</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title">📍 بيانات المستلم</div>
        <div className="customer-details">
          <div className="detail-row">
            <span className="detail-label">الاسم:</span>
            <span className="detail-value">{data.receiverName || 'غير محدد'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">الهاتف:</span>
            <span className="detail-value">{data.receiverPhone || 'غير محدد'}</span>
          </div>
          {data.receiverPhone2 && (
            <div className="detail-row">
              <span className="detail-label">هاتف بديل:</span>
              <span className="detail-value">{data.receiverPhone2}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">العنوان:</span>
            <span className="detail-value">{data.receiverAddress || 'غير محدد'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">المدينة:</span>
            <span className="detail-value">{data.receiverCity || 'غير محدد'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">المحافظة:</span>
            <span className="detail-value">{data.receiverState || 'غير محدد'}</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">📦 تفاصيل الشحنة</div>
        <table className="items-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th style={{ width: '80px' }}>الكمية</th>
              <th style={{ width: '100px' }}>السعر</th>
              <th style={{ width: '100px' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name || 'منتج'}</td>
                <td>{item.quantity || 0}</td>
                <td>{(item.price || 0).toFixed(2)} ج.م</td>
                <td>{(item.total || 0).toFixed(2)} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div className="total-row">
            <span>قيمة المنتجات:</span>
            <span>{(data.totalValue || 0).toFixed(2)} ج.م</span>
          </div>
          <div className="total-row">
            <span>تكلفة الشحن:</span>
            <span>{(data.shippingCost || 0).toFixed(2)} ج.م</span>
          </div>
          <div className="total-row final">
            <span>المبلغ المستحق:</span>
            <span>{(data.amountToCollect || 0).toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>

      {data.notes && (
        <div className="notes">
          <strong>📝 ملاحظات:</strong>
          <br />
          {data.notes}
        </div>
      )}

      <button className="print-btn" onClick={handlePrint}>
        🖨️ طباعة البوليصة
      </button>
    </div>
  );
};

/**
 * دالة مساعدة لفتح البوليصة في نافذة جديدة
 */
export const openWaybillInNewWindow = (data: WaybillData) => {
  const waybillWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!waybillWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة');
    return;
  }

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بوليصة شحن - ${data.orderNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .waybill {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .order-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 6px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-weight: bold;
            color: #64748b;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #1e293b;
            font-size: 16px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            background: #2563eb;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .customer-details {
            padding: 15px;
            background: #f8fafc;
            border-radius: 6px;
            border-right: 4px solid #2563eb;
        }
        .detail-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-label {
            font-weight: bold;
            color: #64748b;
            min-width: 120px;
        }
        .detail-value {
            color: #1e293b;
            flex: 1;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .items-table th {
            background: #f1f5f9;
            padding: 12px;
            text-align: right;
            border: 1px solid #e2e8f0;
            font-weight: bold;
            color: #475569;
        }
        .items-table td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            text-align: right;
        }
        .items-table tr:hover {
            background: #f8fafc;
        }
        .totals {
            margin-top: 20px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 6px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .total-row.final {
            border-top: 2px solid #2563eb;
            border-bottom: none;
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-top: 10px;
            padding-top: 15px;
        }
        .notes {
            margin-top: 20px;
            padding: 15px;
            background: #fef3c7;
            border-right: 4px solid #f59e0b;
            border-radius: 4px;
        }
        .print-btn {
            display: block;
            width: 200px;
            margin: 30px auto 0;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .print-btn:hover {
            background: #1d4ed8;
        }
        @media print {
            body { background: white; padding: 0; }
            .waybill { box-shadow: none; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <div class="waybill">
        <div class="header">
            <h1>🚚 بوليصة شحن</h1>
            <p style="color: #64748b; margin-top: 5px;">Turbo Shipping Waybill</p>
        </div>

        <div class="order-info">
            <div class="info-item">
                <span class="info-label">رقم الطلب</span>
                <span class="info-value">${data.orderNumber || 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">كود الشحنة</span>
                <span class="info-value">${data.turboOrderCode || 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">تاريخ الطلب</span>
                <span class="info-value">${data.orderDate ? new Date(data.orderDate).toLocaleDateString('ar-EG') : 'غير محدد'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">عدد المنتجات</span>
                <span class="info-value">${data.items.length} منتج</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📍 بيانات المستلم</div>
            <div class="customer-details">
                <div class="detail-row">
                    <span class="detail-label">الاسم:</span>
                    <span class="detail-value">${data.receiverName || 'غير محدد'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">الهاتف:</span>
                    <span class="detail-value">${data.receiverPhone || 'غير محدد'}</span>
                </div>
                ${data.receiverPhone2 ? `
                <div class="detail-row">
                    <span class="detail-label">هاتف بديل:</span>
                    <span class="detail-value">${data.receiverPhone2}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">العنوان:</span>
                    <span class="detail-value">${data.receiverAddress || 'غير محدد'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">المدينة:</span>
                    <span class="detail-value">${data.receiverCity || 'غير محدد'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">المحافظة:</span>
                    <span class="detail-value">${data.receiverState || 'غير محدد'}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📦 تفاصيل الشحنة</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th style="width: 80px;">الكمية</th>
                        <th style="width: 100px;">السعر</th>
                        <th style="width: 100px;">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map(item => `
                    <tr>
                        <td>${item.name || 'منتج'}</td>
                        <td>${item.quantity || 0}</td>
                        <td>${(item.price || 0).toFixed(2)} ج.م</td>
                        <td>${(item.total || 0).toFixed(2)} ج.م</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">
                    <span>قيمة المنتجات:</span>
                    <span>${(data.totalValue || 0).toFixed(2)} ج.م</span>
                </div>
                <div class="total-row">
                    <span>تكلفة الشحن:</span>
                    <span>${(data.shippingCost || 0).toFixed(2)} ج.م</span>
                </div>
                <div class="total-row final">
                    <span>المبلغ المستحق:</span>
                    <span>${(data.amountToCollect || 0).toFixed(2)} ج.م</span>
                </div>
            </div>
        </div>

        ${data.notes ? `
        <div class="notes">
            <strong>📝 ملاحظات:</strong><br>
            ${data.notes}
        </div>
        ` : ''}

        <button class="print-btn" onclick="window.print()">🖨️ طباعة البوليصة</button>
    </div>
</body>
</html>
  `;

  waybillWindow.document.write(html);
  waybillWindow.document.close();
};

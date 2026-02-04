const fs = require('fs');
const path = require('path');

class HtmlPolicyService {
  constructor() {
    this.htmlTemplate = null;
  }

  async generatePolicyHtml(orderData) {
    try {
      const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بوليصة الشحن - ${orderData.orderNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Noto Sans Arabic', Arial, sans-serif;
            direction: rtl;
            text-align: right;
            background: white;
            color: #333;
            line-height: 1.6;
            font-size: 14px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
            margin-bottom: 0;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            background: white;
            border: 2px solid #e1e5e9;
            border-top: none;
            border-radius: 0 0 10px 10px;
            padding: 0;
        }
        
        .section {
            padding: 25px;
            border-bottom: 1px solid #e1e5e9;
        }
        
        .section:last-child {
            border-bottom: none;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3498db;
            display: inline-block;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
        }
        
        .info-item {
            margin-bottom: 12px;
        }
        
        .info-label {
            font-weight: 600;
            color: #34495e;
            display: inline-block;
            min-width: 120px;
        }
        
        .info-value {
            color: #2c3e50;
            font-weight: 500;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .items-table th {
            background: #34495e;
            color: white;
            padding: 15px 12px;
            text-align: center;
            font-weight: 600;
            font-size: 14px;
        }
        
        .items-table td {
            padding: 12px;
            text-align: center;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .items-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .items-table tr:hover {
            background: #e8f4fd;
        }
        
        .totals {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }
        
        .total-row:last-child {
            border-bottom: 2px solid #3498db;
            font-weight: 700;
            font-size: 16px;
            color: #2c3e50;
            margin-top: 10px;
            padding-top: 15px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-pending { background: #fff3cd; color: #856404; }
        .status-processing { background: #cce5ff; color: #004085; }
        .status-completed { background: #d4edda; color: #155724; }
        .status-cancelled { background: #f8d7da; color: #721c24; }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            color: #6c757d;
        }
        
        @media print {
            body { font-size: 12px; }
            .container { max-width: none; margin: 0; padding: 10px; }
            .header { border-radius: 0; }
            .content { border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>بوليصة الشحن</h1>
            <p>وثيقة شحن رسمية</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2 class="section-title">تفاصيل الطلب</h2>
                <div class="info-grid">
                    <div>
                        <div class="info-item">
                            <span class="info-label">رقم الطلب:</span>
                            <span class="info-value">${orderData.orderNumber || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">تاريخ الطلب:</span>
                            <span class="info-value">${this.formatDate(orderData.createdAt)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">حالة الطلب:</span>
                            <span class="status-badge status-${orderData.status || 'pending'}">${this.getStatusText(orderData.status)}</span>
                        </div>
                    </div>
                    <div>
                        <div class="info-item">
                            <span class="info-label">طريقة الدفع:</span>
                            <span class="info-value">${this.getPaymentMethodText(orderData.paymentMethod)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">حالة الدفع:</span>
                            <span class="status-badge status-${orderData.paymentStatus || 'pending'}">${this.getPaymentStatusText(orderData.paymentStatus)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">معلومات العميل</h2>
                <div class="info-grid">
                    <div>
                        <div class="info-item">
                            <span class="info-label">اسم العميل:</span>
                            <span class="info-value">${orderData.customer?.name || orderData.guestInfo?.name || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">الهاتف:</span>
                            <span class="info-value">${orderData.customer?.phone || orderData.guestInfo?.phone || 'غير محدد'}</span>
                        </div>
                    </div>
                    <div>
                        <div class="info-item">
                            <span class="info-label">البريد الإلكتروني:</span>
                            <span class="info-value">${orderData.customer?.email || orderData.guestInfo?.email || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">العنوان:</span>
                            <span class="info-value">${orderData.shippingAddress || 'غير محدد'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">تفاصيل المنتجات</h2>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateItemsRows(orderData.items || [])}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="total-row">
                        <span>المجموع الفرعي:</span>
                        <span>${orderData.subtotal || '0.00'} جنيه</span>
                    </div>
                    <div class="total-row">
                        <span>الشحن:</span>
                        <span>${orderData.shippingCost || '0.00'} جنيه</span>
                    </div>
                    <div class="total-row">
                        <span>الضرائب:</span>
                        <span>${orderData.tax || '0.00'} جنيه</span>
                    </div>
                    <div class="total-row">
                        <span>الإجمالي النهائي:</span>
                        <span>${orderData.total || '0.00'} جنيه</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>تم إنشاء هذه البوليصة تلقائياً في ${new Date().toLocaleDateString('ar-EG')}</p>
            <p>شركة التجارة الإلكترونية - جميع الحقوق محفوظة</p>
        </div>
    </div>
</body>
</html>`;

      return html;
    } catch (error) {
      console.error('Error generating policy HTML:', error);
      throw error;
    }
  }

  generateItemsRows(items) {
    if (!items || items.length === 0) {
      return '<tr><td colspan="4">لا توجد منتجات</td></tr>';
    }

    return items.map(item => `
      <tr>
        <td>${item.productName || item.name || 'منتج غير محدد'}</td>
        <td>${item.quantity || 1}</td>
        <td>${item.price || '0.00'} جنيه</td>
        <td>${(item.quantity * item.price) || '0.00'} جنيه</td>
      </tr>
    `).join('');
  }

  formatDate(dateString) {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'غير محدد';
    }
  }

  getStatusText(status) {
    const statusMap = {
      'pending': 'في الانتظار',
      'processing': 'قيد المعالجة',
      'shipped': 'تم الشحن',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return statusMap[status?.toLowerCase()] || status || 'غير محدد';
  }

  getPaymentMethodText(method) {
    const methodMap = {
      'cash_on_delivery': 'الدفع عند الاستلام',
      'credit_card': 'بطاقة ائتمان',
      'bank_transfer': 'تحويل بنكي',
      'wallet': 'محفظة إلكترونية'
    };
    return methodMap[method?.toLowerCase()] || method || 'غير محدد';
  }

  getPaymentStatusText(status) {
    const statusMap = {
      'pending': 'في الانتظار',
      'completed': 'مكتمل',
      'failed': 'فشل',
      'refunded': 'مسترد'
    };
    return statusMap[status?.toLowerCase()] || status || 'غير محدد';
  }
}

module.exports = HtmlPolicyService;

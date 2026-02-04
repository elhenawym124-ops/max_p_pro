const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { processArabicText, formatArabicText, isArabicText } = require('../utils/arabicTextProcessor');

class PolicyPdfService {
  constructor() {
    this.doc = null;
  }

  async generatePolicyPdf(orderData) {
    try {
      // Create a new PDF document with RTL support
      this.doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      // Set up the document for Arabic text
      this.setupArabicSupport();

      // Generate the policy content
      this.generatePolicyHeader();
      this.generateOrderDetails(orderData);
      this.generateCustomerInfo(orderData);
      this.generateItemsTable(orderData);
      this.generateTotals(orderData);
      this.generateBarcodes(orderData);
      this.generateFooter();

      // Return the PDF buffer
      return new Promise((resolve, reject) => {
        const chunks = [];
        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => resolve(Buffer.concat(chunks)));
        this.doc.on('error', reject);
        this.doc.end();
      });

    } catch (error) {
      console.error('Error generating policy PDF:', error);
      throw error;
    }
  }

  setupArabicSupport() {
    // For Arabic text support, we'll use the default Helvetica font
    // PDFKit with Helvetica can handle Unicode characters including Arabic
    // The key is to not reverse or manipulate the text - let PDFKit handle it
    try {
      this.doc.font('Helvetica');
      console.log('✅ Using Helvetica font for Arabic support');
    } catch (error) {
      console.warn('Font setup error:', error.message);
      this.doc.font('Helvetica'); // Fallback
    }
  }

  generatePolicyHeader() {
    const pageWidth = this.doc.page.width;
    const margin = 50;

    // Header background
    this.doc.rect(margin, 50, pageWidth - (margin * 2), 80)
      .fillAndStroke('#f8f9fa', '#dee2e6');

    // Title
    this.doc.fillColor('#000')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(processArabicText('بوليصة الشحن'), margin + 20, 75, {
        align: 'right',
        width: pageWidth - (margin * 2) - 40
      });

    // Subtitle
    this.doc.fontSize(12)
      .font('Helvetica')
      .text(processArabicText('وثيقة شحن رسمية'), margin + 20, 100, {
        align: 'right',
        width: pageWidth - (margin * 2) - 40
      });

    this.doc.moveDown(2);
  }

  generateOrderDetails(orderData) {
    const pageWidth = this.doc.page.width;
    const margin = 50;
    const currentY = this.doc.y;

    // Order details section
    this.doc.rect(margin, currentY, pageWidth - (margin * 2), 120)
      .stroke('#dee2e6');

    // Right column - Order info
    const rightColX = pageWidth - margin - 200;
    this.doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text(processArabicText('تفاصيل الطلب'), rightColX, currentY + 15);

    this.doc.font('Helvetica')
      .fontSize(10)
      .text(processArabicText(`رقم الطلب: ${orderData.orderNumber || 'غير محدد'}`), rightColX, currentY + 35)
      .text(processArabicText(`تاريخ الطلب: ${this.formatDate(orderData.createdAt)}`), rightColX, currentY + 50)
      .text(processArabicText(`حالة الطلب: ${this.getStatusText(orderData.status)}`), rightColX, currentY + 65)
      .text(processArabicText(`طريقة الدفع: ${this.getPaymentMethodText(orderData.paymentMethod)}`), rightColX, currentY + 80)
      .text(processArabicText(`حالة الدفع: ${this.getPaymentStatusText(orderData.paymentStatus)}`), rightColX, currentY + 95);

    // Left column - Company info
    const leftColX = margin + 20;
    this.doc.fontSize(12)
      .font('Helvetica-Bold')
      .text(processArabicText('معلومات الشركة'), leftColX, currentY + 15);

    this.doc.font('Helvetica')
      .fontSize(10)
      .text(processArabicText('شركة التجارة الإلكترونية'), leftColX, currentY + 35)
      .text(processArabicText('العنوان: القاهرة، مصر'), leftColX, currentY + 50)
      .text(processArabicText('الهاتف: +20 123 456 789'), leftColX, currentY + 65)
      .text(processArabicText('البريد الإلكتروني: info@company.com'), leftColX, currentY + 80);

    this.doc.y = currentY + 130;
  }

  generateCustomerInfo(orderData) {
    const pageWidth = this.doc.page.width;
    const margin = 50;
    const currentY = this.doc.y;

    // Customer info section
    this.doc.rect(margin, currentY, pageWidth - (margin * 2), 100)
      .stroke('#dee2e6');

    // Header
    this.doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('معلومات العميل', pageWidth - margin - 100, currentY + 15, {
        align: 'right'
      });

    // Customer details
    const rightColX = pageWidth - margin - 200;
    this.doc.font('Helvetica')
      .fontSize(10)
      .text(`الاسم: ${orderData.customerName || 'غير محدد'}`, rightColX, currentY + 35)
      .text(`الهاتف: ${orderData.customerPhone || 'غير محدد'}`, rightColX, currentY + 50)
      .text(`البريد الإلكتروني: ${orderData.customerEmail || 'غير محدد'}`, rightColX, currentY + 65);

    // Address
    const leftColX = margin + 20;
    this.doc.text('العنوان:', leftColX, currentY + 35)
      .text(`${orderData.customerAddress || 'غير محدد'}`, leftColX, currentY + 50)
      .text(`المدينة: ${orderData.city || 'غير محدد'}`, leftColX, currentY + 65);

    this.doc.y = currentY + 110;
  }

  generateItemsTable(orderData) {
    const pageWidth = this.doc.page.width;
    const margin = 50;
    const tableWidth = pageWidth - (margin * 2);
    const currentY = this.doc.y;

    // Table header
    this.doc.rect(margin, currentY, tableWidth, 30)
      .fillAndStroke('#f8f9fa', '#dee2e6');

    // Header text
    const colWidths = [80, 200, 60, 80, 80];
    const headers = ['الإجمالي', 'اسم المنتج', 'الكمية', 'السعر', 'الرقم'];
    let currentX = pageWidth - margin;

    this.doc.fillColor('#000')
      .fontSize(10)
      .font('Helvetica-Bold');

    headers.forEach((header, index) => {
      currentX -= colWidths[index];
      this.doc.text(header, currentX, currentY + 10, {
        width: colWidths[index],
        align: 'center'
      });
    });

    // Table rows
    let rowY = currentY + 30;
    const items = orderData.items || [];

    items.forEach((item, index) => {
      // Row background (alternating)
      if (index % 2 === 0) {
        this.doc.rect(margin, rowY, tableWidth, 25)
          .fill('#f9f9f9');
      }

      // Row border
      this.doc.rect(margin, rowY, tableWidth, 25)
        .stroke('#dee2e6');

      // Row data
      currentX = pageWidth - margin;
      const rowData = [
        `${(item.total || 0).toFixed(2)} جنيه`,
        item.name || item.productName || 'منتج غير محدد',
        (item.quantity || 1).toString(),
        `${(item.price || 0).toFixed(2)} جنيه`,
        (index + 1).toString()
      ];

      this.doc.fillColor('#000')
        .fontSize(9)
        .font('Helvetica');

      rowData.forEach((data, colIndex) => {
        currentX -= colWidths[colIndex];
        this.doc.text(data, currentX, rowY + 8, {
          width: colWidths[colIndex],
          align: 'center'
        });
      });

      rowY += 25;
    });

    this.doc.y = rowY + 10;
  }

  generateTotals(orderData) {
    const pageWidth = this.doc.page.width;
    const margin = 50;
    const currentY = this.doc.y;

    // Totals section
    const totalsWidth = 250;
    const totalsX = pageWidth - margin - totalsWidth;

    this.doc.rect(totalsX, currentY, totalsWidth, 80)
      .stroke('#dee2e6');

    // Totals header
    this.doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('الإجماليات', totalsX + 10, currentY + 10, {
        align: 'right',
        width: totalsWidth - 20
      });

    // Totals details
    this.doc.fontSize(10)
      .font('Helvetica')
      .text(`المجموع الفرعي: ${(orderData.subtotal || 0).toFixed(2)} جنيه`, totalsX + 10, currentY + 30, {
        align: 'right',
        width: totalsWidth - 20
      })
      .text(`الشحن: ${(orderData.shipping || 0).toFixed(2)} جنيه`, totalsX + 10, currentY + 45, {
        align: 'right',
        width: totalsWidth - 20
      })
      .text(`الضرائب: ${(orderData.tax || 0).toFixed(2)} جنيه`, totalsX + 10, currentY + 60, {
        align: 'right',
        width: totalsWidth - 20
      });

    // Total line
    this.doc.fontSize(12)
      .font('Helvetica-Bold')
      .text(`الإجمالي النهائي: ${(orderData.total || 0).toFixed(2)} جنيه`, totalsX + 10, currentY + 75, {
        align: 'right',
        width: totalsWidth - 20
      });

    this.doc.y = currentY + 90;
  }

  generateBarcodes(orderData) {
    const pageWidth = this.doc.page.width;
    const margin = 50;
    const currentY = this.doc.y;

    // Barcode section
    this.doc.rect(margin, currentY, pageWidth - (margin * 2), 60)
      .stroke('#dee2e6');

    // Barcode placeholders (since we don't have actual barcode generation)
    const barcodeWidth = 150;
    const barcodeHeight = 30;

    // Order barcode
    const orderBarcodeX = pageWidth - margin - barcodeWidth - 20;
    this.doc.rect(orderBarcodeX, currentY + 15, barcodeWidth, barcodeHeight)
      .stroke('#000');

    this.doc.fontSize(8)
      .font('Helvetica')
      .text(orderData.orderNumber || '123456789', orderBarcodeX, currentY + 50, {
        width: barcodeWidth,
        align: 'center'
      });

    // Tracking barcode
    const trackingBarcodeX = margin + 20;
    this.doc.rect(trackingBarcodeX, currentY + 15, barcodeWidth, barcodeHeight)
      .stroke('#000');

    this.doc.text(orderData.trackingNumber || 'TRK123456789', trackingBarcodeX, currentY + 50, {
      width: barcodeWidth,
      align: 'center'
    });

    // Labels
    this.doc.fontSize(10)
      .font('Helvetica-Bold')
      .text('رقم التتبع', trackingBarcodeX, currentY + 5, {
        width: barcodeWidth,
        align: 'center'
      })
      .text('رقم الطلب', orderBarcodeX, currentY + 5, {
        width: barcodeWidth,
        align: 'center'
      });

    this.doc.y = currentY + 70;
  }

  generateFooter() {
    const pageWidth = this.doc.page.width;
    const pageHeight = this.doc.page.height;
    const margin = 50;

    // Footer
    this.doc.fontSize(8)
      .font('Helvetica')
      .fillColor('#666')
      .text('تم إنشاء هذه البوليصة تلقائياً بواسطة نظام إدارة الطلبات', margin, pageHeight - 80, {
        align: 'center',
        width: pageWidth - (margin * 2)
      })
      .text(`تاريخ الإنشاء: ${this.formatDate(new Date())}`, margin, pageHeight - 65, {
        align: 'center',
        width: pageWidth - (margin * 2)
      });
  }

  formatDate(dateString) {
    if (!dateString) return 'غير محدد';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'تاريخ غير صحيح';
    }
  }

  getStatusText(status) {
    const statusMap = {
      'pending': 'في الانتظار',
      'confirmed': 'مؤكد',
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

module.exports = PolicyPdfService;

const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

class SimpleOrderService {
  constructor() {
    //console.log('🛒 SimpleOrderService initialized');
  }

  getPrisma() {
    return getSharedPrismaClient();
  }

  // إنشاء طلب بسيط من المحادثة
  async createSimpleOrder(data) {
    try {
      const {
        conversationId,
        customerId,
        companyId,
        productName,
        productColor,
        productSize,
        productPrice,
        quantity = 1,
        customerName,
        customerPhone,
        city,
        notes
      } = data;

      //console.log('🛒 Creating simple order:', {
      //   productName,
      //   productColor,
      //   productSize,
      //   productPrice,
      //   customerName,
      //   customerPhone,
      //   city
      // });

      // ✅ Use orderService for sequential ordering if enabled, otherwise use timestamp
      let orderNumber = data.orderNumber;
      if (!orderNumber) {
        // Use shared orderService for numbering
        const orderService = require('./orderService');
        orderNumber = await orderService.generateOrderNumber(companyId);
      }

      // ✅ استخدام القيم الممررة من database order أو حسابها
      const subtotal = data.subtotal || (parseFloat(productPrice) * quantity);
      const shipping = data.shipping || this.calculateShipping(city, subtotal);
      const total = data.total || (subtotal + shipping);

      console.log(`💰 [SIMPLE-ORDER] التكاليف المستخدمة:`, {
        subtotal,
        shipping,
        total,
        source: data.shipping ? 'من database' : 'محسوبة'
      });

      // تحسين اسم العميل
      const displayCustomerName = this.getDisplayCustomerName(customerName, customerId);

      // إنشاء طلب مبسط (بدون foreign keys)
      const orderData = {
        id: orderNumber,
        orderNumber,
        customerName: displayCustomerName,
        customerPhone: customerPhone || '',
        customerEmail: '',
        total: parseFloat(total.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: 0,
        shipping: parseFloat(shipping.toFixed(2)),
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'cash_on_delivery',
        shippingAddress: {
          city: city || 'غير محدد',
          country: 'مصر',
          fullAddress: data.customerAddress || ''
        },
        items: [{
          id: '1',
          productId: 'ai-generated',
          name: productName || 'كوتشي حريمي',
          price: parseFloat(productPrice),
          quantity: quantity,
          total: parseFloat(productPrice) * quantity,
          metadata: {
            color: productColor || 'أبيض',
            size: productSize || '37',
            conversationId,
            source: 'ai_agent',
            confidence: data.confidence || 0.5,
            extractionMethod: 'ai_enhanced'
          }
        }],
        trackingNumber: null,
        notes: this.buildOrderNotes(conversationId, notes, data),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // معلومات إضافية للتتبع
        metadata: {
          conversationId,
          customerId,
          companyId,
          dataQuality: this.assessDataQuality(data),
          extractionTimestamp: new Date().toISOString()
        }
      };

      //console.log('✅ Simple order created:', orderNumber);

      // تسجيل مفصل لجودة البيانات
      this.logDataQualityReport(orderData.metadata.dataQuality, orderNumber);

      return {
        success: true,
        order: orderData
      };

    } catch (error) {
      console.error('❌ Error creating simple order:', error);
      throw error;
    }
  }

  // تحسين عرض اسم العميل
  getDisplayCustomerName(customerName, customerId) {
    // إذا كان لدينا اسم صحيح، استخدمه
    if (customerName && customerName.length > 2 && !/^\d+/.test(customerName)) {
      return customerName.trim();
    }

    // إذا كان customerId يبدو كـ Facebook ID، اجعله أكثر وضوحاً
    if (customerId && /^\d+$/.test(customerId)) {
      return `عميل فيسبوك (${customerId.substring(0, 8)}...)`;
    }

    return 'عميل جديد';
  }

  // بناء ملاحظات الطلب
  buildOrderNotes(conversationId, notes, data) {
    let orderNotes = `طلب تلقائي من المحادثة\nمعرف المحادثة: ${conversationId}\n`;

    if (data.confidence) {
      orderNotes += `مستوى الثقة في البيانات: ${(data.confidence * 100).toFixed(0)}%\n`;
    }

    if (notes) {
      orderNotes += `ملاحظات إضافية: ${notes}\n`;
    }

    if (data.customerAddress) {
      orderNotes += `العنوان المستخرج: ${data.customerAddress}\n`;
    }

    orderNotes += `تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}`;

    return orderNotes;
  }

  // تقييم جودة البيانات المحسن
  assessDataQuality(data) {
    let score = 0;
    let maxScore = 0;
    const issues = [];
    const strengths = [];

    // فحص البيانات الأساسية مع تقييم أكثر تفصيلاً
    const checks = [
      {
        field: 'productName',
        weight: 2,
        value: data.productName,
        validator: (val) => val && val !== 'كوتشي حريمي' && val.length > 5
      },
      {
        field: 'productColor',
        weight: 1,
        value: data.productColor,
        validator: (val) => val && val !== 'أبيض' && val.length > 2
      },
      {
        field: 'productSize',
        weight: 1,
        value: data.productSize,
        validator: (val) => val && val !== '37' && /^\d+$/.test(val)
      },
      {
        field: 'productPrice',
        weight: 2,
        value: data.productPrice,
        validator: (val) => val && val !== 349 && val >= 100 && val <= 2000
      },
      {
        field: 'customerName',
        weight: 3,
        value: data.customerName,
        validator: (val) => val && val.length > 3 && !/^\d+/.test(val)
      },
      {
        field: 'customerPhone',
        weight: 3,
        value: data.customerPhone,
        validator: (val) => val && /^01[0-9]{9}$/.test(val)
      },
      {
        field: 'city',
        weight: 2,
        value: data.city,
        validator: (val) => val && val !== 'غير محدد' && val.length > 2
      }
    ];

    checks.forEach(check => {
      maxScore += check.weight;

      if (check.value && check.value !== 'غير محدد' && check.value !== '') {
        if (check.validator && check.validator(check.value)) {
          score += check.weight;
          strengths.push(`${check.field}: قيمة صحيحة ومحددة`);
        } else {
          score += Math.floor(check.weight / 2); // نصف النقاط للقيم الافتراضية
          issues.push(`${check.field}: قيمة افتراضية أو غير دقيقة`);
        }
      } else {
        issues.push(`${check.field}: قيمة مفقودة`);
      }
    });

    // فحص إضافي للثقة في البيانات
    if (data.confidence) {
      const confidenceBonus = Math.floor(data.confidence * 10);
      score += confidenceBonus;
      maxScore += 10;

      if (data.confidence >= 0.8) {
        strengths.push('مستوى ثقة عالي في الاستخراج');
      } else if (data.confidence < 0.5) {
        issues.push('مستوى ثقة منخفض في الاستخراج');
      }
    }

    // فحص validation results إذا كانت متوفرة
    if (data.validation) {
      if (data.validation.errors && data.validation.errors.length > 0) {
        score = Math.max(0, score - (data.validation.errors.length * 5));
        issues.push(`${data.validation.errors.length} أخطاء في التحقق`);
      }

      if (data.validation.warnings && data.validation.warnings.length > 0) {
        score = Math.max(0, score - (data.validation.warnings.length * 2));
        issues.push(`${data.validation.warnings.length} تحذيرات`);
      }
    }

    const qualityPercentage = Math.min(100, (score / maxScore) * 100);

    let quality = 'منخفضة';
    let recommendation = 'يحتاج مراجعة شاملة';

    if (qualityPercentage >= 85) {
      quality = 'ممتازة';
      recommendation = 'جاهز للمعالجة';
    } else if (qualityPercentage >= 70) {
      quality = 'جيدة';
      recommendation = 'يحتاج مراجعة بسيطة';
    } else if (qualityPercentage >= 50) {
      quality = 'متوسطة';
      recommendation = 'يحتاج تحسين';
    } else {
      quality = 'منخفضة';
      recommendation = 'يحتاج مراجعة شاملة';
    }

    return {
      score: qualityPercentage.toFixed(0),
      level: quality,
      recommendation: recommendation,
      details: {
        totalScore: score,
        maxScore: maxScore,
        issues: issues,
        strengths: strengths,
        checks: checks.map(check => ({
          field: check.field,
          hasValue: !!check.value,
          isValid: check.validator ? check.validator(check.value) : false,
          weight: check.weight,
          value: check.value
        }))
      }
    };
  }

  // تسجيل تقرير جودة البيانات
  logDataQualityReport(dataQuality, orderNumber) {
    //console.log(`\n📊 [DATA-QUALITY-REPORT] تقرير جودة البيانات للطلب: ${orderNumber}`);
    //console.log(`🎯 مستوى الجودة: ${dataQuality.level} (${dataQuality.score}%)`);
    //console.log(`💡 التوصية: ${dataQuality.recommendation}`);

    if (dataQuality.details.strengths.length > 0) {
      //console.log(`✅ نقاط القوة:`);
      dataQuality.details.strengths.forEach(strength => {
        //console.log(`   • ${strength}`);
      });
    }

    if (dataQuality.details.issues.length > 0) {
      //console.log(`⚠️ المشاكل المكتشفة:`);
      dataQuality.details.issues.forEach(issue => {
        //console.log(`   • ${issue}`);
      });
    }

    // تسجيل تفصيلي للحقول
    //console.log(`📋 تفاصيل الحقول:`);
    dataQuality.details.checks.forEach(check => {
      const status = check.isValid ? '✅' : (check.hasValue ? '⚠️' : '❌');
      const value = check.value ? String(check.value).substring(0, 20) : 'فارغ';
      //console.log(`   ${status} ${check.field}: ${value} (وزن: ${check.weight})`);
    });

    //console.log(`📈 النتيجة النهائية: ${dataQuality.details.totalScore}/${dataQuality.details.maxScore}\n`);
  }

  // ⚠️ DEPRECATED: استخدم enhancedOrderService بدلاً من هذا
  // هذه الدالة لم تعد تُستخدم - الشحن يُحسب من قاعدة البيانات في enhancedOrderService
  calculateShipping(city, subtotal) {
    console.log(`⚠️ [SIMPLE-SHIPPING] تحذير: هذه الدالة deprecated - استخدم enhancedOrderService`);
    console.log(`⚠️ [SIMPLE-SHIPPING] المدينة: "${city}" | المبلغ: ${subtotal}`);

    // إرجاع قيمة افتراضية فقط للتوافق
    // الشحن الفعلي يُحسب في enhancedOrderService من قاعدة البيانات
    return 50;
  }

  // إحصائيات جودة البيانات
  async getDataQualityStats() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const ordersDir = path.join(__dirname, '../../data/orders');

      let files = [];
      try {
        files = await fs.readdir(ordersDir);
      } catch {
        return {
          totalOrders: 0,
          qualityLevels: { 'ممتازة': 0, 'جيدة': 0, 'متوسطة': 0, 'منخفضة': 0 },
          averageScore: 0,
          commonIssues: {},
          topStrengths: {},
          lastUpdated: new Date().toISOString()
        };
      }

      const jsonFiles = files.filter(file => file.endsWith('.json'));

      const stats = {
        totalOrders: jsonFiles.length,
        qualityLevels: {
          'ممتازة': 0,
          'جيدة': 0,
          'متوسطة': 0,
          'منخفضة': 0
        },
        averageScore: 0,
        commonIssues: {},
        topStrengths: {},
        lastUpdated: new Date().toISOString()
      };

      let totalScore = 0;

      for (const file of jsonFiles) {
        try {
          const orderPath = path.join(ordersDir, file);
          const orderData = JSON.parse(await fs.readFile(orderPath, 'utf8'));

          if (orderData.metadata && orderData.metadata.dataQuality) {
            const quality = orderData.metadata.dataQuality;

            // إحصاء مستويات الجودة
            if (stats.qualityLevels[quality.level] !== undefined) {
              stats.qualityLevels[quality.level]++;
            }

            // حساب متوسط النقاط
            totalScore += parseFloat(quality.score) || 0;

            // تجميع المشاكل الشائعة
            if (quality.details && quality.details.issues) {
              quality.details.issues.forEach(issue => {
                stats.commonIssues[issue] = (stats.commonIssues[issue] || 0) + 1;
              });
            }

            // تجميع نقاط القوة
            if (quality.details && quality.details.strengths) {
              quality.details.strengths.forEach(strength => {
                stats.topStrengths[strength] = (stats.topStrengths[strength] || 0) + 1;
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ خطأ في قراءة الطلب ${file}:`, error.message);
        }
      }

      // حساب المتوسط
      stats.averageScore = jsonFiles.length > 0 ? (totalScore / jsonFiles.length).toFixed(1) : 0;

      return stats;
    } catch (error) {
      console.error('❌ خطأ في حساب إحصائيات جودة البيانات:', error);
      return null;
    }
  }

  // حفظ الطلب في ملف JSON (للاختبار)
  async saveOrderToFile(order) {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const ordersDir = path.join(__dirname, '../../orders');

      // إنشاء مجلد الطلبات إذا لم يكن موجود
      try {
        await fs.access(ordersDir);
      } catch {
        await fs.mkdir(ordersDir, { recursive: true });
      }

      const orderFile = path.join(ordersDir, `${order.orderNumber}.json`);
      await fs.writeFile(orderFile, JSON.stringify(order, null, 2));

      //console.log('💾 Order saved to file:', orderFile);
      return true;
    } catch (error) {
      console.error('❌ Error saving order to file:', error);
      return false;
    }
  }

  // قراءة جميع الطلبات من الملفات
  async getAllOrdersFromFiles(companyId = null) {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const ordersDir = path.join(__dirname, '../../orders');

      try {
        // ✅ التحقق من وجود المجلد
        await fs.access(ordersDir);

        const files = await fs.readdir(ordersDir);
        const orders = [];
        let skippedCount = 0;

        console.log(`📁 [SIMPLE-ORDERS] Reading orders from: ${ordersDir}`);
        console.log(`📊 [SIMPLE-ORDERS] Total files found: ${files.length}, Filtering by companyId: ${companyId}`);

        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const orderFile = path.join(ordersDir, file);
              const orderData = await fs.readFile(orderFile, 'utf8');
              const order = JSON.parse(orderData);

              // ✅ فلترة حسب companyId إذا تم تمريره
              if (companyId) {
                const orderCompanyId = order.metadata?.companyId || order.companyId;

                // إذا كان الطلب يحتوي على companyId مختلف، تخطيه
                if (orderCompanyId && orderCompanyId !== companyId) {
                  skippedCount++;
                  continue;
                }

                // ✅ إذا كان الطلب لا يحتوي على companyId، نضيفه (للتوافق مع الطلبات القديمة)
                // يمكن تغيير هذا السلوك ليتخطى الطلبات بدون companyId إذا لزم الأمر
              }

              orders.push(order);
            } catch (parseError) {
              console.error(`❌ Error parsing order file ${file}:`, parseError.message);
              continue;
            }
          }
        }

        console.log(`✅ [SIMPLE-ORDERS] Loaded ${orders.length} orders (skipped ${skippedCount})`);

        // ترتيب حسب التاريخ (الأحدث أولاً) مع معالجة أفضل للأخطاء
        orders.sort((a, b) => {
          try {
            const dateA = new Date(a.createdAt || a.metadata?.extractionTimestamp || 0);
            const dateB = new Date(b.createdAt || b.metadata?.extractionTimestamp || 0);
            return dateB.getTime() - dateA.getTime();
          } catch {
            return 0;
          }
        });

        return orders;
      } catch (dirError) {
        console.error('❌ Error accessing orders directory:', dirError.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error reading orders from files:', error);
      return [];
    }
  }

  // البحث عن طلب بالرقم
  async getOrderByNumber(orderNumber) {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const orderFile = path.join(__dirname, '../../orders', `${orderNumber}.json`);

      try {
        const orderData = await fs.readFile(orderFile, 'utf8');
        return JSON.parse(orderData);
      } catch {
        return null;
      }
    } catch (error) {
      console.error('❌ Error reading order:', error);
      return null;
    }
  }

  // تحديث حالة الطلب
  async updateOrderStatus(orderNumber, status, notes = null) {
    try {
      const order = await this.getOrderByNumber(orderNumber);

      if (!order) {
        throw new Error('Order not found');
      }

      order.status = status;
      if (notes) {
        order.notes = `${order.notes}\n\nتحديث: ${notes}`;
      }
      order.updatedAt = new Date().toISOString();

      await this.saveOrderToFile(order);

      //console.log(`✅ Order ${orderNumber} status updated to ${status}`);
      return order;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  // تحديث حالة الدفع
  async updatePaymentStatus(orderNumber, paymentStatus, notes = null) {
    try {
      const order = await this.getOrderByNumber(orderNumber);

      if (!order) {
        throw new Error('Order not found');
      }

      order.paymentStatus = paymentStatus;
      if (notes) {
        order.notes = `${order.notes}\n\nتحديث الدفع: ${notes}`;
      }
      order.updatedAt = new Date().toISOString();

      await this.saveOrderToFile(order);

      //console.log(`✅ Order ${orderNumber} payment status updated to ${paymentStatus}`);
      return order;
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      throw error;
    }
  }

  // إحصائيات بسيطة - قراءة من قاعدة البيانات
  async getSimpleStats(companyId = null, dateFrom = null, dateTo = null) {
    try {
      console.log(`📊 [SIMPLE-STATS] Getting stats for companyId: ${companyId}`, {
        dateFrom,
        dateTo
      });

      if (!companyId) {
        console.warn('⚠️ [SIMPLE-STATS] No companyId provided');
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          statusCounts: {},
          recentOrders: []
        };
      }

      const prisma = this.getPrisma();

      // ✅ بناء where clause مع فلترة التاريخ
      const where = { companyId };

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          // إضافة يوم كامل للتاريخ النهائي (نهاية اليوم)
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = endDate;
        }
      }

      // ✅ قراءة الطلبات من قاعدة البيانات
      const orders = await prisma.order.findMany({
        where,
        select: {
          orderNumber: true,
          total: true,
          status: true,
          customerName: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📊 [SIMPLE-STATS] Found ${orders.length} orders from database for companyId: ${companyId}`);

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => {
        const orderTotal = typeof order.total === 'string' ? parseFloat(order.total) : Number(order.total);
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
      }, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const statusCounts = orders.reduce((counts, order) => {
        const status = order.status?.toLowerCase() || 'pending';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      }, {});

      // الطلبات الأخيرة (10 الأولى)
      const recentOrders = orders.slice(0, 10).map(order => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName || 'عميل غير محدد',
        total: typeof order.total === 'string' ? parseFloat(order.total) : Number(order.total),
        status: order.status?.toLowerCase() || 'pending',
        createdAt: order.createdAt?.toISOString() || new Date().toISOString()
      }));

      const stats = {
        totalOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        statusCounts,
        recentOrders
      };

      console.log(`✅ [SIMPLE-STATS] Stats generated:`, {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        recentOrdersCount: stats.recentOrders.length
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting simple stats:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusCounts: {},
        recentOrders: []
      };
    }
  }
}

module.exports = new SimpleOrderService();

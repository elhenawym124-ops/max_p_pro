/**
 * 🛒 WooCommerce Auto Export Service
 * تصدير الطلبات تلقائياً لـ WooCommerce عند إنشائها
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const axios = require('axios');

class WooCommerceAutoExportService {
  constructor() {
    // لا نستخدم this.prisma مباشرة، سنستخدم getSharedPrismaClient() في كل مرة
    // لضمان الحصول على client متصل
  }

  getPrisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء WooCommerce API Client
   */
  createWooClient(settings) {
    const baseURL = settings.storeUrl.replace(/\/$/, '');
    return {
      post: async (endpoint, data = {}) => {
        const response = await axios.post(`${baseURL}/wp-json/wc/v3${endpoint}`, data, {
          auth: {
            username: settings.consumerKey,
            password: settings.consumerSecret
          },
          timeout: 30000
        });
        return response.data;
      }
    };
  }

  /**
   * تحويل حالة النظام لحالة WooCommerce
   */
  mapLocalStatusToWoo(status, statusMapping = null) {
    // محاولة استخدام المابينج المخصص أولاً
    if (statusMapping) {
      let mapping = statusMapping;
      if (typeof statusMapping === 'string') {
        try {
          mapping = JSON.parse(statusMapping);
        } catch (e) {
          // ignore error
        }
      }

      // البحث العكسي في المابينج (local -> woo)
      const wooStatus = Object.keys(mapping).find(key => mapping[key] === status);
      if (wooStatus) {
        return wooStatus;
      }
    }

    const statusMap = {
      'PENDING': 'pending',
      'PROCESSING': 'processing',
      'SHIPPED': 'on-hold',
      'DELIVERED': 'completed',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'refunded'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * تصدير طلب واحد لـ WooCommerce
   */
  async exportOrderToWooCommerce(orderId) {
    try {
      console.log(`\n🔄 [WOOCOMMERCE-AUTO-EXPORT] بدء تصدير الطلب: ${orderId}`);

      // استخدام getPrisma() للحصول على client متصل
      const prisma = this.getPrisma();

      // جلب الطلب مع التفاصيل
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true,
              variant: true
            }
          },
          company: true,
          customer: true
        }
      });

      if (!order) {
        console.log(`❌ [WOOCOMMERCE-AUTO-EXPORT] Order not found: ${orderId}`);
        return { success: false, message: 'Order not found' };
      }

      console.log(`✅ [WOOCOMMERCE-AUTO-EXPORT] Order found: ${order.orderNumber}`, {
        itemsCount: order.orderItems?.length || 0,
        companyId: order.companyId,
        status: order.status
      });

      // تجاهل الطلبات المستوردة من WooCommerce
      if (order.syncedFromWoo) {
        console.log(`⏭️ [WOOCOMMERCE-AUTO-EXPORT] Skipping imported order: ${order.orderNumber}`);
        return { success: false, message: 'Order was imported from WooCommerce' };
      }

      // تجاهل الطلبات المصدرة مسبقاً
      if (order.syncedToWoo) {
        console.log(`⏭️ [WOOCOMMERCE-AUTO-EXPORT] Order already exported: ${order.orderNumber}`);
        return { success: false, message: 'Order already exported' };
      }

      // جلب إعدادات WooCommerce
      const settings = await prisma.wooCommerceSettings.findUnique({
        where: { companyId: order.companyId }
      });

      if (!settings || !settings.syncEnabled) {
        console.log(`⏭️ [WOOCOMMERCE-AUTO-EXPORT] Auto export disabled for company: ${order.companyId}`);
        return { success: false, message: 'Auto export disabled' };
      }

      // التحقق من اتجاه المزامنة
      if (settings.syncDirection === 'import_only') {
        console.log(`⏭️ [WOOCOMMERCE-AUTO-EXPORT] Export disabled (import_only mode)`);
        return { success: false, message: 'Export disabled' };
      }

      console.log(`📤 [WOOCOMMERCE-AUTO-EXPORT] Exporting order: ${order.orderNumber}`, {
        storeUrl: settings.storeUrl,
        itemsCount: order.orderItems?.length || 0
      });

      const wooClient = this.createWooClient(settings);

      // تحضير بيانات billing
      const billingFirstName = order.customerName?.split(' ')[0] || '';
      const billingLastName = order.customerName?.split(' ').slice(1).join(' ') || '';

      // تحضير بيانات shipping - يجب أن تكون بنية WooCommerce الصحيحة
      let shippingData = {};
      if (order.shippingAddress) {
        try {
          const shippingRaw = typeof order.shippingAddress === 'string'
            ? JSON.parse(order.shippingAddress)
            : order.shippingAddress;

          // تحويل البنية إلى بنية WooCommerce الصحيحة
          shippingData = {
            first_name: shippingRaw.first_name || shippingRaw.firstName || billingFirstName || '',
            last_name: shippingRaw.last_name || shippingRaw.lastName || billingLastName || '',
            address_1: shippingRaw.address_1 || shippingRaw.address || shippingRaw.address1 || order.customerAddress || '',
            address_2: shippingRaw.address_2 || shippingRaw.address2 || '',
            city: shippingRaw.city || order.city || '',
            state: shippingRaw.state || shippingRaw.province || '',
            postcode: shippingRaw.postcode || shippingRaw.postalCode || shippingRaw.zip || '',
            country: shippingRaw.country || shippingRaw.countryCode || 'EG' // افتراضي مصر
          };
        } catch (parseError) {
          console.log(`⚠️ [WOOCOMMERCE-EXPORT] خطأ في تحليل shippingAddress، سيتم استخدام بيانات billing`);
          // إذا فشل التحليل، نستخدم نفس بيانات billing
          shippingData = {
            first_name: billingFirstName,
            last_name: billingLastName,
            address_1: order.customerAddress || '',
            city: order.city || '',
            country: 'EG'
          };
        }
      } else {
        // إذا لم يكن هناك shipping address، نستخدم نفس بيانات billing
        shippingData = {
          first_name: billingFirstName,
          last_name: billingLastName,
          address_1: order.customerAddress || '',
          city: order.city || '',
          country: 'EG'
        };
      }

      // ✅ تحضير بيانات الشحن الكاملة مع استخراج المحافظة
      const governorate = order.governorate || shippingData.state || order.city || '';

      const fullShippingData = {
        first_name: billingFirstName,
        last_name: billingLastName,
        address_1: order.customerAddress || shippingData.address_1 || '',
        address_2: shippingData.address_2 || '',
        city: order.city || shippingData.city || '',
        state: governorate, // ✅ المحافظة (من governorate أو state أو city كـ fallback)
        postcode: shippingData.postcode || '',
        country: 'EG'
      };

      // تحضير بيانات الطلب
      const wooOrderData = {
        status: this.mapLocalStatusToWoo(order.status, settings.statusMapping),
        billing: {
          first_name: billingFirstName,
          last_name: billingLastName,
          email: order.customerEmail || '',
          phone: order.customerPhone || '',
          address_1: order.customerAddress || '',
          address_2: '',
          city: order.city || '',
          state: order.governorate || '', // ✅ المحافظة
          postcode: '',
          country: 'EG'
        },
        shipping: fullShippingData,
        line_items: order.orderItems.map(item => {
          // ✨ دمج تفاصيل المنتج في سطر واحد (اسم + لون + مقاس + تفاصيل)
          let productName = item.productName || item.product?.name || 'منتج';
          const details = [];

          console.log(`🔍 [AUTO-EXPORT-DEBUG] Item: ${productName}`);
          console.log(`   Color: ${item.productColor}, Size: ${item.productSize}, Details: ${item.productDetails}`);

          // إضافة التفريعات بالترتيب
          if (item.productColor) {
            details.push(item.productColor);
            console.log(`   ✅ Added color: ${item.productColor}`);
          }
          if (item.productSize) {
            details.push(item.productSize);
            console.log(`   ✅ Added size: ${item.productSize}`);
          }
          if (item.productDetails) {
            details.push(item.productDetails);
            console.log(`   ✅ Added details: ${item.productDetails}`);
          }

          // ✨ إذا لم نجد تفريعات، حاول استخراجها من اسم المنتج
          if (details.length === 0 && productName) {
            console.log(`   🔍 Attempting to extract from product name: ${productName}`);

            // استخراج المقاس (نمط مثل 96/11 أو 42 أو 40-42)
            const sizeMatch = productName.match(/(\d+\/\d+|\d+\-\d+|\b\d{2,3}\b)/);
            if (sizeMatch) {
              details.push(sizeMatch[0]);
              console.log(`   ✅ Extracted size from name: ${sizeMatch[0]}`);
            }

            // استخراج اللون (كلمات شائعة للألوان)
            const colorPatterns = [
              'أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'أصفر', 'بني', 'رمادي', 'وردي', 'بنفسجي',
              'black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'gray', 'grey', 'pink', 'purple',
              'بيج', 'كحلي', 'سماوي', 'برتقالي', 'فضي', 'ذهبي', 'نيلي'
            ];

            for (const color of colorPatterns) {
              if (productName.toLowerCase().includes(color.toLowerCase())) {
                details.push(color);
                console.log(`   ✅ Extracted color from name: ${color}`);
                break;
              }
            }
          }

          // دمج التفريعات في الاسم
          if (details.length > 0) {
            productName = `${productName} - ${details.join(' - ')}`;
            console.log(`   ✅ Final name: ${productName}`);
          }

          // ✨ محاولة الحصول على WooCommerce Product ID
          const wooProductId = item.product?.wooCommerceId
            ? parseInt(item.product.wooCommerceId)
            : undefined;

          // ✨ محاولة الحصول على WooCommerce Variation ID (للربط الصحيح مع المخزون)
          const wooVariationId = item.variant?.wooCommerceVariationId
            ? parseInt(item.variant.wooCommerceVariationId)
            : undefined;

          // تحضير بيانات المنتج - بدون meta_data زائدة
          const lineItem = {
            name: productName, // ✅ الاسم يحتوي على كل التفاصيل (اسم + لون + مقاس)
            product_id: wooProductId, // ✅ إضافة Product ID لتأثير على المخزون
            variation_id: wooVariationId, // ✅ إضافة Variation ID لتأثير على مخزون المتغير المحدد
            quantity: item.quantity,
            price: parseFloat(item.price || item.total / (item.quantity || 1) || 0)
            // ✅ تم إزالة meta_data - كل التفاصيل موجودة في الاسم
          };


          // إضافة SKU فقط إذا كان موجوداً (WooCommerce لا يقبل null)
          const sku = item.productSku || item.product?.sku;
          console.log(`🔍 [WOOCOMMERCE-EXPORT] Item SKU check:`, {
            productName: item.productName,
            productSku: item.productSku,
            productSkuType: typeof item.productSku,
            productObjectSku: item.product?.sku,
            productObjectSkuType: typeof item.product?.sku,
            finalSku: sku,
            finalSkuType: typeof sku
          });

          if (sku && typeof sku === 'string') {
            lineItem.sku = sku;
          } else if (sku) {
            // Convert to string if it's not null/undefined but also not a string
            lineItem.sku = String(sku);
            console.log(`⚠️ [WOOCOMMERCE-EXPORT] Converted SKU to string: ${sku} -> ${String(sku)}`);
          }


          // إضافة صورة المنتج إذا كانت متوفرة
          // ✅ أولوية للصورة المحفوظة في OrderItem
          if (item.productImage) {
            lineItem.image = { src: item.productImage };
          } else if (item.product?.images) {
            try {
              const images = typeof item.product.images === 'string'
                ? JSON.parse(item.product.images)
                : item.product.images;

              if (Array.isArray(images) && images.length > 0) {
                lineItem.image = { src: images[0] };
              }
            } catch (e) {
              console.log('⚠️ [WOOCOMMERCE-EXPORT] Error parsing product images');
            }
          }

          return lineItem;
        }),
        customer_note: order.notes || '',
        meta_data: [
          { key: '_local_order_id', value: order.id },
          { key: '_local_order_number', value: order.orderNumber },
          { key: '_synced_from_local', value: 'true' }
        ]
      };

      console.log(`📤 [WOOCOMMERCE-AUTO-EXPORT] Sending order data to WooCommerce...`);

      // إنشاء الطلب في WooCommerce
      const createdOrder = await wooClient.post('/orders', wooOrderData);

      console.log(`✅ [WOOCOMMERCE-AUTO-EXPORT] Order created in WooCommerce:`, {
        wooOrderId: createdOrder.id,
        orderKey: createdOrder.order_key,
        status: createdOrder.status
      });

      // تحديث الطلب المحلي
      await prisma.order.update({
        where: { id: order.id },
        data: {
          wooCommerceId: String(createdOrder.id),
          wooCommerceOrderKey: createdOrder.order_key,
          wooCommerceStatus: createdOrder.status,
          wooCommerceUrl: `${settings.storeUrl}/wp-admin/post.php?post=${createdOrder.id}&action=edit`,
          syncedToWoo: true,
          lastSyncAt: new Date()
        }
      });

      console.log(`✅ [WOOCOMMERCE-AUTO-EXPORT] Local order updated with WooCommerce data`);

      // تسجيل المزامنة
      await prisma.wooCommerceSyncLog.create({
        data: {
          companyId: order.companyId,
          syncType: 'export_order',
          syncDirection: 'to_woo',
          status: 'success',
          totalItems: 1,
          successCount: 1,
          triggeredBy: 'auto_export',
          completedAt: new Date(),
          metadata: JSON.stringify({
            localOrderId: order.id,
            localOrderNumber: order.orderNumber,
            wooOrderId: createdOrder.id
          })
        }
      });

      console.log(`✅ [WOOCOMMERCE-EXPORT] Order exported successfully: ${order.orderNumber} → WooCommerce #${createdOrder.id}`);

      return {
        success: true,
        wooOrderId: createdOrder.id,
        message: 'Order exported successfully'
      };

    } catch (error) {
      console.error(`❌ [WOOCOMMERCE-EXPORT] Error exporting order ${orderId}:`, error.message);

      // تسجيل الخطأ
      try {
        const prisma = this.getPrisma();
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { companyId: true, orderNumber: true }
        });

        if (order) {
          await prisma.wooCommerceSyncLog.create({
            data: {
              companyId: order.companyId,
              syncType: 'export_order',
              syncDirection: 'to_woo',
              status: 'failed',
              totalItems: 1,
              failedCount: 1,
              triggeredBy: 'auto_export',
              errorMessage: error.message,
              completedAt: new Date()
            }
          });
        }
      } catch (logError) {
        console.error('❌ [WOOCOMMERCE-EXPORT] Error logging failure:', logError.message);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تصدير طلب بشكل غير متزامن (non-blocking)
   */
  exportOrderAsync(orderId) {
    // تشغيل التصدير في الخلفية بدون انتظار
    // استخدام setTimeout مع delay صغير لضمان أن Prisma client متصل
    setTimeout(async () => {
      try {
        // التأكد من أن Prisma client متصل قبل التصدير
        const prisma = this.getPrisma();

        // محاولة query بسيطة للتحقق من الاتصال
        try {
          await prisma.$queryRaw`SELECT 1`;
          console.log(`✅ [WOOCOMMERCE-EXPORT] Prisma connection verified`);
        } catch (connectionError) {
          console.log(`⏳ [WOOCOMMERCE-EXPORT] Waiting for Prisma connection...`);
          // انتظار إضافي إذا لم يكن متصل
          await new Promise(resolve => setTimeout(resolve, 500));
          // محاولة مرة أخرى
          await prisma.$queryRaw`SELECT 1`;
          console.log(`✅ [WOOCOMMERCE-EXPORT] Prisma connection established`);
        }

        await this.exportOrderToWooCommerce(orderId);
      } catch (error) {
        console.error(`❌ [WOOCOMMERCE-EXPORT] Async export failed for order ${orderId}:`, error.message);
        console.error(`❌ [WOOCOMMERCE-EXPORT] Error stack:`, error.stack);
      }
    }, 200); // delay صغير (200ms) لضمان أن Prisma client متصل
  }
}

// Singleton instance
let instance = null;

const getWooCommerceAutoExportService = () => {
  if (!instance) {
    instance = new WooCommerceAutoExportService();
  }
  return instance;
};

module.exports = {
  WooCommerceAutoExportService,
  getWooCommerceAutoExportService
};

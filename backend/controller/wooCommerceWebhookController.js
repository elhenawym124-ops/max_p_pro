const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const crypto = require('crypto');
const { mapWooStatusToLocal } = require('../services/wooCommerceStatusService');

/**
 * 🔧 Helper: التحقق من صحة Webhook Signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');

  return signature === expectedSignature;
};

// Redundant mapWooStatusToLocal removed, using shared service.

/**
 * 🔧 Helper: تحويل طريقة الدفع
 */
const mapPaymentMethod = (wooPaymentMethod) => {
  const methodMap = {
    'cod': 'CASH',
    'bacs': 'BANK_TRANSFER',
    'paypal': 'CREDIT_CARD',
    'stripe': 'CREDIT_CARD'
  };
  return methodMap[wooPaymentMethod] || 'CASH';
};

// ═══════════════════════════════════════════════════════════════
// 🔔 Webhook Handlers
// ═══════════════════════════════════════════════════════════════

/**
 * استقبال Webhook من WooCommerce
 * POST /api/v1/woocommerce/webhook/:companyId
 */
const handleWooCommerceWebhook = async (req, res) => {
  try {
    const { companyId } = req.params;
    const signature = req.headers['x-wc-webhook-signature'];
    const topic = req.headers['x-wc-webhook-topic'];

    // 🔧 Fix UTF-8 encoding for Arabic text
    const rawBody = JSON.stringify(req.body, null, 0);

    console.log(`\n🔔 ═══════════════════════════════════════════════════`);
    console.log(`🔔 [WEBHOOK] Received WooCommerce webhook`);
    console.log(`   Company ID: ${companyId}`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Has Body: ${!!req.body}`);
    console.log(`   Order ID: ${req.body?.id || 'N/A'}`);
    console.log(`🔔 ═══════════════════════════════════════════════════\n`);

    // جلب إعدادات الشركة
    const settings = await getSharedPrismaClient().wooCommerceSettings.findUnique({
      where: { companyId }
    });

    console.log(`   Settings found: ${!!settings}`);
    console.log(`   webhookEnabled: ${settings?.webhookEnabled}`);

    if (!settings || !settings.webhookEnabled) {
      console.log(`⚠️ [WEBHOOK] Webhooks not enabled for company: ${companyId}`);
      return res.status(200).json({ message: 'Webhooks not enabled' });
    }

    // التحقق من الـ Signature (مفعل بشكل صارم للأمان)
    if (settings.webhookSecret && signature) {
      // يجب أن يستخدم rawBody إذا كان متاحاً لضمان الصحة التامة
      const isValid = verifyWebhookSignature(rawBody, signature, settings.webhookSecret);

      if (!isValid) {
        console.warn(`❌ [WEBHOOK] Signature mismatch! Request rejected.`);
        console.warn(`   Order ID: ${req.body?.id || 'N/A'}`);
        // رفض الطلب إذا كان التوقيع غير صحيح
        return res.status(401).json({ message: 'Invalid signature' });
      }

      console.log(`✅ [WEBHOOK] Signature verified successfully`);
    } else if (settings.webhookSecret && !signature) {
      console.warn(`⚠️ [WEBHOOK] Signature missing but secret is configured. Request rejected.`);
      return res.status(401).json({ message: 'Missing signature' });
    }

    // معالجة حسب نوع الـ Webhook
    switch (topic) {
      case 'order.created':
        await handleOrderCreated(companyId, req.body, settings);
        break;
      case 'order.updated':
        await handleOrderUpdated(companyId, req.body, settings);
        break;
      case 'order.deleted':
        await handleOrderDeleted(companyId, req.body);
        break;
      default:
        console.log(`⚠️ [WEBHOOK] Unhandled topic: ${topic}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing webhook:', error);
    // نرجع 200 عشان WooCommerce ما يعيدش المحاولة
    res.status(200).json({ success: false, error: error.message });
  }
};

/**
 * معالجة طلب جديد من WooCommerce
 */
const handleOrderCreated = async (companyId, orderData, settings) => {
  const startTime = Date.now();
  try {
    console.log(`📦 [WEBHOOK] Processing new order: ${orderData.id}`);

    // 🔍 Debug: طباعة البيانات الواردة من WooCommerce
    console.log(`🔍 [WEBHOOK-DEBUG] Order Data:`);
    console.log(`   Order ID: ${orderData.id}`);
    console.log(`   Status: ${orderData.status}`);
    console.log(`   Total: ${orderData.total}`);
    console.log(`   Currency: ${orderData.currency}`);
    console.log(`   Date Created: ${orderData.date_created}`);
    console.log(`   Payment Method: ${orderData.payment_method}`);
    console.log(`   Customer Note: ${orderData.customer_note}`);

    if (orderData.billing) {
      console.log(`🔍 [WEBHOOK-DEBUG] Billing Data:`);
      console.log(`   First Name: "${orderData.billing.first_name}"`);
      console.log(`   Last Name: "${orderData.billing.last_name}"`);
      console.log(`   Email: "${orderData.billing.email}"`);
      console.log(`   Phone: "${orderData.billing.phone}"`);
      console.log(`   Address 1: "${orderData.billing.address_1}"`);
      console.log(`   Address 2: "${orderData.billing.address_2}"`);
      console.log(`   City: "${orderData.billing.city}"`);
      console.log(`   State: "${orderData.billing.state}"`);
      console.log(`   Postcode: "${orderData.billing.postcode}"`);
      console.log(`   Country: "${orderData.billing.country}"`);
    } else {
      console.log(`⚠️ [WEBHOOK-DEBUG] No billing data found!`);
    }

    if (orderData.shipping) {
      console.log(`🔍 [WEBHOOK-DEBUG] Shipping Data:`);
      console.log(`   First Name: "${orderData.shipping.first_name}"`);
      console.log(`   Last Name: "${orderData.shipping.last_name}"`);
      console.log(`   Address 1: "${orderData.shipping.address_1}"`);
      console.log(`   City: "${orderData.shipping.city}"`);
    }

    // التحقق من وجود الطلب
    const existingOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        wooCommerceId: orderData.id.toString(),
        companyId
      }
    });

    if (existingOrder) {
      console.log(`⚠️ [WEBHOOK] Order already exists: ${orderData.id}`);
      return;
    }

    // البحث عن العميل أو إنشاء واحد جديد
    let customer = null;
    const billing = orderData.billing || {};

    if (billing.email) {
      customer = await getSharedPrismaClient().customer.findFirst({
        where: { email: billing.email, companyId }
      });
    }

    if (!customer && billing.phone) {
      customer = await getSharedPrismaClient().customer.findFirst({
        where: { phone: billing.phone, companyId }
      });
    }

    if (!customer) {
      customer = await getSharedPrismaClient().customer.create({
        data: {
          firstName: billing.first_name || 'عميل',
          lastName: billing.last_name || 'WooCommerce',
          email: billing.email || null,
          phone: billing.phone || null,
          companyId,
          status: 'CUSTOMER'
        }
      });
      console.log(`✅ [WEBHOOK] Created customer: ${customer.firstName}`);
    }

    // إنشاء الطلب
    const order = await getSharedPrismaClient().order.create({
      data: {
        orderNumber: `WOO-${orderData.id}`,
        customerId: customer.id,
        companyId,
        status: mapWooStatusToLocal(orderData.status, settings.statusMapping),
        paymentStatus: orderData.date_paid ? 'PAID' : 'PENDING',
        paymentMethod: mapPaymentMethod(orderData.payment_method),
        subtotal: parseFloat(orderData.total) - parseFloat(orderData.shipping_total || 0),
        tax: parseFloat(orderData.total_tax || 0),
        shipping: parseFloat(orderData.shipping_total || 0),
        discount: parseFloat(orderData.discount_total || 0),
        total: parseFloat(orderData.total),
        currency: orderData.currency || 'EGP',
        customerName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
        customerPhone: billing.phone,
        customerEmail: billing.email,
        customerAddress: billing.address_1,
        city: billing.city,
        notes: orderData.customer_note || null,
        sourceType: 'woocommerce_webhook',

        // WooCommerce Fields
        wooCommerceId: orderData.id.toString(),
        wooCommerceOrderKey: orderData.order_key || null,
        wooCommerceStatus: orderData.status,
        wooCommerceDateCreated: orderData.date_created ? new Date(orderData.date_created) : new Date(),
        wooCommerceUrl: `${settings.storeUrl}/wp-admin/post.php?post=${orderData.id}&action=edit`,
        syncedFromWoo: true,
        lastSyncAt: new Date()
      }
    });

    // إنشاء عناصر الطلب (محسّن للسرعة)
    if (orderData.line_items && orderData.line_items.length > 0) {
      // جمع كل الـ SKUs و Product IDs مرة واحدة
      const skus = orderData.line_items.filter(item => item.sku).map(item => item.sku);
      const productIds = orderData.line_items.filter(item => item.product_id).map(item => item.product_id.toString());

      // البحث عن كل المنتجات مرة واحدة بدلاً من استعلام منفصل لكل منتج
      const products = await getSharedPrismaClient().product.findMany({
        where: {
          companyId,
          OR: [
            { sku: { in: skus } },
            { wooCommerceId: { in: productIds } }
          ]
        }
      });

      // إنشاء map للوصول السريع للمنتجات
      const productMap = new Map();
      products.forEach(product => {
        if (product.sku) productMap.set(`sku_${product.sku}`, product);
        if (product.wooCommerceId) productMap.set(`woo_${product.wooCommerceId}`, product);
      });

      // إنشاء عناصر الطلب
      const orderItems = orderData.line_items.map(item => {
        let product = null;

        // البحث في الـ map بدلاً من قاعدة البيانات
        if (item.sku) {
          product = productMap.get(`sku_${item.sku}`);
        }
        if (!product && item.product_id) {
          product = productMap.get(`woo_${item.product_id.toString()}`);
        }

        return {
          orderId: order.id,
          productId: product?.id || null,
          productName: item.name,
          productSku: item.sku,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.total)
        };
      });

      // إنشاء كل العناصر مرة واحدة
      await getSharedPrismaClient().orderItem.createMany({
        data: orderItems
      });
    }

    // تسجيل في سجل المزامنة
    await getSharedPrismaClient().wooCommerceSyncLog.create({
      data: {
        companyId,
        syncType: 'webhook',
        syncDirection: 'from_woo',
        status: 'success',
        totalItems: 1,
        successCount: 1,
        triggeredBy: 'webhook',
        completedAt: new Date(),
        metadata: JSON.stringify({ orderId: order.id, wooCommerceId: orderData.id })
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ [WEBHOOK] Order created successfully: ${order.orderNumber} (${duration}ms)`);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error('❌ [WEBHOOK] Error creating order:', error);

    // تسجيل الخطأ
    await getSharedPrismaClient().wooCommerceSyncLog.create({
      data: {
        companyId,
        syncType: 'webhook',
        syncDirection: 'from_woo',
        status: 'failed',
        totalItems: 1,
        failedCount: 1,
        triggeredBy: 'webhook',
        errorMessage: error.message,
        errorDetails: JSON.stringify({
          error: error.message,
          stack: error.stack,
          orderData: orderData ? {
            id: orderData.id,
            number: orderData.number,
            status: orderData.status
          } : null,
          timestamp: new Date().toISOString()
        }),
        completedAt: new Date()
      }
    });

    throw error;
  }
};

/**
 * معالجة تحديث طلب من WooCommerce
 */
const handleOrderUpdated = async (companyId, orderData, settings) => {
  try {
    console.log(`🔄 [WEBHOOK] Processing order update: ${orderData.id}`);

    const existingOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        wooCommerceId: orderData.id.toString(),
        companyId
      }
    });

    if (!existingOrder) {
      // لو الطلب مش موجود، ننشئه
      console.log(`⚠️ [WEBHOOK] Order not found, creating: ${orderData.id}`);
      await handleOrderCreated(companyId, orderData, settings);
      return;
    }

    // تحديث الطلب
    await getSharedPrismaClient().order.update({
      where: { id: existingOrder.id },
      data: {
        status: mapWooStatusToLocal(orderData.status, settings.statusMapping),
        wooCommerceStatus: orderData.status,
        paymentStatus: orderData.date_paid ? 'PAID' : existingOrder.paymentStatus,
        lastSyncAt: new Date()
      }
    });

    console.log(`✅ [WEBHOOK] Order updated: ${existingOrder.orderNumber}`);

  } catch (error) {
    console.error('❌ [WEBHOOK] Error updating order:', error);
    throw error;
  }
};

/**
 * معالجة حذف طلب من WooCommerce
 */
const handleOrderDeleted = async (companyId, orderData) => {
  try {
    console.log(`🗑️ [WEBHOOK] Processing order deletion: ${orderData.id}`);

    const existingOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        wooCommerceId: orderData.id.toString(),
        companyId
      }
    });

    if (existingOrder) {
      // نحدث الحالة بدل ما نحذف
      await getSharedPrismaClient().order.update({
        where: { id: existingOrder.id },
        data: {
          status: 'CANCELLED',
          wooCommerceStatus: 'deleted',
          lastSyncAt: new Date()
        }
      });
      console.log(`✅ [WEBHOOK] Order marked as cancelled: ${existingOrder.orderNumber}`);
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Error handling order deletion:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔧 Webhook Setup in WooCommerce
// ═══════════════════════════════════════════════════════════════

/**
 * إنشاء Webhooks في WooCommerce
 * POST /api/v1/woocommerce/webhooks/setup
 * Body: { ngrokUrl?: string } - اختياري: URL الـ ngrok للاختبار المحلي
 */
const setupWooCommerceWebhooks = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { ngrokUrl } = req.body; // 🔧 دعم ngrok URL للاختبار المحلي

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول'
      });
    }

    const settings = await getSharedPrismaClient().wooCommerceSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'إعدادات WooCommerce غير موجودة'
      });
    }

    // 🔒 Generate Webhook Secret if not exists
    let webhookSecret = settings.webhookSecret;
    if (!webhookSecret) {
      webhookSecret = require('crypto').randomBytes(32).toString('hex');
      try {
        await getSharedPrismaClient().wooCommerceSettings.update({
          where: { companyId },
          data: { webhookSecret }
        });
        settings.webhookSecret = webhookSecret; // Update local ref
        console.log(`🔐 [WEBHOOK] Generated new secure webhook secret for company ${companyId}`);
      } catch (err) {
        console.error('❌ [WEBHOOK] Failed to save webhook secret:', err);
      }
    }

    const axios = require('axios');
    const baseURL = settings.storeUrl.replace(/\/$/, '');

    // 🔧 الأولوية: ngrokUrl من الـ body > BACKEND_URL من البيئة > URL من الـ request
    let backendUrl;
    if (ngrokUrl) {
      // استخدام ngrok URL المرسل من الفرونت
      backendUrl = ngrokUrl.replace(/\/$/, '');
      console.log(`🔗 [WEBHOOK] Using ngrok URL: ${backendUrl}`);
    } else {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
      backendUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
    }
    const webhookUrl = `${backendUrl}/api/v1/woocommerce/webhook/${companyId}`;

    const webhooksToCreate = [
      { name: 'Order Created', topic: 'order.created' },
      { name: 'Order Updated', topic: 'order.updated' }
    ];

    const createdWebhooks = [];

    for (const webhook of webhooksToCreate) {
      try {
        const response = await axios.post(
          `${baseURL}/wp-json/wc/v3/webhooks`,
          {
            name: webhook.name,
            topic: webhook.topic,
            delivery_url: webhookUrl,
            secret: settings.webhookSecret,
            status: 'active'
          },
          {
            auth: {
              username: settings.consumerKey,
              password: settings.consumerSecret
            }
          }
        );

        createdWebhooks.push({
          id: response.data.id,
          name: webhook.name,
          topic: webhook.topic
        });

      } catch (error) {
        console.error(`❌ [WEBHOOK] Error creating webhook ${webhook.name}:`, error.message);
      }
    }

    // تحديث الإعدادات
    await getSharedPrismaClient().wooCommerceSettings.update({
      where: { companyId },
      data: {
        webhookEnabled: true,
        webhookUrl: webhookUrl,
        webhookOrderCreated: createdWebhooks.find(w => w.topic === 'order.created')?.id?.toString(),
        webhookOrderUpdated: createdWebhooks.find(w => w.topic === 'order.updated')?.id?.toString()
      }
    });

    console.log(`✅ [WEBHOOK] Setup complete for company ${companyId}`);
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log(`   Created webhooks: ${createdWebhooks.length}`);

    res.json({
      success: true,
      message: `تم إنشاء ${createdWebhooks.length} webhook بنجاح`,
      data: {
        webhooks: createdWebhooks,
        webhookUrl
      }
    });

  } catch (error) {
    console.error('❌ [WEBHOOK] Error setting up webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعداد Webhooks',
      error: error.message
    });
  }
};

/**
 * اختبار Webhook
 * POST /api/v1/woocommerce/webhooks/test
 */
const testWebhook = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    console.log(`🧪 [WEBHOOK] Test webhook received for company: ${companyId}`);

    res.json({
      success: true,
      message: 'Webhook يعمل بشكل صحيح!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في اختبار Webhook',
      error: error.message
    });
  }
};

module.exports = {
  handleWooCommerceWebhook,
  setupWooCommerceWebhooks,
  testWebhook
};


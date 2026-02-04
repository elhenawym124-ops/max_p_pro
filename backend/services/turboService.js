/**
 * Turbo Shipping Service
 * خدمة للتعامل مع Turbo Shipping API
 * 
 * المزايا المدعومة:
 * ═══════════════════════════════════════════════════
 * ✅ Create Shipment - إنشاء شحنة جديدة
 * ✅ Track Shipment - تتبع الشحنة
 * ✅ Get Shipment Status - جلب حالة الشحنة
 * ✅ Calculate Shipping Cost - حساب تكلفة الشحن
 * ✅ Cancel Shipment - إلغاء الشحنة
 * ✅ Update Shipment - تحديث بيانات الشحنة
 * ✅ Print Label - طباعة ملصق الشحنة
 * ✅ Get Branches - جلب فروع Turbo
 * ✅ Return Management - إدارة المرتجعات
 * ✅ Webhook Configuration - إعداد webhooks
 * ═══════════════════════════════════════════════════
 */

const axios = require('axios');
const FormData = require('form-data');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

// In-memory cache for governments and areas to avoid Rate Limiting (429)
const cache = {
  governments: {
    data: null,
    timestamp: 0
  },
  areas: {} // keyed by governmentId: { data: [], timestamp: 0 }
};

const CACHE_TTL = 3600 * 1000; // 1 hour cache

// Fallback Governments List (in case API is down or rate limited)
const FALLBACK_GOVERNMENTS = [
  { id: '1', name: 'القاهرة' },
  { id: '2', name: 'الجيزة' },
  { id: '3', name: 'الإسكندرية' },
  { id: '4', name: 'الدقهلية' },
  { id: '5', name: 'الشرقية' },
  { id: '6', name: 'المنوفية' },
  { id: '7', name: 'القليوبية' },
  { id: '8', name: 'البحيرة' },
  { id: '9', name: 'الغربية' },
  { id: '10', name: 'بورسعيد' },
  { id: '11', name: 'دمياط' },
  { id: '12', name: 'الإسماعيلية' },
  { id: '13', name: 'السويس' },
  { id: '14', name: 'كفر الشيخ' },
  { id: '15', name: 'الفيوم' },
  { id: '16', name: 'بني سويف' },
  { id: '17', name: 'المنيا' },
  { id: '18', name: 'أسيوط' },
  { id: '19', name: 'سوهاج' },
  { id: '20', name: 'قنا' },
  { id: '21', name: 'الأقصر' },
  { id: '22', name: 'أسوان' },
  { id: '23', name: 'البحر الأحمر' },
  { id: '24', name: 'الوادي الجديد' },
  { id: '25', name: 'مطروح' },
  { id: '26', name: 'شمال سيناء' },
  { id: '27', name: 'جنوب سيناء' }
];

class TurboService {
  constructor(apiKey = null, companyId = null) {
    // يمكن تمرير API Key مباشرة أو جلبها من قاعدة البيانات
    this.apiKey = apiKey;
    this.companyId = companyId;
    // Base URL لـ Turbo API - الرابط الفعلي من backoffice
    this.baseUrl = process.env.TURBO_API_URL || 'https://backoffice.turbo-eg.com/external-api';
    this.timeout = 30000; // 30 ثانية
  }

  /**
   * جلب API Key من قاعدة البيانات إذا لم يتم تمريره
   */
  async getApiKey() {
    if (this.apiKey) {
      return this.apiKey;
    }

    if (!this.companyId) {
      throw new Error('Company ID is required to fetch API key');
    }

    try {
      const prisma = getSharedPrismaClient();
      console.log('🔍 [TURBO-DEBUG] Checking Turbo for companyId:', this.companyId);
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: this.companyId },
          select: { turboApiKey: true, turboEnabled: true }
        });
      }, 2);

      console.log('🔍 [TURBO-DEBUG] Company found:', company ? 'YES' : 'NO');
      console.log('🔍 [TURBO-DEBUG] turboEnabled:', company?.turboEnabled);
      console.log('🔍 [TURBO-DEBUG] turboApiKey exists:', !!company?.turboApiKey);

      if (!company || !company.turboEnabled) {
        throw new Error('Turbo is not enabled for this company');
      }

      if (!company.turboApiKey) {
        throw new Error('Turbo API key is not configured for this company');
      }

      this.apiKey = company.turboApiKey;
      return this.apiKey;
    } catch (error) {
      console.error('❌ [TURBO] Error fetching API key:', error);
      throw error;
    }
  }

  /**
   * إعداد headers للطلبات
   * @param {string} apiKey - API key لإضافته في header (اختياري)
   * @param {boolean} isFormData - إذا كان true، لا يضيف Content-Type (لـ FormData)
   */
  async getHeaders(apiKey = null, isFormData = false) {
    const headers = {
      'Accept': 'application/json'
    };

    // إضافة authentication_key في header إذا تم توفيره
    if (apiKey) {
      headers['authentication_key'] = apiKey;
    }

    // إضافة Content-Type فقط إذا لم يكن FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * جلب main_client_code من إعدادات الشركة
   */
  async getMainClientCode() {
    if (!this.companyId) {
      throw new Error('Company ID is required to fetch main_client_code');
    }

    try {
      const prisma = getSharedPrismaClient();
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: this.companyId },
          select: { turboMainClientCode: true }
        });
      }, 2);

      return company?.turboMainClientCode || null;
    } catch (error) {
      console.error('❌ [TURBO] Error fetching main_client_code:', error);
      return null;
    }
  }

  /**
   * جلب sender_number من إعدادات الشركة
   */
  async getSenderNumber() {
    if (!this.companyId) {
      throw new Error('Company ID is required to fetch sender_number');
    }

    try {
      const prisma = getSharedPrismaClient();
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: this.companyId },
          select: { turboSenderNumber: true }
        });
      }, 2);

      return company?.turboSenderNumber || null;
    } catch (error) {
      console.error('❌ [TURBO] Error fetching sender_number:', error);
      return null;
    }
  }

  /**
   * معالجة الأخطاء من Turbo API
   */
  handleError(error, operation) {
    if (error.response) {
      // خطأ من Turbo API
      const status = error.response.status;
      const data = error.response.data;

      // استخراج رسالة الخطأ من Turbo API
      const errorMsg = data?.error_msg || data?.message || data?.error || `Turbo API error: ${status}`;

      console.error(`❌ [TURBO] ${operation} failed:`, {
        status,
        data,
        error_msg: errorMsg
      });

      throw new Error(errorMsg);
    } else if (error.request) {
      // لا يوجد رد من Turbo API
      console.error(`❌ [TURBO] ${operation} failed: No response from Turbo API`);
      throw new Error('No response from Turbo API. Please check your connection.');
    } else {
      // خطأ في إعداد الطلب
      console.error(`❌ [TURBO] ${operation} failed:`, error.message);
      throw error;
    }
  }

  /**
   * ============================================
   * Shipment Methods
   * ============================================
   */

  /**
   * تنظيف اسم المحافظة/المنطقة من الأرقام والكولون
   */
  cleanLocationName(location) {
    if (!location) return '';
    // إزالة الأرقام والكولون من البداية (مثل "4021:حدائق الاهرام" -> "حدائق الاهرام")
    return location.toString().replace(/^\d+:/, '').trim();
  }

  /**
   * Mapping للمحافظات المصرية إلى الأسماء التي يتعرف عليها Turbo API
   */
  getTurboGovernorateName(governorate) {
    if (!governorate) return 'القاهرة';

    const govName = this.cleanLocationName(governorate).toLowerCase().trim();

    // Mapping للمحافظات الشائعة
    const governorateMap = {
      'القاهرة': 'القاهرة',
      'الجيزة': 'الجيزة',
      'الإسكندرية': 'الإسكندرية',
      'الغردقة': 'البحر الأحمر',
      'البحر الأحمر': 'البحر الأحمر',
      'بورسعيد': 'بورسعيد',
      'بور سعيد': 'بورسعيد',
      'السويس': 'السويس',
      'دمياط': 'دمياط',
      'الدقهلية': 'الدقهلية',
      'الشرقية': 'الشرقية',
      'القليوبية': 'القليوبية',
      'المنوفية': 'المنوفية',
      'البحيرة': 'البحيرة',
      'كفر الشيخ': 'كفر الشيخ',
      'الغربية': 'الغربية',
      'المنيا': 'المنيا',
      'أسيوط': 'أسيوط',
      'سوهاج': 'سوهاج',
      'قنا': 'قنا',
      'الأقصر': 'الأقصر',
      'أسوان': 'أسوان',
      'شمال سيناء': 'شمال سيناء',
      'جنوب سيناء': 'جنوب سيناء',
      'مطروح': 'مطروح',
      'الفيوم': 'الفيوم',
      'بني سويف': 'بني سويف',
      'الإسماعيلية': 'الإسماعيلية',
      'الوادي الجديد': 'الوادي الجديد'
    };

    // البحث المباشر
    const cleanedGov = this.cleanLocationName(governorate);
    if (governorateMap[cleanedGov]) {
      return governorateMap[cleanedGov];
    }

    // البحث case-insensitive
    for (const [key, value] of Object.entries(governorateMap)) {
      if (key.toLowerCase() === govName || value.toLowerCase() === govName) {
        return value;
      }
    }

    // البحث الجزئي
    for (const [key, value] of Object.entries(governorateMap)) {
      if (govName.includes(key.toLowerCase()) || key.toLowerCase().includes(govName)) {
        return value;
      }
    }

    // إذا لم نجد mapping، نعيد الاسم بعد تنظيفه
    return cleanedGov || 'القاهرة';
  }

  /**
   * إنشاء شحنة جديدة
   * @param {Object} orderData - بيانات الطلب
   * @returns {Object} معلومات الشحنة المنشأة
   */
  async createShipment(orderData) {
    try {
      const {
        orderId,
        orderNumber,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        city,
        governorate,
        items,
        totalWeight,
        totalValue,
        paymentMethod = 'CASH',
        notes
      } = orderData;

      const headers = await this.getHeaders();
      const apiKey = await this.getApiKey();
      const mainClientCode = await this.getMainClientCode();
      const senderNumber = await this.getSenderNumber();

      // تنظيف العنوان إذا كان JSON string
      let cleanAddress = shippingAddress || '';
      if (cleanAddress && cleanAddress.startsWith('{')) {
        try {
          const addressObj = JSON.parse(cleanAddress);
          // محاولة بناء عنوان من البيانات
          const addressParts = [
            addressObj.address_1,
            addressObj.address_2,
            addressObj.city ? this.cleanLocationName(addressObj.city) : ''
          ].filter(Boolean);
          cleanAddress = addressParts.join(', ') || shippingAddress;
        } catch (e) {
          // إذا فشل التحليل، استخدم العنوان كما هو
          cleanAddress = shippingAddress;
        }
      }

      // جلب قائمة المحافظات من Turbo API
      let governments = [];
      try {
        const governmentsResult = await this.getGovernments();
        if (governmentsResult && governmentsResult.governments) {
          governments = governmentsResult.governments;
          console.log(`✅ [TURBO] Loaded ${governments.length} governments from API`);
        }
      } catch (error) {
        console.warn('⚠️ [TURBO] Failed to fetch governments, using fallback mapping:', error.message);
      }

      // استخدام governorate من orderData مباشرة إذا كان موجوداً
      let cleanGovernorate;
      if (governorate && governorate.trim()) {
        // إذا كانت المحافظة موجودة في orderData، استخدمها مباشرة
        console.log(`📍 [TURBO] Using governorate from orderData: "${governorate}"`);
        const cleanedGov = this.cleanLocationName(governorate);

        // التحقق من أن المحافظة موجودة في قائمة Turbo API
        if (governments.length > 0) {
          const foundGov = governments.find(g => {
            const govName = g.name.toLowerCase();
            return govName === cleanedGov.toLowerCase() ||
              govName.includes(cleanedGov.toLowerCase()) ||
              cleanedGov.toLowerCase().includes(govName);
          });

          if (foundGov) {
            cleanGovernorate = foundGov.name;
            console.log(`✅ [TURBO] Matched governorate in Turbo list: "${cleanGovernorate}"`);
          } else {
            // إذا لم نجدها في القائمة، استخدم الـ mapping
            cleanGovernorate = this.getTurboGovernorateName(cleanedGov);
            console.log(`⚠️ [TURBO] Governorate not found in Turbo list, using mapping: "${cleanGovernorate}"`);
          }
        } else {
          // إذا لم نتمكن من جلب القائمة، استخدم الـ mapping
          cleanGovernorate = this.getTurboGovernorateName(cleanedGov);
          console.log(`⚠️ [TURBO] No governments list, using mapping: "${cleanGovernorate}"`);
        }
      } else {
        // إذا لم تكن المحافظة موجودة، استخدم city للبحث
        const orderCity = city || '';
        console.log(`📍 [TURBO] No governorate in orderData, searching by city: "${orderCity}"`);

        if (governments.length > 0) {
          cleanGovernorate = this.findGovernmentByCity(orderCity, governments);
          console.log(`✅ [TURBO] Selected government by city: "${cleanGovernorate}"`);
        } else {
          // Fallback إلى الـ mapping القديم
          console.log('⚠️ [TURBO] Using fallback mapping (no governments list)');
          const rawGovernorate = this.cleanLocationName(city || 'القاهرة');
          cleanGovernorate = this.getTurboGovernorateName(rawGovernorate);
          console.log(`✅ [TURBO] Fallback government: "${cleanGovernorate}"`);
        }
      }

      const cleanArea = this.cleanLocationName(city || '');

      // تحضير بيانات الشحنة حسب Turbo API الفعلي
      // بناءً على الوثائق: https://backoffice.turbo-eg.com/external-api/add-order
      const shipmentData = {
        authentication_key: apiKey,
        main_client_code: mainClientCode || 37321, // افتراضي أو من إعدادات الشركة
        second_client: orderNumber || `Order ${orderNumber}`,
        receiver: customerName,
        phone1: customerPhone,
        phone2: null,
        api_followup_phone: senderNumber || customerPhone,
        government: cleanGovernorate,
        area: cleanArea,
        address: cleanAddress,
        notes: notes || `Order #${orderNumber}`,
        invoice_number: orderNumber,
        order_summary: items.map(item => item.productName || item.name).join(', ') || 'طلب',
        amount_to_be_collected: paymentMethod === 'CASH' ? (totalValue || 0) : 0,
        return_amount: 0,
        is_order: 0,
        return_summary: null,
        can_open: 1
      };

      console.log('📦 [TURBO] Creating shipment for order:', orderNumber);
      console.log('📦 [TURBO] Shipment data:', { ...shipmentData, authentication_key: '***' });

      const response = await axios.post(
        `${this.baseUrl}/add-order`,
        shipmentData,
        {
          headers,
          timeout: this.timeout
        }
      );

      const responseData = response.data;

      console.log('📦 [TURBO] API Response:', responseData);

      // التحقق من وجود خطأ في الرد
      // API قد يعيد success: 0 (number) أو success: false (boolean) أو error_msg
      if (responseData.success === 0 || responseData.success === false || responseData.error_msg) {
        const errorMsg = responseData.error_msg || 'Unknown error from Turbo API';
        console.error('❌ [TURBO] Shipment creation failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      // الرد من Turbo API في حالة النجاح:
      // قد يعيد success: 1 (number) أو success: true (boolean)
      // {"success": 1, "result": {...}} أو {"success": true, "result": {...}}
      const isSuccess = responseData.success === 1 || responseData.success === true;
      if (!isSuccess || !responseData.result) {
        console.error('❌ [TURBO] Invalid response from Turbo API:', responseData);
        throw new Error('Invalid response from Turbo API: missing success or result');
      }

      const shipment = responseData.result;

      // التحقق من وجود code أو bar_code
      if (!shipment.code && !shipment.bar_code) {
        console.error('❌ [TURBO] Invalid response from Turbo API: missing code or bar_code', shipment);
        throw new Error('Invalid response from Turbo API: missing code or bar_code');
      }

      const trackingNumber = shipment.bar_code || shipment.code;
      console.log('✅ [TURBO] Shipment created successfully:', trackingNumber);

      return {
        success: true,
        shipmentId: shipment.code || shipment.bar_code,
        trackingNumber: trackingNumber,
        labelUrl: null,
        status: 'created',
        estimatedDelivery: shipment.expected_branch || null,
        cost: null,
        data: shipment
      };
    } catch (error) {
      this.handleError(error, 'Create Shipment');
    }
  }

  /**
   * تتبع الشحنة
   * @param {String} trackingNumber - رقم التتبع (يمكن أن يكون tracking number أو shipment ID)
   * @returns {Object} معلومات تتبع الشحنة
   */
  async trackShipment(trackingNumber) {
    try {
      const apiKey = await this.getApiKey();
      const headers = await this.getHeaders();
      const trackingNumberStr = String(trackingNumber || '');

      console.log('🔍 [TURBO] Tracking shipment:', trackingNumberStr);

      // بناءً على نمط Turbo API (مثل /delete-order)، endpoint التتبع قد يكون:
      // /get-order-status أو /order-status أو /track أو /get-order
      const possibleEndpoints = [
        `${this.baseUrl}/get-order-status`,
        `${this.baseUrl}/order-status`,
        `${this.baseUrl}/get-order`,
        `${this.baseUrl}/track`,
        `${this.baseUrl}/track-order`
      ];

      let response;
      let lastError = null;

      // محاولة POST أولاً (الأكثر شيوعاً في Turbo API)
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🔄 [TURBO] Trying POST: ${endpoint}`);
          response = await axios.post(
            endpoint,
            {
              authentication_key: apiKey,
              search_Key: trackingNumberStr
            },
            {
              headers,
              timeout: this.timeout
            }
          );

          const responseData = response.data;

          // التحقق من نجاح الطلب
          if (responseData.success === 1 || responseData.success === true || responseData.feed) {
            console.log(`✅ [TURBO] Success with POST: ${endpoint}`);
            break;
          } else if (responseData.success === 0 || responseData.success === false) {
            // إذا كان success = 0، جرب endpoint آخر
            const errorMsg = responseData.error_msg || responseData.message || 'Unknown error';
            console.log(`⚠️ [TURBO] POST returned success=0 for ${endpoint}: ${errorMsg}`);
            continue;
          }
        } catch (postError) {
          lastError = postError;
          if (postError.response?.status === 405 || postError.response?.status === 404) {
            // إذا فشل POST، جرب GET
            try {
              console.log(`🔄 [TURBO] Trying GET: ${endpoint}`);
              response = await axios.get(
                `${endpoint}?authentication_key=${apiKey}&search_Key=${trackingNumberStr}`,
                {
                  headers,
                  timeout: this.timeout
                }
              );

              const responseData = response.data;
              if (responseData.success === 1 || responseData.success === true || responseData.feed) {
                console.log(`✅ [TURBO] Success with GET: ${endpoint}`);
                break;
              } else {
                console.log(`⚠️ [TURBO] GET returned success=0 for ${endpoint}`);
                continue;
              }
            } catch (getError) {
              console.log(`❌ [TURBO] GET also failed for: ${endpoint}`);
              continue;
            }
          } else if (postError.response?.status === 404) {
            console.log(`❌ [TURBO] Endpoint not found: ${endpoint}`);
            continue;
          } else {
            // خطأ آخر - قد يكون خطأ في البيانات
            throw postError;
          }
        }
      }

      if (!response) {
        // إذا فشل جميع الـ endpoints، إرجاع رسالة واضحة
        console.warn('⚠️ [TURBO] All tracking endpoints failed. Turbo API may use webhooks for status updates.');
        return {
          success: false,
          error: 'Tracking endpoint not available',
          message: 'Turbo API قد لا يدعم تتبع الشحنة مباشرة. يتم تحديث الحالة تلقائياً عبر webhooks.',
          trackingNumber: trackingNumberStr,
          status: null,
          currentLocation: null,
          estimatedDelivery: null,
          history: [],
          data: null
        };
      }

      const tracking = response.data;

      // معالجة البيانات بناءً على هيكل Turbo API
      // قد يكون في feed array أو مباشرة في response
      const trackingData = tracking.feed?.[0] || tracking.result || tracking.data || tracking;

      console.log('✅ [TURBO] Tracking retrieved:', {
        status: trackingData.status || trackingData.order_status || 'unknown',
        trackingNumber: trackingNumberStr
      });

      return {
        success: true,
        trackingNumber: trackingData.tracking_number || trackingData.bar_code || trackingData.code || trackingNumberStr,
        status: trackingData.status || trackingData.order_status || trackingData.current_status || 'unknown',
        currentLocation: trackingData.current_location || trackingData.location || null,
        estimatedDelivery: trackingData.estimated_delivery || trackingData.expected_delivery || null,
        deliveredAt: trackingData.delivered_at || trackingData.delivery_date || null,
        history: trackingData.history || trackingData.tracking_history || [],
        notes: trackingData.notes || trackingData.comments || null,
        branch: trackingData.branch || trackingData.expected_branch || null,
        data: trackingData,
        rawResponse: tracking
      };
    } catch (error) {
      // إذا كان الخطأ بسبب عدم توفر الـ endpoint، إرجاع رسالة واضحة
      if (error.message?.includes('All endpoints failed') ||
        error.response?.status === 404 ||
        error.response?.status === 405) {
        console.warn('⚠️ [TURBO] Tracking endpoint not available:', error.message);
        return {
          success: false,
          error: 'Tracking endpoint not available',
          message: 'Turbo API قد لا يدعم تتبع الشحنة مباشرة. يتم تحديث الحالة تلقائياً عبر webhooks.',
          trackingNumber: String(trackingNumber || ''),
          status: null,
          currentLocation: null,
          estimatedDelivery: null,
          history: [],
          data: null
        };
      }
      this.handleError(error, 'Track Shipment');
    }
  }

  /**
   * جلب حالة الشحنة
   * @param {String} shipmentId - معرف الشحنة
   * @returns {Object} حالة الشحنة
   */
  async getShipmentStatus(shipmentId) {
    try {
      const headers = await this.getHeaders();

      console.log('📊 [TURBO] Getting shipment status:', shipmentId);

      const response = await axios.get(
        `${this.baseUrl}/shipments/${shipmentId}`,
        {
          headers,
          timeout: this.timeout
        }
      );

      const shipment = response.data;

      return {
        success: true,
        shipmentId: shipment.id || shipment.shipment_id,
        status: shipment.status,
        trackingNumber: shipment.tracking_number,
        currentLocation: shipment.current_location || null,
        estimatedDelivery: shipment.estimated_delivery || null,
        deliveredAt: shipment.delivered_at || null,
        data: shipment
      };
    } catch (error) {
      this.handleError(error, 'Get Shipment Status');
    }
  }

  /**
   * حساب تكلفة الشحن
   * @param {Object} addressData - بيانات العنوان
   * @param {Number} weight - الوزن بالكيلو
   * @param {Object} dimensions - الأبعاد (اختياري)
   * @returns {Object} تكلفة الشحن
   */
  async calculateShippingCost(addressData, weight, dimensions = null) {
    try {
      const headers = await this.getHeaders();

      const {
        city,
        governorate,
        address
      } = addressData;

      const calculationData = {
        city: city,
        governorate: governorate,
        address: address,
        weight: weight || 1, // وزن افتراضي 1 كيلو
        ...(dimensions && {
          length: dimensions.length,
          width: dimensions.width,
          height: dimensions.height
        })
      };

      console.log('💰 [TURBO] Calculating shipping cost:', calculationData);

      // محاولة endpoints مختلفة بناءً على Turbo API
      let response;
      const possibleEndpoints = [
        `${this.baseUrl}/shipping/calculate`,
        `${this.baseUrl}/shipping-cost`,
        `${this.baseUrl}/calculate-shipping`,
        `${this.baseUrl}/calculate`
      ];

      let lastError = null;
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🔄 [TURBO] Trying endpoint: ${endpoint}`);
          response = await axios.post(
            endpoint,
            calculationData,
            {
              headers,
              timeout: this.timeout
            }
          );
          console.log(`✅ [TURBO] Success with endpoint: ${endpoint}`);
          break; // نجح، توقف عن المحاولة
        } catch (error) {
          lastError = error;
          if (error.response?.status === 405) {
            // Method not allowed - جرب GET
            try {
              console.log(`🔄 [TURBO] Trying GET method for: ${endpoint}`);
              const queryParams = new URLSearchParams({
                city: city || '',
                governorate: governorate || '',
                address: address || '',
                weight: (weight || 1).toString()
              });
              if (dimensions) {
                queryParams.append('length', dimensions.length.toString());
                queryParams.append('width', dimensions.width.toString());
                queryParams.append('height', dimensions.height.toString());
              }
              response = await axios.get(
                `${endpoint}?${queryParams.toString()}`,
                {
                  headers,
                  timeout: this.timeout
                }
              );
              console.log(`✅ [TURBO] Success with GET method: ${endpoint}`);
              break;
            } catch (getError) {
              console.log(`❌ [TURBO] GET also failed for: ${endpoint}`);
              continue; // جرب endpoint التالي
            }
          } else if (error.response?.status === 404) {
            // Not found - جرب endpoint التالي
            console.log(`❌ [TURBO] Endpoint not found: ${endpoint}`);
            continue;
          } else {
            // خطأ آخر - أعد الخطأ
            throw error;
          }
        }
      }

      if (!response) {
        // Turbo API لا يدعم حساب تكلفة الشحن مباشرة
        // إرجاع رسالة واضحة بدلاً من خطأ
        console.warn('⚠️ [TURBO] Shipping cost calculation not supported by Turbo API');
        return {
          success: false,
          error: 'Turbo API does not support shipping cost calculation',
          message: 'Turbo API لا يدعم حساب تكلفة الشحن مباشرة. يرجى استخدام إعدادات الشحن في النظام.',
          cost: null,
          estimatedDelivery: null,
          currency: 'EGP'
        };
      }

      const calculation = response.data;

      return {
        success: true,
        cost: calculation.cost || calculation.price,
        estimatedDelivery: calculation.estimated_delivery || calculation.delivery_time,
        currency: calculation.currency || 'EGP',
        data: calculation
      };
    } catch (error) {
      // إذا فشل جميع المحاولات، إرجاع رسالة واضحة
      if (error.message?.includes('All endpoints failed') || error.response?.status === 404) {
        console.warn('⚠️ [TURBO] Shipping cost calculation endpoint not found');
        return {
          success: false,
          error: 'Shipping cost calculation not available',
          message: 'Turbo API لا يدعم حساب تكلفة الشحن مباشرة. يرجى استخدام إعدادات الشحن في النظام.',
          cost: null,
          estimatedDelivery: null,
          currency: 'EGP'
        };
      }
      this.handleError(error, 'Calculate Shipping Cost');
    }
  }

  /**
   * إلغاء الشحنة
   * @param {String|Number} shipmentId - معرف الشحنة (code أو bar_code)
   * @param {String} reason - سبب الإلغاء (اختياري)
   * @returns {Object} نتيجة الإلغاء
   */
  async cancelShipment(shipmentId, reason = null) {
    try {
      const apiKey = await this.getApiKey();

      // التحقق من وجود API key
      if (!apiKey) {
        throw new Error('Turbo API key is required to cancel shipment');
      }

      const headers = await this.getHeaders();

      // تحويل shipmentId إلى رقم إذا كان string
      const shipmentIdNum = typeof shipmentId === 'string' ? parseInt(shipmentId, 10) : shipmentId;

      console.log('❌ [TURBO] Cancelling shipment:', shipmentIdNum);
      console.log('🔑 [TURBO] Using API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

      // بناءً على الوثائق: https://backoffice.turbo-eg.com/external-api/delete-order
      const deleteData = {
        authentication_key: apiKey,
        search_Key: String(shipmentIdNum) // يمكن أن يكون string أو number حسب Turbo API
      };

      const response = await axios.post(
        `${this.baseUrl}/delete-order`,
        deleteData,
        {
          headers,
          timeout: this.timeout
        }
      );

      const result = response.data;

      console.log('📦 [TURBO] Delete Order API Response:', result);

      // التحقق من وجود خطأ في الرد
      if (result.success === 0 || result.error_msg || result.success === false) {
        const errorMsg = result.error_msg || result.message || 'Unknown error from Turbo API';
        console.error('❌ [TURBO] Shipment cancellation failed:', errorMsg);
        // إنشاء error object ليتم معالجته بواسطة handleError
        const error = new Error(errorMsg);
        error.response = {
          status: 400,
          data: result
        };
        throw error;
      }

      console.log('✅ [TURBO] Shipment cancelled successfully');

      return {
        success: true,
        shipmentId: String(shipmentIdNum),
        status: 'cancelled',
        message: result.message || 'Shipment cancelled successfully',
        data: result
      };
    } catch (error) {
      this.handleError(error, 'Cancel Shipment');
    }
  }

  /**
   * تحديث بيانات الشحنة
   * @param {String} shipmentId - معرف الشحنة (code)
   * @param {Object} orderData - بيانات الطلب الكاملة (مثل formatOrderForTurbo)
   * @returns {Object} الشحنة المحدثة
   */
  async updateShipment(shipmentId, orderData) {
    try {
      const headers = await this.getHeaders();
      const apiKey = await this.getApiKey();
      const mainClientCode = await this.getMainClientCode();

      console.log('🔧 [TURBO] Updating shipment:', shipmentId);

      // استخدام formatOrderForTurbo إذا لم تكن البيانات جاهزة
      let formattedData = orderData;
      if (!formattedData.governorate && formattedData.city) {
        // إذا لم تكن البيانات منسقة، قم بتنسيقها
        formattedData = this.formatOrderForTurbo(orderData, orderData.customer, orderData.items || []);
      }

      // تنظيف العنوان
      let cleanAddress = formattedData.shippingAddress || '';
      if (cleanAddress && cleanAddress.startsWith('{')) {
        try {
          const addressObj = JSON.parse(cleanAddress);
          const addressParts = [
            addressObj.address || addressObj.address_1,
            addressObj.address_2,
            addressObj.city ? this.cleanLocationName(addressObj.city) : ''
          ].filter(Boolean);
          cleanAddress = addressParts.join(' / ') || cleanAddress;
        } catch (e) {
          cleanAddress = formattedData.shippingAddress;
        }
      } else if (typeof cleanAddress === 'object') {
        const addressParts = [
          cleanAddress.address || cleanAddress.address_1,
          cleanAddress.address_2,
          cleanAddress.city ? this.cleanLocationName(cleanAddress.city) : ''
        ].filter(Boolean);
        cleanAddress = addressParts.join(' / ') || '';
      }

      // جلب قائمة المحافظات
      let governments = [];
      try {
        const governmentsResult = await this.getGovernments();
        if (governmentsResult && governmentsResult.governments) {
          governments = governmentsResult.governments;
        }
      } catch (error) {
        console.warn('⚠️ [TURBO] Failed to fetch governments for update:', error.message);
      }

      // تحديد المحافظة
      let cleanGovernorate = formattedData.governorate || '';
      if (cleanGovernorate && governments.length > 0) {
        const foundGov = governments.find(g => {
          const govName = g.name.toLowerCase();
          return govName === cleanGovernorate.toLowerCase() ||
            govName.includes(cleanGovernorate.toLowerCase()) ||
            cleanGovernorate.toLowerCase().includes(govName);
        });
        if (foundGov) {
          cleanGovernorate = foundGov.name;
        }
      } else if (!cleanGovernorate && formattedData.city) {
        cleanGovernorate = this.findGovernmentByCity(formattedData.city, governments);
      }

      const cleanArea = this.cleanLocationName(formattedData.city || '');

      // بناء بيانات التحديث حسب Turbo API (/edit-order)
      const updateData = {
        authentication_key: apiKey,
        code: String(shipmentId), // code هو معرف الشحنة
        main_client_code: mainClientCode || 37321,
        second_client: formattedData.orderNumber || '',
        receiver: formattedData.customerName || '',
        phone1: formattedData.customerPhone || '',
        phone2: formattedData.alternativePhone || null,
        api_followup_phone: formattedData.customerPhone || '',
        government: cleanGovernorate,
        area: cleanArea,
        address: cleanAddress,
        notes: formattedData.notes || `Order #${formattedData.orderNumber}`,
        invoice_number: formattedData.orderNumber || '',
        order_summary: (formattedData.items || []).map(item => item.productName || item.name).join(', ') || 'طلب',
        amount_to_be_collected: formattedData.paymentMethod === 'CASH' ? (formattedData.totalValue || 0) : 0,
        return_amount: 0,
        is_order: 0,
        can_open: 1
      };

      console.log('🔧 [TURBO] Update shipment data:', { ...updateData, authentication_key: '***' });

      const response = await axios.post(
        `${this.baseUrl}/edit-order`,
        updateData,
        {
          headers,
          timeout: this.timeout
        }
      );

      const result = response.data;

      console.log('📦 [TURBO] Edit Order API Response:', result);

      // التحقق من وجود خطأ
      if (result.success === 0 || result.error_msg) {
        const errorMsg = result.error_msg || 'Unknown error from Turbo API';
        console.error('❌ [TURBO] Shipment update failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Shipment updated successfully');

      return {
        success: true,
        shipmentId: String(shipmentId),
        data: result
      };
    } catch (error) {
      this.handleError(error, 'Update Shipment');
    }
  }

  /**
   * طباعة ملصق الشحنة
   * @param {String} shipmentId - معرف الشحنة (code أو bar_code)
   * @returns {Object} رابط الملصق
   */
  async printLabel(shipmentId) {
    try {
      const headers = await this.getHeaders();
      const apiKey = await this.getApiKey();

      // تحويل shipmentId إلى string
      const shipmentIdStr = String(shipmentId);

      console.log('🏷️ [TURBO] Printing label for shipment:', shipmentIdStr);

      // بناءً على نمط Turbo API (مثل /delete-order)، endpoint طباعة الملصق قد يكون:
      // /print-label أو /get-label أو /label
      const possibleEndpoints = [
        `${this.baseUrl}/print-label`,
        `${this.baseUrl}/get-label`,
        `${this.baseUrl}/label`,
        `${this.baseUrl}/print-order`
      ];

      let response;
      let lastError = null;

      // محاولة POST أولاً (الأكثر شيوعاً في Turbo API)
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🔄 [TURBO] Trying POST: ${endpoint}`);
          response = await axios.post(
            endpoint,
            {
              authentication_key: apiKey,
              search_Key: shipmentIdStr
            },
            {
              headers,
              timeout: this.timeout,
              responseType: 'arraybuffer' // للحصول على PDF
            }
          );
          console.log(`✅ [TURBO] Success with POST: ${endpoint}`);
          break;
        } catch (postError) {
          lastError = postError;
          if (postError.response?.status === 405 || postError.response?.status === 404) {
            // إذا فشل POST، جرب GET
            try {
              console.log(`🔄 [TURBO] Trying GET: ${endpoint}`);
              response = await axios.get(
                `${endpoint}?authentication_key=${apiKey}&search_Key=${shipmentIdStr}`,
                {
                  headers,
                  timeout: this.timeout,
                  responseType: 'arraybuffer'
                }
              );
              console.log(`✅ [TURBO] Success with GET: ${endpoint}`);
              break;
            } catch (getError) {
              console.log(`❌ [TURBO] GET also failed for: ${endpoint}`);
              continue;
            }
          } else if (postError.response?.status === 404) {
            console.log(`❌ [TURBO] Endpoint not found: ${endpoint}`);
            continue;
          } else {
            // خطأ آخر - قد يكون PDF لكن مع خطأ في الـ status
            // في بعض الحالات، قد يرجع Turbo PDF حتى مع status code غير 200
            if (postError.response?.data && Buffer.isBuffer(postError.response.data)) {
              console.log(`⚠️ [TURBO] Got PDF response with error status, using it anyway`);
              response = postError.response;
              break;
            }
            throw postError;
          }
        }
      }

      if (!response) {
        throw lastError || new Error('All endpoints failed for print label');
      }

      // إذا كان الرد PDF، نعيده كـ base64
      const pdfBuffer = Buffer.from(response.data);
      const base64Pdf = pdfBuffer.toString('base64');

      console.log('✅ [TURBO] Label PDF generated successfully');

      // أو يمكن إرجاع URL إذا كان Turbo يوفر رابط مباشر
      return {
        success: true,
        shipmentId: shipmentIdStr,
        labelUrl: response.headers['x-label-url'] || response.headers['label-url'] || null,
        labelPdf: base64Pdf,
        contentType: 'application/pdf'
      };
    } catch (error) {
      this.handleError(error, 'Print Label');
    }
  }

  /**
   * طباعة البوليصة
   * @param {String|Number} shipmentId - معرف الشحنة
   * @param {Object} orderData - بيانات الطلب (لإنشاء بوليصة محلية إذا لم تتوفر من API)
   * @returns {Object} بيانات البوليصة
   */
  async printWaybill(shipmentId, orderData = null) {
    try {
      const headers = await this.getHeaders();
      const apiKey = await this.getApiKey();
      const shipmentIdStr = String(shipmentId);

      console.log('📄 [TURBO] Printing waybill for shipment:', shipmentIdStr);

      // محاولة جلب البوليصة من Turbo API
      const possibleEndpoints = [
        `${this.baseUrl}/get-waybill`,
        `${this.baseUrl}/waybill`,
        `${this.baseUrl}/print-waybill`
      ];

      let apiWaybill = null;
      let lastError = null;

      // محاولة POST أولاً
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🔄 [TURBO] Trying POST: ${endpoint}`);
          const response = await axios.post(
            endpoint,
            {
              authentication_key: apiKey,
              search_Key: shipmentIdStr
            },
            {
              headers,
              timeout: this.timeout,
              responseType: 'arraybuffer'
            }
          );

          const pdfBuffer = Buffer.from(response.data);
          const base64Pdf = pdfBuffer.toString('base64');

          apiWaybill = {
            success: true,
            waybillPdf: base64Pdf,
            contentType: 'application/pdf',
            fromApi: true
          };
          console.log(`✅ [TURBO] Success with POST: ${endpoint}`);
          break;
        } catch (postError) {
          lastError = postError;
          if (postError.response?.status === 405 || postError.response?.status === 404) {
            // جرب GET
            try {
              console.log(`🔄 [TURBO] Trying GET: ${endpoint}`);
              const response = await axios.get(
                `${endpoint}?authentication_key=${apiKey}&search_Key=${shipmentIdStr}`,
                {
                  headers,
                  timeout: this.timeout,
                  responseType: 'arraybuffer'
                }
              );

              const pdfBuffer = Buffer.from(response.data);
              const base64Pdf = pdfBuffer.toString('base64');

              apiWaybill = {
                success: true,
                waybillPdf: base64Pdf,
                contentType: 'application/pdf',
                fromApi: true
              };
              console.log(`✅ [TURBO] Success with GET: ${endpoint}`);
              break;
            } catch (getError) {
              console.log(`❌ [TURBO] GET also failed for: ${endpoint}`);
              continue;
            }
          } else if (postError.response?.status === 404) {
            console.log(`❌ [TURBO] Endpoint not found: ${endpoint}`);
            continue;
          } else {
            throw postError;
          }
        }
      }

      // إذا حصلنا على بوليصة من API، نعيدها
      if (apiWaybill) {
        return apiWaybill;
      }

      // إذا لم تتوفر من API، إنشاء بوليصة محلية من بيانات الطلب
      if (orderData) {
        console.log('📄 [TURBO] Generating local waybill from order data');
        const waybillData = this.generateLocalWaybill(orderData, shipmentIdStr);
        return {
          success: true,
          waybillData: waybillData,
          fromApi: false
        };
      }

      // إذا لم يكن هناك orderData، نعيد خطأ
      throw lastError || new Error('Failed to get waybill from API and no order data provided');
    } catch (error) {
      this.handleError(error, 'Print Waybill');
    }
  }

  /**
   * إنشاء بوليصة محلية من بيانات الطلب
   * @param {Object} orderData - بيانات الطلب
   * @param {String} shipmentId - معرف الشحنة
   * @returns {Object} بيانات البوليصة
   */
  generateLocalWaybill(orderData, shipmentId) {
    const {
      orderId,
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      city,
      governorate,
      items = [],
      totalWeight = 0,
      totalValue = 0,
      shipping = 0,
      notes = '',
      createdAt
    } = orderData;

    // استخراج العنوان
    let address = '';
    let address2 = '';
    if (typeof shippingAddress === 'string') {
      try {
        const addrObj = JSON.parse(shippingAddress);
        address = addrObj.address || addrObj.address_1 || '';
        address2 = addrObj.address_2 || '';
      } catch (e) {
        address = shippingAddress;
      }
    } else if (shippingAddress && typeof shippingAddress === 'object') {
      address = shippingAddress.address || shippingAddress.address_1 || '';
      address2 = shippingAddress.address_2 || '';
    }

    // استخراج اسم المدينة
    let cityName = city || '';
    if (cityName.includes(':')) {
      const parts = cityName.split(':');
      cityName = parts[1] || parts[0];
    }

    // بيانات البوليصة
    const waybillData = {
      turboOrderCode: shipmentId,
      orderId: orderId,
      orderNumber: orderNumber,
      orderDate: createdAt || new Date().toISOString(),
      status: orderData.turboShipmentStatus || 'غير محدد',

      // المرسل (من إعدادات الشركة - يمكن إضافتها لاحقاً)
      senderName: 'غير محدد',
      senderAddress: '',
      senderCity: '',
      senderPhone: '',

      // المستلم
      receiverName: customerName || '',
      receiverPhone: customerPhone || '',
      receiverPhone2: orderData.alternativePhone || '',
      receiverEmail: customerEmail || '',
      receiverAddress: address,
      receiverAddress2: address2,
      receiverCity: cityName,
      receiverState: governorate || '',
      receiverCountry: 'Egypt',

      // الشحنة
      items: items.map(item => ({
        name: item.productName || item.name || '',
        quantity: item.quantity || 0,
        weight: item.weight || 0,
        price: item.price || 0,
        total: (item.price || 0) * (item.quantity || 0)
      })),
      itemsCount: items.length,
      totalWeight: totalWeight || 0,
      subtotal: orderData.subtotal || totalValue || 0, // قيمة المنتجات فقط
      totalValue: (orderData.total || (totalValue || 0) + (shipping || 0)), // الإجمالي مع الشحن
      shippingCost: shipping || 0,
      actualShippingCost: orderData.actualShippingCost || 0,
      amountToCollect: orderData.total || (totalValue || 0) + (shipping || 0), // المبلغ المستحق = الإجمالي
      returnAmount: 0,
      notes: notes,
      canOpen: 1
    };

    return waybillData;
  }

  /**
   * ============================================
   * Branches Methods
   * ============================================
   */

  /**
   * جلب قائمة المحافظات المتاحة من Turbo API
   * @returns {Array} قائمة المحافظات
   */
  async getGovernments() {
    try {
      // 1. Check Cache
      const now = Date.now();
      if (cache.governments.data && (now - cache.governments.timestamp < CACHE_TTL)) {
        console.log('✅ [TURBO] Returning governments from cache');
        return {
          success: true,
          governments: cache.governments.data,
          count: cache.governments.data.length,
          fromCache: true
        };
      }

      // 2. Check if API key is available
      let apiKey = null;
      try {
        apiKey = await this.getApiKey();
      } catch (error) {
        console.warn('⚠️ [TURBO] No API key available, using fallback governments list');
        return {
          success: true,
          governments: FALLBACK_GOVERNMENTS,
          count: FALLBACK_GOVERNMENTS.length,
          isFallback: true,
          reason: 'No API key configured'
        };
      }

      const headers = await this.getHeaders();

      console.log('📍 [TURBO] Getting governments list from API');

      // استخدام الـ endpoint الصحيح من Turbo API
      const endpoint = `${this.baseUrl}/get-government`;

      // استخدام GET مباشرة (Turbo API يدعم GET فقط لهذا الـ endpoint)
      console.log(`🔄 [TURBO] Using GET: ${endpoint}`);
      const response = await axios.get(
        `${endpoint}?authentication_key=${apiKey}`,
        {
          headers,
          timeout: this.timeout
        }
      );
      console.log(`✅ [TURBO] Success with GET: ${endpoint}`);

      const responseData = response.data;

      console.log('📥 [TURBO] Raw response data:', {
        hasSuccess: 'success' in responseData,
        successValue: responseData.success,
        hasFeed: !!responseData.feed,
        feedLength: responseData.feed?.length || 0
      });

      // معالجة الرد - Turbo API يرجع { success: true, feed: [...] }
      let governments = [];
      if ((responseData.success === true || responseData.success === 1) && responseData.feed) {
        governments = Array.isArray(responseData.feed) ? responseData.feed : [];
        console.log(`✅ [TURBO] Found ${governments.length} governments in feed`);
      } else if (Array.isArray(responseData)) {
        governments = responseData;
        console.log(`✅ [TURBO] Response is array with ${governments.length} items`);
      } else if (responseData.governments) {
        governments = responseData.governments;
        console.log(`✅ [TURBO] Found ${governments.length} governments in governments field`);
      } else if (responseData.governorates) {
        governments = responseData.governorates;
        console.log(`✅ [TURBO] Found ${governments.length} governments in governorates field`);
      } else if (responseData.data) {
        governments = Array.isArray(responseData.data) ? responseData.data : [];
        console.log(`✅ [TURBO] Found ${governments.length} governments in data field`);
      } else if (responseData.result) {
        governments = Array.isArray(responseData.result) ? responseData.result : [];
        console.log(`✅ [TURBO] Found ${governments.length} governments in result field`);
      } else {
        console.warn('⚠️ [TURBO] No governments found in response structure');
      }

      // تنظيف البيانات - Turbo API يرجع objects مع id و name
      const cleanedGovernments = governments.map(gov => {
        if (typeof gov === 'string') {
          return { name: gov, id: gov };
        } else if (gov.name) {
          return { name: gov.name, id: gov.id || gov.name };
        } else if (gov.government) {
          return { name: gov.government, id: gov.id || gov.government };
        } else if (gov.governorate) {
          return { name: gov.governorate, id: gov.id || gov.governorate };
        }
        return { name: String(gov), id: String(gov) };
      });

      console.log(`✅ [TURBO] Retrieved ${cleanedGovernments.length} governments`);

      // 2. Save to Cache
      if (cleanedGovernments.length > 0) {
        cache.governments = {
          data: cleanedGovernments,
          timestamp: now
        };
      }

      return {
        success: true,
        governments: cleanedGovernments,
        count: cleanedGovernments.length
      };
    } catch (error) {
      console.error(`❌ [TURBO] Error in getGovernments:`, error.message);

      // 3. Fallback to constant list if API fails (e.g. Rate Limit 429)
      console.warn('⚠️ [TURBO] Using FALLBACK governments list due to API error');
      return {
        success: true, // Return success so UI doesn't break
        governments: FALLBACK_GOVERNMENTS,
        count: FALLBACK_GOVERNMENTS.length,
        isFallback: true,
        error: error.message
      };
    }
  }

  /**
   * البحث عن محافظة مناسبة بناءً على اسم المدينة
   * @param {String} cityName - اسم المدينة
   * @param {Array} governments - قائمة المحافظات من Turbo API
   * @returns {String} اسم المحافظة الصحيح
   */
  findGovernmentByCity(cityName, governments = null) {
    if (!cityName) return 'القاهرة';

    const cleanCity = this.cleanLocationName(cityName).toLowerCase().trim();
    console.log(`🔍 [TURBO] Finding government for city: "${cityName}" (cleaned: "${cleanCity}")`);

    // إذا لم يتم تمرير قائمة المحافظات، نستخدم الـ mapping القديم
    if (!governments || governments.length === 0) {
      console.log('⚠️ [TURBO] No governments list provided, using fallback mapping');
      return this.getTurboGovernorateName(cityName);
    }

    console.log(`📍 [TURBO] Searching in ${governments.length} governments`);

    // Mapping للمدن الشائعة إلى محافظاتها
    const cityToGovernmentMap = {
      'دسوق': 'كفر الشيخ',
      'كفر الشيخ': 'كفر الشيخ',
      'طنطا': 'الغربية',
      'المحلة': 'الغربية',
      'المحلة الكبرى': 'الغربية',
      'المنصورة': 'الدقهلية',
      'الزقازيق': 'الشرقية',
      'بنها': 'القليوبية',
      'شبرا الخيمة': 'القليوبية',
      'المنيا': 'المنيا',
      'أسيوط': 'أسيوط',
      'سوهاج': 'سوهاج',
      'قنا': 'قنا',
      'الأقصر': 'الأقصر',
      'أسوان': 'أسوان',
      'الإسكندرية': 'الإسكندرية',
      'القاهرة': 'القاهرة',
      'الجيزة': 'الجيزة',
      'بورسعيد': 'بورسعيد',
      'السويس': 'السويس',
      'دمياط': 'دمياط',
      'الغردقة': 'البحر الأحمر',
      'البحر الأحمر': 'البحر الأحمر',
      'الفيوم': 'الفيوم',
      'بني سويف': 'بني سويف',
      'الإسماعيلية': 'الإسماعيلية'
    };

    // البحث في الـ mapping أولاً
    for (const [city, gov] of Object.entries(cityToGovernmentMap)) {
      const cityLower = city.toLowerCase();
      if (cleanCity === cityLower || cleanCity.includes(cityLower) || cityLower.includes(cleanCity)) {
        console.log(`✅ [TURBO] Found city mapping: "${city}" -> "${gov}"`);
        // التحقق من وجود هذه المحافظة في قائمة Turbo
        const foundGov = governments.find(g => {
          const govNameLower = g.name.toLowerCase();
          return govNameLower === gov.toLowerCase() ||
            govNameLower.includes(gov.toLowerCase()) ||
            gov.toLowerCase().includes(govNameLower);
        });
        if (foundGov) {
          console.log(`✅ [TURBO] Matched government: "${foundGov.name}"`);
          return foundGov.name;
        } else {
          console.log(`⚠️ [TURBO] Government "${gov}" not found in Turbo list`);
        }
      }
    }

    // البحث المباشر في قائمة المحافظات (مطابقة كاملة أولاً)
    for (const gov of governments) {
      const govName = gov.name.toLowerCase();
      if (govName === cleanCity) {
        console.log(`✅ [TURBO] Exact match found: "${gov.name}"`);
        return gov.name;
      }
    }

    // البحث الجزئي في قائمة المحافظات
    for (const gov of governments) {
      const govName = gov.name.toLowerCase();
      if (govName.includes(cleanCity) || cleanCity.includes(govName)) {
        console.log(`✅ [TURBO] Partial match found: "${gov.name}"`);
        return gov.name;
      }
    }

    // البحث بالكلمات
    const cityWords = cleanCity.split(' ').filter(w => w.length > 2);
    for (const gov of governments) {
      const govName = gov.name.toLowerCase();
      for (const word of cityWords) {
        if (govName.includes(word)) {
          console.log(`✅ [TURBO] Word match found: "${gov.name}" (matched word: "${word}")`);
          return gov.name;
        }
      }
    }

    // إذا لم نجد، نستخدم الـ mapping القديم
    console.log(`⚠️ [TURBO] No match found, using fallback mapping`);
    return this.getTurboGovernorateName(cityName);
  }

  /**
   * جلب قائمة المناطق/المدن بناءً على المحافظة
   * @param {Number|String} governmentId - معرف المحافظة
   * @returns {Array} قائمة المناطق
   */
  async getAreas(governmentId) {
    try {
      if (!governmentId) {
        throw new Error('Government ID is required');
      }

      const govId = String(governmentId);

      // 1. Check Cache
      const now = Date.now();
      if (cache.areas[govId] && cache.areas[govId].data && (now - cache.areas[govId].timestamp < CACHE_TTL)) {
        console.log(`✅ [TURBO] Returning areas for gov ${govId} from cache`);
        return {
          success: true,
          areas: cache.areas[govId].data,
          count: cache.areas[govId].data.length,
          fromCache: true
        };
      }

      const headers = await this.getHeaders();
      const apiKey = await this.getApiKey();

      console.log(`📍 [TURBO] Getting areas for government ID: ${governmentId}`);

      const endpoint = `${this.baseUrl}/get-area/${governmentId}`;

      // استخدام GET مباشرة (Turbo API يدعم GET فقط لهذا الـ endpoint)
      console.log(`🔄 [TURBO] Using GET: ${endpoint}`);
      const response = await axios.get(
        `${endpoint}?authentication_key=${apiKey}`,
        {
          headers,
          timeout: this.timeout
        }
      );
      console.log(`✅ [TURBO] Success with GET: ${endpoint}`);

      const responseData = response.data;

      console.log('📥 [TURBO] Raw areas response data:', {
        hasSuccess: 'success' in responseData,
        successValue: responseData.success,
        hasFeed: !!responseData.feed,
        feedLength: responseData.feed?.length || 0
      });

      // معالجة الرد - Turbo API يرجع { success: true, feed: [...] }
      let areas = [];
      if ((responseData.success === true || responseData.success === 1) && responseData.feed) {
        areas = Array.isArray(responseData.feed) ? responseData.feed : [];
        console.log(`✅ [TURBO] Found ${areas.length} areas in feed`);
      } else if (Array.isArray(responseData)) {
        areas = responseData;
        console.log(`✅ [TURBO] Response is array with ${areas.length} items`);
      } else if (responseData.areas) {
        areas = responseData.areas;
        console.log(`✅ [TURBO] Found ${areas.length} areas in areas field`);
      } else if (responseData.data) {
        areas = Array.isArray(responseData.data) ? responseData.data : [];
        console.log(`✅ [TURBO] Found ${areas.length} areas in data field`);
      } else {
        console.warn('⚠️ [TURBO] No areas found in response structure');
      }

      // تنظيف البيانات - Turbo API يرجع objects مع id و name
      const cleanedAreas = areas.map(area => {
        if (typeof area === 'string') {
          return { name: area, id: area };
        } else if (area.name) {
          return { name: area.name, id: area.id || area.name };
        }
        return { name: String(area), id: String(area) };
      });

      console.log(`✅ [TURBO] Retrieved ${cleanedAreas.length} areas for government ${governmentId}`);

      // 2. Save to Cache
      // Save even if empty, but maybe short TTL if empty logic is needed? For now simple cache.
      cache.areas[govId] = {
        data: cleanedAreas,
        timestamp: now
      };

      return {
        success: true,
        areas: cleanedAreas,
        count: cleanedAreas.length
      };
    } catch (error) {
      console.error(`❌ [TURBO] Error in getAreas:`, error.message);
      // Graceful failure - return empty list instead of throwing
      console.warn(`⚠️ [TURBO] Failed to fetch areas for ${governmentId}, returning empty list`);
      return {
        success: true, // Graceful failure
        areas: [],
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * جلب فروع Turbo المتاحة
   * @param {String} city - المدينة (اختياري)
   * @param {String} governorate - المحافظة (اختياري)
   * @returns {Array} قائمة الفروع
   */
  async getBranches(city = null, governorate = null) {
    try {
      const headers = await this.getHeaders();

      const params = {};
      if (city) params.city = city;
      if (governorate) params.governorate = governorate;

      console.log('📍 [TURBO] Getting branches:', params);

      const response = await axios.get(
        `${this.baseUrl}/branches`,
        {
          headers,
          params,
          timeout: this.timeout
        }
      );

      const branches = response.data.branches || response.data || [];

      return {
        success: true,
        branches: branches.map(branch => ({
          id: branch.id || branch.branch_id,
          name: branch.name,
          address: branch.address,
          city: branch.city,
          governorate: branch.governorate,
          phone: branch.phone,
          workingHours: branch.working_hours || branch.workingHours,
          isActive: branch.is_active !== false
        })),
        count: branches.length
      };
    } catch (error) {
      this.handleError(error, 'Get Branches');
    }
  }

  /**
   * ============================================
   * Return Management Methods
   * ============================================
   */

  /**
   * إنشاء طلب إرجاع
   * @param {Object} returnData - بيانات الإرجاع
   * @returns {Object} معلومات الإرجاع
   */
  async createReturn(returnData) {
    try {
      const headers = await this.getHeaders();

      const {
        originalShipmentId,
        returnReason,
        returnAddress,
        items
      } = returnData;

      const returnRequest = {
        original_shipment_id: originalShipmentId,
        reason: returnReason,
        return_address: returnAddress,
        items: items || []
      };

      console.log('🔄 [TURBO] Creating return request:', originalShipmentId);

      const response = await axios.post(
        `${this.baseUrl}/returns`,
        returnRequest,
        {
          headers,
          timeout: this.timeout
        }
      );

      const returnInfo = response.data;

      console.log('✅ [TURBO] Return request created:', returnInfo.return_id);

      return {
        success: true,
        returnId: returnInfo.return_id || returnInfo.id,
        trackingNumber: returnInfo.tracking_number,
        status: returnInfo.status || 'created',
        data: returnInfo
      };
    } catch (error) {
      this.handleError(error, 'Create Return');
    }
  }

  /**
   * ============================================
   * Webhook Methods
   * ============================================
   */

  /**
   * إعداد webhook للتحديثات
   * @param {String} webhookUrl - رابط webhook
   * @param {Array} events - الأحداث المطلوب الاشتراك فيها
   * @returns {Object} معلومات webhook
   */
  async configureWebhook(webhookUrl, events = ['shipment.status.updated', 'shipment.delivered']) {
    try {
      const headers = await this.getHeaders();

      const webhookData = {
        url: webhookUrl,
        events: events
      };

      console.log('🔔 [TURBO] Configuring webhook:', webhookUrl);

      const response = await axios.post(
        `${this.baseUrl}/webhooks`,
        webhookData,
        {
          headers,
          timeout: this.timeout
        }
      );

      const webhook = response.data;

      return {
        success: true,
        webhookId: webhook.id || webhook.webhook_id,
        url: webhook.url,
        events: webhook.events,
        data: webhook
      };
    } catch (error) {
      this.handleError(error, 'Configure Webhook');
    }
  }

  /**
   * ============================================
   * Helper Methods
   * ============================================
   */

  /**
   * حساب الوزن الإجمالي للعناصر
   */
  calculateTotalWeight(items) {
    if (!items || items.length === 0) {
      return 1; // وزن افتراضي 1 كيلو
    }

    return items.reduce((total, item) => {
      const weight = item.weight || 0.5; // وزن افتراضي 0.5 كيلو لكل عنصر
      return total + (weight * (item.quantity || 1));
    }, 0);
  }

  /**
   * تحويل بيانات الطلب لصيغة Turbo
   */
  formatOrderForTurbo(order, customer, items) {
    // استخراج المحافظة من shippingAddress
    let governorate = order.city; // Fallback
    let shippingAddrObj = {};

    console.log('🔍 [TURBO] formatOrderForTurbo - order.shippingAddress type:', typeof order.shippingAddress);
    console.log('🔍 [TURBO] formatOrderForTurbo - order.city:', order.city);

    try {
      // محاولة استخراج من shippingAddress
      if (order.shippingAddress) {
        if (typeof order.shippingAddress === 'string') {
          shippingAddrObj = JSON.parse(order.shippingAddress);
          console.log('🔍 [TURBO] Parsed shippingAddress (string):', shippingAddrObj);
        } else if (typeof order.shippingAddress === 'object') {
          shippingAddrObj = order.shippingAddress;
          console.log('🔍 [TURBO] Using shippingAddress (object):', shippingAddrObj);
        }
      }

      // إذا وُجدت المحافظة في shippingAddress، استخدمها
      if (shippingAddrObj.governorate) {
        governorate = shippingAddrObj.governorate;
        console.log('✅ [TURBO] Found governorate in shippingAddress:', governorate);
      } else {
        console.log('⚠️ [TURBO] No governorate found in shippingAddress, using city as fallback:', order.city);
      }
    } catch (e) {
      // إذا فشل التحليل، استخدم city كـ fallback
      console.warn('⚠️ [TURBO] Failed to parse shippingAddress for governorate:', e.message);
    }

    console.log('✅ [TURBO] Final governorate for shipment:', governorate);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: customer?.firstName && customer?.lastName
        ? `${customer.firstName} ${customer.lastName}`
        : order.customerName || customer?.name || 'Unknown',
      customerPhone: order.customerPhone || customer?.phone,
      customerEmail: order.customerEmail || customer?.email,
      shippingAddress: order.shippingAddress || order.customerAddress,
      city: order.city,
      governorate: governorate, // استخراج المحافظة من shippingAddress
      items: items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: parseFloat(item.price),
        total: parseFloat(item.total),
        weight: item.weight || 0.5
      })),
      totalWeight: this.calculateTotalWeight(items),
      subtotal: parseFloat(order.subtotal || 0), // قيمة المنتجات فقط
      shipping: parseFloat(order.shipping || 0), // تكلفة الشحن
      totalValue: parseFloat(order.total || 0), // الإجمالي (subtotal + shipping)
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      createdAt: order.createdAt || new Date().toISOString(),
      alternativePhone: order.alternativePhone || null,
      turboShipmentStatus: order.turboShipmentStatus || null,
      actualShippingCost: null // سيتم ملؤه لاحقاً من metadata
    };
  }

  /**
   * إضافة تذكرة دعم إلى Turbo
   * @param {string} description - وصف التذكرة
   * @param {number} type - نوع التذكرة (1: inquiry, 2: complain, 3: GRATITUDE, 4: SUGGESTION)
   * @param {number} inquiryTypeId - معرف نوع الاستفسار (مطلوب إذا type = 1)
   * @param {number} complaintTypeId - معرف نوع الشكوى (مطلوب إذا type = 2)
   * @param {number} complaintTypeTitleId - معرف عنوان الشكوى (مطلوب إذا type = 2)
   * @param {number} entityId - معرف الكيان (مطلوب إذا type = 2)
   * @returns {Promise<Object>} نتيجة إضافة التذكرة
   */
  async addTicket(description, type = 3, inquiryTypeId = null, complaintTypeId = null, complaintTypeTitleId = null, entityId = null) {
    try {
      const apiKey = await this.getApiKey();
      const headers = await this.getHeaders();

      const ticketData = {
        authentication_key: apiKey,
        description: description,
        type: type
      };

      // type 1 (inquiry) requires inquiry_type_id
      if (type === 1 && inquiryTypeId) {
        ticketData.inquiry_type_id = inquiryTypeId;
      }

      // type 2 (complain) requires complaint_type_id, complaint_type_title_id, entity_id
      if (type === 2) {
        if (complaintTypeId) {
          ticketData.complaint_type_id = complaintTypeId;
        }
        if (complaintTypeTitleId) {
          ticketData.complaint_type_title_id = complaintTypeTitleId;
        }
        if (entityId) {
          ticketData.entity_id = entityId;
        }
      }

      console.log('🎫 [TURBO] Adding ticket:', {
        type,
        inquiryTypeId,
        complaintTypeId,
        description: description.substring(0, 50) + '...'
      });

      const response = await axios.post(
        `${this.baseUrl}/add-ticket`,
        ticketData,
        { headers, timeout: this.timeout }
      );

      const result = response.data;

      if (result.success === 0 || result.success === false) {
        const errorMsg = result.error_msg || result.message || 'Unknown error';
        console.error('❌ [TURBO] Add Ticket failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Ticket added successfully:', result);
      return {
        success: true,
        ticketId: result.ticket_id || result.id || result.code,
        message: result.message || 'تم إضافة التذكرة بنجاح',
        data: result
      };
    } catch (error) {
      this.handleError(error, 'Add Ticket');
      return {
        success: false,
        error: error.message,
        message: 'فشل في إضافة التذكرة'
      };
    }
  }

  /**
   * جلب أنواع الاستفسارات من Turbo
   * @returns {Promise<Object>} قائمة أنواع الاستفسارات
   */
  async getInquiriesTypes() {
    try {
      const apiKey = await this.getApiKey();
      const headers = await this.getHeaders();

      const requestData = {
        authentication_key: apiKey
      };

      console.log('🔍 [TURBO] Getting inquiries types');

      // Try POST first, then GET if POST fails
      let response;
      try {
        response = await axios.post(
          `${this.baseUrl}/inquiries-types`,
          requestData,
          { headers, timeout: this.timeout }
        );
      } catch (postError) {
        if (postError.response?.status === 404 || postError.response?.status === 405) {
          // Try GET method
          console.log('🔄 [TURBO] Trying GET method for inquiries-types');
          try {
            response = await axios.get(
              `${this.baseUrl}/inquiries-types?authentication_key=${apiKey}`,
              { headers, timeout: this.timeout }
            );
          } catch (getError) {
            // إذا فشل GET أيضاً مع 404، نعيد قائمة فارغة
            if (getError.response?.status === 404) {
              console.log('⚠️ [TURBO] Inquiries-types endpoint not found (404), returning empty list');
              return {
                success: true,
                types: [],
                message: 'لا توجد أنواع استفسارات متاحة',
                data: null
              };
            }
            throw getError;
          }
        } else {
          throw postError;
        }
      }

      const result = response.data;

      if (result.success === 0 || result.success === false) {
        const errorMsg = result.error_msg || result.message || 'Unknown error';
        console.error('❌ [TURBO] Get Inquiries Types failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Inquiries types retrieved successfully');
      return {
        success: true,
        types: result.types || result.data || result.feed || [],
        message: result.message || 'تم جلب أنواع الاستفسارات بنجاح',
        data: result
      };
    } catch (error) {
      // إذا كان الخطأ 404، نعيد قائمة فارغة بدلاً من خطأ
      if (error.response?.status === 404) {
        console.log('⚠️ [TURBO] Inquiries-types endpoint not found (404), returning empty list');
        return {
          success: true,
          types: [],
          message: 'لا توجد أنواع استفسارات متاحة',
          data: null
        };
      }

      this.handleError(error, 'Get Inquiries Types');
      return {
        success: false,
        error: error.message,
        message: 'فشل في جلب أنواع الاستفسارات',
        types: []
      };
    }
  }

  /**
   * جلب قائمة التذاكر من Turbo
   * @param {number} page - رقم الصفحة
   * @param {number} perPage - عدد التذاكر في الصفحة
   * @returns {Promise<Object>} قائمة التذاكر
   */
  async getTickets(page = 1, perPage = 10) {
    try {
      const apiKey = await this.getApiKey();
      const headers = await this.getHeaders();

      console.log('🎫 [TURBO] Getting tickets:', { page, perPage });

      // Turbo API requires authentication_key in query params
      const response = await axios.get(
        `${this.baseUrl}/tickets?per_page=${perPage}&page=${page}&authentication_key=${apiKey}`,
        {
          headers,
          timeout: this.timeout
        }
      );

      const result = response.data;

      // التحقق من success: true أو success: 1
      const isSuccess = result.success === 1 || result.success === true;
      if (!isSuccess && result.success !== undefined) {
        const errorMsg = result.error_msg || result.message || 'Unknown error';
        console.error('❌ [TURBO] Get Tickets failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Tickets retrieved successfully');

      // Extract tickets from Turbo response structure
      const tickets = result.feed?.data || result.tickets || result.data || [];
      const pagination = result.feed || result.pagination || {
        current_page: page,
        per_page: perPage,
        total: tickets.length,
        last_page: Math.ceil(tickets.length / perPage)
      };

      console.log(`📊 [TURBO] Found ${tickets.length} tickets in response`);

      return {
        success: true,
        tickets: tickets,
        pagination: {
          page: pagination.current_page || page,
          perPage: pagination.per_page || perPage,
          total: pagination.total || tickets.length,
          lastPage: pagination.last_page || Math.ceil((pagination.total || tickets.length) / perPage)
        },
        message: result.message || 'تم جلب التذاكر بنجاح',
        data: result
      };
    } catch (error) {
      // إذا كان الخطأ 404، نعيد قيم افتراضية بدلاً من خطأ
      if (error.response?.status === 404) {
        console.log('⚠️ [TURBO] Tickets endpoint not found (404), returning empty list');
        return {
          success: true,
          tickets: [],
          pagination: { page, perPage, total: 0, lastPage: 0 },
          message: 'لا توجد تذاكر متاحة',
          data: null
        };
      }

      this.handleError(error, 'Get Tickets');
      return {
        success: false,
        error: error.message,
        message: 'فشل في جلب التذاكر',
        tickets: [],
        pagination: { page, perPage: 10, total: 0 }
      };
    }
  }

  /**
   * جلب تفاصيل تذكرة معينة من Turbo
   * @param {number|string} ticketId - معرف التذكرة
   * @returns {Promise<Object>} تفاصيل التذكرة
   */
  async getTicket(ticketId) {
    try {
      const apiKey = await this.getApiKey();
      const headers = await this.getHeaders();

      console.log('🎫 [TURBO] Getting ticket:', ticketId);

      // Turbo API requires authentication_key in query params for GET requests
      const response = await axios.get(
        `${this.baseUrl}/tickets/${ticketId}?authentication_key=${encodeURIComponent(apiKey)}`,
        {
          headers,
          timeout: this.timeout
        }
      );

      const result = response.data;

      if (result.success === 0 || result.success === false) {
        const errorMsg = result.error_msg || result.message || 'Unknown error';
        console.error('❌ [TURBO] Get Ticket failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Ticket retrieved successfully');

      // Extract ticket from Turbo response structure
      // Turbo API returns: { success: 1, feed: { id, description, replies: [...], ... } }
      // So feed IS the ticket, not feed.ticket
      // Messages are in feed.replies, not feed.messages
      const ticket = result.feed || result.ticket || result.data || null;

      if (ticket) {
        // Convert replies to messages for consistency
        if (ticket.replies && Array.isArray(ticket.replies)) {
          ticket.messages = ticket.replies;
        }
        console.log(`🎫 [TURBO] Ticket #${ticket.id} found with ${ticket.messages?.length || ticket.replies?.length || 0} messages/replies`);
      }

      return {
        success: true,
        ticket: ticket,
        message: result.message || 'تم جلب التذكرة بنجاح',
        data: result
      };
    } catch (error) {
      this.handleError(error, 'Get Ticket');
      return {
        success: false,
        error: error.message,
        message: 'فشل في جلب التذكرة',
        ticket: null
      };
    }
  }

  /**
   * جلب سجل التذكرة من Turbo
   * @param {number|string} ticketId - معرف التذكرة
   * @returns {Promise<Object>} سجل التذكرة
   */
  async getTicketLog(ticketId) {
    try {
      const apiKey = await this.getApiKey();
      const headers = await this.getHeaders();

      console.log('📋 [TURBO] Getting ticket log:', ticketId);

      // Turbo API requires authentication_key in query params for GET requests
      const response = await axios.get(
        `${this.baseUrl}/tickets/log/${ticketId}?authentication_key=${encodeURIComponent(apiKey)}`,
        {
          headers,
          timeout: this.timeout
        }
      );

      const result = response.data;

      if (result.success === 0 || result.success === false) {
        const errorMsg = result.error_msg || result.message || 'Unknown error';
        console.error('❌ [TURBO] Get Ticket Log failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Ticket log retrieved successfully');
      // Turbo API returns: { success: 1, feed: [{ description, created_at, user: {...} }, ...] }
      // feed IS the logs array, not feed.logs
      const logs = Array.isArray(result.feed) ? result.feed : (result.logs || result.data || []);

      return {
        success: true,
        ticket: result.feed || result.data || null,
        logs: logs,
        message: result.message || 'تم جلب سجل التذكرة بنجاح',
        data: result
      };
    } catch (error) {
      this.handleError(error, 'Get Ticket Log');
      return {
        success: false,
        error: error.message,
        message: 'فشل في جلب سجل التذكرة',
        ticket: null,
        logs: []
      };
    }
  }

  /**
   * الرد على تذكرة في Turbo
   * @param {number|string} ticketId - معرف التذكرة
   * @param {string} message - نص الرسالة
   * @param {Object} imageFile - ملف الصورة (اختياري) { buffer, originalname, mimetype, size }
   * @returns {Promise<Object>} نتيجة الرد
   */
  async replyToTicket(ticketId, message, imageFile = null) {
    try {
      const apiKey = await this.getApiKey();

      console.log('💬 [TURBO] Replying to ticket:', ticketId);

      // إنشاء FormData
      const formData = new FormData();
      formData.append('ticket_id', String(ticketId));
      formData.append('message', message);
      formData.append('authentication_key', apiKey); // Turbo API requires authentication_key in FormData body

      // إضافة الصورة إذا كانت موجودة
      if (imageFile && imageFile.buffer) {
        formData.append('image', imageFile.buffer, {
          filename: imageFile.originalname || 'image.jpg',
          contentType: imageFile.mimetype || 'image/jpeg'
        });
      }

      // إعداد headers (بدون Content-Type - سيتم تعيينه تلقائياً من FormData)
      // لا نحتاج authentication_key في header، فقط في FormData body
      const requestHeaders = {
        ...formData.getHeaders()
      };

      const response = await axios.post(
        `${this.baseUrl}/tickets/reply`,
        formData,
        {
          headers: requestHeaders,
          timeout: this.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const result = response.data;

      if (result.success === 0 || result.success === false) {
        const errorMsg = result.error_msg || result.message || 'Unknown error';
        console.error('❌ [TURBO] Reply Ticket failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Ticket reply sent successfully');
      return {
        success: true,
        message: result.message || 'تم إرسال الرد بنجاح',
        data: result
      };
    } catch (error) {
      this.handleError(error, 'Reply Ticket');
      return {
        success: false,
        error: error.message,
        message: 'فشل في إرسال الرد'
      };
    }
  }

  /**
   * جلب عدد التذاكر غير المقروءة من Turbo
   * @returns {Promise<Object>} عدد التذاكر غير المقروءة
   */
  async getUnreadTicketsCount() {
    try {
      const apiKey = await this.getApiKey();
      const headers = await this.getHeaders();

      console.log('🔔 [TURBO] Getting unread tickets count');

      // Turbo API requires authentication_key in query params for GET requests
      const response = await axios.get(
        `${this.baseUrl}/tickets/unreaded_tickets?authentication_key=${encodeURIComponent(apiKey)}`,
        {
          headers,
          timeout: this.timeout
        }
      );

      const result = response.data;

      if (result.success === 0 || result.success === false) {
        const errorMsg = result.error_msg || result.message || 'Unknown error';
        console.error('❌ [TURBO] Get Unread Tickets Count failed:', errorMsg);
        throw new Error(`Turbo API error: ${errorMsg}`);
      }

      console.log('✅ [TURBO] Unread tickets count retrieved successfully');
      return {
        success: true,
        counts: result.feed || result.data || { tickets: 0, missions: 0, orders: 0 },
        message: result.message || 'تم جلب عدد التذاكر غير المقروءة بنجاح',
        data: result
      };
    } catch (error) {
      // إذا كان الخطأ 404، نعيد قيم افتراضية بدلاً من خطأ
      if (error.response?.status === 404) {
        console.log('⚠️ [TURBO] Unread tickets count endpoint not found (404), returning default counts');
        return {
          success: true,
          counts: { tickets: 0, missions: 0, orders: 0 },
          message: 'لا توجد تذاكر غير مقروءة',
          data: null
        };
      }

      this.handleError(error, 'Get Unread Tickets Count');
      return {
        success: false,
        error: error.message,
        message: 'فشل في جلب عدد التذاكر غير المقروءة',
        counts: { tickets: 0, missions: 0, orders: 0 }
      };
    }
  }
}

module.exports = TurboService;



const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Shipping Service for AI Agent
 * يوفر معلومات الشحن للذكاء الاصطناعي
 */

class ShippingService {
  /**
   * البحث عن معلومات الشحن بناءً على المحافظة
   * @param {string} governorate - اسم المحافظة
   * @param {string} companyId - معرف الشركة
   * @returns {Object} معلومات الشحن أو null
   */
  async findShippingInfo(governorate, companyId) {
    try {
      if (!governorate || !companyId) {
        console.log('⚠️ [SHIPPING] Missing governorate or companyId');
        return null;
      }

      // تنظيف اسم المحافظة
      const normalizedInput = this.normalizeGovernorate(governorate);
      console.log(`🔍 [SHIPPING] البحث عن شحن للمحافظة: "${governorate}" (normalized: "${normalizedInput}")`);

      // جلب جميع مناطق الشحن النشطة للشركة
      const zones = await safeQuery(async () => {
        return await getSharedPrismaClient().shippingZone.findMany({
          where: {
            companyId,
            isActive: true
          }
        });
      }, 3);

      console.log(`📦 [SHIPPING] تم العثور على ${zones.length} منطقة شحن نشطة`);

      // البحث عن المنطقة المطابقة
      const matchedZone = zones.find(zone => {
        const governorates = zone.governorates;
        return governorates.some(gov => {
          const normalizedGov = this.normalizeGovernorate(gov);
          return normalizedGov === normalizedInput;
        });
      });

      if (matchedZone) {
        console.log(`✅ [SHIPPING] تم العثور على معلومات الشحن:`, {
          price: matchedZone.price,
          deliveryTime: matchedZone.deliveryTime
        });

        return {
          found: true,
          zoneId: matchedZone.id,
          price: parseFloat(matchedZone.price),
          deliveryTime: matchedZone.deliveryTime,
          governorate: matchedZone.governorates[0] // الاسم الرسمي للمحافظة
        };
      }

      console.log(`❌ [SHIPPING] لم يتم العثور على معلومات شحن للمحافظة: ${governorate}`);
      return {
        found: false,
        price: null,
        deliveryTime: null,
        governorate: null
      };
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في البحث عن معلومات الشحن:', error);
      return null;
    }
  }

  /**
   * استخراج اسم المحافظة من رسالة العميل أو المحادثة السابقة
   * @param {string} message - رسالة العميل الحالية
   * @param {string} companyId - معرف الشركة
   * @param {Array} conversationMemory - سجل المحادثة (اختياري)
   * @returns {Object} معلومات المحافظة المستخرجة
   */
  async extractGovernorateFromMessage(message, companyId, conversationMemory = null) {
    try {
      if (!companyId) {
        return { found: false, governorate: null };
      }

      // جلب جميع المحافظات المتاحة
      const zones = await safeQuery(async () => {
        return await getSharedPrismaClient().shippingZone.findMany({
          where: {
            companyId,
            isActive: true
          }
        });
      }, 3);

      // استخراج جميع أسماء المحافظات
      const allGovernorates = [];
      zones.forEach(zone => {
        if (zone.governorates && Array.isArray(zone.governorates)) {
          allGovernorates.push(...zone.governorates);
        }
      });

      // ✅ FIX: البحث في الرسالة الحالية أولاً
      if (message && message.trim().length > 0) {
        const normalizedMessage = this.normalizeGovernorate(message);
        
        for (const gov of allGovernorates) {
          const normalizedGov = this.normalizeGovernorate(gov);
          // ✅ FIX: تحسين المطابقة - البحث عن المحافظة ككلمة كاملة أو جزء من الرسالة
          if (normalizedMessage.includes(normalizedGov) || normalizedGov.includes(normalizedMessage.trim())) {
            console.log(`✅ [SHIPPING] تم استخراج المحافظة من الرسالة الحالية: ${gov}`);
            return {
              found: true,
              governorate: gov,
              normalizedGovernorate: normalizedGov,
              source: 'current_message'
            };
          }
        }
      }

      // ✅ FIX: البحث في المحادثة السابقة إذا لم يتم العثور في الرسالة الحالية
      if (conversationMemory && Array.isArray(conversationMemory) && conversationMemory.length > 0) {
        console.log(`🔍 [SHIPPING] البحث في المحادثة السابقة (${conversationMemory.length} رسالة)...`);
        
        // البحث من الأحدث للأقدم
        for (let i = conversationMemory.length - 1; i >= 0; i--) {
          const msg = conversationMemory[i];
          if (msg && msg.content && typeof msg.content === 'string') {
            const normalizedMsg = this.normalizeGovernorate(msg.content);
            
            for (const gov of allGovernorates) {
              const normalizedGov = this.normalizeGovernorate(gov);
              // ✅ FIX: تحسين المطابقة - البحث عن المحافظة ككلمة كاملة
              if (normalizedMsg.includes(normalizedGov) || normalizedGov.includes(normalizedMsg.trim())) {
                console.log(`✅ [SHIPPING] تم استخراج المحافظة من المحادثة السابقة: ${gov} (من رسالة ${i + 1})`);
                return {
                  found: true,
                  governorate: gov,
                  normalizedGovernorate: normalizedGov,
                  source: 'conversation_memory'
                };
              }
            }
          }
        }
      }

      console.log(`❌ [SHIPPING] لم يتم العثور على محافظة في الرسالة أو المحادثة`);
      return { found: false, governorate: null };
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في استخراج المحافظة:', error);
      return { found: false, governorate: null };
    }
  }

  /**
   * الحصول على قائمة بجميع المحافظات المتاحة
   * @param {string} companyId - معرف الشركة
   * @returns {Array} قائمة المحافظات
   */
  async getAvailableGovernorates(companyId) {
    try {
      const zones = await safeQuery(async () => {
        return await getSharedPrismaClient().shippingZone.findMany({
          where: {
            companyId,
            isActive: true
          }
        });
      }, 3);

      const governorates = [];
      zones.forEach(zone => {
        if (zone.governorates && Array.isArray(zone.governorates)) {
          // أخذ الاسم الأول فقط من كل منطقة (الاسم الرسمي)
          if (zone.governorates.length > 0) {
            governorates.push({
              name: zone.governorates[0],
              price: parseFloat(zone.price),
              deliveryTime: zone.deliveryTime
            });
          }
        }
      });

      return governorates;
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في جلب المحافظات:', error);
      return [];
    }
  }

  /**
   * تنظيف وتوحيد اسم المحافظة
   * @param {string} governorate - اسم المحافظة
   * @returns {string} الاسم المنظف
   */
  normalizeGovernorate(governorate) {
    if (!governorate) return '';
    
    return governorate
      .trim()
      .toLowerCase()
      .replace(/محافظة/g, '')
      .replace(/محافظه/g, '')
      .replace(/ال/g, '')
      .replace(/أ/g, 'ا')
      .replace(/إ/g, 'ا')
      .replace(/آ/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * فحص إذا كان العميل يسأل عن الشحن
   * @param {string} message - رسالة العميل
   * @returns {boolean}
   */
  isAskingAboutShipping(message) {
    if (!message) return false;

    const shippingKeywords = [
      'شحن',
      'توصيل',
      'مصاريف',
      'كام الشحن',
      'سعر الشحن',
      'تكلفة الشحن',
      'هيوصل امتى',
      'مدة التوصيل',
      'كام يوم',
      'shipping',
      'delivery'
    ];

    const normalizedMessage = message.toLowerCase();
    return shippingKeywords.some(keyword => normalizedMessage.includes(keyword));
  }

  /**
   * بناء رد تلقائي عن الشحن
   * @param {Object} shippingInfo - معلومات الشحن
   * @param {string} governorate - اسم المحافظة
   * @returns {string}
   */
  buildShippingResponse(shippingInfo, governorate) {
    if (!shippingInfo || !shippingInfo.found) {
      return `عذراً، للأسف مش عندنا شحن متاح لمحافظة ${governorate} حالياً. ممكن تتواصل معانا على الخاص علشان نشوف حل ليك؟ 🙏`;
    }

    return `الشحن لمحافظة ${shippingInfo.governorate}:\n💰 السعر: ${shippingInfo.price} جنيه\n⏰ مدة التوصيل: ${shippingInfo.deliveryTime}`;
  }
}

module.exports = new ShippingService();


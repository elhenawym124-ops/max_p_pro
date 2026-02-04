/**
 * Order Processor Module
 * 
 * هذا الـ module مسؤول عن معالجة الطلبات: كشف التأكيد، استخراج البيانات، التحقق من الاكتمال
 * تم نقله من aiAgentService.js لتسهيل الصيانة
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const memoryService = require('../memoryService');

class OrderProcessor {
  constructor(aiAgentService) {
    this.prisma = getSharedPrismaClient();
    // ✅ حفظ reference لـ aiAgentService للوصول للدوال المساعدة
    this.aiAgentService = aiAgentService;
  }

  /**
   * Process Order in Single-Pass (Extraction + Generation + Creation)
   * 
   * @param {string} message - Current customer message
   * @param {Array} conversationMemory - Conversation history
   * @param {Object} customerData - Customer data
   * @param {string} companyId - Company ID
   * @param {Object} companyPrompts - Company personality/prompts
   * @returns {Promise<Object>} - { order, status, response, missingFields }
   */
  async processOrderSinglePass(message, conversationMemory, customerData, companyId, companyPrompts) {
    try {
      console.log('🚀 [ORDER-SINGLE-PASS] Starting Single-Pass Order Processing...');

      // 1. Fast Regex Extraction (Pre-processing)
      const regexData = this.extractCustomerDataFromMessage(message);
      console.log('🔍 [ORDER-SINGLE-PASS] Regex Hints:', JSON.stringify(regexData, null, 2));

      // 2. Build History Text
      const historyText = conversationMemory.slice(-10).map(m =>
        `${m.isFromCustomer ? 'العميل' : 'النظام'}: ${m.content || m.userMessage || m.aiResponse || ''}`
      ).join('\n');

      // 3. Construct Single-Pass Prompt
      const prompt = this._buildSinglePassPrompt(
        message,
        historyText,
        regexData,
        customerData,
        companyPrompts
      );

      // 4. Call AI (One Shot)
      const aiResponse = await this.aiAgentService.generateAIResponse(
        prompt,
        [], // No RAG needed here
        false,
        null,
        companyId,
        null,
        { messageType: 'order_processing' }
      );

      // 5. Parse & Validate Result
      const result = this._parseAIResponse(aiResponse);

      if (!result) {
        throw new Error('Failed to parse Single-Pass Order response');
      }

      console.log('✅ [ORDER-SINGLE-PASS] AI Result:', JSON.stringify(result, null, 2));

      // 6. Post-Processing & Execution
      if (result.order) {
        // Sanitize Phone
        if (regexData.customerPhone && (!result.order.customerPhone || result.order.customerPhone.length < 10)) {
          result.order.customerPhone = regexData.customerPhone;
        }
      }

      // 7. Handle Order Creation
      if (result.status === 'confirmed' && result.order) {
        console.log('📦 [ORDER-SINGLE-PASS] Status is CONFIRMED. Creating order...');
        const creationResult = await this._createOrderInDb(result.order, customerData, companyId);

        if (creationResult.success) {
          result.response = creationResult.message; // Override AI response with accurate success message
          result.orderCreated = creationResult.order;
        } else {
          result.status = 'error';
          result.response = 'عذراً، حدث خطأ أثناء تسجيل الطلب. يرجى المحاولة مرة أخرى.';
        }
      }

      return result;

    } catch (error) {
      console.error('❌ [ORDER-SINGLE-PASS] Error:', error);
      return {
        status: 'error',
        response: null,
        error: error.message
      };
    }
  }

  /**
   * Helper: Create Order in DB
   */
  async _createOrderInDb(orderData, customerData, companyId) {
    try {
      const EnhancedOrderService = require('../enhancedOrderService');
      const enhancedOrderService = new EnhancedOrderService();
      const ShippingService = require('../shippingService');

      // Basic defaults
      const finalOrder = {
        productName: orderData.items?.[0]?.product || 'منتج غير محدد',
        productColor: orderData.items?.[0]?.color || 'غير محدد',
        productSize: orderData.items?.[0]?.size || 'غير محدد',
        productPrice: 0, // Should be fetched from DB or context, simpler for now
        quantity: orderData.items?.[0]?.quantity || 1,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        city: orderData.city,
        companyId: companyId,
        notes: 'Created via Single-Pass AI',
        confidence: 0.95
      };

      const created = await enhancedOrderService.createEnhancedOrder({
        ...finalOrder,
        customerId: customerData?.id,
        extractionMethod: 'single_pass_ai'
      });

      await enhancedOrderService.disconnect();

      if (created.success) {
        // Get Delivery Time
        let deliveryTime = '3-5 أيام';
        try {
          const shippingInfo = await ShippingService.findShippingInfo(finalOrder.city, companyId);
          if (shippingInfo && shippingInfo.found) deliveryTime = shippingInfo.deliveryTime;
        } catch (e) { }

        const msg = `تم تأكيد طلبك بنجاح! ✅\n\nرقم الطلب: ${created.order.orderNumber}\nسيتم التوصيل خلال ${deliveryTime}.\n شكراً لثقتك بنا! ❤️`;
        return { success: true, message: msg, order: created.order };
      }
      return { success: false };

    } catch (e) {
      console.error('❌ [ORDER-DB] Creation Failed:', e);
      return { success: false };
    }
  }

  /**
   * Helper: Build the efficient Single-Pass Prompt
   */
  _buildSinglePassPrompt(message, history, regexData, customerData, companyPrompts) {
    const personality = companyPrompts?.personalityPrompt || 'أنت مساعد مبيعات محترف وودود.';

    return `
${personality}

You are an expert Sales Agent. Your goal is to collect order details and confirm the order in a friendly, efficient way.

CONTEXT:
Last 10 messages:
${history}

Current Message: "${message}"

KNOWN DATA (Regex Hints):
Phone: ${regexData.customerPhone || 'Not found'}
Address: ${regexData.customerAddress || 'Not found'}
City: ${regexData.city || 'Not found'}
Name: ${customerData?.name || 'Not known'}

TASK:
1.  **Extract Order Details** from the conversation.
2.  **Determine Status**:
    *   \`collecting_data\`: If critical fields are missing (Name, Phone, Address, City, Product).
    *   \`complete\`: If ALL fields are present (Name, Phone, Address, City, Product Size/Color), BUT user hasn't confirmed yet.
    *   \`confirmed\`: If ALL fields are present AND user EXPLICITLY confirmed (said "Yes", "Confirm", "Ok", etc.) in the CURRENT message.
    *   \`clarification_needed\`: If ambiguous.
3.  **Generate Response**:
    *   If \`collecting_data\`: Ask for missing fields (one question).
    *   If \`complete\`: Summarize details and ask "Confirm order?".
    *   If \`confirmed\`: Say "Confirming your order moment, please wait...".
    *   If \`clarification_needed\`: Ask.

CRITICAL RULES:
*   Output **JSON ONLY**.
*   Response Language: Arabic.
*   Required: customerName, customerPhone, customerAddress, city, productSize, productColor.

OUTPUT FORMAT:
{
  "order": {
    "customerName": "...",
    "customerPhone": "...",
    "customerAddress": "...",
    "city": "...",
    "items": [{ "product": "...", "size": "...", "color": "...", "quantity": 1 }]
  },
  "missingFields": [],
  "status": "collecting_data | complete | confirmed | clarification_needed",
  "response": "..."
}
`;
  }

  /**
   * Helper: Parse AI Response safely
   */
  _parseAIResponse(response) {
    try {
      const content = typeof response === 'string' ? response : response?.content;
      if (!content) return null;

      // Clean markdown code blocks if present
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const startIndex = cleanJson.indexOf('{');
      const endIndex = cleanJson.lastIndexOf('}');
      if (startIndex === -1 || endIndex === -1) return null;

      return JSON.parse(cleanJson.substring(startIndex, endIndex + 1));
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return null;
    }
  }

  /**
   * استخراج بيانات العميل من الرسالة
   * @param {string} message - رسالة العميل
   * @returns {Object} - بيانات العميل
   */
  extractCustomerDataFromMessage(message) {
    const data = {
      hasData: false,
      customerName: null,
      customerPhone: null,
      customerAddress: null,
      city: null,
      productSize: null,
      productColor: null
    };

    // تحليل الرسالة وتقسيمها إلى أسطر
    const lines = message.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const fullText = message.trim();

    // البحث عن رقم الهاتف
    const phonePatterns = [
      /01[0-9]{9}/,
      /01\d{9}/,
      /\b01[0-9]{9}\b/,
      /\b0?1[0-9]{9}\b/
    ];

    for (const line of lines) {
      for (const pattern of phonePatterns) {
        const phoneMatch = line.match(pattern);
        if (phoneMatch) {
          data.customerPhone = phoneMatch[0];
          data.hasData = true;
          break;
        }
      }
      if (data.customerPhone) break;
    }

    // إذا لم يتم العثور على الهاتف في الأسطر، البحث في النص الكامل
    if (!data.customerPhone) {
      for (const pattern of phonePatterns) {
        const phoneMatch = fullText.match(pattern);
        if (phoneMatch) {
          data.customerPhone = phoneMatch[0];
          data.hasData = true;
          break;
        }
      }
    }

    // البحث عن المقاس
    const sizePatterns = [
      /مقاس[:\s]+(\d+)/i,
      /مقاس\s*(\d+)/i,
      /\bمقاس\s*(\d{1,2})\b/i,
      /\b(\d{1,2})\s*مقاس/i,
      /\bمقاس\s*(\d+)/i
    ];

    for (const pattern of sizePatterns) {
      const sizeMatch = fullText.match(pattern);
      if (sizeMatch) {
        data.productSize = sizeMatch[1];
        data.hasData = true;
        break;
      }
    }

    // البحث عن اللون
    const colorPatterns = [
      /لون[:\s]+(ابيض|اسود|أسود|أبيض|احمر|أحمر|ازرق|أزرق|اخضر|أخضر|اصفر|أصفر|برتقالي|وردي|بنفسجي|رمادي|بيج|بني|ذهبي|فضي)/i,
      /لون\s*(ابيض|اسود|أسود|أبيض|احمر|أحمر|ازرق|أزرق|اخضر|أخضر|اصفر|أصفر|برتقالي|وردي|بنفسجي|رمادي|بيج|بني|ذهبي|فضي)/i,
      /\b(ابيض|اسود|أسود|أبيض|احمر|أحمر|ازرق|أزرق|اخضر|أخضر|اصفر|أصفر|برتقالي|وردي|بنفسجي|رمادي|بيج|بني|ذهبي|فضي)\s*لون/i
    ];

    for (const pattern of colorPatterns) {
      const colorMatch = fullText.match(pattern);
      if (colorMatch) {
        data.productColor = colorMatch[1];
        data.hasData = true;
        break;
      }
    }

    // البحث عن المحافظة/المدينة
    const cityPatterns = [
      /محافظة[:\s]+([^\s]+)/i,
      /محافظة\s+([^\s]+)/i,
      /\b(القاهرة|الجيزة|الاسكندرية|الإسكندرية|الاسكندريه|الإسكندريه|القليوبية|الشرقية|الغربية|الدقهلية|المنوفية|البحيرة|كفر الشيخ|دمياط|بورسعيد|الإسماعيلية|السويس|شمال سيناء|جنوب سيناء|البحر الأحمر|الوادي الجديد|مطروح|أسوان|قنا|سوهاج|الأقصر|أسيوط|المنيا|بنى سويف|الفيوم)\b/i
    ];

    for (const pattern of cityPatterns) {
      const cityMatch = fullText.match(pattern);
      if (cityMatch) {
        data.city = cityMatch[1].trim();
        data.hasData = true;
        break;
      }
    }

    // البحث عن العنوان
    const addressPatterns = [
      /عنوان[:\s]+(.+?)(?:\s+محافظة|\s+012|$)/i,
      /عنوان\s+(.+?)(?:\s+محافظة|\s+012|$)/i,
      /شارع[:\s]+(.+?)(?:\s+محافظة|\s+012|$)/i,
      /شارع\s+(.+?)(?:\s+محافظة|\s+012|$)/i,
      /(?:في|من|عنوان|شارع)\s+([^012]+?)(?:\s+محافظة|\s+012|$)/i
    ];

    for (const pattern of addressPatterns) {
      const addressMatch = fullText.match(pattern);
      if (addressMatch && addressMatch[1].trim().length > 3) {
        // إزالة المقاس واللون والمحافظة من العنوان
        let address = addressMatch[1].trim();
        address = address.replace(/\bمقاس\s*\d+\b/gi, '').trim();
        address = address.replace(/\bلون\s*[^\s]+\b/gi, '').trim();
        address = address.replace(/\bمحافظة\s*[^\s]+\b/gi, '').trim();
        address = address.replace(/01\d{9}/g, '').trim();

        if (address.length > 3) {
          data.customerAddress = address;
          data.hasData = true;
          break;
        }
      }
    }

    // إذا لم يتم العثور على العنوان بنمط محدد، محاولة استخراجه من النص
    if (!data.customerAddress) {
      // البحث عن كلمات تدل على العنوان (شارع، حي، منطقة، برج، عمارة)
      const addressKeywords = /(?:شارع|حي|منطقة|برج|عمارة|محلة|درب|زقاق|شقة|طابق|سموحه|النصر|الشروق)\s+[^012]+/i;
      const addressMatch = fullText.match(addressKeywords);
      if (addressMatch) {
        let address = addressMatch[0];
        // إزالة المقاس واللون والمحافظة والهاتف
        address = address.replace(/\bمقاس\s*\d+\b/gi, '').trim();
        address = address.replace(/\bلون\s*[^\s]+\b/gi, '').trim();
        address = address.replace(/\bمحافظة\s*[^\s]+\b/gi, '').trim();
        address = address.replace(/01\d{9}/g, '').trim();

        if (address.length > 3) {
          data.customerAddress = address;
          data.hasData = true;
        }
      }
    }

    // ✅ تحسين: إذا كان العنوان في نفس السطر مع المحافظة
    if (!data.customerAddress && data.city) {
      // البحث عن سطر يحتوي على المحافظة والعنوان معاً
      for (const line of lines) {
        if (line.includes(data.city) && (line.includes('شارع') || line.includes('برج') || line.includes('عمارة') || line.includes('سموحه') || line.includes('النصر') || line.includes('الشروق'))) {
          let address = line;
          // إزالة المحافظة من العنوان
          address = address.replace(new RegExp(`محافظة\\s*${data.city}`, 'gi'), '').trim();
          address = address.replace(new RegExp(data.city, 'gi'), '').trim();
          address = address.replace(/\bمقاس\s*\d+\b/gi, '').trim();
          address = address.replace(/\bلون\s*[^\s]+\b/gi, '').trim();
          address = address.replace(/01\d{9}/g, '').trim();

          if (address.length > 3) {
            data.customerAddress = address;
            data.hasData = true;
            break;
          }
        }
      }
    }

    // ✅ تحسين إضافي: البحث عن أي سطر يحتوي على كلمات عنوان بدون محافظة
    if (!data.customerAddress) {
      for (const line of lines) {
        const hasAddressKeywords = /(?:شارع|حي|منطقة|برج|عمارة|محلة|درب|زقاق|شقة|طابق|سموحه|النصر|الشروق)/i.test(line);
        const hasPhone = /01\d{9}/.test(line);
        const hasSize = /\d{1,2}/.test(line);

        // إذا كان السطر يحتوي على كلمات عنوان ولا يحتوي على هاتف أو مقاس فقط
        if (hasAddressKeywords && !hasPhone && !hasSize) {
          let address = line.trim();
          // إزالة أي بيانات أخرى
          address = address.replace(/\bمقاس\s*\d+\b/gi, '').trim();
          address = address.replace(/\bلون\s*[^\s]+\b/gi, '').trim();
          address = address.replace(/\bمحافظة\s*[^\s]+\b/gi, '').trim();

          if (address.length > 3) {
            data.customerAddress = address;
            data.hasData = true;
            break;
          }
        }
      }
    }

    // البحث عن الاسم
    const namePatterns = [
      /الاسم[:\s]+(.+?)(?:\s+محافظة|\s+012|$)/i,
      /اسم[:\s]+(.+?)(?:\s+محافظة|\s+012|$)/i,
      /اسمي[:\s]+(.+?)(?:\s+محافظة|\s+012|$)/i
    ];

    for (const line of lines) {
      for (const pattern of namePatterns) {
        const nameMatch = line.match(pattern);
        if (nameMatch && nameMatch[1].trim().length > 2) {
          data.customerName = nameMatch[1].trim();
          data.hasData = true;
          break;
        }
      }
      if (data.customerName) break;
    }

    console.log('🔍 [DATA-EXTRACTION] Extracted data:', JSON.stringify(data, null, 2));

    return data;
  }

  /**
   * فحص الطلبات الأخيرة للعميل
   * @param {string} customerId - معرف العميل
   * @returns {Promise<Object|null>} - آخر طلب أو null
   */
  async checkRecentOrderForCustomer(customerId) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const recentOrder = await safeQuery(async () => {
        return await this.prisma.order.findFirst({
          where: {
            customerId: customerId,
            createdAt: {
              gte: fiveMinutesAgo
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }, 6); // Priority 6 - عملية عادية

      return recentOrder;
    } catch (error) {
      console.error('❌ [ORDER-PROCESSOR] Error checking recent order:', error);
      return null;
    }
  }





  /**
   * استخراج تفاصيل الطلب من المحادثة
   * ✅ نقل من aiAgentService.js
   */
  async extractOrderDetailsFromMemory(conversationMemory, companyId, currentMessage) {
    try {
      console.log('🔍 [ORDER-EXTRACTION] بدء استخراج تفاصيل الطلب من المحادثة...');
      console.log('🏢 [ORDER-EXTRACTION] Company ID:', companyId);
      console.log('📝 [ORDER-EXTRACTION] Current Message:', currentMessage?.substring(0, 200) || 'N/A');
      console.log('📝 [ORDER-EXTRACTION] Current Message Length:', currentMessage?.length || 0);
      console.log('📝 [ORDER-EXTRACTION] Conversation Memory Length:', conversationMemory?.length || 0);

      // ✅ SECURITY CHECK
      if (!companyId) {
        console.error('❌ [SECURITY] extractOrderDetailsFromMemory requires companyId');
        return null;
      }

      // بناء سياق المحادثة
      let conversationText = this.buildConversationContext(conversationMemory);

      // ✅ CRITICAL FIX: إضافة الرسالة الحالية للسياق إذا كانت موجودة
      if (currentMessage && currentMessage.trim().length > 0) {
        console.log('✅ [ORDER-EXTRACTION] إضافة الرسالة الحالية للسياق');
        console.log('📝 [ORDER-EXTRACTION] Current Message Full Text:', currentMessage);

        // ✅ FIX: إضافة الرسالة بشكل واضح ومميز
        conversationText += `\n\n========================================\n`;
        conversationText += `[رسالة جديدة - الأحدث] العميل: ${currentMessage}\n`;
        conversationText += `========================================\n`;
        conversationText += `\n⚠️ ملاحظة مهمة: الرسالة أعلاه هي الأحدث والأهم - يجب استخراج البيانات منها أولاً!\n`;
      } else {
        console.warn('⚠️ [ORDER-EXTRACTION] لا توجد رسالة حالية لإضافتها');
      }

      console.log('📝 [ORDER-EXTRACTION] Final conversation text length:', conversationText.length);
      console.log('📝 [ORDER-EXTRACTION] Final conversation preview (last 500 chars):', conversationText.substring(Math.max(0, conversationText.length - 500)));

      // ✅ PASS companyId to extractDetailsWithAI
      const extractedDetails = await this.extractDetailsWithAI(conversationText, companyId);

      // تنظيف وتحسين البيانات المستخرجة
      const cleanedDetails = this.cleanAndValidateOrderDetails(extractedDetails);

      console.log('✅ [ORDER-EXTRACTION] تم استخراج التفاصيل:', JSON.stringify(cleanedDetails, null, 2));
      return cleanedDetails;

    } catch (error) {
      console.error('❌ [ORDER-EXTRACTION] خطأ في استخراج التفاصيل:', error);
      return null;
    }
  }

  /**
   * Build conversation context for AI analysis
   * ✅ نقل من aiAgentService.js
   */
  buildConversationContext(conversationMemory) {
    console.log('📝 [CONTEXT-BUILD] Building conversation context...');
    console.log('📝 [CONTEXT-BUILD] Total messages:', conversationMemory?.length || 0);

    if (!conversationMemory || conversationMemory.length === 0) {
      console.warn('⚠️ [CONTEXT-BUILD] No conversation memory provided!');
      return '';
    }

    // ✅ FIX: استخدام كل الرسائل بدلاً من آخر 15 فقط لضمان جمع كل البيانات
    const recentMessages = conversationMemory.slice(-30); // آخر 30 رسالة بدلاً من 15
    console.log('📝 [CONTEXT-BUILD] Using last', recentMessages.length, 'messages');

    // ✅ Debug: فحص محتوى الرسائل
    console.log('🔍 [CONTEXT-DEBUG] Sample messages:');
    recentMessages.slice(0, 3).forEach((msg, i) => {
      // ✅ التحقق من format الرسالة
      if (msg.content) {
        console.log(`  [${i}] NEW FORMAT - content: "${msg.content?.substring(0, 50) || 'N/A'}", isFromCustomer: ${msg.isFromCustomer}`);
      } else if (msg.userMessage || msg.aiResponse) {
        console.log(`  [${i}] OLD FORMAT - userMessage: "${msg.userMessage?.substring(0, 50) || 'N/A'}", aiResponse: "${msg.aiResponse?.substring(0, 50) || 'N/A'}"`);
      }
    });

    // ✅ FIX: بناء النص بطريقة أفضل تضمن عدم فقدان أي بيانات
    const contextParts = [];
    let messageCounter = 1;

    recentMessages.forEach((interaction, index) => {
      const timestamp = interaction.timestamp || interaction.createdAt;
      const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('ar-EG') : '';

      // ✅ دعم كلا الـ formats: القديم (userMessage/aiResponse) والجديد (content/isFromCustomer)
      if (interaction.content) {
        // NEW FORMAT من memoryService
        const role = interaction.isFromCustomer ? 'العميل' : 'النظام';
        const messageLine = `[${messageCounter}] ${timeStr} ${role}: ${interaction.content}`;
        contextParts.push(messageLine);
        messageCounter++;

        // ✅ Debug: طباعة كل رسالة للتأكد من وجود البيانات
        if (interaction.isFromCustomer && interaction.content.length > 20) {
          console.log(`🔍 [CONTEXT-DEBUG] رسالة عميل طويلة [${messageCounter - 1}]:`, interaction.content.substring(0, 100));
        }
      } else {
        // OLD FORMAT (للتوافق)
        const userMsg = interaction.userMessage || '';
        const aiMsg = interaction.aiResponse || '';

        if (userMsg) {
          const userLine = `[${messageCounter}] ${timeStr} العميل: ${userMsg}`;
          contextParts.push(userLine);
          messageCounter++;

          // ✅ Debug: طباعة رسائل العميل الطويلة
          if (userMsg.length > 20) {
            console.log(`🔍 [CONTEXT-DEBUG] رسالة عميل طويلة [${messageCounter - 1}]:`, userMsg.substring(0, 100));
          }
        }

        if (aiMsg) {
          const aiLine = `[${messageCounter}] ${timeStr} النظام: ${aiMsg}`;
          contextParts.push(aiLine);
          messageCounter++;
        }
      }
    });

    const contextText = contextParts.join('\n\n');

    console.log('📝 [CONTEXT-BUILD] Context text length:', contextText.length);
    console.log('📝 [CONTEXT-BUILD] Total messages built:', contextParts.length);
    console.log('📝 [CONTEXT-BUILD] Context preview:', contextText.substring(0, 500));

    // ✅ FIX: طباعة آخر 3 رسائل للتأكد من وجود البيانات
    console.log('📝 [CONTEXT-BUILD] Last 3 messages in context:');
    contextParts.slice(-3).forEach((msg, i) => {
      console.log(`  [${i}]`, msg.substring(0, 150));
    });

    return contextText;
  }

  /**
   * Extract details using AI
   * ✅ نقل من aiAgentService.js
   */
  async extractDetailsWithAI(conversationText, companyId) {
    console.log('🔍 [ORDER-EXTRACTION] نص المحادثة المرسل للذكاء الاصطناعي:');
    console.log('📝 [ORDER-EXTRACTION] Conversation Text Length:', conversationText?.length || 0);
    console.log('📝 [ORDER-EXTRACTION] Conversation Text Preview:', conversationText?.substring(0, 500) || 'EMPTY');
    console.log('🏢 [ORDER-EXTRACTION] Company ID:', companyId);

    // ✅ SECURITY CHECK
    if (!companyId) {
      console.error('❌ [SECURITY] extractDetailsWithAI requires companyId');
      throw new Error('Company ID is required for AI order extraction');
    }

    // ✅ CHECK if conversation text is empty
    if (!conversationText || conversationText.trim().length === 0) {
      console.error('❌ [ORDER-EXTRACTION] Conversation text is empty!');
      return null;
    }

    // ✅ جلب المنتجات من قاعدة البيانات للشركة
    let productsInfo = '';
    let defaultProduct = null;
    try {
      const products = await this.prisma.product.findMany({
        where: { companyId: companyId },
        select: {
          name: true,
          price: true,
          description: true,
          category: true,
          stock: true
        },
        take: 50 // آخر 50 منتج
      });

      if (products && products.length > 0) {
        console.log(`✅ [ORDER-EXTRACTION] وجدت ${products.length} منتج للشركة`);

        // ✅ لو في منتج واحد بس، استخدمه كـ default
        if (products.length === 1) {
          defaultProduct = products[0];
          console.log(`💡 [ORDER-EXTRACTION] منتج واحد فقط - سيتم استخدامه كافتراضي: ${defaultProduct.name}`);
        }

        productsInfo = '\n\n🛍️ المنتجات المتاحة في الشركة:\n';
        productsInfo += '=====================================\n';
        products.forEach((product, index) => {
          productsInfo += `${index + 1}. ${product.name}`;
          if (product.price) productsInfo += ` - السعر: ${product.price} جنيه`;
          if (product.description) productsInfo += ` - ${product.description}`;
          if (product.category) productsInfo += ` - الفئة: ${product.category}`;
          productsInfo += '\n';
        });
        productsInfo += '=====================================\n';

        // ✅ إضافة ملاحظة إذا كان في منتج واحد فقط
        if (products.length === 1) {
          productsInfo += `\n⚠️ ملاحظة مهمة: يوجد منتج واحد فقط متاح (${defaultProduct.name} - السعر: ${defaultProduct.price} جنيه).\n`;
          productsInfo += `إذا لم يُذكر اسم المنتج صراحة في المحادثة، استخدم هذا المنتج كافتراضي واستخدم السعر المذكور.\n\n`;
        } else {
          productsInfo += `\n⚠️ ملاحظة: يجب تحديد المنتج من القائمة أعلاه فقط. لا تستخدم أسماء منتجات غير موجودة.\n\n`;
        }
      } else {
        console.log('⚠️ [ORDER-EXTRACTION] لا توجد منتجات للشركة');
      }
    } catch (error) {
      console.error('❌ [ORDER-EXTRACTION] خطأ في جلب المنتجات:', error);
    }

    const prompt = `أنت خبير في تحليل المحادثات التجارية واستخراج تفاصيل الطلبات. حلل المحادثة التالية بعناية فائقة واستخرج جميع البيانات الموجودة:
${productsInfo}

=== المحادثة ===
${conversationText}
=== نهاية المحادثة ===

🎯 مهمتك: استخراج تفاصيل الطلب من هذه المحادثة بدقة عالية. اقرأ كل رسالة بعناية واستخرج أي معلومة موجودة.

⚠️ ملاحظة حرجة: البيانات قد تكون موزعة على رسائل متعددة في المحادثة!
- المنتج واللون والمقاس قد يكونوا في رسالة سابقة
- الاسم والعنوان والموبايل قد يكونوا في رسالة أخرى
- يجب جمع البيانات من كل الرسائل وليس فقط الرسالة الأخيرة!

📋 ابحث عن المعلومات التالية في أي مكان في المحادثة:
1. 🛍️ اسم المنتج: (يجب أن يكون من قائمة المنتجات المتاحة أعلاه فقط - لا تخترع اسم منتج!)
   - ✅ ابحث في كل الرسائل من أول المحادثة لآخرها
   - ✅ إذا ذكر العميل منتج في رسالة سابقة، استخدمه حتى لو لم يُذكر في الرسالة الأخيرة
   - ✅ إذا كان في منتج واحد فقط في القائمة، استخدمه كافتراضي

2. 🎨 لون المنتج: (أسود، أبيض، بني، كحلي، أحمر، أزرق، إلخ)
   - ✅ ابحث في كل الرسائل - اللون قد يكون في رسالة سابقة

3. 📏 مقاس المنتج: (أي رقم يمثل مقاس مثل 37، 38، 39، 40، 41، 42، إلخ)
   - ✅ ابحث في كل الرسائل - المقاس قد يكون في رسالة سابقة

4. 💰 سعر المنتج: (يجب أن يكون السعر من قائمة المنتجات أعلاه)
   - ✅ إذا تم تحديد المنتج، استخدم السعر من قائمة المنتجات
   - ✅ لا تخترع سعر - استخدم فقط السعر من القائمة

5. 👤 اسم العميل الكامل: (ابحث عن أي اسم شخص مذكور في المحادثة)
   - ✅ ابحث في كل الرسائل - الاسم قد يكون في رسالة سابقة
   - ✅ قد يكون بعد "الاسم الكامل:" أو "لاسم الكامل:" أو "الاسم:" أو في أي مكان

6. 📱 رقم الهاتف: (11 رقم يبدأ بـ 01 مثل 01234567890)
   - ✅ ابحث في كل الرسائل - الموبايل قد يكون في رسالة سابقة
   - ✅ قد يكون بعد "رقم الموبايل:" أو "الموبايل:" أو في أي مكان

7. 🏠 العنوان الكامل: (أي عنوان أو منطقة أو شارع مذكور)
   - ✅ ابحث في كل الرسائل - العنوان قد يكون في رسالة سابقة
   - ✅ قد يكون بعد "العنوان:" أو "لعنوان:" أو في أي مكان

8. 🏙️ المدينة/المحافظة: (القاهرة، الإسكندرية، الجيزة، اسكندريه، سموحه، إلخ)
   - ✅ ابحث في كل الرسائل - المدينة قد تكون في رسالة سابقة

9. 📝 ملاحظات إضافية: (أي معلومات أخرى مهمة)

🔍 تعليمات حرجة - اقرأها بعناية:
- 🔥🔥🔥 اقرأ المحادثة كاملة من أول رسالة لآخر رسالة
- 🔥🔥🔥 البيانات متوزعة على كل المحادثة - لا تركز فقط على الرسالة الأخيرة!
- 🔥🔥🔥 اجمع البيانات من كل الرسائل - كل رسالة ممكن تحتوي على جزء من البيانات
- 🔥 مثال: المنتج واللون والمقاس في رسالة [1] و [2] و [3]، والاسم والعنوان والموبايل في رسالة [10]
- ✅ إذا ذكر العميل معلومة في رسالة سابقة ولم تُذكر في الرسالة الأخيرة، استخدم المعلومة من الرسالة السابقة
- ✅ ركز على آخر ذكر للمعلومة إذا تكررت (مثلاً: إذا ذكر لون في رسالة [2] ولون آخر في رسالة [8], استخدم الأحدث)
- ابحث عن الأنماط مثل "الاسم :" أو "لاسم :" أو "الاسم الكامل :" متبوعة بالاسم
- ابحث عن "رقم الموبايل:" أو "الموبايل:" متبوعة برقم الهاتف
- ابحث عن "العنوان :" أو "لعنوان :" متبوعة بالعنوان
- ابحث عن "المدينة:" أو "المحافظة:" أو أي مدينة مصرية مذكورة
- ابحث عن "المقاس :" أو "لمقاس :" أو أي رقم منفرد قد يكون مقاس (37-46)
- ابحث عن "اللون :" أو "لون :" أو "اللون الابيض" أو "لون ابيض" لاستخراج اللون
- ابحث عن أسماء المنتجات في أي مكان في المحادثة (مثل: كوتشي، شانكي، حذاء، إلخ)
- 🚨 مهم جداً: اسم المنتج يجب أن يكون من قائمة المنتجات المتاحة فقط - لا تخترع اسم!
- 🚨 مهم جداً: السعر يجب أن يكون من قائمة المنتجات - استخدم السعر المذكور للمنتج المحدد
- إذا لم تجد معلومة محددة في المحادثة، ضع null - لا تخترع معلومات!
- انتبه للأخطاء الإملائية الشائعة مثل "لاسم" بدلاً من "الاسم"
- إذا كان اللون مكتوب بدون ":" مثل "اللون الابيض" أو "لون ابيض"، استخرج "أبيض"
- رقم المقاس ممكن يكون لوحده بدون كلمة "مقاس" - أي رقم بين 37-46 يمكن أن يكون مقاس

📤 أجب بصيغة JSON صحيحة فقط (بدون أي نص إضافي قبل أو بعد):
{
  "productName": "اسم المنتج الكامل أو null",
  "productColor": "اللون أو null",
  "productSize": "المقاس أو null",
  "productPrice": رقم السعر أو null,
  "customerName": "الاسم الكامل للعميل أو null",
  "customerPhone": "رقم الهاتف أو null",
  "customerAddress": "العنوان الكامل أو null",
  "city": "المدينة أو null",
  "notes": "أي ملاحظات مهمة أو null",
  "confidence": رقم من 0 إلى 1 يمثل مدى ثقتك في البيانات المستخرجة
}

⚠️ مهم جداً:
- إذا لم تجد معلومة معينة في المحادثة، ضع null
- لا تخترع معلومات غير موجودة - خصوصاً اسم المنتج والسعر!
- اسم المنتج يجب أن يكون بالضبط كما في قائمة المنتجات أعلاه
- السعر يجب أن يكون بالضبط كما في قائمة المنتجات أعلاه
- تأكد من صحة JSON قبل الإرسال
- يجب أن يكون الرد JSON فقط بدون أي نص آخر

📝 مثال توضيحي:
إذا كانت المحادثة:
[1] العميل: "عايز أطلب"
[2] النظام: "تمام! عايزة إيه بالظبط؟"
[3] العميل: "كوتشي شانكي"
[4] النظام: "ممتاز! أي لون؟"
[5] العميل: "لون ابيض"
[6] النظام: "تمام! والمقاس؟"
[7] العميل: "41"
[8] النظام: "محتاج الاسم والعنوان"
[9] العميل: "سلمي عبده اسكندريه سموحه شارع النصر برج الشروق 01271459824"

يجب أن يكون الرد:
{
  "productName": "كوتشي شانكي",
  "productColor": "أبيض",
  "productSize": "41",
  "productPrice": 420,
  "customerName": "سلمي عبده",
  "customerPhone": "01271459824",
  "customerAddress": "اسكندريه سموحه شارع النصر برج الشروق",
  "city": "الإسكندرية",
  "notes": null,
  "confidence": 0.95
}`;

    try {
      // ✅ PASS companyId to generateAIResponse
      const aiResponse = await this.aiAgentService.generateAIResponse(
        prompt,
        [],      // conversationMemory
        false,   // useRAG
        null,    // providedGeminiConfig
        companyId // ✅ CRITICAL: Pass companyId for security
      );


      console.log('🤖 [ORDER-EXTRACTION] رد الذكاء الاصطناعي الخام:', aiResponse);

      // ✅ FIX: Handle Object Return (Unified format)
      let aiText = aiResponse;

      console.log('🔍 [DEBUG-EXTRACTION] Raw Response Type:', typeof aiResponse);
      if (typeof aiResponse === 'object') {
        console.log('🔍 [DEBUG-EXTRACTION] Raw Response Keys:', Object.keys(aiResponse));
        if (aiResponse.content) console.log('🔍 [DEBUG-EXTRACTION] Content Preview:', aiResponse.content.substring(0, 50));
      }

      if (typeof aiResponse === 'object' && aiResponse.content) {
        aiText = aiResponse.content;
      }

      // Handle the case where the response is { text: "..." } or similar from other providers
      if (typeof aiResponse === 'object' && !aiResponse.content && aiResponse.text) {
        aiText = aiResponse.text;
      }

      // ✅ FIX: التحقق من أن الرد نصي قبل استخدام indexOf
      if (typeof aiText !== 'string') {
        console.warn('⚠️ [ORDER-EXTRACTION] استجابة الذكاء الاصطناعي ليست نصاً (ربما خطأ أو كوتة منتهية):', JSON.stringify(aiResponse));
        return null;
      }

      // تحسين استخراج JSON
      const firstBrace = aiText.indexOf('{');
      const lastBrace = aiText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = aiText.substring(firstBrace, lastBrace + 1);

        try {
          const extractedData = JSON.parse(jsonString);
          console.log('✅ [ORDER-EXTRACTION] البيانات المستخرجة بنجاح:', extractedData);

          // ✅ التحقق من وجود البيانات الأساسية (الاسم فقط مطلوب - الموبايل ممكن يتجمع لاحقاً)
          if (!extractedData.customerName) {
            console.warn('⚠️ [ORDER-EXTRACTION] اسم العميل مفقود');
            return null;
          }

          // ✅ تحذير إذا كان الموبايل مفقود (لكن لا نرفض البيانات)
          if (!extractedData.customerPhone) {
            console.warn('⚠️ [ORDER-EXTRACTION] رقم الموبايل مفقود - سيتم جمعه من المحادثة');
          }

          return extractedData;
        } catch (parseError) {
          console.error('❌ [ORDER-EXTRACTION] خطأ في تحليل JSON:', parseError.message);
          return null;
        }
      } else {
        console.warn('⚠️ [ORDER-EXTRACTION] لم يتم العثور على JSON صحيح');
        return null;
      }
    } catch (error) {
      console.error('❌ [ORDER-EXTRACTION] خطأ في استخراج التفاصيل بالذكاء الاصطناعي:', error);
      return null;
    }
  }

  /**
   * Clean and validate extracted order details
   * ✅ نقل من aiAgentService.js
   */
  cleanAndValidateOrderDetails(extractedDetails) {
    // ✅ HANDLE NULL INPUT
    if (!extractedDetails) {
      console.warn('⚠️ [ORDER-CLEANING] Received null extractedDetails, using default values');
      extractedDetails = this.getDefaultOrderDetails();
    }

    const cleaned = {
      productName: this.cleanProductName(extractedDetails.productName),
      productColor: this.cleanProductColor(extractedDetails.productColor),
      productSize: this.cleanProductSize(extractedDetails.productSize),
      productPrice: this.cleanProductPrice(extractedDetails.productPrice),
      customerName: this.cleanCustomerName(extractedDetails.customerName),
      customerPhone: this.cleanPhoneNumber(extractedDetails.customerPhone),
      customerAddress: this.cleanAddress(extractedDetails.customerAddress),
      city: this.cleanCity(extractedDetails.city),
      quantity: 1,
      notes: extractedDetails.notes || '',
      confidence: extractedDetails.confidence || 0.5
    };

    // تشغيل الـ validation المتقدم
    const validation = this.validateOrderDetails(cleaned);

    // إضافة نتائج الـ validation للبيانات
    cleaned.validation = validation;

    // تعديل مستوى الثقة بناءً على الـ validation
    if (!validation.isValid) {
      cleaned.confidence = Math.min(cleaned.confidence, 0.4);
    } else if (validation.warnings.length > 2) {
      cleaned.confidence = Math.min(cleaned.confidence, 0.6);
    } else if (validation.warnings.length > 0) {
      cleaned.confidence = Math.min(cleaned.confidence, 0.8);
    }

    // إضافة ملاحظات الـ validation
    if (validation.errors.length > 0) {
      cleaned.notes += `\n⚠️ أخطاء: ${validation.errors.join(', ')}`;
    }
    if (validation.warnings.length > 0) {
      cleaned.notes += `\n⚡ تحذيرات: ${validation.warnings.join(', ')}`;
    }
    if (validation.suggestions.length > 0) {
      cleaned.notes += `\n💡 اقتراحات: ${validation.suggestions.join(', ')}`;
    }

    return cleaned;
  }

  /**
   * Clean product name with enhanced intelligence
   * ✅ نقل من aiAgentService.js
   */
  cleanProductName(name) {
    if (!name || typeof name !== 'string') return null;

    let cleaned = name.trim()
      .replace(/[()[\]{}]/g, '') // إزالة الأقواس
      .replace(/\s+/g, ' '); // توحيد المسافات

    return cleaned || null;
  }

  /**
   * Clean product color with enhanced mapping
   * ✅ نقل من aiAgentService.js
   */
  cleanProductColor(color) {
    if (!color || typeof color !== 'string') {
      return null;
    }

    // تنظيف اللون وتوحيد الأسماء
    const colorMap = {
      // الألوان الأساسية
      'اسود': 'أسود',
      'ابيض': 'أبيض',
      'احمر': 'أحمر',
      'ازرق': 'أزرق',
      'اخضر': 'أخضر',
      'اصفر': 'أصفر',
      'بنفسجي': 'بنفسجي',
      'وردي': 'وردي',
      'برتقالي': 'برتقالي',

      // درجات الألوان
      'بني': 'بني',
      'بيج': 'بيج',
      'رمادي': 'رمادي',
      'كحلي': 'كحلي',
      'نيفي': 'كحلي',
      'navy': 'كحلي',

      // الألوان بالإنجليزية
      'black': 'أسود',
      'white': 'أبيض',
      'red': 'أحمر',
      'blue': 'أزرق',
      'green': 'أخضر',
      'yellow': 'أصفر',
      'brown': 'بني',
      'beige': 'بيج',
      'gray': 'رمادي',
      'grey': 'رمادي',
      'pink': 'وردي',
      'purple': 'بنفسجي',
      'orange': 'برتقالي',

      // أخطاء إملائية شائعة
      'اسوود': 'أسود',
      'ابييض': 'أبيض',
      'احمرر': 'أحمر',
      'ازررق': 'أزرق'
    };

    let cleaned = color.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/^(ال|لون)\s*/i, '')
      .toLowerCase();

    return colorMap[cleaned] || color.trim() || null;
  }

  /**
   * Clean product size with enhanced validation
   * ✅ نقل من aiAgentService.js
   */
  cleanProductSize(size) {
    if (!size) {
      return null;
    }

    // استخراج الرقم فقط
    const sizeMatch = String(size).match(/(\d+(?:\.\d+)?)/);
    const numericSize = sizeMatch ? parseFloat(sizeMatch[1]) : null;

    // التحقق من صحة المقاس حسب النوع
    if (numericSize) {
      // مقاسات الأحذية النسائية (35-42)
      if (numericSize >= 35 && numericSize <= 42) {
        return String(Math.round(numericSize));
      }

      // مقاسات الأحذية الرجالية (39-46)
      if (numericSize >= 39 && numericSize <= 46) {
        return String(Math.round(numericSize));
      }

      // مقاسات الأطفال (25-35)
      if (numericSize >= 25 && numericSize <= 35) {
        return String(Math.round(numericSize));
      }

      // تحويل المقاسات الأوروبية إلى مصرية (تقريبي)
      if (numericSize >= 6 && numericSize <= 12) {
        const convertedSize = Math.round(numericSize + 30);
        if (convertedSize >= 35 && convertedSize <= 42) {
          return String(convertedSize);
        }
      }
    }

    // مقاسات نصية شائعة
    const sizeMap = {
      'صغير': '37',
      'متوسط': '38',
      'كبير': '40',
      'small': '37',
      'medium': '38',
      'large': '40',
      'xl': '41',
      'xxl': '42'
    };

    const textSize = String(size).toLowerCase().trim();
    if (sizeMap[textSize]) {
      return sizeMap[textSize];
    }

    return null;
  }

  /**
   * Clean product price with enhanced validation
   * ✅ نقل من aiAgentService.js
   */
  cleanProductPrice(price) {
    if (!price) return null;

    // استخراج الرقم من النص
    let numericPrice;
    if (typeof price === 'number') {
      numericPrice = price;
    } else {
      // البحث عن أرقام في النص
      const priceMatch = String(price).match(/(\d+(?:\.\d+)?)/);
      numericPrice = priceMatch ? parseFloat(priceMatch[1]) : null;
    }

    if (numericPrice) {
      // التحقق من منطقية السعر حسب فئات المنتجات

      // أحذية عادية (100-500 جنيه)
      if (numericPrice >= 100 && numericPrice <= 500) {
        return Math.round(numericPrice);
      }

      // أحذية متوسطة (500-1000 جنيه)
      if (numericPrice >= 500 && numericPrice <= 1000) {
        return Math.round(numericPrice);
      }

      // أحذية فاخرة (1000-3000 جنيه)
      if (numericPrice >= 1000 && numericPrice <= 3000) {
        return Math.round(numericPrice);
      }

      // أسعار منخفضة جداً (قد تكون خطأ)
      if (numericPrice >= 50 && numericPrice < 100) {
        return Math.round(numericPrice);
      }

      // تحويل الأسعار بالدولار إلى جنيه (تقريبي)
      if (numericPrice >= 5 && numericPrice <= 100) {
        const convertedPrice = Math.round(numericPrice * 30); // سعر صرف تقريبي
        if (convertedPrice >= 150 && convertedPrice <= 3000) {
          return convertedPrice;
        }
      }
    }

    return null;
  }

  /**
   * Transliterate English name to Arabic
   * ✅ نقل من aiAgentService.js
   */
  transliterateToArabic(name) {
    if (!name || typeof name !== 'string') return name;

    // خريطة تحويل الحروف الإنجليزية للعربية
    const transliterationMap = {
      'a': 'ا', 'A': 'ا',
      'b': 'ب', 'B': 'ب',
      'd': 'د', 'D': 'د',
      'e': 'ي', 'E': 'ي',
      'f': 'ف', 'F': 'ف',
      'g': 'ج', 'G': 'ج',
      'h': 'ه', 'H': 'ه',
      'i': 'ي', 'I': 'ي',
      'j': 'ج', 'J': 'ج',
      'k': 'ك', 'K': 'ك',
      'l': 'ل', 'L': 'ل',
      'm': 'م', 'M': 'م',
      'n': 'ن', 'N': 'ن',
      'o': 'و', 'O': 'و',
      'r': 'ر', 'R': 'ر',
      's': 'س', 'S': 'س',
      't': 'ت', 'T': 'ت',
      'u': 'و', 'U': 'و',
      'v': 'ف', 'V': 'ف',
      'w': 'و', 'W': 'و',
      'y': 'ي', 'Y': 'ي',
      'z': 'ز', 'Z': 'ز',
      // أسماء شائعة
      'ahmed': 'أحمد', 'Ahmed': 'أحمد', 'AHMED': 'أحمد',
      'mohamed': 'محمد', 'Mohammed': 'محمد', 'Muhammad': 'محمد',
      'ali': 'علي', 'Ali': 'علي',
      'omar': 'عمر', 'Omar': 'عمر',
      'sara': 'سارة', 'Sarah': 'سارة',
      'fatma': 'فاطمة', 'Fatima': 'فاطمة',
      'mona': 'منى', 'Mona': 'منى',
      'nour': 'نور', 'Noor': 'نور',
      'hassan': 'حسن', 'Hassan': 'حسن',
      'hussein': 'حسين', 'Hussein': 'حسين',
      'mahmoud': 'محمود', 'Mahmoud': 'محمود',
      'khaled': 'خالد', 'Khaled': 'خالد',
      'youssef': 'يوسف', 'Yousef': 'يوسف', 'Joseph': 'يوسف'
    };

    // التحقق إذا كان الاسم إنجليزي
    const isEnglish = /^[a-zA-Z\s]+$/.test(name);

    if (!isEnglish) {
      return name; // إذا كان عربي بالفعل، أرجعه كما هو
    }

    // محاولة تحويل الاسم الكامل أولاً
    const lowerName = name.toLowerCase().trim();
    if (transliterationMap[lowerName]) {
      return transliterationMap[lowerName];
    }

    // تحويل كل كلمة على حدة
    const words = name.split(' ');
    const transliteratedWords = words.map(word => {
      const lowerWord = word.toLowerCase();
      if (transliterationMap[lowerWord]) {
        return transliterationMap[lowerWord];
      }

      // تحويل حرف بحرف
      return word.split('').map(char => transliterationMap[char] || char).join('');
    });

    return transliteratedWords.join(' ');
  }

  /**
   * Clean customer name
   * ✅ نقل من aiAgentService.js
   */
  cleanCustomerName(name) {
    if (!name || typeof name !== 'string') return null;

    // تنظيف الاسم
    let cleaned = name.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/\d+/g, '') // إزالة الأرقام
      .replace(/\s+/g, ' ')
      .trim();

    // التحقق من أن الاسم ليس Facebook ID
    if (cleaned.length < 3 || /^\d+$/.test(cleaned)) {
      return null;
    }

    // تحويل الاسم للعربية إذا كان إنجليزي
    cleaned = this.transliterateToArabic(cleaned);

    return cleaned;
  }

  /**
   * Clean phone number
   * ✅ نقل من aiAgentService.js
   */
  cleanPhoneNumber(phone) {
    if (!phone) return '';

    // استخراج الأرقام فقط
    const digits = String(phone).replace(/[^\d]/g, '');

    // التحقق من صحة رقم الهاتف المصري
    if (digits.length === 11 && digits.startsWith('01')) {
      return digits;
    }

    if (digits.length === 10 && digits.startsWith('1')) {
      return '0' + digits;
    }

    return '';
  }

  /**
   * Clean address
   * ✅ نقل من aiAgentService.js
   */
  cleanAddress(address) {
    if (!address || typeof address !== 'string') return '';

    return address.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean city name
   * ✅ نقل من aiAgentService.js
   */
  cleanCity(city) {
    if (!city || typeof city !== 'string') return null;

    // قائمة المدن المصرية الشائعة
    const egyptianCities = {
      'القاهره': 'القاهرة',
      'الاسكندريه': 'الإسكندرية',
      'الاسكندرية': 'الإسكندرية',
      'اسكندريه': 'الإسكندرية',
      'الجيزه': 'الجيزة',
      'شبرا': 'شبرا الخيمة',
      'المنصوره': 'المنصورة',
      'المنصورة': 'المنصورة',
      'طنطا': 'طنطا',
      'الزقازيق': 'الزقازيق',
      'اسيوط': 'أسيوط',
      'سوهاج': 'سوهاج',
      'قنا': 'قنا',
      'الاقصر': 'الأقصر',
      'اسوان': 'أسوان',
      'بورسعيد': 'بورسعيد',
      'السويس': 'السويس',
      'الاسماعيليه': 'الإسماعيلية',
      'دمياط': 'دمياط',
      'كفر الشيخ': 'كفر الشيخ',
      'البحيره': 'البحيرة',
      'الغربيه': 'الغربية',
      'المنوفيه': 'المنوفية',
      'القليوبيه': 'القليوبية',
      'الشرقيه': 'الشرقية',
      'الدقهليه': 'الدقهلية',
      'سموحه': 'الإسكندرية',
      'سموحة': 'الإسكندرية'
    };

    let cleaned = city.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/^(محافظة|مدينة)\s*/i, '');

    return egyptianCities[cleaned] || cleaned || null;
  }

  /**
   * Advanced validation for extracted order details
   * ✅ نقل من aiAgentService.js
   */
  validateOrderDetails(details) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // ✅ التحقق من اسم المنتج - الآن التحقق من null
    if (!details.productName) {
      validationResults.errors.push('اسم المنتج مفقود');
      validationResults.isValid = false;
    }

    // ✅ التحقق من اللون
    if (!details.productColor) {
      validationResults.errors.push('اللون مفقود');
      validationResults.isValid = false;
    }

    // ✅ التحقق من المقاس
    if (!details.productSize) {
      validationResults.errors.push('المقاس مفقود');
      validationResults.isValid = false;
    } else {
      const sizeNum = parseInt(details.productSize);
      if (isNaN(sizeNum) || sizeNum < 25 || sizeNum > 46) {
        validationResults.errors.push(`مقاس غير صحيح: ${details.productSize}`);
        validationResults.isValid = false;
      }
    }

    // ✅ التحقق من السعر
    if (!details.productPrice) {
      validationResults.errors.push('السعر مفقود');
      validationResults.isValid = false;
    } else if (details.productPrice < 50 || details.productPrice > 5000) {
      validationResults.warnings.push(`سعر غير عادي: ${details.productPrice} جنيه`);
    }

    // ✅ التحقق من رقم الهاتف
    if (!details.customerPhone) {
      validationResults.errors.push('رقم الهاتف مفقود');
      validationResults.isValid = false;
    } else if (!/^01[0-9]{9}$/.test(details.customerPhone)) {
      validationResults.errors.push(`رقم هاتف غير صحيح: ${details.customerPhone}`);
      validationResults.isValid = false;
    }

    // ✅ التحقق من اسم العميل
    if (!details.customerName || /^\d+/.test(details.customerName)) {
      validationResults.errors.push('اسم العميل غير واضح أو مفقود');
      validationResults.isValid = false;
    }

    // ✅ التحقق من العنوان
    if (!details.customerAddress || details.customerAddress.trim() === '') {
      validationResults.errors.push('العنوان مفقود');
      validationResults.isValid = false;
    }

    // ✅ التحقق من المدينة
    if (!details.city || details.city === 'غير محدد') {
      validationResults.errors.push('المدينة/المحافظة مفقودة');
      validationResults.isValid = false;
    }

    // اقتراحات للتحسين
    if (details.confidence < 0.7) {
      validationResults.suggestions.push('مستوى الثقة منخفض - قد تحتاج مراجعة يدوية');
    }

    return validationResults;
  }

  /**
   * Get default order details - NO ASSUMPTIONS!
   * ✅ نقل من aiAgentService.js
   */
  getDefaultOrderDetails() {
    return {
      productName: null,
      productColor: null,
      productSize: null,
      productPrice: null,
      customerName: null,
      customerPhone: '',
      customerAddress: '',
      city: null,
      quantity: 1,
      notes: 'لم يتم العثور على بيانات كافية',
      confidence: 0.1
    };
  }

  /**
   * Use AI to detect if customer is confirming an order
   * ✅ نقل من aiAgentService.js
   */
  async detectConfirmationWithAI(message, conversationMemory, companyId) {
    try {
      // Get recent conversation context
      const recentMessages = conversationMemory.slice(-5).map(m =>
        `العميل: ${m.userMessage || m.content}\nالرد: ${m.aiResponse || m.response}`
      ).join('\n\n');

      const prompt = `أنت خبير في فهم نوايا العملاء. مهمتك: تحديد هل العميل بيأكد طلب كامل ولا لأ.

المحادثة السابقة:
${recentMessages}

رسالة العميل الآن: "${message}"

🔍 تحليل الرسالة:
1. هل فيها اسم شخص؟ (مثال: أحمد محمد، سلمى عبده)
2. هل فيها رقم موبايل 11 رقم؟ (يبدأ بـ 01)
3. هل فيها عنوان مفصل؟ (شارع، منطقة، مدينة)

✅ أجب بـ "نعم" إذا:
- الرسالة فيها الـ 3 عناصر دول مع بعض (اسم + موبايل + عنوان)
- أو العميل قال صراحة: "أكد الطلب", "اكد الاوردر"
- أو العميل قال رد إيجابي قصير بعد سؤال عن تأكيد الطلب: "يا ريت", "نعم", "تمام", "موافق", "عايز", "اريد"

❌ أجب بـ "لا" إذا:
- كلمة واحدة بس بدون سياق: "اسكندريه" (بدون بيانات أخرى)
- سؤال: "كام؟", "متوفر؟"
- بيانات ناقصة: اسم بس، أو رقم بس، أو عنوان بس (بدون باقي البيانات)

مثال "نعم":
"سلمي عبده \nاسكندريه سموحه شارع النصر برج الشروق \n01271459824"
(فيها اسم + عنوان + موبايل = نعم)

مثال "لا":
"اسكندريه" (عنوان بس = لا)
"01271459824" (موبايل بس = لا)

أجب بكلمة واحدة فقط: نعم أو لا`;

      // Get active Gemini configuration for the company
      const geminiConfig = await this.aiAgentService.getCurrentActiveModel(companyId);
      if (!geminiConfig) {
        console.error(`❌ No active Gemini key found for confirmation detection for company: ${companyId}`);
        return false;
      }

      // ✅ FIX: Generate AI response with messageContext to indicate this is a confirmation check
      // هذا يسمح للنظام بمعرفة أن هذا رد قصير مقبول (مثل "نعم" أو "لا")
      const aiResponse = await this.aiAgentService.generateAIResponse(
        prompt,
        [],
        false,
        null,
        companyId,
        null, // conversationId
        { messageType: 'order_confirmation', inquiryType: 'order_confirmation' } // ✅ FIX: إضافة messageContext
      );

      // التأكد من أن aiResponse هو string
      if (!aiResponse || typeof aiResponse !== 'string') {
        console.warn('⚠️ [CONFIRMATION-DEBUG] AI response is not a string:', typeof aiResponse);
        return false;
      }

      const aiAnswer = aiResponse.toLowerCase().trim();

      // ✅ FIX: تحسين تحليل الرد - البحث عن أي إشارة للموافقة (بما في ذلك "يا ريت")
      const isConfirming = aiAnswer === 'نعم' ||
        aiAnswer.includes('نعم') ||
        aiAnswer === 'yes' ||
        aiAnswer.includes('yes') ||
        aiAnswer === 'موافق' ||
        aiAnswer.includes('موافق') ||
        (aiAnswer.includes('تأكيد') || aiAnswer.includes('تاكيد'));

      // ✅ FIX: فحص الردود الإيجابية القصيرة في سياق تأكيد الطلب
      const messageLower = message.toLowerCase().trim();
      const positiveShortResponses = [
        'يا ريت', 'ياريت', 'يا ريت', 'ياريت',
        'اه', 'ايوه', 'ايوة', 'نعم', 'تمام', 'ماشي', 'اوكي', 'ok',
        'موافق', 'موافقة', 'اتفق', 'اتفق معاك', 'اتفق معاكي',
        'عايز', 'عاوز', 'عايزه', 'عايزة', 'عاوزة', 'عاوزه',
        'ابي', 'أبي', 'أريد', 'اريد', 'أعرف', 'اعرف'
      ];

      // ✅ FIX: إذا كانت الرسالة قصيرة (أقل من 15 حرف) وتحتوي على رد إيجابي
      // وكان آخر رد من AI يحتوي على سؤال عن تأكيد الطلب
      if (message.length < 15 && positiveShortResponses.some(response => messageLower.includes(response))) {
        // ✅ FIX: أحيانًا آخر عنصر في الذاكرة يكون رسالة العميل؛ نحتاج آخر رسالة فيها رد AI فعلي
        const lastAIMessage = Array.isArray(conversationMemory)
          ? (conversationMemory.slice().reverse().find(m => (m?.aiResponse || m?.response))?.aiResponse ||
            conversationMemory.slice().reverse().find(m => (m?.aiResponse || m?.response))?.response || '')
          : '';

        const lastAIMessageLower = lastAIMessage.toLowerCase();
        const hasOrderConfirmationQuestion = lastAIMessageLower.includes('تأكيد') ||
          lastAIMessageLower.includes('تاكيد') ||
          lastAIMessageLower.includes('أأكد') ||
          lastAIMessageLower.includes('أكد') ||
          lastAIMessageLower.includes('أوردر') ||
          lastAIMessageLower.includes('الطلب');

        if (hasOrderConfirmationQuestion) {
          console.log(`✅ [CONFIRMATION-DEBUG] Positive short response detected: "${message}" in context of order confirmation`);
          return true;
        }
      }

      // إضافة تسجيل مفصل للتشخيص
      console.log(`🔍 [CONFIRMATION-DEBUG] Message: "${message.substring(0, 100)}"`);
      console.log(`🔍 [CONFIRMATION-DEBUG] AI Response: "${aiResponse}"`);
      console.log(`🔍 [CONFIRMATION-DEBUG] AI Decision: ${isConfirming ? '✅ CONFIRMED' : '❌ NOT CONFIRMED'}`);

      // ✅ Fallback: فحص يدوي للتأكد
      if (!isConfirming) {
        const hasPhone = /01[0-9]{9}/.test(message);
        const hasName = message.split(/\s+/).length >= 2 && /[\u0600-\u06FF]{2,}/.test(message);
        const hasAddress = /(شارع|عمارة|برج|منطقة|مدينة|محافظة|اسكندري|قاهر|جيز|سموحه|مصر|النصر|الشروق)/i.test(message);
        const hasSize = /(مقاس|قياس)\s*:?\s*\d+/i.test(message) || /\d{2}/.test(message);
        const hasColor = /(لون|اللون)\s*:?\s*[\u0600-\u06FF]+/i.test(message);

        // ✅ حالة 1: رسالة كاملة (اسم + موبايل + عنوان)
        if (hasPhone && hasName && hasAddress) {
          console.log('✅ [FALLBACK-CHECK] الرسالة فيها كل البيانات - تأكيد يدوي!');
          return true;
        }

        // ✅ حالة 2: رسالة منظمة فيها بيانات طلب (اسم + عنوان + مقاس/لون)
        if (hasName && hasAddress && (hasSize || hasColor)) {
          console.log('✅ [FALLBACK-CHECK] رسالة منظمة فيها بيانات طلب - تأكيد!');
          console.log(`   - اسم: ${hasName}, عنوان: ${hasAddress}, مقاس: ${hasSize}, لون: ${hasColor}`);
          return true;
        }

        // ✅ حالة 3: رسالة فيها حقول واضحة (الاسم:، العنوان:، المقاس:)
        const hasStructuredFields = /(الاسم|لاسم)\s*:/i.test(message) &&
          /(العنوان|لعنوان)\s*:/i.test(message);
        if (hasStructuredFields) {
          console.log('✅ [FALLBACK-CHECK] رسالة منظمة بحقول واضحة - تأكيد!');
          return true;
        }
      }

      // ✅ FIX: "The Confirmation Loop"
      // التحقق من أن البيانات *بالفعل* موجودة في الذاكرة قبل طلب التأكيد مرة أخرى
      // إذا كان العميل يقول "أكد" ولكن النظام يرى نقصاً، سنفحص التاريخ بدقة أكبر
      if (isConfirming) {
        // التحقق السريع من اكتمال البيانات في الذاكرة لتجنب التكرار
        // نستخدم وظيفة خفيفة للبحث عن تواجد البيانات في النصوص السابقة
        const allText = conversationMemory.map(m => m.userMessage || m.content || '').join(' ');
        const hasDataWeakDataCheck = (
          (/01\d{9}/.test(allText)) && // Phone
          (allText.length > 50) // Enough text for address/name
        );

        if (hasDataWeakDataCheck) {
          console.log('✅ [CONFIRMATION-LOOP-FIX] Customer confirmed and data seems present in history. Trusting confirmation.');
          return true;
        }
      }

      return isConfirming;

    } catch (error) {
      console.error('❌ Error in AI confirmation detection:', error);
      return false;
    }
  }

  /**
   * محاولة إنشاء الطلب بالبيانات الجديدة
   * ✅ نقل من aiAgentService.js
   */
  async attemptOrderCreationWithNewData(pendingOrderData, messageData, conversationId) {
    try {
      // ✅ EXTRACT companyId early
      const companyId = messageData.companyId || messageData.customerData?.companyId;

      if (!companyId) {
        console.error('❌ [SECURITY] No companyId - rejecting order creation');
        return null;
      }

      console.log('🏢 [ORDER-CREATION] Creating order for company:', companyId);

      // البحث عن تفاصيل الطلب المعلق
      const settings = await this.aiAgentService.getSettings(companyId);
      const memoryLimit = settings.maxMessagesPerConversation || 50;
      const memoryService = require('../memoryService');
      const conversationMemory = await memoryService.getConversationMemory(
        conversationId,
        messageData.senderId,
        memoryLimit,
        companyId
      );

      // ✅ PASS companyId and current message to extractOrderDetailsFromMemory
      const orderDetails = await this.extractOrderDetailsFromMemory(
        conversationMemory,
        companyId, // ✅ CRITICAL
        messageData.content // ✅ PASS current message
      );

      // ✅ HANDLE NULL ORDER DETAILS
      if (!orderDetails) {
        console.error('❌ [ORDER-CREATION] Failed to extract order details from memory');
        // Use the extracted customer data directly instead
        const fallbackOrderDetails = {
          productName: 'كوتشي حريمي', // Default product
          productColor: 'أسود', // Default color
          productSize: '37', // Default size
          productPrice: 299, // Default price
          customerName: pendingOrderData.extractedData.customerName || messageData.customerData?.name || 'عميل جديد',
          customerPhone: pendingOrderData.extractedData.customerPhone || messageData.customerData?.phone || '',
          customerAddress: pendingOrderData.extractedData.customerAddress || '',
          city: pendingOrderData.extractedData.city || 'غير محدد',
          quantity: 1,
          confidence: 0.3 // Low confidence for fallback
        };

        // Continue with fallback data
        const updatedOrderDetails = {
          ...fallbackOrderDetails,
          customerName: pendingOrderData.extractedData.customerName || fallbackOrderDetails.customerName,
          customerPhone: pendingOrderData.extractedData.customerPhone || fallbackOrderDetails.customerPhone,
          customerAddress: pendingOrderData.extractedData.customerAddress || fallbackOrderDetails.customerAddress,
          city: pendingOrderData.extractedData.city || fallbackOrderDetails.city,
          productSize: pendingOrderData.extractedData.productSize || fallbackOrderDetails.productSize,
          productColor: pendingOrderData.extractedData.productColor || fallbackOrderDetails.productColor
        };

        // If we have customer data from the message, use it to improve completeness
        if (messageData.content) {
          const messageCustomerData = this.extractCustomerDataFromMessage(messageData.content);
          if (messageCustomerData.hasData) {
            updatedOrderDetails.customerName = messageCustomerData.customerName || updatedOrderDetails.customerName;
            updatedOrderDetails.customerPhone = messageCustomerData.customerPhone || updatedOrderDetails.customerPhone;
            updatedOrderDetails.customerAddress = messageCustomerData.customerAddress || updatedOrderDetails.customerAddress;
            updatedOrderDetails.city = messageCustomerData.city || updatedOrderDetails.city;
            updatedOrderDetails.productSize = messageCustomerData.productSize || updatedOrderDetails.productSize;
            updatedOrderDetails.productColor = messageCustomerData.productColor || updatedOrderDetails.productColor;
          }
        }

        // فحص اكتمال البيانات
        const dataCompleteness = await this.checkDataCompleteness(
          updatedOrderDetails,
          conversationMemory,
          messageData.content
        );

        if (!dataCompleteness.isComplete) {
          // ✅ FIX: جلب companyPrompts لاستخدام الشخصية وقواعد الاستجابة
          const companyPrompts = await this.aiAgentService.getCompanyPrompts(companyId);
          const dataRequestResponse = await this.generateDataRequestResponse(
            dataCompleteness.missingData,
            updatedOrderDetails,
            companyId,
            companyPrompts,
            conversationMemory
          );

          return {
            success: true,
            content: dataRequestResponse,
            intent: 'data_collection',
            // ... rest of response
          };
        }

        // البيانات مكتملة - إنشاء الأوردر
        console.log('✅ [DATA-COLLECTION] Data complete, creating order with fallback data...');

        const EnhancedOrderService = require('../enhancedOrderService');
        const enhancedOrderService = new EnhancedOrderService();

        const orderCreated = await enhancedOrderService.createEnhancedOrder({
          conversationId,
          customerId: messageData.customerData?.id,
          companyId: companyId, // ✅ Use validated companyId
          productName: updatedOrderDetails.productName,
          productColor: updatedOrderDetails.productColor,
          productSize: updatedOrderDetails.productSize,
          productPrice: updatedOrderDetails.productPrice,
          quantity: updatedOrderDetails.quantity || 1,
          customerName: updatedOrderDetails.customerName,
          customerPhone: updatedOrderDetails.customerPhone,
          customerEmail: updatedOrderDetails.customerEmail || '',
          customerAddress: updatedOrderDetails.customerAddress,
          city: updatedOrderDetails.city,
          notes: `Order created after data collection - ${new Date().toLocaleString('ar-EG')} (Fallback data used)`,
          confidence: updatedOrderDetails.confidence || 0.3,
          extractionMethod: 'ai_data_collection_fallback'
        });

        await enhancedOrderService.disconnect();

        if (orderCreated.success) {
          // ✅ الحصول على مدة التوصيل من قاعدة البيانات
          let deliveryTime = '3-5 أيام';
          try {
            const ShippingService = require('../shippingService');
            const shippingInfo = await ShippingService.findShippingInfo(updatedOrderDetails.city, companyId);
            if (shippingInfo && shippingInfo.found && shippingInfo.deliveryTime) {
              deliveryTime = shippingInfo.deliveryTime;
              console.log(`⏰ [ORDER-SUCCESS] مدة التوصيل من DB: ${deliveryTime}`);
            }
          } catch (err) {
            console.error('❌ [ORDER-SUCCESS] خطأ في جلب مدة التوصيل:', err.message);
          }

          const successMessage = `تم تأكيد طلبك بنجاح! ✅\n\nرقم الطلب: ${orderCreated.order.orderNumber}\nالإجمالي: ${orderCreated.order.total} جنيه شامل الشحن\n\nسيتم توصيل طلبك خلال ${deliveryTime}. شكراً لك!`;

          return {
            success: true,
            content: successMessage,
            intent: 'order_created',
            sentiment: 'positive',
            confidence: 0.95,
            orderCreated: orderCreated
          };
        }

        return null;
      }

      // دمج البيانات الجديدة
      const updatedOrderDetails = {
        ...orderDetails,
        customerName: pendingOrderData.extractedData.customerName || orderDetails.customerName,
        customerPhone: pendingOrderData.extractedData.customerPhone || orderDetails.customerPhone,
        customerAddress: pendingOrderData.extractedData.customerAddress || orderDetails.customerAddress,
        city: pendingOrderData.extractedData.city || orderDetails.city,
        productSize: pendingOrderData.extractedData.productSize || orderDetails.productSize,
        productColor: pendingOrderData.extractedData.productColor || orderDetails.productColor
      };

      console.log('🔍 [ORDER-CREATION] Merged order details:', JSON.stringify(updatedOrderDetails, null, 2));

      // If we have customer data from the message, use it to improve completeness
      if (messageData.content) {
        const messageCustomerData = this.extractCustomerDataFromMessage(messageData.content);
        if (messageCustomerData.hasData) {
          updatedOrderDetails.customerName = messageCustomerData.customerName || updatedOrderDetails.customerName;
          updatedOrderDetails.customerPhone = messageCustomerData.customerPhone || updatedOrderDetails.customerPhone;
          updatedOrderDetails.customerAddress = messageCustomerData.customerAddress || updatedOrderDetails.customerAddress;
          updatedOrderDetails.city = messageCustomerData.city || updatedOrderDetails.city;
          updatedOrderDetails.productSize = messageCustomerData.productSize || updatedOrderDetails.productSize;
          updatedOrderDetails.productColor = messageCustomerData.productColor || updatedOrderDetails.productColor;
        }
      }

      // فحص اكتمال البيانات
      const dataCompleteness = await this.checkDataCompleteness(
        updatedOrderDetails,
        conversationMemory,
        messageData.content
      );

      if (!dataCompleteness.isComplete) {
        // ✅ FIX: جلب companyPrompts لاستخدام الشخصية وقواعد الاستجابة
        const companyPrompts = await this.aiAgentService.getCompanyPrompts(companyId);
        const dataRequestResponse = await this.generateDataRequestResponse(
          dataCompleteness.missingData,
          updatedOrderDetails,
          companyId,
          companyPrompts,
          conversationMemory
        );

        return {
          success: true,
          content: dataRequestResponse,
          intent: 'data_collection',
          // ... rest of response
        };
      }

      // البيانات مكتملة - إنشاء الأوردر
      console.log('✅ [DATA-COLLECTION] Data complete, creating order...');

      const EnhancedOrderService = require('../enhancedOrderService');
      const enhancedOrderService = new EnhancedOrderService();

      const orderCreated = await enhancedOrderService.createEnhancedOrder({
        conversationId,
        customerId: messageData.customerData?.id,
        companyId: companyId, // ✅ Use validated companyId
        productName: updatedOrderDetails.productName,
        productColor: updatedOrderDetails.productColor,
        productSize: updatedOrderDetails.productSize,
        productPrice: updatedOrderDetails.productPrice,
        quantity: updatedOrderDetails.quantity || 1,
        customerName: updatedOrderDetails.customerName,
        customerPhone: updatedOrderDetails.customerPhone,
        customerEmail: updatedOrderDetails.customerEmail || '',
        customerAddress: updatedOrderDetails.customerAddress,
        city: updatedOrderDetails.city,
        notes: `Order created after data collection - ${new Date().toLocaleString('ar-EG')}`,
        confidence: 0.9,
        extractionMethod: 'ai_data_collection'
      });

      await enhancedOrderService.disconnect();

      if (orderCreated.success) {
        // ✅ الحصول على مدة التوصيل من قاعدة البيانات
        let deliveryTime = '3-5 أيام';
        try {
          const ShippingService = require('../shippingService');
          const shippingInfo = await ShippingService.findShippingInfo(updatedOrderDetails.city, companyId);
          if (shippingInfo && shippingInfo.found && shippingInfo.deliveryTime) {
            deliveryTime = shippingInfo.deliveryTime;
            console.log(`⏰ [ORDER-SUCCESS] مدة التوصيل من DB: ${deliveryTime}`);
          }
        } catch (err) {
          console.error('❌ [ORDER-SUCCESS] خطأ في جلب مدة التوصيل:', err.message);
        }

        const successMessage = `تم تأكيد طلبك بنجاح! ✅\n\nرقم الطلب: ${orderCreated.order.orderNumber}\nالإجمالي: ${orderCreated.order.total} جنيه شامل الشحن\n\nسيتم توصيل طلبك خلال ${deliveryTime}. شكراً لك!`;

        return {
          success: true,
          content: successMessage,
          intent: 'order_created',
          sentiment: 'positive',
          confidence: 0.95,
          orderCreated: orderCreated
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Error creating order with new data:', error);
      return null;
    }
  }
}

module.exports = OrderProcessor;


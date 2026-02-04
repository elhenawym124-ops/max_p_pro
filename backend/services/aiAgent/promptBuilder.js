/**
 * Prompt Builder Module
 * 
 * هذا الـ module يحتوي على منطق بناء الـ prompts للـ AI:
 * 1. buildAdvancedPrompt - بناء الـ prompt المتقدم
 * 2. buildPrompt - بناء الـ prompt الأساسي
 * 
 * ملاحظة: هذا الـ module للرجوع فقط - لا يتم استخدامه في الملف الرئيسي حالياً
 */

class PromptBuilder {
  /**
   * بناء الـ prompt المتقدم
   * 
   * ملاحظة: هذه دالة معقدة جداً وتحتوي على منطق متشابك مع باقي الكود
   * في التطبيق الفعلي، يجب تمرير جميع الـ dependencies المطلوبة
   * 
   * @param {Object} params - معاملات البناء
   * @returns {string} - الـ prompt النهائي
   */
  buildAdvancedPrompt(params) {
    const {
      customerMessage,
      conversationMemory,
      ragData,
      companyId,
      intent,
      hasImages,
      smartResponseInfo,
      isPriceQuestion,
      isNewCustomer,
      lastMentionedProduct,
      lastProductContext,
      msgLower
    } = params;

    let prompt = '';

    // بناء الـ prompt الأساسي
    // (هذا مثال مبسط - الكود الفعلي معقد جداً ويحتوي على منطق متشابك)
    
    // إضافة سجل المحادثة
    if (conversationMemory && conversationMemory.length > 0) {
      prompt += `📚 سجل المحادثة:\n`;
      conversationMemory.forEach((interaction, index) => {
        const sender = interaction.isFromCustomer ? 'العميل' : 'أنتِ';
        const content = interaction.content || '[رسالة فارغة]';
        prompt += `${index + 1}. ${sender}: ${content}\n`;
      });
      prompt += `\n🚫 لا ترحبي مرة أخرى - كملي المحادثة.\n`;
    }

    // إضافة RAG data
    if (ragData && ragData.length > 0) {
      prompt += `🗃️ المعلومات المتاحة من قاعدة البيانات:\n`;
      prompt += `=====================================\n`;
      ragData.forEach((item, index) => {
        if (item.type === 'product') {
          prompt += `🛍️ منتج ${index + 1}: ${item.content}\n`;
        }
      });
      prompt += `=====================================\n\n`;
    }

    // إضافة رسالة العميل
    prompt += `رسالة العميل: "${customerMessage}"\n\n`;

    return prompt;
  }

  /**
   * بناء الـ prompt الأساسي
   * @param {Object} params - معاملات البناء
   * @returns {string} - الـ prompt النهائي
   */
  buildPrompt(params) {
    const {
      customerMessage,
      ragData,
      conversationMemory
    } = params;

    let prompt = '';

    // بناء الـ prompt الأساسي
    if (ragData && ragData.length > 0) {
      prompt += `المعلومات المتاحة:\n`;
      ragData.forEach((item) => {
        prompt += `- ${item.content}\n`;
      });
      prompt += `\n`;
    }

    prompt += `رسالة العميل: "${customerMessage}"\n\n`;

    return prompt;
  }
}

module.exports = new PromptBuilder();


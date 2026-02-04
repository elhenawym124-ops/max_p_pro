/**
 * Hallucination Guard Module
 * 
 * هذا الموديول مسؤول عن فحص ردود AI واكتشاف الهلوسة (اختلاق معلومات غير صحيحة)
 * وتصحيحها أو استبدالها برد آمن.
 */

class HallucinationGuard {
    constructor() {
        this.commonHallucinations = [
            // أرقام هواتف وهمية شائعة
            /01234567890/g,
            /01000000000/g,
            /01111111111/g,
            /01222222222/g,
            /01555555555/g,
            /(\+?20)?1234567890/g,

            // روابط وهمية
            /example\.com/g,
            /domain\.com/g,
            /company\.com/g,

            // عناوين بريد وهمية
            /test@test\.com/g,
            /email@domain\.com/g,
            /admin@company\.com/g
        ];
    }

    /**
     * التحقق من الرد وتصحيحه
     * @param {string} response - رد AI
     * @param {Object} context - سياق المحادثة (اختياري)
     * @returns {Object} { isValid, correctedResponse, flaws }
     */
    validateAndCorrect(response, context = {}) {
        if (!response || typeof response !== 'string') {
            return { isValid: false, correctedResponse: 'نعتذر، حدث خطأ في معالجة الرد.', flaws: ['empty_response'] };
        }

        let correctedResponse = response;
        let flaws = [];
        let isValid = true;

        // 1. فحص المعلومات الوهمية الشائعة (أرقام، روابط)
        for (const pattern of this.commonHallucinations) {
            if (pattern.test(correctedResponse)) {
                // استبدال المعلومات الوهمية بنص عام أو حذفها
                // هنا سنقوم بحجبها حالياً
                correctedResponse = correctedResponse.replace(pattern, '[تم حذف معلومة غير صحيحة]');
                flaws.push('fake_data_detected');
                isValid = false;
            }
        }

        // 2. فحص ادعاء القدرة على الاتصال الهاتفي
        // AI لا يمكنه الاتصال، لذا يجب منع قول "سأقوم بالاتصال بك"
        const callPromises = [
            /سأقوم بالاتصال/i,
            /سأتصل بك/i,
            /نكلمك/i,
            /اتصل بيك/i,
            /call you/i
        ];

        for (const pattern of callPromises) {
            if (pattern.test(correctedResponse)) {
                // استبدال الوعد بالاتصال بطلب التواصل
                correctedResponse = correctedResponse.replace(pattern, 'يرجى التواصل معنا');
                flaws.push('false_promise_call');
                isValid = false;
            }
        }

        // 3. فحص ذكر منتجات غير موجودة (إذا توفرت قائمة المنتجات في السياق)
        // هذه الخطوة متقدمة وتتطلب context.availableProducts
        if (context.availableProducts && Array.isArray(context.availableProducts)) {
            // TODO: تنفيذ فحص المنتجات
        }

        // 4. فحص الطول المريب (رد طويل جداً جداً قد يكون هلوسة)
        if (correctedResponse.length > 2000) {
            flaws.push('excessive_length');
            // قص الرد ربما؟
        }

        return {
            isValid: isValid && flaws.length === 0,
            correctedResponse: correctedResponse,
            flaws: flaws
        };
    }
}

module.exports = new HallucinationGuard();

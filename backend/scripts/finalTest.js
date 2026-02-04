/**
 * اختبار نهائي للتحقق من النماذج العاملة
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyABpe0IADxKZ_2AGsJU9NfQavFUnBXlijQ';

// القائمة النهائية المحدثة في النظام
const systemModels = [
    // ✅ نماذج Pro (الأذكى) - تعمل مجاناً
    { model: 'gemini-2.5-pro', priority: 1 },
    
    // ✅ نماذج Flash (سريعة وذكية) - تعمل مجاناً
    { model: 'gemini-2.5-flash', priority: 2 },
    { model: 'gemini-2.5-flash-lite', priority: 3 },
    { model: 'gemini-2.0-flash', priority: 4 },
    { model: 'gemini-2.0-flash-lite', priority: 5 },
    
    // ✅ نماذج متخصصة - تعمل مجاناً
    { model: 'gemini-robotics-er-1.5-preview', priority: 6 },

    // ⚠️ نماذج مدفوعة (نتوقع فشلها)
    { model: 'gemini-3-pro', priority: 90 },
    { model: 'gemini-2.0-flash-exp', priority: 91 },
    { model: 'learnlm-2.0-flash-experimental', priority: 92 }
];

async function testModel(modelInfo) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    try {
        const model = genAI.getGenerativeModel({ model: modelInfo.model });
        const result = await model.generateContent('Hi');
        const text = result.response.text();
        
        return {
            model: modelInfo.model,
            status: '✅ يعمل',
            response: text.substring(0, 20)
        };
    } catch (error) {
        let errorType = '❌ خطأ';
        
        if (error.message.includes('404')) errorType = '❌ غير موجود (404)';
        else if (error.message.includes('429')) errorType = '💰 مدفوع/تجاوز الحد (429)';
        else if (error.message.includes('403')) errorType = '🚫 غير مصرح (403)';
        
        return {
            model: modelInfo.model,
            status: errorType,
            error: error.message.substring(0, 50)
        };
    }
}

async function finalTest() {
    console.log('🔍 اختبار نهائي للنماذج...\n');
    console.log('='.repeat(60));
    
    const results = [];
    let workingCount = 0;
    
    for (const modelInfo of systemModels) {
        const result = await testModel(modelInfo);
        results.push(result);
        
        const icon = result.status.includes('✅') ? '✅' : '❌';
        if (result.status.includes('✅')) workingCount++;
        
        console.log(`${icon} ${modelInfo.model.padEnd(35)} : ${result.status}`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 النتيجة النهائية: ${workingCount} نموذج يعمل بنجاح من أصل ${systemModels.length}`);
    
    if (workingCount === 6) {
        console.log('\n✨ النتيجة ممتازة! الـ 6 نماذج الأساسية تعمل.');
    }
}

finalTest();

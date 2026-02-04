/**
 * إنشاء تقرير شامل بحالة جميع النماذج
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyABpe0IADxKZ_2AGsJU9NfQavFUnBXlijQ';

const modelsToTest = [
    // Gemini 3
    'gemini-3-pro-preview',
    'gemini-3-pro',
    
    // Gemini 2.5 & 2.0
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash-tts',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash-live',
    'gemini-2.0-flash-live',
    'gemini-2.5-flash-native-audio-dialog',
    
    // نماذج أخرى
    'gemini-robotics-er-1.5-preview',
    'learnlm-2.0-flash-experimental',
    
    // Gemma 3
    'gemma-3-27b',
    'gemma-3-12b',
    'gemma-3-4b',
    'gemma-3-2b',
    'gemma-3-1b'
];

async function testModel(apiKey, modelName) {
    const apiVersions = ['v1beta', 'v1alpha', 'v1'];
    const isNewModel = modelName.includes('3') || modelName.includes('2.5') || modelName.includes('2.0');
    const versionsToTry = isNewModel ? ['v1beta', 'v1alpha', 'v1'] : ['v1', 'v1beta', 'v1alpha'];
    
    let lastError = null;
    
    for (const apiVersion of versionsToTry) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                ...(apiVersion !== 'v1' ? { apiVersion } : {})
            });
            
            const prompt = 'Say "Hello" in one word only.';
            const result = await model.generateContent(prompt, {
                timeout: 15000
            });
            
            const response = await result.response;
            const text = response.text();
            
            return {
                success: true,
                status: 'working',
                apiVersion: apiVersion === 'v1' ? 'v1 (default)' : apiVersion,
                response: text.trim()
            };
        } catch (error) {
            lastError = error;
            const statusCode = error.response?.status || error.status;
            
            if (statusCode === 429) {
                return {
                    success: false,
                    status: 'rate_limited',
                    statusCode: 429,
                    apiVersion: apiVersion === 'v1' ? 'v1 (default)' : apiVersion,
                    message: 'Rate limit exceeded'
                };
            }
            
            if (statusCode === 404) {
                continue; // Try next API version
            }
        }
    }
    
    return {
        success: false,
        status: 'not_available',
        statusCode: lastError?.response?.status || lastError?.status || 404,
        message: lastError?.message || 'Model not found'
    };
}

async function generateReport() {
    console.log('\n🧪 بدء اختبار شامل لجميع النماذج...\n');
    
    const results = {
        working: [],
        rateLimited: [],
        notAvailable: [],
        notTested: []
    };
    
    for (let i = 0; i < modelsToTest.length; i++) {
        const modelName = modelsToTest[i];
        process.stdout.write(`\r🔍 [${i + 1}/${modelsToTest.length}] اختبار ${modelName.padEnd(45)}... `);
        
        const result = await testModel(API_KEY, modelName);
        result.model = modelName;
        
        if (result.success) {
            results.working.push(result);
        } else if (result.status === 'rate_limited') {
            results.rateLimited.push(result);
        } else {
            results.notAvailable.push(result);
        }
        
        // انتظار بين الاختبارات
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n\n✅ اكتمل الاختبار!\n');
    
    // إنشاء التقرير
    const report = `# 📊 تقرير حالة النماذج - Gemini API

**تاريخ الاختبار:** ${new Date().toLocaleString('ar-EG')}  
**المفتاح المستخدم:** ${API_KEY.substring(0, 20)}...

---

## ✅ النماذج التي تعمل بشكل كامل (${results.working.length})

${results.working.map(r => `- **${r.model}**` + (r.apiVersion ? ` (${r.apiVersion})` : '')).join('\n')}

---

## ⚠️ النماذج المتوفرة لكن تجاوزت الحد - 429 (${results.rateLimited.length})

هذه النماذج **متوفرة وتعمل** لكن المفتاح تجاوز حد الاستخدام:

${results.rateLimited.map(r => `- **${r.model}**` + (r.apiVersion ? ` (${r.apiVersion})` : '')).join('\n')}

**الحل:** الانتظار حتى يتم إعادة تعيين الحد أو استخدام مفتاح آخر.

---

## ❌ النماذج غير المتوفرة - 404 (${results.notAvailable.length})

هذه النماذج **غير متوفرة** في API حالياً:

${results.notAvailable.map(r => `- **${r.model}** - ${r.message || 'Not found'}`).join('\n')}

---

## 📊 ملخص

- ✅ **تعمل:** ${results.working.length} نموذج
- ⚠️ **متوفرة لكن تجاوزت الحد:** ${results.rateLimited.length} نموذج
- ❌ **غير متوفرة:** ${results.notAvailable.length} نموذج
- **المجموع:** ${modelsToTest.length} نموذج

---

## 💡 توصيات

1. **للنماذج التي تعمل:** استخدم \`gemini-2.5-flash\` أو \`gemini-2.5-pro\` حسب احتياجك
2. **لـ Gemini 3:** استخدم \`gemini-3-pro-preview\` مع مفتاح بحد أعلى
3. **للنماذج غير المتوفرة:** انتظر التحديثات أو تحقق من الوثائق الرسمية

---

## 🔗 روابط مفيدة

- [Gemini API Documentation](https://ai.google.dev/api)
- [Gemini 3 Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Models List](https://ai.google.dev/gemini-api/docs/models/gemini)
`;

    // حفظ التقرير
    const reportPath = path.join(__dirname, 'modelsStatusReport.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log('📄 تم حفظ التقرير في:', reportPath);
    console.log('\n' + '='.repeat(80));
    console.log(report);
    
    return results;
}

generateReport().catch(console.error);


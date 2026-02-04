/**
 * تحليل وتفعيل النماذج غير المستخدمة
 * 
 * بناءً على صورة الاستهلاك من Google AI Studio
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const unusedModels = [
    {
        model: 'gemini-2.5-flash-tts',
        category: 'Multi-modal generative models',
        rpm: { used: 0, limit: 3 },
        tpm: { used: 0, limit: 10000 },
        rpd: { used: 0, limit: 15 },
        reason: 'TTS متخصص',
        requirements: 'يحتاج Vertex AI أو endpoint خاص لـ Text-to-Speech',
        canEnable: false,
        explanation: 'نموذج Text-to-Speech متخصص - لا يعمل مع generateContent API العادي. يحتاج Vertex AI أو endpoint خاص.'
    },
    {
        model: 'gemini-3-pro',
        category: 'Text-out models',
        rpm: { used: null, limit: null },
        tpm: { used: 0, limit: 125000 },
        rpd: { used: null, limit: null },
        reason: 'نموذج مدفوع',
        requirements: 'يحتاج اشتراك مدفوع أو مفتاح بحد أعلى',
        canEnable: true,
        explanation: 'نموذج Gemini 3 Pro - متوفر لكن قد يحتاج اشتراك مدفوع. الاسم الصحيح في API هو gemini-3-pro-preview'
    },
    {
        model: 'gemma-3-27b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        reason: 'معطل افتراضياً',
        requirements: 'تفعيل في النظام',
        canEnable: true,
        explanation: 'نموذج Gemma 3 - متوفر ويعمل لكن معطل افتراضياً في النظام'
    },
    {
        model: 'gemma-3-12b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        reason: 'معطل افتراضياً',
        requirements: 'تفعيل في النظام',
        canEnable: true,
        explanation: 'نموذج Gemma 3 - متوفر ويعمل لكن معطل افتراضياً في النظام'
    },
    {
        model: 'gemma-3-4b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        reason: 'معطل افتراضياً',
        requirements: 'تفعيل في النظام',
        canEnable: true,
        explanation: 'نموذج Gemma 3 - متوفر ويعمل لكن معطل افتراضياً في النظام'
    },
    {
        model: 'gemma-3-2b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        reason: 'معطل افتراضياً',
        requirements: 'تفعيل في النظام',
        canEnable: true,
        explanation: 'نموذج Gemma 3 - متوفر ويعمل لكن معطل افتراضياً في النظام'
    },
    {
        model: 'gemma-3-1b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        reason: 'معطل افتراضياً',
        requirements: 'تفعيل في النظام',
        canEnable: true,
        explanation: 'نموذج Gemma 3 - متوفر ويعمل لكن معطل افتراضياً في النظام'
    },
    {
        model: 'gemini-2.0-flash-exp',
        category: 'Text-out models',
        rpm: { used: null, limit: null },
        tpm: { used: null, limit: null },
        rpd: { used: 0, limit: 50 },
        reason: 'نموذج تجريبي',
        requirements: 'تفعيل في النظام',
        canEnable: true,
        explanation: 'نموذج تجريبي - متوفر لكن معطل افتراضياً'
    }
];

async function analyzeAndEnable() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    try {
        console.log('\n📊 تحليل النماذج غير المستخدمة\n');
        console.log('='.repeat(100));
        
        // عرض تحليل لكل نموذج
        console.log('\n🔍 تحليل تفصيلي:\n');
        
        unusedModels.forEach((model, index) => {
            console.log(`${index + 1}. ${model.model}`);
            console.log(`   📂 الفئة: ${model.category}`);
            console.log(`   📊 الاستخدام: RPM ${model.rpm.used || 0}/${model.rpm.limit || 'N/A'}, TPM ${model.tpm.used || 0}/${model.tpm.limit || 'N/A'}, RPD ${model.rpd.used || 0}/${model.rpd.limit || 'N/A'}`);
            console.log(`   ❓ السبب: ${model.reason}`);
            console.log(`   📝 الشرح: ${model.explanation}`);
            console.log(`   ⚙️  الإعدادات المطلوبة: ${model.requirements}`);
            console.log(`   ${model.canEnable ? '✅ يمكن تفعيله' : '❌ لا يمكن تفعيله (يحتاج إعدادات خاصة)'}`);
            console.log('');
        });
        
        // فصل النماذج القابلة للتفعيل
        const canEnable = unusedModels.filter(m => m.canEnable);
        const cannotEnable = unusedModels.filter(m => !m.canEnable);
        
        console.log('\n' + '='.repeat(100));
        console.log('\n📋 ملخص:\n');
        console.log(`✅ نماذج يمكن تفعيلها: ${canEnable.length}`);
        canEnable.forEach(m => {
            console.log(`   - ${m.model}`);
        });
        
        console.log(`\n❌ نماذج لا يمكن تفعيلها (تحتاج إعدادات خاصة): ${cannotEnable.length}`);
        cannotEnable.forEach(m => {
            console.log(`   - ${m.model}: ${m.requirements}`);
        });
        
        // تفعيل النماذج القابلة للتفعيل
        console.log('\n' + '='.repeat(100));
        console.log('\n🔧 تفعيل النماذج القابلة للتفعيل...\n');
        
        // جلب جميع المفاتيح النشطة
        const keys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                isActive: true
            }
        });
        
        console.log(`📋 تم العثور على ${keys.length} مفتاح نشط\n`);
        
        let totalEnabled = 0;
        
        for (const key of keys) {
            console.log(`🔑 المفتاح: ${key.name} (ID: ${key.id})`);
            
            for (const modelInfo of canEnable) {
                const model = await getSharedPrismaClient().geminiKeyModel.findFirst({
                    where: {
                        keyId: key.id,
                        model: modelInfo.model
                    }
                });
                
                if (model) {
                    if (!model.isEnabled) {
                        await getSharedPrismaClient().geminiKeyModel.update({
                            where: { id: model.id },
                            data: { isEnabled: true }
                        });
                        console.log(`   ✅ تم تفعيل: ${modelInfo.model}`);
                        totalEnabled++;
                    } else {
                        console.log(`   ℹ️  ${modelInfo.model} مفعل بالفعل`);
                    }
                } else {
                    console.log(`   ⚠️  ${modelInfo.model} غير موجود في هذا المفتاح`);
                }
            }
            console.log('');
        }
        
        console.log(`\n✅ تم تفعيل ${totalEnabled} نموذج بنجاح!\n`);
        
        // تحديث getDisabledModels و getSupportedModels
        console.log('='.repeat(100));
        console.log('\n📝 ملاحظات مهمة:\n');
        console.log('1. gemini-2.5-flash-tts:');
        console.log('   - لا يمكن تفعيله - يحتاج Vertex AI أو endpoint خاص');
        console.log('   - النموذج متوفر لكن لا يعمل مع generateContent API العادي');
        console.log('');
        console.log('2. gemini-3-pro:');
        console.log('   - تم تفعيله في قاعدة البيانات');
        console.log('   - لكن قد يحتاج اشتراك مدفوع أو مفتاح بحد أعلى');
        console.log('   - الاسم الصحيح في API: gemini-3-pro-preview');
        console.log('');
        console.log('3. نماذج Gemma:');
        console.log('   - تم تفعيلها في قاعدة البيانات');
        console.log('   - يجب إزالتها من getDisabledModels() في modelManager.js');
        console.log('   - يجب إضافتها إلى getSupportedModels() في modelManager.js');
        console.log('');
        console.log('4. gemini-2.0-flash-exp:');
        console.log('   - تم تفعيله في قاعدة البيانات');
        console.log('   - نموذج تجريبي - قد يكون غير مستقر');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

analyzeAndEnable();



/**
 * تحليل استهلاك المفتاح بناءً على الصورة
 */

console.log('\n📊 تحليل استهلاك المفتاح من Google AI Studio\n');
console.log('='.repeat(80));

const usageData = [
    {
        model: 'gemini-2.5-pro',
        category: 'Text-out models',
        rpm: { used: 1, limit: 2 },
        tpm: { used: 10, limit: 125000 },
        rpd: { used: 3, limit: 50 },
        status: '✅ مستخدم'
    },
    {
        model: 'gemini-robotics-er-1.5-preview',
        category: 'Other models',
        rpm: { used: 2, limit: 10 },
        tpm: { used: 10, limit: 250000 },
        rpd: { used: 3, limit: 250 },
        status: '✅ مستخدم'
    },
    {
        model: 'learnlm-2.0-flash-experimental',
        category: 'Experimental',
        rpm: { used: 3, limit: 15 },
        tpm: { used: null, limit: null },
        rpd: { used: 4, limit: 1500 },
        status: '✅ مستخدم'
    },
    {
        model: 'gemini-2.5-flash',
        category: 'Text-out models',
        rpm: { used: 1, limit: 10 },
        tpm: { used: 10, limit: 250000 },
        rpd: { used: 3, limit: 250 },
        status: '✅ مستخدم'
    },
    {
        model: 'gemini-2.0-flash-lite',
        category: 'Text-out models',
        rpm: { used: 2, limit: 30 },
        tpm: { used: 29, limit: 1000000 },
        rpd: { used: 5, limit: 200 },
        status: '✅ مستخدم'
    },
    {
        model: 'gemini-2.0-flash',
        category: 'Text-out models',
        rpm: { used: 1, limit: 15 },
        tpm: { used: 9, limit: 1000000 },
        rpd: { used: 3, limit: 200 },
        status: '✅ مستخدم'
    },
    {
        model: 'gemini-2.5-flash-lite',
        category: 'Text-out models',
        rpm: { used: 1, limit: 15 },
        tpm: { used: 13, limit: 250000 },
        rpd: { used: 3, limit: 1000 },
        status: '✅ مستخدم'
    },
    {
        model: 'gemini-2.5-flash-tts',
        category: 'Multi-modal generative models',
        rpm: { used: 0, limit: 3 },
        tpm: { used: 0, limit: 10000 },
        rpd: { used: 0, limit: 15 },
        status: '⚠️ غير مستخدم (0/3 RPM)'
    },
    {
        model: 'gemini-3-pro',
        category: 'Text-out models',
        rpm: { used: null, limit: null },
        tpm: { used: 0, limit: 125000 },
        rpd: { used: null, limit: null },
        status: '⚠️ غير مستخدم (0 TPM)'
    },
    {
        model: 'gemma-3-12b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        status: '❌ غير مستخدم'
    },
    {
        model: 'gemma-3-1b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        status: '❌ غير مستخدم'
    },
    {
        model: 'gemma-3-27b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        status: '❌ غير مستخدم'
    },
    {
        model: 'gemma-3-2b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        status: '❌ غير مستخدم'
    },
    {
        model: 'gemma-3-4b',
        category: 'Other models',
        rpm: { used: 0, limit: 30 },
        tpm: { used: 0, limit: 15000 },
        rpd: { used: 0, limit: 14400 },
        status: '❌ غير مستخدم'
    },
    {
        model: 'gemini-2.0-flash-exp',
        category: 'Text-out models',
        rpm: { used: null, limit: null },
        tpm: { used: null, limit: null },
        rpd: { used: 0, limit: 50 },
        status: '❌ غير مستخدم'
    }
];

console.log('\n✅ النماذج المستخدمة (7 نماذج):\n');
const used = usageData.filter(m => m.rpm.used > 0 || m.tpm.used > 0 || m.rpd.used > 0);
used.forEach(m => {
    console.log(`   ${m.model.padEnd(40)} - RPM: ${m.rpm.used}/${m.rpm.limit || 'N/A'}, RPD: ${m.rpd.used}/${m.rpd.limit || 'N/A'}`);
});

console.log('\n⚠️ النماذج المتوفرة لكن غير مستخدمة (8 نماذج):\n');
const notUsed = usageData.filter(m => m.rpm.used === 0 && m.tpm.used === 0 && m.rpd.used === 0);
notUsed.forEach(m => {
    console.log(`   ${m.model.padEnd(40)} - ${m.status}`);
});

console.log('\n📊 ملخص:\n');
console.log(`   ✅ مستخدمة: ${used.length} نموذج`);
console.log(`   ⚠️ غير مستخدمة: ${notUsed.length} نموذج`);
console.log(`   📋 المجموع: ${usageData.length} نموذج`);

console.log('\n💡 ملاحظات:\n');
console.log('   1. gemini-2.5-flash-tts: متوفر لكن غير مستخدم (0/3 RPM)');
console.log('      - السبب: نموذج TTS متخصص - يحتاج Vertex AI أو endpoint خاص');
console.log('');
console.log('   2. gemini-3-pro: متوفر لكن غير مستخدم (0 TPM)');
console.log('      - السبب: قد يكون المفتاح تجاوز الحد أو النموذج غير مفعل');
console.log('');
console.log('   3. نماذج Gemma: كلها متوفرة لكن غير مستخدمة');
console.log('      - السبب: معطلة افتراضياً في النظام');
console.log('');
console.log('   4. gemini-2.0-flash-exp: متوفر لكن غير مستخدم');
console.log('      - السبب: نموذج تجريبي - معطل افتراضياً');

console.log('\n' + '='.repeat(80));
console.log('\n');


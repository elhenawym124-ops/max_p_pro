/**
 * فحص إعدادات شخصية المساعد الذكي
 * يتحقق من وجود الإعدادات واستخدامها
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const COMPANY_ID = 'cmem8ayyr004cufakqkcsyn97'; // شركة التسويق

async function checkAIPersonalitySettings() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 فحص إعدادات شخصية المساعد الذكي');
    console.log('='.repeat(80) + '\n');

    console.log(`🏢 الشركة: ${COMPANY_ID}\n`);

    // 1. فحص SystemPrompt (الأولوية الأعلى)
    console.log('📋 1. فحص SystemPrompt (الأولوية الأعلى):');
    console.log('-'.repeat(80));
    const systemPrompts = await getSharedPrismaClient().systemPrompt.findMany({
      where: {
        companyId: COMPANY_ID
      },
      orderBy: { updatedAt: 'desc' }
    });

    const activeSystemPrompt = systemPrompts.find(sp => sp.isActive === true);

    if (activeSystemPrompt) {
      console.log(`✅ يوجد SystemPrompt نشط:`);
      console.log(`   - الاسم: ${activeSystemPrompt.name}`);
      console.log(`   - المعرف: ${activeSystemPrompt.id}`);
      console.log(`   - نشط: ${activeSystemPrompt.isActive ? 'نعم' : 'لا'}`);
      console.log(`   - الطول: ${activeSystemPrompt.content?.length || 0} حرف`);
      console.log(`   - المصدر: system_prompt (الأولوية الأعلى)`);
      console.log(`   - تاريخ الإنشاء: ${activeSystemPrompt.createdAt}`);
      console.log(`   - آخر تحديث: ${activeSystemPrompt.updatedAt}`);
      console.log(`\n📝 محتوى الـ Prompt (أول 200 حرف):`);
      console.log(activeSystemPrompt.content?.substring(0, 200) + '...\n');
    } else {
      console.log(`❌ لا يوجد SystemPrompt نشط`);
      if (systemPrompts.length > 0) {
        console.log(`   ⚠️ يوجد ${systemPrompts.length} SystemPrompt لكن غير نشط:`);
        systemPrompts.forEach((sp, index) => {
          console.log(`   ${index + 1}. ${sp.name} (نشط: ${sp.isActive ? 'نعم' : 'لا'})`);
        });
      }
    }

    // 2. فحص AISettings (الأولوية الثانية)
    console.log('\n📋 2. فحص AISettings (الأولوية الثانية):');
    console.log('-'.repeat(80));
    const aiSettings = await getSharedPrismaClient().aiSettings.findFirst({
      where: { companyId: COMPANY_ID }
    });

    if (aiSettings) {
      console.log(`✅ يوجد AISettings:`);
      console.log(`   - المعرف: ${aiSettings.id}`);
      console.log(`   - personalityPrompt موجود: ${!!aiSettings.personalityPrompt}`);
      console.log(`   - responsePrompt موجود: ${!!aiSettings.responsePrompt}`);
      
      if (aiSettings.personalityPrompt) {
        console.log(`   - طول personalityPrompt: ${aiSettings.personalityPrompt.length} حرف`);
        console.log(`   - المصدر: ai_settings (الأولوية الثانية)`);
        console.log(`\n📝 محتوى personalityPrompt (أول 200 حرف):`);
        console.log(aiSettings.personalityPrompt.substring(0, 200) + '...\n');
      } else {
        console.log(`   ⚠️ personalityPrompt فارغ`);
      }

      if (aiSettings.responsePrompt) {
        console.log(`   - طول responsePrompt: ${aiSettings.responsePrompt.length} حرف`);
      } else {
        console.log(`   - responsePrompt: غير موجود`);
      }
    } else {
      console.log(`❌ لا يوجد AISettings`);
    }

    // 3. فحص Company table (ملاحظة: Company table لا يحتوي على personalityPrompt في الإصدار الحالي)
    console.log('\n📋 3. فحص Company table:');
    console.log('-'.repeat(80));
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: COMPANY_ID },
      select: {
        id: true,
        name: true
      }
    });

    if (company) {
      console.log(`✅ الشركة موجودة: ${company.name}`);
      console.log(`   ℹ️ ملاحظة: Company table لا يحتوي على personalityPrompt في الإصدار الحالي`);
      console.log(`   ✅ personalityPrompt موجود فقط في SystemPrompt و AISettings`);
    } else {
      console.log(`❌ الشركة غير موجودة`);
    }

    // 4. محاكاة getCompanyPrompts
    console.log('\n📋 4. محاكاة getCompanyPrompts (ما سيستخدمه النظام فعلياً):');
    console.log('-'.repeat(80));
    
    let companyPrompts = {
      personalityPrompt: null,
      responsePrompt: null,
      hasCustomPrompts: false,
      source: 'none'
    };

    // الأولوية 1: SystemPrompt
    if (activeSystemPrompt) {
      companyPrompts = {
        personalityPrompt: activeSystemPrompt.content,
        responsePrompt: null,
        hasCustomPrompts: true,
        source: 'system_prompt',
        promptName: activeSystemPrompt.name
      };
    }
    // الأولوية 2: AISettings
    else if (aiSettings && (aiSettings.personalityPrompt || aiSettings.responsePrompt)) {
      companyPrompts = {
        personalityPrompt: aiSettings.personalityPrompt,
        responsePrompt: aiSettings.responsePrompt,
        hasCustomPrompts: !!(aiSettings.personalityPrompt || aiSettings.responsePrompt),
        source: 'ai_settings'
      };
    }
    // ملاحظة: Company table لا يحتوي على personalityPrompt في الإصدار الحالي

    console.log(`✅ النتيجة من getCompanyPrompts:`);
    console.log(`   - personalityPrompt موجود: ${!!companyPrompts.personalityPrompt}`);
    console.log(`   - responsePrompt موجود: ${!!companyPrompts.responsePrompt}`);
    console.log(`   - hasCustomPrompts: ${companyPrompts.hasCustomPrompts}`);
    console.log(`   - المصدر: ${companyPrompts.source}`);
    console.log(`   - promptName: ${companyPrompts.promptName || 'غير محدد'}`);

    if (companyPrompts.personalityPrompt) {
      console.log(`   - طول personalityPrompt: ${companyPrompts.personalityPrompt.length} حرف`);
      console.log(`\n📝 محتوى personalityPrompt الذي سيستخدمه النظام (أول 200 حرف):`);
      console.log(companyPrompts.personalityPrompt.substring(0, 200) + '...\n');
    } else {
      console.log(`   ❌ personalityPrompt فارغ - النظام سيفشل!`);
    }

    // 5. فحص المشاكل
    console.log('\n📋 5. فحص المشاكل:');
    console.log('-'.repeat(80));

    const issues = [];

    // المشكلة 1: لا يوجد personalityPrompt
    if (!companyPrompts.personalityPrompt || companyPrompts.personalityPrompt.trim() === '') {
      issues.push({
        severity: 'critical',
        issue: 'لا يوجد personalityPrompt',
        description: 'النظام سيفشل في توليد الردود لأن personalityPrompt مطلوب',
        solution: 'يجب إضافة personalityPrompt في SystemPrompt أو AISettings أو Company table'
      });
    }

    // المشكلة 2: personalityPrompt قصير جداً
    if (companyPrompts.personalityPrompt && companyPrompts.personalityPrompt.length < 50) {
      issues.push({
        severity: 'warning',
        issue: 'personalityPrompt قصير جداً',
        description: `الطول: ${companyPrompts.personalityPrompt.length} حرف - قد لا يكون كافياً`,
        solution: 'يُنصح بإضافة المزيد من التفاصيل عن شخصية المساعد'
      });
    }

    // المشكلة 3: personalityPrompt طويل جداً
    if (companyPrompts.personalityPrompt && companyPrompts.personalityPrompt.length > 5000) {
      issues.push({
        severity: 'warning',
        issue: 'personalityPrompt طويل جداً',
        description: `الطول: ${companyPrompts.personalityPrompt.length} حرف - قد يستهلك tokens كثيرة`,
        solution: 'يُنصح بتقليل الطول لتوفير tokens'
      });
    }

    // المشكلة 4: SystemPrompt غير نشط
    if (systemPrompts.length > 0 && !activeSystemPrompt) {
      issues.push({
        severity: 'info',
        issue: 'SystemPrompt موجود لكن غير نشط',
        description: `يوجد ${systemPrompts.length} SystemPrompt لكن لا يوجد نشط`,
        solution: 'يُنصح بتفعيل SystemPrompt أو استخدام AISettings'
      });
    }

    // المشكلة 5: personalityPrompt قصير جداً (أقل من 100 حرف)
    if (companyPrompts.personalityPrompt && companyPrompts.personalityPrompt.length < 100) {
      issues.push({
        severity: 'warning',
        issue: 'personalityPrompt قصير جداً',
        description: `الطول: ${companyPrompts.personalityPrompt.length} حرف - قد لا يكون كافياً لوصف الشخصية بشكل كامل`,
        solution: 'يُنصح بإضافة المزيد من التفاصيل عن شخصية المساعد (على الأقل 100-200 حرف)'
      });
    }

    // المشكلة 6: مصادر متعددة
    const hasSystemPrompt = !!activeSystemPrompt;
    const hasAISettings = !!(aiSettings?.personalityPrompt);
    const sourceCount = [hasSystemPrompt, hasAISettings].filter(Boolean).length;

    if (sourceCount > 1) {
      issues.push({
        severity: 'info',
        issue: 'مصادر متعددة لـ personalityPrompt',
        description: `يوجد personalityPrompt في ${sourceCount} مصدر - الأولوية: SystemPrompt > AISettings > Company`,
        solution: 'النظام يستخدم SystemPrompt أولاً (إذا كان نشط)'
      });
    }

    if (issues.length === 0) {
      console.log('✅ لا توجد مشاكل - الإعدادات صحيحة');
    } else {
      console.log(`⚠️ تم اكتشاف ${issues.length} مشكلة:\n`);
      issues.forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${index + 1}. ${issue.issue}`);
        console.log(`   الوصف: ${issue.description}`);
        console.log(`   الحل: ${issue.solution}\n`);
      });
    }

    // 6. ملخص
    console.log('\n📊 الملخص:');
    console.log('='.repeat(80));
    console.log(`✅ النظام يستخدم personalityPrompt: ${companyPrompts.hasCustomPrompts ? 'نعم' : 'لا'}`);
    console.log(`📝 المصدر المستخدم: ${companyPrompts.source}`);
    console.log(`📏 طول personalityPrompt: ${companyPrompts.personalityPrompt?.length || 0} حرف`);
    console.log(`⚠️ عدد المشاكل: ${issues.length}`);

    if (companyPrompts.hasCustomPrompts) {
      console.log(`\n✅ الإجابة: نعم، النظام يستخدم إعدادات شخصية المساعد الذكي`);
      console.log(`   المصدر: ${companyPrompts.source}`);
      console.log(`   ✅ النظام يعمل بشكل صحيح`);
    } else {
      console.log(`\n❌ الإجابة: لا، النظام لا يستخدم إعدادات شخصية المساعد الذكي`);
      console.log(`   يجب إضافة personalityPrompt في SystemPrompt أو AISettings`);
      console.log(`   ⚠️ النظام سيفشل في توليد الردود!`);
    }

  } catch (error) {
    console.error('❌ خطأ في الفحص:', error);
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

checkAIPersonalitySettings();


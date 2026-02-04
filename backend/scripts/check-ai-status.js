#!/usr/bin/env node

/**
 * سكريبت لفحص حالة الذكاء الاصطناعي من قاعدة البيانات
 * AI Status Checker Script
 * 
 * يعرض حالة الذكاء الاصطناعي لجميع الشركات ويسمح بتعديلها
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function checkAIStatus() {
  try {
    console.log('🔍 فحص حالة الذكاء الاصطناعي لجميع الشركات...\n');
    
    // جلب جميع الشركات مع إعدادات الذكاء الاصطناعي
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        aiSettings: {
          select: {
            id: true,
            autoReplyEnabled: true,
            qualityEvaluationEnabled: true,
            confidenceThreshold: true,
            multimodalEnabled: true,
            ragEnabled: true,
            replyMode: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    if (companies.length === 0) {
      console.log('❌ لم يتم العثور على أي شركات في قاعدة البيانات');
      return;
    }

    console.log(`📊 تم العثور على ${companies.length} شركة:\n`);
    console.log('=' .repeat(80));

    companies.forEach((company, index) => {
      console.log(`\n${index + 1}. الشركة: ${company.name} (ID: ${company.id})`);
      
      if (company.aiSettings) {
        const ai = company.aiSettings;
        console.log(`   🤖 الذكاء الاصطناعي: ${ai.autoReplyEnabled ? '✅ مُفعل' : '❌ معطل'}`);
        console.log(`   📊 تقييم الجودة: ${ai.qualityEvaluationEnabled ? '✅ مُفعل' : '❌ معطل'}`);
        console.log(`   🎯 عتبة الثقة: ${ai.confidenceThreshold || 'غير محدد'}`);
        console.log(`   🖼️  الوسائط المتعددة: ${ai.multimodalEnabled ? '✅ مُفعل' : '❌ معطل'}`);
        console.log(`   📚 RAG: ${ai.ragEnabled ? '✅ مُفعل' : '❌ معطل'}`);
        console.log(`   💬 وضع الرد: ${ai.replyMode || 'غير محدد'}`);
        console.log(`   📅 آخر تحديث: ${ai.updatedAt ? new Date(ai.updatedAt).toLocaleString('ar-EG') : 'غير محدد'}`);
      } else {
        console.log('   ⚠️  لا توجد إعدادات ذكاء اصطناعي لهذه الشركة');
      }
      
      console.log('-'.repeat(60));
    });

    console.log('\n🔧 الخيارات المتاحة:');
    console.log('1. تفعيل الذكاء الاصطناعي لشركة معينة');
    console.log('2. إيقاف الذكاء الاصطناعي لشركة معينة');
    console.log('3. تفعيل الذكاء الاصطناعي لجميع الشركات');
    console.log('4. إيقاف الذكاء الاصطناعي لجميع الشركات');
    console.log('5. إنشاء إعدادات ذكاء اصطناعي لشركة بدون إعدادات');
    console.log('0. خروج');

    rl.question('\nاختر رقم العملية المطلوبة: ', async (choice) => {
      await handleChoice(choice, companies);
    });

  } catch (error) {
    console.error('❌ خطأ في فحص حالة الذكاء الاصطناعي:', error);
  }
}

async function handleChoice(choice, companies) {
  try {
    switch (choice) {
      case '1':
        await toggleAIForSpecificCompany(companies, true);
        break;
      case '2':
        await toggleAIForSpecificCompany(companies, false);
        break;
      case '3':
        await toggleAIForAllCompanies(true);
        break;
      case '4':
        await toggleAIForAllCompanies(false);
        break;
      case '5':
        await createAISettingsForCompany(companies);
        break;
      case '0':
        console.log('👋 وداعاً!');
        await prisma.$disconnect();
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('❌ اختيار غير صحيح. حاول مرة أخرى.');
        await checkAIStatus();
        break;
    }
  } catch (error) {
    console.error('❌ خطأ في تنفيذ العملية:', error);
    await checkAIStatus();
  }
}

async function toggleAIForSpecificCompany(companies, enable) {
  console.log('\n📋 الشركات المتاحة:');
  companies.forEach((company, index) => {
    const status = company.aiSettings?.autoReplyEnabled ? '✅' : '❌';
    console.log(`${index + 1}. ${company.name} ${status}`);
  });

  rl.question('\nاختر رقم الشركة: ', async (companyIndex) => {
    const index = parseInt(companyIndex) - 1;
    
    if (index < 0 || index >= companies.length) {
      console.log('❌ رقم الشركة غير صحيح');
      await checkAIStatus();
      return;
    }

    const company = companies[index];
    const action = enable ? 'تفعيل' : 'إيقاف';
    
    try {
      if (company.aiSettings) {
        // تحديث الإعدادات الموجودة
        await prisma.aiSettings.update({
          where: { companyId: company.id },
          data: { 
            autoReplyEnabled: enable,
            updatedAt: new Date()
          }
        });
      } else {
        // إنشاء إعدادات جديدة
        await prisma.aiSettings.create({
          data: {
            companyId: company.id,
            autoReplyEnabled: enable,
            qualityEvaluationEnabled: true,
            confidenceThreshold: 0.7,
            multimodalEnabled: true,
            ragEnabled: true,
            replyMode: 'all'
          }
        });
      }

      console.log(`✅ تم ${action} الذكاء الاصطناعي للشركة: ${company.name}`);
      
      // إعادة فحص الحالة
      setTimeout(() => checkAIStatus(), 1000);
      
    } catch (error) {
      console.error(`❌ خطأ في ${action} الذكاء الاصطناعي:`, error);
      await checkAIStatus();
    }
  });
}

async function toggleAIForAllCompanies(enable) {
  const action = enable ? 'تفعيل' : 'إيقاف';
  
  rl.question(`\n⚠️  هل أنت متأكد من ${action} الذكاء الاصطناعي لجميع الشركات؟ (y/N): `, async (confirm) => {
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ تم إلغاء العملية');
      await checkAIStatus();
      return;
    }

    try {
      console.log(`🔄 جاري ${action} الذكاء الاصطناعي لجميع الشركات...`);
      
      // تحديث جميع الإعدادات الموجودة
      const updateResult = await prisma.aiSettings.updateMany({
        data: { 
          autoReplyEnabled: enable,
          updatedAt: new Date()
        }
      });

      // إنشاء إعدادات للشركات التي لا تملك إعدادات
      const companiesWithoutSettings = await prisma.company.findMany({
        where: {
          aiSettings: null
        },
        select: { id: true, name: true }
      });

      if (companiesWithoutSettings.length > 0) {
        console.log(`📝 إنشاء إعدادات لـ ${companiesWithoutSettings.length} شركة بدون إعدادات...`);
        
        for (const company of companiesWithoutSettings) {
          await prisma.aiSettings.create({
            data: {
              companyId: company.id,
              autoReplyEnabled: enable,
              qualityEvaluationEnabled: true,
              confidenceThreshold: 0.7,
              multimodalEnabled: true,
              ragEnabled: true,
              replyMode: 'all'
            }
          });
        }
      }

      console.log(`✅ تم ${action} الذكاء الاصطناعي لجميع الشركات`);
      console.log(`📊 تم تحديث ${updateResult.count} إعدادات موجودة`);
      console.log(`📝 تم إنشاء ${companiesWithoutSettings.length} إعدادات جديدة`);
      
      // إعادة فحص الحالة
      setTimeout(() => checkAIStatus(), 1000);
      
    } catch (error) {
      console.error(`❌ خطأ في ${action} الذكاء الاصطناعي لجميع الشركات:`, error);
      await checkAIStatus();
    }
  });
}

async function createAISettingsForCompany(companies) {
  const companiesWithoutSettings = companies.filter(c => !c.aiSettings);
  
  if (companiesWithoutSettings.length === 0) {
    console.log('✅ جميع الشركات لديها إعدادات ذكاء اصطناعي');
    await checkAIStatus();
    return;
  }

  console.log('\n📋 الشركات بدون إعدادات ذكاء اصطناعي:');
  companiesWithoutSettings.forEach((company, index) => {
    console.log(`${index + 1}. ${company.name}`);
  });

  rl.question('\nاختر رقم الشركة لإنشاء إعدادات لها: ', async (companyIndex) => {
    const index = parseInt(companyIndex) - 1;
    
    if (index < 0 || index >= companiesWithoutSettings.length) {
      console.log('❌ رقم الشركة غير صحيح');
      await checkAIStatus();
      return;
    }

    const company = companiesWithoutSettings[index];
    
    try {
      await prisma.aiSettings.create({
        data: {
          companyId: company.id,
          autoReplyEnabled: false, // معطل افتراضياً
          qualityEvaluationEnabled: true,
          confidenceThreshold: 0.7,
          multimodalEnabled: true,
          ragEnabled: true,
          replyMode: 'all'
        }
      });

      console.log(`✅ تم إنشاء إعدادات ذكاء اصطناعي للشركة: ${company.name}`);
      
      // إعادة فحص الحالة
      setTimeout(() => checkAIStatus(), 1000);
      
    } catch (error) {
      console.error('❌ خطأ في إنشاء إعدادات الذكاء الاصطناعي:', error);
      await checkAIStatus();
    }
  });
}

// بدء تشغيل السكريبت
console.log('🚀 بدء تشغيل سكريبت فحص حالة الذكاء الاصطناعي...\n');
checkAIStatus().catch(console.error);

// التعامل مع إغلاق السكريبت
process.on('SIGINT', async () => {
  console.log('\n\n👋 إغلاق السكريبت...');
  await prisma.$disconnect();
  rl.close();
  process.exit(0);
});

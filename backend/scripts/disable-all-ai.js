#!/usr/bin/env node

/**
 * سكريبت إيقاف الذكاء الاصطناعي لجميع الشركات
 * Disable AI for All Companies Script
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function disableAllAI() {
  try {
    console.log('🛑 بدء إيقاف الذكاء الاصطناعي لجميع الشركات...\n');
    
    // جلب جميع الشركات مع إعدادات الذكاء الاصطناعي
    const companies = await prisma.company.findMany({
      include: {
        aiSettings: true
      }
    });

    console.log(`📊 تم العثور على ${companies.length} شركة`);
    
    // فلترة الشركات التي لديها ذكاء اصطناعي مُفعل
    const enabledCompanies = companies.filter(c => c.aiSettings?.autoReplyEnabled);
    const disabledCompanies = companies.filter(c => c.aiSettings && !c.aiSettings.autoReplyEnabled);
    const noSettingsCompanies = companies.filter(c => !c.aiSettings);

    console.log(`✅ مُفعل حالياً: ${enabledCompanies.length} شركة`);
    console.log(`❌ معطل بالفعل: ${disabledCompanies.length} شركة`);
    console.log(`⚠️ بدون إعدادات: ${noSettingsCompanies.length} شركة`);

    if (enabledCompanies.length === 0) {
      console.log('\n✅ الذكاء الاصطناعي معطل بالفعل لجميع الشركات!');
      return;
    }

    console.log('\n🔧 إيقاف الذكاء الاصطناعي للشركات المُفعلة...');
    
    // إيقاف الذكاء الاصطناعي لجميع الشركات
    const updateResult = await prisma.aiSettings.updateMany({
      where: {
        autoReplyEnabled: true
      },
      data: { 
        autoReplyEnabled: false,
        updatedAt: new Date()
      }
    });

    console.log(`✅ تم إيقاف الذكاء الاصطناعي لـ ${updateResult.count} شركة`);

    // عرض الشركات التي تم إيقافها
    console.log('\n📋 الشركات التي تم إيقاف الذكاء الاصطناعي لها:');
    enabledCompanies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name} (${company.id})`);
    });

    console.log('\n📊 الحالة النهائية:');
    console.log('❌ جميع الشركات: الذكاء الاصطناعي معطل');
    console.log('✅ يمكنك الآن تفعيله من الواجهة لأي شركة تريدها');

  } catch (error) {
    console.error('❌ خطأ في إيقاف الذكاء الاصطناعي:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
disableAllAI().catch(console.error);

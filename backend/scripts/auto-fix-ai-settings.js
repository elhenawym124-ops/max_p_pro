#!/usr/bin/env node

/**
 * سكريبت إصلاح تلقائي لإعدادات الذكاء الاصطناعي
 * Auto-fix AI Settings Script
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function autoFixAISettings() {
  try {
    console.log('🔧 بدء الإصلاح التلقائي لإعدادات الذكاء الاصطناعي...\n');
    
    // جلب جميع الشركات
    const companies = await prisma.company.findMany({
      include: {
        aiSettings: true
      }
    });

    console.log(`📊 تم العثور على ${companies.length} شركة`);
    
    // العثور على الشركات بدون إعدادات
    const companiesWithoutSettings = companies.filter(c => !c.aiSettings);
    
    if (companiesWithoutSettings.length === 0) {
      console.log('✅ جميع الشركات لديها إعدادات ذكاء اصطناعي');
      return;
    }

    console.log(`⚠️ ${companiesWithoutSettings.length} شركة بدون إعدادات ذكاء اصطناعي:`);
    companiesWithoutSettings.forEach(company => {
      console.log(`   - ${company.name} (${company.id})`);
    });

    console.log('\n🔧 إنشاء إعدادات ذكاء اصطناعي للشركات...');
    
    // إنشاء إعدادات لكل شركة
    for (const company of companiesWithoutSettings) {
      try {
        await prisma.aiSettings.create({
          data: {
            companyId: company.id,
            autoReplyEnabled: false, // معطل افتراضياً للأمان
            qualityEvaluationEnabled: true,
            confidenceThreshold: 0.7,
            multimodalEnabled: true,
            ragEnabled: true,
            replyMode: 'all',
            aiTemperature: 0.7,
            aiTopP: 0.9,
            aiTopK: 40,
            aiMaxTokens: 2048,
            aiResponseStyle: 'balanced',
            enableDiversityCheck: true,
            enableToneAdaptation: true,
            enableEmotionalResponse: true,
            enableSmartSuggestions: false,
            enableLongTermMemory: false,
            maxMessagesPerConversation: 50,
            memoryRetentionDays: 30,
            minQualityScore: 70,
            enableLowQualityAlerts: true
          }
        });
        
        console.log(`✅ تم إنشاء إعدادات للشركة: ${company.name}`);
        
      } catch (error) {
        console.error(`❌ فشل في إنشاء إعدادات للشركة ${company.name}:`, error.message);
      }
    }

    console.log('\n📊 إحصائيات نهائية:');
    
    // إعادة فحص الحالة
    const updatedCompanies = await prisma.company.findMany({
      include: {
        aiSettings: true
      }
    });

    const enabledCount = updatedCompanies.filter(c => c.aiSettings?.autoReplyEnabled).length;
    const disabledCount = updatedCompanies.filter(c => c.aiSettings && !c.aiSettings.autoReplyEnabled).length;
    const noSettingsCount = updatedCompanies.filter(c => !c.aiSettings).length;

    console.log(`✅ مُفعل: ${enabledCount} شركة`);
    console.log(`❌ معطل: ${disabledCount} شركة`);
    console.log(`⚠️ بدون إعدادات: ${noSettingsCount} شركة`);

    if (noSettingsCount === 0) {
      console.log('\n🎉 تم إصلاح جميع المشاكل بنجاح!');
    }

  } catch (error) {
    console.error('❌ خطأ في الإصلاح التلقائي:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الإصلاح
autoFixAISettings().catch(console.error);

#!/usr/bin/env node

/**
 * سكريبت إصلاح إعدادات ذاكرة الذكاء الاصطناعي
 * Fix AI Memory and Context Settings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAIMemory() {
  try {
    console.log('🔧 إصلاح إعدادات ذاكرة الذكاء الاصطناعي للشركة "SM"...\n');
    
    // البحث عن الشركة SM
    const smCompany = await prisma.company.findFirst({
      where: {
        name: 'SM'
      },
      include: {
        aiSettings: true
      }
    });

    if (!smCompany || !smCompany.aiSettings) {
      console.log('❌ لم يتم العثور على الشركة "SM" أو إعدادات الذكاء الاصطناعي');
      return;
    }

    console.log(`🏢 الشركة: ${smCompany.name} (${smCompany.id})\n`);

    console.log('📊 الإعدادات الحالية:');
    console.log(`   🧠 الذاكرة طويلة المدى: ${smCompany.aiSettings.enableLongTermMemory ? '✅ مُفعلة' : '❌ معطلة'}`);
    console.log(`   💬 الحد الأقصى للرسائل: ${smCompany.aiSettings.maxMessagesPerConversation}`);
    console.log(`   📅 مدة الاحتفاظ بالذاكرة: ${smCompany.aiSettings.memoryRetentionDays} يوم`);

    // تحديث الإعدادات لتحسين الذاكرة والسياق
    const updatedSettings = await prisma.aiSettings.update({
      where: {
        companyId: smCompany.id
      },
      data: {
        // تفعيل الذاكرة طويلة المدى
        enableLongTermMemory: true,
        
        // زيادة الحد الأقصى للرسائل في المحادثة
        maxMessagesPerConversation: 100,
        
        // زيادة مدة الاحتفاظ بالذاكرة
        memoryRetentionDays: 90,
        
        // تحسين إعدادات الاستجابة للحصول على سياق أفضل
        aiTemperature: 0.6, // تقليل العشوائية قليلاً للحصول على ردود أكثر اتساقاً
        aiTopP: 0.85,
        
        // تفعيل التكيف العاطفي والنبرة
        enableToneAdaptation: true,
        enableEmotionalResponse: true,
        
        // تفعيل الاقتراحات الذكية
        enableSmartSuggestions: true,
        
        updatedAt: new Date()
      }
    });

    console.log('\n✅ تم تحديث الإعدادات بنجاح!\n');

    console.log('📊 الإعدادات الجديدة:');
    console.log(`   🧠 الذاكرة طويلة المدى: ${updatedSettings.enableLongTermMemory ? '✅ مُفعلة' : '❌ معطلة'}`);
    console.log(`   💬 الحد الأقصى للرسائل: ${updatedSettings.maxMessagesPerConversation}`);
    console.log(`   📅 مدة الاحتفاظ بالذاكرة: ${updatedSettings.memoryRetentionDays} يوم`);
    console.log(`   🌡️ درجة الحرارة: ${updatedSettings.aiTemperature}`);
    console.log(`   🎲 Top P: ${updatedSettings.aiTopP}`);
    console.log(`   🎭 التكيف العاطفي: ${updatedSettings.enableEmotionalResponse ? '✅ مُفعل' : '❌ معطل'}`);
    console.log(`   🎯 التكيف مع النبرة: ${updatedSettings.enableToneAdaptation ? '✅ مُفعل' : '❌ معطل'}`);
    console.log(`   💡 الاقتراحات الذكية: ${updatedSettings.enableSmartSuggestions ? '✅ مُفعل' : '❌ معطل'}`);

    console.log('\n🎉 تم إصلاح إعدادات الذاكرة بنجاح!');
    console.log('\n💡 الآن الذكاء الاصطناعي سوف:');
    console.log('   ✅ يتذكر المحادثات السابقة');
    console.log('   ✅ يحتفظ بالسياق لفترة أطول');
    console.log('   ✅ يقدم ردود أكثر شخصية واتساقاً');
    console.log('   ✅ يتكيف مع نبرة المحادثة');
    console.log('   ✅ يقدم اقتراحات ذكية');

    console.log('\n🧪 للاختبار:');
    console.log('   1. ابدأ محادثة جديدة مع الذكاء الاصطناعي');
    console.log('   2. اذكر اسمك أو معلومة شخصية');
    console.log('   3. في رسالة لاحقة، اسأله عن هذه المعلومة');
    console.log('   4. يجب أن يتذكرها ويرد بناءً عليها');

  } catch (error) {
    console.error('❌ خطأ في إصلاح إعدادات الذاكرة:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الإصلاح
fixAIMemory().catch(console.error);

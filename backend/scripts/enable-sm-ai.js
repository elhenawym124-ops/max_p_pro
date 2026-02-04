#!/usr/bin/env node

/**
 * سكريبت تفعيل الذكاء الاصطناعي للشركة SM
 * Enable AI for SM Company
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableSMAI() {
  try {
    console.log('🔧 تفعيل الذكاء الاصطناعي للشركة "SM"...\n');
    
    // البحث عن الشركة SM
    const smCompany = await prisma.company.findFirst({
      where: {
        name: 'SM'
      },
      include: {
        aiSettings: true
      }
    });

    if (!smCompany) {
      console.log('❌ لم يتم العثور على الشركة "SM"');
      return;
    }

    console.log(`✅ تم العثور على الشركة: ${smCompany.name} (${smCompany.id})`);

    if (!smCompany.aiSettings) {
      console.log('⚠️ لا توجد إعدادات ذكاء اصطناعي، سيتم إنشاؤها...');
      
      // إنشاء إعدادات جديدة
      const newSettings = await prisma.aiSettings.create({
        data: {
          companyId: smCompany.id,
          autoReplyEnabled: true, // تفعيل الذكاء الاصطناعي
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

      console.log('✅ تم إنشاء إعدادات الذكاء الاصطناعي وتفعيلها');
      
    } else {
      // تحديث الإعدادات الموجودة
      const updatedSettings = await prisma.aiSettings.update({
        where: {
          companyId: smCompany.id
        },
        data: {
          autoReplyEnabled: true, // تفعيل الذكاء الاصطناعي
          updatedAt: new Date()
        }
      });

      console.log('✅ تم تفعيل الذكاء الاصطناعي للشركة');
    }

    // التحقق من النتيجة
    const updatedCompany = await prisma.company.findUnique({
      where: { id: smCompany.id },
      include: { aiSettings: true }
    });

    console.log('\n📊 الحالة النهائية:');
    console.log(`🏢 الشركة: ${updatedCompany.name}`);
    console.log(`🤖 الذكاء الاصطناعي: ${updatedCompany.aiSettings.autoReplyEnabled ? '✅ مُفعل' : '❌ معطل'}`);
    console.log(`📊 تقييم الجودة: ${updatedCompany.aiSettings.qualityEvaluationEnabled ? '✅ مُفعل' : '❌ معطل'}`);
    console.log(`🎯 عتبة الثقة: ${updatedCompany.aiSettings.confidenceThreshold}`);
    console.log(`💬 وضع الرد: ${updatedCompany.aiSettings.replyMode}`);
    console.log(`📅 آخر تحديث: ${updatedCompany.aiSettings.updatedAt.toLocaleString('ar-EG')}`);

    console.log('\n🎉 تم تفعيل الذكاء الاصطناعي بنجاح!');
    console.log('💡 الآن يمكن للذكاء الاصطناعي الرد على رسائل العملاء في هذه الشركة.');

  } catch (error) {
    console.error('❌ خطأ في تفعيل الذكاء الاصطناعي:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل التفعيل
enableSMAI().catch(console.error);

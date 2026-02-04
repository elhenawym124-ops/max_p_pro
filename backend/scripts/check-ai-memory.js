#!/usr/bin/env node

/**
 * سكريبت فحص إعدادات ذاكرة الذكاء الاصطناعي
 * Check AI Memory and Context Settings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAIMemory() {
  try {
    console.log('🧠 فحص إعدادات ذاكرة الذكاء الاصطناعي للشركة "SM"...\n');
    
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

    console.log(`🏢 الشركة: ${smCompany.name} (${smCompany.id})\n`);

    if (!smCompany.aiSettings) {
      console.log('❌ لا توجد إعدادات ذكاء اصطناعي');
      return;
    }

    const ai = smCompany.aiSettings;

    console.log('🔍 إعدادات الذاكرة والسياق الحالية:');
    console.log('================================================');
    console.log(`🧠 الذاكرة طويلة المدى: ${ai.enableLongTermMemory ? '✅ مُفعلة' : '❌ معطلة'}`);
    console.log(`💬 الحد الأقصى للرسائل في المحادثة: ${ai.maxMessagesPerConversation}`);
    console.log(`📅 مدة الاحتفاظ بالذاكرة: ${ai.memoryRetentionDays} يوم`);
    console.log(`🎯 وضع الرد: ${ai.replyMode}`);
    console.log(`🔧 نمط الاستجابة: ${ai.aiResponseStyle}`);
    console.log(`🌡️ درجة الحرارة: ${ai.aiTemperature}`);
    console.log(`🎲 Top P: ${ai.aiTopP}`);
    console.log(`🔢 Max Tokens: ${ai.aiMaxTokens}`);

    console.log('\n📊 المشاكل المحتملة:');
    console.log('================================================');

    const issues = [];

    if (!ai.enableLongTermMemory) {
      issues.push('❌ الذاكرة طويلة المدى معطلة - الذكاء الاصطناعي لا يتذكر المحادثات السابقة');
    }

    if (ai.maxMessagesPerConversation < 10) {
      issues.push(`⚠️ الحد الأقصى للرسائل منخفض جداً (${ai.maxMessagesPerConversation}) - قد يفقد السياق بسرعة`);
    }

    if (ai.memoryRetentionDays < 7) {
      issues.push(`⚠️ مدة الاحتفاظ بالذاكرة قصيرة (${ai.memoryRetentionDays} يوم) - قد ينسى المحادثات القديمة`);
    }

    if (ai.aiTemperature > 0.8) {
      issues.push(`⚠️ درجة الحرارة عالية (${ai.aiTemperature}) - قد تؤدي لردود غير متسقة`);
    }

    if (issues.length === 0) {
      console.log('✅ لا توجد مشاكل واضحة في الإعدادات');
    } else {
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    // فحص المحادثات الحديثة
    console.log('\n💬 فحص المحادثات الحديثة:');
    console.log('================================================');

    const conversations = await prisma.conversation.findMany({
      where: {
        companyId: smCompany.id
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        customer: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });

    if (conversations.length === 0) {
      console.log('❌ لا توجد محادثات');
    } else {
      conversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. محادثة مع: ${conv.customer?.name || conv.customer?.phone || 'عميل غير معروف'}`);
        console.log(`   📋 ID: ${conv.id}`);
        console.log(`   📅 آخر تحديث: ${conv.updatedAt.toLocaleString('ar-EG')}`);
        console.log(`   💬 عدد الرسائل: ${conv.messages.length}`);
        
        if (conv.messages.length > 0) {
          const lastMessage = conv.messages[0];
          const sender = lastMessage.sender === 'CUSTOMER' ? 'العميل' : 
                        lastMessage.sender === 'AI' ? 'الذكاء الاصطناعي' : 'المستخدم';
          console.log(`   📝 آخر رسالة من: ${sender}`);
          console.log(`   📄 المحتوى: ${lastMessage.content.substring(0, 100)}...`);
        }
      });
    }

    // اقتراحات الإصلاح
    console.log('\n💡 اقتراحات الإصلاح:');
    console.log('================================================');
    
    if (!ai.enableLongTermMemory) {
      console.log('1. تفعيل الذاكرة طويلة المدى');
    }
    
    if (ai.maxMessagesPerConversation < 20) {
      console.log('2. زيادة الحد الأقصى للرسائل إلى 20-50 رسالة');
    }
    
    if (ai.memoryRetentionDays < 30) {
      console.log('3. زيادة مدة الاحتفاظ بالذاكرة إلى 30-90 يوم');
    }
    
    console.log('4. التأكد من أن الذكاء الاصطناعي يحصل على سياق المحادثة كاملاً');
    console.log('5. فحص إعدادات الـ prompt template للتأكد من تضمين تاريخ المحادثة');

  } catch (error) {
    console.error('❌ خطأ في فحص إعدادات الذاكرة:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الفحص
checkAIMemory().catch(console.error);

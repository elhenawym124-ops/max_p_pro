#!/usr/bin/env node

/**
 * سكريبت البحث عن الشركة SM وفحص حالة الذكاء الاصطناعي
 * Find SM Company and Check AI Status
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSMCompany() {
  try {
    console.log('🔍 البحث عن الشركة "SM"...\n');
    
    // البحث عن الشركة بالاسم
    const companies = await prisma.company.findMany({
      where: {
        name: {
          contains: 'SM'
        }
      },
      include: {
        aiSettings: true,
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (companies.length === 0) {
      console.log('❌ لم يتم العثور على شركة تحتوي على "SM" في الاسم');
      
      // البحث في جميع الشركات للعثور على أسماء مشابهة
      const allCompanies = await prisma.company.findMany({
        select: {
          id: true,
          name: true
        },
        take: 50
      });
      
      console.log('\n📋 أسماء الشركات المتاحة:');
      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (${company.id})`);
      });
      
      return;
    }

    console.log(`✅ تم العثور على ${companies.length} شركة تحتوي على "SM":\n`);

    for (const company of companies) {
      console.log(`🏢 الشركة: ${company.name}`);
      console.log(`   📋 ID: ${company.id}`);
      console.log(`   📅 تاريخ الإنشاء: ${company.createdAt.toLocaleString('ar-EG')}`);
      
      // فحص المستخدمين
      console.log(`   👥 عدد المستخدمين: ${company.users.length}`);
      if (company.users.length > 0) {
        company.users.forEach(user => {
          const userName = user.firstName && user.lastName ? 
            `${user.firstName} ${user.lastName}` : 
            user.email;
          console.log(`      - ${userName} (${user.role})`);
        });
      }

      // فحص إعدادات الذكاء الاصطناعي
      if (company.aiSettings) {
        const ai = company.aiSettings;
        console.log(`   🤖 الذكاء الاصطناعي: ${ai.autoReplyEnabled ? '✅ مُفعل' : '❌ معطل'}`);
        console.log(`   📊 تقييم الجودة: ${ai.qualityEvaluationEnabled ? '✅ مُفعل' : '❌ معطل'}`);
        console.log(`   🎯 عتبة الثقة: ${ai.confidenceThreshold}`);
        console.log(`   💬 وضع الرد: ${ai.replyMode}`);
        console.log(`   📅 آخر تحديث: ${ai.updatedAt.toLocaleString('ar-EG')}`);
        
        // فحص الإعدادات المتقدمة
        console.log(`   🔧 الإعدادات المتقدمة:`);
        console.log(`      - درجة الحرارة: ${ai.aiTemperature}`);
        console.log(`      - Max Tokens: ${ai.aiMaxTokens}`);
        console.log(`      - نمط الاستجابة: ${ai.aiResponseStyle}`);
        
      } else {
        console.log(`   ⚠️ لا توجد إعدادات ذكاء اصطناعي لهذه الشركة`);
      }

      // فحص الرسائل الحديثة
      const recentMessages = await prisma.message.findMany({
        where: {
          conversation: {
            companyId: company.id
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          conversation: {
            include: {
              customer: true
            }
          }
        }
      });

      console.log(`   💬 الرسائل الحديثة: ${recentMessages.length}`);
      if (recentMessages.length > 0) {
        recentMessages.forEach((msg, index) => {
          const sender = msg.sender === 'CUSTOMER' ? 'العميل' : 
                        msg.sender === 'AI' ? 'الذكاء الاصطناعي' : 'المستخدم';
          console.log(`      ${index + 1}. ${sender}: ${msg.content.substring(0, 50)}...`);
          console.log(`         📅 ${msg.createdAt.toLocaleString('ar-EG')}`);
        });
      }

      console.log('------------------------------------------------------------\n');
    }

    // إذا كان الذكاء الاصطناعي معطل، اعرض خيار التفعيل
    const disabledCompanies = companies.filter(c => !c.aiSettings?.autoReplyEnabled);
    if (disabledCompanies.length > 0) {
      console.log('💡 هل تريد تفعيل الذكاء الاصطناعي للشركات المعطلة؟');
      console.log('يمكنك استخدام: node scripts/check-ai-status.js');
    }

  } catch (error) {
    console.error('❌ خطأ في البحث عن الشركة:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل البحث
findSMCompany().catch(console.error);

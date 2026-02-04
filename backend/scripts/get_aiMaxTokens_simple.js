/**
 * Script بسيط للتحقق من قيمة aiMaxTokens في قاعدة البيانات
 */

const { PrismaClient } = require('@prisma/client');

async function getAIMaxTokens() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'موجود' : 'غير موجود');
    console.log('');
    
    // جلب جميع السجلات
    const allSettings = await prisma.aiSettings.findMany({
      select: {
        companyId: true,
        aiMaxTokens: true,
        updatedAt: true,
        company: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log('═'.repeat(70));
    console.log('📊 نتائج التحقق من aiMaxTokens في قاعدة البيانات');
    console.log('═'.repeat(70) + '\n');
    
    if (allSettings.length === 0) {
      console.log('⚠️  لا توجد إعدادات AI في قاعدة البيانات');
      console.log('   النظام سيستخدم القيمة الافتراضية: 2048 tokens\n');
    } else {
      allSettings.forEach((setting, index) => {
        console.log(`${index + 1}. الشركة: ${setting.company?.name || 'غير محدد'}`);
        console.log(`   • Company ID: ${setting.companyId}`);
        
        const value = setting.aiMaxTokens;
        if (value === null || value === undefined) {
          console.log(`   • aiMaxTokens: NULL`);
          console.log(`   • الحالة: ⚠️  سيستخدم القيمة الافتراضية (2048)`);
        } else {
          console.log(`   • aiMaxTokens: ${value} tokens`);
          if (value === 2048) {
            console.log(`   • الحالة: ✅ القيمة الافتراضية (2048)`);
          } else {
            console.log(`   • الحالة: ✅ قيمة مخصصة من الواجهة (${value})`);
          }
        }
        
        console.log(`   • آخر تحديث: ${setting.updatedAt.toISOString()}`);
        console.log('');
      });
    }
    
    console.log('═'.repeat(70));
    console.log('\n📋 ملخص:');
    console.log(`   • إجمالي السجلات: ${allSettings.length}`);
    
    const customValues = allSettings.filter(s => s.aiMaxTokens !== null && s.aiMaxTokens !== undefined && s.aiMaxTokens !== 2048);
    const defaultValues = allSettings.filter(s => s.aiMaxTokens === 2048);
    const nullValues = allSettings.filter(s => s.aiMaxTokens === null || s.aiMaxTokens === undefined);
    
    console.log(`   • قيم مخصصة (≠ 2048): ${customValues.length}`);
    if (customValues.length > 0) {
      customValues.forEach(s => {
        console.log(`     - ${s.companyId}: ${s.aiMaxTokens} tokens`);
      });
    }
    
    console.log(`   • قيم افتراضية (2048): ${defaultValues.length}`);
    console.log(`   • قيم NULL: ${nullValues.length}`);
    
    // جلب القيمة الافتراضية من constants
    try {
      const { DEFAULT_AI_SETTINGS } = require('../services/aiAgent/aiConstants');
      console.log(`\n🔧 القيمة الافتراضية في constants: ${DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS} tokens`);
    } catch (e) {
      console.log(`\n🔧 القيمة الافتراضية: 2048 tokens`);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ تم التحقق بنجاح\n');
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
    }
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل
getAIMaxTokens()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل السكريبت:', error);
    process.exit(1);
  });


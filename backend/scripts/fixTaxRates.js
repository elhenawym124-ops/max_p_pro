/**
 * سكريبت لتعديل نسب الضرائب والتأمينات الاجتماعية في قاعدة البيانات
 * يقوم بتعيين قيم الضرائب والتأمينات إلى 0%
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSettings() {
  try {
    console.log('🔄 جاري تحديث إعدادات الضرائب والتأمينات...');
    
    // الحصول على جميع سجلات إعدادات HR
    const settings = await prisma.hRSettings.findMany();
    console.log(`تم العثور على ${settings.length} سجل من إعدادات HR`);
    
    // تحديث جميع السجلات مرة واحدة باستخدام SQL مباشر
    console.log('تحديث جميع السجلات باستخدام SQL مباشر');
    
    // استخدام SQL مباشر لتحديث جميع السجلات
    await prisma.$executeRaw`
      UPDATE hr_settings 
      SET taxRate = 0, socialInsuranceRate = 0
    `;
    
    // أيضاً نحاول باستخدام الأسماء المحتملة الأخرى
    try {
      await prisma.$executeRaw`
        UPDATE hr_settings 
        SET tax_rate = 0, social_insurance_rate = 0
      `;
      console.log('تم تحديث الأسماء البديلة أيضاً');
    } catch (err) {
      console.log('لم يتم العثور على الأسماء البديلة');
    }
    
    // أيضاً نحاول تحديث كل سجل على حدة
    for (const setting of settings) {
      try {
        console.log(`تحديث السجل بشكل فردي: ${setting.id}`);
        
        await prisma.hRSettings.update({
          where: { id: setting.id },
          data: {
            socialInsuranceRate: 0,
            taxRate: 0
          }
        });
      } catch (err) {
        console.error(`خطأ في تحديث السجل ${setting.id}:`, err.message);
      }
    }
    
    console.log('✅ تم تحديث الإعدادات بنجاح!');
    
    // التحقق من الإعدادات بعد التحديث
    const updatedSettings = await prisma.hRSettings.findMany();
    for (const setting of updatedSettings) {
      console.log(`السجل ${setting.id}:`);
      console.log(`- نسبة الضرائب: ${setting.taxRate}`);
      console.log(`- نسبة التأمينات: ${setting.socialInsuranceRate}`);
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تحديث الإعدادات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تنفيذ الدالة
updateSettings();

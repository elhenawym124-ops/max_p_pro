/**
 * سكريبت لتعديل نسب الضرائب والتأمينات الاجتماعية في قاعدة البيانات مباشرة
 * باستخدام SQL مباشر
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSettings() {
  try {
    console.log('🔄 جاري تحديث إعدادات الضرائب والتأمينات...');
    
    // استخدام SQL مباشر لتحديث جميع السجلات
    // نحاول جميع الأسماء المحتملة للأعمدة
    
    try {
      const result1 = await prisma.$executeRaw`
        UPDATE hr_settings 
        SET taxRate = 0
      `;
      console.log('✅ تم تحديث taxRate بنجاح:', result1);
    } catch (err) {
      console.error('❌ خطأ في تحديث taxRate:', err.message);
    }
    
    try {
      const result2 = await prisma.$executeRaw`
        UPDATE hr_settings 
        SET socialInsuranceRate = 0
      `;
      console.log('✅ تم تحديث socialInsuranceRate بنجاح:', result2);
    } catch (err) {
      console.error('❌ خطأ في تحديث socialInsuranceRate:', err.message);
    }
    
    try {
      const result3 = await prisma.$executeRaw`
        UPDATE hr_settings 
        SET tax_rate = 0
      `;
      console.log('✅ تم تحديث tax_rate بنجاح:', result3);
    } catch (err) {
      console.error('❌ خطأ في تحديث tax_rate:', err.message);
    }
    
    try {
      const result4 = await prisma.$executeRaw`
        UPDATE hr_settings 
        SET social_insurance_rate = 0
      `;
      console.log('✅ تم تحديث social_insurance_rate بنجاح:', result4);
    } catch (err) {
      console.error('❌ خطأ في تحديث social_insurance_rate:', err.message);
    }
    
    // محاولة الحصول على معلومات عن الجدول
    try {
      const tableInfo = await prisma.$queryRaw`
        DESCRIBE hr_settings
      `;
      console.log('📊 معلومات الجدول:', tableInfo);
    } catch (err) {
      console.error('❌ خطأ في الحصول على معلومات الجدول:', err.message);
    }
    
    console.log('✅ تم الانتهاء من محاولات التحديث');
    
  } catch (error) {
    console.error('❌ حدث خطأ عام أثناء تحديث الإعدادات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تنفيذ الدالة
updateSettings();

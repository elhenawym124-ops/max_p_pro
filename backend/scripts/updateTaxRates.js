/**
 * سكريبت لتعديل نسب الضرائب والتأمينات الاجتماعية في قاعدة البيانات
 * يقوم بتعيين قيم الضرائب والتأمينات إلى 0%
 */

const { PrismaClient, Decimal } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSettings() {
  try {
    console.log('🔄 جاري تحديث إعدادات الضرائب والتأمينات...');
    
    // الحصول على جميع سجلات إعدادات HR
    const settings = await prisma.hRSettings.findMany();
    console.log(`تم العثور على ${settings.length} سجل من إعدادات HR`);
    
    // تحديث كل سجل على حدة
    let updatedCount = 0;
    for (const setting of settings) {
      try {
        console.log(`تحديث السجل: ${setting.id}`);
        
        await prisma.$executeRaw`
          UPDATE hr_settings 
          SET taxRate = 0, socialInsuranceRate = 0
          WHERE id = ${setting.id}
        `;
        
        updatedCount++;
        console.log(`تم تحديث السجل ${setting.id} بنجاح`);
      } catch (err) {
        console.error(`خطأ في تحديث السجل ${setting.id}:`, err);
      }
    }
    
    
    console.log('✅ تم تحديث الإعدادات بنجاح:', updatedCount);
    
    // عرض الإعدادات بعد التحديث
    const updatedSettings = await prisma.hRSettings.findMany({
      select: {
        id: true,
        companyId: true,
        taxRate: true,
        socialInsuranceRate: true
      }
    });
    
    console.log('📊 الإعدادات الحالية:');
    console.table(updatedSettings);
    
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تحديث الإعدادات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تنفيذ الدالة
updateSettings();

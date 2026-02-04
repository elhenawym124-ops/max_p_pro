/**
 * فحص إعدادات الشركات
 */
const { PrismaClient } = require('@prisma/client');

async function checkCompanySettings() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 🏢 إعدادات الشركات ===\n');
    
    const companies = await prisma.company.findMany({
      select: { 
        id: true, 
        name: true, 
        useCentralKeys: true 
      }
    });
    
    for (const company of companies) {
      console.log(`🏢 ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   استخدام المفاتيح المركزية: ${company.useCentralKeys ? '✅ نعم' : '❌ لا'}`);
      
      // فحص مفاتيح الشركة
      const companyKeys = await prisma.geminiKey.findMany({
        where: { companyId: company.id },
        select: { id: true, name: true, isActive: true }
      });
      
      console.log(`   مفاتيح الشركة: ${companyKeys.length}`);
      companyKeys.forEach(k => {
        console.log(`      - ${k.name}: ${k.isActive ? '✅ نشط' : '❌ غير نشط'}`);
      });
      
      console.log('');
    }
    
    // فحص المفاتيح المركزية
    console.log('=== 🌐 المفاتيح المركزية ===\n');
    const centralKeys = await prisma.geminiKey.findMany({
      where: { 
        keyType: 'CENTRAL',
        companyId: null
      },
      select: { id: true, name: true, isActive: true }
    });
    
    console.log(`عدد المفاتيح المركزية: ${centralKeys.length}`);
    centralKeys.forEach(k => {
      console.log(`   - ${k.name}: ${k.isActive ? '✅ نشط' : '❌ غير نشط'}`);
    });
    
    console.log('\n💡 لتفعيل المفاتيح المركزية لشركة معينة:');
    console.log('   UPDATE Company SET useCentralKeys = true WHERE id = "COMPANY_ID";');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompanySettings();

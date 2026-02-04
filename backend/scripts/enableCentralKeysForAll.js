/**
 * تفعيل المفاتيح المركزية لجميع الشركات
 */
const { PrismaClient } = require('@prisma/client');

async function enableCentralKeysForAll() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 🔧 تفعيل المفاتيح المركزية لجميع الشركات ===\n');
    
    // تحديث جميع الشركات
    const result = await prisma.company.updateMany({
      where: {
        useCentralKeys: false
      },
      data: {
        useCentralKeys: true
      }
    });
    
    console.log(`✅ تم تفعيل المفاتيح المركزية لـ ${result.count} شركة`);
    
    // التحقق من النتيجة
    const companies = await prisma.company.findMany({
      select: { name: true, useCentralKeys: true }
    });
    
    console.log('\n=== الحالة بعد التحديث ===\n');
    companies.forEach(c => {
      console.log(`${c.useCentralKeys ? '✅' : '❌'} ${c.name}`);
    });
    
    console.log('\n🎉 الآن يمكن لجميع الشركات استخدام المفاتيح المركزية!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

enableCentralKeysForAll();

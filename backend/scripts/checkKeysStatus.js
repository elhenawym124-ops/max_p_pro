/**
 * سكريبت لفحص حالة مفاتيح Gemini
 */
const { PrismaClient } = require('@prisma/client');

async function checkKeysStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 🔑 حالة مفاتيح Gemini ===\n');
    
    const keys = await prisma.geminiKey.findMany({
      include: { 
        models: {
          orderBy: { priority: 'asc' }
        }
      },
      orderBy: { priority: 'asc' }
    });
    
    if (keys.length === 0) {
      console.log('❌ لا توجد مفاتيح في قاعدة البيانات!');
      return;
    }
    
    for (const key of keys) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔑 ${key.name}`);
      console.log(`   الحالة: ${key.isActive ? '✅ نشط' : '❌ غير نشط'}`);
      console.log(`   الشركة: ${key.companyId || '🌐 مركزي'}`);
      console.log(`   النوع: ${key.keyType || 'COMPANY'}`);
      console.log(`   النماذج (${key.models.length}):`);
      
      for (const model of key.models) {
        try {
          const usage = JSON.parse(model.usage || '{}');
          const now = new Date();
          
          // فحص RPM
          let rpmStatus = '✅';
          if (usage.rpm && usage.rpm.windowStart) {
            const rpmWindow = new Date(usage.rpm.windowStart);
            const rpmElapsed = (now - rpmWindow) / 1000 / 60; // بالدقائق
            if (rpmElapsed < 1 && usage.rpm.used >= usage.rpm.limit) {
              rpmStatus = '❌ مستنفد';
            } else if (rpmElapsed >= 1) {
              rpmStatus = '✅ متاح (انتهت النافذة)';
            }
          }
          
          // فحص RPD
          let rpdStatus = '✅';
          if (usage.rpd && usage.rpd.windowStart) {
            const rpdWindow = new Date(usage.rpd.windowStart);
            const rpdElapsed = (now - rpdWindow) / 1000 / 60 / 60; // بالساعات
            if (rpdElapsed < 24 && usage.rpd.used >= usage.rpd.limit) {
              rpdStatus = '❌ مستنفد';
            } else if (rpdElapsed >= 24) {
              rpdStatus = '✅ متاح (انتهت النافذة)';
            }
          }
          
          // فحص exhaustedAt
          let exhaustedStatus = '';
          if (usage.exhaustedAt) {
            const exhaustedTime = new Date(usage.exhaustedAt);
            const timeDiff = (now - exhaustedTime) / 1000 / 60; // بالدقائق
            if (timeDiff < 5) {
              exhaustedStatus = ` ⚠️ مستنفد منذ ${timeDiff.toFixed(1)} دقيقة`;
            }
          }
          
          console.log(`      📊 ${model.model} (${model.isEnabled ? '✅' : '❌'})`);
          console.log(`         RPM: ${usage.rpm?.used || 0}/${usage.rpm?.limit || '?'} ${rpmStatus}`);
          console.log(`         RPD: ${usage.rpd?.used || 0}/${usage.rpd?.limit || '?'} ${rpdStatus}${exhaustedStatus}`);
          
        } catch (e) {
          console.log(`      📊 ${model.model}: خطأ في قراءة البيانات`);
        }
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n💡 نصائح:');
    console.log('   1. إذا كانت جميع المفاتيح مستنفدة، أضف مفاتيح جديدة من:');
    console.log('      https://aistudio.google.com/app/apikey');
    console.log('   2. RPM يُعاد تعيينه كل دقيقة');
    console.log('   3. RPD يُعاد تعيينه كل 24 ساعة');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkKeysStatus();

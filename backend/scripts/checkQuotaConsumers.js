/**
 * أداة فحص ما يستهلك الكوتة تلقائياً
 * 
 * الاستخدام:
 * node checkQuotaConsumers.js
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkQuotaConsumers() {
  try {
    console.log('\n🔍 ========== فحص ما يستهلك الكوتة تلقائياً ==========\n');

    // ❌ REMOVED: Auto Pattern Detection Service - Pattern System removed
    // ❌ REMOVED: Success Learning Service - Pattern System removed

    // 1. فحص Broadcast Scheduler
    console.log('📊 3. Broadcast Scheduler Service:');
    console.log('   - يعمل كل 5 دقائق');
    console.log('   - لا يستخدم AI مباشرة');
    console.log('   - يستخدم فقط replaceMessageVariables');
    console.log('   - لا يستهلك الكوتة ✅\n');

    // 2. فحص حالة الكوتة الحالية
    console.log('📊 2. حالة الكوتة الحالية:\n');

    const models = await getSharedPrismaClient().geminiKeyModel.findMany({
      where: {
        isEnabled: true,
        key: {
          isActive: true
        }
      },
      include: {
        key: {
          select: {
            id: true,
            name: true,
            keyType: true
          }
        }
      },
      take: 10 // أول 10 نماذج
    });

    const now = new Date();

    for (const model of models) {
      try {
        const usage = JSON.parse(model.usage || '{}');
        
        console.log(`📊 ${model.model} (Key: ${model.key.name}):`);
        
        // فحص RPM
        if (usage.rpm) {
          const rpmUsed = usage.rpm.used || 0;
          const rpmLimit = usage.rpm.limit || 0;
          const rpmPercentage = rpmLimit > 0 ? ((rpmUsed / rpmLimit) * 100).toFixed(1) : 0;
          
          if (usage.rpm.windowStart) {
            const rpmWindowStart = new Date(usage.rpm.windowStart);
            const rpmElapsed = (now - rpmWindowStart) / 1000 / 60; // بالدقائق
            
            if (rpmElapsed < 1 && rpmUsed >= rpmLimit) {
              console.log(`   ⚠️ RPM: ${rpmUsed}/${rpmLimit} (${rpmPercentage}%) - مستنفد`);
            } else if (rpmElapsed >= 1) {
              console.log(`   ✅ RPM: ${rpmUsed}/${rpmLimit} (${rpmPercentage}%) - متاح (انتهت النافذة)`);
            } else {
              console.log(`   📊 RPM: ${rpmUsed}/${rpmLimit} (${rpmPercentage}%) - متاح`);
            }
          } else {
            console.log(`   ✅ RPM: ${rpmUsed}/${rpmLimit} (${rpmPercentage}%) - متاح (لا توجد نافذة نشطة)`);
          }
        }

        // فحص RPD
        if (usage.rpd) {
          const rpdUsed = usage.rpd.used || 0;
          const rpdLimit = usage.rpd.limit || 0;
          const rpdPercentage = rpdLimit > 0 ? ((rpdUsed / rpdLimit) * 100).toFixed(1) : 0;
          
          if (usage.rpd.windowStart) {
            const rpdWindowStart = new Date(usage.rpd.windowStart);
            const rpdElapsed = (now - rpdWindowStart) / 1000 / 60 / 60 / 24; // بالأيام
            
            if (rpdElapsed < 1 && rpdUsed >= rpdLimit) {
              console.log(`   ⚠️ RPD: ${rpdUsed}/${rpdLimit} (${rpdPercentage}%) - مستنفد`);
            } else if (rpdElapsed >= 1) {
              console.log(`   ✅ RPD: ${rpdUsed}/${rpdLimit} (${rpdPercentage}%) - متاح (انتهت النافذة)`);
            } else {
              console.log(`   📊 RPD: ${rpdUsed}/${rpdLimit} (${rpdPercentage}%) - متاح`);
            }
          } else {
            console.log(`   ✅ RPD: ${rpdUsed}/${rpdLimit} (${rpdPercentage}%) - متاح (لا توجد نافذة نشطة)`);
          }
        }

        // فحص exhaustedAt
        if (usage.exhaustedAt) {
          const exhaustedTime = new Date(usage.exhaustedAt);
          const timeDiff = (now - exhaustedTime) / 1000 / 60; // بالدقائق
          if (timeDiff < 5) {
            console.log(`   ⚠️ مستنفد منذ ${timeDiff.toFixed(1)} دقيقة`);
          }
        }

        // فحص العداد العام
        const totalUsed = usage.used || 0;
        const totalLimit = usage.limit || 1000000;
        const totalPercentage = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : 0;
        
        if (totalUsed >= totalLimit) {
          console.log(`   ⚠️ Total: ${totalUsed}/${totalLimit} (${totalPercentage}%) - مستنفد`);
        } else {
          console.log(`   📊 Total: ${totalUsed}/${totalLimit} (${totalPercentage}%)`);
        }

        console.log('');
      } catch (e) {
        console.error(`   ❌ خطأ في تحليل JSON: ${e.message}`);
        console.log('');
      }
    }

    // 3. فحص النماذج المستثناة
    console.log('📊 3. النماذج المستثناة:\n');
    
    const excluded = await getSharedPrismaClient().excludedModel.findMany({
      where: {
        retryAt: {
          gt: new Date()
        }
      },
      take: 10
    });

    if (excluded.length === 0) {
      console.log('   ✅ لا توجد نماذج مستثناة\n');
    } else {
      console.log(`   ⚠️ يوجد ${excluded.length} نموذج مستثنى:\n`);
      for (const ex of excluded.slice(0, 5)) {
        const retryAt = new Date(ex.retryAt);
        const timeUntilRetry = (retryAt - now) / 1000 / 60; // بالدقائق
        console.log(`   - ${ex.modelName} (Key: ${ex.keyId}) - Retry in ${timeUntilRetry.toFixed(1)} minutes`);
      }
      console.log('');
    }

    // 4. توصيات
    console.log('💡 التوصيات:\n');
    console.log('   1. إذا كانت الكوتة مستنفدة رغم عدم الاستخدام:');
    console.log('      - تحقق من الخدمات التلقائية');
    console.log('      - استخدم: node manageQuota.js reset --all');
    console.log('');
    console.log('   2. لفحص الكوتة:');
    console.log('      - node manageQuota.js check');
    console.log('      - node checkQuotaConsumers.js (هذا الملف)');
    console.log('');

    console.log('✅ ========== انتهى الفحص ==========\n');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

checkQuotaConsumers();


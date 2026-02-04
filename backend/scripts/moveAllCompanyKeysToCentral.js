/**
 * Script to move ALL company keys (active and inactive) to central keys
 * يحول كل مفاتيح الشركات (نشطة وغير نشطة) إلى مفاتيح مركزية
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function moveAllKeysToCentral() {
  try {
    console.log('🔄 [MOVE-ALL-KEYS] Starting to move ALL company keys to central...\n');

    // 1. جلب كل المفاتيح من نوع COMPANY (نشطة وغير نشطة)
    const companyKeys = await getSharedPrismaClient().geminiKey.findMany({
      where: {
        keyType: 'COMPANY'
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        models: {
          where: { isEnabled: true }
        }
      }
    });

    console.log(`📊 [MOVE-ALL-KEYS] Found ${companyKeys.length} company keys (active + inactive) to move`);

    if (companyKeys.length === 0) {
      console.log('✅ [MOVE-ALL-KEYS] No company keys found. Nothing to move.');
      return;
    }

    // 2. عرض المفاتيح قبل النقل
    console.log('\n📋 [MOVE-ALL-KEYS] Keys to be moved:');
    const activeKeys = companyKeys.filter(k => k.isActive);
    const inactiveKeys = companyKeys.filter(k => !k.isActive);
    
    console.log(`   - Active keys: ${activeKeys.length}`);
    console.log(`   - Inactive keys: ${inactiveKeys.length}\n`);

    companyKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.name} (ID: ${key.id})`);
      console.log(`      - Company: ${key.company?.name || 'Unknown'} (${key.companyId || 'None'})`);
      console.log(`      - Is Active: ${key.isActive}`);
      console.log(`      - Models: ${key.models.length}`);
      console.log(`      - Priority: ${key.priority}`);
    });

    // 3. نقل المفاتيح إلى CENTRAL
    console.log('\n🔄 [MOVE-ALL-KEYS] Moving keys to central...');
    
    let movedCount = 0;
    let errorCount = 0;

    for (const key of companyKeys) {
      try {
        await getSharedPrismaClient().geminiKey.update({
          where: { id: key.id },
          data: {
            keyType: 'CENTRAL',
            companyId: null // إزالة ربط الشركة
          }
        });

        movedCount++;
        const status = key.isActive ? '✅' : '⚠️';
        console.log(`   ${status} Moved: ${key.name} (${key.id}) - Active: ${key.isActive}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error moving ${key.name} (${key.id}):`, error.message);
      }
    }

    // 4. النتيجة النهائية
    console.log('\n📊 [MOVE-ALL-KEYS] Summary:');
    console.log(`   - Total keys found: ${companyKeys.length}`);
    console.log(`   - Successfully moved: ${movedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // 5. التحقق من النتيجة
    const centralKeysCount = await getSharedPrismaClient().geminiKey.count({
      where: {
        keyType: 'CENTRAL'
      }
    });

    const activeCentralKeys = await getSharedPrismaClient().geminiKey.count({
      where: {
        keyType: 'CENTRAL',
        isActive: true
      }
    });

    const remainingCompanyKeys = await getSharedPrismaClient().geminiKey.count({
      where: {
        keyType: 'COMPANY'
      }
    });

    console.log('\n📊 [MOVE-ALL-KEYS] Final status:');
    console.log(`   - Total central keys: ${centralKeysCount}`);
    console.log(`   - Active central keys: ${activeCentralKeys}`);
    console.log(`   - Remaining company keys: ${remainingCompanyKeys}`);

    if (remainingCompanyKeys === 0) {
      console.log('\n✅ [MOVE-ALL-KEYS] All company keys have been moved to central successfully!');
    } else {
      console.log(`\n⚠️ [MOVE-ALL-KEYS] Warning: ${remainingCompanyKeys} company keys still remain.`);
    }

    console.log('\n✅ [MOVE-ALL-KEYS] Script completed successfully!');

  } catch (error) {
    console.error('❌ [MOVE-ALL-KEYS] Error:', error);
    throw error;
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

// تشغيل السكريبت
moveAllKeysToCentral()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



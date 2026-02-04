/**
 * Script to move all company keys to central keys
 * يحول كل مفاتيح الشركات إلى مفاتيح مركزية
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function moveKeysToCentral() {
  try {
    console.log('🔄 [MOVE-KEYS] Starting to move company keys to central...\n');

    // 1. جلب كل المفاتيح من نوع COMPANY
    const companyKeys = await getSharedPrismaClient().geminiKey.findMany({
      where: {
        keyType: 'COMPANY',
        isActive: true
      },
      include: {
        models: {
          where: { isEnabled: true }
        }
      }
    });

    console.log(`📊 [MOVE-KEYS] Found ${companyKeys.length} company keys to move`);

    if (companyKeys.length === 0) {
      console.log('✅ [MOVE-KEYS] No company keys found. Nothing to move.');
      return;
    }

    // 2. عرض المفاتيح قبل النقل
    console.log('\n📋 [MOVE-KEYS] Keys to be moved:');
    companyKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.name} (ID: ${key.id})`);
      console.log(`      - Company ID: ${key.companyId || 'None'}`);
      console.log(`      - Models: ${key.models.length}`);
      console.log(`      - Priority: ${key.priority}`);
    });

    // 3. نقل المفاتيح إلى CENTRAL
    console.log('\n🔄 [MOVE-KEYS] Moving keys to central...');
    
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
        console.log(`   ✅ Moved: ${key.name} (${key.id})`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error moving ${key.name} (${key.id}):`, error.message);
      }
    }

    // 4. النتيجة النهائية
    console.log('\n📊 [MOVE-KEYS] Summary:');
    console.log(`   - Total keys found: ${companyKeys.length}`);
    console.log(`   - Successfully moved: ${movedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // 5. التحقق من النتيجة
    const centralKeysCount = await getSharedPrismaClient().geminiKey.count({
      where: {
        keyType: 'CENTRAL',
        isActive: true
      }
    });

    const remainingCompanyKeys = await getSharedPrismaClient().geminiKey.count({
      where: {
        keyType: 'COMPANY',
        isActive: true
      }
    });

    console.log('\n📊 [MOVE-KEYS] Final status:');
    console.log(`   - Central keys: ${centralKeysCount}`);
    console.log(`   - Remaining company keys: ${remainingCompanyKeys}`);

    if (remainingCompanyKeys === 0) {
      console.log('\n✅ [MOVE-KEYS] All company keys have been moved to central successfully!');
    } else {
      console.log(`\n⚠️ [MOVE-KEYS] Warning: ${remainingCompanyKeys} company keys still remain.`);
    }

    console.log('\n✅ [MOVE-KEYS] Script completed successfully!');

  } catch (error) {
    console.error('❌ [MOVE-KEYS] Error:', error);
    throw error;
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

// تشغيل السكريبت
moveKeysToCentral()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



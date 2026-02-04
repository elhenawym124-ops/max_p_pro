/**
 * Script to check remaining company keys
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function checkRemainingKeys() {
  try {
    console.log('🔍 [CHECK-KEYS] Checking remaining company keys...\n');

    // 1. جلب كل المفاتيح من نوع COMPANY
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
          where: { isEnabled: true },
          select: {
            id: true,
            model: true,
            isEnabled: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 [CHECK-KEYS] Found ${companyKeys.length} company keys:\n`);

    if (companyKeys.length === 0) {
      console.log('✅ [CHECK-KEYS] No company keys found. All keys are central.');
      return;
    }

    // 2. عرض المفاتيح المتبقية
    companyKeys.forEach((key, index) => {
      console.log(`${index + 1}. ${key.name} (ID: ${key.id})`);
      console.log(`   - Company: ${key.company?.name || 'Unknown'} (${key.companyId || 'None'})`);
      console.log(`   - Is Active: ${key.isActive}`);
      console.log(`   - Priority: ${key.priority}`);
      console.log(`   - Enabled Models: ${key.models.length}`);
      console.log(`   - Created: ${key.createdAt}`);
      console.log('');
    });

    // 3. إحصائيات
    const activeCount = companyKeys.filter(k => k.isActive).length;
    const inactiveCount = companyKeys.filter(k => !k.isActive).length;

    console.log('📊 [CHECK-KEYS] Statistics:');
    console.log(`   - Total company keys: ${companyKeys.length}`);
    console.log(`   - Active: ${activeCount}`);
    console.log(`   - Inactive: ${inactiveCount}`);

    // 4. جلب المفاتيح المركزية للمقارنة
    const centralKeys = await getSharedPrismaClient().geminiKey.findMany({
      where: {
        keyType: 'CENTRAL'
      },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    console.log(`\n📊 [CHECK-KEYS] Central keys: ${centralKeys.length}`);
    console.log(`   - Active central keys: ${centralKeys.filter(k => k.isActive).length}`);

  } catch (error) {
    console.error('❌ [CHECK-KEYS] Error:', error);
    throw error;
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

checkRemainingKeys()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



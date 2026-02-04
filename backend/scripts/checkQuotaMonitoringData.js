/**
 * Script to check if there are active keys and enabled models for Quota Monitoring
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function checkData() {
  try {
    console.log('🔍 [QUOTA-CHECK] Checking database for Quota Monitoring data...\n');

    // 1. Check active keys
    const activeKeys = await getSharedPrismaClient().geminiKey.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        companyId: true,
        priority: true,
        keyType: true
      }
    });

    console.log(`📊 [QUOTA-CHECK] Active Keys: ${activeKeys.length}`);
    if (activeKeys.length > 0) {
      console.log('   Keys:');
      activeKeys.forEach(key => {
        console.log(`   - ${key.name} (ID: ${key.id}, Type: ${key.keyType}, Priority: ${key.priority})`);
      });
    } else {
      console.log('   ⚠️  No active keys found!');
    }

    console.log('\n');

    // 2. Check enabled models
    const enabledModels = await getSharedPrismaClient().geminiKeyModel.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        model: true,
        keyId: true,
        isEnabled: true
      }
    });

    console.log(`📊 [QUOTA-CHECK] Enabled Models: ${enabledModels.length}`);
    if (enabledModels.length > 0) {
      const modelsByKey = {};
      enabledModels.forEach(model => {
        if (!modelsByKey[model.keyId]) {
          modelsByKey[model.keyId] = [];
        }
        modelsByKey[model.keyId].push(model.model);
      });

      console.log('   Models by Key:');
      for (const [keyId, models] of Object.entries(modelsByKey)) {
        const key = activeKeys.find(k => k.id === keyId);
        const keyName = key ? key.name : 'Unknown';
        console.log(`   - ${keyName} (${keyId}): ${models.length} models`);
        models.forEach(model => {
          console.log(`     • ${model}`);
        });
      }
    } else {
      console.log('   ⚠️  No enabled models found!');
    }

    console.log('\n');

    // 3. Check excluded models
    const excludedModels = await getSharedPrismaClient().excludedModel.findMany({
      where: {
        retryAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        modelName: true,
        keyId: true,
        reason: true,
        excludedAt: true,
        retryAt: true
      }
    });

    console.log(`📊 [QUOTA-CHECK] Excluded Models: ${excludedModels.length}`);
    if (excludedModels.length > 0) {
      excludedModels.forEach(ex => {
        console.log(`   - ${ex.modelName} (Key: ${ex.keyId}, Reason: ${ex.reason})`);
        console.log(`     Excluded at: ${ex.excludedAt}, Retry at: ${ex.retryAt}`);
      });
    }

    console.log('\n');

    // 4. Check companies
    const companies = await getSharedPrismaClient().company.findMany({
      select: {
        id: true,
        name: true
      }
    });

    console.log(`📊 [QUOTA-CHECK] Companies: ${companies.length}`);
    if (companies.length > 0) {
      companies.forEach(company => {
        console.log(`   - ${company.name} (ID: ${company.id})`);
      });
    }

    console.log('\n');

    // 5. Summary
    console.log('📋 [QUOTA-CHECK] Summary:');
    console.log(`   - Active Keys: ${activeKeys.length}`);
    console.log(`   - Enabled Models: ${enabledModels.length}`);
    console.log(`   - Excluded Models: ${excludedModels.length}`);
    console.log(`   - Companies: ${companies.length}`);

    if (activeKeys.length === 0) {
      console.log('\n⚠️  [QUOTA-CHECK] WARNING: No active keys found!');
      console.log('   The Quota Monitoring dashboard will show 0 keys.');
      console.log('   Please add active Gemini keys to see data.');
    }

    if (enabledModels.length === 0) {
      console.log('\n⚠️  [QUOTA-CHECK] WARNING: No enabled models found!');
      console.log('   The Quota Monitoring dashboard will show 0 models.');
      console.log('   Please enable models for active keys to see data.');
    }

    console.log('\n✅ [QUOTA-CHECK] Check completed!');

  } catch (error) {
    console.error('❌ [QUOTA-CHECK] Error:', error);
    throw error;
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

checkData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



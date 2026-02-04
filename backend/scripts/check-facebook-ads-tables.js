/**
 * Script للتحقق من وجود جداول Facebook Ads
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('🔍 التحقق من جداول Facebook Ads...\n');
    
    // التحقق من وجود الجداول
    const tables = [
      'facebook_ad_accounts',
      'facebook_campaigns',
      'facebook_adsets',
      'facebook_ads',
      'facebook_ad_insights'
    ];
    
    for (const tableName of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM ${tableName} LIMIT 1
        `);
        console.log(`✅ ${tableName}: موجود (${result[0]?.count || 0} سجل)`);
      } catch (error) {
        if (error.message.includes("doesn't exist") || error.message.includes("Unknown table")) {
          console.log(`❌ ${tableName}: غير موجود`);
        } else {
          console.log(`⚠️ ${tableName}: خطأ - ${error.message.substring(0, 50)}`);
        }
      }
    }
    
    // التحقق من وجود العمود في companies
    try {
      const result = await prisma.$queryRawUnsafe(`
        SHOW COLUMNS FROM companies LIKE 'facebookAdsAccessToken'
      `);
      if (result.length > 0) {
        console.log(`✅ companies.facebookAdsAccessToken: موجود`);
      } else {
        console.log(`❌ companies.facebookAdsAccessToken: غير موجود`);
      }
    } catch (error) {
      console.log(`⚠️ خطأ في التحقق من companies: ${error.message.substring(0, 50)}`);
    }
    
    console.log('\n✅ اكتمل التحقق!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();


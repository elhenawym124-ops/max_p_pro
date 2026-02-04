/**
 * سكريبت لإنشاء جميع الـ indexes المطلوبة من Prisma schema
 * هذا مهم جداً للأداء!
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function createAllIndexes() {
  console.log('🔧 [Indexes] إنشاء جميع الـ indexes المطلوبة...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // قائمة الـ indexes المطلوبة من schema.prisma
    const requiredIndexes = [
      // Customer indexes
      {
        table: 'customers',
        name: 'customer_facebook_company',
        type: 'UNIQUE',
        columns: ['facebookId', 'companyId'],
        sql: 'CREATE UNIQUE INDEX customer_facebook_company ON customers(facebookId, companyId)'
      },
      {
        table: 'customers',
        name: 'customer_whatsapp_company',
        type: 'UNIQUE',
        columns: ['whatsappId', 'companyId'],
        sql: 'CREATE UNIQUE INDEX customer_whatsapp_company ON customers(whatsappId, companyId)'
      },
      {
        table: 'customers',
        name: 'customer_telegram_company',
        type: 'UNIQUE',
        columns: ['telegramId', 'companyId'],
        sql: 'CREATE UNIQUE INDEX customer_telegram_company ON customers(telegramId, companyId)'
      },
      {
        table: 'customers',
        name: 'customers_companyId_idx',
        type: 'INDEX',
        columns: ['companyId'],
        sql: 'CREATE INDEX customers_companyId_idx ON customers(companyId)'
      },
      {
        table: 'customers',
        name: 'customers_facebookId_idx',
        type: 'INDEX',
        columns: ['facebookId'],
        sql: 'CREATE INDEX customers_facebookId_idx ON customers(facebookId)'
      },
      {
        table: 'customers',
        name: 'customers_status_idx',
        type: 'INDEX',
        columns: ['status'],
        sql: 'CREATE INDEX customers_status_idx ON customers(status)'
      },
      {
        table: 'customers',
        name: 'customers_company_status_idx',
        type: 'INDEX',
        columns: ['companyId', 'status'],
        sql: 'CREATE INDEX customers_company_status_idx ON customers(companyId, status)'
      }
    ];
    
    console.log(`📋 [Indexes] عدد الـ indexes المطلوبة: ${requiredIndexes.length}\n`);
    
    // فحص الـ indexes الموجودة
    const existingIndexes = await prisma.$queryRaw`
      SHOW INDEXES FROM customers
    `;
    
    const existingIndexNames = new Set(existingIndexes.map(idx => idx.Key_name));
    console.log(`📊 [Indexes] عدد الـ indexes الموجودة: ${existingIndexNames.size}\n`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const index of requiredIndexes) {
      if (existingIndexNames.has(index.name)) {
        console.log(`⏭️  [Indexes] ${index.name} موجود بالفعل - تم التخطي`);
        skipped++;
        continue;
      }
      
      try {
        console.log(`🔧 [Indexes] إنشاء ${index.type} ${index.name}...`);
        await prisma.$executeRawUnsafe(index.sql);
        console.log(`✅ [Indexes] تم إنشاء ${index.name} بنجاح`);
        created++;
      } catch (error) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          console.log(`ℹ️  [Indexes] ${index.name} موجود بالفعل`);
          skipped++;
        } else {
          console.error(`❌ [Indexes] فشل إنشاء ${index.name}:`, error.message);
          errors++;
        }
      }
    }
    
    console.log('\n📊 [Indexes] ملخص:');
    console.log(`   ✅ تم الإنشاء: ${created}`);
    console.log(`   ⏭️  تم التخطي: ${skipped}`);
    console.log(`   ❌ أخطاء: ${errors}`);
    
    if (created > 0) {
      console.log('\n✅ [Indexes] تم إنشاء الـ indexes بنجاح!');
      console.log('💡 [Indexes] يجب أن تلاحظ تحسن كبير في سرعة الاستعلامات');
    }
    
    // اختبار سرعة الاستعلام بعد إنشاء الـ indexes
    if (created > 0) {
      console.log('\n🧪 [Indexes] اختبار سرعة الاستعلام...');
      const testStartTime = Date.now();
      
      await prisma.customer.findFirst({
        where: {
          facebookId: { not: null },
          companyId: { not: null }
        },
        select: {
          id: true
        }
      });
      
      const testDuration = Date.now() - testStartTime;
      console.log(`⏱️  [Indexes] استعلام findFirst استغرق: ${testDuration}ms`);
      
      if (testDuration < 100) {
        console.log('✅ [Indexes] الاستعلام سريع جداً!');
      } else if (testDuration < 1000) {
        console.log('✅ [Indexes] الاستعلام سريع');
      } else {
        console.warn('⚠️  [Indexes] الاستعلام لا يزال بطيئاً - قد تحتاج إلى تحسينات إضافية');
      }
    }
    
  } catch (error) {
    console.error('❌ [Indexes] خطأ:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAllIndexes().catch(error => {
  console.error('❌ خطأ غير متوقع:', error);
  process.exit(1);
});


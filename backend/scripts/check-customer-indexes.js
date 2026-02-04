/**
 * سكريبت للتحقق من indexes جدول customers وإنشاؤها إذا لزم الأمر
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkIndexes() {
  console.log('🔍 [Index Check] فحص indexes جدول customers...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. التحقق من وجود الـ indexes
    console.log('1️⃣ فحص indexes الموجودة...');
    const indexes = await prisma.$queryRaw`
      SHOW INDEXES FROM customers
    `;
    
    console.log(`📊 عدد الـ indexes: ${indexes.length}`);
    console.log('\n📋 الـ indexes الموجودة:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.Key_name}: ${idx.Column_name} (${idx.Non_unique === 0 ? 'UNIQUE' : 'INDEX'})`);
    });
    
    // 2. التحقق من وجود unique constraint على (facebookId, companyId)
    const hasFacebookCompanyIndex = indexes.some(
      idx => idx.Key_name === 'customer_facebook_company' && idx.Non_unique === 0
    );
    
    if (!hasFacebookCompanyIndex) {
      console.log('\n⚠️  [Index Check] unique index على (facebookId, companyId) غير موجود!');
      console.log('🔧 [Index Check] محاولة إنشائه...');
      
      try {
        // MySQL doesn't support IF NOT EXISTS for CREATE INDEX, so we check first
        const indexExists = indexes.some(idx => idx.Key_name === 'customer_facebook_company');
        
        if (!indexExists) {
          await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX customer_facebook_company 
            ON customers(facebookId, companyId)
          `);
          console.log('✅ [Index Check] تم إنشاء الـ index بنجاح!');
        } else {
          console.log('ℹ️  [Index Check] الـ index موجود بالفعل');
        }
      } catch (error) {
        console.error('❌ [Index Check] فشل إنشاء الـ index:', error.message);
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          console.log('💡 [Index Check] الـ index موجود بالفعل');
        } else {
          throw error;
        }
      }
    } else {
      console.log('\n✅ [Index Check] unique index على (facebookId, companyId) موجود');
    }
    
    // 3. اختبار سرعة الاستعلام
    console.log('\n2️⃣ اختبار سرعة استعلام findUnique...');
    const testStartTime = Date.now();
    
    // محاولة استعلام عشوائي
    const testResult = await prisma.customer.findFirst({
      where: {
        facebookId: { not: { equals: null } },
        companyId: { not: { equals: null } }
      },
      select: {
        id: true,
        facebookId: true,
        companyId: true
      }
    });
    
    const testDuration = Date.now() - testStartTime;
    console.log(`⏱️  [Index Check] استعلام findFirst استغرق: ${testDuration}ms`);
    
    if (testDuration > 1000) {
      console.warn('⚠️  [Index Check] الاستعلام بطيء! قد تكون هناك مشكلة في الـ indexes');
    } else {
      console.log('✅ [Index Check] الاستعلام سريع');
    }
    
    // 4. فحص حجم الجدول
    console.log('\n3️⃣ فحص حجم الجدول...');
    const tableStats = await prisma.$queryRaw`
      SELECT 
        table_rows,
        data_length,
        index_length,
        (data_length + index_length) as total_size
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'customers'
    `;
    
    if (tableStats.length > 0) {
      const stats = tableStats[0];
      const rows = Number(stats.table_rows);
      const dataSize = Number(stats.data_length) / 1024 / 1024; // MB
      const indexSize = Number(stats.index_length) / 1024 / 1024; // MB
      const totalSize = Number(stats.total_size) / 1024 / 1024; // MB
      
      console.log(`📊 عدد الصفوف: ${rows.toLocaleString()}`);
      console.log(`💾 حجم البيانات: ${dataSize.toFixed(2)} MB`);
      console.log(`📇 حجم الـ indexes: ${indexSize.toFixed(2)} MB`);
      console.log(`📦 الحجم الإجمالي: ${totalSize.toFixed(2)} MB`);
      
      if (rows > 100000) {
        console.warn('⚠️  [Index Check] الجدول كبير جداً - قد يحتاج إلى تحسين');
      }
    }
    
    console.log('\n✅ [Index Check] فحص indexes مكتمل!');
    
  } catch (error) {
    console.error('❌ [Index Check] خطأ:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkIndexes().catch(error => {
  console.error('❌ خطأ غير متوقع:', error);
  process.exit(1);
});


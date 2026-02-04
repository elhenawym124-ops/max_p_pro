#!/usr/bin/env node

/**
 * فحص المنتجات في PostgreSQL لفهم سبب عدم ظهور نتائج البحث
 */

const { Client } = require('pg');

async function inspectProducts() {
  console.log('🔍 فحص المنتجات في PostgreSQL...\n');

  const client = new Client({
    connectionString: "postgresql://appuser:your_password@localhost:5432/maxp",
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ متصل بـ PostgreSQL\n');

    // 1. إحصائيات عامة
    console.log('📊 إحصائيات عامة:');
    const totalResult = await client.query('SELECT COUNT(*) as count FROM products');
    console.log(`   إجمالي المنتجات: ${totalResult.rows[0].count}`);

    const activeResult = await client.query('SELECT COUNT(*) as count FROM products WHERE is_active = true');
    console.log(`   المنتجات النشطة: ${activeResult.rows[0].count}`);

    const embeddingResult = await client.query('SELECT COUNT(*) as count FROM products WHERE embedding IS NOT NULL');
    console.log(`   المنتجات مع embeddings: ${embeddingResult.rows[0].count}`);

    // 2. توزيع المنتجات حسب الشركة
    console.log('\n🏢 توزيع المنتجات حسب الشركة:');
    const companyResult = await client.query(`
      SELECT 
        company_id, 
        COUNT(*) as total,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
      FROM products 
      WHERE is_active = true
      GROUP BY company_id 
      ORDER BY total DESC
      LIMIT 10
    `);

    companyResult.rows.forEach(row => {
      console.log(`   شركة ${row.company_id}: ${row.total} منتج (${row.with_embeddings} مع embeddings)`);
    });

    // 3. عينة من المنتجات مع embeddings
    console.log('\n📦 عينة من المنتجات مع embeddings:');
    const sampleResult = await client.query(`
      SELECT id, name, description, company_id
      FROM products 
      WHERE embedding IS NOT NULL AND is_active = true
      ORDER BY id
      LIMIT 5
    `);

    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. [${row.company_id}] ${row.name}`);
      if (row.description) {
        console.log(`      وصف: ${row.description.substring(0, 50)}...`);
      }
    });

    // 4. اختبار بحث مباشر
    console.log('\n🔍 اختبار البحث المباشر:');
    
    // جرب مع أول شركة لديها منتجات
    if (companyResult.rows.length > 0) {
      const testCompanyId = companyResult.rows[0].company_id;
      console.log(`   اختبار مع شركة: ${testCompanyId}`);
      
      // بحث نصي بسيط
      const searchResult = await client.query(`
        SELECT id, name, company_id
        FROM products 
        WHERE 
          company_id = $1 
          AND is_active = true
          AND (name ILIKE '%منتج%' OR name ILIKE '%product%' OR name ILIKE '%shirt%')
        LIMIT 3
      `, [testCompanyId]);

      console.log(`   نتائج البحث النصي: ${searchResult.rows.length} منتج`);
      searchResult.rows.forEach(row => {
        console.log(`     - ${row.name} (شركة: ${row.company_id})`);
      });
    }

    // 5. فحص أسماء المنتجات الشائعة
    console.log('\n🏷️ أسماء المنتجات الشائعة:');
    const nameResult = await client.query(`
      SELECT 
        SUBSTRING(name, 1, 30) as name_sample,
        COUNT(*) as count
      FROM products 
      WHERE embedding IS NOT NULL AND is_active = true
      GROUP BY SUBSTRING(name, 1, 30)
      ORDER BY count DESC
      LIMIT 5
    `);

    nameResult.rows.forEach(row => {
      console.log(`   "${row.name_sample}": ${row.count} منتج`);
    });

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
  }
}

inspectProducts().catch(console.error);

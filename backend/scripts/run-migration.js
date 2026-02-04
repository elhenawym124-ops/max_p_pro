const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: '92.113.22.70',
      port: 3306,
      user: 'u339372869_test2',
      password: '0165676135Aa@A',
      database: 'u339372869_test2',
      connectTimeout: 60000
    });

    console.log('✅ Connected to database');

    console.log('📝 Step 1: Adding columns...');
    
    await connection.execute(`
      ALTER TABLE \`orders\` 
      ADD COLUMN IF NOT EXISTS \`scheduledDeliveryDate\` DATETIME NULL,
      ADD COLUMN IF NOT EXISTS \`isScheduled\` BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS \`scheduledNotes\` TEXT NULL,
      ADD COLUMN IF NOT EXISTS \`autoTransitionEnabled\` BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS \`scheduledTransitionedAt\` DATETIME NULL
    `);
    
    console.log('✅ Columns added successfully');

    console.log('\n📝 Step 2: Creating indexes...');
    
    try {
      await connection.execute(`CREATE INDEX \`orders_scheduledDeliveryDate_idx\` ON \`orders\`(\`scheduledDeliveryDate\`)`);
      console.log('✅ Index on scheduledDeliveryDate created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index on scheduledDeliveryDate already exists');
      } else {
        throw e;
      }
    }

    try {
      await connection.execute(`CREATE INDEX \`orders_isScheduled_idx\` ON \`orders\`(\`isScheduled\`)`);
      console.log('✅ Index on isScheduled created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index on isScheduled already exists');
      } else {
        throw e;
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Verifying changes...');

    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'u339372869_test2'
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME IN ('scheduledDeliveryDate', 'isScheduled', 'scheduledNotes', 'autoTransitionEnabled', 'scheduledTransitionedAt')
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n✅ New columns added:');
    rows.forEach(row => {
      console.log(`   - ${row.COLUMN_NAME} (${row.DATA_TYPE}) ${row.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    const [indexes] = await connection.execute(`
      SHOW INDEX FROM orders 
      WHERE Key_name IN ('orders_scheduledDeliveryDate_idx', 'orders_isScheduled_idx')
    `);

    console.log('\n✅ Indexes created:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.Key_name} on ${idx.Column_name}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

runMigration();

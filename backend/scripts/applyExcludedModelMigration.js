/**
 * Script to apply ExcludedModel migration directly
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Applying ExcludedModel migration...');

    // Check if table already exists
    const checkTable = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'excluded_models'
    `;

    if (checkTable[0].count > 0) {
      console.log('ℹ️ Table excluded_models already exists - skipping migration');
      return;
    }

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_excluded_model_table/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...');
    
    // Execute migration
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log('✅ ExcludedModel table created');

    // Verify table exists
    const tables = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'excluded_models'
    `;

    if (tables[0].count > 0) {
      console.log('✅ Table verification: excluded_models table exists');
    } else {
      console.warn('⚠️ Table verification: excluded_models table not found');
    }

  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate') || error.message.includes('Table') && error.message.includes('exists')) {
      console.log('ℹ️ Table already exists - migration may have been applied already');
    } else {
      console.error('❌ Error applying migration:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
applyMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });


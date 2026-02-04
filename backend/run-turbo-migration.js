/**
 * Migration Script: Add turboSenderNumber field to Company table
 * Script لإضافة حقل رقم الراسل لإعدادات Turbo
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 Starting Turbo Sender Number Migration...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', 'add_turbo_sender_number.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL statements (handle multiple statements)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📄 ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Check if column already exists (safe to ignore)
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate column') ||
            error.message.includes('column already exists')) {
          console.log(`⚠️ Column already exists, skipping...`);
          continue;
        }
        throw error;
      }
    }
    
    // Verify the column was added by checking schema
    console.log('🔍 Verifying migration...');
    
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name = 'turboSenderNumber'
    `;
    
    if (result && result.length > 0) {
      console.log('✅ Migration completed successfully! turboSenderNumber column added to companies table.');
    } else {
      console.log('⚠️ Column verification failed - please check database manually');
    }
    
    console.log('🎉 Turbo Sender Number Migration Complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

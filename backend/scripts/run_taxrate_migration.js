/**
 * Script to run the taxRate migration for HR settings
 * This script adds the taxRate column to the hr_settings table if it doesn't exist
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting taxRate migration for HR settings...');
  
  try {
    // Execute raw SQL to add the column if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE hr_settings 
      ADD COLUMN IF NOT EXISTS taxRate DECIMAL(5, 2) NOT NULL DEFAULT 0.00;
    `;
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Added taxRate column to hr_settings table');
    
    // Update any existing records to ensure they have the default value
    const updated = await prisma.$executeRaw`
      UPDATE hr_settings 
      SET taxRate = 0.00 
      WHERE taxRate IS NULL;
    `;
    
    console.log(`✅ Updated ${updated} existing HR settings records`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration()
  .then(() => {
    console.log('🏁 Migration script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });

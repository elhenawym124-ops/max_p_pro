/**
 * 🔧 Script to fix missing columns in users table
 * 
 * This script adds all missing columns to the users table
 * based on the Prisma schema, fixing schema sync issues.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Define all columns that should exist in users table based on schema
const REQUIRED_COLUMNS = [
  {
    name: 'employeeNumber',
    type: 'VARCHAR(255)',
    nullable: true,
    description: 'Employee number field'
  },
  {
    name: 'departmentId',
    type: 'VARCHAR(191)',
    nullable: true,
    description: 'Department ID foreign key'
  },
  {
    name: 'positionId',
    type: 'VARCHAR(191)',
    nullable: true,
    description: 'Position ID foreign key'
  },
  {
    name: 'hireDate',
    type: 'DATETIME(3)',
    nullable: true,
    description: 'Employee hire date'
  },
  {
    name: 'contractType',
    type: 'VARCHAR(191)',
    nullable: true,
    description: 'Employee contract type (FULL_TIME, PART_TIME, etc.)'
  },
  {
    name: 'baseSalary',
    type: 'DECIMAL(12, 2)',
    nullable: true,
    description: 'Employee base salary'
  },
  {
    name: 'skills',
    type: 'TEXT',
    nullable: true,
    description: 'Employee skills (DevTeam field)'
  },
  {
    name: 'department',
    type: 'VARCHAR(191)',
    nullable: true,
    description: 'Department name (DevTeam field)'
  },
  {
    name: 'availability',
    type: 'VARCHAR(191)',
    nullable: true,
    default: "'available'",
    description: 'Employee availability status'
  }
];

async function checkColumnExists(prisma, columnName) {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'users' 
       AND COLUMN_NAME = ?`,
      columnName
    );
    return result.length > 0;
  } catch (error) {
    console.error(`❌ Error checking column ${columnName}:`, error.message);
    return false;
  }
}

async function addColumn(prisma, column) {
  try {
    const nullable = column.nullable ? 'NULL' : 'NOT NULL';
    const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
    
    // Build SQL statement
    let sql = `ALTER TABLE users ADD COLUMN ${column.name} ${column.type} ${nullable}`;
    if (defaultClause) {
      sql += ` ${defaultClause}`;
    }
    
    await prisma.$executeRawUnsafe(sql);
    
    console.log(`✅ Added column: ${column.name} (${column.description})`);
    return true;
  } catch (error) {
    if (error.message.includes('Duplicate column name') || 
        error.message.includes('already exists') ||
        error.message.includes('Duplicate column') ||
        error.code === 'ER_DUP_FIELDNAME') {
      console.log(`ℹ️  Column ${column.name} already exists (skipping)`);
      return true;
    }
    console.error(`❌ Error adding column ${column.name}:`, error.message);
    return false;
  }
}

async function fixUsersTableColumns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking users table for missing columns...\n');
    
    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    for (const column of REQUIRED_COLUMNS) {
      const exists = await checkColumnExists(prisma, column.name);
      
      if (exists) {
        console.log(`✅ Column ${column.name} already exists`);
        skippedCount++;
      } else {
        console.log(`⚠️  Column ${column.name} is missing. Adding...`);
        const success = await addColumn(prisma, column);
        if (success) {
          addedCount++;
        } else {
          failedCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   ✅ Added: ${addedCount} columns`);
    console.log(`   ℹ️  Skipped (already exist): ${skippedCount} columns`);
    console.log(`   ❌ Failed: ${failedCount} columns`);
    console.log('='.repeat(50));
    
    if (failedCount > 0) {
      console.log('\n⚠️  Some columns failed to add. Please check the errors above.');
      return false;
    }
    
    // Verify all columns exist
    console.log('\n🔍 Verifying all columns...');
    const allExist = await Promise.all(
      REQUIRED_COLUMNS.map(col => checkColumnExists(prisma, col.name))
    );
    
    if (allExist.every(exists => exists)) {
      console.log('✅ All required columns are now present in users table!');
      return true;
    } else {
      console.log('⚠️  Some columns are still missing. Please check manually.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixUsersTableColumns()
  .then((success) => {
    if (success) {
      console.log('\n✅ Script completed successfully!');
      console.log('💡 Next steps:');
      console.log('   1. Run: npx prisma generate');
      console.log('   2. Restart your server');
      process.exit(0);
    } else {
      console.log('\n⚠️  Script completed with warnings. Please review the output above.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


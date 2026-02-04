/**
 * 🔧 Script to fix Foreign Key constraint for hr_employee_training table
 * 
 * This script fixes the Foreign Key constraint on the userId column
 * in the hr_employee_training table to properly reference the users table
 */

const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function fixEmployeeTrainingForeignKey() {
  let prisma;
  
  try {
    console.log('🔄 Initializing database connection...');
    await initializeSharedDatabase();
    prisma = getSharedPrismaClient();

    if (!prisma) {
      throw new Error('Failed to initialize Prisma client');
    }

    console.log('✅ Database connection established\n');

    // Step 1: Check current Foreign Key constraints
    console.log('📋 Step 1: Checking current Foreign Key constraints...');
    const existingFKs = await prisma.$queryRawUnsafe(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_employee_training'
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME = 'userId'
    `);

    console.log('Current Foreign Keys:', existingFKs);

    // Step 2: Drop existing Foreign Key constraint if it exists
    if (existingFKs.length > 0) {
      console.log('\n📋 Step 2: Dropping existing Foreign Key constraints...');
      for (const fk of existingFKs) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE \`hr_employee_training\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
          );
          console.log(`✅ Dropped Foreign Key: ${fk.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${error.message}`);
        }
      }
    } else {
      console.log('✅ No existing Foreign Key constraints found');
    }

    // Step 3: Verify userId column exists
    console.log('\n📋 Step 3: Verifying userId column exists...');
    const columns = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_employee_training'
        AND COLUMN_NAME = 'userId'
    `);

    if (columns.length === 0) {
      console.error('❌ userId column does not exist in hr_employee_training table!');
      console.log('⚠️ Please run fix_hr_tables_userid.js first to add the userId column');
      throw new Error('userId column does not exist');
    } else {
      console.log('✅ userId column exists:', columns[0]);
    }

    // Step 4: Verify users table exists and has id column
    console.log('\n📋 Step 4: Verifying users table structure...');
    const usersTable = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
    `);

    if (usersTable.length === 0) {
      throw new Error('users table does not exist!');
    }

    const usersIdColumn = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'id'
    `);

    if (usersIdColumn.length === 0) {
      throw new Error('users table does not have an id column!');
    }

    console.log('✅ users table structure verified');

    // Step 5: Clean up orphaned records (userId values that don't exist in users table)
    console.log('\n📋 Step 5: Cleaning up orphaned records...');
    const orphanedCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM hr_employee_training et
      LEFT JOIN users u ON et.userId = u.id
      WHERE u.id IS NULL
    `);

    const orphanedCountValue = orphanedCount[0]?.count || 0;
    console.log(`Found ${orphanedCountValue} orphaned records`);

    if (orphanedCountValue > 0) {
      console.log('⚠️ Found orphaned records. Deleting them...');
      const deleted = await prisma.$executeRawUnsafe(`
        DELETE et FROM hr_employee_training et
        LEFT JOIN users u ON et.userId = u.id
        WHERE u.id IS NULL
      `);
      console.log(`✅ Deleted ${deleted} orphaned records`);
    } else {
      console.log('✅ No orphaned records found');
    }

    // Step 6: Add Foreign Key constraint
    console.log('\n📋 Step 6: Adding Foreign Key constraint...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`hr_employee_training\`
        ADD CONSTRAINT \`hr_employee_training_userId_fkey\`
        FOREIGN KEY (\`userId\`)
        REFERENCES \`users\`(\`id\`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
      `);
      console.log('✅ Foreign Key constraint added successfully!');
    } catch (error) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log('⚠️ Foreign Key constraint already exists');
      } else if (error.message.includes('1452') || error.message.includes('foreign key constraint fails')) {
        console.error('❌ Still have orphaned records. Trying to find and delete them...');
        
        const orphanedRecords = await prisma.$queryRawUnsafe(`
          SELECT et.id, et.userId, et.companyId, et.trainingName
          FROM hr_employee_training et
          LEFT JOIN users u ON et.userId = u.id
          WHERE u.id IS NULL
          LIMIT 10
        `);
        
        console.log('Orphaned records:', orphanedRecords);
        
        const deleted = await prisma.$executeRawUnsafe(`
          DELETE et FROM hr_employee_training et
          LEFT JOIN users u ON et.userId = u.id
          WHERE u.id IS NULL
        `);
        
        console.log(`✅ Deleted ${deleted} orphaned records. Retrying constraint creation...`);
        
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`hr_employee_training\`
          ADD CONSTRAINT \`hr_employee_training_userId_fkey\`
          FOREIGN KEY (\`userId\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `);
        console.log('✅ Foreign Key constraint added successfully after cleanup!');
      } else {
        throw error;
      }
    }

    // Step 7: Verify the constraint was created
    console.log('\n📋 Step 7: Verifying Foreign Key constraint...');
    const newFKs = await prisma.$queryRawUnsafe(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_employee_training'
        AND REFERENCED_TABLE_NAME = 'users'
        AND COLUMN_NAME = 'userId'
    `);

    if (newFKs.length > 0) {
      console.log('✅ Foreign Key constraint verified:', newFKs[0]);
    } else {
      console.error('❌ Foreign Key constraint was not created!');
    }

    console.log('\n✅ Fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Foreign Key constraint on hr_employee_training.userId → users.id (ON DELETE CASCADE)');

  } catch (error) {
    console.error('❌ Error fixing Foreign Key constraint:', error);
    throw error;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Run the script
if (require.main === module) {
  fixEmployeeTrainingForeignKey()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixEmployeeTrainingForeignKey };

/**
 * 🔧 Script to fix Foreign Key constraints for hr_leave_requests table
 * 
 * This script fixes the Foreign Key constraints on:
 * - userId column (should reference users.id)
 * - approvedBy column (should reference users.id)
 */

const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function fixLeaveRequestsForeignKey() {
  let prisma;
  
  try {
    console.log('🔄 Initializing database connection...');
    await initializeSharedDatabase();
    prisma = getSharedPrismaClient();

    if (!prisma) {
      throw new Error('Failed to initialize Prisma client');
    }

    console.log('✅ Database connection established\n');

    // Step 1: Check current Foreign Key constraints (for both userId and approvedBy)
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
        AND TABLE_NAME = 'hr_leave_requests'
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME IN ('userId', 'approvedBy')
    `);

    console.log('Current Foreign Keys:', existingFKs);

    // Step 2: Drop existing Foreign Key constraints if they exist
    if (existingFKs.length > 0) {
      console.log('\n📋 Step 2: Dropping existing Foreign Key constraints...');
      for (const fk of existingFKs) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE \`hr_leave_requests\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
          );
          console.log(`✅ Dropped Foreign Key: ${fk.CONSTRAINT_NAME} (${fk.COLUMN_NAME})`);
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
        AND TABLE_NAME = 'hr_leave_requests'
        AND COLUMN_NAME = 'userId'
    `);

    if (columns.length === 0) {
      console.error('❌ userId column does not exist in hr_leave_requests table!');
      console.log('⚠️ Adding userId column...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`hr_leave_requests\` 
        ADD COLUMN \`userId\` VARCHAR(191) NOT NULL AFTER \`companyId\`
      `);
      console.log('✅ Added userId column');
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
      FROM hr_leave_requests lr
      LEFT JOIN users u ON lr.userId = u.id
      WHERE u.id IS NULL
    `);

    const orphanedCountValue = orphanedCount[0]?.count || 0;
    console.log(`Found ${orphanedCountValue} orphaned records`);

    if (orphanedCountValue > 0) {
      console.log('⚠️ Found orphaned records. Deleting them...');
      // Use LEFT JOIN for better MySQL compatibility
      const deleted = await prisma.$executeRawUnsafe(`
        DELETE lr FROM hr_leave_requests lr
        LEFT JOIN users u ON lr.userId = u.id
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
        ALTER TABLE \`hr_leave_requests\`
        ADD CONSTRAINT \`hr_leave_requests_userId_fkey\`
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
        
        // Try to find specific orphaned records
        const orphanedRecords = await prisma.$queryRawUnsafe(`
          SELECT lr.id, lr.userId, lr.companyId, lr.type, lr.startDate
          FROM hr_leave_requests lr
          LEFT JOIN users u ON lr.userId = u.id
          WHERE u.id IS NULL
          LIMIT 10
        `);
        
        console.log('Orphaned records:', orphanedRecords);
        
        // Delete them
        const deleted = await prisma.$executeRawUnsafe(`
          DELETE lr FROM hr_leave_requests lr
          LEFT JOIN users u ON lr.userId = u.id
          WHERE u.id IS NULL
        `);
        
        console.log(`✅ Deleted ${deleted} orphaned records. Retrying constraint creation...`);
        
        // Retry adding constraint
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`hr_leave_requests\`
          ADD CONSTRAINT \`hr_leave_requests_userId_fkey\`
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

    // Step 7: Fix approvedBy Foreign Key constraint
    console.log('\n📋 Step 7: Fixing approvedBy Foreign Key constraint...');
    
    // Clean up orphaned approvedBy records (set to NULL instead of deleting)
    const orphanedApprovedBy = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM hr_leave_requests lr
      WHERE lr.approvedBy IS NOT NULL
        AND lr.approvedBy NOT IN (SELECT id FROM users)
    `);
    
    const orphanedApprovedByCount = orphanedApprovedBy[0]?.count || 0;
    if (orphanedApprovedByCount > 0) {
      console.log(`⚠️ Found ${orphanedApprovedByCount} records with invalid approvedBy. Setting to NULL...`);
      // Use LEFT JOIN instead of subquery for MySQL compatibility
      await prisma.$executeRawUnsafe(`
        UPDATE hr_leave_requests lr
        LEFT JOIN users u ON lr.approvedBy = u.id
        SET lr.approvedBy = NULL
        WHERE lr.approvedBy IS NOT NULL
          AND u.id IS NULL
      `);
      console.log(`✅ Fixed ${orphanedApprovedByCount} records`);
    } else {
      console.log('✅ No orphaned approvedBy records found');
    }
    
    // Check if approvedBy FK constraint exists and points to users
    const approvedByFKs = await prisma.$queryRawUnsafe(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_leave_requests'
        AND COLUMN_NAME = 'approvedBy'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    // Drop existing approvedBy FK if it points to wrong table
    for (const fk of approvedByFKs) {
      if (fk.REFERENCED_TABLE_NAME !== 'users') {
        console.log(`⚠️ Dropping incorrect approvedBy FK (points to ${fk.REFERENCED_TABLE_NAME})...`);
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE \`hr_leave_requests\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
          );
          console.log(`✅ Dropped: ${fk.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${error.message}`);
        }
      }
    }
    
    // Check if correct FK exists
    const correctApprovedByFK = await prisma.$queryRawUnsafe(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_leave_requests'
        AND COLUMN_NAME = 'approvedBy'
        AND REFERENCED_TABLE_NAME = 'users'
    `);
    
    if (correctApprovedByFK.length === 0) {
      console.log('Adding approvedBy Foreign Key constraint...');
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`hr_leave_requests\`
          ADD CONSTRAINT \`hr_leave_requests_approvedBy_fkey\`
          FOREIGN KEY (\`approvedBy\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `);
        console.log('✅ approvedBy Foreign Key constraint added successfully!');
      } catch (error) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          console.log('⚠️ approvedBy Foreign Key constraint already exists');
        } else {
          console.error('❌ Error adding approvedBy FK:', error.message);
        }
      }
    } else {
      console.log('✅ approvedBy Foreign Key constraint already exists and is correct');
    }

    // Step 8: Verify all constraints were created
    console.log('\n📋 Step 8: Verifying Foreign Key constraints...');
    const allFKs = await prisma.$queryRawUnsafe(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_leave_requests'
        AND REFERENCED_TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('userId', 'approvedBy')
    `);

    if (allFKs.length > 0) {
      console.log('✅ Foreign Key constraints verified:');
      allFKs.forEach(fk => {
        console.log(`   - ${fk.COLUMN_NAME}: ${fk.CONSTRAINT_NAME} → users.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.error('❌ Foreign Key constraints were not created!');
    }

    console.log('\n✅ Fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Foreign Key constraint on hr_leave_requests.userId → users.id (ON DELETE CASCADE)');
    console.log('   - Foreign Key constraint on hr_leave_requests.approvedBy → users.id (ON DELETE SET NULL)');

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
  fixLeaveRequestsForeignKey()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixLeaveRequestsForeignKey };

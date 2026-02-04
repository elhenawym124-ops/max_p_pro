/**
 * 🔧 Script to fix Foreign Key constraints for hr_advance_requests table
 * 
 * This script fixes the Foreign Key constraints on:
 * - userId column (should reference users.id)
 * - approvedBy column (should reference users.id)
 */

const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function fixAdvanceRequestsForeignKey() {
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
        AND TABLE_NAME = 'hr_advance_requests'
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
            `ALTER TABLE \`hr_advance_requests\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
          );
          console.log(`✅ Dropped Foreign Key: ${fk.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${error.message}`);
        }
      }
    } else {
      console.log('✅ No existing Foreign Key constraints found');
    }

    // Step 3: Verify userId and approvedBy columns exist
    console.log('\n📋 Step 3: Verifying columns exist...');
    const columns = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_advance_requests'
        AND COLUMN_NAME IN ('userId', 'approvedBy')
    `);

    const userIdColumn = columns.find(c => c.COLUMN_NAME === 'userId');
    const approvedByColumn = columns.find(c => c.COLUMN_NAME === 'approvedBy');

    if (!userIdColumn) {
      console.error('❌ userId column does not exist in hr_advance_requests table!');
      console.log('⚠️ Please run fix_hr_tables_userid.js first to add the userId column');
      throw new Error('userId column does not exist');
    } else {
      console.log('✅ userId column exists:', userIdColumn);
    }

    if (!approvedByColumn) {
      console.error('❌ approvedBy column does not exist in hr_advance_requests table!');
    } else {
      console.log('✅ approvedBy column exists:', approvedByColumn);
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
    console.log('\n📋 Step 5: Cleaning up orphaned userId records...');
    const orphanedUserIdCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM hr_advance_requests ar
      LEFT JOIN users u ON ar.userId = u.id
      WHERE u.id IS NULL
    `);

    const orphanedUserIdCountValue = orphanedUserIdCount[0]?.count || 0;
    console.log(`Found ${orphanedUserIdCountValue} orphaned userId records`);

    if (orphanedUserIdCountValue > 0) {
      console.log('⚠️ Found orphaned userId records. Deleting them...');
      const deleted = await prisma.$executeRawUnsafe(`
        DELETE ar FROM hr_advance_requests ar
        LEFT JOIN users u ON ar.userId = u.id
        WHERE u.id IS NULL
      `);
      console.log(`✅ Deleted ${deleted} orphaned userId records`);
    } else {
      console.log('✅ No orphaned userId records found');
    }

    // Step 6: Clean up orphaned approvedBy records
    console.log('\n📋 Step 6: Cleaning up orphaned approvedBy records...');
    const orphanedApprovedByCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM hr_advance_requests ar
      WHERE ar.approvedBy IS NOT NULL
        AND ar.approvedBy NOT IN (SELECT id FROM users)
    `);

    const orphanedApprovedByCountValue = orphanedApprovedByCount[0]?.count || 0;
    console.log(`Found ${orphanedApprovedByCountValue} orphaned approvedBy records`);

    if (orphanedApprovedByCountValue > 0) {
      console.log('⚠️ Found orphaned approvedBy records. Setting them to NULL...');
      const updated = await prisma.$executeRawUnsafe(`
        UPDATE hr_advance_requests ar
        SET ar.approvedBy = NULL
        WHERE ar.approvedBy IS NOT NULL
          AND ar.approvedBy NOT IN (SELECT id FROM users)
      `);
      console.log(`✅ Set ${updated} orphaned approvedBy records to NULL`);
    } else {
      console.log('✅ No orphaned approvedBy records found');
    }

    // Step 7: Add Foreign Key constraint for userId
    console.log('\n📋 Step 7: Adding Foreign Key constraint for userId...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`hr_advance_requests\`
        ADD CONSTRAINT \`hr_advance_requests_userId_fkey\`
        FOREIGN KEY (\`userId\`)
        REFERENCES \`users\`(\`id\`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
      `);
      console.log('✅ Foreign Key constraint for userId added successfully!');
    } catch (error) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log('⚠️ Foreign Key constraint for userId already exists');
      } else if (error.message.includes('1452') || error.message.includes('foreign key constraint fails')) {
        console.error('❌ Still have orphaned userId records. Trying to find and delete them...');
        
        const orphanedRecords = await prisma.$queryRawUnsafe(`
          SELECT ar.id, ar.userId, ar.companyId, ar.amount
          FROM hr_advance_requests ar
          LEFT JOIN users u ON ar.userId = u.id
          WHERE u.id IS NULL
          LIMIT 10
        `);
        
        console.log('Orphaned records:', orphanedRecords);
        
        const deleted = await prisma.$executeRawUnsafe(`
          DELETE ar FROM hr_advance_requests ar
          LEFT JOIN users u ON ar.userId = u.id
          WHERE u.id IS NULL
        `);
        
        console.log(`✅ Deleted ${deleted} orphaned records. Retrying constraint creation...`);
        
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`hr_advance_requests\`
          ADD CONSTRAINT \`hr_advance_requests_userId_fkey\`
          FOREIGN KEY (\`userId\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `);
        console.log('✅ Foreign Key constraint for userId added successfully after cleanup!');
      } else {
        throw error;
      }
    }

    // Step 8: Add Foreign Key constraint for approvedBy (if column exists)
    if (approvedByColumn) {
      console.log('\n📋 Step 8: Adding Foreign Key constraint for approvedBy...');
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`hr_advance_requests\`
          ADD CONSTRAINT \`hr_advance_requests_approvedBy_fkey\`
          FOREIGN KEY (\`approvedBy\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `);
        console.log('✅ Foreign Key constraint for approvedBy added successfully!');
      } catch (error) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          console.log('⚠️ Foreign Key constraint for approvedBy already exists');
        } else if (error.message.includes('1452') || error.message.includes('foreign key constraint fails')) {
          console.error('❌ Still have orphaned approvedBy records. Trying to set them to NULL...');
          
          const orphanedRecords = await prisma.$queryRawUnsafe(`
            SELECT ar.id, ar.approvedBy, ar.companyId, ar.amount
            FROM hr_advance_requests ar
            WHERE ar.approvedBy IS NOT NULL
              AND ar.approvedBy NOT IN (SELECT id FROM users)
            LIMIT 10
          `);
          
          console.log('Orphaned records:', orphanedRecords);
          
          const updated = await prisma.$executeRawUnsafe(`
            UPDATE hr_advance_requests ar
            SET ar.approvedBy = NULL
            WHERE ar.approvedBy IS NOT NULL
              AND ar.approvedBy NOT IN (SELECT id FROM users)
          `);
          
          console.log(`✅ Set ${updated} orphaned records to NULL. Retrying constraint creation...`);
          
          await prisma.$executeRawUnsafe(`
            ALTER TABLE \`hr_advance_requests\`
            ADD CONSTRAINT \`hr_advance_requests_approvedBy_fkey\`
            FOREIGN KEY (\`approvedBy\`)
            REFERENCES \`users\`(\`id\`)
            ON DELETE SET NULL
            ON UPDATE CASCADE
          `);
          console.log('✅ Foreign Key constraint for approvedBy added successfully after cleanup!');
        } else {
          throw error;
        }
      }
    } else {
      console.log('\n⚠️ Skipping approvedBy Foreign Key constraint (column does not exist)');
    }

    // Step 9: Verify the constraints were created
    console.log('\n📋 Step 9: Verifying Foreign Key constraints...');
    const newFKs = await prisma.$queryRawUnsafe(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_advance_requests'
        AND REFERENCED_TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('userId', 'approvedBy')
    `);

    if (newFKs.length >= 1) {
      console.log('✅ Foreign Key constraints verified:', newFKs);
    } else {
      console.error('❌ Some Foreign Key constraints were not created!');
      console.log('Found constraints:', newFKs);
    }

    console.log('\n✅ Fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Foreign Key constraint on hr_advance_requests.userId → users.id (ON DELETE CASCADE)');
    if (approvedByColumn) {
      console.log('   - Foreign Key constraint on hr_advance_requests.approvedBy → users.id (ON DELETE SET NULL)');
    }

  } catch (error) {
    console.error('❌ Error fixing Foreign Key constraints:', error);
    throw error;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Run the script
if (require.main === module) {
  fixAdvanceRequestsForeignKey()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAdvanceRequestsForeignKey };

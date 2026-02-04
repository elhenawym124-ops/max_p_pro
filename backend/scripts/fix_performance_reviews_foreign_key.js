/**
 * 🔧 Script to fix Foreign Key constraints for hr_performance_reviews table
 * 
 * This script fixes the Foreign Key constraints on:
 * - userId column (should reference users.id)
 * - reviewerId column (should reference users.id)
 */

const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function fixPerformanceReviewsForeignKey() {
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
        AND TABLE_NAME = 'hr_performance_reviews'
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME IN ('userId', 'reviewerId')
    `);

    console.log('Current Foreign Keys:', existingFKs);

    // Step 2: Drop existing Foreign Key constraints if they exist
    if (existingFKs.length > 0) {
      console.log('\n📋 Step 2: Dropping existing Foreign Key constraints...');
      for (const fk of existingFKs) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE \`hr_performance_reviews\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
          );
          console.log(`✅ Dropped Foreign Key: ${fk.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${error.message}`);
        }
      }
    } else {
      console.log('✅ No existing Foreign Key constraints found');
    }

    // Step 3: Verify userId and reviewerId columns exist
    console.log('\n📋 Step 3: Verifying columns exist...');
    const columns = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hr_performance_reviews'
        AND COLUMN_NAME IN ('userId', 'reviewerId')
    `);

    const userIdColumn = columns.find(c => c.COLUMN_NAME === 'userId');
    const reviewerIdColumn = columns.find(c => c.COLUMN_NAME === 'reviewerId');

    if (!userIdColumn) {
      console.error('❌ userId column does not exist in hr_performance_reviews table!');
      throw new Error('userId column does not exist');
    } else {
      console.log('✅ userId column exists:', userIdColumn);
    }

    if (!reviewerIdColumn) {
      console.error('❌ reviewerId column does not exist in hr_performance_reviews table!');
      throw new Error('reviewerId column does not exist');
    } else {
      console.log('✅ reviewerId column exists:', reviewerIdColumn);
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
      FROM hr_performance_reviews pr
      LEFT JOIN users u ON pr.userId = u.id
      WHERE u.id IS NULL
    `);

    const orphanedUserIdCountValue = orphanedUserIdCount[0]?.count || 0;
    console.log(`Found ${orphanedUserIdCountValue} orphaned userId records`);

    if (orphanedUserIdCountValue > 0) {
      console.log('⚠️ Found orphaned userId records. Deleting them...');
      const deleted = await prisma.$executeRawUnsafe(`
        DELETE pr FROM hr_performance_reviews pr
        LEFT JOIN users u ON pr.userId = u.id
        WHERE u.id IS NULL
      `);
      console.log(`✅ Deleted ${deleted} orphaned userId records`);
    } else {
      console.log('✅ No orphaned userId records found');
    }

    // Step 6: Clean up orphaned reviewerId records
    console.log('\n📋 Step 6: Cleaning up orphaned reviewerId records...');
    const orphanedReviewerIdCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM hr_performance_reviews pr
      WHERE pr.reviewerId IS NOT NULL
        AND pr.reviewerId NOT IN (SELECT id FROM users)
    `);

    const orphanedReviewerIdCountValue = orphanedReviewerIdCount[0]?.count || 0;
    console.log(`Found ${orphanedReviewerIdCountValue} orphaned reviewerId records`);

    if (orphanedReviewerIdCountValue > 0) {
      console.log('⚠️ Found orphaned reviewerId records. Setting them to NULL is not allowed (reviewerId is NOT NULL), so deleting these records...');
      const deleted = await prisma.$executeRawUnsafe(`
        DELETE pr FROM hr_performance_reviews pr
        WHERE pr.reviewerId IS NOT NULL
          AND pr.reviewerId NOT IN (SELECT id FROM users)
      `);
      console.log(`✅ Deleted ${deleted} orphaned reviewerId records`);
    } else {
      console.log('✅ No orphaned reviewerId records found');
    }

    // Step 7: Add Foreign Key constraint for userId
    console.log('\n📋 Step 7: Adding Foreign Key constraint for userId...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`hr_performance_reviews\`
        ADD CONSTRAINT \`hr_performance_reviews_userId_fkey\`
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
          SELECT pr.id, pr.userId, pr.companyId
          FROM hr_performance_reviews pr
          LEFT JOIN users u ON pr.userId = u.id
          WHERE u.id IS NULL
          LIMIT 10
        `);
        
        console.log('Orphaned records:', orphanedRecords);
        
        const deleted = await prisma.$executeRawUnsafe(`
          DELETE pr FROM hr_performance_reviews pr
          LEFT JOIN users u ON pr.userId = u.id
          WHERE u.id IS NULL
        `);
        
        console.log(`✅ Deleted ${deleted} orphaned records. Retrying constraint creation...`);
        
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`hr_performance_reviews\`
          ADD CONSTRAINT \`hr_performance_reviews_userId_fkey\`
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

    // Step 8: Add Foreign Key constraint for reviewerId
    console.log('\n📋 Step 8: Adding Foreign Key constraint for reviewerId...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`hr_performance_reviews\`
        ADD CONSTRAINT \`hr_performance_reviews_reviewerId_fkey\`
        FOREIGN KEY (\`reviewerId\`)
        REFERENCES \`users\`(\`id\`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
      `);
      console.log('✅ Foreign Key constraint for reviewerId added successfully!');
    } catch (error) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log('⚠️ Foreign Key constraint for reviewerId already exists');
      } else if (error.message.includes('1452') || error.message.includes('foreign key constraint fails')) {
        console.error('❌ Still have orphaned reviewerId records. Trying to find and delete them...');
        
        const orphanedRecords = await prisma.$queryRawUnsafe(`
          SELECT pr.id, pr.reviewerId, pr.companyId
          FROM hr_performance_reviews pr
          WHERE pr.reviewerId IS NOT NULL
            AND pr.reviewerId NOT IN (SELECT id FROM users)
          LIMIT 10
        `);
        
        console.log('Orphaned records:', orphanedRecords);
        
        const deleted = await prisma.$executeRawUnsafe(`
          DELETE pr FROM hr_performance_reviews pr
          WHERE pr.reviewerId IS NOT NULL
            AND pr.reviewerId NOT IN (SELECT id FROM users)
        `);
        
        console.log(`✅ Deleted ${deleted} orphaned records. Retrying constraint creation...`);
        
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`hr_performance_reviews\`
          ADD CONSTRAINT \`hr_performance_reviews_reviewerId_fkey\`
          FOREIGN KEY (\`reviewerId\`)
          REFERENCES \`users\`(\`id\`)
          ON DELETE RESTRICT
          ON UPDATE CASCADE
        `);
        console.log('✅ Foreign Key constraint for reviewerId added successfully after cleanup!');
      } else {
        throw error;
      }
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
        AND TABLE_NAME = 'hr_performance_reviews'
        AND REFERENCED_TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('userId', 'reviewerId')
    `);

    if (newFKs.length >= 2) {
      console.log('✅ Foreign Key constraints verified:', newFKs);
    } else {
      console.error('❌ Some Foreign Key constraints were not created!');
      console.log('Found constraints:', newFKs);
    }

    console.log('\n✅ Fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Foreign Key constraint on hr_performance_reviews.userId → users.id (ON DELETE CASCADE)');
    console.log('   - Foreign Key constraint on hr_performance_reviews.reviewerId → users.id (ON DELETE RESTRICT)');

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
  fixPerformanceReviewsForeignKey()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPerformanceReviewsForeignKey };

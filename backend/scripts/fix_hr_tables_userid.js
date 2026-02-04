/**
 * 🔧 Script to fix HR tables: Add/rename userId columns
 * 
 * This script fixes the following tables:
 * - hr_payroll: Change employeeId to userId
 * - hr_leave_requests: Change employeeId to userId
 * - hr_attendance: Change employeeId to userId
 * - hr_advance_requests: Change employeeId to userId
 * - hr_performance_reviews: Change employeeId to userId
 * - hr_goals: Change employeeId to userId
 * - hr_employee_training: Change employeeId to userId
 * - hr_employee_warnings: Change employeeId to userId
 * - hr_resignations: Change employeeId to userId
 */

const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function fixHRTables() {
  let prisma;
  
  try {
    console.log('🔄 Initializing database connection...');
    await initializeSharedDatabase();
    prisma = getSharedPrismaClient();

    if (!prisma) {
      throw new Error('Failed to initialize Prisma client');
    }

    console.log('✅ Database connection established');

    // Check and fix hr_payroll table
    console.log('\n📋 Checking hr_payroll table...');
    const payrollColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_payroll' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const hasEmployeeId = payrollColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const hasUserId = payrollColumns.some(col => col.COLUMN_NAME === 'userId');

    if (hasEmployeeId && !hasUserId) {
      console.log('⚠️ hr_payroll has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_payroll CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_payroll');
    } else if (!hasEmployeeId && !hasUserId) {
      console.log('⚠️ hr_payroll has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_payroll ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_payroll');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (hasUserId) {
      console.log('✅ hr_payroll already has userId column');
    }

    // Check and fix hr_leave_requests table
    console.log('\n📋 Checking hr_leave_requests table...');
    const leaveColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_leave_requests' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const leaveHasEmployeeId = leaveColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const leaveHasUserId = leaveColumns.some(col => col.COLUMN_NAME === 'userId');

    if (leaveHasEmployeeId && !leaveHasUserId) {
      console.log('⚠️ hr_leave_requests has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_leave_requests CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_leave_requests');
    } else if (!leaveHasEmployeeId && !leaveHasUserId) {
      console.log('⚠️ hr_leave_requests has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_leave_requests ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_leave_requests');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (leaveHasUserId) {
      console.log('✅ hr_leave_requests already has userId column');
    }

    // Check and fix hr_attendance table
    console.log('\n📋 Checking hr_attendance table...');
    const attendanceColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_attendance' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const attendanceHasEmployeeId = attendanceColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const attendanceHasUserId = attendanceColumns.some(col => col.COLUMN_NAME === 'userId');

    if (attendanceHasEmployeeId && !attendanceHasUserId) {
      console.log('⚠️ hr_attendance has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_attendance CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_attendance');
    } else if (!attendanceHasEmployeeId && !attendanceHasUserId) {
      console.log('⚠️ hr_attendance has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_attendance ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_attendance');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (attendanceHasUserId) {
      console.log('✅ hr_attendance already has userId column');
    }

    // Update unique constraints if they exist
    console.log('\n📋 Checking unique constraints...');
    
    // Check for employeeId_date constraint in hr_attendance
    const attendanceConstraints = await prisma.$queryRawUnsafe(
      `SELECT CONSTRAINT_NAME 
       FROM information_schema.TABLE_CONSTRAINTS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_attendance' 
       AND CONSTRAINT_TYPE = 'UNIQUE' 
       AND CONSTRAINT_NAME LIKE '%employeeId%'`
    );

    if (attendanceConstraints.length > 0) {
      console.log('⚠️ Found employeeId-based unique constraints. Updating...');
      for (const constraint of attendanceConstraints) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE hr_attendance DROP INDEX ${constraint.CONSTRAINT_NAME}`
          );
          console.log(`✅ Dropped constraint: ${constraint.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️ Could not drop constraint ${constraint.CONSTRAINT_NAME}: ${error.message}`);
        }
      }
      
      // Recreate with userId
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE hr_attendance ADD UNIQUE KEY userId_date (userId, date)`
        );
        console.log('✅ Created userId_date unique constraint in hr_attendance');
      } catch (error) {
        console.log(`⚠️ Could not create userId_date constraint: ${error.message}`);
      }
    }

    // Check for employeeId_date constraint in hr_leave_requests
    const leaveConstraints = await prisma.$queryRawUnsafe(
      `SELECT CONSTRAINT_NAME 
       FROM information_schema.TABLE_CONSTRAINTS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_leave_requests' 
       AND CONSTRAINT_TYPE = 'UNIQUE' 
       AND CONSTRAINT_NAME LIKE '%employeeId%'`
    );

    if (leaveConstraints.length > 0) {
      console.log('⚠️ Found employeeId-based unique constraints in hr_leave_requests. Updating...');
      for (const constraint of leaveConstraints) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE hr_leave_requests DROP INDEX ${constraint.CONSTRAINT_NAME}`
          );
          console.log(`✅ Dropped constraint: ${constraint.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️ Could not drop constraint ${constraint.CONSTRAINT_NAME}: ${error.message}`);
        }
      }
    }

    // Check and fix hr_advance_requests table
    console.log('\n📋 Checking hr_advance_requests table...');
    const advanceColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_advance_requests' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const advanceHasEmployeeId = advanceColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const advanceHasUserId = advanceColumns.some(col => col.COLUMN_NAME === 'userId');

    if (advanceHasEmployeeId && !advanceHasUserId) {
      console.log('⚠️ hr_advance_requests has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_advance_requests CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_advance_requests');
    } else if (!advanceHasEmployeeId && !advanceHasUserId) {
      console.log('⚠️ hr_advance_requests has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_advance_requests ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_advance_requests');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (advanceHasUserId) {
      console.log('✅ hr_advance_requests already has userId column');
    }

    // Check and fix hr_performance_reviews table
    console.log('\n📋 Checking hr_performance_reviews table...');
    const performanceColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_performance_reviews' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const performanceHasEmployeeId = performanceColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const performanceHasUserId = performanceColumns.some(col => col.COLUMN_NAME === 'userId');

    if (performanceHasEmployeeId && !performanceHasUserId) {
      console.log('⚠️ hr_performance_reviews has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_performance_reviews CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_performance_reviews');
    } else if (!performanceHasEmployeeId && !performanceHasUserId) {
      console.log('⚠️ hr_performance_reviews has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_performance_reviews ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_performance_reviews');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (performanceHasUserId) {
      console.log('✅ hr_performance_reviews already has userId column');
    }

    // Check and fix hr_goals table
    console.log('\n📋 Checking hr_goals table...');
    const goalsColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_goals' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const goalsHasEmployeeId = goalsColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const goalsHasUserId = goalsColumns.some(col => col.COLUMN_NAME === 'userId');

    if (goalsHasEmployeeId && !goalsHasUserId) {
      console.log('⚠️ hr_goals has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_goals CHANGE COLUMN employeeId userId VARCHAR(191) NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_goals');
    } else if (!goalsHasEmployeeId && !goalsHasUserId) {
      console.log('⚠️ hr_goals has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_goals ADD COLUMN userId VARCHAR(191) NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_goals');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (goalsHasUserId) {
      console.log('✅ hr_goals already has userId column');
    }

    // Check and fix hr_employee_training table
    console.log('\n📋 Checking hr_employee_training table...');
    const trainingColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_employee_training' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const trainingHasEmployeeId = trainingColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const trainingHasUserId = trainingColumns.some(col => col.COLUMN_NAME === 'userId');

    if (trainingHasEmployeeId && !trainingHasUserId) {
      console.log('⚠️ hr_employee_training has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_employee_training CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_employee_training');
    } else if (!trainingHasEmployeeId && !trainingHasUserId) {
      console.log('⚠️ hr_employee_training has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_employee_training ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_employee_training');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (trainingHasUserId) {
      console.log('✅ hr_employee_training already has userId column');
    }

    // Check and fix hr_employee_warnings table
    console.log('\n📋 Checking hr_employee_warnings table...');
    const warningsColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_employee_warnings' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const warningsHasEmployeeId = warningsColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const warningsHasUserId = warningsColumns.some(col => col.COLUMN_NAME === 'userId');

    if (warningsHasEmployeeId && !warningsHasUserId) {
      console.log('⚠️ hr_employee_warnings has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_employee_warnings CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_employee_warnings');
    } else if (!warningsHasEmployeeId && !warningsHasUserId) {
      console.log('⚠️ hr_employee_warnings has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_employee_warnings ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_employee_warnings');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (warningsHasUserId) {
      console.log('✅ hr_employee_warnings already has userId column');
    }

    // Check and fix hr_resignations table
    console.log('\n📋 Checking hr_resignations table...');
    const resignationsColumns = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'hr_resignations' 
       AND COLUMN_NAME IN ('employeeId', 'userId')`
    );

    const resignationsHasEmployeeId = resignationsColumns.some(col => col.COLUMN_NAME === 'employeeId');
    const resignationsHasUserId = resignationsColumns.some(col => col.COLUMN_NAME === 'userId');

    if (resignationsHasEmployeeId && !resignationsHasUserId) {
      console.log('⚠️ hr_resignations has employeeId but not userId. Renaming column...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_resignations CHANGE COLUMN employeeId userId VARCHAR(191) NOT NULL`
      );
      console.log('✅ Renamed employeeId to userId in hr_resignations');
    } else if (!resignationsHasEmployeeId && !resignationsHasUserId) {
      console.log('⚠️ hr_resignations has neither employeeId nor userId. Adding userId...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE hr_resignations ADD COLUMN userId VARCHAR(191) NOT NULL AFTER companyId`
      );
      console.log('✅ Added userId column to hr_resignations');
      console.log('⚠️ Note: You may need to populate userId values manually');
    } else if (resignationsHasUserId) {
      console.log('✅ hr_resignations already has userId column');
    }

    console.log('\n✅ All HR tables have been fixed!');
    console.log('📝 Summary:');
    console.log('   - hr_payroll: userId column ready');
    console.log('   - hr_leave_requests: userId column ready');
    console.log('   - hr_attendance: userId column ready');
    console.log('   - hr_advance_requests: userId column ready');
    console.log('   - hr_performance_reviews: userId column ready');
    console.log('   - hr_goals: userId column ready');
    console.log('   - hr_employee_training: userId column ready');
    console.log('   - hr_employee_warnings: userId column ready');
    console.log('   - hr_resignations: userId column ready');

  } catch (error) {
    console.error('❌ Error fixing HR tables:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fixHRTables()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixHRTables };


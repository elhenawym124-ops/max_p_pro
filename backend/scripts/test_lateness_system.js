/**
 * 🕐 Lateness System Testing Utility
 * Comprehensive testing script for lateness deduction system
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const latenessService = require('../services/hr/latenessService');
const attendanceService = require('../services/hr/attendanceService');

const prisma = getSharedPrismaClient();

/**
 * Test Scenario 1: On-time check-in
 */
async function testOnTimeCheckIn(companyId, userId) {
  console.log('\n📋 TEST 1: On-time check-in (09:55 AM)');
  console.log('Expected: No lateness, no allowance used, no deduction');
  
  const today = new Date();
  today.setHours(9, 55, 0, 0);
  
  try {
    const attendance = await attendanceService.checkIn(companyId, userId, {
      method: 'biometric',
      location: JSON.stringify({ latitude: 0, longitude: 0 })
    });
    
    const latenessRecord = await prisma.latenessRecord.findUnique({
      where: { attendanceId: attendance.id }
    });
    
    console.log('✅ Result:', {
      checkInTime: attendance.checkIn,
      latenessMinutes: latenessRecord?.latenessMinutes || 0,
      category: latenessRecord?.latenessCategory || 'ON_TIME',
      allowanceUsed: latenessRecord?.allowanceUsedMinutes || 0,
      isViolation: latenessRecord?.isViolation || false
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test Scenario 2: 5 minutes late (within grace period)
 */
async function testGracePeriodLate(companyId, userId) {
  console.log('\n📋 TEST 2: 5 minutes late (10:05 AM)');
  console.log('Expected: 5 minutes lateness, 5 minutes from allowance, no deduction');
  
  const today = new Date();
  today.setHours(10, 5, 0, 0);
  
  try {
    // Get allowance before
    const allowanceBefore = await latenessService.getCurrentAllowance(companyId, userId);
    console.log('Allowance before:', allowanceBefore.remainingMinutes, 'minutes');
    
    const attendance = await attendanceService.checkIn(companyId, userId, {
      method: 'biometric',
      location: JSON.stringify({ latitude: 0, longitude: 0 })
    });
    
    const latenessRecord = await prisma.latenessRecord.findUnique({
      where: { attendanceId: attendance.id }
    });
    
    const allowanceAfter = await latenessService.getCurrentAllowance(companyId, userId);
    console.log('Allowance after:', allowanceAfter.remainingMinutes, 'minutes');
    
    console.log('✅ Result:', {
      checkInTime: attendance.checkIn,
      latenessMinutes: latenessRecord.latenessMinutes,
      category: latenessRecord.latenessCategory,
      allowanceUsed: latenessRecord.allowanceUsedMinutes,
      excessMinutes: latenessRecord.excessMinutes,
      isViolation: latenessRecord.isViolation
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test Scenario 3: Direct violation (after 10:10 AM)
 */
async function testDirectViolation(companyId, userId) {
  console.log('\n📋 TEST 3: Direct violation (10:15 AM)');
  console.log('Expected: 15 minutes lateness, no allowance used, immediate deduction');
  
  const today = new Date();
  today.setHours(10, 15, 0, 0);
  
  try {
    const allowanceBefore = await latenessService.getCurrentAllowance(companyId, userId);
    console.log('Allowance before:', allowanceBefore.remainingMinutes, 'minutes');
    
    const attendance = await attendanceService.checkIn(companyId, userId, {
      method: 'biometric',
      location: JSON.stringify({ latitude: 0, longitude: 0 })
    });
    
    const latenessRecord = await prisma.latenessRecord.findUnique({
      where: { attendanceId: attendance.id }
    });
    
    const deductions = await prisma.latenessDeduction.findMany({
      where: { latenessRecordId: latenessRecord.id }
    });
    
    const allowanceAfter = await latenessService.getCurrentAllowance(companyId, userId);
    console.log('Allowance after:', allowanceAfter.remainingMinutes, 'minutes (should be unchanged)');
    
    console.log('✅ Result:', {
      checkInTime: attendance.checkIn,
      latenessMinutes: latenessRecord.latenessMinutes,
      category: latenessRecord.latenessCategory,
      allowanceUsed: latenessRecord.allowanceUsedMinutes,
      isViolation: latenessRecord.isViolation,
      deductionsApplied: deductions.length,
      deductionDetails: deductions.map(d => ({
        type: d.deductionType,
        reason: d.deductionReason,
        financialAmount: d.financialAmount,
        timeMinutes: d.timeDeductionMinutes
      }))
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test Scenario 4: Partial allowance usage
 */
async function testPartialAllowance(companyId, userId) {
  console.log('\n📋 TEST 4: Partial allowance (5 min remaining, 10 min late)');
  console.log('Expected: Use 5 from allowance, deduct 5 excess');
  
  try {
    // Set allowance to 5 minutes
    const allowance = await latenessService.getCurrentAllowance(companyId, userId);
    await prisma.latenessAllowance.update({
      where: { id: allowance.id },
      data: {
        usedMinutes: 55,
        remainingMinutes: 5
      }
    });
    
    console.log('Set allowance to 5 minutes');
    
    const today = new Date();
    today.setHours(10, 10, 0, 0); // Exactly 10 minutes late
    
    const attendance = await attendanceService.checkIn(companyId, userId, {
      method: 'biometric',
      location: JSON.stringify({ latitude: 0, longitude: 0 })
    });
    
    const latenessRecord = await prisma.latenessRecord.findUnique({
      where: { attendanceId: attendance.id }
    });
    
    const deductions = await prisma.latenessDeduction.findMany({
      where: { latenessRecordId: latenessRecord.id }
    });
    
    console.log('✅ Result:', {
      latenessMinutes: latenessRecord.latenessMinutes,
      allowanceUsed: latenessRecord.allowanceUsedMinutes,
      excessMinutes: latenessRecord.excessMinutes,
      deductionsApplied: deductions.length,
      deductionForExcess: deductions.find(d => d.deductionReason === 'ALLOWANCE_EXCEEDED')
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test Scenario 5: Zero allowance remaining
 */
async function testZeroAllowance(companyId, userId) {
  console.log('\n📋 TEST 5: Zero allowance (0 min remaining, 3 min late)');
  console.log('Expected: No allowance used, all 3 minutes deducted');
  
  try {
    // Set allowance to 0
    const allowance = await latenessService.getCurrentAllowance(companyId, userId);
    await prisma.latenessAllowance.update({
      where: { id: allowance.id },
      data: {
        usedMinutes: 60,
        remainingMinutes: 0
      }
    });
    
    console.log('Set allowance to 0 minutes');
    
    const today = new Date();
    today.setHours(10, 3, 0, 0); // 3 minutes late
    
    const attendance = await attendanceService.checkIn(companyId, userId, {
      method: 'biometric',
      location: JSON.stringify({ latitude: 0, longitude: 0 })
    });
    
    const latenessRecord = await prisma.latenessRecord.findUnique({
      where: { attendanceId: attendance.id }
    });
    
    const deductions = await prisma.latenessDeduction.findMany({
      where: { latenessRecordId: latenessRecord.id }
    });
    
    console.log('✅ Result:', {
      latenessMinutes: latenessRecord.latenessMinutes,
      category: latenessRecord.latenessCategory,
      allowanceUsed: latenessRecord.allowanceUsedMinutes,
      excessMinutes: latenessRecord.excessMinutes,
      deductionsApplied: deductions.length
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test monthly reset
 */
async function testMonthlyReset(companyId) {
  console.log('\n📋 TEST 6: Monthly allowance reset');
  
  try {
    const result = await latenessService.resetMonthlyAllowances(companyId);
    console.log('✅ Reset completed:', result);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test missing attendance detection
 */
async function testMissingAttendance(companyId) {
  console.log('\n📋 TEST 7: Missing attendance detection');
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const violations = await latenessService.detectMissingAttendance(companyId, yesterday);
    console.log('✅ Missing attendance violations created:', violations.length);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test reports
 */
async function testReports(companyId, userId) {
  console.log('\n📋 TEST 8: Report generation');
  
  try {
    const today = new Date();
    
    // Daily report
    const dailyReport = await latenessService.getDailyReport(companyId, today);
    console.log('✅ Daily report:', {
      totalEmployees: dailyReport.totalEmployees,
      onTime: dailyReport.onTime,
      lateWithinGrace: dailyReport.lateWithinGrace,
      violations: dailyReport.violations
    });
    
    // Monthly summary
    const monthlySummary = await latenessService.generateMonthlySummary(
      companyId,
      userId,
      today.getFullYear(),
      today.getMonth() + 1
    );
    console.log('✅ Monthly summary:', {
      totalLateDays: monthlySummary.totalLateDays,
      totalLatenessMinutes: monthlySummary.totalLatenessMinutes,
      violationDays: monthlySummary.violationDays,
      totalFinancialDeductions: monthlySummary.totalFinancialDeductions
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🕐 LATENESS SYSTEM COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));
  
  try {
    // Get test company and user
    const company = await prisma.company.findFirst({
      where: { isActive: true }
    });
    
    if (!company) {
      console.error('❌ No active company found. Please create a company first.');
      return;
    }
    
    const user = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        employeeNumber: { not: null }
      }
    });
    
    if (!user) {
      console.error('❌ No active employee found. Please create an employee first.');
      return;
    }
    
    console.log(`\n🏢 Testing with Company: ${company.name}`);
    console.log(`👤 Testing with Employee: ${user.firstName} ${user.lastName} (${user.employeeNumber})`);
    
    // Initialize company rules
    await latenessService.getCompanyRules(company.id);
    console.log('✅ Company rules initialized');
    
    // Run tests
    await testOnTimeCheckIn(company.id, user.id);
    await testGracePeriodLate(company.id, user.id);
    await testDirectViolation(company.id, user.id);
    await testPartialAllowance(company.id, user.id);
    await testZeroAllowance(company.id, user.id);
    await testMonthlyReset(company.id);
    await testMissingAttendance(company.id);
    await testReports(company.id, user.id);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testOnTimeCheckIn,
  testGracePeriodLate,
  testDirectViolation,
  testPartialAllowance,
  testZeroAllowance,
  testMonthlyReset,
  testMissingAttendance,
  testReports,
  runAllTests
};

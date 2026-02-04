# 🕐 Automatic Lateness Deduction System

## Overview

A fully automatic lateness tracking and deduction system with strict business rules and zero manual manager intervention. The system automatically calculates lateness, manages monthly allowances, applies deductions, and generates comprehensive reports.

## Business Rules

### Core Rules

1. **Official Work Start Time**: 10:00 AM
2. **Latest Allowed Check-in**: 10:10 AM
3. **Monthly Lateness Allowance**: 60 minutes per employee
4. **Allowance Reset Day**: 5th of each month (configurable)

### Lateness Categories

#### 1. On Time (≤ 10:00 AM)
- No lateness recorded
- No allowance used
- No deductions applied

#### 2. Grace Period (10:01 - 10:10 AM)
- Lateness minutes calculated from 10:00 AM
- Uses monthly allowance if available
- If allowance insufficient, excess becomes deduction
- If no allowance, all minutes become deduction

#### 3. Direct Violation (> 10:10 AM)
- **IMMEDIATE VIOLATION** - no allowance applies
- Automatic deduction regardless of remaining allowance
- Configurable penalty (financial, time, warning, or combined)

### Allowance Management

- **Initial Allowance**: 60 minutes per month
- **Reset Schedule**: Automatic on 5th of each month at 00:01
- **Usage**: First-come, first-served basis
- **Tracking**: Real-time remaining balance
- **No Carryover**: Unused allowance does not carry to next month

### Deduction Rules

#### When Allowance is Exceeded (10:01-10:10 AM)
- Deduct remaining allowance first
- Excess minutes trigger automatic deduction
- Configurable deduction type per company

#### Direct Violations (After 10:10 AM)
- Bypass allowance system completely
- Immediate automatic deduction
- Higher penalty than allowance-exceeded cases

#### Missing Attendance
- Detected daily at 23:00
- Automatic violation created
- Configurable penalty

### Deduction Types

1. **FINANCIAL**: Monetary deduction from salary
2. **TIME**: Unpaid leave deduction (minutes/hours)
3. **WARNING**: Warning only (escalates with repetition)
4. **COMBINED**: Financial + Time + Warning

## System Architecture

### Database Models

#### 1. LatenessAllowance
Tracks monthly allowance for each employee:
- Total allowance minutes
- Used minutes
- Remaining minutes
- Reset date
- Active status

#### 2. LatenessRecord
Daily lateness tracking:
- Check-in time details
- Lateness calculation
- Category classification
- Allowance usage
- Violation status

#### 3. LatenessDeduction
Deduction and violation logs:
- Deduction type and reason
- Financial/time amounts
- Warning levels
- Payroll integration status
- Approval tracking (for exceptions)

#### 4. LatenessRules
Company-specific configuration:
- Work times
- Allowance settings
- Deduction rules
- Automation flags

#### 5. LatenessMonthlySummary
Monthly aggregated reports:
- Allowance usage
- Lateness statistics
- Deduction totals
- Attendance summary

## Automatic Processes

### 1. Check-in Processing
**Trigger**: Employee checks in via biometric/system
**Process**:
1. Get company rules
2. Get/create monthly allowance
3. Calculate lateness minutes
4. Determine category (ON_TIME, GRACE_PERIOD, DIRECT_VIOLATION)
5. Apply allowance if applicable
6. Create lateness record
7. Apply automatic deductions if configured
8. Update allowance balance

### 2. Monthly Allowance Reset
**Schedule**: 5th of each month at 00:01
**Process**:
1. Deactivate previous month's allowances
2. Create new allowances for all active employees
3. Initialize with configured allowance minutes
4. Log reset activity

### 3. Missing Attendance Detection
**Schedule**: Daily at 23:00
**Process**:
1. Get all active employees
2. Check for missing attendance records
3. Create violation deductions
4. Log violations

### 4. Monthly Summary Generation
**Schedule**: Last day of month at 23:30
**Process**:
1. Aggregate all lateness records
2. Calculate totals and statistics
3. Generate summary report
4. Store for historical tracking

## API Endpoints

### Company Rules
```
GET    /api/v1/lateness/:companyId/rules
PUT    /api/v1/lateness/:companyId/rules
```

### Employee Data
```
GET    /api/v1/lateness/:companyId/employees/:employeeId/allowance
GET    /api/v1/lateness/:companyId/employees/:employeeId/summary
GET    /api/v1/lateness/:companyId/employees/:employeeId/records
GET    /api/v1/lateness/:companyId/employees/:employeeId/deductions
GET    /api/v1/lateness/:companyId/employees/:employeeId/monthly-summary
```

### Company Reports
```
GET    /api/v1/lateness/:companyId/daily-report
GET    /api/v1/lateness/:companyId/monthly-summaries
GET    /api/v1/lateness/:companyId/statistics
```

### Admin Operations
```
POST   /api/v1/lateness/:companyId/reset-allowances
POST   /api/v1/lateness/:companyId/check-missing-attendance
```

## Configuration

### Company Rules Configuration

```javascript
{
  workStartTime: "10:00",              // Official start time
  latestAllowedTime: "10:10",          // Latest allowed check-in
  monthlyAllowanceMinutes: 60,         // Monthly allowance
  allowanceResetDay: 5,                // Reset day (1-28)
  
  // Allowance exceeded deductions (10:01-10:10 after allowance is zero)
  allowanceExceededDeductionType: "FINANCIAL",
  allowanceExceededFinancialAmount: 50.00,
  allowanceExceededTimeMinutes: 30,
  allowanceExceededWarningLevel: 1,
  
  // Direct violation deductions (after 10:10)
  violationDeductionType: "COMBINED",
  violationFinancialAmount: 100.00,
  violationTimeMinutes: 60,
  violationWarningLevel: 2,
  
  // Missing attendance deductions
  missingAttendanceDeductionType: "FINANCIAL",
  missingAttendanceFinancialAmount: 200.00,
  missingAttendanceTimeMinutes: 480,
  
  // Automation settings
  autoApplyDeductions: true,           // Auto-apply deductions
  autoResetAllowances: true,           // Auto-reset monthly
  allowManagerExceptions: false,       // Allow manual exceptions
  requireApprovalForExceptions: true   // Require approval for exceptions
}
```

## Security & Validation

### Attendance Manipulation Prevention

1. **First Check-in Only**: Only the first daily check-in is processed
2. **Method Tracking**: Distinguishes between biometric and manual entries
3. **Manual Edit Restrictions**: Manual attendance edits don't trigger lateness processing
4. **Audit Trail**: All changes logged with timestamps and user IDs

### Manager Permissions

Managers have **READ-ONLY** access to:
- View lateness records
- View deductions
- View reports
- View allowance balances

Managers **CANNOT**:
- Modify lateness records
- Remove deductions
- Adjust allowances
- Override automatic deductions

### Exception Handling

If `allowManagerExceptions` is enabled:
- Managers can request exception approval
- Requires approval from higher authority
- Full audit trail maintained
- Original deduction preserved

## Reports

### Daily Report
- Total employees
- On-time count
- Late within grace count
- Violation count
- Total lateness minutes
- Total allowance used
- Individual records

### Monthly Summary (Per Employee)
- Total allowance minutes
- Used allowance minutes
- Remaining allowance
- Total late days
- Total lateness minutes
- Grace period days
- Violation days
- Total financial deductions
- Total time deductions
- Total warnings
- Attendance summary

### Company Statistics
- Period-based aggregations
- On-time percentage
- Late percentage
- Violation percentage
- Total deductions (financial & time)
- Trend analysis

## Integration with Payroll

Deductions are automatically flagged for payroll integration:

```javascript
{
  isAppliedToPayroll: false,    // Initially false
  appliedToPayrollAt: null,     // Set when applied
  payrollMonth: null,           // Target payroll month
  payrollYear: null             // Target payroll year
}
```

Payroll system should:
1. Query unapplied deductions for payroll period
2. Calculate total deductions per employee
3. Apply to salary calculations
4. Mark deductions as applied
5. Record application timestamp

## Edge Cases Handled

### 1. Partial Allowance Usage
**Scenario**: Employee has 5 minutes allowance, arrives 10 minutes late
**Handling**: 
- Use 5 minutes from allowance
- Apply deduction for remaining 5 minutes
- Record both in lateness record

### 2. Zero Allowance Remaining
**Scenario**: Employee used all allowance, arrives 3 minutes late (10:03 AM)
**Handling**:
- No allowance applied
- All 3 minutes become deduction
- Category: GRACE_PERIOD (not violation as before 10:10)

### 3. Month Transition
**Scenario**: Employee checks in on last day of month
**Handling**:
- Uses current month's allowance
- Next day gets new allowance automatically
- No carryover

### 4. Missing Attendance on Holiday
**Scenario**: No attendance on public holiday
**Handling**:
- System should exclude holidays from missing attendance check
- Requires holiday calendar configuration

### 5. Retroactive Check-ins
**Scenario**: Employee tries to check in for past date
**Handling**:
- System rejects retroactive check-ins
- Only current date allowed for biometric
- Manual entries require admin approval

## Testing

### Manual Testing Endpoints

```bash
# Trigger monthly reset manually
POST /api/v1/lateness/:companyId/reset-allowances

# Check missing attendance for specific date
POST /api/v1/lateness/:companyId/check-missing-attendance
Body: { "date": "2026-01-24" }
```

### Test Scenarios

1. **On-time check-in**: 09:55 AM → No lateness
2. **5 minutes late**: 10:05 AM → Use 5 from allowance
3. **15 minutes late**: 10:15 AM → Direct violation
4. **Partial allowance**: 5 min remaining, 10 min late → Use 5, deduct 5
5. **Zero allowance**: 0 min remaining, 3 min late → Deduct 3
6. **Missing attendance**: No check-in → Violation created at 23:00

## Monitoring & Logging

All operations are logged with:
- Timestamp
- User ID
- Company ID
- Action type
- Result
- Error details (if any)

Log prefixes:
- `🕐 [LATENESS]` - General operations
- `🔄 [LATENESS-SCHEDULER]` - Scheduled tasks
- `✅ [LATENESS]` - Success operations
- `❌ [LATENESS]` - Error operations
- `⚠️ [LATENESS]` - Warning operations

## Migration Guide

### Database Migration

```bash
# Generate Prisma migration
npx prisma migrate dev --name add_lateness_system

# Or push schema changes
npx prisma db push
```

### Server Integration

Add to your main server file:

```javascript
const latenessScheduler = require('./services/hr/latenessScheduler');

// Start scheduler after server starts
latenessScheduler.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  latenessScheduler.stop();
});
```

### Route Integration

Add to your routes configuration:

```javascript
const latenessRoutes = require('./routes/latenessRoutes');
app.use('/api/v1/lateness', latenessRoutes);
```

## Best Practices

1. **Always use biometric/system check-ins** for automatic processing
2. **Configure rules before going live** to match company policy
3. **Test thoroughly** with sample data before production
4. **Monitor logs** for the first month to catch edge cases
5. **Generate monthly reports** for management review
6. **Backup deduction data** before payroll processing
7. **Review exceptions** if enabled, to prevent abuse
8. **Update holiday calendar** to prevent false missing attendance violations

## Troubleshooting

### Allowance not resetting
- Check scheduler is running: `latenessScheduler.start()`
- Verify cron job configuration
- Check server timezone settings
- Manually trigger: `POST /api/v1/lateness/:companyId/reset-allowances`

### Deductions not applying
- Verify `autoApplyDeductions: true` in company rules
- Check lateness record `isProcessed` field
- Review error logs for processing failures
- Ensure company rules are configured

### Missing attendance not detected
- Verify scheduler is running
- Check employee `isActive` status
- Verify `employeeNumber` is set
- Review holiday calendar configuration

## Support

For issues or questions:
1. Check logs for error details
2. Review company rules configuration
3. Verify employee data completeness
4. Test with manual trigger endpoints
5. Contact system administrator if issues persist

# 🕐 Lateness Deduction System - Integration Guide

## Quick Start

### 1. Database Migration

Run the Prisma migration to create all necessary tables:

```bash
cd backend
npx prisma migrate dev --name add_lateness_deduction_system
```

Or if you prefer to push schema directly:

```bash
npx prisma db push
```

This will create the following tables:
- `lateness_allowances` - Monthly allowance tracking
- `lateness_records` - Daily lateness records
- `lateness_deductions` - Deduction and violation logs
- `lateness_rules` - Company-specific configuration
- `lateness_monthly_summaries` - Monthly aggregated reports

### 2. Server Integration

Find your main server file (usually `server.js` or `index.js`) and add:

```javascript
// Add at the top with other imports
const latenessScheduler = require('./services/hr/latenessScheduler');

// After server starts successfully
latenessScheduler.start();
console.log('✅ Lateness automation scheduler started');

// Add graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, stopping lateness scheduler...');
  latenessScheduler.stop();
  // ... rest of your shutdown logic
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, stopping lateness scheduler...');
  latenessScheduler.stop();
  // ... rest of your shutdown logic
});
```

### 3. Route Integration

Add lateness routes to your Express app:

```javascript
// In your main server file or routes configuration
const latenessRoutes = require('./routes/latenessRoutes');

app.use('/api/v1/lateness', latenessRoutes);
```

### 4. Install Required Dependencies

The system uses `node-cron` for scheduling. Install it if not already present:

```bash
npm install node-cron
```

### 5. Initial Configuration

After deployment, configure company rules via API:

```bash
PUT /api/v1/lateness/:companyId/rules
Content-Type: application/json

{
  "workStartTime": "10:00",
  "latestAllowedTime": "10:10",
  "monthlyAllowanceMinutes": 60,
  "allowanceResetDay": 5,
  "allowanceExceededDeductionType": "FINANCIAL",
  "allowanceExceededFinancialAmount": 50.00,
  "violationDeductionType": "COMBINED",
  "violationFinancialAmount": 100.00,
  "violationTimeMinutes": 60,
  "autoApplyDeductions": true,
  "autoResetAllowances": true
}
```

## Testing

### Run Comprehensive Test Suite

```bash
cd backend
node scripts/test_lateness_system.js
```

This will test all scenarios:
- On-time check-in
- Late within grace period
- Direct violations
- Partial allowance usage
- Zero allowance scenarios
- Monthly reset
- Missing attendance detection
- Report generation

### Manual Testing via API

#### Test Check-in Processing

```bash
# Regular check-in (will trigger lateness processing)
POST /api/v1/attendance/:companyId/check-in
{
  "employeeId": "user_id_here",
  "method": "biometric",
  "location": "{\"latitude\": 0, \"longitude\": 0}"
}
```

#### View Employee Allowance

```bash
GET /api/v1/lateness/:companyId/employees/:employeeId/allowance
```

#### View Lateness Records

```bash
GET /api/v1/lateness/:companyId/employees/:employeeId/records?startDate=2026-01-01&endDate=2026-01-31
```

#### View Deductions

```bash
GET /api/v1/lateness/:companyId/employees/:employeeId/deductions
```

#### Trigger Monthly Reset (Admin)

```bash
POST /api/v1/lateness/:companyId/reset-allowances
```

## Scheduled Tasks

The system runs three automatic tasks:

### 1. Monthly Allowance Reset
- **Schedule**: 5th of each month at 00:01
- **Action**: Deactivates old allowances, creates new ones
- **Cron**: `1 0 5 * *`

### 2. Missing Attendance Detection
- **Schedule**: Daily at 23:00
- **Action**: Checks for missing attendance, creates violations
- **Cron**: `0 23 * * *`

### 3. Monthly Summary Generation
- **Schedule**: Last day of month at 23:30
- **Action**: Generates monthly summaries for all employees
- **Cron**: `30 23 28-31 * *`

## Monitoring

### Check Scheduler Status

Add this endpoint to verify scheduler is running:

```javascript
// In your server file
app.get('/api/v1/system/scheduler-status', (req, res) => {
  res.json({
    latenessScheduler: {
      running: latenessScheduler.jobs.length > 0,
      jobCount: latenessScheduler.jobs.length
    }
  });
});
```

### View Logs

All operations are logged with prefixes:
- `🕐 [LATENESS]` - General operations
- `🔄 [LATENESS-SCHEDULER]` - Scheduled tasks
- `✅ [LATENESS]` - Success
- `❌ [LATENESS]` - Errors

Filter logs:
```bash
# View all lateness logs
pm2 logs | grep LATENESS

# View only errors
pm2 logs | grep "❌ \[LATENESS\]"

# View scheduler activity
pm2 logs | grep LATENESS-SCHEDULER
```

## Data Flow

### Check-in Flow

```
Employee checks in (biometric/system)
    ↓
attendanceService.checkIn()
    ↓
Create/update attendance record
    ↓
latenessService.processAttendanceCheckIn()
    ↓
Get company rules
    ↓
Get/create monthly allowance
    ↓
Calculate lateness (minutes, category)
    ↓
Create lateness record
    ↓
Update allowance if used
    ↓
Apply automatic deductions if configured
    ↓
Return attendance record
```

### Deduction Flow

```
Lateness detected
    ↓
Check category:
  - ON_TIME → No action
  - GRACE_PERIOD/ALLOWANCE_USED → Use allowance
  - DIRECT_VIOLATION → Immediate deduction
    ↓
If excess minutes or violation:
    ↓
Create deduction record
    ↓
Apply to employee profile
    ↓
Flag for payroll integration
    ↓
Generate notifications (if configured)
```

## Payroll Integration

### Query Deductions for Payroll Period

```javascript
const prisma = getSharedPrismaClient();

// Get all unapplied deductions for a payroll period
const deductions = await prisma.latenessDeduction.findMany({
  where: {
    companyId: 'company_id',
    isAppliedToPayroll: false,
    violationDate: {
      gte: payrollStartDate,
      lte: payrollEndDate
    }
  },
  include: {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true
      }
    }
  }
});

// Group by employee
const deductionsByEmployee = deductions.reduce((acc, d) => {
  if (!acc[d.userId]) {
    acc[d.userId] = {
      employee: d.user,
      financialTotal: 0,
      timeTotal: 0,
      deductions: []
    };
  }
  
  acc[d.userId].financialTotal += parseFloat(d.financialAmount || 0);
  acc[d.userId].timeTotal += d.timeDeductionMinutes || 0;
  acc[d.userId].deductions.push(d);
  
  return acc;
}, {});

// Apply to payroll and mark as applied
for (const [userId, data] of Object.entries(deductionsByEmployee)) {
  // Apply to your payroll calculation
  await applyToPayroll(userId, data.financialTotal, data.timeTotal);
  
  // Mark deductions as applied
  await prisma.latenessDeduction.updateMany({
    where: {
      id: { in: data.deductions.map(d => d.id) }
    },
    data: {
      isAppliedToPayroll: true,
      appliedToPayrollAt: new Date(),
      payrollMonth: payrollMonth,
      payrollYear: payrollYear
    }
  });
}
```

## Security Considerations

### 1. Prevent Manual Time Manipulation

The system automatically prevents manual editing of check-in times for records with lateness tracking:

```javascript
// This will throw an error
await attendanceService.updateAttendance(companyId, attendanceId, {
  checkIn: new Date() // Error: Cannot edit times with lateness tracking
});
```

### 2. Manager Permissions

Managers can only:
- View lateness records
- View reports
- View allowances

Managers cannot:
- Modify lateness records
- Remove deductions
- Adjust allowances
- Override automatic deductions

### 3. Admin Override (If Enabled)

If `allowManagerExceptions` is enabled in company rules:
- Exceptions require approval
- Full audit trail maintained
- Original deduction preserved

## Troubleshooting

### Issue: Allowances not resetting on 5th

**Check**:
1. Scheduler is running: `latenessScheduler.jobs.length > 0`
2. Server timezone is correct
3. Cron expression is valid

**Solution**:
```bash
# Manually trigger reset
POST /api/v1/lateness/:companyId/reset-allowances
```

### Issue: Deductions not applying

**Check**:
1. Company rules: `autoApplyDeductions: true`
2. Lateness record: `isProcessed: true`
3. Error logs for processing failures

**Solution**:
```javascript
// Check company rules
GET /api/v1/lateness/:companyId/rules

// Verify lateness record
SELECT * FROM lateness_records WHERE id = 'record_id';
```

### Issue: Missing attendance not detected

**Check**:
1. Employee `isActive: true`
2. Employee has `employeeNumber` set
3. Scheduler is running

**Solution**:
```bash
# Manually trigger check
POST /api/v1/lateness/:companyId/check-missing-attendance
Body: { "date": "2026-01-24" }
```

### Issue: Duplicate check-ins

**Prevention**: The attendance service already prevents duplicate check-ins for the same day.

## Performance Optimization

### Database Indexes

The schema includes optimized indexes:
- `latenessAllowance`: userId, year, month, isActive
- `latenessRecord`: companyId, userId, date, category, isViolation
- `latenessDeduction`: companyId, userId, violationDate, isAppliedToPayroll

### Query Optimization

For large datasets, use pagination:

```javascript
GET /api/v1/lateness/:companyId/employees/:employeeId/records?page=1&limit=50
```

### Scheduled Task Optimization

Tasks run during off-peak hours:
- Reset: 00:01 (minimal traffic)
- Missing attendance: 23:00 (end of day)
- Summaries: 23:30 (end of month)

## Backup and Recovery

### Backup Deduction Data

Before payroll processing:

```bash
# Export deductions
pg_dump -t lateness_deductions -t lateness_records > lateness_backup.sql
```

### Restore if Needed

```bash
psql your_database < lateness_backup.sql
```

## Compliance and Audit

### Audit Trail

All operations are logged:
- Who: User ID or 'SYSTEM'
- What: Action performed
- When: Timestamp
- Why: Reason/category
- Result: Success/failure

### Data Retention

Configure retention policy:

```javascript
// Archive old records (e.g., after 2 years)
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

await prisma.latenessRecord.updateMany({
  where: {
    date: { lt: twoYearsAgo }
  },
  data: {
    // Move to archive table or mark as archived
  }
});
```

## Support Checklist

Before going live:

- [ ] Database migration completed
- [ ] Scheduler integrated and running
- [ ] Routes added to server
- [ ] Company rules configured
- [ ] Test suite executed successfully
- [ ] Payroll integration tested
- [ ] Manager permissions verified
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Documentation reviewed with team

## Next Steps

1. **Week 1**: Deploy to staging, run tests
2. **Week 2**: Configure company rules, train managers
3. **Week 3**: Pilot with small group
4. **Week 4**: Full rollout, monitor closely
5. **Month 2**: Review reports, adjust rules if needed

## Getting Help

For issues:
1. Check logs for error details
2. Review company rules configuration
3. Verify employee data completeness
4. Test with manual trigger endpoints
5. Contact system administrator

## API Reference

Full API documentation available at:
`/backend/docs/LATENESS_DEDUCTION_SYSTEM.md`

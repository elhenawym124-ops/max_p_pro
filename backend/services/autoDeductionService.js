const db = require('../config/database');
const moment = require('moment-timezone');

class AutoDeductionService {
  
  /**
   * حساب الخصومات التلقائية عند تسجيل الحضور أو الانصراف
   * Calculate auto deductions on check-in or check-out
   */
  async processAttendanceDeduction(attendanceId, employeeId, companyId) {
    try {
      const connection = await db.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // 1. جلب بيانات الحضور
        const [attendance] = await connection.query(
          `SELECT * FROM attendance WHERE id = ? AND employee_id = ?`,
          [attendanceId, employeeId]
        );
        
        if (!attendance || attendance.length === 0) {
          throw new Error('Attendance record not found');
        }
        
        const attendanceRecord = attendance[0];
        
        // 2. جلب إعدادات الخصومات
        const settings = await this.getDeductionSettings(companyId, connection);
        
        if (!settings || !settings.is_active) {
          await connection.commit();
          return { success: true, message: 'Auto deduction is not active' };
        }
        
        // 3. جلب بيانات الموظف والشيفت
        const employee = await this.getEmployeeWithShift(employeeId, connection);
        
        if (!employee || !employee.shift_start_time) {
          await connection.commit();
          return { success: true, message: 'No shift schedule found' };
        }
        
        const results = {
          lateCheckIn: null,
          earlyCheckOut: null
        };
        
        // 4. معالجة تأخير الحضور
        if (attendanceRecord.check_in) {
          results.lateCheckIn = await this.processLateCheckIn(
            attendanceRecord,
            employee,
            settings,
            connection
          );
        }
        
        // 5. معالجة الانصراف المبكر
        if (attendanceRecord.check_out) {
          results.earlyCheckOut = await this.processEarlyCheckOut(
            attendanceRecord,
            employee,
            settings,
            connection
          );
        }
        
        await connection.commit();
        
        return {
          success: true,
          results
        };
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('Error processing attendance deduction:', error);
      throw error;
    }
  }
  
  /**
   * معالجة تأخير الحضور
   * Process late check-in
   */
  async processLateCheckIn(attendance, employee, settings, connection) {
    const checkInTime = moment(attendance.check_in);
    const scheduledTime = moment(attendance.date + ' ' + employee.shift_start_time);
    
    // حساب دقائق التأخير
    const minutesLate = checkInTime.diff(scheduledTime, 'minutes');
    
    // إذا لم يكن هناك تأخير
    if (minutesLate <= 0) {
      return { hasViolation: false, message: 'On time' };
    }
    
    // إذا كان التأخير ضمن الحد المسموح (10 دقائق)
    if (minutesLate <= settings.late_threshold_minutes) {
      return { 
        hasViolation: false, 
        message: `Late by ${minutesLate} minutes but within threshold`,
        minutesLate 
      };
    }
    
    // التأخير أكثر من الحد المسموح - نحتاج لمعالجة الخصم
    const month = checkInTime.month() + 1;
    const year = checkInTime.year();
    
    // جلب أو إنشاء رصيد التسامح
    const graceBalance = await this.getOrCreateGraceBalance(
      employee.id,
      employee.company_id,
      month,
      year,
      settings,
      connection
    );
    
    // حساب الدقائق الفعلية للخصم (بعد طرح الحد المسموح)
    const deductibleMinutes = minutesLate - settings.late_threshold_minutes;
    
    let isFinancial = false;
    let deductionAmount = 0;
    let usedGraceMinutes = 0;
    
    // التحقق من رصيد التسامح
    if (graceBalance.remaining_grace_minutes > 0) {
      // لا يزال هناك رصيد تسامح
      usedGraceMinutes = Math.min(deductibleMinutes, graceBalance.remaining_grace_minutes);
      
      // تحديث رصيد التسامح
      await this.updateGraceBalance(
        graceBalance.id,
        usedGraceMinutes,
        'late_checkin',
        connection
      );
      
      // إذا استهلكنا كل الرصيد والتأخير أكثر، الباقي يكون خصم مالي
      if (deductibleMinutes > graceBalance.remaining_grace_minutes) {
        isFinancial = true;
        const financialMinutes = deductibleMinutes - graceBalance.remaining_grace_minutes;
        
        // جلب عدد المخالفات لتحديد معامل التصعيد
        const violationCount = await this.getViolationCount(
          employee.id,
          'late_checkin',
          month,
          year,
          connection
        );
        
        const multiplier = this.getMultiplier(violationCount, settings);
        deductionAmount = await this.calculateDeductionAmount(
          employee,
          financialMinutes,
          multiplier,
          settings,
          connection
        );
        
        // تحديث عداد المخالفات
        await this.incrementViolationCount(
          employee.id,
          employee.company_id,
          'late_checkin',
          month,
          year,
          attendance.date,
          minutesLate,
          connection
        );
      }
    } else {
      // نفد رصيد التسامح - خصم مالي مباشر
      isFinancial = true;
      
      const violationCount = await this.getViolationCount(
        employee.id,
        'late_checkin',
        month,
        year,
        connection
      );
      
      const multiplier = this.getMultiplier(violationCount, settings);
      deductionAmount = await this.calculateDeductionAmount(
        employee,
        deductibleMinutes,
        multiplier,
        settings,
        connection
      );
      
      await this.incrementViolationCount(
        employee.id,
        employee.company_id,
        'late_checkin',
        month,
        year,
        attendance.date,
        minutesLate,
        connection
      );
    }
    
    // إنشاء سجل الخصم
    const deduction = await this.createDeduction({
      employee_id: employee.id,
      company_id: employee.company_id,
      attendance_id: attendance.id,
      deduction_type: 'late_checkin',
      minutes_late: minutesLate,
      scheduled_time: employee.shift_start_time,
      actual_time: checkInTime.format('HH:mm:ss'),
      is_financial: isFinancial,
      deduction_amount: deductionAmount,
      violation_count: await this.getViolationCount(employee.id, 'late_checkin', month, year, connection),
      multiplier: isFinancial ? this.getMultiplier(await this.getViolationCount(employee.id, 'late_checkin', month, year, connection), settings) : 1.0,
      deduction_date: attendance.date,
      status: 'applied'
    }, connection);
    
    // إرسال إشعار للموظف
    await this.sendDeductionNotification(
      employee.id,
      employee.company_id,
      deduction.id,
      'late_checkin',
      minutesLate,
      isFinancial,
      deductionAmount,
      graceBalance.remaining_grace_minutes - usedGraceMinutes,
      connection
    );
    
    // التحقق من الحاجة لإرسال تحذير رصيد التسامح
    await this.checkGraceBalanceWarning(
      employee.id,
      employee.company_id,
      graceBalance.id,
      settings,
      connection
    );
    
    return {
      hasViolation: true,
      deductionId: deduction.id,
      minutesLate,
      isFinancial,
      deductionAmount,
      usedGraceMinutes,
      remainingGraceMinutes: graceBalance.remaining_grace_minutes - usedGraceMinutes
    };
  }
  
  /**
   * معالجة الانصراف المبكر
   * Process early check-out
   */
  async processEarlyCheckOut(attendance, employee, settings, connection) {
    if (!settings.early_checkout_enabled) {
      return { hasViolation: false, message: 'Early checkout deduction is disabled' };
    }
    
    const checkOutTime = moment(attendance.check_out);
    const scheduledTime = moment(attendance.date + ' ' + employee.shift_end_time);
    
    // حساب دقائق الانصراف المبكر
    const minutesEarly = scheduledTime.diff(checkOutTime, 'minutes');
    
    // إذا لم يكن هناك انصراف مبكر
    if (minutesEarly <= settings.early_checkout_threshold_minutes) {
      return { hasViolation: false, message: 'On time or after scheduled time' };
    }
    
    // انصراف مبكر - خصم مالي فوري
    const month = checkOutTime.month() + 1;
    const year = checkOutTime.year();
    
    const violationCount = await this.getViolationCount(
      employee.id,
      'early_checkout',
      month,
      year,
      connection
    );
    
    const multiplier = this.getMultiplier(violationCount, settings);
    const deductionAmount = await this.calculateDeductionAmount(
      employee,
      minutesEarly,
      multiplier,
      settings,
      connection
    );
    
    // تحديث عداد المخالفات
    await this.incrementViolationCount(
      employee.id,
      employee.company_id,
      'early_checkout',
      month,
      year,
      attendance.date,
      minutesEarly,
      connection
    );
    
    // إنشاء سجل الخصم
    const deduction = await this.createDeduction({
      employee_id: employee.id,
      company_id: employee.company_id,
      attendance_id: attendance.id,
      deduction_type: 'early_checkout',
      minutes_late: minutesEarly,
      scheduled_time: employee.shift_end_time,
      actual_time: checkOutTime.format('HH:mm:ss'),
      is_financial: true,
      deduction_amount: deductionAmount,
      violation_count: violationCount + 1,
      multiplier: multiplier,
      deduction_date: attendance.date,
      status: 'applied'
    }, connection);
    
    // إرسال إشعار للموظف
    await this.sendDeductionNotification(
      employee.id,
      employee.company_id,
      deduction.id,
      'early_checkout',
      minutesEarly,
      true,
      deductionAmount,
      null,
      connection
    );
    
    return {
      hasViolation: true,
      deductionId: deduction.id,
      minutesEarly,
      isFinancial: true,
      deductionAmount,
      violationCount: violationCount + 1
    };
  }
  
  /**
   * حساب قيمة الخصم المالي
   * Calculate deduction amount
   */
  async calculateDeductionAmount(employee, minutes, multiplier, settings, connection) {
    let ratePerMinute;
    
    if (settings.deduction_rate_per_minute) {
      // استخدام القيمة المحددة في الإعدادات
      ratePerMinute = settings.deduction_rate_per_minute;
    } else {
      // حساب تلقائي من راتب الموظف
      const salary = employee.salary || 0;
      const workingDaysPerMonth = 22; // افتراضي
      const workingHoursPerDay = 8; // افتراضي
      
      const dailySalary = salary / workingDaysPerMonth;
      const hourlySalary = dailySalary / workingHoursPerDay;
      ratePerMinute = hourlySalary / 60;
    }
    
    const baseAmount = ratePerMinute * minutes;
    const finalAmount = baseAmount * multiplier;
    
    return Math.round(finalAmount * 100) / 100; // تzaround to 2 decimal places
  }
  
  /**
   * تحديد معامل التصعيد بناءً على عدد المخالفات
   * Get escalation multiplier based on violation count
   */
  getMultiplier(violationCount, settings) {
    if (violationCount === 0) {
      return settings.first_violation_multiplier;
    } else if (violationCount === 1) {
      return settings.second_violation_multiplier;
    } else {
      return settings.third_violation_multiplier;
    }
  }
  
  /**
   * جلب أو إنشاء رصيد التسامح الشهري
   * Get or create monthly grace balance
   */
  async getOrCreateGraceBalance(employeeId, companyId, month, year, settings, connection) {
    const [existing] = await connection.query(
      `SELECT * FROM employee_grace_balance 
       WHERE employee_id = ? AND month = ? AND year = ?`,
      [employeeId, month, year]
    );
    
    if (existing && existing.length > 0) {
      return existing[0];
    }
    
    // إنشاء رصيد جديد
    const [result] = await connection.query(
      `INSERT INTO employee_grace_balance 
       (employee_id, company_id, month, year, total_grace_minutes, used_grace_minutes, remaining_grace_minutes)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [employeeId, companyId, month, year, settings.grace_period_minutes, settings.grace_period_minutes]
    );
    
    return {
      id: result.insertId,
      employee_id: employeeId,
      company_id: companyId,
      month,
      year,
      total_grace_minutes: settings.grace_period_minutes,
      used_grace_minutes: 0,
      remaining_grace_minutes: settings.grace_period_minutes
    };
  }
  
  /**
   * تحديث رصيد التسامح
   * Update grace balance
   */
  async updateGraceBalance(balanceId, usedMinutes, type, connection) {
    await connection.query(
      `UPDATE employee_grace_balance 
       SET used_grace_minutes = used_grace_minutes + ?,
           remaining_grace_minutes = remaining_grace_minutes - ?,
           ${type === 'late_checkin' ? 'late_count = late_count + 1' : 'early_checkout_count = early_checkout_count + 1'}
       WHERE id = ?`,
      [usedMinutes, usedMinutes, balanceId]
    );
  }
  
  /**
   * جلب عدد المخالفات في الشهر الحالي
   * Get violation count for current month
   */
  async getViolationCount(employeeId, violationType, month, year, connection) {
    const [result] = await connection.query(
      `SELECT violation_count FROM violation_history
       WHERE employee_id = ? AND violation_type = ? AND month = ? AND year = ?`,
      [employeeId, violationType, month, year]
    );
    
    return result && result.length > 0 ? result[0].violation_count : 0;
  }
  
  /**
   * زيادة عداد المخالفات
   * Increment violation count
   */
  async incrementViolationCount(employeeId, companyId, violationType, month, year, date, minutes, connection) {
    await connection.query(
      `INSERT INTO violation_history 
       (employee_id, company_id, violation_type, month, year, violation_count, last_violation_date, last_violation_minutes)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE 
       violation_count = violation_count + 1,
       last_violation_date = ?,
       last_violation_minutes = ?`,
      [employeeId, companyId, violationType, month, year, date, minutes, date, minutes]
    );
  }
  
  /**
   * إنشاء سجل خصم
   * Create deduction record
   */
  async createDeduction(data, connection) {
    const [result] = await connection.query(
      `INSERT INTO auto_deductions 
       (employee_id, company_id, attendance_id, deduction_type, minutes_late, 
        scheduled_time, actual_time, is_financial, deduction_amount, 
        violation_count, multiplier, deduction_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.employee_id, data.company_id, data.attendance_id, data.deduction_type,
        data.minutes_late, data.scheduled_time, data.actual_time, data.is_financial,
        data.deduction_amount, data.violation_count, data.multiplier,
        data.deduction_date, data.status
      ]
    );
    
    // تحديث إجمالي الخصومات في رصيد التسامح
    if (data.is_financial && data.deduction_amount > 0) {
      await connection.query(
        `UPDATE employee_grace_balance 
         SET total_deduction_amount = total_deduction_amount + ?
         WHERE employee_id = ? AND month = MONTH(?) AND year = YEAR(?)`,
        [data.deduction_amount, data.employee_id, data.deduction_date, data.deduction_date]
      );
    }
    
    return { id: result.insertId, ...data };
  }
  
  /**
   * إرسال إشعار للموظف
   * Send notification to employee
   */
  async sendDeductionNotification(employeeId, companyId, deductionId, type, minutes, isFinancial, amount, remainingGrace, connection) {
    const typeArabic = type === 'late_checkin' ? 'تأخير في الحضور' : 'انصراف مبكر';
    
    let title, message;
    
    if (isFinancial) {
      title = `خصم مالي - ${typeArabic}`;
      message = `تم خصم ${amount.toFixed(2)} جنيه بسبب ${typeArabic} لمدة ${minutes} دقيقة`;
    } else {
      title = `تحذير - ${typeArabic}`;
      message = `تم تسجيل ${typeArabic} لمدة ${minutes} دقيقة. الرصيد المتبقي: ${remainingGrace} دقيقة`;
    }
    
    await connection.query(
      `INSERT INTO deduction_notifications 
       (employee_id, company_id, notification_type, title, message, 
        remaining_grace_minutes, deduction_amount, auto_deduction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId, companyId, 
        isFinancial ? 'deduction_applied' : 'grace_warning',
        title, message, remainingGrace, amount, deductionId
      ]
    );
  }
  
  /**
   * التحقق من الحاجة لإرسال تحذير رصيد التسامح
   * Check if grace balance warning is needed
   */
  async checkGraceBalanceWarning(employeeId, companyId, balanceId, settings, connection) {
    const [balance] = await connection.query(
      `SELECT * FROM employee_grace_balance WHERE id = ?`,
      [balanceId]
    );
    
    if (!balance || balance.length === 0) return;
    
    const balanceData = balance[0];
    const usagePercentage = (balanceData.used_grace_minutes / balanceData.total_grace_minutes) * 100;
    
    if (usagePercentage >= settings.notify_at_percentage) {
      // التحقق من عدم إرسال نفس الإشعار مسبقاً
      const [existing] = await connection.query(
        `SELECT id FROM deduction_notifications
         WHERE employee_id = ? AND notification_type = 'grace_warning'
         AND MONTH(created_at) = ? AND YEAR(created_at) = ?
         LIMIT 1`,
        [employeeId, balanceData.month, balanceData.year]
      );
      
      if (!existing || existing.length === 0) {
        await connection.query(
          `INSERT INTO deduction_notifications 
           (employee_id, company_id, notification_type, title, message, remaining_grace_minutes)
           VALUES (?, ?, 'grace_warning', ?, ?, ?)`,
          [
            employeeId, companyId,
            'تحذير: رصيد التسامح ينفد',
            `لقد استهلكت ${usagePercentage.toFixed(0)}% من رصيد التسامح. المتبقي: ${balanceData.remaining_grace_minutes} دقيقة`,
            balanceData.remaining_grace_minutes
          ]
        );
      }
    }
    
    // إشعار نفاد الرصيد
    if (balanceData.remaining_grace_minutes === 0) {
      const [existing] = await connection.query(
        `SELECT id FROM deduction_notifications
         WHERE employee_id = ? AND notification_type = 'grace_depleted'
         AND MONTH(created_at) = ? AND YEAR(created_at) = ?
         LIMIT 1`,
        [employeeId, balanceData.month, balanceData.year]
      );
      
      if (!existing || existing.length === 0) {
        await connection.query(
          `INSERT INTO deduction_notifications 
           (employee_id, company_id, notification_type, title, message, remaining_grace_minutes)
           VALUES (?, ?, 'grace_depleted', ?, ?, 0)`,
          [
            employeeId, companyId,
            'نفد رصيد التسامح',
            'لقد نفد رصيد التسامح الشهري. أي تأخير أو انصراف مبكر سيؤدي إلى خصم مالي مباشر'
          ]
        );
      }
    }
  }
  
  /**
   * جلب إعدادات الخصومات
   * Get deduction settings
   */
  async getDeductionSettings(companyId, connection) {
    const [settings] = await connection.query(
      `SELECT * FROM attendance_deduction_settings WHERE company_id = ? AND is_active = TRUE`,
      [companyId]
    );
    
    return settings && settings.length > 0 ? settings[0] : null;
  }
  
  /**
   * جلب بيانات الموظف مع الشيفت
   * Get employee with shift data
   */
  async getEmployeeWithShift(employeeId, connection) {
    const [employee] = await connection.query(
      `SELECT e.*, s.start_time as shift_start_time, s.end_time as shift_end_time
       FROM employees e
       LEFT JOIN shifts s ON e.shift_id = s.id
       WHERE e.id = ?`,
      [employeeId]
    );
    
    return employee && employee.length > 0 ? employee[0] : null;
  }
  
  /**
   * إلغاء خصم (للظروف الطارئة)
   * Cancel a deduction (for emergency cases)
   */
  async cancelDeduction(deductionId, cancelledBy, reason) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // جلب بيانات الخصم
      const [deduction] = await connection.query(
        `SELECT * FROM auto_deductions WHERE id = ?`,
        [deductionId]
      );
      
      if (!deduction || deduction.length === 0) {
        throw new Error('Deduction not found');
      }
      
      const deductionData = deduction[0];
      
      // إلغاء الخصم
      await connection.query(
        `UPDATE auto_deductions 
         SET status = 'cancelled', cancelled_by = ?, cancellation_reason = ?, cancelled_at = NOW()
         WHERE id = ?`,
        [cancelledBy, reason, deductionId]
      );
      
      // إعادة الخصم المالي إلى رصيد التسامح إذا كان مالياً
      if (deductionData.is_financial && deductionData.deduction_amount > 0) {
        await connection.query(
          `UPDATE employee_grace_balance 
           SET total_deduction_amount = total_deduction_amount - ?
           WHERE employee_id = ? AND month = MONTH(?) AND year = YEAR(?)`,
          [deductionData.deduction_amount, deductionData.employee_id, deductionData.deduction_date, deductionData.deduction_date]
        );
      }
      
      // إرسال إشعار للموظف
      await connection.query(
        `INSERT INTO deduction_notifications 
         (employee_id, company_id, notification_type, title, message, auto_deduction_id)
         VALUES (?, ?, 'deduction_applied', ?, ?, ?)`,
        [
          deductionData.employee_id,
          deductionData.company_id,
          'تم إلغاء الخصم',
          `تم إلغاء الخصم بسبب: ${reason}`,
          deductionId
        ]
      );
      
      await connection.commit();
      
      return { success: true, message: 'Deduction cancelled successfully' };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * جلب تقرير الخصومات الشهرية للموظف
   * Get monthly deductions report for employee
   */
  async getEmployeeMonthlyReport(employeeId, month, year) {
    const [report] = await db.query(
      `SELECT * FROM v_employee_monthly_deductions
       WHERE employee_id = ? AND month = ? AND year = ?`,
      [employeeId, month, year]
    );
    
    return report && report.length > 0 ? report[0] : null;
  }
  
  /**
   * جلب الموظفين الذين اقتربوا من نفاد رصيد التسامح
   * Get employees with low grace balance
   */
  async getGraceBalanceAlerts(companyId) {
    const [alerts] = await db.query(
      `SELECT * FROM v_grace_balance_alerts WHERE company_id = ?`,
      [companyId]
    );
    
    return alerts || [];
  }
}

module.exports = new AutoDeductionService();

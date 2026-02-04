const autoDeductionService = require('../../services/autoDeductionService');
const db = require('../../config/database');

/**
 * Auto Deduction Controller
 * التحكم في الخصومات التلقائية
 */

class AutoDeductionController {
  
  /**
   * جلب إعدادات الخصومات التلقائية للشركة
   * GET /api/hr/auto-deductions/settings
   */
  async getSettings(req, res) {
    try {
      const { companyId } = req.user;
      
      const [settings] = await db.query(
        `SELECT * FROM attendance_deduction_settings WHERE company_id = ?`,
        [companyId]
      );
      
      if (!settings || settings.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على إعدادات الخصومات'
        });
      }
      
      res.json({
        success: true,
        data: settings[0]
      });
      
    } catch (error) {
      console.error('Error getting deduction settings:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب الإعدادات',
        error: error.message
      });
    }
  }
  
  /**
   * تحديث إعدادات الخصومات التلقائية
   * PUT /api/hr/auto-deductions/settings
   */
  async updateSettings(req, res) {
    try {
      const { companyId } = req.user;
      const {
        grace_period_minutes,
        late_threshold_minutes,
        early_checkout_enabled,
        early_checkout_threshold_minutes,
        deduction_rate_per_minute,
        first_violation_multiplier,
        second_violation_multiplier,
        third_violation_multiplier,
        notify_at_percentage,
        notify_on_deduction,
        is_active,
        reset_grace_period_monthly
      } = req.body;
      
      // التحقق من وجود الإعدادات
      const [existing] = await db.query(
        `SELECT id FROM attendance_deduction_settings WHERE company_id = ?`,
        [companyId]
      );
      
      if (!existing || existing.length === 0) {
        // إنشاء إعدادات جديدة
        await db.query(
          `INSERT INTO attendance_deduction_settings 
           (company_id, grace_period_minutes, late_threshold_minutes, 
            early_checkout_enabled, early_checkout_threshold_minutes,
            deduction_rate_per_minute, first_violation_multiplier,
            second_violation_multiplier, third_violation_multiplier,
            notify_at_percentage, notify_on_deduction, is_active,
            reset_grace_period_monthly)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            companyId, grace_period_minutes, late_threshold_minutes,
            early_checkout_enabled, early_checkout_threshold_minutes,
            deduction_rate_per_minute, first_violation_multiplier,
            second_violation_multiplier, third_violation_multiplier,
            notify_at_percentage, notify_on_deduction, is_active,
            reset_grace_period_monthly
          ]
        );
      } else {
        // تحديث الإعدادات الموجودة
        await db.query(
          `UPDATE attendance_deduction_settings 
           SET grace_period_minutes = ?,
               late_threshold_minutes = ?,
               early_checkout_enabled = ?,
               early_checkout_threshold_minutes = ?,
               deduction_rate_per_minute = ?,
               first_violation_multiplier = ?,
               second_violation_multiplier = ?,
               third_violation_multiplier = ?,
               notify_at_percentage = ?,
               notify_on_deduction = ?,
               is_active = ?,
               reset_grace_period_monthly = ?
           WHERE company_id = ?`,
          [
            grace_period_minutes, late_threshold_minutes,
            early_checkout_enabled, early_checkout_threshold_minutes,
            deduction_rate_per_minute, first_violation_multiplier,
            second_violation_multiplier, third_violation_multiplier,
            notify_at_percentage, notify_on_deduction, is_active,
            reset_grace_period_monthly, companyId
          ]
        );
      }
      
      // جلب الإعدادات المحدثة
      const [updated] = await db.query(
        `SELECT * FROM attendance_deduction_settings WHERE company_id = ?`,
        [companyId]
      );
      
      res.json({
        success: true,
        message: 'تم تحديث الإعدادات بنجاح',
        data: updated[0]
      });
      
    } catch (error) {
      console.error('Error updating deduction settings:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحديث الإعدادات',
        error: error.message
      });
    }
  }
  
  /**
   * جلب رصيد التسامح للموظف
   * GET /api/hr/auto-deductions/grace-balance/:employeeId
   */
  async getGraceBalance(req, res) {
    try {
      const { companyId } = req.user;
      const { employeeId } = req.params;
      const { month, year } = req.query;
      
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();
      
      const [balance] = await db.query(
        `SELECT * FROM employee_grace_balance 
         WHERE employee_id = ? AND company_id = ? AND month = ? AND year = ?`,
        [employeeId, companyId, currentMonth, currentYear]
      );
      
      if (!balance || balance.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'لا يوجد رصيد تسامح لهذا الشهر'
        });
      }
      
      res.json({
        success: true,
        data: balance[0]
      });
      
    } catch (error) {
      console.error('Error getting grace balance:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب رصيد التسامح',
        error: error.message
      });
    }
  }
  
  /**
   * جلب الخصومات التلقائية
   * GET /api/hr/auto-deductions
   */
  async getDeductions(req, res) {
    try {
      const { companyId } = req.user;
      const {
        employeeId,
        startDate,
        endDate,
        deductionType,
        status,
        isFinancial,
        page = 1,
        limit = 50
      } = req.query;
      
      let query = `
        SELECT ad.*, 
               e.name as employee_name,
               u.firstName, u.lastName,
               a.date as attendance_date
        FROM auto_deductions ad
        JOIN employees e ON ad.employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN attendance a ON ad.attendance_id = a.id
        WHERE ad.company_id = ?
      `;
      
      const params = [companyId];
      
      if (employeeId) {
        query += ` AND ad.employee_id = ?`;
        params.push(employeeId);
      }
      
      if (startDate) {
        query += ` AND ad.deduction_date >= ?`;
        params.push(startDate);
      }
      
      if (endDate) {
        query += ` AND ad.deduction_date <= ?`;
        params.push(endDate);
      }
      
      if (deductionType) {
        query += ` AND ad.deduction_type = ?`;
        params.push(deductionType);
      }
      
      if (status) {
        query += ` AND ad.status = ?`;
        params.push(status);
      }
      
      if (isFinancial !== undefined) {
        query += ` AND ad.is_financial = ?`;
        params.push(isFinancial === 'true' || isFinancial === true ? 1 : 0);
      }
      
      query += ` ORDER BY ad.created_at DESC`;
      
      // حساب الإجمالي
      const countQuery = query.replace(/SELECT ad\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.query(countQuery, params);
      const total = countResult[0].total;
      
      // إضافة pagination
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
      
      const [deductions] = await db.query(query, params);
      
      res.json({
        success: true,
        data: deductions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      console.error('Error getting deductions:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب الخصومات',
        error: error.message
      });
    }
  }
  
  /**
   * جلب تفاصيل خصم معين
   * GET /api/hr/auto-deductions/:id
   */
  async getDeductionById(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      
      const [deduction] = await db.query(
        `SELECT ad.*, 
                e.name as employee_name,
                e.salary,
                u.firstName, u.lastName,
                a.date as attendance_date,
                a.check_in, a.check_out,
                cb.firstName as cancelled_by_name
         FROM auto_deductions ad
         JOIN employees e ON ad.employee_id = e.id
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN attendance a ON ad.attendance_id = a.id
         LEFT JOIN users cb ON ad.cancelled_by = cb.id
         WHERE ad.id = ? AND ad.company_id = ?`,
        [id, companyId]
      );
      
      if (!deduction || deduction.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على الخصم'
        });
      }
      
      res.json({
        success: true,
        data: deduction[0]
      });
      
    } catch (error) {
      console.error('Error getting deduction:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب تفاصيل الخصم',
        error: error.message
      });
    }
  }
  
  /**
   * إلغاء خصم (للظروف الطارئة)
   * POST /api/hr/auto-deductions/:id/cancel
   */
  async cancelDeduction(req, res) {
    try {
      const { companyId, userId } = req.user;
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'يجب إدخال سبب الإلغاء'
        });
      }
      
      const result = await autoDeductionService.cancelDeduction(id, userId, reason);
      
      res.json({
        success: true,
        message: 'تم إلغاء الخصم بنجاح',
        data: result
      });
      
    } catch (error) {
      console.error('Error cancelling deduction:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إلغاء الخصم',
        error: error.message
      });
    }
  }
  
  /**
   * جلب تقرير الخصومات الشهرية للموظف
   * GET /api/hr/auto-deductions/report/:employeeId
   */
  async getEmployeeReport(req, res) {
    try {
      const { companyId } = req.user;
      const { employeeId } = req.params;
      const { month, year } = req.query;
      
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();
      
      const report = await autoDeductionService.getEmployeeMonthlyReport(
        employeeId,
        currentMonth,
        currentYear
      );
      
      res.json({
        success: true,
        data: report
      });
      
    } catch (error) {
      console.error('Error getting employee report:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب التقرير',
        error: error.message
      });
    }
  }
  
  /**
   * جلب تنبيهات رصيد التسامح
   * GET /api/hr/auto-deductions/alerts
   */
  async getGraceBalanceAlerts(req, res) {
    try {
      const { companyId } = req.user;
      
      const alerts = await autoDeductionService.getGraceBalanceAlerts(companyId);
      
      res.json({
        success: true,
        data: alerts
      });
      
    } catch (error) {
      console.error('Error getting grace balance alerts:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب التنبيهات',
        error: error.message
      });
    }
  }
  
  /**
   * جلب إشعارات الخصومات للموظف
   * GET /api/hr/auto-deductions/notifications
   */
  async getNotifications(req, res) {
    try {
      const { companyId, userId } = req.user;
      const { isRead, limit = 20 } = req.query;
      
      // جلب employee_id من user_id
      const [employee] = await db.query(
        `SELECT id FROM employees WHERE user_id = ? AND company_id = ?`,
        [userId, companyId]
      );
      
      if (!employee || employee.length === 0) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      const employeeId = employee[0].id;
      
      let query = `
        SELECT * FROM deduction_notifications
        WHERE employee_id = ? AND company_id = ?
      `;
      const params = [employeeId, companyId];
      
      if (isRead !== undefined) {
        query += ` AND is_read = ?`;
        params.push(isRead === 'true' || isRead === true ? 1 : 0);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(parseInt(limit));
      
      const [notifications] = await db.query(query, params);
      
      res.json({
        success: true,
        data: notifications
      });
      
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب الإشعارات',
        error: error.message
      });
    }
  }
  
  /**
   * تحديد إشعار كمقروء
   * PUT /api/hr/auto-deductions/notifications/:id/read
   */
  async markNotificationAsRead(req, res) {
    try {
      const { id } = req.params;
      
      await db.query(
        `UPDATE deduction_notifications 
         SET is_read = TRUE, read_at = NOW()
         WHERE id = ?`,
        [id]
      );
      
      res.json({
        success: true,
        message: 'تم تحديث الإشعار'
      });
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحديث الإشعار',
        error: error.message
      });
    }
  }
  
  /**
   * جلب إحصائيات الخصومات للشركة
   * GET /api/hr/auto-deductions/stats
   */
  async getCompanyStats(req, res) {
    try {
      const { companyId } = req.user;
      const { month, year } = req.query;
      
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();
      
      // إجمالي الخصومات
      const [totalDeductions] = await db.query(
        `SELECT 
           COUNT(*) as total_count,
           SUM(CASE WHEN is_financial = TRUE THEN deduction_amount ELSE 0 END) as total_amount,
           COUNT(CASE WHEN deduction_type = 'late_checkin' THEN 1 END) as late_count,
           COUNT(CASE WHEN deduction_type = 'early_checkout' THEN 1 END) as early_checkout_count,
           COUNT(CASE WHEN is_financial = FALSE THEN 1 END) as warning_count,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
         FROM auto_deductions
         WHERE company_id = ? 
         AND MONTH(deduction_date) = ? 
         AND YEAR(deduction_date) = ?`,
        [companyId, currentMonth, currentYear]
      );
      
      // الموظفون الأكثر خصومات
      const [topEmployees] = await db.query(
        `SELECT 
           e.id, e.name,
           COUNT(*) as deduction_count,
           SUM(CASE WHEN ad.is_financial = TRUE THEN ad.deduction_amount ELSE 0 END) as total_amount
         FROM auto_deductions ad
         JOIN employees e ON ad.employee_id = e.id
         WHERE ad.company_id = ? 
         AND MONTH(ad.deduction_date) = ? 
         AND YEAR(ad.deduction_date) = ?
         AND ad.status != 'cancelled'
         GROUP BY e.id
         ORDER BY deduction_count DESC
         LIMIT 10`,
        [companyId, currentMonth, currentYear]
      );
      
      // رصيد التسامح
      const [graceStats] = await db.query(
        `SELECT 
           COUNT(*) as total_employees,
           AVG(remaining_grace_minutes) as avg_remaining,
           COUNT(CASE WHEN remaining_grace_minutes = 0 THEN 1 END) as depleted_count,
           COUNT(CASE WHEN remaining_grace_minutes < total_grace_minutes * 0.25 THEN 1 END) as low_balance_count
         FROM employee_grace_balance
         WHERE company_id = ? AND month = ? AND year = ?`,
        [companyId, currentMonth, currentYear]
      );
      
      res.json({
        success: true,
        data: {
          deductions: totalDeductions[0],
          topEmployees,
          graceBalance: graceStats[0]
        }
      });
      
    } catch (error) {
      console.error('Error getting company stats:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب الإحصائيات',
        error: error.message
      });
    }
  }
}

module.exports = new AutoDeductionController();

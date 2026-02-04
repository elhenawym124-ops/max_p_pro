-- ===================================================================
-- نظام الخصومات التلقائية للحضور والانصراف
-- Auto Deduction System for Attendance
-- ===================================================================

-- 1. جدول إعدادات الخصومات التلقائية
-- Attendance Deduction Settings Table
CREATE TABLE IF NOT EXISTS attendance_deduction_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    
    -- إعدادات التأخير (Late Check-in Settings)
    grace_period_minutes INT DEFAULT 60 COMMENT 'إجمالي دقائق التسامح الشهرية',
    late_threshold_minutes INT DEFAULT 10 COMMENT 'عدد الدقائق المسموح بها قبل بدء الخصم',
    
    -- إعدادات الانصراف المبكر (Early Check-out Settings)
    early_checkout_enabled BOOLEAN DEFAULT TRUE COMMENT 'تفعيل خصم الانصراف المبكر',
    early_checkout_threshold_minutes INT DEFAULT 0 COMMENT 'الحد الأدنى للانصراف المبكر (0 = أي دقيقة)',
    
    -- إعدادات الخصم المالي (Financial Deduction Settings)
    deduction_rate_per_minute DECIMAL(10,2) DEFAULT NULL COMMENT 'قيمة الخصم لكل دقيقة (NULL = حساب تلقائي من الراتب)',
    
    -- نظام التصعيد (Escalation System)
    first_violation_multiplier DECIMAL(5,2) DEFAULT 1.0 COMMENT 'معامل الخصم للمخالفة الأولى',
    second_violation_multiplier DECIMAL(5,2) DEFAULT 2.0 COMMENT 'معامل الخصم للمخالفة الثانية',
    third_violation_multiplier DECIMAL(5,2) DEFAULT 3.0 COMMENT 'معامل الخصم للمخالفة الثالثة والأكثر',
    
    -- إعدادات الإشعارات (Notification Settings)
    notify_at_percentage INT DEFAULT 75 COMMENT 'إرسال إشعار عند استهلاك نسبة من رصيد التسامح',
    notify_on_deduction BOOLEAN DEFAULT TRUE COMMENT 'إرسال إشعار عند كل خصم',
    
    -- إعدادات عامة
    is_active BOOLEAN DEFAULT TRUE,
    reset_grace_period_monthly BOOLEAN DEFAULT TRUE COMMENT 'إعادة تعيين رصيد التسامح شهرياً',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_settings (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول رصيد التسامح الشهري للموظفين
-- Employee Monthly Grace Period Balance
CREATE TABLE IF NOT EXISTS employee_grace_balance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    
    -- الفترة الزمنية
    month INT NOT NULL COMMENT 'الشهر (1-12)',
    year INT NOT NULL COMMENT 'السنة',
    
    -- رصيد التسامح
    total_grace_minutes INT DEFAULT 60 COMMENT 'إجمالي دقائق التسامح المتاحة',
    used_grace_minutes INT DEFAULT 0 COMMENT 'دقائق التسامح المستخدمة',
    remaining_grace_minutes INT DEFAULT 60 COMMENT 'دقائق التسامح المتبقية',
    
    -- إحصائيات
    late_count INT DEFAULT 0 COMMENT 'عدد مرات التأخير',
    early_checkout_count INT DEFAULT 0 COMMENT 'عدد مرات الانصراف المبكر',
    total_deduction_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'إجمالي الخصومات المالية',
    
    -- تواريخ
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_month (employee_id, month, year),
    INDEX idx_company_month (company_id, month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول الخصومات التلقائية
-- Auto Deductions Table
CREATE TABLE IF NOT EXISTS auto_deductions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    attendance_id INT NOT NULL,
    
    -- نوع الخصم
    deduction_type ENUM('late_checkin', 'early_checkout') NOT NULL COMMENT 'نوع الخصم',
    
    -- تفاصيل الخصم
    minutes_late INT NOT NULL COMMENT 'عدد الدقائق (تأخير أو انصراف مبكر)',
    scheduled_time TIME NOT NULL COMMENT 'الوقت المحدد',
    actual_time TIME NOT NULL COMMENT 'الوقت الفعلي',
    
    -- الخصم المالي
    is_financial BOOLEAN DEFAULT FALSE COMMENT 'هل الخصم مالي أم تحذيري',
    deduction_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'قيمة الخصم المالي',
    violation_count INT DEFAULT 1 COMMENT 'رقم المخالفة (1، 2، 3+)',
    multiplier DECIMAL(5,2) DEFAULT 1.0 COMMENT 'معامل التصعيد المطبق',
    
    -- حالة الخصم
    status ENUM('pending', 'applied', 'cancelled', 'waived') DEFAULT 'pending' COMMENT 'حالة الخصم',
    
    -- إلغاء الخصم (للظروف الطارئة)
    cancelled_by INT DEFAULT NULL COMMENT 'المستخدم الذي ألغى الخصم',
    cancellation_reason TEXT DEFAULT NULL COMMENT 'سبب الإلغاء',
    cancelled_at TIMESTAMP NULL DEFAULT NULL,
    
    -- ملاحظات
    notes TEXT DEFAULT NULL,
    
    -- تواريخ
    deduction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_employee_date (employee_id, deduction_date),
    INDEX idx_company_date (company_id, deduction_date),
    INDEX idx_status (status),
    INDEX idx_type (deduction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول إشعارات الخصومات
-- Deduction Notifications Table
CREATE TABLE IF NOT EXISTS deduction_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    
    -- نوع الإشعار
    notification_type ENUM('grace_warning', 'deduction_applied', 'grace_depleted', 'monthly_reset') NOT NULL,
    
    -- محتوى الإشعار
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- بيانات إضافية
    remaining_grace_minutes INT DEFAULT NULL,
    deduction_amount DECIMAL(10,2) DEFAULT NULL,
    auto_deduction_id INT DEFAULT NULL,
    
    -- حالة الإشعار
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (auto_deduction_id) REFERENCES auto_deductions(id) ON DELETE CASCADE,
    
    INDEX idx_employee_unread (employee_id, is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. جدول سجل التصعيد (لتتبع المخالفات المتكررة)
-- Violation History Table
CREATE TABLE IF NOT EXISTS violation_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    
    -- نوع المخالفة
    violation_type ENUM('late_checkin', 'early_checkout') NOT NULL,
    
    -- عداد المخالفات
    month INT NOT NULL,
    year INT NOT NULL,
    violation_count INT DEFAULT 0 COMMENT 'عدد المخالفات في الشهر',
    
    -- آخر مخالفة
    last_violation_date DATE DEFAULT NULL,
    last_violation_minutes INT DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_employee_violation (employee_id, violation_type, month, year),
    INDEX idx_company_month (company_id, month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- إدراج إعدادات افتراضية
-- Insert Default Settings
-- ===================================================================

-- إدراج إعدادات افتراضية لكل شركة موجودة
INSERT INTO attendance_deduction_settings (
    company_id,
    grace_period_minutes,
    late_threshold_minutes,
    early_checkout_enabled,
    early_checkout_threshold_minutes,
    first_violation_multiplier,
    second_violation_multiplier,
    third_violation_multiplier,
    notify_at_percentage,
    is_active
)
SELECT 
    id,
    60,  -- 60 دقيقة تسامح شهرياً
    10,  -- 10 دقائق قبل بدء الخصم
    TRUE,
    0,   -- أي دقيقة انصراف مبكر
    1.0, -- عادي
    2.0, -- مضاعف
    3.0, -- مضاعف أكثر
    75,  -- إشعار عند 75%
    FALSE -- غير مفعل افتراضياً (يجب تفعيله يدوياً)
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM attendance_deduction_settings 
    WHERE attendance_deduction_settings.company_id = companies.id
);

-- ===================================================================
-- Views للتقارير
-- ===================================================================

-- عرض ملخص الخصومات الشهرية لكل موظف
CREATE OR REPLACE VIEW v_employee_monthly_deductions AS
SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    e.company_id,
    c.name AS company_name,
    MONTH(ad.deduction_date) AS month,
    YEAR(ad.deduction_date) AS year,
    COUNT(CASE WHEN ad.deduction_type = 'late_checkin' THEN 1 END) AS late_count,
    COUNT(CASE WHEN ad.deduction_type = 'early_checkout' THEN 1 END) AS early_checkout_count,
    SUM(CASE WHEN ad.is_financial = TRUE THEN ad.deduction_amount ELSE 0 END) AS total_financial_deductions,
    COUNT(CASE WHEN ad.is_financial = FALSE THEN 1 END) AS warning_count,
    egb.remaining_grace_minutes
FROM employees e
LEFT JOIN auto_deductions ad ON e.id = ad.employee_id
LEFT JOIN companies c ON e.company_id = c.id
LEFT JOIN employee_grace_balance egb ON e.id = egb.employee_id 
    AND MONTH(ad.deduction_date) = egb.month 
    AND YEAR(ad.deduction_date) = egb.year
WHERE ad.status != 'cancelled'
GROUP BY e.id, MONTH(ad.deduction_date), YEAR(ad.deduction_date);

-- عرض الموظفين الذين اقتربوا من نفاد رصيد التسامح
CREATE OR REPLACE VIEW v_grace_balance_alerts AS
SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    e.company_id,
    egb.month,
    egb.year,
    egb.total_grace_minutes,
    egb.used_grace_minutes,
    egb.remaining_grace_minutes,
    ROUND((egb.used_grace_minutes / egb.total_grace_minutes) * 100, 2) AS usage_percentage,
    ads.notify_at_percentage
FROM employee_grace_balance egb
JOIN employees e ON egb.employee_id = e.id
JOIN attendance_deduction_settings ads ON e.company_id = ads.company_id
WHERE egb.remaining_grace_minutes <= (egb.total_grace_minutes * (ads.notify_at_percentage / 100))
AND egb.month = MONTH(CURRENT_DATE)
AND egb.year = YEAR(CURRENT_DATE);

-- ===================================================================
-- Stored Procedures
-- ===================================================================

DELIMITER //

-- إجراء لإعادة تعيين رصيد التسامح الشهري
CREATE PROCEDURE reset_monthly_grace_balance()
BEGIN
    DECLARE current_month INT;
    DECLARE current_year INT;
    
    SET current_month = MONTH(CURRENT_DATE);
    SET current_year = YEAR(CURRENT_DATE);
    
    -- إنشاء رصيد جديد للشهر الحالي لجميع الموظفين النشطين
    INSERT INTO employee_grace_balance (
        employee_id,
        company_id,
        month,
        year,
        total_grace_minutes,
        used_grace_minutes,
        remaining_grace_minutes
    )
    SELECT 
        e.id,
        e.company_id,
        current_month,
        current_year,
        ads.grace_period_minutes,
        0,
        ads.grace_period_minutes
    FROM employees e
    JOIN attendance_deduction_settings ads ON e.company_id = ads.company_id
    WHERE ads.is_active = TRUE
    AND ads.reset_grace_period_monthly = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM employee_grace_balance egb
        WHERE egb.employee_id = e.id
        AND egb.month = current_month
        AND egb.year = current_year
    );
    
    -- إرسال إشعارات بإعادة التعيين
    INSERT INTO deduction_notifications (
        employee_id,
        company_id,
        notification_type,
        title,
        message,
        remaining_grace_minutes
    )
    SELECT 
        egb.employee_id,
        egb.company_id,
        'monthly_reset',
        'تم إعادة تعيين رصيد التسامح',
        CONCAT('تم إعادة تعيين رصيد التسامح الشهري إلى ', egb.total_grace_minutes, ' دقيقة'),
        egb.total_grace_minutes
    FROM employee_grace_balance egb
    WHERE egb.month = current_month
    AND egb.year = current_year
    AND egb.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
END //

DELIMITER ;

-- ===================================================================
-- Events للمهام المجدولة
-- ===================================================================

-- تفعيل المجدول
SET GLOBAL event_scheduler = ON;

-- حدث شهري لإعادة تعيين رصيد التسامح
CREATE EVENT IF NOT EXISTS reset_grace_balance_monthly
ON SCHEDULE EVERY 1 MONTH
STARTS DATE_ADD(DATE_ADD(LAST_DAY(CURRENT_DATE), INTERVAL 1 DAY), INTERVAL 0 HOUR)
DO CALL reset_monthly_grace_balance();

-- ===================================================================
-- تعليقات ختامية
-- ===================================================================

-- تم إنشاء نظام الخصومات التلقائية بنجاح
-- Auto Deduction System Created Successfully
-- 
-- الجداول المنشأة:
-- 1. attendance_deduction_settings - إعدادات النظام
-- 2. employee_grace_balance - رصيد التسامح الشهري
-- 3. auto_deductions - سجل الخصومات
-- 4. deduction_notifications - إشعارات الموظفين
-- 5. violation_history - سجل المخالفات
--
-- Views:
-- 1. v_employee_monthly_deductions - ملخص الخصومات الشهرية
-- 2. v_grace_balance_alerts - تنبيهات رصيد التسامح
--
-- Procedures:
-- 1. reset_monthly_grace_balance() - إعادة تعيين الرصيد الشهري
--
-- Events:
-- 1. reset_grace_balance_monthly - تنفيذ تلقائي شهري

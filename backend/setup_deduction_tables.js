/**
 * إنشاء جداول نظام الخصومات التلقائية
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: '92.113.22.70',
  port: 3306,
  user: 'u339372869_test2',
  password: '0165676135Aa@A',
  database: 'u339372869_test2'
};

async function setupTables() {
  let connection;
  
  try {
    console.log('🔌 الاتصال بقاعدة البيانات...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ تم الاتصال بنجاح\n');
    
    // 1. جدول إعدادات الخصومات
    console.log('📋 إنشاء جدول attendance_deduction_settings...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_deduction_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id VARCHAR(191) NOT NULL UNIQUE,
        grace_period_minutes INT NOT NULL DEFAULT 60,
        late_threshold_minutes INT NOT NULL DEFAULT 10,
        early_checkout_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        early_checkout_threshold_minutes INT NOT NULL DEFAULT 0,
        first_violation_multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.0,
        second_violation_multiplier DECIMAL(3,1) NOT NULL DEFAULT 2.0,
        third_violation_multiplier DECIMAL(3,1) NOT NULL DEFAULT 3.0,
        notify_at_percentage INT NOT NULL DEFAULT 75,
        notify_on_deduction BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company (company_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ تم إنشاء جدول attendance_deduction_settings\n');
    
    // 2. جدول رصيد التسامح
    console.log('📋 إنشاء جدول employee_grace_balance...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_grace_balance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(191) NOT NULL,
        company_id VARCHAR(191) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        total_grace_minutes INT NOT NULL DEFAULT 60,
        used_grace_minutes INT NOT NULL DEFAULT 0,
        remaining_grace_minutes INT NOT NULL DEFAULT 60,
        late_count INT NOT NULL DEFAULT 0,
        total_deduction_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_employee_month (employee_id, month, year),
        INDEX idx_employee (employee_id),
        INDEX idx_company (company_id),
        INDEX idx_month_year (month, year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ تم إنشاء جدول employee_grace_balance\n');
    
    // 3. جدول الخصومات التلقائية
    console.log('📋 إنشاء جدول auto_deductions...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auto_deductions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(191) NOT NULL,
        company_id VARCHAR(191) NOT NULL,
        attendance_id INT,
        deduction_type ENUM('late_checkin', 'early_checkout') NOT NULL,
        minutes_late INT NOT NULL,
        scheduled_time TIME NOT NULL,
        actual_time TIME NOT NULL,
        is_financial BOOLEAN NOT NULL DEFAULT FALSE,
        deduction_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        violation_count INT NOT NULL DEFAULT 0,
        multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.0,
        deduction_date DATE NOT NULL,
        status ENUM('pending', 'applied', 'cancelled') NOT NULL DEFAULT 'pending',
        cancelled_by VARCHAR(191),
        cancellation_reason TEXT,
        cancelled_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_employee (employee_id),
        INDEX idx_company (company_id),
        INDEX idx_attendance (attendance_id),
        INDEX idx_date (deduction_date),
        INDEX idx_status (status),
        INDEX idx_type (deduction_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ تم إنشاء جدول auto_deductions\n');
    
    // 4. جدول الإشعارات
    console.log('📋 إنشاء جدول deduction_notifications...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deduction_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(191) NOT NULL,
        company_id VARCHAR(191) NOT NULL,
        notification_type ENUM('grace_warning', 'grace_depleted', 'deduction_applied', 'grace_reset') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_employee (employee_id),
        INDEX idx_company (company_id),
        INDEX idx_type (notification_type),
        INDEX idx_read (is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ تم إنشاء جدول deduction_notifications\n');
    
    // 5. جدول سجل المخالفات
    console.log('📋 إنشاء جدول violation_history...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS violation_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(191) NOT NULL,
        company_id VARCHAR(191) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        violation_count INT NOT NULL DEFAULT 0,
        last_violation_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_employee_month (employee_id, month, year),
        INDEX idx_employee (employee_id),
        INDEX idx_company (company_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ تم إنشاء جدول violation_history\n');
    
    console.log('🎉 تم إنشاء جميع الجداول بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ تم إغلاق الاتصال');
    }
  }
}

setupTables().catch(console.error);

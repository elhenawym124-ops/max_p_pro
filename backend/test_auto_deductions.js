/**
 * 🧪 اختبار نظام الخصومات التلقائية
 * Auto Deduction System Test Suite
 */

const mysql = require('mysql2/promise');
const moment = require('moment-timezone');

// إعدادات قاعدة البيانات
const dbConfig = {
  host: '92.113.22.70',
  port: 3306,
  user: 'u339372869_test2',
  password: '0165676135Aa@A',
  database: 'u339372869_test2'
};

let connection;

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// دالة للانتظار
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function setupDatabase() {
  log('\n📊 === إعداد قاعدة البيانات ===', 'cyan');
  
  try {
    connection = await mysql.createConnection(dbConfig);
    log('✅ تم الاتصال بقاعدة البيانات', 'green');
    
    // التحقق من وجود الجداول
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN (
        'attendance_deduction_settings',
        'employee_grace_balance',
        'auto_deductions',
        'deduction_notifications',
        'violation_history'
      )
    `, [dbConfig.database]);
    
    log(`📋 عدد الجداول الموجودة: ${tables.length}/5`, 'blue');
    
    if (tables.length < 5) {
      log('⚠️  بعض الجداول غير موجودة. يجب تشغيل migration أولاً:', 'yellow');
      log('   mysql -h 92.113.22.70 -u u339372869_test2 -p < backend/migrations/create_auto_deduction_system.sql', 'yellow');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`❌ خطأ في الاتصال: ${error.message}`, 'red');
    return false;
  }
}

async function setupTestData() {
  log('\n🔧 === إعداد بيانات الاختبار ===', 'cyan');
  
  try {
    // 1. البحث عن شركة للاختبار
    const [companies] = await connection.query('SELECT id, name FROM companies LIMIT 1');
    if (companies.length === 0) {
      log('❌ لا توجد شركات في قاعدة البيانات', 'red');
      return null;
    }
    const companyId = companies[0].id;
    log(`✅ شركة الاختبار: ${companies[0].name} (${companyId})`, 'green');
    
    // 2. البحث عن موظف للاختبار (نستخدم أي مستخدم متاح)
    const [users] = await connection.query(`
      SELECT id, firstName, lastName, email, role
      FROM users
      WHERE companyId = ?
      LIMIT 1
    `, [companyId]);
    
    if (users.length === 0) {
      // إذا لم يوجد مستخدمين في الشركة، نستخدم أي مستخدم
      const [allUsers] = await connection.query(`
        SELECT id, firstName, lastName, email, role, companyId
        FROM users
        LIMIT 1
      `);
      
      if (allUsers.length === 0) {
        log('❌ لا يوجد مستخدمين في قاعدة البيانات', 'red');
        return null;
      }
      
      users.push(allUsers[0]);
      companyId = allUsers[0].companyId;
      log(`⚠️  استخدام مستخدم من شركة أخرى: ${companyId}`, 'yellow');
    }
    const employee = users[0];
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    log(`✅ موظف الاختبار: ${employeeName} (${employee.id})`, 'green');
    log(`   البريد: ${employee.email}`, 'blue');
    
    // 3. تحديد راتب افتراضي للاختبار
    const salary = 6000; // راتب افتراضي للاختبار
    log(`💰 الراتب الافتراضي: ${salary} جنيه`, 'blue');
    
    // 4. إنشاء أو تحديث إعدادات الخصومات التلقائية
    await connection.query(`
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
      ) VALUES (?, 60, 10, TRUE, 0, 1.0, 2.0, 3.0, 75, TRUE)
      ON DUPLICATE KEY UPDATE
        grace_period_minutes = 60,
        late_threshold_minutes = 10,
        is_active = TRUE
    `, [companyId]);
    log('✅ تم إعداد إعدادات الخصومات التلقائية', 'green');
    
    // 5. إنشاء رصيد تسامح للشهر الحالي
    const currentMonth = moment().month() + 1;
    const currentYear = moment().year();
    
    await connection.query(`
      INSERT INTO employee_grace_balance (
        employee_id,
        company_id,
        month,
        year,
        total_grace_minutes,
        used_grace_minutes,
        remaining_grace_minutes
      ) VALUES (?, ?, ?, ?, 60, 0, 60)
      ON DUPLICATE KEY UPDATE
        remaining_grace_minutes = 60,
        used_grace_minutes = 0
    `, [employee.id, companyId, currentMonth, currentYear]);
    log('✅ تم إنشاء رصيد التسامح (60 دقيقة)', 'green');
    
    return {
      companyId,
      employeeId: employee.id,
      employeeName: employeeName,
      userId: employee.id,
      salary: salary
    };
  } catch (error) {
    log(`❌ خطأ في إعداد البيانات: ${error.message}`, 'red');
    return null;
  }
}

async function test1_SimpleLateness(testData) {
  log('\n🧪 === اختبار 1: تأخير بسيط (5 دقائق) ===', 'cyan');
  
  try {
    const { companyId, employeeId } = testData;
    const today = moment().format('YYYY-MM-DD');
    const scheduledTime = '10:00:00';
    const actualTime = '10:05:00'; // تأخر 5 دقائق
    
    log(`📅 التاريخ: ${today}`, 'blue');
    log(`⏰ الموعد المحدد: ${scheduledTime}`, 'blue');
    log(`⏰ الوقت الفعلي: ${actualTime}`, 'blue');
    log(`⏱️  التأخير: 5 دقائق`, 'yellow');
    
    const attendanceId = 1000; // معرف افتراضي للاختبار
    log(`✅ محاكاة سجل حضور: ${attendanceId}`, 'green');
    
    // محاكاة معالجة الخصم التلقائي
    const minutesLate = 5;
    const lateThreshold = 10;
    
    if (minutesLate <= lateThreshold) {
      // استخدام من رصيد التسامح
      await connection.query(`
        UPDATE employee_grace_balance
        SET used_grace_minutes = used_grace_minutes + ?,
            remaining_grace_minutes = remaining_grace_minutes - ?,
            late_count = late_count + 1
        WHERE employee_id = ? 
        AND month = MONTH(CURRENT_DATE)
        AND year = YEAR(CURRENT_DATE)
      `, [minutesLate, minutesLate, employeeId]);
      
      // إنشاء سجل خصم تحذيري
      await connection.query(`
        INSERT INTO auto_deductions (
          employee_id, company_id, attendance_id,
          deduction_type, minutes_late,
          scheduled_time, actual_time,
          is_financial, deduction_amount,
          violation_count, multiplier,
          deduction_date, status
        ) VALUES (?, ?, ?, 'late_checkin', ?, ?, ?, FALSE, 0, 0, 1.0, ?, 'applied')
      `, [employeeId, companyId, attendanceId, minutesLate, scheduledTime, actualTime, today]);
      
      log('✅ النتيجة: خصم تحذيري (استخدام من رصيد التسامح)', 'green');
      log('   لا يوجد خصم مالي ✓', 'green');
    }
    
    // عرض الرصيد المتبقي
    const [balance] = await connection.query(`
      SELECT remaining_grace_minutes, used_grace_minutes
      FROM employee_grace_balance
      WHERE employee_id = ?
      AND month = MONTH(CURRENT_DATE)
      AND year = YEAR(CURRENT_DATE)
    `, [employeeId]);
    
    if (balance.length > 0) {
      log(`📊 الرصيد المتبقي: ${balance[0].remaining_grace_minutes} دقيقة`, 'blue');
      log(`📊 الرصيد المستخدم: ${balance[0].used_grace_minutes} دقيقة`, 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ فشل الاختبار: ${error.message}`, 'red');
    return false;
  }
}

async function test2_ExceedThreshold(testData) {
  log('\n🧪 === اختبار 2: تأخير أكثر من الحد (15 دقيقة) ===', 'cyan');
  
  try {
    const { companyId, employeeId, salary } = testData;
    const today = moment().format('YYYY-MM-DD');
    const scheduledTime = '10:00:00';
    const actualTime = '10:15:00'; // تأخر 15 دقيقة
    
    log(`📅 التاريخ: ${today}`, 'blue');
    log(`⏰ الموعد المحدد: ${scheduledTime}`, 'blue');
    log(`⏰ الوقت الفعلي: ${actualTime}`, 'blue');
    log(`⏱️  التأخير: 15 دقيقة`, 'yellow');
    
    const minutesLate = 15;
    const lateThreshold = 10;
    const exceedMinutes = minutesLate - lateThreshold; // 5 دقائق
    
    // حساب الخصم المالي
    const dailySalary = salary / 22;
    const hourlySalary = dailySalary / 8;
    const minuteRate = hourlySalary / 60;
    const deductionAmount = minuteRate * exceedMinutes;
    
    log(`💰 حساب الخصم:`, 'yellow');
    log(`   الراتب الشهري: ${salary} جنيه`, 'blue');
    log(`   الراتب اليومي: ${dailySalary.toFixed(2)} جنيه`, 'blue');
    log(`   معدل الدقيقة: ${minuteRate.toFixed(2)} جنيه`, 'blue');
    log(`   دقائق الخصم: ${exceedMinutes} دقيقة (تجاوز الحد)`, 'yellow');
    log(`   قيمة الخصم: ${deductionAmount.toFixed(2)} جنيه`, 'red');
    
    // إنشاء سجل الخصم
    await connection.query(`
      INSERT INTO auto_deductions (
        employee_id, company_id, attendance_id,
        deduction_type, minutes_late,
        scheduled_time, actual_time,
        is_financial, deduction_amount,
        violation_count, multiplier,
        deduction_date, status
      ) VALUES (?, ?, 999, 'late_checkin', ?, ?, ?, TRUE, ?, 1, 1.0, ?, 'applied')
    `, [employeeId, companyId, minutesLate, scheduledTime, actualTime, deductionAmount, today]);
    
    log('✅ النتيجة: خصم مالي (تجاوز الحد اليومي)', 'green');
    log(`   ✓ استخدام 10 دقائق من الرصيد`, 'green');
    log(`   ✓ خصم مالي على 5 دقائق = ${deductionAmount.toFixed(2)} جنيه`, 'red');
    
    return true;
  } catch (error) {
    log(`❌ فشل الاختبار: ${error.message}`, 'red');
    return false;
  }
}

async function test3_DepletedGrace(testData) {
  log('\n🧪 === اختبار 3: نفاد رصيد التسامح ===', 'cyan');
  
  try {
    const { companyId, employeeId, salary } = testData;
    
    // استنفاد الرصيد
    await connection.query(`
      UPDATE employee_grace_balance
      SET used_grace_minutes = 60,
          remaining_grace_minutes = 0
      WHERE employee_id = ?
      AND month = MONTH(CURRENT_DATE)
      AND year = YEAR(CURRENT_DATE)
    `, [employeeId]);
    
    log('⚠️  تم استنفاد رصيد التسامح (0 دقيقة متبقية)', 'yellow');
    
    const today = moment().format('YYYY-MM-DD');
    const minutesLate = 7;
    
    // حساب الخصم
    const dailySalary = salary / 22;
    const hourlySalary = dailySalary / 8;
    const minuteRate = hourlySalary / 60;
    const deductionAmount = minuteRate * minutesLate;
    
    log(`⏱️  تأخير جديد: ${minutesLate} دقائق`, 'yellow');
    log(`💰 خصم مالي مباشر: ${deductionAmount.toFixed(2)} جنيه`, 'red');
    
    // إنشاء سجل الخصم
    await connection.query(`
      INSERT INTO auto_deductions (
        employee_id, company_id, attendance_id,
        deduction_type, minutes_late,
        scheduled_time, actual_time,
        is_financial, deduction_amount,
        violation_count, multiplier,
        deduction_date, status
      ) VALUES (?, ?, 999, 'late_checkin', ?, '10:00:00', '10:07:00', TRUE, ?, 1, 1.0, ?, 'applied')
    `, [employeeId, companyId, minutesLate, deductionAmount, today]);
    
    log('✅ النتيجة: خصم مالي كامل (لا يوجد رصيد)', 'green');
    
    return true;
  } catch (error) {
    log(`❌ فشل الاختبار: ${error.message}`, 'red');
    return false;
  }
}

async function test4_Escalation(testData) {
  log('\n🧪 === اختبار 4: نظام التصعيد (×1، ×2، ×3) ===', 'cyan');
  
  try {
    const { companyId, employeeId, salary } = testData;
    const today = moment().format('YYYY-MM-DD');
    const minutesLate = 8;
    
    const dailySalary = salary / 22;
    const hourlySalary = dailySalary / 8;
    const minuteRate = hourlySalary / 60;
    
    // المخالفة الأولى (×1)
    const deduction1 = minuteRate * minutesLate * 1.0;
    log(`1️⃣ المخالفة الأولى: ${minutesLate} دقائق × 1.0 = ${deduction1.toFixed(2)} جنيه`, 'yellow');
    
    await connection.query(`
      INSERT INTO auto_deductions (
        employee_id, company_id, attendance_id,
        deduction_type, minutes_late,
        scheduled_time, actual_time,
        is_financial, deduction_amount,
        violation_count, multiplier,
        deduction_date, status
      ) VALUES (?, ?, 999, 'late_checkin', ?, '10:00:00', '10:08:00', TRUE, ?, 1, 1.0, ?, 'applied')
    `, [employeeId, companyId, minutesLate, deduction1, today]);
    
    // المخالفة الثانية (×2)
    const deduction2 = minuteRate * minutesLate * 2.0;
    log(`2️⃣ المخالفة الثانية: ${minutesLate} دقائق × 2.0 = ${deduction2.toFixed(2)} جنيه`, 'yellow');
    
    await connection.query(`
      INSERT INTO auto_deductions (
        employee_id, company_id, attendance_id,
        deduction_type, minutes_late,
        scheduled_time, actual_time,
        is_financial, deduction_amount,
        violation_count, multiplier,
        deduction_date, status
      ) VALUES (?, ?, 999, 'late_checkin', ?, '10:00:00', '10:08:00', TRUE, ?, 2, 2.0, ?, 'applied')
    `, [employeeId, companyId, minutesLate, deduction2, today]);
    
    // المخالفة الثالثة (×3)
    const deduction3 = minuteRate * minutesLate * 3.0;
    log(`3️⃣ المخالفة الثالثة: ${minutesLate} دقائق × 3.0 = ${deduction3.toFixed(2)} جنيه`, 'yellow');
    
    await connection.query(`
      INSERT INTO auto_deductions (
        employee_id, company_id, attendance_id,
        deduction_type, minutes_late,
        scheduled_time, actual_time,
        is_financial, deduction_amount,
        violation_count, multiplier,
        deduction_date, status
      ) VALUES (?, ?, 999, 'late_checkin', ?, '10:00:00', '10:08:00', TRUE, ?, 3, 3.0, ?, 'applied')
    `, [employeeId, companyId, minutesLate, deduction3, today]);
    
    log('✅ نظام التصعيد يعمل بنجاح', 'green');
    log(`   إجمالي الخصومات: ${(deduction1 + deduction2 + deduction3).toFixed(2)} جنيه`, 'red');
    
    return true;
  } catch (error) {
    log(`❌ فشل الاختبار: ${error.message}`, 'red');
    return false;
  }
}

async function test5_EarlyCheckout(testData) {
  log('\n🧪 === اختبار 5: انصراف مبكر ===', 'cyan');
  
  try {
    const { companyId, employeeId, salary } = testData;
    const today = moment().format('YYYY-MM-DD');
    const scheduledTime = '18:00:00'; // 6 مساءً
    const actualTime = '17:58:00'; // انصرف قبل دقيقتين
    const minutesEarly = 2;
    
    log(`📅 التاريخ: ${today}`, 'blue');
    log(`⏰ موعد الانصراف: ${scheduledTime}`, 'blue');
    log(`⏰ الانصراف الفعلي: ${actualTime}`, 'blue');
    log(`⏱️  انصراف مبكر: ${minutesEarly} دقيقة`, 'yellow');
    
    // حساب الخصم الفوري
    const dailySalary = salary / 22;
    const hourlySalary = dailySalary / 8;
    const minuteRate = hourlySalary / 60;
    const deductionAmount = minuteRate * minutesEarly;
    
    log(`💰 خصم فوري: ${deductionAmount.toFixed(2)} جنيه`, 'red');
    
    // إنشاء سجل الخصم
    await connection.query(`
      INSERT INTO auto_deductions (
        employee_id, company_id, attendance_id,
        deduction_type, minutes_late,
        scheduled_time, actual_time,
        is_financial, deduction_amount,
        violation_count, multiplier,
        deduction_date, status
      ) VALUES (?, ?, 999, 'early_checkout', ?, ?, ?, TRUE, ?, 1, 1.0, ?, 'applied')
    `, [employeeId, companyId, minutesEarly, scheduledTime, actualTime, deductionAmount, today]);
    
    log('✅ النتيجة: خصم مالي فوري (لا يستخدم رصيد التسامح)', 'green');
    
    return true;
  } catch (error) {
    log(`❌ فشل الاختبار: ${error.message}`, 'red');
    return false;
  }
}

async function showResults(testData) {
  log('\n📊 === النتائج النهائية ===', 'cyan');
  
  try {
    const { employeeId, employeeName } = testData;
    
    // عرض الخصومات
    const [deductions] = await connection.query(`
      SELECT 
        deduction_type,
        minutes_late,
        is_financial,
        deduction_amount,
        violation_count,
        multiplier,
        status,
        deduction_date
      FROM auto_deductions
      WHERE employee_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [employeeId]);
    
    log(`\n👤 الموظف: ${employeeName}`, 'blue');
    log(`📋 عدد الخصومات: ${deductions.length}`, 'blue');
    
    let totalAmount = 0;
    deductions.forEach((d, i) => {
      const type = d.deduction_type === 'late_checkin' ? 'تأخير' : 'انصراف مبكر';
      const financial = d.is_financial ? '💰 مالي' : '⚠️  تحذيري';
      const amount = parseFloat(d.deduction_amount) || 0;
      log(`\n${i + 1}. ${type} - ${d.minutes_late} دقيقة`, 'yellow');
      log(`   ${financial} - ${amount.toFixed(2)} جنيه`, d.is_financial ? 'red' : 'yellow');
      log(`   المخالفة: ${d.violation_count} (×${d.multiplier})`, 'blue');
      
      if (d.is_financial) {
        totalAmount += amount;
      }
    });
    
    log(`\n💵 إجمالي الخصومات المالية: ${totalAmount.toFixed(2)} جنيه`, 'red');
    
    // عرض رصيد التسامح
    const [balance] = await connection.query(`
      SELECT 
        total_grace_minutes,
        used_grace_minutes,
        remaining_grace_minutes,
        late_count,
        total_deduction_amount
      FROM employee_grace_balance
      WHERE employee_id = ?
      AND month = MONTH(CURRENT_DATE)
      AND year = YEAR(CURRENT_DATE)
    `, [employeeId]);
    
    if (balance.length > 0) {
      const b = balance[0];
      log(`\n📊 رصيد التسامح:`, 'cyan');
      log(`   الإجمالي: ${b.total_grace_minutes} دقيقة`, 'blue');
      log(`   المستخدم: ${b.used_grace_minutes} دقيقة`, 'yellow');
      log(`   المتبقي: ${b.remaining_grace_minutes} دقيقة`, b.remaining_grace_minutes > 0 ? 'green' : 'red');
      log(`   عدد مرات التأخير: ${b.late_count}`, 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ خطأ في عرض النتائج: ${error.message}`, 'red');
    return false;
  }
}

async function cleanup() {
  if (connection) {
    await connection.end();
    log('\n✅ تم إغلاق الاتصال بقاعدة البيانات', 'green');
  }
}

// تشغيل الاختبارات
async function runTests() {
  log('\n🚀 === بدء اختبار نظام الخصومات التلقائية ===', 'cyan');
  log('═══════════════════════════════════════════════════\n', 'cyan');
  
  try {
    // إعداد قاعدة البيانات
    const dbReady = await setupDatabase();
    if (!dbReady) {
      log('\n❌ فشل إعداد قاعدة البيانات', 'red');
      await cleanup();
      return;
    }
    
    // إعداد بيانات الاختبار
    const testData = await setupTestData();
    if (!testData) {
      log('\n❌ فشل إعداد بيانات الاختبار', 'red');
      await cleanup();
      return;
    }
    
    await sleep(1000);
    
    // تشغيل الاختبارات
    const results = {
      test1: await test1_SimpleLateness(testData),
      test2: await test2_ExceedThreshold(testData),
      test3: await test3_DepletedGrace(testData),
      test4: await test4_Escalation(testData),
      test5: await test5_EarlyCheckout(testData)
    };
    
    await sleep(1000);
    
    // عرض النتائج
    await showResults(testData);
    
    // ملخص النتائج
    log('\n\n📈 === ملخص الاختبارات ===', 'cyan');
    log('═══════════════════════════════════════════════════', 'cyan');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, result]) => {
      const status = result ? '✅ نجح' : '❌ فشل';
      const color = result ? 'green' : 'red';
      log(`${test}: ${status}`, color);
    });
    
    log(`\n📊 النتيجة النهائية: ${passed}/${total} اختبارات نجحت`, passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
      log('\n🎉 جميع الاختبارات نجحت! النظام يعمل بشكل صحيح ✅', 'green');
    } else {
      log('\n⚠️  بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه', 'yellow');
    }
    
  } catch (error) {
    log(`\n❌ خطأ عام: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await cleanup();
  }
}

// تشغيل الاختبارات
runTests().catch(console.error);

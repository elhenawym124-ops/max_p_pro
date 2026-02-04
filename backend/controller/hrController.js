/**
 * 👥 HR Controller
 * API endpoints لإدارة الموارد البشرية
 */

const {
  employeeService,
  departmentService,
  attendanceService,
  leaveService,
  payrollService,
  documentService,
  salaryHistoryService,
  performanceService,
  trainingService,
  warningService,
  promotionService,
  shiftService,
  benefitService,
  goalService,
  feedbackService,
  resignationService
} = require('../services/hr');
const { handleHRError } = require('../utils/hrErrors');
const { getStartOfDayInEgypt } = require('../utils/dateUtils');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues - use getSharedPrismaClient() inside functions

// Temporarily disabled WhatsApp to fix server startup
// const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

/**
 * جلب ملف الموظف الشخصي
 * GET /api/hr/employees/me
 */
async function getMyProfile(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    // البحث عن الموظف بـ userId
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف الموظف'
      });
    }

    res.json({ success: true, employee });
  } catch (error) {
    console.error('❌ Error getting my profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الملف الشخصي'
    });
  }
}

/**
 * جلب حضور اليوم للموظف
 * GET /api/hr/attendance/my-today
 */
async function getMyTodayAttendance(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف الموظف'
      });
    }

    // جلب حضور اليوم باستخدام توقيت مصر لتجنب مشاكل المناطق الزمنية
    const today = getStartOfDayInEgypt();
    const attendance = await attendanceService.getTodayAttendanceForEmployee(companyId, employee.id, today);

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('❌ Error getting my today attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب حضور اليوم'
    });
  }
}

/**
 * جلب إحصائيات الحضور للموظف
 * GET /api/hr/attendance/my-stats
 */
async function getMyAttendanceStats(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف الموظف'
      });
    }

    // جلب إحصائيات الحضور (آخر 30 يوم)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const stats = await attendanceService.getAttendanceStatsForEmployee(
      companyId,
      employee.id,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting my attendance stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب إحصائيات الحضور'
    });
  }
}

/**
 * جلب سجل الحضور الأخير للموظف
 * GET /api/hr/attendance/my-recent
 */
async function getMyRecentAttendance(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { limit = 10 } = req.query;

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف الموظف'
      });
    }

    // جلب آخر سجلات الحضور
    const attendance = await attendanceService.getRecentAttendanceForEmployee(
      companyId,
      employee.id,
      parseInt(limit)
    );
    res.json({ success: true, attendance });
  } catch (error) {
    console.error('❌ Error getting my recent attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب سجل الحضور'
    });
  }
}

/**
 * جلب طلبات الإجازات الأخيرة للموظف
 * GET /api/hr/leaves/my-recent
 */
async function getMyRecentLeaves(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { limit = 3 } = req.query;

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف الموظف'
      });
    }

    // جلب آخر طلبات الإجازات
    const leaves = await leaveService.getRecentLeavesForEmployee(
      companyId,
      employee.id,
      parseInt(limit)
    );

    res.json({ success: true, leaves });
  } catch (error) {
    console.error('❌ Error getting my recent leaves:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب طلبات الإجازات'
    });
  }
}

/**
 * جلب سجل إجازاتي (مع ترقيم صفحات وفلترة)
 * GET /api/hr/leaves/my-history
 */
async function getMyLeavesHistory(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف الموظف'
      });
    }

    // Reuse generic getLeaveRequests but force employeeId
    const result = await leaveService.getLeaveRequests(companyId, {
      ...req.query,
      employeeId: employee.id // FORCE employeeId
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting my leave history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب سجل الإجازات'
    });
  }
}

/**
 * جلب كشف راتب لموظف محدد (Admin)
 */
async function getMyLastPayroll(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف الموظف'
      });
    }

    // جلب آخر كشف راتب
    const payroll = await payrollService.getLastPayrollForEmployee(companyId, employee.id);

    res.json({ success: true, payroll });
  } catch (error) {
    console.error('❌ Error getting my last payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب كشف الراتب'
    });
  }
}

/**
 * جلب سجل رواتب الموظف
 * GET /api/hr/payroll/my-history
 */
async function getMyPayrollHistory(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    console.log('🔍 [getMyPayrollHistory] userId:', userId, 'companyId:', companyId);

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    console.log('🔍 [getMyPayrollHistory] employee found:', employee ? employee.id : 'NOT FOUND');
    
    if (!employee) {
      console.log('⚠️ [getMyPayrollHistory] Employee not found, using userId directly');
      // Fallback: use userId directly if employee record not found
      const result = await payrollService.getPayrolls(companyId, {
        ...req.query,
        employeeId: userId // Use userId as fallback
      });
      return res.json({ success: true, ...result });
    }

    // Reuse generic getPayrolls but force employeeId
    const result = await payrollService.getPayrolls(companyId, {
      ...req.query,
      employeeId: employee.id // FORCE employeeId
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting my payroll history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب سجل الرواتب'
    });
  }
}

/**
 * جلب توقع الراتب الحالي للموظف (بدون حفظ)
 * GET /api/hr/payroll/my-projection
 */
async function getMyPayrollProjection(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    // البحث عن الموظف
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    
    if (!employee) {
      console.log('⚠️ [getMyPayrollProjection] Employee not found, using userId directly');
      // Fallback: use userId directly if employee record not found
      const projection = await payrollService.getPayrollProjection(companyId, userId);
      return res.json({ success: true, projection });
    }

    const projection = await payrollService.getPayrollProjection(companyId, employee.id);

    res.json({ success: true, projection });
  } catch (error) {
    console.error('❌ Error getting payroll projection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء حساب توقع الراتب'
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 الأقسام - Departments
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء قسم جديد
 * POST /api/hr/departments
 */
async function createDepartment(req, res) {
  try {
    const { companyId } = req.user;
    const department = await departmentService.createDepartment(companyId, req.body);
    res.status(201).json({ success: true, department });
  } catch (error) {
    console.error('❌ Error creating department:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء القسم' });
  }
}

/**
 * إنشاء منصب جديد
 * POST /api/hr/positions
 */
async function createPosition(req, res) {
  try {
    const { companyId } = req.user;
    const { title, description, code, level, departmentId, minSalary, maxSalary } = req.body;

    console.log('📋 [HR] createPosition called, user:', req.user?.id, 'companyId:', companyId);

    // عزل البيانات: يجب أن يكون المستخدم مرتبط بشركة (حتى SUPER_ADMIN)
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لإنشاء منصب'
      });
    }

    // التحقق من البيانات المطلوبة
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'عنوان المنصب مطلوب'
      });
    }

    // التحقق من عدم تكرار المنصب
    const existingPosition = await getSharedPrismaClient().position.findFirst({
      where: {
        companyId: companyId || null,
        title: title.trim()
      }
    });

    if (existingPosition) {
      return res.status(400).json({
        success: false,
        error: 'هذا المنصب موجود بالفعل'
      });
    }

    const positionData = {
      companyId: companyId || null,
      title: title.trim(),
      description: description || null,
      code: code || null,
      level: level || 1,
      departmentId: departmentId || null,
      minSalary: minSalary || null,
      maxSalary: maxSalary || null,
      updatedAt: new Date()
    };

    const position = await getSharedPrismaClient().position.create({
      data: positionData
    });

    console.log('✅ [HR] createPosition success:', position.title);
    res.json({ success: true, position });
  } catch (error) {
    console.error('❌ [HR] Error creating position:', error);
    console.error('❌ [HR] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء المنصب'
    });
  }
}

/**
 * تحديث منصب موجود
 * PUT /api/hr/positions/:id
 */
async function updatePosition(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { title, description, code, level, departmentId, minSalary, maxSalary } = req.body;

    console.log('📋 [HR] updatePosition called, user:', req.user?.id, 'companyId:', companyId, 'positionId:', id);

    // عزل البيانات: يجب أن يكون المستخدم مرتبط بشركة (حتى SUPER_ADMIN)
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لتحديث منصب'
      });
    }

    // التحقق من وجود المنصب
    const existingPosition = await getSharedPrismaClient().position.findFirst({
      where: {
        id,
        companyId: companyId || null
      }
    });

    if (!existingPosition) {
      return res.status(404).json({
        success: false,
        error: 'المنصب غير موجود'
      });
    }

    // التحقق من عدم تكرار العنوان إذا تم تغييره
    if (title && title.trim() !== existingPosition.title) {
      const duplicatePosition = await getSharedPrismaClient().position.findFirst({
        where: {
          companyId: companyId || null,
          title: title.trim(),
          id: { not: id }
        }
      });

      if (duplicatePosition) {
        return res.status(400).json({
          success: false,
          error: 'هذا العنوان مستخدم بالفعل'
        });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (code !== undefined) updateData.code = code;
    if (level !== undefined) updateData.level = level;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (minSalary !== undefined) updateData.minSalary = minSalary;
    if (maxSalary !== undefined) updateData.maxSalary = maxSalary;
    updateData.updatedAt = new Date();

    const position = await getSharedPrismaClient().position.update({
      where: { id },
      data: updateData
    });

    console.log('✅ [HR] updatePosition success:', position.title);
    res.json({ success: true, position });
  } catch (error) {
    console.error('❌ [HR] Error updating position:', error);
    console.error('❌ [HR] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث المنصب'
    });
  }
}

/**
 * حذف منصب
 * DELETE /api/hr/positions/:id
 */
async function deletePosition(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    console.log('📋 [HR] deletePosition called, user:', req.user?.id, 'companyId:', companyId, 'positionId:', id);

    // عزل البيانات: يجب أن يكون المستخدم مرتبط بشركة (حتى SUPER_ADMIN)
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لحذف منصب'
      });
    }

    // التحقق من وجود المنصب
    const existingPosition = await getSharedPrismaClient().position.findFirst({
      where: {
        id,
        companyId: companyId || null
      }
    });

    if (!existingPosition) {
      return res.status(404).json({
        success: false,
        error: 'المنصب غير موجود'
      });
    }

    // التحقق من عدم استخدام المنصب
    const employeesWithPosition = await getSharedPrismaClient().user.count({
      where: {
        positionId: id
      }
    });

    if (employeesWithPosition > 0) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف هذا المنصب لأنه مستخدم من قبل موظفين'
      });
    }

    await getSharedPrismaClient().position.delete({
      where: { id }
    });

    console.log('✅ [HR] deletePosition success:', existingPosition.title);
    res.json({ success: true, message: 'تم حذف المنصب بنجاح' });
  } catch (error) {
    console.error('❌ [HR] Error deleting position:', error);
    console.error('❌ [HR] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء حذف المنصب'
    });
  }
}

/**
 * جلب جميع المناصب
 * GET /api/hr/positions
 */
async function getPositions(req, res) {
  try {
    const { companyId } = req.user;
    const { search } = req.query;

    console.log('📋 [HR] getPositions called, user:', req.user?.id, 'companyId:', companyId);

    // عزل البيانات: يجب أن يكون المستخدم مرتبط بشركة (حتى SUPER_ADMIN)
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض المناصب'
      });
    }

    const where = {};
    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { code: { contains: search } }
      ];
    }

    const positions = await getSharedPrismaClient().position.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { title: 'asc' }
      ],
      select: {
        id: true,
        title: true,
        code: true,
        level: true,
        description: true,
      }
    });

    console.log('✅ [HR] getPositions success, count:', positions.length);
    res.json({ success: true, positions });
  } catch (error) {
    console.error('❌ [HR] Error getting positions:', error);
    console.error('❌ [HR] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب المناصب'
    });
  }
}

/**
 * إنشاء ترقية جديدة
 * POST /api/hr/promotions
 */
async function createPromotion(req, res) {
  try {
    const { companyId, email, role } = req.user;

    console.log(`📝 [CREATE-PROMOTION] User: ${email}, Role: ${role}, CompanyId: ${companyId}`);
    console.log(`📝 [CREATE-PROMOTION] Request body:`, JSON.stringify(req.body, null, 2));

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لإنشاء ترقية'
      });
    }

    // التحقق من أن المنصب الجديد مختلف عن السابق
    if (req.body.fromPositionId && req.body.fromPositionId === req.body.toPositionId) {
      return res.status(400).json({
        success: false,
        error: 'المنصب الجديد يجب أن يكون مختلفاً عن المنصب السابق'
      });
    }

    const promotion = await promotionService.createPromotion(companyId, req.body);
    console.log(`✅ [CREATE-PROMOTION] Success - Created promotion: ${promotion.id}`);
    res.status(201).json({ success: true, promotion });
  } catch (error) {
    console.error('❌ [CREATE-PROMOTION] Error creating promotion:', error);
    console.error('❌ [CREATE-PROMOTION] Error stack:', error.stack);
    console.error('❌ [CREATE-PROMOTION] Error message:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء الترقية',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * جلب جميع الترقيات
 * GET /api/hr/promotions
 */
async function getPromotions(req, res) {
  try {
    const { companyId, role, email } = req.user;

    console.log(`📊 [GET-PROMOTIONS] User: ${email}, Role: ${role}, CompanyId: ${companyId}`);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض الترقيات'
      });
    }

    const result = await promotionService.getPromotions(companyId, req.query);
    console.log(`✅ [GET-PROMOTIONS] Success - Found ${result.promotions?.length || 0} promotions`);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting promotions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الترقيات'
    });
  }
}

/**
 * جلب ترقية واحدة
 * GET /api/hr/promotions/:id
 */
async function getPromotionById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض الترقية'
      });
    }

    const promotion = await promotionService.getPromotionById(companyId, id);
    res.json({ success: true, promotion });
  } catch (error) {
    console.error('❌ Error getting promotion by id:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الترقية'
    });
  }
}

/**
 * حذف ترقية
 * DELETE /api/hr/promotions/:id
 */
async function deletePromotion(req, res) {
  try {
    const { companyId, role, email } = req.user;
    const { id } = req.params;

    console.log(`🗑️ [DELETE-PROMOTION] User: ${email}, Role: ${role}, CompanyId: ${companyId}, PromotionId: ${id}`);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لحذف الترقيات'
      });
    }

    const promotion = await promotionService.deletePromotion(companyId, id);
    console.log(`✅ [DELETE-PROMOTION] Success - Deleted promotion: ${promotion.id}`);
    res.json({ success: true, promotion });
  } catch (error) {
    console.error('❌ Error deleting promotion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء حذف الترقية'
    });
  }
}

/**
 * تحديث ترقية
 * PUT /api/hr/promotions/:id
 */
async function updatePromotion(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لتحديث الترقية'
      });
    }

    if (req.body.fromPositionId && req.body.fromPositionId === req.body.toPositionId) {
      return res.status(400).json({
        success: false,
        error: 'المنصب الجديد يجب أن يكون مختلفاً عن المنصب السابق'
      });
    }

    const promotion = await promotionService.updatePromotion(companyId, id, req.body);
    res.json({ success: true, promotion });
  } catch (error) {
    console.error('❌ Error updating promotion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث الترقية'
    });
  }
}

async function getDepartments(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId && role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض الأقسام'
      });
    }

    const { tree, includeInactive } = req.query;

    console.log(`🔍 [DEBUG] Getting departments for company ${companyId}`);

    const departments = await departmentService.getDepartments(companyId, {
      tree: tree === 'true',
      includeInactive: includeInactive === 'true'
    });
    res.json({ success: true, departments });
  } catch (error) {
    console.error('❌ Error getting departments:', error);
    res.status(500).json({
      error: error.message || 'حدث خطأ أثناء جلب الأقسام',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * جلب قسم بالـ ID
 * GET /api/hr/departments/:id
 */
async function getDepartmentById(req, res) {
  try {
    const { companyId } = req.user;
    const department = await departmentService.getDepartmentById(companyId, req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }
    res.json({ success: true, department });
  } catch (error) {
    console.error('❌ Error getting department:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب القسم' });
  }
}

/**
 * تحديث قسم
 * PUT /api/hr/departments/:id
 */
async function updateDepartment(req, res) {
  try {
    const { companyId } = req.user;
    const department = await departmentService.updateDepartment(companyId, req.params.id, req.body);
    res.json({ success: true, department });
  } catch (error) {
    console.error('❌ Error updating department:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث القسم' });
  }
}

/**
 * حذف قسم
 * DELETE /api/hr/departments/:id
 */
async function deleteDepartment(req, res) {
  try {
    const { companyId } = req.user;
    await departmentService.deleteDepartment(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف القسم بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting department:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف القسم' });
  }
}

/**
 * إحصائيات الأقسام
 * GET /api/hr/departments/stats
 */
async function getDepartmentStats(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: role === 'SUPER_ADMIN'
          ? 'يجب تحديد شركة لعرض إحصائيات الأقسام'
          : 'يجب أن يكون المستخدم مرتبطاً بشركة'
      });
    }

    const stats = await departmentService.getDepartmentStats(companyId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting department stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الموظفين - Employees
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء موظف جديد
 * POST /api/hr/employees
 */
async function createEmployee(req, res) {
  try {
    const { companyId } = req.user;
    console.log('📥 [HR] Creating employee with data:', JSON.stringify(req.body, null, 2));
    const employee = await employeeService.createEmployee(companyId, req.body);
    console.log('✅ [HR] Employee created successfully:', employee.employeeNumber);
    res.status(201).json({ success: true, employee });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    });

    let statusCode = 500;
    let errorMessage = error.message || 'حدث خطأ أثناء إنشاء الموظف';

    // Handle specific error types
    if (error.code === 'CONFLICT') {
      statusCode = 409;
      errorMessage = error.message;
    } else if (error.code === 'VALIDATION_ERROR') {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR',
      errors: error.errors || undefined, // إضافة تفاصيل الأخطاء
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * جلب جميع الموظفين
 * GET /api/hr/employees
 */
async function getEmployees(req, res) {
  try {
    console.log('📋 [HR] getEmployees called, user:', req.user?.id, 'companyId:', req.user?.companyId);
    const { companyId, role } = req.user;

    // عزل البيانات: يجب أن يكون المستخدم مرتبط بشركة (حتى SUPER_ADMIN)
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض الموظفين'
      });
    }

    const result = await employeeService.getEmployees(companyId, req.query);
    console.log('✅ [HR] getEmployees success, count:', result?.employees?.length || 0);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ [HR] Error getting employees:', error.message);
    console.error('❌ [HR] Full error:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الموظفين' });
  }
}

/**
 * جلب موظف بالـ ID
 * GET /api/hr/employees/:id
 */
async function getEmployeeById(req, res) {
  try {
    const { companyId } = req.user;
    const employee = await employeeService.getEmployeeById(companyId, req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    res.json({ success: true, employee });
  } catch (error) {
    console.error('❌ Error getting employee:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الموظف' });
  }
}

/**
 * تحديث موظف
 * PUT /api/hr/employees/:id
 */
async function updateEmployee(req, res) {
  try {
    const { companyId } = req.user;
    const employeeId = req.params.id;
    
    console.log('🔍 [EMPLOYEE-UPDATE] Request received:', {
      companyId,
      employeeId,
      requestBody: req.body,
      baseSalary: req.body.baseSalary,
      baseSalaryType: typeof req.body.baseSalary
    });
    
    const employee = await employeeService.updateEmployee(companyId, employeeId, req.body);
    
    console.log('✅ [EMPLOYEE-UPDATE] Update successful:', {
      employeeId,
      updatedEmployee: {
        id: employee.id,
        baseSalary: employee.baseSalary,
        firstName: employee.firstName,
        lastName: employee.lastName
      }
    });
    
    res.json({ success: true, employee });
  } catch (error) {
    console.error('❌ [EMPLOYEE-UPDATE] Error updating employee:', {
      employeeId: req.params.id,
      companyId: req.user?.companyId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث الموظف' });
  }
}

/**
 * حذف موظف
 * DELETE /api/hr/employees/:id
 */
async function deleteEmployee(req, res) {
  try {
    const { companyId } = req.user;
    await employeeService.deleteEmployee(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف الموظف بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف الموظف' });
  }
}

/**
 * إنهاء خدمة موظف
 * POST /api/hr/employees/:id/terminate
 */
async function terminateEmployee(req, res) {
  try {
    const { companyId } = req.user;
    const employee = await employeeService.terminateEmployee(companyId, req.params.id, req.body);
    res.json({ success: true, employee });
  } catch (error) {
    console.error('❌ Error terminating employee:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنهاء الخدمة' });
  }
}

/**
 * ربط موظف بحساب مستخدم
 * POST /api/hr/employees/:id/link-user
 */
async function linkEmployeeToUser(req, res) {
  try {
    const { companyId } = req.user;
    const { userId } = req.body;
    const employee = await employeeService.linkToUser(companyId, req.params.id, userId);
    res.json({ success: true, employee });
  } catch (error) {
    console.error('❌ Error linking employee to user:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء الربط' });
  }
}

/**
 * الهيكل التنظيمي
 * GET /api/hr/employees/organization-chart
 */
async function getOrganizationChart(req, res) {
  try {
    const { companyId } = req.user;
    const chart = await employeeService.getOrganizationChart(companyId);
    res.json({ success: true, chart });
  } catch (error) {
    console.error('❌ Error getting organization chart:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الهيكل التنظيمي' });
  }
}

/**
 * إحصائيات الموظفين
 * GET /api/hr/employees/stats
 */
async function getEmployeeStats(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: role === 'SUPER_ADMIN'
          ? 'يجب تحديد شركة لعرض إحصائيات الموظفين'
          : 'يجب أن يكون المستخدم مرتبطاً بشركة'
      });
    }

    const stats = await employeeService.getEmployeeStats(companyId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting employee stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⏰ الحضور والانصراف - Attendance
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * تسجيل حضور
 * POST /api/hr/attendance/check-in
 */
async function checkIn(req, res) {
  try {
    const { companyId, id: userId, role } = req.user;
    const { location, method, employeeId } = req.body;

    let targetEmployeeId;

    // If employeeId is provided, check if the user has permission to check in for others
    if (employeeId) {
      const canManageOthers = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(role);
      if (!canManageOthers) {
        return res.status(403).json({
          success: false,
          error: 'ليس لديك صلاحية لتسجيل الحضور لموظف آخر'
        });
      }
      targetEmployeeId = employeeId;
    } else {
      // Regular check-in for the logged-in user
      const employee = await employeeService.getEmployeeByUserId(companyId, userId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'لم يتم العثور على ملف الموظف'
        });
      }
      targetEmployeeId = employee.id;
    }

    const attendance = await attendanceService.checkIn(companyId, targetEmployeeId, {
      location,
      method
    });

    // If it was a manual check-in for self, or any check-in for self, get the employee object for notification
    const employee = employeeId ? await employeeService.getEmployeeById(companyId, targetEmployeeId) : await employeeService.getEmployeeByUserId(companyId, userId);

    // إرسال إشعار WhatsApp
    try {
      if (attendance.lateMinutes > 0) {
        // إرسال إشعار تأخير مع خصم
        console.log('WhatsApp notification temporarily disabled');
      } else {
        // إرسال إشعار تأكيد الحضور
        console.log('WhatsApp notification temporarily disabled');
      }
    } catch (notificationError) {
      console.error('⚠️ Error sending attendance notification:', notificationError);
    }

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('❌ Error checking in:', error);

    // Handle duplicate attendance errors
    if (error.name === 'DuplicateAttendanceError' || error.code === 'P2002' || error.code === 'DUPLICATE_ATTENDANCE' || error.message.includes('duplicate') || error.message.includes('Unique constraint')) {
      return res.status(400).json({
        success: false,
        error: 'تم تسجيل الحضور لهذا اليوم مسبقاً'
      });
    }

    // Handle geofencing errors with detailed data (check geofenceData first)
    if (error.geofenceData) {
      return res.status(403).json({
        success: false,
        error: error.message,
        geofenceData: error.geofenceData
      });
    }

    // Handle other errors
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تسجيل الحضور'
    });
  }
}

/**
 * تسجيل انصراف
 * POST /api/hr/attendance/check-out
 */
async function checkOut(req, res) {
  try {
    const { companyId, id: userId, role } = req.user;
    const { location, method, employeeId } = req.body;

    let targetEmployeeId;

    // If employeeId is provided, check permissions
    if (employeeId) {
      const canManageOthers = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(role);
      if (!canManageOthers) {
        return res.status(403).json({
          success: false,
          error: 'ليس لديك صلاحية لتسجيل الانصراف لموظف آخر'
        });
      }
      targetEmployeeId = employeeId;
    } else {
      const employee = await employeeService.getEmployeeByUserId(companyId, userId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'لم يتم العثور على ملف الموظف'
        });
      }
      targetEmployeeId = employee.id;
    }

    const attendance = await attendanceService.checkOut(companyId, targetEmployeeId, { location, method });

    // إرسال إشعار WhatsApp
    try {
      console.log('WhatsApp notification temporarily disabled');
    } catch (notificationError) {
      console.error('⚠️ Error sending checkout notification:', notificationError);
    }

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('❌ Error checking out:', error);

    // Handle geofencing errors with detailed data (check geofenceData first)
    if (error.geofenceData) {
      return res.status(403).json({
        success: false,
        error: error.message,
        geofenceData: error.geofenceData
      });
    }

    // Handle other errors
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تسجيل الانصراف'
    });
  }
}

/**
 * جلب سجل الحضور
 * GET /api/hr/attendance
 */
async function getAttendance(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId && role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض سجل الحضور'
      });
    }

    const result = await attendanceService.getAttendance(companyId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting attendance:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب سجل الحضور' });
  }
}

/**
 * جلب حضور اليوم
 * GET /api/hr/attendance/today
 */
async function getTodayAttendance(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: role === 'SUPER_ADMIN'
          ? 'يجب تحديد شركة لعرض حضور اليوم'
          : 'يجب أن يكون المستخدم مرتبطاً بشركة'
      });
    }

    const result = await attendanceService.getTodayAttendance(companyId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting today attendance:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب حضور اليوم' });
  }
}

/**
 * تحديث سجل حضور
 * PUT /api/hr/attendance/:id
 */
async function updateAttendance(req, res) {
  try {
    const { companyId } = req.user;
    const attendance = await attendanceService.updateAttendance(companyId, req.params.id, req.body);
    res.json({ success: true, attendance });
  } catch (error) {
    console.error('❌ Error updating attendance:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث السجل' });
  }
}

async function deleteAttendance(req, res, next) {
  try {
    const { companyId } = req.user;
    await attendanceService.deleteAttendance(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف السجل بنجاح' });
  } catch (error) {
    next(error);
  }
}

/**
 * إنشاء سجل حضور يدوي
 * POST /api/hr/attendance/manual
 */
async function createManualAttendance(req, res) {
  try {
    const { companyId } = req.user;

    console.log('📝 [CREATE-MANUAL-ATTENDANCE] Request received');
    console.log('📝 [CREATE-MANUAL-ATTENDANCE] CompanyId:', companyId);
    console.log('📝 [CREATE-MANUAL-ATTENDANCE] Request body:', JSON.stringify(req.body, null, 2));

    if (!companyId) {
      console.log('❌ [CREATE-MANUAL-ATTENDANCE] No companyId');
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لإنشاء سجل حضور'
      });
    }

    if (!req.body.employeeId) {
      console.log('❌ [CREATE-MANUAL-ATTENDANCE] No employeeId');
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الموظف'
      });
    }

    if (!req.body.date) {
      console.log('❌ [CREATE-MANUAL-ATTENDANCE] No date');
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد تاريخ الحضور'
      });
    }

    console.log('✅ [CREATE-MANUAL-ATTENDANCE] Validation passed, calling service...');
    const attendance = await attendanceService.createManualAttendance(companyId, req.body);
    console.log('✅ [CREATE-MANUAL-ATTENDANCE] Success:', attendance.id);
    res.status(201).json({ success: true, attendance });
  } catch (error) {
    console.error('❌ [CREATE-MANUAL-ATTENDANCE] Error:', error);
    console.error('❌ [CREATE-MANUAL-ATTENDANCE] Error message:', error.message);
    console.error('❌ [CREATE-MANUAL-ATTENDANCE] Error stack:', error.stack);

    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء السجل'
    });
  }
}

/**
 * تقرير الحضور الشهري
 * GET /api/hr/attendance/monthly-report
 */
async function getMonthlyAttendanceReport(req, res) {
  try {
    const { companyId } = req.user;
    const { year, month, employeeId } = req.query;
    const report = await attendanceService.getMonthlyReport(
      companyId,
      parseInt(year),
      parseInt(month),
      employeeId
    );
    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error getting monthly report:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقرير' });
  }
}

/**
 * إحصائيات الحضور
 * GET /api/hr/attendance/stats
 */
async function getAttendanceStats(req, res) {
  try {
    const { companyId } = req.user;
    const { startDate, endDate } = req.query;
    const stats = await attendanceService.getAttendanceStats(companyId, startDate, endDate);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting attendance stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

/**
 * تصدير سجل الحضور
 * GET /api/hr/attendance/export
 */
async function exportAttendance(req, res) {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, status, employeeId } = req.query;

    const buffer = await attendanceService.exportAttendance(companyId, {
      startDate,
      endDate,
      status,
      employeeId
    });

    // إعداد headers للتنزيل
    const filename = `attendance-${startDate || 'all'}${endDate ? '-to-' + endDate : ''}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('❌ Error exporting attendance:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تصدير سجل الحضور' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏖️ الإجازات - Leaves
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء طلب إجازة
 * POST /api/hr/leaves
 */
async function createLeaveRequest(req, res) {
  try {
    console.log('🚀 [HR] createLeaveRequest START');
    console.log('   User:', JSON.stringify(req.user)); // Log the full user object
    console.log('   Body:', JSON.stringify(req.body)); // Log the full body

    const { companyId, id: userId } = req.user;
    let { employeeId } = req.body;

    // If employeeId is not provided (e.g. self-service), resolve from userId
    console.log(`   Initial EmployeeID: ${employeeId}, UserID: ${userId}`);

    if (!employeeId) {
      console.log('   Resolving employee from userId...');
      const employee = await employeeService.getEmployeeByUserId(companyId, userId);

      if (!employee) {
        console.error('❌ Employee resolution failed for self-service request.');
        return res.status(404).json({ error: 'لم يتم العثور على ملف الموظف الخاص بك' });
      }

      employeeId = employee.id;
      console.log(`   Resolved EmployeeID: ${employeeId}`);
    }

    console.log(`🔍 [HR] Creating leave request for Employee ID: ${employeeId}`);
    const leave = await leaveService.createLeaveRequest(companyId, employeeId, req.body);
    res.status(201).json({ success: true, leave });
  } catch (error) {
    console.error('❌ Error creating leave request:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إنشاء الطلب'
    });
  }
}

/**
 * جلب طلبات الإجازات
 * GET /api/hr/leaves
 */
async function getLeaveRequests(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId && role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض طلبات الإجازات'
      });
    }

    const result = await leaveService.getLeaveRequests(companyId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting leave requests:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الطلبات' });
  }
}

/**
 * جلب طلب إجازة بالـ ID
 * GET /api/hr/leaves/:id
 */
async function getLeaveRequestById(req, res) {
  try {
    const { companyId, id: userId, role } = req.user;
    const leave = await leaveService.getLeaveRequestById(companyId, req.params.id);

    if (!leave) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    // Security Check: User must be the owner OR have a management role
    const isOwner = leave.userId === userId;
    const canManageOthers = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(role);

    if (!isOwner && !canManageOthers) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لمشاهدة هذا الطلب'
      });
    }

    res.json({ success: true, leave });
  } catch (error) {
    console.error('❌ Error getting leave request:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الطلب' });
  }
}

/**
 * الموافقة على طلب إجازة
 * POST /api/hr/leaves/:id/approve
 */
async function approveLeaveRequest(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن يكون المستخدم مرتبطاً بشركة للموافقة على طلبات الإجازات'
      });
    }

    // Resolve employeeId from userId for the approver
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على ملف الموظف الخاص بك لاتخاذ هذا الإجراء' });
    }

    console.log(`🔍 [HR-CONTROLLER] Approving leave request ${req.params.id}`);
    console.log(`👤 [HR-CONTROLLER] User: ${req.user.email}, Role: ${req.user.role}, UserId: ${userId}`);
    console.log(`👔 [HR-CONTROLLER] Employee: ${employee.id}, Name: ${employee.firstName} ${employee.lastName}`);

    const leave = await leaveService.approveLeaveRequest(companyId, req.params.id, employee.id, userId);
    res.json({ success: true, leave });
  } catch (error) {
    console.error('❌ Error approving leave request:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء الموافقة',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * رفض طلب إجازة
 * POST /api/hr/leaves/:id/reject
 */
async function rejectLeaveRequest(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { reason } = req.body;

    // Resolve employeeId from userId for the rejector
    const employee = await employeeService.getEmployeeByUserId(companyId, userId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على ملف الموظف الخاص بك لاتخاذ هذا الإجراء' });
    }

    const leave = await leaveService.rejectLeaveRequest(companyId, req.params.id, employee.id, reason);
    res.json({ success: true, leave });
  } catch (error) {
    console.error('❌ Error rejecting leave request:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء الرفض'
    });
  }
}

/**
 * إلغاء طلب إجازة
 * POST /api/hr/leaves/:id/cancel
 */
async function cancelLeaveRequest(req, res) {
  try {
    const { companyId, id: userId, role } = req.user;
    const { id } = req.params;

    // Fetch the request first to check ownership
    const leave = await leaveService.getLeaveRequestById(companyId, id);
    if (!leave) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    // Security Check: User must be the owner OR have a management role
    const isOwner = leave.userId === userId;
    const canManageOthers = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(role);

    if (!isOwner && !canManageOthers) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لإلغاء هذا الطلب'
      });
    }

    const cancelledLeave = await leaveService.cancelLeaveRequest(companyId, id, leave.userId);
    res.json({ success: true, leave: cancelledLeave });
  } catch (error) {
    console.error('❌ Error cancelling leave request:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء الإلغاء' });
  }
}

/**
 * جلب رصيد الإجازات
 * GET /api/hr/leaves/balance/:employeeId
 */
async function getLeaveBalance(req, res) {
  try {
    const { companyId, id: userId, role } = req.user;
    const { employeeId } = req.params;

    // Resolve current user's employee ID to check ownership
    const currentUserEmployee = await employeeService.getEmployeeByUserId(companyId, userId);

    // Security Check: User must be checking their own balance OR have management role
    const isOwner = currentUserEmployee && currentUserEmployee.id === employeeId;
    const canManageOthers = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(role);

    if (!isOwner && !canManageOthers) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لمشاهدة رصيد إجازات هذا الموظف'
      });
    }

    const balance = await leaveService.getLeaveBalance(companyId, employeeId);
    res.json({ success: true, balance });
  } catch (error) {
    console.error('❌ Error getting leave balance:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الرصيد' });
  }
}

/**
 * تقويم الإجازات
 * GET /api/hr/leaves/calendar
 */
async function getLeaveCalendar(req, res) {
  try {
    const { companyId } = req.user;
    const { year, month } = req.query;
    const calendar = await leaveService.getLeaveCalendar(companyId, parseInt(year), parseInt(month));
    res.json({ success: true, calendar });
  } catch (error) {
    console.error('❌ Error getting leave calendar:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقويم' });
  }
}

/**
 * إحصائيات الإجازات
 * GET /api/hr/leaves/stats
 */
async function getLeaveStats(req, res) {
  try {
    const { companyId } = req.user;
    const { year } = req.query;
    const stats = await leaveService.getLeaveStats(companyId, parseInt(year) || new Date().getFullYear());
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting leave stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 الرواتب - Payroll
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء كشف راتب
 * POST /api/hr/payroll
 */
async function createPayroll(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.body;
    const payroll = await payrollService.createPayroll(companyId, employeeId, req.body);
    res.status(201).json({ success: true, payroll });
  } catch (error) {
    console.error('❌ Error creating payroll:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء كشف الراتب' });
  }
}

/**
 * توليد كشوف رواتب لجميع الموظفين
 * POST /api/hr/payroll/generate
 */
async function generateMonthlyPayroll(req, res) {
  try {
    const { companyId } = req.user;
    const { month, year, forceRegenerate } = req.body;
    const result = await payrollService.generateMonthlyPayroll(companyId, month, year, forceRegenerate === true);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error generating payroll:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء توليد كشوف الرواتب' });
  }
}

/**
 * جلب كشوف الرواتب
 * GET /api/hr/payroll
 */
async function getPayrolls(req, res) {
  try {
    const { companyId } = req.user;
    const result = await payrollService.getPayrolls(companyId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting payrolls:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب كشوف الرواتب' });
  }
}

/**
 * جلب كشف راتب بالـ ID
 * GET /api/hr/payroll/:id
 */
async function getPayrollById(req, res) {
  try {
    const { companyId } = req.user;
    const payroll = await payrollService.getPayrollById(companyId, req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: 'كشف الراتب غير موجود' });
    }
    res.json({ success: true, payroll });
  } catch (error) {
    console.error('❌ Error getting payroll:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب كشف الراتب' });
  }
}

/**
 * تحديث كشف راتب
 * PUT /api/hr/payroll/:id
 */
async function updatePayroll(req, res) {
  try {
    const { companyId } = req.user;
    const payroll = await payrollService.updatePayroll(companyId, req.params.id, req.body);
    res.json({ success: true, payroll });
  } catch (error) {
    console.error('❌ Error updating payroll:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث كشف الراتب' });
  }
}

/**
 * اعتماد كشف راتب
 * POST /api/hr/payroll/:id/approve
 */
async function approvePayroll(req, res) {
  try {
    const { companyId } = req.user;
    const payroll = await payrollService.approvePayroll(companyId, req.params.id);
    res.json({ success: true, payroll });
  } catch (error) {
    console.error('❌ Error approving payroll:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء الاعتماد' });
  }
}

/**
 * صرف الراتب
 * POST /api/hr/payroll/:id/pay
 */
async function markPayrollAsPaid(req, res) {
  try {
    const { companyId } = req.user;
    const payroll = await payrollService.markAsPaid(companyId, req.params.id, req.body);
    res.json({ success: true, payroll });
  } catch (error) {
    console.error('❌ Error marking payroll as paid:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء الصرف' });
  }
}

/**
 * صرف رواتب متعددة
 * POST /api/hr/payroll/bulk-pay
 */
async function bulkMarkPayrollAsPaid(req, res) {
  try {
    const { companyId } = req.user;
    const { payrollIds, paymentData } = req.body;
    const result = await payrollService.bulkMarkAsPaid(companyId, payrollIds, paymentData);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error bulk marking payrolls as paid:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء الصرف' });
  }
}

/**
 * حذف كشف راتب
 * DELETE /api/hr/payroll/:id
 */
async function deletePayroll(req, res) {
  try {
    const { companyId } = req.user;
    await payrollService.deletePayroll(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف كشف الراتب بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting payroll:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء الحذف' });
  }
}

/**
 * ملخص الرواتب الشهري
 * GET /api/hr/payroll/summary
 */
async function getPayrollSummary(req, res) {
  try {
    const { companyId } = req.user;
    const { month, year } = req.query;
    const summary = await payrollService.getPayrollSummary(companyId, parseInt(month), parseInt(year));
    res.json({ success: true, summary });
  } catch (error) {
    console.error('❌ Error getting payroll summary:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الملخص' });
  }
}

/**
 * تقرير الرواتب السنوي
 * GET /api/hr/payroll/annual-report
 */
async function getAnnualPayrollReport(req, res) {
  try {
    const { companyId } = req.user;
    const { year, employeeId } = req.query;
    const report = await payrollService.getAnnualReport(companyId, parseInt(year), employeeId);
    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error getting annual report:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقرير' });
  }
}

/**
 * تقرير الحضور الشهري للتقارير
 * GET /api/hr/reports/attendance
 */
async function getAttendanceReport(req, res) {
  try {
    const { companyId } = req.user;
    const { month, year, departmentId } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الشهر والسنة'
      });
    }

    const report = await attendanceService.getMonthlyReport(
      companyId,
      parseInt(year),
      parseInt(month),
      null // employeeId - null for all employees
    );

    // فلترة حسب القسم إذا تم التحديد
    let filteredReport = report;
    if (departmentId && report.employeeStats) {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      const prisma = getSharedPrismaClient();

      // جلب موظفي القسم
      const departmentEmployees = await prisma.employee.findMany({
        where: { companyId, departmentId },
        select: { id: true }
      });

      const employeeIds = departmentEmployees.map(e => e.id);

      // فلترة النتائج
      filteredReport = {
        ...report,
        employeeStats: Object.fromEntries(
          Object.entries(report.employeeStats).filter(([empId]) =>
            employeeIds.includes(empId)
          )
        )
      };
    }

    res.json({ success: true, report: filteredReport });
  } catch (error) {
    console.error('❌ Error getting attendance report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب تقرير الحضور'
    });
  }
}

/**
 * تقرير الإجازات الشهري للتقارير
 * GET /api/hr/reports/leaves
 */
async function getLeaveReport(req, res) {
  try {
    const { companyId } = req.user;
    const { month, year, departmentId } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الشهر والسنة'
      });
    }

    // جلب جميع طلبات الإجازات للشهر المحدد
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // جلب جميع طلبات الإجازات بدون pagination
    const result = await leaveService.getLeaveRequests(companyId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 10000 // عدد كبير لجلب كل الطلبات
    });

    let requests = result.leaveRequests || [];

    // فلترة حسب القسم إذا تم التحديد
    if (departmentId) {
      requests = requests.filter(req =>
        req.employee?.department?.id === departmentId
      );
    }

    const report = {
      month: parseInt(month),
      year: parseInt(year),
      totalRequests: requests.length,
      approved: requests.filter(l => l.status === 'APPROVED').length,
      pending: requests.filter(l => l.status === 'PENDING').length,
      rejected: requests.filter(l => l.status === 'REJECTED').length,
      byType: {},
      byDepartment: {},
      requests: requests
    };

    // حساب حسب النوع
    requests.forEach(leave => {
      report.byType[leave.type] = (report.byType[leave.type] || 0) + 1;
    });

    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error getting leave report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب تقرير الإجازات'
    });
  }
}

/**
 * تقرير الرواتب الشهري للتقارير
 * GET /api/hr/reports/payroll
 */
async function getPayrollReport(req, res) {
  try {
    const { companyId } = req.user;
    const { month, year, departmentId } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الشهر والسنة'
      });
    }

    // استخدام getAnnualReport مع فلترة شهرية
    const payrolls = await payrollService.getPayrolls(companyId, {
      month: parseInt(month),
      year: parseInt(year),
      departmentId
    });

    const report = {
      month: parseInt(month),
      year: parseInt(year),
      totalEmployees: payrolls.payrolls?.length || 0,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      byDepartment: {},
      payrolls: payrolls.payrolls || []
    };

    // حساب الإجماليات
    if (payrolls.payrolls) {
      payrolls.payrolls.forEach(payroll => {
        report.totalGross += parseFloat(payroll.grossSalary || 0);
        report.totalDeductions += parseFloat(payroll.totalDeductions || 0);
        report.totalNet += parseFloat(payroll.netSalary || 0);
      });
    }

    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error getting payroll report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب تقرير الرواتب'
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 المزامنة - Sync
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مزامنة المستخدمين مع الموظفين
 * POST /api/v1/hr/sync-users
 */
async function syncUsersToEmployees(req, res) {
  try {
    console.log('🔄 [HR] Starting user sync for company:', req.user?.companyId);
    const { companyId } = req.user;

    // جلب جميع المستخدمين في الشركة
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true
      }
    });

    console.log('👥 [HR] Found users:', users.length);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // تحقق من وجود employee record
      const existingEmployee = await prisma.employee.findFirst({
        where: { userId: user.id }
      });

      if (!existingEmployee) {
        // إنشاء employee record جديد
        const employeeCount = await prisma.employee.count({ where: { companyId } });
        const employeeNumber = `EMP${String(employeeCount + 1).padStart(5, '0')}`;

        await prisma.employee.create({
          data: {
            companyId,
            userId: user.id,
            employeeNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            hireDate: user.createdAt, // استخدام تاريخ إنشاء الحساب كتاريخ التعيين
            status: 'ACTIVE'
          }
        });

        syncedCount++;
        console.log('✅ [HR] Synced user:', user.email);
      } else {
        skippedCount++;
      }
    }

    console.log('🎉 [HR] Sync completed. Synced:', syncedCount, 'Skipped:', skippedCount);

    res.json({
      success: true,
      message: `تم مزامنة ${syncedCount} مستخدم، تم تخطي ${skippedCount} مستخدم موجود مسبقاً`,
      synced: syncedCount,
      skipped: skippedCount,
      total: users.length
    });
  } catch (error) {
    console.error('❌ [HR] Error syncing users:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء مزامنة المستخدمين', details: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 لوحة التحكم - Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * لوحة تحكم HR
 * GET /api/hr/dashboard
 */
async function getHRDashboard(req, res) {
  try {
    const { companyId, role } = req.user;

    // التحقق من وجود companyId (مطلوب حتى لـ SUPER_ADMIN في HR)
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: role === 'SUPER_ADMIN'
          ? 'يجب تحديد شركة لعرض لوحة تحكم الموارد البشرية'
          : 'يجب أن يكون المستخدم مرتبطاً بشركة'
      });
    }

    const [
      employeeStats,
      todayAttendance,
      pendingLeaves,
      departmentStats
    ] = await Promise.all([
      employeeService.getEmployeeStats(companyId),
      attendanceService.getTodayAttendance(companyId),
      leaveService.getLeaveRequests(companyId, { status: 'PENDING', limit: 5 }),
      departmentService.getDepartmentStats(companyId)
    ]);

    res.json({
      success: true,
      dashboard: {
        employees: employeeStats,
        attendance: todayAttendance,
        pendingLeaves: pendingLeaves.requests,
        departments: departmentStats
      }
    });
  } catch (error) {
    console.error('❌ Error getting HR dashboard:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب لوحة التحكم' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 التدريب - Training
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء سجل تدريب جديد
 * POST /api/hr/trainings
 */
async function createTraining(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.body;
    const training = await trainingService.createTraining(companyId, employeeId, req.body);
    res.status(201).json({ success: true, training });
  } catch (error) {
    console.error('❌ Error creating training:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء سجل التدريب' });
  }
}

/**
 * جلب سجلات التدريب لموظف
 * GET /api/hr/trainings/employee/:employeeId
 */
async function getEmployeeTrainings(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    const { status, limit } = req.query;
    const trainings = await trainingService.getEmployeeTrainings(companyId, employeeId, { status, limit });
    res.json({ success: true, trainings });
  } catch (error) {
    console.error('❌ Error getting trainings:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب سجلات التدريب' });
  }
}

/**
 * جلب جميع سجلات التدريب للشركة
 * GET /api/hr/trainings
 */
async function getTrainings(req, res) {
  try {
    const { companyId } = req.user;
    const { status, limit } = req.query;
    const trainings = await trainingService.getTrainings(companyId, { status, limit });
    res.json({ success: true, trainings });
  } catch (error) {
    console.error('❌ Error getting trainings:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب سجلات التدريب' });
  }
}

/**
 * جلب سجل تدريب بالـ ID
 * GET /api/hr/trainings/:id
 */
async function getTrainingById(req, res) {
  try {
    const { companyId } = req.user;
    const training = await trainingService.getTrainingById(companyId, req.params.id);
    res.json({ success: true, training });
  } catch (error) {
    console.error('❌ Error getting training:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب سجل التدريب' });
  }
}

/**
 * تحديث سجل تدريب
 * PUT /api/hr/trainings/:id
 */
async function updateTraining(req, res) {
  try {
    const { companyId } = req.user;
    const training = await trainingService.updateTraining(companyId, req.params.id, req.body);
    res.json({ success: true, training });
  } catch (error) {
    console.error('❌ Error updating training:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث سجل التدريب' });
  }
}

/**
 * حذف سجل تدريب
 * DELETE /api/hr/trainings/:id
 */
async function deleteTraining(req, res) {
  try {
    const { companyId } = req.user;
    await trainingService.deleteTraining(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف سجل التدريب بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting training:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف سجل التدريب' });
  }
}

/**
 * إحصائيات التدريب
 * GET /api/hr/trainings/stats
 */
async function getTrainingStats(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, year } = req.query;
    const stats = await trainingService.getTrainingStats(companyId, { employeeId, year });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting training stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ الإنذارات - Warnings
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء إنذار جديد
 * POST /api/hr/warnings
 */
async function createWarning(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { employeeId } = req.body;

    // issuedBy is a String field (not a foreign key), so we can use the userId directly
    // or get the user's name. For now, using userId as it's simpler and consistent
    const issuedBy = userId;

    // Add issuedBy to data
    const warningData = { ...req.body, issuedBy };

    const warning = await warningService.createWarning(companyId, employeeId, warningData);
    res.status(201).json({ success: true, warning });
  } catch (error) {
    console.error('❌ Error creating warning:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء الإنذار' });
  }
}

/**
 * جلب جميع الإنذارات
 * GET /api/hr/warnings
 */
async function getWarnings(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId && role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض الإنذارات'
      });
    }

    const { limit, offset } = req.query;
    const warnings = await warningService.getWarnings(companyId, { limit, offset });
    res.json({ success: true, warnings });
  } catch (error) {
    console.error('❌ Error getting all warnings:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الإنذارات' });
  }
}

/**
 * جلب إنذارات موظف
 * GET /api/hr/warnings/employee/:employeeId
 */
async function getEmployeeWarnings(req, res) {
  try {
    const { companyId, role } = req.user;

    if (!companyId && role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يكون المستخدم مرتبطاً بشركة لعرض إنذارات الموظف'
      });
    }

    const { employeeId } = req.params;
    const { type, severity, limit } = req.query;
    const warnings = await warningService.getEmployeeWarnings(companyId, employeeId, { type, severity, limit });
    res.json({ success: true, warnings });
  } catch (error) {
    console.error('❌ Error getting warnings:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الإنذارات' });
  }
}

/**
 * جلب إنذار بالـ ID
 * GET /api/hr/warnings/:id
 */
async function getWarningById(req, res) {
  try {
    const { companyId } = req.user;
    const warning = await warningService.getWarningById(companyId, req.params.id);
    res.json({ success: true, warning });
  } catch (error) {
    console.error('❌ Error getting warning:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الإنذار' });
  }
}

/**
 * تحديث إنذار
 * PUT /api/hr/warnings/:id
 */
async function updateWarning(req, res) {
  try {
    const { companyId } = req.user;
    const warning = await warningService.updateWarning(companyId, req.params.id, req.body);
    res.json({ success: true, warning });
  } catch (error) {
    console.error('❌ Error updating warning:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث الإنذار' });
  }
}

/**
 * تسجيل اعتراف الموظف بالإنذار
 * POST /api/hr/warnings/:id/acknowledge
 */
async function acknowledgeWarning(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeResponse } = req.body;
    const warning = await warningService.acknowledgeWarning(companyId, req.params.id, employeeResponse);
    res.json({ success: true, warning });
  } catch (error) {
    console.error('❌ Error acknowledging warning:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تسجيل الاعتراف' });
  }
}

/**
 * حذف إنذار
 * DELETE /api/hr/warnings/:id
 */
async function deleteWarning(req, res) {
  try {
    const { companyId } = req.user;
    await warningService.deleteWarning(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف الإنذار بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting warning:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف الإنذار' });
  }
}

/**
 * إحصائيات الإنذارات
 * GET /api/hr/warnings/stats
 */
async function getWarningStats(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, year } = req.query;
    const stats = await warningService.getWarningStats(companyId, { employeeId, year });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting warning stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 تقييم الأداء - Performance Reviews
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء تقييم أداء جديد
 * POST /api/hr/performance-reviews
 */
async function createPerformanceReview(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.body;
    const review = await performanceService.createPerformanceReview(companyId, employeeId, req.body);
    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('❌ Error creating performance review:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء التقييم' });
  }
}

/**
 * جلب جميع تقييمات الأداء للشركة
 * GET /api/hr/performance-reviews
 */
async function getPerformanceReviews(req, res) {
  try {
    const { companyId } = req.user;
    const { status, employeeId, limit } = req.query;
    const reviews = await performanceService.getPerformanceReviews(companyId, { status, employeeId, limit });
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('❌ Error getting performance reviews:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقييمات' });
  }
}

/**
 * جلب تقييمات أداء موظف
 * GET /api/hr/performance-reviews/employee/:employeeId
 */
async function getEmployeeReviews(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    const { status, limit } = req.query;
    const reviews = await performanceService.getEmployeeReviews(companyId, employeeId, { status, limit });
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('❌ Error getting performance reviews:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقييمات' });
  }
}

/**
 * جلب تقييم أداء بالـ ID
 * GET /api/hr/performance-reviews/:id
 */
async function getReviewById(req, res) {
  try {
    const { companyId } = req.user;
    const review = await performanceService.getReviewById(companyId, req.params.id);
    res.json({ success: true, review });
  } catch (error) {
    console.error('❌ Error getting performance review:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب التقييم' });
  }
}

/**
 * تحديث تقييم أداء
 * PUT /api/hr/performance-reviews/:id
 */
async function updateReview(req, res) {
  try {
    const { companyId } = req.user;
    const review = await performanceService.updateReview(companyId, req.params.id, req.body);
    res.json({ success: true, review });
  } catch (error) {
    console.error('❌ Error updating performance review:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث التقييم' });
  }
}

/**
 * حذف تقييم أداء
 * DELETE /api/hr/performance-reviews/:id
 */
async function deleteReview(req, res) {
  try {
    const { companyId } = req.user;
    await performanceService.deleteReview(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف التقييم بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting performance review:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف التقييم' });
  }
}

/**
 * إحصائيات التقييمات
 * GET /api/hr/performance-reviews/stats
 */
async function getPerformanceStats(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, year } = req.query;
    const stats = await performanceService.getPerformanceStats(companyId, { employeeId, year });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting performance stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💵 سجل الرواتب - Salary History
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب سجل الرواتب لموظف
 * GET /api/hr/salary-history/employee/:employeeId
 */
async function getEmployeeSalaryHistory(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    const { limit } = req.query;
    const history = await salaryHistoryService.getEmployeeSalaryHistory(companyId, employeeId, { limit });
    res.json({ success: true, history });
  } catch (error) {
    console.error('❌ Error getting salary history:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل الرواتب' });
  }
}

/**
 * جلب سجل راتب بالـ ID
 * GET /api/hr/salary-history/:id
 */
async function getSalaryHistoryById(req, res) {
  try {
    const { companyId } = req.user;
    const history = await salaryHistoryService.getSalaryHistoryById(companyId, req.params.id);
    res.json({ success: true, history });
  } catch (error) {
    console.error('❌ Error getting salary history:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب السجل' });
  }
}

/**
 * إنشاء سجل راتب جديد
 * POST /api/hr/salary-history
 */
async function createSalaryHistory(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.body;
    const history = await salaryHistoryService.createSalaryHistory(companyId, employeeId, req.body);
    res.status(201).json({ success: true, history });
  } catch (error) {
    console.error('❌ Error creating salary history:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء السجل' });
  }
}

/**
 * إحصائيات سجل الرواتب
 * GET /api/hr/salary-history/stats
 */
async function getSalaryHistoryStats(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.query;
    const stats = await salaryHistoryService.getSalaryHistoryStats(companyId, employeeId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting salary history stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

/**
 * تقرير الترقيات والزيادات
 * GET /api/hr/salary-history/promotions-report
 */
async function getPromotionsReport(req, res) {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, changeType } = req.query;
    const report = await salaryHistoryService.getPromotionsReport(companyId, { startDate, endDate, changeType });
    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error getting promotions report:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقرير' });
  }
}

/**
 * جلب سجل الرواتب للشركة (كل الموظفين)
 * GET /api/hr/salary-history
 */
async function getSalaryHistory(req, res) {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId } = req.user;
    const { employeeId, startDate, endDate, limit = 50, page = 1 } = req.query;

    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (parseInt(page, 10) > 1 ? (parseInt(page, 10) - 1) : 0) * take;

    const where = { companyId };
    if (employeeId) where.userId = employeeId;
    if (startDate || endDate) {
      where.effectiveDate = {};
      if (startDate) where.effectiveDate.gte = new Date(startDate);
      if (endDate) where.effectiveDate.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      prisma.salaryHistory.findMany({
        where,
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        take,
        skip
      }),
      prisma.salaryHistory.count({ where })
    ]);

    const userIds = Array.from(new Set(items.map(i => i.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, companyId },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true }
    });
    const usersById = new Map(users.map(u => [u.id, u]));

    const history = items.map(i => ({
      ...i,
      employee: usersById.get(i.userId) || null
    }));

    res.json({
      success: true,
      history,
      pagination: {
        total,
        page: parseInt(page, 10) || 1,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ Error getting company salary history:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب سجل الرواتب' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 المستندات - Documents
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء مستند جديد
 * POST /api/hr/documents
 */
async function createDocument(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, name, type, expiryDate, notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'الملف مطلوب' });
    }

    const fileUrl = `/uploads/hr/documents/${req.file.filename}`;
    const document = await documentService.createDocument(companyId, employeeId, {
      name,
      type,
      fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      expiryDate,
      notes
    });

    res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('❌ Error creating document:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء المستند' });
  }
}

/**
 * جلب مستندات موظف
 * GET /api/hr/documents/employee/:employeeId
 */
async function getEmployeeDocuments(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    const { type, expiredOnly } = req.query;
    const documents = await documentService.getEmployeeDocuments(companyId, employeeId, { type, expiredOnly: expiredOnly === 'true' });
    res.json({ success: true, documents });
  } catch (error) {
    console.error('❌ Error getting documents:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المستندات' });
  }
}

/**
 * جلب مستند بالـ ID
 * GET /api/hr/documents/:id
 */
async function getDocumentById(req, res) {
  try {
    const { companyId } = req.user;
    const document = await documentService.getDocumentById(companyId, req.params.id);
    res.json({ success: true, document });
  } catch (error) {
    console.error('❌ Error getting document:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب المستند' });
  }
}

/**
 * تحديث مستند
 * PUT /api/hr/documents/:id
 */
async function updateDocument(req, res) {
  try {
    const { companyId } = req.user;
    const document = await documentService.updateDocument(companyId, req.params.id, req.body);
    res.json({ success: true, document });
  } catch (error) {
    console.error('❌ Error updating document:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث المستند' });
  }
}

/**
 * التحقق من مستند
 * POST /api/hr/documents/:id/verify
 */
async function verifyDocument(req, res) {
  try {
    const { companyId, id: verifiedBy } = req.user;
    const document = await documentService.verifyDocument(companyId, req.params.id, verifiedBy);
    res.json({ success: true, document });
  } catch (error) {
    console.error('❌ Error verifying document:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء التحقق من المستند' });
  }
}

/**
 * حذف مستند
 * DELETE /api/hr/documents/:id
 */
async function deleteDocument(req, res) {
  try {
    const { companyId } = req.user;
    await documentService.deleteDocument(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف المستند بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف المستند' });
  }
}

/**
 * جلب المستندات المنتهية
 * GET /api/hr/documents/expired
 */
async function getExpiredDocuments(req, res) {
  try {
    const { companyId } = req.user;
    const { daysBeforeExpiry } = req.query;
    const documents = await documentService.getExpiredDocuments(companyId, parseInt(daysBeforeExpiry) || 30);
    res.json({ success: true, documents });
  } catch (error) {
    console.error('❌ Error getting expired documents:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المستندات المنتهية' });
  }
}

/**
 * إحصائيات المستندات
 * GET /api/hr/documents/stats
 */
async function getDocumentStats(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.query;
    const stats = await documentService.getDocumentStats(companyId, employeeId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting document stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🕐 المناوبات - Shifts
// ═══════════════════════════════════════════════════════════════════════════════

async function createShift(req, res) {
  try {
    const { companyId } = req.user;
    const shift = await shiftService.createShift(companyId, req.body);
    res.status(201).json({ success: true, shift });
  } catch (error) {
    console.error('❌ Error creating shift:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء المناوبة' });
  }
}

async function getShifts(req, res) {
  try {
    const { companyId } = req.user;
    const { includeInactive } = req.query;
    const shifts = await shiftService.getShifts(companyId, { includeInactive: includeInactive === 'true' });
    res.json({ success: true, shifts });
  } catch (error) {
    console.error('❌ Error getting shifts:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المناوبات' });
  }
}

async function getShiftById(req, res) {
  try {
    const { companyId } = req.user;
    const shift = await shiftService.getShiftById(companyId, req.params.id);
    res.json({ success: true, shift });
  } catch (error) {
    console.error('❌ Error getting shift:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب المناوبة' });
  }
}

async function updateShift(req, res) {
  try {
    const { companyId } = req.user;
    const shift = await shiftService.updateShift(companyId, req.params.id, req.body);
    res.json({ success: true, shift });
  } catch (error) {
    console.error('❌ Error updating shift:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث المناوبة' });
  }
}

async function deleteShift(req, res) {
  try {
    const { companyId } = req.user;
    await shiftService.deleteShift(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف المناوبة بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting shift:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف المناوبة' });
  }
}

async function assignShift(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, shiftId, date } = req.body;
    const assignment = await shiftService.assignShift(companyId, employeeId, shiftId, date);
    res.status(201).json({ success: true, assignment });
  } catch (error) {
    console.error('❌ Error assigning shift:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تعيين المناوبة' });
  }
}

async function bulkAssignShift(req, res) {
  try {
    const { companyId } = req.user;
    const { shiftId, employeeIds, dates } = req.body;
    const results = await shiftService.bulkAssignShift(companyId, shiftId, employeeIds, dates);
    res.status(201).json({ success: true, results });
  } catch (error) {
    console.error('❌ Error bulk assigning shift:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء التعيين الجماعي للمناوبة' });
  }
}

async function getEmployeeAssignments(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    const assignments = await shiftService.getEmployeeAssignments(companyId, employeeId, { startDate, endDate });
    res.json({ success: true, assignments });
  } catch (error) {
    console.error('❌ Error getting assignments:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التعيينات' });
  }
}

async function removeAssignment(req, res) {
  try {
    const { companyId } = req.user;
    await shiftService.removeAssignment(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف التعيين بنجاح' });
  } catch (error) {
    console.error('❌ Error removing assignment:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف التعيين' });
  }
}

async function getShiftStats(req, res) {
  try {
    const { companyId } = req.user;
    const { startDate, endDate } = req.query;
    const stats = await shiftService.getShiftStats(companyId, { startDate, endDate });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting shift stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💎 المزايا - Benefits
// ═══════════════════════════════════════════════════════════════════════════════

async function createBenefit(req, res) {
  try {
    const { companyId } = req.user;
    const benefit = await benefitService.createBenefit(companyId, req.body);
    res.status(201).json({ success: true, benefit });
  } catch (error) {
    console.error('❌ Error creating benefit:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء الميزة' });
  }
}

async function getBenefits(req, res) {
  try {
    const { companyId } = req.user;
    const { includeInactive } = req.query;
    const benefits = await benefitService.getBenefits(companyId, { includeInactive: includeInactive === 'true' });
    res.json({ success: true, benefits });
  } catch (error) {
    console.error('❌ Error getting benefits:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المزايا' });
  }
}

async function getBenefitById(req, res) {
  try {
    const { companyId } = req.user;
    const benefit = await benefitService.getBenefitById(companyId, req.params.id);
    res.json({ success: true, benefit });
  } catch (error) {
    console.error('❌ Error getting benefit:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الميزة' });
  }
}

async function updateBenefit(req, res) {
  try {
    const { companyId } = req.user;
    const benefit = await benefitService.updateBenefit(companyId, req.params.id, req.body);
    res.json({ success: true, benefit });
  } catch (error) {
    console.error('❌ Error updating benefit:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث الميزة' });
  }
}

async function deleteBenefit(req, res) {
  try {
    const { companyId } = req.user;
    await benefitService.deleteBenefit(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف الميزة بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting benefit:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف الميزة' });
  }
}

async function enrollEmployee(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, benefitId } = req.body;
    const enrollment = await benefitService.enrollEmployee(companyId, employeeId, benefitId, req.body);
    res.status(201).json({ success: true, enrollment });
  } catch (error) {
    console.error('❌ Error enrolling employee:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء الاشتراك' });
  }
}

async function getEmployeeEnrollments(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    const enrollments = await benefitService.getEmployeeEnrollments(companyId, employeeId);
    res.json({ success: true, enrollments });
  } catch (error) {
    console.error('❌ Error getting enrollments:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الاشتراكات' });
  }
}

async function updateEnrollment(req, res) {
  try {
    const { companyId } = req.user;
    const enrollment = await benefitService.updateEnrollment(companyId, req.params.id, req.body);
    res.json({ success: true, enrollment });
  } catch (error) {
    console.error('❌ Error updating enrollment:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث الاشتراك' });
  }
}

async function getBenefitStats(req, res) {
  try {
    const { companyId } = req.user;
    const stats = await benefitService.getBenefitStats(companyId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting benefit stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 الأهداف - Goals
// ═══════════════════════════════════════════════════════════════════════════════

async function createGoal(req, res) {
  try {
    const { companyId } = req.user;
    const goal = await goalService.createGoal(companyId, req.body);
    res.status(201).json({ success: true, goal });
  } catch (error) {
    console.error('❌ Error creating goal:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء الهدف' });
  }
}

async function getGoals(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, departmentId, status } = req.query;
    const goals = await goalService.getGoals(companyId, { employeeId, departmentId, status });
    res.json({ success: true, goals });
  } catch (error) {
    console.error('❌ Error getting goals:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الأهداف' });
  }
}

async function getGoalById(req, res) {
  try {
    const { companyId } = req.user;
    const goal = await goalService.getGoalById(companyId, req.params.id);
    res.json({ success: true, goal });
  } catch (error) {
    console.error('❌ Error getting goal:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الهدف' });
  }
}

async function updateGoal(req, res) {
  try {
    const { companyId } = req.user;
    const goal = await goalService.updateGoal(companyId, req.params.id, req.body);
    res.json({ success: true, goal });
  } catch (error) {
    console.error('❌ Error updating goal:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث الهدف' });
  }
}

async function deleteGoal(req, res) {
  try {
    const { companyId } = req.user;
    await goalService.deleteGoal(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف الهدف بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting goal:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف الهدف' });
  }
}

async function getGoalStats(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId, departmentId } = req.query;
    const stats = await goalService.getGoalStats(companyId, { employeeId, departmentId });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting goal stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 التغذية الراجعة - Feedback
// ═══════════════════════════════════════════════════════════════════════════════

async function createFeedback(req, res) {
  try {
    const { companyId, id: userId } = req.user;

    console.log('📝 Creating feedback from user:', userId);

    const feedback = await feedbackService.createFeedback(companyId, userId, req.body);
    res.status(201).json({ success: true, feedback });
  } catch (error) {
    console.error('❌ Error creating feedback:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء التغذية الراجعة' });
  }
}

async function getFeedback(req, res) {
  try {
    const { companyId } = req.user;
    const { toUserId, fromUserId, type, limit } = req.query;

    console.log('🔍 Getting feedback for company:', companyId);

    const feedback = await feedbackService.getFeedback(companyId, { toUserId, fromUserId, type, limit });

    console.log(`✅ Returning ${feedback.length} feedback records`);

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('❌ Error getting feedback:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب التغذية الراجعة' });
  }
}

async function getFeedbackById(req, res) {
  try {
    const { companyId } = req.user;
    const feedback = await feedbackService.getFeedbackById(companyId, req.params.id);
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('❌ Error getting feedback:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب التغذية الراجعة' });
  }
}

async function updateFeedback(req, res) {
  try {
    const { companyId } = req.user;
    const feedback = await feedbackService.updateFeedback(companyId, req.params.id, req.body);
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('❌ Error updating feedback:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث التغذية الراجعة' });
  }
}

async function deleteFeedback(req, res) {
  try {
    const { companyId } = req.user;
    await feedbackService.deleteFeedback(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف التغذية الراجعة بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف التغذية الراجعة' });
  }
}

async function getFeedbackStats(req, res) {
  try {
    const { companyId } = req.user;
    const { userId } = req.query;
    const stats = await feedbackService.getFeedbackStats(companyId, { userId });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting feedback stats:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الاستقالات - Resignations
// ═══════════════════════════════════════════════════════════════════════════════

async function createResignation(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.body;
    console.log('🔍 [Debug] createResignation:', { companyId, employeeId, body: req.body });

    // Validate required fields
    if (!employeeId) {
      return res.status(400).json({ error: 'معرف الموظف مطلوب' });
    }

    const resignation = await resignationService.createResignation(companyId, employeeId, req.body);
    res.status(201).json({ success: true, resignation });
  } catch (error) {
    console.error('❌ Error creating resignation:', error);
    // Return 400 for validation errors, 500 for server errors
    const statusCode = error.code === 'P2003' || error.message?.includes('مطلوب') || error.message?.includes('غير موجود') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'حدث خطأ أثناء إنشاء الاستقالة' });
  }
}

async function getResignations(req, res) {
  try {
    const { companyId } = req.user;
    const { status, limit } = req.query;
    const resignations = await resignationService.getResignations(companyId, { status, limit });
    res.json({ success: true, resignations });
  } catch (error) {
    console.error('❌ Error getting resignations:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الاستقالات' });
  }
}

async function getResignationById(req, res) {
  try {
    const { companyId } = req.user;
    const resignation = await resignationService.getResignationById(companyId, req.params.id);
    res.json({ success: true, resignation });
  } catch (error) {
    console.error('❌ Error getting resignation:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب الاستقالة' });
  }
}

async function updateResignation(req, res) {
  try {
    const { companyId, id: approvedBy } = req.user;
    const resignation = await resignationService.updateResignation(companyId, req.params.id, { ...req.body, approvedBy });
    res.json({ success: true, resignation });
  } catch (error) {
    console.error('❌ Error updating resignation:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث الاستقالة' });
  }
}

async function getResignationStats(req, res) {
  try {
    const { companyId } = req.user;
    const { year } = req.query;
    const stats = await resignationService.getResignationStats(companyId, { year });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting resignation stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 العطلات الرسمية - Public Holidays
// ═══════════════════════════════════════════════════════════════════════════════

async function getClearanceChecklist(req, res) {
  try {
    const { companyId } = req.user;
    const { id: resignationId } = req.params;
    const items = await resignationService.getClearanceChecklist(companyId, resignationId);
    res.json({ success: true, items });
  } catch (error) {
    console.error('❌ Error getting clearance checklist:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة التصفية' });
  }
}

async function updateClearanceItem(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { itemId } = req.params;
    const item = await resignationService.updateClearanceItem(companyId, itemId, req.body, userId);
    res.json({ success: true, item });
  } catch (error) {
    console.error('❌ Error updating clearance item:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث بند التصفية' });
  }
}

/**
 * حساب مستحقات نهاية الخدمة
 * GET /api/hr/resignations/:id/settlement
 */
async function getFinalSettlement(req, res) {
  try {
    const { companyId } = req.user;
    const { id: resignationId } = req.params;
    const settlement = await resignationService.calculateFinalSettlement(companyId, resignationId);
    res.json({ success: true, settlement });
  } catch (error) {
    console.error('❌ Error calculating settlement:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حساب المستحقات' });
  }
}

/**
 * اعتماد مستحقات نهاية الخدمة
 * POST /api/hr/resignations/:id/settlement/approve
 */
async function approveFinalSettlement(req, res) {
  try {
    const { companyId } = req.user;
    const { id: resignationId } = req.params;
    const { amount } = req.body;
    const resignation = await resignationService.approveFinalSettlement(companyId, resignationId, amount);
    res.json({ success: true, resignation });
  } catch (error) {
    console.error('❌ Error approving settlement:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء اعتماد المستحقات' });
  }
}

async function getPublicHolidays(req, res) {
  try {
    const { companyId } = req.user;
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const settings = await prisma.hRSettings.findUnique({
      where: { companyId }
    });

    const holidays = settings?.publicHolidays ? JSON.parse(settings.publicHolidays) : [];
    res.json({ success: true, holidays });
  } catch (error) {
    console.error('❌ Error getting public holidays:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب العطلات' });
  }
}

async function updatePublicHolidays(req, res) {
  try {
    const { companyId } = req.user;
    const { holidays } = req.body;
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    await prisma.hRSettings.upsert({
      where: { companyId },
      update: { publicHolidays: JSON.stringify(holidays) },
      create: { companyId, publicHolidays: JSON.stringify(holidays) }
    });

    res.json({ success: true, message: 'تم حفظ العطلات بنجاح' });
  } catch (error) {
    console.error('❌ Error updating public holidays:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ العطلات' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات - Settings
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب إعدادات HR
 * GET /api/hr/settings
 */
async function getHRSettings(req, res) {
  try {
    const { companyId } = req.user;
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    let settings = await prisma.hRSettings.findUnique({
      where: { companyId }
    });

    // إذا لم توجد إعدادات، أنشئ إعدادات افتراضية
    if (!settings) {
      settings = await prisma.hRSettings.create({
        data: { companyId }
      });
    }

    // تحويل workDays من JSON string إلى array
    const workDaysArray = JSON.parse(settings.workDays || '[1,2,3,4,5]');
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const workingDays = workDaysArray.map(d => dayNames[d]);

    res.json({
      success: true,
      settings: {
        workStartTime: settings.workStartTime,
        workEndTime: settings.workEndTime,
        breakDuration: settings.breakDuration,
        workingDays,
        annualLeaveDefault: settings.annualLeaveDefault,
        sickLeaveDefault: settings.sickLeaveDefault,
        carryOverLimit: settings.carryOverLimit,
        requireApproval: true,
        minAdvanceNotice: 3,
        payrollDay: settings.payrollDay,
        currency: 'EGP',
        taxRate: 10,
        socialInsuranceRate: Number(settings.socialInsuranceRate),
        overtimeRate: Number(settings.overtimeRate),
        allowRemoteCheckIn: true,
        requireLocation: false,
        lateThreshold: settings.lateThresholdMinutes || settings.lateGracePeriod || 15,
        earlyLeaveThreshold: settings.earlyLeaveGracePeriod,
        autoAbsentMarking: true,
        monthlyLateLimit: settings.monthlyLateLimit,
        lateWarningThreshold: settings.lateWarningThreshold,
        lateWarningLevels: settings.lateWarningLevels ? JSON.parse(settings.lateWarningLevels) : [],
        // Geofencing settings
        geofenceEnabled: settings.geofenceEnabled || false,
        officeLatitude: settings.officeLatitude ? settings.officeLatitude.toString() : '',
        officeLongitude: settings.officeLongitude ? settings.officeLongitude.toString() : '',
        geofenceRadius: settings.geofenceRadius || 200,
        // Auto Deduction Settings (New System)
        autoDeductionEnabled: settings.autoDeductionEnabled || false,
        gracePeriodMinutes: settings.gracePeriodMinutes || 60,
        lateThresholdMinutes: settings.lateThresholdMinutes || 10,
        maxDailyDeductionDays: settings.maxDailyDeductionDays ? Number(settings.maxDailyDeductionDays) : 1.0,
        earlyCheckoutEnabled: settings.earlyCheckoutEnabled !== false,
        earlyCheckoutThresholdMinutes: settings.earlyCheckoutThresholdMinutes || 0,
        firstViolationMultiplier: settings.firstViolationMultiplier ? Number(settings.firstViolationMultiplier) : 1.0,
        secondViolationMultiplier: settings.secondViolationMultiplier ? Number(settings.secondViolationMultiplier) : 2.0,
        thirdViolationMultiplier: settings.thirdViolationMultiplier ? Number(settings.thirdViolationMultiplier) : 3.0,
        notifyAtPercentage: settings.notifyAtPercentage || 75,
        notifyOnDeduction: settings.notifyOnDeduction !== false,
        notifyOnGraceReset: settings.notifyOnGraceReset !== false,
        deductionCalculationMethod: settings.deductionCalculationMethod || 'minute',
        workingDaysPerMonth: settings.workingDaysPerMonth || 22,
        workingHoursPerDay: settings.workingHoursPerDay || 8,
        requireDeductionReview: settings.requireDeductionReview !== false,
        absencePenaltyRate: settings.absencePenaltyRate ? Number(settings.absencePenaltyRate) : 1.0,
        delayPenaltyTiers: settings.delayPenaltyTiers || '[]',
        notifyOnLeaveRequest: true,
        notifyOnAttendanceIssue: true,
        notifyOnPayrollGeneration: true,
        notifyManagers: true
      }
    });
  } catch (error) {
    console.error('❌ Error getting HR settings:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإعدادات' });
  }
}

/**
 * تحديث إعدادات HR
 * PUT /api/hr/settings
 */
async function updateHRSettings(req, res) {
  try {
    const { companyId } = req.user;
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    console.log('🔍 [HR-SETTINGS-BACKEND] Update request received:', {
      companyId,
      requestBody: req.body,
      bodySize: JSON.stringify(req.body).length,
      contentType: req.headers['content-type']
    });

    // استخراج جميع الحقول من req.body
    const settingsData = req.body;

    const {
      workStartTime,
      workEndTime,
      breakDuration,
      workingDays,
      annualLeaveDefault,
      sickLeaveDefault,
      carryOverLimit,
      payrollDay,
      overtimeRate,
      lateThreshold,
      earlyLeaveThreshold,
      monthlyLateLimit,
      lateWarningThreshold,
      lateWarningLevels,
      socialInsuranceRate,
      taxRate,
      // Geofencing fields
      geofenceEnabled,
      officeLatitude,
      officeLongitude,
      geofenceRadius,
      // Auto Deduction fields
      autoDeductionEnabled,
      gracePeriodMinutes,
      lateThresholdMinutes,
      maxDailyDeductionDays,
      earlyCheckoutEnabled,
      earlyCheckoutThresholdMinutes,
      firstViolationMultiplier,
      secondViolationMultiplier,
      thirdViolationMultiplier,
      notifyAtPercentage,
      notifyOnDeduction,
      notifyOnGraceReset,
      deductionCalculationMethod,
      workingDaysPerMonth,
      workingHoursPerDay,
      requireDeductionReview,
      absencePenaltyRate,
      delayPenaltyTiers,
      maxAdvancePercentage,
      maxActiveAdvances,
      minMonthsForAdvance,
      advanceRepaymentMonths,
      noticePeriodDays,
      requireClearance
    } = settingsData;

    // تحويل workingDays من أسماء الأيام إلى أرقام
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const workDaysNumbers = workingDays?.map(day => dayNames.indexOf(day)).filter(d => d !== -1) || [1, 2, 3, 4, 5];

    // بناء object للحقول المتاحة في الـ schema فقط
    const updateData = {
      workDays: JSON.stringify(workDaysNumbers),
      annualLeaveDefault: annualLeaveDefault || 21,
      sickLeaveDefault: sickLeaveDefault || 15,
      carryOverLimit: carryOverLimit || 5,
      payrollDay: payrollDay || 25,
      socialInsuranceRate: socialInsuranceRate !== undefined ? parseFloat(socialInsuranceRate) : 0,
      taxRate: taxRate !== undefined ? parseFloat(taxRate) : 0,
      overtimeRate: overtimeRate || 1.5,
      lateGracePeriod: lateThresholdMinutes || lateThreshold || 15,
      earlyLeaveGracePeriod: earlyLeaveThreshold || 15,
      monthlyLateLimit: monthlyLateLimit || 3,
      lateWarningThreshold: lateWarningThreshold || 3,
      lateWarningLevels: lateWarningLevels ? JSON.stringify(lateWarningLevels) : null,
      // Geofencing fields
      geofenceEnabled: geofenceEnabled !== undefined ? geofenceEnabled : false,
      officeLatitude: officeLatitude ? parseFloat(officeLatitude) : null,
      officeLongitude: officeLongitude ? parseFloat(officeLongitude) : null,
      geofenceRadius: geofenceRadius !== undefined ? parseInt(geofenceRadius) : 200,
      // Auto Deduction Settings (New System)
      autoDeductionEnabled: autoDeductionEnabled !== undefined ? autoDeductionEnabled : false,
      gracePeriodMinutes: gracePeriodMinutes || 60,
      lateThresholdMinutes: lateThresholdMinutes || lateThreshold || 10,
      maxDailyDeductionDays: maxDailyDeductionDays !== undefined ? parseFloat(maxDailyDeductionDays) : 1.0,
      earlyCheckoutEnabled: earlyCheckoutEnabled !== undefined ? earlyCheckoutEnabled : true,
      earlyCheckoutThresholdMinutes: earlyCheckoutThresholdMinutes !== undefined ? earlyCheckoutThresholdMinutes : 0,
      firstViolationMultiplier: firstViolationMultiplier || 1.0,
      secondViolationMultiplier: secondViolationMultiplier || 2.0,
      thirdViolationMultiplier: thirdViolationMultiplier || 3.0,
      notifyAtPercentage: notifyAtPercentage || 75,
      notifyOnDeduction: notifyOnDeduction !== undefined ? notifyOnDeduction : true,
      notifyOnGraceReset: notifyOnGraceReset !== undefined ? notifyOnGraceReset : true,
      deductionCalculationMethod: deductionCalculationMethod || 'minute',
      workingDaysPerMonth: workingDaysPerMonth || 22,
      workingHoursPerDay: workingHoursPerDay || 8,
      requireDeductionReview: requireDeductionReview !== undefined ? requireDeductionReview : true,
      absencePenaltyRate: absencePenaltyRate !== undefined ? parseFloat(absencePenaltyRate) : 1.0,
      delayPenaltyTiers: delayPenaltyTiers || '[]',
      // Advance settings
      maxAdvancePercentage: maxAdvancePercentage || 50,
      maxActiveAdvances: maxActiveAdvances || 1,
      minMonthsForAdvance: minMonthsForAdvance || 3,
      advanceRepaymentMonths: advanceRepaymentMonths || 6,
      // Resignation settings
      noticePeriodDays: noticePeriodDays || 30,
      requireClearance: requireClearance !== undefined ? requireClearance : true,
    };

    console.log('🔍 [HR-SETTINGS-BACKEND] Prepared update data:', {
      updateDataKeys: Object.keys(updateData),
      updateDataSize: JSON.stringify(updateData).length
    });

    const settings = await prisma.hRSettings.upsert({
      where: { companyId },
      update: updateData,
      create: {
        companyId,
        ...updateData
      }
    });

    console.log('✅ [HR-SETTINGS-BACKEND] Settings updated successfully:', {
      settingsId: settings.id,
      companyId: settings.companyId
    });

    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح', settings });
  } catch (error) {
    console.error('❌ [HR-SETTINGS-BACKEND] Error updating HR settings:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId
    });
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ الإعدادات', details: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 Unified Dashboard - لوحة التحكم الموحدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات اليوم لجميع شركات المستخدم
 * GET /api/hr/my-companies/today
 */
async function getMyCompaniesToday(req, res) {
  try {
    const { id: userId } = req.user;
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    // 1. Get user companies WHERE USER IS OWNER (not just any employee)
    const userCompanies = await prisma.userCompany.findMany({
      where: {
        userId,
        isActive: true,
        role: 'OWNER'  // Only show companies where user has OWNER role
      },
      include: { company: true }
    });

    if (!userCompanies.length) {
      return res.json({
        success: true,
        totalCompanies: 0,
        totalEmployees: 0,
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
        byCompany: []
      });
    }

    const companyIds = userCompanies.map(uc => uc.companyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 2. Get stats for each company
    const statsPromises = userCompanies.map(async (uc) => {
      const companyId = uc.companyId;

      // Active employees count (Using User model)
      const totalEmployees = await prisma.user.count({
        where: { companyId, isActive: true }
      });

      // Attendance for today
      const attendances = await prisma.attendance.findMany({
        where: {
          companyId,
          date: {
            gte: today,
            lt: tomorrow
          }
        },
        select: { status: true }
      });

      const present = attendances.filter(a => ['PRESENT', 'LATE', 'HALF_DAY'].includes(a.status)).length;
      const late = attendances.filter(a => a.status === 'LATE').length;
      // Absent logic can be complex (did not check in vs marked absent), simplified here:
      // Typically absent records are created by end-of-day jobs, or we assume (Total - Present) if shifted.
      // For dashboard "Live" view, usually we show who Checked In.
      // Explicit 'ABSENT' records:
      const explicitAbsent = attendances.filter(a => a.status === 'ABSENT').length;

      return {
        companyId,
        companyName: uc.company.name,
        companyLogo: uc.company.logo,
        totalEmployees,
        present,
        late,
        absent: explicitAbsent
      };
    });

    const byCompany = await Promise.all(statsPromises);

    // 3. Aggregate totals
    const totalCompanies = byCompany.length;
    const totalEmployees = byCompany.reduce((sum, c) => sum + c.totalEmployees, 0);
    const totalPresent = byCompany.reduce((sum, c) => sum + c.present, 0);
    const totalLate = byCompany.reduce((sum, c) => sum + c.late, 0);
    const totalAbsent = byCompany.reduce((sum, c) => sum + c.absent, 0);

    res.json({
      success: true,
      totalCompanies,
      totalEmployees,
      totalPresent,
      totalLate,
      totalAbsent,
      byCompany
    });

  } catch (error) {
    console.error('❌ Error getting my companies today stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب إحصائيات الشركات' });
  }
}

/**
 * تقرير الحضور لجميع الشركات (شهر/سنة)
 * GET /api/hr/my-companies/attendance-report
 */
async function getMyCompaniesAttendanceReport(req, res) {
  try {
    const { id: userId } = req.user;
    const { month, year } = req.query;
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    if (!month || !year) {
      return res.status(400).json({ success: false, error: 'Month and Year are required' });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // End of month

    // 1. Get user companies WHERE USER IS OWNER
    const userCompanies = await prisma.userCompany.findMany({
      where: {
        userId,
        isActive: true,
        role: 'OWNER'  // Only show companies where user has OWNER role
      },
      include: { company: true }
    });

    const reportPromises = userCompanies.map(async (uc) => {
      const companyId = uc.companyId;

      // Total employees to calculate potential work days (Using User model)
      const activeEmployees = await prisma.user.count({
        where: { companyId, isActive: true }
      });

      // Attendance records in range
      const attendances = await prisma.attendance.findMany({
        where: {
          companyId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const presentDays = attendances.filter(a => ['PRESENT', 'LATE', 'HALF_DAY'].includes(a.status)).length;
      const lateDays = attendances.filter(a => a.status === 'LATE').length;
      const absentDays = attendances.filter(a => a.status === 'ABSENT').length;

      // Calculate work hours and overtime
      // Assuming 'workHours' and 'overtimeHours' are float fields in Attendance
      const totalWorkHours = attendances.reduce((sum, a) => sum + (Number(a.workHours) || 0), 0);
      const totalOvertimeHours = attendances.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);

      // Attendance Rate: Present / (Present + Absent) or based on strict working days
      // Simplified: Present / (Present + Absent) if > 0
      const totalRecorded = presentDays + absentDays;
      const attendanceRate = totalRecorded > 0 ? (presentDays / totalRecorded) * 100 : 0;

      return {
        companyId,
        companyName: uc.company.name,
        companyLogo: uc.company.logo,
        totalEmployees: activeEmployees,
        presentDays,
        lateDays,
        absentDays,
        totalWorkHours,
        totalOvertimeHours,
        attendanceRate: parseFloat(attendanceRate.toFixed(1))
      };
    });

    const companyReports = await Promise.all(reportPromises);

    // Calculate aggregated stats
    const totalCompanies = companyReports.length;
    const overallAttendanceRate = companyReports.reduce((sum, c) => sum + c.attendanceRate, 0) / (totalCompanies || 1);

    // Determine Best and Worst
    const sortedByRate = [...companyReports].sort((a, b) => b.attendanceRate - a.attendanceRate);
    const bestPerformer = sortedByRate.length > 0 ? sortedByRate[0] : null;
    const worstPerformer = sortedByRate.length > 0 ? sortedByRate[sortedByRate.length - 1] : null;

    res.json({
      success: true,
      month,
      year,
      totalCompanies,
      overallAttendanceRate: parseFloat(overallAttendanceRate.toFixed(1)),
      bestPerformer,
      worstPerformer,
      companies: companyReports
    });

  } catch (error) {
    console.error('❌ Error getting companies attendance report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء إعداد التقرير' });
  }
}

/**
 * تصدير تقرير موحد Excel
 * GET /api/hr/my-companies/export
 */
async function exportMyCompaniesReport(req, res) {
  try {
    const { id: userId } = req.user;
    const { startDate: startStr, endDate: endStr } = req.query;
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    // Use xlsx which is available in package.json
    const XLSX = require('xlsx');

    const startDate = startStr ? new Date(startStr) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = endStr ? new Date(endStr) : new Date();

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId, isActive: true },
      include: { company: true }
    });

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary Data Preparation
    const summaryData = [];

    // Get data for each company
    for (const uc of userCompanies) {
      const companyId = uc.companyId;
      const attendances = await prisma.attendance.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate }
        },
        include: { user: true }
      });

      const totalEmployees = await prisma.user.count({ where: { companyId, isActive: true } });
      const present = attendances.filter(a => ['PRESENT', 'LATE', 'HALF_DAY'].includes(a.status)).length;
      const absent = attendances.filter(a => a.status === 'ABSENT').length;
      const hours = attendances.reduce((sum, a) => sum + (Number(a.workHours) || 0), 0);
      const overtime = attendances.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);
      const totalRec = present + absent;
      const rate = totalRec > 0 ? ((present / totalRec) * 100).toFixed(1) + '%' : '0%';

      summaryData.push({
        'الشركة': uc.company.name,
        'الموظفين': totalEmployees,
        'أيام الحضور': present,
        'أيام الغياب': absent,
        'ساعات العمل': hours.toFixed(1),
        'الإضافي': overtime.toFixed(1),
        'نسبة الحضور': rate
      });

      // Individual Sheet for this company
      const companySheetData = attendances.map(att => ({
        'التاريخ': att.date.toISOString().split('T')[0],
        'الموظف': `${att.user.firstName} ${att.user.lastName}`,
        'الحالة': att.status,
        'الدخول': att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('en-US', { hour12: false }) : '-',
        'الخروج': att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('en-US', { hour12: false }) : '-',
        'ساعات العمل': att.workHours || 0
      }));

      // Sanitize sheet name (max 31 chars, no special chars)
      const safeName = uc.company.name.replace(/[*?:\/\[\]]/g, '').substring(0, 30);
      const companySheet = XLSX.utils.json_to_sheet(companySheetData);

      // Set column widths for company sheet
      companySheet['!cols'] = [
        { wch: 15 }, // Date
        { wch: 25 }, // Employee
        { wch: 15 }, // Status
        { wch: 15 }, // CheckIn
        { wch: 15 }, // CheckOut
        { wch: 15 }  // Hours
      ];

      XLSX.utils.book_append_sheet(workbook, companySheet, safeName);
    }

    // Add Summary Sheet at the beginning (workaround: unshift logic is hard with book_append_sheet, usually append order matters)
    // To have Summary first, we should have added it first.
    // Let's create a NEW workbook with correct order or just accept Summary at the end or refactor loop.
    // Refactoring loop to data collection first is better.

    // RE-DOING to ensure Summary is first sheet
    const finalWorkbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(finalWorkbook, summarySheet, 'ملخص الشركات');

    // Now copy sheets from temp workbook or just re-add (we need to store data)
    // I can't easily iterate sheets in xlsx utils. I will just loop `userCompanies` again or store data in memory.
    // Storing data in memory is safer.

    // Note: I already calculated everything in the loop above. I should have just stored data arrays.
    // But I already wrote the code to append to `workbook`.
    // `workbook.SheetNames` has the names. `workbook.Sheets` has sheets.

    workbook.SheetNames.forEach(sheetName => {
      XLSX.utils.book_append_sheet(finalWorkbook, workbook.Sheets[sheetName], sheetName);
    });

    const buffer = XLSX.write(finalWorkbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=my-companies-attendance-${Date.now()}.xlsx`);

    res.send(buffer);

  } catch (error) {
    console.error('❌ Error exporting unified report:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'فشل تصدير الملف' });
    }
  }
}

/**
 * تحديث الرواتب بشكل جماعي
 * PUT /api/hr/employees/bulk-salaries
 */
async function updateBulkSalaries(req, res) {
  try {
    const { companyId } = req.user;
    const { updates, reason: globalReason, changeType, effectiveDate } = req.body; // updates: Array of { id, baseSalary, reason? }

    console.log('🔍 [BULK-SALARY] Request received:', {
      companyId,
      updatesLength: updates?.length,
      globalReason,
      changeType,
      effectiveDate,
      requestBody: req.body
    });

    if (!Array.isArray(updates) || updates.length === 0) {
      console.log('❌ [BULK-SALARY] Invalid updates array');
      return res.status(400).json({
        success: false,
        error: 'يجب إرسال قائمة بالتحديثات'
      });
    }

    console.log(`🔍 [BULK-SALARY] CompanyId: ${companyId}, Updates count: ${updates.length}`);
    console.log(`🔍 [BULK-SALARY] Raw updates:`, updates);

    // التحقق من صحة البيانات
    const validUpdates = updates
      .filter(u => u && u.id && u.baseSalary !== undefined)
      .map(u => ({
        id: u.id,
        baseSalary: u.baseSalary,
        reason: u.reason
      }));

    console.log(`🔍 [BULK-SALARY] Valid updates:`, validUpdates);

    if (validUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد تحديثات صالحة'
      });
    }

    const missingReason = validUpdates.some(u => {
      const r = (u.reason || globalReason || '').toString().trim();
      return r.length === 0;
    });
    if (missingReason) {
      return res.status(400).json({
        success: false,
        error: 'سبب التعديل مطلوب'
      });
    }

    const ids = validUpdates.map(u => u.id);
    const employees = await prisma.user.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true, baseSalary: true }
    });
    const employeesById = new Map(employees.map(e => [e.id, e]));

    const parseSalary = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      const n = typeof value === 'number' ? value : parseFloat(value.toString());
      return Number.isFinite(n) ? n : null;
    };

    const normalized = validUpdates
      .map(u => {
        const employee = employeesById.get(u.id);
        const oldSalary = parseSalary(employee?.baseSalary) ?? 0;
        const newSalary = parseSalary(u.baseSalary);
        return {
          id: u.id,
          oldSalary,
          newSalary,
          reason: (u.reason || globalReason || '').toString().trim()
        };
      })
      .filter(u => u.newSalary !== null);

    if (normalized.length !== validUpdates.length) {
      return res.status(400).json({
        success: false,
        error: 'يوجد رواتب غير صالحة في التحديثات'
      });
    }

    const toUpdate = normalized.filter(u => u.newSalary !== u.oldSalary);

    if (toUpdate.length === 0) {
      return res.json({
        success: true,
        message: 'لا توجد تغييرات في الرواتب',
        updatedCount: 0
      });
    }

    const finalChangeType = (changeType || 'adjustment').toString();
    const finalEffectiveDate = new Date(effectiveDate || Date.now());

    await prisma.$transaction(async (tx) => {
      for (const u of toUpdate) {
        const changePercentage = u.oldSalary > 0
          ? Number(((u.newSalary - u.oldSalary) / u.oldSalary) * 100)
          : 0;

        await tx.user.update({
          where: { id: u.id },
          data: { baseSalary: u.newSalary }
        });

        await tx.salaryHistory.create({
          data: {
            companyId,
            userId: u.id,
            previousSalary: u.oldSalary,
            newSalary: u.newSalary,
            changeType: finalChangeType,
            changePercentage,
            effectiveDate: finalEffectiveDate,
            reason: u.reason,
            approvedBy: req.user.id
          }
        });
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الرواتب بنجاح',
      updatedCount: toUpdate.length
    });

  } catch (error) {
    console.error('❌ Error updating bulk salaries:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث الرواتب'
    });
  }
}

/**
 * تقرير الموظف الشامل
 * GET /api/hr/reports/employee
 */
async function getEmployeeReport(req, res) {
  try {
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    console.log('🔍 [EMPLOYEE-REPORT] prisma client:', prisma ? 'OK' : 'UNDEFINED');
    console.log('🔍 [EMPLOYEE-REPORT] prisma.employee:', prisma.employee ? 'OK' : 'UNDEFINED');
    console.log('🔍 [EMPLOYEE-REPORT] prisma.user:', prisma.user ? 'OK' : 'UNDEFINED');
    const { companyId } = req.user;
    const { employeeId, startDate, endDate } = req.query;
    console.log('🔍 [EMPLOYEE-REPORT] Params:', { employeeId, startDate, endDate, companyId });

    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ error: 'يجب تحديد الموظف والفترة الزمنية' });
    }

    // جلب بيانات الموظف من جدول User بدلاً من Employee
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, companyId },
      include: {
        departmentRelation: true
      }
    });
    console.log('🔍 [EMPLOYEE-REPORT] Employee found:', employee ? 'YES' : 'NO');

    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    console.log('🔍 [EMPLOYEE-REPORT] Date range:', { start, end });

    // سجل الحضور
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: employeeId,
        companyId,
        date: { gte: start, lte: end }
      },
      orderBy: { date: 'desc' }
    });

    const attendanceStats = {
      totalDays: attendanceRecords.length,
      presentDays: attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length,
      absentDays: attendanceRecords.filter(r => r.status === 'ABSENT').length,
      lateDays: attendanceRecords.filter(r => r.status === 'LATE').length,
      totalLateMinutes: attendanceRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0),
      totalWorkHours: attendanceRecords.reduce((sum, r) => sum + (r.workHours || 0), 0),
      overtimeHours: attendanceRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
      records: attendanceRecords.map(r => ({
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
        workHours: r.workHours || 0,
        lateMinutes: r.lateMinutes || 0
      }))
    };

    // طلبات الإجازات
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId: employeeId,
        companyId,
        startDate: { gte: start, lte: end }
      },
      orderBy: { createdAt: 'desc' }
    });

    const leavesStats = {
      total: leaveRequests.reduce((acc, curr) => acc + (curr.totalDays || 0), 0),
      approved: leaveRequests.filter(l => l.status === 'APPROVED').length,
      pending: leaveRequests.filter(l => l.status === 'PENDING').length,
      rejected: leaveRequests.filter(l => l.status === 'REJECTED').length,
      totalDaysTaken: leaveRequests.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + (l.totalDays || 0), 0),
      requests: leaveRequests.map(l => ({
        id: l.id,
        type: l.type,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.totalDays,
        status: l.status,
        reason: l.reason || ''
      }))
    };

    // طلبات السلف
    const advanceRequests = await prisma.advanceRequest.findMany({
      where: {
        userId: employeeId,
        companyId,
        createdAt: { gte: start, lte: end }
      },
      orderBy: { createdAt: 'desc' }
    });

    const advancesStats = {
      totalRequests: advanceRequests.length,
      totalAmount: advanceRequests.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0),
      pending: advanceRequests.filter(a => a.status === 'PENDING').length,
      approved: advanceRequests.filter(a => a.status === 'APPROVED').length,
      requests: advanceRequests.map(a => ({
        id: a.id,
        amount: parseFloat(a.amount || 0),
        requestDate: a.createdAt,
        status: a.status,
        reason: a.reason || ''
      }))
    };

    // معلومات الراتب
    const payrollStats = {
      baseSalary: parseFloat(employee.baseSalary || 0),
      allowances: parseFloat(employee.allowances || 0),
      deductions: parseFloat(employee.deductions || 0),
      overtimePay: attendanceStats.overtimeHours * 50, // افتراضي
      netSalary: parseFloat(employee.baseSalary || 0) + parseFloat(employee.allowances || 0) - parseFloat(employee.deductions || 0),
      lastPayment: null
    };

    // الأداء
    const lastReview = await prisma.performanceReview.findFirst({
      where: { userId: employeeId, companyId },
      orderBy: { createdAt: 'desc' }
    });

    const goals = await prisma.goal.findMany({
      where: { userId: employeeId, companyId }
    });

    const performanceStats = {
      lastReview: lastReview ? {
        date: lastReview.createdAt,
        score: Number(lastReview.overallRating) || 0,
        reviewer: ''
      } : null,
      activeGoals: goals.filter(g => g.status === 'IN_PROGRESS').length,
      completedGoals: goals.filter(g => g.status === 'COMPLETED').length
    };

    // الإنذارات
    const warnings = await prisma.employeeWarning.findMany({
      where: {
        userId: employeeId,
        companyId,
        incidentDate: { gte: start, lte: end }
      },
      orderBy: { incidentDate: 'desc' },
      take: 5
    });

    const warningsStats = {
      total: warnings.length,
      recent: warnings.map(w => ({
        id: w.id,
        type: w.type,
        date: w.incidentDate,
        description: w.description || ''
      }))
    };

    const report = {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        employeeNumber: employee.employeeNumber || 'N/A',
        department: employee.departmentRelation?.name || employee.department || 'غير محدد',
        position: employee.position || 'غير محدد'
      },
      attendance: attendanceStats,
      leaves: leavesStats,
      advances: advancesStats,
      payroll: payrollStats,
      performance: performanceStats,
      warnings: warningsStats
    };

    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error getting employee report:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقرير', details: error.message });
  }
}

module.exports = {
  // Departments
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,

  // Positions
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,

  // Promotions
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,

  // Employees
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  terminateEmployee,
  linkEmployeeToUser,
  getEmployeeStats,
  getOrganizationChart,

  // Settings
  getHRSettings,
  updateHRSettings,

  // Attendance
  checkIn,
  checkOut,
  getAttendance,
  getMyTodayAttendance,
  getMyAttendanceStats,
  getMyRecentAttendance,
  getTodayAttendance,
  updateAttendance,
  deleteAttendance,
  createManualAttendance,
  getMonthlyAttendanceReport,
  getAttendanceStats,
  exportAttendance,

  // Leaves
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalance,
  getLeaveCalendar,
  getLeaveStats,

  // Payroll
  createPayroll,
  generateMonthlyPayroll,
  getPayrolls,
  getPayrollById,
  updatePayroll,
  approvePayroll,
  markPayrollAsPaid,
  bulkMarkPayrollAsPaid,
  deletePayroll,
  getPayrollSummary,
  getAnnualPayrollReport,

  // Reports
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
  getEmployeeReport,

  // Dashboard
  getHRDashboard,

  // Sync
  syncUsersToEmployees,

  // Documents
  createDocument,
  getEmployeeDocuments,
  getDocumentById,
  updateDocument,
  verifyDocument,
  deleteDocument,
  getExpiredDocuments,
  getDocumentStats,

  // Salary History
  getEmployeeSalaryHistory,
  getSalaryHistory,
  getSalaryHistoryById,
  createSalaryHistory,
  getSalaryHistoryStats,
  getPromotionsReport,

  // Performance Reviews
  createPerformanceReview,
  getPerformanceReviews,
  getEmployeeReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getPerformanceStats,

  // Training
  createTraining,
  getEmployeeTrainings,
  getTrainingById,
  getTrainings,
  updateTraining,
  deleteTraining,
  getTrainingStats,

  // Warnings
  createWarning,
  getWarnings,
  getEmployeeWarnings,
  getWarningById,
  updateWarning,
  acknowledgeWarning,
  deleteWarning,
  getWarningStats,

  // Shifts
  createShift,
  getShifts,
  getShiftById,
  updateShift,
  deleteShift,
  assignShift,
  bulkAssignShift,
  getEmployeeAssignments,
  removeAssignment,
  getShiftStats,

  // Benefits
  createBenefit,
  getBenefits,
  getBenefitById,
  updateBenefit,
  deleteBenefit,
  enrollEmployee,
  getEmployeeEnrollments,
  updateEnrollment,
  getBenefitStats,

  // Goals
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  getGoalStats,

  // Feedback
  createFeedback,
  getFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats,

  // Resignations
  createResignation,
  getResignations,
  getResignationById,
  updateResignation,
  getResignationStats,
  getClearanceChecklist,
  updateClearanceItem,
  getFinalSettlement,
  approveFinalSettlement,

  // Public Holidays
  getPublicHolidays,
  updatePublicHolidays,
  getMyLeavesHistory,

  // Employee Self-Service
  getMyProfile,
  getMyTodayAttendance,
  getMyAttendanceStats,
  getMyRecentAttendance,
  getMyRecentLeaves,
  getMyLastPayroll,
  getMyPayrollHistory,
  getMyPayrollProjection,

  // Unified Dashboard
  getMyCompaniesToday,
  getMyCompaniesAttendanceReport,
  exportMyCompaniesReport,

  updateBulkSalaries
};

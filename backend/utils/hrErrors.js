/**
 * ⚠️ HR Custom Error Classes
 * فئات الأخطاء المخصصة لنظام الموارد البشرية
 */

/**
 * خطأ عام في نظام الموارد البشرية
 */
class HRError extends Error {
  constructor(message, code = 'HR_ERROR', statusCode = 500) {
    super(message);
    this.name = 'HRError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp
    };
  }
}

/**
 * خطأ التحقق من الصحة
 */
class ValidationError extends HRError {
  constructor(message, errors = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

/**
 * خطأ عدم العثور على المورد
 */
class NotFoundError extends HRError {
  constructor(resource, id = null) {
    const message = id
      ? `${resource} بالمعرف ${id} غير موجود`
      : `${resource} غير موجود`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * خطأ الصلاحيات
 */
class UnauthorizedError extends HRError {
  constructor(message = 'غير مصرح لك بهذا الإجراء') {
    super(message, 'UNAUTHORIZED', 403);
    this.name = 'UnauthorizedError';
  }
}

/**
 * خطأ تعارض البيانات
 */
class ConflictError extends HRError {
  constructor(message) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

/**
 * خطأ منطق الأعمال
 */
class BusinessLogicError extends HRError {
  constructor(message, details = null) {
    super(message, 'BUSINESS_LOGIC_ERROR', 422);
    this.name = 'BusinessLogicError';
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

/**
 * خطأ الموظف
 */
class EmployeeError extends HRError {
  constructor(message, code = 'EMPLOYEE_ERROR') {
    super(message, code, 400);
    this.name = 'EmployeeError';
  }
}

/**
 * خطأ الحضور
 */
class AttendanceError extends HRError {
  constructor(message, code = 'ATTENDANCE_ERROR') {
    super(message, code, 400);
    this.name = 'AttendanceError';
  }
}

/**
 * خطأ الإجازات
 */
class LeaveError extends HRError {
  constructor(message, code = 'LEAVE_ERROR') {
    super(message, code, 400);
    this.name = 'LeaveError';
  }
}

/**
 * خطأ الرواتب
 */
class PayrollError extends HRError {
  constructor(message, code = 'PAYROLL_ERROR') {
    super(message, code, 400);
    this.name = 'PayrollError';
  }
}

/**
 * خطأ رصيد الإجازات غير كافٍ
 */
class InsufficientLeaveBalanceError extends LeaveError {
  constructor(leaveType, required, available) {
    super(
      `رصيد ${leaveType} غير كافٍ. المطلوب: ${required} يوم، المتاح: ${available} يوم`,
      'INSUFFICIENT_LEAVE_BALANCE'
    );
    this.leaveType = leaveType;
    this.required = required;
    this.available = available;
  }
}

/**
 * خطأ تداخل الإجازات
 */
class LeaveOverlapError extends LeaveError {
  constructor(existingLeave) {
    super(
      'يوجد تداخل مع طلب إجازة آخر',
      'LEAVE_OVERLAP'
    );
    this.existingLeave = existingLeave;
  }
}

/**
 * خطأ تسجيل الحضور المكرر
 */
class DuplicateAttendanceError extends AttendanceError {
  constructor(date) {
    super(
      `تم تسجيل الحضور مسبقاً لتاريخ ${date}`,
      'DUPLICATE_ATTENDANCE'
    );
    this.date = date;
  }
}

/**
 * خطأ كشف الراتب المكرر
 */
class DuplicatePayrollError extends PayrollError {
  constructor(month, year) {
    super(
      `يوجد كشف راتب لشهر ${month}/${year} مسبقاً`,
      'DUPLICATE_PAYROLL'
    );
    this.month = month;
    this.year = year;
  }
}

/**
 * خطأ تعديل كشف راتب مدفوع
 */
class PayrollAlreadyPaidError extends PayrollError {
  constructor() {
    super(
      'لا يمكن تعديل أو حذف كشف راتب مدفوع',
      'PAYROLL_ALREADY_PAID'
    );
  }
}

/**
 * خطأ حالة غير صالحة
 */
class InvalidStateError extends HRError {
  constructor(message, currentState, requiredState) {
    super(message, 'INVALID_STATE', 400);
    this.name = 'InvalidStateError';
    this.currentState = currentState;
    this.requiredState = requiredState;
  }
}

/**
 * معالج الأخطاء المركزي لنظام HR
 */
function handleHRError(error, req, res, next) {
  // تسجيل الخطأ للتصحيح
  console.error('❌ [HR-SERVER-ERROR]:', {
    name: error.name,
    message: error.message,
    code: error.code,
    path: req.path,
    method: req.method
  });

  // إذا كان خطأ مخصص من نظام HR
  if (error instanceof HRError) {
    return res.status(error.statusCode).json({
      success: false,
      ...error.toJSON()
    });
  }

  // معالجة أخطاء Prisma الشائعة
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'ConflictError',
      code: 'DUPLICATE_ENTRY',
      message: 'هذه البيانات موجودة مسبقاً في النظام',
      statusCode: 409
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'NotFoundError',
      code: 'NOT_FOUND',
      message: 'السجل المطلوب غير موجود',
      statusCode: 404
    });
  }

  // خطأ عام غير متوقع
  return res.status(500).json({
    success: false,
    error: 'InternalServerError',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'حدث خطأ غير متوقع في النظام. يرجى المحاولة لاحقاً'
      : error.message,
    statusCode: 500
  });
}

module.exports = {
  HRError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  BusinessLogicError,
  EmployeeError,
  AttendanceError,
  LeaveError,
  PayrollError,
  InsufficientLeaveBalanceError,
  LeaveOverlapError,
  DuplicateAttendanceError,
  DuplicatePayrollError,
  PayrollAlreadyPaidError,
  InvalidStateError,
  handleHRError
};

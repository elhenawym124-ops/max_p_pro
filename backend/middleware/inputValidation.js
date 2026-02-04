/**
 * Input Validation Middleware for Company-Related Endpoints
 * تحقق من صحة المدخلات للـ endpoints الخاصة بالشركات
 */

const { body, validationResult, query, param, check } = require('express-validator');
const { securityLogger } = require('./globalSecurity');

// Validation rules for company data
const companyValidationRules = () => {
  return [
    body('name')
      .isLength({ min: 2, max: 100 })
      .withMessage('اسم الشركة يجب أن يكون بين 2 و 100 حرف')
      .trim()
      .escape(),
    
    body('email')
      .isEmail()
      .withMessage('البريد الإلكتروني غير صحيح')
      .normalizeEmail(),
      
    body('phone')
      .optional()
      .matches(/^[\+]?[0-9\s\-\(\)]{7,20}$/)
      .withMessage('رقم الهاتف غير صحيح'),
      
    body('website')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_tld: true })
      .withMessage('رابط الموقع غير صحيح'),
      
    body('currency')
      .optional()
      .isIn(['EGP', 'USD', 'EUR', 'SAR'])
      .withMessage('العملة غير مدعومة'),
      
    body('plan')
      .optional()
      .isIn(['BASIC', 'PREMIUM', 'ENTERPRISE'])
      .withMessage('الخطة غير مدعومة')
  ];
};

// Validation rules for user data
const userValidationRules = () => {
  return [
    body('firstName')
      .isLength({ min: 2, max: 50 })
      .withMessage('الاسم الأول يجب أن يكون بين 2 و 50 حرف')
      .trim()
      .escape(),
      
    body('lastName')
      .isLength({ min: 2, max: 50 })
      .withMessage('الاسم الأخير يجب أن يكون بين 2 و 50 حرف')
      .trim()
      .escape(),
      
    body('email')
      .isEmail()
      .withMessage('البريد الإلكتروني غير صحيح')
      .normalizeEmail(),
      
    body('phone')
      .optional()
      .matches(/^[\+]?[0-9\s\-\(\)]{7,20}$/)
      .withMessage('رقم الهاتف غير صحيح'),
      
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
      
    body('role')
      .optional()
      .isIn(['USER', 'ADMIN', 'COMPANY_ADMIN'])
      .withMessage('الدور غير مدعوم')
  ];
};

// Validation rules for customer data
const customerValidationRules = () => {
  return [
    body('firstName')
      .isLength({ min: 1, max: 50 })
      .withMessage('الاسم الأول مطلوب ويجب أن يكون بين 1 و 50 حرف')
      .trim()
      .escape(),
      
    body('lastName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('الاسم الأخير يجب أن يكون أقل من 50 حرف')
      .trim()
      .escape(),
      
    body('email')
      .optional()
      .isEmail()
      .withMessage('البريد الإلكتروني غير صحيح')
      .normalizeEmail(),
      
    body('phone')
      .isLength({ min: 7, max: 20 })
      .withMessage('رقم الهاتف يجب أن يكون بين 7 و 20 رقم')
      .matches(/^[\+]?[0-9\s\-\(\)]+$/)
      .withMessage('رقم الهاتف غير صحيح'),
      
    body('address')
      .optional()
      .isLength({ max: 200 })
      .withMessage('العنوان يجب أن يكون أقل من 200 حرف')
      .trim()
      .escape(),
      
    body('city')
      .optional()
      .isLength({ max: 50 })
      .withMessage('المدينة يجب أن تكون أقل من 50 حرف')
      .trim()
      .escape(),
      
    body('country')
      .optional()
      .isLength({ max: 50 })
      .withMessage('الدولة يجب أن تكون أقل من 50 حرف')
      .trim()
      .escape()
  ];
};

// Validation rules for conversation data
const conversationValidationRules = () => {
  return [
    body('customerId')
      .isUUID()
      .withMessage('معرف العميل غير صحيح'),
      
    body('channel')
      .isIn(['web', 'facebook', 'whatsapp', 'email', 'phone'])
      .withMessage('القناة غير مدعومة'),
      
    body('status')
      .optional()
      .isIn(['open', 'closed', 'pending', 'resolved'])
      .withMessage('الحالة غير مدعومة'),
      
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('الأولوية غير مدعومة')
  ];
};

// Validation rules for message data
const messageValidationRules = () => {
  return [
    body('content')
      .isLength({ min: 1, max: 10000 })
      .withMessage('محتوى الرسالة مطلوب ويجب أن يكون أقل من 10000 حرف')
      .trim(),
      
    body('type')
      .optional()
      .isIn(['text', 'image', 'file', 'system'])
      .withMessage('نوع الرسالة غير مدعوم'),
      
    body('attachments')
      .optional()
      .isArray({ max: 10 })
      .withMessage('لا يمكن إرفاق أكثر من 10 ملفات'),
      
    body('metadata')
      .optional()
      .isObject()
      .withMessage('البيانات الوصفية يجب أن تكون كائن')
  ];
};

// Validation rules for product data
const productValidationRules = () => {
  return [
    body('name')
      .isLength({ min: 1, max: 200 })
      .withMessage('اسم المنتج مطلوب ويجب أن يكون بين 1 و 200 حرف')
      .trim()
      .escape(),
      
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('الوصف يجب أن يكون أقل من 1000 حرف')
      .trim()
      .escape(),
      
    body('price')
      .isFloat({ min: 0 })
      .withMessage('السعر يجب أن يكون رقم موجب')
      .toFloat(),
      
    body('comparePrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('سعر المقارنة يجب أن يكون رقم موجب')
      .toFloat(),
      
    body('cost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('التكلفة يجب أن تكون رقم موجب')
      .toFloat(),
      
    body('sku')
      .optional()
      .isLength({ max: 50 })
      .withMessage('رمز SKU يجب أن يكون أقل من 50 حرف')
      .trim()
      .escape(),
      
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('المخزون يجب أن يكون رقم موجب')
      .toInt(),
      
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('الحالة يجب أن تكون قيمة منطقية')
      .toBoolean()
  ];
};

// Validation rules for order data
const orderValidationRules = () => {
  return [
    body('customerId')
      .isUUID()
      .withMessage('معرف العميل غير صحيح'),
      
    body('items')
      .isArray({ min: 1 })
      .withMessage('الطلب يجب أن يحتوي على عنصر واحد على الأقل'),
      
    body('items.*.productId')
      .isUUID()
      .withMessage('معرف المنتج غير صحيح'),
      
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('الكمية يجب أن تكون رقم موجب')
      .toInt(),
      
    body('items.*.price')
      .isFloat({ min: 0 })
      .withMessage('السعر يجب أن يكون رقم موجب')
      .toFloat(),
      
    body('totalAmount')
      .isFloat({ min: 0 })
      .withMessage('المبلغ الإجمالي يجب أن يكون رقم موجب')
      .toFloat(),
      
    body('status')
      .optional()
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('الحالة غير مدعومة'),
      
    body('paymentStatus')
      .optional()
      .isIn(['pending', 'paid', 'failed', 'refunded'])
      .withMessage('حالة الدفع غير مدعومة')
  ];
};

// Validation rules for ID parameters
const idParamValidationRules = () => {
  return [
    param('id')
      .isUUID()
      .withMessage('المعرف غير صحيح')
  ];
};

// Validation rules for companyId parameters
const companyIdParamValidationRules = () => {
  return [
    param('companyId')
      .isUUID()
      .withMessage('معرف الشركة غير صحيح')
  ];
};

// Validation rules for query parameters
const queryValidationRules = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('رقم الصفحة يجب أن يكون رقم موجب')
      .toInt(),
      
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('الحد يجب أن يكون بين 1 و 100')
      .toInt(),
      
    query('sort')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'name', 'email', 'status'])
      .withMessage('مفتاح الترتيب غير مدعوم'),
      
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('ترتيب الترتيب غير مدعوم')
  ];
};

// Custom validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    
    // Log validation errors for security monitoring
    securityLogger.log('validation_error', {
      ip: req.ip,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      path: req.path,
      method: req.method,
      errors: errorMessages,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      message: 'بيانات الإدخال غير صحيحة',
      errors: errorMessages,
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key]
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        }
      }
    }
    
    // Sanitize body parameters
    if (req.body) {
      sanitizeObject(req.body);
    }
    
    next();
  } catch (error) {
    console.error('❌ [INPUT-SANITIZE] Error sanitizing input:', error);
    next();
  }
};

function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key]
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      sanitizeObject(obj[key]);
    }
  }
}

module.exports = {
  companyValidationRules,
  userValidationRules,
  customerValidationRules,
  conversationValidationRules,
  messageValidationRules,
  productValidationRules,
  orderValidationRules,
  idParamValidationRules,
  companyIdParamValidationRules,
  queryValidationRules,
  validate,
  sanitizeInput
};
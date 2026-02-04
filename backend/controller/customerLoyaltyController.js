/**
 * 🎁 Customer Loyalty Controller
 * وحدة التحكم في نظام ولاء العملاء
 */

const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeCashbackRules(inputRules) {
  const rules = parseJsonMaybe(inputRules, {});
  const percent = Number(rules.cashbackPercent ?? rules.percent ?? 0);
  const base = rules.base === 'subtotal' ? 'subtotal' : 'total';
  const trigger = rules.trigger || 'payment_completed';
  return {
    cashbackPercent: Number.isFinite(percent) ? percent : 0,
    base,
    trigger
  };
}

/**
 * جلب جميع برامج الولاء
 * GET /api/v1/hr/customer-loyalty/programs
 */
async function getPrograms(req, res) {
  try {
    const { companyId } = req.user;
    const { status, type } = req.query;

    const programs = await customerLoyaltyService.getPrograms(companyId, {
      status,
      type
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error('❌ Error getting loyalty programs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب برامج الولاء'
    });
  }
}

async function getCashbackSettings(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const prisma = getSharedPrismaClient();

    const program = await prisma.customerLoyaltyProgram.findFirst({
      where: { companyId, type: 'CASHBACK' },
      orderBy: { createdAt: 'asc' }
    });

    const ensured = program || await prisma.customerLoyaltyProgram.create({
      data: {
        companyId,
        name: 'Cashback',
        nameAr: 'كاش باك',
        type: 'CASHBACK',
        status: 'ACTIVE',
        pointsPerPurchase: '0.00',
        pointsPerReferral: '0.00',
        redemptionRate: '1.00',
        minimumPoints: '0.00',
        expiryMonths: 12,
        rules: JSON.stringify({ cashbackPercent: 0, base: 'total', trigger: 'payment_completed' }),
        createdBy: userId || 'system'
      }
    });

    res.json({
      success: true,
      data: {
        id: ensured.id,
        status: ensured.status,
        rules: normalizeCashbackRules(ensured.rules)
      }
    });
  } catch (error) {
    console.error('❌ Error getting cashback settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب إعدادات الكاش باك'
    });
  }
}

async function updateCashbackSettings(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const prisma = getSharedPrismaClient();

    const program = await prisma.customerLoyaltyProgram.findFirst({
      where: { companyId, type: 'CASHBACK' },
      orderBy: { createdAt: 'asc' }
    }) || await prisma.customerLoyaltyProgram.create({
      data: {
        companyId,
        name: 'Cashback',
        nameAr: 'كاش باك',
        type: 'CASHBACK',
        status: 'ACTIVE',
        pointsPerPurchase: '0.00',
        pointsPerReferral: '0.00',
        redemptionRate: '1.00',
        minimumPoints: '0.00',
        expiryMonths: 12,
        rules: JSON.stringify({ cashbackPercent: 0, base: 'total', trigger: 'payment_completed' }),
        createdBy: userId || 'system'
      }
    });

    const currentRules = normalizeCashbackRules(program.rules);

    const nextPercent = req.body.cashbackPercent ?? req.body.percent ?? currentRules.cashbackPercent;
    const nextBase = req.body.base ?? currentRules.base;
    const nextStatus = req.body.status ?? program.status;

    const percent = Number(nextPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return res.status(400).json({
        success: false,
        error: 'cashbackPercent must be a number between 0 and 100'
      });
    }

    const base = nextBase === 'subtotal' ? 'subtotal' : 'total';

    const updated = await prisma.customerLoyaltyProgram.update({
      where: { id: program.id },
      data: {
        status: nextStatus,
        rules: JSON.stringify({
          ...currentRules,
          cashbackPercent: percent,
          base
        })
      }
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        rules: normalizeCashbackRules(updated.rules)
      },
      message: 'تم تحديث إعدادات الكاش باك بنجاح'
    });
  } catch (error) {
    console.error('❌ Error updating cashback settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث إعدادات الكاش باك'
    });
  }
}

/**
 * جلب برنامج ولاء محدد
 * GET /api/v1/hr/customer-loyalty/programs/:id
 */
async function getProgramById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const program = await customerLoyaltyService.getProgramById(companyId, id);

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('❌ Error getting loyalty program:', error);
    res.status(error.message.includes('غير موجود') ? 404 : 500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب برنامج الولاء'
    });
  }
}

/**
 * إنشاء برنامج ولاء جديد
 * POST /api/v1/hr/customer-loyalty/programs
 */
async function createProgram(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const data = req.body;

    const program = await customerLoyaltyService.createProgram(companyId, data, userId);

    res.status(201).json({
      success: true,
      data: program,
      message: 'تم إنشاء برنامج الولاء بنجاح'
    });
  } catch (error) {
    console.error('❌ Error creating loyalty program:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء برنامج الولاء'
    });
  }
}

/**
 * تحديث برنامج ولاء
 * PUT /api/v1/hr/customer-loyalty/programs/:id
 */
async function updateProgram(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = req.body;

    const program = await customerLoyaltyService.updateProgram(companyId, id, data);

    res.json({
      success: true,
      data: program,
      message: 'تم تحديث برنامج الولاء بنجاح'
    });
  } catch (error) {
    console.error('❌ Error updating loyalty program:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث برنامج الولاء'
    });
  }
}

/**
 * جلب جميع المستويات
 * GET /api/v1/hr/customer-loyalty/tiers
 */
async function getTiers(req, res) {
  try {
    const { companyId } = req.user;
    const { programId } = req.query;

    const tiers = await customerLoyaltyService.getTiers(companyId, programId);

    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    console.error('❌ Error getting loyalty tiers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب المستويات'
    });
  }
}

/**
 * إنشاء مستوى جديد
 * POST /api/v1/hr/customer-loyalty/tiers
 */
async function createTier(req, res) {
  try {
    const { companyId } = req.user;
    const data = req.body;

    const tier = await customerLoyaltyService.createTier(companyId, data);

    res.status(201).json({
      success: true,
      data: tier,
      message: 'تم إنشاء المستوى بنجاح'
    });
  } catch (error) {
    console.error('❌ Error creating loyalty tier:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء المستوى'
    });
  }
}

/**
 * جلب سجلات ولاء العملاء
 * GET /api/v1/hr/customer-loyalty/customers
 */
async function getCustomerRecords(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, status } = req.query;

    const records = await customerLoyaltyService.getCustomerRecords(companyId, {
      customerId,
      programId,
      status
    });

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('❌ Error getting customer loyalty records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب سجلات ولاء العملاء'
    });
  }
}

/**
 * إضافة عميل إلى برنامج ولاء
 * POST /api/v1/hr/customer-loyalty/enroll
 */
async function enrollCustomer(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, initialPoints } = req.body;

    if (!customerId || !programId) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العميل والبرنامج'
      });
    }

    const record = await customerLoyaltyService.enrollCustomer(
      companyId,
      customerId,
      programId,
      initialPoints || 0
    );

    res.status(201).json({
      success: true,
      data: record,
      message: 'تم تسجيل العميل في برنامج الولاء بنجاح'
    });
  } catch (error) {
    console.error('❌ Error enrolling customer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تسجيل العميل'
    });
  }
}

/**
 * إضافة نقاط للعميل
 * POST /api/v1/hr/customer-loyalty/add-points
 */
async function addPoints(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, points, reason } = req.body;

    if (!customerId || !programId || !points) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العميل والبرنامج والنقاط'
      });
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن تكون النقاط أكبر من صفر'
      });
    }

    const record = await customerLoyaltyService.addPoints(
      companyId,
      customerId,
      programId,
      points,
      reason
    );

    res.json({
      success: true,
      data: record,
      message: 'تم إضافة النقاط بنجاح'
    });
  } catch (error) {
    console.error('❌ Error adding points:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إضافة النقاط'
    });
  }
}

/**
 * استبدال النقاط
 * POST /api/v1/hr/customer-loyalty/redeem-points
 */
async function redeemPoints(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, points } = req.body;

    if (!customerId || !programId || !points) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العميل والبرنامج والنقاط'
      });
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن تكون النقاط أكبر من صفر'
      });
    }

    const record = await customerLoyaltyService.redeemPoints(
      companyId,
      customerId,
      programId,
      points
    );

    res.json({
      success: true,
      data: record,
      message: 'تم استبدال النقاط بنجاح'
    });
  } catch (error) {
    console.error('❌ Error redeeming points:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء استبدال النقاط'
    });
  }
}

module.exports = {
  getPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  getTiers,
  createTier,
  getCustomerRecords,
  enrollCustomer,
  addPoints,
  redeemPoints,
  getCashbackSettings,
  updateCashbackSettings
};

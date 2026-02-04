const { getSharedPrismaClient } = require('./sharedDatabase');

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toDecimalString(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
}

async function ensureCashbackProgram(prisma, companyId, createdBy) {
  const existing = await prisma.customerLoyaltyProgram.findFirst({
    where: {
      companyId,
      type: 'CASHBACK'
    },
    orderBy: { createdAt: 'asc' }
  });

  if (existing) return existing;

  return prisma.customerLoyaltyProgram.create({
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
      createdBy: createdBy || 'system'
    }
  });
}

async function ensureLoyaltyRecord(prisma, companyId, customerId, programId) {
  const existing = await prisma.customerLoyaltyRecord.findUnique({
    where: {
      customer_program_unique: {
        customerId,
        programId
      }
    }
  });

  if (existing) return existing;

  return prisma.customerLoyaltyRecord.create({
    data: {
      companyId,
      customerId,
      programId,
      currentPoints: '0.00',
      totalEarned: '0.00',
      totalRedeemed: '0.00',
      status: 'ACTIVE',
      joinDate: new Date(),
      lastActivity: new Date()
    }
  });
}

async function applyCashbackForPaidOrder({ orderId, companyId, changedBy }) {
  const prisma = getSharedPrismaClient();

  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: {
      id: true,
      companyId: true,
      customerId: true,
      paymentStatus: true,
      subtotal: true,
      tax: true,
      shipping: true,
      discount: true,
      total: true,
      metadata: true
    }
  });

  if (!order) return { applied: false, reason: 'order_not_found' };
  if (order.paymentStatus !== 'COMPLETED') return { applied: false, reason: 'payment_not_completed' };

  const meta = parseJsonMaybe(order.metadata, {});
  const existingCashback = meta.cashback;
  if (existingCashback && existingCashback.applied === true) {
    return { applied: false, reason: 'already_applied' };
  }

  const program = await ensureCashbackProgram(prisma, companyId, changedBy);
  const rules = parseJsonMaybe(program.rules, {});

  const percent = Number(rules.cashbackPercent || 0);
  if (!Number.isFinite(percent) || percent <= 0) {
    return { applied: false, reason: 'percent_not_configured' };
  }

  const base = rules.base || 'total';
  const baseAmount = base === 'subtotal' ? Number(order.subtotal || 0) : Number(order.total || 0);
  const cashbackAmount = Math.max(0, (baseAmount * percent) / 100);
  if (cashbackAmount <= 0) {
    return { applied: false, reason: 'cashback_zero' };
  }

  return prisma.$transaction(async (tx) => {
    await ensureLoyaltyRecord(tx, companyId, order.customerId, program.id);

    await tx.customerLoyaltyRecord.update({
      where: {
        customer_program_unique: {
          customerId: order.customerId,
          programId: program.id
        }
      },
      data: {
        currentPoints: { increment: toDecimalString(cashbackAmount) },
        totalEarned: { increment: toDecimalString(cashbackAmount) },
        lastActivity: new Date(),
        lastPointsEarned: new Date()
      }
    });

    const nextMeta = { ...meta };
    nextMeta.cashback = {
      applied: true,
      programId: program.id,
      percent,
      base,
      amount: toDecimalString(cashbackAmount),
      appliedAt: new Date().toISOString(),
      reversals: {}
    };

    await tx.order.update({
      where: { id: order.id },
      data: {
        metadata: JSON.stringify(nextMeta)
      }
    });

    return { applied: true, amount: toDecimalString(cashbackAmount), programId: program.id };
  });
}

async function reverseCashbackForReturn({ returnRequestId, companyId, changedBy }) {
  const prisma = getSharedPrismaClient();

  const rr = await prisma.returnRequest.findFirst({
    where: { id: returnRequestId, companyId },
    include: {
      order: {
        select: {
          id: true,
          companyId: true,
          customerId: true,
          total: true,
          metadata: true
        }
      }
    }
  });

  if (!rr || !rr.order) return { reversed: false, reason: 'return_or_order_not_found' };
  if (!rr.refundAmount) return { reversed: false, reason: 'refund_amount_missing' };
  if (!(rr.status === 'APPROVED' || rr.status === 'COMPLETED')) return { reversed: false, reason: 'return_not_approved' };

  const meta = parseJsonMaybe(rr.order.metadata, {});
  const cashback = meta.cashback;
  if (!cashback || cashback.applied !== true) return { reversed: false, reason: 'no_cashback_on_order' };

  const programId = cashback.programId;
  const originalAmount = Number(cashback.amount || 0);
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return { reversed: false, reason: 'invalid_cashback_amount' };

  const reversals = cashback.reversals || {};
  if (reversals[returnRequestId]) {
    return { reversed: false, reason: 'already_reversed' };
  }

  const refundAmount = Number(rr.refundAmount || 0);
  const orderTotal = Math.max(0.01, Number(rr.order.total || 0));
  const ratio = Math.max(0, Math.min(1, refundAmount / orderTotal));
  const reverseAmount = Math.max(0, originalAmount * ratio);
  if (reverseAmount <= 0) return { reversed: false, reason: 'reverse_zero' };

  const program = await ensureCashbackProgram(prisma, companyId, changedBy);
  const finalProgramId = programId || program.id;

  return prisma.$transaction(async (tx) => {
    await ensureLoyaltyRecord(tx, companyId, rr.order.customerId, finalProgramId);

    const record = await tx.customerLoyaltyRecord.findUnique({
      where: {
        customer_program_unique: {
          customerId: rr.order.customerId,
          programId: finalProgramId
        }
      }
    });

    const currentPoints = Number(record?.currentPoints || 0);
    const totalEarned = Number(record?.totalEarned || 0);

    const decCurrent = Math.min(currentPoints, reverseAmount);
    const decEarned = Math.min(totalEarned, reverseAmount);

    await tx.customerLoyaltyRecord.update({
      where: {
        customer_program_unique: {
          customerId: rr.order.customerId,
          programId: finalProgramId
        }
      },
      data: {
        currentPoints: { decrement: toDecimalString(decCurrent) },
        totalEarned: { decrement: toDecimalString(decEarned) },
        lastActivity: new Date()
      }
    });

    const nextMeta = { ...meta };
    const nextCashback = { ...cashback };
    nextCashback.reversals = { ...(cashback.reversals || {}), [returnRequestId]: toDecimalString(reverseAmount) };
    nextMeta.cashback = nextCashback;

    await tx.order.update({
      where: { id: rr.order.id },
      data: {
        metadata: JSON.stringify(nextMeta)
      }
    });

    return { reversed: true, amount: toDecimalString(reverseAmount), ratio };
  });
}

module.exports = {
  applyCashbackForPaidOrder,
  reverseCashbackForReturn
};

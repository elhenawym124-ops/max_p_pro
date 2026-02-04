const { getSharedPrismaClient } = require('./sharedDatabase');

class CommissionService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * حساب جميع العمولات للطلب
   */
  async calculateCommissions(orderId) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          affiliate: true,
          orderItems: {
            include: {
              product: {
                include: {
                  merchantProducts: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error('الطلب غير موجود');
      }

      const commissions = [];
      let totalAffiliateProfit = 0;
      let totalPlatformProfit = 0;
      const merchantProfits = new Map(); // merchantId -> amount

      // حساب العمولات بناءً على كل عنصر في الطلب
      for (const item of order.orderItems) {
        const qty = item.quantity;
        const sellPrice = Number(item.price);

        // استخدام الأسعار المخزنة في الطلب (التي تم تثبيتها عند الإنشاء)
        // إذا لم توجد (للطلبات القديمة)، نستخدم السعر الحالي كاحتياطي
        const basePrice = Number(item.basePrice || sellPrice);
        const merchantPrice = Number(item.merchantPrice || basePrice);

        // 1. ربح التاجر (سعر التكلفة الأصلي)
        if (item.product?.merchantProducts?.length > 0) {
          const merchantId = item.product.merchantProducts[0].merchantId;
          const currentAmount = merchantProfits.get(merchantId) || 0;
          merchantProfits.set(merchantId, currentAmount + (merchantPrice * qty));
        }

        // 2. ربح المنصة (السعر الأساسي - سعر التاجر)
        totalPlatformProfit += (basePrice - merchantPrice) * qty;

        // 3. ربح المسوق (سعر البيع للعميل - السعر الأساسي للمنصة)
        if (order.affiliateId) {
          totalAffiliateProfit += (sellPrice - basePrice) * qty;
        }
      }

      // إضافة عمولة المسوق للقائمة
      if (totalAffiliateProfit > 0) {
        commissions.push({
          type: 'AFFILIATE',
          affiliateId: order.affiliateId,
          amount: Number(totalAffiliateProfit.toFixed(2)),
          orderTotal: order.total,
          status: 'CONFIRMED'
        });
      }

      // إضافة عمولات التجار للقائمة
      for (const [merchantId, amount] of merchantProfits) {
        commissions.push({
          type: 'MERCHANT',
          merchantId,
          amount: Number(amount.toFixed(2)),
          orderTotal: order.total,
          status: 'CONFIRMED'
        });
      }

      // إضافة عمولة المنصة للقائمة
      if (totalPlatformProfit > 0) {
        commissions.push({
          type: 'PLATFORM',
          amount: Number(totalPlatformProfit.toFixed(2)),
          orderTotal: order.total,
          status: 'CONFIRMED'
        });
      }

      // حفظ جميع العمولات في قاعدة البيانات
      const savedCommissions = [];
      for (const commission of commissions) {
        const saved = await this.prisma.commission.create({
          data: {
            orderId,
            affiliateId: commission.affiliateId || null,
            merchantId: commission.merchantId || null,
            type: commission.type,
            amount: commission.amount,
            orderTotal: order.total,
            companyId: order.companyId,
            status: commission.status || 'CONFIRMED'
          }
        });
        savedCommissions.push(saved);
      }

      console.log('✅ [COMMISSION] Calculated triple-split profits for order:', orderId);
      return savedCommissions;
    } catch (error) {
      console.error('❌ [COMMISSION] Error calculating triple-split commissions:', error);
      throw error;
    }
  }

  /**
   * حساب عمولة المسوق حسب النوع
   */
  async calculateAffiliateCommission(orderId, affiliateId, type, order = null) {
    try {
      if (!order) {
        order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            affiliate: true,
            orderItems: {
              include: {
                product: true
              }
            }
          }
        });
      }

      if (!order || !order.affiliate) {
        throw new Error('الطلب غير مرتبط بمسوق');
      }

      let commissionAmount = 0;
      let rate = null;
      let markup = null;
      let baseAmount = null;

      if (type === 'PERCENTAGE') {
        // الطريقة الأولى: نسبة مئوية (تعتمد على subtotal بدلاً من total)
        const commissionRate = order.affiliate.commissionRate;
        const subtotal = Number(order.subtotal || (Number(order.total) - Number(order.shipping || 0)));
        commissionAmount = Number((subtotal * (commissionRate / 100)).toFixed(2));
        rate = commissionRate;
      } else if (type === 'MARKUP') {
        // الطريقة الثانية: هامش ربح
        let totalMarkup = 0;
        let totalBase = 0;

        for (const item of order.orderItems) {
          const affiliateProduct = await this.prisma.affiliateProduct.findUnique({
            where: {
              affiliateId_productId: {
                affiliateId,
                productId: item.productId
              }
            }
          });

          if (affiliateProduct && affiliateProduct.isActive) {
            totalMarkup += Number(Number(affiliateProduct.markup).toFixed(2)) * item.quantity;
            totalBase += Number(Number(affiliateProduct.basePrice).toFixed(2)) * item.quantity;
          } else {
            // إذا لم يكن هناك منتج مسوق، استخدام السعر العادي
            totalBase += Number(item.product.price) * item.quantity;
          }
        }

        markup = totalMarkup;
        baseAmount = totalBase;
        commissionAmount = totalMarkup;
      }

      return {
        amount: commissionAmount,
        calculationType: type,
        rate,
        markup,
        baseAmount,
        status: 'CONFIRMED'
      };
    } catch (error) {
      console.error('❌ [COMMISSION] Error calculating affiliate commission:', error);
      throw error;
    }
  }

  /**
   * تأكيد العمولة
   */
  async confirmCommission(commissionId) {
    try {
      const commission = await this.prisma.commission.update({
        where: { id: commissionId },
        data: {
          status: 'CONFIRMED'
        },
        include: {
          affiliate: true
        }
      });

      // تحديث إحصائيات المسوق
      if (commission.affiliateId) {
        const affiliateService = require('./affiliateService');
        await affiliateService.updateAffiliateStats(commission.affiliateId);
      }

      console.log('✅ [COMMISSION] Confirmed commission:', commissionId);
      return commission;
    } catch (error) {
      console.error('❌ [COMMISSION] Error confirming commission:', error);
      throw error;
    }
  }

  /**
   * معالجة دفعة للمسوق
   */
  async processPayout(affiliateId, amount, paymentData) {
    try {
      const affiliate = await this.prisma.affiliate.findUnique({
        where: { id: affiliateId }
      });

      if (!affiliate) {
        throw new Error('المسوق غير موجود');
      }

      if (Number(amount) > Number(affiliate.pendingEarnings)) {
        throw new Error('المبلغ المطلوب أكبر من الأرباح المعلقة');
      }

      // إنشاء دفعة
      const payout = await this.prisma.affiliatePayout.create({
        data: {
          affiliateId,
          amount,
          paymentMethod: paymentData.method,
          paymentDetails: paymentData.details ? JSON.stringify(paymentData.details) : null,
          status: 'PENDING'
        }
      });

      // ربط العمولات المعلقة بالدفعة
      const pendingCommissions = await this.prisma.commission.findMany({
        where: {
          affiliateId,
          status: 'CONFIRMED',
          payoutId: null
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      let totalLinked = 0;
      for (const commission of pendingCommissions) {
        if (totalLinked + Number(commission.amount) <= Number(amount)) {
          await this.prisma.commission.update({
            where: { id: commission.id },
            data: {
              payoutId: payout.id
              // لا نغير الحالة لـ PAID هنا، بل تظل CONFIRMED حتى اكتمال الدفع
            }
          });
          totalLinked += Number(commission.amount);
        }
      }

      console.log('✅ [COMMISSION] Created payout:', payout.id);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error processing payout:', error);
      throw error;
    }
  }

  /**
   * تسجيل دفعة خارجية
   */
  async recordExternalPayout(payoutId, transactionData) {
    try {
      const { transactionId, externalReference, paymentDate } = transactionData;

      const payout = await this.prisma.affiliatePayout.update({
        where: { id: payoutId },
        data: {
          status: 'PAID_EXTERNAL',
          transactionId,
          externalReference,
          externalPaymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          processedAt: new Date()
        },
        include: {
          affiliate: true
        }
      });

      // تحديث حالة جميع العمولات المرتبطة بهذه الدفعة إلى PAID
      await this.prisma.commission.updateMany({
        where: { payoutId: payout.id },
        data: {
          status: 'PAID',
          paidAt: new Date()
        }
      });

      // تحديث إحصائيات المسوق
      const affiliateService = require('./affiliateService');
      await affiliateService.updateAffiliateStats(payout.affiliateId);

      console.log('✅ [COMMISSION] Recorded external payout:', payoutId);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error recording external payout:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات العمولات
   */
  async getCommissionStats(companyId, filters = {}) {
    try {
      const { startDate, endDate, affiliateId, merchantId } = filters;

      const where = {
        companyId
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      if (affiliateId) {
        where.affiliateId = affiliateId;
      }

      if (merchantId) {
        where.merchantId = merchantId;
      }

      const commissions = await this.prisma.commission.findMany({
        where,
        include: {
          affiliate: {
            select: {
              id: true,
              affiliateCode: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          merchant: {
            select: {
              id: true,
              name: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true
            }
          }
        }
      });

      // حساب الإحصائيات
      const stats = {
        total: commissions.length,
        totalAmount: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
        byType: {
          AFFILIATE: 0,
          MERCHANT: 0,
          PLATFORM: 0
        },
        byStatus: {
          PENDING: 0,
          CONFIRMED: 0,
          PAID: 0,
          CANCELLED: 0
        }
      };

      for (const commission of commissions) {
        stats.byType[commission.type] = (stats.byType[commission.type] || 0) + Number(commission.amount);
        stats.byStatus[commission.status] = (stats.byStatus[commission.status] || 0) + 1;
      }

      return {
        commissions,
        stats
      };
    } catch (error) {
      console.error('❌ [COMMISSION] Error getting commission stats:', error);
      throw error;
    }
  }
}

module.exports = new CommissionService();

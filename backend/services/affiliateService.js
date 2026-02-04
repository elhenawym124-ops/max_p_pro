const { getSharedPrismaClient } = require('./sharedDatabase');
const crypto = require('crypto');

class AffiliateService {
  /**
   * الحصول على Prisma client
   */
  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * تسجيل مسوق جديد
   */
  async registerAffiliate(userId, data = {}) {
    try {
      const prisma = this.prisma;
      const {
        companyId,
        commissionType = 'PERCENTAGE',
        commissionRate = 5.0,
        paymentMethod,
        paymentDetails,
        minPayout = 100.0
      } = data;

      // التحقق من أن المستخدم غير مسجل كمسوق
      const existingAffiliate = await prisma.affiliate.findUnique({
        where: { userId }
      });

      if (existingAffiliate) {
        throw new Error('المستخدم مسجل بالفعل كمسوق');
      }

      // إنشاء كود فريد للمسوق
      const affiliateCode = await this.generateAffiliateCode();

      // إنشاء المسوق
      const affiliate = await prisma.affiliate.create({
        data: {
          userId,
          companyId,
          affiliateCode,
          commissionType,
          commissionRate,
          paymentMethod,
          paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
          minPayout,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      console.log('✅ [AFFILIATE] Registered new affiliate:', affiliateCode);
      return affiliate;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error registering affiliate:', error);
      throw error;
    }
  }

  /**
   * إنشاء كود فريد للمسوق
   */
  async generateAffiliateCode() {
    const prisma = this.prisma;
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // إنشاء كود من 8 أحرف عشوائية
      code = crypto.randomBytes(4).toString('hex').toUpperCase();

      const existing = await prisma.affiliate.findUnique({
        where: { affiliateCode: code }
      });

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('فشل في إنشاء كود فريد للمسوق');
    }

    return code;
  }

  /**
   * تتبع إحالة
   */
  async trackReferral(affiliateCode, customerId, metadata = {}) {
    try {
      const prisma = this.prisma;
      // البحث عن المسوق
      const affiliate = await prisma.affiliate.findFirst({
        where: {
          affiliateCode,
          status: 'ACTIVE'
        }
      });

      if (!affiliate) {
        throw new Error('كود المسوق غير صحيح أو غير نشط');
      }

      // التحقق من وجود إحالة مؤخرة من نفس العميل/IP لمنع تكرار حساب النقرات
      // (Cooldown: 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentReferral = await prisma.affiliateReferral.findFirst({
        where: {
          affiliateId: affiliate.id,
          OR: [
            customerId ? { customerId } : undefined,
            metadata.ipAddress ? { ipAddress: metadata.ipAddress } : undefined
          ].filter(Boolean),
          createdAt: { gte: oneHourAgo }
        }
      });

      if (recentReferral) {
        // إذا وجد سجل حديث، نكتفي بإرجاعه دون زيادة عدد النقرات
        return recentReferral;
      }

      // إنشاء سجل إحالة
      const referral = await prisma.affiliateReferral.create({
        data: {
          affiliateId: affiliate.id,
          customerId,
          referralCode: affiliateCode,
          referralUrl: metadata.url,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          source: metadata.source
        }
      });

      // تحديث عدد النقرات
      await prisma.affiliate.update({
        where: { id: affiliate.id },
        data: {
          totalClicks: {
            increment: 1
          }
        }
      });

      console.log('✅ [AFFILIATE] Tracked referral:', referral.id);
      return referral;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error tracking referral:', error);
      throw error;
    }
  }

  /**
   * حساب عمولة المسوق
   */
  async calculateCommission(orderId, affiliateId) {
    try {
      const prisma = this.prisma;
      const order = await prisma.order.findUnique({
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

      if (!order || !order.affiliateId || order.affiliateId !== affiliateId) {
        throw new Error('الطلب غير مرتبط بهذا المسوق');
      }

      const affiliate = order.affiliate;
      let commissionAmount = 0;

      if (affiliate.commissionType === 'PERCENTAGE') {
        // الطريقة الأولى: نسبة مئوية
        commissionAmount = Number(order.total) * (affiliate.commissionRate / 100);
      } else if (affiliate.commissionType === 'MARKUP') {
        // الطريقة الثانية: هامش ربح
        // حساب الهامش بناءً على (سعر البيع - السعر الأساسي)
        let totalMarkup = 0;
        for (const item of order.orderItems) {
          const affiliateProduct = await prisma.affiliateProduct.findUnique({
            where: {
              affiliateId_productId: {
                affiliateId: affiliate.id,
                productId: item.productId
              }
            }
          });

          if (affiliateProduct) {
            // Commission = (Selling Price - Base Price) * Quantity
            // This allows dynamic markup (if affiliate increased/decreased price)
            const sellingPrice = Number(item.price);
            const basePrice = Number(affiliateProduct.basePrice);
            const commissionPerItem = sellingPrice - basePrice;

            // Ensure commission is calculated correctly even if price changed
            totalMarkup += commissionPerItem * item.quantity;
          }
        }
        commissionAmount = totalMarkup;
      }


      return {
        amount: commissionAmount,
        type: affiliate.commissionType,
        rate: affiliate.commissionRate
      };
    } catch (error) {
      console.error('❌ [AFFILIATE] Error calculating commission:', error);
      throw error;
    }
  }

  /**
   * تحديث إحصائيات المسوق
   */
  async updateAffiliateStats(affiliateId) {
    try {
      const prisma = this.prisma;

      // 1. حساب إحصائيات المبيعات (عدد الإحالات الناجحة)
      const totalSales = await prisma.affiliateReferral.count({
        where: {
          affiliateId,
          converted: true
        }
      });

      // 2. حساب العمولات (الإجمالي، المدفوع، المعلق)
      const commissionStats = await prisma.commission.aggregate({
        where: {
          affiliateId,
          status: { in: ['CONFIRMED', 'PAID'] }
        },
        _sum: {
          amount: true
        }
      });

      const paidStats = await prisma.commission.aggregate({
        where: {
          affiliateId,
          status: 'PAID'
        },
        _sum: {
          amount: true
        }
      });

      const totalEarnings = Number(commissionStats._sum.amount || 0);
      const paidEarnings = Number(paidStats._sum.amount || 0);
      const pendingEarnings = Number((totalEarnings - paidEarnings).toFixed(2));

      // 3. حساب نسبة التحويل
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: { totalClicks: true }
      });

      const conversionRate = (affiliate && affiliate.totalClicks > 0)
        ? Number(((totalSales / affiliate.totalClicks) * 100).toFixed(2))
        : 0;

      // 4. تحديث سجل المسوق
      await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          totalSales,
          totalEarnings,
          paidEarnings,
          pendingEarnings,
          conversionRate
        }
      });

      console.log('✅ [AFFILIATE] Updated stats for affiliate (Optimized):', affiliateId);
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating stats:', error);
      throw error;
    }
  }

  /**
   * إنشاء منتج مسوق (للطريقة الثانية)
   */
  async createAffiliateProduct(affiliateId, productId, markup) {
    try {
      const prisma = this.prisma;
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error('المنتج غير موجود');
      }

      if (!product.allowAffiliateMarkup) {
        throw new Error('هذا المنتج لا يسمح بإضافة هامش ربح');
      }

      const basePrice = product.basePrice || product.price;
      const finalPrice = Number(basePrice) + Number(markup);

      const affiliateProduct = await prisma.affiliateProduct.upsert({
        where: {
          affiliateId_productId: {
            affiliateId,
            productId
          }
        },
        update: {
          markup,
          finalPrice,
          isActive: true
        },
        create: {
          affiliateId,
          productId,
          basePrice,
          markup,
          finalPrice
        }
      });

      console.log('✅ [AFFILIATE] Created/updated affiliate product');
      return affiliateProduct;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error creating affiliate product:', error);
      throw error;
    }
  }

  /**
   * الحصول على سعر المنتج للمسوق
   */
  async getAffiliateProductPrice(affiliateId, productId) {
    try {
      const prisma = this.prisma;
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId }
      });

      if (!affiliate) {
        throw new Error('المسوق غير موجود');
      }

      if (affiliate.commissionType === 'PERCENTAGE') {
        // الطريقة الأولى: إرجاع السعر العادي
        const product = await prisma.product.findUnique({
          where: { id: productId }
        });
        return {
          price: product.price,
          type: 'PERCENTAGE'
        };
      } else {
        // الطريقة الثانية: إرجاع السعر مع الهامش
        const affiliateProduct = await prisma.affiliateProduct.findUnique({
          where: {
            affiliateId_productId: {
              affiliateId,
              productId
            }
          }
        });

        if (affiliateProduct && affiliateProduct.isActive) {
          return {
            price: affiliateProduct.finalPrice,
            basePrice: affiliateProduct.basePrice,
            markup: affiliateProduct.markup,
            type: 'MARKUP'
          };
        }

        // إذا لم يكن هناك منتج مسوق، إرجاع السعر العادي
        const product = await prisma.product.findUnique({
          where: { id: productId }
        });
        return {
          price: product.price,
          type: 'MARKUP',
          needsSetup: true
        };
      }
    } catch (error) {
      console.error('❌ [AFFILIATE] Error getting product price:', error);
      throw error;
    }
  }

  /**
   * إنشاء طلب مباشر من المسوق
   */
  async createAffiliateOrder(affiliateId, orderData, customerData = null) {
    try {
      const prisma = this.prisma;
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId }
      });

      if (!affiliate || affiliate.status !== 'ACTIVE') {
        throw new Error('المسوق غير موجود أو غير نشط');
      }

      // إذا كان هناك بيانات عميل، إنشاء أو البحث عن العميل
      let customerId = orderData.customerId;
      if (customerData && !customerId) {
        // البحث عن عميل موجود أو إنشاء جديد
        const customer = await prisma.customer.upsert({
          where: {
            customer_whatsapp_company: {
              whatsappId: customerData.phone,
              companyId: affiliate.companyId
            }
          },
          update: {},
          create: {
            firstName: customerData.firstName || 'عميل',
            lastName: customerData.lastName || '',
            phone: customerData.phone,
            whatsappId: customerData.phone,
            companyId: affiliate.companyId,
            status: 'CUSTOMER'
          }
        });
        customerId = customer.id;
      }

      // إنشاء الطلب (سيتم ربطه بالمسوق تلقائياً في orderService)
      return {
        affiliateId,
        customerId,
        orderSource: 'AFFILIATE_DIRECT',
        ...orderData
      };
    } catch (error) {
      console.error('❌ [AFFILIATE] Error creating affiliate order:', error);
      throw error;
    }
  }

  /**
   * الحصول على طلبات المسوق
   */
  async getAffiliateOrders(affiliateId, filters = {}) {
    try {
      const prisma = this.prisma;
      const { status, orderSource, limit = 50, offset = 0 } = filters;

      const where = {
        affiliateId
      };

      if (status) {
        where.status = status;
      }

      if (orderSource) {
        where.orderSource = orderSource;
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          commissions: {
            where: {
              affiliateId,
              type: 'AFFILIATE'
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return orders;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error getting affiliate orders:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة العملاء المرتبطين بالمسوق
   */
  async getAffiliateCustomers(affiliateId) {
    try {
      const prisma = this.prisma;

      // جلب العملاء مع تجميع إحصائياتهم مباشرة من الـ orders
      const customerStats = await prisma.order.groupBy({
        by: ['customerId'],
        where: { affiliateId },
        _count: {
          id: true
        },
        _sum: {
          total: true
        }
      });

      if (customerStats.length === 0) return [];

      // جلب بيانات العملاء لهؤلاء المعرفات
      const customerIds = customerStats.map(stat => stat.customerId);
      const customers = await prisma.customer.findMany({
        where: {
          id: { in: customerIds }
        }
      });

      // دمج البيانات
      return customers.map(customer => {
        const stats = customerStats.find(s => s.customerId === customer.id);
        return {
          ...customer,
          totalOrders: stats?._count?.id || 0,
          totalSpent: Number(Number(stats?._sum?.total || 0).toFixed(2))
        };
      });
    } catch (error) {
      console.error('❌ [AFFILIATE] Error getting affiliate customers:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة جميع المسوقين (للإدارة)
   */
  async listAffiliates(companyId) {
    try {
      const prisma = this.prisma;
      const affiliates = await prisma.affiliate.findMany({
        where: { companyId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return affiliates.map(a => ({
        ...a,
        isActive: a.status === 'ACTIVE'
      }));
    } catch (error) {
      console.error('❌ [AFFILIATE] Error listing affiliates:', error);
      throw error;
    }
  }

  /**
   * تحديث حالة المسوق
   */
  async updateAffiliateStatus(affiliateId, statusOrActive) {
    try {
      const prisma = this.prisma;
      let newStatus;

      // تحديد الحالة الجديدة بناءً على المدخلات
      if (typeof statusOrActive === 'string') {
        newStatus = statusOrActive;
      } else {
        newStatus = statusOrActive ? 'ACTIVE' : 'SUSPENDED';
      }

      return await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          status: newStatus
        }
      });
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating affiliate status:', error);
      throw error;
    }
  }

  /**
   * تحديث نسبة عمولة المسوق
   */
  async updateAffiliateCommission(affiliateId, commissionRate) {
    try {
      const prisma = this.prisma;
      return await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          commissionRate
        }
      });
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating affiliate commission:', error);
      throw error;
    }
  }
}

module.exports = new AffiliateService();

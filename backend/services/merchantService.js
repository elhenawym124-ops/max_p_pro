const { getSharedPrismaClient } = require('./sharedDatabase');
const crypto = require('crypto');

class MerchantService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * إنشاء تاجر جديد
   */
  async createMerchant(companyId, data) {
    try {
      const {
        name,
        email,
        phone,
        address,
        commissionRate = 10.0,
        autoFulfill = false,
        webhookUrl,
        settings
      } = data;

      // إنشاء API key فريد
      const apiKey = crypto.randomBytes(32).toString('hex');

      const merchant = await this.prisma.merchant.create({
        data: {
          companyId,
          name,
          email,
          phone,
          address,
          commissionRate,
          autoFulfill,
          apiKey,
          webhookUrl,
          settings: settings ? JSON.stringify(settings) : null
        }
      });

      console.log('✅ [MERCHANT] Created merchant:', merchant.id);
      return merchant;
    } catch (error) {
      console.error('❌ [MERCHANT] Error creating merchant:', error);
      throw error;
    }
  }

  /**
   * تحديث تاجر
   */
  async updateMerchant(merchantId, data) {
    try {
      const updateData = { ...data };

      if (updateData.settings) {
        updateData.settings = JSON.stringify(updateData.settings);
      }

      const merchant = await this.prisma.merchant.update({
        where: { id: merchantId },
        data: updateData
      });

      console.log('✅ [MERCHANT] Updated merchant:', merchantId);
      return merchant;
    } catch (error) {
      console.error('❌ [MERCHANT] Error updating merchant:', error);
      throw error;
    }
  }

  /**
   * إضافة منتج للتاجر
   */
  async addMerchantProduct(merchantId, productId, data) {
    try {
      const {
        merchantSku,
        merchantPrice,
        stock = 0,
        syncEnabled = true
      } = data;

      const merchantProduct = await this.prisma.merchantProduct.upsert({
        where: {
          merchantId_productId: {
            merchantId,
            productId
          }
        },
        update: {
          merchantSku,
          merchantPrice,
          stock,
          syncEnabled,
          isActive: true
        },
        create: {
          merchantId,
          productId,
          merchantSku,
          merchantPrice,
          stock,
          syncEnabled,
          isActive: true
        },
        include: {
          merchant: true
        }
      });

      // جلب إعدادات الأفليت للحصول على هامش ربح المنصة
      const settings = await this.prisma.affiliateSetting.findUnique({
        where: { companyId: merchantProduct.merchant.companyId }
      });

      let basePrice = Number(merchantPrice);
      if (settings) {
        if (settings.platformMarginType === 'FIXED') {
          basePrice += Number(settings.platformMarginValue || 0);
        } else if (settings.platformMarginType === 'PERCENTAGE') {
          basePrice *= (1 + (Number(settings.platformMarginValue || 0) / 100));
        }
      }

      // تحديث المنتج الأصلي بالسعر الأساسي (سعر التاجر + ربح المنصة)
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          isDropshipped: true,
          price: Number(basePrice.toFixed(2)),
          basePrice: Number(basePrice.toFixed(2)) // تخزين السعر الأساسي للمسوقين
        }
      });

      console.log('✅ [MERCHANT] Added/updated merchant product with platform margin');
      return merchantProduct;
    } catch (error) {
      console.error('❌ [MERCHANT] Error adding merchant product:', error);
      throw error;
    }
  }

  /**
   * مزامنة المخزون مع التاجر
   */
  async syncMerchantInventory(merchantId) {
    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          products: {
            where: {
              syncEnabled: true
            }
          }
        }
      });

      if (!merchant) {
        throw new Error('التاجر غير موجود');
      }

      // هنا يمكن إضافة منطق مزامنة مع API التاجر
      // حالياً سنقوم بتحديث lastSyncedAt فقط
      for (const product of merchant.products) {
        await this.prisma.merchantProduct.update({
          where: { id: product.id },
          data: {
            lastSyncedAt: new Date()
          }
        });
      }

      console.log('✅ [MERCHANT] Synced inventory for merchant:', merchantId);
      return {
        synced: merchant.products.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ [MERCHANT] Error syncing inventory:', error);
      throw error;
    }
  }

  /**
   * إنشاء طلب عند التاجر
   */
  async createMerchantOrder(orderId, merchantId) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  merchantProducts: {
                    where: {
                      merchantId
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error('الطلب غير موجود');
      }

      // جمع المنتجات المرتبطة بهذا التاجر
      const merchantItems = [];
      let totalAmount = 0;

      for (const item of order.orderItems) {
        if (item.product.merchantProducts && item.product.merchantProducts.length > 0) {
          const merchantProduct = item.product.merchantProducts[0];
          merchantItems.push({
            productId: item.productId,
            merchantSku: merchantProduct.merchantSku,
            quantity: item.quantity,
            price: merchantProduct.merchantPrice
          });
          totalAmount += Number(merchantProduct.merchantPrice) * item.quantity;
        }
      }

      if (merchantItems.length === 0) {
        throw new Error('لا توجد منتجات مرتبطة بهذا التاجر');
      }

      // إنشاء طلب التاجر
      const merchantOrder = await this.prisma.merchantOrder.create({
        data: {
          merchantId,
          orderId,
          items: JSON.stringify(merchantItems),
          totalAmount,
          shippingAddress: order.shippingAddress,
          status: 'PENDING'
        }
      });

      // تحديث الطلب الأصلي
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          merchantOrderId: merchantOrder.id,
          isDropshipped: true
        }
      });

      console.log('✅ [MERCHANT] Created merchant order:', merchantOrder.id);
      return merchantOrder;
    } catch (error) {
      console.error('❌ [MERCHANT] Error creating merchant order:', error);
      throw error;
    }
  }

  /**
   * تنفيذ طلب التاجر
   */
  async fulfillMerchantOrder(merchantOrderId, trackingData) {
    try {
      const { trackingNumber, merchantOrderId: externalOrderId, notes } = trackingData;

      const merchantOrder = await this.prisma.merchantOrder.update({
        where: { id: merchantOrderId },
        data: {
          status: 'FULFILLED',
          trackingNumber,
          merchantOrderId: externalOrderId,
          fulfilledAt: new Date(),
          notes
        },
        include: {
          order: true
        }
      });

      // تحديث حالة الطلب الأصلي
      await this.prisma.order.update({
        where: { id: merchantOrder.orderId },
        data: {
          turboTrackingNumber: trackingNumber,
          turboShipmentStatus: 'FULFILLED'
        }
      });

      console.log('✅ [MERCHANT] Fulfilled merchant order:', merchantOrderId);
      return merchantOrder;
    } catch (error) {
      console.error('❌ [MERCHANT] Error fulfilling merchant order:', error);
      throw error;
    }
  }

  /**
   * الحصول على طلبات التاجر
   */
  async getMerchantOrders(merchantId, filters = {}) {
    try {
      const { status, limit = 50, offset = 0 } = filters;

      const where = { merchantId };
      if (status) {
        where.status = status;
      }

      const orders = await this.prisma.merchantOrder.findMany({
        where,
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
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
      console.error('❌ [MERCHANT] Error getting merchant orders:', error);
      throw error;
    }
  }
}

module.exports = new MerchantService();

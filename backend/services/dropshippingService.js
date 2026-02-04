const { getSharedPrismaClient } = require('./sharedDatabase');
const merchantService = require('./merchantService');

class DropshippingService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * توجيه الطلب للتاجر
   */
  async routeOrderToMerchant(orderId) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  merchantProducts: {
                    include: {
                      merchant: true
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

      // تجميع المنتجات حسب التاجر
      const merchantGroups = new Map();

      for (const item of order.orderItems) {
        if (item.product.merchantProducts && item.product.merchantProducts.length > 0) {
          const merchantProduct = item.product.merchantProducts[0];
          const merchantId = merchantProduct.merchantId;

          if (!merchantGroups.has(merchantId)) {
            merchantGroups.set(merchantId, {
              merchant: merchantProduct.merchant,
              items: []
            });
          }

          merchantGroups.get(merchantId).items.push({
            productId: item.productId,
            quantity: item.quantity,
            merchantProduct
          });
        }
      }

      // إنشاء طلب لكل تاجر
      const merchantOrders = [];
      for (const [merchantId, group] of merchantGroups) {
        const merchantOrder = await merchantService.createMerchantOrder(orderId, merchantId);
        merchantOrders.push(merchantOrder);

        // إذا كان التاجر يدعم التنفيذ التلقائي
        if (group.merchant.autoFulfill) {
          // يمكن إضافة منطق التنفيذ التلقائي هنا
          console.log('🔄 [DROPSHIPPING] Auto-fulfill enabled for merchant:', merchantId);
        }
      }

      console.log('✅ [DROPSHIPPING] Routed order to merchants:', merchantOrders.length);
      return merchantOrders;
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error routing order to merchant:', error);
      throw error;
    }
  }

  /**
   * التحقق من توفر المنتج عند التاجر
   */
  async checkMerchantAvailability(productId, quantity) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          merchantProducts: {
            where: {
              isActive: true,
              syncEnabled: true
            },
            include: {
              merchant: {
                where: {
                  isActive: true
                }
              }
            }
          }
        }
      });

      if (!product || !product.merchantProducts || product.merchantProducts.length === 0) {
        return {
          available: false,
          reason: 'المنتج غير متوفر للدروب شيبنج'
        };
      }

      // التحقق من المخزون
      const merchantProduct = product.merchantProducts[0];
      if (merchantProduct.stock < quantity) {
        return {
          available: false,
          reason: 'المخزون غير كافي',
          availableStock: merchantProduct.stock,
          requestedQuantity: quantity
        };
      }

      return {
        available: true,
        merchant: merchantProduct.merchant,
        merchantProduct,
        price: merchantProduct.merchantPrice
      };
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error checking availability:', error);
      throw error;
    }
  }

  /**
   * مزامنة منتجات التاجر
   */
  async syncMerchantProducts(merchantId) {
    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          products: {
            where: {
              syncEnabled: true
            },
            include: {
              product: true
            }
          }
        }
      });

      if (!merchant) {
        throw new Error('التاجر غير موجود');
      }

      // هنا يمكن إضافة منطق مزامنة مع API التاجر
      // حالياً سنقوم بتحديث lastSyncedAt فقط
      const syncedProducts = [];
      for (const merchantProduct of merchant.products) {
        await this.prisma.merchantProduct.update({
          where: { id: merchantProduct.id },
          data: {
            lastSyncedAt: new Date()
          }
        });
        syncedProducts.push(merchantProduct.productId);
      }

      console.log('✅ [DROPSHIPPING] Synced products for merchant:', merchantId);
      return {
        merchantId,
        syncedCount: syncedProducts.length,
        productIds: syncedProducts,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error syncing merchant products:', error);
      throw error;
    }
  }

  /**
   * التحقق من أن جميع منتجات الطلب متوفرة
   */
  async validateOrderItems(orderItems) {
    try {
      const validationResults = [];

      for (const item of orderItems) {
        const availability = await this.checkMerchantAvailability(
          item.productId,
          item.quantity
        );

        validationResults.push({
          productId: item.productId,
          quantity: item.quantity,
          ...availability
        });
      }

      const allAvailable = validationResults.every(r => r.available);

      return {
        allAvailable,
        results: validationResults
      };
    } catch (error) {
      console.error('❌ [DROPSHIPPING] Error validating order items:', error);
      throw error;
    }
  }
}

module.exports = new DropshippingService();

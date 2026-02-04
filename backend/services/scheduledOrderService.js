const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');

class ScheduledOrderService {
  
  async checkAndTransitionScheduledOrders(companyId = null) {
    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();
      
      console.log('🔔 [SCHEDULED-ORDERS] Checking scheduled orders...', { companyId, now });

      const whereClause = {
        isScheduled: true,
        autoTransitionEnabled: true,
        scheduledTransitionedAt: null,
        scheduledDeliveryDate: {
          lte: now
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      const ordersToTransition = await prisma.order.findMany({
        where: whereClause,
        include: {
          customer: true,
          company: true
        }
      });

      console.log(`📦 [SCHEDULED-ORDERS] Found ${ordersToTransition.length} orders ready for transition`);

      const results = [];
      for (const order of ordersToTransition) {
        try {
          const settings = await this.getScheduledOrderSettings(order.companyId);
          const targetStatus = settings?.targetStatusAfterTransition || 'CONFIRMED';

          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
              status: targetStatus,
              scheduledTransitionedAt: now
            }
          });

          await prisma.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: targetStatus,
              oldStatus: order.status,
              changedBy: 'system',
              userName: 'نظام الجدولة التلقائي',
              reason: `تحويل تلقائي - حان موعد الطلب المجدول`
            }
          });

          if (settings?.sendStaffNotification) {
            await this.sendStaffNotification(order, targetStatus);
          }

          if (settings?.sendCustomerNotification) {
            await this.sendCustomerNotification(order);
          }

          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: 'success',
            newStatus: targetStatus
          });

          console.log(`✅ [SCHEDULED-ORDERS] Transitioned order ${order.orderNumber} to ${targetStatus}`);
        } catch (error) {
          console.error(`❌ [SCHEDULED-ORDERS] Error transitioning order ${order.orderNumber}:`, error);
          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: 'error',
            error: error.message
          });
        }
      }

      return {
        success: true,
        processed: ordersToTransition.length,
        results
      };
    } catch (error) {
      console.error('❌ [SCHEDULED-ORDERS] Error in checkAndTransitionScheduledOrders:', error);
      throw error;
    }
  }

  async checkUpcomingScheduledOrders(companyId = null, hoursAhead = 24) {
    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();
      const futureDate = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

      const whereClause = {
        isScheduled: true,
        scheduledTransitionedAt: null,
        scheduledDeliveryDate: {
          gte: now,
          lte: futureDate
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      const upcomingOrders = await prisma.order.findMany({
        where: whereClause,
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          scheduledDeliveryDate: 'asc'
        }
      });

      return {
        success: true,
        count: upcomingOrders.length,
        orders: upcomingOrders
      };
    } catch (error) {
      console.error('❌ [SCHEDULED-ORDERS] Error in checkUpcomingScheduledOrders:', error);
      throw error;
    }
  }

  async sendStaffNotification(order, newStatus) {
    try {
      if (socketService && socketService.emitToCompany) {
        socketService.emitToCompany(order.companyId, 'scheduled-order-ready', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          status: newStatus,
          scheduledDate: order.scheduledDeliveryDate,
          message: `الطلب المجدول #${order.orderNumber} جاهز للتجهيز`
        });
      }
    } catch (error) {
      console.error('❌ [SCHEDULED-ORDERS] Error sending staff notification:', error);
    }
  }

  async sendCustomerNotification(order) {
    try {
      console.log(`📧 [SCHEDULED-ORDERS] Sending customer notification for order ${order.orderNumber}`);
    } catch (error) {
      console.error('❌ [SCHEDULED-ORDERS] Error sending customer notification:', error);
    }
  }

  async getScheduledOrderSettings(companyId) {
    try {
      const prisma = getSharedPrismaClient();
      
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true }
      });

      if (!company || !company.settings) {
        return this.getDefaultSettings();
      }

      const settings = JSON.parse(company.settings);
      return settings.scheduledOrders || this.getDefaultSettings();
    } catch (error) {
      console.error('❌ [SCHEDULED-ORDERS] Error getting settings:', error);
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      enabled: true,
      minScheduleDays: 1,
      maxScheduleDays: 90,
      autoTransitionDaysBefore: 0,
      targetStatusAfterTransition: 'CONFIRMED',
      sendCustomerNotification: true,
      sendStaffNotification: true,
      allowTimeSelection: true
    };
  }

  async updateScheduledOrderSettings(companyId, newSettings) {
    try {
      const prisma = getSharedPrismaClient();
      
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true }
      });

      let settings = {};
      if (company && company.settings) {
        settings = JSON.parse(company.settings);
      }

      settings.scheduledOrders = {
        ...this.getDefaultSettings(),
        ...newSettings
      };

      await prisma.company.update({
        where: { id: companyId },
        data: {
          settings: JSON.stringify(settings)
        }
      });

      return {
        success: true,
        settings: settings.scheduledOrders
      };
    } catch (error) {
      console.error('❌ [SCHEDULED-ORDERS] Error updating settings:', error);
      throw error;
    }
  }

  async getScheduledOrdersStats(companyId) {
    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();

      const [total, pending, upcoming, overdue] = await Promise.all([
        prisma.order.count({
          where: {
            companyId,
            isScheduled: true
          }
        }),
        prisma.order.count({
          where: {
            companyId,
            isScheduled: true,
            scheduledTransitionedAt: null,
            scheduledDeliveryDate: { gte: now }
          }
        }),
        prisma.order.count({
          where: {
            companyId,
            isScheduled: true,
            scheduledTransitionedAt: null,
            scheduledDeliveryDate: {
              gte: now,
              lte: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
            }
          }
        }),
        prisma.order.count({
          where: {
            companyId,
            isScheduled: true,
            scheduledTransitionedAt: null,
            scheduledDeliveryDate: { lt: now }
          }
        })
      ]);

      return {
        success: true,
        stats: {
          total,
          pending,
          upcoming,
          overdue
        }
      };
    } catch (error) {
      console.error('❌ [SCHEDULED-ORDERS] Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = new ScheduledOrderService();

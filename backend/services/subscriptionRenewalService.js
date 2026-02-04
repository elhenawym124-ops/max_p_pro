const { PrismaClient } = require('@prisma/client');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class SubscriptionRenewalService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Process automatic renewals for subscriptions due today
   */
  async processAutomaticRenewals() {
    if (this.isProcessing) {
      //console.log('⚠️ Renewal process already running');
      return;
    }

    try {
      this.isProcessing = true;
      //console.log('🔄 Starting automatic renewal process...');

      
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Find subscriptions due for renewal today
      const subscriptionsDue = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: {
            status: 'ACTIVE',
            autoRenew: true,
            nextBillingDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      }, 3);

      //console.log(`📋 Found ${subscriptionsDue.length} subscriptions due for renewal`);

      for (const subscription of subscriptionsDue) {
        await this.renewSubscription(subscription);
      }

      //console.log('✅ Automatic renewal process completed');

    } catch (error) {
      console.error('❌ Error in automatic renewal process:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Renew a specific subscription
   */
  async renewSubscription(subscription) {
    try {
      //console.log(`🔄 Renewing subscription ${subscription.id} for ${subscription.company.name}`);

      
      
      // Calculate next billing date
      const nextBillingDate = this.calculateNextBillingDate(
        subscription.nextBillingDate,
        subscription.billingCycle
      );

      // Create renewal invoice
      const invoice = await this.createRenewalInvoice(subscription);

      // Update subscription
      await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.update({
          where: { id: subscription.id },
          data: {
            nextBillingDate,
            updatedAt: new Date()
          }
        });
      }, 5);

      //console.log(`✅ Subscription ${subscription.id} renewed successfully`);
      //console.log(`📅 Next billing date: ${nextBillingDate.toISOString().split('T')[0]}`);
      //console.log(`📄 Invoice created: ${invoice.invoiceNumber}`);

      // Send renewal confirmation
      await this.sendRenewalConfirmation(subscription, invoice);

    } catch (error) {
      console.error(`❌ Error renewing subscription ${subscription.id}:`, error);
      
      // Mark subscription as having renewal issues
      await this.handleRenewalFailure(subscription, error);
    }
  }

  /**
   * Calculate next billing date based on billing cycle
   */
  calculateNextBillingDate(currentDate, billingCycle) {
    const nextDate = new Date(currentDate);

    switch (billingCycle) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      default:
        // Default to monthly
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }

  /**
   * Create renewal invoice
   */
  async createRenewalInvoice(subscription) {
    
    
    const invoiceNumber = await this.generateInvoiceNumber();
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const subtotal = subscription.price;
    const taxRate = 0.14; // 14% VAT
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const invoice = await safeQuery(async () => {
      return await getSharedPrismaClient().invoice.create({
        data: {
          invoiceNumber,
          companyId: subscription.companyId,
          subscriptionId: subscription.id,
          type: 'SUBSCRIPTION',
          status: 'SENT', // Automatically send renewal invoices
          issueDate,
          dueDate,
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          currency: subscription.currency,
          paymentTerms: 'Net 30',
          notes: `تجديد اشتراك ${subscription.planType} - ${subscription.billingCycle}`,
          items: {
            create: [
              {
                description: `تجديد اشتراك ${subscription.planType} - ${this.getBillingCycleText(subscription.billingCycle)}`,
                quantity: 1,
                unitPrice: subscription.price,
                totalPrice: subscription.price
              }
            ]
          }
        },
        include: {
          items: true
        }
      });
    }, 5);

    return invoice;
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `INV-${year}${month}-${timestamp}`;
  }

  /**
   * Get billing cycle text in Arabic
   */
  getBillingCycleText(billingCycle) {
    const texts = {
      monthly: 'شهري',
      yearly: 'سنوي',
      quarterly: 'ربع سنوي',
      weekly: 'أسبوعي'
    };
    return texts[billingCycle] || 'شهري';
  }

  /**
   * Send renewal confirmation
   */
  async sendRenewalConfirmation(subscription, invoice) {
    try {
      // TODO: Implement email sending
      //console.log(`📧 Renewal confirmation sent to ${subscription.company.email}`);
      //console.log(`   📄 Invoice: ${invoice.invoiceNumber}`);
      //console.log(`   💰 Amount: ${invoice.totalAmount} ${invoice.currency}`);
      
      // Log the notification
      await this.logNotification({
        type: 'RENEWAL_CONFIRMATION',
        companyId: subscription.companyId,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        message: 'تم تجديد الاشتراك بنجاح',
        metadata: {
          planType: subscription.planType,
          billingCycle: subscription.billingCycle,
          amount: invoice.totalAmount,
          invoiceNumber: invoice.invoiceNumber
        }
      });

    } catch (error) {
      console.error(`❌ Error sending renewal confirmation to ${subscription.company.email}:`, error);
    }
  }

  /**
   * Handle renewal failure
   */
  async handleRenewalFailure(subscription, error) {
    try {
      //console.log(`⚠️ Handling renewal failure for subscription ${subscription.id}`);

      
      
      // Update subscription with failure info
      await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.update({
          where: { id: subscription.id },
          data: {
            metadata: {
              ...subscription.metadata,
              lastRenewalAttempt: new Date().toISOString(),
              lastRenewalError: error.message,
              renewalFailureCount: (subscription.metadata?.renewalFailureCount || 0) + 1
            }
          }
        });
      }, 5);

      // If too many failures, suspend subscription
      const failureCount = (subscription.metadata?.renewalFailureCount || 0) + 1;
      if (failureCount >= 3) {
        await safeQuery(async () => {
          return await getSharedPrismaClient().subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'SUSPENDED',
              metadata: {
                ...subscription.metadata,
                suspendedAt: new Date().toISOString(),
                suspensionReason: 'Multiple renewal failures'
              }
            }
          });
        }, 5);

        //console.log(`⚠️ Subscription ${subscription.id} suspended due to multiple renewal failures`);
      }

      // Send failure notification
      await this.sendRenewalFailureNotification(subscription, error);

    } catch (handlingError) {
      console.error(`❌ Error handling renewal failure:`, handlingError);
    }
  }

  /**
   * Send renewal failure notification
   */
  async sendRenewalFailureNotification(subscription, error) {
    try {
      // TODO: Implement email sending
      //console.log(`📧 Renewal failure notification sent to ${subscription.company.email}`);
      
      // Log the notification
      await this.logNotification({
        type: 'RENEWAL_FAILURE',
        companyId: subscription.companyId,
        subscriptionId: subscription.id,
        message: 'فشل في تجديد الاشتراك',
        metadata: {
          planType: subscription.planType,
          error: error.message,
          failureCount: (subscription.metadata?.renewalFailureCount || 0) + 1
        }
      });

    } catch (notificationError) {
      console.error(`❌ Error sending renewal failure notification:`, notificationError);
    }
  }

  /**
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      }, 3);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'ACTIVE') {
        throw new Error('Only active subscriptions can be renewed');
      }

      // Apply any options (price changes, plan changes, etc.)
      const updatedSubscription = { ...subscription, ...options };

      await this.renewSubscription(updatedSubscription);

      return {
        success: true,
        message: 'Subscription renewed successfully'
      };

    } catch (error) {
      console.error('❌ Error in manual renewal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log notification to database
   */
  async logNotification(notificationData) {
    try {
      // TODO: Create notification log table and implement logging
      //console.log('📝 Notification logged:', notificationData.type);
    } catch (error) {
      console.error('❌ Error logging notification:', error);
    }
  }

  /**
   * Get renewal statistics
   */
  async getRenewalStats(dateFrom, dateTo) {
    try {
      
      const stats = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.groupBy({
          by: ['status'],
          where: {
            nextBillingDate: {
              gte: dateFrom,
              lte: dateTo
            }
          },
          _count: {
            id: true
          },
          _sum: {
            price: true
          }
        });
      }, 4);

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('❌ Error getting renewal stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SubscriptionRenewalService;


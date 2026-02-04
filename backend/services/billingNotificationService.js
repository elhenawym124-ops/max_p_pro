const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery, healthCheck } = require('./sharedDatabase');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class BillingNotificationService {
  constructor() {
    this.isRunning = false;
    this.scheduledTasks = [];
  }

  /**
   * Start the billing notification service
   */
  start() {
    if (this.isRunning) {
      //console.log('⚠️ Billing notification service is already running');
      return;
    }

    //console.log('🔔 Starting billing notification service...');
    
    // Schedule daily check at 9:00 AM
    const dailyTask = cron.schedule('0 9 * * *', () => {
      this.runDailyChecks();
    }, {
      scheduled: false,
      timezone: 'Africa/Cairo'
    });

    // Schedule weekly check on Mondays at 10:00 AM
    const weeklyTask = cron.schedule('0 10 * * 1', () => {
      this.runWeeklyChecks();
    }, {
      scheduled: false,
      timezone: 'Africa/Cairo'
    });

    // Start the scheduled tasks
    dailyTask.start();
    weeklyTask.start();

    this.scheduledTasks.push(dailyTask, weeklyTask);
    this.isRunning = true;

    //console.log('✅ Billing notification service started successfully');
    //console.log('📅 Daily checks: 9:00 AM');
    //console.log('📅 Weekly checks: Mondays at 10:00 AM');

    // Run initial check
    this.runDailyChecks();
  }

  /**
   * Stop the billing notification service
   */
  stop() {
    if (!this.isRunning) {
      //console.log('⚠️ Billing notification service is not running');
      return;
    }

    //console.log('🛑 Stopping billing notification service...');
    
    this.scheduledTasks.forEach(task => {
      task.stop();
    });
    
    this.scheduledTasks = [];
    this.isRunning = false;

    //console.log('✅ Billing notification service stopped');
  }

  /**
   * Run daily checks for billing notifications
   */
  async runDailyChecks() {
    try {
      //console.log('🔍 Running daily billing checks...');
      
      // Early exit during DB cooldown to avoid futile retries and log spam
      try {
        const db = await healthCheck();
        if (db?.status === 'cooldown') {
          console.log('⏳ [BILLING] Skipping daily checks - database in cooldown mode');
          return;
        }
      } catch { /* ignore health check errors */ }
      
      // Run checks sequentially to avoid overwhelming the database
      await safeQuery(async () => {
        await this.checkUpcomingRenewals();
      }, 2);
      
      await safeQuery(async () => {
        await this.checkOverdueInvoices();
      }, 2);
      
      await safeQuery(async () => {
        await this.checkTrialExpirations();
      }, 2);
      
      await safeQuery(async () => {
        await this.checkFailedPayments();
      }, 2);

      //console.log('✅ Daily billing checks completed');
    } catch (error) {
      // If in cooldown, just log and skip
      if (error.message.includes('cooldown')) {
        console.log('⏳ [BILLING] Skipping checks - database in cooldown mode');
      } else {
        console.error('❌ Error in daily billing checks:', error);
      }
    }
  }

  /**
   * Run weekly checks for billing notifications
   */
  async runWeeklyChecks() {
    try {
      //console.log('🔍 Running weekly billing checks...');
      
      // Early exit during DB cooldown to avoid futile retries and log spam
      try {
        const db = await healthCheck();
        if (db?.status === 'cooldown') {
          console.log('⏳ [BILLING] Skipping weekly checks - database in cooldown mode');
          return;
        }
      } catch { /* ignore health check errors */ }
      
      // Run checks sequentially
      await safeQuery(async () => {
        await this.generateWeeklyReports();
      }, 1);
      
      await safeQuery(async () => {
        await this.checkInactiveSubscriptions();
      }, 1);
      
      await safeQuery(async () => {
        await this.sendWeeklyReminders();
      }, 1);

      //console.log('✅ Weekly billing checks completed');
    } catch (error) {
      if (error.message.includes('cooldown')) {
        console.log('⏳ [BILLING] Skipping weekly checks - database in cooldown mode');
      } else {
        console.error('❌ Error in weekly billing checks:', error);
      }
    }
  }

  /**
   * Check for upcoming subscription renewals (7 days, 3 days, 1 day)
   */
  async checkUpcomingRenewals() {
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

      // Check for renewals in 7 days
      const renewalsIn7Days = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'ACTIVE',
            autoRenew: true,
            nextBillingDate: {
              gte: new Date(in7Days.getTime() - 12 * 60 * 60 * 1000), // 12 hours before
              lte: new Date(in7Days.getTime() + 12 * 60 * 60 * 1000)  // 12 hours after
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
      });

      // Check for renewals in 3 days
      const renewalsIn3Days = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'ACTIVE',
            autoRenew: true,
            nextBillingDate: {
              gte: new Date(in3Days.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(in3Days.getTime() + 12 * 60 * 60 * 1000)
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
      });

      // Check for renewals in 1 day
      const renewalsIn1Day = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'ACTIVE',
            autoRenew: true,
            nextBillingDate: {
              gte: new Date(in1Day.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(in1Day.getTime() + 12 * 60 * 60 * 1000)
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
      });

      // Send notifications
      if (renewalsIn7Days.length > 0) {
        //console.log(`📧 Sending 7-day renewal reminders to ${renewalsIn7Days.length} companies`);
        await this.sendRenewalReminders(renewalsIn7Days, 7);
      }

      if (renewalsIn3Days.length > 0) {
        //console.log(`📧 Sending 3-day renewal reminders to ${renewalsIn3Days.length} companies`);
        await this.sendRenewalReminders(renewalsIn3Days, 3);
      }

      if (renewalsIn1Day.length > 0) {
        //console.log(`📧 Sending 1-day renewal reminders to ${renewalsIn1Day.length} companies`);
        await this.sendRenewalReminders(renewalsIn1Day, 1);
      }

    } catch (error) {
      console.error('❌ Error checking upcoming renewals:', error);
    }
  }

  /**
   * Check for overdue invoices
   */
  async checkOverdueInvoices() {
    try {
      
      const now = new Date();
      
      const overdueInvoices = await safeQuery(async () => {
        return await getSharedPrismaClient().invoice.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'SENT',
            dueDate: {
              lt: now
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
      });

      if (overdueInvoices.length > 0) {
        //console.log(`⚠️ Found ${overdueInvoices.length} overdue invoices`);
        
        // Update invoice status to OVERDUE with company isolation
        // SECURITY WARNING: Ensure companyId filter is included
        await safeQuery(async () => {
          await getSharedPrismaClient().invoice.updateMany({
            where: {
              companyId: { in: overdueInvoices.map(inv => inv.companyId) },
              id: {
                in: overdueInvoices.map(inv => inv.id)
              },
              // SECURITY: Add company isolation for safety
              companyId: {
                in: overdueInvoices.map(inv => inv.companyId)
              }
            },
            data: {
              status: 'OVERDUE'
            }
          });
        });

        // Send overdue notifications
        await this.sendOverdueNotifications(overdueInvoices);
      }

    } catch (error) {
      console.error('❌ Error checking overdue invoices:', error);
    }
  }

  /**
   * Check for trial expirations
   */
  async checkTrialExpirations() {
    try {
      
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

      // Check for trials expiring in 3 days
      const trialsExpiring3Days = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'TRIAL',
            trialEndDate: {
              gte: new Date(in3Days.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(in3Days.getTime() + 12 * 60 * 60 * 1000)
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
      });

      // Check for trials expiring in 1 day
      const trialsExpiring1Day = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'TRIAL',
            trialEndDate: {
              gte: new Date(in1Day.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(in1Day.getTime() + 12 * 60 * 60 * 1000)
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
      });

      // Check for expired trials
      const expiredTrials = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'TRIAL',
            trialEndDate: {
              lt: now
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
      });

      // Send notifications and update statuses
      if (trialsExpiring3Days.length > 0) {
        //console.log(`📧 Sending 3-day trial expiration reminders to ${trialsExpiring3Days.length} companies`);
        await this.sendTrialExpirationReminders(trialsExpiring3Days, 3);
      }

      if (trialsExpiring1Day.length > 0) {
        //console.log(`📧 Sending 1-day trial expiration reminders to ${trialsExpiring1Day.length} companies`);
        await this.sendTrialExpirationReminders(trialsExpiring1Day, 1);
      }

      if (expiredTrials.length > 0) {
        //console.log(`⚠️ Found ${expiredTrials.length} expired trials, updating status`);
        
        // Update expired trials to EXPIRED status with company isolation
        // SECURITY WARNING: Ensure companyId filter is included
        await safeQuery(async () => {
          await getSharedPrismaClient().subscription.updateMany({
            where: {
              companyId: { in: expiredTrials.map(sub => sub.companyId) },
              id: {
                in: expiredTrials.map(sub => sub.id)
              },
              // SECURITY: Add company isolation for safety
              companyId: {
                in: expiredTrials.map(sub => sub.companyId)
              }
            },
            data: {
              status: 'EXPIRED'
            }
          });
        });

        await this.sendTrialExpiredNotifications(expiredTrials);
      }

    } catch (error) {
      console.error('❌ Error checking trial expirations:', error);
    }
  }

  /**
   * Check for failed payments
   */
  async checkFailedPayments() {
    try {
      
      const failedPayments = await safeQuery(async () => {
        return await getSharedPrismaClient().payment.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'FAILED',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true
              }
            }
          }
        });
      });

      if (failedPayments.length > 0) {
        //console.log(`⚠️ Found ${failedPayments.length} failed payments in the last 24 hours`);
        await this.sendFailedPaymentNotifications(failedPayments);
      }

    } catch (error) {
      console.error('❌ Error checking failed payments:', error);
    }
  }

  /**
   * Send renewal reminder notifications
   */
  async sendRenewalReminders(subscriptions, daysUntilRenewal) {
    for (const subscription of subscriptions) {
      try {
        // TODO: Implement email sending
        //console.log(`📧 Renewal reminder (${daysUntilRenewal} days) sent to ${subscription.company.email}`);
        
        // Log the notification
        await this.logNotification({
          type: 'RENEWAL_REMINDER',
          companyId: subscription.companyId,
          subscriptionId: subscription.id,
          message: `تذكير بتجديد الاشتراك خلال ${daysUntilRenewal} أيام`,
          metadata: {
            daysUntilRenewal,
            planType: subscription.planType,
            nextBillingDate: subscription.nextBillingDate
          }
        });

      } catch (error) {
        console.error(`❌ Error sending renewal reminder to ${subscription.company.email}:`, error);
      }
    }
  }

  /**
   * Send overdue invoice notifications
   */
  async sendOverdueNotifications(invoices) {
    for (const invoice of invoices) {
      try {
        // TODO: Implement email sending
        //console.log(`📧 Overdue invoice notification sent to ${invoice.company.email}`);
        
        // Log the notification
        await this.logNotification({
          type: 'OVERDUE_INVOICE',
          companyId: invoice.companyId,
          invoiceId: invoice.id,
          message: `فاتورة متأخرة: ${invoice.invoiceNumber}`,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            dueDate: invoice.dueDate
          }
        });

      } catch (error) {
        console.error(`❌ Error sending overdue notification to ${invoice.company.email}:`, error);
      }
    }
  }

  /**
   * Send trial expiration reminder notifications
   */
  async sendTrialExpirationReminders(subscriptions, daysUntilExpiration) {
    for (const subscription of subscriptions) {
      try {
        // TODO: Implement email sending
        //console.log(`📧 Trial expiration reminder (${daysUntilExpiration} days) sent to ${subscription.company.email}`);
        
        // Log the notification
        await this.logNotification({
          type: 'TRIAL_EXPIRATION_REMINDER',
          companyId: subscription.companyId,
          subscriptionId: subscription.id,
          message: `تذكير بانتهاء الفترة التجريبية خلال ${daysUntilExpiration} أيام`,
          metadata: {
            daysUntilExpiration,
            planType: subscription.planType,
            trialEndDate: subscription.trialEndDate
          }
        });

      } catch (error) {
        console.error(`❌ Error sending trial expiration reminder to ${subscription.company.email}:`, error);
      }
    }
  }

  /**
   * Send trial expired notifications
   */
  async sendTrialExpiredNotifications(subscriptions) {
    for (const subscription of subscriptions) {
      try {
        // TODO: Implement email sending
        //console.log(`📧 Trial expired notification sent to ${subscription.company.email}`);
        
        // Log the notification
        await this.logNotification({
          type: 'TRIAL_EXPIRED',
          companyId: subscription.companyId,
          subscriptionId: subscription.id,
          message: 'انتهت الفترة التجريبية',
          metadata: {
            planType: subscription.planType,
            trialEndDate: subscription.trialEndDate
          }
        });

      } catch (error) {
        console.error(`❌ Error sending trial expired notification to ${subscription.company.email}:`, error);
      }
    }
  }

  /**
   * Send failed payment notifications
   */
  async sendFailedPaymentNotifications(payments) {
    for (const payment of payments) {
      try {
        // TODO: Implement email sending
        //console.log(`📧 Failed payment notification sent to ${payment.company.email}`);
        
        // Log the notification
        await this.logNotification({
          type: 'FAILED_PAYMENT',
          companyId: payment.companyId,
          paymentId: payment.id,
          message: 'فشل في عملية الدفع',
          metadata: {
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            method: payment.method,
            failureReason: payment.failureReason
          }
        });

      } catch (error) {
        console.error(`❌ Error sending failed payment notification to ${payment.company.email}:`, error);
      }
    }
  }

  /**
   * Generate weekly reports
   */
  async generateWeeklyReports() {
    try {
      
      //console.log('📊 Generating weekly billing reports...');
      
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Get weekly statistics
      const [
        newSubscriptions,
        cancelledSubscriptions,
        totalRevenue,
        newInvoices,
        paidInvoices
      ] = await Promise.all([
        safeQuery(async () => {
          return await getSharedPrismaClient().subscription.count({
            where: {
              createdAt: { gte: weekAgo }
            }
          });
        }),
        safeQuery(async () => {
          return await getSharedPrismaClient().subscription.count({
            where: {
              status: 'CANCELLED',
              cancelledAt: { gte: weekAgo }
            }
          });
        }),
        safeQuery(async () => {
          return await getSharedPrismaClient().payment.aggregate({
            where: {
              status: 'COMPLETED',
              paidAt: { gte: weekAgo }
            },
            _sum: { amount: true }
          });
        }),
        safeQuery(async () => {
          return await getSharedPrismaClient().invoice.count({
            where: {
              createdAt: { gte: weekAgo }
            }
          });
        }),
        safeQuery(async () => {
          return await getSharedPrismaClient().invoice.count({
            where: {
              status: 'PAID',
              paidDate: { gte: weekAgo }
            }
          });
        })
      ]);

      const weeklyReport = {
        period: `${weekAgo.toISOString().split('T')[0]} - ${new Date().toISOString().split('T')[0]}`,
        newSubscriptions,
        cancelledSubscriptions,
        totalRevenue: totalRevenue._sum.amount || 0,
        newInvoices,
        paidInvoices
      };

      //console.log('📊 Weekly Report:', weeklyReport);
      
      // TODO: Send weekly report to admin email
      
    } catch (error) {
      console.error('❌ Error generating weekly reports:', error);
    }
  }

  /**
   * Check for inactive subscriptions
   */
  async checkInactiveSubscriptions() {
    try {
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const inactiveSubscriptions = await safeQuery(async () => {
        return await getSharedPrismaClient().subscription.findMany({
          where: { companyId: { not: null } },
          where: {
            status: 'INACTIVE',
            updatedAt: { lt: thirtyDaysAgo }
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
      });

      if (inactiveSubscriptions.length > 0) {
        //console.log(`⚠️ Found ${inactiveSubscriptions.length} long-term inactive subscriptions`);
        // TODO: Send reactivation offers
      }

    } catch (error) {
      console.error('❌ Error checking inactive subscriptions:', error);
    }
  }

  /**
   * Send weekly reminders
   */
  async sendWeeklyReminders() {
    try {
      // TODO: Implement weekly reminder logic
      //console.log('📧 Sending weekly reminders...');
    } catch (error) {
      console.error('❌ Error sending weekly reminders:', error);
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
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledTasks: this.scheduledTasks.length,
      lastCheck: new Date().toISOString()
    };
  }
}

module.exports = BillingNotificationService;

